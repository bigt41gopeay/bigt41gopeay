import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pb'

const STATUSES = ['cold', 'contacted', 'interested', 'proposal_sent', 'negotiating', 'won', 'lost']
const PRIORITIES = ['urgent', 'high', 'medium', 'low']
const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#64748b' }

export default function Leads() {
  const nav = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const list = await pb.collection('leads').getFullList({ sort: '-score,-created' })
        setLeads(list)
      } catch (e) {
        console.warn(e)
      }
      setLoading(false)
    }
    load()
    try {
      pb.collection('leads').subscribe('*', load)
      return () => pb.collection('leads').unsubscribe('*')
    } catch {}
  }, [])

  const filtered = leads
    .filter(l => statusFilter === 'all' || l.status === statusFilter)
    .filter(l =>
      !search ||
      [l.domain, l.company_name, l.contact_email, l.contact_name].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    )

  const createLead = async () => {
    const domain = prompt('Domenas (pvz. imone.lt):')
    if (!domain) return
    try {
      const lead = await pb.collection('leads').create({
        url: `https://${domain}`,
        domain,
        status: 'cold',
        source: 'manual',
      })
      nav(`/leads/${lead.id}`)
    } catch (e) {
      alert('Klaida: ' + e.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          <div className="text-muted text-sm">{leads.length} iš viso</div>
        </div>
        <button className="btn btn-primary" onClick={createLead}>+ Naujas lead</button>
      </div>

      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        <button className={'btn ' + (statusFilter === 'all' ? 'btn-primary' : 'btn-secondary')} onClick={() => setStatusFilter('all')}>Visi</button>
        {STATUSES.map(s => (
          <button key={s} className={'btn ' + (statusFilter === s ? 'btn-primary' : 'btn-secondary')} onClick={() => setStatusFilter(s)}>
            {s} ({leads.filter(l => l.status === s).length})
          </button>
        ))}
      </div>

      <input className="input mb-4" placeholder="Ieškoti pagal domeną, įmonę, el. paštą..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="card">
        {loading ? <div className="text-muted" style={{ padding: 20 }}>Kraunama...</div>
          : filtered.length === 0 ? <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>Nerasta</div>
          : <table className="table">
              <thead>
                <tr>
                  <th>Prior.</th>
                  <th>Įmonė / Domenas</th>
                  <th>Kontaktas</th>
                  <th>Score</th>
                  <th>Load</th>
                  <th>Statusas</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} onClick={() => nav('/leads/' + l.id)}>
                    <td><span className="status-dot" style={{ color: PRIORITY_COLOR[l.priority || 'low'] }} /></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{l.company_name || l.domain}</div>
                      <div className="text-sm text-muted font-mono">{l.domain}</div>
                    </td>
                    <td className="text-sm">{l.contact_email || <span className="text-muted">—</span>}</td>
                    <td><span className="font-mono">{l.score || 0}</span></td>
                    <td className="text-sm font-mono text-muted">{l.load_time_ms ? Math.round(l.load_time_ms) + 'ms' : '—'}</td>
                    <td><span className={'badge badge-' + (l.status === 'won' ? 'won' : l.status === 'lost' ? 'lost' : l.status === 'cold' ? 'cold' : l.status === 'interested' ? 'interested' : 'contacted')}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  )
}
