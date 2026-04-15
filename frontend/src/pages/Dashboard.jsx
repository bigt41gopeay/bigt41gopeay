import { useEffect, useState } from 'react'
import { pb } from '../lib/pb'

export default function Dashboard() {
  const [stats, setStats] = useState({ leads: 0, cold: 0, contacted: 0, won: 0, sentToday: 0, opened: 0, replied: 0 })
  const [recent, setRecent] = useState([])

  useEffect(() => {
    let unsub
    const load = async () => {
      try {
        const [leads, outreach] = await Promise.all([
          pb.collection('leads').getFullList({ fields: 'id,status' }),
          pb.collection('outreach').getFullList({ fields: 'id,status,sent_at,opened_at,replied_at', sort: '-sent_at' }),
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
        setRecent(outreach.slice(0, 5))
      } catch (e) {
        console.warn('Dashboard load failed — ar PocketBase paleistas?', e)
      }
    }
    load()
    try {
      pb.collection('leads').subscribe('*', load)
      unsub = () => pb.collection('leads').unsubscribe('*')
    } catch {}
    return () => unsub?.()
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
        <StatCard label="Leads iš viso" value={stats.leads} accent="#7c3aed" />
        <StatCard label="Šalti" value={stats.cold} accent="#64748b" />
        <StatCard label="Susisiekta" value={stats.contacted} accent="#3b82f6" />
        <StatCard label="Laimėta" value={stats.won} accent="#10b981" />
      </div>

      <h2 className="mt-6">Šios dienos outreach</h2>
      <div className="stat-grid">
        <StatCard label="Išsiųsta šiandien" value={stats.sentToday} accent="#7c3aed" />
        <StatCard label="Atidaryti" value={stats.opened} accent="#f59e0b" />
        <StatCard label="Atsakyta" value={stats.replied} accent="#10b981" />
      </div>

      <h2 className="mt-6">Paskutinės veiklos</h2>
      <div className="card glow-card">
        {recent.length === 0
          ? <div className="text-muted text-sm" style={{ padding: 20, textAlign: 'center' }}>Kol kas nėra veiklos</div>
          : <table className="table">
              <thead><tr><th>Statusas</th><th>Laikas</th><th>Reply?</th></tr></thead>
              <tbody>
                {recent.map(o => (
                  <tr key={o.id}>
                    <td><span className={'badge badge-' + (o.status === 'replied' ? 'won' : o.status === 'opened' ? 'interested' : 'contacted')}>{o.status}</span></td>
                    <td className="text-sm text-muted font-mono">{o.sent_at ? new Date(o.sent_at).toLocaleString('lt-LT') : '—'}</td>
                    <td>{o.replied_at ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className="card stat" style={{ borderLeft: `2px solid ${accent}` }}>
      <div className="label">{label}</div>
      <div className="value" style={{ color: accent }}>{value}</div>
    </div>
  )
}
