'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { enqueueMutation, syncQueue, offlineQueueRequest } from '@/lib/quickAdd'
import { API_MUTATION_EVENT } from '@/lib/tour'

const QUEUEABLE_API_RE = /^\/api\/(?:transactions(?:\/[a-f0-9-]+)?|habits(?:\/checkin|\/[a-f0-9-]+)?|notes(?:\/[a-f0-9-]+)?|goals(?:\/[a-f0-9-]+)?|calendar\/events(?:\/[a-f0-9-]+)?)$/i
const NON_QUEUEABLE_API_RE = /^\/api\/(auth|billing|payments|webhooks|cron|track|export|insights|reports|admin)\b/

/** Return an optimistic response only after a supported mutation has been durably saved. */
function buildOptimisticOfflineResponse(pathname: string, method: string, rawBody?: string, localId = crypto.randomUUID()): Response {
  let parsed: Record<string, any> = {}
  if (rawBody) {
    try { parsed = JSON.parse(rawBody) } catch {}
  }
  const nowIso = new Date().toISOString()

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
        category: parsed.category || 'Geral',
        date: parsed.date || nowIso,
      },
    }
  }

  return new Response(JSON.stringify(payload), {
    status: method === 'POST' ? 201 : 200,
    headers: { 'Content-Type': 'application/json', 'x-vynta-offline-queued': '1' },
  })
}

/** Refresh changed routes, queue supported offline writes and prepare HTML/assets through the worker. */
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
        QUEUEABLE_API_RE.test(parsedUrl.pathname) &&
        !NON_QUEUEABLE_API_RE.test(parsedUrl.pathname) &&
        !(parsedUrl.pathname.startsWith('/api/push/') && parsedUrl.pathname !== '/api/push/preferences')

      const rawBody = typeof init?.body === 'string' ? init.body : input instanceof Request && !['GET','HEAD'].includes(method) ? await input.clone().text() : undefined
      const mutationId = crypto.randomUUID()
      let bodyData: Record<string, unknown> = {}
      try { bodyData = rawBody ? JSON.parse(rawBody) : {} } catch {}
      const canQueue = isQueueableMutation && !bodyData.goalId && (method !== 'POST' || ['/api/transactions', '/api/habits', '/api/habits/checkin', '/api/notes', '/api/goals', '/api/calendar/events'].includes(parsedUrl!.pathname))
      const saveOffline = async () => {
        await enqueueMutation({ url: parsedUrl!.pathname + parsedUrl!.search, method, body: rawBody, localId: mutationId })
        dirty.current = true
        return buildOptimisticOfflineResponse(parsedUrl!.pathname, method, rawBody, mutationId)
      }
      if (canQueue) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
        headers.set('x-vynta-mutation-id', mutationId)
        init = { ...init, headers }
      }

      if (canQueue && !navigator.onLine) return saveOffline()

      try {
        const res = await originalFetch(input, init)
        if (method !== 'GET' && method !== 'HEAD' && res.ok && parsedUrl) {
          if (parsedUrl.origin === window.location.origin) {
            window.dispatchEvent(new CustomEvent(API_MUTATION_EVENT, { detail: { path: parsedUrl.pathname, method } }))
          }
          if (parsedUrl.origin === window.location.origin && parsedUrl.pathname.startsWith('/api/') && !/^\/api\/(track|push)\b/.test(parsedUrl.pathname)) {
            dirty.current = true
          }
        }
        return res
      } catch (err) {
        if (canQueue && !(err instanceof DOMException && err.name === 'AbortError')) return saveOffline()
        throw err
      }
    }
    window.fetch = patched

    const onOnline = async () => {
      const synced = await syncQueue().catch(() => 0)
      if (synced > 0) router.refresh()
    }
    window.addEventListener('online', onOnline)

    let cancelled = false
    const warmOfflineCache = async () => {
      if (!navigator.onLine || !('serviceWorker' in navigator)) return
      try {
        const registration = await navigator.serviceWorker.ready
        if (cancelled) return
        await offlineQueueRequest('bind')
        ;(navigator.serviceWorker.controller || registration.active)?.postMessage({ type: 'vynta:warm-offline' })
      } catch {}
    }
    const warmTimer = setTimeout(warmOfflineCache, 1500)
    const onController = () => { void warmOfflineCache() }
    navigator.serviceWorker?.addEventListener('controllerchange', onController)
    window.addEventListener('online', onController)
    const onOfflineNavigation = (event: MouseEvent) => {
      if (navigator.onLine || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href)
      if (url.origin !== location.origin || !/^\/(dashboard|finances|habits|calendar|notes|goals|workout|cards|reports|settings)(\/|$)/.test(url.pathname)) return
      event.preventDefault(); event.stopPropagation(); location.assign(url.href)
    }
    document.addEventListener('click', onOfflineNavigation, true)

    return () => {
      cancelled = true
      clearTimeout(warmTimer)
      navigator.serviceWorker?.removeEventListener('controllerchange', onController)
      window.removeEventListener('online', onController)
      document.removeEventListener('click', onOfflineNavigation, true)
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
