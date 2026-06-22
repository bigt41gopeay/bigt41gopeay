// Updated orchestrator with memory integration
// Add these functions to ~/missioncontrol/backend/src/council/orchestrator.ts

import { analyzeCompletedJob, getAdaptiveDecomposition, getAdaptiveConfig } from '../memory/learningEngine';
import { canUseProvider, trackUsage, getBudgetAlerts } from '../memory/subscriptionManager';

// Replace the existing executeJob function with this enhanced version

async function executeJob(
  jobId: string,
  apiKeys: Record<string, string>,
  armState: boolean,
  aiRouter: any
) {
  const job = jobs.get(jobId)!;
  const ctx = { jobId, apiKeys, armState };

  try {
    // ─── PHASE 0: CHECK SUBSCRIPTIONS & BUDGET ───
    const alerts = await getBudgetAlerts();
    if (alerts.length > 0) {
      for (const alert of alerts) {
        addLog(jobId, 'warn', 'subscription', 
          `${alert.provider}: ${alert.alert} (${alert.current}/${alert.limit})`);
      }
    }

    // ─── PHASE 1: DECOMPOSITION (with memory) ───
    updateJobStatus(jobId, 'planning');
    addLog(jobId, 'info', 'orchestrator', 'Decomposing task with adaptive memory...');

    let decomposition = await decomposeTask(job.userRequest, aiRouter);

    // Apply learned adaptations
    const adaptiveDecomp = await getAdaptiveDecomposition(job.userRequest, decomposition);
    if (adaptiveDecomp.source !== 'default') {
      addLog(jobId, 'info', 'orchestrator', 
        `Applied ${adaptiveDecomp.source} adaptation from memory`);
      decomposition = adaptiveDecomp;
    }

    // Check cost constraints
    const config = await getAdaptiveConfig();
    if (config.costPreference === 'minimize') {
      addLog(jobId, 'info', 'orchestrator', 'Cost optimization: preferring local/free agents');
    }

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

    // ─── PHASE 3: EXECUTION (with subscription checks) ───
    updateJobStatus(jobId, 'executing');
    const executionOrder = getExecutionOrder(decomposition);

    for (const batch of executionOrder) {
      addLog(jobId, 'info', 'orchestrator', `Executing batch: ${batch.join(', ')}`);

      const results = await Promise.all(
        batch.map(async (taskId) => {
          const subtask = job.subtasks.find(s => s.id === taskId)!;

          // Check if we can use this provider
          const providerCheck = await canUseProvider(subtask.agentId, subtask.estimatedTokens);
          if (!providerCheck.allowed) {
            addLog(jobId, 'warn', 'subscription', 
              `${subtask.agentId}: ${providerCheck.reason}, using ${providerCheck.alternative}`);
            subtask.agentId = providerCheck.alternative || 'qwen-local';
            const fallbackAgent = agentRegistry.getAgent(subtask.agentId);
            if (fallbackAgent) {
              subtask.method = fallbackAgent.methods[0]?.id || subtask.method;
            }
          }

          subtask.status = 'running';
          subtask.startedAt = new Date().toISOString();
          persistJob(job);

          const result = await executeSubtask(subtask, ctx, aiRouter);

          // Track usage for subscription
          if (result.success && result.metrics.tokensUsed > 0) {
            await trackUsage(subtask.agentId, result.metrics.tokensUsed, result.metrics.cost);
          }

          subtask.result = result;
          subtask.status = result.success ? 'completed' : 'failed';
          subtask.completedAt = new Date().toISOString();
          persistJob(job);

          if (!result.success && subtask.retries < 2) {
            subtask.status = 'retrying';
            subtask.retries++;
            addLog(jobId, 'warn', subtask.agentId, 
              `Retrying (${subtask.retries}/2): ${result.error}`);

            const fallbackAgent = agentRegistry.findBestFor(subtask.description)
              .find(a => a.id !== subtask.agentId);
            if (fallbackAgent) {
              subtask.agentId = fallbackAgent.id;
              subtask.method = fallbackAgent.methods[0]?.id || subtask.method;
              const retryResult = await executeSubtask(subtask, ctx, aiRouter);
              subtask.result = retryResult;
              subtask.status = retryResult.success ? 'completed' : 'failed';
              subtask.completedAt = new Date().toISOString();

              if (retryResult.success && retryResult.metrics.tokensUsed > 0) {
                await trackUsage(subtask.agentId, retryResult.metrics.tokensUsed, retryResult.metrics.cost);
              }
            }
          }

          return { taskId, result };
        })
      );

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

    // ─── PHASE 5: LEARN FROM THIS JOB ───
    if (config.learningEnabled) {
      addLog(jobId, 'info', 'memory', 'Analyzing job for learning...');
      const patterns = await analyzeCompletedJob(job);
      addLog(jobId, 'info', 'memory', 
        `Learned ${patterns.length} new patterns from this job`);
    }

  } catch (error: any) {
    addLog(jobId, 'error', 'orchestrator', `Job failed: ${error.message}`);
    updateJobStatus(jobId, 'failed');
    persistJob(job);
    throw error;
  }
}
