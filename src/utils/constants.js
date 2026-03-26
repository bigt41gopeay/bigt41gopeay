// ─── Brand Colors (from logo) ────────────────────────────────────────────────
export const BRAND = {
  purple: '#863bff',
  purpleDeep: '#7e14ff',
  purpleLight: '#ede6ff',
  purpleMuted: '#b388ff',
  cyan: '#47bfff',
  cyanLight: '#e0f4ff',
  dark: '#08060d',
  darkCard: '#13101c',
  darkSurface: '#1a1625',
  darkBorder: '#2a2438',
  darkBorderLight: '#362e48',
  textPrimary: '#f0ecf6',
  textSecondary: '#a99fc4',
  textMuted: '#6e6287',
}

export const STORAGE_KEYS = {
  contacts: 'crm_contacts',
  projects: 'crm_projects',
  tasks: 'crm_tasks',
  communications: 'crm_communications',
  credentials: 'crm_credentials',
  invoices: 'crm_invoices',
  settings: 'crm_settings',
  leads: 'crm_leads',
  notes: 'crm_notes',
}

export const STATUS_COLORS = {
  aktyvus: '#22c55e',
  neaktyvus: '#6e6287',
  vykdomas: '#47bfff',
  baigtas: '#22c55e',
  'atidėtas': '#f59e0b',
  'atšauktas': '#ef4444',
  laukia: '#f59e0b',
  susitikimas: '#863bff',
  skambutis: '#47bfff',
  'el. laiškas': '#06b6d4',
  darbas: '#47bfff',
  'juodraštis': '#6e6287',
  'išsiųsta': '#47bfff',
  'apmokėta': '#22c55e',
  'vėluoja': '#ef4444',
}

export const VAT_RATE = 0.21

export const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
export const GCAL_API = 'https://www.googleapis.com/calendar/v3'

export const TABS = [
  { id: 'dashboard', label: 'Apžvalga', icon: '📊', shortcut: '1' },
  { id: 'leads', label: 'Pipeline', icon: '🎯', shortcut: '2' },
  { id: 'contacts', label: 'Kontaktai', icon: '👥', shortcut: '3' },
  { id: 'projects', label: 'Projektai', icon: '📁', shortcut: '4' },
  { id: 'tasks', label: 'Darbai', icon: '✅', shortcut: '5' },
  { id: 'invoices', label: 'Sąskaitos', icon: '📄', shortcut: '6' },
  { id: 'credentials', label: 'Prisijungimai', icon: '🔑', shortcut: '7' },
  { id: 'notes', label: 'Užrašai', icon: '📝', shortcut: '8' },
  { id: 'communications', label: 'Komunikacijos', icon: '💬', shortcut: '9' },
  { id: 'settings', label: 'Nustatymai', icon: '⚙️', shortcut: '0' },
]

export const PROJECT_TEMPLATES = [
  {
    name: 'WordPress svetainė',
    description: 'Naujos WordPress svetainės kūrimas',
    defaultTasks: [
      'Domeno ir hostingo paruošimas',
      'WordPress diegimas',
      'Temos pasirinkimas ir dizainas',
      'Turinio įkėlimas',
      'SEO nustatymai',
      'Testavimas ir paleidimas',
    ],
  },
  {
    name: 'Svetainės redizainas',
    description: 'Esamos svetainės atnaujinimas',
    defaultTasks: [
      'Dabartinės svetainės auditas',
      'Naujo dizaino paruošimas',
      'Programavimas',
      'Turinio perkėlimas',
      'Testavimas',
      'Paleidimas',
    ],
  },
  {
    name: 'Serverio konfigūracija',
    description: 'Naujo serverio paruošimas',
    defaultTasks: [
      'OS diegimas ir atnaujinimas',
      'Plesk / cPanel diegimas',
      'SSL sertifikatai',
      'Ugniasienės konfigūracija',
      'Backup nustatymas',
      'DNS nustatymas',
    ],
  },
  {
    name: 'E-parduotuvė',
    description: 'WooCommerce / e-shop kūrimas',
    defaultTasks: [
      'Platformos pasirinkimas',
      'Dizainas ir temos konfigūracija',
      'Produktų įkėlimas',
      'Mokėjimų integravimas',
      'Pristatymo nustatymai',
      'Testavimas ir paleidimas',
    ],
  },
  {
    name: 'SEO projektas',
    description: 'Svetainės optimizavimas paieškos sistemoms',
    defaultTasks: [
      'Raktažodžių tyrimas',
      'On-page SEO',
      'Techninis SEO auditas',
      'Turinio strategija',
      'Nuorodų kūrimas',
      'Rezultatų stebėjimas',
    ],
  },
]

export const RECURRENCE_OPTIONS = [
  { value: '', label: 'Nesikartoja' },
  { value: 'daily', label: 'Kasdien' },
  { value: 'weekly', label: 'Kas savaitę' },
  { value: 'biweekly', label: 'Kas 2 savaites' },
  { value: 'monthly', label: 'Kas mėnesį' },
  { value: 'quarterly', label: 'Kas ketvirtį' },
]
