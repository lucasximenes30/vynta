import ical, { type VEvent } from 'node-ical'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { DEFAULT_PREFERENCES } from '@/services/push.service'

/**
 * Imports a user's Google (or any) calendar via its secret iCal feed URL into
 * `calendar_events` (`source: 'ical'`). Runs from /api/cron/push every 15 min and on save.
 *
 * Sync model:
 *  - each VEVENT/occurrence is keyed by `externalId` (`uid` for one-offs, `uid@occurrence`
 *    for recurring instances) under the (userId, source, externalId) unique constraint,
 *    so rows keep their `id` across syncs and push dedupe keys stay stable;
 *  - non-recurring events are synced at any date; recurring rules are expanded within a
 *    rolling window (past 30d → next 180d) — the calendar UI shows this range;
 *  - rows whose externalId is no longer produced by the feed are deleted (cancellations).
 *  - event times are stored in the user's timezone (notification prefs), matching the
 *    app's convention: `date` = UTC midnight of the local day + `startTime` 'HH:mm'.
 */

const SOURCE = 'ical'
const PAST_MS = 30 * 24 * 3600 * 1000
const FUTURE_MS = 180 * 24 * 3600 * 1000
const FETCH_TIMEOUT_MS = 10_000
const MAX_ICS_BYTES = 8 * 1024 * 1024
const MAX_EVENTS = 2000

export class IcalSyncError extends Error {}

interface DesiredEvent {
  title: string
  description: string | null
  date: Date
  startTime: string | null
  endTime: string | null
  isAllDay: boolean
}

const text = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'object' && v !== null && 'val' in v ? String((v as { val: unknown }).val ?? '') : ''

const part = (tz: string, date: Date, type: Intl.DateTimeFormatPartTypes) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).find((p) => p.type === type)?.value ?? '00'

// Local wall-clock of an instant in the user's timezone → app convention.
function localParts(tz: string, instant: Date) {
  return {
    day: `${part(tz, instant, 'year')}-${part(tz, instant, 'month')}-${part(tz, instant, 'day')}`,
    time: `${part(tz, instant, 'hour')}:${part(tz, instant, 'minute')}`,
  }
}

function toDesired(tz: string, uid: string, start: Date, end: Date | undefined, allDay: boolean, title: string, description: string | null): [string, DesiredEvent] | null {
  // All-day dates are parsed as UTC midnight of the calendar day — keep them in UTC.
  const day = allDay ? start.toISOString().slice(0, 10) : localParts(tz, start).day
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(Date.UTC(y, m - 1, d))

  let startTime: string | null = null
  let endTime: string | null = null
  if (!allDay) {
    startTime = localParts(tz, start).time
    if (end && end.getTime() > start.getTime() && localParts(tz, end).day === day) {
      endTime = localParts(tz, end).time
    }
  }
  return [`${uid}@${day}T${startTime ?? 'day'}`, { title, description, date, startTime, endTime, isAllDay: allDay }]
}

async function fetchIcs(url: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'text/calendar, text/plain, */*' },
      cache: 'no-store',
      redirect: 'follow',
    })
  } catch {
    throw new IcalSyncError('Não consegui acessar o link. Confira se ele está completo.')
  }
  if (!res.ok) throw new IcalSyncError(`O link respondeu com erro ${res.status}. Gere um novo link secreto no Google Agenda.`)
  const body = await res.text()
  if (body.length > MAX_ICS_BYTES) throw new IcalSyncError('Arquivo da agenda grande demais para sincronizar.')
  if (!body.includes('BEGIN:VCALENDAR')) {
    throw new IcalSyncError('Esse link não é uma agenda iCal (.ics). Use o "endereço secreto no formato iCal".')
  }
  return body
}

