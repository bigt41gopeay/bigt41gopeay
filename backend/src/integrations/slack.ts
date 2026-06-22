// Slack Integration — Webhook + Block Kit + Slash commands
// ~/missioncontrol/backend/src/integrations/slack.ts

import { db } from '../db';

export interface SlackConfig {
  id: string;
  enabled: boolean;
  webhookUrl: string; // Incoming Webhook URL
  botToken: string; // Bot User OAuth Token (for slash commands)
  channel: string; // Default channel, e.g., "#mission-control"
  username: string; // Bot name, e.g., "Mission Control"
  iconEmoji: string; // e.g., ":robot_face:"
  templates: {
    jobComplete: boolean;
    jobFailed: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    budgetAlert: boolean;
    insightGenerated: boolean;
  };
}

export interface SlackMessage {
  id: string;
  type: 'job_complete' | 'job_failed' | 'daily_digest' | 'weekly_report' | 'budget_alert' | 'insight' | 'interactive';
  channel: string;
  text: string;
  blocks?: any[];
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

let slackConfig: SlackConfig | null = null;

export async function initSlack() {
  initSlackTables();
  await loadSlackConfig();
  console.log('[Slack] Initialized');
}

export async function setSlackConfig(config: Omit<SlackConfig, 'id'>): Promise<SlackConfig> {
  slackConfig = { ...config, id: 'slack-config' };
  persistSlackConfig(slackConfig);
  return slackConfig;
}

export async function getSlackConfig(): Promise<SlackConfig | null> {
  return slackConfig;
}

export async function testSlackConnection(): Promise<{ success: boolean; message: string }> {
  if (!slackConfig || !slackConfig.enabled) {
    return { success: false, message: 'Slack not configured or disabled' };
  }
  try {
    const res = await fetch(slackConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Mission Control test message' }),
    });
    return { success: res.ok, message: res.ok ? 'Slack connection successful' : `HTTP ${res.status}` };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// ─── Send Message ───

export async function sendSlackMessage(msg: Omit<SlackMessage, 'id' | 'status'>): Promise<SlackMessage> {
  const fullMsg: SlackMessage = { ...msg, id: `slack-${Date.now()}`, status: 'pending' };

  if (!slackConfig || !slackConfig.enabled) {
    fullMsg.status = 'failed';
    fullMsg.error = 'Slack not configured';
    persistSlackMessage(fullMsg);
    return fullMsg;
  }

  try {
    const payload = {
      channel: msg.channel || slackConfig.channel,
      username: slackConfig.username,
      icon_emoji: slackConfig.iconEmoji,
      text: msg.text,
      blocks: msg.blocks,
    };

    const res = await fetch(slackConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      fullMsg.status = 'sent';
      fullMsg.sentAt = new Date().toISOString();
    } else {
      fullMsg.status = 'failed';
      fullMsg.error = `HTTP ${res.status}: ${await res.text()}`;
    }
  } catch (e: any) {
    fullMsg.status = 'failed';
    fullMsg.error = e.message;
  }

  persistSlackMessage(fullMsg);
  return fullMsg;
}

// ─── Report Generators ───

export async function sendSlackJobComplete(job: any): Promise<SlackMessage> {
  if (!slackConfig?.templates.jobComplete) return null as any;
  const blocks = generateJobBlocks(job, 'completed');
  return sendSlackMessage({
    type: 'job_complete',
    channel: slackConfig.channel,
    text: `✅ Job Completed: ${job.userRequest.substring(0, 80)}`,
    blocks,
  });
}

export async function sendSlackJobFailed(job: any): Promise<SlackMessage> {
  if (!slackConfig?.templates.jobFailed) return null as any;
  const blocks = generateJobBlocks(job, 'failed');
  return sendSlackMessage({
    type: 'job_failed',
    channel: slackConfig.channel,
    text: `❌ Job Failed: ${job.userRequest.substring(0, 80)}`,
    blocks,
  });
}

export async function sendSlackDailyDigest(): Promise<SlackMessage> {
  if (!slackConfig?.templates.dailyDigest) return null as any;
  const { getLearningMetrics } = await import('../memory/learningEngine');
  const metrics = await getLearningMetrics();
  const blocks = generateMetricsBlocks(metrics, 'Daily Digest');
  return sendSlackMessage({
    type: 'daily_digest',
    channel: slackConfig.channel,
    text: '📊 Daily Digest',
    blocks,
  });
}

export async function sendSlackWeeklyReport(): Promise<SlackMessage> {
  if (!slackConfig?.templates.weeklyReport) return null as any;
  const { getLearningMetrics } = await import('../memory/learningEngine');
  const metrics = await getLearningMetrics();
  const blocks = generateMetricsBlocks(metrics, 'Weekly Report');
  return sendSlackMessage({
    type: 'weekly_report',
    channel: slackConfig.channel,
    text: '📈 Weekly Report',
    blocks,
  });
}

export async function sendSlackBudgetAlert(sub: any): Promise<SlackMessage> {
  if (!slackConfig?.templates.budgetAlert) return null as any;
  const percent = ((sub.usage.currentMonthCost / sub.metadata.monthlyBudget) * 100).toFixed(0);
  const color = Number(percent) > 90 ? '#ff4757' : Number(percent) > 75 ? '#ff9f43' : '#f1c40f';

  return sendSlackMessage({
    type: 'budget_alert',
    channel: slackConfig.channel,
    text: `⚠️ Budget Alert: ${sub.provider} at ${percent}%`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '⚠️ Budget Alert', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${sub.provider}* is at *${percent}%* of monthly budget.`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Used:*\n$${sub.usage.currentMonthCost.toFixed(2)}` },
          { type: 'mrkdwn', text: `*Budget:*\n$${sub.metadata.monthlyBudget}` },
          { type: 'mrkdwn', text: `*Remaining:*\n$${(sub.metadata.monthlyBudget - sub.usage.currentMonthCost).toFixed(2)}` },
          { type: 'mrkdwn', text: `*Status:*\n${Number(percent) > 90 ? '🔴 Critical' : Number(percent) > 75 ? '🟠 Warning' : '🟡 Approaching'}` },
        ],
      },
    ],
  });
}

