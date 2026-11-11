'use client'

import ReportMonthPicker, { currentReportMonth } from '@/components/ReportMonthPicker'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, BarChart3, CalendarDays, ChevronLeft, ChevronRight, Download, Lightbulb, RefreshCw, Sparkles, Target, TrendingUp, Wallet, ArrowRight, ChevronDown } from 'lucide-react'
import { localizeCategoryName } from '@/lib/categories'
import { openQuickAdd } from '@/lib/quickAdd'
import { reportCurrency as money, reportMonth, type ReportInsight, type ReportSnapshot } from '@/lib/reportTypes'

const AdvancedReports = dynamic(() => import('@/components/AdvancedReports'), { loading: () => <SectionSkeleton /> })
const MonthlyGoalsReport = dynamic(() => import('@/components/MonthlyGoalsReport'), { loading: () => <SectionSkeleton /> })
const ExportModal = dynamic(() => import('@/components/ExportModal'))
const colors = ['#7c6af2', '#36b9a3', '#f2ad5b', '#e67c9a', '#5d9de8', '#a4a8b8']

function SectionSkeleton() {
  return <div className="report-panel space-y-4" role="status" aria-label="Carregando relatório"><div className="skeleton h-5 w-40" /><div className="skeleton h-52 w-full rounded-2xl" /></div>
}

