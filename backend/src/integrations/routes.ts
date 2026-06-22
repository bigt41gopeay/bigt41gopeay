// Integration Routes — Email + Slack + Discord
// Add to ~/missioncontrol/backend/src/server.ts

import { initEmail, getEmailConfig, setEmailConfig, testEmailConnection, sendEmail } from './integrations/email';
import { initSlack, getSlackConfig, setSlackConfig, testSlackConnection, handleSlackSlashCommand } from './integrations/slack';

// Initialize on startup
initEmail();
initSlack();

// === EMAIL ROUTES ===

app.get('/api/integrations/email/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const cfg = await getEmailConfig();
  if (!cfg) return c.json({ config: null });
  return c.json({
    config: {
      enabled: cfg.enabled, from: cfg.from, to: cfg.to,
      smtp: { host: cfg.smtp.host, port: cfg.smtp.port, secure: cfg.smtp.secure, user: cfg.smtp.user },
      templates: cfg.templates, schedule: cfg.schedule,
    }
  });
});

app.post('/api/integrations/email/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const body = await c.req.json();
  const cfg = await setEmailConfig({
    enabled: body.enabled ?? true,
    smtp: body.smtp,
    from: body.from,
    to: body.to || [],
    templates: body.templates || { jobComplete: true, jobFailed: true, dailyDigest: false, weeklyReport: false, budgetAlert: true, insightGenerated: false },
    schedule: body.schedule || { dailyDigestTime: '09:00', weeklyReportDay: 'monday', weeklyReportTime: '09:00' },
  });
  return c.json({ success: true, config: cfg });
});

app.post('/api/integrations/email/test', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const result = await testEmailConnection();
  return c.json(result);
});

app.post('/api/integrations/email/send', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const body = await c.req.json();
  const report = await sendEmail({
    type: body.type || 'job_complete',
    subject: body.subject,
    body: body.body,
    htmlBody: body.htmlBody || body.body,
  });
  return c.json({ success: report.status === 'sent', report });
});

// === SLACK ROUTES ===

app.get('/api/integrations/slack/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const cfg = await getSlackConfig();
  if (!cfg) return c.json({ config: null });
  return c.json({
    config: {
      enabled: cfg.enabled, webhookUrl: cfg.webhookUrl ? '***' : '',
      botToken: cfg.botToken ? '***' : '', channel: cfg.channel,
      username: cfg.username, iconEmoji: cfg.iconEmoji, templates: cfg.templates,
    }
  });
});

app.post('/api/integrations/slack/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const body = await c.req.json();
  const cfg = await setSlackConfig({
    enabled: body.enabled ?? true,
    webhookUrl: body.webhookUrl,
    botToken: body.botToken,
    channel: body.channel || '#mission-control',
    username: body.username || 'Mission Control',
    iconEmoji: body.iconEmoji || ':robot_face:',
    templates: body.templates || { jobComplete: true, jobFailed: true, dailyDigest: false, weeklyReport: false, budgetAlert: true, insightGenerated: false },
  });
  return c.json({ success: true, config: { ...cfg, webhookUrl: '***', botToken: '***' } });
});

app.post('/api/integrations/slack/test', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const result = await testSlackConnection();
  return c.json(result);
});

// Slack slash command endpoint (no auth — verified by Slack signature in production)
app.post('/api/integrations/slack/slash', async (c) => {
  const body = await c.req.parseBody();
  const result = await handleSlackSlashCommand(body, aiRouter);
  return c.json(result);
});

// === DISCORD ROUTES (simple webhook) ===

app.post('/api/integrations/discord/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);
  const body = await c.req.json();
  // Store Discord webhook URL
  try {
    db.query(`INSERT OR REPLACE INTO integrations (id, type, config) VALUES (?, ?, ?)`)
      .run('discord', 'discord', JSON.stringify({ webhookUrl: body.webhookUrl, enabled: body.enabled }));
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to save config' }, 500);
  }
});

app.post('/api/integrations/discord/test', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== config.token) return c.json({ error: 'Invalid token' }, 401);

  try {
    const row = db.query('SELECT config FROM integrations WHERE id = ?', ['discord']).get() as any;
    if (!row) return c.json({ success: false, message: 'Discord not configured' });
    const cfg = JSON.parse(row.config);

    const res = await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '🤖 Mission Control test message' }),
    });
    return c.json({ success: res.ok, message: res.ok ? 'Discord webhook working' : `HTTP ${res.status}` });
  } catch (e: any) {
    return c.json({ success: false, message: e.message });
  }
});
