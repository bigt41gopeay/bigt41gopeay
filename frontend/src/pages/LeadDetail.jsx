import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pb } from '../lib/pb'

export default function LeadDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [lead, setLead] = useState(null)
  const [tech, setTech] = useState([])
  const [outreach, setOutreach] = useState([])
  const [tab, setTab] = useState('info')

  useEffect(() => {
    const load = async () => {
      try {
        const l = await pb.collection('leads').getOne(id)
        setLead(l)
        const [t, o] = await Promise.all([
          pb.collection('tech_stack').getFullList({ filter: `lead='${id}'` }),
          pb.collection('outreach').getFullList({ filter: `lead='${id}'`, sort: '-sent_at' }),
        ])
        setTech(t); setOutreach(o)
      } catch {}
    }
    load()
  }, [id])

  const save = async (patch) => {
    const updated = await pb.collection('leads').update(id, patch)
    setLead(updated)
  }

  const triggerOutreach = async () => {
    if (!confirm('Siųsti AI sugeneruotą outreach laišką?')) return
    try {
      await fetch((import.meta.env.VITE_N8N_URL || 'https://n8n.oktoja.lt') + '/webhook/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: id }),
      })
      alert('Paleista!')
    } catch (e) { alert('Klaida: ' + e.message) }
  }

  if (!lead) return <div className="empty-state"><div className="empty-text">Kraunama...</div></div>

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'tech', label: 'Tech' },
    { id: 'outreach', label: 'Outreach' },
  ]

  return (
    <div>
      <button className="btn btn-ghost mb-4" onClick={() => nav('/leads')}>← Atgal</button>

      <div className="card mb-4">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="truncate" style={{ fontSize: 20 }}>{lead.company_name || lead.domain}</h1>
            <div className="text-muted text-sm font-mono truncate">{lead.url}</div>
          </div>
          <div className="lead-score font-mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>{lead.score || 0}</div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <select className="select" style={{ flex: 1, minWidth: 120 }} value={lead.status} onChange={e => save({ status: e.target.value })}>
            {['cold','contacted','interested','proposal_sent','negotiating','won','lost'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary" onClick={triggerOutreach}>✉ AI Outreach</button>
        </div>
      </div>

      <div className="pill-scroll">
        {tabs.map(t => (
          <button key={t.id} className={'pill' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'outreach' && outreach.length > 0 && <span className="count">{outreach.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <>
          <div className="card detail-section">
            <h2>Kontaktai</h2>
            <EditableField label="Vardas" value={lead.contact_name} onSave={v => save({ contact_name: v })} />
            <EditableField label="El. paštas" value={lead.contact_email} onSave={v => save({ contact_email: v })} type="email" />
            <EditableField label="Telefonas" value={lead.contact_phone} onSave={v => save({ contact_phone: v })} type="tel" />
            <EditableField label="Pramonė" value={lead.industry} onSave={v => save({ industry: v })} />
          </div>
          <div className="card detail-section">
            <h2>Techniniai rodikliai</h2>
            <div className="detail-row"><span className="detail-label">Load time</span><span className="detail-value font-mono">{lead.load_time_ms ? Math.round(lead.load_time_ms) + 'ms' : '—'}</span></div>
            <div className="detail-row"><span className="detail-label">SSL</span><span className="detail-value">{lead.ssl_valid === false ? '❌ Nesaugu' : lead.ssl_valid ? '✅ OK' : '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Mobile</span><span className="detail-value">{lead.mobile_friendly === false ? '❌ Ne' : lead.mobile_friendly ? '✅ Taip' : '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Analytics</span><span className="detail-value">{lead.has_analytics ? '✅' : '❌'}</span></div>
            <div className="detail-row"><span className="detail-label">Prioritetas</span><span className="detail-value"><span className="badge">{lead.priority || '—'}</span></span></div>
          </div>
        </>
      )}

      {tab === 'tech' && (
        <div className="card detail-section">
          <h2>Tech Stack</h2>
          {tech.length === 0 ? <div className="text-muted text-sm" style={{ padding: '16px 0' }}>Dar neanalizuota</div>
            : tech.map(t => (
              <div key={t.id} className="detail-row">
                <div>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                  <div className="text-sm text-muted">{t.category}{t.version ? ` · v${t.version}` : ''}</div>
                </div>
                <div>
                  {t.is_outdated && <span className="badge badge-interested" style={{ fontSize: 10 }}>pasenęs</span>}
                  {t.has_vulnerability && <span className="badge badge-lost" style={{ fontSize: 10, marginLeft: 4 }}>pažeid.</span>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'outreach' && (
        <div className="card-list">
          {outreach.length === 0
            ? <div className="card"><div className="empty-state"><div className="empty-icon">✉</div><div className="empty-text">Dar nebuvo siųsta</div></div></div>
            : outreach.map(o => (
              <div key={o.id} className="card" style={{ borderLeft: `3px solid ${o.status === 'replied' ? 'var(--success)' : o.status === 'opened' ? 'var(--warning)' : 'var(--info)'}` }}>
                <div className="flex justify-between items-center gap-2">
                  <span className={'badge badge-' + (o.status === 'replied' ? 'won' : o.status === 'opened' ? 'interested' : 'contacted')}>{o.status}</span>
                  <span className="text-sm text-muted font-mono">{o.sent_at ? new Date(o.sent_at).toLocaleDateString('lt-LT') : ''}</span>
                </div>
                <div style={{ fontWeight: 500, marginTop: 8 }}>{o.subject}</div>
                {o.opened_at && <div className="text-sm mt-2" style={{ color: 'var(--warning)' }}>👁 Atidaryta: {new Date(o.opened_at).toLocaleString('lt-LT')}</div>}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function EditableField({ label, value, onSave, type = 'text' }) {
  const [v, setV] = useState(value || '')
  const [editing, setEditing] = useState(false)
  useEffect(() => setV(value || ''), [value])

  if (!editing) {
    return (
      <div className="detail-row" onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
        <span className="detail-label">{label}</span>
        <span className="detail-value">{v || <span className="text-muted">Pridėti</span>}</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <input className="input" type={type} value={v} onChange={e => setV(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && (onSave(v), setEditing(false))} />
        <button className="btn-icon" onClick={() => { onSave(v); setEditing(false) }}>✓</button>
        <button className="btn-icon" onClick={() => { setV(value || ''); setEditing(false) }}>✕</button>
      </div>
    </div>
  )
}
