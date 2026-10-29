'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { openQuickAdd, readQueue, readMutationQueue } from '@/lib/quickAdd'
import { syncPushSubscription } from '@/lib/push'

/**
 * Glue between the service worker and the open app:
 * - tapping a notification while the PWA is running navigates client-side (no reload);
 * - `?add=` opens the quick-add sheet;
 * - clears the app icon badge once the user is looking at the app;
 * - keeps the Web Push subscription synced when online;
 * - periodically triggers the Service Worker's local notification evaluator when offline (or when
 *   push cron hasn't fired yet) so upcoming agenda events, morning digests, pending habits and
 *   evening spending reminders still fire on the device even with no internet connection.
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

    const runLocalNotificationCheck = async () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      try {
        const reg = await navigator.serviceWorker.ready
        if (!reg.active) return

        const now = new Date()
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

        // Gather pending habits & whether the user logged a transaction today (including offline queue)
        let pendingHabitTitles: string[] | undefined
        let totalHabits: number | undefined
        try {
          const habitsRes = await fetch('/api/habits')
          if (habitsRes.ok) {
            const data = await habitsRes.json()
            if (Array.isArray(data?.habits)) {
              const queuedCheckins = new Map<string, boolean>()
              for (const m of readMutationQueue()) {
                if (m.url === '/api/habits/checkin' && m.body) {
                  try {
                    const b = JSON.parse(m.body)
                    if (b.date === todayStr) queuedCheckins.set(b.habitId, !!b.completed)
                  } catch {}
                }
              }
              totalHabits = data.habits.length
              pendingHabitTitles = data.habits
                .filter((h: any) => {
                  if (queuedCheckins.has(h.id)) return !queuedCheckins.get(h.id)
                  return (h.currentStreak ?? 0) === 0
                })
                .map((h: any) => h.title)
            }
          }
        } catch {}

        const queuedTodayTx = readQueue().some((q) => q.date.slice(0, 10) === todayStr || new Date(q.queuedAt).toISOString().slice(0, 10) === todayStr)

        reg.active.postMessage({
          type: 'vynta:evaluate-local-notifications',
          state: {
            pendingHabitTitles,
            totalHabits,
            loggedToday: queuedTodayTx ? true : undefined,
          },
        })
      } catch {}
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    document.addEventListener('visibilitychange', clearBadge)
    clearBadge()

    const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb) : setTimeout(cb, 3000))
    idle(() => {
      syncPushSubscription()
      runLocalNotificationCheck()
    })

    // Check every 60s so "compromisso em X min" and morning/evening slots trigger even while offline
    const interval = setInterval(runLocalNotificationCheck, 60 * 1000)

    return () => {
      clearInterval(interval)
      navigator.serviceWorker.removeEventListener('message', onMessage)
      document.removeEventListener('visibilitychange', clearBadge)
    }
  }, [router])

  return null
}
