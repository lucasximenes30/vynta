import { prisma } from '@/lib/prisma'
import { registerWorkoutCompletion } from '@/services/userStats.service'
import { cache } from 'react'

interface WorkoutDayRecord {
  id: string
}

interface WorkoutDayDelegate {
  findFirst(args: {
    where: Record<string, unknown>
    select?: Record<string, unknown>
  }): Promise<WorkoutDayRecord | null>
}

interface WorkoutDayExerciseRecord {
  exerciseId: string
}

interface WorkoutDayExerciseDelegate {
  findMany(args: {
    where: Record<string, unknown>
    select?: Record<string, unknown>
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>
  }): Promise<WorkoutDayExerciseRecord[]>
}

interface WorkoutExerciseLogRecord {
  id: string
  workoutLogId: string
  exerciseId: string
  done: boolean
  createdAt: Date
  updatedAt: Date
}

interface WorkoutLogRecord {
  id: string
  userId: string
  workoutId: string
  date: Date
  completed: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
  exerciseLogs?: WorkoutExerciseLogRecord[]
}

interface WorkoutLogDelegate {
  findFirst(args: {
    where: Record<string, unknown>
    include?: Record<string, unknown>
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>
  }): Promise<WorkoutLogRecord | null>
  create(args: {
    data: Record<string, unknown>
    include?: Record<string, unknown>
  }): Promise<WorkoutLogRecord>
  update(args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
    include?: Record<string, unknown>
  }): Promise<WorkoutLogRecord>
}

interface WorkoutExerciseLogDelegate {
  deleteMany(args: {
    where: Record<string, unknown>
  }): Promise<{ count: number }>
  createMany(args: {
    data: Array<Record<string, unknown>>
  }): Promise<{ count: number }>
}

function workoutDayDelegate(client: unknown): WorkoutDayDelegate {
  return (client as { workoutDay: WorkoutDayDelegate }).workoutDay
}

function workoutDayExerciseDelegate(client: unknown): WorkoutDayExerciseDelegate {
  return (client as { workoutDayExercise: WorkoutDayExerciseDelegate }).workoutDayExercise
}

function workoutLogDelegate(client: unknown): WorkoutLogDelegate {
  return (client as { workoutLog: WorkoutLogDelegate }).workoutLog
}

function workoutExerciseLogDelegate(client: unknown): WorkoutExerciseLogDelegate {
  return (client as { workoutExerciseLog: WorkoutExerciseLogDelegate }).workoutExerciseLog
}

