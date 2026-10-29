'use client'

import { useState } from 'react'
import * as Lucide from 'lucide-react'

export interface SalaryPaymentPrefill {
  amount: number
  day: number
  payDayType: 'fixed' | 'business_day'
}

interface Props {
  open: boolean
  onClose: () => void
  /** Existing config (empty = first time) */
  initial: SalaryPaymentPrefill[]
  onSaved: () => void
}

interface PaymentForm {
  amount: string
  day: string
  payDayType: 'fixed' | 'business_day'
}

export default function SalaryModal({ open, onClose, initial, onSaved }: Props) {
  const [mode, setMode] = useState<'monthly' | 'biweekly'>(initial.length === 2 ? 'biweekly' : 'monthly')
  const [payments, setPayments] = useState<PaymentForm[]>(
    initial.length > 0
      ? initial.map((p) => ({ amount: String(p.amount), day: String(p.day), payDayType: p.payDayType }))
      : [{ amount: '', day: '', payDayType: 'fixed' }],
  )
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const setModeWith = (next: 'monthly' | 'biweekly') => {
    setMode(next)
    setPayments((prev) =>
      next === 'biweekly'
        ? [prev[0] ?? { amount: '', day: '', payDayType: 'fixed' }, prev[1] ?? { amount: '', day: '', payDayType: 'fixed' }]
        : [prev[0] ?? { amount: '', day: '', payDayType: 'fixed' }],
    )
  }

  const update = (i: number, patch: Partial<PaymentForm>) => {
    setPayments((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  const save = async () => {
    setError('')
    const parsed = payments.map((p) => ({
      amount: parseFloat(String(p.amount).replace(/\./g, '').replace(',', '.')),
      day: parseInt(p.day, 10),
      payDayType: p.payDayType,
    }))
    for (const p of parsed) {
      if (!(p.amount > 0) || !(p.day >= 1)) {
        setError('Preencha o valor e o dia de cada pagamento')
        return
      }
      const maxDay = p.payDayType === 'business_day' ? 22 : 31
      if (p.day > maxDay) {
        setError(p.payDayType === 'business_day' ? 'Dia útil deve ser entre 1 e 22' : 'Dia deve ser entre 1 e 31')
        return
      }
    }
    setSaving(true)
    try {
      const res = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: parsed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Falha ao salvar')
        return
      }
      onSaved()
      onClose()
    } catch {
      setError('Erro de rede')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setRemoving(true)
    try {
      await fetch('/api/salary', { method: 'DELETE' })
      onSaved()
      onClose()
    } catch {
      setError('Erro de rede')
    } finally {
      setRemoving(false)
    }
  }

  const labels = mode === 'biweekly' ? ['1ª quinzena', '2ª quinzena'] : ['Pagamento mensal']

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated dark:bg-surface-900 dark:border dark:border-surface-700/60 animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <Lucide.Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{'Configurar salário'}</h3>
            <p className="text-xs text-surface-500 dark:text-surface-400">{'Entra como receita todo mês automaticamente'}</p>
          </div>
        </div>

        {/* Frequency */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-100 dark:bg-surface-800 p-1 mb-5">
          {(['monthly', 'biweekly'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeWith(m)}
              className={`rounded-lg py-2 text-sm font-semibold transition-all ${
                mode === m
                  ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 shadow-sm'
                  : 'text-surface-500 dark:text-surface-400'
              }`}
            >
              {m === 'monthly' ? 'Mensal' : 'Por quinzena'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {payments.map((p, i) => (
            <div key={i} className="rounded-xl border border-surface-200 dark:border-surface-700/60 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">{labels[i]}</p>

              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-200 mb-1.5">{'Valor'}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-field"
                  placeholder={'0,00'}
                  value={p.amount}
                  onChange={(e) => update(i, { amount: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 dark:text-surface-200 mb-1.5">{'Tipo de dia'}</label>
                  <div className="grid grid-cols-1 gap-1 rounded-xl bg-surface-100 dark:bg-surface-800 p-1">
                    {(['fixed', 'business_day'] as const).map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => update(i, { payDayType: dt })}
                        className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                          p.payDayType === dt
                            ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 shadow-sm'
                            : 'text-surface-500 dark:text-surface-400'
                        }`}
                      >
                        {dt === 'fixed' ? 'Dia fixo' : 'Dia útil'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-surface-700 dark:text-surface-200 mb-1.5">
                    {p.payDayType === 'business_day' ? 'Nº do dia útil' : 'Dia do mês'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input-field"
                    placeholder={p.payDayType === 'business_day' ? 'Ex: 5' : 'Ex: 30'}
                    value={p.day}
                    onChange={(e) => update(i, { day: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>
              {p.payDayType === 'business_day' && (
                <p className="text-[11px] text-surface-400 dark:text-surface-500">
                  {`Ex: 5 = cai no 5º dia útil do mês (seg–sex, feriados não contam)`}
                </p>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {initial.length > 0 && (
            <button
              type="button"
              onClick={remove}
              disabled={saving || removing}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
            >
              {removing ? 'Removendo…' : 'Remover'}
            </button>
          )}
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1">
            {'Fechar'}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || removing}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 hover:bg-emerald-700"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 019.95 9" fill="currentColor" />
                </svg>
                {'Salvando…'}
              </span>
            ) : (
              'Salvar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
