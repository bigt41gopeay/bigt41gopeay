// Email Reporting — SMTP integration with HTML reports
// Mail is delivered straight to the configured SMTP server (STARTTLS / TLS + AUTH),
// not through the local sendmail/postfix, whose unauthenticated relaying gets bounced.
// ~/missioncontrol/backend/src/integrations/email.ts

import { db } from '../db';
import { sendSmtp, verifySmtp, extractAddress, type SmtpOptions } from './smtpClient';

export interface EmailConfig {
  id: string;
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
  templates: {
    jobComplete: boolean;
    jobFailed: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    budgetAlert: boolean;
    insightGenerated: boolean;
  };
  schedule: {
    dailyDigestTime: string;
    weeklyReportDay: string;
    weeklyReportTime: string;
  };
}

export interface EmailReport {
  id: string;
  type: 'job_complete' | 'job_failed' | 'daily_digest' | 'weekly_report' | 'budget_alert' | 'insight';
  subject: string;
  body: string;
  htmlBody: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

let emailConfig: EmailConfig | null = null;

export async function initEmail() {
  initEmailTables();
  await loadEmailConfig();
  console.log('[Email] Initialized');
}

export async function setEmailConfig(config: Omit<EmailConfig, 'id'>): Promise<EmailConfig> {
  emailConfig = { ...config, id: 'email-config' };
  persistEmailConfig(emailConfig);
  return emailConfig;
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  return emailConfig;
}

export async function testEmailConnection(): Promise<{ success: boolean; message: string }> {
  if (!emailConfig || !emailConfig.enabled) {
    return { success: false, message: 'Email not configured or disabled' };
  }
  const missing = validateSmtpConfig(emailConfig);
  if (missing) return { success: false, message: missing };
  try {
    const { extensions } = await verifySmtp(toSmtpOptions(emailConfig));
    const auth = emailConfig.smtp.user && emailConfig.smtp.pass ? 'authenticated' : 'no authentication';
    return { success: true, message: `SMTP connection to ${emailConfig.smtp.host}:${emailConfig.smtp.port} successful (${auth}; ${extensions.join(', ')})` };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function sendEmail(report: Omit<EmailReport, 'id' | 'status'>): Promise<EmailReport> {
  const fullReport: EmailReport = { ...report, id: `email-${Date.now()}`, status: 'pending' };
  if (!emailConfig || !emailConfig.enabled) {
    fullReport.status = 'failed';
    fullReport.error = 'Email not configured';
    persistEmailReport(fullReport);
    return fullReport;
  }
  const missing = validateSmtpConfig(emailConfig);
  if (missing) {
    fullReport.status = 'failed';
    fullReport.error = missing;
    persistEmailReport(fullReport);
    return fullReport;
  }
  try {
    await sendSmtp(toSmtpOptions(emailConfig), {
      from: emailConfig.from,
      to: emailConfig.to,
      subject: fullReport.subject,
      html: fullReport.htmlBody,
      text: fullReport.body,
    });
    fullReport.status = 'sent';
    fullReport.sentAt = new Date().toISOString();
  } catch (e: any) {
    fullReport.status = 'failed';
    fullReport.error = e.message;
    console.error(`[Email] Failed to send "${fullReport.subject}": ${e.message}`);
  }
  persistEmailReport(fullReport);
  return fullReport;
}

function validateSmtpConfig(cfg: EmailConfig): string | null {
  if (!cfg.smtp?.host) return 'SMTP host is not configured';
  if (!cfg.smtp.port || Number.isNaN(Number(cfg.smtp.port))) return 'SMTP port is not configured';
  if (!cfg.from || !extractAddress(cfg.from)) return 'From address is missing or invalid';
  if (!cfg.to || cfg.to.filter(Boolean).length === 0) return 'No recipient addresses configured';
  const bad = cfg.to.filter(Boolean).find(t => !extractAddress(t));
  if (bad) return `Invalid recipient address: ${bad}`;
  return null;
}

function toSmtpOptions(cfg: EmailConfig): SmtpOptions {
  return {
    host: cfg.smtp.host.trim(),
    port: Number(cfg.smtp.port),
    secure: cfg.smtp.secure !== false,
    user: cfg.smtp.user || undefined,
    pass: cfg.smtp.pass || undefined,
    timeoutMs: 20000,
  };
}

export async function sendJobCompleteReport(job: any): Promise<EmailReport> {
  if (!emailConfig?.templates.jobComplete) return null as any;
  return sendEmail({
    type: 'job_complete',
    subject: `✅ Job Completed: ${job.userRequest.substring(0, 60)}`,
    body: `Job ${job.id} completed successfully.`,
    htmlBody: generateJobHtml(job, 'completed'),
  });
}

export async function sendJobFailedReport(job: any): Promise<EmailReport> {
  if (!emailConfig?.templates.jobFailed) return null as any;
  return sendEmail({
    type: 'job_failed',
    subject: `❌ Job Failed: ${job.userRequest.substring(0, 60)}`,
    body: `Job ${job.id} failed.`,
    htmlBody: generateJobHtml(job, 'failed'),
  });
}

export async function sendDailyDigest(): Promise<EmailReport> {
  if (!emailConfig?.templates.dailyDigest) return null as any;
  const { getLearningMetrics } = await import('../memory/learningEngine');
  const metrics = await getLearningMetrics();
  return sendEmail({
    type: 'daily_digest',
    subject: `📊 Mission Control Daily Digest — ${new Date().toLocaleDateString()}`,
    body: `Daily summary of your AI operations.`,
    htmlBody: generateDailyDigestHtml(metrics),
  });
}

export async function sendWeeklyReport(): Promise<EmailReport> {
  if (!emailConfig?.templates.weeklyReport) return null as any;
  const { getLearningMetrics } = await import('../memory/learningEngine');
  const metrics = await getLearningMetrics();
  return sendEmail({
    type: 'weekly_report',
    subject: `📈 Mission Control Weekly Report — Week ${getWeekNumber()}`,
    body: `Weekly summary of your AI operations.`,
    htmlBody: generateWeeklyReportHtml(metrics),
  });
}

export async function sendBudgetAlert(subscription: any): Promise<EmailReport> {
  if (!emailConfig?.templates.budgetAlert) return null as any;
  return sendEmail({
    type: 'budget_alert',
    subject: `⚠️ Budget Alert: ${subscription.provider} at ${((subscription.usage.currentMonthCost / subscription.metadata.monthlyBudget) * 100).toFixed(0)}%`,
    body: `Your ${subscription.provider} subscription is approaching its budget limit.`,
    htmlBody: generateBudgetAlertHtml(subscription),
  });
}

export async function sendInsightNotification(insight: any): Promise<EmailReport> {
  if (!emailConfig?.templates.insightGenerated) return null as any;
  return sendEmail({
    type: 'insight',
    subject: `💡 New Insight: ${insight.title}`,
    body: insight.description,
    htmlBody: generateInsightHtml(insight),
  });
}

function generateJobHtml(job: any, status: 'completed' | 'failed'): string {
  const color = status === 'completed' ? '#2ed573' : '#ff4757';
  const icon = status === 'completed' ? '✅' : '❌';
  const subtasks = job.subtasks?.map((s: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #333;">${s.agentId}</td>
      <td style="padding:8px;border-bottom:1px solid #333;">${s.description}</td>
      <td style="padding:8px;border-bottom:1px solid #333;">${s.status}</td>
      <td style="padding:8px;border-bottom:1px solid #333;">${s.result?.metrics?.cost ? '$' + s.result.metrics.cost.toFixed(4) : '-'}</td>
    </tr>
  `).join('') || '';
  return `<!DOCTYPE html>
<html><body style="background:#0a0a0a;color:#fff;font-family:system-ui;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#111;border:1px solid #333;border-radius:12px;padding:24px;">
    <h1 style="color:${color};margin:0 0 16px 0;">${icon} Job ${status === 'completed' ? 'Completed' : 'Failed'}</h1>
    <p style="color:#aaa;margin:0 0 16px 0;">${job.userRequest}</p>
    <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin:16px 0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:12px;color:#888;">
        <span>ID: ${job.id}</span>
        <span>${new Date(job.createdAt).toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;">
        <span>Duration: ${job.subtasks?.reduce((sum: number, s: any) => sum + (s.result?.metrics?.durationMs || 0), 0) / 1000}s</span>
        <span>Total Cost: $${job.subtasks?.reduce((sum: number, s: any) => sum + (s.result?.metrics?.cost || 0), 0).toFixed(4)}</span>
      </div>
    </div>
    ${subtasks ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;">
      <thead><tr style="color:#888;text-align:left;font-size:11px;text-transform:uppercase;">
        <th style="padding:8px;border-bottom:2px solid #333;">Agent</th>
        <th style="padding:8px;border-bottom:2px solid #333;">Task</th>
        <th style="padding:8px;border-bottom:2px solid #333;">Status</th>
        <th style="padding:8px;border-bottom:2px solid #333;">Cost</th>
      </tr></thead>
      <tbody>${subtasks}</tbody>
    </table>` : ''}
    ${job.finalResult ? `<div style="background:#1a1a1a;border-radius:8px;padding:16px;margin-top:16px;font-size:13px;line-height:1.6;">
      <strong style="color:${color};">Result:</strong><br/>${job.finalResult.replace(/\n/g, '<br/>')}
    </div>` : ''}
    <p style="color:#666;font-size:11px;margin-top:24px;text-align:center;">Mission Control Autonomous Agent Council</p>
  </div>
</body></html>`;
}

function generateDailyDigestHtml(metrics: any): string {
  return `<!DOCTYPE html>
<html><body style="background:#0a0a0a;color:#fff;font-family:system-ui;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#111;border:1px solid #333;border-radius:12px;padding:24px;">
    <h1 style="background:linear-gradient(135deg,#4cc2ff,#7d5cff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 24px 0;">📊 Daily Digest</h1>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="background:#1a1a1a;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#4cc2ff;">${metrics.totalJobs}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;">Total Jobs</div>
      </div>
      <div style="background:#1a1a1a;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#2ed573;">${metrics.successfulJobs}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;">Successful</div>
      </div>
      <div style="background:#1a1a1a;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#ff4757;">${metrics.failedJobs}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;">Failed</div>
      </div>
      <div style="background:#1a1a1a;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#f1c40f;">$${metrics.totalCost.toFixed(2)}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;">Total Cost</div>
      </div>
    </div>
    <div style="margin-top:24px;padding:16px;background:#1a1a1a;border-radius:8px;">
      <div style="font-size:13px;color:#aaa;line-height:1.6;">
        <strong style="color:#fff;">Most Used Agent:</strong> ${metrics.mostUsedAgent}<br/>
        <strong style="color:#fff;">Most Common Task:</strong> ${metrics.mostCommonTask}<br/>
        <strong style="color:#fff;">Patterns Learned:</strong> ${metrics.patternsLearned}<br/>
        <strong style="color:#fff;">Improvement Rate:</strong> ${metrics.improvementRate > 0 ? '+' : ''}${metrics.improvementRate.toFixed(1)}%
      </div>
    </div>
  </div>
</body></html>`;
}

function generateWeeklyReportHtml(metrics: any): string {
  return generateDailyDigestHtml(metrics).replace('Daily Digest', 'Weekly Report');
}

function generateBudgetAlertHtml(sub: any): string {
  const percent = ((sub.usage.currentMonthCost / sub.metadata.monthlyBudget) * 100).toFixed(0);
  const color = Number(percent) > 90 ? '#ff4757' : Number(percent) > 75 ? '#ff9f43' : '#f1c40f';
  return `<!DOCTYPE html>
<html><body style="background:#0a0a0a;color:#fff;font-family:system-ui;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#111;border:1px solid #333;border-radius:12px;padding:24px;">
    <h1 style="color:${color};margin:0 0 16px 0;">⚠️ Budget Alert</h1>
    <p style="color:#aaa;font-size:16px;">Your <strong>${sub.provider}</strong> subscription is at <strong style="color:${color};font-size:24px;">${percent}%</strong> of monthly budget.</p>
    <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin:16px 0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#888;">Used</span><span style="color:#fff;">$${sub.usage.currentMonthCost.toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#888;">Budget</span><span style="color:#fff;">$${sub.metadata.monthlyBudget}</span></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:#888;">Remaining</span><span style="color:${color};">$${(sub.metadata.monthlyBudget - sub.usage.currentMonthCost).toFixed(2)}</span></div>
      <div style="height:8px;background:#333;border-radius:4px;margin-top:12px;overflow:hidden;"><div style="width:${percent}%;height:100%;background:${color};border-radius:4px;"></div></div>
    </div>
    <p style="color:#666;font-size:12px;">Consider switching to local models (Qwen) for non-critical tasks to save costs.</p>
  </div>
</body></html>`;
}

function generateInsightHtml(insight: any): string {
  return `<!DOCTYPE html>
<html><body style="background:#0a0a0a;color:#fff;font-family:system-ui;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#111;border:1px solid #333;border-radius:12px;padding:24px;">
    <h1 style="color:#7d5cff;margin:0 0 16px 0;">💡 New Insight</h1>
    <h2 style="color:#fff;margin:0 0 8px 0;font-size:18px;">${insight.title}</h2>
    <p style="color:#aaa;line-height:1.6;">${insight.description}</p>
    <div style="background:#1a1a1a;border-radius:8px;padding:12px;margin-top:16px;">
      <span style="color:#888;font-size:11px;text-transform:uppercase;">Impact</span>
      <span style="color:${insight.impact === 'high' ? '#ff4757' : insight.impact === 'medium' ? '#ff9f43' : '#2ed573'};font-weight:600;margin-left:8px;">${insight.impact.toUpperCase()}</span>
    </div>
  </div>
</body></html>`;
}

export function initEmailScheduler() {
  setInterval(async () => {
    if (!emailConfig || !emailConfig.enabled) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (timeStr === emailConfig.schedule.dailyDigestTime) await sendDailyDigest();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    if (dayNames[now.getDay()] === emailConfig.schedule.weeklyReportDay && timeStr === emailConfig.schedule.weeklyReportTime) {
      await sendWeeklyReport();
    }
  }, 60000);
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
}

function initEmailTables() {
  try {
    db.query(`CREATE TABLE IF NOT EXISTS email_config (
      id TEXT PRIMARY KEY, enabled INTEGER DEFAULT 0, smtp TEXT, 
      from_email TEXT, to_emails TEXT, templates TEXT, schedule TEXT
    )`).run();
    db.query(`CREATE TABLE IF NOT EXISTS email_reports (
      id TEXT PRIMARY KEY, type TEXT, subject TEXT, body TEXT, html_body TEXT,
      sent_at TEXT, status TEXT, error TEXT
    )`).run();
  } catch (e) {}
}

function persistEmailConfig(config: EmailConfig) {
  try {
    db.query(`INSERT OR REPLACE INTO email_config (id, enabled, smtp, from_email, to_emails, templates, schedule)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      config.id, config.enabled ? 1 : 0, JSON.stringify(config.smtp),
      config.from, JSON.stringify(config.to), JSON.stringify(config.templates), JSON.stringify(config.schedule)
    );
  } catch (e) {}
}

function persistEmailReport(report: EmailReport) {
  try {
    db.query(`INSERT INTO email_reports (id, type, subject, body, html_body, sent_at, status, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      report.id, report.type, report.subject, report.body, report.htmlBody,
      report.sentAt, report.status, report.error || null
    );
  } catch (e) {}
}

async function loadEmailConfig() {
  try {
    const row = db.query('SELECT * FROM email_config WHERE id = ?', ['email-config']).get() as any;
    if (row) {
      emailConfig = {
        id: row.id, enabled: Boolean(row.enabled),
        smtp: JSON.parse(row.smtp || '{}'), from: row.from_email,
        to: JSON.parse(row.to_emails || '[]'), templates: JSON.parse(row.templates || '{}'),
        schedule: JSON.parse(row.schedule || '{}'),
      };
    }
  } catch (e) {}
}
