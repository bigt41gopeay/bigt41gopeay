import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { pb, isAuthed, onAuthChange, login, logout } from './lib/pb'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import LeadDetail from './pages/LeadDetail.jsx'
import Clients from './pages/Clients.jsx'
import Outreach from './pages/Outreach.jsx'
import Proposals from './pages/Proposals.jsx'
import Settings from './pages/Settings.jsx'

const NAV_ITEMS = [
  { to: '/',          icon: '◯', mobileIcon: '◯', label: 'Home',       end: true },
  { to: '/leads',     icon: '⊞', mobileIcon: '⊞', label: 'Leads' },
  { to: '/outreach',  icon: '✉', mobileIcon: '✉', label: 'Outreach' },
  { to: '/clients',   icon: '◈', mobileIcon: '◈', label: 'Klientai' },
  { to: '/settings',  icon: '⚙', mobileIcon: '⚙', label: 'Nustat.' },
]

export default function App() {
  const [authed, setAuthed] = useState(isAuthed())
  useEffect(() => onAuthChange(() => setAuthed(isAuthed())), [])

  if (!authed) return <Login />

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/outreach" element={<Outreach />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

function BottomNav() {
  const loc = useLocation()
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(n => {
        const active = n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)
        return (
          <NavLink key={n.to} to={n.to} className={'bottom-nav-item' + (active ? ' active' : '')}>
            <span className="nav-icon">{n.mobileIcon}</span>
            {n.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

function Sidebar() {
  const sidebarNav = [
    { section: 'Pardavimai' },
    ...NAV_ITEMS.slice(0, 3),
    { to: '/proposals', icon: '❒', label: 'Pasiūlymai' },
    { section: 'Klientai' },
    { to: '/clients', icon: '◈', label: 'Klientai' },
    { section: 'Sistema' },
    { to: '/settings', icon: '⚙', label: 'Nustatymai' },
  ]
  return (
    <aside className="sidebar">
      <div className="brand" style={{
        fontSize: 18, fontWeight: 700,
        background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        padding: '10px 12px 20px', letterSpacing: -0.3,
      }}>◆ ModernCRM</div>
      {sidebarNav.map((n, i) => n.section
        ? <div key={i} className="nav-section">{n.section}</div>
        : <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">{n.icon}</span>{n.label}
          </NavLink>
      )}
      <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--border)' }}>
        <div className="text-sm text-muted" style={{ marginBottom: 8 }}>{pb.authStore.model?.email}</div>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => logout()}>Atsijungti</button>
      </div>
    </aside>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError('Neteisingi duomenys arba serveris nepasiekiamas')
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <form className="login-box glow-card" onSubmit={submit}>
        <h1>◆ ModernCRM</h1>
        <div className="subtitle">Prisijunkite su savo el. paštu</div>
        <div className="form-group">
          <label className="label">El. paštas</label>
          <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoFocus autoComplete="email" />
        </div>
        <div className="form-group">
          <label className="label">Slaptažodis</label>
          <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</div>}
        <button className="btn btn-primary mt-4" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Jungiamės...' : 'Prisijungti'}
        </button>
        <div className="text-sm text-muted mt-4" style={{ textAlign: 'center' }}>
          Pirmiausia sukurkite vartotoją per <a href="/_/" target="_blank">PocketBase admin</a>
        </div>
      </form>
    </div>
  )
}
