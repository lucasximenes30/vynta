import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { RELEASE_ID } from '@/lib/release'

/** A read notification is a durable presentation receipt, scoped to account + release.
 * Financial notifications use another ID namespace and never select these rows.
 * Do not expire/delete these receipts while this release remains enabled. */
export async function claimReleaseNotice(userId: string): Promise<boolean> {
  const id = `vynta-release-${createHash('sha256').update(`${RELEASE_ID}|${userId}`).digest('hex').slice(0, 32)}`
  if (await prisma.notification.findUnique({ where: { id }, select: { id: true } })) return false
  try {
    await prisma.notification.create({ data: {
      id, userId, read: true, date: new Date(),
      message: JSON.stringify({ kind: 'release-presentation', releaseId: RELEASE_ID }),
    } })
    return true
  } catch (error) {
    // Unique primary key makes concurrent tabs/devices elect exactly one presenter.
    if ((error as { code?: string })?.code === 'P2002') return false
    throw error
  }
}
