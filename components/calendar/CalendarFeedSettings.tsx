'use client'

import { useEffect, useState } from 'react'
import { CalendarSync, CheckCircle2, Link2, Loader2, RefreshCw, Trash2 } from 'lucide-react'

type Status = { connected: boolean; syncedAt: string | null; error: string | null; count: number }

export default function CalendarFeedSettings() {
  const [status, setStatus] = useState<Status | null>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<'save' | 'sync' | 'remove' | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = () =>
    fetch('/api/calendar/feed', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStatus(data))
      .catch(() => {})

  useEffect(() => { load() }, [])

  const save = async () => {
    setBusy('save')
    setMessage(null)
    const res = await fetch('/api/calendar/feed', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }).catch(() => null)
    const data = await res?.json().catch(() => null)
    setBusy(null)
    if (!res?.ok) {
      setMessage({ ok: false, text: data?.error ?? 'Erro de rede. Tente de novo.' })
      return
    }
    setUrl('')
    setMessage({ ok: true, text: `Agenda conectada! ${data.total} ${data.total === 1 ? 'evento importado' : 'eventos importados'}.` })
    load()
  }

  const syncNow = async () => {
    setBusy('sync')
    setMessage(null)
    const res = await fetch('/api/calendar/feed', { method: 'POST' }).catch(() => null)
    const data = await res?.json().catch(() => null)
    setBusy(null)
    setMessage(res?.ok
      ? { ok: true, text: `Sincronizado: ${data.total} eventos na agenda.` }
      : { ok: false, text: data?.error ?? 'Erro de rede. Tente de novo.' })
    load()
  }

  const remove = async () => {
    setBusy('remove')
    setMessage(null)
    const res = await fetch('/api/calendar/feed', { method: 'DELETE' }).catch(() => null)
    setBusy(null)
    setMessage(res?.ok
      ? { ok: true, text: 'Agenda desconectada e eventos importados removidos.' }
      : { ok: false, text: 'Não foi possível desconectar agora.' })
    load()
  }

  return (
    <div className="card space-y-5">
      <div>
        <h3 className="font-display text-base font-semibold flex items-center gap-2">
          <CalendarSync className="w-4 h-4 text-brand-500" />
          <span>Agenda do Google</span>
        </h3>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Traga seus compromissos do Google Agenda para o Vynta — e receba o aviso "começa em X min".
        </p>
      </div>

      {status?.connected ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="text-sm text-emerald-800 dark:text-emerald-200">
              <p className="font-semibold">{status.count} {status.count === 1 ? 'evento sincronizado' : 'eventos sincronizados'}</p>
              {status.syncedAt && (
                <p className="text-xs opacity-80">
                  Última sync: {new Date(status.syncedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · automática a cada 15 min
                </p>
              )}
            </div>
          </div>
          {status.error && (
            <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
              Última tentativa falhou: {status.error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={syncNow} disabled={busy !== null} className="btn-secondary inline-flex h-9 items-center gap-2 px-3 text-xs font-bold disabled:opacity-50">
              {busy === 'sync' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sincronizar agora
            </button>
            <button onClick={remove} disabled={busy !== null} className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 disabled:opacity-50">
              {busy === 'remove' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-4 text-xs text-surface-500 dark:text-surface-400">
            <li>No Google Agenda (computador): <strong>Configurações → sua agenda → "Endereço secreto no formato iCal"</strong></li>
            <li>Copie o link e cole aqui. Ele é secreto — não compartilhe.</li>
          </ol>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-field h-10 pl-9 text-xs"
              />
            </div>
            <button onClick={save} disabled={busy !== null || !url.trim()} className="btn-primary h-10 shrink-0 px-4 text-xs font-bold disabled:opacity-40">
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conectar'}
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-surface-400 dark:text-surface-500">
            Somente leitura: eventos criados no Vynta não voltam para o Google. A sincronização roda a cada 15 minutos.
          </p>
        </div>
      )}

      {message && (
        <p className={`text-xs font-medium ${message.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
