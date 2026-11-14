'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Check, X } from 'lucide-react'
import { MASCOT_NAME, RELEASE_ID } from '@/lib/release'
import { readTour } from '@/lib/tour'
import { useVisibleViewport } from '@/lib/useVisibleViewport'

export default function ReleaseNotice() {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const viewport = useVisibleViewport()

  useEffect(() => {
    let disposed = false, busy = false, finished = false, reserved = false, nextTry = 0
    const attempt = async () => {
      if (disposed || finished || busy || document.visibilityState !== 'visible') return
      if (readTour()?.active || document.querySelector('[role="dialog"]')) return
      if (reserved) { finished = true; setOpen(true); return }
      if (!navigator.onLine || Date.now() < nextTry) return
      busy = true
      nextTry = Date.now() + 60_000
      try {
        // Decode before claiming so the guide is ready when the dialog appears.
        const picture = new window.Image()
        picture.src = '/assets/mascot/celebrating-v1.webp'
        await picture.decode()
        if (disposed || document.visibilityState !== 'visible' || readTour()?.active || document.querySelector('[role="dialog"]')) return
        const response = await fetch('/api/release-notice', { method: 'POST', cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (disposed) return
        if (data.releaseId !== RELEASE_ID || !data.show) { finished = true; return }
        reserved = true
      } catch { /* Quiet retry on a later visible/online opportunity; never enqueue. */ }
      finally { busy = false }
      if (reserved && !disposed && document.visibilityState === 'visible' && !readTour()?.active && !document.querySelector('[role="dialog"]')) {
        finished = true
        setOpen(true)
      }
    }
    const timer = setInterval(() => { if (finished) clearInterval(timer); else void attempt() }, 1500)
    window.addEventListener('online', attempt)
    document.addEventListener('visibilitychange', attempt)
    return () => { disposed = true; clearInterval(timer); window.removeEventListener('online', attempt); document.removeEventListener('visibilitychange', attempt) }
  }, [])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus({ preventScroll: true })
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setOpen(false) }
      if (event.key.toLowerCase() === 'n') event.stopImmediatePropagation()
      if (event.key !== 'Tab') return
      const controls = dialog.current?.querySelectorAll<HTMLElement>('button, a[href]')
      if (!controls?.length) return
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown, true)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown, true); if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }) }
  }, [open])

  if (!open) return null
  return <div className="fixed inset-x-0 z-[80] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6" style={{ top: viewport.top, height: viewport.height || '100dvh' }}>
    <div ref={dialog} data-release-notice role="dialog" aria-modal="true" aria-labelledby="release-title" aria-describedby="release-description" tabIndex={-1} className="relative max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-[28px] border border-surface-200 bg-white p-5 shadow-2xl outline-none dark:border-sprout-lavender/20 dark:bg-[#1e1a28] sm:p-7 animate-in fade-in zoom-in-95">
      <button onClick={() => setOpen(false)} aria-label="Fechar novidades" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-surface-600 hover:bg-surface-100 dark:text-sprout-lavender dark:hover:bg-white/5"><X className="h-5 w-5" /></button>
      <p className="pr-10 text-[10px] font-bold uppercase tracking-[.2em] text-brand-600 dark:text-sprout-lavender">Uma nova fase do Vynta</p>
      <div className="mt-3 flex items-center gap-3"><Image src="/assets/mascot/celebrating-v1.webp" alt={`${MASCOT_NAME}, o broto do Vynta`} width={112} height={119} className="h-auto w-24 shrink-0 sm:w-28" /><h2 id="release-title" className="font-display text-2xl font-semibold tracking-tight text-surface-900 dark:text-white">Oi, eu sou o <span className="text-brand-600 dark:text-sprout-lime">{MASCOT_NAME}.</span></h2></div>
      <p id="release-description" className="mt-4 text-sm leading-relaxed text-surface-600 dark:text-sprout-lavender">O Vynta está de cara nova. Vou acompanhar você nos tutoriais, um passo de cada vez.</p>
      <ul className="my-5 space-y-3 text-sm leading-relaxed text-surface-700 dark:text-surface-200">
        {['Lavanda, lima e mais cuidado em cada tela.', 'Navegação mais fluida no celular e no computador.', 'Resultado do mês separado do acumulado. Cada quinzena entra na data cadastrada.'].map(text => <li key={text} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-sprout-lime" /><span>{text}</span></li>)}
      </ul>
      <p className="mb-5 text-xs leading-relaxed text-surface-600 dark:text-sprout-lavender">Seus registros continuam com você. Vamos conhecer essa nova fase?</p>
      <button onClick={() => setOpen(false)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 font-semibold text-white transition-transform active:scale-[.98] dark:bg-sprout-lime dark:text-brand-950">Vamos lá <ArrowRight className="h-4 w-4" /></button>
    </div>
  </div>
}
