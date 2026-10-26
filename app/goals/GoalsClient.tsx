'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'
import GoalModal from './GoalModal'
import TransactionModal from './TransactionModal'

export default function GoalsClient({ initialGoals }: { initialGoals: any[] }) {
  const router = useRouter()
  const [goals, setGoals] = useState<any[]>(initialGoals)
  const [loading, setLoading] = useState(false)
  
  const [isGoalModalOpen, setGoalModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null)
  
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false)
  const [transactionGoal, setTransactionGoal] = useState<any | null>(null)

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) {
        const data = await res.json()
        setGoals(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (goal: any) => {
    setSelectedGoal(goal)
    setGoalModalOpen(true)
  }

  const handleAddMoney = (goal: any) => {
    setTransactionGoal(goal)
    setTransactionModalOpen(true)
  }

  return (
    <div className="min-h-[100dvh] bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      {/* Header */}
      <header className="border-b border-surface-200/80 bg-white/80 dark:bg-surface-900/80 dark:border-surface-800 sticky top-0 z-30 transition-colors duration-300 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="group flex h-10 w-10 items-center justify-center rounded-full text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100 transition-all duration-300 active:scale-95"
              title="Voltar ao Dashboard"
            >
              <Lucide.ArrowLeft strokeWidth={1.5} className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <h1 className="font-display text-base font-semibold tracking-tight">Metas Financeiras</h1>
          </div>
          <button
            onClick={() => {
              setSelectedGoal(null)
              setGoalModalOpen(true)
            }}
            className="group relative inline-flex items-center justify-center rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_16px_-6px_rgba(48,64,235,0.4)] transition-all duration-300 hover:bg-brand-700 hover:shadow-[0_12px_20px_-8px_rgba(48,64,235,0.6)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:scale-[0.98] dark:focus:ring-offset-surface-900"
          >
            <span className="flex items-center gap-2">
              <Lucide.Plus strokeWidth={2} className="w-4 h-4" />
              Nova Meta
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-24 space-y-12">
        <div
          className="animate-in fade-in slide-in-from-bottom-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
        >
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-surface-600 dark:text-surface-400 backdrop-blur-sm">
              Visão Geral
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter text-surface-900 dark:text-white leading-tight">
              Seus Objetivos
            </h1>
            <p className="text-base text-surface-500 dark:text-surface-400 mt-3 max-w-[65ch] leading-relaxed">
              Transforme seus sonhos em planos. Guarde dinheiro com propósito e acompanhe cada passo do seu progresso em tempo real.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div
            className="animate-in fade-in zoom-in-95 p-1.5 rounded-[2.5rem] bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700/50"
          >
            <div className="rounded-[calc(2.5rem-0.375rem)] bg-white dark:bg-surface-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-center py-24 px-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(66,88,249,0.05),transparent_50%)] pointer-events-none" />
              <div className="w-20 h-20 rounded-full bg-surface-50 dark:bg-surface-950 border border-surface-100 dark:border-surface-800 flex items-center justify-center mb-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] relative z-10 group-hover:rotate-3 transition-transform duration-300">
                <Lucide.Target strokeWidth={1.5} className="w-10 h-10 text-brand-500" />
              </div>
              <h3 className="font-display text-2xl font-bold tracking-tight mb-3 relative z-10 text-surface-900 dark:text-white">Transforme objetivos em progresso.</h3>
              <p className="text-sm font-medium text-surface-500 dark:text-surface-400 max-w-sm mb-8 leading-relaxed relative z-10">
                A jornada para suas realizações começa com um único passo. Qual é o seu próximo grande objetivo?
              </p>
              <button
                onClick={() => {
                  setSelectedGoal(null)
                  setGoalModalOpen(true)
                }}
                className="group relative inline-flex z-10 items-center justify-center gap-2 rounded-full bg-brand-600 px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(48,64,235,0.4)] transition-all duration-300 hover:bg-brand-700 hover:shadow-[0_12px_24px_-8px_rgba(48,64,235,0.6)] active:scale-[0.98]"
              >
                <Lucide.Plus className="w-4 h-4" />
                Criar meta
              </button>
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <>
              {goals.map((g) => {
                const current = parseFloat(g.currentAmount)
                const target = parseFloat(g.targetAmount)
                let progress = target > 0 ? (current / target) * 100 : 0
                if (progress > 100) progress = 100

                const formatValue = (val: number) => 
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val)

                return (
                  <div
                    key={g.id} 
                    className="animate-in fade-in slide-in-from-bottom-4 group relative p-1.5 rounded-[2rem] bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700/50 hover:bg-surface-200/50 dark:hover:bg-surface-700/50 transition-colors duration-500"
                  >
                    <div className="relative h-full flex flex-col rounded-[calc(2rem-0.375rem)] bg-white dark:bg-surface-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-6 overflow-hidden">
                      {/* Subtle Background Glow */}
                      <div className={`absolute top-0 right-0 w-48 h-48 rounded-full ${g.color || 'bg-brand-500'} opacity-[0.03] dark:opacity-[0.05] blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none`} />

                      <div className="flex items-start justify-between relative z-10 mb-8">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg ${g.color || 'bg-brand-500'} shadow-brand-500/20`}>
                            <Lucide.Target strokeWidth={1.5} className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="inline-block px-2.5 py-1 rounded-full text-[9px] font-bold bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-1.5 border border-surface-100 dark:border-surface-700/50">
                              {g.category || 'Geral'}
                            </span>
                            <h3 className="font-display text-lg font-bold leading-tight text-surface-900 dark:text-white tracking-tight">
                              {g.title}
                            </h3>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleEdit(g)}
                          className="p-2 -mt-2 -mr-2 rounded-full text-surface-400 hover:text-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-colors"
                        >
                          <Lucide.MoreVertical strokeWidth={1.5} className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-1" />

                      <div className="space-y-4 relative z-10 mb-6">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium mb-1">Acumulado</span>
                            <span className="font-mono text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
                              {formatValue(current)}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium mb-1">Meta</span>
                            <span className="font-mono text-sm font-semibold text-surface-600 dark:text-surface-300">
                              {formatValue(target)}
                            </span>
                          </div>
                        </div>

                        {/* Premium Progress Bar */}
                        <div className="relative pt-2">
                          <div className="flex mb-2 items-center justify-between">
                            <div />
                            <div className="text-right">
                              <span className="text-[11px] font-bold tracking-wider inline-block text-surface-900 dark:text-white">
                                {progress.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-surface-100 dark:bg-surface-800/80 shadow-inner">
                            <div
                              style={{ width: `${progress}%` }}
                              className={`transition-[width] duration-1000 ease-out shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${g.color || 'bg-brand-500'} relative`}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripes_1s_linear_infinite] opacity-30" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add Money Button */}
                      <button
                        onClick={() => handleAddMoney(g)}
                        className="w-full relative z-10 py-3 rounded-xl border border-surface-200 dark:border-surface-700/80 bg-white dark:bg-surface-900 text-sm font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all duration-300 flex items-center justify-center gap-2 group-hover:border-surface-300 dark:group-hover:border-surface-600 active:scale-[0.98] shadow-sm hover:shadow"
                      >
                        <Lucide.Sliders strokeWidth={1.5} className="w-5 h-5 text-surface-500 dark:text-surface-400 group-hover:text-brand-500 transition-colors" />
                        Gerenciar
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          </div>
        )}
      </main>

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        goal={selectedGoal}
        onSuccess={() => {
          setGoalModalOpen(false)
          fetchGoals()
        }}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        goal={transactionGoal}
        onSuccess={() => {
          setTransactionModalOpen(false)
          fetchGoals()
        }}
      />
    </div>
  )
}