function parseFeed(tz: string, ics: string): Map<string, DesiredEvent> {
  const parsed = ical.sync.parseICS(ics)
  const now = Date.now()
  const from = new Date(now - PAST_MS)
  const to = new Date(now + FUTURE_MS)
  const desired = new Map<string, DesiredEvent>()

  for (const comp of Object.values(parsed)) {
    if (!comp || comp.type !== 'VEVENT' || comp.status === 'CANCELLED') continue
    const ev = comp as VEvent
    if (!ev.start) continue
    const title = text(ev.summary).trim() || 'Sem título'
    const description = text(ev.description).trim() || null

    const instances = ev.rrule
      ? ical.expandRecurringEvent(ev, { from, to }).map((i) => ({ start: i.start, end: i.end, allDay: i.isFullDay }))
      : [{ start: ev.start, end: ev.end, allDay: ev.datetype === 'date' || !!ev.start.dateOnly }]

    for (const inst of instances) {
      const entry = toDesired(tz, ev.uid, inst.start, inst.end, inst.allDay, title, description)
      if (entry) desired.set(entry[0], entry[1])
      if (desired.size > MAX_EVENTS) throw new IcalSyncError('Agenda com eventos demais para sincronizar.')
    }
  }
  return desired
}

export interface CalendarSyncResult { created: number; updated: number; removed: number; total: number }

export async function syncUserCalendarFeed(userId: string, url: string, timezone?: string): Promise<CalendarSyncResult> {
  const tz = timezone ?? (await prisma.notificationPreference.findUnique({ where: { userId }, select: { timezone: true } }))?.timezone ?? DEFAULT_PREFERENCES.timezone
  const desired = parseFeed(tz, await fetchIcs(url))
  const existing = await prisma.calendarEvent.findMany({
    where: { userId, source: SOURCE },
    select: { id: true, externalId: true, title: true, description: true, date: true, startTime: true, endTime: true, isAllDay: true },
  })
  const byExternal = new Map(existing.map((e) => [e.externalId!, e]))

  let created = 0
  let updated = 0
  const ops: Prisma.PrismaPromise<unknown>[] = []
  for (const [externalId, d] of desired) {
    const cur = byExternal.get(externalId)
    if (!cur) {
      created++
      ops.push(prisma.calendarEvent.create({ data: { userId, externalId, source: SOURCE, ...d, color: 'bg-blue-500' } }))
    } else if (
      cur.title !== d.title || cur.description !== d.description || cur.startTime !== d.startTime ||
      cur.endTime !== d.endTime || cur.isAllDay !== d.isAllDay || cur.date.getTime() !== d.date.getTime()
    ) {
      updated++
      ops.push(prisma.calendarEvent.update({ where: { id: cur.id }, data: d }))
    }
    byExternal.delete(externalId)
  }

  const removed = byExternal.size
  if (removed) ops.push(prisma.calendarEvent.deleteMany({ where: { id: { in: [...byExternal.values()].map((e) => e.id) } } }))
  for (let i = 0; i < ops.length; i += 250) {
    await prisma.$transaction(ops.slice(i, i + 250))
  }
  await prisma.user.update({ where: { id: userId }, data: { icalSyncedAt: new Date(), icalSyncError: null } })
  return { created, updated, removed, total: desired.size }
}

// Every run of the push cron also refreshes feeds so "starts in X min" sees fresh events.
export async function syncAllCalendarFeeds() {
  const users = await prisma.user.findMany({
    where: { icalFeedUrl: { not: null } },
    select: { id: true, icalFeedUrl: true, notificationPrefs: { select: { timezone: true } } },
  })
  const results: Record<string, CalendarSyncResult | { error: string }> = {}
  await Promise.all(users.map(async (u) => {
    try {
      results[u.id] = await syncUserCalendarFeed(u.id, u.icalFeedUrl!, u.notificationPrefs?.timezone)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao sincronizar'
      results[u.id] = { error: msg }
      await prisma.user.update({ where: { id: u.id }, data: { icalSyncError: msg } }).catch(() => {})
    }
  }))
  return { feeds: users.length, results }
}
