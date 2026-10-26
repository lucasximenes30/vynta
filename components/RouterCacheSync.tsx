'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * The client router keeps visited screens for 30s (`experimental.staleTimes.dynamic`), so going
 * back and forth between tabs is instant. Mutations in this app mostly go through `fetch('/api/…')`
 * (not server actions), which Next can't see — so any successful non-GET API call marks the cache
 * dirty and the next screen change revalidates it in the background (stale-while-revalidate).
 */
export default function RouterCacheSync() {
  const router = useRouter()
  const pathname = usePathname()
  const dirty = useRef(false)

  useEffect(() => {
    const originalFetch = window.fetch
    const patched: typeof fetch = async (input, init) => {
      const res = await originalFetch(input, init)
      try {
        const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
        if (method !== 'GET' && method !== 'HEAD' && res.ok) {
          const url = new URL(input instanceof Request ? input.url : String(input), window.location.href)
          if (url.origin === window.location.origin && url.pathname.startsWith('/api/') && !/^\/api\/(track|push)\b/.test(url.pathname)) {
            dirty.current = true
          }
        }
      } catch {}
      return res
    }
    window.fetch = patched
    return () => {
      if (window.fetch === patched) window.fetch = originalFetch
    }
  }, [])

  useEffect(() => {
    if (!dirty.current) return
    dirty.current = false
    router.refresh()
  }, [pathname, router])

  return null
}
