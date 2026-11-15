import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { registerWorkoutCompletion } from '@/services/userStats.service'
import { workoutSessionSchema, type CompleteWorkoutSessionInput } from '@/lib/workoutSession'

export type { CompleteWorkoutSessionInput } from '@/lib/workoutSession'
export class WorkoutSessionError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
const include = {
  workoutDay: { select: { name: true } },
  plan: { select: { name: true } },
  exercises: { orderBy: { createdAt: 'asc' as const }, include: { exercise: { select: { namePt: true } }, sets: { orderBy: { setNumber: 'asc' as const } } } },
} satisfies Prisma.WorkoutSessionInclude
type SessionRecord = Prisma.WorkoutSessionGetPayload<{ include: typeof include }>

function dto(row: SessionRecord) {
  return {
    id: row.id, planId: row.planId, workoutDayId: row.workoutDayId,
    planName: row.planName ?? row.plan.name, dayName: row.dayName ?? row.workoutDay.name,
    date: row.date.toISOString(), completed: row.completed, dayNotes: row.dayNotes,
    durationSeconds: row.durationSeconds,
    exercises: row.exercises.map(item => ({
      id: item.id, exerciseId: item.exerciseId, name: item.exerciseName ?? item.exercise.namePt,
      completed: item.completed, setsDone: item.setsDone, notes: item.notes,
      sets: item.sets.map(set => ({ setNumber: set.setNumber, actualReps: set.actualReps, weight: set.weight?.toString() ?? null, completed: set.completed })),
    })),
  }
}
export type WorkoutSessionDTO = ReturnType<typeof dto>

export async function getWorkoutSessions(userId: string, dayId?: string, before?: string) {
  const cursor = before ? await prisma.workoutSession.findFirst({ where: { id: before, userId }, select: { id: true, date: true } }) : null
  if (before && !cursor) throw new WorkoutSessionError('Página de histórico inválida.')
  const rows = await prisma.workoutSession.findMany({
    where: { userId, ...(dayId ? { workoutDayId: dayId } : {}), ...(cursor ? { OR: [{ date: { lt: cursor.date } }, { date: cursor.date, id: { lt: cursor.id } }] } : {}) },
    orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 20, include,
  })
  return rows.map(dto)
}

export async function completeWorkoutSession(userId: string, raw: CompleteWorkoutSessionInput, id?: string): Promise<WorkoutSessionDTO> {
  const input = workoutSessionSchema.parse(raw)
  const date = input.date ? new Date(input.date) : new Date()
  if (date.getTime() > Date.now() + 300000) throw new WorkoutSessionError('Não é possível registrar um treino no futuro.')
  // Serialize retries per account. The route derives the primary key from account + mutation UUID.
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
    if (id) {
      const existing = await tx.workoutSession.findFirst({ where: { id, userId }, include })
      if (existing) return dto(existing)
    }
    const day = await tx.workoutDay.findFirst({
      where: { id: input.workoutDayId, planId: input.planId, plan: { userId } },
      include: { plan: true, exercises: { include: { exercise: true } } },
    })
    if (!day) throw new WorkoutSessionError('Treino não encontrado.', 404)
    const used = new Set<string>()
    const normalized = input.exercises.map(item => {
      const planned = day.exercises.find(p => item.workoutDayExerciseId ? p.id === item.workoutDayExerciseId && p.exerciseId === item.exerciseId : p.exerciseId === item.exerciseId && !used.has(p.id))
      if (!planned || used.has(planned.id)) throw new WorkoutSessionError('Exercício inválido ou repetido neste treino.')
      used.add(planned.id)
      const sets = item.sets ?? []
      if (new Set(sets.map(s => s.setNumber)).size !== sets.length) throw new WorkoutSessionError('Número de série repetido.')
      const done = sets.filter(s => s.completed).length
      const completed = sets.length ? done >= planned.sets && done === sets.length : Boolean(item.completed)
      return { exerciseId: item.exerciseId, exerciseName: planned.exercise.namePt,
        setsDone: sets.length ? done : item.setsDone, repsDone: item.repsDone,
        weightUsed: item.weightUsed, completed, notes: item.notes,
        sets: { create: sets.map(s => ({ ...s, weight: s.weight == null ? null : Math.round(s.weight * 100) / 100 })) },
      }
    })
    if (!normalized.some(e => e.completed || (e.setsDone ?? 0) > 0)) throw new WorkoutSessionError('Marque ao menos uma série realizada antes de finalizar.')
    const completed = normalized.every(e => e.completed) && day.exercises.filter(e => !e.archivedAt).every(e => used.has(e.id))
    const row = await tx.workoutSession.create({ data: {
      ...(id ? { id } : {}), userId, planId: day.planId, workoutDayId: day.id, date,
      completed, dayNotes: input.dayNotes, durationSeconds: input.durationSeconds,
      planName: day.plan.name, dayName: day.name, exercises: { create: normalized },
    }, include })
    await registerWorkoutCompletion(userId, { workoutDate: date, completedAllExercises: completed }, tx)
    return dto(row)
  }, { timeout: 15000 })
}