function Change({ amount, expense = false }: { amount: number; expense?: boolean }) {
  const positive = expense ? amount < 0 : amount > 0
  return <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
    <span className={amount === 0 ? 'text-surface-500' : positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
      {amount > 0 ? '+' : amount < 0 ? '−' : ''}{money(Math.abs(amount))}
    </span><span className="text-surface-500 dark:text-surface-400">vs. mês anterior</span>
  </p>
}

function localInsights(report: ReportSnapshot): ReportInsight[] {
  const items: ReportInsight[] = []
  const top = report.categories[0]
  if (top && report.summary.expense > 0) items.push({ type: 'tip', text: `${localizeCategoryName(top.category)} representa ${Math.round(top.amount / report.summary.expense * 100)}% das despesas. Comece por essa categoria ao revisar seu orçamento.` })
  const result = report.summary.income - report.summary.expense
  items.push({ type: result >= 0 ? 'positive' : 'negative', text: result >= 0 ? `As receitas superam as despesas em ${money(result)} neste período. Confira os próximos vencimentos antes de destinar essa diferença a uma meta.` : `As despesas superam as receitas em ${money(-result)} neste período. Revise os gastos previstos e os lançamentos que ainda faltam.` })
  return items
}

export default function ReportsClient({ initialReport }: { initialReport: ReportSnapshot }) {
  const [selectedMonth, setSelectedMonth] = useState(initialReport.period)
  const [currentMonth, setCurrentMonth] = useState(currentReportMonth)
  useEffect(() => {
    const update = () => setCurrentMonth(currentReportMonth())
    const timer = setInterval(update, 60_000)
    window.addEventListener('focus', update)
    return () => { clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  const [report, setReport] = useState(initialReport)
  const [tab, setTab] = useState<'overview' | 'goals'>('overview')
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [insights, setInsights] = useState<ReportInsight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [insightsFallback, setInsightsFallback] = useState(false)
  const [insightRetry, setInsightRetry] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('vynta:transaction-created', refresh)
    return () => window.removeEventListener('vynta:transaction-created', refresh)
  }, [])

  useEffect(() => {
    if (selectedMonth === initialReport.period && revision === 0) {
      setReport(initialReport)
      setLoading(false)
      setError('')
      return
    }
    const controller = new AbortController()
    const [year, month] = selectedMonth.split('-')
    setLoading(true)
    setError('')
    fetch(`/api/transactions/monthly?type=report&year=${year}&month=${month}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar este período.')
        return response.json() as Promise<ReportSnapshot>
      })
      .then((data) => { if (!controller.signal.aborted) setReport(data) })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível carregar este período. Seus dados estão salvos.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [selectedMonth, initialReport, revision])

  useEffect(() => {
    if (report.period !== selectedMonth || loading || error) return
    if (!report.summary.transactionCount) { setInsights([]); setInsightsLoading(false); return }
    const controller = new AbortController()
    const [year, month] = report.period.split('-').map(Number)
    setInsightsLoading(true)
    setInsights([])
    setInsightsFallback(false)
    fetch('/api/insights', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'pt-BR', year, month }), signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error('Análise indisponível')
      return response.json()
    }).then((data) => {
      if (controller.signal.aborted) return
      const valid = Array.isArray(data.insights) ? data.insights.filter((item: ReportInsight) => typeof item?.text === 'string' && ['positive', 'negative', 'tip'].includes(item.type)).slice(0, 4) : []
      if (!valid.length) throw new Error('Análise vazia')
      setInsights(valid)
      setInsightsFallback(data.source === 'summary')
    }).catch(() => {
      if (!controller.signal.aborted) { setInsights(localInsights(report)); setInsightsFallback(true) }
    }).finally(() => { if (!controller.signal.aborted) setInsightsLoading(false) })
    return () => controller.abort()
  }, [report, selectedMonth, insightRetry, loading, error])

  const busy = loading || report.period !== selectedMonth
  const months = Array.from(new Set([currentMonth, selectedMonth, ...initialReport.months, ...report.months])).filter(month => month <= currentMonth).sort().reverse()
  const monthIndex = months.indexOf(selectedMonth)
  const { summary, comparison } = report
  const monthResult = summary.income - summary.expense
  const savingsRate = summary.income > 0 ? monthResult / summary.income * 100 : null
  const maxTrend = Math.max(1, ...report.trend.flatMap((item) => [item.income, item.expense]))
  const top = report.categories[0]
  const topShare = top && summary.expense > 0 ? Math.round(top.amount / summary.expense * 100) : 0
  const empty = summary.transactionCount === 0

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
      <header className="border-b border-surface-200/70 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"><BarChart3 className="h-5 w-5" /></div>
            <div><h1 className="font-display text-lg font-bold tracking-tight">Relatórios</h1><p className="hidden text-xs text-surface-500 sm:block">Clareza para decidir o próximo passo.</p></div>
          </div>
          <button className="report-button shrink-0" onClick={() => setExportOpen(true)} disabled={busy || !!error} aria-label="Exportar relatório do período"><Download className="h-4 w-4" /><span>Exportar</span></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-8">
        <section className="report-hero relative overflow-hidden rounded-3xl border border-violet-200/60 p-5 dark:border-violet-500/20 sm:p-8">
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-lg">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Seu dinheiro, com perspectiva</p>
              <h2 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Entenda seu mês.<br /><span className="text-surface-500 dark:text-surface-400">Planeje o que vem depois.</span></h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-surface-600 dark:text-surface-400">Seus números e uma análise personalizada, reunidos para ajudar nas escolhas do dia a dia.</p>
            </div>
            <div className="w-full shrink-0 rounded-2xl border border-white/80 bg-white/75 p-3 dark:border-surface-700 dark:bg-surface-900/80 sm:w-64">
              <label htmlFor="report-month" className="mb-2 flex items-center gap-2 px-1 text-xs font-medium text-surface-500 dark:text-surface-400"><CalendarDays className="h-3.5 w-3.5" /> Período do relatório</label>
              <div className="flex items-center gap-1">
                <button className="report-icon-button" aria-label="Mês anterior disponível" disabled={monthIndex >= months.length - 1} onClick={() => setSelectedMonth(months[monthIndex + 1])}><ChevronLeft className="h-4 w-4" /></button>
                <ReportMonthPicker value={selectedMonth} months={months} onChange={value => { if (value <= currentReportMonth()) setSelectedMonth(value) }} />
                <button className="report-icon-button" aria-label="Próximo mês disponível" disabled={monthIndex <= 0} onClick={() => setSelectedMonth(months[monthIndex - 1])}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-surface-200 bg-surface-100/80 p-1 dark:border-surface-800 dark:bg-surface-900" aria-label="Seções do relatório">
            <button aria-pressed={tab === 'overview'} className={`report-tab ${tab === 'overview' ? 'report-tab-active' : ''}`} onClick={() => setTab('overview')}><BarChart3 className="h-4 w-4" />Visão geral</button>
            <button aria-pressed={tab === 'goals'} className={`report-tab ${tab === 'goals' ? 'report-tab-active' : ''}`} onClick={() => setTab('goals')}><Target className="h-4 w-4" />Metas</button>
          </div>
          <span className="hidden text-xs text-surface-500 sm:block">{busy ? 'Atualizando período…' : `${summary.transactionCount} lançamentos no período`}</span>
        </div>

        {error ? <div role="alert" className="report-panel text-center"><p className="text-sm text-surface-600 dark:text-surface-300">{error}</p><button className="report-button mx-auto mt-4" onClick={() => setRevision((value) => value + 1)}><RefreshCw className="h-4 w-4" />Tentar novamente</button></div>
          : busy ? <div className="space-y-5" aria-busy="true"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map((index) => <div key={index} className={`skeleton h-36 rounded-2xl ${index === 2 ? 'col-span-2 sm:col-span-1' : ''}`} />)}</div><SectionSkeleton /></div>
          : tab === 'goals' ? <MonthlyGoalsReport selectedMonth={selectedMonth} formatCurrency={money} />
          : <div className="report-content space-y-5 sm:space-y-6" key={report.period}>
            <section aria-label="Resumo financeiro" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <article className="report-panel !p-4 sm:!p-5">
                <div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-xs font-medium text-surface-500 dark:text-surface-400 sm:text-sm">Receitas</h3><ArrowDownLeft className="h-5 w-5 text-emerald-500" /></div>
                <p className="break-words text-lg font-bold tracking-tight tabular-nums sm:text-2xl">{money(summary.income)}</p><Change amount={comparison.incomeChange} />
              </article>
              <article className="report-panel !p-4 sm:!p-5">
                <div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-xs font-medium text-surface-500 dark:text-surface-400 sm:text-sm">Despesas</h3><ArrowUpRight className="h-5 w-5 text-rose-400" /></div>
                <p className="break-words text-lg font-bold tracking-tight tabular-nums sm:text-2xl">{money(summary.expense)}</p><Change amount={comparison.expenseChange} expense />
              </article>
              <article className="report-panel col-span-2 !border-violet-200 !bg-violet-50/60 !p-4 dark:!border-violet-500/20 dark:!bg-violet-500/5 sm:col-span-1 sm:!p-5">
                <div className="mb-4 flex items-center justify-between"><h3 className="text-xs font-medium text-violet-700 dark:text-violet-300 sm:text-sm">Resultado do mês</h3><Wallet className="h-5 w-5 text-violet-500" /></div>
                <p className={`break-words text-2xl font-bold tracking-tight tabular-nums ${monthResult < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-violet-700 dark:text-violet-300'}`}>{money(monthResult)}</p>
                <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">{savingsRate === null ? 'Receitas menos despesas do período' : monthResult >= 0 ? `${savingsRate.toFixed(0)}% das receitas restaram no mês` : 'Confira receitas ainda não registradas e gastos previstos'}</p>
              </article>
            </section>

            {empty ? <section className="report-panel py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 dark:bg-violet-500/10"><BarChart3 className="h-7 w-7" /></div>
              <h2 className="text-lg font-semibold">Seu próximo passo começa com um registro</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-surface-500">Não há lançamentos em {reportMonth(selectedMonth)}. Escolha outro período ou registre uma receita ou despesa para acompanhar seus números.</p>
              <button className="btn-primary mx-auto mt-5 inline-flex items-center gap-2" onClick={() => openQuickAdd('EXPENSE')}>Registrar lançamento<ArrowRight className="h-4 w-4" /></button>
            </section> : <section className="report-panel !border-violet-200/70 dark:!border-violet-500/20" aria-labelledby="insights-title" aria-busy={insightsLoading}>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"><Sparkles className="h-5 w-5" /></div><div><h2 id="insights-title" className="font-semibold">Um olhar sobre seu mês</h2><p className="mt-0.5 text-xs text-surface-500">O que merece sua atenção em {reportMonth(selectedMonth)}.</p></div></div>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">{insightsFallback ? 'Resumo dos seus números' : 'Análise com IA'}</span>
              </div>
              {insightsLoading ? <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Analisando seus números">{[0, 1, 2, 3].map((item) => <div key={item} className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-800/40"><div className="skeleton mb-3 h-3 w-24" /><div className="skeleton mb-2 h-3 w-full" /><div className="skeleton h-3 w-4/5" /></div>)}</div>
                : <div className="grid gap-3 sm:grid-cols-2">{insights.map((insight, index) => {
                  const tone = insight.type === 'negative' ? 'text-amber-600 dark:text-amber-400' : insight.type === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'
                  const Icon = insight.type === 'tip' ? Lightbulb : insight.type === 'positive' ? TrendingUp : ArrowUpRight
                  return <article key={index} className="rounded-2xl border border-surface-100 bg-surface-50/70 p-4 dark:border-surface-800 dark:bg-surface-800/30"><p className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${tone}`}><Icon className="h-3.5 w-3.5" />{insight.type === 'negative' ? 'Ponto de atenção' : insight.type === 'positive' ? 'Bom sinal' : 'Próximo passo'}</p><p className="break-words text-sm leading-relaxed text-surface-700 dark:text-surface-300">{insight.text}</p></article>
                })}</div>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-relaxed text-surface-500">
                <p>{insightsFallback ? 'A IA está indisponível. Este resumo foi calculado com seus lançamentos.' : 'Baseado nos seus lançamentos. Confira os valores antes de tomar decisões.'}</p>
                {insightsFallback && <button className="inline-flex min-h-11 items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400" onClick={() => setInsightRetry((value) => value + 1)}><RefreshCw className="h-3 w-3" />Tentar análise com IA</button>}
              </div>
            </section>}

            <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
              <section className="report-panel" aria-labelledby="categories-title">
                <h2 id="categories-title" className="font-semibold">Para onde foi o dinheiro</h2><p className="mt-1 text-xs text-surface-500">Distribuição das despesas do período.</p>
                {!top ? <p className="py-16 text-center text-sm text-surface-500">Nenhuma despesa neste mês.</p> : <>
                  <div className="my-6 flex items-center gap-5">
                    <div className="relative h-28 w-28 shrink-0" aria-hidden="true">
                      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90"><circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="13" className="text-surface-100 dark:text-surface-800" />
                        {report.categories.map((category, index) => {
                          const before = report.categories.slice(0, index).reduce((sum, item) => sum + item.amount, 0) / summary.expense * 100
                          const share = category.amount / summary.expense * 100
                          return <circle key={category.category} cx="60" cy="60" r="48" fill="none" pathLength="100" stroke={colors[index % colors.length]} strokeWidth="13" strokeDasharray={`${Math.max(0, share - 0.8)} ${100 - Math.max(0, share - 0.8)}`} strokeDashoffset={-before} />
                        })}
                      </svg><span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">{topShare}%</span>
                    </div>
                    <div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">Maior categoria</p><p className="mt-1 break-words font-semibold">{localizeCategoryName(top.category)}</p><p className="mt-1 text-sm text-surface-500">{money(top.amount)} · {topShare}% do total</p></div>
                  </div>
                  <ul className="space-y-4">{report.categories.slice(0, 5).map((category, index) => <li key={category.category}>
                    <div className="mb-2 flex items-baseline justify-between gap-3 text-xs"><span className="min-w-0 break-words text-surface-600 dark:text-surface-300">{localizeCategoryName(category.category)}</span><span className="shrink-0 font-semibold tabular-nums">{money(category.amount)}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800"><div className="h-full rounded-full" style={{ width: `${category.amount / summary.expense * 100}%`, backgroundColor: colors[index % colors.length] }} /></div>
                  </li>)}</ul>
                  {report.categories.length > 5 && <details className="mt-4 text-xs"><summary className="cursor-pointer py-2 font-medium text-violet-600 dark:text-violet-400">Ver outras {report.categories.length - 5} categorias</summary><ul className="space-y-3 pt-2">{report.categories.slice(5).map((item) => <li key={item.category} className="flex justify-between gap-3"><span>{localizeCategoryName(item.category)}</span><span className="shrink-0 tabular-nums">{money(item.amount)}</span></li>)}</ul></details>}
                </>}
              </section>

              <section className="report-panel" aria-labelledby="trend-title">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="trend-title" className="font-semibold">Sua evolução</h2><p className="mt-1 text-xs text-surface-500">Seis meses até {reportMonth(selectedMonth)}.</p></div><div className="flex gap-3 text-[11px] text-surface-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-400" />Receitas</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-violet-400" />Despesas</span></div></div>
                <div className="relative mb-5 mt-8" role="img" aria-label="Gráfico de receitas e despesas dos últimos seis meses. Valores detalhados na tabela abaixo.">
                  <div className="pointer-events-none absolute inset-x-0 bottom-7 top-0 flex flex-col justify-between" aria-hidden="true">{[0, 1, 2, 3].map((line) => <div key={line} className="border-t border-dashed border-surface-200 dark:border-surface-800" />)}</div>
                  <div className="relative grid grid-cols-6 gap-2">{report.trend.map((item, index) => <div key={index} className="min-w-0"><div className="flex h-44 items-end justify-center gap-1.5 sm:h-52"><div className="w-3 max-w-5 rounded-t-md bg-emerald-400 sm:w-5" style={{ height: `${item.income / maxTrend * 100}%`, minHeight: item.income > 0 ? 3 : 0 }} title={`Receitas: ${money(item.income)}`} /><div className="w-3 max-w-5 rounded-t-md bg-violet-400 sm:w-5" style={{ height: `${item.expense / maxTrend * 100}%`, minHeight: item.expense > 0 ? 3 : 0 }} title={`Despesas: ${money(item.expense)}`} /></div><p className={`mt-3 text-center text-[11px] ${index === 5 ? 'font-bold text-violet-600 dark:text-violet-300' : 'text-surface-500'}`}>{item.month}</p></div>)}</div>
                </div>
                <details className="border-t border-surface-100 pt-3 dark:border-surface-800"><summary className="cursor-pointer py-2 text-xs font-medium text-surface-600 dark:text-surface-400">Ver valores por mês</summary><div className="overflow-x-auto"><table className="mt-2 w-full text-xs tabular-nums"><caption className="sr-only">Receitas e despesas por mês</caption><thead><tr className="text-surface-500"><th className="py-2 text-left">Mês</th><th className="text-right">Receitas</th><th className="text-right">Despesas</th></tr></thead><tbody>{report.trend.map((item, index) => <tr key={index}><th className="py-2 text-left font-normal">{item.month} {item.year}</th><td className="text-right">{money(item.income)}</td><td className="text-right">{money(item.expense)}</td></tr>)}</tbody></table></div></details>
                <div className="mt-4 rounded-xl bg-surface-50 p-4 dark:bg-surface-800/40"><p className="flex items-center justify-between gap-3 text-xs text-surface-500"><span>Saldo acumulado até este mês</span><span className="font-semibold tabular-nums text-surface-800 dark:text-surface-200">{money(summary.balance)}</span></p><p className="mt-2 text-[11px] leading-relaxed text-surface-500">Inclui o saldo dos meses anteriores. O resultado do mês considera apenas este período.</p></div>
              </section>
            </div>

            <section className="report-panel !p-0 overflow-hidden">
              <button className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6" aria-expanded={showAdvanced} aria-controls="advanced-report" onClick={() => setShowAdvanced((value) => !value)}>
                <span className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-violet-500 dark:bg-surface-800"><TrendingUp className="h-5 w-5" /></span><span><span className="block text-sm font-semibold">Saúde financeira do período</span><span className="mt-1 block text-xs leading-relaxed text-surface-500">Pontuação, gastos fora do padrão e semanas do mês selecionado.</span></span></span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-surface-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              {showAdvanced && <div id="advanced-report" className="border-t border-surface-100 p-3 dark:border-surface-800 sm:p-5"><AdvancedReports formatCurrency={money} isBRL period={selectedMonth} revision={revision} /></div>}
            </section>
            <p className="px-1 text-center text-xs leading-relaxed text-surface-500">Um lançamento faz diferença no seu relatório. <Link href="/finances" className="font-medium text-violet-600 underline-offset-4 hover:underline dark:text-violet-400">Conferir minhas finanças</Link></p>
          </div>}
      </main>
      {exportOpen && <ExportModal isOpen onClose={() => setExportOpen(false)} selectedMonth={selectedMonth} />}
    </div>
  )
}
