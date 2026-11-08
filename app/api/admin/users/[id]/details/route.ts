import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getUserDetails, getUserRecentActivity } from '@/services/admin/user.admin.service'
import { listUserEmails } from '@/services/admin/email.admin.service'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const [user, activity, emails] = await Promise.all([getUserDetails(id), getUserRecentActivity(id), listUserEmails(id)])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Serialize dates and Decimal fields — never expose password
    const serialized = {
      ...user,
      createdAt: user.createdAt.toISOString(),
      billingApprovedAt: user.billingApprovedAt?.toISOString() ?? null,
      subscriptionStartDate: user.subscriptionStartDate?.toISOString() ?? null,
      subscriptionEndDate: user.subscriptionEndDate?.toISOString() ?? null,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      activity: {
        counts: activity.counts,
        items: activity.items.map((a) => ({ ...a, at: a.at.toISOString() })),
      },
      emails: emails.map((e) => ({
        ...e,
        sentAt: e.sentAt?.toISOString() ?? null,
        openedAt: e.openedAt?.toISOString() ?? null,
        clickedAt: e.clickedAt?.toISOString() ?? null,
      })),
      paymentTransactions: (user as any).paymentTransactions?.map((tx: any) => ({
        ...tx,
        amount: tx.amount != null ? Number(tx.amount) : null,
        paidAt: tx.paidAt?.toISOString() ?? null,
        expiresAt: tx.expiresAt?.toISOString() ?? null,
        createdAt: tx.createdAt.toISOString(),
      })),
    }

    return NextResponse.json(serialized)
  } catch (err: any) {
    console.error('[API /admin/users/[id]/details] Error:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
