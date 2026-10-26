'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  X, Check, Utensils, Coffee, ShoppingCart, Car, ShoppingBag, Receipt, HeartPulse, Clapperboard,
  House, Dumbbell, GraduationCap, TrendingUp, Wallet, Laptop, MoreHorizontal, CalendarDays, Loader2, Sparkles,
} from 'lucide-react'
import { localizeCategoryName } from '@/lib/categories'
import { guessCategory, normalizeText, QUICK_EXPENSE_CATEGORIES, QUICK_INCOME_CATEGORIES } from '@/lib/quickCategorize'
import { todayDateValue, type QuickAddType } from '@/lib/quickAdd'

export interface QuickAddSubmit {
  title: string
  amount: number
  type: QuickAddType
  category: string
  date: string
}

interface Suggestion { title: string; category: string; type: QuickAddType }

const CATEGORY_STYLE: Record<string, { Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  Restaurant: { Icon: Coffee, color: '#d946ef' },
  Food: { Icon: ShoppingCart, color: '#f43f5e' },
  Transport: { Icon: Car, color: '#f59e0b' },
  Shopping: { Icon: ShoppingBag, color: '#ec4899' },
  Bills: { Icon: Receipt, color: '#3b82f6' },
  Health: { Icon: HeartPulse, color: '#10b981' },
  Entertainment: { Icon: Clapperboard, color: '#8b5cf6' },
  Home: { Icon: House, color: '#14b8a6' },
  Gym: { Icon: Dumbbell, color: '#f97316' },
  Education: { Icon: GraduationCap, color: '#6366f1' },
  Investment: { Icon: TrendingUp, color: '#a855f7' },
  Salary: { Icon: Wallet, color: '#22c55e' },
  Freelance: { Icon: Laptop, color: '#06b6d4' },
  General: { Icon: MoreHorizontal, color: '#6b7280' },
}
const fallbackStyle = { Icon: Utensils, color: '#6b7280' }

const RECENT_KEY = 'vynta_quick_recent'
let serverSuggestions: Suggestion[] | null = null

