// Memory & Learning Panel UI — Adaptive intelligence dashboard
// Add to ~/missioncontrol/web/src/App.tsx as new "Memory" tab

import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ───
interface LearningMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalCost: number;
  totalTokens: number;
  avgJobDuration: number;
  mostUsedAgent: string;
  mostCommonTask: string;
  improvementRate: number;
  costEfficiency: number;
  timeEfficiency: number;
  patternsLearned: number;
  insightsGenerated: number;
  insightsApplied: number;
}

interface WorkPattern {
  id: string;
  patternType: string;
  pattern: string;
  frequency: number;
  confidence: number;
  lastObserved: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  successRate: number;
  avgActualCost: number;
  usageCount: number;
  lastUsed: string;
}

interface LearningInsight {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  applied: boolean;
}

interface Subscription {
  id: string;
  provider: string;
  tier: string;
  status: string;
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    currentMonthCost: number;
  };
  metadata: { monthlyBudget?: number };
}

interface AdaptiveConfig {
  learningEnabled: boolean;
  autoOptimize: boolean;
  autoSelectAgent: boolean;
  suggestionFrequency: string;
  complexityPreference: string;
  costPreference: string;
  preferredAgents: string[];
  blacklistedAgents: string[];
  peakHours: string[];
}

// ─── Component ───
export function MemoryPanel({ token }: { token: string }) {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [patterns, setPatterns] = useState<WorkPattern[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [config, setConfig] = useState<AdaptiveConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'insights' | 'subscriptions' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [newSub, setNewSub] = useState({ provider: '', apiKey: '', monthlyBudget: 50 });

  const API = 'http://127.0.0.1:8787/api/memory';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [mRes, pRes, tRes, iRes, sRes, cRes] = await Promise.all([
        fetch(`${API}/metrics`, { headers }),
        fetch(`${API}/patterns`, { headers }),
        fetch(`${API}/templates`, { headers }),
        fetch(`${API}/insights`, { headers }),
        fetch(`${API}/subscriptions`, { headers }),
        fetch(`${API}/config`, { headers }),
      ]);

      if (mRes.ok) setMetrics((await mRes.json()).metrics);
      if (pRes.ok) setPatterns((await pRes.json()).patterns);
      if (tRes.ok) setTemplates((await tRes.json()).templates);
      if (iRes.ok) setInsights((await iRes.json()).insights);
      if (sRes.ok) setSubscriptions((await sRes.json()).subscriptions);
      if (cRes.ok) setConfig((await cRes.json()).config);
    } catch (e) {
      console.error('Failed to fetch memory data:', e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const applyInsight = async (id: string) => {
    await fetch(`${API}/insights/${id}/apply`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchAll();
  };

  const dismissInsight = async (id: string) => {
    await fetch(`${API}/insights/${id}/dismiss`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchAll();
  };

  const addSubscription = async () => {
    if (!newSub.provider || !newSub.apiKey) return;
    await fetch(`${API}/subscriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
    });
    setNewSub({ provider: '', apiKey: '', monthlyBudget: 50 });
    fetchAll();
  };

  const deleteSubscription = async (id: string) => {
    await fetch(`${API}/subscriptions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchAll();
  };

  const updateConfig = async (updates: Partial<AdaptiveConfig>) => {
    await fetch(`${API}/config`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    fetchAll();
  };

  const successRate = metrics ? (metrics.successfulJobs / Math.max(metrics.totalJobs, 1) * 100) : 0;
  const insightApplyRate = metrics ? (metrics.insightsApplied / Math.max(metrics.insightsGenerated, 1) * 100) : 0;

  return (
    <div className="memory-panel">
      <style>{`
        .memory-panel { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .memory-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .memory-header h2 { margin: 0; font-size: 1.5rem; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .memory-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 1px; }
        .memory-tab { padding: 10px 20px; border: none; background: transparent; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 13px; font-weight: 500; border-radius: 8px 8px 0 0; transition: all 0.2s; position: relative; }
        .memory-tab:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.03); }
        .memory-tab.active { color: var(--accent); background: rgba(76,194,255,0.08); }
        .memory-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent), var(--accent2)); }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .metric-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; transition: all 0.2s; }
        .metric-card:hover { border-color: rgba(76,194,255,0.15); background: rgba(255,255,255,0.05); }
        .metric-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.4); margin-bottom: 8px; }
        .metric-value { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #fff, var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .metric-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; }
        .metric-trend { font-size: 11px; margin-top: 6px; font-weight: 600; }
        .trend-up { color: var(--good); }
        .trend-down { color: var(--bad); }
        .section-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .insights-list { display: flex; flex-direction: column; gap: 10px; }
        .insight-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; display: flex; gap: 14px; align-items: flex-start; transition: all 0.2s; }
        .insight-card:hover { border-color: rgba(255,255,255,0.1); }
        .insight-card.applied { opacity: 0.6; border-color: rgba(46,213,115,0.2); }
        .insight-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .insight-icon.efficiency { background: rgba(76,194,255,0.1); }
        .insight-icon.cost { background: rgba(46,213,115,0.1); }
        .insight-icon.agent { background: rgba(125,92,255,0.1); }
        .insight-icon.pattern { background: rgba(255,159,67,0.1); }
        .insight-icon.error { background: rgba(255,71,87,0.1); }
        .insight-icon.schedule { background: rgba(116,185,255,0.1); }
        .insight-content { flex: 1; }
        .insight-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
        .insight-desc { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.5; }
        .insight-impact { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; text-transform: uppercase; margin-top: 8px; display: inline-block; }
        .impact-high { background: rgba(255,71,87,0.15); color: var(--bad); }
        .impact-medium { background: rgba(255,159,67,0.15); color: var(--warn); }
        .impact-low { background: rgba(46,213,115,0.15); color: var(--good); }
        .insight-actions { display: flex; gap: 8px; margin-top: 10px; }
        .insight-btn { padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
        .insight-btn.apply { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; }
        .insight-btn.apply:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(76,194,255,0.3); }
        .insight-btn.dismiss { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1); }
        .insight-btn.dismiss:hover { background: rgba(255,255,255,0.1); }
        .patterns-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
        .pattern-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; }
        .pattern-type { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--accent2); font-weight: 600; margin-bottom: 6px; }
        .pattern-text { font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.5; margin-bottom: 8px; }
        .pattern-meta { display: flex; gap: 16px; font-size: 11px; color: rgba(255,255,255,0.4); }
        .confidence-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 8px; overflow: hidden; }
        .confidence-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
        .templates-table { width: 100%; border-collapse: collapse; }
        .templates-table th { text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.4); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .templates-table td { padding: 12px; font-size: 13px; color: rgba(255,255,255,0.7); border-bottom: 1px solid rgba(255,255,255,0.04); }
        .templates-table tr:hover td { background: rgba(255,255,255,0.02); }
        .success-badge { padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .sub-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
        .sub-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .sub-provider { font-size: 14px; font-weight: 600; }
        .sub-status { font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: 600; }
        .sub-status.active { background: rgba(46,213,115,0.15); color: var(--good); }
        .sub-status.limited { background: rgba(255,159,67,0.15); color: var(--warn); }
        .sub-status.expired { background: rgba(255,71,87,0.15); color: var(--bad); }
        .sub-usage { margin-top: 10px; }
        .usage-bar-bg { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
        .usage-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
        .usage-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px; display: flex; justify-content: space-between; }
        .settings-form { display: flex; flex-direction: column; gap: 16px; max-width: 500px; }
        .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
        .setting-label { font-size: 13px; font-weight: 500; }
        .setting-desc { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .toggle { width: 44px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 12px; position: relative; cursor: pointer; transition: all 0.2s; }
        .toggle.active { background: linear-gradient(135deg, var(--accent), var(--accent2)); }
        .toggle-dot { width: 20px; height: 20px; background: #fff; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .toggle.active .toggle-dot { left: 22px; }
        .select-box { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px 12px; color: #fff; font-size: 13px; outline: none; }
        .select-box:focus { border-color: var(--accent); }
        .add-sub-form { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .add-sub-form input, .add-sub-form select { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; color: #fff; font-size: 13px; outline: none; }
        .add-sub-form input:focus, .add-sub-form select:focus { border-color: var(--accent); }
        .add-sub-form button { background: linear-gradient(135deg, var(--accent), var(--accent2)); border: none; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .chart-placeholder { height: 200px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 13px; }
        .empty-state { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); }
        .loading-spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="memory-header">
        <h2>🧠 Adaptive Memory & Learning</h2>
        {loading && <span className="loading-spinner" />}
      </div>

      {/* Tabs */}
      <div className="memory-tabs">
        {(['overview', 'patterns', 'insights', 'subscriptions', 'settings'] as const).map(tab => (
          <button
            key={tab}
            className={`memory-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'patterns' && '🔍 Patterns'}
            {tab === 'insights' && '💡 Insights'}
            {tab === 'subscriptions' && '💳 Subscriptions'}
            {tab === 'settings' && '⚙️ Settings'}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && metrics && (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Jobs</div>
              <div className="metric-value">{metrics.totalJobs}</div>
              <div className="metric-sub">{metrics.successfulJobs} successful, {metrics.failedJobs} failed</div>
              <div className={`metric-trend ${successRate >= 80 ? 'trend-up' : 'trend-down'}`}>
                {successRate.toFixed(1)}% success rate
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Cost</div>
              <div className="metric-value">${metrics.totalCost.toFixed(2)}</div>
              <div className="metric-sub">Across all jobs</div>
              <div className="metric-trend trend-up">
                ${metrics.costEfficiency.toFixed(4)} avg per job
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Tokens Used</div>
              <div className="metric-value">{(metrics.totalTokens / 1000).toFixed(1)}K</div>
              <div className="metric-sub">Total processed</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg Duration</div>
              <div className="metric-value">{(metrics.avgJobDuration / 60).toFixed(1)}m</div>
              <div className="metric-sub">Per job</div>
              <div className={`metric-trend ${metrics.improvementRate > 0 ? 'trend-up' : 'trend-down'}`}>
                {metrics.improvementRate > 0 ? '+' : ''}{metrics.improvementRate.toFixed(1)}% improvement
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Patterns Learned</div>
              <div className="metric-value">{metrics.patternsLearned}</div>
              <div className="metric-sub">Work habits detected</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Insights Applied</div>
              <div className="metric-value">{metrics.insightsApplied}</div>
              <div className="metric-sub">Of {metrics.insightsGenerated} generated</div>
              <div className={`metric-trend ${insightApplyRate >= 50 ? 'trend-up' : 'trend-down'}`}>
                {insightApplyRate.toFixed(0)}% apply rate
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Most Used Agent</div>
              <div className="metric-value" style={{ fontSize: 18 }}>{metrics.mostUsedAgent}</div>
              <div className="metric-sub">Your preferred AI</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Common Task</div>
              <div className="metric-value" style={{ fontSize: 18 }}>{metrics.mostCommonTask}</div>
              <div className="metric-sub">Most frequent type</div>
            </div>
          </div>

          <div className="section-title">📈 Cost & Efficiency Trends</div>
          <div className="chart-placeholder">
            Cost per job over time • Efficiency trending {metrics.improvementRate > 0 ? '↑' : '→'}
          </div>
        </>
      )}

      {/* PATTERNS TAB */}
      {activeTab === 'patterns' && (
        <>
          <div className="section-title">🔍 Learned Work Patterns</div>
          {patterns.length === 0 ? (
            <div className="empty-state">No patterns learned yet. Complete some jobs to start learning.</div>
          ) : (
            <div className="patterns-grid">
              {patterns.map(p => (
                <div key={p.id} className="pattern-card">
                  <div className="pattern-type">{p.patternType.replace('_', ' ')}</div>
                  <div className="pattern-text">{p.pattern}</div>
                  <div className="pattern-meta">
                    <span>Observed {p.frequency}×</span>
                    <span>Confidence {(p.confidence * 100).toFixed(0)}%</span>
                    <span>{new Date(p.lastObserved).toLocaleDateString()}</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ 
                      width: `${p.confidence * 100}%`, 
                      background: p.confidence > 0.8 ? 'var(--good)' : p.confidence > 0.5 ? 'var(--accent)' : 'var(--warn)'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="section-title" style={{ marginTop: 24 }}>📋 Task Templates</div>
          {templates.length === 0 ? (
            <div className="empty-state">No templates yet. Successful jobs become templates.</div>
          ) : (
            <table className="templates-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Success Rate</th>
                  <th>Avg Cost</th>
                  <th>Used</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{t.description}</td>
                    <td>
                      <span className="success-badge" style={{
                        background: `${t.successRate > 0.8 ? 'var(--good)' : t.successRate > 0.5 ? 'var(--accent)' : 'var(--bad)'}20`,
                        color: t.successRate > 0.8 ? 'var(--good)' : t.successRate > 0.5 ? 'var(--accent)' : 'var(--bad)'
                      }}>
                        {(t.successRate * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td>${t.avgActualCost.toFixed(4)}</td>
                    <td>{t.usageCount}×</td>
                    <td>{t.lastUsed ? new Date(t.lastUsed).toLocaleDateString() : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* INSIGHTS TAB */}
      {activeTab === 'insights' && (
        <>
          <div className="section-title">💡 Learning Insights</div>
          {insights.length === 0 ? (
            <div className="empty-state">No insights yet. The system generates insights as you work.</div>
          ) : (
            <div className="insights-list">
              {insights.map(i => (
                <div key={i.id} className={`insight-card ${i.applied ? 'applied' : ''}`}>
                  <div className={`insight-icon ${i.type}`}>
                    {i.type === 'efficiency_gain' && '⚡'}
                    {i.type === 'cost_saving' && '💰'}
                    {i.type === 'agent_suggestion' && '🤖'}
                    {i.type === 'pattern_detected' && '🔍'}
                    {i.type === 'error_prevention' && '🛡️'}
                    {i.type === 'schedule_optimization' && '📅'}
                  </div>
                  <div className="insight-content">
                    <div className="insight-title">{i.title}</div>
                    <div className="insight-desc">{i.description}</div>
                    <span className={`insight-impact impact-${i.impact}`}>{i.impact} impact</span>
                    {!i.applied && (
                      <div className="insight-actions">
                        <button className="insight-btn apply" onClick={() => applyInsight(i.id)}>Apply</button>
                        <button className="insight-btn dismiss" onClick={() => dismissInsight(i.id)}>Dismiss</button>
                      </div>
                    )}
                    {i.applied && <span style={{ fontSize: 11, color: 'var(--good)', marginTop: 8, display: 'inline-block' }}>✓ Applied</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SUBSCRIPTIONS TAB */}
      {activeTab === 'subscriptions' && (
        <>
          <div className="section-title">💳 API Subscriptions</div>

          <div className="add-sub-form">
            <select 
              value={newSub.provider} 
              onChange={e => setNewSub({...newSub, provider: e.target.value})}
              className="select-box"
            >
              <option value="">Select provider...</option>
              <option value="openai">OpenAI (ChatGPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
              <option value="moonshot">Moonshot (Kimi)</option>
              <option value="groq">Groq</option>
            </select>
            <input 
              type="password" 
              placeholder="API Key" 
              value={newSub.apiKey}
              onChange={e => setNewSub({...newSub, apiKey: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Monthly Budget ($)" 
              value={newSub.monthlyBudget}
              onChange={e => setNewSub({...newSub, monthlyBudget: Number(e.target.value)})}
              style={{ width: 140 }}
            />
            <button onClick={addSubscription}>Add</button>
          </div>

          {subscriptions.length === 0 ? (
            <div className="empty-state">No subscriptions configured. Add API keys to enable cloud agents.</div>
          ) : (
            subscriptions.map(sub => {
              const budget = sub.metadata?.monthlyBudget || 50;
              const usedPercent = Math.min((sub.usage.currentMonthCost / budget) * 100, 100);

              return (
                <div key={sub.id} className="sub-card">
                  <div className="sub-header">
                    <div>
                      <div className="sub-provider">{sub.provider}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {sub.tier} • {sub.status}
                      </div>
                    </div>
                    <span className={`sub-status ${sub.status}`}>{sub.status}</span>
                  </div>

                  <div className="sub-usage">
                    <div className="usage-bar-bg">
                      <div className="usage-bar-fill" style={{
                        width: `${usedPercent}%`,
                        background: usedPercent > 90 ? 'var(--bad)' : usedPercent > 75 ? 'var(--warn)' : 'var(--good)'
                      }} />
                    </div>
                    <div className="usage-label">
                      <span>${sub.usage.currentMonthCost.toFixed(2)} / ${budget} this month</span>
                      <span>{usedPercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    <span>Total requests: {sub.usage.totalRequests.toLocaleString()}</span>
                    <span>Total tokens: {(sub.usage.totalTokens / 1000).toFixed(1)}K</span>
                    <span>Total cost: ${sub.usage.totalCost.toFixed(2)}</span>
                  </div>

                  <button 
                    onClick={() => deleteSubscription(sub.id)}
                    style={{ marginTop: 12, background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', color: 'var(--bad)', padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              );
            })
          )}
        </>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && config && (
        <>
          <div className="section-title">⚙️ Adaptive Learning Settings</div>
          <div className="settings-form">
            <div className="setting-row">
              <div>
                <div className="setting-label">Enable Learning</div>
                <div className="setting-desc">The system learns from your work patterns</div>
              </div>
              <div className={`toggle ${config.learningEnabled ? 'active' : ''}`} onClick={() => updateConfig({ learningEnabled: !config.learningEnabled })}>
                <div className="toggle-dot" />
              </div>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">Auto-Optimize</div>
                <div className="setting-desc">Automatically apply learned optimizations</div>
              </div>
              <div className={`toggle ${config.autoOptimize ? 'active' : ''}`} onClick={() => updateConfig({ autoOptimize: !config.autoOptimize })}>
                <div className="toggle-dot" />
              </div>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">Auto-Select Agent</div>
                <div className="setting-desc">Skip council for known patterns</div>
              </div>
              <div className={`toggle ${config.autoSelectAgent ? 'active' : ''}`} onClick={() => updateConfig({ autoSelectAgent: !config.autoSelectAgent })}>
                <div className="toggle-dot" />
              </div>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">Suggestion Frequency</div>
                <div className="setting-desc">How often to show insights</div>
              </div>
              <select 
                className="select-box" 
                value={config.suggestionFrequency}
                onChange={e => updateConfig({ suggestionFrequency: e.target.value as any })}
              >
                <option value="always">Always</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="never">Never</option>
              </select>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">Complexity Preference</div>
                <div className="setting-desc">How detailed should decompositions be</div>
              </div>
              <select 
                className="select-box" 
                value={config.complexityPreference}
                onChange={e => updateConfig({ complexityPreference: e.target.value as any })}
              >
                <option value="simple">Simple (fewer steps)</option>
                <option value="balanced">Balanced</option>
                <option value="thorough">Thorough (more verification)</option>
              </select>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">Cost Preference</div>
                <div className="setting-desc">Trade-off between cost and quality</div>
              </div>
              <select 
                className="select-box" 
                value={config.costPreference}
                onChange={e => updateConfig({ costPreference: e.target.value as any })}
              >
                <option value="minimize">Minimize Cost</option>
                <option value="balanced">Balanced</option>
                <option value="performance">Max Performance</option>
              </select>
            </div>

            <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="setting-label">Preferred Agents</div>
              <div className="setting-desc">Agents you prefer for specific tasks</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {['claude-code', 'chatgpt', 'gemini', 'kimi', 'qwen-local', 'qwen-coder-local'].map(agent => (
                  <span 
                    key={agent}
                    onClick={() => {
                      const prefs = config.preferredAgents.includes(agent)
                        ? config.preferredAgents.filter(a => a !== agent)
                        : [...config.preferredAgents, agent];
                      updateConfig({ preferredAgents: prefs });
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 12,
                      cursor: 'pointer',
                      border: `1px solid ${config.preferredAgents.includes(agent) ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                      background: config.preferredAgents.includes(agent) ? 'rgba(76,194,255,0.15)' : 'rgba(255,255,255,0.03)',
                      color: config.preferredAgents.includes(agent) ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {config.preferredAgents.includes(agent) ? '✓ ' : ''}{agent}
                  </span>
                ))}
              </div>
            </div>

            <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="setting-label">Blacklisted Agents</div>
              <div className="setting-desc">Agents you never want to use</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {['claude-code', 'chatgpt', 'gemini', 'kimi', 'qwen-local', 'qwen-coder-local'].map(agent => (
                  <span 
                    key={agent}
                    onClick={() => {
                      const black = config.blacklistedAgents.includes(agent)
                        ? config.blacklistedAgents.filter(a => a !== agent)
                        : [...config.blacklistedAgents, agent];
                      updateConfig({ blacklistedAgents: black });
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 12,
                      cursor: 'pointer',
                      border: `1px solid ${config.blacklistedAgents.includes(agent) ? 'var(--bad)' : 'rgba(255,255,255,0.1)'}`,
                      background: config.blacklistedAgents.includes(agent) ? 'rgba(255,71,87,0.15)' : 'rgba(255,255,255,0.03)',
                      color: config.blacklistedAgents.includes(agent) ? 'var(--bad)' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {config.blacklistedAgents.includes(agent) ? '✕ ' : ''}{agent}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
