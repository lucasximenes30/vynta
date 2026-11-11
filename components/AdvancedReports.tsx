'use client'

import { useState, useEffect } from 'react'
import { analyzeFinancialHealth } from '@/lib/financialHealth'

type Health = ReturnType<typeof analyzeFinancialHealth>
const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
const weekLabel = (week: { week: string; end: string }) =>
  `${dayLabel(week.week)} a ${dayLabel(week.end)}`

export default function AdvancedReports({
  formatCurrency: money,
  period,
  revision = 0,
}: {
  formatCurrency: (value: number) => string
  isBRL?: boolean
  period: string
  revision?: number
}) {
  const [data, setData] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [tab, setTab] = useState<'score' | 'weekly' | 'alerts'>('score')
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    fetch(`/api/reports/advanced?period=${period}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((value) => {
        if (!controller.signal.aborted) setData(value)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [period, revision, retry])
  if (loading)
    return (
      <div
        className="skeleton h-64 rounded-2xl"
        aria-label="Carregando análise"
      />
    )
  if (error || !data)
    return (
      <div role="alert" className="card">
        <p>Não foi possível carregar a análise deste período.</p>
        <button
          className="report-button mt-3"
          onClick={() => setRetry((v) => v + 1)}
        >
          Tentar novamente
        </button>
      </div>
    )
  if (!data.score)
    return (
      <div className="card text-sm text-surface-500">
        Registre receitas e despesas neste mês para ver sua análise.
      </div>
    )
  const { score, weekly, anomalies } = data
  const color =
    score.score >= 80 ? '#22c55e' : score.score >= 40 ? '#fbbf24' : '#f43f5e'
  const max = Math.max(1, ...weekly.flatMap((w) => [w.income, w.expense]))
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-surface-500">
        Análise do mês selecionado, incluindo valores previstos. Parcelas contam
        pelo valor da parcela; compras no cartão, no vencimento da fatura.
      </p>
      <div
        className="flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-950/60"
        aria-label="Análises do período"
      >
        {(
          [
            ['score', 'Score'],
            ['weekly', 'Semanal'],
            ['alerts', 'Alertas'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`report-tab flex-1 ${tab === id ? 'report-tab-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'score' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card flex flex-col items-center justify-center py-8">
              <h3 className="text-sm font-semibold">Score financeiro</h3>
              <div className="relative my-4 h-40 w-40">
                <svg
                  className="h-full w-full -rotate-90"
                  viewBox="0 0 120 120"
                  aria-hidden="true"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    className="text-surface-200 dark:text-surface-700"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={
                      2 * Math.PI * 52 * (1 - score.score / 100)
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-4xl" style={{ color }}>
                    {score.score}
                  </strong>
                  <span className="mt-1 text-xs text-surface-500">
                    {score.label}
                  </span>
                </div>
              </div>
              <p className="max-w-xs text-center text-xs text-surface-500">
                Um indicador dos registros do mês. Dados incompletos podem mudar
                esta leitura.
              </p>
            </div>
            <div className="card space-y-5">
              <h3 className="text-sm font-semibold">
                O que compõe sua pontuação
              </h3>
              {score.breakdown.map((item) => (
                <div key={item.category}>
                  <div className="mb-2 flex justify-between gap-3 text-sm">
                    <span>{item.category}</span>
                    <strong>
                      {item.score}/{item.max}
                    </strong>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.score / item.max) * 100}%`,
                        background:
                          item.score / item.max >= 0.7
                            ? '#22c55e'
                            : item.score / item.max >= 0.4
                              ? '#fbbf24'
                              : '#f43f5e',
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-surface-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="card border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/20">
            <h3 className="mb-4 text-sm font-semibold">Próximos passos</h3>
            <ol className="space-y-4">
              {score.recommendations.map((text, i) => (
                <li key={text} className="flex gap-3 text-sm leading-relaxed">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-200">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      {tab === 'weekly' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold">Semana a semana</h3>
            <p className="mt-1 text-xs text-surface-500">
              De segunda a domingo, limitadas ao mês escolhido. Inclui valores
              previstos.
            </p>
            <div className="my-5 flex gap-4 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400">
                ● Receitas
              </span>
              <span className="text-rose-600 dark:text-rose-400">
                ● Despesas
              </span>
            </div>
            <div className="space-y-5">
              {weekly.map((w) => (
                <div key={w.week}>
                  <p className="mb-2 text-xs font-medium">{weekLabel(w)}</p>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 rounded bg-surface-100 dark:bg-surface-800">
                      <div
                        className="h-full rounded bg-emerald-500"
                        style={{ width: `${(w.income / max) * 100}%` }}
                      />
                    </div>
                    <span
                      className="w-28 text-right text-xs tabular-nums"
                      aria-label="Receitas"
                    >
                      {money(w.income)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 rounded bg-surface-100 dark:bg-surface-800">
                      <div
                        className="h-full rounded bg-rose-500"
                        style={{ width: `${(w.expense / max) * 100}%` }}
                      />
                    </div>
                    <span
                      className="w-28 text-right text-xs tabular-nums"
                      aria-label="Despesas"
                    >
                      {money(w.expense)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weekly.map((w) => (
              <div className="card !p-4" key={w.week}>
                <h4 className="text-sm font-semibold">{weekLabel(w)}</h4>
                <p className="mt-1 text-xs text-surface-500">
                  {w.transactionCount} lançamentos
                </p>
                <dl className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt>Resultado da semana</dt>
                    <dd
                      className={
                        w.balance < 0 ? 'text-rose-500' : 'text-emerald-500'
                      }
                    >
                      {money(w.balance)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Maior categoria</dt>
                    <dd>{w.topCategory || 'Sem despesas'}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'alerts' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold">
              {anomalies.length
                ? 'Gastos para revisar'
                : data.comparedCount
                  ? 'Nenhum pico entre os gastos comparáveis'
                  : 'Ainda falta histórico para comparar'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-surface-500">
              {data.comparedCount} de {data.expenseCount} despesas puderam ser
              comparadas. Cada comparação precisa de pelo menos três compras
              anteriores na mesma categoria, nos últimos três meses e no mês
              selecionado. Ausência de alerta não significa que o orçamento está
              equilibrado.
            </p>
          </div>
          {anomalies.map((a) => (
            <div
              key={`${a.id}:${a.date}`}
              className="card border-amber-300 dark:border-amber-800"
            >
              <div className="flex justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold">{a.title}</h4>
                  <p className="mt-1 text-xs text-surface-500">
                    {a.category} · {dayLabel(a.date)}
                  </p>
                </div>
                <strong className="text-sm">{money(a.amount)}</strong>
              </div>
              <p className="mt-3 text-sm text-surface-500">
                {a.deviation.toFixed(1).replace('.', ',')}× a média anterior de{' '}
                {money(a.averageInCategory)}. Confira se foi uma compra pontual
                ou se o lançamento precisa de ajuste.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
