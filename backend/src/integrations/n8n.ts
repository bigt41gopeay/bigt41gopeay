// n8n Webhook Integration — bidirectional communication with n8n
// ~/missioncontrol/backend/src/integrations/n8n.ts

import { db } from '../db';
import { createJob } from '../council/orchestrator';
import { getSubscriptions } from '../memory/subscriptionManager';

export interface N8nConfig {
  id: string;
  enabled: boolean;
  baseUrl: string; // e.g., https://n8n.yourdomain.com
  apiKey: string; // n8n API key
  webhookSecret: string; // for verifying incoming webhooks
  workflows: {
    triggerOnJobComplete: string; // workflow ID to trigger
    triggerOnJobFailed: string;
    triggerOnBudgetAlert: string;
    triggerOnInsight: string;
  };
  triggers: {
    incomingWebhook: string; // URL path for incoming webhooks from n8n
  };
}

let n8nConfig: N8nConfig | null = null;

export async function initN8n() {
  initN8nTables();
  await loadN8nConfig();
  console.log('[n8n] Initialized');
}

export async function setN8nConfig(config: Omit<N8nConfig, 'id'>): Promise<N8nConfig> {
  n8nConfig = { ...config, id: 'n8n-config' };
  persistN8nConfig(n8nConfig);
  return n8nConfig;
}

export async function getN8nConfig(): Promise<N8nConfig | null> {
  return n8nConfig;
}

// ─── Trigger n8n Workflow ───

export async function triggerN8nWorkflow(workflowId: string, data: any): Promise<{ success: boolean; message: string }> {
  if (!n8nConfig?.enabled || !n8nConfig.baseUrl) {
    return { success: false, message: 'n8n not configured' };
  }

  try {
    const res = await fetch(`${n8nConfig.baseUrl}/webhook/${workflowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nConfig.apiKey,
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'mission-control',
        ...data,
      }),
    });

    if (res.ok) {
      return { success: true, message: 'Workflow triggered' };
    } else {
      return { success: false, message: `HTTP ${res.status}: ${await res.text()}` };
    }
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// ─── Event Triggers ───

export async function n8nTriggerJobComplete(job: any): Promise<void> {
  if (!n8nConfig?.enabled || !n8nConfig.workflows.triggerOnJobComplete) return;
  await triggerN8nWorkflow(n8nConfig.workflows.triggerOnJobComplete, {
    event: 'job_complete',
    jobId: job.id,
    userRequest: job.userRequest,
    status: job.status,
    subtasks: job.subtasks?.map((s: any) => ({
      agentId: s.agentId,
      description: s.description,
      status: s.status,
      cost: s.result?.metrics?.cost || 0,
    })),
    totalCost: job.subtasks?.reduce((sum: number, s: any) => sum + (s.result?.metrics?.cost || 0), 0),
    finalResult: job.finalResult,
    duration: new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime(),
  });
}

export async function n8nTriggerJobFailed(job: any): Promise<void> {
  if (!n8nConfig?.enabled || !n8nConfig.workflows.triggerOnJobFailed) return;
  await triggerN8nWorkflow(n8nConfig.workflows.triggerOnJobFailed, {
    event: 'job_failed',
    jobId: job.id,
    userRequest: job.userRequest,
    error: job.subtasks?.find((s: any) => s.result?.error)?.result?.error || 'Unknown error',
  });
}

export async function n8nTriggerBudgetAlert(subscription: any): Promise<void> {
  if (!n8nConfig?.enabled || !n8nConfig.workflows.triggerOnBudgetAlert) return;
  await triggerN8nWorkflow(n8nConfig.workflows.triggerOnBudgetAlert, {
    event: 'budget_alert',
    provider: subscription.provider,
    currentCost: subscription.usage.currentMonthCost,
    budget: subscription.metadata?.monthlyBudget,
    percentUsed: ((subscription.usage.currentMonthCost / subscription.metadata?.monthlyBudget) * 100).toFixed(0),
  });
}

export async function n8nTriggerInsight(insight: any): Promise<void> {
  if (!n8nConfig?.enabled || !n8nConfig.workflows.triggerOnInsight) return;
  await triggerN8nWorkflow(n8nConfig.workflows.triggerOnInsight, {
    event: 'insight',
    title: insight.title,
    description: insight.description,
    impact: insight.impact,
    type: insight.type,
  });
}

// ─── Incoming Webhook Handler (from n8n) ───

export async function handleN8nIncomingWebhook(payload: any, signature: string, aiRouter: any): Promise<any> {
  // Verify signature
  if (n8nConfig?.webhookSecret && signature !== n8nConfig.webhookSecret) {
    return { error: 'Invalid signature' };
  }

  const { action, params } = payload;

  switch (action) {
    case 'execute_job': {
      const subs = await getSubscriptions();
      const apiKeys: Record<string, string> = {};
      for (const sub of subs) { apiKeys[sub.provider === 'google' ? 'gemini' : sub.provider] = sub.apiKey; }
      const job = await createJob(params.prompt, apiKeys, false, aiRouter);
      return { success: true, jobId: job.id, status: job.status };
    }

    case 'get_status': {
      const { listJobs } = await import('../council/orchestrator');
      const jobs = listJobs().slice(0, 10);
      return { success: true, jobs: jobs.map(j => ({ id: j.id, status: j.status, request: j.userRequest })) };
    }

    case 'get_metrics': {
      const { getLearningMetrics } = await import('../memory/learningEngine');
      const metrics = await getLearningMetrics();
      return { success: true, metrics };
    }

    case 'get_agents': {
      const { agentRegistry } = await import('../council/agentRegistry');
      return { success: true, agents: agentRegistry.listAll() };
    }

    case 'schedule_job': {
      const { parseNaturalSchedule, createScheduledJob } = await import('../automation/scheduler');
      const schedule = parseNaturalSchedule(params.when || 'every day at 9am');
      const job = await createScheduledJob({
        name: params.name || params.prompt.substring(0, 50),
        description: params.prompt,
        prompt: params.prompt,
        schedule,
        enabled: true,
        config: { notifyOnComplete: true },
      });
      return { success: true, jobId: job.id, nextRun: job.nextRun };
    }

    default:
      return { error: `Unknown action: ${action}` };
  }
}

// ─── DB ───

function initN8nTables() {
  try {
    db.query(`CREATE TABLE IF NOT EXISTS n8n_config (
      id TEXT PRIMARY KEY, enabled INTEGER DEFAULT 0, base_url TEXT,
      api_key TEXT, webhook_secret TEXT, workflows TEXT, triggers TEXT
    )`).run();
  } catch (e) {}
}

function persistN8nConfig(config: N8nConfig) {
  try {
    db.query(`INSERT OR REPLACE INTO n8n_config (id, enabled, base_url, api_key, webhook_secret, workflows, triggers)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      config.id, config.enabled ? 1 : 0, config.baseUrl, config.apiKey,
      config.webhookSecret, JSON.stringify(config.workflows), JSON.stringify(config.triggers)
    );
  } catch (e) {}
}

async function loadN8nConfig() {
  try {
    const row = db.query('SELECT * FROM n8n_config WHERE id = ?', ['n8n-config']).get() as any;
    if (row) {
      n8nConfig = {
        id: row.id, enabled: Boolean(row.enabled), baseUrl: row.base_url,
        apiKey: row.api_key, webhookSecret: row.webhook_secret,
        workflows: JSON.parse(row.workflows || '{}'), triggers: JSON.parse(row.triggers || '{}'),
      };
    }
  } catch (e) {}
}
