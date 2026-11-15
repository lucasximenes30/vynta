/** Hosting timezone must never change the workout day. */
export function workoutDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
export function workoutDayBounds(date = new Date()) {
  const start = new Date(`${workoutDateKey(date)}T00:00:00-03:00`)
  return { start, end: new Date(start.getTime() + 86400000) }
}
export function parseWorkoutReps(value: string): number | null {
  if (!value.trim()) return null
  if (!/^\d+$/.test(value.trim()) || Number(value) > 1000) throw new Error('Informe repetições inteiras de 0 a 1000.')
  return Number(value)
}
export function parseWorkoutWeight(value: string): number | null {
  if (!value.trim()) return null
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Informe uma carga válida, com até duas casas decimais.')
  const result = Number(value.replace(',', '.'))
  if (result > 999999.99) throw new Error('Carga acima do limite.')
  return result
}
