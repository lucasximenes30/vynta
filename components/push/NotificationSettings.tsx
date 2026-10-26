'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, Loader2, Send } from 'lucide-react'
import { sendTestPush, usePushState } from './usePushState'

type Prefs = { bills: boolean; agenda: boolean; habits: boolean; dailyLog: boolean }

const PREF_ITEMS: Array<{ key: keyof Prefs; label: string; hint: string }> = [
  { key: 'bills', label: 'Contas e faturas', hint: 'De manhã, quando algo vence hoje, amanhã ou atrasou' },
  { key: 'agenda', label: 'Agenda', hint: 'Resumo do dia e aviso antes dos compromissos' },
  { key: 'habits', label: 'Hábitos', hint: 'À noite, se ainda faltar marcar algum' },
  { key: 'dailyLog', label: 'Lembrete de gastos', hint: 'À noite, se você não anotou nada no dia' },
]

function Switch({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${checked ? 'bg-brand-600' : 'bg-surface-300 dark:bg-surface-700'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function NotificationSettings() {
  const { state, busy, error, enable, disable } = usePushState()
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [devices, setDevices] = useState(0)
  const [message, setMessage] = useState('')
  const [testing, setTesting] = useState(false)

  const loadPrefs = () =>
    fetch('/api/push/preferences').then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (!data) return
      setPrefs({ bills: data.bills, agenda: data.agenda, habits: data.habits, dailyLog: data.dailyLog })
      setDevices(data.devices)
    }).catch(() => {})

  useEffect(() => { loadPrefs() }, [])

  const subscribed = !!state?.subscribed

  const toggleDevice = async (on: boolean) => {
    setMessage('')
    const next = on ? await enable() : await disable()
    if (on && next?.permission === 'denied') setMessage('Notificações bloqueadas no navegador. Libere nas configurações do site e tente de novo.')
    if (on && next?.subscribed) {
      const err = await sendTestPush()
      setMessage(err ?? 'Pronto! Enviamos uma notificação de teste.')
    }
    loadPrefs()
  }

  const updatePref = async (key: keyof Prefs, value: boolean) => {
    if (!prefs) return
    const previous = prefs
    setPrefs({ ...prefs, [key]: value })
    const res = await fetch('/api/push/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    }).catch(() => null)
    if (!res?.ok) setPrefs(previous)
  }

  const test = async () => {
    setTesting(true)
    setMessage((await sendTestPush()) ?? 'Notificação enviada. Ela chega em alguns segundos.')
    setTesting(false)
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <BellRing className="w-4 h-4 text-brand-500" />
            <span>Notificações</span>
          </h3>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Avisos no celular ou computador, mesmo com o Vynta fechado.
          </p>
        </div>
        {state?.support === 'supported' && state.permission !== 'denied' && (
          busy ? <Loader2 className="h-6 w-6 animate-spin text-brand-500" /> : (
            <Switch checked={subscribed} onChange={toggleDevice} label="Receber notificações neste aparelho" />
          )
        )}
      </div>

      {state?.support === 'ios-needs-install' && (
        <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          No iPhone, as notificações funcionam com o Vynta instalado na tela de início (iOS 16.4 ou mais recente). Toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong> e abra o app pelo ícone.{' '}
          <Link href="/settings/help" className="font-semibold underline">Ver passo a passo</Link>
        </p>
      )}
      {state?.support === 'unsupported' && (
        <p className="rounded-xl bg-surface-100 p-3 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
          Este navegador não suporta notificações. Use Chrome, Edge, Firefox ou Safari atualizados.
        </p>
      )}
      {state?.permission === 'denied' && (
        <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
          As notificações estão bloqueadas para o Vynta. Libere em <strong>Configurações do site → Notificações</strong> (no ícone ao lado do endereço, ou nas configurações do app no Android) e volte aqui.
        </p>
      )}

      {prefs && (
        <ul className={`divide-y divide-surface-100 dark:divide-surface-800 ${subscribed || devices > 0 ? '' : 'opacity-60'}`}>
          {PREF_ITEMS.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">{item.label}</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">{item.hint}</p>
              </div>
              <Switch checked={prefs[item.key]} onChange={(v) => updatePref(item.key, v)} label={item.label} />
            </li>
          ))}
        </ul>
      )}

      {(subscribed || devices > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-100 pt-4 dark:border-surface-800">
          <span className="text-xs text-surface-500 dark:text-surface-400">
            Ativo em {devices} {devices === 1 ? 'aparelho' : 'aparelhos'}
          </span>
          <button onClick={test} disabled={testing} className="btn-secondary inline-flex h-9 items-center gap-2 px-3 text-xs font-bold disabled:opacity-50">
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar teste
          </button>
        </div>
      )}

      {(message || error) && <p className="text-xs font-medium text-brand-600 dark:text-brand-400">{error || message}</p>}
    </div>
  )
}
