// Subscription Manager — manages API keys, rate limits, usage tracking
// ~/missioncontrol/backend/src/memory/subscriptionManager.ts

import { db } from '../db';
import type { Subscription } from './types';

// ─── Subscription CRUD ───

export async function getSubscriptions(): Promise<Subscription[]> {
  try {
    const rows = db.query('SELECT * FROM subscriptions').all() as any[];
    return rows.map(row => ({
      id: row.id,
      provider: row.provider,
      tier: row.tier,
      apiKey: decryptKey(row.api_key),
      rateLimit: JSON.parse(row.rate_limit || '{}'),
      usage: JSON.parse(row.usage || '{}'),
      status: row.status,
      expiresAt: row.expires_at,
      lastChecked: row.last_checked,
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  } catch (e) {
    return [];
  }
}

export async function getSubscription(provider: string): Promise<Subscription | null> {
  try {
    const row = db.query('SELECT * FROM subscriptions WHERE provider = ?', [provider]).get() as any;
    if (!row) return null;

    return {
      id: row.id,
      provider: row.provider,
      tier: row.tier,
      apiKey: decryptKey(row.api_key),
      rateLimit: JSON.parse(row.rate_limit || '{}'),
      usage: JSON.parse(row.usage || '{}'),
      status: row.status,
      expiresAt: row.expires_at,
      lastChecked: row.last_checked,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  } catch (e) {
    return null;
  }
}

export async function addOrUpdateSubscription(sub: Omit<Subscription, 'usage' | 'lastChecked'>): Promise<Subscription> {
  const existing = await getSubscription(sub.provider);

  const subscription: Subscription = {
    ...sub,
    usage: existing?.usage || {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      currentMonthCost: 0,
      currentMonthTokens: 0,
    },
    lastChecked: new Date().toISOString(),
  };

  try {
    db.query(`INSERT INTO subscriptions 
      (id, provider, tier, api_key, rate_limit, usage, status, expires_at, last_checked, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider = excluded.provider,
        tier = excluded.tier,
        api_key = excluded.api_key,
        rate_limit = excluded.rate_limit,
        status = excluded.status,
        expires_at = excluded.expires_at,
        last_checked = excluded.last_checked,
        metadata = excluded.metadata
    `).run(
      subscription.id,
      subscription.provider,
      subscription.tier,
      encryptKey(subscription.apiKey),
      JSON.stringify(subscription.rateLimit),
      JSON.stringify(subscription.usage),
      subscription.status,
      subscription.expiresAt,
      subscription.lastChecked,
      JSON.stringify(subscription.metadata)
    );
  } catch (e) {
    console.error('Failed to save subscription:', e);
  }

  return subscription;
}

export async function deleteSubscription(id: string): Promise<boolean> {
  try {
    db.query('DELETE FROM subscriptions WHERE id = ?', [id]).run();
    return true;
  } catch (e) {
    return false;
  }
}

// ─── Usage Tracking ───

export async function trackUsage(
  provider: string, 
  tokens: number, 
  cost: number,
  model?: string
): Promise<void> {
  const sub = await getSubscription(provider);
  if (!sub) return;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Check if we need to reset monthly counters
  const lastMonth = sub.lastChecked ? sub.lastChecked.substring(0, 7) : monthKey;
  const shouldResetMonth = lastMonth !== monthKey;

  const updated: Subscription = {
    ...sub,
    usage: {
      totalRequests: sub.usage.totalRequests + 1,
      totalTokens: sub.usage.totalTokens + tokens,
      totalCost: sub.usage.totalCost + cost,
      currentMonthCost: shouldResetMonth ? cost : sub.usage.currentMonthCost + cost,
      currentMonthTokens: shouldResetMonth ? tokens : sub.usage.currentMonthTokens + tokens,
    },
    lastChecked: now.toISOString(),
  };

  // Check if approaching limits
  const requestsPerMinute = sub.rateLimit.requestsPerMinute || Infinity;
  const tokensPerMinute = sub.rateLimit.tokensPerMinute || Infinity;

  // Simple rate limit check (in production, use sliding window)
  if (updated.usage.currentMonthCost > (sub.metadata?.monthlyBudget || Infinity)) {
    updated.status = 'limited';
  }

  await addOrUpdateSubscription(updated);
}

// ─── Rate Limit Checking ───

export async function canUseProvider(provider: string, estimatedTokens: number): Promise<{
  allowed: boolean;
  reason?: string;
  alternative?: string;
}> {
  const sub = await getSubscription(provider);

  if (!sub) {
    return { 
      allowed: false, 
      reason: `No subscription for ${provider}`,
      alternative: 'qwen-local' // fallback to local
    };
  }

  if (sub.status === 'expired') {
    return { 
      allowed: false, 
      reason: 'Subscription expired',
      alternative: 'qwen-local'
    };
  }

  if (sub.status === 'limited') {
    return { 
      allowed: false, 
      reason: 'Rate limit or budget reached',
      alternative: 'qwen-local'
    };
  }

  if (sub.status === 'paused') {
    return { 
      allowed: false, 
      reason: 'Subscription paused',
      alternative: 'qwen-local'
    };
  }

  // Check if estimated tokens exceed remaining limit
  const monthlyLimit = sub.rateLimit.tokensPerMinute * 60 * 24 * 30; // rough monthly estimate
  if (sub.usage.currentMonthTokens + estimatedTokens > monthlyLimit * 0.9) {
    return { 
      allowed: true, 
      reason: 'Approaching monthly token limit (90%)' 
    };
  }

  return { allowed: true };
}

// ─── Cost Estimation ───

export async function estimateJobCost(
  subtasks: { agentId: string; estimatedTokens: number }[]
): Promise<{
  totalCost: number;
  breakdown: Record<string, number>;
  warnings: string[];
}> {
  let totalCost = 0;
  const breakdown: Record<string, number> = {};
  const warnings: string[] = [];

  for (const st of subtasks) {
    const agent = await getSubscriptionAgent(st.agentId);
    if (!agent) {
      warnings.push(`No subscription for ${st.agentId}, will use local fallback`);
      continue;
    }

    const cost = (agent.costPer1K || 0) * (st.estimatedTokens / 1000);
    totalCost += cost;
    breakdown[st.agentId] = (breakdown[st.agentId] || 0) + cost;

    // Check budget
    const sub = await getSubscription(agent.provider);
    if (sub && sub.metadata?.monthlyBudget) {
      const remaining = sub.metadata.monthlyBudget - sub.usage.currentMonthCost;
      if (cost > remaining * 0.5) {
        warnings.push(`${agent.provider}: This task uses >50% of remaining budget`);
      }
    }
  }

  return { totalCost, breakdown, warnings };
}

// ─── Subscription Health Check ───

export async function checkSubscriptionHealth(): Promise<{
  provider: string;
  status: string;
  issues: string[];
}[]> {
  const subs = await getSubscriptions();
  const results = [];

  for (const sub of subs) {
    const issues: string[] = [];

    // Check API key validity (lightweight check)
    const isValid = await validateApiKey(sub.provider, sub.apiKey);
    if (!isValid) {
      issues.push('API key appears invalid');
    }

    // Check budget
    if (sub.metadata?.monthlyBudget) {
      const percentUsed = (sub.usage.currentMonthCost / sub.metadata.monthlyBudget) * 100;
      if (percentUsed > 90) issues.push(`Budget ${percentUsed.toFixed(1)}% used`);
      else if (percentUsed > 75) issues.push(`Budget ${percentUsed.toFixed(1)}% used`);
    }

    // Check expiration
    if (sub.expiresAt) {
      const daysUntilExpiry = (new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry < 7) issues.push(`Expires in ${daysUntilExpiry.toFixed(1)} days`);
    }

    results.push({
      provider: sub.provider,
      status: issues.length === 0 ? 'healthy' : 'warning',
      issues,
    });
  }

  return results;
}

// ─── Budget Alerts ───

export async function getBudgetAlerts(): Promise<{
  provider: string;
  alert: string;
  severity: 'critical' | 'warning' | 'info';
  current: number;
  limit: number;
}[]> {
  const subs = await getSubscriptions();
  const alerts = [];

  for (const sub of subs) {
    if (!sub.metadata?.monthlyBudget) continue;

    const percentUsed = (sub.usage.currentMonthCost / sub.metadata.monthlyBudget) * 100;

    if (percentUsed >= 100) {
      alerts.push({
        provider: sub.provider,
        alert: 'Budget exhausted',
        severity: 'critical',
        current: sub.usage.currentMonthCost,
        limit: sub.metadata.monthlyBudget,
      });
    } else if (percentUsed >= 90) {
      alerts.push({
        provider: sub.provider,
        alert: 'Budget >90% used',
        severity: 'warning',
        current: sub.usage.currentMonthCost,
        limit: sub.metadata.monthlyBudget,
      });
    } else if (percentUsed >= 75) {
      alerts.push({
        provider: sub.provider,
        alert: 'Budget >75% used',
        severity: 'info',
        current: sub.usage.currentMonthCost,
        limit: sub.metadata.monthlyBudget,
      });
    }
  }

  return alerts;
}

// ─── Helpers ───

async function validateApiKey(provider: string, apiKey: string): Promise<boolean> {
  if (!apiKey) return false;

  try {
    switch (provider) {
      case 'openai':
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return res.ok;

      case 'anthropic':
        const claudeRes = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        });
        return claudeRes.ok;

      case 'google':
        // Gemini uses key in URL, do a lightweight check
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { method: 'GET' }
        );
        return geminiRes.ok;

      case 'moonshot':
        const kimiRes = await fetch('https://api.moonshot.cn/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return kimiRes.ok;

      case 'groq':
        const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return groqRes.ok;

      case 'ollama':
        // Check local Ollama
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/tags', { method: 'GET' });
        return ollamaRes.ok;

      default:
        return true; // Assume valid for unknown providers
    }
  } catch (e) {
    return false;
  }
}

function getSubscriptionAgent(agentId: string): { provider: string; costPer1K: number } | null {
  const map: Record<string, { provider: string; costPer1K: number }> = {
    'chatgpt': { provider: 'openai', costPer1K: 0.005 },
    'claude-code': { provider: 'anthropic', costPer1K: 0.008 },
    'gemini': { provider: 'google', costPer1K: 0.0035 },
    'kimi': { provider: 'moonshot', costPer1K: 0.002 },
    'qwen-local': { provider: 'ollama', costPer1K: 0 },
    'qwen-coder-local': { provider: 'ollama', costPer1K: 0 },
    'system': { provider: 'ollama', costPer1K: 0 },
  };
  return map[agentId] || null;
}

// Simple XOR encryption for API keys (in production, use proper key management)
function encryptKey(key: string): string {
  const secret = process.env.MC_KEY_SECRET || 'missioncontrol-default-secret';
  let result = '';
  for (let i = 0; i < key.length; i++) {
    result += String.fromCharCode(key.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
  }
  return Buffer.from(result).toString('base64');
}

function decryptKey(encrypted: string): string {
  const secret = process.env.MC_KEY_SECRET || 'missioncontrol-default-secret';
  const key = Buffer.from(encrypted, 'base64').toString('binary');
  let result = '';
  for (let i = 0; i < key.length; i++) {
    result += String.fromCharCode(key.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
  }
  return result;
}

// ─── Export for config sync ───

export async function syncSubscriptionsFromConfig(configApiKeys: Record<string, string>) {
  const providers: Record<string, { id: string; provider: string; tier: string }> = {
    openai: { id: 'sub-openai', provider: 'openai', tier: 'pro' },
    gemini: { id: 'sub-gemini', provider: 'google', tier: 'pro' },
    kimi: { id: 'sub-kimi', provider: 'moonshot', tier: 'pro' },
    claude: { id: 'sub-claude', provider: 'anthropic', tier: 'pro' },
    groq: { id: 'sub-groq', provider: 'groq', tier: 'pro' },
  };

  for (const [key, apiKey] of Object.entries(configApiKeys)) {
    if (!apiKey) continue;
    const info = providers[key];
    if (!info) continue;

    await addOrUpdateSubscription({
      ...info,
      apiKey,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 60000,
        requestsPerDay: 10000,
      },
      status: 'active',
      metadata: { monthlyBudget: 50, source: 'config_sync' },
    });
  }
}
