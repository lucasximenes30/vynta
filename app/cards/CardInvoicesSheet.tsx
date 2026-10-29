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
  onClose: () => void
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

export default function CardInvoicesSheet({ card, transactions, onClose, onImport }: Props) {
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 transition-all duration-300 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-surface-900 w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh] transition-transform animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-surface-100 dark:border-surface-800/50">
          <div className="flex items-center justify-between p-4 sm:p-5 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${card.provider === 'nubank' ? 'bg-purple-600' : 'bg-brand-600'}`}>
                <Lucide.ReceiptText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 truncate">
                  Faturas — {card.name} •••• {card.lastFourDigits}
                </h2>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Fecha dia {card.closingDay} · vence dia {card.dueDay}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 -mr-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-colors"
            >
              <Lucide.X className="h-5 w-5" />
            </button>
          </div>

          {/* Month navigator */}
          <div className="flex items-center justify-between px-4 sm:px-5 pb-4">
            <button
              type="button"
              disabled={idx <= 0}
              onClick={() => setIdx(idx - 1)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Fatura anterior"
            >
              <Lucide.ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold capitalize text-surface-900 dark:text-surface-100">
                {monthLabel}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${statusStyle.className}`}>
                {statusStyle.label}
              </span>
            </div>
            <button
              type="button"
              disabled={idx >= months.length - 1}
              onClick={() => setIdx(idx + 1)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Próxima fatura"
            >
              <Lucide.ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-5 border-b border-surface-100 dark:border-surface-800/50">
          <p className="text-xs font-medium text-surface-500 dark:text-surface-400">
            {status === 'OPEN' ? 'Total parcial da fatura' : status === 'FUTURE' ? 'Fatura estimada' : 'Total da fatura'}
          </p>
          <div className="flex items-end justify-between mt-1">
            <p className="text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
              R$ {fmtBRL(total)}
            </p>
            <p className="text-xs text-surface-400 pb-1.5">
              {status === 'OPEN'
                ? `fecha em ${DUE_FMT.format(close)}`
                : status === 'DUE'
                ? `venceu em ${DUE_FMT.format(due)}`
                : `vence em ${DUE_FMT.format(due)}`}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="h-12 w-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                <Lucide.Coffee className="h-6 w-6 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-600 dark:text-surface-300">Nenhum lançamento nesta fatura</p>
              <p className="text-xs text-surface-400 mt-1 max-w-xs">
                {canImport
                  ? 'Importe o CSV da fatura do Nubank para preencher automaticamente.'
                  : 'Lançamentos feitos neste cartão aparecem aqui agrupados por fatura.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-100 dark:divide-surface-800/60">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-3.5 px-4 sm:px-5 py-3.5">
                  <div className="h-10 w-10 rounded-full bg-surface-100 dark:bg-surface-800 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-surface-700 dark:text-surface-200 leading-none">{item.day}</span>
                    <span className="text-[8px] font-medium uppercase text-surface-400 leading-none mt-0.5">
                      {item.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-100 truncate">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.installment && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 rounded-full px-1.5 py-0.5">
                          <Lucide.Layers className="h-3 w-3" />
                          Parcela {item.installment.current}/{item.installment.total}
                        </span>
                      )}
                      {item.recurring && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 rounded-full px-1.5 py-0.5">
                          <Lucide.Repeat className="h-3 w-3" />
                          Todo mês
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-surface-900 dark:text-surface-100 tabular-nums">
                    R$ {fmtBRL(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {canImport && (
          <div className="flex-shrink-0 border-t border-surface-100 dark:border-surface-800/50 p-4 sm:p-5 bg-surface-50 dark:bg-surface-900/50 rounded-b-3xl sm:rounded-b-2xl">
            <button
              type="button"
              onClick={onImport}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Lucide.FileUp className="h-4 w-4" />
              Importar fatura (CSV do Nubank)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
