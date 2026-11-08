import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export type EmailStatusFilter = 'all' | 'clicked' | 'opened' | 'not_opened'

/** Sent / opened / clicked per campaign (only e-mails actually delivered to Brevo). */
export async function getEmailCampaignStats(since?: Date) {
  const base: Prisma.EmailLogWhereInput = { sentAt: since ? { gte: since } : { not: null } }
  const [sent, opened, clicked] = await Promise.all([
    prisma.emailLog.groupBy({ by: ['tag'], where: base, _count: { _all: true } }),
    prisma.emailLog.groupBy({ by: ['tag'], where: { ...base, openedAt: { not: null } }, _count: { _all: true } }),
    prisma.emailLog.groupBy({ by: ['tag'], where: { ...base, clickedAt: { not: null } }, _count: { _all: true } }),
  ])
  const count = (rows: typeof sent, tag: string | null) => rows.find((r) => r.tag === tag)?._count._all ?? 0
  return sent
    .map((r) => ({ tag: r.tag, sent: r._count._all, opened: count(opened, r.tag), clicked: count(clicked, r.tag) }))
    .sort((a, b) => b.sent - a.sent)
}

export async function listEmailLogs({ tag, status = 'all', search, take = 150 }: { tag?: string; status?: EmailStatusFilter; search?: string; take?: number }) {
  const where: Prisma.EmailLogWhereInput = {
    sentAt: { not: null },
    ...(tag && tag !== 'all' ? { tag } : {}),
    ...(status === 'clicked' ? { clickedAt: { not: null } } : {}),
    ...(status === 'opened' ? { openedAt: { not: null }, clickedAt: null } : {}),
    ...(status === 'not_opened' ? { openedAt: null } : {}),
    ...(search ? { user: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } } : {}),
  }
  return prisma.emailLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take,
    select: {
      id: true, tag: true, subject: true, sentAt: true, openedAt: true, opens: true, clickedAt: true, clicks: true, lastClickUrl: true,
      user: { select: { id: true, name: true, email: true, plan: true } },
    },
  })
}

/** E-mails of one user (admin user details). */
export function listUserEmails(userId: string, take = 20) {
  return prisma.emailLog.findMany({
    where: { userId, sentAt: { not: null } },
    orderBy: { sentAt: 'desc' },
    take,
    select: { id: true, tag: true, subject: true, sentAt: true, openedAt: true, clickedAt: true, clicks: true },
  })
}
