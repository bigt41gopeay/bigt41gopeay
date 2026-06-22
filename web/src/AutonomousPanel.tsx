// Autonomous Agent Council UI Component
// Add to ~/missioncontrol/web/src/App.tsx as a new tab

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ───
interface AgentCapability {
  id: string;
  name: string;
  description: string;
  methods: any[];
  costPer1K: number;
  speed: string;
  reliability: number;
  contextWindow: number;
  specialties: string[];
}

interface SubTask {
  id: string;
  description: string;
  agentId: string;
  method: string;
  parameters: Record<string, any>;
  dependencies: string[];
  estimatedTokens: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  result?: {
    success: boolean;
    output: string;
    metrics: { tokensUsed: number; durationMs: number; cost: number };
    error?: string;
  };
  startedAt?: string;
  completedAt?: string;
  retries: number;
}

interface AutonomousJob {
  id: string;
  userRequest: string;
  status: 'planning' | 'deliberating' | 'executing' | 'verifying' | 'completed' | 'failed';
  subtasks: SubTask[];
  finalResult?: string;
  createdAt: string;
  updatedAt: string;
  logs: JobLog[];
  deliberation?: {
    winner: { agentName: string; method: string; reasoning: string; confidence: number };
    reasoning: string;
    proposals: any[];
    votes: any[];
  };
}

interface JobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  agent?: string;
  message: string;
}

