'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { enqueueMutation, syncQueue } from '@/lib/quickAdd'

const NON_QUEUEABLE_API_RE = /^\/api\/(auth|billing|payments|webhooks|cron|track|export|insights|reports|admin)\b/

/**
 * Synthesizes an optimistic 200 JSON response when the device is offline so client screens
 * (Habits, Calendar, Notes, Goals, Finances, Cards, Workout) can keep working seamlessly while
 * the mutation is queued in localStorage and replayed automatically once connectivity returns.
 */
function buildOptimisticOfflineResponse(pathname: string, method: string, rawBody?: string): Response {
  let parsed: Record<string, any> = {}
  if (rawBody) {
    try { parsed = JSON.parse(rawBody) } catch {}
  }
  const nowIso = new Date().toISOString()
  const localId = `offline-${crypto.randomUUID()}`

  let payload: Record<string, any> = { success: true, offlineQueued: true, id: localId }

  if (pathname === '/api/habits/checkin') {
    payload = {
      offlineQueued: true,
      checkin: { habitId: parsed.habitId, date: parsed.date, completed: !!parsed.completed },
    }
  } else if (pathname.startsWith('/api/habits')) {
    payload = {
      offlineQueued: true,
      habit: {
        id: localId,
        title: parsed.title || 'Novo hábito',
        description: parsed.description,
        icon: parsed.icon || 'Target',
        color: parsed.color || 'blue',
        order: 99,
        currentStreak: 0,
        bestStreak: 0,
        createdAt: nowIso,
        ...parsed,
      },
    }
  } else if (pathname.startsWith('/api/calendar/events')) {
    payload = {
      offlineQueued: true,
      id: localId,
      title: parsed.title || 'Compromisso',
      description: parsed.description || '',
      date: parsed.date ? (String(parsed.date).includes('T') ? parsed.date : `${parsed.date}T00:00:00.000Z`) : nowIso,
      startTime: parsed.startTime || '',
      endTime: parsed.endTime || '',
      isAllDay: !!parsed.isAllDay,
      category: parsed.category || 'Pessoal',
      color: parsed.color || 'bg-brand-500',
    }
  } else if (pathname.startsWith('/api/notes')) {
    payload = {
      offlineQueued: true,
      id: localId,
      title: parsed.title || '',
      content: parsed.content || '',
      category: parsed.category || '',
      color: parsed.color || 'default',
      isPinned: !!parsed.isPinned,
      createdAt: nowIso,
      updatedAt: nowIso,
    }
  } else if (pathname.startsWith('/api/goals')) {
    payload = {
      offlineQueued: true,
      id: localId,
      title: parsed.title || 'Nova meta',
      targetAmount: parsed.targetAmount ?? 0,
      currentAmount: parsed.currentAmount ?? 0,
      deadline: parsed.deadline || null,
      category: parsed.category || 'Geral',
      description: parsed.description || '',
      color: parsed.color || 'bg-brand-500',
      icon: parsed.icon || 'Target',
      transactions: [],
    }
  } else if (pathname.startsWith('/api/transactions')) {
    payload = {
      success: true,
      offlineQueued: true,
      transaction: {
        id: localId,
        title: parsed.title || 'Lançamento',
        amount: String(parsed.amount ?? 0),
        type: parsed.type || 'EXPENSE',
        category: parsed.category || 'General',
        date: parsed.date || nowIso,
      },
    }
  } else if (pathname === '/api/push/preferences') {
    payload = {
      offlineQueued: true,
      bills: parsed.bills ?? true,
      agenda: parsed.agenda ?? true,
      habits: parsed.habits ?? true,
      dailyLog: parsed.dailyLog ?? true,
    }
  } else if (pathname === '/api/cards/import') {
    payload = {
      success: true,
      offlineQueued: true,
      imported: Array.isArray(parsed.items) ? parsed.items.length : 0,
      skippedDuplicates: 0,
      limitAmount: null,
      card: parsed.card
        ? {
            id: parsed.cardId || localId,
            name: parsed.card.name || 'Cartão',
            lastFourDigits: parsed.card.lastFourDigits || '0000',
            dueDay: parsed.card.dueDay || 1,
            closingDay: parsed.card.closingDay || 1,
            color: parsed.card.color || 'purple',
            limitAmount: '0',
            provider: parsed.card.provider || 'nubank',
            createdAt: nowIso,
          }
        : null,
    }
  } else if (pathname.startsWith('/api/cards')) {
    payload = {
      success: true,
      offlineQueued: true,
      card: {
        id: parsed.cardId || localId,
        name: parsed.name || 'Cartão',
        lastFourDigits: parsed.lastFourDigits || '0000',
        dueDay: parsed.dueDay || 1,
        closingDay: parsed.closingDay || 1,
        color: parsed.color || 'blue',
        limitAmount: String(parsed.limitAmount ?? 0),
        provider: parsed.provider ?? null,
        createdAt: nowIso,
      },
    }
  } else if (pathname === '/api/notifications') {
    payload = {
      success: true,
      offlineQueued: true,
    }
  }

  return new Response(JSON.stringify(payload), {
    status: method === 'POST' ? 201 : 200,
    headers: { 'Content-Type': 'application/json', 'x-vynta-offline-queued': '1' },
  })
}

