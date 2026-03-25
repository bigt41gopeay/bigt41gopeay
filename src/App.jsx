import { useState, useCallback } from 'react'
import { STORAGE_KEYS, TABS } from './utils/constants'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [gcalToken, setGcalToken] = useState(() => sessionStorage.getItem('gcal_token') || '')

  const sync = useSync(settings)
  useKeyboardShortcuts(setTab)

  const handleTabChange = useCallback((id) => {
    setTab(id)
    setMenuOpen(false)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: '#1e1e2e', borderBottom: '1px solid #2e2e3e',
        padding: '0 16px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52,
        }}>
          <div
            style={{ fontWeight: 800, fontSize: 18, color: '#6366f1', letterSpacing: -0.5, whiteSpace: 'nowrap', cursor: 'pointer' }}
            onClick={() => handleTabChange('dashboard')}
            role="banner"
          >
            ⚡ ManoKRM
          </div>

          {/* Desktop nav */}
          <nav className="desktop-nav" aria-label="Pagrindinė navigacija" style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                title={`${t.label} (Alt+${t.shortcut})`}
                style={{
                  background: tab === t.id ? '#6366f1' : 'none',
                  color: tab === t.id ? '#fff' : '#94a3b8',
                  border: 'none', borderRadius: 8, padding: '6px 10px',
                  cursor: 'pointer', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Meniu"
            aria-expanded={menuOpen}
            style={{
              display: 'none', background: 'none', border: 'none',
              color: '#94a3b8', fontSize: 22, cursor: 'pointer',
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobilusis meniu" style={{ borderTop: '1px solid #2e2e3e', padding: '8px 0' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: tab === t.id ? '#6366f155' : 'none',
                  color: tab === t.id ? '#6366f1' : '#94a3b8',
                  border: 'none', padding: '12px 16px', cursor: 'pointer', fontSize: 15,
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Notification Bar */}
      <NotificationBar tasks={tasks} />

      {/* Main content */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px', minHeight: 'calc(100vh - 52px)' }}>
        {tab === 'dashboard' && <Dashboard contacts={contacts} projects={projects} tasks={tasks} communications={communications} invoices={invoices} credentials={credentials} leads={leads} gcalToken={gcalToken} />}
        {tab === 'leads' && <Leads leads={leads} setLeads={setLeads} contacts={contacts} />}
        {tab === 'contacts' && <Contacts contacts={contacts} setContacts={setContacts} />}
        {tab === 'projects' && <Projects projects={projects} setProjects={setProjects} contacts={contacts} tasks={tasks} setTasks={setTasks} />}
        {tab === 'tasks' && <Tasks tasks={tasks} setTasks={setTasks} projects={projects} contacts={contacts} gcalToken={gcalToken} />}
        {tab === 'invoices' && <Invoices invoices={invoices} setInvoices={setInvoices} contacts={contacts} />}
        {tab === 'credentials' && <Credentials credentials={credentials} setCredentials={setCredentials} projects={projects} />}
        {tab === 'notes' && <Notes notes={notes} setNotes={setNotes} projects={projects} />}
        {tab === 'communications' && <Communications communications={communications} setCommunications={setCommunications} projects={projects} contacts={contacts} />}
        {tab === 'settings' && <Settings settings={settings} setSettings={setSettings} gcalToken={gcalToken} setGcalToken={setGcalToken} tasks={tasks} setTasks={setTasks} sync={sync} />}
      </main>

      {/* Bottom nav for mobile — show most important tabs */}
      <nav className="bottom-nav" aria-label="Greitoji navigacija">
        {[TABS[0], TABS[1], TABS[4], TABS[6], TABS[7]].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '8px 4px', border: 'none', cursor: 'pointer',
              background: 'none',
              color: tab === t.id ? '#6366f1' : '#64748b',
              fontSize: 9, fontWeight: tab === t.id ? 700 : 400,
            }}
          >
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '8px 4px', border: 'none', cursor: 'pointer',
            background: 'none', color: menuOpen ? '#6366f1' : '#64748b', fontSize: 9,
          }}
        >
          <span style={{ fontSize: 18 }}>☰</span>
          Daugiau
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
