import { prisma } from '@/lib/prisma'
import { cache } from 'react'

interface WorkoutPlanRecord {
  id: string
  userId: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface WorkoutPlanDelegate {
  findFirst(args: {
    where: { id?: string; userId?: string; isActive?: boolean }
    orderBy?: { createdAt: 'asc' | 'desc' }
  }): Promise<WorkoutPlanRecord | null>
  updateMany(args: {
    where: { userId: string; isActive: boolean }
    data: { isActive: boolean }
  }): Promise<{ count: number }>
  deleteMany(args: {
    where: { id: string; userId: string }
  }): Promise<{ count: number }>
  create(args: {
    data: { userId: string; name: string; isActive: boolean }
  }): Promise<WorkoutPlanRecord>
}

function workoutPlanDelegate(client: unknown): WorkoutPlanDelegate {
  return (client as { workoutPlan: WorkoutPlanDelegate }).workoutPlan
}

export interface WorkoutPlanDTO {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function toWorkoutPlanDTO(plan: WorkoutPlanRecord): WorkoutPlanDTO {
  return {
    id: plan.id,
    name: plan.name,
    isActive: plan.isActive,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  }
}

export const getActiveWorkoutPlanByUser = cache(async (userId: string): Promise<WorkoutPlanDTO | null> => {
  const plan = await workoutPlanDelegate(prisma).findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  return plan ? toWorkoutPlanDTO(plan) : null
})

export async function createWorkoutPlan(userId: string, name: string): Promise<WorkoutPlanDTO> {
  const normalizedName = name.trim()

  if (!normalizedName) {
    throw new Error('Nome do plano é obrigatório')
  }

  const plan = await prisma.$transaction(async (tx) => {
    const delegate = workoutPlanDelegate(tx)

    await delegate.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })

    return delegate.create({
      data: {
        userId,
        name: normalizedName,
        isActive: true,
      },
    })
  })

  return toWorkoutPlanDTO(plan)
}

export async function deleteWorkoutPlan(id: string, userId: string): Promise<void> {
  const delegate = workoutPlanDelegate(prisma)

  const existing = await delegate.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new Error('Plano não encontrado')
  }

  await delegate.deleteMany({
    where: { id, userId },
  })
}
