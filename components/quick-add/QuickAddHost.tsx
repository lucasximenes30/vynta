'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Check, Loader2, Undo2, WifiOff } from 'lucide-react'
import {
  QUICK_ADD_OPEN_EVENT, TRANSACTION_CREATED_EVENT, OFFLINE_QUEUE_CHANGED_EVENT, enqueueTransaction, postTransaction,
   getTotalQueuedCount, readMutationQueue, readLegacyDrafts, recoverLegacyDraft, syncQueue, type QuickAddType,
} from '@/lib/quickAdd'
import type { QuickAddSubmit } from './QuickAddSheet'
import { rememberSuggestion } from './QuickAddSheet'

const QuickAddSheet = dynamic(() => import('./QuickAddSheet'), { ssr: false })

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/**
 * Global host for the quick-add bottom sheet. Mounted once by SidebarLayout:
 * listens for `vynta:quick-add` events, the `?add=` URL param, the `n` shortcut and
 * `beforeinstallprompt`-era SW registration; shows the success toast (with undo);
 * keeps a localStorage queue for transactions submitted while offline.
 */
export default function QuickAddHost() {
  const [openType, setOpenType] = useState<QuickAddType | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [pending, setPending] = useState<Awaited<ReturnType<typeof readMutationQueue>>>([])
  const [legacy, setLegacy] = useState<ReturnType<typeof readLegacyDrafts>>([])
  const [showPending, setShowPending] = useState(false)
  const [offline, setOffline] = useState(false)
  const [toast, setToast] = useState<{ id: string; message: string } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusTrapRef = useRef<HTMLInputElement>(null)

  // Focused inside the tap, so iOS already has the keyboard up when the sheet steals focus.
  const open = (type: QuickAddType) => {
    focusTrapRef.current?.focus({ preventScroll: true })
    setOpenType(type)
  }

  const showToast = (message: string, id = '') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id, message })
    toastTimer.current = setTimeout(() => setToast(null), 6000)
  }

  const flushQueue = async (notifyError = false) => {
    setSyncing(true)
    try {
      const synced = await syncQueue()
      const left = await getTotalQueuedCount()
      setPendingCount(left)
      if (synced > 0) showToast(`${synced} ${synced === 1 ? 'alteração sincronizada' : 'alterações sincronizadas'} ✔`)
    } catch (error) {
      if (notifyError) showToast(error instanceof Error ? error.message : 'Seus dados continuam salvos neste aparelho.')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const refreshPending = () => { setLegacy(readLegacyDrafts()); readMutationQueue().then(items => { setPending(items); setPendingCount(items.length) }).catch(() => {}) }
    refreshPending()

    const onOpen = (e: Event) => open((e as CustomEvent).detail?.type === 'INCOME' ? 'INCOME' : 'EXPENSE')
    const onUrlParam = () => {
      const params = new URLSearchParams(window.location.search)
      const add = params.get('add')
      if (add === 'expense' || add === 'income') {
        open(add === 'income' ? 'INCOME' : 'EXPENSE')
        params.delete('add')
        const qs = params.toString()
        window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
      }
    }
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && !target.isContentEditable) {
        open('EXPENSE')
      }
    }
    const onOnline = () => { setOffline(false); void flushQueue() }
    const onOffline = () => setOffline(true)
    setOffline(!navigator.onLine)
    window.addEventListener('offline', onOffline)
    const onVisibility = () => { if (document.visibilityState === 'visible') flushQueue() }

    window.addEventListener(QUICK_ADD_OPEN_EVENT, onOpen)
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refreshPending)
    window.addEventListener('keydown', onKey)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
    onUrlParam()

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Preload the sheet chunk while idle so the + button opens instantly
    const warm = () => { import('./QuickAddSheet') }
    let warmTimer: ReturnType<typeof setTimeout> | undefined
    if ('requestIdleCallback' in window) window.requestIdleCallback(warm)
    else warmTimer = setTimeout(warm, 2500)

    const onWorker = (event: MessageEvent) => { if (event.data?.type === 'vynta:queue-updated') { refreshPending(); if (event.data.synced > 0) window.dispatchEvent(new CustomEvent(TRANSACTION_CREATED_EVENT, { detail: { source: 'offline-sync' } })) } }
    navigator.serviceWorker?.addEventListener('message', onWorker)
    flushQueue()
    const retryTimer = setInterval(() => { if (navigator.onLine && document.visibilityState === 'visible') void flushQueue() }, 30_000)

    return () => {
      clearInterval(retryTimer)
      navigator.serviceWorker?.removeEventListener('message', onWorker)
      if (warmTimer) clearTimeout(warmTimer)
      window.removeEventListener(QUICK_ADD_OPEN_EVENT, onOpen)
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refreshPending)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (tx: QuickAddSubmit) => {
    try {
      const created = await postTransaction(tx)
      rememberSuggestion({ title: tx.title, category: tx.category, type: tx.type })
      setOpenType(null)
      navigator.vibrate?.(20)
      window.dispatchEvent(new CustomEvent(TRANSACTION_CREATED_EVENT, { detail: { id: created.id, type: tx.type } }))
      showToast(`${tx.type === 'EXPENSE' ? 'Gasto' : 'Entrada'} salvo · ${brl(tx.amount)}`, created.id)
    } catch (err: any) {
      const offline = !navigator.onLine || !err?.status
      if (offline) {
        await enqueueTransaction(tx, err.mutationId)
        setPendingCount(await getTotalQueuedCount())
        setOpenType(null)
        showToast('Sem internet — salvo no aparelho e enviado quando conectar')
      } else {
        throw err
      }
    }
  }

  const undo = async () => {
    if (!toast?.id) return
    const id = toast.id
    setToast(null)
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      window.dispatchEvent(new CustomEvent(TRANSACTION_CREATED_EVENT))
    } catch {
      showToast('Não consegui desfazer agora. Apague na tela de Finanças.')
    }
  }

  return (
    <>
      <input
        ref={focusTrapRef}
        aria-hidden="true"
        tabIndex={-1}
        inputMode="numeric"
        autoComplete="off"
        className="pointer-events-none fixed left-1/2 top-1/2 h-px w-px opacity-0"
      />

      {openType && (
        <QuickAddSheet initialType={openType} onClose={() => setOpenType(null)} onSubmit={handleSubmit} />
      )}

      {(pendingCount > 0 || legacy.length > 0 || offline) && !openType && (
        <button
          onClick={() => setShowPending(true)}
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/30 active:scale-95 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
        >
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
          {pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'}` : legacy.length ? 'Rascunhos antigos para revisar' : 'Modo offline'} · ver detalhes
        </button>
      )}

      {showPending && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Dados offline">
        <div className="max-h-[85dvh] w-full max-w-md overflow-auto rounded-2xl bg-white p-5 dark:bg-surface-900">
          <div className="flex items-center justify-between gap-4"><h2 className="font-semibold">Dados salvos no aparelho</h2><button aria-label="Fechar pendências" className="min-h-11 px-3" onClick={() => setShowPending(false)}>Fechar</button></div>
          <p className="mt-2 text-sm leading-relaxed text-surface-500">As telas salvas ficam disponíveis por até 48 horas. As alterações abaixo continuam guardadas até o envio. Os totais das telas serão atualizados depois da sincronização.</p>
          <ul className="my-4 space-y-3">{pending.map(item => {
            let title = 'Alteração salva'; try { const body = JSON.parse(item.body || '{}'); title = body.title || (item.url.includes('checkin') ? 'Marcação de hábito' : item.method === 'DELETE' ? 'Exclusão pendente' : title) } catch {}
            return <li className="rounded-xl bg-surface-50 p-3 text-sm dark:bg-surface-800" key={item.localId}><strong>{title}</strong><p className="mt-1 text-xs text-surface-500">{new Date(item.queuedAt).toLocaleString('pt-BR')}</p>{item.error && <p role="status" className="mt-2 text-xs text-amber-600">{item.error}</p>}</li>
          })}</ul>
          {legacy.length > 0 && <div className="my-4 space-y-3"><h3 className="font-semibold">Rascunhos da versão anterior</h3><p className="text-xs text-surface-500">Esses registros não identificam a conta de origem. Confira cada um antes de vinculá-lo à conta atual.</p>{legacy.map(item => <div key={item.localId} className="rounded-xl border border-amber-300 p-3"><pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs">{item.body || item.url}</pre><button className="report-button mt-2" onClick={async () => { try { await recoverLegacyDraft(item) } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível recuperar este rascunho.') } }}>Vincular à conta atual</button></div>)}</div>}
          {!pending.length && <p className="my-4 text-sm">Nenhuma alteração pendente nesta conta.</p>}
          <p className="text-xs leading-relaxed text-surface-500">No iPhone, abra o app com internet para sincronizar. Nos navegadores compatíveis, também solicitamos o envio com o app fechado.</p>
          <button disabled={syncing || offline || !pending.length} className="btn-primary mt-4 min-h-11 w-full disabled:opacity-50" onClick={() => flushQueue(true)}>{syncing ? 'Sincronizando…' : 'Sincronizar agora'}</button>
        </div>
      </div>}

      {toast && (
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-[65] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-200 md:bottom-6 md:left-6 md:translate-x-0">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-white px-4 py-3 shadow-xl dark:bg-surface-900">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
              <Check className="h-4 w-4" />
            </span>
            <p className="flex-1 text-sm font-semibold text-surface-800 dark:text-surface-100">{toast.message}</p>
            {toast.id ? (
              <button onClick={undo} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-brand-600 active:scale-95 dark:text-brand-400">
                <Undo2 className="h-3.5 w-3.5" /> Desfazer
              </button>
            ) : (
              <button onClick={() => setToast(null)} className="shrink-0 text-xs font-bold text-surface-400">OK</button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
