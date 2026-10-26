'use client'

import { useState, useEffect } from 'react'
import * as Lucide from 'lucide-react'
import { useRouter } from 'next/navigation'

const SLIDES = [
  {
    title: 'Bem-vindo ao Vynta',
    description: 'Seu ecossistema pessoal definitivo. Mais do que finanças, um sistema de gestão de vida projetado para o seu sucesso.',
    icon: Lucide.Sparkles,
    color: 'bg-brand-500',
    shadow: 'shadow-brand-500/30'
  },
  {
    title: 'Controle Financeiro',
    description: 'Acompanhe receitas, despesas e cartões de crédito. Tudo centralizado com gráficos e relatórios precisos.',
    icon: Lucide.Wallet,
    color: 'bg-emerald-500',
    shadow: 'shadow-emerald-500/30'
  },
  {
    title: 'Metas e Sonhos',
    description: 'Guarde dinheiro com propósito. Defina objetivos claros e acompanhe seu progresso até alcançá-los.',
    icon: Lucide.Target,
    color: 'bg-blue-500',
    shadow: 'shadow-blue-500/30'
  },
  {
    title: 'Construa Hábitos',
    description: 'Crie uma rotina inquebrável. Monitore suas sequências diárias e transforme pequenas ações em grandes resultados.',
    icon: Lucide.CheckSquare,
    color: 'bg-orange-500',
    shadow: 'shadow-orange-500/30'
  },
  {
    title: 'Treinos e Saúde',
    description: 'Sua academia no bolso. Monte fichas, registre cargas e acompanhe sua evolução física dia após dia.',
    icon: Lucide.Dumbbell,
    color: 'bg-rose-500',
    shadow: 'shadow-rose-500/30'
  },
  {
    title: 'Agenda e Ideias',
    description: 'Sua mente limpa e organizada. Anote ideias rápidas e não perca nenhum evento importante.',
    icon: Lucide.CalendarDays,
    color: 'bg-indigo-500',
    shadow: 'shadow-indigo-500/30'
  }
]

export default function OnboardingClient() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    // Small delay to ensure hydration and smooth entry
    const timer = setTimeout(() => {
      const hasCompleted = localStorage.getItem('vynta_onboarding_completed')
      if (!hasCompleted) {
        setIsOpen(true)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    localStorage.setItem('vynta_onboarding_completed', 'true')
    setIsOpen(false)
    router.refresh()
  }

  if (!isOpen) return null

  const slide = SLIDES[currentSlide]
  const Icon = slide.icon

  return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" />
        
        <div
          key={currentSlide}
          className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 relative w-full max-w-md bg-surface-50 dark:bg-surface-950 rounded-[2.5rem] p-1.5 shadow-2xl border border-white/10 overflow-hidden"
        >
          <div className="bg-white dark:bg-surface-900 rounded-[calc(2.5rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden relative">
            
            {/* Top glowing gradient line */}
            <div className={`absolute top-0 left-0 w-full h-1 ${slide.color} opacity-70 transition-colors duration-500`} />

            <div className="p-8 pb-10 flex flex-col items-center text-center">
              
              {/* Skip button */}
              <button 
                onClick={handleComplete}
                className="absolute top-6 right-6 text-[10px] font-bold uppercase tracking-wider text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              >
                Pular
              </button>

              {/* Icon / Illustration Area */}
              <div className="mb-8 mt-4 relative">
                <div className={`absolute inset-0 blur-2xl ${slide.color} opacity-20 dark:opacity-30 rounded-full scale-150 transition-colors duration-500`} />
                <div className={`relative w-24 h-24 rounded-[1.75rem] flex items-center justify-center text-white ${slide.color} shadow-lg ${slide.shadow} transition-colors duration-500`}>
                  <Icon strokeWidth={1.5} className="w-10 h-10" />
                </div>
              </div>

              {/* Text Area */}
              <h2 className="font-display text-2xl font-bold text-surface-900 dark:text-white mb-3 tracking-tight">
                {slide.title}
              </h2>
              <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed max-w-[280px]">
                {slide.description}
              </p>

            </div>

            {/* Bottom Actions */}
            <div className="bg-surface-50/80 dark:bg-surface-950/80 backdrop-blur-md border-t border-surface-100 dark:border-surface-800 p-6 flex flex-col gap-6">
              
              {/* Dots indicator */}
              <div className="flex justify-center gap-2">
                {SLIDES.map((_, i) => (
                  <div 
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? `w-6 ${slide.color}` : 'w-1.5 bg-surface-200 dark:bg-surface-800'}`}
                  />
                ))}
              </div>

              {/* Next CTA */}
              <button
                onClick={handleNext}
                className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${slide.color} ${slide.shadow}`}
              >
                {currentSlide === SLIDES.length - 1 ? (
                  <>
                    <span>Começar Agora</span>
                    <Lucide.Rocket strokeWidth={2} className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Próximo</span>
                    <Lucide.ArrowRight strokeWidth={2} className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
  )
}
