'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { trackFunnelEvent } from '@/lib/funnel'
import { TRIAL_DAYS } from '@/lib/plans'

// Mobile-only CTA bar that appears after the hero leaves the viewport.
export default function StickyMobileCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 720)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-brand-900/10 bg-[#f7f8f2]/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <Link
        href="/register"
        onClick={() => trackFunnelEvent('cta_click', { location: 'sticky_mobile' })}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_30px_-8px_rgba(41,78,72,0.3)] active:scale-[0.98]"
      >
        Testar {TRIAL_DAYS} dias grátis
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-1.5 text-center text-[11px] text-brand-900/70"><span className="font-semibold text-brand-900">{TRIAL_DAYS} dias grátis.</span> Sem cartão. Sem cobrança automática.</p>
    </div>
  )
}
