import { prisma } from '@/lib/prisma'
import { cache } from 'react'
import { ensureExerciseAccess, type ExerciseDTO } from '@/services/exercise.service'

interface WorkoutPlanRecord {
  id: string
}

interface WorkoutPlanDelegate {
  findFirst(args: {
    where: Record<string, unknown>
    select?: Record<string, unknown>
  }): Promise<WorkoutPlanRecord | null>
}

interface WorkoutDayRecord {
  id: string
  planId: string
}

interface WorkoutDayDelegate {
  findFirst(args: {
    where: Record<string, unknown>
    select?: Record<string, unknown>
  }): Promise<WorkoutDayRecord | null>
}

interface WorkoutDayExerciseRecord {
  id: string
  workoutDayId: string
  exerciseId: string
  order: number
  sets: number
  reps: string
  targetWeight: unknown
  notes: string | null
  createdAt: Date
  updatedAt: Date
  exercise: {
    id: string
    externalId: string | null
    source: string
    namePt: string
    nameEn: string
    muscleGroup: string
    equipment: string | null
    imageUrl: string | null
    isSystem: boolean
    userId: string | null
    createdAt: Date
    updatedAt: Date
  }
}

interface WorkoutDayExerciseDelegate {
  findMany(args: {
    where: Record<string, unknown>
    include?: Record<string, unknown>
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>
  }): Promise<WorkoutDayExerciseRecord[]>
  findFirst(args: {
    where: Record<string, unknown>
    include?: Record<string, unknown>
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>
  }): Promise<WorkoutDayExerciseRecord | null>
  create(args: {
    data: Record<string, unknown>
    include?: Record<string, unknown>
  }): Promise<WorkoutDayExerciseRecord>
  update(args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
    include?: Record<string, unknown>
  }): Promise<WorkoutDayExerciseRecord>
  delete(args: {
    where: Record<string, unknown>
  }): Promise<WorkoutDayExerciseRecord>
}

function workoutPlanDelegate(client: unknown): WorkoutPlanDelegate {
  return (client as { workoutPlan: WorkoutPlanDelegate }).workoutPlan
}

function workoutDayDelegate(client: unknown): WorkoutDayDelegate {
  return (client as { workoutDay: WorkoutDayDelegate }).workoutDay
}

function workoutDayExerciseDelegate(client: unknown): WorkoutDayExerciseDelegate {
  return (client as { workoutDayExercise: WorkoutDayExerciseDelegate }).workoutDayExercise
}

export interface WorkoutDayExerciseDTO {
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

function decimalToString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object' && value && 'toString' in value) {
    return String(value)
  }
  return null
}

function toWorkoutDayExerciseDTO(item: WorkoutDayExerciseRecord): WorkoutDayExerciseDTO {
  return {
    id: item.id,
    workoutDayId: item.workoutDayId,
    exerciseId: item.exerciseId,
    order: item.order,
    sets: item.sets,
    reps: item.reps,
    targetWeight: decimalToString(item.targetWeight),
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    exercise: {
      id: item.exercise.id,
      externalId: item.exercise.externalId,
      source: item.exercise.source,
      namePt: item.exercise.namePt,
      nameEn: item.exercise.nameEn,
      muscleGroup: item.exercise.muscleGroup as ExerciseDTO['muscleGroup'],
      equipment: item.exercise.equipment,
      imageUrl: item.exercise.imageUrl,
      isSystem: item.exercise.isSystem,
      userId: item.exercise.userId,
      createdAt: item.exercise.createdAt.toISOString(),
      updatedAt: item.exercise.updatedAt.toISOString(),
    },
  }
}

async function ensurePlanOwnership(userId: string, planId: string): Promise<void> {
  const plan = await workoutPlanDelegate(prisma).findFirst({
    where: { id: planId, userId },
    select: { id: true },
  })

  if (!plan) {
    throw new Error('Plano nao encontrado')
  }
}

async function ensureWorkoutDayOwnership(userId: string, workoutDayId: string): Promise<WorkoutDayRecord> {
  const day = await workoutDayDelegate(prisma).findFirst({
    where: {
      id: workoutDayId,
      plan: { userId },
    },
    select: {
      id: true,
      planId: true,
    },
  })

  if (!day) {
    throw new Error('Treino nao encontrado')
  }

  return day
}

function normalizeSets(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new Error('Series invalidas')
  }
  return value
}

function normalizeReps(value: string): string {
  const normalized = value.trim()

  if (!normalized) {
    throw new Error('Repeticoes sao obrigatorias')
  }

  if (normalized.length > 30) {
    throw new Error('Repeticoes muito longas')
  }

  return normalized
}

function normalizeTargetWeight(value?: number | null): number | null {
  if (value === null || value === undefined) return null

  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Carga alvo invalida')
  }

  return Math.round(value * 100) / 100
}