// ─── Component ───
export function AutonomousPanel({ token }: { token: string }) {
  const [request, setRequest] = useState('');
  const [jobs, setJobs] = useState<AutonomousJob[]>([]);
  const [agents, setAgents] = useState<AgentCapability[]>([]);
  const [selectedJob, setSelectedJob] = useState<AutonomousJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const API = 'http://127.0.0.1:8787/api';
  const WS = `ws://127.0.0.1:8787/ws?token=${token}`;

  // Fetch initial data
  useEffect(() => {
    fetchJobs();
    fetchAgents();
  }, []);

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket(WS);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'autonomous:update') {
          fetchJobs();
          if (selectedJob?.id === msg.jobId) {
            fetchJob(msg.jobId);
          }
        }
      } catch {}
    };

    return () => ws.close();
  }, [token, selectedJob?.id]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedJob?.logs]);

  const fetchJobs = async () => {
    const res = await fetch(`${API}/autonomous/jobs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs || []);
    }
  };

  const fetchJob = async (id: string) => {
    const res = await fetch(`${API}/autonomous/jobs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedJob(data.job);
    }
  };

  const fetchAgents = async () => {
    const res = await fetch(`${API}/autonomous/agents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setAgents(data.agents || []);
    }
  };

  const submitJob = async () => {
    if (!request.trim()) return;
    setLoading(true);

    const res = await fetch(`${API}/autonomous/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ request: request.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setRequest('');
      fetchJobs();
      // Auto-select the new job
      setTimeout(() => fetchJob(data.jobId), 500);
    }

    setLoading(false);
  };

  const cancelJob = async (id: string) => {
    await fetch(`${API}/autonomous/jobs/${id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchJobs();
    if (selectedJob?.id === id) fetchJob(id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--good)';
      case 'failed': return 'var(--bad)';
      case 'running': return 'var(--accent)';
      case 'executing': return 'var(--accent2)';
      case 'deliberating': return '#ff9f43';
      case 'planning': return '#a0a0a0';
      case 'verifying': return '#2ed573';
      default: return '#888';
    }
  };

  const getAgentIcon = (agentId: string) => {
    const icons: Record<string, string> = {
      'claude-code': '◈',
      'chatgpt': '◇',
      'gemini': '◆',
      'kimi': '○',
      'qwen-local': '●',
      'qwen-coder-local': '◉',
      'system': '⚙',
    };
    return icons[agentId] || '◐';
  };

  return (
    <div className="autonomous-panel">
      <style>{`
        .autonomous-panel {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .autonomous-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .autonomous-header h2 {
          margin: 0;
          font-size: 1.5rem;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ws-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${wsConnected ? 'var(--good)' : 'var(--bad)'};
          box-shadow: 0 0 8px ${wsConnected ? 'var(--good)' : 'var(--bad)'};
        }
        .request-input-area {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .request-input {
          width: 100%;
          min-height: 80px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          outline: none;
          transition: border-color 0.2s;
        }
        .request-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(76,194,255,0.15);
        }
        .request-input::placeholder {
          color: rgba(255,255,255,0.3);
        }
        .submit-btn {
          margin-top: 12px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border: none;
          color: #fff;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(76,194,255,0.3);
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .agents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .agent-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 14px;
          transition: all 0.2s;
        }
        .agent-card:hover {
          border-color: rgba(76,194,255,0.2);
          background: rgba(255,255,255,0.05);
        }
        .agent-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .agent-icon {
          font-size: 18px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(76,194,255,0.1);
          border-radius: 6px;
        }
        .agent-name {
          font-weight: 600;
          font-size: 13px;
        }
        .agent-meta {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }
        .agent-specialties {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }
        .specialty-tag {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(76,194,255,0.1);
          color: var(--accent);
        }
        .jobs-section {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          height: calc(100vh - 400px);
          min-height: 500px;
        }
        .jobs-list {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          overflow-y: auto;
          padding: 8px;
        }
        .job-item {
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 4px;
          border-left: 3px solid transparent;
        }
        .job-item:hover {
          background: rgba(255,255,255,0.04);
        }
        .job-item.active {
          background: rgba(76,194,255,0.08);
          border-left-color: var(--accent);
        }
        .job-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .job-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .job-title {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .job-meta {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          display: flex;
          justify-content: space-between;
        }
        .job-detail {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .job-detail-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .job-detail-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .job-detail-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .deliberation-box {
          background: rgba(125,92,255,0.08);
          border: 1px solid rgba(125,92,255,0.15);
          border-radius: 10px;
          padding: 16px;
          margin: 16px;
        }
        .deliberation-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent2);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .subtasks-list {
          padding: 0 16px 16px;
          overflow-y: auto;
          flex: 1;
        }
        .subtask-item {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 10px;
          transition: all 0.2s;
        }
        .subtask-item:hover {
          border-color: rgba(255,255,255,0.1);
        }
        .subtask-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .subtask-agent {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
        }
        .subtask-status {
          font-size: 11px;
          padding: 2px 10px;
          border-radius: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .subtask-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.8);
          margin-bottom: 8px;
          line-height: 1.5;
        }
        .subtask-meta {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          display: flex;
          gap: 16px;
        }
        .subtask-output {
          margin-top: 10px;
          padding: 10px;
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
          font-size: 12px;
          font-family: 'SF Mono', monospace;
          color: rgba(255,255,255,0.7);
          max-height: 200px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .subtask-error {
          margin-top: 10px;
          padding: 10px;
          background: rgba(255,71,87,0.1);
          border: 1px solid rgba(255,71,87,0.2);
          border-radius: 6px;
          font-size: 12px;
          color: var(--bad);
        }
        .logs-panel {
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          max-height: 250px;
          overflow-y: auto;
          background: rgba(0,0,0,0.2);
        }
        .log-entry {
          font-size: 12px;
          font-family: 'SF Mono', monospace;
          padding: 3px 0;
          display: flex;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .log-time {
          color: rgba(255,255,255,0.3);
          min-width: 80px;
        }
        .log-level {
          min-width: 50px;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 10px;
        }
        .log-level.info { color: var(--accent); }
        .log-level.warn { color: var(--warn); }
        .log-level.error { color: var(--bad); }
        .log-level.debug { color: rgba(255,255,255,0.4); }
        .log-agent {
          color: var(--accent2);
          min-width: 100px;
        }
        .log-message {
          color: rgba(255,255,255,0.7);
        }
        .final-result {
          margin: 16px;
          padding: 16px;
          background: rgba(46,213,115,0.08);
          border: 1px solid rgba(46,213,115,0.15);
          border-radius: 10px;
        }
        .final-result-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--good);
          margin-bottom: 10px;
        }
        .final-result-content {
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .cancel-btn {
          background: rgba(255,71,87,0.15);
          border: 1px solid rgba(255,71,87,0.3);
          color: var(--bad);
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cancel-btn:hover {
          background: rgba(255,71,87,0.25);
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: rgba(255,255,255,0.3);
        }
        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div className="autonomous-header">
        <h2>🤖 Autonomous Agent Council</h2>
        <div className="ws-indicator" title={wsConnected ? 'Live updates connected' : 'Disconnected'} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          {wsConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Request Input */}
      <div className="request-input-area">
        <textarea
          className="request-input"
          placeholder="Describe what you want done... e.g., 'Analyze my website SEO, generate a report, and save it to ~/reports/seo.md' or 'Refactor the auth module in my project to use JWT tokens'"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              submitJob();
            }
          }}
        />
        <button
          className="submit-btn"
          onClick={submitJob}
          disabled={loading || !request.trim()}
        >
          {loading ? <span className="spinner" /> : '▶'}
          {loading ? 'Launching Council...' : 'Launch Autonomous Job'}
        </button>
      </div>

      {/* Available Agents */}
      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
        Available Agents ({agents.length})
      </div>
      <div className="agents-grid">
        {agents.map(agent => (
          <div key={agent.id} className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon">{getAgentIcon(agent.id)}</div>
              <div>
                <div className="agent-name">{agent.name}</div>
                <div className="agent-meta">
                  <span>⚡ {agent.speed}</span>
                  <span>${agent.costPer1K === 0 ? 'Free' : `$${agent.costPer1K}/1K`}</span>
                  <span>🎯 {(agent.reliability * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              {agent.description}
            </div>
            <div className="agent-specialties">
              {agent.specialties.map(s => (
                <span key={s} className="specialty-tag">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Jobs Section */}
      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
        Jobs ({jobs.length})
      </div>
      <div className="jobs-section">
        {/* Jobs List */}
        <div className="jobs-list">
          {jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div>No jobs yet. Submit a request above.</div>
            </div>
          ) : (
            jobs.map(job => (
              <div
                key={job.id}
                className={`job-item ${selectedJob?.id === job.id ? 'active' : ''}`}
                onClick={() => { setSelectedJob(job); fetchJob(job.id); }}
              >
                <div className="job-item-header">
                  <span
                    className="job-status-dot pulse"
                    style={{ background: getStatusColor(job.status) }}
                  />
                  <span className="job-title">{job.userRequest}</span>
                </div>
                <div className="job-meta">
                  <span>{job.status}</span>
                  <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Job Detail */}
        <div className="job-detail">
          {!selectedJob ? (
            <div className="empty-state">
              <div className="empty-state-icon">👆</div>
              <div>Select a job to view details</div>
            </div>
          ) : (
            <>
              <div className="job-detail-header">
                <div>
                  <div className="job-detail-title">{selectedJob.userRequest}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {selectedJob.id} • {new Date(selectedJob.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    className="job-detail-status"
                    style={{
                      background: `${getStatusColor(selectedJob.status)}20`,
                      color: getStatusColor(selectedJob.status),
                      border: `1px solid ${getStatusColor(selectedJob.status)}40`,
                    }}
                  >
                    <span className={['running', 'executing', 'deliberating', 'planning', 'verifying'].includes(selectedJob.status) ? 'pulse' : ''}>
                      ●
                    </span>
                    {selectedJob.status}
                  </span>
                  {['planning', 'deliberating', 'executing', 'verifying'].includes(selectedJob.status) && (
                    <button className="cancel-btn" onClick={() => cancelJob(selectedJob.id)}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Deliberation Result */}
              {selectedJob.deliberation && (
                <div className="deliberation-box">
                  <div className="deliberation-title">
                    🏛️ Council Decision
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <strong style={{ color: 'var(--accent2)' }}>
                      {selectedJob.deliberation.winner.agentName}
                    </strong>
                    {' '}was chosen with {(selectedJob.deliberation.winner.confidence * 100).toFixed(0)}% confidence
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    {selectedJob.deliberation.reasoning}
                  </div>
                  {selectedJob.deliberation.votes.length > 0 && (
                    <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      Votes: {selectedJob.deliberation.votes.map(v => 
                        `${v.agentId}→${v.votedFor}`
                      ).join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Subtasks */}
              <div className="subtasks-list">
                {selectedJob.subtasks.length === 0 ? (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <div className="empty-state-icon">🔄</div>
                    <div>Decomposing task...</div>
                  </div>
                ) : (
                  selectedJob.subtasks.map(subtask => (
                    <div key={subtask.id} className="subtask-item">
                      <div className="subtask-header">
                        <div className="subtask-agent">
                          <span>{getAgentIcon(subtask.agentId)}</span>
                          <span>{subtask.agentId}</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                            {subtask.method}
                          </span>
                        </div>
                        <span
                          className="subtask-status"
                          style={{
                            background: `${getStatusColor(subtask.status)}20`,
                            color: getStatusColor(subtask.status),
                          }}
                        >
                          {subtask.status}
                          {subtask.retries > 0 && ` (retry ${subtask.retries})`}
                        </span>
                      </div>
                      <div className="subtask-desc">{subtask.description}</div>
                      <div className="subtask-meta">
                        <span>📝 {subtask.estimatedTokens.toLocaleString()} tokens</span>
                        {subtask.result && (
                          <>
                            <span>⏱️ {(subtask.result.metrics.durationMs / 1000).toFixed(1)}s</span>
                            <span>💰 ${subtask.result.metrics.cost.toFixed(4)}</span>
                            <span>🔤 {subtask.result.metrics.tokensUsed.toLocaleString()} used</span>
                          </>
                        )}
                      </div>
                      {subtask.result?.output && (
                        <div className="subtask-output">{subtask.result.output}</div>
                      )}
                      {subtask.result?.error && (
                        <div className="subtask-error">{subtask.result.error}</div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Final Result */}
              {selectedJob.finalResult && (
                <div className="final-result">
                  <div className="final-result-title">✅ Final Result</div>
                  <div className="final-result-content">{selectedJob.finalResult}</div>
                </div>
              )}

              {/* Logs */}
              <div className="logs-panel">
                {selectedJob.logs.map((log, i) => (
                  <div key={i} className="log-entry">
                    <span className="log-time">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`log-level ${log.level}`}>{log.level}</span>
                    <span className="log-agent">{log.agent || 'system'}</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
