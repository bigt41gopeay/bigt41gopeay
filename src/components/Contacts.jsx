import { useState, useCallback, memo } from 'react'
import { genId, isValidEmail, isValidPhone } from '../utils/helpers'
import { exportContactsCSV } from '../utils/export'
import { useToast } from '../contexts/ToastContext'
import { BRAND } from '../utils/constants'
import {
  Modal, Badge, SectionHeader, SearchInput, EmptyState,
  inputStyle, labelStyle, formGroup, btnPrimary, btnSecondary, btnDanger, cardStyle,
} from './ui'

function ContactForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', company: '', email: '', phone: '', notes: '' })
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Vardas privalomas'
    if (!isValidEmail(form.email)) errs.email = 'Neteisingas el. pašto formatas'
    if (!isValidPhone(form.phone)) errs.phone = 'Neteisingas telefono formatas'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  return (
    <form onSubmit={e => { e.preventDefault(); if (validate()) { onSave(form); onClose() } }}>
      <div style={formGroup}>
        <label style={labelStyle}>Vardas Pavardė *</label>
        <input style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : undefined }}
          required value={form.name} onChange={e => set('name', e.target.value)}
          aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-name' : undefined} />
        {errors.name && <span id="err-name" style={{ color: '#ef4444', fontSize: 12 }}>{errors.name}</span>}
      </div>
      <div style={formGroup}><label style={labelStyle}>Įmonė</label>
        <input style={inputStyle} value={form.company} onChange={e => set('company', e.target.value)} /></div>
      <div style={formGroup}>
        <label style={labelStyle}>El. paštas</label>
        <input style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : undefined }}
          type="email" value={form.email} onChange={e => set('email', e.target.value)}
          aria-invalid={!!errors.email} />
        {errors.email && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.email}</span>}
      </div>
      <div style={formGroup}>
        <label style={labelStyle}>Telefonas</label>
        <input style={{ ...inputStyle, borderColor: errors.phone ? '#ef4444' : undefined }}
          value={form.phone} onChange={e => set('phone', e.target.value)}
          aria-invalid={!!errors.phone} />
        {errors.phone && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.phone}</span>}
      </div>
      <div style={formGroup}><label style={labelStyle}>Pastabos</label>
        <textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} className="btn-press" onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary} className="btn-press">Išsaugoti</button>
      </div>
    </form>
  )
}

export const Contacts = memo(function Contacts({ contacts, setContacts }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const toast = useToast()

  const filtered = contacts.filter(c =>
    [c.name, c.company, c.email, c.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const save = useCallback((form) => {
    if (editing) {
      setContacts(cs => cs.map(c => c.id === editing.id ? { ...c, ...form } : c))
      toast.success('Kontaktas atnaujintas')
    } else {
      setContacts(cs => [...cs, { ...form, id: genId(), createdAt: new Date().toISOString() }])
      toast.success('Kontaktas pridėtas')
    }
    setEditing(null)
  }, [editing, setContacts, toast])

  const handleDelete = useCallback((id) => {
    setContacts(cs => cs.filter(x => x.id !== id))
    setConfirmDelete(null)
    toast.success('Kontaktas ištrintas')
  }, [setContacts, toast])

  return (
    <div>
      <SectionHeader title="Kontaktai">
        <button style={{ ...btnSecondary, fontSize: 13, padding: '7px 14px' }}
          className="btn-press"
          onClick={() => { exportContactsCSV(contacts); toast.success('CSV eksportuotas') }}
          title="Eksportuoti visus kontaktus į CSV">
          📥 Eksportuoti CSV
        </button>
        <button data-action="add" style={btnPrimary} className="btn-press" onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
      </SectionHeader>

      <SearchInput value={search} onChange={setSearch} />

      {filtered.length === 0 && <EmptyState icon="👥" message="Nėra kontaktų" />}

      {filtered.map(c => (
        <article key={c.id} style={{ ...cardStyle, borderRadius: 14 }} className="card-interactive" aria-label={`Kontaktas: ${c.name}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, color: BRAND.textPrimary, fontSize: 16 }}>{c.name}</div>
              {c.company && <div style={{ color: BRAND.textSecondary, fontSize: 13 }}>{c.company}</div>}
              <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {c.email && <a href={`mailto:${c.email}`} style={{ color: BRAND.purple, fontSize: 13 }}>{c.email}</a>}
                {c.phone && <a href={`tel:${c.phone}`} style={{ color: '#22c55e', fontSize: 13 }}>{c.phone}</a>}
              </div>
              {c.notes && <div style={{ color: BRAND.textMuted, fontSize: 12, marginTop: 4 }}>{c.notes}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <button style={btnSecondary} className="btn-press" onClick={() => { setEditing(c); setShowForm(true) }}>Redaguoti</button>
              <button style={btnDanger} className="btn-press" onClick={() => setConfirmDelete(c.id)}>Ištrinti</button>
            </div>
          </div>
        </article>
      ))}

      {confirmDelete && (
        <Modal title="Patvirtinti" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: BRAND.textPrimary, marginBottom: 16 }}>Ar tikrai norite ištrinti šį kontaktą?</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} className="btn-press" onClick={() => setConfirmDelete(null)}>Atšaukti</button>
            <button style={{ ...btnPrimary, background: '#ef4444' }} className="btn-press" onClick={() => handleDelete(confirmDelete)}>Ištrinti</button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editing ? 'Redaguoti kontaktą' : 'Naujas kontaktas'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <ContactForm initial={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
})
