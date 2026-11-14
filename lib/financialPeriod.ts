/** Calendar day used by the Brazilian financial reports, independent of server TZ. */
export function financialToday(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const value = (type: string) => Number(parts.find(part => part.type === type)!.value)
  return new Date(value('year'), value('month') - 1, value('day'), 23, 59, 59, 999)
}
