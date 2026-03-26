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

// Bottom nav tabs (most used on mobile)
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [gcalToken, setGcalToken] = useState(() => sessionStorage.getItem('gcal_token') || '')

  const sync = useSync(settings)
  useKeyboardShortcuts(setTab)

  const handleTabChange = useCallback((id) => {
    setTab(id)
    setMenuOpen(false)
  }, [])

  const bottomTabs = TABS.filter(t => BOTTOM_TABS.includes(t.id))

  return (
    <div style={{ minHeight: '100vh', minHeight: '100dvh', background: BRAND.dark, color: BRAND.textPrimary }}>
      {/* Header */}
      <header style={{
        background: 'rgba(19, 16, 28, 0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: `1px solid ${BRAND.darkBorder}`,
        padding: '0 16px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56,
        }}>
          {/* Logo */}
          <div
            style={{
              fontWeight: 800, fontSize: 20,
              background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.cyan})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: -0.5, whiteSpace: 'nowrap', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onClick={() => handleTabChange('dashboard')}
            role="banner"
          >
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.purpleDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, WebkitTextFillColor: '#fff',
              boxShadow: '0 2px 8px rgba(134,59,255,0.3)',
            }}>
              ⚡
            </span>
            ManoKRM
          </div>

          {/* Desktop nav */}
          <nav className="desktop-nav" aria-label="Pagrindinė navigacija" style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                title={`${t.label} (Alt+${t.shortcut})`}
                className="btn-press"
                style={{
                  background: tab === t.id
                    ? `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.purpleDeep})`
                    : 'none',
                  color: tab === t.id ? '#fff' : BRAND.textSecondary,
                  border: 'none', borderRadius: 10, padding: '7px 12px',
                  cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                  whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                  boxShadow: tab === t.id ? '0 2px 8px rgba(134,59,255,0.3)' : 'none',
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
              display: 'none', background: menuOpen ? BRAND.darkCard : 'none',
              border: `1px solid ${menuOpen ? BRAND.darkBorder : 'transparent'}`,
              color: menuOpen ? BRAND.purple : BRAND.textSecondary,
              fontSize: 20, cursor: 'pointer', borderRadius: 10,
              width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <nav
            className="mobile-nav"
            aria-label="Mobilusis meniu"
            style={{
              borderTop: `1px solid ${BRAND.darkBorder}`,
              padding: '8px 0 12px',
              animation: 'slideUp 0.2s ease-out',
            }}
          >
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6,
              padding: '0 4px',
            }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className="btn-press"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: tab === t.id
                      ? `linear-gradient(135deg, rgba(134,59,255,0.15), rgba(126,20,255,0.08))`
                      : BRAND.darkCard,
                    color: tab === t.id ? BRAND.purple : BRAND.textSecondary,
                    border: `1px solid ${tab === t.id ? BRAND.purple + '33' : BRAND.darkBorder}`,
                    borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontSize: 14,
                    fontWeight: tab === t.id ? 700 : 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Notification Bar */}
      <NotificationBar tasks={tasks} />

      {/* Main content */}
      <main style={{
        maxWidth: 1200, margin: '0 auto', padding: '20px 16px',
        minHeight: 'calc(100vh - 56px)', minHeight: 'calc(100dvh - 56px)',
      }}>
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

      {/* Bottom nav for mobile */}
      <nav className="bottom-nav" aria-label="Greitoji navigacija">
        {bottomTabs.map(t => {
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '6px 4px', border: 'none', cursor: 'pointer',
                background: 'none',
                color: isActive ? BRAND.purple : BRAND.textMuted,
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                transition: 'color 0.15s ease',
                position: 'relative',
              }}
            >
              <span style={{
                fontSize: 20,
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.2s ease',
              }}>
                {t.icon}
              </span>
              <span style={{ letterSpacing: 0.2 }}>{t.label}</span>
              {/* Active indicator dot */}
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
        {/* More button */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '6px 4px', border: 'none', cursor: 'pointer',
            background: 'none',
            color: menuOpen ? BRAND.purple : BRAND.textMuted,
            fontSize: 10, fontWeight: menuOpen ? 700 : 500,
            transition: 'color 0.15s ease',
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
