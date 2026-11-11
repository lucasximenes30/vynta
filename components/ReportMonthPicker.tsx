'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

export const currentReportMonth = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date())
const label = (value: string) =>
  new Date(`${value}-01T12:00:00Z`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

export default function ReportMonthPicker({
  value,
  months,
  onChange,
}: {
  value: string
  months: string[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(Number(value.slice(0, 4)))
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const earliest = Math.min(
    Number(value.slice(0, 4)),
    ...months.map((m) => Number(m.slice(0, 4))),
  )
  const current = currentReportMonth()
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    root.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus()
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  return (
    <div
      ref={root}
      className="relative min-w-0 flex-1"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <select
        id="report-month"
        aria-label="Período do relatório"
        className="min-h-11 w-full bg-transparent text-center text-sm font-semibold capitalize dark:bg-surface-900 sm:hidden"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {label(m)}
          </option>
        ))}
      </select>
      <button
        ref={trigger}
        type="button"
        aria-label={`Período do relatório: ${label(value)}`}
        aria-expanded={open}
        aria-controls="report-month-options"
        className="hidden min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold capitalize sm:flex"
        onClick={() => {
          setYear(Number(value.slice(0, 4)))
          setOpen((v) => !v)
        }}
      >
        {label(value)}
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div
          id="report-month-options"
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-surface-200 bg-white p-3 shadow-xl dark:border-surface-700 dark:bg-surface-900"
          role="group"
          aria-label="Escolher mês"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              className="report-icon-button"
              aria-label="Ano anterior"
              disabled={year <= earliest}
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <strong>{year}</strong>
            <button
              className="report-icon-button"
              aria-label="Próximo ano"
              disabled={year >= Number(current.slice(0, 4))}
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, i) => {
              const month = `${year}-${String(i + 1).padStart(2, '0')}`
              return (
                <button
                  key={month}
                  disabled={month > current}
                  aria-pressed={month === value}
                  className={`flex min-h-11 items-center justify-center gap-1 rounded-lg text-xs capitalize disabled:opacity-30 ${month === value ? 'bg-brand-600 text-white' : 'hover:bg-surface-100 dark:hover:bg-surface-800'}`}
                  onClick={() => {
                    onChange(month)
                    setOpen(false)
                    trigger.current?.focus()
                  }}
                >
                  {label(month).split(' de ')[0]}
                  {month === value && <Check className="h-3 w-3" />}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-center text-[11px] text-surface-500">
            Disponível até o mês atual
          </p>
        </div>
      )}
    </div>
  )
}
