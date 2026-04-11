// ===================================================
// MažųjųPasaulis - Service Worker
// Offline-first with network fallback
// ===================================================

const CACHE_VERSION = 'mazuju-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const IMAGE_CACHE = `${CACHE_VERSION}-images`

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
]

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore errors, cache what we can
      })
    })
  )
  self.skipWaiting()
})

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch strategy: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip chrome-extension, data URIs, etc.
  if (!url.protocol.startsWith('http')) return

  // API requests - network-first, short cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE))
    return
  }

  // Images - cache-first with long TTL
  if (request.destination === 'image' || url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  // HTML pages - network-first (for fresh content)
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, STATIC_CACHE).catch(() =>
        caches.match('/index.html')
      )
    )
    return
  }

  // JS/CSS/fonts - cache-first
  if (['script', 'style', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Default - network with cache fallback
  event.respondWith(networkFirst(request, RUNTIME_CACHE))
})

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(
      JSON.stringify({ error: 'Neprisijungta prie interneto', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Message handler for skipWaiting
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

// Push notifications (future use)
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'MažųjųPasaulis', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: data.url || '/',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data || '/'))
})
