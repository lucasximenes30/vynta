import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import {
  listUserNotifications,
  markAllActiveNotificationsAsRead,
  markNotificationsAsRead,
  registerNotificationPayment,
} from '@/services/notification.service'

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('mark-read'),
    ids: z.array(z.string().min(1)).default([]),
  }),
  z.object({
    action: z.literal('mark-all-read'),
  }),
  z.object({
    action: z.literal('register-payment'),
    id: z.string().min(1),
  }),
])

function serializeNotification(notification: Awaited<ReturnType<typeof listUserNotifications>>[number]) {
  return {
    ...notification,
    dueDate: notification.dueDate.toISOString(),
  }
}

async function getNotificationPayload(userId: string) {
  const notifications = await listUserNotifications(userId)
  const unreadCount = notifications.filter((notification) => !notification.read).length

  return {
    notifications: notifications.map(serializeNotification),
    unreadCount,
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getNotificationPayload(session.userId)
  return NextResponse.json(payload)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = actionSchema.parse(body)

    if (data.action === 'mark-read') {
      await markNotificationsAsRead(session.userId, data.ids)
    }

    if (data.action === 'mark-all-read') {
      await markAllActiveNotificationsAsRead(session.userId)
    }

    if (data.action === 'register-payment') {
      await registerNotificationPayment(session.userId, data.id)
    }

    const payload = await getNotificationPayload(session.userId)
    return NextResponse.json({ success: true, ...payload })
  } catch (error: any) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? 'Invalid request'
      : error?.message ?? 'Failed to process notification action'

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    )
  }
}
