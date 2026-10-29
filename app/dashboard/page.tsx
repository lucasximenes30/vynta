import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getMonthlySummary } from '@/services/transaction.service'
import { getActiveWorkoutPlanByUser } from '@/services/workoutPlan.service'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: 'Painel Central',
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const now = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Subscription check and dashboard data are fetched in parallel
  const [user, balance, habits, workoutPlan, events, weekCheckins] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        subscriptionStatus: true,
        subscriptionEndDate: true,
        subscriptionExpiresAt: true,
        role: true,
        plan: true,
        createdAt: true,
        hasSeenDashboard: true,
      },
    }),
    getMonthlySummary(session.userId).catch(() => ({ income: 0, expense: 0, balance: 0, transactionCount: 0 })),
    prisma.habit.findMany({
      where: { userId: session.userId, isActive: true },
      select: { id: true, title: true, color: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    }).catch(() => []),
    getActiveWorkoutPlanByUser(session.userId).catch(() => null),
    prisma.calendarEvent.findMany({
      where: {
        userId: session.userId,
        date: { gte: startMonth, lte: endMonth }
      },
      orderBy: { date: 'asc' }
    }).catch(() => []),
    prisma.habitCheckin.findMany({
      where: { date: todayStr, completed: true, habit: { userId: session.userId, isActive: true } },
      select: { habitId: true, date: true, completed: true },
    }).catch(() => [])
  ])

  if (!user) redirect('/login')

  // Check if subscription has expired
  const isPaidActive = user.subscriptionStatus === 'ACTIVE'
  const isPrivileged = user.role === 'ADMIN' || user.role === 'COURTESY'
  const isExpired = 
    (user.subscriptionEndDate && new Date() > new Date(user.subscriptionEndDate)) ||
    (user.subscriptionExpiresAt && new Date() > new Date(user.subscriptionExpiresAt))

  // Redirect if inactive or if VIP access expired
  if (!isPaidActive || (user.subscriptionStatus === 'ACTIVE' && isExpired)) {
    if (!isPrivileged) {
      redirect('/unlock?state=expired')
    }
  }

  // Parse events dates to ISO strings for client component
  const serializedEvents = events.map((e: any) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date.toISOString(),
    startTime: e.startTime,
    endTime: e.endTime,
    isAllDay: e.isAllDay,
    category: e.category,
    color: e.color
  }))

  const isNewUser = !user.hasSeenDashboard

  if (isNewUser) {
    // Marcar como visto em background para não bloquear o carregamento inicial
    prisma.user.update({
      where: { id: session.userId },
      data: { hasSeenDashboard: true }
    }).catch(() => {})
  }

  return (
    <DashboardClient
      session={session}
      balance={{
        income: Number(balance.income),
        expense: Number(balance.expense),
        balance: Number(balance.balance),
      }}
      habits={habits}
      checkins={weekCheckins.map((c) => ({ habitId: c.habitId, date: c.date, completed: c.completed }))}
      events={serializedEvents}
      activeWorkoutPlanName={workoutPlan?.name || null}
      plan={user.plan}
      subscriptionExpiresAt={user.subscriptionExpiresAt ? user.subscriptionExpiresAt.toISOString() : null}
      isNewUser={isNewUser}
    />
  )
}
