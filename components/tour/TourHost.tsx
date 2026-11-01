'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bell,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Dumbbell,
  PartyPopper,
  Receipt,
  Rocket,
  Sparkles,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { openQuickAdd, TRANSACTION_CREATED_EVENT } from '@/lib/quickAdd'
import {
  API_MUTATION_EVENT,
  TOUR_CHANGED_EVENT,
  TOUR_STEP_ORDER,
  finishTour,
  persistTourCompleted,
  readTour,
  requestTourAction,
  stepForMutation,
  writeTour,
  type TourState,
  type TourStepId,
} from '@/lib/tour'

interface StepDef {
  id: TourStepId
  short: string
  icon: LucideIcon
  /** Tailwind classes for the icon tile */
  tile: string
  title: string
  description: string
  tips: (desktop: boolean) => string[]
  cta: string
  skip: string
  success: string
}

const STEPS: Record<TourStepId, StepDef> = {
  salary: {
    id: 'salary',
    short: 'Seu salário',
    icon: Wallet,
    tile: 'bg-emerald-500 shadow-emerald-500/30',
    title: 'Quanto entra por mês?',
    description: 'Cadastre seu salário uma vez só e o Vynta lança ele sozinho todo mês. Assim você sempre sabe quanto ainda pode gastar.',
    tips: () => ['Recebe no 5º dia útil? Tem opção pra isso.', 'Recebe em duas quinzenas? Também dá.'],
    cta: 'Configurar meu salário',
    skip: 'Não tenho salário fixo',
    success: 'Salário configurado! Agora o Vynta já sabe quanto entra todo mês.',
  },
  expense: {
    id: 'expense',
    short: 'Primeiro gasto',
    icon: Receipt,
    tile: 'bg-rose-500 shadow-rose-500/30',
    title: 'Anote seu primeiro gasto',
    description: 'Pensa no último gasto que você fez: um café, um iFood, um Uber... Coloca aí! Leva uns 5 segundos.',
    tips: () => ['Só o valor e um nome já bastam — o resto é opcional.'],
    cta: 'Anotar meu primeiro gasto',
    skip: 'Faço isso depois',
    success: 'Primeiro gasto anotado! É esse hábito que muda o jogo.',
  },
  quick: {
    id: 'quick',
    short: 'Gasto rápido',
    icon: Zap,
    tile: 'bg-amber-500 shadow-amber-500/30',
    title: 'O atalho que muda tudo ⚡',
    description: 'O segredo de quem controla o dinheiro é anotar NA HORA. Por isso o gasto rápido está sempre a um toque:',
    tips: (desktop) =>
      desktop
        ? ['Aperte a tecla N em qualquer tela', 'Ou clique em "Anotar gasto" no painel', 'Funciona até sem internet — sincroniza sozinho depois']
        : ['Toque no botão + no meio da barra lá embaixo', 'Com o app instalado, segure o ícone do Vynta → "Anotar gasto"', 'Funciona até sem internet — sincroniza sozinho depois'],
    cta: 'Entendi!',
    skip: 'Testar agora',
    success: 'Show! Agora você anota qualquer gasto em segundos.',
  },
  card: {
    id: 'card',
    short: 'Seu cartão',
    icon: CreditCard,
    tile: 'bg-cyan-500 shadow-cyan-500/30',
    title: 'Cadastre seu cartão',
    description: 'Coloque o dia de fechamento e de vencimento: o Vynta monta a fatura certinha e te avisa antes de vencer. Chega de juros por esquecimento.',
    tips: () => ['Usa Nubank? Dá pra importar a fatura inteira de uma vez.'],
    cta: 'Adicionar meu cartão',
    skip: 'Não uso cartão',
    success: 'Cartão cadastrado! A gente te avisa antes da fatura vencer.',
  },
  habit: {
    id: 'habit',
    short: 'Um hábito',
    icon: CheckSquare,
    tile: 'bg-orange-500 shadow-orange-500/30',
    title: 'Crie seu primeiro hábito',
    description: 'Beber água, ler 10 páginas, meditar... Escolha só UM pra começar. Marque todo dia e veja sua sequência 🔥 crescer.',
    tips: () => ['Comece pequeno: o importante é não quebrar a sequência.'],
    cta: 'Criar meu hábito',
    skip: 'Pular por enquanto',
    success: 'Hábito criado! Agora é manter a sequência 🔥',
  },
  workout: {
    id: 'workout',
    short: 'Seu treino',
    icon: Dumbbell,
    tile: 'bg-violet-500 shadow-violet-500/30',
    title: 'Monte seu treino',
    description: 'Crie sua ficha (ex: "Treino A — Peito"), registre as cargas e acompanhe sua evolução semana a semana.',
    tips: () => ['Depois é só adicionar os exercícios dentro da ficha.'],
    cta: 'Montar meu treino',
    skip: 'Não treino (ainda 😉)',
    success: 'Treino criado! Agora é só registrar as cargas 💪',
  },
}

