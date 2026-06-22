# AUTONOMOUS AGENT COUNCIL + ADAPTIVE MEMORY — Integration Guide
# ~/missioncontrol/INTEGRATION.md

## FILES TO COPY

### Backend (new)
```bash
cp backend/src/council/automation_types.ts ~/missioncontrol/backend/src/council/
cp backend/src/council/agentRegistry.ts ~/missioncontrol/backend/src/council/
cp backend/src/council/decomposer.ts ~/missioncontrol/backend/src/council/
cp backend/src/council/deliberator.ts ~/missioncontrol/backend/src/council/
cp backend/src/council/executor.ts ~/missioncontrol/backend/src/council/
cp backend/src/council/orchestrator.ts ~/missioncontrol/backend/src/council/
cp backend/src/council/orchestrator_memory_patch.ts ~/missioncontrol/backend/src/council/

# NEW: Memory & Learning
cp backend/src/memory/types.ts ~/missioncontrol/backend/src/memory/
cp backend/src/memory/learningEngine.ts ~/missioncontrol/backend/src/memory/
cp backend/src/memory/subscriptionManager.ts ~/missioncontrol/backend/src/memory/
cp backend/src/memory/routes.ts ~/missioncontrol/backend/src/memory/
```

### Frontend (new)
```bash
cp web/src/AutonomousPanel.tsx ~/missioncontrol/web/src/
cp web/src/MemoryPanel.tsx ~/missioncontrol/web/src/
```

## STEP 1: Modify server.ts

Add these imports at the TOP of `~/missioncontrol/backend/src/server.ts`:

```typescript
import { 
  createJob, getJob, listJobs, cancelJob, 
  initAutonomousTables, loadJobsFromDB 
} from './council/orchestrator';
import { agentRegistry } from './council/agentRegistry';

// NEW: Memory & Learning
import { 
  analyzeCompletedJob, getAdaptiveDecomposition, getLearningMetrics, 
  updateAdaptiveConfig, getAdaptiveConfig, initMemoryTables 
} from './memory/learningEngine';
import { 
  getSubscriptions, addOrUpdateSubscription, deleteSubscription,
  checkSubscriptionHealth, getBudgetAlerts, trackUsage, syncSubscriptionsFromConfig
} from './memory/subscriptionManager';
```

After your existing DB initialization, add:

```typescript
initAutonomousTables();
loadJobsFromDB();
initMemoryTables(); // NEW
```

## STEP 2: Add Routes to server.ts

Add these route blocks AFTER your existing routes, BEFORE WebSocket setup:

```typescript
// === AUTONOMOUS AGENT COUNCIL ROUTES ===

app.post('/api/autonomous/jobs', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const { request } = body;
  if (!request?.trim()) return c.json({ error: 'request required' }, 400);

  const apiKeys = {
    openai: config.apiKeys?.openai || '',
    gemini: config.apiKeys?.gemini || '',
    kimi: config.apiKeys?.kimi || '',
    claude: config.apiKeys?.claude || '',
    groq: config.apiKeys?.groq || '',
  };

  const job = await createJob(request, apiKeys, config.armState || false, aiRouter);
  return c.json({ success: true, jobId: job.id, status: job.status });
});

app.get('/api/autonomous/jobs', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ jobs: listJobs() });
});

app.get('/api/autonomous/jobs/:id', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const job = getJob(c.req.param('id'));
  if (!job) return c.json({ error: 'Not found' }, 404);
  return c.json({ job });
});

app.post('/api/autonomous/jobs/:id/cancel', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ success: cancelJob(c.req.param('id')) });
});

app.get('/api/autonomous/agents', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ agents: agentRegistry.listAll() });
});

// === MEMORY & LEARNING ROUTES ===

app.get('/api/memory/metrics', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ metrics: await getLearningMetrics() });
});

app.get('/api/memory/patterns', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const rows = db.query('SELECT * FROM work_patterns ORDER BY frequency DESC, confidence DESC').all() as any[];
  return c.json({ patterns: rows.map(r => ({
    id: r.id, patternType: r.pattern_type, pattern: r.pattern,
    frequency: r.frequency, confidence: r.confidence, lastObserved: r.last_observed,
    examples: JSON.parse(r.examples || '[]'),
  }))});
});

app.get('/api/memory/templates', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const rows = db.query('SELECT * FROM task_templates ORDER BY usage_count DESC').all() as any[];
  return c.json({ templates: rows.map(r => ({
    id: r.id, name: r.name, description: r.description,
    successRate: r.success_rate, avgActualCost: r.avg_actual_cost,
    usageCount: r.usage_count, lastUsed: r.last_used,
  }))});
});

app.get('/api/memory/insights', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const rows = db.query('SELECT * FROM learning_insights WHERE dismissed = 0 ORDER BY timestamp DESC LIMIT 20').all() as any[];
  return c.json({ insights: rows.map(r => ({
    id: r.id, timestamp: r.timestamp, type: r.type, title: r.title,
    description: r.description, impact: r.impact,
    data: JSON.parse(r.data || '{}'), applied: Boolean(r.applied),
  }))});
});

app.post('/api/memory/insights/:id/apply', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  db.query('UPDATE learning_insights SET applied = 1 WHERE id = ?', [c.req.param('id')]).run();
  return c.json({ success: true });
});

app.post('/api/memory/insights/:id/dismiss', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  db.query('UPDATE learning_insights SET dismissed = 1 WHERE id = ?', [c.req.param('id')]).run();
  return c.json({ success: true });
});

app.get('/api/memory/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ config: await getAdaptiveConfig() });
});

app.post('/api/memory/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  await updateAdaptiveConfig(await c.req.json());
  return c.json({ success: true, config: await getAdaptiveConfig() });
});

app.get('/api/memory/subscriptions', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const subs = await getSubscriptions();
  return c.json({ subscriptions: subs.map(s => ({
    id: s.id, provider: s.provider, tier: s.tier, status: s.status,
    rateLimit: s.rateLimit, usage: s.usage, expiresAt: s.expiresAt,
    metadata: s.metadata,
  }))});
});

app.post('/api/memory/subscriptions', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const body = await c.req.json();
  const sub = await addOrUpdateSubscription({
    id: body.id || `sub-${body.provider}-${Date.now()}`,
    provider: body.provider, tier: body.tier || 'pro', apiKey: body.apiKey,
    rateLimit: body.rateLimit || { requestsPerMinute: 60, tokensPerMinute: 60000, requestsPerDay: 10000 },
    status: body.status || 'active', expiresAt: body.expiresAt,
    metadata: { ...body.metadata, monthlyBudget: body.monthlyBudget || 50 },
  });
  if (config.apiKeys) {
    config.apiKeys[body.provider === 'google' ? 'gemini' : body.provider] = body.apiKey;
    saveConfig();
  }
  return c.json({ success: true, subscription: { id: sub.id, provider: sub.provider, status: sub.status }});
});

app.delete('/api/memory/subscriptions/:id', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ success: await deleteSubscription(c.req.param('id')) });
});

app.get('/api/memory/subscriptions/health', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ health: await checkSubscriptionHealth() });
});

app.get('/api/memory/subscriptions/alerts', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ alerts: await getBudgetAlerts() });
});

app.post('/api/memory/subscriptions/sync', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  await syncSubscriptionsFromConfig(config.apiKeys || {});
  return c.json({ success: true, count: (await getSubscriptions()).length });
});

app.post('/api/memory/feedback', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const { jobId, rating } = await c.req.json();
  db.query('UPDATE autonomous_jobs SET user_feedback = ? WHERE id = ?', [rating, jobId]).run();
  return c.json({ success: true });
});
```

