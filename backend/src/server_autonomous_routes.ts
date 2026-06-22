// Add these routes to ~/missioncontrol/backend/src/server.ts
// Insert after existing routes, before the WS setup

import { Hono } from 'hono';
import { createJob, getJob, listJobs, cancelJob, initAutonomousTables, loadJobsFromDB } from './council/orchestrator';
import { agentRegistry } from './council/agentRegistry';

// ─── AUTONOMOUS AGENT ROUTES ───
// These should be added to your existing Hono app in server.ts

// Initialize tables on startup (call this after DB init)
initAutonomousTables();
loadJobsFromDB();

// POST /api/autonomous/jobs — Create a new autonomous job
app.post('/api/autonomous/jobs', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  if (token !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const { request } = body;

  if (!request || typeof request !== 'string') {
    return c.json({ error: 'request field required' }, 400);
  }

  // Get API keys from config
  const apiKeys = {
    openai: config.apiKeys?.openai || '',
    gemini: config.apiKeys?.gemini || '',
    kimi: config.apiKeys?.kimi || '',
    claude: config.apiKeys?.claude || '',
    groq: config.apiKeys?.groq || '',
  };

  // Get ARM state from config
  const armState = config.armState || false;

  const job = await createJob(request, apiKeys, armState, aiRouter);

  return c.json({
    success: true,
    jobId: job.id,
    status: job.status,
    message: 'Job created and started',
  });
});

// GET /api/autonomous/jobs — List all jobs
app.get('/api/autonomous/jobs', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  if (token !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const jobs = listJobs();
  return c.json({ jobs });
});

// GET /api/autonomous/jobs/:id — Get specific job
app.get('/api/autonomous/jobs/:id', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  if (token !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const jobId = c.req.param('id');
  const job = getJob(jobId);

  if (!job) return c.json({ error: 'Job not found' }, 404);
  return c.json({ job });
});

// POST /api/autonomous/jobs/:id/cancel — Cancel a job
app.post('/api/autonomous/jobs/:id/cancel', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  if (token !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const jobId = c.req.param('id');
  const success = cancelJob(jobId);

  return c.json({ success, message: success ? 'Job cancelled' : 'Job not found' });
});

// GET /api/autonomous/agents — List available agents and capabilities
app.get('/api/autonomous/agents', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  if (token !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const agents = agentRegistry.listAll();
  return c.json({ agents });
});

// POST /api/autonomous/agents/:id/execute — Direct agent execution (for testing)
app.post('/api/autonomous/agents/:id/execute', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  if (token !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const agentId = c.req.param('id');
  const body = await c.req.json();
  const { prompt, method, parameters } = body;

  const agent = agentRegistry.getAgent(agentId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  // This is a simplified direct execution — full execution goes through the orchestrator
  return c.json({
    success: true,
    agent: agent.name,
    method: method || agent.methods[0]?.id,
    message: 'Direct execution endpoint — use /api/autonomous/jobs for full orchestration',
  });
});

// WebSocket events for autonomous jobs (add to existing WS handler)
// When a job status changes, broadcast to connected clients:
// ws.send(JSON.stringify({ type: 'autonomous:update', jobId, status, logs }));
