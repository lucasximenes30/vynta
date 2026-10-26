'use client'

import { useEffect, useState } from 'react'
import { BellRing, Check, Loader2, X } from 'lucide-react'
import { sendTestPush, usePushState } from './usePushState'

const DISMISS_KEY = 'vynta_push_prompt_dismissed_at'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

/** Soft-ask card on the dashboard: the browser permission prompt only appears after a tap here. */
export default function PushPrompt() {
  const { state, busy, enable } = usePushState()
  const [hidden, setHidden] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setHidden(Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < SNOOZE_MS)
  }, [])

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
        <Check className="h-5 w-5 shrink-0" />
        Lembretes ativados. Ajuste o que quer receber em Configurações.
      </div>
    )
  }

  if (hidden || state?.support !== 'supported' || state.permission !== 'default') return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setHidden(true)
  }

  const activate = async () => {
    const next = await enable()
    if (next?.subscribed) {
      setDone(true)
      sendTestPush()
    } else dismiss()
  }

  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-brand-500/20 bg-brand-500/[0.06] p-4 sm:flex-row sm:items-center sm:p-5">
      <button onClick={dismiss} aria-label="Agora não" className="absolute right-2 top-2 rounded-lg p-2 text-surface-400 hover:text-surface-600 sm:hidden">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8 sm:flex-1 sm:pr-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <BellRing className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-surface-900 dark:text-white">Nunca mais esqueça uma conta</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-surface-600 dark:text-surface-400">
            Avisamos quando uma conta vence, quando falta marcar um hábito e antes dos seus compromissos — mesmo com o app fechado.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={dismiss} className="hidden rounded-xl px-4 py-2.5 text-xs font-bold text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 sm:block">
          Agora não
        </button>
        <button
          onClick={activate}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-brand-500/20 active:scale-95 disabled:opacity-60 sm:w-auto"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Ativar lembretes
        </button>
      </div>
    </div>
  )
}
