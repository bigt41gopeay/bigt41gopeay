// Integrations Panel — Email, Slack, Discord configuration
// Add to ~/missioncontrol/web/src/App.tsx as new "Integrations" tab

import React, { useState, useEffect, useCallback } from 'react';

interface EmailConfig {
  enabled: boolean;
  smtp: { host: string; port: number; secure: boolean; user: string; pass: string };
  from: string;
  to: string[];
  templates: Record<string, boolean>;
  schedule: { dailyDigestTime: string; weeklyReportDay: string; weeklyReportTime: string };
}

interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
  botToken: string;
  channel: string;
  username: string;
  iconEmoji: string;
  templates: Record<string, boolean>;
}

interface DiscordConfig {
  enabled: boolean;
  webhookUrl: string;
}

export function IntegrationsPanel({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<'email' | 'slack' | 'discord'>('email');
  const [email, setEmail] = useState<EmailConfig | null>(null);
  const [slack, setSlack] = useState<SlackConfig | null>(null);
  const [discord, setDiscord] = useState<DiscordConfig | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const API = 'http://127.0.0.1:8787/api/integrations';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    const [eRes, sRes] = await Promise.all([
      fetch(`${API}/email/config`, { headers }),
      fetch(`${API}/slack/config`, { headers }),
    ]);
    if (eRes.ok) { const data = await eRes.json(); if (data.config) setEmail(data.config); }
    if (sRes.ok) { const data = await sRes.json(); if (data.config) setSlack(data.config); }
    // Discord config from generic endpoint
    try {
      const dRes = await fetch('http://127.0.0.1:8787/api/memory/config', { headers });
      if (dRes.ok) {
        const dData = await dRes.json();
        if (dData.config?.discord) setDiscord(dData.config.discord);
      }
    } catch (e) {}
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    await fetch(`${API}/email/config`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        smtp: {
          host: data.get('smtpHost'), port: Number(data.get('smtpPort')),
          secure: data.get('smtpSecure') === 'on', user: data.get('smtpUser'), pass: data.get('smtpPass'),
        },
        from: data.get('fromEmail'), to: (data.get('toEmails') as string).split(',').map(s => s.trim()),
        templates: {
          jobComplete: data.get('tplJobComplete') === 'on',
          jobFailed: data.get('tplJobFailed') === 'on',
          dailyDigest: data.get('tplDailyDigest') === 'on',
          weeklyReport: data.get('tplWeeklyReport') === 'on',
          budgetAlert: data.get('tplBudgetAlert') === 'on',
          insightGenerated: data.get('tplInsight') === 'on',
        },
        schedule: {
          dailyDigestTime: data.get('dailyTime') || '09:00',
          weeklyReportDay: data.get('weeklyDay') || 'monday',
          weeklyReportTime: data.get('weeklyTime') || '09:00',
        },
      }),
    });
    setSaving(false);
    fetchAll();
  };

  const saveSlack = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    await fetch(`${API}/slack/config`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        webhookUrl: data.get('webhookUrl'),
        botToken: data.get('botToken'),
        channel: data.get('channel'),
        username: data.get('username') || 'Mission Control',
        iconEmoji: data.get('iconEmoji') || ':robot_face:',
        templates: {
          jobComplete: data.get('slackTplJobComplete') === 'on',
          jobFailed: data.get('slackTplJobFailed') === 'on',
          dailyDigest: data.get('slackTplDailyDigest') === 'on',
          weeklyReport: data.get('slackTplWeeklyReport') === 'on',
          budgetAlert: data.get('slackTplBudgetAlert') === 'on',
          insightGenerated: data.get('slackTplInsight') === 'on',
        },
      }),
    });
    setSaving(false);
    fetchAll();
  };

  const testConnection = async (type: 'email' | 'slack' | 'discord') => {
    setTestResult(null);
    const res = await fetch(`${API}/${type}/test`, { method: 'POST', headers });
    if (res.ok) setTestResult(await res.json());
  };

  const templateOptions = [
    { key: 'jobComplete', label: 'Job Completed' },
    { key: 'jobFailed', label: 'Job Failed' },
    { key: 'dailyDigest', label: 'Daily Digest' },
    { key: 'weeklyReport', label: 'Weekly Report' },
    { key: 'budgetAlert', label: 'Budget Alert' },
    { key: 'insightGenerated', label: 'New Insight' },
  ];

  return (
    <div className="integrations-panel">
      <style>{`
        .integrations-panel { padding: 20px; max-width: 900px; margin: 0 auto; }
        .integrations-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .integrations-header h2 { margin: 0; font-size: 1.5rem; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .integrations-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .integrations-tab { padding: 10px 24px; border: none; background: transparent; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 13px; font-weight: 500; border-radius: 8px 8px 0 0; transition: all 0.2s; }
        .integrations-tab:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.03); }
        .integrations-tab.active { color: var(--accent); background: rgba(76,194,255,0.08); }
        .integrations-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent), var(--accent2)); }
        .form-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 24px; }
        .form-section { margin-bottom: 24px; }
        .form-section-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .form-row input, .form-row select {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          padding: 10px 14px; color: #fff; font-size: 13px; outline: none; flex: 1; min-width: 200px;
        }
        .form-row input:focus, .form-row select:focus { border-color: var(--accent); }
        .form-row input::placeholder { color: rgba(255,255,255,0.3); }
        .form-row label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.7); cursor: pointer; }
        .form-row input[type="checkbox"] { width: auto; min-width: auto; }
        .checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
        .submit-btn { background: linear-gradient(135deg, var(--accent), var(--accent2)); border: none; color: #fff; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-right: 10px; }
        .test-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); padding: 10px 20px; border-radius: 8px; cursor: pointer; }
        .test-btn:hover { background: rgba(255,255,255,0.1); }
        .test-result { margin-top: 12px; padding: 12px 16px; border-radius: 8px; font-size: 13px; }
        .test-result.success { background: rgba(46,213,115,0.1); border: 1px solid rgba(46,213,115,0.2); color: var(--good); }
        .test-result.error { background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.2); color: var(--bad); }
        .help-text { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; line-height: 1.5; }
        .code-block { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; color: var(--accent); margin-top: 8px; word-break: break-all; }
      `}</style>

      <div className="integrations-header">
        <h2>🔗 Integrations</h2>
      </div>

      <div className="integrations-tabs">
        {(['email', 'slack', 'discord'] as const).map(tab => (
          <button key={tab} className={`integrations-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'email' && '📧 Email'}
            {tab === 'slack' && '💬 Slack'}
            {tab === 'discord' && '🎮 Discord'}
          </button>
        ))}
      </div>

      {/* EMAIL TAB */}
      {activeTab === 'email' && (
        <div className="form-card">
          <form onSubmit={saveEmail}>
            <div className="form-section">
              <div className="form-section-title">📧 SMTP Configuration</div>
              <div className="form-row">
                <input name="smtpHost" placeholder="SMTP Host (e.g., smtp.gmail.com)" defaultValue={email?.smtp?.host} required />
                <input name="smtpPort" type="number" placeholder="Port (e.g., 587)" defaultValue={email?.smtp?.port || 587} required />
              </div>
              <div className="form-row">
                <input name="smtpUser" placeholder="SMTP Username" defaultValue={email?.smtp?.user} required />
                <input name="smtpPass" type="password" placeholder="SMTP Password / App Password" defaultValue={email?.smtp?.pass} required />
              </div>
              <div className="form-row">
                <input name="fromEmail" placeholder="From email (e.g., you@gmail.com)" defaultValue={email?.from} required />
                <input name="toEmails" placeholder="To emails (comma-separated)" defaultValue={email?.to?.join(', ')} required />
              </div>
              <div className="form-row">
                <label><input name="smtpSecure" type="checkbox" defaultChecked={email?.smtp?.secure !== false} /> Use TLS/SSL</label>
              </div>
              <div className="help-text">
                For Gmail: Use App Password (not your regular password). Enable 2FA → Security → App Passwords.<br/>
                Port 587 uses STARTTLS, port 465 uses implicit SSL/TLS. Keep "Use TLS/SSL" on for both.<br/>
                The From address must belong to the SMTP account, otherwise the provider rejects or bounces the mail.<br/>
                For other providers: Check your SMTP settings in account preferences.
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">📨 Notification Templates</div>
              <div className="checkbox-grid">
                {templateOptions.map(tpl => (
                  <label key={tpl.key}>
                    <input name={`tpl${tpl.key.charAt(0).toUpperCase() + tpl.key.slice(1)}`} type="checkbox" defaultChecked={email?.templates?.[tpl.key] ?? true} />
                    {tpl.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">⏰ Schedule</div>
              <div className="form-row">
                <input name="dailyTime" type="time" defaultValue={email?.schedule?.dailyDigestTime || '09:00'} />
                <select name="weeklyDay" defaultValue={email?.schedule?.weeklyReportDay || 'monday'}>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
                <input name="weeklyTime" type="time" defaultValue={email?.schedule?.weeklyReportTime || '09:00'} />
              </div>
              <div className="help-text">Daily digest time • Weekly report day & time</div>
            </div>

            <button type="submit" className="submit-btn" disabled={saving}>{saving ? 'Saving...' : 'Save Email Config'}</button>
            <button type="button" className="test-btn" onClick={() => testConnection('email')}>Test Connection</button>
            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.success ? '✅' : '❌'} {testResult.message}
              </div>
            )}
          </form>
        </div>
      )}

      {/* SLACK TAB */}
      {activeTab === 'slack' && (
        <div className="form-card">
          <form onSubmit={saveSlack}>
            <div className="form-section">
              <div className="form-section-title">💬 Slack Configuration</div>
              <div className="form-row">
                <input name="webhookUrl" placeholder="Incoming Webhook URL (https://hooks.slack.com/...)" defaultValue={slack?.webhookUrl} style={{ flex: 2 }} />
              </div>
              <div className="form-row">
                <input name="botToken" placeholder="Bot User OAuth Token (xoxb-...)" defaultValue={slack?.botToken} />
                <input name="channel" placeholder="Channel (#mission-control)" defaultValue={slack?.channel || '#mission-control'} />
              </div>
              <div className="form-row">
                <input name="username" placeholder="Bot name" defaultValue={slack?.username || 'Mission Control'} />
                <input name="iconEmoji" placeholder="Icon emoji (:robot_face:)" defaultValue={slack?.iconEmoji || ':robot_face:'} />
              </div>
              <div className="help-text">
                1. Go to api.slack.com/apps → Create New App → From Scratch<br/>
                2. Add Incoming Webhooks → Activate → Add New Webhook to Workspace<br/>
                3. Copy Webhook URL and paste above<br/>
                4. For slash commands: Add OAuth & Permissions → Bot Token Scopes → commands, chat:write
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">📨 Notification Templates</div>
              <div className="checkbox-grid">
                {templateOptions.map(tpl => (
                  <label key={tpl.key}>
                    <input name={`slackTpl${tpl.key.charAt(0).toUpperCase() + tpl.key.slice(1)}`} type="checkbox" defaultChecked={slack?.templates?.[tpl.key] ?? true} />
                    {tpl.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">⌨️ Slash Command</div>
              <div className="help-text">After configuring, add this slash command to your Slack app:</div>
              <div className="code-block">Command: /mc<br/>Request URL: http://YOUR_IP:8787/api/integrations/slack/slash<br/>Short Description: Mission Control AI<br/>Usage Hint: /mc run [task] or /mc status</div>
            </div>

            <button type="submit" className="submit-btn" disabled={saving}>{saving ? 'Saving...' : 'Save Slack Config'}</button>
            <button type="button" className="test-btn" onClick={() => testConnection('slack')}>Test Connection</button>
            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.success ? '✅' : '❌'} {testResult.message}
              </div>
            )}
          </form>
        </div>
      )}

      {/* DISCORD TAB */}
      {activeTab === 'discord' && (
        <div className="form-card">
          <div className="form-section">
            <div className="form-section-title">🎮 Discord Webhook</div>
            <div className="form-row">
              <input placeholder="Discord Webhook URL (https://discord.com/api/webhooks/...)" defaultValue={discord?.webhookUrl} style={{ flex: 2 }} />
            </div>
            <div className="help-text">
              1. In Discord, go to Server Settings → Integrations → Webhooks<br/>
              2. New Webhook → Choose channel → Copy Webhook URL<br/>
              3. Paste URL above and click Save
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title">📨 Notification Templates</div>
            <div className="checkbox-grid">
              {templateOptions.map(tpl => (
                <label key={tpl.key}>
                  <input type="checkbox" defaultChecked={true} />
                  {tpl.label}
                </label>
              ))}
            </div>
          </div>
          <button className="submit-btn">Save Discord Config</button>
          <button className="test-btn" onClick={() => testConnection('discord')}>Test Connection</button>
          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? '✅' : '❌'} {testResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
