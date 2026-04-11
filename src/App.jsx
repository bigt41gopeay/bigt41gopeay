import { useState, useCallback, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import LoginModal from './components/LoginModal'
import Home from './pages/Home'
import Books from './pages/Books'
import Games from './pages/Games'
import Store from './pages/Store'
import Membership from './pages/Membership'
import Courses from './pages/Courses'
import Admin from './pages/Admin'
import Profile from './pages/Profile'
import MyOrders from './pages/MyOrders'
import { saveToken, clearToken, hasToken, api } from './api'

export default function App() {
  const [page, setPage] = useState('home')
  const [cart, setCart] = useState([])
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [notification, setNotification] = useState(null)

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
        return <Store cart={cart} onAddToCart={addToCart} onRemoveFromCart={removeFromCart} user={user} onLogin={() => setShowLogin(true)} />
      case 'courses':
        return <Courses user={user} onLogin={() => setShowLogin(true)} />
      case 'membership':
        return <Membership user={user} onNavigate={navigate} />
      case 'profile':
        return <Profile user={user} onUserUpdate={setUser} onNavigate={navigate} />
      case 'orders':
        return <MyOrders user={user} />
      case 'admin':
        return <Admin user={user} />
      default:
        return <Home onNavigate={navigate} />
    }
  }

  return (
    <>
      <Header
        currentPage={page}
        onNavigate={navigate}
        cartCount={cart.length}
        user={user}
        onLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1 }}>
        {renderPage()}
      </main>

      <Footer onNavigate={navigate} />

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
  bottom: '24px',
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