export interface WorkoutExerciseLogDTO {
  id: string
  workoutLogId: string
  exerciseId: string
  done: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkoutLogDTO {
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

export interface WorkoutExerciseLogInput {
  exerciseId: string
  done?: boolean
}

export interface UpsertTodayWorkoutLogInput {
  workoutId: string
  completed?: boolean
  notes?: string | null
  exercises?: WorkoutExerciseLogInput[]
}

export interface UpdateWorkoutLogInput {
  completed?: boolean
  notes?: string | null
  exercises?: WorkoutExerciseLogInput[]
}

function getTodayBounds(baseDate = new Date()): { start: Date; end: Date } {
  const start = new Date(baseDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

function normalizeOptionalNotes(notes?: string | null): string | null | undefined {
  if (notes === undefined) return undefined
  if (notes === null) return null

  const normalized = notes.trim()

  if (!normalized) return null
  if (normalized.length > 1000) {
    throw new Error('Observacao muito longa')
  }

  return normalized
}

function normalizeExercisePayload(
  items: WorkoutExerciseLogInput[] | undefined
): Array<{ exerciseId: string; done: boolean }> | undefined {
  if (!items) return undefined

  const unique = new Map<string, boolean>()

  for (const item of items) {
    const exerciseId = item.exerciseId?.trim()

    if (!exerciseId) {
      throw new Error('Exercicio invalido no log')
    }

    unique.set(exerciseId, Boolean(item.done))
  }

  return Array.from(unique.entries()).map(([exerciseId, done]) => ({
    exerciseId,
    done,
  }))
}

function toWorkoutExerciseLogDTO(item: WorkoutExerciseLogRecord): WorkoutExerciseLogDTO {
  return {
    id: item.id,
    workoutLogId: item.workoutLogId,
    exerciseId: item.exerciseId,
    done: item.done,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

function toWorkoutLogDTO(item: WorkoutLogRecord): WorkoutLogDTO {
  const exerciseLogs = item.exerciseLogs ?? []

  return {
    id: item.id,
    userId: item.userId,
    workoutId: item.workoutId,
    date: item.date.toISOString(),
    completed: item.completed,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    exerciseLogs: exerciseLogs
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toWorkoutExerciseLogDTO),
  }
}

async function ensureWorkoutOwnership(userId: string, workoutId: string): Promise<void> {
  const workout = await workoutDayDelegate(prisma).findFirst({
    where: {
      id: workoutId,
      plan: { userId },
    },
    select: { id: true },
  })

  if (!workout) {
    throw new Error('Treino nao encontrado')
  }
}

async function getAllowedWorkoutExerciseIds(workoutId: string): Promise<Set<string>> {
  const rows = await workoutDayExerciseDelegate(prisma).findMany({
    where: { workoutDayId: workoutId },
    select: { exerciseId: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return new Set(rows.map((row) => row.exerciseId))
}

function ensureExercisesBelongToWorkout(
  normalizedExercises: Array<{ exerciseId: string; done: boolean }> | undefined,
  allowedExerciseIds: Set<string>
): void {
  if (!normalizedExercises) return

  for (const item of normalizedExercises) {
    if (!allowedExerciseIds.has(item.exerciseId)) {
      throw new Error('Exercicio invalido para este treino')
    }
  }
}

function didCompleteAllAllowedExercises(
  allowedExerciseIds: Set<string>,
  exercises: Array<{ exerciseId: string; done: boolean }>
): boolean {
  if (allowedExerciseIds.size === 0) return false

  const doneByExerciseId = new Map<string, boolean>()

  for (const item of exercises) {
    doneByExerciseId.set(item.exerciseId, item.done)
  }

  for (const exerciseId of allowedExerciseIds) {
    if (!doneByExerciseId.get(exerciseId)) {
      return false
    }
  }

  return true
}

async function loadWorkoutLogById(userId: string, id: string): Promise<WorkoutLogRecord | null> {
  return workoutLogDelegate(prisma).findFirst({
    where: {
      id,
      userId,
    },
    include: {
      exerciseLogs: true,
    },
  })
}

async function persistExerciseLogs(
  tx: unknown,
  workoutLogId: string,
  exercises: Array<{ exerciseId: string; done: boolean }>
): Promise<void> {
  await workoutExerciseLogDelegate(tx).deleteMany({
    where: { workoutLogId },
  })

  if (exercises.length === 0) return

  await workoutExerciseLogDelegate(tx).createMany({
    data: exercises.map((item) => ({
      workoutLogId,
      exerciseId: item.exerciseId,
      done: item.done,
    })),
  })
}

export const getTodayWorkoutLog = cache(async (
  userId: string,
  input?: { workoutId?: string }
): Promise<WorkoutLogDTO | null> => {
  if (input?.workoutId) {
    await ensureWorkoutOwnership(userId, input.workoutId)
  }

  const { start, end } = getTodayBounds()

  const log = await workoutLogDelegate(prisma).findFirst({
    where: {
      userId,
      ...(input?.workoutId ? { workoutId: input.workoutId } : {}),
      date: {
        gte: start,
        lt: end,
      },
    },
    include: {
      exerciseLogs: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  return log ? toWorkoutLogDTO(log) : null
})

export async function upsertTodayWorkoutLog(
  userId: string,
  input: UpsertTodayWorkoutLogInput
): Promise<WorkoutLogDTO> {
  await ensureWorkoutOwnership(userId, input.workoutId)

  const { start } = getTodayBounds()
  const notes = normalizeOptionalNotes(input.notes)
  const normalizedExercises = normalizeExercisePayload(input.exercises)
  const allowedExerciseIds = await getAllowedWorkoutExerciseIds(input.workoutId)

  ensureExercisesBelongToWorkout(normalizedExercises, allowedExerciseIds)

  const existing = await workoutLogDelegate(prisma).findFirst({
    where: {
      userId,
      workoutId: input.workoutId,
      date: start,
    },
    include: {
      exerciseLogs: true,
    },
  })

  const exercisesToPersist =
    normalizedExercises ??
    Array.from(allowedExerciseIds).map((exerciseId) => ({
      exerciseId,
      done: false,
    }))

  const logId = await prisma.$transaction(async (tx) => {
    if (!existing) {
      const created = await workoutLogDelegate(tx).create({
        data: {
          userId,
          workoutId: input.workoutId,
          date: start,
          completed: input.completed ?? false,
          notes: notes ?? null,
        },
      })

      await persistExerciseLogs(tx, created.id, exercisesToPersist)

      if (Boolean(input.completed)) {
        await registerWorkoutCompletion(
          userId,
          {
            workoutDate: start,
            completedAllExercises: didCompleteAllAllowedExercises(allowedExerciseIds, exercisesToPersist),
          },
          tx
        )
      }

      return created.id
    }

    const updateData: Record<string, unknown> = {}

    if (input.completed !== undefined) {
      updateData.completed = Boolean(input.completed)
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (Object.keys(updateData).length > 0) {
      await workoutLogDelegate(tx).update({
        where: { id: existing.id },
        data: updateData,
      })
    }

    if (normalizedExercises !== undefined) {
      await persistExerciseLogs(tx, existing.id, exercisesToPersist)
    }

    const finalCompleted = input.completed !== undefined ? Boolean(input.completed) : existing.completed

    if (finalCompleted) {
      const effectiveExercises =
        normalizedExercises ??
        (existing.exerciseLogs ?? []).map((item) => ({
          exerciseId: item.exerciseId,
          done: item.done,
        }))

      await registerWorkoutCompletion(
        userId,
        {
          workoutDate: start,
          completedAllExercises: didCompleteAllAllowedExercises(allowedExerciseIds, effectiveExercises),
        },
        tx
      )
    }

    return existing.id
  })

  const saved = await loadWorkoutLogById(userId, logId)

  if (!saved) {
    throw new Error('Nao foi possivel salvar o log do treino')
  }

  return toWorkoutLogDTO(saved)
}

export async function updateWorkoutLog(
  userId: string,
  id: string,
  input: UpdateWorkoutLogInput
): Promise<WorkoutLogDTO> {
  const existing = await loadWorkoutLogById(userId, id)

  if (!existing) {
    throw new Error('Log de treino nao encontrado')
  }

  const notes = normalizeOptionalNotes(input.notes)
  const normalizedExercises = normalizeExercisePayload(input.exercises)

  const allowedExerciseIds = await getAllowedWorkoutExerciseIds(existing.workoutId)
  ensureExercisesBelongToWorkout(normalizedExercises, allowedExerciseIds)

  await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {}

    if (input.completed !== undefined) {
      updateData.completed = Boolean(input.completed)
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (Object.keys(updateData).length > 0) {
      await workoutLogDelegate(tx).update({
        where: { id: existing.id },
        data: updateData,
      })
    }

    if (normalizedExercises !== undefined) {
      await persistExerciseLogs(tx, existing.id, normalizedExercises)
    }

    const finalCompleted = input.completed !== undefined ? Boolean(input.completed) : existing.completed

    if (finalCompleted) {
      const effectiveExercises =
        normalizedExercises ??
        (existing.exerciseLogs ?? []).map((item) => ({
          exerciseId: item.exerciseId,
          done: item.done,
        }))

      await registerWorkoutCompletion(
        userId,
        {
          workoutDate: existing.date,
          completedAllExercises: didCompleteAllAllowedExercises(allowedExerciseIds, effectiveExercises),
        },
        tx
      )
    }
  })

  const updated = await loadWorkoutLogById(userId, id)

  if (!updated) {
    throw new Error('Nao foi possivel atualizar o log de treino')
  }

  return toWorkoutLogDTO(updated)
}
