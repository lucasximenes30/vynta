import { prisma } from '@/lib/prisma'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

export interface HabitDTO {
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

export interface CheckinDTO {
  habitId: string
  date: string
  completed: boolean
}

/** Calculate current and best streak using a robust 365 day walk */
function calculateStreaks(checkins: { date: string; completed: boolean }[]): { currentStreak: number, bestStreak: number } {
  const completedDates = new Set(
    checkins.filter((c) => c.completed).map((c) => c.date)
  )

  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0
  
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Calculate Best Streak by sorting unique completed dates
  const sortedDates = Array.from(completedDates).sort()
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const prevDate = new Date(`${sortedDates[i - 1]}T12:00:00`)
      const currDate = new Date(`${sortedDates[i]}T12:00:00`)
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    }
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak
    }
  }

  // Calculate Current Streak going backwards from today
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    if (completedDates.has(dateStr)) {
      currentStreak++
    } else {
      // Allow today to be missed without breaking the streak if we evaluate earlier
      if (i === 0) continue
      break
    }
  }

  return { currentStreak, bestStreak }
}

export const getHabitsByUser = cache(async (userId: string): Promise<HabitDTO[]> => {
  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
    include: {
      checkins: {
        orderBy: { date: 'desc' },
        take: 365,
      },
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return habits.map((h) => ({
    id: h.id,
    title: h.title,
    description: h.description ?? undefined,
    icon: h.icon,
    color: h.color,
    order: h.order,
    ...calculateStreaks(h.checkins),
    createdAt: h.createdAt.toISOString(),
  }))
})

export async function createHabit(
  userId: string,
  input: { title: string; description?: string; icon: string; color: string }
): Promise<HabitDTO> {
  const maxOrderHabit = await prisma.habit.findFirst({
    where: { userId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })
  const nextOrder = (maxOrderHabit?.order ?? -1) + 1

  const habit = await prisma.habit.create({
    data: { userId, order: nextOrder, ...input },
  })
  return {
    id: habit.id,
    title: habit.title,
    description: habit.description ?? undefined,
    icon: habit.icon,
    color: habit.color,
    order: habit.order,
    currentStreak: 0,
    bestStreak: 0,
    createdAt: habit.createdAt.toISOString(),
  }
}

export async function archiveHabit(id: string, userId: string): Promise<void> {
  const habit = await prisma.habit.findUnique({ where: { id } })
  if (!habit || habit.userId !== userId) throw new Error('Habit not found or unauthorized')
  await prisma.habit.update({ where: { id }, data: { isActive: false } })
}

export async function updateHabit(
  id: string,
  userId: string,
  input: { title: string; description?: string; icon: string; color: string }
): Promise<HabitDTO> {
  const existing = await prisma.habit.findUnique({
    where: { id },
    select: { userId: true, checkins: { select: { date: true, completed: true } } },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Habit not found or unauthorized')
  }

  const updated = await prisma.habit.update({
    where: { id },
    data: input,
  })

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description ?? undefined,
    icon: updated.icon,
    color: updated.color,
    order: updated.order,
    ...calculateStreaks(existing.checkins),
    createdAt: updated.createdAt.toISOString(),
  }
}

export async function reorderHabits(userId: string, orderedIds: string[]): Promise<void> {
  // Use a transaction to perform bulk update reliably
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.habit.updateMany({
        where: { id, userId },
        data: { order: index },
      })
    )
  )
}

export async function toggleCheckin(
  habitId: string,
  userId: string,
  date: string,
  completed: boolean
): Promise<{ checkin: CheckinDTO, currentStreak: number, bestStreak: number }> {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    select: { userId: true, checkins: { select: { date: true, completed: true } } },
  })
  if (!habit || habit.userId !== userId) throw new Error('Habit not found or unauthorized')

  const checkin = await prisma.habitCheckin.upsert({
    where: { habitId_date: { habitId, date } },
    create: { habitId, date, completed },
    update: { completed },
  })

  // Recalculate with the new checkin
  const updatedCheckins = habit.checkins.filter(c => c.date !== date)
  updatedCheckins.push(checkin)
  const streaks = calculateStreaks(updatedCheckins)

  return { 
    checkin: { habitId: checkin.habitId, date: checkin.date, completed: checkin.completed },
    ...streaks
  }
}