export async function sendSlackInsight(insight: any): Promise<SlackMessage> {
  if (!slackConfig?.templates.insightGenerated) return null as any;
  return sendSlackMessage({
    type: 'insight',
    channel: slackConfig.channel,
    text: `💡 New Insight: ${insight.title}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '💡 New Insight', emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${insight.title}*\n${insight.description}` },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Impact: ${insight.impact.toUpperCase()}` }],
      },
    ],
  });
}

// ─── Slash Command Handler ───

export async function handleSlackSlashCommand(payload: any, aiRouter: any): Promise<any> {
  const text = payload.text?.trim() || '';
  const user = payload.user_name;
  const channel = payload.channel_id;

  // Parse command
  const parts = text.split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (command) {
    case 'status':
    case 's': {
      const { listJobs } = await import('../council/orchestrator');
      const jobs = listJobs().slice(0, 5);
      const running = jobs.filter(j => ['planning', 'executing'].includes(j.status));
      return {
        response_type: 'ephemeral',
        text: `*Mission Control Status*\n${running.length} running, ${jobs.filter(j => j.status === 'completed').length} completed today.`,
      };
    }

    case 'run':
    case 'r': {
      if (!args) return { response_type: 'ephemeral', text: 'Usage: `/mc run [task description]`' };
      const { createJob } = await import('../council/orchestrator');
      const { getSubscriptions } = await import('../memory/subscriptionManager');
      const subs = await getSubscriptions();
      const apiKeys: Record<string, string> = {};
      for (const sub of subs) { apiKeys[sub.provider === 'google' ? 'gemini' : sub.provider] = sub.apiKey; }
      const job = await createJob(args, apiKeys, false, aiRouter);
      return {
        response_type: 'in_channel',
        text: `🚀 Job started by *${user}*: "${args.substring(0, 100)}..."\nID: \`${job.id}\``,
      };
    }

    case 'agents':
      const { agentRegistry } = await import('../council/agentRegistry');
      const agents = agentRegistry.listAll();
      return {
        response_type: 'ephemeral',
        text: `*Available Agents*\n${agents.map(a => `• ${a.name} (${a.specialties.join(', ')}) — $${a.costPer1K}/1K`).join('\n')}`,
      };

    case 'budget':
      const { getSubscriptions } = await import('../memory/subscriptionManager');
      const subscriptions = await getSubscriptions();
      return {
        response_type: 'ephemeral',
        text: `*Budget Status*\n${subscriptions.map(s => `• ${s.provider}: $${s.usage.currentMonthCost.toFixed(2)} / $${s.metadata?.monthlyBudget || '∞'}`).join('\n')}`,
      };

    case 'help':
    default:
      return {
        response_type: 'ephemeral',
        text: `*Mission Control Commands*\n• \`/mc run [task]\` — Execute a task\n• \`/mc status\` — Show running jobs\n• \`/mc agents\` — List available agents\n• \`/mc budget\` — Show budget status\n• \`/mc help\` — Show this help`,
      };
  }
}

