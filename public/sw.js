/* Vynta service worker: fast shell, 48h offline cache (pages, RSC & GET APIs), Web Push and local offline notifications. */
const STATIC_CACHE = 'vynta-static-v14'
const DATA_CACHE = 'vynta-data-v7'
importScripts('/offline-queue.js')
const CACHE_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours
const PRECACHE = ['/offline', '/manifest.json', '/icons/broto-v2-icon-192.png', '/icons/broto-v2-icon-maskable-192.png', '/icons/broto-badge-96.png', '/sounds/sale-approved.mp3']
const STATIC_RE = /\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico|gif|avif|mp3)$/
const APP_NAV_RE = /^\/(?:dashboard|finances|habits|workout|calendar|goals|notes|reports|settings|cards)(?:\/|$)/

async function stampAndStore(cacheName, key, response, expectedEpoch = accountEpoch) {
  try {
    const headers = new Headers(response.headers)
    // arrayBuffer() is already decoded; retaining wire encoding/length corrupts reconstructed HTML.
    headers.delete('content-encoding')
    headers.delete('content-length')
    headers.delete('transfer-encoding')
    headers.set('x-vynta-cached-at', String(Date.now()))
    const body = await response.clone().arrayBuffer()
    const stamped = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
    const cache = await caches.open(cacheName)
    if (cacheName === DATA_CACHE && expectedEpoch !== accountEpoch) return
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

// ---- Local notification evaluation from cached data (works 100% offline) ----

function listNames(names, max = 2) {
  const shown = names.slice(0, max).join(', ')
  return names.length > max ? `${shown} e mais ${names.length - max}` : shown
}

async function readCachedJsonByPrefix(prefix) {
  try {
    const cache = await caches.open(DATA_CACHE)
    const keys = await cache.keys()
    for (const req of keys) {
      const u = new URL(req.url)
      const pathAndQuery = u.pathname + u.search
      if (pathAndQuery === prefix || pathAndQuery.startsWith(prefix)) {
        const res = await matchFresh(DATA_CACHE, pathAndQuery)
        if (res) return await res.json()
      }
    }
  } catch {}
  return null
}

async function wasLocalNotifSent(key) {
  const hit = await matchFresh(DATA_CACHE, `/__local_notif_sent__/${encodeURIComponent(key)}`)
  return !!hit
}

async function markLocalNotifSent(key) {
  await stampAndStore(DATA_CACHE, `/__local_notif_sent__/${encodeURIComponent(key)}`, new Response('1'))
}

async function showVyntaNotification(payload) {
  const title = payload.title || 'Vynta'
  const options = {
    body: payload.body || '',
    icon: '/icons/broto-v2-icon-192.png',
    badge: '/icons/broto-badge-96.png',
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
    lang: 'pt-BR',
    timestamp: Date.now(),
    sound: payload.sound || undefined,
    data: { url: payload.url || '/dashboard', actions: payload.actions || [], sound: payload.sound || null },
    actions: (payload.actions || []).slice(0, 2).map((a) => ({ action: a.action, title: a.title })),
  }
  await Promise.all([
    self.registration.showNotification(title, options),
    self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(() => {}) : null,
    payload.sound ? (async () => {
      try {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        let playedOnVisibleClient = false
        for (const client of windows) {
          client.postMessage({ type: 'vynta:play-sound', sound: payload.sound })
          if (client.visibilityState === 'visible') playedOnVisibleClient = true
        }
        if (!playedOnVisibleClient) {
          await stampAndStore(DATA_CACHE, '/__pending_sale_sound__', new Response(payload.sound))
        }
      } catch {}
    })() : null,
  ])
}

async function evaluateLocalOfflineNotifications(extraState) {
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return
  try {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`
    const hour = now.getHours()
    const minute = now.getMinutes()
    const nowMin = hour * 60 + minute

    const prefsData = (await readCachedJsonByPrefix('/api/push/preferences')) || {}
    const prefs = {
      bills: prefsData.bills !== false,
      agenda: prefsData.agenda !== false,
      habits: prefsData.habits !== false,
      dailyLog: prefsData.dailyLog !== false,
    }

    const calData = await readCachedJsonByPrefix('/api/calendar/events')
    const events = (calData && Array.isArray(calData.events) ? calData.events : []).filter(
      (e) => e && typeof e.date === 'string' && e.date.slice(0, 10) === todayStr
    )

    const notifData = await readCachedJsonByPrefix('/api/notifications')
    const allNotifs = notifData && Array.isArray(notifData.notifications) ? notifData.notifications : []
    const bills = allNotifs.filter(
      (n) => n && !n.paidAt && n.sourceType !== 'card_limit' && (n.type === 'today' || (n.type === 'upcoming' && n.days === 1) || (n.type === 'late' && n.days <= 3))
    )
    // Fatura do cartão: 7, 3 e 1 dias antes do vencimento (+ no dia) — offline, a partir do cache
    const invoiceBills = allNotifs.filter(
      (n) => n && !n.paidAt && n.sourceType === 'card_bill' &&
        (n.type === 'today' || (n.type === 'upcoming' && (n.days === 1 || n.days === 3 || n.days === 7)))
    )

    // 1) Agenda: upcoming event within the next 60 minutes (06h-23h)
    if (prefs.agenda && hour >= 6 && hour <= 23 && events.length > 0) {
      for (const e of events) {
        if (e.isAllDay || !e.startTime) continue
        const [eh, em] = String(e.startTime).split(':').map(Number)
        if (Number.isNaN(eh) || Number.isNaN(em)) continue
        const diff = eh * 60 + em - nowMin
        if (diff <= 0 || diff > 60) continue
        const key = `event:${e.id}:${e.startTime}:${todayStr}`
        if (await wasLocalNotifSent(key)) continue
        await markLocalNotifSent(key)
        await showVyntaNotification({
          title: e.title,
          body: diff <= 5 ? `Começa agora (${e.startTime})` : `Começa às ${e.startTime} — em ${diff} min`,
          url: '/calendar?source=push',
          tag: `event-${e.id}`,
        })
      }
    }

    // 2) Morning digest (07h-11h): agenda + bills summary once per day
    if (hour >= 7 && hour <= 11 && (prefs.agenda || prefs.bills)) {
      const digestKey = `day-digest:${todayStr}`
      if (!(await wasLocalNotifSent(digestKey))) {
        const parts = []
        let nLate = 0
        let nTodayBills = 0
        const nEvents = events.length

        if (prefs.agenda) {
          parts.push(
            nEvents
              ? `${nEvents === 1 ? '1 compromisso' : `${nEvents} compromissos`}: ${events
                  .map((e) => (e.startTime && !e.isAllDay ? `${e.startTime} ${e.title}` : e.title))
                  .slice(0, 3)
                  .join(', ')}${nEvents > 3 ? ` e mais ${nEvents - 3}` : ''}`
              : 'agenda livre'
          )
        }

        if (prefs.bills) {
          const late = bills.filter((b) => b.type === 'late')
          const todayB = bills.filter((b) => b.type === 'today')
          const tomorrow = bills.filter((b) => b.type === 'upcoming')
          nLate = late.length
          nTodayBills = todayB.length
          if (late.length) parts.push(`${late.length === 1 ? '1 conta atrasada' : `${late.length} contas atrasadas`}: ${listNames(late.map((b) => b.title))}`)
          else if (todayB.length) parts.push(`${todayB.length === 1 ? '1 conta vence hoje' : `${todayB.length} contas vencem hoje`}: ${listNames(todayB.map((b) => b.title))}`)
          else if (tomorrow.length) parts.push(`${tomorrow.length === 1 ? '1 conta vence amanhã' : `${tomorrow.length} contas vencem amanhã`}: ${listNames(tomorrow.map((b) => b.title))}`)
          else parts.push('nenhuma conta vencendo')
        }

        if (parts.length > 0) {
          await markLocalNotifSent(digestKey)
          await showVyntaNotification({
            title: nLate
              ? nLate === 1 ? '1 conta atrasada' : `${nLate} contas atrasadas`
              : nEvents
              ? nEvents === 1 ? '1 compromisso hoje' : `${nEvents} compromissos hoje`
              : nTodayBills
              ? nTodayBills === 1 ? 'Conta vence hoje' : `${nTodayBills} contas vencem hoje`
              : 'Dia livre por aqui',
            body: parts.join(' · '),
            url: nLate || nTodayBills ? '/finances?source=push' : nEvents ? '/calendar?source=push' : '/dashboard?source=push',
            tag: 'day-digest',
          })
        }
      }
    }

    // 2.5) Invoice due reminders (07h-21h): one local notification per slot (7/3/1/0 days)
    if (prefs.bills && hour >= 7 && hour <= 21) {
      for (const n of invoiceBills) {
        const d = n.type === 'today' ? 0 : n.days
        const dueStr = String(n.dueDate || '').slice(0, 10)
        const key = `invoice:${n.sourceTxId || n.id}:${dueStr}:${d}`
        if (await wasLocalNotifSent(key)) continue
        await markLocalNotifSent(key)
        await showVyntaNotification({
          title: n.title,
          body: n.description || '',
          url: '/cards?source=push',
          tag: 'invoice',
        })
      }
    }

    // 3) Evening reminders (19h-22h): pending habits + daily spending log
    if (hour >= 19 && hour <= 22) {
      if (prefs.habits && extraState && Array.isArray(extraState.pendingHabitTitles) && extraState.pendingHabitTitles.length > 0) {
        const habitsKey = `habits:${todayStr}`
        if (!(await wasLocalNotifSent(habitsKey))) {
          const pending = extraState.pendingHabitTitles
          const total = Number(extraState.totalHabits || pending.length)
          const done = Math.max(0, total - pending.length)
          await markLocalNotifSent(habitsKey)
          await showVyntaNotification({
            title: pending.length === 1 ? `Falta 1 hábito hoje: ${pending[0]}` : `Faltam ${pending.length} hábitos hoje`,
            body:
              done > 0
                ? `Você já fez ${done} de ${total}. ${pending.length === 1 ? 'Marque antes de dormir e mantenha a sequência.' : `Falta: ${listNames(pending)}.`}`
                : `${listNames(pending)}. Marque antes de dormir e mantenha a sequência.`,
            url: '/habits?source=push',
            tag: 'habits',
          })
        }
      }

      if (prefs.dailyLog && extraState && extraState.loggedToday === false) {
        const logKey = `daily-log:${todayStr}`
        if (!(await wasLocalNotifSent(logKey))) {
          await markLocalNotifSent(logKey)
          await showVyntaNotification({
            title: 'Gastou algo hoje?',
            body: 'Anote em 5 segundos e feche o dia sabendo exatamente pra onde foi o dinheiro.',
            url: '/dashboard?add=expense&source=push',
            tag: 'daily-log',
            actions: [
              { action: 'expense', title: 'Anotar gasto', url: '/dashboard?add=expense&source=push' },
              { action: 'income', title: 'Anotar entrada', url: '/dashboard?add=income&source=push' },
            ],
          })
        }
      }
    }
  } catch {}
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
        .filter((n) => n.startsWith('vynta-') && n !== STATIC_CACHE && n !== DATA_CACHE && n !== QUEUE_CACHE)
        .map((n) => caches.delete(n))
    )
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'vynta:warm-offline') {
    event.waitUntil(warmOfflinePages())
  } else if (data.type === 'vynta:clear-user-cache') {
    accountEpoch++
    event.waitUntil(Promise.all([caches.delete(DATA_CACHE), caches.open(QUEUE_CACHE).then(c => c.delete(QUEUE_META))]))
  } else if (data.type === 'vynta:show-local-notification' && data.payload) {
    event.waitUntil(showVyntaNotification(data.payload))
  } else if (data.type === 'vynta:evaluate-local-notifications') {
    event.waitUntil(evaluateLocalOfflineNotifications(data.state))
  } else if (data.type === 'vynta:consume-pending-sound') {
    event.waitUntil((async () => {
      try {
        const hit = await matchFresh(DATA_CACHE, '/__pending_sale_sound__')
        if (hit) {
          const sound = await hit.text()
          const cache = await caches.open(DATA_CACHE)
          await cache.delete('/__pending_sale_sound__')
          if (sound && event.source) {
            event.source.postMessage({ type: 'vynta:play-sound', sound })
          }
        }
      } catch {}
    })())
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const epoch = accountEpoch
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  // Wipe user data cache on logout, login or register so accounts never share cached screens.
  if (request.method !== 'GET') {
    if (/^\/api\/auth\/(logout|login|register)\b/.test(url.pathname)) {
      accountEpoch++
      event.waitUntil(Promise.all([caches.delete(DATA_CACHE), caches.open(QUEUE_CACHE).then(c => c.delete(QUEUE_META))]))
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

  // GET API calls (calendar events, notifications, push preferences, habits, notes, goals, etc.):
  // network-first when online, falling back to 48h cache when offline.
  if (url.pathname.startsWith('/api/')) {
    if (/^\/api\/(auth|billing|webhooks|payments|cron)\b/.test(url.pathname)) return
    const cacheKey = url.pathname + url.search
    event.respondWith((async () => {
      try {
        const res = await fetch(request)
        if (res.ok && epoch === accountEpoch) event.waitUntil(stampAndStore(DATA_CACHE, cacheKey, res.clone()))
        if (res.status >= 500) { const cached = await matchFresh(DATA_CACHE, cacheKey); if (cached) return cached }
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
    const rscUrl = new URL(url); rscUrl.searchParams.delete('_rsc')
    const rscKey = `/__rsc__/${encodeURIComponent(rscUrl.pathname + rscUrl.search)}?tree=${encodeURIComponent(request.headers.get('next-router-state-tree') || '')}&prefetch=${request.headers.get('next-router-prefetch') || ''}`
    event.respondWith((async () => {
      try {
        const res = await fetch(request)
        if (res.ok && epoch === accountEpoch && APP_NAV_RE.test(url.pathname)) {
          event.waitUntil(stampAndStore(DATA_CACHE, rscKey, res.clone()))
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
    const pageKey = htmlKey(url.pathname === '/' ? new URL('/dashboard', url) : url)
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse
        const res = preload || (await fetch(request))
        if (res && res.ok && epoch === accountEpoch && APP_NAV_RE.test(url.pathname) && !res.redirected) {
          event.waitUntil(stampAndStore(DATA_CACHE, pageKey, res.clone()))
        }
        return res
      } catch {
        const cachedPage = await matchFresh(DATA_CACHE, pageKey)
        if (cachedPage) return cachedPage

        const staticCached = url.pathname === '/' ? null : await caches.match(request)
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

  // Mark matching key so the offline evaluator doesn't repeat a notification already delivered via Web Push
  const todayStr = new Date().toISOString().slice(0, 10)
  if (data.localKey) event.waitUntil(markLocalNotifSent(data.localKey))
  else if (data.tag === 'day-digest') event.waitUntil(markLocalNotifSent(`day-digest:${todayStr}`))
  else if (data.tag === 'habits') event.waitUntil(markLocalNotifSent(`habits:${todayStr}`))
  else if (data.tag === 'daily-log') event.waitUntil(markLocalNotifSent(`daily-log:${todayStr}`))

  event.waitUntil(showVyntaNotification(data))
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
      appClient.postMessage({ type: 'vynta:navigate', url: target.pathname + target.search, sound: data.sound || null })
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

function htmlKey(url) { return `/__html__/${encodeURIComponent(normalizePageKey(url))}` }
let warming = null
function warmOfflinePages() {
  if (warming) return warming
  warming = (async () => {
    const owner = await bindQueueOwner()
    const epoch = accountEpoch
    const staticCache = await caches.open(STATIC_CACHE)
    for (const path of ['/dashboard', '/finances', '/habits', '/calendar', '/notes', '/goals', '/workout', '/cards', '/reports', '/settings', '/settings/help']) {
      if (epoch !== accountEpoch) return
      try {
        const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
        if (!response.ok || response.redirected || !response.headers.get('content-type')?.includes('text/html')) continue
        const html = await response.clone().text()
        const assets = [...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(m => m[1].replaceAll('&amp;', '&'))
        await Promise.all([...new Set(assets)].map(async asset => {
          const url = new URL(asset, self.location.origin)
          if (url.origin !== self.location.origin || await staticCache.match(url)) return
          const res = await fetch(url)
          if (res.ok) await staticCache.put(url, res)
        }))
        if (epoch === accountEpoch && (await queueOwner())?.id === owner) await stampAndStore(DATA_CACHE, htmlKey(new URL(path, self.location.origin)), response)
      } catch {}
    }
    const now = new Date()
    const period = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(now)
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    start.setDate(start.getDate() - start.getDay())
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    end.setDate(end.getDate() + 6 - end.getDay())
    const apiUrls = ['/api/categories', '/api/habits', '/api/notes', '/api/goals', '/api/notifications', '/api/push/preferences', '/api/transactions/suggestions', `/api/reports/advanced?period=${period}`, `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`]
    for (const url of apiUrls) {
      if (epoch !== accountEpoch) return
      try {
        const res = await fetch(url, { credentials: 'same-origin' })
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) await stampAndStore(DATA_CACHE, url, res, epoch)
      } catch {}
    }
    // Lazy modals and feature chunks must also be available after an offline cold start.
    try {
      const manifest = await fetch('/offline-assets.json', { cache: 'no-store' })
      if (manifest.ok) for (const asset of await manifest.json()) {
        if (!asset.startsWith('/_next/static/') || await staticCache.match(asset)) continue
        const res = await fetch(asset)
        if (res.ok) await staticCache.put(asset, res)
      }
    } catch {}
    for (const client of await self.clients.matchAll({type:'window'})) client.postMessage({type:'vynta:offline-ready'})
  })().finally(() => { warming = null })
  return warming
}
