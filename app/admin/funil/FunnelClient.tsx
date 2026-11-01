'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import * as Lucide from 'lucide-react'

interface FunnelStep {
  key?: string
  name: string
  value: number
}

export interface FunnelPayload {
  range: string
  lastResetAt: string | null
  totalEventsRecorded: number
  revenueInPeriod: number
  funnel1Data: FunnelStep[]
  funnel2Data: FunnelStep[]
}

const RANGE_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'all', label: 'Todo período' },
]

export default function FunnelClient({ initialPayload }: { initialPayload: FunnelPayload }) {
  const [payload, setPayload] = useState<FunnelPayload>(initialPayload)
  const [range, setRange] = useState<string>(initialPayload.range || 'all')
  const [loading, setLoading] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearTarget, setClearTarget] = useState<'funnel' | 'test_payments' | 'all_payments' | 'everything'>('funnel')
  const [clearing, setClearing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const fetchFunnel = async (nextRange: string = range) => {
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/admin/funnel?range=${encodeURIComponent(nextRange)}`)
      if (res.ok) {
        const data = await res.json()
        setPayload(data)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRangeChange = (nextRange: string) => {
    setRange(nextRange)
    fetchFunnel(nextRange)
  }

  const handleClear = async () => {
    setClearing(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/funnel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: clearTarget }),
      })
      if (res.ok) {
        const data = await res.json()
        setPayload(data)
        setRange('all')
        setShowClearModal(false)
        setFeedback('Dados limpos com sucesso! O funil já está atualizado.')
      }
    } finally {
      setClearing(false)
    }
  }

  const { funnel1Data, funnel2Data, revenueInPeriod, lastResetAt } = payload

  const visitors = funnel1Data.find((s) => s.key === 'landing_view')?.value ?? funnel1Data[0]?.value ?? 0
  const signups = funnel1Data.find((s) => s.key === 'signup_completed')?.value ?? 0
  const activated = funnel1Data.find((s) => s.key === 'dashboard_first_view')?.value ?? 0
  const checkouts = funnel1Data.find((s) => s.key === 'payment_attempted')?.value ?? 0
  const purchases = funnel1Data.find((s) => s.key === 'purchase')?.value ?? 0

  const pct = (num: number, den: number) => (den > 0 ? ((num / den) * 100).toFixed(1) : '0.0')

  const visitToSignupPct = pct(signups, visitors)
  const signupToActivePct = pct(activated, signups)
  const checkoutToPurchasePct = pct(purchases, checkouts)
  const overallConversionPct = pct(purchases, visitors || signups)

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Top Header + Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Funis de Conversão</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1 text-sm">
            Jornada real do usuário: Visita → Trial Grátis → Ativação no Painel → Checkout → Assinatura Paga.
            {lastResetAt && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-surface-200/70 dark:bg-surface-800 px-2 py-0.5 text-xs text-surface-600 dark:text-surface-300">
                Contando desde {new Date(lastResetAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="inline-flex rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleRangeChange(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  range === opt.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchFunnel(range)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-3.5 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-50"
          >
            <Lucide.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => setShowClearModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            <Lucide.Trash2 className="w-4 h-4" />
            Limpar Dados
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <span className="flex items-center gap-2">
            <Lucide.CheckCircle2 className="w-4 h-4 shrink-0" />
            {feedback}
          </span>
          <button onClick={() => setFeedback(null)} className="text-xs underline opacity-80 hover:opacity-100">
            Fechar
          </button>
        </div>
      )}

      {/* --- FUNIL 1: AQUISIÇÃO COMPLETA --- */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white">Fase 1: Funil de Aquisição (Visita → Trial → Venda)</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl flex items-center justify-center shrink-0">
                <Lucide.Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500">Visitantes Únicos</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">{visitors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                <Lucide.UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500">Cadastros (Trial)</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{signups}</p>
                  <span className="text-xs font-semibold text-blue-500">{visitToSignupPct}% das visitas</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <Lucide.ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500">Vendas Concluídas</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{purchases}</p>
                  {revenueInPeriod > 0 && (
                    <span className="text-xs font-semibold text-emerald-500">
                      {revenueInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                <Lucide.TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500">Conversão Global</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">{overallConversionPct}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart */}
          <div className="lg:col-span-7 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm p-6">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel1Data} layout="vertical" margin={{ top: 5, right: 24, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={165} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'rgba(124, 58, 237, 0.05)' }}
                  />
                  <Bar dataKey="value" name="Usuários / Sessões" fill="#7C3AED" radius={[0, 6, 6, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Step-by-step Breakdown Table */}
          <div className="lg:col-span-5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white mb-4">Detalhamento por Etapa</h3>
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {funnel1Data.map((step, idx) => {
                  const prev = idx > 0 ? funnel1Data[idx - 1].value : step.value
                  const stepRate = idx === 0 ? '100%' : `${pct(step.value, prev)}%`
                  return (
                    <div key={step.name} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                      <span className="text-surface-700 dark:text-surface-300 font-medium truncate">{step.name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-surface-900 dark:text-white">{step.value}</span>
                        <span className="w-14 text-right text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
                          {stepRate}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <p className="text-[11px] text-surface-400 mt-4">
              * A coluna % ao lado de cada etapa mostra a passagem em relação à etapa imediatamente anterior.
            </p>
          </div>
        </div>
      </div>

      {/* --- FUNIL 2: ATIVAÇÃO E FECHAMENTO --- */}
      <div className="space-y-6 pt-6 border-t border-surface-200 dark:border-surface-800">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white">Fase 2: Ativação do Trial & Fechamento</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                <Lucide.LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500">Criaram Conta & Entraram no Painel</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {activated} <span className="text-sm font-normal text-surface-400">de {signups} ({signupToActivePct}%)</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                <Lucide.CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500">Iniciaram Pagamento (Checkout)</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {checkouts} <span className="text-sm font-normal text-surface-400">({pct(checkouts, signups)}% dos trials)</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <Lucide.CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500">Conversão do Checkout</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {checkoutToPurchasePct}% <span className="text-sm font-normal text-surface-400">({purchases} de {checkouts})</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm p-6">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel2Data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={175} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(124, 58, 237, 0.05)' }}
                />
                <Bar dataKey="value" name="Usuários" fill="#10b981" radius={[0, 6, 6, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal de Limpeza de Dados */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                  <Lucide.Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-surface-900 dark:text-white">Limpar Dados do Admin</h3>
                  <p className="text-xs text-surface-500">Escolha o que deseja zerar para começar a medir do zero.</p>
                </div>
              </div>
              <button
                onClick={() => setShowClearModal(false)}
                className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <Lucide.X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'funnel' as const,
                  title: 'Zerar Funil de Conversão',
                  desc: 'Apaga os eventos do funil e reinicia a contagem de visitas, cliques, cadastros e vendas a partir de agora.',
                },
                {
                  id: 'test_payments' as const,
                  title: 'Limpar Pagamentos Pendentes / Testes',
                  desc: 'Remove transações de pagamento com status Pendente, Expirado, Cancelado ou Falhou.',
                },
                {
                  id: 'all_payments' as const,
                  title: 'Zerar Histórico de Pagamentos Completo',
                  desc: 'Apaga todas as transações registradas na aba Pagamentos (útil após bater testes de webhook).',
                },
                {
                  id: 'everything' as const,
                  title: 'Limpar Tudo (Funil + Pgtos. Pendentes + Logs)',
                  desc: 'Zera o funil, remove cobranças pendentes/testes e limpa os logs de ações.',
                },
              ].map((item) => (
                <label
                  key={item.id}
                  onClick={() => setClearTarget(item.id)}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                    clearTarget === item.id
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="clearTarget"
                    checked={clearTarget === item.id}
                    onChange={() => setClearTarget(item.id)}
                    className="mt-1 accent-rose-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-surface-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {clearing && <Lucide.Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {clearing ? 'Limpando...' : 'Confirmar Limpeza'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
