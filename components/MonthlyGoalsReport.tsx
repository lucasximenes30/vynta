'use client'

import { useState, useEffect } from 'react'
import * as Lucide from 'lucide-react'
import { getIconByName } from '@/lib/icons'

interface MonthlyGoalsReportProps {
  selectedMonth: string
  formatCurrency: (value: number) => string
}

export default function MonthlyGoalsReport({ selectedMonth, formatCurrency }: MonthlyGoalsReportProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedMonth) return

    const [year, month] = selectedMonth.split('-').map(Number)
    setLoading(true)

    fetch(`/api/goals/monthly?year=${year}&month=${month}`)
      .then(res => res.json())
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching monthly goals:', err)
        setLoading(false)
      })
  }, [selectedMonth])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="w-8 h-8 text-brand-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <path d="M12 2a10 10 0 019.95 9" fill="currentColor" />
        </svg>
      </div>
    )
  }

  const { summary, activeGoals } = data

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="card group relative overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:border-surface-200 dark:hover:border-surface-700">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
              {'Guardado no Mês'}
            </p>
            <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(summary.deposited)}
            </p>
          </div>
        </div>
        <div className="card group relative overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:border-surface-200 dark:hover:border-surface-700">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-900/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
              {'Resgatado no Mês'}
            </p>
            <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
              -{formatCurrency(summary.withdrawn)}
            </p>
          </div>
        </div>
        <div className="card group relative overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:border-surface-200 dark:hover:border-surface-700">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 to-transparent dark:from-brand-900/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
              {'Total Acumulado nas Metas'}
            </p>
            <p className="text-2xl font-semibold text-brand-600 dark:text-brand-400">
              {formatCurrency(summary.accumulated)}
            </p>
          </div>
        </div>
      </div>

      {/* Active Goals List */}
      <div className="card">
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
          <Lucide.Target className="w-5 h-5 text-brand-500" />
          <span>Atividade das Caixinhas no Mês</span>
        </h2>

        {activeGoals.length === 0 ? (
          <div className="py-12 text-center text-sm text-surface-400 dark:text-surface-500">
            Nenhuma meta recebeu ou teve dinheiro resgatado neste mês.
          </div>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal: any) => {
              const Icon = getIconByName(goal.icon)

              return (
                <div key={goal.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-surface-200 dark:border-surface-700/60 bg-surface-50/50 dark:bg-surface-800/30">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm ${goal.color || 'bg-brand-500'}`}>
                      <Icon strokeWidth={2} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900 dark:text-surface-100 text-sm">
                        {goal.title}
                      </h3>
                      <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                        Acumulado atual: {formatCurrency(goal.currentAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:justify-end">
                    {goal.deposited > 0 && (
                      <div className="flex flex-col sm:items-end">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                          Guardado
                        </span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(goal.deposited)}
                        </span>
                      </div>
                    )}
                    {goal.withdrawn > 0 && (
                      <div className="flex flex-col sm:items-end">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                          Resgatado
                        </span>
                        <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                          -{formatCurrency(goal.withdrawn)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
