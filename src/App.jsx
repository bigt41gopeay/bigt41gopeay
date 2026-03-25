import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'

const STORAGE_KEYS = {
  contacts: 'crm_contacts',
  projects: 'crm_projects',
  tasks: 'crm_tasks',
  communications: 'crm_communications',
  credentials: 'crm_credentials',
  invoices: 'crm_invoices',
  settings: 'crm_settings',
}

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue]
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const STATUS_COLORS = {
  aktyvus: '#22c55e',
  neaktyvus: '#6b7280',
  vykdomas: '#3b82f6',
  baigtas: '#22c55e',
  atidėtas: '#f59e0b',
  atšauktas: '#ef4444',
  laukia: '#f59e0b',
  susitikimas: '#8b5cf6',
  skambutis: '#3b82f6',
  'el. laiškas': '#06b6d4',
  darbas: '#3b82f6',
  juodraštis: '#6b7280',
  išsiųsta: '#3b82f6',
  apmokėta: '#22c55e',
  vėluoja: '#ef4444',
}

function Badge({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280'
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000a',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#1e1e2e', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560,
        border: '1px solid #2e2e3e', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#0f0f1a',
  border: '1px solid #2e2e3e', borderRadius: 8, padding: '8px 12px',
  color: '#e2e8f0', fontSize: 14, outline: 'none',
}
const labelStyle = { color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }
const formGroup = { marginBottom: 16 }
const btnPrimary = {
  background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
}
const btnSecondary = {
  background: '#2e2e3e', color: '#e2e8f0', border: 'none', borderRadius: 8,
  padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
}
const btnDanger = {
  background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444',
  borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
}
const cardStyle = {
  background: '#1e1e2e', border: '1px solid #2e2e3e', borderRadius: 10,
  padding: 16, marginBottom: 12,
}

// ─── CSV EKSPORTAS ────────────────────────────────────────────────────────────

function exportContactsCSV(contacts) {
  const header = ['Vardas', 'Įmonė', 'El. paštas', 'Telefonas']
  const rows = contacts.map(c =>
    [c.name, c.company, c.email, c.phone].map(v => `"${(v || '').replace(/"/g, '""')}"`)
  )
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kontaktai-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── GOOGLE CALENDAR UTILS ────────────────────────────────────────────────────

const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const GCAL_API = 'https://www.googleapis.com/calendar/v3'

function loadGISScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function gcalCreateEvent(token, task) {
  if (!task.deadline || !token) return null
  const start = new Date(task.deadline).toISOString()
  const end = new Date(new Date(task.deadline).getTime() + 60 * 60000).toISOString()
  const res = await fetch(`${GCAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: task.title,
      description: task.notes || '',
      start: { dateTime: start },
      end: { dateTime: end },
    }),
  })
  if (!res.ok) throw new Error('Nepavyko sukurti įvykio')
  return res.json()
}

async function gcalUpdateEvent(token, eventId, updates) {
  if (!token || !eventId) return null
  const res = await fetch(`${GCAL_API}/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Nepavyko atnaujinti įvykio')
  return res.json()
}

async function gcalListEvents(token) {
  if (!token) return { items: [] }
  const now = new Date().toISOString()
  const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const params = new URLSearchParams({ timeMin: now, timeMax: end, singleEvents: 'true', orderBy: 'startTime', maxResults: '10' })
  const res = await fetch(`${GCAL_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Nepavyko gauti įvykių')
  return res.json()
}

// ─── NOTIFICATION BAR ─────────────────────────────────────────────────────────

function NotificationBar({ tasks }) {
  const [dismissed, setDismissed] = useState(false)

  const now = new Date()
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const urgent = tasks.filter(t =>
    t.status !== 'baigtas' && t.deadline && new Date(t.deadline) <= in3days
  )
  const overdue = urgent.filter(t => new Date(t.deadline) < now)

  useEffect(() => {
    if (urgent.length === 0) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [urgent.length])

  useEffect(() => {
    const checkMorning = () => {
      const n = new Date()
      if (n.getHours() === 9 && n.getMinutes() === 0) {
        const todayTasks = tasks.filter(t => {
          if (t.status === 'baigtas' || !t.deadline) return false
          return new Date(t.deadline).toDateString() === n.toDateString()
        })
        if (todayTasks.length > 0 && Notification.permission === 'granted') {
          new Notification('ManoKRM – Dienos darbai', {
            body: `Šiandien ${todayTasks.length} darbai: ${todayTasks.map(t => t.title).join(', ')}`,
            icon: '/favicon.svg',
          })
        }
      }
    }
    const interval = setInterval(checkMorning, 60000)
    return () => clearInterval(interval)
  }, [tasks])

  if (urgent.length === 0 || dismissed) return null

  const isRed = overdue.length > 0
  return (
    <div style={{
      background: isRed ? '#ef444422' : '#f59e0b22',
      borderBottom: `1px solid ${isRed ? '#ef444444' : '#f59e0b44'}`,
      padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
      color: isRed ? '#ef4444' : '#f59e0b',
    }}>
      <span>{isRed ? '🚨' : '⏰'}</span>
      <span style={{ flex: 1 }}>
        {overdue.length > 0 && <><b>{overdue.length}</b> vėluojantys darbai</>}
        {overdue.length > 0 && urgent.length - overdue.length > 0 && ' · '}
        {urgent.length - overdue.length > 0 && <><b>{urgent.length - overdue.length}</b> darbai baigiasi per 3 dienas</>}
      </span>
      <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  )
}

// ─── CONTACTS ─────────────────────────────────────────────────────────────────

function ContactForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', company: '', email: '', phone: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); onClose() }}>
      <div style={formGroup}><label style={labelStyle}>Vardas Pavardė *</label>
        <input style={inputStyle} required value={form.name} onChange={e => set('name', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Įmonė</label>
        <input style={inputStyle} value={form.company} onChange={e => set('company', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>El. paštas</label>
        <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Telefonas</label>
        <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Pastabos</label>
        <textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

function Contacts({ contacts, setContacts }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = contacts.filter(c =>
    [c.name, c.company, c.email, c.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const save = (form) => {
    if (editing) {
      setContacts(cs => cs.map(c => c.id === editing.id ? { ...c, ...form } : c))
    } else {
      setContacts(cs => [...cs, { ...form, id: genId(), createdAt: new Date().toISOString() }])
    }
    setEditing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, color: '#e2e8f0' }}>Kontaktai</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...btnSecondary, fontSize: 13, padding: '7px 14px' }}
            onClick={() => exportContactsCSV(contacts)}
            title="Eksportuoti visus kontaktus į CSV">
            📥 Eksportuoti CSV
          </button>
          <button style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
        </div>
      </div>
      <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="Ieškoti..." value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>Nėra kontaktų</p>}
      {filtered.map(c => (
        <div key={c.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16 }}>{c.name}</div>
              {c.company && <div style={{ color: '#94a3b8', fontSize: 13 }}>{c.company}</div>}
              <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {c.email && <a href={`mailto:${c.email}`} style={{ color: '#6366f1', fontSize: 13 }}>{c.email}</a>}
                {c.phone && <a href={`tel:${c.phone}`} style={{ color: '#22c55e', fontSize: 13 }}>{c.phone}</a>}
              </div>
              {c.notes && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{c.notes}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <button style={btnSecondary} onClick={() => { setEditing(c); setShowForm(true) }}>Redaguoti</button>
              <button style={btnDanger} onClick={() => { if (confirm('Ištrinti kontaktą?')) setContacts(cs => cs.filter(x => x.id !== c.id)) }}>Ištrinti</button>
            </div>
          </div>
        </div>
      ))}
      {showForm && (
        <Modal title={editing ? 'Redaguoti kontaktą' : 'Naujas kontaktas'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <ContactForm initial={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

const VAT_RATE = 0.21

function lt(str) {
  // Transliterate Lithuanian chars for PDF (jsPDF standard fonts don't support them)
  return (str || '')
    .replace(/[ą]/g, 'a').replace(/[č]/g, 'c').replace(/[ę]/g, 'e').replace(/[ė]/g, 'e')
    .replace(/[į]/g, 'i').replace(/[š]/g, 's').replace(/[ų]/g, 'u').replace(/[ū]/g, 'u').replace(/[ž]/g, 'z')
    .replace(/[Ą]/g, 'A').replace(/[Č]/g, 'C').replace(/[Ę]/g, 'E').replace(/[Ė]/g, 'E')
    .replace(/[Į]/g, 'I').replace(/[Š]/g, 'S').replace(/[Ų]/g, 'U').replace(/[Ū]/g, 'U').replace(/[Ž]/g, 'Z')
}

function generateInvoicePDF(invoice, contact) {
  const doc = new jsPDF()
  const w = doc.internal.pageSize.getWidth()

  // Header bar
  doc.setFillColor(99, 102, 241)
  doc.rect(0, 0, w, 42, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('SASKAITA FAKTURA', 14, 18)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nr. ${lt(invoice.number)}`, 14, 30)
  doc.text(`Data: ${invoice.date}`, w - 14, 30, { align: 'right' })
  doc.text(`Statusas: ${lt(invoice.status)}`, w - 14, 38, { align: 'right' })

  // Client block
  let y = 58
  doc.setTextColor(50, 50, 70)
  doc.setFillColor(240, 240, 250)
  doc.rect(14, y - 8, w - 28, contact ? 38 : 16, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('KLIENTAS:', 18, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  if (contact) {
    doc.text(lt(contact.name), 18, y + 8)
    if (contact.company) { doc.text(lt(contact.company), 18, y + 15); y += 7 }
    if (contact.email) { doc.text(contact.email, 18, y + 15); y += 7 }
    if (contact.phone) { doc.text(contact.phone, 18, y + 15); y += 7 }
  }
  y += 28

  // Table header
  y += 6
  doc.setFillColor(99, 102, 241)
  doc.rect(14, y - 6, w - 28, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('Paslauga', 18, y)
  doc.text('Kiekis', w - 85, y, { align: 'right' })
  doc.text('Kaina EUR', w - 50, y, { align: 'right' })
  doc.text('Suma EUR', w - 14, y, { align: 'right' })

  // Table rows
  doc.setFont('helvetica', 'normal')
  invoice.items.forEach((item, i) => {
    y += 10
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 255)
      doc.rect(14, y - 6, w - 28, 10, 'F')
    }
    doc.setTextColor(50, 50, 70)
    const rowTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
    doc.text(lt(item.name) || '—', 18, y)
    doc.text(String(item.qty), w - 85, y, { align: 'right' })
    doc.text(parseFloat(item.price || 0).toFixed(2), w - 50, y, { align: 'right' })
    doc.text(rowTotal.toFixed(2), w - 14, y, { align: 'right' })
  })

  // Totals
  y += 16
  doc.setDrawColor(200, 200, 230)
  doc.line(w - 100, y - 8, w - 14, y - 8)
  doc.setTextColor(80, 80, 100)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Suma be PVM:', w - 55, y, { align: 'right' })
  doc.text(`${invoice.subtotal.toFixed(2)} EUR`, w - 14, y, { align: 'right' })
  y += 8
  doc.text('PVM 21%:', w - 55, y, { align: 'right' })
  doc.text(`${invoice.vat.toFixed(2)} EUR`, w - 14, y, { align: 'right' })
  y += 10
  doc.setFillColor(99, 102, 241)
  doc.rect(w - 100, y - 7, 86, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('IS VISO:', w - 55, y, { align: 'right' })
  doc.text(`${invoice.total.toFixed(2)} EUR`, w - 14, y, { align: 'right' })

  // Notes
  if (invoice.notes) {
    y += 20
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 140)
    doc.text('Pastabos: ' + lt(invoice.notes), 14, y, { maxWidth: w - 28 })
  }

  // Footer
  const ph = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(160, 160, 180)
  doc.line(14, ph - 18, w - 14, ph - 18)
  doc.text('Sugeneruota ManoKRM sistema · mano.oktoja.lt', w / 2, ph - 10, { align: 'center' })

  doc.save(`saskaita-${invoice.number}.pdf`)
}

function InvoiceForm({ initial, contacts, onSave, onClose }) {
  const defaultItem = { name: '', qty: 1, price: '' }
  const [form, setForm] = useState(initial || {
    number: `SF-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    date: new Date().toISOString().slice(0, 10),
    contactId: '',
    status: 'juodraštis',
    items: [{ ...defaultItem }],
    notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (i, k, v) => setForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items }
  })
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...defaultItem }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const subtotal = form.items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0)
  const vat = subtotal * VAT_RATE
  const total = subtotal + vat

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, subtotal, vat, total }); onClose() }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Numeris *</label>
          <input style={inputStyle} required value={form.number} onChange={e => set('number', e.target.value)} /></div>
        <div style={{ ...formGroup, flex: 1 }}><label style={labelStyle}>Data</label>
          <input style={inputStyle} type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
      </div>
      <div style={formGroup}><label style={labelStyle}>Klientas</label>
        <select style={inputStyle} value={form.contactId} onChange={e => set('contactId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>Statusas</label>
        <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
          {['juodraštis', 'išsiųsta', 'apmokėta', 'vėluoja'].map(s => <option key={s}>{s}</option>)}
        </select></div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={labelStyle}>Paslaugos</label>
          <button type="button" style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }} onClick={addItem}>+ Eilutė</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 24px', gap: 6, marginBottom: 4 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Pavadinimas</span>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Kiekis</span>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Kaina €</span>
          <span />
        </div>
        {form.items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 24px', gap: 6, marginBottom: 6 }}>
            <input style={inputStyle} placeholder="Paslaugos pavadinimas" value={it.name}
              onChange={e => setItem(i, 'name', e.target.value)} />
            <input style={inputStyle} type="number" min="0.01" step="0.01" value={it.qty}
              onChange={e => setItem(i, 'qty', e.target.value)} />
            <input style={inputStyle} type="number" min="0" step="0.01" value={it.price}
              onChange={e => setItem(i, 'price', e.target.value)} />
            <button type="button" onClick={() => removeItem(i)}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
          </div>
        ))}
        <div style={{ textAlign: 'right', marginTop: 10, fontSize: 13 }}>
          <div style={{ color: '#94a3b8' }}>Suma be PVM: <b style={{ color: '#e2e8f0' }}>{subtotal.toFixed(2)} €</b></div>
          <div style={{ color: '#94a3b8' }}>PVM 21%: <b style={{ color: '#e2e8f0' }}>{vat.toFixed(2)} €</b></div>
          <div style={{ color: '#22c55e', fontSize: 16, fontWeight: 700, marginTop: 4 }}>Iš viso: {total.toFixed(2)} €</div>
        </div>
      </div>

      <div style={formGroup}><label style={labelStyle}>Pastabos</label>
        <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

function Invoices({ invoices, setInvoices, contacts }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('visi')

  const statuses = ['visi', 'juodraštis', 'išsiųsta', 'apmokėta', 'vėluoja']
  const filtered = invoices
    .filter(inv => filter === 'visi' || inv.status === filter)
    .sort((a, b) => b.date.localeCompare(a.date))
  const getContact = id => contacts.find(c => c.id === id)

  const save = (form) => {
    if (editing) {
      setInvoices(is => is.map(i => i.id === editing.id ? { ...i, ...form } : i))
    } else {
      setInvoices(is => [...is, { ...form, id: genId(), createdAt: new Date().toISOString() }])
    }
    setEditing(null)
  }

  const totalUnpaid = invoices
    .filter(i => i.status === 'išsiųsta' || i.status === 'vėluoja')
    .reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid = invoices
    .filter(i => i.status === 'apmokėta')
    .reduce((s, i) => s + (i.total || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, color: '#e2e8f0' }}>Sąskaitos</h2>
        <button style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Nauja sąskaita</button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Apmokėta: </span><b style={{ color: '#22c55e' }}>{totalPaid.toFixed(2)} €</b>
        </div>
        {totalUnpaid > 0 && (
          <div style={{ background: '#f59e0b22', border: '1px solid #f59e0b44', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>Laukia apmokėjimo: </span><b style={{ color: '#f59e0b' }}>{totalUnpaid.toFixed(2)} €</b>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            ...btnSecondary, padding: '5px 12px', fontSize: 13,
            background: filter === s ? '#6366f1' : '#2e2e3e',
            color: filter === s ? '#fff' : '#94a3b8',
          }}>{s}</button>
        ))}
      </div>
      {filtered.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>Nėra sąskaitų</p>}
      {filtered.map(inv => {
        const contact = getContact(inv.contactId)
        return (
          <div key={inv.id} style={{ ...cardStyle, borderLeft: `3px solid ${STATUS_COLORS[inv.status] || '#6b7280'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16 }}>📄 {inv.number}</div>
                {contact && <div style={{ color: '#94a3b8', fontSize: 13 }}>{contact.name}{contact.company ? ` · ${contact.company}` : ''}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={inv.status} />
                  <span style={{ color: '#64748b', fontSize: 12 }}>{inv.date}</span>
                  <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>{(inv.total || 0).toFixed(2)} €</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Be PVM: {(inv.subtotal || 0).toFixed(2)} € · PVM: {(inv.vat || 0).toFixed(2)} €
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {inv.status !== 'apmokėta' && (
                  <button style={{ ...btnSecondary, fontSize: 12, padding: '6px 12px', color: '#22c55e' }}
                    onClick={() => setInvoices(is => is.map(x => x.id === inv.id ? { ...x, status: 'apmokėta' } : x))}>
                    ✓ Apmokėta
                  </button>
                )}
                <button style={{ ...btnSecondary, fontSize: 12, padding: '6px 12px' }}
                  onClick={() => generateInvoicePDF(inv, contact)}>📥 PDF</button>
                <button style={btnSecondary} onClick={() => { setEditing(inv); setShowForm(true) }}>Redaguoti</button>
                <button style={btnDanger} onClick={() => { if (confirm('Ištrinti sąskaitą?')) setInvoices(is => is.filter(x => x.id !== inv.id)) }}>Ištrinti</button>
              </div>
            </div>
          </div>
        )
      })}
      {showForm && (
        <Modal title={editing ? 'Redaguoti sąskaitą' : 'Nauja sąskaita'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <InvoiceForm initial={editing} contacts={contacts} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

function ProjectForm({ initial, contacts, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', contactId: '', status: 'vykdomas', description: '', deadline: '', budget: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); onClose() }}>
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
        <input style={inputStyle} type="number" value={form.budget} onChange={e => set('budget', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Aprašymas</label>
        <textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

function Projects({ projects, setProjects, contacts }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('visi')

  const statuses = ['visi', 'vykdomas', 'laukia', 'baigtas', 'atidėtas', 'atšauktas']
  const filtered = projects.filter(p => filter === 'visi' || p.status === filter)
  const getContact = id => contacts.find(c => c.id === id)

  const save = (form) => {
    if (editing) {
      setProjects(ps => ps.map(p => p.id === editing.id ? { ...p, ...form } : p))
    } else {
      setProjects(ps => [...ps, { ...form, id: genId(), createdAt: new Date().toISOString() }])
    }
    setEditing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, color: '#e2e8f0' }}>Projektai</h2>
        <button style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            ...btnSecondary, padding: '5px 12px', fontSize: 13,
            background: filter === s ? '#6366f1' : '#2e2e3e',
            color: filter === s ? '#fff' : '#94a3b8',
          }}>{s}</button>
        ))}
      </div>
      {filtered.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>Nėra projektų</p>}
      {filtered.map(p => {
        const contact = getContact(p.contactId)
        const overdue = p.deadline && p.status !== 'baigtas' && new Date(p.deadline) < new Date()
        return (
          <div key={p.id} style={{ ...cardStyle, borderLeft: `3px solid ${STATUS_COLORS[p.status] || '#6b7280'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16 }}>{p.name}</div>
                {contact && <div style={{ color: '#94a3b8', fontSize: 13 }}>{contact.name}{contact.company ? ` · ${contact.company}` : ''}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge status={p.status} />
                  {p.deadline && <span style={{ color: overdue ? '#ef4444' : '#64748b', fontSize: 12 }}>{overdue ? '⚠ ' : ''}Terminas: {p.deadline}</span>}
                  {p.budget && <span style={{ color: '#22c55e', fontSize: 12 }}>€{p.budget}</span>}
                </div>
                {p.description && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{p.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <button style={btnSecondary} onClick={() => { setEditing(p); setShowForm(true) }}>Redaguoti</button>
                <button style={btnDanger} onClick={() => { if (confirm('Ištrinti projektą?')) setProjects(ps => ps.filter(x => x.id !== p.id)) }}>Ištrinti</button>
              </div>
            </div>
          </div>
        )
      })}
      {showForm && (
        <Modal title={editing ? 'Redaguoti projektą' : 'Naujas projektas'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <ProjectForm initial={editing} contacts={contacts} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
}

// ─── TASKS ────────────────────────────────────────────────────────────────────

function TaskForm({ initial, projects, contacts, onSave, onClose }) {
  const [form, setForm] = useState(initial || { title: '', projectId: '', contactId: '', type: 'darbas', status: 'laukia', deadline: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); onClose() }}>
      <div style={formGroup}><label style={labelStyle}>Pavadinimas *</label>
        <input style={inputStyle} required value={form.title} onChange={e => set('title', e.target.value)} /></div>
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

function Tasks({ tasks, setTasks, projects, contacts, gcalToken }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('visi')
  const [gcalMsg, setGcalMsg] = useState({})

  const statuses = ['visi', 'laukia', 'vykdomas', 'baigtas', 'atidėtas']
  const filtered = tasks
    .filter(t => filter === 'visi' || t.status === filter)
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
  const getProject = id => projects.find(p => p.id === id)
  const getContact = id => contacts.find(c => c.id === id)

  const save = async (form) => {
    if (editing) {
      setTasks(ts => ts.map(t => t.id === editing.id ? { ...t, ...form } : t))
    } else {
      const newTask = { ...form, id: genId(), createdAt: new Date().toISOString() }
      setTasks(ts => [...ts, newTask])
      // Auto-add to Google Calendar if connected and deadline set
      if (gcalToken && form.deadline) {
        try {
          const ev = await gcalCreateEvent(gcalToken, newTask)
          if (ev?.id) {
            setTasks(ts => ts.map(t => t.id === newTask.id ? { ...t, gcalEventId: ev.id } : t))
          }
        } catch {
          // silently ignore gcal errors
        }
      }
    }
    setEditing(null)
  }

  const markDone = async (t) => {
    setTasks(ts => ts.map(x => x.id === t.id ? { ...x, status: 'baigtas' } : x))
    if (gcalToken && t.gcalEventId) {
      try {
        await gcalUpdateEvent(gcalToken, t.gcalEventId, { summary: '✅ ' + t.title, colorId: '2' })
      } catch { /* ignore */ }
    }
  }

  const addToCalendar = async (t) => {
    if (!gcalToken) { alert('Pirmiausia prisijunkite prie Google Calendar nustatymuose'); return }
    if (!t.deadline) { alert('Darbas neturi termino'); return }
    setGcalMsg(m => ({ ...m, [t.id]: '⏳' }))
    try {
      const ev = await gcalCreateEvent(gcalToken, t)
      if (ev?.id) {
        setTasks(ts => ts.map(x => x.id === t.id ? { ...x, gcalEventId: ev.id } : x))
        setGcalMsg(m => ({ ...m, [t.id]: '✅' }))
      }
    } catch (e) {
      setGcalMsg(m => ({ ...m, [t.id]: '❌' }))
    }
    setTimeout(() => setGcalMsg(m => ({ ...m, [t.id]: undefined })), 3000)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, color: '#e2e8f0' }}>Darbai ir susitarimai</h2>
        <button style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            ...btnSecondary, padding: '5px 12px', fontSize: 13,
            background: filter === s ? '#6366f1' : '#2e2e3e',
            color: filter === s ? '#fff' : '#94a3b8',
          }}>{s}</button>
        ))}
      </div>
      {filtered.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>Nėra darbų</p>}
      {filtered.map(t => {
        const project = getProject(t.projectId)
        const contact = getContact(t.contactId)
        const overdue = t.deadline && t.status !== 'baigtas' && new Date(t.deadline) < new Date()
        return (
          <div key={t.id} style={{ ...cardStyle, borderLeft: `3px solid ${t.type === 'susitikimas' ? '#8b5cf6' : '#3b82f6'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{t.title}</span>
                  <Badge status={t.type} />
                  <Badge status={t.status} />
                  {t.gcalEventId && <span title="Sinchronizuota su Google Calendar" style={{ fontSize: 11, color: '#4285f4' }}>📅</span>}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                  {project && <span style={{ color: '#6366f1', fontSize: 12 }}>📁 {project.name}</span>}
                  {contact && <span style={{ color: '#94a3b8', fontSize: 12 }}>👤 {contact.name}</span>}
                  {t.deadline && <span style={{ color: overdue ? '#ef4444' : '#64748b', fontSize: 12 }}>{overdue ? '⚠ ' : '🕐 '}{new Date(t.deadline).toLocaleString('lt-LT')}</span>}
                </div>
                {t.notes && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{t.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {t.status !== 'baigtas' && (
                  <button style={{ ...btnSecondary, fontSize: 12, padding: '4px 10px', color: '#22c55e' }}
                    onClick={() => markDone(t)}>✓</button>
                )}
                {t.deadline && !t.gcalEventId && gcalToken && (
                  <button style={{ ...btnSecondary, fontSize: 11, padding: '4px 8px', color: '#4285f4' }}
                    onClick={() => addToCalendar(t)}>
                    {gcalMsg[t.id] || '📅'}
                  </button>
                )}
                <button style={btnSecondary} onClick={() => { setEditing(t); setShowForm(true) }}>Redaguoti</button>
                <button style={btnDanger} onClick={() => { if (confirm('Ištrinti?')) setTasks(ts => ts.filter(x => x.id !== t.id)) }}>Ištrinti</button>
              </div>
            </div>
          </div>
        )
      })}
      {showForm && (
        <Modal title={editing ? 'Redaguoti' : 'Naujas darbas / susitarimas'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <TaskForm initial={editing} projects={projects} contacts={contacts} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
}

// ─── COMMUNICATIONS ───────────────────────────────────────────────────────────

function CommForm({ initial, projects, contacts, onSave, onClose }) {
  const [form, setForm] = useState(initial || { type: 'el. laiškas', contactId: '', projectId: '', date: new Date().toISOString().slice(0, 16), subject: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); onClose() }}>
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

function Communications({ communications, setCommunications, projects, contacts }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [typeFilter, setTypeFilter] = useState('visi')

  const types = ['visi', 'el. laiškas', 'skambutis', 'susitikimas']
  const filtered = [...communications]
    .filter(c => typeFilter === 'visi' || c.type === typeFilter)
    .sort((a, b) => b.date.localeCompare(a.date))
  const getContact = id => contacts.find(c => c.id === id)
  const getProject = id => projects.find(p => p.id === id)

  const save = (form) => {
    if (editing) {
      setCommunications(cs => cs.map(c => c.id === editing.id ? { ...c, ...form } : c))
    } else {
      setCommunications(cs => [...cs, { ...form, id: genId() }])
    }
    setEditing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, color: '#e2e8f0' }}>Komunikacijos istorija</h2>
        <button style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {types.map(s => (
          <button key={s} onClick={() => setTypeFilter(s)} style={{
            ...btnSecondary, padding: '5px 12px', fontSize: 13,
            background: typeFilter === s ? '#6366f1' : '#2e2e3e',
            color: typeFilter === s ? '#fff' : '#94a3b8',
          }}>{s}</button>
        ))}
      </div>
      {filtered.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>Nėra įrašų</p>}
      {filtered.map(c => {
        const contact = getContact(c.contactId)
        const project = getProject(c.projectId)
        return (
          <div key={c.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={c.type} />
                  {contact && <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{contact.name}</span>}
                  {c.subject && <span style={{ color: '#94a3b8', fontSize: 13 }}>— {c.subject}</span>}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                  {project && <span style={{ color: '#6366f1', fontSize: 12 }}>📁 {project.name}</span>}
                  <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(c.date).toLocaleString('lt-LT')}</span>
                </div>
                {c.notes && <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>{c.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <button style={btnSecondary} onClick={() => { setEditing(c); setShowForm(true) }}>Redaguoti</button>
                <button style={btnDanger} onClick={() => { if (confirm('Ištrinti?')) setCommunications(cs => cs.filter(x => x.id !== c.id)) }}>Ištrinti</button>
              </div>
            </div>
          </div>
        )
      })}
      {showForm && (
        <Modal title={editing ? 'Redaguoti' : 'Nauja komunikacija'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <CommForm initial={editing} projects={projects} contacts={contacts} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
}

// ─── CREDENTIALS ──────────────────────────────────────────────────────────────

function CredForm({ initial, projects, onSave, onClose }) {
  const [form, setForm] = useState(initial || { projectId: '', label: '', url: '', username: '', password: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); onClose() }}>
      <div style={formGroup}><label style={labelStyle}>Pavadinimas *</label>
        <input style={inputStyle} required value={form.label} onChange={e => set('label', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Projektas</label>
        <select style={inputStyle} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
          <option value="">— Pasirinkti —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></div>
      <div style={formGroup}><label style={labelStyle}>URL</label>
        <input style={inputStyle} value={form.url} onChange={e => set('url', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Vartotojas</label>
        <input style={inputStyle} value={form.username} onChange={e => set('username', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Slaptažodis</label>
        <input style={inputStyle} type="password" value={form.password} onChange={e => set('password', e.target.value)} /></div>
      <div style={formGroup}><label style={labelStyle}>Pastabos</label>
        <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Atšaukti</button>
        <button type="submit" style={btnPrimary}>Išsaugoti</button>
      </div>
    </form>
  )
}

function Credentials({ credentials, setCredentials, projects }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [revealed, setRevealed] = useState({})
  const [search, setSearch] = useState('')
  const getProject = id => projects.find(p => p.id === id)

  const filtered = credentials.filter(c =>
    [c.label, c.url, c.username, getProject(c.projectId)?.name].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const save = (form) => {
    if (editing) {
      setCredentials(cs => cs.map(c => c.id === editing.id ? { ...c, ...form } : c))
    } else {
      setCredentials(cs => [...cs, { ...form, id: genId() }])
    }
    setEditing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, color: '#e2e8f0' }}>Prisijungimai</h2>
        <button style={btnPrimary} onClick={() => { setEditing(null); setShowForm(true) }}>+ Pridėti</button>
      </div>
      <p style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>⚠ Duomenys saugomi naršyklės localStorage. Nenaudokite jautrių slaptažodžių.</p>
      <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="Ieškoti..." value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>Nėra prisijungimų</p>}
      {filtered.map(c => {
        const project = getProject(c.projectId)
        return (
          <div key={c.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#e2e8f0' }}>🔑 {c.label}</div>
                {project && <div style={{ color: '#6366f1', fontSize: 12 }}>📁 {project.name}</div>}
                {c.url && (
                  <div style={{ marginTop: 4 }}>
                    <a href={c.url} target="_blank" rel="noreferrer" style={{ color: '#06b6d4', fontSize: 13, wordBreak: 'break-all' }}>{c.url}</a>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {c.username && <span style={{ color: '#94a3b8', fontSize: 13 }}>👤 {c.username}</span>}
                  {c.password && (
                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'monospace' }}>
                        {revealed[c.id] ? c.password : '••••••••'}
                      </span>
                      <button style={{ ...btnSecondary, padding: '2px 8px', fontSize: 11 }}
                        onClick={() => setRevealed(r => ({ ...r, [c.id]: !r[c.id] }))}>
                        {revealed[c.id] ? 'Slėpti' : 'Rodyti'}
                      </button>
                      <button style={{ ...btnSecondary, padding: '2px 8px', fontSize: 11 }}
                        onClick={() => navigator.clipboard.writeText(c.password).then(() => alert('Nukopijuota!'))}>
                        Kopijuoti
                      </button>
                    </span>
                  )}
                </div>
                {c.notes && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{c.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <button style={btnSecondary} onClick={() => { setEditing(c); setShowForm(true) }}>Redaguoti</button>
                <button style={btnDanger} onClick={() => { if (confirm('Ištrinti?')) setCredentials(cs => cs.filter(x => x.id !== c.id)) }}>Ištrinti</button>
              </div>
            </div>
          </div>
        )
      })}
      {showForm && (
        <Modal title={editing ? 'Redaguoti prisijungimą' : 'Naujas prisijungimas'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <CredForm initial={editing} projects={projects} onSave={save} onClose={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard({ contacts, projects, tasks, communications, gcalToken }) {
  const [gcalEvents, setGcalEvents] = useState([])
  const [gcalLoading, setGcalLoading] = useState(false)

  useEffect(() => {
    if (!gcalToken) return
    setGcalLoading(true)
    gcalListEvents(gcalToken)
      .then(data => setGcalEvents(data.items || []))
      .catch(() => {})
      .finally(() => setGcalLoading(false))
  }, [gcalToken])

  const now = new Date()
  const activeProjects = projects.filter(p => p.status === 'vykdomas').length
  const pendingTasks = tasks.filter(t => t.status !== 'baigtas').length
  const overdueTasks = tasks.filter(t => t.deadline && t.status !== 'baigtas' && new Date(t.deadline) < now)
  const upcomingTasks = tasks
    .filter(t => t.deadline && t.status !== 'baigtas' && new Date(t.deadline) >= now)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5)
  const recentComms = [...communications].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const getContact = id => contacts.find(c => c.id === id)
  const getProject = id => projects.find(p => p.id === id)

  const statCard = (label, value, color = '#6366f1') => (
    <div style={{ background: '#1e1e2e', border: `1px solid ${color}44`, borderRadius: 10, padding: 16, flex: 1, minWidth: 120, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  )

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', marginBottom: 20 }}>Apžvalga</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {statCard('Kontaktai', contacts.length, '#6366f1')}
        {statCard('Aktyvūs projektai', activeProjects, '#3b82f6')}
        {statCard('Laukiantys darbai', pendingTasks, '#f59e0b')}
        {statCard('Vėluojantys', overdueTasks.length, '#ef4444')}
      </div>

      {overdueTasks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#ef4444', marginBottom: 10 }}>⚠ Vėluojantys darbai</h3>
          {overdueTasks.map(t => (
            <div key={t.id} style={{ ...cardStyle, borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{t.title}</div>
              <div style={{ color: '#ef4444', fontSize: 12 }}>{new Date(t.deadline).toLocaleString('lt-LT')}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ color: '#94a3b8', marginBottom: 10 }}>Artimiausi darbai</h3>
          {upcomingTasks.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>Nėra artimų darbų</p>}
          {upcomingTasks.map(t => {
            const project = getProject(t.projectId)
            return (
              <div key={t.id} style={{ ...cardStyle, padding: 12 }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{t.title}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  {project && <span style={{ color: '#6366f1', fontSize: 11 }}>📁 {project.name}</span>}
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{new Date(t.deadline).toLocaleString('lt-LT')}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h3 style={{ color: '#94a3b8', marginBottom: 10 }}>Paskutinės komunikacijos</h3>
          {recentComms.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>Nėra komunikacijų</p>}
          {recentComms.map(c => {
            const contact = getContact(c.contactId)
            const project = getProject(c.projectId)
            return (
              <div key={c.id} style={{ ...cardStyle, padding: 12 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={c.type} />
                  <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{contact?.name}</span>
                </div>
                {c.subject && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{c.subject}</div>}
                {project && <div style={{ color: '#6366f1', fontSize: 11 }}>📁 {project.name}</div>}
                <div style={{ color: '#64748b', fontSize: 11 }}>{new Date(c.date).toLocaleString('lt-LT')}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Google Calendar events */}
      {gcalToken && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: '#94a3b8', marginBottom: 10 }}>📅 Google Calendar – artimiausi įvykiai</h3>
          {gcalLoading && <p style={{ color: '#64748b', fontSize: 13 }}>Kraunama...</p>}
          {!gcalLoading && gcalEvents.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>Nėra artimų įvykių</p>}
          {gcalEvents.map(ev => (
            <div key={ev.id} style={{ ...cardStyle, padding: 12, borderLeft: '3px solid #4285f4' }}>
              <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{ev.summary}</div>
              <div style={{ color: '#4285f4', fontSize: 11, marginTop: 2 }}>
                {ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleString('lt-LT') : ev.start?.date}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

function Settings({ settings, setSettings, gcalToken, setGcalToken, tasks, setTasks }) {
  const [clientId, setClientId] = useState(settings.gcalClientId || '')
  const [status, setStatus] = useState('')
  const [gcalEvents, setGcalEvents] = useState([])

  const connect = async () => {
    if (!clientId.trim()) { setStatus('❌ Įveskite Client ID'); return }
    setStatus('⏳ Kraunama Google biblioteka...')
    try {
      await loadGISScript()
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: GCAL_SCOPE,
        callback: async (resp) => {
          if (resp.error) { setStatus('❌ Klaida: ' + resp.error); return }
          sessionStorage.setItem('gcal_token', resp.access_token)
          setGcalToken(resp.access_token)
          setSettings(s => ({ ...s, gcalClientId: clientId.trim() }))
          try {
            const data = await gcalListEvents(resp.access_token)
            setGcalEvents(data.items || [])
            setStatus(`✅ Prisijungta! Rasta ${data.items?.length || 0} artimų įvykių`)
          } catch {
            setStatus('✅ Prisijungta!')
          }
        },
      })
      tokenClient.requestAccessToken()
    } catch (e) {
      setStatus('❌ Klaida: ' + e.message)
    }
  }

  const disconnect = () => {
    sessionStorage.removeItem('gcal_token')
    setGcalToken('')
    setGcalEvents([])
    setStatus('Atsijungta nuo Google Calendar')
  }

  const syncEvents = async () => {
    if (!gcalToken) { setStatus('❌ Pirmiausia prisijunkite'); return }
    setStatus('⏳ Sinchronizuojama...')
    try {
      const data = await gcalListEvents(gcalToken)
      setGcalEvents(data.items || [])
      setStatus(`✅ Sinchronizuota: ${data.items?.length || 0} įvykių`)
    } catch (e) {
      setStatus('❌ Klaida: ' + e.message)
    }
  }

  const importEvent = (ev) => {
    const start = ev.start?.dateTime || ev.start?.date
    const newTask = {
      id: genId(),
      title: ev.summary || 'Google Calendar įvykis',
      type: 'susitikimas',
      status: 'laukia',
      deadline: start ? new Date(start).toISOString().slice(0, 16) : '',
      notes: ev.description || '',
      projectId: '',
      contactId: '',
      gcalEventId: ev.id,
      createdAt: new Date().toISOString(),
    }
    setTasks(ts => [...ts, newTask])
    setStatus(`✅ Importuota: "${newTask.title}"`)
  }

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', marginBottom: 20 }}>Nustatymai</h2>

      {/* Google Calendar */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <h3 style={{ color: '#e2e8f0', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📅</span> Google Calendar integracija
        </h3>

        {!gcalToken ? (
          <>
            <div style={formGroup}>
              <label style={labelStyle}>Google OAuth2 Client ID</label>
              <input style={inputStyle} placeholder="000000000000-xxxx.apps.googleusercontent.com"
                value={clientId} onChange={e => setClientId(e.target.value)} />
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                Kaip gauti — žr. instrukciją žemiau arba failą INSTRUKCIJA.md
              </div>
            </div>
            <button style={btnPrimary} onClick={connect}>🔗 Prisijungti prie Google Calendar</button>
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ color: '#22c55e', fontSize: 14 }}>✅ Google Calendar prisijungta</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>· Client ID: {settings.gcalClientId?.slice(0, 20)}...</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <button style={btnPrimary} onClick={syncEvents}>🔄 Sinchronizuoti įvykius</button>
              <button style={btnSecondary} onClick={disconnect}>Atsijungti</button>
            </div>
            {gcalEvents.length > 0 && (
              <div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Artimiausi Google Calendar įvykiai (importuoti kaip darbus):</div>
                {gcalEvents.map(ev => (
                  <div key={ev.id} style={{ ...cardStyle, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{ev.summary}</div>
                      <div style={{ color: '#4285f4', fontSize: 11 }}>
                        {ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleString('lt-LT') : ev.start?.date}
                      </div>
                    </div>
                    <button style={{ ...btnSecondary, fontSize: 12, padding: '4px 10px' }} onClick={() => importEvent(ev)}>
                      ← Importuoti
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {status && (
          <div style={{ marginTop: 12, color: status.startsWith('✅') ? '#22c55e' : status.startsWith('❌') ? '#ef4444' : '#f59e0b', fontSize: 13 }}>
            {status}
          </div>
        )}
      </div>

      {/* Setup instructions */}
      <div style={cardStyle}>
        <h3 style={{ color: '#e2e8f0', margin: '0 0 12px' }}>📋 Google Calendar nustatymo instrukcija</h3>
        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: '#6366f1' }}>1.</b> Eikite į <span style={{ color: '#4285f4', fontFamily: 'monospace' }}>console.cloud.google.com</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: '#6366f1' }}>2.</b> Sukurkite naują projektą (arba pasirinkite esamą)
          </div>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: '#6366f1' }}>3.</b> Eikite į <b>APIs & Services → Library</b> → ieškokite <b>Google Calendar API</b> → įjunkite
          </div>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: '#6366f1' }}>4.</b> Sukonfigūruokite <b>OAuth consent screen</b>: User Type = External, užpildykite App name
          </div>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: '#6366f1' }}>5.</b> Eikite į <b>Credentials → Create Credentials → OAuth client ID</b>
          </div>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: '#6366f1' }}>6.</b> Application type: <b>Web application</b>
          </div>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: '#6366f1' }}>7.</b> Authorized JavaScript origins pridėkite:
            <div style={{ background: '#0f0f1a', borderRadius: 6, padding: '6px 10px', marginTop: 4, fontFamily: 'monospace', fontSize: 12, color: '#22c55e' }}>
              https://mano.oktoja.lt
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <b style={{ color: '#6366f1' }}>8.</b> Nukopijuokite <b>Client ID</b> ir įklijuokite laukelyje aukščiau
          </div>
          <div>
            <b style={{ color: '#6366f1' }}>9.</b> Pirmą kartą prisijungus Google paprašys patvirtinti prieigą — leiskite
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: '📊 Apžvalga' },
  { id: 'contacts', label: '👥 Kontaktai' },
  { id: 'projects', label: '📁 Projektai' },
  { id: 'tasks', label: '✅ Darbai' },
  { id: 'communications', label: '💬 Komunikacijos' },
  { id: 'credentials', label: '🔑 Prisijungimai' },
  { id: 'invoices', label: '📄 Sąskaitos' },
  { id: 'settings', label: '⚙️ Nustatymai' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [contacts, setContacts] = useLocalStorage(STORAGE_KEYS.contacts, [])
  const [projects, setProjects] = useLocalStorage(STORAGE_KEYS.projects, [])
  const [tasks, setTasks] = useLocalStorage(STORAGE_KEYS.tasks, [])
  const [communications, setCommunications] = useLocalStorage(STORAGE_KEYS.communications, [])
  const [credentials, setCredentials] = useLocalStorage(STORAGE_KEYS.credentials, [])
  const [invoices, setInvoices] = useLocalStorage(STORAGE_KEYS.invoices, [])
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.settings, {})
  const [menuOpen, setMenuOpen] = useState(false)
  const [gcalToken, setGcalToken] = useState(() => sessionStorage.getItem('gcal_token') || '')

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1e1e2e', borderBottom: '1px solid #2e2e3e', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#6366f1', letterSpacing: -0.5, whiteSpace: 'nowrap' }}>⚡ ManoKRM</div>
          <nav style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? '#6366f1' : 'none',
                color: tab === t.id ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: 8, padding: '6px 10px',
                cursor: 'pointer', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
              }}>{t.label}</button>
            ))}
          </nav>
          <button onClick={() => setMenuOpen(o => !o)} style={{
            display: 'none', background: 'none', border: 'none',
            color: '#94a3b8', fontSize: 22, cursor: 'pointer',
          }} id="hamburger">☰</button>
        </div>
        {menuOpen && (
          <div style={{ borderTop: '1px solid #2e2e3e', padding: '8px 0' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setMenuOpen(false) }} style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: tab === t.id ? '#6366f155' : 'none',
                color: tab === t.id ? '#6366f1' : '#94a3b8',
                border: 'none', padding: '10px 16px', cursor: 'pointer', fontSize: 14,
              }}>{t.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Notification Bar */}
      <NotificationBar tasks={tasks} />

      {/* Main content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {tab === 'dashboard' && <Dashboard contacts={contacts} projects={projects} tasks={tasks} communications={communications} gcalToken={gcalToken} />}
        {tab === 'contacts' && <Contacts contacts={contacts} setContacts={setContacts} />}
        {tab === 'projects' && <Projects projects={projects} setProjects={setProjects} contacts={contacts} />}
        {tab === 'tasks' && <Tasks tasks={tasks} setTasks={setTasks} projects={projects} contacts={contacts} gcalToken={gcalToken} />}
        {tab === 'communications' && <Communications communications={communications} setCommunications={setCommunications} projects={projects} contacts={contacts} />}
        {tab === 'credentials' && <Credentials credentials={credentials} setCredentials={setCredentials} projects={projects} />}
        {tab === 'invoices' && <Invoices invoices={invoices} setInvoices={setInvoices} contacts={contacts} />}
        {tab === 'settings' && <Settings settings={settings} setSettings={setSettings} gcalToken={gcalToken} setGcalToken={setGcalToken} tasks={tasks} setTasks={setTasks} />}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        input:focus, select:focus, textarea:focus { border-color: #6366f1 !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0f0f1a; }
        ::-webkit-scrollbar-thumb { background: #2e2e3e; border-radius: 3px; }
        @media (max-width: 768px) {
          nav { display: none !important; }
          #hamburger { display: block !important; }
        }
      `}</style>
    </div>
  )
}
