/* Vynta service worker: fast shell, graceful offline and Web Push. User data is never cached. */
const VERSION = 'vynta-sw-v3'
const PRECACHE = ['/', '/offline', '/manifest.json', '/icons/icon-192.png', '/icons/icon-maskable-192.png', '/icons/badge-96.png']
const STATIC_RE = /\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico|gif|avif)$/

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE).catch(() => {})))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)))
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never touch auth, APIs or server actions; third-party stays network-only.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // App icons and public images: cache-first (they are versioned or immutable enough).
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(request, copy))
        }
        return res
      }))
    )
    return
  }

  // Next.js build assets are content-hashed: cache-first is safe and makes the app start instantly.
  if (url.pathname.startsWith('/_next/static/') || STATIC_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(VERSION).then((c) => c.put(request, copy))
          }
          return res
        })
      })
    )
    return
  }

  // RSC / data fetches inside an already-loaded page: network-only, no offline HTML.
  if (request.headers.get('rsc') === '1' || url.searchParams.has('_rsc')) return

  // Full page loads: preload → network; fall back to the cached page, then to /offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse
        if (preload) return preload
        return await fetch(request)
      } catch {
        const cached = await caches.match(request)
        if (cached) return cached
        const landing = await caches.match('/')
        if (landing && new URL(request.referrer || self.location.origin).origin === self.location.origin) {
          const off = await caches.match('/offline')
          if (off) return off
          return landing
        }
        const off = await caches.match('/offline')
        return off || new Response('Offline', { status: 503, statusText: 'Offline' })
      }
    })())
  }
})

// ---- Web Push: works with the app closed, the SW is woken up by the push service ----

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data && event.data.text() } }

  const title = data.title || 'Vynta'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    lang: 'pt-BR',
    timestamp: Date.now(),
    data: { url: data.url || '/dashboard', actions: data.actions || [] },
    actions: (data.actions || []).slice(0, 2).map((a) => ({ action: a.action, title: a.title })),
  }

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(() => {}) : null,
  ]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const action = (data.actions || []).find((a) => a.action === event.action)
  const target = new URL((action && action.url) || data.url || '/dashboard', self.location.origin)
  if (target.origin !== self.location.origin) return

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const sameOrigin = windows.filter((c) => new URL(c.url).origin === self.location.origin)
    // Screens inside the app shell listen for this message and navigate client-side (instant).
    const appClient = sameOrigin.find((c) => !/^\/(?:$|login|register|offline|esqueci-a-senha|admin|unlock|sucesso)/.test(new URL(c.url).pathname))
    if (appClient) {
      await appClient.focus()
      appClient.postMessage({ type: 'vynta:navigate', url: target.pathname + target.search })
      return
    }
    const other = sameOrigin[0]
    if (other) {
      try {
        await other.focus()
        if (await other.navigate(target.href)) return
      } catch {}
    }
    await self.clients.openWindow(target.href)
  })())
})

// Browser rotated the subscription (expired keys etc.): re-subscribe and tell the server.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const options = event.oldSubscription && event.oldSubscription.options
    if (!options || !options.applicationServerKey) return
    const sub = event.newSubscription || await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: options.applicationServerKey,
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })
  })())
})
