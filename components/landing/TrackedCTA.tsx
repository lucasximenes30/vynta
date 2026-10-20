'use client'

import Link from 'next/link'
import { trackFunnelEvent } from '@/lib/funnel'

export default function TrackedCTA({
  href,
  location,
  className,
  children,
  event = 'cta_click',
}: {
  href: string
  location: string
  className?: string
  children: React.ReactNode
  event?: string
}) {
  return (
    <Link href={href} className={className} onClick={() => trackFunnelEvent(event, { location })}>
      {children}
    </Link>
  )
}
