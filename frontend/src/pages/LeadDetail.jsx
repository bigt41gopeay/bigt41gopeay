import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pb } from '../lib/pb'

export default function LeadDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [lead, setLead] = useState(null)
  const [tech, setTech] = useState([])
  const [outreach, setOutreach] = useState([])

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
      alert('Paleista! Po kelių sekundžių pamatysite naują įrašą.')
    } catch (e) {
      alert('Klaida: ' + e.message)
    }
  }

  if (!lead) return <div className="text-muted">Kraunama...</div>

  return (
    <div>
      <button className="btn btn-ghost mb-4" onClick={() => nav('/leads')}>← Atgal</button>

      <div className="page-header">
        <div>
          <h1>{lead.company_name || lead.domain}</h1>
          <div className="text-muted text-sm font-mono">{lead.url}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={triggerOutreach}>✉ AI Outreach</button>
          <select className="select" style={{ width: 160 }} value={lead.status} onChange={e => save({ status: e.target.value })}>
            {['cold','contacted','interested','proposal_sent','negotiating','won','lost'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-2 mb-6">
        <div className="card">
          <h2>Kontaktai</h2>
          <Field label="Vardas" value={lead.contact_name} onChange={v => save({ contact_name: v })} />
          <Field label="El. paštas" value={lead.contact_email} onChange={v => save({ contact_email: v })} />
          <Field label="Telefonas" value={lead.contact_phone} onChange={v => save({ contact_phone: v })} />
          <Field label="Pramonė" value={lead.industry} onChange={v => save({ industry: v })} />
        </div>
        <div className="card">
          <h2>Techniniai rodikliai</h2>
          <Row label="Score" value={<span className="font-mono" style={{ fontSize: 18, color: '#7c3aed' }}>{lead.score || 0}</span>} />
          <Row label="Prioritetas" value={<span className="badge">{lead.priority || '—'}</span>} />
          <Row label="Load time" value={<span className="font-mono">{lead.load_time_ms ? Math.round(lead.load_time_ms) + 'ms' : '—'}</span>} />
          <Row label="SSL" value={lead.ssl_valid === false ? '❌ Nesaugu' : lead.ssl_valid ? '✓ OK' : '—'} />
          <Row label="Mobile friendly" value={lead.mobile_friendly === false ? '❌ Ne' : lead.mobile_friendly ? '✓ Taip' : '—'} />
          <Row label="Analytics" value={lead.has_analytics ? '✓' : '✗'} />
        </div>
      </div>

      <div className="card mb-6">
        <h2>Tech Stack</h2>
        {tech.length === 0 ? <div className="text-muted text-sm">Dar neanalizuota</div> :
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {tech.map(t => (
              <span key={t.id} className="badge badge-contacted">
                {t.name}{t.version ? ` ${t.version}` : ''}
                {t.is_outdated && <span style={{ color: 'var(--warning)' }}>⚠</span>}
              </span>
            ))}
          </div>
        }
      </div>

      <div className="card">
        <h2>Outreach istorija</h2>
        {outreach.length === 0 ? <div className="text-muted text-sm">Dar nebuvo siųsta</div> :
          outreach.map(o => (
            <div key={o.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="flex justify-between items-center">
                <div>
                  <div style={{ fontWeight: 500 }}>{o.subject}</div>
                  <div className="text-sm text-muted font-mono">{new Date(o.sent_at).toLocaleString('lt-LT')}</div>
                </div>
                <span className={'badge badge-' + (o.status === 'replied' ? 'won' : o.status === 'opened' ? 'interested' : 'contacted')}>{o.status}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

function Field({ label, value, onChange }) {
  const [v, setV] = useState(value || '')
  useEffect(() => setV(value || ''), [value])
  return (
    <div className="mb-2">
      <label className="label">{label}</label>
      <input className="input" value={v} onChange={e => setV(e.target.value)} onBlur={() => v !== (value || '') && onChange(v)} />
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between mb-2" style={{ padding: '4px 0' }}>
      <span className="text-muted text-sm">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}
