'use client'

import { useCallback, useEffect, useState } from 'react'
import { PUSH_CHANGED_EVENT, disablePush, enablePush, getPushState, type PushState } from '@/lib/push'

export function usePushState() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const refresh = () => getPushState().then(setState).catch(() => {})
    refresh()
    window.addEventListener(PUSH_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PUSH_CHANGED_EVENT, refresh)
  }, [])

  const run = useCallback(async (fn: () => Promise<PushState>) => {
    setBusy(true)
    setError('')
    try {
      const next = await fn()
      setState(next)
      return next
    } catch (err: any) {
      setError(err?.message || 'Não foi possível concluir. Tente novamente.')
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  return {
    state,
    busy,
    error,
    enable: () => run(enablePush),
    disable: () => run(disablePush),
  }
}

export async function sendTestPush(): Promise<string | null> {
  try {
    if (!navigator.onLine && 'serviceWorker' in navigator && Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker.ready
      reg.active?.postMessage({
        type: 'vynta:show-local-notification',
        payload: {
          title: 'Vynta (modo offline)',
          body: 'As notificações locais estão ativas neste aparelho mesmo sem internet.',
          url: '/dashboard',
          tag: 'vynta-test',
        },
      })
      return null
    }
    const res = await fetch('/api/push/test', { method: 'POST' })
    if (res.ok) return null
    const data = await res.json().catch(() => ({}))
    return data.error || 'Não foi possível enviar o teste.'
  } catch {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker.ready
      reg.active?.postMessage({
        type: 'vynta:show-local-notification',
        payload: {
          title: 'Vynta (modo offline)',
          body: 'As notificações locais estão ativas neste aparelho mesmo sem internet.',
          url: '/dashboard',
          tag: 'vynta-test',
        },
      })
      return null
    }
    return 'Não foi possível enviar o teste.'
  }
}
