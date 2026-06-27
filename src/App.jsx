import { useState, useCallback, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import LoginModal from './components/LoginModal'
import Chatbot from './components/Chatbot'
import PWAInstaller from './components/PWAInstaller'
import Home from './pages/Home'
import Books from './pages/Books'
import Games from './pages/Games'
import Store from './pages/Store'
import Membership from './pages/Membership'
import Courses from './pages/Courses'
import Admin from './pages/Admin'
import Profile from './pages/Profile'
import MyOrders from './pages/MyOrders'
import GiftCards from './pages/GiftCards'
import Affiliate from './pages/Affiliate'
import About from './pages/About'
import ParentDashboard from './pages/ParentDashboard'
import ChildSelector from './components/ChildSelector'
import { setActiveChildId } from './lib/childSession'
import { saveToken, clearToken, hasToken, api } from './api'

// ------------------------------------------------------------------
// Page <-> URL mapping for History API integration.
// Adding a new page? Add it here in BOTH directions.
// ------------------------------------------------------------------
const PAGE_TO_PATH = {
  home: '/',
  books: '/books',
  games: '/games',
  courses: '/courses',
  store: '/store',
  membership: '/membership',
  giftcards: '/giftcards',
  affiliate: '/affiliate',
  about: '/about',
  profile: '/profile',
  parent: '/parent',
  orders: '/orders',
  admin: '/admin',
}
const PATH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([k, v]) => [v, k])
)

function pageFromLocation() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  return PATH_TO_PAGE[path] || 'home'
}

