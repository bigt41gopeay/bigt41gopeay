// macOS Shortcuts Integration — AppleScript bridge + URL scheme
// ~/missioncontrol/backend/src/automation/shortcutsBridge.ts

import { db } from '../db';
import { createJob } from '../council/orchestrator';
import { getSubscriptions } from '../memory/subscriptionManager';
import { parseVoiceCommand, executeVoiceCommand } from './voiceTrigger';

export interface ShortcutAction {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'url_scheme' | 'applescript' | 'siri' | 'hotkey';
    urlScheme?: string; // missioncontrol://action/name
    appleScript?: string;
    siriPhrase?: string;
    hotkey?: string; // e.g., "Cmd+Shift+M"
  };
  prompt: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'file';
    required: boolean;
    default?: any;
    description: string;
  }[];
  enabled: boolean;
  runCount: number;
  createdAt: string;
}

const shortcutActions = new Map<string, ShortcutAction>();

export function initShortcutsBridge() {
  initShortcutsTables();
  loadShortcutActions();
  createDefaultActions();
  console.log('[Shortcuts] Bridge initialized');
}

// ─── Default Actions ───

function createDefaultActions() {
  const defaults: Omit<ShortcutAction, 'id' | 'runCount' | 'createdAt'>[] = [
    {
      name: 'Quick Task',
      description: 'Execute any task via Mission Control',
      trigger: { type: 'url_scheme', urlScheme: 'missioncontrol://task' },
      prompt: '{prompt}',
      parameters: [{ name: 'prompt', type: 'string', required: true, description: 'What to do' }],
      enabled: true,
    },
    {
      name: 'Code Review',
      description: 'Review code in selected file or folder',
      trigger: { type: 'url_scheme', urlScheme: 'missioncontrol://review' },
      prompt: 'Review this code for bugs, style issues, and improvements: {path}',
      parameters: [{ name: 'path', type: 'file', required: true, description: 'File or folder path' }],
      enabled: true,
    },
    {
      name: 'SEO Check',
      description: 'Check SEO for a website',
      trigger: { type: 'url_scheme', urlScheme: 'missioncontrol://seo' },
      prompt: 'Analyze SEO for {url} and generate a report with recommendations',
      parameters: [{ name: 'url', type: 'string', required: true, description: 'Website URL' }],
      enabled: true,
    },
    {
      name: 'Summarize',
      description: 'Summarize text or document',
      trigger: { type: 'url_scheme', urlScheme: 'missioncontrol://summarize' },
      prompt: 'Summarize the following content concisely: {content}',
      parameters: [{ name: 'content', type: 'string', required: true, description: 'Text to summarize' }],
      enabled: true,
    },
    {
      name: 'Write Tests',
      description: 'Generate unit tests for code',
      trigger: { type: 'url_scheme', urlScheme: 'missioncontrol://test' },
      prompt: 'Write comprehensive unit tests for this code: {code}',
      parameters: [{ name: 'code', type: 'string', required: true, description: 'Code to test' }],
      enabled: true,
    },
    {
      name: 'Voice Command',
      description: 'Execute natural language command',
      trigger: { type: 'siri', siriPhrase: 'Ask Mission Control' },
      prompt: '{command}',
      parameters: [{ name: 'command', type: 'string', required: true, description: 'Voice command' }],
      enabled: true,
    },
  ];

  for (const action of defaults) {
    if (!Array.from(shortcutActions.values()).find(a => a.name === action.name)) {
      addShortcutAction(action);
    }
  }
}

// ─── CRUD ───