// ─── Block Kit Generators ───

function generateJobBlocks(job: any, status: 'completed' | 'failed'): any[] {
  const color = status === 'completed' ? '#2ed573' : '#ff4757';
  const emoji = status === 'completed' ? '✅' : '❌';
  const totalCost = job.subtasks?.reduce((sum: number, s: any) => sum + (s.result?.metrics?.cost || 0), 0).toFixed(4);

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} Job ${status === 'completed' ? 'Completed' : 'Failed'}`, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${job.userRequest}*` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*ID:*\n\`${job.id}\`` },
        { type: 'mrkdwn', text: `*Status:*\n${status}` },
        { type: 'mrkdwn', text: `*Agents:*\n${job.subtasks?.length || 0}` },
        { type: 'mrkdwn', text: `*Cost:*\n$${totalCost}` },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Details' },
          url: `http://127.0.0.1:8787/#token=${process.env.MC_TOKEN || ''}&tab=autonomous&job=${job.id}`,
        },
      ],
    },
  ];
}

function generateMetricsBlocks(metrics: any, title: string): any[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📊 ${title}`, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Total Jobs:*\n${metrics.totalJobs}` },
        { type: 'mrkdwn', text: `*Successful:*\n${metrics.successfulJobs} ✅` },
        { type: 'mrkdwn', text: `*Failed:*\n${metrics.failedJobs} ❌` },
        { type: 'mrkdwn', text: `*Total Cost:*\n$${metrics.totalCost.toFixed(2)}` },
      ],
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Patterns:*\n${metrics.patternsLearned} 🔍` },
        { type: 'mrkdwn', text: `*Insights:*\n${metrics.insightsApplied}/${metrics.insightsGenerated} 💡` },
      ],
    },
  ];
}

// ─── Scheduled Slack Messages ───

export function initSlackScheduler() {
  setInterval(async () => {
    if (!slackConfig || !slackConfig.enabled) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (timeStr === '09:00') await sendSlackDailyDigest();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    if (dayNames[now.getDay()] === 'monday' && timeStr === '09:00') {
      await sendSlackWeeklyReport();
    }
  }, 60000);
}

// ─── DB ───

function initSlackTables() {
  try {
    db.query(`CREATE TABLE IF NOT EXISTS slack_config (
      id TEXT PRIMARY KEY, enabled INTEGER DEFAULT 0, webhook_url TEXT,
      bot_token TEXT, channel TEXT, username TEXT, icon_emoji TEXT, templates TEXT
    )`).run();
    db.query(`CREATE TABLE IF NOT EXISTS slack_messages (
      id TEXT PRIMARY KEY, type TEXT, channel TEXT, text TEXT, blocks TEXT,
      sent_at TEXT, status TEXT, error TEXT
    )`).run();
  } catch (e) {}
}

function persistSlackConfig(config: SlackConfig) {
  try {
    db.query(`INSERT OR REPLACE INTO slack_config (id, enabled, webhook_url, bot_token, channel, username, icon_emoji, templates)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      config.id, config.enabled ? 1 : 0, config.webhookUrl, config.botToken,
      config.channel, config.username, config.iconEmoji, JSON.stringify(config.templates)
    );
  } catch (e) {}
}

function persistSlackMessage(msg: SlackMessage) {
  try {
    db.query(`INSERT INTO slack_messages (id, type, channel, text, blocks, sent_at, status, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      msg.id, msg.type, msg.channel, msg.text, JSON.stringify(msg.blocks || []),
      msg.sentAt, msg.status, msg.error || null
    );
  } catch (e) {}
}

async function loadSlackConfig() {
  try {
    const row = db.query('SELECT * FROM slack_config WHERE id = ?', ['slack-config']).get() as any;
    if (row) {
      slackConfig = {
        id: row.id, enabled: Boolean(row.enabled), webhookUrl: row.webhook_url,
        botToken: row.bot_token, channel: row.channel, username: row.username,
        iconEmoji: row.icon_emoji, templates: JSON.parse(row.templates || '{}'),
      };
    }
  } catch (e) {}
}
