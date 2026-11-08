import { prisma } from '@/lib/prisma'
import { cache } from 'react'
import { hash } from 'bcryptjs'
import { SALT_ROUNDS } from '@/lib/constants'

// Create a new user manually
export async function createUserAdmin(data: { name: string; email: string; phone?: string | null }) {
  const charset = '0123456789'
  let rawPassword = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    rawPassword += charset[randomIndex]
  }

  const hashedPassword = await hash(rawPassword, SALT_ROUNDS)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      role: 'COURTESY',
      plan: 'FREE',
      subscriptionStatus: 'ACTIVE',
      forcePasswordChange: true,
      phone: data.phone,
    },
  })

  return { user, rawPassword }
}

// Update user manually
export async function updateUserAdmin(id: string, data: { name: string; email: string; phone?: string | null }) {
  const user = await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
    },
  })
  return user
}

// Delete user manually
export async function deleteUserAdmin(id: string) {
  await prisma.user.delete({
    where: { id },
  })
}

// Reset password manually
export async function resetUserPasswordAdmin(id: string) {
  const charset = '0123456789'
  let rawPassword = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    rawPassword += charset[randomIndex]
  }

  const hashedPassword = await hash(rawPassword, SALT_ROUNDS)

  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      forcePasswordChange: true,
    },
  })

  return rawPassword
}

export type ActivityItem = { kind: 'transaction' | 'habit' | 'event' | 'note' | 'goal' | 'workout'; title: string; detail?: string; at: Date }

/** Latest things the user created/did in the app, newest first (for the admin "Atividade" tab). */
export async function getUserRecentActivity(userId: string, take = 15): Promise<{ items: ActivityItem[]; counts: Record<string, number> }> {
  const [txs, checkins, events, notes, goals, workouts, counts] = await Promise.all([
    prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take, select: { title: true, amount: true, type: true, createdAt: true } }),
    prisma.habitCheckin.findMany({ where: { habit: { userId } }, orderBy: { createdAt: 'desc' }, take, select: { createdAt: true, habit: { select: { title: true } } } }),
    prisma.calendarEvent.findMany({ where: { userId, source: null }, orderBy: { createdAt: 'desc' }, take, select: { title: true, createdAt: true } }),
    prisma.note.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take, select: { title: true, content: true, createdAt: true } }),
    prisma.financialGoal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take, select: { title: true, createdAt: true } }),
    prisma.workoutSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take, select: { createdAt: true, workoutDay: { select: { name: true } } } }),
    Promise.all([
      prisma.transaction.count({ where: { userId } }),
      prisma.habit.count({ where: { userId } }),
      prisma.calendarEvent.count({ where: { userId, source: null } }),
      prisma.note.count({ where: { userId } }),
      prisma.financialGoal.count({ where: { userId } }),
      prisma.workoutSession.count({ where: { userId } }),
      prisma.pushSubscription.count({ where: { userId } }),
    ]),
  ])

  const brl = (v: unknown) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const items: ActivityItem[] = [
    ...txs.map((t) => ({ kind: 'transaction' as const, title: t.title, detail: `${t.type === 'INCOME' ? '+' : '-'}${brl(t.amount)}`, at: t.createdAt })),
    ...checkins.map((c) => ({ kind: 'habit' as const, title: c.habit.title, detail: 'hábito marcado', at: c.createdAt })),
    ...events.map((e) => ({ kind: 'event' as const, title: e.title, detail: 'compromisso', at: e.createdAt })),
    ...notes.map((n) => ({ kind: 'note' as const, title: n.title || n.content.slice(0, 40), detail: 'nota', at: n.createdAt })),
    ...goals.map((g) => ({ kind: 'goal' as const, title: g.title, detail: 'meta', at: g.createdAt })),
    ...workouts.map((w) => ({ kind: 'workout' as const, title: w.workoutDay.name, detail: 'treino', at: w.createdAt })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take)

  const [transactions, habits, calendarEvents, notesCount, goalsCount, workoutSessions, pushDevices] = counts
  return { items, counts: { transactions, habits, calendarEvents, notes: notesCount, goals: goalsCount, workoutSessions, pushDevices } }
}

/** Last time each user created something in the app (transactions, habits, check-ins, events, notes...). Missing = never used. */
export async function getLastActivityByUser(userIds: string[]): Promise<Map<string, Date>> {
  if (userIds.length === 0) return new Map()
  const rows = await prisma.$queryRaw<{ userId: string; at: Date }[]>`
    SELECT "userId", MAX(at) AS at FROM (
      SELECT "userId", MAX("createdAt") AS at FROM transactions WHERE "userId" = ANY(${userIds}) GROUP BY "userId"
      UNION ALL SELECT h."userId", MAX(c."createdAt") FROM habit_checkins c JOIN habits h ON h.id = c."habitId" WHERE h."userId" = ANY(${userIds}) GROUP BY h."userId"
      UNION ALL SELECT "userId", MAX("createdAt") FROM calendar_events WHERE source IS NULL AND "userId" = ANY(${userIds}) GROUP BY "userId"
      UNION ALL SELECT "userId", MAX("createdAt") FROM notes WHERE "userId" = ANY(${userIds}) GROUP BY "userId"
      UNION ALL SELECT "userId", MAX("createdAt") FROM workout_sessions WHERE "userId" = ANY(${userIds}) GROUP BY "userId"
      UNION ALL SELECT "userId", MAX("createdAt") FROM habits WHERE "userId" = ANY(${userIds}) GROUP BY "userId"
      UNION ALL SELECT "userId", MAX("createdAt") FROM financial_goals WHERE "userId" = ANY(${userIds}) GROUP BY "userId"
    ) t GROUP BY "userId"`
  return new Map(rows.map((r) => [r.userId, r.at]))
}

// Get full user details for admin modal
export const getUserDetails = cache(async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      plan: true,
      subscriptionStatus: true,
      subscriptionStartDate: true,
      subscriptionEndDate: true,
      subscriptionExpiresAt: true,
      billingApprovedAt: true,
      billingProvider: true,
      createdAt: true,
      lastSeenAt: true,
      emailOptOut: true,
      paymentTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          provider: true,
          providerTransactionId: true,
          amount: true,
          paymentMethod: true,
          status: true,
          paidAt: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
  })
})

