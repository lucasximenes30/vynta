import { z } from 'zod'

const weight = z.number().finite().min(0).max(999999.99).nullable().optional()
export const workoutSessionSchema = z.object({
  planId: z.string().min(1).max(100),
  workoutDayId: z.string().min(1).max(100),
  date: z.string().datetime().optional(),
  durationSeconds: z.number().int().min(0).max(604800).optional(),
  dayNotes: z.string().trim().max(1000).optional(),
  exercises: z.array(z.object({
    exerciseId: z.string().min(1).max(100),
    workoutDayExerciseId: z.string().min(1).max(100).optional(),
    setsDone: z.number().int().min(0).max(50).nullable().optional(),
    repsDone: z.string().trim().max(30).nullable().optional(),
    weightUsed: weight,
    completed: z.boolean().optional(),
    notes: z.string().trim().max(600).optional(),
    sets: z.array(z.object({
      setNumber: z.number().int().min(1).max(50),
      plannedReps: z.string().trim().max(30).nullable().optional(),
      actualReps: z.number().int().min(0).max(1000).nullable().optional(),
      weight,
      completed: z.boolean().optional(),
    })).max(50).optional(),
  })).min(1).max(200),
})
export type CompleteWorkoutSessionInput = z.infer<typeof workoutSessionSchema>

export { workoutDateKey, workoutDayBounds, parseWorkoutReps, parseWorkoutWeight } from './workoutTime'
