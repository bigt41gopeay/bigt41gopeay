import { useState, useCallback, useMemo, memo } from 'react'
import { genId, formatCurrency, formatDateLT } from '../utils/helpers'
import { useToast } from '../contexts/ToastContext'
import {
  Modal, Badge, SectionHeader, EmptyState,
  inputStyle, labelStyle, formGroup, btnPrimary, btnSecondary, btnDanger, cardStyle,
} from './ui'

const STAGES = [
  { id: 'naujas', label: 'Naujas', color: '#94a3b8', icon: '🆕' },
  { id: 'kontaktas', label: 'Kontaktas užmegztas', color: '#3b82f6', icon: '📞' },
  { id: 'pasiulymas', label: 'Pasiūlymas pateiktas', color: '#8b5cf6', icon: '📋' },
  { id: 'derybos', label: 'Derybos', color: '#f59e0b', icon: '🤝' },
  { id: 'laimeta', label: 'Laimėta', color: '#22c55e', icon: '🎉' },
  { id: 'prarasta', label: 'Prarasta', color: '#ef4444', icon: '❌' },
]

const SOURCES = ['Rekomendacija', 'Svetainė', 'Socialiniai tinklai', 'Skambutis', 'El. paštas', 'Kita']

function LeadForm({ initial, contacts, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    title: '', contactId: '', stage: 'naujas', value: '', source: '',
    probability: 50, expectedClose: '', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); if (form.title.trim()) { onSave(form); onClose() } }}>
      <div style={formGroup}><label style={labelStyle}>Pavadinimas *</label>
        <input style={inputStyle} required value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="pvz. Svetainė UAB Pavyzdys" autoFocus /></div>
      <div style={formGroup}><label style={labelStyle}>Kontaktas</label>
        <select style={inputStyle} value={form.contactId} onChange={e => set('contactId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Etapas</label>
        <select style={inputStyle} value={form.stage} onChange={e => set('stage', e.target.value)}>
          {STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
        </select></div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Vertė (€)</label>
          <input style={inputStyle} type="number" min="0" step="0.01" value={form.value}
            onChange={e => set('value', e.target.value)} placeholder="0.00" /></div>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Tikimybė (%)</label>
          <input style={inputStyle} type="number" min="0" max="100" value={form.probability}
            onChange={e => set('probability', e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Šaltinis</label>
          <select style={inputStyle} value={form.source} onChange={e => set('source', e.target.value)}>
            <option value="">— Pasirinkti —</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Numatoma data</label>
          <input style={inputStyle} type="date" value={form.expectedClose}
            onChange={e => set('expectedClose', e.target.value)} /></div>
      </div>
      <div style={formGroup}><label style={labelStyle}>Pastabos</label>
        <textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={form.notes}
          onChange={e => set('notes', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

export const Leads = memo(function Leads({ leads, setLeads, contacts }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewMode, setViewMode] = useState('pipeline') // 'pipeline' or 'list'
  const toast = useToast()
  const getContact = id => contacts.find(c => c.id === id)

  const save = useCallback((form) => {
    if (editing) {
      setLeads(ls => ls.map(l => l.id === editing.id ? { ...l, ...form } : l))
      toast.success('Užklausa atnaujinta')
    } else {
      setLeads(ls => [...ls, { ...form, id: genId(), createdAt: new Date().toISOString() }])
      toast.success('Užklausa pridėta')
    }
    setEditing(null)
  }, [editing, setLeads, toast])

  const moveStage = useCallback((leadId, newStage) => {
    setLeads(ls => ls.map(l => l.id === leadId ? { ...l, stage: newStage } : l))
    const stage = STAGES.find(s => s.id === newStage)
    toast.info(`Perkelta į: ${stage?.label}`)
  }, [setLeads, toast])

  const stats = useMemo(() => {
    const active = leads.filter(l => !['laimeta', 'prarasta'].includes(l.stage))
    const won = leads.filter(l => l.stage === 'laimeta')
    const totalPipeline = active.reduce((s, l) => s + (parseFloat(l.value) || 0), 0)
    const totalWon = won.reduce((s, l) => s + (parseFloat(l.value) || 0), 0)
    const weighted = active.reduce((s, l) => s + (parseFloat(l.value) || 0) * ((parseFloat(l.probability) || 0) / 100), 0)
    return { active: active.length, totalPipeline, totalWon, weighted }
  }, [leads])

  return (
    <div>
      <SectionHeader title="Pardavimų pipeline">
        <button style={{ ...btnSecondary, fontSize: 13, padding: '7px 14px' }}
          onClick={() => setViewMode(v => v === 'pipeline' ? 'list' : 'pipeline')}>
          {viewMode === 'pipeline' ? '📋 Sąrašas' : '📊 Pipeline'}
        </button>
        <button data-action="add" style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Nauja užklausa</button>
      </SectionHeader>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ background: '#3b82f622', border: '1px solid #3b82f644', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Pipeline: </span><b style={{ color: '#3b82f6' }}>{formatCurrency(stats.totalPipeline)}</b>
          <span style={{ color: '#64748b', marginLeft: 6 }}>({stats.active})</span>
        </div>
        <div style={{ background: '#8b5cf622', border: '1px solid #8b5cf644', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Svertinė: </span><b style={{ color: '#8b5cf6' }}>{formatCurrency(stats.weighted)}</b>
        </div>
        <div style={{ background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Laimėta: </span><b style={{ color: '#22c55e' }}>{formatCurrency(stats.totalWon)}</b>
        </div>
      </div>

      {/* Pipeline (Kanban-like) View */}
      {viewMode === 'pipeline' ? (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12 }}>
          {STAGES.filter(s => s.id !== 'prarasta').map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage.id)
            return (
              <div key={stage.id} style={{
                minWidth: 220, flex: '1 0 220px', background: '#1a1a2e',
                borderRadius: 10, border: `1px solid ${stage.color}33`,
              }}>
                <div style={{
                  padding: '10px 12px', borderBottom: `2px solid ${stage.color}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ color: stage.color, fontWeight: 700, fontSize: 13 }}>{stage.icon} {stage.label}</span>
                  <span style={{ background: stage.color + '33', color: stage.color, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                    {stageLeads.length}
                  </span>
                </div>
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                  {stageLeads.map(lead => {
                    const contact = getContact(lead.contactId)
                    const stageIdx = STAGES.findIndex(s => s.id === lead.stage)
                    const nextStage = STAGES[stageIdx + 1]
                    return (
                      <div key={lead.id} style={{
                        background: '#1e1e2e', borderRadius: 8, padding: 10,
                        border: '1px solid #2e2e3e', cursor: 'pointer',
                      }} onClick={() => { setEditing(lead); setShowForm(true) }}>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13, marginBottom: 4 }}>{lead.title}</div>
                        {contact && <div style={{ color: '#94a3b8', fontSize: 11 }}>{contact.name}</div>}
                        {lead.value && <div style={{ color: '#22c55e', fontSize: 12, fontWeight: 700, marginTop: 4 }}>{formatCurrency(parseFloat(lead.value))}</div>}
                        {lead.probability && <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Tikimybė: {lead.probability}%</div>}
                        {nextStage && (
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStage(lead.id, nextStage.id) }}
                            style={{
                              ...btnSecondary, fontSize: 10, padding: '3px 8px', marginTop: 6,
                              color: nextStage.color, width: '100%',
                            }}
                          >
                            → {nextStage.label}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div>
          {leads.length === 0 && <EmptyState icon="🎯" message="Nėra užklausų" />}
          {leads.map(lead => {
            const contact = getContact(lead.contactId)
            const stage = STAGES.find(s => s.id === lead.stage)
            return (
              <article key={lead.id} style={{ ...cardStyle, borderLeft: `3px solid ${stage?.color || '#6b7280'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{lead.title}</span>
                      <span style={{
                        background: (stage?.color || '#6b7280') + '22', color: stage?.color,
                        border: `1px solid ${stage?.color}44`, borderRadius: 6,
                        padding: '2px 8px', fontSize: 11, fontWeight: 600,
                      }}>{stage?.icon} {stage?.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      {contact && <span style={{ color: '#94a3b8', fontSize: 12 }}>👤 {contact.name}</span>}
                      {lead.value && <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }}>{formatCurrency(parseFloat(lead.value))}</span>}
                      {lead.source && <span style={{ color: '#64748b', fontSize: 11 }}>📍 {lead.source}</span>}
                      {lead.expectedClose && <span style={{ color: '#64748b', fontSize: 11 }}>📅 {lead.expectedClose}</span>}
                    </div>
                    {lead.notes && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{lead.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {lead.stage !== 'laimeta' && lead.stage !== 'prarasta' && (
                      <>
                        <button style={{ ...btnSecondary, fontSize: 11, padding: '4px 8px', color: '#22c55e' }}
                          onClick={() => moveStage(lead.id, 'laimeta')}>🎉 Laimėta</button>
                        <button style={{ ...btnSecondary, fontSize: 11, padding: '4px 8px', color: '#ef4444' }}
                          onClick={() => moveStage(lead.id, 'prarasta')}>❌ Prarasta</button>
                      </>
                    )}
                    <button style={btnSecondary} onClick={() => { setEditing(lead); setShowForm(true) }}>Redaguoti</button>
                    <button style={btnDanger} onClick={() => {
                      setLeads(ls => ls.filter(x => x.id !== lead.id))
                      toast.success('Užklausa ištrinta')
                    }}>Ištrinti</button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Redaguoti užklausą' : 'Nauja užklausa'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <LeadForm initial={editing} contacts={contacts} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
})
