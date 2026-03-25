import { useState, useCallback, memo } from 'react'
import { genId, formatDateLT } from '../utils/helpers'
import { gcalCreateEvent, gcalUpdateEvent } from '../utils/gcal'
import { useToast } from '../contexts/ToastContext'
import {
  Modal, Badge, SectionHeader, FilterBar, EmptyState,
  inputStyle, labelStyle, formGroup, btnPrimary, btnSecondary, btnDanger, cardStyle,
} from './ui'

function TaskForm({ initial, projects, contacts, onSave, onClose }) {
  const [form, setForm] = useState(initial || { title: '', projectId: '', contactId: '', type: 'darbas', status: 'laukia', deadline: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); if (form.title.trim()) { onSave(form); onClose() } }}>
      <div style={formGroup}><label style={labelStyle}>Pavadinimas *</label>
        <input style={inputStyle} required value={form.title} onChange={e => set('title', e.target.value)} autoFocus /></div>
      <div style={formGroup}><label style={labelStyle}>Tipas</label>
        <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
          <option value="darbas">Darbas</option>
          <option value="susitikimas">Susitikimas</option>
          <option value="skambutis">Skambutis</option>
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Statusas</label>
        <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
          {['laukia', 'vykdomas', 'baigtas', 'atidėtas'].map(s => <option key={s} value={s}>{s}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Projektas</label>
        <select style={inputStyle} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Kontaktas</label>
        <select style={inputStyle} value={form.contactId} onChange={e => set('contactId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Terminas</label>
        <input style={inputStyle} type="datetime-local" value={form.deadline} onChange={e => set('deadline', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Pastabos</label>
        <textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

export const Tasks = memo(function Tasks({ tasks, setTasks, projects, contacts, gcalToken }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('visi')
  const [gcalMsg, setGcalMsg] = useState({})
  const toast = useToast()

  const statuses = ['visi', 'laukia', 'vykdomas', 'baigtas', 'atidėtas']
  const filtered = tasks
    .filter(t => filter === 'visi' || t.status === filter)
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
  const getProject = id => projects.find(p => p.id === id)
  const getContact = id => contacts.find(c => c.id === id)

  const save = useCallback(async (form) => {
    if (editing) {
      setTasks(ts => ts.map(t => t.id === editing.id ? { ...t, ...form } : t))
      toast.success('Darbas atnaujintas')
    } else {
      const newTask = { ...form, id: genId(), createdAt: new Date().toISOString() }
      setTasks(ts => [...ts, newTask])
      toast.success('Darbas sukurtas')
      if (gcalToken && form.deadline) {
        try {
          const ev = await gcalCreateEvent(gcalToken, newTask)
          if (ev?.id) {
            setTasks(ts => ts.map(t => t.id === newTask.id ? { ...t, gcalEventId: ev.id } : t))
            toast.info('Pridėta į Google Calendar')
          }
        } catch { /* silently ignore */ }
      }
    }
    setEditing(null)
  }, [editing, setTasks, gcalToken, toast])

  const markDone = useCallback(async (t) => {
    setTasks(ts => ts.map(x => x.id === t.id ? { ...x, status: 'baigtas' } : x))
    toast.success(`„${t.title}" pažymėtas kaip baigtas`)
    if (gcalToken && t.gcalEventId) {
      try {
        await gcalUpdateEvent(gcalToken, t.gcalEventId, { summary: '✅ ' + t.title, colorId: '2' })
      } catch { /* ignore */ }
    }
  }, [setTasks, gcalToken, toast])

  const addToCalendar = useCallback(async (t) => {
    if (!gcalToken) { toast.warning('Pirmiausia prisijunkite prie Google Calendar nustatymuose'); return }
    if (!t.deadline) { toast.warning('Darbas neturi termino'); return }
    setGcalMsg(m => ({ ...m, [t.id]: '⏳' }))
    try {
      const ev = await gcalCreateEvent(gcalToken, t)
      if (ev?.id) {
        setTasks(ts => ts.map(x => x.id === t.id ? { ...x, gcalEventId: ev.id } : x))
        setGcalMsg(m => ({ ...m, [t.id]: '✅' }))
        toast.success('Pridėta į Google Calendar')
      }
    } catch {
      setGcalMsg(m => ({ ...m, [t.id]: '❌' }))
      toast.error('Nepavyko pridėti į Google Calendar')
    }
    setTimeout(() => setGcalMsg(m => ({ ...m, [t.id]: undefined })), 3000)
  }, [gcalToken, setTasks, toast])

  return (
    <div>
      <SectionHeader title="Darbai ir susitarimai">
        <button data-action="add" style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
      </SectionHeader>

      <FilterBar options={statuses} value={filter} onChange={setFilter} />

      {filtered.length === 0 && <EmptyState icon="✅" message="Nėra darbų" />}

      {filtered.map(t => {
        const project = getProject(t.projectId)
        const contact = getContact(t.contactId)
        const overdue = t.deadline && t.status !== 'baigtas' && new Date(t.deadline) < new Date()
        return (
          <article key={t.id} style={{ ...cardStyle, borderLeft: `3px solid ${t.type === 'susitikimas' ? '#8b5cf6' : '#3b82f6'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{t.title}</span>
                  <Badge status={t.type} />
                  <Badge status={t.status} />
                  {t.gcalEventId && <span title="Sinchronizuota su Google Calendar" style={{ fontSize: 11, color: '#4285f4' }}>📅</span>}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                  {project && <span style={{ color: '#6366f1', fontSize: 12 }}>📁 {project.name}</span>}
                  {contact && <span style={{ color: '#94a3b8', fontSize: 12 }}>👤 {contact.name}</span>}
                  {t.deadline && <span style={{ color: overdue ? '#ef4444' : '#64748b', fontSize: 12 }}>{overdue ? '⚠ ' : '🕐 '}{formatDateLT(t.deadline)}</span>}
                </div>
                {t.notes && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{t.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {t.status !== 'baigtas' && (
                  <button style={{ ...btnSecondary, fontSize: 12, padding: '4px 10px', color: '#22c55e' }}
                    onClick={() => markDone(t)} aria-label="Pažymėti kaip baigtą">✓</button>
                )}
                {t.deadline && !t.gcalEventId && gcalToken && (
                  <button style={{ ...btnSecondary, fontSize: 11, padding: '4px 8px', color: '#4285f4' }}
                    onClick={() => addToCalendar(t)} aria-label="Pridėti į Google Calendar">
                    {gcalMsg[t.id] || '📅'}
                  </button>
                )}
                <button style={btnSecondary} onClick={() => { setEditing(t); setShowForm(true) }}>Redaguoti</button>
                <button style={btnDanger} onClick={() => {
                  setTasks(ts => ts.filter(x => x.id !== t.id))
                  toast.success('Darbas ištrintas')
                }}>Ištrinti</button>
              </div>
            </div>
          </article>
        )
      })}

      {showForm && (
        <Modal title={editing ? 'Redaguoti' : 'Naujas darbas / susitarimas'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <TaskForm initial={editing} projects={projects} contacts={contacts} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
})
