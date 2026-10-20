'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'
import { getIconByName } from '@/lib/icons'

const HabitsRadarChart = dynamic(() => import('./HabitsRadarChart'), { ssr: false })


// ─── Types ────────────────────────────────────────────────────────────────────
interface HabitDTO {
  id: string
  title: string
  description?: string
  icon: string
  color: string
  order: number
  currentStreak: number
  bestStreak: number
  createdAt: string
}

interface CheckinDTO {
  habitId: string
  date: string
  completed: boolean
}

interface Props {
  session: { userId: string; name: string }
  initialHabits: HabitDTO[]
  initialCheckins: CheckinDTO[]
  initialPrevCheckins: CheckinDTO[]
  weekDates: string[] // 7 dates YYYY-MM-DD, Sun → Sat
  initialHistoricalScore: number
  initialRanking: { userId: string; userName: string; totalScore: number; currentStreak: number; bestStreak: number; rankingPoints: number }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const HABIT_COLORS = [
  { id: 'blue', hex: '#3b82f6', label: 'Azul' },
  { id: 'purple', hex: '#a855f7', label: 'Roxo' },
  { id: 'pink', hex: '#ec4899', label: 'Rosa' },
  { id: 'red', hex: '#ef4444', label: 'Vermelho' },
  { id: 'orange', hex: '#f97316', label: 'Laranja' },
  { id: 'green', hex: '#22c55e', label: 'Verde' },
  { id: 'teal', hex: '#14b8a6', label: 'Teal' },
  { id: 'yellow', hex: '#eab308', label: 'Amarelo' },
  { id: 'indigo', hex: '#6366f1', label: 'Índigo' },
  { id: 'violet', hex: '#8b5cf6', label: 'Violeta' },
  { id: 'cyan', hex: '#06b6d4', label: 'Ciano' },
  { id: 'fuchsia', hex: '#d946ef', label: 'Fúcsia' },
]

const HABIT_ICON_NAMES = [
  'Dumbbell', 'Heart', 'BookOpen', 'Coffee', 'Droplets', 'Moon', 'Sun',
  'Flame', 'Music', 'Code', 'Bike', 'Apple', 'Brain', 'Zap', 'Star',
  'Smile', 'Target', 'Trophy', 'Wind', 'Leaf', 'Pencil', 'Camera',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getColorHex(id: string) {
  return HABIT_COLORS.find((c) => c.id === id)?.hex ?? '#3b82f6'
}

/** Renders a Lucide icon by string name — safe fallback to Target */
function HabitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = getIconByName(name)
  return <Icon className={className} />
}

/** Returns today's local YYYY-MM-DD */
function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getHabitInsights(habits: HabitDTO[], checkins: CheckinDTO[], weekDates: string[], today: string, isBRL: boolean) {
  if (habits.length === 0) return []
  const insights: { type: 'positive' | 'negative' | 'neutral'; text: string }[] = []

  const todayCheckins = checkins.filter(c => c.date === today && c.completed)
  
  if (todayCheckins.length === habits.length) {
    insights.push({
      type: 'positive',
      text: 'Você completou todos os seus hábitos hoje! Excelente trabalho.'
    })
  } else if (todayCheckins.length === 0) {
    insights.push({
      type: 'negative',
      text: 'Você ainda não concluiu nenhum hábito hoje. Mantenha o foco!'
    })
  } else if (todayCheckins.length > 0 && todayCheckins.length < habits.length) {
    const remaining = habits.length - todayCheckins.length
    insights.push({
      type: 'neutral',
      text: `Falta pouco! Conclua mais ${remaining} hábito${remaining > 1 ? 's' : ''} para fechar o dia.`
    })
  }

  const bestHabit = habits.reduce((prev, curr) => (prev.currentStreak > curr.currentStreak) ? prev : curr, habits[0])
  if (bestHabit && bestHabit.currentStreak > 2) {
    insights.push({
      type: 'positive',
      text: `Sua constância em "${bestHabit.title}" está ótima! Já são ${bestHabit.currentStreak} dias seguidos.`
    })
  }

  const worstHabit = habits.reduce((prev, curr) => (prev.currentStreak < curr.currentStreak) ? prev : curr, habits[0])
  if (worstHabit && worstHabit.currentStreak === 0 && insights.length < 3) {
    insights.push({
      type: 'negative',
      text: `Atenção: "${worstHabit.title}" ficou para trás. Que tal retomá-lo hoje?`
    })
  }
  
  const weekCheckins = checkins.filter(c => weekDates.includes(c.date) && c.completed).length
  const weekPossible = habits.length * 7
  if (weekPossible > 0 && (weekCheckins / weekPossible) >= 0.8 && insights.length < 3) {
      insights.push({
      type: 'positive',
      text: `Sua performance semanal está acima de 80%. Continue assim!`
    })
  }

  return insights.slice(0, 3)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HabitsClient({
  session,
  initialHabits,
  initialCheckins,
  initialPrevCheckins,
  weekDates,
  initialHistoricalScore,
  initialRanking,
}: Props) {
  const router = useRouter()
  
  const isBRL = true;
  const today = todayLocal()

  // State
  const [habits, setHabits] = useState<HabitDTO[]>(initialHabits)
  const [checkins, setCheckins] = useState<CheckinDTO[]>(initialCheckins)
  const [ranking] = useState(initialRanking)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  // Drag and drop state
  const [draggedHabitId, setDraggedHabitId] = useState<string | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitDTO | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formIcon, setFormIcon] = useState('Target')
  const [formColor, setFormColor] = useState('blue')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Helpers ──
  const isChecked = useCallback(
    (habitId: string, date: string) =>
      checkins.some((c) => c.habitId === habitId && c.date === date && c.completed),
    [checkins]
  )

  // ── Toggle check-in (optimistic) ──
  const handleToggle = useCallback(
    async (habitId: string, date: string) => {
      const key = `${habitId}-${date}`
      if (togglingKey === key) return

      const current = checkins.some(
        (c) => c.habitId === habitId && c.date === date && c.completed
      )
      const newCompleted = !current

      // Optimistic update
      setCheckins((prev) => {
        const idx = prev.findIndex((c) => c.habitId === habitId && c.date === date)
        if (idx >= 0) {
          return prev.map((c, i) => (i === idx ? { ...c, completed: newCompleted } : c))
        }
        return [...prev, { habitId, date, completed: newCompleted }]
      })

      setTogglingKey(key)
      try {
        const res = await fetch('/api/habits/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ habitId, date, completed: newCompleted }),
        })
        if (!res.ok) {
          // Revert
          setCheckins((prev) => {
            const idx = prev.findIndex((c) => c.habitId === habitId && c.date === date)
            if (idx >= 0) return prev.map((c, i) => (i === idx ? { ...c, completed: current } : c))
            return prev
          })
        } else {
          // Sync exact calculated streaks from server
          const data = await res.json()
          if (data.currentStreak !== undefined && data.bestStreak !== undefined) {
            setHabits((prev) => prev.map(h => 
              h.id === habitId ? { ...h, currentStreak: data.currentStreak, bestStreak: data.bestStreak } : h
            ))
          }
        }
      } catch {
        // Revert
        setCheckins((prev) => {
          const idx = prev.findIndex((c) => c.habitId === habitId && c.date === date)
          if (idx >= 0) return prev.map((c, i) => (i === idx ? { ...c, completed: current } : c))
          return prev
        })
      } finally {
        setTogglingKey(null)
      }
    },
    [togglingKey, checkins]
  )

