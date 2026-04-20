// Bump this on every deploy to force cache refresh
const VERSION = 'v3-' + Date.now()
const CACHE_NAME = `manocrm-${VERSION}`

// Install — activate immediately, do not cache anything upfront
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Activate — clean ALL old caches and take control right away
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
      await self.clients.claim()
      // Tell all tabs to reload to pick up the new version
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
    })()
  )
})

// Fetch strategy:
// - index.html and navigation requests: ALWAYS network (never stale)
// - hashed assets (/assets/*): cache-first (safe — hashed filenames)
// - everything else: network-first with cache fallback for offline
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  if (!req.url.startsWith(self.location.origin)) return
  if (req.url.includes('googleapis.com')) return
  if (req.url.includes('accounts.google.com')) return

  const url = new URL(req.url)

  // Always network for HTML / navigations — prevents stale index.html
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() =>
        caches.match('/index.html').then(r => r || new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  // Hashed assets — cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached
        return fetch(req).then(resp => {
          if (resp.ok) {
            const clone = resp.clone()
            caches.open(CACHE_NAME).then(c => c.put(req, clone))
          }
          return resp
        })
      })
    )
    return
  }

  // Other requests — network first, cache fallback
  event.respondWith(
    fetch(req).then(resp => {
      if (resp.ok) {
        const clone = resp.clone()
        caches.open(CACHE_NAME).then(c => c.put(req, clone))
      }
      return resp
    }).catch(() => caches.match(req))
  )
})
