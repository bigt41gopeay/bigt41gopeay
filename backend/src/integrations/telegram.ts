// Telegram Bot Integration — Webhook-based bot for Mission Control
// ~/missioncontrol/backend/src/integrations/telegram.ts

import { db } from '../db';
import { createJob } from '../council/orchestrator';
import { getSubscriptions } from '../memory/subscriptionManager';
import { parseVoiceCommand, executeVoiceCommand } from '../automation/voiceTrigger';

export interface TelegramConfig {
  id: string;
  enabled: boolean;
  botToken: string; // from @BotFather
  webhookUrl: string; // https://yourdomain.com/api/integrations/telegram/webhook
  allowedChatIds: string[]; // whitelist for security
  commands: {
    start: boolean;
    status: boolean;
    run: boolean;
    schedule: boolean;
    agents: boolean;
    budget: boolean;
    help: boolean;
  };
  notifications: {
    jobComplete: boolean;
    jobFailed: boolean;
    budgetAlert: boolean;
    insightGenerated: boolean;
  };
}

let telegramConfig: TelegramConfig | null = null;

export async function initTelegram() {
  initTelegramTables();
  await loadTelegramConfig();
  console.log('[Telegram] Initialized');
}

export async function setTelegramConfig(config: Omit<TelegramConfig, 'id'>): Promise<TelegramConfig> {
  telegramConfig = { ...config, id: 'telegram-config' };
  persistTelegramConfig(telegramConfig);

  // Set webhook with Telegram
  if (config.enabled && config.botToken && config.webhookUrl) {
    await setTelegramWebhook(config.botToken, config.webhookUrl);
  }

  return telegramConfig;
}

export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  return telegramConfig;
}

// ─── Telegram API Helpers ───

async function telegramApi(method: string, params: Record<string, any> = {}): Promise<any> {
  if (!telegramConfig?.botToken) throw new Error('Telegram not configured');

  const url = `https://api.telegram.org/bot${telegramConfig.botToken}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'Telegram API error');
  return data.result;
}

async function setTelegramWebhook(token: string, url: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, max_connections: 100 }),
  });
  const data = await res.json();
  console.log('[Telegram] Webhook set:', data.ok ? 'OK' : data.description);
}

export async function deleteTelegramWebhook(): Promise<void> {
  if (!telegramConfig?.botToken) return;
  await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/deleteWebhook`, { method: 'POST' });
}

// ─── Send Message ───

export async function sendTelegramMessage(chatId: string, text: string, options: any = {}): Promise<void> {
  if (!telegramConfig?.enabled) return;
  await telegramApi('sendMessage', {
    chat_id: chatId,
    text: text.substring(0, 4096), // Telegram limit
    parse_mode: 'Markdown',
    ...options,
  });
}

export async function sendTelegramJobNotification(job: any, status: 'completed' | 'failed'): Promise<void> {
  if (!telegramConfig?.enabled) return;
  if (status === 'completed' && !telegramConfig.notifications.jobComplete) return;
  if (status === 'failed' && !telegramConfig.notifications.jobFailed) return;

  const emoji = status === 'completed' ? '✅' : '❌';
  const totalCost = job.subtasks?.reduce((sum: number, s: any) => sum + (s.result?.metrics?.cost || 0), 0).toFixed(4);

  const text = `${emoji} *Job ${status === 'completed' ? 'Completed' : 'Failed'}*\n\n` +
    `📝 ${job.userRequest}\n\n` +
    `📊 Agents: ${job.subtasks?.length || 0}\n` +
    `💰 Cost: $${totalCost}\n` +
    `⏱️ Duration: ${((new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime()) / 1000).toFixed(1)}s\n\n` +
    `${job.finalResult ? `📝 *Result:*\n${job.finalResult.substring(0, 500)}...` : ''}`;

  for (const chatId of telegramConfig.allowedChatIds) {
    await sendTelegramMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [[
          { text: '📋 View Details', url: `http://127.0.0.1:8787/#token=${process.env.MC_TOKEN || ''}&tab=autonomous&job=${job.id}` },
        ]],
      },
    });
  }
}

// ─── Webhook Handler ───

