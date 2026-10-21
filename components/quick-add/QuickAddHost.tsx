'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Check, Loader2, Undo2, WifiOff } from 'lucide-react'
import {
  QUICK_ADD_OPEN_EVENT, TRANSACTION_CREATED_EVENT, enqueueTransaction, postTransaction,
  readQueue, syncQueue, type QuickAddType,
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

  const flushQueue = async () => {
    setSyncing(true)
    try {
      const synced = await syncQueue()
      const left = readQueue().length
      setPendingCount(left)
      if (synced > 0) showToast(`${synced} ${synced === 1 ? 'lançamento sincronizado' : 'lançamentos sincronizados'} ✔`)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    setPendingCount(readQueue().length)

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
    const onOnline = () => flushQueue()
    const onVisibility = () => { if (document.visibilityState === 'visible') flushQueue() }

    window.addEventListener(QUICK_ADD_OPEN_EVENT, onOpen)
    window.addEventListener('keydown', onKey)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
    onUrlParam()

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Preload the sheet chunk while idle so the + button opens instantly
    const warm = () => { import('./QuickAddSheet') }
    let warmTimer: ReturnType<typeof setTimeout> | undefined
    if ('requestIdleCallback' in window) window.requestIdleCallback(warm)
    else warmTimer = setTimeout(warm, 2500)

    flushQueue()

    return () => {
      if (warmTimer) clearTimeout(warmTimer)
      window.removeEventListener(QUICK_ADD_OPEN_EVENT, onOpen)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('online', onOnline)
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
        enqueueTransaction(tx)
        setPendingCount(readQueue().length)
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

      {pendingCount > 0 && !openType && (
        <button
          onClick={flushQueue}
          className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/30 active:scale-95 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
        >
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
          {pendingCount} {pendingCount === 1 ? 'lançamento pendente' : 'lançamentos pendentes'} · sincronizar
        </button>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[65] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-200 md:bottom-6 md:left-6 md:translate-x-0">
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