export default function App() {
  const [page, setPage] = useState(pageFromLocation)
  const [cart, setCart] = useState([])
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showChildSelector, setShowChildSelector] = useState(false)
  const [notification, setNotification] = useState(null)
  const [affiliateCode, setAffiliateCode] = useState(null)

  const navigate = useCallback((newPage, opts = {}) => {
    setPage(newPage)
    const path = PAGE_TO_PATH[newPage] || '/'
    if (!opts.replace && window.location.pathname !== path) {
      // pushState so browser Back returns to the previous page
      window.history.pushState({ page: newPage }, '', path)
    } else if (opts.replace) {
      window.history.replaceState({ page: newPage }, '', path)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Sync app state when user uses browser Back / Forward buttons
  // (or the Android back gesture once installed as a PWA / TWA).
  useEffect(() => {
    const onPop = () => {
      setPage(pageFromLocation())
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    // Initial state in history so first Back inside the app does not
    // pop the entire site straight away.
    if (!window.history.state || !window.history.state.page) {
      window.history.replaceState({ page: pageFromLocation() }, '', window.location.pathname || '/')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const addToCart = useCallback((item) => {
    setCart(prev => [...prev, item])
    showNotif(`${item.emoji} "${item.title}" pridėta į krepšelį!`)
  }, [])

  const removeFromCart = useCallback((index) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Try to restore session on load
  useEffect(() => {
    if (hasToken()) {
      api.getMe().then(u => setUser(u)).catch(() => clearToken())
    }
  }, [])

  // Handle URL parameters: ref (affiliate), page (deep link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Affiliate ref code
    const ref = params.get('ref')
    if (ref) {
      localStorage.setItem('mazuju_ref', ref)
      setAffiliateCode(ref)
      // Track click
      api.trackAffiliate(ref).catch(() => {})
    } else {
      const stored = localStorage.getItem('mazuju_ref')
      if (stored) setAffiliateCode(stored)
    }

    // Deep link to specific page (?page=foo style — kept for backwards compat
    // with old shared links). Modern links use /foo path directly.
    const pageParam = params.get('page')
    if (pageParam && PAGE_TO_PATH[pageParam]) {
      navigate(pageParam, { replace: true })
    }

    // Payment result handling
    const payment = params.get('payment')
    if (payment === 'success') {
      showNotif('✅ Apmokėjimas sėkmingas! Ačiū už pirkimą.')
      setCart([])
      navigate('orders', { replace: true })
    } else if (payment === 'cancelled') {
      showNotif('❌ Apmokėjimas atšauktas')
    }

    // Clean up URL
    if (ref || pageParam || payment) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleLogin = useCallback((userData, token) => {
    setUser(userData)
    if (token) saveToken(token)
    setShowLogin(false)
    showNotif(`👋 Sveiki, ${userData.name}!`)
    // After login, prompt to pick which child is playing
    setTimeout(() => setShowChildSelector(true), 400)
  }, [])

  const handleLogout = useCallback(() => {
    setUser(null)
    clearToken()
    setActiveChildId(null)
    showNotif('👋 Iki pasimatymo!')
  }, [])

  // External components (e.g. ParentDashboard "Add child") can open the
  // selector via a window event. Keeps a clean dependency boundary.
  useEffect(() => {
    const onOpen = () => setShowChildSelector(true)
    window.addEventListener('open-child-selector', onOpen)
    return () => window.removeEventListener('open-child-selector', onOpen)
  }, [])

  function showNotif(message) {
    setNotification(message)
    setTimeout(() => setNotification(null), 3000)
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home onNavigate={navigate} />
      case 'books':
        return <Books onAddToCart={addToCart} />
      case 'games':
        return <Games />
      case 'store':
        return <Store cart={cart} onAddToCart={addToCart} onRemoveFromCart={removeFromCart} user={user} onLogin={() => setShowLogin(true)} affiliateCode={affiliateCode} />
      case 'courses':
        return <Courses user={user} onLogin={() => setShowLogin(true)} />
      case 'membership':
        return <Membership user={user} onNavigate={navigate} />
      case 'profile':
        return <Profile user={user} onUserUpdate={setUser} onNavigate={navigate} />
      case 'parent':
        return <ParentDashboard user={user} onNavigate={navigate} />
      case 'orders':
        return <MyOrders user={user} />
      case 'giftcards':
        return <GiftCards user={user} onLogin={() => setShowLogin(true)} />
      case 'affiliate':
        return <Affiliate user={user} onLogin={() => setShowLogin(true)} />
      case 'about':
        return <About onNavigate={navigate} />
      case 'admin':
        return <Admin user={user} />
      default:
        return <Home onNavigate={navigate} />
    }
  }

  return (
    <>
      <PWAInstaller />

      <Header
        currentPage={page}
        onNavigate={navigate}
        cartCount={cart.length}
        user={user}
        onLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      {affiliateCode && (
        <div style={affiliateBannerStyle}>
          🎁 Pirkdami su nuoroda gausite <strong>5% nuolaidą</strong>! Ref: <code>{affiliateCode}</code>
        </div>
      )}

      <main style={{ flex: 1 }}>
        {renderPage()}
      </main>

      <Footer onNavigate={navigate} />

      <Chatbot onNavigate={navigate} />

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}

      <ChildSelector
        open={showChildSelector}
        onClose={() => setShowChildSelector(false)}
        onSelected={(child) => showNotif(`${child.avatar || '🐣'} ${child.name} žaidžia šiandien!`)}
      />


      {notification && (
        <div style={notificationStyle}>
          {notification}
        </div>
      )}
    </>
  )
}

const notificationStyle = {
  position: 'fixed',
  bottom: '100px',
  right: '24px',
  padding: '16px 28px',
  borderRadius: '16px',
  background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
  color: 'white',
  fontWeight: 700,
  fontSize: '0.95rem',
  boxShadow: '0 8px 30px rgba(108, 99, 255, 0.4)',
  zIndex: 2000,
  animation: 'fadeInUp 0.3s ease-out',
  fontFamily: 'var(--font)',
}

const affiliateBannerStyle = {
  background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)',
  color: 'white',
  padding: '10px 16px',
  textAlign: 'center',
  fontSize: '0.9rem',
  fontWeight: 700,
  fontFamily: 'var(--font)',
}