export async function handleTelegramWebhook(update: any, aiRouter: any): Promise<void> {
  if (!telegramConfig?.enabled) return;

  const message = update.message || update.callback_query?.message;
  if (!message) return;

  const chatId = message.chat.id.toString();
  const text = update.message?.text || '';
  const callbackData = update.callback_query?.data;

  // Security check
  if (telegramConfig.allowedChatIds.length > 0 && !telegramConfig.allowedChatIds.includes(chatId)) {
    await sendTelegramMessage(chatId, '⛔ Access denied. Your chat ID is not whitelisted.');
    return;
  }

  // Handle callback queries
  if (callbackData) {
    await handleCallbackQuery(update.callback_query, aiRouter);
    return;
  }

  // Handle commands
  if (text.startsWith('/')) {
    await handleTelegramCommand(chatId, text, aiRouter);
    return;
  }

  // Handle natural language (treat as voice command)
  await handleTelegramNaturalLanguage(chatId, text, aiRouter);
}

async function handleTelegramCommand(chatId: string, text: string, aiRouter: any): Promise<void> {
  const parts = text.split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (command) {
    case '/start':
      if (!telegramConfig?.commands.start) return;
      await sendTelegramMessage(chatId, 
        '🤖 *Mission Control Bot*\n\n' +
        'Your autonomous AI assistant. I can:\n' +
        '• Execute AI tasks (/run)\n' +
        '• Check status (/status)\n' +
        '• Show agents (/agents)\n' +
        '• Check budget (/budget)\n' +
        '• Schedule jobs (/schedule)\n\n' +
        'Or just send me a message!',
        { reply_markup: { keyboard: [['/status', '/agents'], ['/budget', '/help']], resize_keyboard: true } }
      );
      break;

    case '/status':
      if (!telegramConfig?.commands.status) return;
      const { listJobs } = await import('../council/orchestrator');
      const jobs = listJobs().slice(0, 5);
      const running = jobs.filter(j => ['planning', 'executing'].includes(j.status));
      const statusText = `📊 *Status*\n\n` +
        `🔄 Running: ${running.length}\n` +
        `✅ Completed today: ${jobs.filter(j => j.status === 'completed').length}\n` +
        `❌ Failed: ${jobs.filter(j => j.status === 'failed').length}\n\n` +
        (running.length > 0 ? `*Current:* ${running[0].userRequest.substring(0, 100)}...` : 'No jobs running.');
      await sendTelegramMessage(chatId, statusText);
      break;

    case '/run':
      if (!telegramConfig?.commands.run) return;
      if (!args) {
        await sendTelegramMessage(chatId, 'Usage: `/run [task description]`\nExample: `/run Review my code for bugs`');
        return;
      }
      await sendTelegramMessage(chatId, '🚀 Starting job...');
      const subs = await getSubscriptions();
      const apiKeys: Record<string, string> = {};
      for (const sub of subs) { apiKeys[sub.provider === 'google' ? 'gemini' : sub.provider] = sub.apiKey; }
      const job = await createJob(args, apiKeys, false, aiRouter);
      await sendTelegramMessage(chatId, 
        `✅ Job started!\nID: \`${job.id}\`\nCheck status with /status`,
        { reply_markup: { inline_keyboard: [[{ text: '🔍 View in Dashboard', url: `http://127.0.0.1:8787/#token=${process.env.MC_TOKEN || ''}&tab=autonomous&job=${job.id}` }]] } }
      );
      break;

    case '/schedule':
      if (!telegramConfig?.commands.schedule) return;
      if (!args) {
        await sendTelegramMessage(chatId, 'Usage: `/schedule [when] [task]`\nExample: `/schedule every day at 9am Check SEO`');
        return;
      }
      // Parse natural schedule
      const { parseNaturalSchedule, createScheduledJob } = await import('../automation/scheduler');
      const schedule = parseNaturalSchedule(args);
      const prompt = args.replace(/(?:every|daily|weekly|hourly|tomorrow|at|on|run|execute|do)\s+/gi, '').trim();
      const sched = await createScheduledJob({
        name: prompt.substring(0, 50),
        description: prompt,
        prompt,
        schedule,
        enabled: true,
        config: { notifyOnComplete: true },
      });
      await sendTelegramMessage(chatId, `📅 Scheduled!\nID: \`${sched.id}\`\nNext run: ${sched.nextRun ? new Date(sched.nextRun).toLocaleString() : 'N/A'}`);
      break;

    case '/agents':
      if (!telegramConfig?.commands.agents) return;
      const { agentRegistry } = await import('../council/agentRegistry');
      const agents = agentRegistry.listAll();
      const agentsText = `🤖 *Available Agents*\n\n` +
        agents.map(a => 
          `• *${a.name}* (${a.id})\n  ${a.specialties.join(', ')} — $${a.costPer1K}/1K tokens`
        ).join('\n\n');
      await sendTelegramMessage(chatId, agentsText);
      break;

    case '/budget':
      if (!telegramConfig?.commands.budget) return;
      const { getSubscriptions } = await import('../memory/subscriptionManager');
      const subscriptions = await getSubscriptions();
      const budgetText = `💰 *Budget Status*\n\n` +
        subscriptions.map(s => {
          const percent = ((s.usage.currentMonthCost / (s.metadata?.monthlyBudget || 1)) * 100).toFixed(0);
          return `• *${s.provider}*: $${s.usage.currentMonthCost.toFixed(2)} / $${s.metadata?.monthlyBudget || '∞'} (${percent}%)`;
        }).join('\n');
      await sendTelegramMessage(chatId, budgetText);
      break;

    case '/help':
    default:
      if (!telegramConfig?.commands.help) return;
      await sendTelegramMessage(chatId, 
        '📖 *Commands*\n\n' +
        '`/start` — Welcome message\n' +
        '`/run [task]` — Execute AI task\n' +
        '`/status` — Show running jobs\n' +
        '`/schedule [when] [task]` — Schedule job\n' +
        '`/agents` — List AI agents\n' +
        '`/budget` — Show budget status\n' +
        '`/help` — This message\n\n' +
        'Or just send a natural language message!'
      );
      break;
  }
}