function normalizeNotes(value?: string): string | null {
  if (!value) return null

  const normalized = value.trim()
  if (!normalized) return null

  if (normalized.length > 400) {
    throw new Error('Observacao muito longa')
  }

  return normalized
}

export const getWorkoutDayExercises = cache(async (userId: string, workoutDayId: string): Promise<WorkoutDayExerciseDTO[]> => {
  await ensureWorkoutDayOwnership(userId, workoutDayId)

  const items = await workoutDayExerciseDelegate(prisma).findMany({
    where: { workoutDayId },
    include: { exercise: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return items.map(toWorkoutDayExerciseDTO)
})

export const getWorkoutDayExercisesByPlan = cache(async (
  userId: string,
  planId: string
): Promise<WorkoutDayExerciseDTO[]> => {
  await ensurePlanOwnership(userId, planId)

  const items = await workoutDayExerciseDelegate(prisma).findMany({
    where: {
      workoutDay: { planId },
    },
    include: { exercise: true },
    orderBy: [{ workoutDayId: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  })

  return items.map(toWorkoutDayExerciseDTO)
})

export async function addExerciseToWorkoutDay(
  userId: string,
  input: {
    workoutDayId: string
    exerciseId: string
    sets: number
    reps: string
    targetWeight?: number | null
    notes?: string
  }
): Promise<WorkoutDayExerciseDTO> {
  const day = await ensureWorkoutDayOwnership(userId, input.workoutDayId)
  await ensureExerciseAccess(userId, input.exerciseId)

  const sets = normalizeSets(input.sets)
  const reps = normalizeReps(input.reps)
  const targetWeight = normalizeTargetWeight(input.targetWeight)
  const notes = normalizeNotes(input.notes)

  const lastItem = await workoutDayExerciseDelegate(prisma).findFirst({
    where: { workoutDayId: day.id },
    orderBy: { order: 'desc' },
  })

  const nextOrder = (lastItem?.order ?? -1) + 1

  const created = await workoutDayExerciseDelegate(prisma).create({
    data: {
      workoutDayId: day.id,
      exerciseId: input.exerciseId,
      order: nextOrder,
      sets,
      reps,
      targetWeight,
      notes,
    },
    include: { exercise: true },
  })

  return toWorkoutDayExerciseDTO(created)
}

export async function updateWorkoutDayExercise(
  userId: string,
  id: string,
  input: {
    sets: number
    reps: string
    targetWeight?: number | null
    notes?: string
  }
): Promise<WorkoutDayExerciseDTO> {
  const existing = await workoutDayExerciseDelegate(prisma).findFirst({
    where: {
      id,
      workoutDay: { plan: { userId } },
    },
    include: { exercise: true },
  })

  if (!existing) {
    throw new Error('Exercicio do treino nao encontrado')
  }

  const updated = await workoutDayExerciseDelegate(prisma).update({
    where: { id },
    data: {
      sets: normalizeSets(input.sets),
      reps: normalizeReps(input.reps),
      targetWeight: normalizeTargetWeight(input.targetWeight),
      notes: normalizeNotes(input.notes),
    },
    include: { exercise: true },
  })

  return toWorkoutDayExerciseDTO(updated)
}

export async function deleteWorkoutDayExercise(userId: string, id: string): Promise<void> {
  const existing = await workoutDayExerciseDelegate(prisma).findFirst({
    where: {
      id,
      workoutDay: { plan: { userId } },
    },
  })

  if (!existing) {
    throw new Error('Exercicio do treino nao encontrado')
  }

  await workoutDayExerciseDelegate(prisma).delete({
    where: { id },
  })
}

export async function reorderWorkoutDayExercise(
  userId: string,
  id: string,
  direction: 'up' | 'down'
): Promise<WorkoutDayExerciseDTO[]> {
  const current = await workoutDayExerciseDelegate(prisma).findFirst({
    where: {
      id,
      workoutDay: { plan: { userId } },
    },
    include: { exercise: true },
  })

  if (!current) {
    throw new Error('Exercicio do treino nao encontrado')
  }

  const adjacent = await workoutDayExerciseDelegate(prisma).findFirst({
    where: {
      workoutDayId: current.workoutDayId,
      order: direction === 'up' ? { lt: current.order } : { gt: current.order },
    },
    include: { exercise: true },
    orderBy: { order: direction === 'up' ? 'desc' : 'asc' },
  })

  if (!adjacent) {
    return getWorkoutDayExercises(userId, current.workoutDayId)
  }

  await prisma.$transaction(async (tx) => {
    const delegate = workoutDayExerciseDelegate(tx)

    await delegate.update({
      where: { id: current.id },
      data: { order: adjacent.order },
    })

    await delegate.update({
      where: { id: adjacent.id },
      data: { order: current.order },
    })
  })

  return getWorkoutDayExercises(userId, current.workoutDayId)
}
