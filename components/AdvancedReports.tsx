'use client'

import { useState, useEffect } from 'react'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'

interface FinancialScore {
  score: number
  label: string
  breakdown: { category: string; score: number; max: number }[]
  recommendations: string[]
}

interface SpendingAnomaly {
  date: string
  category: string
  amount: number
  averageInCategory: number
  deviation: number
  title: string
}

interface WeeklyAnalysis {
  week: string
  income: number
  expense: number
  balance: number
  transactionCount: number
  topCategory: string | null
}

interface AdvancedReportsProps {
  formatCurrency: (value: number) => string
  isBRL: boolean
}

const SCORE_COLORS: Record<string, string> = {
  'Excelente': '#22c55e',
  'Very Good': '#4ade80',
  'Muito Bom': '#4ade80',
  'Good': '#a3e635',
  'Bom': '#a3e635',
  'Fair': '#fbbf24',
  'Regular': '#fbbf24',
  'Needs Improvement': '#f43f5e',
  'Precisa melhorar': '#f43f5e',
  'Excellent': '#22c55e'
}


// Translation helper for category & month
const categoryTranslations: Record<string, string> = {
  'category.Food': 'Alimentação',
  'category.Transport': 'Transporte',
  'category.Entertainment': 'Lazer',
  'category.Shopping': 'Compras',
  'category.Bills': 'Contas',
  'category.Health': 'Saúde',
  'category.General': 'Geral',
  'category.Salary': 'Salário',
  'category.Freelance': 'Freelance',
  'category.Investment': 'Investimento',
  'category.Other': 'Outro',
  'month.january': 'Janeiro',
  'month.february': 'Fevereiro',
  'month.march': 'Março',
  'month.april': 'Abril',
  'month.may': 'Maio',
  'month.june': 'Junho',
  'month.july': 'Julho',
  'month.august': 'Agosto',
  'month.september': 'Setembro',
  'month.october': 'Outubro',
  'month.november': 'Novembro',
  'month.december': 'Dezembro',
}

const t = (key: string): string => {
  return categoryTranslations[key] || key.replace(/^(category|month)\./, '');
}

