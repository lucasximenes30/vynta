'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'
import OnboardingClient from '@/components/OnboardingClient'
import FunnelTracker from '@/components/FunnelTracker'
import { openQuickAdd } from '@/lib/quickAdd'
import dynamic from 'next/dynamic'

const PushPrompt = dynamic(() => import('@/components/push/PushPrompt'), { ssr: false })

interface Session {
  userId: string
  email: string
  name: string
}

interface HabitDTO {
  id: string
  title: string
  color: string
}

interface CheckinDTO {
  habitId: string
  date: string
  completed: boolean
}

interface CalendarEventDTO {
  id: string
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  isAllDay: boolean
  category?: string
  color: string
}

interface DashboardClientProps {
  session: Session
  balance: {
    income: number
    expense: number
    balance: number
  }
  habits: HabitDTO[]
  checkins: CheckinDTO[]
  events: CalendarEventDTO[]
  activeWorkoutPlanName: string | null
  plan: string
  subscriptionExpiresAt: string | null
  isNewUser?: boolean
}

export default function DashboardClient({
  session,
  balance,
  habits,
  checkins,
  events,
  activeWorkoutPlanName,
  plan,
  subscriptionExpiresAt,
  isNewUser,
}: DashboardClientProps) {
  const router = useRouter()
  const [profileName, setProfileName] = useState(session.name)
  const [trialHoursRemaining, setTrialHoursRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (plan === 'FREE_TRIAL' && subscriptionExpiresAt) {
      const expiresAt = new Date(subscriptionExpiresAt)
      const now = new Date()
      const diffMs = expiresAt.getTime() - now.getTime()
      if (diffMs > 0) {
        setTrialHoursRemaining(Math.ceil(diffMs / (1000 * 60 * 60)))
      } else {
        setTrialHoursRemaining(0)
      }
    }
  }, [plan, subscriptionExpiresAt])

  // New entries from the quick-add sheet (or undo) update the balance module
  useEffect(() => {
    const handler = () => router.refresh()
    window.addEventListener('vynta:transaction-created', handler)
    return () => window.removeEventListener('vynta:transaction-created', handler)
  }, [router])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const todayStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const quickActions = [
    { label: 'Finanças', icon: Lucide.Wallet, href: '/finances', color: 'text-brand-500 bg-brand-500/10' },
    { label: 'Hábitos', icon: Lucide.CheckSquare, href: '/habits', color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Treinos', icon: Lucide.Dumbbell, href: '/workout', color: 'text-orange-500 bg-orange-500/10' },
    { label: 'Agenda', icon: Lucide.CalendarDays, href: '/calendar', color: 'text-pink-500 bg-pink-500/10' },
    { label: 'Metas', icon: Lucide.Target, href: '/goals', color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Notas', icon: Lucide.StickyNote, href: '/notes', color: 'text-yellow-500 bg-yellow-500/10' },
  ]

  return (
    <>
      <OnboardingClient />
      {isNewUser && <FunnelTracker eventName="dashboard_first_view" onceKey="dashboard_first_view" />}
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-300 animate-dashboard-fade">
        
        {/* Top Header */}
        <header className="border-b border-surface-200/80 bg-white dark:bg-surface-900 dark:border-surface-800 transition-colors duration-300">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-semibold tracking-tight text-surface-900 dark:text-surface-100">
                Vynta — Central
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline text-sm text-surface-500 dark:text-surface-400">
                {profileName}
              </span>

              <button
                onClick={() => router.push('/settings')}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-all duration-200"
                title="Configurações"
              >
                <Lucide.Settings className="w-5 h-5" />
              </button>

              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  router.push('/login')
                }}
                className="hidden text-sm text-surface-500 transition-colors hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200 sm:inline"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          
          {/* Welcome Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-purple-800 p-5 sm:p-8 text-white shadow-xl dark:shadow-brand-500/10 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-3 sm:space-y-4">
              <div className="hidden sm:flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-white/15 border border-white/10 text-[10px] font-bold tracking-widest uppercase shadow-sm">
                  <Lucide.Calendar className="w-3.5 h-3.5" />
                  {todayStr}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-emerald-500/20 border border-emerald-400/20 text-emerald-100 text-[10px] font-bold tracking-widest uppercase shadow-sm">
                  <Lucide.ShieldCheck className="w-3.5 h-3.5" />
                  Conta Segura
                </span>
              </div>
              <div>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                  {getGreeting()}, {profileName.split(' ')[0]}!
                </h2>
                <p className="mt-1 hidden text-sm text-white/90 max-w-[65ch] leading-relaxed font-medium sm:block">
                  Bem-vindo ao Vynta. O seu painel pessoal seguro para gerenciar finanças, construir hábitos duradouros e evoluir fisicamente.
                </p>
                <p className="mt-1 text-xs font-medium text-white/70 sm:hidden">{todayStr}</p>
              </div>
              <button
                onClick={() => openQuickAdd('EXPENSE')}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-brand-700 shadow-lg shadow-black/10 transition-transform active:scale-95"
              >
                <Lucide.PlusCircle className="h-5 w-5" />
                Anotar gasto
              </button>
            </div>
          </div>

          {/* Trial Expiration Banner */}
          {plan === 'FREE_TRIAL' && trialHoursRemaining !== null && trialHoursRemaining > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Lucide.Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    Período de Teste
                  </h3>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Seu teste acaba em <strong className="font-bold text-amber-600 dark:text-amber-400">{trialHoursRemaining >= 48 ? `${Math.ceil(trialHoursRemaining / 24)} dias` : `${trialHoursRemaining} horas`}</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/subscription')}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                Assinar agora
                <Lucide.ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!isNewUser && <PushPrompt />}

          {/* Grid Layout of Pillars */}
          <div className="grid gap-6 md:grid-cols-12">
            
            {/* Daily Progress Module (New Redesign) */}
            <div className="card md:col-span-12 lg:col-span-6 bg-surface-50 dark:bg-surface-900/40 border border-surface-200/50 dark:border-surface-800/80 rounded-3xl p-6 sm:p-8">
              <h3 className="font-display text-base font-bold mb-6 text-surface-900 dark:text-white">Progresso do dia</h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* Ring */}
                <div className="relative flex-shrink-0">
                  {(() => {
                    const todayLocal = new Date()
                    const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`
                    const todayCheckins = checkins.filter(c => c.date === todayStr && c.completed).length
                    const habitsTotal = habits.length
                    const percent = habitsTotal > 0 ? Math.round((todayCheckins / habitsTotal) * 100) : 0
                    
                    const radius = 54
                    const circumference = 2 * Math.PI * radius
                    const strokeDashoffset = circumference - (percent / 100) * circumference

                    return (
                      <>
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-surface-200 dark:text-surface-800" />
                          <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-brand-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-surface-900 dark:text-white">{percent}%</span>
                          <span className="text-[10px] font-medium text-surface-500 uppercase tracking-wider mt-0.5">concluído</span>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Bars */}
                <div className="flex-1 w-full space-y-5">
                  {(() => {
                    const todayLocal = new Date()
                    const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`
                    const todayCheckins = checkins.filter(c => c.date === todayStr && c.completed).length
                    const habitsTotal = habits.length
                    const todayEvents = events.filter(e => e.date.substring(0, 10) === todayStr).length

                    return (
                      <>
                        <div>
                          <div className="flex justify-between text-sm font-semibold mb-2">
                            <span className="text-surface-700 dark:text-surface-300">Hábitos</span>
                            <span className="text-brand-600 dark:text-brand-400">{todayCheckins} / {habitsTotal}</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full transition-all duration-1000" style={{ width: habitsTotal > 0 ? `${(todayCheckins / habitsTotal) * 100}%` : '0%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm font-semibold mb-2">
                            <span className="text-surface-700 dark:text-surface-300">Agenda</span>
                            <span className="text-pink-600 dark:text-pink-400">{todayEvents} eventos</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full transition-all duration-1000" style={{ width: todayEvents > 0 ? '100%' : '0%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm font-semibold mb-2">
                            <span className="text-surface-700 dark:text-surface-300">Treino</span>
                            <span className="text-orange-600 dark:text-orange-400">{activeWorkoutPlanName ? 'Ativo' : 'Nenhum'}</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: activeWorkoutPlanName ? '100%' : '0%' }} />
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Upcoming Appointments Module (New Redesign) */}
            <div className="card md:col-span-12 lg:col-span-6 bg-surface-50 dark:bg-surface-900/40 border border-surface-200/50 dark:border-surface-800/80 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-base font-bold text-surface-900 dark:text-white">Próximos compromissos</h3>
                <button
                  onClick={() => router.push('/calendar')}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1 transition-colors"
                >
                  Abrir Agenda <Lucide.ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-0 relative before:absolute before:inset-0 before:ml-[3.25rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-surface-200 dark:before:via-surface-800 before:to-transparent">
                {(() => {
                  const todayLocal = new Date()
                  const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`
                  const todayEvents = events.filter(e => e.date.substring(0, 10) === todayStr).sort((a, b) => {
                    if (a.isAllDay) return -1
                    if (b.isAllDay) return 1
                    return (a.startTime || '00:00').localeCompare(b.startTime || '00:00')
                  })

                  if (todayEvents.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-6 text-center text-surface-500 dark:text-surface-400">
                        <Lucide.CalendarX2 className="w-10 h-10 mb-3 opacity-50" />
                        <p className="text-sm font-medium">Você está livre hoje!</p>
                      </div>
                    )
                  }

                  return todayEvents.slice(0, 4).map((e, idx) => (
                    <div key={e.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-surface-900 bg-brand-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shadow-brand-500/20 z-10 mx-2 sm:mx-4">
                        <Lucide.Calendar className="w-4 h-4" />
                      </div>
                      
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-surface-800/80 p-4 rounded-2xl shadow-sm border border-surface-100 dark:border-surface-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-surface-900 dark:text-white text-sm">{e.title}</span>
                          <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{e.isAllDay ? 'All' : e.startTime || '--:--'}</span>
                        </div>
                        <p className="text-xs font-medium text-surface-500 dark:text-surface-400 truncate">{e.category || 'Pessoal'}</p>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Finances Module */}
            <div className="card md:col-span-8 relative overflow-hidden group hover:scale-[1.005] transition-all duration-300 bg-surface-50 dark:bg-surface-900/40 border-surface-200/50 dark:border-surface-800/80">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none" />
              <div className="relative space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-base font-semibold flex items-center gap-2">
                    <Lucide.Wallet className="w-5 h-5 text-brand-500" />
                    <span>Finanças Pessoais</span>
                  </h3>
                  <button
                    onClick={() => router.push('/finances')}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1"
                  >
                    <span>Ir para Finanças</span>
                    <Lucide.ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Balance display */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-2xl bg-white dark:bg-surface-800/40 border border-surface-150 dark:border-surface-700/50">
                    <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Saldo Geral</p>
                    <p className="text-xl font-bold mt-1 text-surface-900 dark:text-white truncate">
                      {formatCurrency(balance.balance)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-surface-800/40 border border-surface-150 dark:border-surface-700/50">
                    <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Receitas</p>
                    <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 truncate">
                      {formatCurrency(balance.income)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-surface-800/40 border border-surface-150 dark:border-surface-700/50">
                    <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Despesas</p>
                    <p className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400 truncate">
                      {formatCurrency(balance.expense)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Note Module */}
            <div className="card md:col-span-4 flex flex-col justify-between group hover:scale-[1.01] transition-transform duration-300 bg-surface-50 dark:bg-surface-900/40 border-surface-200/50 dark:border-surface-800/80">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-base font-semibold flex items-center gap-2 text-surface-900 dark:text-white">
                    <Lucide.StickyNote className="w-5 h-5 text-yellow-500" />
                    <span>Anotações rápidas</span>
                  </h3>
                  <button
                    onClick={() => router.push('/notes')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 transition-colors text-xs font-bold"
                  >
                    <Lucide.Plus className="w-3.5 h-3.5" />
                    Nova nota
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-150 dark:border-surface-700/50 border-dashed">
                  <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Focar no que importa.
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                    Menos é mais, mas consistente.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Actions Bar */}
          <div className="card">
            <h3 className="font-display text-sm font-semibold text-surface-500 dark:text-surface-400 mb-4 uppercase tracking-wider">Acesso Rápido</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => router.push(action.href)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-surface-50 hover:bg-surface-100 dark:bg-surface-900/60 dark:hover:bg-surface-800 border border-surface-150 dark:border-surface-800 transition-all hover:scale-105 active:scale-95 duration-200"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

        </main>
      </div>

    </>
  )
}