function readRecent(): Suggestion[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

export function rememberSuggestion(s: Suggestion) {
  const key = (x: Suggestion) => `${x.type}:${normalizeText(x.title)}`
  const next = [s, ...readRecent().filter((r) => key(r) !== key(s))].slice(0, 20)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

function localDayOffset(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return todayDateValue(d)
}

/**
 * Tracks the *visible* part of the screen (above the on-screen keyboard). iOS doesn't resize the
 * layout viewport when the keyboard opens — it pans it — so `fixed inset-0` ends up partly behind
 * the keyboard and partly above the top of the screen. Pinning the sheet's container to the
 * visual viewport keeps it exactly in the visible area on iOS and Android.
 */
function useVisibleViewport() {
  const read = () => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return { top: 0, height: typeof window !== 'undefined' ? window.innerHeight : 0, keyboard: false }
    return { top: vv.offsetTop, height: vv.height, keyboard: window.innerHeight - vv.height > 120 }
  }
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setVp(read()))
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => { cancelAnimationFrame(frame); vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
  return vp
}

const CLOSE_MS = 180

export default function QuickAddSheet({ initialType, onClose, onSubmit }: {
  initialType: QuickAddType
  onClose: () => void
  onSubmit: (data: QuickAddSubmit) => Promise<void>
}) {
  const [type, setType] = useState<QuickAddType>(initialType)
  const [cents, setCents] = useState(0)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('General')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [dayOffset, setDayOffset] = useState<0 | -1 | null>(0)
  const [customDate, setCustomDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => serverSuggestions ?? [])
  const [recent] = useState<Suggestion[]>(() => (typeof window === 'undefined' ? [] : readRecent()))

  const amountRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const vp = useVisibleViewport()
  const [closing, setClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)

  // Slide down, then unmount; the keyboard is dismissed at the same time.
  const requestClose = useCallback(() => {
    if (closing) return
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    setClosing(true)
    setTimeout(onClose, CLOSE_MS)
  }, [closing, onClose])

  // Keep the focused field visible inside the sheet once the keyboard has settled.
  const revealOnFocus = (e: React.FocusEvent<HTMLElement>) => {
    const el = e.currentTarget
    setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 260)
  }

  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      dragStart.current = e.clientY
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (dragStart.current !== null) setDragY(Math.max(0, e.clientY - dragStart.current))
    },
    onPointerUp: () => {
      if (dragStart.current === null) return
      dragStart.current = null
      if (dragY > 90) requestClose()
      else setDragY(0)
    },
  }

  // Focus moves here from the trap input focused during the tap, so iOS keeps the keyboard open.
  useLayoutEffect(() => { amountRef.current?.focus({ preventScroll: true }) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [requestClose])

  useEffect(() => {
    if (serverSuggestions) return
    fetch('/api/transactions/suggestions')
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((d) => { serverSuggestions = d.suggestions ?? []; setSuggestions(serverSuggestions!) })
      .catch(() => {})
  }, [])

  const allSuggestions = useMemo(() => {
    const seen = new Set<string>()
    return [...recent, ...suggestions].filter((s) => {
      const key = `${s.type}:${normalizeText(s.title)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [recent, suggestions])

  const visibleSuggestions = useMemo(() => {
    const q = normalizeText(title)
    return allSuggestions
      .filter((s) => s.type === type && (!q || normalizeText(s.title).includes(q)) && normalizeText(s.title) !== q)
      .slice(0, 8)
  }, [allSuggestions, title, type])

  // Auto category from history first, then from keywords.
  useEffect(() => {
    if (categoryTouched) return
    const q = normalizeText(title)
    const fromHistory = q && allSuggestions.find((s) => s.type === type && normalizeText(s.title) === q)
    setCategory(fromHistory ? fromHistory.category : guessCategory(title, type) ?? 'General')
  }, [title, type, categoryTouched, allSuggestions])

  const categories = type === 'EXPENSE' ? QUICK_EXPENSE_CATEGORIES : QUICK_INCOME_CATEGORIES
  const categoryList = categories.includes(category) ? categories : [category, ...categories]
  const isExpense = type === 'EXPENSE'
  const canSave = cents > 0 && !saving

  const pickSuggestion = (s: Suggestion) => {
    setTitle(s.title)
    setCategory(s.category)
    setCategoryTouched(true)
    if (cents === 0) amountRef.current?.focus()
  }

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (cents <= 0) { amountRef.current?.focus(); setError('Digite o valor.'); return }
    setSaving(true)
    setError('')
    const date = dayOffset !== null ? localDayOffset(dayOffset) : `${customDate}T12:00:00.000Z`
    const finalTitle = title.trim() || localizeCategoryName(category, 'pt-BR') || (isExpense ? 'Gasto' : 'Entrada')
    try {
      await onSubmit({ title: finalTitle, amount: cents / 100, type, category, date })
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar. Tente de novo.')
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className={`fixed inset-x-0 -inset-y-[50vh] z-[70] bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${closing ? 'opacity-0' : 'animate-in fade-in'}`}
        onClick={requestClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 z-[71] flex items-end justify-center md:items-center pointer-events-none"
        style={{ top: vp.top, height: vp.height, transition: 'height 240ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Novo lançamento"
      >
      <form
        onSubmit={submit}
        style={{
          transform: closing ? 'translate3d(0, 100%, 0)' : `translate3d(0, ${dragY}px, 0)`,
          transition: dragStart.current !== null ? 'none' : `transform ${closing ? CLOSE_MS : 220}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
        }}
        className={`pointer-events-auto relative flex w-full flex-col md:max-w-md max-h-full md:max-h-[92dvh] rounded-t-[28px] md:rounded-3xl bg-white dark:bg-surface-900 border-t md:border border-surface-200 dark:border-surface-800 shadow-2xl will-change-transform ${closing ? '' : 'animate-in slide-in-from-bottom'}`}
      >
        <div {...dragHandlers} className="shrink-0 touch-none select-none">
          <div className={`mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-surface-200 dark:bg-surface-700 md:hidden ${vp.keyboard ? 'hidden' : ''}`} />

          <div className="flex items-center justify-between gap-3 px-5 pt-3">
            <div className="grid grid-cols-2 rounded-2xl bg-surface-100 dark:bg-surface-800 p-1 text-sm font-semibold">
              {(['EXPENSE', 'INCOME'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setCategoryTouched(false) }}
                  className={`rounded-xl px-4 py-2 transition-colors ${type === t
                    ? t === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm dark:bg-surface-700 dark:text-rose-400' : 'bg-white text-emerald-600 shadow-sm dark:bg-surface-700 dark:text-emerald-400'
                    : 'text-surface-500'}`}
                >
                  {t === 'EXPENSE' ? 'Gasto' : 'Entrada'}
                </button>
              ))}
            </div>
            <button type="button" onClick={requestClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-100 text-surface-500 dark:bg-surface-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
        <div className={`px-5 ${vp.keyboard ? 'pt-2' : 'pt-5'}`}>
          <label htmlFor="qa-amount" className="text-xs font-semibold uppercase tracking-wider text-surface-500">Quanto foi?</label>
          <input
            id="qa-amount"
            ref={amountRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="next"
            autoComplete="off"
            value={brl(cents)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(-10)
              setCents(Number(digits) || 0)
              setError('')
            }}
            onFocus={(e) => { const el = e.currentTarget; requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length)); revealOnFocus(e) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.focus() } }}
            className={`mt-1 w-full bg-transparent font-display leading-tight transition-[font-size] duration-200 ${vp.keyboard ? 'text-[2.1rem]' : 'text-[2.6rem]'} font-bold tracking-tight outline-none caret-brand-500 ${cents === 0 ? 'text-surface-300 dark:text-surface-600' : isExpense ? 'text-surface-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}
          />
        </div>

        <div className="px-5 pt-3">
          <label htmlFor="qa-title" className="sr-only">O que foi?</label>
          <input
            id="qa-title"
            ref={titleRef}
            type="text"
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="sentences"
            maxLength={80}
            placeholder={isExpense ? 'O que foi? Ex.: mercado, Uber, iFood' : 'De onde veio? Ex.: salário, freela'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={revealOnFocus}
            className="w-full rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3.5 text-base text-surface-900 placeholder:text-surface-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
          />
        </div>

        {visibleSuggestions.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto px-5 no-scrollbar" aria-label="Lançamentos frequentes">
            {visibleSuggestions.map((s) => (
              <button
                key={`${s.type}:${s.title}`}
                type="button"
                onClick={() => pickSuggestion(s)}
                className="shrink-0 rounded-full border border-surface-200 bg-white px-3.5 py-2 text-sm font-medium text-surface-700 active:scale-95 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
              >
                {s.title}
              </button>
            ))}
          </div>
        )}

        <div className={`px-5 ${vp.keyboard ? 'mt-3' : 'mt-5'}`}>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-500">
            Categoria
            {!categoryTouched && category !== 'General' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] normal-case tracking-normal text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                <Sparkles className="h-3 w-3" /> escolhida pra você
              </span>
            )}
          </p>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
          {categoryList.map((c) => {
            const { Icon, color } = CATEGORY_STYLE[c] ?? fallbackStyle
            const active = c === category
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setCategory(c); setCategoryTouched(true) }}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition-colors active:scale-95 ${active
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'border-surface-200 text-surface-600 dark:border-surface-700 dark:text-surface-300'}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22`, color }}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {localizeCategoryName(c, 'pt-BR')}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 px-5">
          {([0, -1] as const).map((offset) => (
            <button
              key={offset}
              type="button"
              onClick={() => setDayOffset(offset)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold ${dayOffset === offset ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900' : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'}`}
            >
              {offset === 0 ? 'Hoje' : 'Ontem'}
            </button>
          ))}
          <label className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ${dayOffset === null ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900' : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'}`}>
            <CalendarDays className="h-4 w-4" />
            {dayOffset === null && customDate ? customDate.split('-').reverse().slice(0, 2).join('/') : 'Outro dia'}
            <input
              type="date"
              aria-label="Escolher data"
              value={customDate}
              max={localDayOffset(0).slice(0, 10)}
              onChange={(e) => { if (e.target.value) { setCustomDate(e.target.value); setDayOffset(null) } }}
              className="absolute inset-0 opacity-0"
            />
          </label>
        </div>

        </div>

        <div className="shrink-0 border-t border-surface-100 px-5 pt-3 dark:border-surface-800 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={vp.keyboard ? { paddingBottom: '0.75rem' } : undefined}>
          {error && <p className="pb-2 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={!canSave}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none ${isExpense ? 'bg-brand-600 shadow-brand-600/25' : 'bg-emerald-600 shadow-emerald-600/25'}`}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {saving ? 'Salvando…' : `Salvar ${isExpense ? 'gasto' : 'entrada'}${cents > 0 ? ` · ${brl(cents)}` : ''}`}
          </button>
          {!vp.keyboard && (
            <Link
              href="/finances?novo=1"
              onClick={onClose}
              className="mt-3 block text-center text-xs font-medium text-surface-500 underline-offset-2 hover:underline"
            >
              Parcelado, no cartão ou conta fixa? Abrir formulário completo
            </Link>
          )}
        </div>
      </form>
      </div>
    </>
  )
}
