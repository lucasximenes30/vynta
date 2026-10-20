import { prisma } from '@/lib/prisma'
import { cache } from 'react'

interface WorkoutDayRecord {
  id: string
  planId: string
  name: string
  order: number
  weekDay: number | null
  createdAt: Date
  updatedAt: Date
}

interface WorkoutDayDelegate {
  findMany(args: {
    where: Record<string, unknown>
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>
  }): Promise<WorkoutDayRecord[]>
  findFirst(args: {
    where: Record<string, unknown>
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>
  }): Promise<WorkoutDayRecord | null>
  create(args: {
    data: Record<string, unknown>
  }): Promise<WorkoutDayRecord>
  update(args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
  }): Promise<WorkoutDayRecord>
  delete(args: {
    where: Record<string, unknown>
  }): Promise<WorkoutDayRecord>
}

interface WorkoutPlanOwnershipRecord {
  id: string
}

interface WorkoutPlanDelegate {
  findFirst(args: {
    where: Record<string, unknown>
    select?: Record<string, boolean>
  }): Promise<WorkoutPlanOwnershipRecord | null>
}

function workoutDayDelegate(client: unknown): WorkoutDayDelegate {
  return (client as { workoutDay: WorkoutDayDelegate }).workoutDay
}

function workoutPlanDelegate(client: unknown): WorkoutPlanDelegate {
  return (client as { workoutPlan: WorkoutPlanDelegate }).workoutPlan
}

export interface WorkoutDayDTO {
  id: string
  planId: string
  name: string
  order: number
  weekDay: number | null
  createdAt: string
  updatedAt: string
}

function toWorkoutDayDTO(day: WorkoutDayRecord): WorkoutDayDTO {
  return {
    id: day.id,
    planId: day.planId,
    name: day.name,
    order: day.order,
    weekDay: day.weekDay,
    createdAt: day.createdAt.toISOString(),
    updatedAt: day.updatedAt.toISOString(),
  }
}

async function ensurePlanOwnership(userId: string, planId: string): Promise<void> {
  const plan = await workoutPlanDelegate(prisma).findFirst({
    where: { id: planId, userId },
    select: { id: true },
  })

  if (!plan) {
    throw new Error('Plano não encontrado')
  }
}

function normalizeDayName(name: string): string {
  const normalized = name.trim()
  if (!normalized) {
    throw new Error('Nome do treino é obrigatório')
  }

  if (normalized.length > 80) {
    throw new Error('Nome do treino muito longo')
  }

  return normalized
}

function normalizeWeekDay(weekDay: number | null | undefined): number | null {
  if (weekDay === null || weekDay === undefined) {
    return null
  }

  if (!Number.isInteger(weekDay) || weekDay < 0 || weekDay > 6) {
    throw new Error('Dia da semana inválido')
  }

  return weekDay
}

export const getWorkoutDaysByPlan = cache(async (userId: string, planId: string): Promise<WorkoutDayDTO[]> => {
  await ensurePlanOwnership(userId, planId)

  const days = await workoutDayDelegate(prisma).findMany({
    where: { planId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return days.map(toWorkoutDayDTO)
})

export async function createWorkoutDay(
  userId: string,
  input: { planId: string; name: string; weekDay?: number | null }
): Promise<WorkoutDayDTO> {
  const name = normalizeDayName(input.name)
  const weekDay = normalizeWeekDay(input.weekDay)

  await ensurePlanOwnership(userId, input.planId)

  const maxOrderDay = await workoutDayDelegate(prisma).findFirst({
    where: { planId: input.planId },
    orderBy: { order: 'desc' },
  })

  const nextOrder = (maxOrderDay?.order ?? -1) + 1

  const day = await workoutDayDelegate(prisma).create({
    data: {
      planId: input.planId,
      name,
      order: nextOrder,
      weekDay,
    },
  })

  return toWorkoutDayDTO(day)
}

export async function updateWorkoutDay(
  userId: string,
  dayId: string,
  input: { name: string; weekDay?: number | null }
): Promise<WorkoutDayDTO> {
  const name = normalizeDayName(input.name)
  const weekDay = normalizeWeekDay(input.weekDay)

  const existing = await workoutDayDelegate(prisma).findFirst({
    where: { id: dayId },
  })

  if (!existing) {
    throw new Error('Treino não encontrado')
  }

  await ensurePlanOwnership(userId, existing.planId)

  const updated = await workoutDayDelegate(prisma).update({
    where: { id: dayId },
    data: { name, weekDay },
  })

  return toWorkoutDayDTO(updated)
}

export async function deleteWorkoutDay(userId: string, dayId: string): Promise<void> {
  const existing = await workoutDayDelegate(prisma).findFirst({
    where: { id: dayId },
  })

  if (!existing) {
    throw new Error('Treino não encontrado')
  }

  await ensurePlanOwnership(userId, existing.planId)

  await workoutDayDelegate(prisma).delete({
    where: { id: dayId },
  })
}

export async function reorderWorkoutDay(
  userId: string,
  dayId: string,
  direction: 'up' | 'down'
): Promise<WorkoutDayDTO[]> {
  const currentDay = await workoutDayDelegate(prisma).findFirst({
    where: { id: dayId },
  })

  if (!currentDay) {
    throw new Error('Treino não encontrado')
  }

  await ensurePlanOwnership(userId, currentDay.planId)

  const adjacentDay = await workoutDayDelegate(prisma).findFirst({
    where: {
      planId: currentDay.planId,
      order: direction === 'up' ? { lt: currentDay.order } : { gt: currentDay.order },
    },
    orderBy: { order: direction === 'up' ? 'desc' : 'asc' },
  })

  if (!adjacentDay) {
    return getWorkoutDaysByPlan(userId, currentDay.planId)
  }

  await prisma.$transaction(async (tx) => {
    const dayTx = workoutDayDelegate(tx)

    await dayTx.update({
      where: { id: currentDay.id },
      data: { order: adjacentDay.order },
    })

    await dayTx.update({
      where: { id: adjacentDay.id },
      data: { order: currentDay.order },
    })
  })

  return getWorkoutDaysByPlan(userId, currentDay.planId)
}
