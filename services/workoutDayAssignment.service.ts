import { prisma } from '@/lib/prisma'
import { cache } from 'react'

interface WorkoutPlanOwnershipRecord {
  id: string
}

interface WorkoutPlanDelegate {
  findFirst(args: {
    where: Record<string, unknown>
    select?: Record<string, unknown>
  }): Promise<WorkoutPlanOwnershipRecord | null>
}

interface WorkoutDayOwnershipRecord {
  id: string
  planId: string
}

interface WorkoutDayDelegate {
  findFirst(args: {
    where: Record<string, unknown>
    select?: Record<string, unknown>
  }): Promise<WorkoutDayOwnershipRecord | null>
}

interface WorkoutDayAssignmentRecord {
  id: string
  userId: string
  planId: string
  workoutDayId: string
  date: string
  createdAt: Date
}

interface WorkoutDayAssignmentDelegate {
  findFirst(args: {
    where: Record<string, unknown>
  }): Promise<WorkoutDayAssignmentRecord | null>
  upsert(args: {
    where: Record<string, unknown>
    create: Record<string, unknown>
    update: Record<string, unknown>
  }): Promise<WorkoutDayAssignmentRecord>
}

function workoutPlanDelegate(client: unknown): WorkoutPlanDelegate {
  return (client as { workoutPlan: WorkoutPlanDelegate }).workoutPlan
}

function workoutDayDelegate(client: unknown): WorkoutDayDelegate {
  return (client as { workoutDay: WorkoutDayDelegate }).workoutDay
}

function workoutDayAssignmentDelegate(client: unknown): WorkoutDayAssignmentDelegate {
  return (client as { workoutDayAssignment: WorkoutDayAssignmentDelegate }).workoutDayAssignment
}

export interface WorkoutDayAssignmentDTO {
  id: string
  userId: string
  planId: string
  workoutDayId: string
  date: string
  createdAt: string
}

export interface UpsertWorkoutDayAssignmentInput {
  planId: string
  workoutDayId: string
  date: string
}

function toWorkoutDayAssignmentDTO(item: WorkoutDayAssignmentRecord): WorkoutDayAssignmentDTO {
  return {
    id: item.id,
    userId: item.userId,
    planId: item.planId,
    workoutDayId: item.workoutDayId,
    date: item.date,
    createdAt: item.createdAt.toISOString(),
  }
}

function normalizeDateKey(value: string): string {
  const normalized = value.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('Data invalida')
  }

  const [year, month, day] = normalized.split('-').map((part) => Number(part))
  const parsed = new Date(Date.UTC(year, month - 1, day))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('Data invalida')
  }

  return normalized
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

async function ensureWorkoutDayOwnership(
  userId: string,
  planId: string,
  workoutDayId: string
): Promise<void> {
  const day = await workoutDayDelegate(prisma).findFirst({
    where: {
      id: workoutDayId,
      planId,
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
}

export const getWorkoutDayAssignmentByDate = cache(async (
  userId: string,
  input: { planId: string; date: string }
): Promise<WorkoutDayAssignmentDTO | null> => {
  const date = normalizeDateKey(input.date)
  await ensurePlanOwnership(userId, input.planId)

  const assignment = await workoutDayAssignmentDelegate(prisma).findFirst({
    where: {
      userId,
      planId: input.planId,
      date,
    },
  })

  return assignment ? toWorkoutDayAssignmentDTO(assignment) : null
})

export async function upsertWorkoutDayAssignment(
  userId: string,
  input: UpsertWorkoutDayAssignmentInput
): Promise<WorkoutDayAssignmentDTO> {
  const date = normalizeDateKey(input.date)
  await ensureWorkoutDayOwnership(userId, input.planId, input.workoutDayId)

  const assignment = await workoutDayAssignmentDelegate(prisma).upsert({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    create: {
      userId,
      planId: input.planId,
      workoutDayId: input.workoutDayId,
      date,
    },
    update: {
      planId: input.planId,
      workoutDayId: input.workoutDayId,
    },
  })

  return toWorkoutDayAssignmentDTO(assignment)
}
