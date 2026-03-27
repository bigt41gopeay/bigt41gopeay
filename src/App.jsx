import { useState, useCallback } from 'react'
import { STORAGE_KEYS, TABS, BRAND } from './utils/constants'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSync } from './hooks/useSync'
import { ToastProvider } from './contexts/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotificationBar } from './components/NotificationBar'
import { Dashboard } from './components/Dashboard'
import { Leads } from './components/Leads'
import { Contacts } from './components/Contacts'
import { Projects } from './components/Projects'
import { Tasks } from './components/Tasks'
import { Communications } from './components/Communications'
import { Credentials } from './components/Credentials'
import { Invoices } from './components/Invoices'
import { Notes } from './components/Notes'
import { Settings } from './components/Settings'

// Sidebar nav sections
const NAV_SECTIONS = [
  {
    label: 'Pagrindinis',
    items: ['dashboard', 'leads'],
  },
  {
    label: 'Valdymas',
    items: ['contacts', 'projects', 'tasks', 'invoices'],
  },
  {
    label: 'Įrankiai',
    items: ['credentials', 'notes', 'communications'],
  },
  {
    label: 'Sistema',
    items: ['settings'],
  },
]

// Bottom nav (mobile) - most important 5 tabs
const BOTTOM_TABS = ['dashboard', 'leads', 'tasks', 'credentials', 'notes']