  // ── Drag and Drop ──
  const handleDragStart = (e: React.DragEvent, habitId: string) => {
    setDraggedHabitId(habitId)
    // Create a generic transparent image to remove the default OS drag ghost
    const dragImg = new Image()
    dragImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(dragImg, 0, 0)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, habitId: string) => {
    e.preventDefault() // Necessary to allow dropping
    if (!draggedHabitId || draggedHabitId === habitId) return

    setHabits((prev) => {
      const oldIndex = prev.findIndex((h) => h.id === draggedHabitId)
      const newIndex = prev.findIndex((h) => h.id === habitId)
      if (oldIndex < 0 || newIndex < 0) return prev

      const newHabits = [...prev]
      const [movedItem] = newHabits.splice(oldIndex, 1)
      newHabits.splice(newIndex, 0, movedItem)
      return newHabits
    })
  }

  const handleDragEnd = async () => {
    setDraggedHabitId(null)
    if (isSavingOrder) return

    setIsSavingOrder(true)
    try {
      const ids = habits.map((h) => h.id)
      await fetch('/api/habits/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
    } catch {
      // Silently fail or add a toast
    } finally {
      setIsSavingOrder(false)
    }
  }

  // ── Save habit (Create or Edit) ──
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSubmitting(true)
    
    // Using PATCH for edit, POST for create
    const isEdit = !!editingHabit
    const url = isEdit ? `/api/habits/${editingHabit.id}` : '/api/habits'
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          icon: formIcon,
          color: formColor,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? 'Erro ao salvar hábito')
        return
      }
      const { habit } = await res.json()
      
      if (isEdit) {
        setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)))
      } else {
        setHabits((prev) => [...prev, habit])
      }
      
      closeModal()
    } catch {
      setFormError('Erro de conexão')
    } finally {
      setFormSubmitting(false)
    }
  }

  // ── Delete habit ──
  const handleDeleteTrigger = (id: string) => {
    setDeletingId(id)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/habits/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        setHabits((prev) => prev.filter((h) => h.id !== deletingId))
        setCheckins((prev) => prev.filter((c) => c.habitId !== deletingId))
        setDeletingId(null)
      }
    } catch { 
      // silent failure mapping
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Modal helpers ──
  const openCreateModal = () => {
    setEditingHabit(null)
    setFormTitle(''); setFormDesc(''); setFormIcon('Target'); setFormColor('blue')
    setFormError('')
    setShowModal(true)
  }
  
  const openEditModal = (habit: HabitDTO) => {
    setEditingHabit(habit)
    setFormTitle(habit.title)
    setFormDesc(habit.description ?? '')
    setFormIcon(habit.icon)
    setFormColor(habit.color)
    setFormError('')
    setShowModal(true)
  }
  
  const closeModal = () => {
    setShowModal(false)
    setTimeout(() => setEditingHabit(null), 200) // Clear after animation
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-300 reports-page-enter">

      {/* ── Header ── */}
      <header className="border-b border-surface-200/80 bg-white dark:bg-surface-900 dark:border-surface-800 transition-colors duration-300">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-surface-900 dark:text-surface-100">
                {'Hábitos'}
              </h1>
              <p className="mt-0.5 text-[13px] leading-5 text-surface-600 dark:text-surface-300">
                {'Construa uma rotina consistente'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-sm text-surface-500 dark:text-surface-400">
              {'Olá'}, {session.name}
            </span>
            <button
              onClick={handleLogout}
              className="hidden text-sm text-surface-500 transition-colors hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200 sm:inline"
            >
              {'Sair'}
            </button>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 sm:hidden"
              aria-label={'Sair'}
            >
              <Lucide.LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Empty state */}
        {habits.length === 0 ? (
          <div className="p-1.5 rounded-[2.5rem] bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700/50">
            <div className="rounded-[calc(2.5rem-0.375rem)] bg-white dark:bg-surface-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-center py-20 px-6 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />
              <div className="w-20 h-20 rounded-[1.5rem] bg-surface-50 dark:bg-surface-950 border border-surface-100 dark:border-surface-800 flex items-center justify-center mb-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] rotate-3 group-hover:rotate-0 transition-transform duration-500 relative z-10">
                <Lucide.CheckSquare strokeWidth={1.5} className="w-10 h-10 text-emerald-500 dark:text-emerald-500" />
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight mb-2 text-surface-900 dark:text-white relative z-10">
                Construa seu sucesso diário.
              </h2>
              <p className="text-sm font-medium text-surface-500 dark:text-surface-400 max-w-sm mb-6 leading-relaxed relative z-10">
                A consistência transforma pequenas ações em grandes resultados. Comece a monitorar seu primeiro hábito.
              </p>
              <button
                onClick={openCreateModal}
                className="group relative inline-flex z-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.4)] transition-all duration-300 hover:bg-emerald-700 hover:shadow-[0_12px_24px_-8px_rgba(16,185,129,0.6)] active:scale-[0.98]"
              >
                <Lucide.Plus className="w-4 h-4" />
                Criar hábito
              </button>
            </div>
          </div>
        ) : (
          /* ── Weekly Grid ── */
          <div className="card overflow-x-auto animate-dashboard-fade">
            {/* Grid header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Semana atual</h2>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  {new Date(weekDates[0] + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  {' – '}
                  {new Date(weekDates[6] + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {(() => {
                    // Daily progress & Gamification
                    const totalHabits = habits.length
                    const completedToday = checkins.filter(c => c.date === today && c.completed).length
                    const todayPct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0
                    const todayScore = (completedToday * 10) + (completedToday === totalHabits && totalHabits > 0 ? 20 : 0)
                    
                    // Weekly progress & Gamification
                    const possibleWeekCheckins = totalHabits * 7
                    const completedWeek = checkins.filter(c => weekDates.includes(c.date) && c.completed).length
                    const weekPct = possibleWeekCheckins > 0 ? Math.round((completedWeek / possibleWeekCheckins) * 100) : 0

                    // Total Gamification checkins calculation 
                    const byDate: Record<string, number> = {}
                    for (const c of checkins.filter(c => c.completed)) {
                      byDate[c.date] = (byDate[c.date] || 0) + 1
                    }
                    let currentWeekScore = 0
                    for (const d in byDate) {
                      currentWeekScore += byDate[d] * 10
                      if (byDate[d] === totalHabits && totalHabits > 0) {
                        currentWeekScore += 20
                      }
                    }
                    const totalScore = initialHistoricalScore + currentWeekScore

                    return (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-md shadow-sm border border-surface-200 dark:border-surface-700">
                          <Lucide.Target className="h-3.5 w-3.5 text-brand-500" />
                          <span>Hoje: {completedToday}/{totalHabits} ({todayPct}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-md shadow-sm border border-surface-200 dark:border-surface-700">
                          <Lucide.CalendarDays className="h-3.5 w-3.5 text-surface-400" />
                          <span>Semana: {completedWeek}/{possibleWeekCheckins}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md shadow-sm border border-purple-200/50 dark:border-purple-800/50 w-full sm:w-auto mt-1 sm:mt-0">
                          <span className="flex-1 sm:flex-none text-center">✨ Score: {totalScore}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="w-full sm:w-auto self-end sm:self-center mt-2 sm:mt-0">
                <button 
                  onClick={openCreateModal} 
                  className="btn-primary text-sm w-full sm:w-auto px-4 py-3 sm:py-2"
                >
                  <Lucide.Plus className="w-4 h-4 mr-2 sm:hidden inline-block" />
                  Novo Hábito
                </button>
              </div>
            </div>

            {/* Day column headers FIXED TO GRID */}
            <div className="hidden sm:grid grid-cols-[minmax(160px,1fr)_repeat(7,40px)_68px] items-end gap-2 mb-2 px-1 pl-6">
              {/* Spacer for habit name column */}
              <div />
              {weekDates.map((date, i) => {
                const isToday = date === today
                return (
                  <div key={date} className="w-10 flex flex-col items-center gap-0.5 justify-self-center">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'}`}>
                      {DAY_LABELS[i]}
                    </span>
                    <span className={`text-xs font-bold ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-surface-500 dark:text-surface-400'}`}>
                      {new Date(date + 'T12:00:00').getDate()}
                    </span>
                    {isToday && (
                      <div className="h-1 w-1 rounded-full bg-brand-500 mt-0.5 absolute -bottom-1.5" />
                    )}
                  </div>
                )
              })}
              {/* Spacer for actions column */}
              <div />
            </div>

            {/* Divider */}
            <div className="hidden sm:block border-t border-surface-100 dark:border-surface-800 mb-1" />

            {/* Habit rows */}
            <div className="pb-2 space-y-3 sm:space-y-0">
              {habits.map((habit) => {
                const colorHex = getColorHex(habit.color)
                const isDragging = draggedHabitId === habit.id
                return (
                  <div 
                    key={habit.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, habit.id)}
                    onDragOver={(e) => handleDragOver(e, habit.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex flex-col sm:grid sm:grid-cols-[minmax(160px,1fr)_repeat(7,40px)_68px] gap-3 sm:gap-2 items-start sm:items-center py-4 sm:py-3 px-4 sm:px-2 group transition-transform duration-200 ${
                      isDragging ? 'opacity-40 scale-95 origin-center' : 'opacity-100'
                    } hover:bg-surface-50/50 dark:hover:bg-surface-800/30 rounded-xl relative sm:pl-6 border border-surface-200 dark:border-surface-700/60 sm:border-transparent sm:dark:border-transparent shadow-sm sm:shadow-none bg-white sm:bg-transparent dark:bg-surface-900 sm:dark:bg-transparent`}
                  >
                    {/* Drag Handle */}
                    <div className="hidden sm:flex absolute left-1 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center p-1 rounded hover:bg-surface-200/50 dark:hover:bg-surface-700/50 cursor-grab active:cursor-grabbing text-surface-400">
                      <Lucide.GripVertical className="h-4 w-4" />
                    </div>

                    {/* Habit info */}
                    <div className="flex flex-row items-center justify-between w-full sm:w-auto pr-0 sm:pr-2">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {/* Drag handle for mobile */}
                        <div className="sm:hidden flex items-center justify-center p-1 -ml-1 text-surface-400 active:text-brand-500 cursor-grab">
                           <Lucide.GripVertical className="h-5 w-5" />
                        </div>
                        <div
                          className="h-10 w-10 sm:h-8 sm:w-8 rounded-xl sm:rounded-lg shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: `${colorHex}1a`, color: colorHex }}
                        >
                          <HabitIcon name={habit.icon} className="h-5 w-5 sm:h-4 sm:w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-base sm:text-sm font-semibold sm:font-medium text-surface-800 dark:text-surface-200 truncate leading-tight">
                            {habit.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className={`text-[11px] sm:text-[10px] font-medium flex items-center gap-1 px-1.5 py-0.5 rounded ${habit.currentStreak > 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50' : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400 border border-surface-200 dark:border-surface-700/50'}`}>
                              {habit.currentStreak > 0 ? '🔥' : <span className="opacity-50">🔥</span>} 
                              <span>Atual: {habit.currentStreak}</span>
                            </p>
                            {habit.bestStreak > 0 && (
                              <p className="text-[11px] sm:text-[10px] font-medium text-surface-500 dark:text-surface-400 flex items-center gap-1">
                                🏆 Melhor: {habit.bestStreak}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile Actions */}
                      <div className="flex sm:hidden items-center gap-1 shrink-0">
                        <button onClick={() => openEditModal(habit)} className="p-2 text-surface-400 hover:text-brand-600 rounded-lg active:bg-surface-100 dark:active:bg-surface-800"><Lucide.Pencil className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteTrigger(habit.id)} className="p-2 text-surface-400 hover:text-red-600 rounded-lg active:bg-surface-100 dark:active:bg-surface-800"><Lucide.Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>

                    {/* Day cells */}
                    <div className="flex sm:contents justify-between w-full mt-2 sm:mt-0">
                      {weekDates.map((date, i) => {
                        const checked = isChecked(habit.id, date)
                        const isFuture = date > today
                        const isToday = date === today
                        const key = `${habit.id}-${date}`
                        const isToggling = togglingKey === key

                        return (
                          <div key={date} className="flex flex-col items-center gap-1.5 sm:contents">
                            {/* Mobile Day Label */}
                            <span className={`sm:hidden text-[10px] font-semibold uppercase ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'}`}>
                              {DAY_LABELS[i]}
                            </span>
                            <button
                              onClick={() => !isFuture && handleToggle(habit.id, date)}
                              disabled={isFuture || isToggling}
                              className={`w-[42px] h-[42px] sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 justify-self-center shrink-0 ${
                                isFuture
                                  ? 'opacity-25 cursor-not-allowed bg-surface-100 dark:bg-surface-800/40 border border-dashed border-surface-300 dark:border-surface-700'
                                  : checked
                                  ? 'shadow-sm hover:opacity-80 active:scale-95 cursor-pointer'
                                  : [
                                      'bg-surface-100 dark:bg-surface-800 border border-surface-200/80 dark:border-surface-700/50',
                                      'hover:bg-surface-200/60 dark:hover:bg-surface-700/60 hover:border-surface-300 dark:hover:border-surface-600',
                                      'active:scale-95 cursor-pointer',
                                      isToday ? 'ring-2 ring-brand-400/40 dark:ring-brand-500/30' : '',
                                    ].join(' ')
                              }`}
                              style={checked ? { backgroundColor: colorHex } : undefined}
                              title={checked ? 'Clique para desmarcar' : isFuture ? 'Dia futuro' : 'Clique para marcar'}
                            >
                              {isToggling ? (
                                <svg className="h-4 w-4 sm:h-3 sm:w-3 animate-spin text-white dark:text-surface-300" fill="none" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                                  <path d="M12 2a10 10 0 019.95 9" fill="currentColor" />
                                </svg>
                              ) : checked ? (
                                <Lucide.Check className="h-5 w-5 sm:h-4 sm:w-4 text-white" strokeWidth={2.5} />
                              ) : null}
                            </button>
                            {/* Mobile Today marker */}
                            {isToday && <div className="sm:hidden h-1 w-1 rounded-full bg-brand-500 mb-0.5" />}
                          </div>
                        )
                      })}
                    </div>

                    {/* Desktop Actions: Edit & Delete */}
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-self-end">
                      <button
                        onClick={() => openEditModal(habit)}
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all duration-200"
                        title="Editar hábito"
                      >
                        <Lucide.Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger(habit.id)}
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                        title="Excluir hábito"
                      >
                        <Lucide.Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Desempenho / Radar Gamification ── */}
        {habits.length > 0 && (() => {
          const totalHabits = habits.length
          const completedInWeek = checkins.filter(c => weekDates.includes(c.date) && c.completed).length
          const totalWeekPossible = totalHabits * 7
          
          // 1. Disciplina: % of habits completed inside week bounds
          const disciplinaPct = totalWeekPossible > 0 ? Math.round((completedInWeek / totalWeekPossible) * 100) : 0

          // 2. Consistência: Avg streak (21 days maxes out -> 100%)
          const avgStreak = habits.reduce((acc, h) => acc + h.currentStreak, 0) / (totalHabits || 1)
          const consistenciaPct = Math.min(100, Math.round((avgStreak / 21) * 100))

          // 3. Frequência: Active Days in week mapping
          const weekCheckinsSet = new Set(checkins.filter(c => weekDates.includes(c.date) && c.completed).map(c => c.date))
          const frequenciaPct = Math.round((weekCheckinsSet.size / 7) * 100)

          // 4. Evolução: Comparison vs PrevWeek 
          const prevCompleted = initialPrevCheckins.filter(c => c.completed).length
          let evolucaoPct = 50
          if (completedInWeek > prevCompleted) {
            evolucaoPct = 50 + Math.min(50, Math.round(((completedInWeek - prevCompleted) / (prevCompleted || 1)) * 50))
          } else if (completedInWeek < prevCompleted && prevCompleted > 0) {
            evolucaoPct = Math.max(0, 50 - Math.round(((prevCompleted - completedInWeek) / prevCompleted) * 50))
          }

          // 5. Controle: Zero-Day Penalization
          const zeroDays = 7 - weekCheckinsSet.size
          const controlePct = Math.max(0, 100 - (zeroDays * 15))

          // 6. Energia: Intensity mapped 
          const energiaPct = weekCheckinsSet.size > 0 
              ? Math.max(0, Math.min(100, Math.round(((completedInWeek / weekCheckinsSet.size) / totalHabits) * 100)))
              : 0

          const radarData = [
            { subject: 'Disciplina', A: disciplinaPct, fullMark: 100 },
            { subject: 'Consistência', A: consistenciaPct, fullMark: 100 },
            { subject: 'Frequência', A: frequenciaPct, fullMark: 100 },
            { subject: 'Evolução', A: evolucaoPct, fullMark: 100 },
            { subject: 'Controle', A: controlePct, fullMark: 100 },
            { subject: 'Energia', A: energiaPct, fullMark: 100 }
          ]

          return (
            <div className="card overflow-hidden animate-dashboard-fade">
              <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6 sm:gap-4 p-4">
                <div className="sm:w-1/3 w-full space-y-4 text-center sm:text-left flex flex-col justify-center">
                  <div>
                    <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 flex items-center justify-center sm:justify-start gap-2 mb-2">
                      <Lucide.Activity className="w-5 h-5 text-brand-500" />
                      Desempenho da Semana
                    </h2>
                    <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 max-w-[280px] mx-auto sm:mx-0">
                      Sua análise combinando consistência, energia e regularidade para evoluir suas rotinas.
                    </p>
                  </div>
                  
                  {/* Mobile/Accessible Legend */}
                  <div className="grid grid-cols-2 gap-2 w-full max-w-[280px] mx-auto sm:mx-0">
                    {radarData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700/50">
                        <span className="text-xs font-medium text-surface-600 dark:text-surface-300 truncate">{item.subject}</span>
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex-shrink-0 ml-1">{item.A}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="w-full sm:w-2/3 h-64 sm:h-72 -ml-2 sm:ml-0 relative">
                  <HabitsRadarChart data={radarData} />
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Insights ── */}
        {habits.length > 0 && (() => {
          const insights = getHabitInsights(habits, checkins, weekDates, today, isBRL)
          if (insights.length === 0) return null
          
          return (
            <div className="card overflow-hidden animate-dashboard-fade">
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
                <Lucide.Lightbulb className="w-5 h-5 text-brand-500 shrink-0" />
                <span>{'Seu Progresso'}</span>
              </h2>
              <div className="grid gap-3 sm:gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border transition-all duration-200 ${
                      insight.type === 'positive'
                        ? 'bg-emerald-50/80 border-emerald-200/70 dark:bg-emerald-900/20 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/25 hover:shadow-sm'
                        : insight.type === 'negative'
                        ? 'bg-rose-50/80 border-rose-200/70 dark:bg-rose-900/20 dark:border-rose-800/50 hover:bg-rose-50 dark:hover:bg-rose-900/25 hover:shadow-sm'
                        : 'bg-brand-50/80 border-brand-200/70 dark:bg-brand-900/20 dark:border-brand-800/50 hover:bg-brand-50 dark:hover:bg-brand-900/25 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {insight.type === 'positive' ? (
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center">
                          <Lucide.TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      ) : insight.type === 'negative' ? (
                        <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-800/40 flex items-center justify-center">
                          <Lucide.AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-800/40 flex items-center justify-center">
                          <Lucide.Target className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        </div>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      insight.type === 'positive'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : insight.type === 'negative'
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-brand-700 dark:text-brand-300'
                    }`}>
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

          {/* ── Ranking / Leaderboard ── */}
          {ranking && ranking.length > 0 && (() => {
            const currentUserRank = ranking.findIndex(r => r.userId === session.userId)
            
            return (
              <div className="card overflow-hidden animate-dashboard-fade">
                <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
                  <Lucide.Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>{'Ranking de Hábitos'}</span>
                </h2>

                {/* Top 3 Podium */}
                {ranking.slice(0, 3).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-6">
                    {ranking.slice(0, 3).map((user, idx) => {
                      const medals = ['🥇', '🥈', '🥉']
                      const isCurrentUser = user.userId === session.userId
                      return (
                        <div
                          key={user.userId}
                          className={`flex flex-col items-center p-3 sm:p-4 rounded-xl border transition-all ${
                            isCurrentUser
                              ? 'border-brand-400 bg-brand-50/50 dark:bg-brand-900/20 dark:border-brand-400/40'
                              : 'border-surface-200 dark:border-surface-700/50 bg-surface-50 dark:bg-surface-800/30'
                          }`}
                        >
                          <div className="text-2xl sm:text-3xl mb-1">{medals[idx]}</div>
                          <p className="text-xs sm:text-sm font-semibold text-surface-900 dark:text-surface-100 line-clamp-2 text-center leading-tight">
                            {user.userName}
                          </p>
                          <div className="flex flex-col items-center gap-0.5 mt-2">
                            <p className="text-[10px] sm:text-xs text-surface-600 dark:text-surface-400">
                              {'Pontos'}
                            </p>
                            <p className="text-sm sm:text-base font-bold text-brand-600 dark:text-brand-400">
                              {user.rankingPoints}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-500">
                              🔥 {user.currentStreak}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Full Leaderboard */}
                <div className="space-y-2 max-h-[400px] sm:max-h-[300px] overflow-y-auto custom-scrollbar">
                  {ranking.map((user, idx) => {
                    const isCurrentUser = user.userId === session.userId
                    const position = idx + 1

                    return (
                      <div
                        key={user.userId}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isCurrentUser
                            ? 'border-brand-300 bg-brand-50/70 dark:bg-brand-900/30 dark:border-brand-400/50'
                            : 'border-surface-200 dark:border-surface-700/40 bg-surface-50 dark:bg-surface-800/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-200 dark:bg-surface-700 flex-shrink-0">
                            <span className="text-xs font-bold text-surface-700 dark:text-surface-300">
                              {position}º
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isCurrentUser
                                ? 'text-brand-700 dark:text-brand-300'
                                : 'text-surface-900 dark:text-surface-100'
                            }`}>
                              {user.userName}
                              {isCurrentUser && (
                                <span className="ml-1 text-xs text-brand-600 dark:text-brand-400">
                                  {'(você)'}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-surface-500 dark:text-surface-500">
                              🔥 {'Sequência:'} {user.currentStreak}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className={`text-sm font-bold ${
                              isCurrentUser
                                ? 'text-brand-600 dark:text-brand-400'
                                : 'text-surface-900 dark:text-surface-100'
                            }`}>
                              {user.rankingPoints}
                            </p>
                            <p className="text-[10px] text-surface-500 dark:text-surface-500">
                              {'pontos'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

        </main>

        {/* ── Create Modal ── */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-surface-900 shadow-elevated border border-surface-200 dark:border-surface-700/60 p-6 space-y-5 animate-dashboard-fade"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                {editingHabit ? 'Editar Hábito' : 'Novo Hábito'}
              </h2>
              <button
                onClick={closeModal}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <Lucide.X className="h-4 w-4" />
              </button>
            </div>

            {/* Live preview */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/50">
              <div
                className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `${getColorHex(formColor)}1a`, color: getColorHex(formColor) }}
              >
                <HabitIcon name={formIcon} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                  {formTitle || <span className="text-surface-400 dark:text-surface-500 font-normal">Nome do hábito</span>}
                </p>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5 truncate">
                  {formDesc || 'Descrição opcional'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  autoFocus
                  className="input-field"
                  placeholder="Ex: Exercitar-se, Leitura, Meditação..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Descrição</label>
                <input
                  type="text"
                  maxLength={200}
                  className="input-field"
                  placeholder="Opcional"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              {/* Icon picker */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Ícone</label>
                <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/50">
                  {HABIT_ICON_NAMES.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setFormIcon(ic)}
                      className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all ${
                        formIcon === ic
                          ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/30'
                          : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-700 dark:hover:text-surface-200'
                      }`}
                      title={ic}
                    >
                      <HabitIcon name={ic} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {HABIT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormColor(c.id)}
                      className={`h-8 w-8 rounded-full transition-all hover:scale-110 ${
                        formColor === c.id
                          ? 'ring-2 ring-offset-2 ring-brand-500 dark:ring-offset-surface-900 scale-110'
                          : ''
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !formTitle.trim()}
                  className="btn-primary flex-1"
                >
                  {formSubmitting ? 'Salvando...' : editingHabit ? 'Salvar Alterações' : 'Criar Hábito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeletingId(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated dark:bg-surface-900 dark:border dark:border-surface-700/60 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
              <Lucide.Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-center text-surface-900 dark:text-surface-100">
              Excluir hábito
            </h3>
            <p className="text-sm text-center text-surface-500 dark:text-surface-400 mt-2">
              Tem certeza que deseja excluir este hábito?<br/>Essa ação não poderá ser desfeita. O histórico de progresso continuará salvo nas estatísticas passadas.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 019.95 9" fill="currentColor" />
                    </svg>
                    Excluindo...
                  </span>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
