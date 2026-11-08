'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'
import InstagramIcon from '@/components/icons/InstagramIcon'
import { readTour } from '@/lib/tour'
import { trackFunnelEvent } from '@/lib/funnel'
import { startPromoCheckout } from './PromoOfferCard'
import { PLANS, PROMO_FIRST_MONTH, formatBRL } from '@/lib/plans'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/social'

/**
 * App-shell engagement: activity heartbeat (feeds "último acesso" in the admin and the
 * re-engagement jobs), the first-month offer for trial users (max once a day, never on the
 * signup day or during the tour) and a one-time "follow us on Instagram" card.
 */

const PING_EVERY_MS = 10 * 60 * 1000
const K = {
  lastPing: 'vynta:last-ping',
  days: 'vynta:active-days',
  promoShown: 'vynta:promo-offer-day',
  instagram: 'vynta:instagram-prompt',
}

const today = () => new Date().toLocaleDateString('en-CA')

function read(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch {}
}

/** Distinct local days the app was opened on this device (last 30). */
function recordActiveDay(): string[] {
  let days: string[] = []
  try { days = JSON.parse(read(K.days) || '[]') } catch {}
  if (!days.includes(today())) days = [...days, today()].slice(-30)
  write(K.days, JSON.stringify(days))
  return days
}

export default function EngagementHost() {
  const [prompt, setPrompt] = useState<'promo' | 'instagram' | null>(null)

  useEffect(() => {
    let cancelled = false

    const ping = async () => {
      if (document.visibilityState !== 'visible') return
      const last = Number(read(K.lastPing) || 0)
      if (Date.now() - last < PING_EVERY_MS) return
      write(K.lastPing, String(Date.now()))

      const days = recordActiveDay()
      const res = await fetch('/api/track/activity', { method: 'POST', keepalive: true }).catch(() => null)
      const data = res?.ok ? await res.json().catch(() => null) : null
      if (cancelled || readTour()?.active) return

      if (data?.promo && days.length >= 2 && read(K.promoShown) !== today()) {
        write(K.promoShown, today())
        trackFunnelEvent('promo_offer_viewed', { source: 'app' })
        setPrompt('promo')
      } else if (days.length >= 2 && !read(K.instagram) && read(K.promoShown) !== today()) {
        write(K.instagram, 'shown')
        setPrompt('instagram')
      }
    }

    const onVisible = () => { if (document.visibilityState === 'visible') ping() }
    const t = setTimeout(ping, 2500)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (prompt === 'promo') return <PromoOfferModal onClose={() => setPrompt(null)} />
  if (prompt === 'instagram') return <InstagramCard onClose={() => setPrompt(null)} />
  return null
}

function PromoOfferModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const accept = async () => {
    setLoading(true)
    setError(await startPromoCheckout('app_offer'))
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-4 zoom-in-95">
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 p-2 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
          <X className="h-5 w-5" />
        </button>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
          <Sparkles className="h-6 w-6 text-brand-600 dark:text-brand-400" />
        </div>
        <h2 className="text-center font-display text-xl font-bold text-surface-900 dark:text-white">Está gostando do Vynta?</h2>
        <p className="mt-2 text-center text-sm text-surface-500 dark:text-surface-400">
          Assinando agora, seu primeiro mês sai por um preço especial.
        </p>
        <div className="my-5 rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/60 dark:bg-brand-500/10 p-4 text-center">
          <span className="text-sm text-surface-400 line-through">{formatBRL(PLANS.pro.priceCents)}</span>
          <div className="font-display text-4xl font-extrabold text-brand-600 dark:text-brand-300">{formatBRL(PROMO_FIRST_MONTH.priceCents)}</div>
          <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">no 1º mês · {PROMO_FIRST_MONTH.accessDays} dias de acesso completo</span>
        </div>
        <ul className="mb-5 space-y-1.5 text-sm text-surface-600 dark:text-surface-300">
          {['Pagamento único via Pix ou cartão', 'Sem renovação automática', 'Seus dados do teste continuam salvos'].map((t) => (
            <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />{t}</li>
          ))}
        </ul>
        {error && <p className="mb-3 rounded-xl bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        <button onClick={accept} disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-500 disabled:opacity-70">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Abrindo pagamento...' : `Quero por ${formatBRL(PROMO_FIRST_MONTH.priceCents)}`}
        </button>
        <button onClick={onClose} className="mt-2 h-10 w-full text-sm font-medium text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
          Agora não
        </button>
      </div>
    </div>
  )
}

function InstagramCard({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-6 md:w-[360px] z-[45] rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4 shadow-2xl animate-in slide-in-from-bottom-4 fade-in">
      <button onClick={onClose} aria-label="Fechar" className="absolute right-2 top-2 p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white">
          <InstagramIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-surface-900 dark:text-white">Siga o Vynta no Instagram</p>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">Dicas de finanças, organização e novidades do app em {INSTAGRAM_HANDLE}.</p>
        </div>
      </div>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => { trackFunnelEvent('instagram_clicked', { source: 'app_card' }); onClose() }}
        className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-surface-900 dark:bg-white text-sm font-bold text-white dark:text-surface-900"
      >
        Seguir {INSTAGRAM_HANDLE}
      </a>
    </div>
  )
}