function AppContent() {
  const [tab, setTab] = useState('dashboard')
  const [contacts, setContacts] = useLocalStorage(STORAGE_KEYS.contacts, [])
  const [projects, setProjects] = useLocalStorage(STORAGE_KEYS.projects, [])
  const [tasks, setTasks] = useLocalStorage(STORAGE_KEYS.tasks, [])
  const [communications, setCommunications] = useLocalStorage(STORAGE_KEYS.communications, [])
  const [credentials, setCredentials] = useLocalStorage(STORAGE_KEYS.credentials, [])
  const [invoices, setInvoices] = useLocalStorage(STORAGE_KEYS.invoices, [])
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.settings, {})
  const [leads, setLeads] = useLocalStorage(STORAGE_KEYS.leads, [])
  const [notes, setNotes] = useLocalStorage(STORAGE_KEYS.notes, [])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [gcalToken, setGcalToken] = useState(() => sessionStorage.getItem('gcal_token') || '')

  const sync = useSync(settings)
  useKeyboardShortcuts(setTab)

  const handleTabChange = useCallback((id) => {
    setTab(id)
    setMobileMenuOpen(false)
  }, [])

  const tabInfo = TABS.find(t => t.id === tab) || TABS[0]
  const tabMap = Object.fromEntries(TABS.map(t => [t.id, t]))
  const bottomTabs = BOTTOM_TABS.map(id => tabMap[id])

  // Count badges for sidebar
  const pendingTasks = tasks.filter(t => t.status !== 'baigtas').length
  const activeLeads = leads.filter(l => !['laimeta', 'prarasta'].includes(l.stage)).length
  const unpaidInvoices = (invoices || []).filter(i => i.status === 'išsiųsta' || i.status === 'vėluoja').length

  const getBadge = (id) => {
    if (id === 'tasks' && pendingTasks > 0) return pendingTasks
    if (id === 'leads' && activeLeads > 0) return activeLeads
    if (id === 'invoices' && unpaidInvoices > 0) return unpaidInvoices
    return null
  }

  return (
    <div className="admin-layout">
      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => handleTabChange('dashboard')}>
          <div className="sidebar-logo-icon">⚡</div>
          <span className="sidebar-logo-text">ManoKRM</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Pagrindinė navigacija">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map(id => {
                const t = tabMap[id]
                if (!t) return null
                const badge = getBadge(id)
                return (
                  <button
                    key={id}
                    className={`nav-item ${tab === id ? 'active' : ''}`}
                    onClick={() => handleTabChange(id)}
                    aria-current={tab === id ? 'page' : undefined}
                    title={`${t.label} (Alt+${t.shortcut})`}
                  >
                    <span className="nav-item-icon">{t.icon}</span>
                    <span className="nav-item-label">{t.label}</span>
                    {badge && (
                      <span style={{
                        marginLeft: 'auto',
                        background: `${BRAND.purple}22`,
                        color: BRAND.purple,
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        minWidth: 24,
                        textAlign: 'center',
                      }}>
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar collapse toggle */}
        <div className="sidebar-toggle">
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Išplėsti' : 'Suskleisti'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Mobile header */}
        <header className="mobile-header">
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Meniu"
            style={{
              background: 'none', border: 'none',
              color: BRAND.textSecondary, fontSize: 22, cursor: 'pointer',
              width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 10,
            }}
          >
            ☰
          </button>
          <div style={{
            fontWeight: 700, fontSize: 16,
            display: 'flex', alignItems: 'center', gap: 8,
            color: BRAND.textPrimary,
          }}>
            <span>{tabInfo.icon}</span>
            {tabInfo.label}
          </div>
          <div style={{ width: 40 }} /> {/* Spacer for centering */}
        </header>

        {/* Notification Bar */}
        <NotificationBar tasks={tasks} />

        {/* Desktop page header */}
        <div className="page-header">
          <h1>
            <span style={{ fontSize: 22 }}>{tabInfo.icon}</span>
            {tabInfo.label}
          </h1>
        </div>

        {/* Page content */}
        <div className="page-body">
          {tab === 'dashboard' && <Dashboard contacts={contacts} projects={projects} tasks={tasks} communications={communications} invoices={invoices} credentials={credentials} leads={leads} gcalToken={gcalToken} onNavigate={handleTabChange} />}
          {tab === 'leads' && <Leads leads={leads} setLeads={setLeads} contacts={contacts} />}
          {tab === 'contacts' && <Contacts contacts={contacts} setContacts={setContacts} />}
          {tab === 'projects' && <Projects projects={projects} setProjects={setProjects} contacts={contacts} tasks={tasks} setTasks={setTasks} />}
          {tab === 'tasks' && <Tasks tasks={tasks} setTasks={setTasks} projects={projects} contacts={contacts} gcalToken={gcalToken} />}
          {tab === 'invoices' && <Invoices invoices={invoices} setInvoices={setInvoices} contacts={contacts} />}
          {tab === 'credentials' && <Credentials credentials={credentials} setCredentials={setCredentials} projects={projects} />}
          {tab === 'notes' && <Notes notes={notes} setNotes={setNotes} projects={projects} />}
          {tab === 'communications' && <Communications communications={communications} setCommunications={setCommunications} projects={projects} contacts={contacts} />}
          {tab === 'settings' && <Settings settings={settings} setSettings={setSettings} gcalToken={gcalToken} setGcalToken={setGcalToken} tasks={tasks} setTasks={setTasks} sync={sync} />}
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav" aria-label="Greitoji navigacija">
        {bottomTabs.map(t => {
          const isActive = tab === t.id
          const badge = getBadge(t.id)
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '4px 2px', border: 'none', cursor: 'pointer',
                background: 'none',
                color: isActive ? BRAND.purple : BRAND.textMuted,
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                transition: 'color 0.15s ease',
                position: 'relative',
              }}
            >
              <span style={{
                fontSize: 20, position: 'relative',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease',
              }}>
                {t.icon}
                {badge && (
                  <span style={{
                    position: 'absolute', top: -4, right: -8,
                    background: BRAND.purple, color: '#fff',
                    borderRadius: 10, padding: '0 5px', fontSize: 9,
                    fontWeight: 700, minWidth: 16, textAlign: 'center', lineHeight: '16px',
                  }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span style={{ letterSpacing: 0.2 }}>{t.label}</span>
              {isActive && (
                <span style={{
                  position: 'absolute', bottom: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%',
                  background: BRAND.purple,
                  boxShadow: `0 0 6px ${BRAND.purple}`,
                }} />
              )}
            </button>
          )
        })}
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '4px 2px', border: 'none', cursor: 'pointer',
            background: 'none',
            color: mobileMenuOpen ? BRAND.purple : BRAND.textMuted,
            fontSize: 10, fontWeight: mobileMenuOpen ? 700 : 500,
          }}
        >
          <span style={{ fontSize: 20 }}>☰</span>
          <span>Daugiau</span>
        </button>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  )
}
