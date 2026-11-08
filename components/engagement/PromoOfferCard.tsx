'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { trackFunnelEvent, getOrCreateSessionId } from '@/lib/funnel'
import { PLANS, PROMO_FIRST_MONTH, formatBRL } from '@/lib/plans'

/** Opens the first-month offer checkout. Resolves with an error message, or redirects. */
export async function startPromoCheckout(source: string): Promise<string> {
  trackFunnelEvent('checkout_started', { planTier: 'promo', source })
  try {
    const res = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planTier: 'promo', sessionId: getOrCreateSessionId() }),
    })
    const data = await res.json()
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl
      return ''
    }
    return data.error || 'Não foi possível abrir o pagamento agora.'
  } catch {
    return 'Sem conexão. Tente novamente.'
  }
}

/** Dark highlight card for /subscription and /unlock. */
export default function PromoOfferCard({ source }: { source: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/[0.12] via-brand-500/[0.08] to-transparent p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
      <div className="flex-1 space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" /> Oferta de boas-vindas
        </span>
        <h2 className="font-display text-2xl font-bold text-white">
          1º mês por {formatBRL(PROMO_FIRST_MONTH.priceCents)}
          <span className="ml-2 text-base font-medium text-surface-500 line-through">{formatBRL(PLANS.pro.priceCents)}</span>
        </h2>
        <p className="text-sm text-surface-400">
          Pagamento único via Pix ou cartão, {PROMO_FIRST_MONTH.accessDays} dias de acesso completo e sem renovação automática. Válido uma vez por conta.
        </p>
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
      <button
        onClick={async () => { setLoading(true); setError(await startPromoCheckout(source)); setLoading(false) }}
        disabled={loading}
        className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 font-bold text-white shadow-[0_0_30px_-8px_rgba(16,185,129,0.7)] hover:bg-emerald-400 disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Aguarde...' : `Quero por ${formatBRL(PROMO_FIRST_MONTH.priceCents)}`}
      </button>
    </div>
  )
}
