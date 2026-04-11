import { useState, useEffect } from 'react'

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show prompt after 10 seconds if user hasn't dismissed before
      const dismissed = localStorage.getItem('pwa-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 10000)
      }
    }

    // Listen for successful install
    const handleInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    // Online/offline detection
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-dismissed', Date.now().toString())
  }

  return (
    <>
      {/* Offline indicator */}
      {isOffline && (
        <div style={styles.offlineBar}>
          <span>📡</span>
          <span>Neprisijungta prie interneto – veikia tik išsaugotas turinys</span>
        </div>
      )}

      {/* Install prompt */}
      {showPrompt && !isInstalled && deferredPrompt && (
        <div style={styles.prompt}>
          <div style={styles.promptIcon}>📱</div>
          <div style={styles.promptContent}>
            <strong style={styles.promptTitle}>Įdiekite į telefoną!</strong>
            <p style={styles.promptDesc}>
              MažųjųPasaulis veiks kaip programėlė su greitu prieinamumu
            </p>
            <div style={styles.promptActions}>
              <button onClick={handleInstall} style={styles.installBtn}>
                📥 Įdiegti
              </button>
              <button onClick={handleDismiss} style={styles.dismissBtn}>
                Vėliau
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} style={styles.closeBtn}>✕</button>
        </div>
      )}
    </>
  )
}

const styles = {
  offlineBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #FF6B35, #FFD166)',
    color: 'white',
    textAlign: 'center',
    fontSize: '0.85rem',
    fontWeight: 800,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    fontFamily: 'var(--font)',
  },
  prompt: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    right: '20px',
    maxWidth: '420px',
    margin: '0 auto',
    padding: '20px',
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
    border: '2px solid #E8ECF1',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    zIndex: 999,
    animation: 'slideUp 0.4s ease-out',
    fontFamily: 'var(--font)',
  },
  promptIcon: {
    fontSize: '2.5rem',
    flexShrink: 0,
  },
  promptContent: {
    flex: 1,
  },
  promptTitle: {
    display: 'block',
    fontSize: '1rem',
    color: '#2D3436',
    marginBottom: '4px',
  },
  promptDesc: {
    fontSize: '0.8rem',
    color: '#636E72',
    marginBottom: '10px',
    lineHeight: 1.4,
  },
  promptActions: {
    display: 'flex',
    gap: '8px',
  },
  installBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  dismissBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    background: '#F5F5F5',
    color: '#636E72',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  closeBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#F5F5F5',
    border: 'none',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    fontWeight: 800,
  },
}
