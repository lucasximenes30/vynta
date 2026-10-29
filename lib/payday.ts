// Payday helpers — recurring income can be paid on a fixed calendar day or on the
// Nth business day of the month ("dia útil"), e.g. CLT salary "até o 5º dia útil".

export type PayDayType = 'fixed' | 'business_day'

/** Nth business day (Mon–Fri) of a month. Returns the day-of-month number. */
export function nthBusinessDay(year: number, month0: number, n: number): number {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const wd = new Date(year, month0, d).getDay()
    if (wd === 0 || wd === 6) continue
    count++
    if (count === n) return d
  }
  return daysInMonth
}

/**
 * Effective day-of-month a payment lands on.
 * 'business_day' → the Nth weekday; anything else → the fixed day clamped to the month.
 */
export function effectivePayDay(
  year: number,
  month0: number,
  payDayType: string | null | undefined,
  day: number,
): number {
  if (payDayType === 'business_day') {
    return nthBusinessDay(year, month0, Math.min(Math.max(day, 1), 22))
  }
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  return Math.min(day, daysInMonth)
}
