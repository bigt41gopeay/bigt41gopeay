import { useState, useCallback, memo } from 'react'
import { genId, formatDateLT } from '../utils/helpers'
import { useToast } from '../contexts/ToastContext'
import {
  Modal, SectionHeader, SearchInput, FilterBar, EmptyState,
  inputStyle, labelStyle, formGroup, btnPrimary, btnSecondary, btnDanger, cardStyle,
} from './ui'

const CATEGORIES = [
  { value: 'general', label: '📝 Bendra', color: '#94a3b8' },
  { value: 'procedure', label: '📋 Procedūra', color: '#3b82f6' },
  { value: 'server', label: '🖥️ Serverio konfigūracija', color: '#8b5cf6' },
  { value: 'wordpress', label: '📝 WordPress', color: '#22c55e' },
  { value: 'client', label: '👤 Kliento info', color: '#f59e0b' },
  { value: 'idea', label: '💡 Idėja', color: '#ec4899' },
  { value: 'checklist', label: '✅ Checklist', color: '#06b6d4' },
]

function NoteForm({ initial, projects, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    title: '', category: 'general', projectId: '', content: '', pinned: false,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); if (form.title.trim()) { onSave(form); onClose() } }}>
      <div style={formGroup}><label style={labelStyle}>Pavadinimas *</label>
        <input style={inputStyle} required value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="pvz. Kaip atnaujinti WordPress..." autoFocus /></div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Kategorija</label>
          <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select></div>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Projektas</label>
          <select style={inputStyle} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
            <option value="">— Joks —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
      </div>
      <div style={formGroup}>
        <label style={labelStyle}>Turinys (palaiko Markdown formatą)</label>
        <textarea
          style={{ ...inputStyle, height: 250, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: '1.6' }}
          value={form.content}
          onChange={e => set('content', e.target.value)}
          placeholder={`# Antraštė\n\nTekstas čia...\n\n## SSH prisijungimas\n\`\`\`\nssh root@161.97.xxx.xxx\n\`\`\`\n\n- [ ] Pirmas žingsnis\n- [ ] Antras žingsnis`}
        />
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} />
          📌 Prisegti viršuje
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