export async function addShortcutAction(action: Omit<ShortcutAction, 'id' | 'runCount' | 'createdAt'>): Promise<ShortcutAction> {
  const id = `shortcut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const shortcut: ShortcutAction = { ...action, id, runCount: 0, createdAt: new Date().toISOString() };
  shortcutActions.set(id, shortcut);
  persistShortcutAction(shortcut);
  return shortcut;
}

export function removeShortcutAction(id: string): boolean {
  const removed = shortcutActions.delete(id);
  if (removed) { try { db.query('DELETE FROM shortcut_actions WHERE id = ?', [id]).run(); } catch (e) {} }
  return removed;
}

export function listShortcutActions(): ShortcutAction[] {
  return Array.from(shortcutActions.values());
}

export function getShortcutAction(id: string): ShortcutAction | undefined {
  return shortcutActions.get(id);
}

// ─── URL Scheme Handler ───

export async function handleUrlScheme(url: string, aiRouter: any): Promise<{ success: boolean; message: string; jobId?: string }> {
  // Parse URL: missioncontrol://action/name?param1=value1&param2=value2
  const match = url.match(/^missioncontrol:\/\/([^\/]+)\/([^?]+)(?:\?(.*))?$/);
  if (!match) return { success: false, message: 'Invalid URL scheme' };

  const [, actionType, actionName, queryString] = match;
  const params = parseQueryString(queryString || '');

  // Find matching action
  const action = Array.from(shortcutActions.values()).find(a => 
    a.trigger.urlScheme === `missioncontrol://${actionType}/${actionName}`
  );

  if (!action) {
    // Fallback: treat as voice command
    const voiceCmd = await parseVoiceCommand(params.prompt || actionName);
    const result = await executeVoiceCommand(voiceCmd, aiRouter);
    return { success: result.executed, message: result.response, jobId: result.id };
  }

  if (!action.enabled) return { success: false, message: 'Action is disabled' };

  // Validate parameters
  for (const param of action.parameters) {
    if (param.required && !params[param.name]) {
      return { success: false, message: `Missing required parameter: ${param.name}` };
    }
  }

  // Build prompt
  let prompt = action.prompt;
  for (const [key, value] of Object.entries(params)) {
    prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), String(value));
  }

  // Execute
  try {
    const subs = await getSubscriptions();
    const apiKeys: Record<string, string> = {};
    for (const sub of subs) { apiKeys[sub.provider === 'google' ? 'gemini' : sub.provider] = sub.apiKey; }

    const job = await createJob(prompt, apiKeys, false, aiRouter);
    action.runCount++;
    persistShortcutAction(action);

    return { success: true, message: `Job started: ${job.id}`, jobId: job.id };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// ─── AppleScript Generator ───

export function generateAppleScript(action: ShortcutAction): string {
  const params = action.parameters.map(p => 
    `set ${p.name} to "{${p.name}}" -- ${p.description}`
  ).join('\n');

  const urlParams = action.parameters.map(p => `${p.name}=" & ${p.name} & "`).join('&');

  return `-- Mission Control Shortcut: ${action.name}
-- ${action.description}

${params}

set urlScheme to "missioncontrol://${action.trigger.urlScheme?.replace('missioncontrol://', '') || 'task/quick'}?${urlParams}"

tell application "Safari"
  open location urlScheme
end tell

-- Or use curl for silent execution:
-- do shell script "curl -s 'http://127.0.0.1:8787/api/automation/shortcut" & urlScheme & "' -H 'Authorization: Bearer YOUR_TOKEN'"
`;
}

export function generateShortcutsAppAction(action: ShortcutAction): string {
  return `{
  "action": "${action.name}",
  "description": "${action.description}",
  "urlScheme": "${action.trigger.urlScheme}",
  "parameters": ${JSON.stringify(action.parameters)},
  "setup": "Open Shortcuts app → Add Action → Web → Open URL → Enter: ${action.trigger.urlScheme}?prompt=[Ask Each Time]"
}`;
}

// ─── Siri Integration ───

export async function handleSiriCommand(phrase: string, aiRouter: any): Promise<string> {
  // Find matching action by Siri phrase
  const action = Array.from(shortcutActions.values()).find(a => 
    a.trigger.siriPhrase && phrase.toLowerCase().includes(a.trigger.siriPhrase.toLowerCase())
  );

  if (action) {
    const result = await handleUrlScheme(`${action.trigger.urlScheme}?prompt=${encodeURIComponent(phrase)}`, aiRouter);
    return result.message;
  }

  // Fallback to voice command parser
  const voiceCmd = await parseVoiceCommand(phrase);
  const result = await executeVoiceCommand(voiceCmd, aiRouter);
  return result.response;
}

// ─── Hotkey Handler ───

export function registerHotkey(hotkey: string, actionId: string): boolean {
  // In a real implementation, this would use a global hotkey library
  // For macOS, we'd use NSEvent.addGlobalMonitorForEventsMatchingMask
  console.log(`[Shortcuts] Registered hotkey ${hotkey} for action ${actionId}`);
  return true;
}

// ─── Helpers ───

function parseQueryString(qs: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of qs.split('&')) {
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  return params;
}

// ─── DB ───

function initShortcutsTables() {
  try {
    db.query(`CREATE TABLE IF NOT EXISTS shortcut_actions (
      id TEXT PRIMARY KEY, name TEXT, description TEXT, trigger TEXT,
      prompt TEXT, parameters TEXT, enabled INTEGER DEFAULT 1,
      run_count INTEGER DEFAULT 0, created_at TEXT
    )`).run();
  } catch (e) {}
}

function persistShortcutAction(action: ShortcutAction) {
  try {
    db.query(`INSERT OR REPLACE INTO shortcut_actions 
      (id, name, description, trigger, prompt, parameters, enabled, run_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      action.id, action.name, action.description, JSON.stringify(action.trigger),
      action.prompt, JSON.stringify(action.parameters), action.enabled ? 1 : 0,
      action.runCount, action.createdAt
    );
  } catch (e) {}
}

function loadShortcutActions() {
  try {
    const rows = db.query('SELECT * FROM shortcut_actions').all() as any[];
    for (const row of rows) {
      shortcutActions.set(row.id, {
        id: row.id, name: row.name, description: row.description,
        trigger: JSON.parse(row.trigger || '{}'), prompt: row.prompt,
        parameters: JSON.parse(row.parameters || '[]'), enabled: Boolean(row.enabled),
        runCount: row.run_count, createdAt: row.created_at,
      });
    }
    console.log(`[Shortcuts] Loaded ${rows.length} actions`);
  } catch (e) { console.log('[Shortcuts] No existing actions'); }
}
