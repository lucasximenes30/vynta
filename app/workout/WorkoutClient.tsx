'use client'

import { logoutAndRedirect } from '@/lib/logout'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'
import { useTourAction } from '@/lib/tour'


interface WorkoutPlanDTO {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface WorkoutDayDTO {
  id: string
  planId: string
  name: string
  order: number
  weekDay: number | null
  createdAt: string
  updatedAt: string
}

type ExerciseMuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'LEGS'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'ABS'
  | 'GLUTES'
  | 'CARDIO'
  | 'FULL_BODY'
  | 'OTHER'

interface ExerciseDTO {
  id: string
  namePt: string
  nameEn: string
  muscleGroup: ExerciseMuscleGroup
  equipment: string | null
  imageUrl: string | null
  isSystem: boolean
  userId: string | null
  createdAt: string
  updatedAt: string
}

interface WorkoutDayExerciseDTO {
  id: string
  workoutDayId: string
  exerciseId: string
  order: number
  sets: number
  reps: string
  targetWeight: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  exercise: ExerciseDTO
}

interface WorkoutDayAssignmentDTO {
  id: string
  userId: string
  planId: string
  workoutDayId: string
  date: string
  createdAt: string
}

interface WorkoutExecutionExerciseState {
  workoutDayExerciseId: string
  exerciseId: string
  exercise: ExerciseDTO
  plannedSets: number
  plannedReps: string
  plannedTargetWeight: string | null
  setsDone: string
  repsDone: string
  weightUsed: string
  notes: string
  completed: boolean
  sets: Array<{
    id: string
    setNumber: number
    actualReps: string
    weight: string
    completed: boolean
  }>
}

interface WorkoutExerciseLogDTO {
  id: string
  workoutLogId: string
  exerciseId: string
  done: boolean
  createdAt: string
  updatedAt: string
}

interface WorkoutLogDTO {
  id: string
  userId: string
  workoutId: string
  date: string
  completed: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  exerciseLogs: WorkoutExerciseLogDTO[]
}

interface UserStatsDTO {
  id: string
  userId: string
  currentStreak: number
  longestStreak: number
  score: number
  lastWorkoutDate: string | null
  createdAt: string
  updatedAt: string
}

interface WorkoutRankingEntryDTO {
  position: number
  userId: string
  name: string
  score: number
  currentStreak: number
  longestStreak: number
  isCurrentUser: boolean
}

interface Props {
  session: { userId: string; name: string }
  initialPlan: WorkoutPlanDTO | null
  initialDays: WorkoutDayDTO[]
  initialDayExercises: WorkoutDayExerciseDTO[]
  initialTodayAssignment: WorkoutDayAssignmentDTO | null
}

const WEEK_DAY_OPTIONS = [
  { value: 0, label: 'Segunda-feira' },
  { value: 1, label: 'Terca-feira' },
  { value: 2, label: 'Quarta-feira' },
  { value: 3, label: 'Quinta-feira' },
  { value: 4, label: 'Sexta-feira' },
  { value: 5, label: 'Sabado' },
  { value: 6, label: 'Domingo' },
]

const MUSCLE_GROUP_OPTIONS: Array<{
  value: 'ALL' | ExerciseMuscleGroup
  labelPt: string
  labelEn: string
}> = [
  { value: 'ALL', labelPt: 'Todos', labelEn: 'All' },
  { value: 'CHEST', labelPt: 'Peito', labelEn: 'Chest' },
  { value: 'BACK', labelPt: 'Costas', labelEn: 'Back' },
  { value: 'LEGS', labelPt: 'Pernas', labelEn: 'Legs' },
  { value: 'SHOULDERS', labelPt: 'Ombros', labelEn: 'Shoulders' },
  { value: 'BICEPS', labelPt: 'Biceps', labelEn: 'Biceps' },
  { value: 'TRICEPS', labelPt: 'Triceps', labelEn: 'Triceps' },
  { value: 'ABS', labelPt: 'Abdomen', labelEn: 'Abs' },
  { value: 'GLUTES', labelPt: 'Gluteos', labelEn: 'Glutes' },
  { value: 'CARDIO', labelPt: 'Cardio', labelEn: 'Cardio' },
  { value: 'FULL_BODY', labelPt: 'Corpo inteiro', labelEn: 'Full body' },
  { value: 'OTHER', labelPt: 'Outros', labelEn: 'Other' },
]

function sortWorkoutDays(items: WorkoutDayDTO[]): WorkoutDayDTO[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.createdAt.localeCompare(b.createdAt)
  })
}

function sortWorkoutDayExercises(items: WorkoutDayExerciseDTO[]): WorkoutDayExerciseDTO[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.createdAt.localeCompare(b.createdAt)
  })
}

function groupExercisesByWorkoutDay(items: WorkoutDayExerciseDTO[]): Record<string, WorkoutDayExerciseDTO[]> {
  const grouped: Record<string, WorkoutDayExerciseDTO[]> = {}

  for (const item of items) {
    if (!grouped[item.workoutDayId]) {
      grouped[item.workoutDayId] = []
    }
    grouped[item.workoutDayId].push(item)
  }

  for (const dayId of Object.keys(grouped)) {
    grouped[dayId] = sortWorkoutDayExercises(grouped[dayId])
  }

  return grouped
}

function getWeekDayLabel(weekDay: number | null): string | null {
  if (weekDay === null) return null
  return WEEK_DAY_OPTIONS.find((item) => item.value === weekDay)?.label ?? null
}

function getNextWorkoutDayName(days: WorkoutDayDTO[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const nextIndex = days.length

  if (nextIndex < alphabet.length) {
    return alphabet[nextIndex]
  }

  return `Treino ${nextIndex + 1}`
}

function getExerciseDisplayName(exercise: ExerciseDTO, locale: 'pt-BR' | 'en'): string {
  if (locale === 'pt-BR') {
    return exercise.namePt || exercise.nameEn
  }
  return exercise.nameEn || exercise.namePt
}

function getMuscleGroupLabel(group: ExerciseMuscleGroup, locale: 'pt-BR' | 'en'): string {
  const option = MUSCLE_GROUP_OPTIONS.find((item) => item.value === group)
  if (!option) return group
  return locale === 'pt-BR' ? option.labelPt : option.labelEn
}

function parseOptionalWeightInput(input: string): number | null {
  const normalized = input.replace(',', '.').trim()
  if (!normalized) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Carga alvo invalida')
  }

  return Math.round(parsed * 100) / 100
}

function parseSetsInput(input: string): number {
  const parsed = Number(input)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new Error('Series invalidas')
  }
  return parsed
}

function parseOptionalSetsDoneInput(input: string): number | null {
  const normalized = input.trim()
  if (!normalized) return null
  return parseSetsInput(normalized)
}

function parseOptionalRepsDoneInput(input: string): string | null {
  const normalized = input.trim()

  if (!normalized) return null

  if (normalized.length > 30) {
    throw new Error('Repeticoes realizadas muito longas')
  }

  return normalized
}

function getTodayWeekDayIndex(date = new Date()): number {
  return (date.getDay() + 6) % 7
}

function getDateKey(date = new Date()): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

function isFormFieldElement(
  element: EventTarget | null
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (!(element instanceof HTMLElement)) return false

  return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'
}

function revealFormFieldOnMobile(target: EventTarget | null, scrollContainer: HTMLElement | null): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(min-width: 640px)').matches) return
  if (!isFormFieldElement(target)) return

  const ensureVisible = () => {
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })

    if (!scrollContainer) return

    const fieldRect = target.getBoundingClientRect()
    const containerRect = scrollContainer.getBoundingClientRect()
    const safeTop = containerRect.top + 16
    const safeBottom = containerRect.bottom - 16

    if (fieldRect.top < safeTop) {
      scrollContainer.scrollTop -= safeTop - fieldRect.top
    } else if (fieldRect.bottom > safeBottom) {
      scrollContainer.scrollTop += fieldRect.bottom - safeBottom
    }
  }

  ensureVisible()
  window.setTimeout(ensureVisible, 180)
}

function formatDateLabel(date: Date, locale: 'pt-BR' | 'en'): string {
  const formatter = new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return formatter.format(date)
}

function buildWorkoutMotivationMessage(input: {
  locale: 'pt-BR' | 'en'
  nextStats: UserStatsDTO | null
  previousStats: UserStatsDTO | null
  previousRankingPosition: number | null
  nextRankingPosition: number | null
}): string {
  const { locale, nextStats, previousStats, previousRankingPosition, nextRankingPosition } = input

  if (previousRankingPosition && nextRankingPosition && nextRankingPosition < previousRankingPosition) {
    return locale === 'pt-BR' ? '🏆 Voce subiu no ranking!' : '🏆 You climbed up the ranking!'
  }

  const nextStreak = nextStats?.currentStreak ?? 0
  const previousStreak = previousStats?.currentStreak ?? 0

  if (nextStreak >= 7 && nextStreak > previousStreak) {
    return locale === 'pt-BR'
      ? '💀 Nao ta sobrando nada pros outros'
      : "💀 You are leaving nothing for the others"
  }

  if (nextStreak >= 4 && nextStreak > previousStreak) {
    return locale === 'pt-BR' ? '😈 Disciplina ta batendo forte' : '😈 Discipline is hitting hard'
  }

  if (nextStreak >= 2) {
    return locale === 'pt-BR'
      ? `🔥 Voce esta ha ${nextStreak} dias sem falhar`
      : `🔥 You are on a ${nextStreak}-day streak`
  }

  return locale === 'pt-BR'
    ? '🔥 Treino concluido. Bora manter o ritmo!'
    : '🔥 Workout completed. Keep the momentum!'
}


const locale = 'pt-BR';

