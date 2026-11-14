'use client'

import { useLinkStatus } from 'next/link'

/** Real navigation state, including cancellation. CSS delays the hint to avoid
 * flashing on cached routes. Must be rendered inside its Next Link. */
export default function NavigationHint({ label }: { label: string }) {
  const { pending } = useLinkStatus()
  return <>
    <span aria-hidden className="navigation-hint" data-pending={pending} />
    <span role="status" className="sr-only">{pending ? `Abrindo ${label}…` : ''}</span>
  </>
}
