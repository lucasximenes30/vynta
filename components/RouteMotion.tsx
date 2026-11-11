'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/** Animate the existing content without remounting pages or retaining outgoing DOM. */
export default function RouteMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = ref.current?.animate?.([
      { opacity: 0.65, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
    return () => animation?.cancel()
  }, [pathname])
  return <div ref={ref} className="app-route-content">{children}</div>
}
