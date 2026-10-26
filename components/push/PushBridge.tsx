'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { openQuickAdd } from '@/lib/quickAdd'
import { syncPushSubscription } from '@/lib/push'

/**
 * Glue between the service worker and the open app: tapping a notification while the PWA is
 * running navigates client-side (no reload), `?add=` opens the quick-add sheet, the app icon
 * badge is cleared once the user is looking at the app, and the push subscription stays synced.
 */
export default function PushBridge() {
  const router = useRouter()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'vynta:navigate' || typeof event.data.url !== 'string') return
      const url = new URL(event.data.url, window.location.origin)
      if (url.origin !== window.location.origin) return
      const add = url.searchParams.get('add')
      url.searchParams.delete('add')
      router.push(url.pathname + url.search)
      if (add === 'expense' || add === 'income') openQuickAdd(add === 'income' ? 'INCOME' : 'EXPENSE')
    }

    const clearBadge = () => {
      if (document.visibilityState === 'visible') (navigator as any).clearAppBadge?.().catch?.(() => {})
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    document.addEventListener('visibilitychange', clearBadge)
    clearBadge()

    const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb) : setTimeout(cb, 3000))
    idle(() => { syncPushSubscription() })

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      document.removeEventListener('visibilitychange', clearBadge)
    }
  }, [router])

  return null
}
