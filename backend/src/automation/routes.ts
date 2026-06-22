// Automation Routes — scheduler, voice, file watcher, git hooks, shortcuts
// Add to ~/missioncontrol/backend/src/server.ts

import { Hono } from 'hono';
import { 
  initScheduler, createScheduledJob, listScheduledJobs, getScheduledJob,
  updateScheduledJob, deleteScheduledJob, toggleScheduledJob, parseNaturalSchedule
} from './automation/scheduler';
import { 
  initVoiceTables, parseVoiceCommand, executeVoiceCommand 
} from './automation/voiceTrigger';
import {
  initFileWatcher, addWatchedFolder, removeWatchedFolder, listWatchedFolders, toggleWatchedFolder
} from './automation/fileWatcher';
import {
  initGitHooks, addGitHook, removeGitHook, listGitHooks, toggleGitHook, handleGitEvent, installGitHook
} from './automation/gitHook';
import {
  initShortcutsBridge, addShortcutAction, removeShortcutAction, listShortcutActions,
  handleUrlScheme, generateAppleScript, generateShortcutsAppAction, handleSiriCommand
} from './automation/shortcutsBridge';

// Initialize all automation systems on startup
initScheduler();
initVoiceTables();
initFileWatcher();
initGitHooks();
initShortcutsBridge();

// === SCHEDULER ROUTES ===

app.post('/api/automation/schedule', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const schedule = body.schedule || parseNaturalSchedule(body.when || 'every day at 9am');

  const job = await createScheduledJob({
    name: body.name || 'Scheduled Task',
    description: body.description || body.prompt,
    prompt: body.prompt,
    schedule,
    enabled: body.enabled !== false,
    config: body.config || { notifyOnComplete: true },
  });

  return c.json({ success: true, job });
});

app.get('/api/automation/schedule', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ jobs: listScheduledJobs() });
});

app.post('/api/automation/schedule/:id/toggle', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const enabled = toggleScheduledJob(c.req.param('id'));
  return c.json({ success: true, enabled });
});

app.delete('/api/automation/schedule/:id', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ success: deleteScheduledJob(c.req.param('id')) });
});

// === VOICE COMMAND ROUTES ===

app.post('/api/automation/voice', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const { text } = body;
  if (!text) return c.json({ error: 'text required' }, 400);

  const cmd = await parseVoiceCommand(text);
  const result = await executeVoiceCommand(cmd, aiRouter);

  return c.json({ 
    success: result.executed, 
    intent: result.intent,
    response: result.response,
    entities: result.entities,
  });
});

// === FILE WATCHER ROUTES ===

app.post('/api/automation/watch', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const folder = await addWatchedFolder({
    path: body.path,
    name: body.name || body.path,
    events: body.events || ['create', 'modify'],
    filter: body.filter || {},
    prompt: body.prompt || 'Analyze this file: {file}',
    enabled: body.enabled !== false,
    cooldownMinutes: body.cooldownMinutes || 5,
  });

  return c.json({ success: true, folder });
});

app.get('/api/automation/watch', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ folders: listWatchedFolders() });
});

app.post('/api/automation/watch/:id/toggle', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const enabled = toggleWatchedFolder(c.req.param('id'));
  return c.json({ success: true, enabled });
});

app.delete('/api/automation/watch/:id', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ success: removeWatchedFolder(c.req.param('id')) });
});

// === GIT HOOK ROUTES ===

app.post('/api/automation/git-hook', async (c) => {
  // Can be called without auth from git hooks (or with auth from UI)
  const body = await c.req.json();
  await handleGitEvent(body.repoPath, body.event, body.branch, body.commitHash, body.changedFiles);
  return c.json({ success: true });
});

app.post('/api/automation/git', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const hook = await addGitHook({
    repoPath: body.repoPath,
    name: body.name || body.repoPath,
    enabled: body.enabled !== false,
    triggers: body.triggers || { onPush: true, onCommit: false, onPR: false, onMerge: false },
    actions: body.actions || { codeReview: true, testGeneration: false, docGeneration: false, securityCheck: false },
    branches: body.branches || ['main', 'develop'],
    prompt: body.prompt || 'Review code changes',
  });

  // Install hook script
  await installGitHook(body.repoPath);

  return c.json({ success: true, hook });
});

app.get('/api/automation/git', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ hooks: listGitHooks() });
});

// === SHORTCUTS ROUTES ===

app.get('/api/automation/shortcuts', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  return c.json({ actions: listShortcutActions() });
});

app.post('/api/automation/shortcuts/:id/execute', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const body = await c.req.json();
  const action = listShortcutActions().find(a => a.id === c.req.param('id'));
  if (!action) return c.json({ error: 'Action not found' }, 404);

  const url = `${action.trigger.urlScheme}?${new URLSearchParams(body).toString()}`;
  const result = await handleUrlScheme(url, aiRouter);

  return c.json(result);
});

app.get('/api/automation/shortcuts/:id/applescript', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const action = listShortcutActions().find(a => a.id === c.req.param('id'));
  if (!action) return c.json({ error: 'Not found' }, 404);

  return c.json({ script: generateAppleScript(action) });
});

app.get('/api/automation/shortcuts/:id/shortcuts-app', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  const action = listShortcutActions().find(a => a.id === c.req.param('id'));
  if (!action) return c.json({ error: 'Not found' }, 404);

  return c.json({ config: generateShortcutsAppAction(action) });
});

// URL scheme handler (no auth required, called from browser/Siri)
app.get('/api/automation/url-scheme', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ error: 'url required' }, 400);

  const result = await handleUrlScheme(url, aiRouter);
  return c.json(result);
});

// Siri endpoint
app.post('/api/automation/siri', async (c) => {
  const body = await c.req.json();
  const { phrase } = body;
  if (!phrase) return c.json({ error: 'phrase required' }, 400);

  const response = await handleSiriCommand(phrase, aiRouter);
  return c.json({ response });
});
