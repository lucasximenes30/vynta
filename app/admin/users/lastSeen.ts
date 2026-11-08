/** "Agora", "Há 3 h", "Há 2 dias"... plus a color reflecting how engaged the user is. */
export function lastSeenInfo(iso?: string | null): { label: string; cls: string } {
  if (!iso) return { label: 'Nunca acessou', cls: 'text-red-500 dark:text-red-400' }
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  const days = Math.floor(min / 1440)
  const label = min < 15 ? 'Agora' : min < 60 ? `Há ${min} min` : min < 1440 ? `Há ${Math.floor(min / 60)} h` : days === 1 ? 'Ontem' : `Há ${days} dias`
  const cls = days < 1 ? 'text-emerald-600 dark:text-emerald-400' : days < 2 ? 'text-blue-600 dark:text-blue-400' : days < 7 ? 'text-amber-600 dark:text-amber-500' : 'text-red-500 dark:text-red-400'
  return { label, cls }
}
