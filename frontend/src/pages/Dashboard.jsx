import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pb'

export default function Dashboard() {
  const nav = useNavigate()
  const [stats, setStats] = useState({ leads: 0, cold: 0, contacted: 0, won: 0, sentToday: 0, opened: 0, replied: 0 })
  const [hotLeads, setHotLeads] = useState([])
  const [recent, setRecent] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [leads, outreach] = await Promise.all([
          pb.collection('leads').getFullList({ fields: 'id,status,priority,company_name,domain,score' }),
          pb.collection('outreach').getFullList({ fields: 'id,status,sent_at,opened_at,replied_at,subject', sort: '-sent_at' }),
        ])
        const todayStr = new Date().toISOString().slice(0, 10)
        setStats({
          leads: leads.length,
          cold: leads.filter(l => l.status === 'cold').length,
          contacted: leads.filter(l => l.status === 'contacted').length,
          won: leads.filter(l => l.status === 'won').length,
          sentToday: outreach.filter(o => (o.sent_at || '').slice(0, 10) === todayStr).length,
          opened: outreach.filter(o => o.opened_at).length,
          replied: outreach.filter(o => o.replied_at).length,
        })
        setHotLeads(leads.filter(l => l.priority === 'high' || l.priority === 'urgent').sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5))
        setRecent(outreach.slice(0, 5))
      } catch {}
    }
    load()
    try {
      pb.collection('leads').subscribe('*', load)
      return () => pb.collection('leads').unsubscribe('*')
    } catch {}
  }, [])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="text-muted text-sm">Šiandienos apžvalga</div>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Leads" value={stats.leads} accent="#7c3aed" />
        <Stat label="Šalti" value={stats.cold} accent="#64748b" />
        <Stat label="Susisiekta" value={stats.contacted} accent="#3b82f6" />
        <Stat label="Laimėta" value={stats.won} accent="#10b981" />
      </div>

      <h2 className="mt-2">Outreach šiandien</h2>
      <div className="stat-grid">
        <Stat label="Išsiųsta" value={stats.sentToday} accent="#7c3aed" />
        <Stat label="Atidaryti" value={stats.opened} accent="#f59e0b" />
      </div>

      {hotLeads.length > 0 && <>
        <h2 className="mt-2">🔥 Karšti leads</h2>
        <div className="card-list">
          {hotLeads.map(l => (
            <div key={l.id} className="lead-card" onClick={() => nav('/leads/' + l.id)}>
              <div className="lead-avatar" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                {(l.company_name || l.domain || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="lead-info">
                <div className="lead-name">{l.company_name || l.domain}</div>
                <div className="lead-meta">{l.priority}</div>
              </div>
              <div className="lead-right">
                <div className="lead-score font-mono" style={{ color: '#ef4444' }}>{l.score || 0}</div>
              </div>
            </div>
          ))}
        </div>
      </>}

      {recent.length > 0 && <>
        <h2 className="mt-4">Paskutiniai laiškai</h2>
        <div className="card-list">
          {recent.map(o => (
            <div key={o.id} className="card" style={{ padding: 14 }}>
              <div className="flex justify-between items-center">
                <span className={'badge badge-' + (o.status === 'replied' ? 'won' : o.status === 'opened' ? 'interested' : 'contacted')} style={{ fontSize: 10 }}>{o.status}</span>
                <span className="text-sm text-muted font-mono">{o.sent_at ? new Date(o.sent_at).toLocaleDateString('lt-LT') : ''}</span>
              </div>
              {o.subject && <div className="text-sm mt-2 truncate">{o.subject}</div>}
            </div>
          ))}
        </div>
      </>}

      {stats.leads === 0 && (
        <div className="empty-state mt-6">
          <div className="empty-icon">◯</div>
          <div className="empty-text">Pridėkite pirmą lead'ą</div>
          <button className="btn btn-primary mt-4" onClick={() => nav('/leads')}>Eiti į Leads</button>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="card stat" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="label">{label}</div>
      <div className="value" style={{ color: accent }}>{value}</div>
    </div>
  )
}
