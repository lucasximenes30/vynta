import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getLocalToday } from '@/lib/dateUtils'
import { getActiveWorkoutPlanByUser } from '@/services/workoutPlan.service'
import { getWorkoutDaysByPlan } from '@/services/workoutDay.service'
import { getWorkoutDayExercisesByPlan } from '@/services/workoutDayExercise.service'
import { getWorkoutDayAssignmentByDate } from '@/services/workoutDayAssignment.service'
import WorkoutClient from './WorkoutClient'

export const metadata: Metadata = {
  title: 'Treino',
}

export default async function WorkoutPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const activePlan = await getActiveWorkoutPlanByUser(session.userId)
  const todayDateKey = getLocalToday()
  const [initialDays, initialDayExercises, initialTodayAssignment] = activePlan
    ? await Promise.all([
        getWorkoutDaysByPlan(session.userId, activePlan.id),
        getWorkoutDayExercisesByPlan(session.userId, activePlan.id),
        getWorkoutDayAssignmentByDate(session.userId, {
          planId: activePlan.id,
          date: todayDateKey,
        }),
      ])
    : [[], [], null]

  return (
    <WorkoutClient
      session={session}
      initialPlan={activePlan}
      initialDays={initialDays}
      initialDayExercises={initialDayExercises}
      initialTodayAssignment={initialTodayAssignment}
    />
  )
}
