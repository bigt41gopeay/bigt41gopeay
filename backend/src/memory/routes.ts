// Memory & Learning API Routes
// Add to ~/missioncontrol/backend/src/server.ts

import { Hono } from 'hono';
import { 
  analyzeCompletedJob, getAdaptiveDecomposition, getLearningMetrics, 
  updateAdaptiveConfig, getAdaptiveConfig, initMemoryTables 
} from './memory/learningEngine';
import { 
  getSubscriptions, addOrUpdateSubscription, deleteSubscription,
  checkSubscriptionHealth, getBudgetAlerts, trackUsage, syncSubscriptionsFromConfig
} from './memory/subscriptionManager';
import type { LearningInsight, WorkPattern, TaskTemplate } from './memory/types';

// Initialize memory tables on startup (call after DB init)
initMemoryTables();

// === MEMORY & LEARNING ROUTES ===

// GET /api/memory/metrics — Learning metrics dashboard
app.get('/api/memory/metrics', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const metrics = await getLearningMetrics();
  return c.json({ metrics });
});

// GET /api/memory/patterns — Learned work patterns
app.get('/api/memory/patterns', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  try {
    const rows = db.query('SELECT * FROM work_patterns ORDER BY frequency DESC, confidence DESC').all() as any[];
    const patterns = rows.map(r => ({
      id: r.id,
      patternType: r.pattern_type,
      pattern: r.pattern,
      frequency: r.frequency,
      confidence: r.confidence,
      lastObserved: r.last_observed,
      examples: JSON.parse(r.examples || '[]'),
    }));
    return c.json({ patterns });
  } catch (e) {
    return c.json({ patterns: [] });
  }
});

// GET /api/memory/templates — Learned task templates
app.get('/api/memory/templates', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  try {
    const rows = db.query('SELECT * FROM task_templates ORDER BY usage_count DESC, success_rate DESC').all() as any[];
    const templates = rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      triggerPatterns: JSON.parse(r.trigger_patterns || '[]'),
      successRate: r.success_rate,
      avgActualCost: r.avg_actual_cost,
      avgActualDuration: r.avg_actual_duration,
      usageCount: r.usage_count,
      lastUsed: r.last_used,
    }));
    return c.json({ templates });
  } catch (e) {
    return c.json({ templates: [] });
  }
});

// GET /api/memory/insights — Generated insights
app.get('/api/memory/insights', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const type = c.req.query('type');
  const limit = parseInt(c.req.query('limit') || '20');

  try {
    let sql = 'SELECT * FROM learning_insights WHERE dismissed = 0';
    const params: any[] = [];
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const rows = db.query(sql, params).all() as any[];
    const insights = rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      type: r.type,
      title: r.title,
      description: r.description,
      impact: r.impact,
      data: JSON.parse(r.data || '{}'),
      applied: Boolean(r.applied),
    }));
# Part 5/5
    return c.json({ insights });
  } catch (e) {
    return c.json({ insights: [] });
  }
});

// POST /api/memory/insights/:id/apply — Apply an insight
app.post('/api/memory/insights/:id/apply', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const id = c.req.param('id');
  try {
    db.query('UPDATE learning_insights SET applied = 1 WHERE id = ?', [id]).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to apply insight' }, 500);
  }
});

// POST /api/memory/insights/:id/dismiss — Dismiss an insight
app.post('/api/memory/insights/:id/dismiss', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const id = c.req.param('id');
  try {
    db.query('UPDATE learning_insights SET dismissed = 1 WHERE id = ?', [id]).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to dismiss insight' }, 500);
  }
});

// GET /api/memory/config — Get adaptive config
app.get('/api/memory/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const cfg = await getAdaptiveConfig();
  return c.json({ config: cfg });
});

// POST /api/memory/config — Update adaptive config
app.post('/api/memory/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  await updateAdaptiveConfig(body);
  const cfg = await getAdaptiveConfig();
  return c.json({ success: true, config: cfg });
});

// === SUBSCRIPTION ROUTES ===

// GET /api/memory/subscriptions — List all subscriptions
app.get('/api/memory/subscriptions', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const subs = await getSubscriptions();
  // Don't return API keys
  const safe = subs.map(s => ({
    id: s.id,
    provider: s.provider,
    tier: s.tier,
    rateLimit: s.rateLimit,
    usage: s.usage,
    status: s.status,
    expiresAt: s.expiresAt,
    lastChecked: s.lastChecked,
    metadata: s.metadata,
  }));
  return c.json({ subscriptions: safe });
});

// POST /api/memory/subscriptions — Add/update subscription
app.post('/api/memory/subscriptions', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const sub = await addOrUpdateSubscription({
    id: body.id || `sub-${body.provider}-${Date.now()}`,
    provider: body.provider,
    tier: body.tier || 'pro',
    apiKey: body.apiKey,
    rateLimit: body.rateLimit || { requestsPerMinute: 60, tokensPerMinute: 60000, requestsPerDay: 10000 },
    status: body.status || 'active',
    expiresAt: body.expiresAt,
    metadata: { ...body.metadata, monthlyBudget: body.monthlyBudget || 50 },
  });

  // Sync with main config
  if (config.apiKeys) {
    config.apiKeys[body.provider === 'google' ? 'gemini' : body.provider] = body.apiKey;
    saveConfig();
  }

  return c.json({ success: true, subscription: { id: sub.id, provider: sub.provider, status: sub.status } });
});

// DELETE /api/memory/subscriptions/:id — Remove subscription
app.delete('/api/memory/subscriptions/:id', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const id = c.req.param('id');
  const ok = await deleteSubscription(id);
  return c.json({ success: ok });
});

// GET /api/memory/subscriptions/health — Health check all subscriptions
app.get('/api/memory/subscriptions/health', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const health = await checkSubscriptionHealth();
  return c.json({ health });
});

// GET /api/memory/subscriptions/alerts — Budget alerts
app.get('/api/memory/subscriptions/alerts', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const alerts = await getBudgetAlerts();
  return c.json({ alerts });
});

// POST /api/memory/subscriptions/sync — Sync from config
app.post('/api/memory/subscriptions/sync', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  await syncSubscriptionsFromConfig(config.apiKeys || {});
  const subs = await getSubscriptions();
  return c.json({ success: true, count: subs.length });
});

// POST /api/memory/feedback — User feedback on a job
app.post('/api/memory/feedback', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const { jobId, rating, comment } = body; // rating: -1 to 1

  try {
    // Update job with feedback
    db.query('UPDATE autonomous_jobs SET user_feedback = ? WHERE id = ?', [rating, jobId]).run();

    // Update template if exists
    const job = db.query('SELECT * FROM autonomous_jobs WHERE id = ?', [jobId]).get() as any;
    if (job) {
      const templates = db.query('SELECT * FROM task_templates WHERE trigger_patterns LIKE ?', 
        [`%${extractKeywords(job.user_request || '').join('%')}%`]).all() as any[];

      for (const t of templates) {
        const newFeedback = (t.user_feedback * t.usage_count + rating) / (t.usage_count + 1);
        db.query('UPDATE task_templates SET user_feedback = ? WHERE id = ?', [newFeedback, t.id]).run();
      }
    }

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to save feedback' }, 500);
  }
});

// Helper for keyword extraction
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'and', 'but', 'or', 'yet', 'so', 'if', 'because', 'although', 'though', 'while', 'where', 'when', 'that', 'which', 'who', 'whom', 'whose', 'what', 'this', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing']);

  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 10);
}