const ACTION_ROUTES: Partial<Record<TourStepId, { action: 'salary' | 'card' | 'habit' | 'workout'; href: string }>> = {
  salary: { action: 'salary', href: '/finances' },
  card: { action: 'card', href: '/cards' },
  habit: { action: 'habit', href: '/habits' },
  workout: { action: 'workout', href: '/workout' },
}

const TOTAL = TOUR_STEP_ORDER.length

function nextStage(state: TourState, from: number): TourState {
  let i = from + 1
  while (i < TOTAL && state.done.includes(TOUR_STEP_ORDER[i])) i++
  if (i >= TOTAL) return { ...state, stage: 'finish', minimized: false }
  return { ...state, step: i, minimized: false }
}

export default function TourHost() {
  const router = useRouter()
  const [tour, setTour] = useState<TourState | null>(null)
  const [celebrating, setCelebrating] = useState<TourStepId | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [desktop, setDesktop] = useState(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const sync = () => setTour(readTour())
    sync()
    window.addEventListener(TOUR_CHANGED_EVENT, sync)
    const mq = window.matchMedia('(min-width: 768px)')
    const onMq = () => setDesktop(mq.matches)
    onMq()
    mq.addEventListener('change', onMq)
    return () => {
      window.removeEventListener(TOUR_CHANGED_EVENT, sync)
      mq.removeEventListener('change', onMq)
      clearTimeout(advanceTimer.current)
    }
  }, [])

  // Reaching the last screen already counts as "done" for the account.
  useEffect(() => {
    if (tour?.active && tour.stage === 'finish') persistTourCompleted()
  }, [tour?.active, tour?.stage])

  const markDone = useCallback((id: TourStepId) => {
    const current = readTour()
    if (!current?.active || current.stage !== 'steps' || current.done.includes(id)) return
    const updated: TourState = { ...current, done: [...current.done, id] }
    if (TOUR_STEP_ORDER[current.step] !== id) {
      // Did a later step ahead of time: just remember it, it'll be skipped when we get there.
      writeTour(updated)
      return
    }
    writeTour({ ...updated, minimized: false })
    setCelebrating(id)
    clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => {
      setCelebrating(null)
      const latest = readTour()
      if (latest?.active) writeTour(nextStage(latest, latest.step))
    }, 2200)
  }, [])

  // Notice when the user actually finishes a step (anywhere in the app).
  useEffect(() => {
    const onMutation = (e: Event) => {
      const { path, method } = (e as CustomEvent<{ path: string; method: string }>).detail || {}
      const id = path && method ? stepForMutation(path, method) : null
      if (id) markDone(id)
    }
    const onTransaction = () => markDone('expense')
    window.addEventListener(API_MUTATION_EVENT, onMutation)
    window.addEventListener(TRANSACTION_CREATED_EVENT, onTransaction)
    return () => {
      window.removeEventListener(API_MUTATION_EVENT, onMutation)
      window.removeEventListener(TRANSACTION_CREATED_EVENT, onTransaction)
    }
  }, [markDone])

  if (!tour?.active) return null

  const update = (patch: Partial<TourState>) => writeTour({ ...tour, ...patch })
  const exit = () => {
    setConfirmExit(false)
    finishTour()
  }

  const ExitConfirm = (
    <div className="space-y-4 text-center animate-in fade-in zoom-in-95">
      <p className="font-display text-lg font-bold text-surface-900 dark:text-white">Quer sair do tutorial?</p>
      <p className="text-sm leading-relaxed text-surface-500 dark:text-surface-400">
        Sem problema! Se mudar de ideia, é só abrir <strong className="text-surface-800 dark:text-surface-200">Ajustes → Refazer tutorial</strong>
        {!desktop && <> (ou o menu <strong className="text-surface-800 dark:text-surface-200">Mais → Tutorial</strong>)</>}.
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button onClick={exit} className="h-11 flex-1 rounded-2xl text-sm font-semibold text-surface-500 transition hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800">
          Sair do tutorial
        </button>
        <button onClick={() => setConfirmExit(false)} className="h-11 flex-1 rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition active:scale-[0.98]">
          Continuar
        </button>
      </div>
    </div>
  )

  // ── Welcome & finish: centered modal (bottom sheet on phones) ──
  if (tour.stage === 'welcome' || tour.stage === 'finish') {
    const finishing = tour.stage === 'finish'
    return (
      <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Tutorial do Vynta">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" />
        <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-4 fade-in dark:bg-surface-900 sm:max-w-md sm:rounded-[2rem] sm:pb-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-purple-700 px-6 pb-7 pt-8 text-white">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            {!finishing && !confirmExit && (
              <button onClick={() => setConfirmExit(true)} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white/90 transition hover:bg-white/25" aria-label="Pular tutorial">
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              {finishing ? <PartyPopper className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
            </div>
            <h2 className="font-display text-2xl font-bold leading-tight tracking-tight">
              {finishing ? 'Seu Vynta está pronto! 🎉' : 'Bem-vindo ao Vynta! 👋'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              {finishing
                ? `Você completou ${tour.done.length} de ${TOTAL} passos. Agora é só usar um pouquinho todo dia — é aí que a mágica acontece.`
                : 'Em uns 2 minutinhos você configura o essencial, já vê pra onde vai seu dinheiro e coloca a rotina nos eixos.'}
            </p>
          </div>

          <div className="space-y-5 px-6 pt-5">
            {confirmExit ? ExitConfirm : (
              <>
                <ul className="grid grid-cols-2 gap-2">
                  {TOUR_STEP_ORDER.map((id, i) => {
                    const s = STEPS[id]
                    const Icon = s.icon
                    const done = tour.done.includes(id)
                    return (
                      <li key={id} className="flex items-center gap-2.5 rounded-2xl border border-surface-100 bg-surface-50 p-2.5 dark:border-surface-800 dark:bg-surface-800/40">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${done ? 'bg-emerald-500 shadow-emerald-500/30' : s.tile}`}>
                          {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 text-xs font-semibold leading-tight text-surface-700 dark:text-surface-200">
                          {!finishing && <span className="block text-[10px] font-bold uppercase tracking-wider text-surface-400">Passo {i + 1}</span>}
                          {s.short}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                {finishing ? (
                  <div className="flex items-start gap-3 rounded-2xl bg-brand-500/10 p-3.5 text-sm text-brand-800 dark:text-brand-200">
                    <Bell className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Ative as notificações em <strong>Ajustes</strong> e o Vynta te lembra das contas, dos hábitos e de anotar os gastos do dia.</p>
                  </div>
                ) : (
                  <p className="text-center text-xs text-surface-500 dark:text-surface-400">
                    Cada passo é opcional — pule o que não fizer sentido pra você.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => (finishing ? (finishTour(), router.push('/dashboard')) : update({ stage: 'steps', step: 0, minimized: false }))}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-500 active:scale-[0.98]"
                  >
                    {finishing ? <>Bora usar! <Rocket className="h-4 w-4" /></> : <>Bora começar <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  {finishing ? (
                    <button onClick={() => { finishTour(); router.push('/settings') }} className="h-11 w-full rounded-2xl text-sm font-semibold text-surface-500 transition hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800">
                      Ativar lembretes agora
                    </button>
                  ) : (
                    <button onClick={() => setConfirmExit(true)} className="h-11 w-full rounded-2xl text-sm font-semibold text-surface-500 transition hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800">
                      Pular tutorial
                    </button>
                  )}
                </div>

                {!finishing && (
                  <p className="text-center text-[11px] leading-relaxed text-surface-400">
                    Dá pra refazer quando quiser em <strong>Ajustes → Refazer tutorial</strong>.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Steps ──
  const stepId = TOUR_STEP_ORDER[tour.step]
  const step = STEPS[stepId]
  const Icon = step.icon
  const progress = (
    <div className="flex gap-1" aria-hidden>
      {TOUR_STEP_ORDER.map((id, i) => (
        <span
          key={id}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
            tour.done.includes(id) ? 'bg-emerald-500' : i === tour.step ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-700'
          }`}
        />
      ))}
    </div>
  )

  // Collapsed pill while the user is doing the step (sits under app modals: z-45 < z-50).
  if (tour.minimized && !celebrating) {
    return (
      <button
        onClick={() => update({ minimized: false })}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[45] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-surface-200 bg-white/95 py-2 pl-2 pr-4 shadow-xl shadow-black/10 backdrop-blur animate-in fade-in slide-in-from-bottom-2 dark:border-surface-700 dark:bg-surface-900/95 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
        aria-label="Abrir tutorial"
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md ${step.tile}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-surface-400">Tutorial · {tour.step + 1}/{TOTAL}</span>
          <span className="block text-sm font-semibold text-surface-800 dark:text-surface-100">{step.short}</span>
        </span>
        <ChevronUp className="h-4 w-4 text-surface-400" />
      </button>
    )
  }

  const runCta = () => {
    if (stepId === 'quick') return markDone('quick')
    if (stepId === 'expense') {
      update({ minimized: true })
      return openQuickAdd('EXPENSE')
    }
    const route = ACTION_ROUTES[stepId]
    if (!route) return
    update({ minimized: true })
    requestTourAction(route.action, route.href, router.push)
  }

  const runSkip = () => {
    if (stepId === 'quick') {
      update({ minimized: true })
      return openQuickAdd('EXPENSE')
    }
    writeTour(nextStage(tour, tour.step))
  }

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[45] max-h-[70dvh] overflow-y-auto rounded-[1.75rem] border border-surface-200 bg-white p-5 shadow-2xl shadow-black/20 animate-in fade-in slide-in-from-bottom-4 dark:border-surface-700 dark:bg-surface-900 md:inset-x-auto md:bottom-6 md:right-6 md:w-[400px]"
      role="dialog"
      aria-label={`Tutorial: ${step.title}`}
    >
      {confirmExit ? ExitConfirm : celebrating ? (
        <div key={celebrating} className="flex flex-col items-center py-4 text-center animate-in zoom-in-95 fade-in">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
            <Check className="h-8 w-8" strokeWidth={3} />
          </span>
          <p className="font-display text-xl font-bold text-surface-900 dark:text-white">Mandou bem! ✨</p>
          <p className="mt-1.5 max-w-[280px] text-sm text-surface-500 dark:text-surface-400">{STEPS[celebrating].success}</p>
          <div className="mt-5 w-full">{progress}</div>
        </div>
      ) : (
        <div key={stepId} className="animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400">Passo {tour.step + 1} de {TOTAL}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => update({ minimized: true })} className="rounded-full p-1.5 text-surface-400 transition hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800" aria-label="Minimizar tutorial">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button onClick={() => setConfirmExit(true)} className="rounded-full p-1.5 text-surface-400 transition hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800" aria-label="Sair do tutorial">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {progress}

          <div className="mt-5 flex items-start gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${step.tile}`}>
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold leading-snug text-surface-900 dark:text-white">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-surface-500 dark:text-surface-400">{step.description}</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {step.tips(desktop).map((tip) => (
              <li key={tip} className="flex items-start gap-2 rounded-xl bg-surface-50 px-3 py-2 text-[13px] text-surface-600 dark:bg-surface-800/50 dark:text-surface-300">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={3} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={runCta}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-500 active:scale-[0.98]"
            >
              {step.cta}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={runSkip} className="h-10 w-full rounded-2xl text-sm font-semibold text-surface-500 transition hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800">
              {step.skip}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

