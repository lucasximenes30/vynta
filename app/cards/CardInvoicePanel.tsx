'use client'

import { useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  billMonthIndexForDate,
  getCardInvoiceItems,
  invoiceClosingDate,
  invoiceDueDate,
  invoiceStatus,
  listInvoiceMonths,
  type InvoiceItemLike,
} from '@/lib/invoice'

interface CardRef {
  id: string
  name: string
  lastFourDigits: string
  dueDay: number
  closingDay: number
  provider?: string | null
}

interface Props {
  card: CardRef
  transactions: InvoiceItemLike[]
  onImport?: () => void // shown for importable cards (provider === 'nubank')
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MONTH_FMT = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const DUE_FMT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Aberta', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  CLOSED: { label: 'Fechada', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  DUE: { label: 'Encerrada', className: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400' },
  FUTURE: { label: 'Estimada', className: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400' },
}

/**
 * Inline invoice viewer (Nubank-style) — rendered inside the card tile under a
 * `collapse-grid` accordion, so it slides open beneath the card instead of
 * opening a separate screen.
 */
export default function CardInvoicePanel({ card, transactions, onImport }: Props) {
  const months = useMemo(() => listInvoiceMonths(card, transactions), [card, transactions])
  const [idx, setIdx] = useState(() => {
    // Start on the invoice currently open in the real world
    const now = new Date()
    const current = billMonthIndexForDate(now, card)
    const found = months.findIndex((m) => m.year * 12 + m.month0 === current)
    return found >= 0 ? found : months.length - 1
  })
  const current = months[Math.min(idx, months.length - 1)]

  const items = useMemo(
    () => (current ? getCardInvoiceItems(card, transactions, current.year, current.month0) : []),
    [card, transactions, current],
  )
  const total = items.reduce((s, i) => s + i.amount, 0)

  if (!current) return null

  const status = invoiceStatus(card, current.year, current.month0)
  const statusStyle = STATUS_STYLE[status]
  const due = invoiceDueDate(card, current.year, current.month0)
  const close = invoiceClosingDate(card, current.year, current.month0)
  const monthLabel = MONTH_FMT.format(new Date(current.year, current.month0, 1))
  const canImport = card.provider === 'nubank' && !!onImport

  return (
    <div id={`invoice-panel-${card.id}`} className="mt-3 rounded-xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-50/60 dark:bg-surface-800/30 overflow-hidden animate-in fade-in slide-in-from-top-2">
      {/* Month navigator */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-surface-200/60 dark:border-surface-700/50">
        <button
          type="button"
          disabled={idx <= 0}
          onClick={() => setIdx(idx - 1)}
          className="h-7 w-7 rounded-full flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Fatura anterior"
        >
          <Lucide.ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold capitalize text-surface-900 dark:text-surface-100 truncate">
            {monthLabel}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 shrink-0 ${statusStyle.className}`}>
            {statusStyle.label}
          </span>
        </div>
        <button
          type="button"
          disabled={idx >= months.length - 1}
          onClick={() => setIdx(idx + 1)}
          className="h-7 w-7 rounded-full flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Próxima fatura"
        >
          <Lucide.ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Total */}
      <div className="px-3.5 py-3 border-b border-surface-200/60 dark:border-surface-700/50">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-surface-400">
              {status === 'OPEN' ? 'Total parcial' : status === 'FUTURE' ? 'Fatura estimada' : 'Total da fatura'}
            </p>
            <p className="text-xl font-bold tracking-tight text-surface-900 dark:text-white">
              R$ {fmtBRL(total)}
            </p>
          </div>
          <p className="text-[10px] text-surface-400 pb-0.5 shrink-0">
            {status === 'OPEN'
              ? `fecha em ${DUE_FMT.format(close)}`
              : status === 'DUE'
              ? `venceu em ${DUE_FMT.format(due)}`
              : `vence em ${DUE_FMT.format(due)}`}
          </p>
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <Lucide.Coffee className="h-5 w-5 text-surface-300 dark:text-surface-600 mb-2" />
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Nenhum lançamento nesta fatura</p>
        </div>
      ) : (
        <ul className="max-h-64 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800/50">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2.5 px-3.5 py-2.5">
              <div className="h-8 w-8 rounded-full bg-white dark:bg-surface-800 border border-surface-200/60 dark:border-surface-700/60 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-surface-700 dark:text-surface-200 leading-none">{item.day}</span>
                <span className="text-[7px] font-medium uppercase text-surface-400 leading-none mt-0.5">
                  {item.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-800 dark:text-surface-100 truncate">{item.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {item.installment && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 rounded-full px-1.5 py-px">
                      <Lucide.Layers className="h-2.5 w-2.5" />
                      {item.installment.current}/{item.installment.total}
                    </span>
                  )}
                  {item.recurring && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-1.5 py-px">
                      <Lucide.Repeat className="h-2.5 w-2.5" />
                      Todo mês
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-semibold text-surface-900 dark:text-surface-100 tabular-nums shrink-0">
                R$ {fmtBRL(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Import shortcut */}
      {canImport && (
        <div className="border-t border-surface-200/60 dark:border-surface-700/50 p-2.5">
          <button
            type="button"
            onClick={onImport}
            className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <Lucide.FileUp className="h-3.5 w-3.5" />
            Importar fatura (CSV do Nubank)
          </button>
        </div>
      )}
    </div>
  )
}