## STEP 3: Modify App.tsx

Open `~/missioncontrol/web/src/App.tsx` and:

1. Add imports at the TOP:
```typescript
import { AutonomousPanel } from './AutonomousPanel';
import { MemoryPanel } from './MemoryPanel';
```

2. Add to the NAV array (after 'Council'):
```typescript
{ id: 'autonomous', label: 'Autonomous', icon: '🤖' },
{ id: 'memory', label: 'Memory', icon: '🧠' },
```

3. Add to the render switch in Dashboard:
```typescript
case 'autonomous':
  return <AutonomousPanel token={token} />;
case 'memory':
  return <MemoryPanel token={token} />;
```

## STEP 4: Build and restart

```bash
cd ~/missioncontrol/web && ~/.bun/bin/bun run build
launchctl kickstart -k gui/$(id -u)/com.missioncontrol.backend
```

## STEP 5: Test

```bash
TOKEN=$(jq -r .token ~/.missioncontrol/config.json)

# List agents
curl -s http://127.0.0.1:8787/api/autonomous/agents -H "Authorization: Bearer $TOKEN" | jq

# Create a job
curl -s -X POST http://127.0.0.1:8787/api/autonomous/jobs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"request": "Write a Python script that fetches weather data"}' | jq

# Check memory metrics
curl -s http://127.0.0.1:8787/api/memory/metrics -H "Authorization: Bearer $TOKEN" | jq

# Check insights
curl -s http://127.0.0.1:8787/api/memory/insights -H "Authorization: Bearer $TOKEN" | jq

# Add subscription
curl -s -X POST http://127.0.0.1:8787/api/memory/subscriptions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"provider":"openai","apiKey":"sk-...","monthlyBudget":50}' | jq
```

## STEP 6: Configure in UI

1. Go to **Memory** tab → **Settings**
   - Enable "Learning" and "Auto-Select Agent"
   - Choose your preferred agents
   - Set cost preference

2. Go to **Memory** tab → **Subscriptions**
   - Add your API keys with monthly budgets
   - Monitor usage and health

3. Go to **Autonomous** tab
   - Submit a task
   - Watch council deliberate and execute
   - Check Memory tab for learned patterns and insights

## HOW IT LEARNS

After each job, the system automatically:

1. **Detects patterns**: Which agents you prefer, when you work, task sequences
2. **Creates templates**: Successful jobs become reusable templates
3. **Generates insights**: Cost savings, efficiency gains, agent suggestions
4. **Adapts future jobs**: Uses learned patterns to skip council for known tasks
5. **Tracks subscriptions**: Monitors API usage, budgets, rate limits

The more you use it, the smarter it gets — without repeating the same setup every time.
