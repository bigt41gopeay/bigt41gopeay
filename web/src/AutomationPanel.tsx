// Automation Panel — Scheduled jobs, voice, file watcher, git hooks, shortcuts
// Add to ~/missioncontrol/web/src/App.tsx as new "Automation" tab

import React, { useState, useEffect, useCallback } from 'react';

interface ScheduledJob {
  id: string; name: string; description: string; prompt: string;
  schedule: { type: string; cronExpression?: string; intervalMinutes?: number; runAt?: string };
  enabled: boolean; lastRun?: string; nextRun?: string;
  runCount: number; successCount: number; failureCount: number;
}

interface WatchedFolder {
  id: string; path: string; name: string; events: string[];
  filter: { extensions?: string[]; patterns?: string[]; exclude?: string[] };
  prompt: string; enabled: boolean; cooldownMinutes: number;
  lastTriggered?: string; triggerCount: number;
}

interface GitHook {
  id: string; repoPath: string; name: string; enabled: boolean;
  triggers: { onPush: boolean; onCommit: boolean; onPR: boolean; onMerge: boolean };
  actions: { codeReview: boolean; testGeneration: boolean; docGeneration: boolean; securityCheck: boolean };
  branches: string[];
}

interface ShortcutAction {
  id: string; name: string; description: string;
  trigger: { type: string; urlScheme?: string; siriPhrase?: string };
  prompt: string; parameters: any[]; enabled: boolean; runCount: number;
}

