// Scheduled Jobs — cron-like scheduler with natural language triggers
// ~/missioncontrol/backend/src/automation/scheduler.ts

import { db } from '../db';
import { createJob } from '../council/orchestrator';
import { getSubscriptions } from '../memory/subscriptionManager';
import type { AutonomousJob } from '../council/automation_types';

export interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  prompt: string;
  schedule: {
    type: 'cron' | 'interval' | 'once' | 'event';
    cronExpression?: string;
    intervalMinutes?: number;
    runAt?: string;
    eventTrigger?: 'file_change' | 'git_push' | 'system_boot' | 'voice_command';
    eventPath?: string;
  };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  config: {
    preferredAgents?: string[];
    costLimit?: number;
    autoApplyResults?: boolean;
    notifyOnComplete?: boolean;
    notifyOnFailure?: boolean;
  };
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
const scheduledJobs = new Map<string, ScheduledJob>();

export function initScheduler() {
  initSchedulerTables();
  loadScheduledJobs();
  schedulerInterval = setInterval(checkScheduledJobs, 60000);
  console.log('[Scheduler] Initialized, checking every 60s');
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

export async function createScheduledJob(job: Omit<ScheduledJob, 'id' | 'runCount' | 'successCount' | 'failureCount' | 'createdAt' | 'updatedAt'>): Promise<ScheduledJob> {
  const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const scheduledJob: ScheduledJob = { ...job, id, runCount: 0, successCount: 0, failureCount: 0, createdAt: now, updatedAt: now };
  scheduledJob.nextRun = calculateNextRun(scheduledJob.schedule);
  scheduledJobs.set(id, scheduledJob);
  persistScheduledJob(scheduledJob);
  return scheduledJob;
}

export function getScheduledJob(id: string): ScheduledJob | undefined { return scheduledJobs.get(id); }
export function listScheduledJobs(): ScheduledJob[] { return Array.from(scheduledJobs.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }

export function updateScheduledJob(id: string, updates: Partial<ScheduledJob>): ScheduledJob | null {
  const job = scheduledJobs.get(id);
  if (!job) return null;
  const updated = { ...job, ...updates, updatedAt: new Date().toISOString() };
  updated.nextRun = calculateNextRun(updated.schedule);
  scheduledJobs.set(id, updated);
  persistScheduledJob(updated);
  return updated;
}

export function deleteScheduledJob(id: string): boolean {
  const deleted = scheduledJobs.delete(id);
  if (deleted) { try { db.query('DELETE FROM scheduled_jobs WHERE id = ?', [id]).run(); } catch (e) {} }
  return deleted;
}

export function toggleScheduledJob(id: string): boolean {
  const job = scheduledJobs.get(id);
  if (!job) return false;
  job.enabled = !job.enabled;
  job.nextRun = job.enabled ? calculateNextRun(job.schedule) : undefined;
  persistScheduledJob(job);
  return job.enabled;
}

async function checkScheduledJobs() {
  const now = new Date();
  for (const job of scheduledJobs.values()) {
    if (!job.enabled || !job.nextRun) continue;
    if (new Date(job.nextRun) <= now) {
      console.log(`[Scheduler] Triggering: ${job.name}`);
      await executeScheduledJob(job);
    }
  }
}

async function executeScheduledJob(job: ScheduledJob) {
  const now = new Date().toISOString();
  job.lastRun = now;
  job.runCount++;
  try {
    const subs = await getSubscriptions();
    const apiKeys: Record<string, string> = {};
    for (const sub of subs) { apiKeys[sub.provider === 'google' ? 'gemini' : sub.provider] = sub.apiKey; }
    const autonomousJob = await createJob(job.prompt, apiKeys, false, globalThis.aiRouter);
    const result = await waitForJobCompletion(autonomousJob.id, 300000);
    if (result?.status === 'completed') {
      job.successCount++;
      if (job.config.autoApplyResults && result.finalResult) await autoApplyResult(job, result.finalResult);
      if (job.config.notifyOnComplete) await sendNotification(`✅ ${job.name}`, result.finalResult?.substring(0, 200) || '');
    } else {
      job.failureCount++;
      if (job.config.notifyOnFailure) await sendNotification(`❌ ${job.name}`, result?.finalResult || 'Failed');
    }
  } catch (error: any) {
    job.failureCount++;
    console.error(`[Scheduler] ${job.name} failed:`, error.message);
    if (job.config.notifyOnFailure) await sendNotification(`❌ ${job.name}`, error.message);
  }
  if (job.schedule.type === 'once') job.enabled = false;
  else job.nextRun = calculateNextRun(job.schedule);
  job.updatedAt = now;
  persistScheduledJob(job);
}

async function waitForJobCompletion(jobId: string, timeoutMs: number): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { getJob } = await import('../council/orchestrator');
    const job = getJob(jobId);
    if (job && (job.status === 'completed' || job.status === 'failed')) return job;
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}

async function autoApplyResult(job: ScheduledJob, result: string) {
  if (job.prompt.toLowerCase().includes('code') || job.prompt.toLowerCase().includes('fix')) {
    console.log(`[Scheduler] Auto-apply: ${result.substring(0, 100)}...`);
  }
}

async function sendNotification(title: string, body: string) {
  try {
    const { Bun } = await import('bun');
    Bun.spawn(['osascript', '-e', `display notification "${body.replace(/"/g, '\\"')}" with title "${title}"`], { stdout: 'pipe', stderr: 'pipe' });
  } catch (e) { console.log(`[Notification] ${title}: ${body}`); }
}

function calculateNextRun(schedule: ScheduledJob['schedule']): string | undefined {
  const now = new Date();
  switch (schedule.type) {
    case 'cron':
      if (!schedule.cronExpression) return undefined;
      return getNextCronDate(schedule.cronExpression, now);
    case 'interval':
      if (!schedule.intervalMinutes) return undefined;
      return new Date(now.getTime() + schedule.intervalMinutes * 60000).toISOString();
    case 'once':
      return schedule.runAt;
    case 'event':
      return undefined;
    default: return undefined;
  }
}

function getNextCronDate(cron: string, from: Date): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return new Date(from.getTime() + 86400000).toISOString();
  const [min, hour] = parts.map(Number);
  const next = new Date(from);
  next.setHours(hour, min, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

export function parseNaturalSchedule(input: string): ScheduledJob['schedule'] {
  const lower = input.toLowerCase();
  if (lower.includes('every day') || lower.includes('daily')) {
    const hourMatch = lower.match(/(\d+)(?::\d+)?\s*(am|pm)/);
    const hour = hourMatch ? (hourMatch[2] === 'pm' ? parseInt(hourMatch[1]) + 12 : parseInt(hourMatch[1])) : 9;
    return { type: 'cron', cronExpression: `0 ${hour} * * *` };
  }
  if (lower.includes('every hour')) return { type: 'interval', intervalMinutes: 60 };
  const intervalMatch = lower.match(/every\s+(\d+)\s*minutes?/);
  if (intervalMatch) return { type: 'interval', intervalMinutes: parseInt(intervalMatch[1]) };
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = days.find(d => lower.includes(d));
  if (dayMatch) {
    const hourMatch = lower.match(/(\d+)(?::\d+)?\s*(am|pm)/);
    const hour = hourMatch ? (hourMatch[2] === 'pm' ? parseInt(hourMatch[1]) + 12 : parseInt(hourMatch[1])) : 9;
    return { type: 'cron', cronExpression: `0 ${hour} * * ${days.indexOf(dayMatch)}` };
  }
  if (lower.includes('once') || lower.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hourMatch = lower.match(/(\d+)(?::\d+)?\s*(am|pm)/);
    if (hourMatch) tomorrow.setHours(hourMatch[2] === 'pm' ? parseInt(hourMatch[1]) + 12 : parseInt(hourMatch[1]), 0, 0, 0);
    return { type: 'once', runAt: tomorrow.toISOString() };
  }
  return { type: 'cron', cronExpression: '0 9 * * *' };
}

function initSchedulerTables() {
  try {
    db.query(`CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id TEXT PRIMARY KEY, name TEXT, description TEXT, prompt TEXT,
      schedule TEXT, enabled INTEGER DEFAULT 1, last_run TEXT, next_run TEXT,
      run_count INTEGER DEFAULT 0, success_count INTEGER DEFAULT 0, failure_count INTEGER DEFAULT 0,
      created_at TEXT, updated_at TEXT, config TEXT
    )`).run();
  } catch (e) { console.error('[Scheduler] DB init failed:', e); }
}

function persistScheduledJob(job: ScheduledJob) {
  try {
    db.query(`INSERT OR REPLACE INTO scheduled_jobs 
      (id, name, description, prompt, schedule, enabled, last_run, next_run, run_count, success_count, failure_count, created_at, updated_at, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      job.id, job.name, job.description, job.prompt, JSON.stringify(job.schedule),
      job.enabled ? 1 : 0, job.lastRun, job.nextRun, job.runCount, job.successCount,
      job.failureCount, job.createdAt, job.updatedAt, JSON.stringify(job.config)
    );
  } catch (e) { console.error('[Scheduler] Persist failed:', e); }
}

function loadScheduledJobs() {
  try {
    const rows = db.query('SELECT * FROM scheduled_jobs').all() as any[];
    for (const row of rows) {
      scheduledJobs.set(row.id, {
        id: row.id, name: row.name, description: row.description, prompt: row.prompt,
        schedule: JSON.parse(row.schedule || '{}'), enabled: Boolean(row.enabled),
        lastRun: row.last_run, nextRun: row.next_run, runCount: row.run_count,
        successCount: row.success_count, failureCount: row.failure_count,
        createdAt: row.created_at, updatedAt: row.updated_at, config: JSON.parse(row.config || '{}'),
      });
    }
    console.log(`[Scheduler] Loaded ${rows.length} jobs`);
  } catch (e) { console.log('[Scheduler] No existing jobs'); }
}
