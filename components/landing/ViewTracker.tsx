'use client'

import { useEffect, useRef } from 'react'
import { trackFunnelEvent } from '@/lib/funnel'

// Fires a funnel event once when the marker scrolls into view.
export default function ViewTracker({ eventName, metadata }: { eventName: string; metadata?: Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackFunnelEvent(eventName, metadata)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [eventName, metadata])

  return <div ref={ref} aria-hidden className="pointer-events-none h-px w-full" />
}
