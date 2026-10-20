import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getHabitsByUser, getCheckinsForWeek, getHistoricalScore, getUserRanking } from '@/services/habit.service'
import HabitsClient from './HabitsClient'

export const metadata: Metadata = {
  title: 'Hábitos',
}

/** Returns the 7 dates (YYYY-MM-DD) of the current week, Sun → Sat */
function getWeekDates(): string[] {
  const today = new Date()
  const day = today.getDay() // 0 = Sunday
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - day)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    // Use local date to avoid timezone shift
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${day}`)
  }
  return dates
}

/** Returns the 7 dates (YYYY-MM-DD) of the previous week, Sun → Sat */
function getPrevWeekDates(): string[] {
  const dates = getWeekDates()
  return dates.map(dateStr => {
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })
}

export default async function HabitsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const weekDates = getWeekDates()
  const prevWeekDates = getPrevWeekDates()

  const [habits, checkins, prevCheckins, historicalScore, ranking] = await Promise.all([
    getHabitsByUser(session.userId),
    getCheckinsForWeek(session.userId, weekDates),
    getCheckinsForWeek(session.userId, prevWeekDates),
    getHistoricalScore(session.userId, weekDates),
    getUserRanking(10),
  ])

  return (
    <HabitsClient
      session={session}
      initialHabits={habits}
      initialCheckins={checkins}
      initialPrevCheckins={prevCheckins}
      weekDates={weekDates}
      initialHistoricalScore={historicalScore}
      initialRanking={ranking}
    />
  )
}
