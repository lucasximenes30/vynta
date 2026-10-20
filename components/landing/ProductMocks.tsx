import { Bell, CalendarDays, Check, CreditCard, Dumbbell, Flame, RefreshCcw, Target } from 'lucide-react'

// Illustrative UI previews of real Vynta features, rendered in code (crisp at any size, zero JS).

function Frame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#0d0e14] p-4 shadow-2xl shadow-black/50 sm:p-5 ${className}`}>
      {children}
    </div>
  )
}

const TRANSACTIONS = [
  { title: 'Mercado', category: 'Alimentação', amount: '- R$ 186,40', tag: null, color: 'text-rose-300' },
  { title: 'Notebook', category: 'Cartão final 4821', amount: '- R$ 312,50', tag: 'Parcela 3/10', color: 'text-rose-300' },
  { title: 'Streaming', category: 'Assinatura', amount: '- R$ 39,90', tag: 'Todo dia 12', color: 'text-rose-300' },
  { title: 'Salário', category: 'Receita', amount: '+ R$ 4.200,00', tag: null, color: 'text-emerald-300' },
]

export function FinanceMock() {
  return (
    <Frame>
      <div className="rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white">
        <p className="text-xs text-white/70">Saldo atual</p>
        <p className="mt-1 font-display text-3xl font-semibold tracking-tight">R$ 2.847,30</p>
        <div className="mt-3 flex gap-6 text-xs">
          <div>
            <p className="text-white/60">Receitas</p>
            <p className="font-semibold">R$ 4.200,00</p>
          </div>
          <div>
            <p className="text-white/60">Despesas</p>
            <p className="font-semibold">R$ 1.352,70</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-surface-400">
            <CreditCard className="h-3.5 w-3.5" /> Fatura de novembro
          </div>
          <p className="mt-1.5 text-sm font-semibold text-white">R$ 1.240,90</p>
          <p className="text-[11px] text-surface-500">Fecha dia 3 · vence dia 10</p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
            <Bell className="h-3.5 w-3.5" /> Vence em 2 dias
          </div>
          <p className="mt-1.5 text-sm font-semibold text-white">Internet</p>
          <p className="text-[11px] text-surface-500">R$ 99,90 · dia 15</p>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02]">
        {TRANSACTIONS.map((t) => (
          <li key={t.title} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{t.title}</p>
              <p className="flex items-center gap-1.5 truncate text-[11px] text-surface-500">
                {t.category}
                {t.tag && (
                  <span className="inline-flex items-center gap-1 rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-200">
                    <RefreshCcw className="h-2.5 w-2.5" /> {t.tag}
                  </span>
                )}
              </p>
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${t.color}`}>{t.amount}</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

const HABITS = [
  { name: 'Beber 2L de água', done: [1, 1, 1, 1, 1, 0, 0] },
  { name: 'Ler 20 minutos', done: [1, 0, 1, 1, 1, 0, 0] },
  { name: 'Sem gastos por impulso', done: [1, 1, 1, 1, 1, 0, 0] },
]

export function HabitsMock() {
  return (
    <Frame>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Esta semana</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-300">
          <Flame className="h-3 w-3" /> 12 dias seguidos
        </span>
      </div>
      <div className="space-y-2.5">
        {HABITS.map((habit) => (
          <div key={habit.name} className="flex items-center justify-between gap-3">
            <p className="truncate text-xs text-surface-300">{habit.name}</p>
            <div className="flex shrink-0 gap-1">
              {habit.done.map((d, i) => (
                <span
                  key={i}
                  className={`flex h-5 w-5 items-center justify-center rounded-md ${d ? 'bg-emerald-500 text-white' : i === 5 ? 'border border-dashed border-surface-500' : 'bg-white/[0.05]'}`}
                >
                  {d ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

export function GoalsMock() {
  return (
    <Frame>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
          <Target className="h-4 w-4 text-emerald-300" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Viagem de férias</p>
          <p className="text-[11px] text-surface-500">Lazer</p>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between text-xs">
        <span className="font-display text-xl font-semibold text-white">R$ 3.100</span>
        <span className="text-surface-500">de R$ 5.000 · 62%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
      </div>
      <p className="mt-3 text-[11px] text-surface-400">+ R$ 300 guardados esta semana</p>
    </Frame>
  )
}

const EVENTS = [
  { time: '08:00', title: 'Academia', color: 'bg-orange-400' },
  { time: '14:30', title: 'Reunião com cliente', color: 'bg-brand-400' },
  { time: '19:00', title: 'Pagar fatura do cartão', color: 'bg-rose-400' },
]

export function AgendaMock() {
  return (
    <Frame>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <CalendarDays className="h-4 w-4 text-pink-300" /> Hoje, quinta-feira
      </div>
      <ul className="space-y-2">
        {EVENTS.map((e) => (
          <li key={e.title} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
            <span className={`h-6 w-1 rounded-full ${e.color}`} />
            <span className="w-11 text-[11px] tabular-nums text-surface-500">{e.time}</span>
            <span className="truncate text-xs text-surface-200">{e.title}</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

const EXERCISES = [
  { name: 'Supino reto', sets: '4 × 10', load: '40 kg', up: true },
  { name: 'Remada curvada', sets: '4 × 12', load: '35 kg', up: false },
  { name: 'Agachamento', sets: '4 × 8', load: '60 kg', up: true },
]

export function WorkoutMock() {
  return (
    <Frame>
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <Dumbbell className="h-4 w-4 text-orange-300" /> Treino A
        </p>
        <span className="text-[11px] text-surface-500">3 exercícios</span>
      </div>
      <ul className="space-y-2">
        {EXERCISES.map((ex) => (
          <li key={ex.name} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
            <span className="text-surface-200">{ex.name}</span>
            <span className="flex items-center gap-3 tabular-nums text-surface-400">
              {ex.sets}
              <span className={ex.up ? 'text-emerald-300' : 'text-surface-300'}>{ex.load}{ex.up ? ' ↑' : ''}</span>
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}