export default function WorkoutClient({
  session,
  initialPlan,
  initialDays,
  initialDayExercises,
  initialTodayAssignment,
}: Props) {
  const router = useRouter()
  

  const [plan, setPlan] = useState<WorkoutPlanDTO | null>(initialPlan)
  const [days, setDays] = useState<WorkoutDayDTO[]>(sortWorkoutDays(initialDays))
  const [dayExercisesByDay, setDayExercisesByDay] = useState<Record<string, WorkoutDayExerciseDTO[]>>(
    groupExercisesByWorkoutDay(initialDayExercises)
  )
  const [todayAssignment, setTodayAssignment] = useState<WorkoutDayAssignmentDTO | null>(
    initialTodayAssignment
  )

  const [showChooseTodayWorkoutModal, setShowChooseTodayWorkoutModal] = useState(false)
  const [chooseTodayWorkoutModalVisible, setChooseTodayWorkoutModalVisible] = useState(false)
  const [selectedTodayWorkoutDayId, setSelectedTodayWorkoutDayId] = useState('')
  const [savingTodayWorkoutChoice, setSavingTodayWorkoutChoice] = useState(false)
  const [todayWorkoutChoiceError, setTodayWorkoutChoiceError] = useState('')
  const [todayWorkoutChoiceSuccess, setTodayWorkoutChoiceSuccess] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createPlanModalVisible, setCreatePlanModalVisible] = useState(false)
  const [planName, setPlanName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createPlanError, setCreatePlanError] = useState('')
  const [planActionError, setPlanActionError] = useState('')

  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false)
  const [deletingPlan, setDeletingPlan] = useState(false)

  const [showDayModal, setShowDayModal] = useState(false)
  const [dayModalVisible, setDayModalVisible] = useState(false)
  const [editingDay, setEditingDay] = useState<WorkoutDayDTO | null>(null)
  const [dayName, setDayName] = useState('')
  const [dayWeekDay, setDayWeekDay] = useState('')
  const [daySubmitting, setDaySubmitting] = useState(false)
  const [dayFormError, setDayFormError] = useState('')
  const [dayActionError, setDayActionError] = useState('')
  const createPlanModalBodyRef = useRef<HTMLDivElement | null>(null)
  const dayModalBodyRef = useRef<HTMLDivElement | null>(null)
  const addExerciseModalBodyRef = useRef<HTMLDivElement | null>(null)
  const createCustomExerciseModalBodyRef = useRef<HTMLDivElement | null>(null)
  const editDayExerciseModalBodyRef = useRef<HTMLDivElement | null>(null)
  const workoutExecutionModalBodyRef = useRef<HTMLDivElement | null>(null)
  const [mobileKeyboardInset, setMobileKeyboardInset] = useState(0)

  const [deletingDayId, setDeletingDayId] = useState<string | null>(null)
  const [deletingDay, setDeletingDay] = useState(false)
  const [reorderingDayId, setReorderingDayId] = useState<string | null>(null)

  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false)
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false)
  const [exerciseTargetDay, setExerciseTargetDay] = useState<WorkoutDayDTO | null>(null)
  const [availableExercises, setAvailableExercises] = useState<ExerciseDTO[]>([])
  const [loadingAvailableExercises, setLoadingAvailableExercises] = useState(false)
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [exerciseGroupFilter, setExerciseGroupFilter] = useState<'ALL' | ExerciseMuscleGroup>('ALL')
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [newExerciseSets, setNewExerciseSets] = useState('3')
  const [newExerciseReps, setNewExerciseReps] = useState('10-12')
  const [newExerciseTargetWeight, setNewExerciseTargetWeight] = useState('')
  const [newExerciseNotes, setNewExerciseNotes] = useState('')
  const [addingExerciseSubmitting, setAddingExerciseSubmitting] = useState(false)
  const [addExerciseError, setAddExerciseError] = useState('')
  const [exerciseActionError, setExerciseActionError] = useState('')

  const [showCreateCustomExerciseModal, setShowCreateCustomExerciseModal] = useState(false)
  const [customExerciseName, setCustomExerciseName] = useState('')
  const [customExerciseMuscleGroup, setCustomExerciseMuscleGroup] = useState<ExerciseMuscleGroup>('OTHER')
  const [customExerciseEquipment, setCustomExerciseEquipment] = useState('')
  const [creatingCustomExercise, setCreatingCustomExercise] = useState(false)
  const [createCustomExerciseError, setCreateCustomExerciseError] = useState('')

  const [showEditDayExerciseModal, setShowEditDayExerciseModal] = useState(false)
  const [editDayExerciseModalVisible, setEditDayExerciseModalVisible] = useState(false)
  const [editingDayExercise, setEditingDayExercise] = useState<WorkoutDayExerciseDTO | null>(null)
  const [editExerciseSets, setEditExerciseSets] = useState('3')
  const [editExerciseReps, setEditExerciseReps] = useState('10-12')
  const [editExerciseTargetWeight, setEditExerciseTargetWeight] = useState('')
  const [editExerciseNotes, setEditExerciseNotes] = useState('')
  const [savingEditDayExercise, setSavingEditDayExercise] = useState(false)
  const [editDayExerciseError, setEditDayExerciseError] = useState('')

  const [showWorkoutExecutionModal, setShowWorkoutExecutionModal] = useState(false)
  const [workoutExecutionModalVisible, setWorkoutExecutionModalVisible] = useState(false)
  const [workoutExecutionDay, setWorkoutExecutionDay] = useState<WorkoutDayDTO | null>(null)
  const [workoutExecutionDateISO, setWorkoutExecutionDateISO] = useState('')
  const [workoutExecutionNotes, setWorkoutExecutionNotes] = useState('')
  const [workoutExecutionExercises, setWorkoutExecutionExercises] = useState<
    WorkoutExecutionExerciseState[]
  >([])
  const [savingWorkoutSession, setSavingWorkoutSession] = useState(false)
  const [workoutExecutionError, setWorkoutExecutionError] = useState('')
  const [workoutSessionSuccess, setWorkoutSessionSuccess] = useState('')

  const [todayWorkoutLog, setTodayWorkoutLog] = useState<WorkoutLogDTO | null>(null)
  const [todayExerciseDoneById, setTodayExerciseDoneById] = useState<Record<string, boolean>>({})
  const [loadingTodayWorkoutLog, setLoadingTodayWorkoutLog] = useState(false)
  const [savingTodayWorkoutLog, setSavingTodayWorkoutLog] = useState(false)
  const [todayWorkoutLogError, setTodayWorkoutLogError] = useState('')
  const [workoutToastMessage, setWorkoutToastMessage] = useState('')
  const [userStats, setUserStats] = useState<UserStatsDTO | null>(null)
  const [workoutRanking, setWorkoutRanking] = useState<WorkoutRankingEntryDTO[]>([])
  const [currentUserRankingPosition, setCurrentUserRankingPosition] = useState<number | null>(null)
  const [loadingWorkoutPerformance, setLoadingWorkoutPerformance] = useState(true)
  const [workoutPerformanceError, setWorkoutPerformanceError] = useState('')

  const [deletingDayExercise, setDeletingDayExercise] = useState<{
    id: string
    workoutDayId: string
    label: string
  } | null>(null)
  const [deletingDayExerciseSubmitting, setDeletingDayExerciseSubmitting] = useState(false)
  const [deleteDayExerciseError, setDeleteDayExerciseError] = useState('')
  const [reorderingDayExerciseId, setReorderingDayExerciseId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const viewport = window.visualViewport
    if (!viewport) return

    const updateInset = () => {
      if (window.matchMedia('(min-width: 640px)').matches) {
        setMobileKeyboardInset(0)
        return
      }

      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setMobileKeyboardInset(Math.round(inset))
    }

    updateInset()
    viewport.addEventListener('resize', updateInset)
    viewport.addEventListener('scroll', updateInset)
    window.addEventListener('orientationchange', updateInset)

    return () => {
      viewport.removeEventListener('resize', updateInset)
      viewport.removeEventListener('scroll', updateInset)
      window.removeEventListener('orientationchange', updateInset)
    }
  }, [])

  useEffect(() => {
    if (!showChooseTodayWorkoutModal) return

    if (
      !selectedTodayWorkoutDayId ||
      !days.some((item) => item.id === selectedTodayWorkoutDayId)
    ) {
      setSelectedTodayWorkoutDayId(days[0]?.id ?? '')
    }
  }, [days, selectedTodayWorkoutDayId, showChooseTodayWorkoutModal])

  const selectedExercise = useMemo(
    () => availableExercises.find((exercise) => exercise.id === selectedExerciseId) ?? null,
    [availableExercises, selectedExerciseId]
  )

  const filteredExercises = useMemo(() => {
    const normalizedQuery = exerciseQuery.trim().toLowerCase()

    return availableExercises.filter((exercise) => {
      if (exerciseGroupFilter !== 'ALL' && exercise.muscleGroup !== exerciseGroupFilter) {
        return false
      }

      if (!normalizedQuery) return true

      return (
        exercise.namePt.toLowerCase().includes(normalizedQuery) ||
        exercise.nameEn.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [availableExercises, exerciseQuery, exerciseGroupFilter])

  const todayDateKey = useMemo(() => getDateKey(), [])
  const todayWeekDayIndex = getTodayWeekDayIndex()

  useEffect(() => {
    if (!todayAssignment) return

    if (
      !plan ||
      todayAssignment.planId !== plan.id ||
      todayAssignment.date !== todayDateKey ||
      !days.some((item) => item.id === todayAssignment.workoutDayId)
    ) {
      setTodayAssignment(null)
    }
  }, [days, plan, todayAssignment, todayDateKey])

  const fixedTodayWorkout = useMemo(
    () => days.find((item) => item.weekDay === todayWeekDayIndex) ?? null,
    [days, todayWeekDayIndex]
  )

  const manualTodayWorkout = useMemo(() => {
    if (!todayAssignment || todayAssignment.date !== todayDateKey) return null
    return days.find((item) => item.id === todayAssignment.workoutDayId) ?? null
  }, [days, todayAssignment, todayDateKey])

  const todayWorkoutSelection = useMemo(() => {
    if (manualTodayWorkout) {
      return {
        day: manualTodayWorkout,
        source: 'manual' as const,
      }
    }

    if (fixedTodayWorkout) {
      return {
        day: fixedTodayWorkout,
        source: 'weekday' as const,
      }
    }

    return null
  }, [fixedTodayWorkout, manualTodayWorkout])

  const todayWorkout = todayWorkoutSelection?.day ?? null
  const todayWorkoutSource = todayWorkoutSelection?.source ?? null

  const todayWorkoutExercises = useMemo(() => {
    if (!todayWorkout) return []
    return sortWorkoutDayExercises(dayExercisesByDay[todayWorkout.id] ?? [])
  }, [dayExercisesByDay, todayWorkout])

  const todayDateLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })

    return formatter.format(new Date())
  }, [locale])

  const workoutExecutionDateLabel = useMemo(() => {
    if (!workoutExecutionDateISO) return ''

    const parsed = new Date(workoutExecutionDateISO)
    if (Number.isNaN(parsed.getTime())) return ''

    return formatDateLabel(parsed, locale)
  }, [locale, workoutExecutionDateISO])

  const todayWorkoutCompleted = Boolean(todayWorkoutLog?.completed)
  const todayWorkoutExerciseIdsKey = useMemo(
    () => todayWorkoutExercises.map((item) => `${item.id}:${item.exerciseId}`).join('|'),
    [todayWorkoutExercises]
  )
  const todayDoneExercisesCount = useMemo(
    () =>
      todayWorkoutExercises.reduce((count, item) => {
        return count + (todayExerciseDoneById[item.exerciseId] ? 1 : 0)
      }, 0),
    [todayExerciseDoneById, todayWorkoutExercises]
  )

  const scoreNumberFormatter = useMemo(
    () => new Intl.NumberFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US'),
    [locale]
  )

  const isCurrentUserInTopRanking = useMemo(
    () => workoutRanking.some((entry) => entry.userId === session.userId),
    [session.userId, workoutRanking]
  )

  const loadWorkoutPerformance = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = Boolean(options?.silent)

      if (!silent) {
        setLoadingWorkoutPerformance(true)
      }

      setWorkoutPerformanceError('')

      try {
        const [statsResponse, rankingResponse] = await Promise.all([
          fetch('/api/stats/me', { cache: 'no-store' }),
          fetch('/api/stats/ranking?limit=5', { cache: 'no-store' }),
        ])

        const statsPayload: { error?: string; stats?: UserStatsDTO } = await statsResponse
          .json()
          .catch(() => ({}))
        const rankingPayload: {
          error?: string
          ranking?: WorkoutRankingEntryDTO[]
          currentUserPosition?: number | null
        } = await rankingResponse.json().catch(() => ({}))

        if (!statsResponse.ok || !rankingResponse.ok) {
          const errorMessage =
            statsPayload.error ??
            rankingPayload.error ??
            (locale === 'pt-BR'
              ? 'Nao foi possivel carregar seus dados de desempenho'
              : 'Could not load workout performance data')

          setWorkoutPerformanceError(errorMessage)
          return null
        }

        const nextStats = statsPayload.stats ?? null
        const nextRanking = rankingPayload.ranking ?? []
        const nextPosition =
          typeof rankingPayload.currentUserPosition === 'number'
            ? rankingPayload.currentUserPosition
            : null

        setUserStats(nextStats)
        setWorkoutRanking(nextRanking)
        setCurrentUserRankingPosition(nextPosition)

        return {
          stats: nextStats,
          ranking: nextRanking,
          currentUserPosition: nextPosition,
        }
      } catch {
        const errorMessage =
          locale === 'pt-BR'
            ? 'Erro de conexao ao carregar desempenho do treino'
            : 'Connection error while loading workout performance'

        setWorkoutPerformanceError(errorMessage)
        return null
      } finally {
        if (!silent) {
          setLoadingWorkoutPerformance(false)
        }
      }
    },
    [locale]
  )

  const buildTodayExerciseDoneMap = (log: WorkoutLogDTO | null): Record<string, boolean> => {
    const doneMap: Record<string, boolean> = {}

    for (const item of todayWorkoutExercises) {
      doneMap[item.exerciseId] = false
    }

    if (!log) return doneMap

    for (const item of log.exerciseLogs) {
      if (item.exerciseId in doneMap) {
        doneMap[item.exerciseId] = item.done
      }
    }

    return doneMap
  }

  useEffect(() => {
    if (!todayWorkout) {
      setTodayWorkoutLog(null)
      setTodayExerciseDoneById({})
      setTodayWorkoutLogError('')
      return
    }

    let ignore = false

    const loadTodayWorkoutLog = async () => {
      setLoadingTodayWorkoutLog(true)
      setTodayWorkoutLogError('')

      try {
        const response = await fetch(
          `/api/workout/log/today?workoutId=${encodeURIComponent(todayWorkout.id)}`
        )

        const payload: { error?: string; workoutLog?: WorkoutLogDTO | null } = await response
          .json()
          .catch(() => ({}))

        if (ignore) return

        if (!response.ok) {
          setTodayWorkoutLogError(payload.error ?? 'Nao foi possivel carregar o progresso de hoje')
          setTodayWorkoutLog(null)
          setTodayExerciseDoneById(buildTodayExerciseDoneMap(null))
          return
        }

        const loadedLog = payload.workoutLog ?? null
        setTodayWorkoutLog(loadedLog)
        setTodayExerciseDoneById(buildTodayExerciseDoneMap(loadedLog))
      } catch {
        if (ignore) return
        setTodayWorkoutLogError('Erro de conexao ao carregar o progresso do treino')
        setTodayWorkoutLog(null)
        setTodayExerciseDoneById(buildTodayExerciseDoneMap(null))
      } finally {
        if (!ignore) {
          setLoadingTodayWorkoutLog(false)
        }
      }
    }

    void loadTodayWorkoutLog()

    return () => {
      ignore = true
    }
  }, [todayWorkout, todayWorkoutExerciseIdsKey])

  useEffect(() => {
    void loadWorkoutPerformance()
  }, [loadWorkoutPerformance])

  useEffect(() => {
    if (!workoutToastMessage) return

    const timeoutId = window.setTimeout(() => {
      setWorkoutToastMessage('')
    }, 2400)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [workoutToastMessage])

  const handleLogout = async () => {
    await logoutAndRedirect('/login')
  }

  const handleCreatePlanModalFocus = (event: React.FocusEvent<HTMLElement>) => {
    revealFormFieldOnMobile(event.target, createPlanModalBodyRef.current)
  }

  const handleDayModalFocus = (event: React.FocusEvent<HTMLElement>) => {
    revealFormFieldOnMobile(event.target, dayModalBodyRef.current)
  }

  const handleAddExerciseModalFocus = (event: React.FocusEvent<HTMLElement>) => {
    revealFormFieldOnMobile(event.target, addExerciseModalBodyRef.current)
  }

  const handleCreateCustomExerciseModalFocus = (event: React.FocusEvent<HTMLElement>) => {
    revealFormFieldOnMobile(event.target, createCustomExerciseModalBodyRef.current)
  }

  const handleEditDayExerciseModalFocus = (event: React.FocusEvent<HTMLElement>) => {
    revealFormFieldOnMobile(event.target, editDayExerciseModalBodyRef.current)
  }

  const handleWorkoutExecutionModalFocus = (event: React.FocusEvent<HTMLElement>) => {
    revealFormFieldOnMobile(event.target, workoutExecutionModalBodyRef.current)
  }

  const persistTodayWorkoutLog = async (
    doneByExerciseId: Record<string, boolean>,
    options?: { completed?: boolean }
  ): Promise<boolean> => {
    if (!todayWorkout || savingTodayWorkoutLog) return false

    const uniqueExerciseStates = new Map<string, boolean>()
    for (const item of todayWorkoutExercises) {
      uniqueExerciseStates.set(item.exerciseId, Boolean(doneByExerciseId[item.exerciseId]))
    }

    const exercisesPayload = Array.from(uniqueExerciseStates.entries()).map(
      ([exerciseId, done]) => ({ exerciseId, done })
    )

    setSavingTodayWorkoutLog(true)
    setTodayWorkoutLogError('')

    try {
      const endpoint = todayWorkoutLog ? `/api/workout/log/${todayWorkoutLog.id}` : '/api/workout/log'
      const method = todayWorkoutLog ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(todayWorkoutLog ? {} : { workoutId: todayWorkout.id }),
          completed: options?.completed,
          exercises: exercisesPayload,
        }),
      })

      const payload: { error?: string; workoutLog?: WorkoutLogDTO } = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        setTodayWorkoutLogError(payload.error ?? 'Nao foi possivel salvar o treino de hoje')
        return false
      }

      if (!payload.workoutLog) {
        setTodayWorkoutLogError('Resposta invalida ao salvar o treino')
        return false
      }

      setTodayWorkoutLog(payload.workoutLog)
      setTodayExerciseDoneById(buildTodayExerciseDoneMap(payload.workoutLog))

      return true
    } catch {
      setTodayWorkoutLogError('Erro de conexao ao salvar o treino')
      return false
    } finally {
      setSavingTodayWorkoutLog(false)
    }
  }

  const handleToggleTodayExercise = async (exerciseId: string) => {
    if (!todayWorkout) return

    const previous = todayExerciseDoneById
    const next = {
      ...previous,
      [exerciseId]: !Boolean(previous[exerciseId]),
    }

    setTodayExerciseDoneById(next)

    const success = await persistTodayWorkoutLog(next, {
      completed: todayWorkoutCompleted,
    })

    if (!success) {
      setTodayExerciseDoneById(previous)
    }
  }

  const handleCompleteTodayWorkout = async () => {
    if (!todayWorkout || todayWorkoutExercises.length === 0 || savingTodayWorkoutLog || todayWorkoutCompleted) {
      return
    }

    const previous = todayExerciseDoneById
    const previousStats = userStats
    const previousRankingPosition = currentUserRankingPosition
    const allDone = { ...previous }

    for (const item of todayWorkoutExercises) {
      allDone[item.exerciseId] = true
    }

    setTodayExerciseDoneById(allDone)

    const success = await persistTodayWorkoutLog(allDone, {
      completed: true,
    })

    if (!success) {
      setTodayExerciseDoneById(previous)
      return
    }

    const refreshedPerformance = await loadWorkoutPerformance({ silent: true })

    const motivationalMessage = buildWorkoutMotivationMessage({
      locale,
      nextStats: refreshedPerformance?.stats ?? previousStats,
      previousStats,
      previousRankingPosition,
      nextRankingPosition: refreshedPerformance?.currentUserPosition ?? currentUserRankingPosition,
    })

    setWorkoutToastMessage(motivationalMessage)
  }

  const openChooseTodayWorkoutModal = () => {
    if (!plan || days.length === 0) return

    setTodayWorkoutChoiceError('')
    setTodayWorkoutChoiceSuccess('')
    setSelectedTodayWorkoutDayId(days[0]?.id ?? '')
    setShowChooseTodayWorkoutModal(true)
    requestAnimationFrame(() => setChooseTodayWorkoutModalVisible(true))
  }

  const closeChooseTodayWorkoutModal = () => {
    if (savingTodayWorkoutChoice) return

    setChooseTodayWorkoutModalVisible(false)
    window.setTimeout(() => {
      setShowChooseTodayWorkoutModal(false)
      setSelectedTodayWorkoutDayId('')
      setTodayWorkoutChoiceError('')
    }, 200)
  }

  const handleChooseTodayWorkout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!plan || savingTodayWorkoutChoice) return

    if (!selectedTodayWorkoutDayId) {
      setTodayWorkoutChoiceError('Selecione um treino')
      return
    }

    setSavingTodayWorkoutChoice(true)
    setTodayWorkoutChoiceError('')

    try {
      const response = await fetch('/api/workout/day-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          workoutDayId: selectedTodayWorkoutDayId,
          date: todayDateKey,
        }),
      })

      const payload: { error?: string; assignment?: WorkoutDayAssignmentDTO } = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        setTodayWorkoutChoiceError(payload.error ?? 'Nao foi possivel escolher o treino de hoje')
        return
      }

      if (!payload.assignment) {
        setTodayWorkoutChoiceError('Resposta invalida do servidor')
        return
      }

      setTodayAssignment(payload.assignment)
      setWorkoutExecutionError('')
      setWorkoutSessionSuccess('')
      setTodayWorkoutChoiceSuccess(
        locale === 'pt-BR'
          ? 'Treino de hoje definido com sucesso.'
          : 'Today\'s workout was set successfully.'
      )
      closeChooseTodayWorkoutModal()
    } catch {
      setTodayWorkoutChoiceError('Erro de conexao. Tente novamente.')
    } finally {
      setSavingTodayWorkoutChoice(false)
    }
  }

  const openCreateModal = () => {
    setCreatePlanError('')
    setPlanName('')
    setShowCreateModal(true)
    requestAnimationFrame(() => setCreatePlanModalVisible(true))
  }

  useTourAction('workout', () => openCreateModal())
  const closeCreateModal = () => {
    setCreatePlanModalVisible(false)
    window.setTimeout(() => setShowCreateModal(false), 200)
  }

  const handleCreatePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (submitting) return

    const trimmedName = planName.trim()
    if (!trimmedName) {
      setCreatePlanError('Informe o nome do plano')
      return
    }

    setSubmitting(true)
    setCreatePlanError('')

    try {
      const response = await fetch('/api/workout/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })

      const payload: { error?: string; plan?: WorkoutPlanDTO } = await response.json().catch(() => ({}))

      if (!response.ok) {
        setCreatePlanError(payload.error ?? 'Nao foi possivel criar o plano')
        return
      }

      if (payload.plan) {
        setPlan(payload.plan)
      }

      setDays([])
      setDayExercisesByDay({})
      setTodayAssignment(null)
      setTodayWorkoutChoiceSuccess('')
      closeCreateModal()
      router.refresh()
    } catch {
      setCreatePlanError('Erro de conexao. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const openDeletePlanModal = () => {
    setPlanActionError('')
    setShowDeletePlanModal(true)
  }

  const closeDeletePlanModal = () => {
    if (deletingPlan) return
    setShowDeletePlanModal(false)
  }

  const handleDeletePlan = async () => {
    if (!plan || deletingPlan) return

    setDeletingPlan(true)
    setPlanActionError('')

    try {
      const response = await fetch(`/api/workout/plan/${plan.id}`, {
        method: 'DELETE',
      })

      const payload: { error?: string } = await response.json().catch(() => ({}))

      if (!response.ok) {
        setPlanActionError(payload.error ?? 'Nao foi possivel remover o plano')
        return
      }

      setPlan(null)
      setDays([])
      setDayExercisesByDay({})
      setTodayAssignment(null)
      setTodayWorkoutChoiceSuccess('')
      setShowDeletePlanModal(false)
      router.refresh()
    } catch {
      setPlanActionError('Erro de conexao. Tente novamente.')
    } finally {
      setDeletingPlan(false)
    }
  }

  const openCreateDayModal = () => {
    if (!plan) return

    setEditingDay(null)
    setDayFormError('')
    setDayName(getNextWorkoutDayName(days))
    setDayWeekDay('')
    setShowDayModal(true)
    requestAnimationFrame(() => setDayModalVisible(true))
  }

  const openEditDayModal = (day: WorkoutDayDTO) => {
    setEditingDay(day)
    setDayFormError('')
    setDayName(day.name)
    setDayWeekDay(day.weekDay === null ? '' : String(day.weekDay))
    setShowDayModal(true)
    requestAnimationFrame(() => setDayModalVisible(true))
  }

  const closeDayModal = () => {
    setDayModalVisible(false)
    window.setTimeout(() => {
      setShowDayModal(false)
      setEditingDay(null)
    }, 200)
  }

  const handleSaveDay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!plan || daySubmitting) return

    const trimmedName = dayName.trim()
    if (!trimmedName) {
      setDayFormError('Informe o nome do treino')
      return
    }

    setDaySubmitting(true)
    setDayFormError('')

    const weekDayValue = dayWeekDay === '' ? null : Number(dayWeekDay)
    const isEditing = !!editingDay

    try {
      const response = await fetch(isEditing ? `/api/workout/days/${editingDay.id}` : '/api/workout/days', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          weekDay: weekDayValue,
          ...(isEditing ? {} : { planId: plan.id }),
        }),
      })

      const payload: { error?: string; day?: WorkoutDayDTO } = await response.json().catch(() => ({}))

      if (!response.ok) {
        setDayFormError(payload.error ?? 'Nao foi possivel salvar o treino')
        return
      }

      if (!payload.day) {
        setDayFormError('Resposta invalida do servidor')
        return
      }

      const savedDay = payload.day

      setDays((prev) => {
        if (isEditing) {
          return sortWorkoutDays(prev.map((item) => (item.id === savedDay.id ? savedDay : item)))
        }
        return sortWorkoutDays([...prev, savedDay])
      })

      closeDayModal()
    } catch {
      setDayFormError('Erro de conexao. Tente novamente.')
    } finally {
      setDaySubmitting(false)
    }
  }

  const openDeleteDayModal = (dayId: string) => {
    setDayActionError('')
    setDeletingDayId(dayId)
  }

  const closeDeleteDayModal = () => {
    if (deletingDay) return
    setDeletingDayId(null)
  }

  const handleDeleteDay = async () => {
    if (!deletingDayId || deletingDay) return

    setDeletingDay(true)
    setDayActionError('')

    try {
      const response = await fetch(`/api/workout/days/${deletingDayId}`, {
        method: 'DELETE',
      })

      const payload: { error?: string } = await response.json().catch(() => ({}))

      if (!response.ok) {
        setDayActionError(payload.error ?? 'Nao foi possivel remover o treino')
        return
      }

      const dayIdToRemove = deletingDayId

      setDays((prev) => prev.filter((day) => day.id !== dayIdToRemove))
      setDayExercisesByDay((prev) => {
        const next = { ...prev }
        delete next[dayIdToRemove]
        return next
      })
      setDeletingDayId(null)
    } catch {
      setDayActionError('Erro de conexao. Tente novamente.')
    } finally {
      setDeletingDay(false)
    }
  }

  const handleMoveDay = async (dayId: string, direction: 'up' | 'down') => {
    if (reorderingDayId) return

    const currentIndex = days.findIndex((item) => item.id === dayId)
    if (currentIndex < 0) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= days.length) return

    setDayActionError('')
    setReorderingDayId(dayId)

    const previousDays = days
    const optimisticDays = [...days]
    const currentDay = optimisticDays[currentIndex]
    const targetDay = optimisticDays[targetIndex]

    optimisticDays[currentIndex] = { ...targetDay, order: currentDay.order }
    optimisticDays[targetIndex] = { ...currentDay, order: targetDay.order }

    setDays(sortWorkoutDays(optimisticDays))

    try {
      const response = await fetch('/api/workout/days/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayId, direction }),
      })

      const payload: { error?: string; days?: WorkoutDayDTO[] } = await response.json().catch(() => ({}))

      if (!response.ok) {
        setDays(previousDays)
        setDayActionError(payload.error ?? 'Nao foi possivel reordenar os treinos')
        return
      }

      if (payload.days) {
        setDays(sortWorkoutDays(payload.days))
      }
    } catch {
      setDays(previousDays)
      setDayActionError('Erro de conexao. Tente novamente.')
    } finally {
      setReorderingDayId(null)
    }
  }

  const loadAvailableExercises = async () => {
    setLoadingAvailableExercises(true)
    setAddExerciseError('')

    try {
      const response = await fetch('/api/workout/exercises')
      const payload: { error?: string; exercises?: ExerciseDTO[] } = await response.json().catch(() => ({}))

      if (!response.ok) {
        setAddExerciseError(payload.error ?? 'Nao foi possivel carregar os exercicios')
        return
      }

      setAvailableExercises(payload.exercises ?? [])
    } catch {
      setAddExerciseError('Erro de conexao. Tente novamente.')
    } finally {
      setLoadingAvailableExercises(false)
    }
  }

  const openAddExerciseModal = async (day: WorkoutDayDTO) => {
    setExerciseActionError('')
    setExerciseTargetDay(day)
    setExerciseQuery('')
    setExerciseGroupFilter('ALL')
    setSelectedExerciseId(null)
    setNewExerciseSets('3')
    setNewExerciseReps('10-12')
    setNewExerciseTargetWeight('')
    setNewExerciseNotes('')
    setAddExerciseError('')
    setShowAddExerciseModal(true)
    requestAnimationFrame(() => setAddExerciseModalVisible(true))
    await loadAvailableExercises()
  }

  const closeAddExerciseModal = () => {
    if (addingExerciseSubmitting) return

    setAddExerciseModalVisible(false)
    window.setTimeout(() => {
      setShowAddExerciseModal(false)
      setExerciseTargetDay(null)
      setSelectedExerciseId(null)
    }, 200)
  }

  const openCreateCustomExerciseModal = () => {
    setCreateCustomExerciseError('')
    setCustomExerciseName(exerciseQuery.trim())
    setCustomExerciseMuscleGroup(exerciseGroupFilter === 'ALL' ? 'OTHER' : exerciseGroupFilter)
    setCustomExerciseEquipment('')
    setShowCreateCustomExerciseModal(true)
  }

  const closeCreateCustomExerciseModal = () => {
    if (creatingCustomExercise) return
    setShowCreateCustomExerciseModal(false)
  }

  const handleCreateCustomExercise = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (creatingCustomExercise) return

    const trimmedName = customExerciseName.trim()
    if (!trimmedName) {
      setCreateCustomExerciseError('Informe o nome do exercicio')
      return
    }

    setCreatingCustomExercise(true)
    setCreateCustomExerciseError('')

    try {
      const response = await fetch('/api/workout/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          muscleGroup: customExerciseMuscleGroup,
          equipment: customExerciseEquipment.trim() || undefined,
        }),
      })

      const payload: { error?: string; exercise?: ExerciseDTO } = await response.json().catch(() => ({}))

      if (!response.ok) {
        setCreateCustomExerciseError(payload.error ?? 'Nao foi possivel criar o exercicio')
        return
      }

      if (!payload.exercise) {
        setCreateCustomExerciseError('Resposta invalida do servidor')
        return
      }

      const createdExercise = payload.exercise

      setAvailableExercises((prev) => {
        const merged = [...prev, createdExercise]
        return merged.sort((a, b) => {
          if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1
          return a.namePt.localeCompare(b.namePt)
        })
      })

      setSelectedExerciseId(createdExercise.id)
      setShowCreateCustomExerciseModal(false)
    } catch {
      setCreateCustomExerciseError('Erro de conexao. Tente novamente.')
    } finally {
      setCreatingCustomExercise(false)
    }
  }

  const handleAddExerciseToDay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!exerciseTargetDay || !selectedExerciseId || addingExerciseSubmitting) return

    let setsValue: number
    let targetWeightValue: number | null

    try {
      setsValue = parseSetsInput(newExerciseSets)
      targetWeightValue = parseOptionalWeightInput(newExerciseTargetWeight)
    } catch (error: unknown) {
      setAddExerciseError(error instanceof Error ? error.message : 'Dados invalidos')
      return
    }

    const repsValue = newExerciseReps.trim()
    if (!repsValue) {
      setAddExerciseError('Informe as repeticoes')
      return
    }

    setAddingExerciseSubmitting(true)
    setAddExerciseError('')

    try {
      const response = await fetch('/api/workout/day-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutDayId: exerciseTargetDay.id,
          exerciseId: selectedExerciseId,
          sets: setsValue,
          reps: repsValue,
          targetWeight: targetWeightValue,
          notes: newExerciseNotes.trim() || undefined,
        }),
      })

      const payload: { error?: string; workoutDayExercise?: WorkoutDayExerciseDTO } = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        setAddExerciseError(payload.error ?? 'Nao foi possivel adicionar o exercicio')
        return
      }

      if (!payload.workoutDayExercise) {
        setAddExerciseError('Resposta invalida do servidor')
        return
      }

      const createdWorkoutDayExercise = payload.workoutDayExercise

      setDayExercisesByDay((prev) => {
        const current = prev[exerciseTargetDay.id] ?? []
        return {
          ...prev,
          [exerciseTargetDay.id]: sortWorkoutDayExercises([...current, createdWorkoutDayExercise]),
        }
      })

      closeAddExerciseModal()
    } catch {
      setAddExerciseError('Erro de conexao. Tente novamente.')
    } finally {
      setAddingExerciseSubmitting(false)
    }
  }

  const openEditDayExerciseModal = (item: WorkoutDayExerciseDTO) => {
    setEditingDayExercise(item)
    setEditExerciseSets(String(item.sets))
    setEditExerciseReps(item.reps)
    setEditExerciseTargetWeight(item.targetWeight ?? '')
    setEditExerciseNotes(item.notes ?? '')
    setEditDayExerciseError('')
    setShowEditDayExerciseModal(true)
    requestAnimationFrame(() => setEditDayExerciseModalVisible(true))
  }

  const closeEditDayExerciseModal = () => {
    if (savingEditDayExercise) return
    setEditDayExerciseModalVisible(false)
    window.setTimeout(() => {
      setShowEditDayExerciseModal(false)
      setEditingDayExercise(null)
    }, 200)
  }

  const handleUpdateDayExercise = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!editingDayExercise || savingEditDayExercise) return

    let setsValue: number
    let targetWeightValue: number | null

    try {
      setsValue = parseSetsInput(editExerciseSets)
      targetWeightValue = parseOptionalWeightInput(editExerciseTargetWeight)
    } catch (error: unknown) {
      setEditDayExerciseError(error instanceof Error ? error.message : 'Dados invalidos')
      return
    }

    const repsValue = editExerciseReps.trim()
    if (!repsValue) {
      setEditDayExerciseError('Informe as repeticoes')
      return
    }

    setSavingEditDayExercise(true)
    setEditDayExerciseError('')

    try {
      const response = await fetch(`/api/workout/day-exercises/${editingDayExercise.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sets: setsValue,
          reps: repsValue,
          targetWeight: targetWeightValue,
          notes: editExerciseNotes.trim() || undefined,
        }),
      })

      const payload: { error?: string; workoutDayExercise?: WorkoutDayExerciseDTO } = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        setEditDayExerciseError(payload.error ?? 'Nao foi possivel atualizar o exercicio')
        return
      }

      if (!payload.workoutDayExercise) {
        setEditDayExerciseError('Resposta invalida do servidor')
        return
      }

      const updatedItem = payload.workoutDayExercise

      setDayExercisesByDay((prev) => {
        const current = prev[updatedItem.workoutDayId] ?? []
        return {
          ...prev,
          [updatedItem.workoutDayId]: sortWorkoutDayExercises(
            current.map((item) => (item.id === updatedItem.id ? updatedItem : item))
          ),
        }
      })

      closeEditDayExerciseModal()
    } catch {
      setEditDayExerciseError('Erro de conexao. Tente novamente.')
    } finally {
      setSavingEditDayExercise(false)
    }
  }

  const openDeleteDayExerciseModal = (item: WorkoutDayExerciseDTO) => {
    setDeleteDayExerciseError('')
    setDeletingDayExercise({
      id: item.id,
      workoutDayId: item.workoutDayId,
      label: getExerciseDisplayName(item.exercise, locale),
    })
  }

  const closeDeleteDayExerciseModal = () => {
    if (deletingDayExerciseSubmitting) return
    setDeletingDayExercise(null)
  }

  const handleDeleteDayExercise = async () => {
    if (!deletingDayExercise || deletingDayExerciseSubmitting) return

    setDeletingDayExerciseSubmitting(true)
    setDeleteDayExerciseError('')

    try {
      const response = await fetch(`/api/workout/day-exercises/${deletingDayExercise.id}`, {
        method: 'DELETE',
      })

      const payload: { error?: string } = await response.json().catch(() => ({}))

      if (!response.ok) {
        setDeleteDayExerciseError(payload.error ?? 'Nao foi possivel remover o exercicio')
        return
      }

      const dayId = deletingDayExercise.workoutDayId
      const exerciseId = deletingDayExercise.id

      setDayExercisesByDay((prev) => {
        const current = prev[dayId] ?? []
        return {
          ...prev,
          [dayId]: current.filter((item) => item.id !== exerciseId),
        }
      })

      setDeletingDayExercise(null)
    } catch {
      setDeleteDayExerciseError('Erro de conexao. Tente novamente.')
    } finally {
      setDeletingDayExerciseSubmitting(false)
    }
  }

  const handleMoveDayExercise = async (
    workoutDayId: string,
    id: string,
    direction: 'up' | 'down'
  ) => {
    if (reorderingDayExerciseId) return

    const dayItems = dayExercisesByDay[workoutDayId] ?? []
    const currentIndex = dayItems.findIndex((item) => item.id === id)
    if (currentIndex < 0) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= dayItems.length) return

    setExerciseActionError('')
    setReorderingDayExerciseId(id)

    const previousItems = dayItems
    const optimisticItems = [...dayItems]
    const currentItem = optimisticItems[currentIndex]
    const targetItem = optimisticItems[targetIndex]

    optimisticItems[currentIndex] = { ...targetItem, order: currentItem.order }
    optimisticItems[targetIndex] = { ...currentItem, order: targetItem.order }

    setDayExercisesByDay((prev) => ({
      ...prev,
      [workoutDayId]: sortWorkoutDayExercises(optimisticItems),
    }))

    try {
      const response = await fetch('/api/workout/day-exercises/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, direction }),
      })

      const payload: { error?: string; exercises?: WorkoutDayExerciseDTO[] } = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        setDayExercisesByDay((prev) => ({ ...prev, [workoutDayId]: previousItems }))
        setExerciseActionError(payload.error ?? 'Nao foi possivel reordenar os exercicios')
        return
      }

      if (payload.exercises) {
        setDayExercisesByDay((prev) => ({
          ...prev,
          [workoutDayId]: sortWorkoutDayExercises(payload.exercises ?? []),
        }))
      }
    } catch {
      setDayExercisesByDay((prev) => ({ ...prev, [workoutDayId]: previousItems }))
      setExerciseActionError('Erro de conexao. Tente novamente.')
    } finally {
      setReorderingDayExerciseId(null)
    }
  }

  const openWorkoutExecutionModal = (day: WorkoutDayDTO) => {
    if (!plan) return

    const dayExercises = sortWorkoutDayExercises(dayExercisesByDay[day.id] ?? [])
    if (dayExercises.length === 0) {
      setWorkoutSessionSuccess('')
      setWorkoutExecutionError(
        locale === 'pt-BR'
          ? 'Adicione exercicios ao treino para iniciar a execucao.'
          : 'Add exercises to this workout before starting execution.'
      )
      return
    }

    setWorkoutSessionSuccess('')
    setWorkoutExecutionError('')
    setWorkoutExecutionDay(day)
    setWorkoutExecutionDateISO(new Date().toISOString())
    setWorkoutExecutionNotes('')
    setWorkoutExecutionExercises(
      dayExercises.map((item) => ({
        workoutDayExerciseId: item.id,
        exerciseId: item.exerciseId,
        exercise: item.exercise,
        plannedSets: item.sets,
        plannedReps: item.reps,
        plannedTargetWeight: item.targetWeight,
        setsDone: String(item.sets),
        repsDone: item.reps,
        weightUsed: item.targetWeight ?? '',
        notes: '',
        completed: false,
        sets: Array.from({ length: item.sets }).map((_, i) => ({
          id: crypto.randomUUID(),
          setNumber: i + 1,
          actualReps: '',
          weight: item.targetWeight ?? '',
          completed: false,
        })),
      }))
    )

    setShowWorkoutExecutionModal(true)
    requestAnimationFrame(() => setWorkoutExecutionModalVisible(true))
  }

  const closeWorkoutExecutionModal = (force = false) => {
    if (savingWorkoutSession && !force) return

    setWorkoutExecutionModalVisible(false)
    window.setTimeout(() => {
      setShowWorkoutExecutionModal(false)
      setWorkoutExecutionDay(null)
      setWorkoutExecutionExercises([])
      setWorkoutExecutionError('')
      setWorkoutExecutionNotes('')
      setWorkoutExecutionDateISO('')
    }, 200)
  }

  const updateWorkoutExecutionExercise = (
    workoutDayExerciseId: string,
    updates: Partial<WorkoutExecutionExerciseState>
  ) => {
    setWorkoutExecutionExercises((prev) =>
      prev.map((item) => (item.workoutDayExerciseId === workoutDayExerciseId ? { ...item, ...updates } : item))
    )
  }

  const handleCompleteWorkoutSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!plan || !workoutExecutionDay || savingWorkoutSession) return

    setSavingWorkoutSession(true)
    setWorkoutExecutionError('')

    const previousStats = userStats
    const previousRankingPosition = currentUserRankingPosition

    try {
      const exercisesPayload = workoutExecutionExercises.map((item) => {
        const setsDone = parseOptionalSetsDoneInput(item.setsDone)
        const repsDone = parseOptionalRepsDoneInput(item.repsDone)
        const weightUsed = parseOptionalWeightInput(item.weightUsed)
        const notes = item.notes.trim()

        if (notes.length > 600) {
          throw new Error('Observacao do exercicio muito longa')
        }

        return {
          exerciseId: item.exerciseId,
          setsDone,
          repsDone,
          weightUsed,
          completed: item.completed,
          notes: notes || undefined,
          sets: item.sets.map((set) => ({
            setNumber: set.setNumber,
            actualReps: parseOptionalSetsDoneInput(set.actualReps),
            weight: parseOptionalWeightInput(set.weight),
            completed: set.completed,
            plannedReps: item.plannedReps,
          })),
        }
      })

      const dayNotes = workoutExecutionNotes.trim()
      if (dayNotes.length > 1000) {
        throw new Error('Observacao do treino muito longa')
      }

      const response = await fetch('/api/workout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          workoutDayId: workoutExecutionDay.id,
          date: workoutExecutionDateISO || new Date().toISOString(),
          dayNotes: dayNotes || undefined,
          exercises: exercisesPayload,
        }),
      })

      const payload: { error?: string } = await response.json().catch(() => ({}))

      if (!response.ok) {
        setWorkoutExecutionError(payload.error ?? 'Nao foi possivel concluir o treino')
        return
      }

      setWorkoutSessionSuccess(
        locale === 'pt-BR'
          ? 'Treino concluido e salvo com sucesso.'
          : 'Workout completed and saved successfully.'
      )

      const refreshedPerformance = await loadWorkoutPerformance({ silent: true })

      const motivationalMessage = buildWorkoutMotivationMessage({
        locale,
        nextStats: refreshedPerformance?.stats ?? previousStats,
        previousStats,
        previousRankingPosition,
        nextRankingPosition: refreshedPerformance?.currentUserPosition ?? currentUserRankingPosition,
      })

      setWorkoutToastMessage(motivationalMessage)
      closeWorkoutExecutionModal(true)
    } catch (error: unknown) {
      setWorkoutExecutionError(
        error instanceof Error ? error.message : 'Erro de conexao. Tente novamente.'
      )
    } finally {
      setSavingWorkoutSession(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-300 reports-page-enter">
      <header className="border-b border-surface-200/80 bg-white dark:bg-surface-900 dark:border-surface-800 transition-colors duration-300">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-surface-900 dark:text-surface-100">
                {locale === 'pt-BR' ? 'Treino' : 'Workout'}
              </h1>
              <p className="mt-0.5 text-[13px] leading-5 text-surface-600 dark:text-surface-300">
                {locale === 'pt-BR'
                  ? 'Organize seus treinos e acompanhe sua evolucao'
                  : 'Organize your workouts and track progress'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-surface-500 dark:text-surface-400 sm:inline">
              {locale === 'pt-BR' ? 'Ola' : 'Hi'}, {session.name}
            </span>
            <button
              onClick={handleLogout}
              className="hidden text-sm text-surface-500 transition-colors hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200 sm:inline"
            >
              {locale === 'pt-BR' ? 'Sair' : 'Sign out'}
            </button>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 sm:hidden"
              aria-label={locale === 'pt-BR' ? 'Sair' : 'Sign out'}
            >
              <Lucide.LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {!plan ? (
          <section className="card animate-dashboard-fade relative flex min-h-[65vh] flex-col items-center justify-center overflow-hidden px-6 py-14 text-center">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-500/10 to-transparent" />

            <div className="relative mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-brand-400/30 bg-brand-500/15 text-brand-500 shadow-lg shadow-brand-900/10">
              <Lucide.Dumbbell className="h-10 w-10" />
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-surface-900 dark:text-surface-100 sm:text-3xl">
              {locale === 'pt-BR' ? 'Treino' : 'Workout'}
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-surface-600 dark:text-surface-300 sm:text-base">
              {locale === 'pt-BR'
                ? 'Organize seus treinos e acompanhe sua evolucao'
                : 'Organize your workouts and track progress'}
            </p>

            <button onClick={openCreateModal} className="btn-primary mt-8 h-12 w-full text-[15px] font-medium sm:h-auto sm:w-auto">
              <Lucide.Plus className="mr-2 h-5 w-5" />
              {locale === 'pt-BR' ? 'Criar plano de treino' : 'Create workout plan'}
            </button>
          </section>
        ) : (
          <>
            <section className="card animate-dashboard-fade space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-surface-500 dark:text-surface-400">
                    {locale === 'pt-BR' ? 'Seu plano atual' : 'Current plan'}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-surface-900 dark:text-surface-100">
                    {plan.name}
                  </h2>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    disabled
                    className="btn-secondary w-full opacity-60 disabled:cursor-not-allowed sm:w-auto"
                  >
                    <Lucide.Pencil className="mr-1.5 h-4 w-4" />
                    {locale === 'pt-BR' ? 'Editar plano' : 'Edit plan'}
                  </button>
                  <button
                    type="button"
                    onClick={openDeletePlanModal}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-all hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 sm:w-auto"
                  >
                    <Lucide.Trash2 className="mr-1.5 h-4 w-4" />
                    {locale === 'pt-BR' ? 'Remover plano' : 'Remove plan'}
                  </button>
                </div>
              </div>

              {planActionError && (
                <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {planActionError}
                </p>
              )}
            </section>

            <section className="card animate-dashboard-fade relative overflow-hidden border-2 border-brand-500/30 bg-gradient-to-br from-brand-500/10 via-surface-50 to-surface-100 dark:border-brand-500/50 dark:from-brand-900/40 dark:via-surface-900 dark:to-surface-950 p-6 sm:p-8 shadow-lg">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-500/20 to-transparent" />

              <div className="relative space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Lucide.Flame className="h-5 w-5 text-brand-600 dark:text-brand-400 animate-pulse" />
                      <p className="text-sm font-bold uppercase tracking-[0.15em] text-brand-600 dark:text-brand-400">
                        {locale === 'pt-BR' ? 'Treino de hoje' : "Today's workout"}
                      </p>
                    </div>
                    <h3 className="break-words text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">
                      {todayWorkout
                        ? todayWorkout.name
                        : locale === 'pt-BR'
                          ? 'Nenhum treino programado para hoje'
                          : 'No workout scheduled for today'}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-surface-600 dark:text-surface-300 bg-surface-200/50 dark:bg-surface-800/50 inline-block px-3 py-1 rounded-full">{todayDateLabel}</p>
                  </div>

                  {todayWorkout ? (
                    <button
                      type="button"
                      onClick={() => openWorkoutExecutionModal(todayWorkout)}
                      disabled={todayWorkoutExercises.length === 0}
                      className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto h-12 sm:h-auto text-[15px] font-bold shadow-md shadow-brand-500/20"
                    >
                      <Lucide.Play className="mr-2 h-5 w-5 fill-current" />
                      {locale === 'pt-BR' ? 'Iniciar treino' : 'Start workout'}
                    </button>
                  ) : days.length > 0 ? (
                    <button
                      type="button"
                      onClick={openChooseTodayWorkoutModal}
                      className="btn-secondary w-full sm:w-auto h-12 sm:h-auto text-[15px] font-medium border-2 border-surface-300 dark:border-surface-600"
                    >
                      <Lucide.CalendarCheck2 className="mr-2 h-5 w-5" />
                      {locale === 'pt-BR' ? 'Escolher treino de hoje' : 'Choose today\'s workout'}
                    </button>
                  ) : null}
                </div>

                {todayWorkout ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-surface-200/80 bg-white/80 p-4 dark:border-surface-700/70 dark:bg-surface-900/70">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-surface-500 dark:text-surface-400">
                        {locale === 'pt-BR' ? 'Programacao' : 'Schedule'}
                      </p>
                      <p className="mt-1 text-sm font-medium text-surface-900 dark:text-surface-100">
                        {todayWorkoutSource === 'manual'
                          ? locale === 'pt-BR'
                            ? 'Escolhido para hoje'
                            : 'Chosen for today'
                          : getWeekDayLabel(todayWorkout.weekDay) ??
                            (locale === 'pt-BR' ? 'Sem dia fixo' : 'No fixed day')}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-surface-200/80 bg-white/80 p-4 dark:border-surface-700/70 dark:bg-surface-900/70">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-surface-500 dark:text-surface-400">
                        {locale === 'pt-BR' ? 'Exercicios' : 'Exercises'}
                      </p>
                      <p className="mt-1 text-sm font-medium text-surface-900 dark:text-surface-100">
                        {todayWorkoutExercises.length}{' '}
                        {locale === 'pt-BR' ? 'configurados' : 'configured'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-dashed border-surface-300/90 bg-white/70 p-5 text-sm text-surface-500 dark:border-surface-700 dark:bg-surface-900/60 dark:text-surface-400">
                    <p>
                      {locale === 'pt-BR'
                        ? 'Nenhum treino programado para hoje'
                        : 'No workout scheduled for today'}
                    </p>
                    {days.length > 0 ? (
                      <button
                        type="button"
                        onClick={openChooseTodayWorkoutModal}
                        className="btn-secondary w-full sm:w-auto"
                      >
                        <Lucide.CalendarCheck2 className="mr-1.5 h-4 w-4" />
                        {locale === 'pt-BR' ? 'Escolher treino de hoje' : 'Choose today\'s workout'}
                      </button>
                    ) : (
                      <p className="text-xs text-surface-400 dark:text-surface-500">
                        {locale === 'pt-BR'
                          ? 'Adicione ao menos um treino para fazer a selecao manual.'
                          : 'Add at least one workout to choose manually.'}
                      </p>
                    )}
                  </div>
                )}

                {todayWorkout && todayWorkoutExercises.length > 0 && (
                  <div className="rounded-2xl border border-surface-200/80 bg-white/80 p-4 dark:border-surface-700/70 dark:bg-surface-900/70 sm:p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-surface-500 dark:text-surface-400">
                      {locale === 'pt-BR' ? 'Progresso dos exercicios' : 'Exercise progress'}
                    </p>

                    <div className="mt-3 space-y-2">
                      {todayWorkoutExercises.map((item) => {
                        const done = Boolean(todayExerciseDoneById[item.exerciseId])

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                              done
                                ? 'border-emerald-300/70 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-900/20'
                                : 'border-surface-200 bg-surface-50/70 dark:border-surface-700/70 dark:bg-surface-900/40'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleTodayExercise(item.exerciseId)}
                              disabled={savingTodayWorkoutLog || loadingTodayWorkoutLog}
                              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                                done
                                  ? 'border-emerald-500/70 bg-emerald-500 text-white shadow-sm'
                                  : 'border-surface-300 bg-white text-transparent hover:border-brand-400 hover:bg-brand-50 dark:border-surface-600 dark:bg-surface-900 dark:hover:border-brand-500 dark:hover:bg-brand-900/20'
                              }`}
                              aria-label={
                                locale === 'pt-BR'
                                  ? `Marcar ${getExerciseDisplayName(item.exercise, locale)} como feito`
                                  : `Mark ${getExerciseDisplayName(item.exercise, locale)} as done`
                              }
                            >
                              <Lucide.Check className={`h-5 w-5 transition-transform duration-200 ${done ? 'scale-100' : 'scale-75'}`} />
                            </button>

                            <div className={`min-w-0 transition-all duration-200 ${done ? 'opacity-60' : ''}`}>
                              <p
                                className={`truncate text-sm font-medium text-surface-900 dark:text-surface-100 ${
                                  done ? 'line-through decoration-2 decoration-emerald-500/60' : ''
                                }`}
                              >
                                {getExerciseDisplayName(item.exercise, locale)}
                              </p>
                              <p
                                className={`mt-0.5 text-xs text-surface-500 dark:text-surface-400 ${
                                  done ? 'line-through decoration-2 decoration-emerald-500/50' : ''
                                }`}
                              >
                                {item.sets} x {item.reps}
                                {item.targetWeight ? ` • ${item.targetWeight} kg` : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        {todayDoneExercisesCount}/{todayWorkoutExercises.length}{' '}
                        {locale === 'pt-BR' ? 'exercicios concluidos' : 'exercises completed'}
                      </p>

                      <button
                        type="button"
                        onClick={handleCompleteTodayWorkout}
                        disabled={
                          todayWorkoutCompleted ||
                          savingTodayWorkoutLog ||
                          loadingTodayWorkoutLog ||
                          todayWorkoutExercises.length === 0
                        }
                        className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 h-12 sm:h-auto text-[15px] sm:text-sm font-semibold transition-all shadow-md sm:w-auto ${
                          todayWorkoutCompleted
                            ? 'cursor-not-allowed bg-emerald-600 text-white'
                            : 'bg-brand-600 text-white hover:bg-brand-700 hover:-translate-y-0.5'
                        } disabled:opacity-90`}
                      >
                        <Lucide.CheckCircle2 className="mr-2 h-5 w-5 sm:mr-1.5 sm:h-4 sm:w-4" />
                        {todayWorkoutCompleted
                          ? locale === 'pt-BR'
                            ? 'Treino concluido hoje'
                            : 'Workout completed today'
                          : savingTodayWorkoutLog
                            ? locale === 'pt-BR'
                              ? 'Salvando...'
                              : 'Saving...'
                            : locale === 'pt-BR'
                              ? 'Concluir treino'
                              : 'Complete workout'}
                      </button>
                    </div>
                  </div>
                )}

                {todayWorkout && todayWorkoutExercises.length === 0 && (
                  <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                    {locale === 'pt-BR'
                      ? 'Este treino ainda nao possui exercicios. Adicione exercicios para iniciar.'
                      : 'This workout has no exercises yet. Add exercises before starting.'}
                  </p>
                )}

                {workoutSessionSuccess && (
                  <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {workoutSessionSuccess}
                  </p>
                )}

                {todayWorkoutChoiceSuccess && (
                  <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {todayWorkoutChoiceSuccess}
                  </p>
                )}

                {todayWorkoutCompleted && (
                  <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {locale === 'pt-BR' ? 'Treino concluido hoje' : 'Workout completed today'}
                  </p>
                )}

                {!showChooseTodayWorkoutModal && todayWorkoutChoiceError && (
                  <p className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {todayWorkoutChoiceError}
                  </p>
                )}

                {todayWorkoutLogError && (
                  <p className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {todayWorkoutLogError}
                  </p>
                )}

                {!showWorkoutExecutionModal && workoutExecutionError && (
                  <p className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {workoutExecutionError}
                  </p>
                )}
              </div>
            </section>

            <section className="animate-dashboard-fade grid gap-4 lg:grid-cols-2">
              <article className="card relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brand-500/10 to-transparent" />

                <div className="relative">
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                    {locale === 'pt-BR' ? 'Seu desempenho' : 'Your performance'}
                  </h3>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between rounded-xl border border-surface-200/80 bg-surface-50/70 px-3 py-2.5 dark:border-surface-700/70 dark:bg-surface-900/60">
                      <p className="text-sm text-surface-600 dark:text-surface-300">
                        🔥 {locale === 'pt-BR' ? 'Streak atual' : 'Current streak'}
                      </p>
                      <p className="text-base font-semibold text-surface-900 dark:text-surface-100">
                        {loadingWorkoutPerformance ? '...' : userStats?.currentStreak ?? 0}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-surface-200/80 bg-surface-50/70 px-3 py-2.5 dark:border-surface-700/70 dark:bg-surface-900/60">
                      <p className="text-sm text-surface-600 dark:text-surface-300">
                        🏆 {locale === 'pt-BR' ? 'Melhor sequencia' : 'Best streak'}
                      </p>
                      <p className="text-base font-semibold text-surface-900 dark:text-surface-100">
                        {loadingWorkoutPerformance ? '...' : userStats?.longestStreak ?? 0}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-surface-200/80 bg-surface-50/70 px-3 py-2.5 dark:border-surface-700/70 dark:bg-surface-900/60">
                      <p className="text-sm text-surface-600 dark:text-surface-300">
                        ⚡ {locale === 'pt-BR' ? 'Score total' : 'Total score'}
                      </p>
                      <p className="text-base font-semibold text-surface-900 dark:text-surface-100">
                        {loadingWorkoutPerformance
                          ? '...'
                          : scoreNumberFormatter.format(userStats?.score ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="card relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brand-500/10 to-transparent" />

                <div className="relative">
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                    {locale === 'pt-BR' ? 'Ranking semanal' : 'Weekly ranking'}
                  </h3>

                  {loadingWorkoutPerformance ? (
                    <p className="mt-4 text-sm text-surface-500 dark:text-surface-400">
                      {locale === 'pt-BR' ? 'Carregando ranking...' : 'Loading ranking...'}
                    </p>
                  ) : workoutRanking.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-surface-300/80 bg-surface-50/70 px-3 py-3 text-sm text-surface-500 dark:border-surface-700/70 dark:bg-surface-900/50 dark:text-surface-400">
                      {locale === 'pt-BR'
                        ? 'Ainda nao ha pontuacao suficiente para montar o ranking.'
                        : 'There is not enough score yet to build the ranking.'}
                    </p>
                  ) : (
                    <div className="mt-4 max-h-72 overflow-y-auto pr-1">
                      <ol className="space-y-2">
                        {workoutRanking.map((entry) => {
                          const isCurrentUser = entry.userId === session.userId || entry.isCurrentUser

                          return (
                            <li
                              key={entry.userId}
                              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                                isCurrentUser
                                  ? 'border-brand-400/70 bg-brand-50/80 dark:border-brand-500/50 dark:bg-brand-900/25'
                                  : 'border-surface-200/80 bg-surface-50/70 dark:border-surface-700/70 dark:bg-surface-900/60'
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-300/80 bg-white text-xs font-semibold text-surface-700 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-200">
                                  {entry.position}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                                    {entry.name}
                                    {isCurrentUser
                                      ? locale === 'pt-BR'
                                        ? ' (voce)'
                                        : ' (you)'
                                      : ''}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-surface-500 dark:text-surface-400">
                                    🔥 {entry.currentStreak}
                                  </p>
                                </div>
                              </div>

                              <p className="shrink-0 text-sm font-semibold text-surface-900 dark:text-surface-100">
                                ⚡ {scoreNumberFormatter.format(entry.score)}
                              </p>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  )}

                  {!loadingWorkoutPerformance && !isCurrentUserInTopRanking && currentUserRankingPosition && (
                    <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">
                      {locale === 'pt-BR'
                        ? `Sua posicao atual: #${currentUserRankingPosition}`
                        : `Your current position: #${currentUserRankingPosition}`}
                    </p>
                  )}
                </div>
              </article>
            </section>

            {workoutPerformanceError && (
              <p className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                {workoutPerformanceError}
              </p>
            )}

            <section className="card animate-dashboard-fade">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {locale === 'pt-BR' ? 'Seus treinos' : 'Your workouts'}
                </h3>
                <button type="button" onClick={openCreateDayModal} className="btn-primary w-full sm:w-auto">
                  <Lucide.Plus className="mr-1.5 h-4 w-4" />
                  {locale === 'pt-BR' ? 'Adicionar treino' : 'Add workout'}
                </button>
              </div>

              {dayActionError && (
                <p className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {dayActionError}
                </p>
              )}

              {exerciseActionError && (
                <p className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {exerciseActionError}
                </p>
              )}

              {days.length === 0 ? (
                <div className="mt-5 p-1.5 rounded-[2.5rem] bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700/50">
                  <div className="rounded-[calc(2.5rem-0.375rem)] bg-white dark:bg-surface-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-center py-20 px-6 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.05),transparent_50%)] pointer-events-none" />
                    <div className="w-20 h-20 rounded-[1.5rem] bg-surface-50 dark:bg-surface-950 border border-surface-100 dark:border-surface-800 flex items-center justify-center mb-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] rotate-3 group-hover:rotate-0 transition-transform duration-500 relative z-10">
                      <Lucide.Dumbbell strokeWidth={1.5} className="w-10 h-10 text-orange-500" />
                    </div>
                    <h3 className="font-display text-2xl font-bold tracking-tight mb-2 text-surface-900 dark:text-white relative z-10">
                      {locale === 'pt-BR' ? 'Comece sua evolução.' : 'Start your evolution.'}
                    </h3>
                    <p className="text-sm font-medium text-surface-500 dark:text-surface-400 max-w-sm mb-6 leading-relaxed relative z-10">
                      {locale === 'pt-BR' 
                        ? 'Estruture sua rotina. Adicione seu primeiro treino para montar a sua ficha e acompanhar sua progressão.' 
                        : 'Structure your routine. Add your first workout to build your routine and track progress.'}
                    </p>
                    <button
                      onClick={openCreateDayModal}
                      className="group relative inline-flex z-10 items-center justify-center gap-2 rounded-full bg-orange-600 px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(249,115,22,0.4)] transition-all duration-300 hover:bg-orange-700 hover:shadow-[0_12px_24px_-8px_rgba(249,115,22,0.6)] active:scale-[0.98]"
                    >
                      <Lucide.Plus className="w-4 h-4" />
                      {locale === 'pt-BR' ? 'Criar treino' : 'Create workout'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {days.map((day, index) => {
                    const weekDayLabel = getWeekDayLabel(day.weekDay)
                    const canMoveUp = index > 0
                    const canMoveDown = index < days.length - 1
                    const dayExercises = sortWorkoutDayExercises(dayExercisesByDay[day.id] ?? [])

                    return (
                      <article
                        key={day.id}
                        className="rounded-2xl border border-surface-200/90 bg-white p-4 shadow-sm transition-colors dark:border-surface-700/60 dark:bg-surface-900/70 sm:p-5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h4 className="break-words text-base font-semibold text-surface-900 dark:text-surface-100">
                              {day.name}
                            </h4>
                            {weekDayLabel && (
                              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{weekDayLabel}</p>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveDay(day.id, 'up')}
                              disabled={!canMoveUp || !!reorderingDayId}
                              className="h-9 w-9 rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-surface-800 dark:hover:text-surface-300"
                              title={locale === 'pt-BR' ? 'Mover para cima' : 'Move up'}
                            >
                              <Lucide.ArrowUp className="mx-auto h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveDay(day.id, 'down')}
                              disabled={!canMoveDown || !!reorderingDayId}
                              className="h-9 w-9 rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-surface-800 dark:hover:text-surface-300"
                              title={locale === 'pt-BR' ? 'Mover para baixo' : 'Move down'}
                            >
                              <Lucide.ArrowDown className="mx-auto h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditDayModal(day)}
                              className="h-9 w-9 rounded-lg text-surface-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                              title={locale === 'pt-BR' ? 'Editar treino' : 'Edit workout'}
                            >
                              <Lucide.Pencil className="mx-auto h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteDayModal(day.id)}
                              className="h-9 w-9 rounded-lg text-surface-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              title={locale === 'pt-BR' ? 'Remover treino' : 'Remove workout'}
                            >
                              <Lucide.Trash2 className="mx-auto h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => openAddExerciseModal(day)}
                            className="btn-secondary w-full sm:w-auto"
                          >
                            <Lucide.Plus className="mr-1.5 h-4 w-4" />
                            {locale === 'pt-BR' ? 'Adicionar exercicio' : 'Add exercise'}
                          </button>

                          {dayExercises.length === 0 ? (
                            <div className="mt-3 rounded-xl border border-surface-200/50 bg-surface-50/50 px-4 py-6 text-center dark:border-surface-700/30 dark:bg-surface-800/30">
                              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-200/50 dark:bg-surface-700/50 mb-2">
                                <Lucide.Dumbbell className="w-5 h-5 text-surface-400 dark:text-surface-500" />
                              </div>
                              <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
                                {locale === 'pt-BR' ? 'Nenhum exercício neste treino' : 'No exercises in this workout'}
                              </p>
                              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                                {locale === 'pt-BR' ? 'Clique em "Adicionar exercício" para começar' : 'Click "Add exercise" to begin'}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {dayExercises.map((item, itemIndex) => {
                                const canMoveExerciseUp = itemIndex > 0
                                const canMoveExerciseDown = itemIndex < dayExercises.length - 1

                                return (
                                  <div
                                    key={item.id}
                                    className="rounded-xl border border-surface-200 bg-surface-50/70 p-3 dark:border-surface-700/60 dark:bg-surface-900/70"
                                  >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
                                          {getExerciseDisplayName(item.exercise, locale)}
                                        </p>
                                        <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                                          {item.sets} x {item.reps}
                                          {item.targetWeight ? ` • ${item.targetWeight} kg` : ''}
                                        </p>
                                        {item.notes && (
                                          <p className="mt-1 break-words text-xs text-surface-400 dark:text-surface-500">
                                            {item.notes}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveDayExercise(day.id, item.id, 'up')}
                                          disabled={!canMoveExerciseUp || !!reorderingDayExerciseId}
                                          className="h-8 w-8 rounded-lg text-surface-400 transition-colors hover:bg-surface-200 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-surface-800 dark:hover:text-surface-300"
                                          title={locale === 'pt-BR' ? 'Mover para cima' : 'Move up'}
                                        >
                                          <Lucide.ArrowUp className="mx-auto h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveDayExercise(day.id, item.id, 'down')}
                                          disabled={!canMoveExerciseDown || !!reorderingDayExerciseId}
                                          className="h-8 w-8 rounded-lg text-surface-400 transition-colors hover:bg-surface-200 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-surface-800 dark:hover:text-surface-300"
                                          title={locale === 'pt-BR' ? 'Mover para baixo' : 'Move down'}
                                        >
                                          <Lucide.ArrowDown className="mx-auto h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openEditDayExerciseModal(item)}
                                          className="h-8 w-8 rounded-lg text-surface-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                                          title={locale === 'pt-BR' ? 'Editar exercicio' : 'Edit exercise'}
                                        >
                                          <Lucide.Pencil className="mx-auto h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openDeleteDayExerciseModal(item)}
                                          className="h-8 w-8 rounded-lg text-surface-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                          title={locale === 'pt-BR' ? 'Remover exercicio' : 'Remove exercise'}
                                        >
                                          <Lucide.Trash2 className="mx-auto h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {workoutToastMessage && (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6">
          <div className="rounded-xl border border-emerald-300/80 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 animate-fade-in">
            {workoutToastMessage}
          </div>
        </div>
      )}

      {showChooseTodayWorkoutModal && (
        <div
          className={`fixed inset-0 z-[57] flex items-end justify-center bg-black/60 p-0 transition-opacity duration-200 sm:items-center sm:p-4 ${
            chooseTodayWorkoutModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.target === e.currentTarget && closeChooseTodayWorkoutModal()}
        >
          <div
            className={`w-full rounded-t-3xl border border-surface-200/80 bg-white shadow-xl transition-all duration-200 dark:border-surface-700/60 dark:bg-surface-900 sm:max-w-xl sm:rounded-2xl ${
              chooseTodayWorkoutModalVisible
                ? 'translate-y-0 opacity-100 sm:scale-100'
                : 'translate-y-6 opacity-0 sm:translate-y-0 sm:scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-surface-200/80 p-5 dark:border-surface-800">
              <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {locale === 'pt-BR' ? 'Escolher treino de hoje' : "Choose today's workout"}
                </h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{todayDateLabel}</p>
              </div>

              <button
                type="button"
                onClick={closeChooseTodayWorkoutModal}
                disabled={savingTodayWorkoutChoice}
                className="rounded-full p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-surface-300"
              >
                <Lucide.X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChooseTodayWorkout} className="flex max-h-[88dvh] flex-col">
              <div className="space-y-4 overflow-y-auto p-5">
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {locale === 'pt-BR'
                    ? 'Selecione um treino do seu plano para usar apenas hoje.'
                    : 'Pick one workout from your plan to use today only.'}
                </p>

                <div className="space-y-2">
                  {days.map((day) => {
                    const selected = selectedTodayWorkoutDayId === day.id
                    const weekDayLabel = getWeekDayLabel(day.weekDay)
                    const exerciseCount = (dayExercisesByDay[day.id] ?? []).length

                    return (
                      <label
                        key={day.id}
                        className={`block cursor-pointer rounded-xl border p-3 transition-all ${
                          selected
                            ? 'border-brand-400 bg-brand-50/80 dark:border-brand-500/50 dark:bg-brand-900/20'
                            : 'border-surface-200 bg-surface-50 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800/60 dark:hover:bg-surface-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name="today-workout-day"
                          className="sr-only"
                          value={day.id}
                          checked={selected}
                          onChange={(e) => setSelectedTodayWorkoutDayId(e.target.value)}
                        />

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-surface-900 dark:text-surface-100">
                              {day.name}
                            </p>
                            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                              {weekDayLabel ??
                                (locale === 'pt-BR' ? 'Sem dia fixo' : 'No fixed day')}
                              {` • ${exerciseCount} ${locale === 'pt-BR' ? 'exercicios' : 'exercises'}`}
                            </p>
                          </div>
                          {selected && <Lucide.CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />}
                        </div>
                      </label>
                    )
                  })}
                </div>

                {todayWorkoutChoiceError && (
                  <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {todayWorkoutChoiceError}
                  </p>
                )}
              </div>

              <div className="border-t border-surface-200/80 p-4 dark:border-surface-700/70 sm:p-5">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeChooseTodayWorkoutModal}
                    disabled={savingTodayWorkoutChoice}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={savingTodayWorkoutChoice || !selectedTodayWorkoutDayId}
                    className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {savingTodayWorkoutChoice
                      ? locale === 'pt-BR'
                        ? 'Salvando...'
                        : 'Saving...'
                      : locale === 'pt-BR'
                        ? 'Salvar treino de hoje'
                        : "Save today's workout"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 transition-opacity duration-200 sm:items-center sm:p-4 ${
            createPlanModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.target === e.currentTarget && !submitting && closeCreateModal()}
        >
          <div
            className={`flex max-h-[94dvh] w-full flex-col rounded-t-3xl border border-surface-200/80 bg-white shadow-xl transition-all duration-200 dark:border-surface-700/60 dark:bg-surface-900 sm:max-h-[calc(100vh-2rem)] sm:max-w-lg sm:rounded-2xl ${
              createPlanModalVisible
                ? 'translate-y-0 opacity-100 sm:scale-100'
                : 'translate-y-6 opacity-0 sm:translate-y-0 sm:scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-surface-200/80 p-5 dark:border-surface-800">
              <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {locale === 'pt-BR' ? 'Criar plano de treino' : 'Create workout plan'}
                </h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  {locale === 'pt-BR'
                    ? 'Defina um nome para o seu plano atual.'
                    : 'Set a name for your current plan.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={submitting}
                className="rounded-full p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-surface-300"
              >
                <Lucide.X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreatePlan}
              onFocusCapture={handleCreatePlanModalFocus}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div ref={createPlanModalBodyRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-surface-600 dark:text-surface-300">
                    {locale === 'pt-BR' ? 'Nome do plano' : 'Plan name'}
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    className="input-field"
                    placeholder={locale === 'pt-BR' ? 'Ex: Hipertrofia - Abril' : 'Ex: Hypertrophy - April'}
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    autoFocus
                  />
                </div>

                {createPlanError && (
                  <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {createPlanError}
                  </p>
                )}
              </div>

              <div
                className="border-t border-surface-200/80 p-4 dark:border-surface-800 sm:p-5"
                style={
                  mobileKeyboardInset > 0
                    ? {
                        paddingBottom: `${mobileKeyboardInset + 16}px`,
                      }
                    : undefined
                }
              >
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    disabled={submitting}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
                    {submitting
                      ? locale === 'pt-BR'
                        ? 'Criando...'
                        : 'Creating...'
                      : locale === 'pt-BR'
                        ? 'Criar plano'
                        : 'Create plan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDayModal && (
        <div
          className={`fixed inset-0 z-[55] flex items-end justify-center bg-black/60 p-0 transition-opacity duration-200 sm:items-center sm:p-4 ${
            dayModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.target === e.currentTarget && !daySubmitting && closeDayModal()}
        >
          <div
            className={`flex max-h-[94dvh] w-full flex-col rounded-t-3xl border border-surface-200/80 bg-white shadow-xl transition-all duration-200 dark:border-surface-700/60 dark:bg-surface-900 sm:max-h-[calc(100vh-2rem)] sm:max-w-lg sm:rounded-2xl ${
              dayModalVisible
                ? 'translate-y-0 opacity-100 sm:scale-100'
                : 'translate-y-6 opacity-0 sm:translate-y-0 sm:scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-surface-200/80 p-5 dark:border-surface-800">
              <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {editingDay
                    ? locale === 'pt-BR'
                      ? 'Editar treino'
                      : 'Edit workout'
                    : locale === 'pt-BR'
                      ? 'Adicionar treino'
                      : 'Add workout'}
                </h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  {locale === 'pt-BR'
                    ? 'Personalize seu treino e prepare a estrutura para os exercicios.'
                    : 'Customize your workout and prepare exercise structure.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDayModal}
                disabled={daySubmitting}
                className="rounded-full p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-surface-300"
              >
                <Lucide.X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveDay}
              onFocusCapture={handleDayModalFocus}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div ref={dayModalBodyRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-surface-600 dark:text-surface-300">
                    {locale === 'pt-BR' ? 'Nome do treino' : 'Workout name'}
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    className="input-field"
                    placeholder={locale === 'pt-BR' ? 'Ex: A, Peito e triceps' : 'Ex: A, Chest and triceps'}
                    value={dayName}
                    onChange={(e) => setDayName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-surface-600 dark:text-surface-300">
                    {locale === 'pt-BR' ? 'Dia da semana (opcional)' : 'Week day (optional)'}
                  </label>
                  <select className="input-field" value={dayWeekDay} onChange={(e) => setDayWeekDay(e.target.value)}>
                    <option value="">{locale === 'pt-BR' ? 'Sem dia fixo' : 'No fixed day'}</option>
                    {WEEK_DAY_OPTIONS.map((item) => (
                      <option key={item.value} value={String(item.value)}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {dayFormError && (
                  <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {dayFormError}
                  </p>
                )}
              </div>

              <div
                className="border-t border-surface-200/80 p-4 dark:border-surface-800 sm:p-5"
                style={
                  mobileKeyboardInset > 0
                    ? {
                        paddingBottom: `${mobileKeyboardInset + 16}px`,
                      }
                    : undefined
                }
              >
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDayModal}
                    disabled={daySubmitting}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={daySubmitting} className="btn-primary w-full sm:w-auto">
                    {daySubmitting
                      ? locale === 'pt-BR'
                        ? 'Salvando...'
                        : 'Saving...'
                      : editingDay
                        ? locale === 'pt-BR'
                          ? 'Salvar treino'
                          : 'Save workout'
                        : locale === 'pt-BR'
                          ? 'Adicionar treino'
                          : 'Add workout'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExerciseModal && (
        <div
          className={`fixed inset-0 z-[58] flex items-end justify-center bg-black/60 p-0 transition-opacity duration-200 sm:items-center sm:p-4 ${
            addExerciseModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.target === e.currentTarget && closeAddExerciseModal()}
        >
          <div
            className={`flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-surface-200/80 bg-white shadow-xl transition-all duration-200 dark:border-surface-700/60 dark:bg-surface-900 sm:max-w-2xl sm:rounded-2xl ${
              addExerciseModalVisible
                ? 'translate-y-0 opacity-100 sm:scale-100'
                : 'translate-y-6 opacity-0 sm:translate-y-0 sm:scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-surface-200/80 p-5 dark:border-surface-800">
              <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {locale === 'pt-BR' ? 'Adicionar exercicio' : 'Add exercise'}
                </h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  {exerciseTargetDay
                    ? locale === 'pt-BR'
                      ? `Treino ${exerciseTargetDay.name}`
                      : `Workout ${exerciseTargetDay.name}`
                    : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddExerciseModal}
                disabled={addingExerciseSubmitting}
                className="rounded-full p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-surface-300"
              >
                <Lucide.X className="h-5 w-5" />
              </button>
            </div>

            <div
              ref={addExerciseModalBodyRef}
              onFocusCapture={handleAddExerciseModalFocus}
              className="space-y-4 overflow-y-auto p-5"
              style={
                mobileKeyboardInset > 0
                  ? {
                      paddingBottom: `${mobileKeyboardInset + 20}px`,
                    }
                  : undefined
              }
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <input
                  type="text"
                  className="input-field"
                  placeholder={locale === 'pt-BR' ? 'Buscar por nome (PT ou EN)' : 'Search by name (PT or EN)'}
                  value={exerciseQuery}
                  onChange={(e) => setExerciseQuery(e.target.value)}
                />
                <select
                  className="input-field"
                  value={exerciseGroupFilter}
                  onChange={(e) => setExerciseGroupFilter(e.target.value as 'ALL' | ExerciseMuscleGroup)}
                >
                  {MUSCLE_GROUP_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {locale === 'pt-BR' ? item.labelPt : item.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={openCreateCustomExerciseModal} className="btn-secondary w-full sm:w-auto">
                  <Lucide.Plus className="mr-1.5 h-4 w-4" />
                  {locale === 'pt-BR' ? 'Criar exercicio' : 'Create exercise'}
                </button>
              </div>

              <div className="scrollbar-thin max-h-56 space-y-2 overflow-y-auto pr-1 sm:max-h-64">
                {loadingAvailableExercises ? (
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-center text-sm text-surface-500 dark:border-surface-700 dark:bg-surface-800/50 dark:text-surface-400">
                    {locale === 'pt-BR' ? 'Carregando exercicios...' : 'Loading exercises...'}
                  </div>
                ) : filteredExercises.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-surface-300 bg-surface-50 p-4 text-center text-sm text-surface-500 dark:border-surface-700 dark:bg-surface-800/50 dark:text-surface-400">
                    {locale === 'pt-BR'
                      ? 'Nenhum exercicio encontrado. Crie um exercicio customizado.'
                      : 'No exercises found. Create a custom one.'}
                  </div>
                ) : (
                  filteredExercises.map((exercise) => {
                    const selected = selectedExerciseId === exercise.id

                    return (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => setSelectedExerciseId(exercise.id)}
                        className={`w-full rounded-xl border p-3 text-left transition-all ${
                          selected
                            ? 'border-brand-400 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-900/20'
                            : 'border-surface-200 bg-surface-50 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800/50 dark:hover:bg-surface-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                              {getExerciseDisplayName(exercise, locale)}
                            </p>
                            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                              {getMuscleGroupLabel(exercise.muscleGroup, locale)}
                              {exercise.equipment ? ` • ${exercise.equipment}` : ''}
                              {exercise.isSystem ? '' : ` • ${locale === 'pt-BR' ? 'Personalizado' : 'Custom'}`}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
                              selected
                                ? 'bg-brand-500 text-white'
                                : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300'
                            }`}
                          >
                            {selected ? (locale === 'pt-BR' ? 'Selecionado' : 'Selected') : locale === 'pt-BR' ? 'Escolher' : 'Choose'}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {selectedExercise && (
                <form
                  onSubmit={handleAddExerciseToDay}
                  className="space-y-4 rounded-2xl border border-brand-300/40 bg-gradient-to-br from-brand-500/10 via-white to-surface-50 p-4 dark:border-brand-700/40 dark:from-brand-500/10 dark:via-surface-900 dark:to-surface-950 sm:p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-600 dark:text-brand-300">
                        {locale === 'pt-BR' ? 'Configurar no treino' : 'Configure in workout'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-surface-900 dark:text-surface-100">
                        {getExerciseDisplayName(selectedExercise, locale)}
                      </p>
                    </div>

                    <span className="inline-flex w-fit rounded-full border border-surface-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-surface-500 dark:border-surface-700/80 dark:bg-surface-900/70 dark:text-surface-300">
                      {getMuscleGroupLabel(selectedExercise.muscleGroup, locale)}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                        {locale === 'pt-BR' ? 'Series' : 'Sets'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        className="input-field"
                        value={newExerciseSets}
                        onChange={(e) => setNewExerciseSets(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                        {locale === 'pt-BR' ? 'Repeticoes' : 'Reps'}
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={newExerciseReps}
                        onChange={(e) => setNewExerciseReps(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                      {locale === 'pt-BR' ? 'Carga alvo (opcional)' : 'Target weight (optional)'}
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: 40"
                      value={newExerciseTargetWeight}
                      onChange={(e) => setNewExerciseTargetWeight(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                      {locale === 'pt-BR' ? 'Observacao (opcional)' : 'Notes (optional)'}
                    </label>
                    <textarea
                      className="input-field min-h-[96px] resize-y"
                      value={newExerciseNotes}
                      onChange={(e) => setNewExerciseNotes(e.target.value)}
                    />
                  </div>

                  {addExerciseError && (
                    <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      {addExerciseError}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeAddExerciseModal}
                      disabled={addingExerciseSubmitting}
                      className="btn-secondary w-full sm:w-auto"
                    >
                      {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button type="submit" disabled={addingExerciseSubmitting} className="btn-primary w-full sm:w-auto">
                      {addingExerciseSubmitting
                        ? locale === 'pt-BR'
                          ? 'Adicionando...'
                          : 'Adding...'
                        : locale === 'pt-BR'
                          ? 'Adicionar ao treino'
                          : 'Add to workout'}
                    </button>
                  </div>
                </form>
              )}

              {!selectedExercise && addExerciseError && (
                <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {addExerciseError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateCustomExerciseModal && (
        <div
          className="fixed inset-0 z-[62] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={closeCreateCustomExerciseModal}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl border border-surface-200/80 bg-white shadow-elevated dark:border-surface-700/60 dark:bg-surface-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-surface-200/80 p-5 dark:border-surface-800">
              <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {locale === 'pt-BR' ? 'Criar exercicio' : 'Create exercise'}
                </h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  {locale === 'pt-BR'
                    ? 'Adicione um exercicio personalizado para sua conta.'
                    : 'Add a custom exercise for your account.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateCustomExerciseModal}
                disabled={creatingCustomExercise}
                className="rounded-full p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-surface-300"
              >
                <Lucide.X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateCustomExercise}
              onFocusCapture={handleCreateCustomExerciseModalFocus}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div
                ref={createCustomExerciseModalBodyRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5"
              >
                <div className="space-y-1">
                  <label className="block text-xs text-surface-500 dark:text-surface-400">
                    {locale === 'pt-BR' ? 'Nome do exercicio' : 'Exercise name'}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={customExerciseName}
                    onChange={(e) => setCustomExerciseName(e.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-surface-500 dark:text-surface-400">
                    {locale === 'pt-BR' ? 'Grupo muscular' : 'Muscle group'}
                  </label>
                  <select
                    className="input-field"
                    value={customExerciseMuscleGroup}
                    onChange={(e) => setCustomExerciseMuscleGroup(e.target.value as ExerciseMuscleGroup)}
                  >
                    {MUSCLE_GROUP_OPTIONS.filter((item) => item.value !== 'ALL').map((item) => (
                      <option key={item.value} value={item.value}>
                        {locale === 'pt-BR' ? item.labelPt : item.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-surface-500 dark:text-surface-400">
                    {locale === 'pt-BR' ? 'Equipamento (opcional)' : 'Equipment (optional)'}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={customExerciseEquipment}
                    onChange={(e) => setCustomExerciseEquipment(e.target.value)}
                    maxLength={80}
                  />
                </div>

                {createCustomExerciseError && (
                  <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {createCustomExerciseError}
                  </p>
                )}
              </div>

              <div
                className="border-t border-surface-200/80 p-4 dark:border-surface-800 sm:p-5"
                style={
                  mobileKeyboardInset > 0
                    ? {
                        paddingBottom: `${mobileKeyboardInset + 16}px`,
                      }
                    : undefined
                }
              >
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCreateCustomExerciseModal}
                    disabled={creatingCustomExercise}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={creatingCustomExercise} className="btn-primary w-full sm:w-auto">
                    {creatingCustomExercise
                      ? locale === 'pt-BR'
                        ? 'Criando...'
                        : 'Creating...'
                      : locale === 'pt-BR'
                        ? 'Criar exercicio'
                        : 'Create exercise'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditDayExerciseModal && editingDayExercise && (
        <div
          className={`fixed inset-0 z-[63] flex items-end justify-center bg-black/60 p-0 transition-opacity duration-200 sm:items-center sm:p-4 ${
            editDayExerciseModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.target === e.currentTarget && closeEditDayExerciseModal()}
        >
          <div
            className={`flex max-h-[94dvh] w-full flex-col rounded-t-3xl border border-surface-200/80 bg-white shadow-xl transition-all duration-200 dark:border-surface-700/60 dark:bg-surface-900 sm:max-w-2xl sm:rounded-2xl ${
              editDayExerciseModalVisible
                ? 'translate-y-0 opacity-100 sm:scale-100'
                : 'translate-y-6 opacity-0 sm:translate-y-0 sm:scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-surface-200/80 p-5 dark:border-surface-800">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-600 dark:text-brand-300">
                  {locale === 'pt-BR' ? 'Editar configuracao' : 'Edit configuration'}
                </p>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {locale === 'pt-BR' ? 'Editar exercicio' : 'Edit exercise'}
                </h3>
                <p className="mt-1 truncate text-sm text-surface-500 dark:text-surface-400">
                  {getExerciseDisplayName(editingDayExercise.exercise, locale)}
                </p>
                <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
                  {getMuscleGroupLabel(editingDayExercise.exercise.muscleGroup, locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditDayExerciseModal}
                disabled={savingEditDayExercise}
                className="rounded-full p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-surface-300"
              >
                <Lucide.X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateDayExercise}
              onFocusCapture={handleEditDayExerciseModalFocus}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div
                ref={editDayExerciseModalBodyRef}
                className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6"
              >
                <div className="rounded-2xl border border-surface-200/80 bg-surface-50/80 p-4 dark:border-surface-700/80 dark:bg-surface-900/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                    {locale === 'pt-BR' ? 'Parametros principais' : 'Main parameters'}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                        {locale === 'pt-BR' ? 'Series' : 'Sets'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        className="input-field"
                        value={editExerciseSets}
                        onChange={(e) => setEditExerciseSets(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                        {locale === 'pt-BR' ? 'Repeticoes' : 'Reps'}
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={editExerciseReps}
                        onChange={(e) => setEditExerciseReps(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-surface-200/80 bg-surface-50/80 p-4 dark:border-surface-700/80 dark:bg-surface-900/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                    {locale === 'pt-BR' ? 'Carga e observacoes' : 'Weight and notes'}
                  </p>

                  <div className="mt-3 space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                        {locale === 'pt-BR' ? 'Carga alvo (opcional)' : 'Target weight (optional)'}
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={editExerciseTargetWeight}
                        onChange={(e) => setEditExerciseTargetWeight(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                        {locale === 'pt-BR' ? 'Observacao (opcional)' : 'Notes (optional)'}
                      </label>
                      <textarea
                        className="input-field min-h-[110px] resize-y"
                        value={editExerciseNotes}
                        onChange={(e) => setEditExerciseNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {editDayExerciseError && (
                  <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {editDayExerciseError}
                  </p>
                )}
              </div>

              <div
                className="border-t border-surface-200/80 p-4 dark:border-surface-700/70 sm:p-5"
                style={
                  mobileKeyboardInset > 0
                    ? {
                        paddingBottom: `${mobileKeyboardInset + 16}px`,
                      }
                    : undefined
                }
              >
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEditDayExerciseModal}
                    disabled={savingEditDayExercise}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={savingEditDayExercise} className="btn-primary w-full sm:w-auto">
                    {savingEditDayExercise
                      ? locale === 'pt-BR'
                        ? 'Salvando...'
                        : 'Saving...'
                      : locale === 'pt-BR'
                        ? 'Salvar'
                        : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWorkoutExecutionModal && workoutExecutionDay && (
        <div
          className={`fixed inset-0 z-[67] flex items-end justify-center bg-black/70 p-0 transition-opacity duration-200 sm:p-4 ${
            workoutExecutionModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.target === e.currentTarget && closeWorkoutExecutionModal()}
        >
          <div
            className={`flex h-[100dvh] w-full flex-col overflow-hidden border border-surface-200/80 bg-white shadow-xl transition-all duration-200 dark:border-surface-700/60 dark:bg-surface-900 sm:h-[90vh] sm:max-w-4xl sm:rounded-2xl ${
              workoutExecutionModalVisible
                ? 'translate-y-0 opacity-100 sm:scale-100'
                : 'translate-y-8 opacity-0 sm:translate-y-0 sm:scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-surface-200/80 bg-gradient-to-br from-brand-500/12 via-white to-surface-50 p-4 dark:border-surface-700/70 dark:from-brand-500/10 dark:via-surface-900 dark:to-surface-950 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">
                    {locale === 'pt-BR' ? 'Execucao do treino' : 'Workout execution'}
                  </p>
                  <h3 className="mt-1 break-words text-xl font-semibold tracking-tight text-surface-900 dark:text-surface-100 sm:text-2xl">
                    {workoutExecutionDay.name}
                  </h3>
                  <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    {workoutExecutionDateLabel}
                    {` • ${workoutExecutionExercises.length} ${
                      locale === 'pt-BR' ? 'exercicios' : 'exercises'
                    }`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => closeWorkoutExecutionModal()}
                  disabled={savingWorkoutSession}
                  className="rounded-full p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-surface-300"
                >
                  <Lucide.X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCompleteWorkoutSession}
              onFocusCapture={handleWorkoutExecutionModalFocus}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div
                ref={workoutExecutionModalBodyRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
              >
                <div className="rounded-2xl border border-surface-200/80 bg-surface-50/80 p-4 dark:border-surface-700/70 dark:bg-surface-900/70">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                    {locale === 'pt-BR' ? 'Observacoes do treino (opcional)' : 'Session notes (optional)'}
                  </label>
                  <textarea
                    className="input-field mt-2 min-h-[90px] resize-y"
                    value={workoutExecutionNotes}
                    onChange={(e) => setWorkoutExecutionNotes(e.target.value)}
                    placeholder={
                      locale === 'pt-BR'
                        ? 'Como foi o treino de hoje?'
                        : 'How did today\'s workout feel?'
                    }
                  />
                </div>

                <div className="space-y-3">
                  {workoutExecutionExercises.map((item, index) => (
                    <article
                      key={item.workoutDayExerciseId}
                      className="rounded-2xl border border-surface-200/90 bg-white p-4 shadow-sm dark:border-surface-700/70 dark:bg-surface-900/80 sm:p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 sm:text-base">
                            {index + 1}. {getExerciseDisplayName(item.exercise, locale)}
                          </p>
                          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                            {locale === 'pt-BR' ? 'Planejado' : 'Planned'}: {item.plannedSets} x {item.plannedReps}
                            {item.plannedTargetWeight ? ` • ${item.plannedTargetWeight} kg` : ''}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateWorkoutExecutionExercise(item.workoutDayExerciseId, {
                              completed: !item.completed,
                            })
                          }
                          className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition-all sm:w-auto ${
                            item.completed
                              ? 'border-emerald-500/60 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'border-surface-300 bg-surface-100 text-surface-600 hover:bg-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
                          }`}
                        >
                          <Lucide.CheckCircle2 className="mr-1.5 h-4 w-4" />
                          {item.completed
                            ? locale === 'pt-BR'
                              ? 'Concluido'
                              : 'Done'
                            : locale === 'pt-BR'
                              ? 'Marcar concluido'
                              : 'Mark done'}
                        </button>
                      </div>

                      <div className="mt-4 flex flex-col gap-3">
                        <div className="hidden px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400 sm:grid sm:grid-cols-[1fr_1fr_auto] sm:gap-3">
                          <div>{locale === 'pt-BR' ? 'Repetições' : 'Reps'}</div>
                          <div>{locale === 'pt-BR' ? 'Carga (kg)' : 'Weight (kg)'}</div>
                          <div className="w-11 text-center">Done</div>
                        </div>

                        {item.sets.map((set, setIndex) => (
                          <div
                            key={set.id}
                            className="flex flex-col gap-3 rounded-xl bg-surface-50/80 p-3.5 shadow-sm dark:bg-surface-800/40 sm:grid sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-3 sm:bg-transparent sm:p-0 sm:shadow-none"
                          >
                            <div className="flex items-center justify-between sm:hidden">
                              <span className="text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                                {locale === 'pt-BR' ? `Série ${set.setNumber}` : `Set ${set.setNumber}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newSets = [...item.sets]
                                  newSets[setIndex] = { ...set, completed: !set.completed }
                                  
                                  const allCompleted = newSets.every((s) => s.completed)
                                  updateWorkoutExecutionExercise(item.workoutDayExerciseId, { 
                                    sets: newSets,
                                    completed: allCompleted ? true : item.completed,
                                  })
                                }}
                                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                                  set.completed
                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm dark:border-emerald-600 dark:bg-emerald-600'
                                    : 'border-surface-300 bg-white text-surface-300 dark:border-surface-600 dark:bg-surface-900'
                                }`}
                              >
                                <Lucide.Check className={`h-5 w-5 transition-transform duration-200 ${set.completed ? 'scale-100' : 'scale-75 opacity-0'}`} />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:contents">
                              <div className="relative">
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-500 sm:hidden">
                                  {locale === 'pt-BR' ? 'Repetições' : 'Reps'}
                                </label>
                                <input
                                  type="text"
                                  className="input-field text-center font-medium"
                                  placeholder={item.plannedReps}
                                  value={set.actualReps}
                                  onChange={(e) => {
                                    const newSets = [...item.sets]
                                    newSets[setIndex] = { ...set, actualReps: e.target.value }
                                    updateWorkoutExecutionExercise(item.workoutDayExerciseId, { sets: newSets })
                                  }}
                                />
                              </div>

                              <div className="relative">
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-500 sm:hidden">
                                  {locale === 'pt-BR' ? 'Carga (kg)' : 'Weight'}
                                </label>
                                <input
                                  type="text"
                                  className="input-field text-center font-medium"
                                  placeholder={item.plannedTargetWeight || '-'}
                                  value={set.weight}
                                  onChange={(e) => {
                                    const newSets = [...item.sets]
                                    newSets[setIndex] = { ...set, weight: e.target.value }
                                    updateWorkoutExecutionExercise(item.workoutDayExerciseId, { sets: newSets })
                                  }}
                                />
                              </div>
                            </div>

                            <div className="hidden sm:flex sm:justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const newSets = [...item.sets]
                                  newSets[setIndex] = { ...set, completed: !set.completed }

                                  const allCompleted = newSets.every((s) => s.completed)
                                  updateWorkoutExecutionExercise(item.workoutDayExerciseId, {
                                    sets: newSets,
                                    completed: allCompleted ? true : item.completed,
                                  })
                                }}
                                className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-all ${
                                  set.completed
                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm dark:border-emerald-600 dark:bg-emerald-600'
                                    : 'border-surface-300 bg-surface-100 text-surface-400 hover:bg-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700'
                                }`}
                              >
                                <Lucide.Check className={`h-5 w-5 transition-transform duration-200 ${set.completed ? 'scale-100' : 'scale-75 opacity-0'}`} />
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const newSetNumber =
                              item.sets.length > 0 ? item.sets[item.sets.length - 1].setNumber + 1 : 1
                            const newSets = [
                              ...item.sets,
                              {
                                id: crypto.randomUUID(),
                                setNumber: newSetNumber,
                                actualReps: '',
                                weight: item.plannedTargetWeight ?? '',
                                completed: false,
                              },
                            ]
                            updateWorkoutExecutionExercise(item.workoutDayExerciseId, { sets: newSets })
                          }}
                          className="mt-2 flex w-full items-center justify-center rounded-lg border border-dashed border-surface-300 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800/50"
                        >
                          <Lucide.Plus className="mr-2 h-4 w-4" />
                          {locale === 'pt-BR' ? 'Adicionar série' : 'Add set'}
                        </button>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500 dark:text-surface-400">
                          {locale === 'pt-BR' ? 'Observacoes (opcional)' : 'Notes (optional)'}
                        </label>
                        <textarea
                          className="input-field min-h-[84px] resize-y"
                          value={item.notes}
                          onChange={(e) =>
                            updateWorkoutExecutionExercise(item.workoutDayExerciseId, {
                              notes: e.target.value,
                            })
                          }
                        />
                      </div>
                    </article>
                  ))}
                </div>

                {workoutExecutionError && (
                  <p className="rounded-lg border border-red-200/80 bg-red-50/80 p-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {workoutExecutionError}
                  </p>
                )}
              </div>

              <div
                className="border-t border-surface-200/80 p-4 dark:border-surface-700/70 sm:p-5"
                style={
                  mobileKeyboardInset > 0
                    ? {
                        paddingBottom: `${mobileKeyboardInset + 16}px`,
                      }
                    : undefined
                }
              >
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => closeWorkoutExecutionModal()}
                    disabled={savingWorkoutSession}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={savingWorkoutSession} className="btn-primary w-full sm:w-auto">
                    {savingWorkoutSession
                      ? locale === 'pt-BR'
                        ? 'Salvando treino...'
                        : 'Saving workout...'
                      : locale === 'pt-BR'
                        ? 'Concluir treino'
                        : 'Complete workout'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeletePlanModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeDeletePlanModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-surface-200/80 bg-white p-6 shadow-elevated dark:border-surface-700/60 dark:bg-surface-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Lucide.Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>

            <h3 className="text-center text-base font-semibold text-surface-900 dark:text-surface-100">
              {locale === 'pt-BR' ? 'Remover plano de treino?' : 'Remove workout plan?'}
            </h3>
            <p className="mt-2 text-center text-sm text-surface-500 dark:text-surface-400">
              {locale === 'pt-BR'
                ? 'Essa acao nao pode ser desfeita. Todos os treinos serao removidos.'
                : 'This action cannot be undone. All workouts will be removed.'}
            </p>

            {planActionError && (
              <p className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {planActionError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={closeDeletePlanModal} disabled={deletingPlan} className="btn-secondary flex-1">
                {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={deletingPlan}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingPlan
                  ? locale === 'pt-BR'
                    ? 'Removendo...'
                    : 'Removing...'
                  : locale === 'pt-BR'
                    ? 'Remover'
                    : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingDayId && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeDeleteDayModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-surface-200/80 bg-white p-6 shadow-elevated dark:border-surface-700/60 dark:bg-surface-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Lucide.Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>

            <h3 className="text-center text-base font-semibold text-surface-900 dark:text-surface-100">
              {locale === 'pt-BR' ? 'Remover treino?' : 'Remove workout?'}
            </h3>
            <p className="mt-2 text-center text-sm text-surface-500 dark:text-surface-400">
              {locale === 'pt-BR'
                ? 'Os exercicios associados serao removidos.'
                : 'Associated exercises will be removed.'}
            </p>

            {dayActionError && (
              <p className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {dayActionError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={closeDeleteDayModal} disabled={deletingDay} className="btn-secondary flex-1">
                {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteDay}
                disabled={deletingDay}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingDay
                  ? locale === 'pt-BR'
                    ? 'Removendo...'
                    : 'Removing...'
                  : locale === 'pt-BR'
                    ? 'Remover'
                    : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingDayExercise && (
        <div
          className="fixed inset-0 z-[66] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeDeleteDayExerciseModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-surface-200/80 bg-white p-6 shadow-elevated dark:border-surface-700/60 dark:bg-surface-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Lucide.Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>

            <h3 className="text-center text-base font-semibold text-surface-900 dark:text-surface-100">
              {locale === 'pt-BR' ? 'Remover exercicio?' : 'Remove exercise?'}
            </h3>
            <p className="mt-2 text-center text-sm text-surface-500 dark:text-surface-400">
              {locale === 'pt-BR'
                ? `Deseja remover ${deletingDayExercise.label} deste treino?`
                : `Do you want to remove ${deletingDayExercise.label} from this workout?`}
            </p>

            {deleteDayExerciseError && (
              <p className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {deleteDayExerciseError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeDeleteDayExerciseModal}
                disabled={deletingDayExerciseSubmitting}
                className="btn-secondary flex-1"
              >
                {locale === 'pt-BR' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteDayExercise}
                disabled={deletingDayExerciseSubmitting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingDayExerciseSubmitting
                  ? locale === 'pt-BR'
                    ? 'Removendo...'
                    : 'Removing...'
                  : locale === 'pt-BR'
                    ? 'Remover'
                    : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
