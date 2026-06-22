// Autonomous Orchestrator — main controller for autonomous jobs
// ~/missioncontrol/backend/src/council/orchestrator.ts

import { agentRegistry } from './agentRegistry';
import { decomposeTask, getExecutionOrder } from './decomposer';
import { deliberate } from './deliberator';
import { executeSubtask } from './executor';
import type { AutonomousJob, SubTask, TaskResult, JobLog } from './automation_types';
import { db } from '../db';

// In-memory job store (persisted to SQLite)
const jobs = new Map<string, AutonomousJob>();

export async function createJob(
  userRequest: string,
  apiKeys: Record<string, string>,
  armState: boolean,
  aiRouter: any
): Promise<AutonomousJob> {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const job: AutonomousJob = {
    id: jobId,
    userRequest,
    status: 'planning',
    subtasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: [{
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Job created: "${userRequest}"`,
    }],
  };

  jobs.set(jobId, job);
  persistJob(job);

  // Start async execution
  executeJob(jobId, apiKeys, armState, aiRouter).catch(err => {
    console.error(`Job ${jobId} failed:`, err);
    updateJobStatus(jobId, 'failed');
  });

  return job;
}

async function executeJob(
  jobId: string,
  apiKeys: Record<string, string>,
  armState: boolean,
  aiRouter: any
) {
  const job = jobs.get(jobId)!;
  const ctx = { jobId, apiKeys, armState };

  try {
    // ─── PHASE 1: DECOMPOSITION ───
    updateJobStatus(jobId, 'planning');
    addLog(jobId, 'info', 'orchestrator', 'Decomposing task into subtasks...');

    const decomposition = await decomposeTask(job.userRequest, aiRouter);
    job.decomposition = decomposition;
    job.subtasks = decomposition.subtasks;
    persistJob(job);

    addLog(jobId, 'info', 'orchestrator', 
      `Decomposed into ${decomposition.subtasks.length} subtasks, est. cost: $${decomposition.estimatedCost.toFixed(4)}`);

    // ─── PHASE 2: COUNCIL DELIBERATION ───
    updateJobStatus(jobId, 'deliberating');
    addLog(jobId, 'info', 'orchestrator', 'Council deliberating on best approach...');

    const deliberation = await deliberate(decomposition, aiRouter);
    job.deliberation = deliberation;
    persistJob(job);

    addLog(jobId, 'info', 'orchestrator', 
      `Council chose: ${deliberation.winner.agentName} — ${deliberation.reasoning}`);

    // Update subtasks based on council decision
    if (deliberation.winner.method) {
      // The winner might suggest reassigning tasks
      for (const st of job.subtasks) {
        const bestAgent = agentRegistry.findBestFor(st.description)[0];
        if (bestAgent && bestAgent.id !== st.agentId) {
          addLog(jobId, 'info', 'orchestrator', 
            `Reassigned "${st.description}" from ${st.agentId} to ${bestAgent.id} per council vote`);
          st.agentId = bestAgent.id;
          st.method = bestAgent.methods[0]?.id || st.method;
        }
      }
    }

    // ─── PHASE 3: EXECUTION ───
    updateJobStatus(jobId, 'executing');
    const executionOrder = getExecutionOrder(decomposition);

    for (const batch of executionOrder) {
      addLog(jobId, 'info', 'orchestrator', `Executing batch: ${batch.join(', ')}`);

      // Execute batch in parallel (tasks with no inter-dependencies)
      const results = await Promise.all(
        batch.map(async (taskId) => {
          const subtask = job.subtasks.find(s => s.id === taskId)!;
          subtask.status = 'running';
          subtask.startedAt = new Date().toISOString();
          persistJob(job);

          const result = await executeSubtask(subtask, ctx, aiRouter);

          subtask.result = result;
          subtask.status = result.success ? 'completed' : 'failed';
          subtask.completedAt = new Date().toISOString();
          persistJob(job);

          if (!result.success && subtask.retries < 2) {
            subtask.status = 'retrying';
            subtask.retries++;
            addLog(jobId, 'warn', subtask.agentId, 
              `Retrying (${subtask.retries}/2): ${result.error}`);

            // Retry with fallback agent
            const fallbackAgent = agentRegistry.findBestFor(subtask.description)
              .find(a => a.id !== subtask.agentId);
            if (fallbackAgent) {
              subtask.agentId = fallbackAgent.id;
              subtask.method = fallbackAgent.methods[0]?.id || subtask.method;
              const retryResult = await executeSubtask(subtask, ctx, aiRouter);
              subtask.result = retryResult;
              subtask.status = retryResult.success ? 'completed' : 'failed';
              subtask.completedAt = new Date().toISOString();
            }
          }

          return { taskId, result };
        })
      );

      // Check if any critical task failed
      const failures = results.filter(r => !r.result.success);
      if (failures.length > 0) {
        addLog(jobId, 'warn', 'orchestrator', 
          `${failures.length} tasks failed in this batch, continuing...`);
      }
    }

    // ─── PHASE 4: VERIFICATION ───
    updateJobStatus(jobId, 'verifying');
    addLog(jobId, 'info', 'orchestrator', 'Verifying results...');

    const finalResult = await verifyResults(job, aiRouter);
    job.finalResult = finalResult;
    updateJobStatus(jobId, 'completed');

    addLog(jobId, 'info', 'orchestrator', 'Job completed successfully');
    persistJob(job);

  } catch (error: any) {
    addLog(jobId, 'error', 'orchestrator', `Job failed: ${error.message}`);
    updateJobStatus(jobId, 'failed');
    persistJob(job);
    throw error;
  }
}

async function verifyResults(job: AutonomousJob, aiRouter: any): Promise<string> {
  const completedTasks = job.subtasks.filter(s => s.status === 'completed');
  const outputs = completedTasks.map(s => `[${s.agentId}] ${s.description}:\n${s.result?.output || 'No output'}`).join('\n\n---\n\n');

  const prompt = `The following subtasks were completed for the request: "${job.userRequest}"\n\n${outputs}\n\nSynthesize a final, coherent response that addresses the original request. Be concise but complete.`;

  const response = await aiRouter.route({
    prompt,
    mode: 'SMART_HYBRID',
  });

  return response.text;
}

// ─── Job Management ───
export function getJob(jobId: string): AutonomousJob | undefined {
  return jobs.get(jobId);
}

export function listJobs(): AutonomousJob[] {
  return Array.from(jobs.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function cancelJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  job.status = 'failed';
  addLog(jobId, 'info', 'orchestrator', 'Job cancelled by user');
  persistJob(job);
  return true;
}

function updateJobStatus(jobId: string, status: AutonomousJob['status']) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = status;
    job.updatedAt = new Date().toISOString();
    persistJob(job);
  }
}

function addLog(jobId: string, level: JobLog['level'], agent: string, message: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  const log: JobLog = {
    timestamp: new Date().toISOString(),
    level,
    agent,
    message,
  };
  job.logs.push(log);
  persistJob(job);
}

function persistJob(job: AutonomousJob) {
  try {
    db.query(`
      INSERT OR REPLACE INTO autonomous_jobs 
      (id, user_request, status, decomposition, deliberation, subtasks, final_result, created_at, updated_at, logs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id,
      job.userRequest,
      job.status,
      JSON.stringify(job.decomposition || {}),
      JSON.stringify(job.deliberation || {}),
      JSON.stringify(job.subtasks),
      job.finalResult || null,
      job.createdAt,
      job.updatedAt,
      JSON.stringify(job.logs)
    );
  } catch (e) {
    // Table might not exist yet
  }
}

// Initialize database table
export function initAutonomousTables() {
  try {
    db.query(`
      CREATE TABLE IF NOT EXISTS autonomous_jobs (
        id TEXT PRIMARY KEY,
        user_request TEXT NOT NULL,
        status TEXT NOT NULL,
        decomposition TEXT,
        deliberation TEXT,
        subtasks TEXT,
        final_result TEXT,
        created_at TEXT,
        updated_at TEXT,
        logs TEXT
      )
    `).run();

    db.query(`
      CREATE TABLE IF NOT EXISTS autonomous_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT,
        timestamp TEXT,
        level TEXT,
        agent TEXT,
        message TEXT
      )
    `).run();
  } catch (e) {
    console.error('Failed to init autonomous tables:', e);
  }
}

// Load existing jobs from DB on startup
export function loadJobsFromDB() {
  try {
    const rows = db.query('SELECT * FROM autonomous_jobs ORDER BY created_at DESC').all() as any[];
    for (const row of rows) {
      const job: AutonomousJob = {
        id: row.id,
        userRequest: row.user_request,
        status: row.status as AutonomousJob['status'],
        decomposition: row.decomposition ? JSON.parse(row.decomposition) : undefined,
        deliberation: row.deliberation ? JSON.parse(row.deliberation) : undefined,
        subtasks: row.subtasks ? JSON.parse(row.subtasks) : [],
        finalResult: row.final_result || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        logs: row.logs ? JSON.parse(row.logs) : [],
      };
      jobs.set(job.id, job);
    }
    console.log(`Loaded ${rows.length} autonomous jobs from DB`);
  } catch (e) {
    console.log('No existing autonomous jobs found');
  }
}
