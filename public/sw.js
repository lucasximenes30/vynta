/* Vynta service worker: fast shell, 48h offline cache (pages, RSC & GET APIs) and Web Push. */
const STATIC_CACHE = 'vynta-static-v5'
const DATA_CACHE = 'vynta-data-v5'
const CACHE_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours
const PRECACHE = ['/', '/offline', '/manifest.json', '/icons/icon-192.png', '/icons/icon-maskable-192.png', '/icons/badge-96.png']
const STATIC_RE = /\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico|gif|avif)$/
const APP_NAV_RE = /^\/(?:dashboard|finances|habits|workout|calendar|goals|notes|reports|settings|cards)(?:\/|$)/

function buildColdStartShellResponse(targetUrl) {
  const html = `<!doctype html><html lang="pt-BR" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#050505"><title>Vynta</title><style>html,body{margin:0;height:100%;background:#07080c;color:#f1f3f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}.wrap{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:radial-gradient(ellipse at top,rgba(66,88,249,.24),transparent 60%),#07080c}.ring{position:relative;width:76px;height:76px;display:flex;align-items:center;justify-content:center}.spin{position:absolute;inset:-6px;border-radius:24px;border:2px solid rgba(99,127,253,.18);border-top-color:#637ffd;animation:s .85s linear infinite}img{width:64px;height:64px;border-radius:18px;box-shadow:0 12px 32px rgba(48,64,235,.35);animation:p 1.5s ease-in-out infinite}.t{font-size:18px;font-weight:700;letter-spacing:-.01em;text-align:center}.sub{font-size:12px;color:#8f93a1;margin-top:4px;text-align:center}@keyframes s{to{transform:rotate(360deg)}}@keyframes p{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}</style></head><body><div class="wrap"><div class="ring"><div class="spin"></div><img src="/icons/icon-192.png" alt=""></div><div><div class="t">Vynta</div><div class="sub">Abrindo seu painel…</div></div></div><script>window.location.replace(${JSON.stringify(targetUrl)});</script></body></html>`
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function stampAndStore(cacheName, key, response) {
  try {
    const headers = new Headers(response.headers)
    headers.set('x-vynta-cached-at', String(Date.now()))
    const body = await response.clone().arrayBuffer()
    const stamped = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
    const cache = await caches.open(cacheName)
    await cache.put(key, stamped)
  } catch {}
}

async function matchFresh(cacheName, key) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(key)
  if (!hit) return null
  const ts = Number(hit.headers.get('x-vynta-cached-at') || 0)
  if (ts && Date.now() - ts > CACHE_TTL_MS) {
    cache.delete(key).catch(() => {})
    return null
  }
  return hit
}

function normalizePageKey(url) {
  const u = new URL(url.href)
  u.searchParams.delete('source')
  u.searchParams.delete('add')
  return u.pathname + u.search
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(
      names
        .filter((n) => n !== STATIC_CACHE && n !== DATA_CACHE)
        .map((n) => caches.delete(n))
    )
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'vynta:clear-user-cache') {
    event.waitUntil(caches.delete(DATA_CACHE))
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  // Wipe user data cache on logout, login or register so accounts never share cached screens.
  if (request.method !== 'GET') {
    if (/^\/api\/auth\/(logout|login|register)\b/.test(url.pathname)) {
      event.waitUntil(caches.delete(DATA_CACHE))
    }
    return
  }

  // App icons and public images: cache-first.
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy))
        }
        return res
      }))
    )
    return
  }

  // Next.js build assets are content-hashed: cache-first makes cold starts and offline work.
  if (url.pathname.startsWith('/_next/static/') || STATIC_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy))
          }
          return res
        })
      })
    )
    return
  }

  // GET API calls (calendar events, notes, goals, monthly summaries, etc.):
  // network-first when online, falling back to 48h cache when offline.
  if (url.pathname.startsWith('/api/')) {
    if (/^\/api\/(auth|billing|webhooks|payments|cron)\b/.test(url.pathname)) return
    const cacheKey = url.pathname + url.search
    event.respondWith((async () => {
      try {
        const res = await fetch(request)
        if (res.ok) stampAndStore(DATA_CACHE, cacheKey, res)
        return res
      } catch {
        const cached = await matchFresh(DATA_CACHE, cacheKey)
        if (cached) return cached
        return new Response(JSON.stringify({ offline: true, error: 'Sem conexão' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    })())
    return
  }

  // RSC payloads (client-side tab switches & router.prefetch): network-first + 48h cache fallback
  // so switching between Dashboard, Finanças, Hábitos, Agenda, Notas, Metas works offline.
  if (request.headers.get('rsc') === '1' || url.searchParams.has('_rsc')) {
    const rscKey = `rsc:${url.pathname}`
    event.respondWith((async () => {
      try {
        const res = await fetch(request)
        if (res.ok && APP_NAV_RE.test(url.pathname)) {
          stampAndStore(DATA_CACHE, rscKey, res)
        }
        return res
      } catch {
        const cached = await matchFresh(DATA_CACHE, rscKey)
        if (cached) return cached
        throw new Error('offline')
      }
    })())
    return
  }

  // Full page loads (PWA cold start / reload):
  if (request.mode === 'navigate') {
    const src = url.searchParams.get('source')
    if ((src === 'pwa' || src === 'shortcut') && APP_NAV_RE.test(url.pathname)) {
      const clean = new URL(url.href)
      clean.searchParams.delete('source')
      const cleanUrl = clean.pathname + clean.search
      event.respondWith((async () => {
        // If offline or we already have a fresh (<48h) cached HTML for this screen, serve it
        // or the instant boot shell; when online, the boot shell shows in <10ms and navigates.
        if (!self.navigator.onLine) {
          const cached = (await matchFresh(DATA_CACHE, `html:${clean.pathname}`)) || (await matchFresh(DATA_CACHE, 'html:/dashboard'))
          if (cached) return cached
        }
        return buildColdStartShellResponse(cleanUrl)
      })())
      return
    }

    const pageKey = `html:${normalizePageKey(url)}`
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse
        const res = preload || (await fetch(request))
        if (res && res.ok && APP_NAV_RE.test(url.pathname) && !res.redirected) {
          stampAndStore(DATA_CACHE, pageKey, res)
        }
        return res
      } catch {
        const cachedPage =
          (await matchFresh(DATA_CACHE, pageKey)) ||
          (await matchFresh(DATA_CACHE, `html:${url.pathname}`)) ||
          (APP_NAV_RE.test(url.pathname) ? await matchFresh(DATA_CACHE, 'html:/dashboard') : null)
        if (cachedPage) return cachedPage

        const staticCached = await caches.match(request)
        if (staticCached) return staticCached

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
