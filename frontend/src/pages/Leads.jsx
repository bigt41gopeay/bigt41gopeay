import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pb'

const STATUSES = ['cold', 'contacted', 'interested', 'proposal_sent', 'negotiating', 'won', 'lost']
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
      try { setLeads(await pb.collection('leads').getFullList({ sort: '-score,-created' })) } catch {}
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
      const lead = await pb.collection('leads').create({ url: `https://${domain}`, domain, status: 'cold', source: 'manual' })
      nav(`/leads/${lead.id}`)
    } catch (e) { alert('Klaida: ' + e.message) }
  }

  const getInitials = (l) => (l.company_name || l.domain || '?').slice(0, 2).toUpperCase()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          <div className="text-muted text-sm">{leads.length} iš viso</div>
        </div>
      </div>

      <input className="input mb-4" placeholder="🔍 Ieškoti pagal domeną, įmonę..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="pill-scroll">
        <button className={'pill' + (statusFilter === 'all' ? ' active' : '')} onClick={() => setStatusFilter('all')}>
          Visi<span className="count">{leads.length}</span>
        </button>
        {STATUSES.map(s => {
          const c = leads.filter(l => l.status === s).length
          if (c === 0 && statusFilter !== s) return null
          return (
            <button key={s} className={'pill' + (statusFilter === s ? ' active' : '')} onClick={() => setStatusFilter(s)}>
              {s}<span className="count">{c}</span>
            </button>
          )
        })}
      </div>

      {loading ? <div className="empty-state"><div className="empty-text">Kraunama...</div></div>
        : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon">⊞</div><div className="empty-text">Nerasta lead'ų</div></div>
        : <div className="card-list">
            {filtered.map(l => (
              <div key={l.id} className="lead-card" onClick={() => nav('/leads/' + l.id)}>
                <div className="lead-avatar" style={{ borderLeft: `3px solid ${PRIORITY_COLOR[l.priority || 'low']}` }}>
                  {getInitials(l)}
                </div>
                <div className="lead-info">
                  <div className="lead-name">{l.company_name || l.domain}</div>
                  <div className="lead-meta">
                    {l.contact_email || l.domain}
                    {l.load_time_ms ? ` · ${Math.round(l.load_time_ms)}ms` : ''}
                  </div>
                </div>
                <div className="lead-right">
                  <div className="lead-score font-mono" style={{ color: PRIORITY_COLOR[l.priority || 'low'] }}>{l.score || 0}</div>
                  <span className={'badge badge-' + (l.status === 'won' ? 'won' : l.status === 'lost' ? 'lost' : l.status === 'cold' ? 'cold' : l.status === 'interested' ? 'interested' : 'contacted')} style={{ fontSize: 10 }}>{l.status}</span>
                </div>
              </div>
            ))}
          </div>
      }

      <button className="fab" onClick={createLead} aria-label="Naujas lead">+</button>
    </div>
  )
}
