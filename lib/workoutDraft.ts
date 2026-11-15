import type { CompleteWorkoutSessionInput } from './workoutSession'

export type RunnerDay = {
  id: string; name: string; planId: string
  exercises: Array<{ id: string; exerciseId: string; sets: number; reps: string; targetWeight: string | null; exercise: { namePt: string } }>
}
export type WorkoutDraft = {
  version: 1; owner: string; id: string; day: RunnerDay; startedAt: string
  elapsed: number; runningSince: number | null; restUntil: number | null; restSeconds: number
  notes: string; pending?: CompleteWorkoutSessionInput; revision: string
  exercises: Array<{ id: string; exerciseId: string; name: string; plannedReps: string; plannedSets: number; notes: string;
    sets: Array<{ reps: string; weight: string; completed: boolean }> }>
}
export const workoutDraftKey = (owner: string) => `vynta:workout-draft:v1:${owner}`
export function elapsedSeconds(draft: WorkoutDraft, now = Date.now()) {
  return Math.max(0, Math.floor(draft.elapsed + (draft.runningSince === null ? 0 : (now - draft.runningSince) / 1000)))
}
export function newWorkoutDraft(owner: string, day: RunnerDay): WorkoutDraft {
  return { version: 1, owner, id: crypto.randomUUID(), revision: crypto.randomUUID(), day,
    startedAt: new Date().toISOString(), elapsed: 0, runningSince: Date.now(), restUntil: null, restSeconds: 90, notes: '',
    exercises: day.exercises.map(e => ({ id: e.id, exerciseId: e.exerciseId, name: e.exercise.namePt,
      plannedReps: e.reps, plannedSets: e.sets, notes: '',
      sets: Array.from({ length: e.sets }, () => ({ reps: '', weight: '', completed: false })),
    })),
  }
}
export function readWorkoutDraft(owner: string): WorkoutDraft | null {
  const raw = localStorage.getItem(workoutDraftKey(owner))
  if (!raw) return null
  const data = JSON.parse(raw) as WorkoutDraft
  if (data.version !== 1 || data.owner !== owner || !data.id || !data.day || !Array.isArray(data.exercises) || !data.exercises.every(e => Array.isArray(e.sets))) {
    throw new Error('Não foi possível ler o rascunho. Ele foi preservado neste aparelho.')
  }
  return data
}

/** Never overwrite changes made in another tab or delete an unacknowledged session. */
export function writeWorkoutDraft(draft: WorkoutDraft, previousRevision?: string) {
  const stored = readWorkoutDraft(draft.owner)
  if (stored && stored.revision !== previousRevision) throw new Error('O treino mudou em outra aba. Reabra a execução para continuar com os dados atuais.')
  if (!stored && previousRevision) throw new Error('O treino foi finalizado ou descartado em outra aba. Recarregue a página.')
  const next = { ...draft, revision: crypto.randomUUID() }
  localStorage.setItem(workoutDraftKey(draft.owner), JSON.stringify(next))
  return next
}
