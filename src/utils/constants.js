export const STORAGE_KEYS = {
  contacts: 'crm_contacts',
  projects: 'crm_projects',
  tasks: 'crm_tasks',
  communications: 'crm_communications',
  credentials: 'crm_credentials',
  invoices: 'crm_invoices',
  settings: 'crm_settings',
}

export const STATUS_COLORS = {
  aktyvus: '#22c55e',
  neaktyvus: '#6b7280',
  vykdomas: '#3b82f6',
  baigtas: '#22c55e',
  'atidėtas': '#f59e0b',
  'atšauktas': '#ef4444',
  laukia: '#f59e0b',
  susitikimas: '#8b5cf6',
  skambutis: '#3b82f6',
  'el. laiškas': '#06b6d4',
  darbas: '#3b82f6',
  'juodraštis': '#6b7280',
  'išsiųsta': '#3b82f6',
  'apmokėta': '#22c55e',
  'vėluoja': '#ef4444',
}

export const VAT_RATE = 0.21

export const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
export const GCAL_API = 'https://www.googleapis.com/calendar/v3'

export const TABS = [
  { id: 'dashboard', label: 'Apžvalga', icon: '📊', shortcut: '1' },
  { id: 'contacts', label: 'Kontaktai', icon: '👥', shortcut: '2' },
  { id: 'projects', label: 'Projektai', icon: '📁', shortcut: '3' },
  { id: 'tasks', label: 'Darbai', icon: '✅', shortcut: '4' },
  { id: 'communications', label: 'Komunikacijos', icon: '💬', shortcut: '5' },
  { id: 'credentials', label: 'Prisijungimai', icon: '🔑', shortcut: '6' },
  { id: 'invoices', label: 'Sąskaitos', icon: '📄', shortcut: '7' },
  { id: 'settings', label: 'Nustatymai', icon: '⚙️', shortcut: '8' },
]
