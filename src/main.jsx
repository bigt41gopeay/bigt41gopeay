import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker and handle updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      // Check for updates every 60 seconds while the tab is open
      setInterval(() => reg.update().catch(() => {}), 60_000)

      // When the active SW broadcasts an update, reload the page
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'SW_UPDATED') {
          window.location.reload()
        }
      })

      // If a new SW is installed and waiting, activate it immediately
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            newSW.postMessage?.({ type: 'SKIP_WAITING' })
          }
        })
      })
    } catch {
      // SW registration failed — app still works
    }
  })
}
