import { useState, useEffect } from 'react'

// ─── STORAGE ──────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  contacts: 'crm_contacts',
  projects: 'crm_projects',
  tasks: 'crm_tasks',
  communications: 'crm_communications',
  credentials: 'crm_credentials',
  invoices: 'crm_invoices',
  proposals: 'crm_proposals',
  settings: 'crm_settings',
}

export function useLocalStorage(key, initial) {
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

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const LEAD_STATUSES = [
  { id: 'saltas',  label: 'šaltas kontaktas',  color: '#64748b' },
  { id: 'siltas',  label: 'šiltas kontaktas',  color: '#f59e0b' },
  { id: 'aktyvus', label: 'aktyvus klientas',  color: '#22c55e' },
  { id: 'buves',   label: 'buvęs klientas',    color: '#6b7280' },
]

export const CLIENT_SOURCES = [
  'Renginys', 'Rekomendacija', 'Tinklapis', 'Skambutis',
  'LinkedIn', 'El. paštas', 'Facebook', 'Kita',
]

export const SERVER_TYPES = [
  'Hosting', 'SSH / Serveris', 'FTP', 'Domenų registratorius',
  'Duomenų bazė', 'El. paštas', 'CMS admin', 'API', 'Kita',
]

export const STATUS_COLORS = {
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
  priimta: '#22c55e',
  atmesta: '#ef4444',
  'šaltas kontaktas': '#64748b',
  'šiltas kontaktas': '#f59e0b',
  'aktyvus klientas': '#22c55e',
  'buvęs klientas': '#6b7280',
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#0f0f1a',
  border: '1px solid #2e2e3e', borderRadius: 8, padding: '8px 12px',
  color: '#e2e8f0', fontSize: 14, outline: 'none',
}
export const labelStyle = { color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }
export const formGroup = { marginBottom: 16 }
export const btnPrimary = {
  background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
}
export const btnSecondary = {
  background: '#2e2e3e', color: '#e2e8f0', border: 'none', borderRadius: 8,
  padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
}
export const btnDanger = {
  background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444',
  borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
}
export const btnSmall = {
  background: '#2e2e3e', color: '#e2e8f0', border: 'none', borderRadius: 6,
  padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
}
export const cardStyle = {
  background: '#1e1e2e', border: '1px solid #2e2e3e', borderRadius: 10,
  padding: 16, marginBottom: 12,
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

export function Badge({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280'
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}

export function Modal({ title, onClose, children, wide }) {
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
        background: '#1e1e2e', borderRadius: 12, padding: 24, width: '100%',
        maxWidth: wide ? 900 : 560,
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

// ─── UTILITIES ────────────────────────────────────────────────────────────────

export function lt(str) {
  return (str || '')
    .replace(/[ą]/g, 'a').replace(/[č]/g, 'c').replace(/[ę]/g, 'e').replace(/[ė]/g, 'e')
    .replace(/[į]/g, 'i').replace(/[š]/g, 's').replace(/[ų]/g, 'u').replace(/[ū]/g, 'u').replace(/[ž]/g, 'z')
    .replace(/[Ą]/g, 'A').replace(/[Č]/g, 'C').replace(/[Ę]/g, 'E').replace(/[Ė]/g, 'E')
    .replace(/[Į]/g, 'I').replace(/[Š]/g, 'S').replace(/[Ų]/g, 'U').replace(/[Ū]/g, 'U').replace(/[Ž]/g, 'Z')
}

// Simple XOR + base64 obfuscation for credentials. Not strong encryption,
// but prevents passwords from appearing in plain-text localStorage dumps.
const CRED_KEY = 'manokrm-cred-obfuscation-key-v1'
export function encryptPassword(plain) {
  if (!plain) return ''
  try {
    let out = ''
    for (let i = 0; i < plain.length; i++) {
      out += String.fromCharCode(plain.charCodeAt(i) ^ CRED_KEY.charCodeAt(i % CRED_KEY.length))
    }
    return btoa(unescape(encodeURIComponent(out)))
  } catch { return plain }
}
export function decryptPassword(enc) {
  if (!enc) return ''
  try {
    const decoded = decodeURIComponent(escape(atob(enc)))
    let out = ''
    for (let i = 0; i < decoded.length; i++) {
      out += String.fromCharCode(decoded.charCodeAt(i) ^ CRED_KEY.charCodeAt(i % CRED_KEY.length))
    }
    return out
  } catch { return '' }
}

export function exportClientsCSV(clients) {
  const header = ['Vardas', 'Įmonė', 'Pareigos', 'El. paštas', 'Telefonas', 'Statusas', 'Šaltinis']
  const rows = clients.map(c =>
    [c.name, c.company, c.position, c.email, c.phone, c.leadStatus, c.source]
      .map(v => `"${(v || '').replace(/"/g, '""')}"`)
  )
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `klientai-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function formatDate(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('lt-LT') } catch { return iso }
}
export function formatDateTime(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('lt-LT') } catch { return iso }
}

// ─── GOOGLE CALENDAR ──────────────────────────────────────────────────────────

export const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
export const GCAL_API = 'https://www.googleapis.com/calendar/v3'

export function loadGISScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export async function gcalCreateEvent(token, task) {
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

export async function gcalUpdateEvent(token, eventId, updates) {
  if (!token || !eventId) return null
  const res = await fetch(`${GCAL_API}/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Nepavyko atnaujinti įvykio')
  return res.json()
}

export async function gcalListEvents(token) {
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

export function NotificationBar({ tasks }) {
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

// Migrate old contacts to clients shape (ensures all fields exist)
export function normalizeClient(c) {
  return {
    id: c.id || genId(),
    name: c.name || '',
    company: c.company || '',
    position: c.position || '',
    email: c.email || '',
    phone: c.phone || '',
    source: c.source || '',
    leadStatus: c.leadStatus || 'saltas',
    previousCompanies: c.previousCompanies || '',
    hostingProvider: c.hostingProvider || '',
    systems: c.systems || '',
    ipAddresses: c.ipAddresses || '',
    domains: c.domains || '',
    events: c.events || [],
    notes: c.notes || '',
    createdAt: c.createdAt || new Date().toISOString(),
  }
}

// Lead status by id helper
export function getLeadStatus(id) {
  return LEAD_STATUSES.find(s => s.id === id) || LEAD_STATUSES[0]
}