/**
 * 1) Marks the Next client router cache dirty after any successful non-GET `/api/*` call and
 *    triggers `router.refresh()` on the next screen change (or after offline queue replay).
 * 2) When offline, intercepts user mutations (POST/PUT/PATCH/DELETE to `/api/*`), queues them
 *    in localStorage (up to 48h) and returns an optimistic response so the UI keeps working.
 * 3) Pre-warms main app routes into the Service Worker 48h cache while idle so the user can
 *    open the PWA offline and navigate across Dashboard, Finanças, Hábitos, Agenda, Notas, Metas.
 */
export default function RouterCacheSync() {
  const router = useRouter()
  const pathname = usePathname()
  const dirty = useRef(false)

  useEffect(() => {
    const originalFetch = window.fetch
    const patched: typeof fetch = async (input, init) => {
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
      const isSyncReplay =
        init?.headers &&
        ((init.headers instanceof Headers && init.headers.get('x-vynta-sync') === '1') ||
          (typeof init.headers === 'object' && !Array.isArray(init.headers) && (init.headers as Record<string, string>)['x-vynta-sync'] === '1'))

      let parsedUrl: URL | null = null
      try {
        parsedUrl = new URL(input instanceof Request ? input.url : String(input), window.location.href)
      } catch {}

      const isQueueableMutation =
        !isSyncReplay &&
        method !== 'GET' &&
        method !== 'HEAD' &&
        parsedUrl &&
        parsedUrl.origin === window.location.origin &&
        parsedUrl.pathname.startsWith('/api/') &&
        !NON_QUEUEABLE_API_RE.test(parsedUrl.pathname) &&
        !(parsedUrl.pathname.startsWith('/api/push/') && parsedUrl.pathname !== '/api/push/preferences')

      const rawBody = typeof init?.body === 'string' ? init.body : undefined

      if (isQueueableMutation && !navigator.onLine && parsedUrl) {
        enqueueMutation({ url: parsedUrl.pathname + parsedUrl.search, method, body: rawBody })
        dirty.current = true
        return buildOptimisticOfflineResponse(parsedUrl.pathname, method, rawBody)
      }

      try {
        const res = await originalFetch(input, init)
        if (method !== 'GET' && method !== 'HEAD' && res.ok && parsedUrl) {
          if (parsedUrl.origin === window.location.origin && parsedUrl.pathname.startsWith('/api/') && !/^\/api\/(track|push)\b/.test(parsedUrl.pathname)) {
            dirty.current = true
          }
        }
        return res
      } catch (err) {
        if (isQueueableMutation && parsedUrl) {
          enqueueMutation({ url: parsedUrl.pathname + parsedUrl.search, method, body: rawBody })
          dirty.current = true
          return buildOptimisticOfflineResponse(parsedUrl.pathname, method, rawBody)
        }
        throw err
      }
    }
    window.fetch = patched

    const onOnline = async () => {
      const synced = await syncQueue()
      if (synced > 0) router.refresh()
    }
    window.addEventListener('online', onOnline)

    // Warm the Service Worker's 48h HTML + API cache for the main screens in the background
    const warmOfflineCache = () => {
      if (!navigator.onLine) return
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
      const urls = [
        '/dashboard',
        '/finances',
        '/habits',
        '/calendar',
        '/notes',
        '/goals',
        '/workout',
        '/cards',
        `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
        '/api/notifications',
        '/api/push/preferences',
        '/api/habits',
        '/api/notes',
        '/api/goals',
        '/api/transactions/suggestions',
      ]
      urls.forEach((u, i) => {
        setTimeout(() => {
          if (navigator.onLine) originalFetch(u, { credentials: 'same-origin' }).catch(() => {})
        }, 1200 + i * 350)
      })
    }

    let warmTimer: ReturnType<typeof setTimeout> | undefined
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(warmOfflineCache)
    } else {
      warmTimer = setTimeout(warmOfflineCache, 2500)
    }

    return () => {
      if (warmTimer) clearTimeout(warmTimer)
      window.removeEventListener('online', onOnline)
      if (window.fetch === patched) window.fetch = originalFetch
    }
  }, [router])

  useEffect(() => {
    if (!dirty.current || !navigator.onLine) return
    dirty.current = false
    router.refresh()
  }, [pathname, router])

  return null
}
