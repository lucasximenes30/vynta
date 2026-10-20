import { prisma } from '@/lib/prisma'
import { cache } from 'react'

interface UserRecord {
  id: string
  name: string
}

interface UserStatsRecord {
  id: string
  userId: string
  currentStreak: number
  longestStreak: number
  score: number
  lastWorkoutDate: Date | null
  createdAt: Date
  updatedAt: Date
  user?: UserRecord
}

interface UserStatsDelegate {
  findUnique(args: {
    where: Record<string, unknown>
    include?: Record<string, unknown>
  }): Promise<UserStatsRecord | null>
  findMany(args: {
    include?: Record<string, unknown>
    orderBy?: Array<Record<string, 'asc' | 'desc'>>
  }): Promise<UserStatsRecord[]>
  upsert(args: {
    where: Record<string, unknown>
    create: Record<string, unknown>
    update: Record<string, unknown>
  }): Promise<UserStatsRecord>
  update(args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
  }): Promise<UserStatsRecord>
}

function userStatsDelegate(client: unknown): UserStatsDelegate {
  return (client as { userStats: UserStatsDelegate }).userStats
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

export interface UserStatsDTO {
  id: string
  userId: string
  currentStreak: number
  longestStreak: number
  score: number
  lastWorkoutDate: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkoutRankingEntryDTO {
  position: number
  userId: string
  name: string
  score: number
  currentStreak: number
  longestStreak: number
  isCurrentUser: boolean
}

export interface WorkoutRankingDTO {
  ranking: WorkoutRankingEntryDTO[]
  currentUserPosition: number | null
}

export interface RegisterWorkoutCompletionInput {
  workoutDate?: Date
  completedAllExercises: boolean
}

export interface WorkoutCompletionStatsResult {
  applied: boolean
  pointsEarned: number
  stats: UserStatsDTO
}

function toDayStart(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function getDayDiff(from: Date, to: Date): number {
  const fromDay = toDayStart(from).getTime()
  const toDay = toDayStart(to).getTime()
  return Math.round((toDay - fromDay) / DAY_IN_MS)
}

function clampRankingLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 5
  if (limit < 1) return 1
  if (limit > 50) return 50
  return Math.floor(limit)
}

function toUserStatsDTO(item: UserStatsRecord): UserStatsDTO {
  return {
    id: item.id,
    userId: item.userId,
    currentStreak: item.currentStreak,
    longestStreak: item.longestStreak,
    score: item.score,
    lastWorkoutDate: item.lastWorkoutDate ? item.lastWorkoutDate.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

async function ensureUserStatsRecord(userId: string, client: unknown): Promise<UserStatsRecord> {
  const delegate = userStatsDelegate(client)
  try {
    return await delegate.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        score: 0,
        lastWorkoutDate: null,
      },
      update: {},
    })
  } catch (error: any) {
    // Tratamento para Race Condition: Se duas chamadas simultâneas tentarem criar
    // e der erro de restrição única (Unique constraint failed - P2002),
    // apenas retornamos o registro que acabou de ser criado pela outra chamada.
    if (error.code === 'P2002') {
      const existing = await delegate.findUnique({ where: { userId } })
      if (existing) return existing
    }
    throw error
  }
}

export const getUserStats = cache(async (userId: string): Promise<UserStatsDTO> => {
  const stats = await ensureUserStatsRecord(userId, prisma)
  return toUserStatsDTO(stats)
})

export async function registerWorkoutCompletion(
  userId: string,
  input: RegisterWorkoutCompletionInput,
  client?: unknown
): Promise<WorkoutCompletionStatsResult> {
  const dbClient = client ?? prisma
  const existing = await ensureUserStatsRecord(userId, dbClient)

  const workoutDate = toDayStart(input.workoutDate ?? new Date())

  if (existing.lastWorkoutDate) {
    const dayDiff = getDayDiff(existing.lastWorkoutDate, workoutDate)

    if (dayDiff <= 0) {
      return {
        applied: false,
        pointsEarned: 0,
        stats: toUserStatsDTO(existing),
      }
    }
  }

  let nextCurrentStreak = 1

  if (existing.lastWorkoutDate) {
    const dayDiff = getDayDiff(existing.lastWorkoutDate, workoutDate)

    if (dayDiff === 1) {
      nextCurrentStreak = existing.currentStreak + 1
    }
  }

  const nextLongestStreak = Math.max(existing.longestStreak, nextCurrentStreak)

  let pointsEarned = 10

  if (input.completedAllExercises) {
    pointsEarned += 5
  }

  if (existing.currentStreak < 7 && nextCurrentStreak >= 7) {
    pointsEarned += 20
  }

  const updated = await userStatsDelegate(dbClient).update({
    where: { id: existing.id },
    data: {
      currentStreak: nextCurrentStreak,
      longestStreak: nextLongestStreak,
      score: existing.score + pointsEarned,
      lastWorkoutDate: workoutDate,
    },
  })

  return {
    applied: true,
    pointsEarned,
    stats: toUserStatsDTO(updated),
  }
}

export const getWorkoutRanking = cache(async (input?: {
  limit?: number
  currentUserId?: string
}): Promise<WorkoutRankingDTO> => {
  const limit = clampRankingLimit(input?.limit)

  if (input?.currentUserId) {
    await ensureUserStatsRecord(input.currentUserId, prisma)
  }

  const rows = await userStatsDelegate(prisma).findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ score: 'desc' }, { updatedAt: 'asc' }],
  })

  const ranking = rows.map((item, index) => ({
    position: index + 1,
    userId: item.userId,
    name: item.user?.name ?? 'Usuario',
    score: item.score,
    currentStreak: item.currentStreak,
    longestStreak: item.longestStreak,
    isCurrentUser: Boolean(input?.currentUserId && item.userId === input.currentUserId),
  }))

  const currentUserPosition =
    input?.currentUserId
      ? ranking.find((entry) => entry.userId === input.currentUserId)?.position ?? null
      : null

  return {
    ranking: ranking.slice(0, limit),
    currentUserPosition,
  }
})
