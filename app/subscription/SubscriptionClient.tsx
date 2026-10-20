'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Zap } from 'lucide-react'
import { JWTPayload } from '@/lib/auth'
import FunnelTracker from '@/components/FunnelTracker'
import { trackFunnelEvent, getOrCreateSessionId } from '@/lib/funnel'
import {
  PLANS,
  PLAN_FEATURES,
  formatBRL,
  YEARLY_DISCOUNT_PERCENT,
  YEARLY_MONTHLY_EQUIVALENT_CENTS,
  YEARLY_SAVINGS_CENTS,
  type BillingTier,
} from '@/lib/plans'

interface SubscriptionClientProps {
  session: JWTPayload
}

export default function SubscriptionClient({ session }: SubscriptionClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUpgrade = async (tier: BillingTier) => {
    trackFunnelEvent('checkout_started', { planTier: tier })
    setLoading(true)
    setError('')

    try {
      trackFunnelEvent('payment_attempted', { planTier: tier })
      const sessionId = getOrCreateSessionId()

      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: tier, sessionId }),
      })
      const data = await res.json()

      if (!data.ok || data.error) {
        setError(data.error || 'Erro ao gerar pagamento')
        setLoading(false)
        return
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setError('Método de pagamento indisponível no momento.')
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  const isCurrentPlan = (tier: BillingTier) => {
    if (session.subscriptionStatus !== 'ACTIVE') return false
    if (tier === 'pro_yearly') return session.plan === 'PRO_YEARLY'
    if (tier === 'pro') return session.plan === 'PRO'
    return false
  }

  return (
    <div className="min-h-screen bg-[#050505] text-surface-200 selection:bg-brand-500/30 font-sans animate-dashboard-fade">
      <FunnelTracker eventName="plan_viewed" onceKey="plan_viewed" />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#08080c]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/settings')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-surface-400 hover:bg-white/5 hover:text-white transition-all duration-200"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-base font-semibold tracking-tight text-white">Planos e Assinatura</h1>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium"
          >
            Dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" /> Acesso Completo Imediato
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-white">
            Escolha seu plano Vynta
          </h1>
          <p className="text-surface-400 text-base md:text-lg">
            Todas as ferramentas inclusas em ambos os planos. Cancele quando quiser, sem burocracia.
          </p>

          {error && (
            <div className="mx-auto max-w-md p-4 mt-6 rounded-xl bg-red-950/40 border border-red-500/30 text-center text-sm text-red-300 font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch pt-4">
          {/* Yearly Plan */}
          <div className="relative flex flex-col rounded-3xl border border-brand-400/50 bg-gradient-to-b from-brand-500/[0.12] to-[#0b0c12] p-8 shadow-[0_0_80px_-30px_rgba(66,88,249,0.7)] order-1 md:order-2">
            <div className="absolute -top-3.5 left-8 rounded-full bg-brand-500 px-3.5 py-1 text-xs font-bold text-white shadow-lg uppercase tracking-wider">
              Economize {YEARLY_DISCOUNT_PERCENT}%
            </div>
            <div className="space-y-4 mb-6">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-brand-300">
                Plano Anual
              </span>
              <h2 className="text-3xl font-display font-bold text-white">Vynta Anual</h2>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-extrabold tracking-tight text-white">
                  {formatBRL(YEARLY_MONTHLY_EQUIVALENT_CENTS)}
                </span>
                <span className="text-surface-400 text-sm">/mês</span>
              </div>
              <p className="text-sm text-surface-400">
                {formatBRL(PLANS.pro_yearly.priceCents)} cobrados anualmente · você economiza {formatBRL(YEARLY_SAVINGS_CENTS)}
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1 border-t border-white/5 pt-6">
              {PLAN_FEATURES.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-surface-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade('pro_yearly')}
              disabled={loading || isCurrentPlan('pro_yearly')}
              className="group w-full flex justify-between items-center rounded-2xl bg-brand-500 hover:bg-brand-400 text-white px-6 py-4 font-bold shadow-[0_0_30px_-5px_rgba(48,64,235,0.4)] transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Aguarde...' : isCurrentPlan('pro_yearly') ? 'Plano Atual' : 'Assinar Plano Anual'}</span>
              {!loading && !isCurrentPlan('pro_yearly') && (
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-1">
                  <ArrowRight className="w-4 h-4 text-white" strokeWidth={2.5} />
                </span>
              )}
            </button>
          </div>

          {/* Monthly Plan */}
          <div className="relative flex flex-col rounded-3xl border border-white/10 bg-[#0b0c12]/80 p-8 order-2 md:order-1">
            <div className="space-y-4 mb-6">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-surface-400">
                Plano Mensal
              </span>
              <h2 className="text-3xl font-display font-bold text-white">Vynta Mensal</h2>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-extrabold tracking-tight text-white">
                  {formatBRL(PLANS.pro.priceCents)}
                </span>
                <span className="text-surface-400 text-sm">/mês</span>
              </div>
              <p className="text-sm text-surface-400">
                Cobrança recorrente todo mês · cancele quando quiser
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1 border-t border-white/5 pt-6">
              {PLAN_FEATURES.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-surface-300 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade('pro')}
              disabled={loading || isCurrentPlan('pro')}
              className="w-full rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold py-4 transition-colors disabled:opacity-50"
            >
              {loading ? 'Aguarde...' : isCurrentPlan('pro') ? 'Plano Atual' : 'Assinar Mensal'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-surface-400 flex flex-wrap items-center justify-center gap-6">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 7 dias de garantia incondicional
          </span>
          <span>•</span>
          <span>Pagamento via Pix ou Cartão de Crédito</span>
          <span>•</span>
          <span>Acesso liberado imediatamente após aprovação</span>
        </div>
      </main>
    </div>
  )
}