export default function AdvancedReports({ formatCurrency, isBRL }: AdvancedReportsProps) {
  
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [score, setScore] = useState<FinancialScore | null>(null)
  const [anomalies, setAnomalies] = useState<SpendingAnomaly[]>([])
  const [weekly, setWeekly] = useState<WeeklyAnalysis[]>([])

  const [activeTab, setActiveTab] = useState<'score' | 'weekly' | 'anomalies'>('score')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(false)
    const lang = 'pt-BR'
    fetch(`/api/reports/advanced?language=${lang}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('Unavailable'); return r.json() })
      .then((data) => {
        if (data && !controller.signal.aborted) {
          setScore(data.score)
          setAnomalies(data.anomalies)
          setWeekly(data.weekly)
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [isBRL, retry])

  const weeklyChartData = weekly.map((w) => ({
    week: w.week,
    income: w.income,
    expense: w.expense,
    balance: w.balance,
  }))

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <svg className="w-8 h-8 text-brand-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <path d="M12 2a10 10 0 019.95 9" fill="currentColor" />
        </svg>
      </div>
    )
  }

  if (loadError) return <div role="alert" className="card text-center"><p className="text-sm text-surface-500">Não foi possível carregar a análise avançada.</p><button className="report-button mt-4" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></div>

  if (weekly.length === 0 && !score) {
    return (
      <div className="card">
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-2">
          {'Relatórios Avançados'}
        </h2>
        <p className="text-sm text-surface-400 dark:text-surface-500">
          {'Adicione transações ao longo do tempo para desbloquear análises avançadas'}
        </p>
      </div>
    )
  }

  const scoreColor = score ? (SCORE_COLORS[score.label] || '#8f93a1') : '#8f93a1'
  const circumference = 2 * Math.PI * 54
  const scoreProgress = score ? (score.score / 100) * circumference : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-2">
          {'Relatórios Avançados'}
        </h2>
        <p className="text-sm text-surface-400 dark:text-surface-500">
          {'Análise detalhada dos seus hábitos financeiros'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-100 dark:bg-surface-800/50 w-fit ring-1 ring-surface-200 dark:ring-surface-700">
        {[
          { key: 'score' as const, label: 'Score' },
          { key: 'weekly' as const, label: 'Semanal' },
          { key: 'anomalies' as const, label: 'Alertas' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
                : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Score Tab */}
      {activeTab === 'score' && score && (
        <div className="space-y-6">
          {/* Score Circle + Breakdown */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Score Circle */}
            <div className="card relative flex flex-col items-center justify-center py-8 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-white/5 pointer-events-none" />
              <h3 className="relative text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">
                {'Score Financeiro'}
              </h3>
              <div className="relative">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                  <defs>
                    <filter id="scoreGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke="currentColor"
                    className="text-surface-150 dark:text-surface-750"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - scoreProgress}
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 8px ${scoreColor}40)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold drop-shadow-sm" style={{ color: scoreColor }}>
                    {score.score}
                  </span>
                  <span className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    {isBRL ? score.label : (
                      score.label === 'Excelente' ? 'Excellent' :
                      score.label === 'Muito Bom' ? 'Very Good' :
                      score.label === 'Bom' ? 'Good' :
                      score.label === 'Regular' ? 'Fair' :
                      'Needs Improvement'
                    )}
                  </span>
                </div>
              </div>
              <p className="relative text-xs text-surface-400 dark:text-surface-500 mt-2.5 text-center">
                {'Baseado nos seus hábitos deste mês'}
              </p>
            </div>

            {/* Breakdown */}
            <div className="card relative space-y-4">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-white/5 pointer-events-none" />
              <div className="relative">
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">
                  {'Detalhamento'}
                </h3>
                {score.breakdown.map((item, i) => {
                  const pct = item.max > 0 ? (item.score / item.max) : 0
                  const barColor = pct >= 0.7 ? '#22c55e' : pct >= 0.5 ? '#fbbf24' : '#f43f5e'
                  return (
                    <div key={item.category} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards', opacity: 0 }}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm text-surface-600 dark:text-surface-400">
                          {isBRL ? item.category : (
                            item.category === 'Poupança' ? 'Savings' :
                            item.category === 'Diversificação' ? 'Diversification' :
                            item.category === 'Consistência' ? 'Consistency' :
                            'Control'
                          )}
                        </span>
                        <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                          {item.score}/{item.max}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden ring-1 ring-inset ring-surface-200 dark:ring-surface-700">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${pct * 100}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {score.recommendations.length > 0 && (
            <div className="card relative overflow-hidden bg-gradient-to-br from-violet-50/90 to-violet-100/40 dark:from-violet-900/25 dark:to-violet-800/15 border-violet-200/60 dark:border-violet-800/40 transition-all duration-200 hover:shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/5 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-800/40 flex items-center justify-center ring-1 ring-violet-200 dark:ring-violet-700/50">
                    <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                    {'Recomendações'}
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {score.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 group">
                      <svg className="w-4 h-4 text-violet-500 mt-0.5 shrink-0 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm leading-relaxed text-violet-700 dark:text-violet-300">
                        {rec}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly Tab */}
      {activeTab === 'weekly' && (
        weeklyChartData.length === 0 ? (
          <div className="card flex items-center justify-center py-16">
            <p className="text-sm text-surface-400 dark:text-surface-500">
              {'Sem dados semanais suficientes'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Weekly Trend Chart */}
            <div className="card relative overflow-hidden transition-all duration-200">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">
                {'Tendência Semanal'}
              </h3>
              <div style={{ width: '100%', height: 300 }} className="opacity-100 animate-fade-in">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-surface-200 dark:text-surface-700/60" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: '#8f93a1' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => {
                        const sliced = v.slice(5)
                        if (isBRL && sliced.includes('-')) {
                          const [m, d] = sliced.split('-')
                          return `${d}/${m}`
                        }
                        return sliced
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#8f93a1' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
                    />
                    <RechartsTooltip
                      labelFormatter={(label: any) => {
                        if (typeof label !== 'string') return String(label)
                        const sliced = label.slice(5)
                        if (isBRL && sliced.includes('-')) {
                          const [m, d] = sliced.split('-')
                          return `${d}/${m}`
                        }
                        return sliced
                      }}
                      formatter={(value, name) => [formatCurrency(Number(value)), name === 'income' ? ('Receita') : ('Despesa')]}
                      contentStyle={{
                        backgroundColor: '#16171d',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#f1f3f7',
                        fontSize: '13px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                      }}
                      wrapperStyle={{ outline: 'none' }}
                    />
                    <Legend
                      formatter={(value: string) => value === 'income' ? ('Receita') : 'Despesa'}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {weekly.slice(-6).map((w, i) => (
                <div
                  key={w.week}
                  className="card p-4 relative overflow-hidden transition-all duration-200 hover:shadow-card-hover group"
                  style={{ animationDelay: `${(i + 1) * 80}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-white/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <p className="text-xs text-surface-400 dark:text-surface-500 mb-3 font-medium">{w.week.slice(5)}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-surface-500 dark:text-surface-400">
                          {'Receita'}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(w.income)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-surface-500 dark:text-surface-400">
                          {'Despesa'}
                        </span>
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {formatCurrency(w.expense)}
                        </span>
                      </div>
                      <div className="border-t border-surface-150 dark:border-surface-700/60 pt-2 flex justify-between items-center">
                        <span className={`text-xs font-medium ${w.balance >= 0 ? 'text-surface-600 dark:text-surface-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {'Saldo'}
                        </span>
                        <span className={`text-xs font-bold ${w.balance >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {formatCurrency(w.balance)}
                        </span>
                      </div>
                      {w.topCategory && (
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-xs text-surface-400 dark:text-surface-500">
                            {'Principal'}
                          </span>
                          <span className="text-xs text-surface-500 dark:text-surface-400 truncate max-w-[120px]">
                            {t(`category.${w.topCategory}`) ?? w.topCategory}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Anomalies Tab */}
      {activeTab === 'anomalies' && (
        anomalies.length === 0 ? (
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-surface-900 dark:text-surface-100">
                  {'Nenhum gasto anômalo detectado'}
                </p>
                <p className="text-xs text-surface-400 dark:text-surface-500">
                  {'Seus gastos estão dentro do padrão esperado'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                {'Gastos Incomuns Detectados'}
              </h3>
              <span className="text-xs text-surface-400 dark:text-surface-500 ml-auto">
                {'Últimos 3 meses'}
              </span>
            </div>
            <p className="text-xs text-surface-400 dark:text-surface-500 mb-4">
              {'Gastos que estão significativamente acima da sua média habitual'}
            </p>
            <div className="space-y-3">
              {anomalies.map((a, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {a.title}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                        {t(`category.${a.category}`) ?? a.category} · {new Date(a.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                        {formatCurrency(a.amount)}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {'Média'}: {formatCurrency(a.averageInCategory)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex-1 h-1.5 rounded-full bg-amber-200 dark:bg-amber-800/30">
                      <div
                        className="h-1.5 rounded-full bg-amber-500"
                        style={{ width: `${Math.min(a.deviation * 20, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">
                      {a.deviation}σ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}
