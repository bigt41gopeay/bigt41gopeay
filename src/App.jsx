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
import { saveToken, clearToken, hasToken, api } from './api'

export default function App() {
  const [page, setPage] = useState('home')
  const [cart, setCart] = useState([])
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [notification, setNotification] = useState(null)
  const [affiliateCode, setAffiliateCode] = useState(null)

  const navigate = useCallback((newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

    // Deep link to specific page
    const pageParam = params.get('page')
    if (pageParam && ['home', 'books', 'games', 'courses', 'store', 'membership', 'giftcards', 'affiliate', 'about'].includes(pageParam)) {
      setPage(pageParam)
    }

    // Payment result handling
    const payment = params.get('payment')
    if (payment === 'success') {
      showNotif('✅ Apmokėjimas sėkmingas! Ačiū už pirkimą.')
      setCart([])
      setPage('orders')
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
  }, [])

  const handleLogout = useCallback(() => {
    setUser(null)
    clearToken()
    showNotif('👋 Iki pasimatymo!')
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
