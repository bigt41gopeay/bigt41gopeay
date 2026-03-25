import { useState, useCallback, memo } from 'react'
import { genId, formatCurrency } from '../utils/helpers'
import { useToast } from '../contexts/ToastContext'
import { STATUS_COLORS, PROJECT_TEMPLATES } from '../utils/constants'
import {
  Modal, Badge, SectionHeader, FilterBar, EmptyState,
  inputStyle, labelStyle, formGroup, btnPrimary, btnSecondary, btnDanger, cardStyle,
} from './ui'

function ProjectForm({ initial, contacts, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', contactId: '', status: 'vykdomas', description: '', deadline: '', budget: '', _template: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const applyTemplate = (tplName) => {
    const tpl = PROJECT_TEMPLATES.find(t => t.name === tplName)
    if (tpl) {
      setForm(f => ({
        ...f,
        name: f.name || tpl.name,
        description: f.description || tpl.description,
        _template: tpl.name,
      }))
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); if (form.name.trim()) { onSave(form); onClose() } }}>
      {!initial && (
        <div style={formGroup}>
          <label style={labelStyle}>📋 Šablonas (sukurs darbus automatiškai)</label>
          <select style={inputStyle} value={form._template || ''} onChange={e => { set('_template', e.target.value); applyTemplate(e.target.value) }}>
            <option value="">— Tuščias projektas —</option>
            {PROJECT_TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
      )}
      <div style={formGroup}><label style={labelStyle}>Projekto pavadinimas *</label>
        <input style={inputStyle} required value={form.name} onChange={e => set('name', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Klientas</label>
        <select style={inputStyle} value={form.contactId} onChange={e => set('contactId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Statusas</label>
        <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
          {['vykdomas', 'laukia', 'baigtas', 'atidėtas', 'atšauktas'].map(s => <option key={s} value={s}>{s}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Terminas</label>
        <input style={inputStyle} type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Biudžetas (€)</label>
        <input style={inputStyle} type="number" min="0" step="0.01" value={form.budget} onChange={e => set('budget', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Aprašymas</label>
        <textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

export const Projects = memo(function Projects({ projects, setProjects, contacts, tasks, setTasks }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('visi')
  const toast = useToast()

  const statuses = ['visi', 'vykdomas', 'laukia', 'baigtas', 'atidėtas', 'atšauktas']
  const filtered = projects.filter(p => filter === 'visi' || p.status === filter)
  const getContact = id => contacts.find(c => c.id === id)

  const save = useCallback((form) => {
    if (editing) {
      setProjects(ps => ps.map(p => p.id === editing.id ? { ...p, ...form } : p))
      toast.success('Projektas atnaujintas')
    } else {
      const newProject = { ...form, id: genId(), createdAt: new Date().toISOString() }
      setProjects(ps => [...ps, newProject])
      toast.success('Projektas sukurtas')
      // Auto-create tasks from template if applicable
      if (form._template) {
        const template = PROJECT_TEMPLATES.find(t => t.name === form._template)
        if (template && setTasks) {
          template.defaultTasks.forEach(title => {
            setTasks(ts => [...ts, {
              id: genId(), title, projectId: newProject.id, contactId: form.contactId || '',
              type: 'darbas', status: 'laukia', deadline: '', notes: '', recurrence: '',
              createdAt: new Date().toISOString(),
            }])
          })
          toast.info(`Sukurta ${template.defaultTasks.length} darbai iš šablono`)
        }
      }
    }
    setEditing(null)
  }, [editing, setProjects, setTasks, toast])

  const createFromTemplate = useCallback((template) => {
    setEditing(null)
    setShowForm(true)
    // Pre-fill with template data
    setTimeout(() => {
      const form = document.querySelector('form input[required]')
      if (form) form.focus()
    }, 100)
  }, [])

  return (
    <div>
      <SectionHeader title="Projektai">
        <button data-action="add" style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
      </SectionHeader>

      <FilterBar options={statuses} value={filter} onChange={setFilter} />

      {filtered.length === 0 && <EmptyState icon="📁" message="Nėra projektų" />}

      {filtered.map(p => {
        const contact = getContact(p.contactId)
        const overdue = p.deadline && p.status !== 'baigtas' && new Date(p.deadline) < new Date()
        return (
          <article key={p.id} style={{ ...cardStyle, borderLeft: `3px solid ${STATUS_COLORS[p.status] || '#6b7280'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16 }}>{p.name}</div>
                {contact && <div style={{ color: '#94a3b8', fontSize: 13 }}>{contact.name}{contact.company ? ` · ${contact.company}` : ''}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge status={p.status} />
                  {p.deadline && <span style={{ color: overdue ? '#ef4444' : '#64748b', fontSize: 12 }}>{overdue ? '⚠ ' : ''}Terminas: {p.deadline}</span>}
                  {p.budget && <span style={{ color: '#22c55e', fontSize: 12 }}>{formatCurrency(parseFloat(p.budget))}</span>}
                </div>
                {p.description && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{p.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <button style={btnSecondary} onClick={() => { setEditing(p); setShowForm(true) }}>Redaguoti</button>
                <button style={btnDanger} onClick={() => {
                  setProjects(ps => ps.filter(x => x.id !== p.id))
                  toast.success('Projektas ištrintas')
                }}>Ištrinti</button>
              </div>
            </div>
          </article>
        )
      })}

      {showForm && (
        <Modal title={editing ? 'Redaguoti projektą' : 'Naujas projektas'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <ProjectForm initial={editing} contacts={contacts} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
})
