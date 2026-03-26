import { useState, useCallback, memo } from 'react'
import { genId, formatDateLT } from '../utils/helpers'
import { useToast } from '../contexts/ToastContext'
import { BRAND } from '../utils/constants'
import {
  Modal, Badge, SectionHeader, FilterBar, EmptyState,
  inputStyle, labelStyle, formGroup, btnPrimary, btnSecondary, btnDanger, cardStyle,
} from './ui'

function CommForm({ initial, projects, contacts, onSave, onClose }) {
  const [form, setForm] = useState(initial || { type: 'el. laiškas', contactId: '', projectId: '', date: new Date().toISOString().slice(0, 16), subject: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); if (form.contactId) { onSave(form); onClose() } }}>
      <div style={formGroup}><label style={labelStyle}>Tipas</label>
        <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
          <option value="el. laiškas">El. laiškas</option>
          <option value="skambutis">Skambutis</option>
          <option value="susitikimas">Susitikimas</option>
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Kontaktas *</label>
        <select style={inputStyle} required value={form.contactId} onChange={e => set('contactId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Projektas</label>
        <select style={inputStyle} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Data ir laikas</label>
        <input style={inputStyle} type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Tema</label>
        <input style={inputStyle} value={form.subject} onChange={e => set('subject', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Pastabos</label>
        <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

export const Communications = memo(function Communications({ communications, setCommunications, projects, contacts }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [typeFilter, setTypeFilter] = useState('visi')
  const toast = useToast()

  const types = ['visi', 'el. laiškas', 'skambutis', 'susitikimas']
  const filtered = [...communications]
    .filter(c => typeFilter === 'visi' || c.type === typeFilter)
    .sort((a, b) => b.date.localeCompare(a.date))
  const getContact = id => contacts.find(c => c.id === id)
  const getProject = id => projects.find(p => p.id === id)

  const save = useCallback((form) => {
    if (editing) {
      setCommunications(cs => cs.map(c => c.id === editing.id ? { ...c, ...form } : c))
      toast.success('Komunikacija atnaujinta')
    } else {
      setCommunications(cs => [...cs, { ...form, id: genId() }])
      toast.success('Komunikacija pridėta')
    }
    setEditing(null)
  }, [editing, setCommunications, toast])

  return (
    <div>
      <SectionHeader title="Komunikacijos istorija">
        <button data-action="add" className="btn-press" style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
      </SectionHeader>

      <FilterBar options={types} value={typeFilter} onChange={setTypeFilter} />

      {filtered.length === 0 && <EmptyState icon="💬" message="Nėra įrašų" />}

      {filtered.map(c => {
        const contact = getContact(c.contactId)
        const project = getProject(c.projectId)
        return (
          <article key={c.id} className="card-interactive" style={{ ...cardStyle, borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={c.type} />
                  {contact && <span style={{ color: BRAND.textPrimary, fontWeight: 600 }}>{contact.name}</span>}
                  {c.subject && <span style={{ color: BRAND.textSecondary, fontSize: 13 }}>— {c.subject}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                  {project && <span style={{ color: BRAND.purple, fontSize: 12 }}>📁 {project.name}</span>}
                  <span style={{ color: BRAND.textMuted, fontSize: 12 }}>{formatDateLT(c.date)}</span>
                </div>
                {c.notes && <div style={{ color: BRAND.textSecondary, fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>{c.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <button className="btn-press" style={btnSecondary} onClick={() => { setEditing(c); setShowForm(true) }}>Redaguoti</button>
                <button className="btn-press" style={btnDanger} onClick={() => {
                  setCommunications(cs => cs.filter(x => x.id !== c.id))
                  toast.success('Komunikacija ištrinta')
                }}>Ištrinti</button>
              </div>
            </div>
          </article>
        )
      })}

      {showForm && (
        <Modal title={editing ? 'Redaguoti' : 'Nauja komunikacija'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <CommForm initial={editing} projects={projects} contacts={contacts} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
})