async function handleTelegramNaturalLanguage(chatId: string, text: string, aiRouter: any): Promise<void> {
  await sendTelegramMessage(chatId, '🤔 Processing your request...');

  const voiceCmd = await parseVoiceCommand(text);
  const result = await executeVoiceCommand(voiceCmd, aiRouter);

  await sendTelegramMessage(chatId, result.response, {
    reply_markup: result.executed ? {
      inline_keyboard: [[
        { text: '✅ Done', callback_data: 'noop' },
      ]],
    } : undefined,
  });
}

async function handleCallbackQuery(query: any, aiRouter: any): Promise<void> {
  // Answer callback to remove loading state
  if (telegramConfig?.botToken) {
    await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: query.id }),
    });
  }
}

// ─── DB ───

function initTelegramTables() {
  try {
    db.query(`CREATE TABLE IF NOT EXISTS telegram_config (
      id TEXT PRIMARY KEY, enabled INTEGER DEFAULT 0, bot_token TEXT,
      webhook_url TEXT, allowed_chat_ids TEXT, commands TEXT, notifications TEXT
    )`).run();
  } catch (e) {}
}

function persistTelegramConfig(config: TelegramConfig) {
  try {
    db.query(`INSERT OR REPLACE INTO telegram_config (id, enabled, bot_token, webhook_url, allowed_chat_ids, commands, notifications)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      config.id, config.enabled ? 1 : 0, config.botToken, config.webhookUrl,
      JSON.stringify(config.allowedChatIds), JSON.stringify(config.commands), JSON.stringify(config.notifications)
    );
  } catch (e) {}
}

async function loadTelegramConfig() {
  try {
    const row = db.query('SELECT * FROM telegram_config WHERE id = ?', ['telegram-config']).get() as any;
    if (row) {
      telegramConfig = {
        id: row.id, enabled: Boolean(row.enabled), botToken: row.bot_token,
        webhookUrl: row.webhook_url, allowedChatIds: JSON.parse(row.allowed_chat_ids || '[]'),
        commands: JSON.parse(row.commands || '{}'), notifications: JSON.parse(row.notifications || '{}'),
      };
    }
  } catch (e) {}
}