// Simple markdown-like rendering for notes
function renderContent(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Headers
    if (line.startsWith('### ')) return <h4 key={i} style={{ color: '#e2e8f0', margin: '12px 0 4px', fontSize: 14 }}>{line.slice(4)}</h4>
    if (line.startsWith('## ')) return <h3 key={i} style={{ color: '#e2e8f0', margin: '12px 0 4px', fontSize: 15 }}>{line.slice(3)}</h3>
    if (line.startsWith('# ')) return <h2 key={i} style={{ color: '#e2e8f0', margin: '12px 0 4px', fontSize: 16 }}>{line.slice(2)}</h2>
    // Checklist
    if (line.startsWith('- [x] ')) return <div key={i} style={{ color: '#22c55e', fontSize: 13, padding: '1px 0' }}>✅ <s>{line.slice(6)}</s></div>
    if (line.startsWith('- [ ] ')) return <div key={i} style={{ color: '#94a3b8', fontSize: 13, padding: '1px 0' }}>☐ {line.slice(6)}</div>
    // Bullets
    if (line.startsWith('- ')) return <div key={i} style={{ color: '#94a3b8', fontSize: 13, padding: '1px 0', paddingLeft: 12 }}>• {line.slice(2)}</div>
    // Code block (simplified)
    if (line.startsWith('```')) return null
    // Inline code
    const rendered = line.replace(/`([^`]+)`/g, '<code>$1</code>')
    if (rendered !== line) return <div key={i} style={{ color: '#94a3b8', fontSize: 13 }} dangerouslySetInnerHTML={{ __html: rendered.replace(/<code>/g, '<code style="background:#0f0f1a;padding:1px 5px;border-radius:3px;font-family:monospace;color:#6366f1;font-size:12px">') }} />
    // Empty line
    if (!line.trim()) return <div key={i} style={{ height: 8 }} />
    // Normal text
    return <div key={i} style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{line}</div>
  })
}

export const Notes = memo(function Notes({ notes, setNotes, projects }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('visi')
  const toast = useToast()
  const getProject = id => projects.find(p => p.id === id)

  const filtered = notes
    .filter(n => catFilter === 'visi' || n.category === catFilter)
    .filter(n =>
      [n.title, n.content, getProject(n.projectId)?.name]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
    })

  const save = useCallback((form) => {
    if (editing) {
      setNotes(ns => ns.map(n => n.id === editing.id ? { ...n, ...form, updatedAt: new Date().toISOString() } : n))
      toast.success('Užrašas atnaujintas')
    } else {
      setNotes(ns => [...ns, { ...form, id: genId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])
      toast.success('Užrašas sukurtas')
    }
    setEditing(null)
  }, [editing, setNotes, toast])

  const catFilters = ['visi', ...CATEGORIES.map(c => c.value)]
  const catLabels = { visi: 'Visi', ...Object.fromEntries(CATEGORIES.map(c => [c.value, c.label])) }

  return (
    <div>
      <SectionHeader title="Užrašai ir Wiki">
        <button data-action="add" style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Naujas užrašas</button>
      </SectionHeader>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {catFilters.map(f => {
          const cat = CATEGORIES.find(c => c.value === f)
          return (
            <button key={f} onClick={() => setCatFilter(f)} style={{
              ...btnSecondary, padding: '5px 10px', fontSize: 12,
              background: catFilter === f ? (cat?.color || '#6366f1') : '#2e2e3e',
              color: catFilter === f ? '#fff' : '#94a3b8',
            }}>
              {catLabels[f]}
            </button>
          )
        })}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Ieškoti užrašuose..." />

      {filtered.length === 0 && <EmptyState icon="📝" message="Nėra užrašų" />}

      {filtered.map(note => {
        const project = getProject(note.projectId)
        const cat = CATEGORIES.find(c => c.value === note.category) || CATEGORIES[0]
        const isExpanded = expanded[note.id]

        return (
          <article key={note.id} style={{ ...cardStyle, borderLeft: `3px solid ${cat.color}` }}>
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => setExpanded(e => ({ ...e, [note.id]: !e[note.id] }))}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {note.pinned && <span title="Prisegta">📌</span>}
                    <span style={{
                      background: cat.color + '22', color: cat.color,
                      border: `1px solid ${cat.color}44`, borderRadius: 6,
                      padding: '1px 6px', fontSize: 10, fontWeight: 600,
                    }}>{cat.label}</span>
                    <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{note.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                    {project && <span style={{ color: '#6366f1', fontSize: 11 }}>📁 {project.name}</span>}
                    <span style={{ color: '#64748b', fontSize: 11 }}>{formatDateLT(note.updatedAt || note.createdAt)}</span>
                  </div>
                </div>
                <span style={{ color: '#64748b', fontSize: 16, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2e2e3e' }}>
                <div style={{ marginBottom: 12 }}>
                  {renderContent(note.content)}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={{ ...btnSecondary, fontSize: 12, padding: '5px 12px' }}
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(note.content); toast.success('Nukopijuota') }}>
                    📋 Kopijuoti
                  </button>
                  <button style={btnSecondary} onClick={(e) => { e.stopPropagation(); setEditing(note); setShowForm(true) }}>Redaguoti</button>
                  <button style={btnDanger} onClick={(e) => {
                    e.stopPropagation()
                    setNotes(ns => ns.filter(x => x.id !== note.id))
                    toast.success('Užrašas ištrintas')
                  }}>Ištrinti</button>
                </div>
              </div>
            )}
          </article>
        )
      })}

      {showForm && (
        <Modal title={editing ? 'Redaguoti užrašą' : 'Naujas užrašas'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <NoteForm initial={editing} projects={projects} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
})
