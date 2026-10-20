'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'
import { CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { JWTPayload } from '@/lib/auth'
import {
  PLANS,
  PLAN_FEATURES,
  formatBRL,
  YEARLY_DISCOUNT_PERCENT,
  YEARLY_MONTHLY_EQUIVALENT_CENTS,
  YEARLY_SAVINGS_CENTS,
  type BillingTier,
} from '@/lib/plans'

interface UnlockClientProps {
  session: JWTPayload
  state?: string
  feature?: string
}

export default function UnlockClient({ session, state, feature }: UnlockClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUnlock = async (tier: BillingTier) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: tier }),
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

  const renderPlans = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto px-4 pt-4 items-stretch">
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
            {formatBRL(PLANS.pro_yearly.priceCents)} cobrados uma vez por ano · economia de {formatBRL(YEARLY_SAVINGS_CENTS)}
          </p>
        </div>

        <ul className="space-y-3 mb-8 flex-1 border-t border-white/5 pt-6">
          {PLAN_FEATURES.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-surface-300 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => handleUnlock('pro_yearly')}
          disabled={loading}
          className="group w-full flex justify-between items-center rounded-2xl bg-brand-500 hover:bg-brand-400 text-white px-6 py-4 font-bold shadow-[0_0_30px_-5px_rgba(48,64,235,0.4)] transition-all disabled:opacity-50"
        >
          <span>{loading ? 'Aguarde...' : 'Assinar Plano Anual'}</span>
          {!loading && (
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
            Cobrado todo mês · cancele quando quiser
          </p>
        </div>

        <ul className="space-y-3 mb-8 flex-1 border-t border-white/5 pt-6">
          {PLAN_FEATURES.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-surface-300 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => handleUnlock('pro')}
          disabled={loading}
          className="w-full rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold py-4 transition-colors disabled:opacity-50"
        >
          {loading ? 'Aguarde...' : 'Assinar Mensal'}
        </button>
      </div>
    </div>
  )

  const pendingTier: BillingTier = session.plan === 'PRO_YEARLY' ? 'pro_yearly' : 'pro'

  return (
    <div className="relative min-h-dvh bg-[#050505] text-surface-200 selection:bg-brand-500/30 overflow-x-hidden font-sans flex flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(66,88,249,0.15),transparent_40%),radial-gradient(circle_at_bottom,rgba(17,31,171,0.1),transparent_30%)]" />

      <div className="relative z-10 w-full max-w-5xl space-y-10 animate-auth-fade">
        {state === 'payment_pending' ? (
          <div className="text-center space-y-4">
            <BrandLogo size="lg" className="justify-center" priority />
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-white">
              Seu pagamento está pendente
            </h1>
            <p className="mx-auto max-w-lg text-surface-400 text-base">
              Conclua o pagamento para liberar seu acesso imediatamente.
            </p>
          </div>
        ) : state === 'trial_expired' ? (
          <div className="text-center space-y-4">
            <BrandLogo size="lg" className="justify-center" priority />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" /> Teste Gratuito Concluído
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-white">
              Continue organizando sua vida com o Vynta
            </h1>
            <p className="mx-auto max-w-lg text-surface-400 text-base">
              Seus dados, metas e histórico continuam salvos. Escolha um plano para manter seu acesso completo.
            </p>
          </div>
        ) : state === 'expired' ? (
          <div className="text-center space-y-4">
            <BrandLogo size="lg" className="justify-center" priority />
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-white">
              Sua assinatura expirou
            </h1>
            <p className="mx-auto max-w-lg text-surface-400 text-base">
              Renove seu plano para continuar acessando todos os módulos e ferramentas do Vynta.
            </p>
          </div>
        ) : feature ? (
          <div className="text-center space-y-4">
            <BrandLogo size="lg" className="justify-center" priority />
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-white">
              Acesso Exclusivo
            </h1>
            <p className="mx-auto max-w-lg text-surface-400 text-base">
              Ative um dos planos para desbloquear todas as ferramentas do Vynta.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <BrandLogo size="lg" className="justify-center" priority />
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-white">
              Desbloqueie seu Acesso Completo
            </h1>
            <p className="mx-auto max-w-lg text-surface-400 text-base">
              Escolha o plano ideal para continuar evoluindo sua rotina e organização.
            </p>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-md p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {/* PAYMENT PENDING SCENARIO */}
        {state === 'payment_pending' ? (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-surface-900/60 p-6 rounded-2xl border border-white/10 text-center">
              <span className="text-surface-400 text-xs uppercase tracking-wider font-semibold">Plano selecionado</span>
              <div className="text-2xl font-bold text-white mt-1">
                {session.plan === 'PRO_YEARLY'
                  ? `Vynta Anual — ${formatBRL(PLANS.pro_yearly.priceCents)}/ano`
                  : `Vynta Mensal — ${formatBRL(PLANS.pro.priceCents)}/mês`}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleUnlock(pendingTier)}
                disabled={loading}
                className="w-full rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-bold py-4 shadow-[0_0_20px_-5px_rgba(48,64,235,0.5)] transition-all disabled:opacity-50"
              >
                {loading ? 'Redirecionando...' : 'Concluir Pagamento'}
              </button>

              <a
                href="https://wa.me/5585992551864?text=Ol%C3%A1%21%20Preciso%20de%20ajuda%20com%20meu%20pagamento%20no%20Vynta."
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-center items-center w-full rounded-2xl bg-surface-800/80 hover:bg-surface-700 text-white font-semibold py-3.5 transition-all text-sm"
              >
                💬 Falar com Suporte
              </a>
            </div>

            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-surface-400 text-xs mb-3">Deseja escolher outro plano?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleUnlock('pro')}
                  disabled={loading}
                  className="rounded-xl bg-white/5 hover:bg-white/10 text-white py-2.5 text-xs font-medium transition-colors border border-white/5"
                >
                  Mudar p/ Mensal ({formatBRL(PLANS.pro.priceCents)})
                </button>
                <button
                  onClick={() => handleUnlock('pro_yearly')}
                  disabled={loading}
                  className="rounded-xl bg-white/5 hover:bg-white/10 text-white py-2.5 text-xs font-medium transition-colors border border-white/5"
                >
                  Mudar p/ Anual ({formatBRL(PLANS.pro_yearly.priceCents)})
                </button>
              </div>
            </div>
          </div>
        ) : (
          renderPlans()
        )}

        <div className="flex flex-col items-center justify-center gap-4 text-center pt-6">
          <div className="flex items-center gap-2 text-xs text-surface-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 7 dias de garantia incondicional · Cancele quando quiser
          </div>
          <button
            onClick={() => router.push('/login')}
            className="text-surface-500 hover:text-white transition-colors text-xs"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  )
}
