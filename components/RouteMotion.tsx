'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/** Keep the shell stable and fade new content without remounting pages.
 * No transform on this ancestor: mobile fixed sheets must stay relative to the viewport. */
export default function RouteMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = ref.current?.animate?.([
      { opacity: 0.5 },
      { opacity: 1 },
    ], { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
    return () => animation?.cancel()
  }, [pathname])
  return <div ref={ref} className="app-route-content">{children}</div>
}
