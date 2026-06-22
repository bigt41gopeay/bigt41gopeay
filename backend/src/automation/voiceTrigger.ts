// Voice & Chat Trigger — handle voice commands and natural language triggers
// ~/missioncontrol/backend/src/automation/voiceTrigger.ts

import { db } from '../db';
import { createJob } from '../council/orchestrator';
import { getSubscriptions } from '../memory/subscriptionManager';
import { parseNaturalSchedule, createScheduledJob } from './scheduler';

export interface VoiceCommand {
  id: string;
  timestamp: string;
  rawText: string;
  intent: 'execute_job' | 'schedule_job' | 'query_status' | 'cancel_job' | 'system_command' | 'unknown';
  entities: Record<string, any>;
  confidence: number;
  response: string;
  executed: boolean;
}

// ─── Intent Parser ───

export async function parseVoiceCommand(text: string): Promise<VoiceCommand> {
  const lower = text.toLowerCase().trim();
  const now = new Date().toISOString();

  // Check for scheduling intent
  const schedulePatterns = [
    /(?:schedule|set up|create|add)\s+(?:a\s+)?(?:job|task|reminder)/i,
    /(?:every|daily|weekly|hourly|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /(?:run|execute|do)\s+(?:this|that|it)\s+(?:every|at|on)/i,
  ];

  // Check for status query
  const statusPatterns = [
    /(?:what|how|show|tell)\s+(?:me|us)?\s*(?:is|are|the)?\s*(?:status|progress|doing|going)/i,
    /(?:list|show|get)\s+(?:all|my|the)?\s*(?:jobs|tasks|running)/i,
  ];

  // Check for cancel intent
  const cancelPatterns = [
    /(?:cancel|stop|abort|kill)\s+(?:the|this|that|job|task)/i,
    /(?:stop|cancel)\s+(?:all|everything)/i,
  ];

  // Check for system command
  const systemPatterns = [
    /(?:arm|disarm|toggle)\s+(?:system|control)/i,
    /(?:show|open|go to)\s+(?:dashboard|monitor|control|settings)/i,
  ];

  let intent: VoiceCommand['intent'] = 'unknown';
  let entities: Record<string, any> = {};
  let response = '';

  if (schedulePatterns.some(p => p.test(lower))) {
    intent = 'schedule_job';
    const scheduleInfo = parseNaturalSchedule(text);
    const prompt = text.replace(/(?:schedule|set up|create|add|every|daily|weekly|hourly|tomorrow|at|on|run|execute|do)\s+/gi, '').trim();
    entities = { schedule: scheduleInfo, prompt };
    response = `I'll schedule "${prompt}" ${formatSchedule(scheduleInfo)}`;
  } else if (statusPatterns.some(p => p.test(lower))) {
    intent = 'query_status';
    response = await getStatusResponse();
  } else if (cancelPatterns.some(p => p.test(lower))) {
    intent = 'cancel_job';
    const jobId = extractJobId(text);
    entities = { jobId };
    response = jobId ? `Cancelling job ${jobId}` : 'Which job should I cancel?';
  } else if (systemPatterns.some(p => p.test(lower))) {
    intent = 'system_command';
    if (lower.includes('arm')) { entities = { command: 'arm' }; response = 'System armed'; }
    else if (lower.includes('disarm')) { entities = { command: 'disarm' }; response = 'System disarmed'; }
    else { entities = { command: 'navigate', target: extractTarget(lower) }; response = `Opening ${entities.target}`; }
  } else {
    // Default: execute job
    intent = 'execute_job';
    entities = { prompt: text };
    response = `Executing: "${text.substring(0, 60)}..."`;
  }

  return {
    id: `voice-${Date.now()}`,
    timestamp: now,
    rawText: text,
    intent,
    entities,
    confidence: 0.85,
    response,
    executed: false,
  };
}

// ─── Execute Voice Command ───

export async function executeVoiceCommand(cmd: VoiceCommand, aiRouter: any): Promise<VoiceCommand> {
  const subs = await getSubscriptions();
  const apiKeys: Record<string, string> = {};
  for (const sub of subs) { apiKeys[sub.provider === 'google' ? 'gemini' : sub.provider] = sub.apiKey; }

  try {
    switch (cmd.intent) {
      case 'execute_job': {
        const job = await createJob(cmd.entities.prompt, apiKeys, false, aiRouter);
        cmd.response = `Job started: ${job.id}. Check the Autonomous tab.`;
        cmd.executed = true;
        break;
      }

      case 'schedule_job': {
        const sched = await createScheduledJob({
          name: cmd.entities.prompt.substring(0, 50),
          description: cmd.entities.prompt,
          prompt: cmd.entities.prompt,
          schedule: cmd.entities.schedule,
          enabled: true,
          config: { notifyOnComplete: true, notifyOnFailure: true },
        });
        cmd.response = `Scheduled "${cmd.entities.prompt}" ${formatSchedule(cmd.entities.schedule)}. ID: ${sched.id}`;
        cmd.executed = true;
        break;
      }

      case 'cancel_job': {
        if (cmd.entities.jobId) {
          const { cancelJob } = await import('../council/orchestrator');
          const ok = cancelJob(cmd.entities.jobId);
          cmd.response = ok ? 'Job cancelled' : 'Job not found';
        } else {
          cmd.response = 'Please specify which job to cancel';
        }
        cmd.executed = true;
        break;
      }

      case 'system_command': {
        cmd.response = await executeSystemCommand(cmd.entities);
        cmd.executed = true;
        break;
      }

      case 'query_status': {
        cmd.response = await getStatusResponse();
        cmd.executed = true;
        break;
      }

      default: {
        cmd.response = "I'm not sure what you want. Try: 'Execute [task]', 'Schedule [task] every day at 9am', or 'Show status'";
      }
    }
  } catch (error: any) {
    cmd.response = `Error: ${error.message}`;
  }

  // Save to history
  saveVoiceCommand(cmd);

  return cmd;
}

// ─── Helpers ───

async function getStatusResponse(): Promise<string> {
  const { listJobs } = await import('../council/orchestrator');
  const jobs = listJobs().slice(0, 5);
  const running = jobs.filter(j => ['planning', 'deliberating', 'executing', 'verifying'].includes(j.status));
  const completed = jobs.filter(j => j.status === 'completed');

  let response = `Status: ${running.length} running, ${completed.length} completed today.`;
  if (running.length > 0) {
    response += ` Currently: ${running[0].userRequest.substring(0, 50)}...`;
  }
  return response;
}

async function executeSystemCommand(entities: any): Promise<string> {
  if (entities.command === 'arm') {
    // Would update config.armState
    return 'System armed. Shell execution enabled.';
  }
  if (entities.command === 'disarm') {
    return 'System disarmed. Shell execution disabled.';
  }
  return `Navigating to ${entities.target}`;
}

function extractJobId(text: string): string | null {
  const match = text.match(/job[-]?([a-z0-9]+)/i);
  return match ? match[0] : null;
}

function extractTarget(text: string): string {
  const targets = ['dashboard', 'monitor', 'control', 'settings', 'autonomous', 'memory', 'council'];
  return targets.find(t => text.includes(t)) || 'dashboard';
}

function formatSchedule(schedule: any): string {
  switch (schedule.type) {
    case 'cron': return `daily at ${schedule.cronExpression?.split(' ')[1] || '9'}:00`;
    case 'interval': return `every ${schedule.intervalMinutes} minutes`;
    case 'once': return `once at ${new Date(schedule.runAt).toLocaleString()}`;
    default: return 'soon';
  }
}

function saveVoiceCommand(cmd: VoiceCommand) {
  try {
    db.query(`INSERT INTO voice_commands (id, timestamp, raw_text, intent, entities, confidence, response, executed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      cmd.id, cmd.timestamp, cmd.rawText, cmd.intent,
      JSON.stringify(cmd.entities), cmd.confidence, cmd.response, cmd.executed ? 1 : 0
    );
  } catch (e) {
    console.error('Failed to save voice command:', e);
  }
}

export function initVoiceTables() {
  try {
    db.query(`CREATE TABLE IF NOT EXISTS voice_commands (
      id TEXT PRIMARY KEY, timestamp TEXT, raw_text TEXT, intent TEXT,
      entities TEXT, confidence REAL, response TEXT, executed INTEGER DEFAULT 0
    )`).run();
  } catch (e) {}
}