export function AutomationPanel({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'voice' | 'watch' | 'git' | 'shortcuts'>('schedule');
  const [schedules, setSchedules] = useState<ScheduledJob[]>([]);
  const [watches, setWatches] = useState<WatchedFolder[]>([]);
  const [gitHooks, setGitHooks] = useState<GitHook[]>([]);
  const [shortcuts, setShortcuts] = useState<ShortcutAction[]>([]);
  const [voiceText, setVoiceText] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const API = 'http://127.0.0.1:8787/api/automation';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    const [sRes, wRes, gRes, shRes] = await Promise.all([
      fetch(`${API}/schedule`, { headers }),
      fetch(`${API}/watch`, { headers }),
      fetch(`${API}/git`, { headers }),
      fetch(`${API}/shortcuts`, { headers }),
    ]);
    if (sRes.ok) setSchedules((await sRes.json()).jobs);
    if (wRes.ok) setWatches((await wRes.json()).folders);
    if (gRes.ok) setGitHooks((await gRes.json()).hooks);
    if (shRes.ok) setShortcuts((await shRes.json()).actions);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    await fetch(`${API}/schedule`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'), prompt: data.get('prompt'),
        when: data.get('when'), enabled: true,
        config: { notifyOnComplete: true },
      }),
    });
    form.reset();
    fetchAll();
  };

  const sendVoice = async () => {
    if (!voiceText.trim()) return;
    setLoading(true);
    const res = await fetch(`${API}/voice`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: voiceText }),
    });
    if (res.ok) {
      const data = await res.json();
      setVoiceResponse(data.response);
    }
    setVoiceText('');
    setLoading(false);
  };

  const addWatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    await fetch(`${API}/watch`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: data.get('path'), name: data.get('name'),
        prompt: data.get('prompt'), cooldownMinutes: Number(data.get('cooldown')) || 5,
      }),
    });
    form.reset();
    fetchAll();
  };

  const addGitHook = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    await fetch(`${API}/git`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoPath: data.get('repoPath'), name: data.get('name'),
        branches: (data.get('branches') as string).split(',').map(s => s.trim()),
      }),
    });
    form.reset();
    fetchAll();
  };

  return (
    <div className="automation-panel">
      <style>{`
        .automation-panel { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .automation-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .automation-header h2 { margin: 0; font-size: 1.5rem; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .automation-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .automation-tab { padding: 10px 20px; border: none; background: transparent; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 13px; font-weight: 500; border-radius: 8px 8px 0 0; transition: all 0.2s; }
        .automation-tab:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.03); }
        .automation-tab.active { color: var(--accent); background: rgba(76,194,255,0.08); }
        .automation-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent), var(--accent2)); }
        .form-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .form-card h3 { margin: 0 0 16px 0; font-size: 14px; color: rgba(255,255,255,0.7); }
        .form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .form-row input, .form-row textarea, .form-row select {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          padding: 10px 14px; color: #fff; font-size: 13px; outline: none; flex: 1; min-width: 200px;
        }
        .form-row input:focus, .form-row textarea:focus, .form-row select:focus { border-color: var(--accent); }
        .form-row textarea { min-height: 60px; resize: vertical; }
        .submit-btn { background: linear-gradient(135deg, var(--accent), var(--accent2)); border: none; color: #fff; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .item-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; }
        .item-card:hover { border-color: rgba(255,255,255,0.1); }
        .item-info { flex: 1; }
        .item-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .item-meta { font-size: 11px; color: rgba(255,255,255,0.4); }
        .item-status { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .item-status.enabled { background: rgba(46,213,115,0.15); color: var(--good); }
        .item-status.disabled { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); }
        .item-actions { display: flex; gap: 8px; margin-top: 8px; }
        .item-btn { padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; border: none; }
        .item-btn.toggle { background: rgba(76,194,255,0.15); color: var(--accent); }
        .item-btn.delete { background: rgba(255,71,87,0.15); color: var(--bad); }
        .voice-area { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; }
        .voice-input { width: 100%; min-height: 60px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; color: #fff; font-size: 14px; resize: vertical; }
        .voice-input:focus { border-color: var(--accent); }
        .voice-response { margin-top: 16px; padding: 16px; background: rgba(76,194,255,0.05); border: 1px solid rgba(76,194,255,0.15); border-radius: 10px; }
        .voice-response-title { font-size: 12px; color: var(--accent); font-weight: 600; margin-bottom: 8px; }
        .voice-response-text { font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.5; }
        .shortcuts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .shortcut-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; }
        .shortcut-card:hover { border-color: rgba(76,194,255,0.2); }
        .shortcut-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .shortcut-desc { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 10px; }
        .shortcut-url { font-size: 11px; font-family: monospace; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 6px; color: var(--accent); margin-bottom: 10px; word-break: break-all; }
        .shortcut-actions { display: flex; gap: 8px; }
        .shortcut-btn { padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; border: none; }
        .shortcut-btn.run { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; }
        .shortcut-btn.copy { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); }
        .empty-state { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); }
      `}</style>

      <div className="automation-header">
        <h2>⚡ Automation Hub</h2>
      </div>

      <div className="automation-tabs">
        {(['schedule', 'voice', 'watch', 'git', 'shortcuts'] as const).map(tab => (
          <button key={tab} className={`automation-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'schedule' && '📅 Scheduled Jobs'}
            {tab === 'voice' && '🎤 Voice Commands'}
            {tab === 'watch' && '👁️ File Watcher'}
            {tab === 'git' && '🔀 Git Hooks'}
            {tab === 'shortcuts' && '⌨️ Shortcuts'}
          </button>
        ))}
      </div>

      {/* SCHEDULED JOBS */}
      {activeTab === 'schedule' && (
        <>
          <div className="form-card">
            <h3>➕ Create Scheduled Job</h3>
            <form onSubmit={addSchedule}>
              <div className="form-row">
                <input name="name" placeholder="Job name" required />
                <input name="when" placeholder="Schedule: 'every day at 9am', 'every 30 minutes', 'tomorrow at 3pm'" required />
              </div>
              <div className="form-row">
                <textarea name="prompt" placeholder="What should the AI do? e.g., 'Check SEO rankings and email report'" required />
              </div>
              <button type="submit" className="submit-btn">Schedule Job</button>
            </form>
          </div>

          {schedules.length === 0 ? (
            <div className="empty-state">No scheduled jobs. Create one above.</div>
          ) : (
            schedules.map(s => (
              <div key={s.id} className="item-card">
                <div className="item-info">
                  <div className="item-name">{s.name}</div>
                  <div className="item-meta">
                    {s.schedule.type === 'cron' && `Daily at ${s.schedule.cronExpression?.split(' ')[1]}:00`}
                    {s.schedule.type === 'interval' && `Every ${s.schedule.intervalMinutes} min`}
                    {s.schedule.type === 'once' && `Once: ${new Date(s.schedule.runAt!).toLocaleString()}`}
                    {' • '}
                    Runs: {s.runCount} • Success: {s.successCount} • Failed: {s.failureCount}
                    {s.lastRun && ` • Last: ${new Date(s.lastRun).toLocaleString()}`}
                    {s.nextRun && ` • Next: ${new Date(s.nextRun).toLocaleString()}`}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{s.prompt}</div>
                </div>
                <div>
                  <span className={`item-status ${s.enabled ? 'enabled' : 'disabled'}`}>{s.enabled ? 'Active' : 'Paused'}</span>
                  <div className="item-actions">
                    <button className="item-btn toggle" onClick={async () => { await fetch(`${API}/schedule/${s.id}/toggle`, { method: 'POST', headers }); fetchAll(); }}>
                      {s.enabled ? 'Pause' : 'Resume'}
                    </button>
                    <button className="item-btn delete" onClick={async () => { await fetch(`${API}/schedule/${s.id}`, { method: 'DELETE', headers }); fetchAll(); }}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* VOICE COMMANDS */}
      {activeTab === 'voice' && (
        <div className="voice-area">
          <h3 style={{ margin: '0 0 16px 0', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>🎤 Natural Language Command</h3>
          <textarea
            className="voice-input"
            placeholder="Say what you want... e.g., 'Schedule a daily SEO check at 9am' or 'Execute code review for my project' or 'Show me the status of running jobs'"
            value={voiceText}
            onChange={e => setVoiceText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendVoice(); }}
          />
          <button className="submit-btn" onClick={sendVoice} disabled={loading} style={{ marginTop: 12 }}>
            {loading ? 'Processing...' : 'Execute Command'}
          </button>

          {voiceResponse && (
            <div className="voice-response">
              <div className="voice-response-title">🤖 Response</div>
              <div className="voice-response-text">{voiceResponse}</div>
            </div>
          )}

          <div style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            <strong>Examples:</strong><br/>
            • "Execute a code review for ~/myproject"<br/>
            • "Schedule SEO check every day at 9am"<br/>
            • "Show me all running jobs"<br/>
            • "Cancel job job-123456"
          </div>
        </div>
      )}

      {/* FILE WATCHER */}
      {activeTab === 'watch' && (
        <>
          <div className="form-card">
            <h3>➕ Watch Folder</h3>
            <form onSubmit={addWatch}>
              <div className="form-row">
                <input name="path" placeholder="Folder path, e.g., ~/projects/myapp/src" required />
                <input name="name" placeholder="Name (optional)" />
              </div>
              <div className="form-row">
                <textarea name="prompt" placeholder="What to do when file changes? e.g., 'Review this code for errors: {file}'" required />
              </div>
              <div className="form-row">
                <input name="cooldown" type="number" placeholder="Cooldown minutes (default: 5)" />
              </div>
              <button type="submit" className="submit-btn">Add Watcher</button>
            </form>
          </div>

          {watches.length === 0 ? (
            <div className="empty-state">No watched folders. Add one above.</div>
          ) : (
            watches.map(w => (
              <div key={w.id} className="item-card">
                <div className="item-info">
                  <div className="item-name">{w.name || w.path}</div>
                  <div className="item-meta">
                    {w.path} • Events: {w.events.join(', ')} • Cooldown: {w.cooldownMinutes}min
                    {w.lastTriggered && ` • Last: ${new Date(w.lastTriggered).toLocaleString()}`}
                    {w.triggerCount > 0 && ` • Triggered ${w.triggerCount}×`}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{w.prompt}</div>
                </div>
                <div>
                  <span className={`item-status ${w.enabled ? 'enabled' : 'disabled'}`}>{w.enabled ? 'Watching' : 'Paused'}</span>
                  <div className="item-actions">
                    <button className="item-btn toggle" onClick={async () => { await fetch(`${API}/watch/${w.id}/toggle`, { method: 'POST', headers }); fetchAll(); }}>
                      {w.enabled ? 'Pause' : 'Resume'}
                    </button>
                    <button className="item-btn delete" onClick={async () => { await fetch(`${API}/watch/${w.id}`, { method: 'DELETE', headers }); fetchAll(); }}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* GIT HOOKS */}
      {activeTab === 'git' && (
        <>
          <div className="form-card">
            <h3>➕ Add Git Hook</h3>
            <form onSubmit={addGitHook}>
              <div className="form-row">
                <input name="repoPath" placeholder="Repository path, e.g., ~/projects/myapp" required />
                <input name="name" placeholder="Name (optional)" />
              </div>
              <div className="form-row">
                <input name="branches" placeholder="Branches to watch (comma-separated): main, develop" defaultValue="main, develop" />
              </div>
              <button type="submit" className="submit-btn">Install Hook</button>
            </form>
          </div>

          {gitHooks.length === 0 ? (
            <div className="empty-state">No git hooks configured. Add one above.</div>
          ) : (
            gitHooks.map(h => (
              <div key={h.id} className="item-card">
                <div className="item-info">
                  <div className="item-name">{h.name || h.repoPath}</div>
                  <div className="item-meta">
                    {h.repoPath} • Branches: {h.branches.join(', ')}<br/>
                    Triggers: {Object.entries(h.triggers).filter(([_,v]) => v).map(([k]) => k).join(', ')}<br/>
                    Actions: {Object.entries(h.actions).filter(([_,v]) => v).map(([k]) => k).join(', ')}
                  </div>
                </div>
                <div>
                  <span className={`item-status ${h.enabled ? 'enabled' : 'disabled'}`}>{h.enabled ? 'Active' : 'Paused'}</span>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* SHORTCUTS */}
      {activeTab === 'shortcuts' && (
        <>
          <div style={{ marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            Use these URL schemes in Shortcuts app, AppleScript, or browser to trigger AI actions instantly.
          </div>
          <div className="shortcuts-grid">
            {shortcuts.map(s => (
              <div key={s.id} className="shortcut-card">
                <div className="shortcut-name">{s.name}</div>
                <div className="shortcut-desc">{s.description}</div>
                <div className="shortcut-url">{s.trigger.urlScheme}</div>
                <div className="shortcut-actions">
                  <button className="shortcut-btn run" onClick={async () => {
                    await fetch(`${API}/shortcuts/${s.id}/execute`, { method: 'POST', headers, body: JSON.stringify({ prompt: 'test' }) });
                  }}>Run</button>
                  <button className="shortcut-btn copy" onClick={() => navigator.clipboard.writeText(s.trigger.urlScheme!)}>Copy URL</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>📱 macOS Shortcuts App Setup</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              1. Open Shortcuts app on your Mac<br/>
              2. Create new shortcut → Add Action → Web → Open URLs<br/>
              3. Enter URL: <code style={{ color: 'var(--accent)' }}>missioncontrol://task?prompt=YOUR_PROMPT</code><br/>
              4. Add to menu bar or assign hotkey<br/>
              5. Or use Siri: "Hey Siri, ask Mission Control to review my code"
            </div>
          </div>
        </>
      )}
    </div>
  );
}
