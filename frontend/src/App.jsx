import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { pb, isAuthed, onAuthChange, login, logout } from './lib/pb'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import LeadDetail from './pages/LeadDetail.jsx'
import Clients from './pages/Clients.jsx'
import Outreach from './pages/Outreach.jsx'
import Proposals from './pages/Proposals.jsx'
import Settings from './pages/Settings.jsx'

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
    </div>
  )
}

function Sidebar() {
  const nav = [
    { section: 'Pardavimai' },
    { to: '/', icon: '◯', label: 'Dashboard', end: true },
    { to: '/leads', icon: '⊞', label: 'Leads' },
    { to: '/outreach', icon: '✉', label: 'Outreach' },
    { to: '/proposals', icon: '❒', label: 'Pasiūlymai' },
    { section: 'Klientai' },
    { to: '/clients', icon: '◈', label: 'Klientai' },
    { section: 'Sistema' },
    { to: '/settings', icon: '⚙', label: 'Nustatymai' },
  ]
  return (
    <aside className="sidebar">
      <div className="brand">◆ ModernCRM</div>
      {nav.map((n, i) => n.section
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
    } catch (e) {
      setError('Neteisingi duomenys arba serveris nepasiekiamas')
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <form className="login-box glow-card" onSubmit={submit}>
        <h1>◆ ModernCRM</h1>
        <div className="subtitle">Prisijunkite su savo el. paštu</div>
        <label className="label">El. paštas</label>
        <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        <div className="mt-4" />
        <label className="label">Slaptažodis</label>
        <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 12 }}>{error}</div>}
        <button className="btn btn-primary mt-6" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} disabled={loading}>
          {loading ? 'Jungiamės...' : 'Prisijungti'}
        </button>
        <div className="text-sm text-muted mt-4" style={{ textAlign: 'center' }}>
          Pirmiausia sukurkite vartotoją per <a href="/_/" target="_blank">PocketBase admin</a>
        </div>
      </form>
    </div>
  )
}