export const getCheckinsForWeek = cache(async (
  userId: string,
  dates: string[]
): Promise<CheckinDTO[]> => {
  const checkins = await prisma.habitCheckin.findMany({
    where: { habit: { userId, isActive: true }, date: { in: dates } },
    select: { habitId: true, date: true, completed: true },
  })

  return checkins.map((c) => ({
    habitId: c.habitId,
    date: c.date,
    completed: c.completed,
  }))
})

export const getHistoricalScore = cache(async (userId: string, weekDates: string[]): Promise<number> => {
  const [allCheckins, totalVisibleHabits] = await Promise.all([
    prisma.habitCheckin.findMany({
      where: { habit: { userId }, completed: true },
      select: { date: true },
    }),
    prisma.habit.count({ where: { userId, isActive: true } }),
  ])

  const weekSet = new Set(weekDates)
  const historicalCheckins = allCheckins.filter(c => !weekSet.has(c.date))
  
  const byDate: Record<string, number> = {}
  for (const c of historicalCheckins) {
    byDate[c.date] = (byDate[c.date] || 0) + 1
  }
  
  let score = 0
  for (const d in byDate) {
    score += byDate[d] * 10
    if (byDate[d] === totalVisibleHabits && totalVisibleHabits > 0) {
      score += 20
    }
  }
  return score
})

export interface UserRankingEntry {
  userId: string
  userName: string
  totalScore: number
  currentStreak: number
  bestStreak: number
  rankingPoints: number
}

export const getUserRanking = unstable_cache(
  async (limit: number = 10): Promise<UserRankingEntry[]> => {
    const [activeHabits, completedCheckins] = await Promise.all([
      prisma.habit.findMany({
        where: { isActive: true },
        select: {
          userId: true,
          user: { select: { name: true } },
          checkins: {
            orderBy: { date: 'desc' },
            take: 365,
            select: { date: true, completed: true },
          },
        },
      }),
      prisma.habitCheckin.findMany({
        where: { completed: true, habit: { user: { habits: { some: { isActive: true } } } } },
        select: { date: true, habit: { select: { userId: true } } },
      }),
    ])

    const habitsByUser = new Map<string, { name: string; habits: typeof activeHabits }>()
    for (const habit of activeHabits) {
      const entry = habitsByUser.get(habit.userId) ?? { name: habit.user.name, habits: [] }
      entry.habits.push(habit)
      habitsByUser.set(habit.userId, entry)
    }

    const checkinsByUserDate = new Map<string, Record<string, number>>()
    for (const c of completedCheckins) {
      const byDate = checkinsByUserDate.get(c.habit.userId) ?? {}
      byDate[c.date] = (byDate[c.date] || 0) + 1
      checkinsByUserDate.set(c.habit.userId, byDate)
    }

    const ranking: UserRankingEntry[] = []

    for (const [userId, { name, habits }] of habitsByUser) {
      const byDate = checkinsByUserDate.get(userId) ?? {}

      let totalScore = 0
      for (const d in byDate) {
        totalScore += byDate[d] * 10
        if (byDate[d] === habits.length && habits.length > 0) {
          totalScore += 20
        }
      }

      // Calculate current streak (best across all habits)
      let maxCurrentStreak = 0
      let maxBestStreak = 0

      for (const habit of habits) {
        const { currentStreak, bestStreak } = calculateStreaks(habit.checkins)
        maxCurrentStreak = Math.max(maxCurrentStreak, currentStreak)
        maxBestStreak = Math.max(maxBestStreak, bestStreak)
      }

      const rankingPoints = totalScore + (maxCurrentStreak * 5)

      ranking.push({
        userId,
        userName: name,
        totalScore,
        currentStreak: maxCurrentStreak,
        bestStreak: maxBestStreak,
        rankingPoints
      })
    }

    // Sort by rankingPoints descending, then by totalScore
    ranking.sort((a, b) => {
      if (b.rankingPoints !== a.rankingPoints) {
        return b.rankingPoints - a.rankingPoints
      }
      return b.totalScore - a.totalScore
    })

    return ranking.slice(0, limit)
  }, ['global-user-ranking'], { revalidate: 300 })
