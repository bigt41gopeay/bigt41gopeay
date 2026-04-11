import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA support
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('✅ Service Worker registered:', reg.scope)
        // Check for updates every hour
        setInterval(() => reg.update(), 60 * 60 * 1000)
      })
      .catch((err) => {
        console.warn('⚠️ Service Worker registration failed:', err)
      })
  })
}
