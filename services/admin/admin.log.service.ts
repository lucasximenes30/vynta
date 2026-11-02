import { prisma } from '@/lib/prisma'
import { cache } from 'react'
import { Prisma } from '@prisma/client'

export type AdminAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'PASSWORD_RESET'
  | 'ACCESS_CHANGED'
  | 'STATUS_CHANGED'
  | 'PLAN_CHANGED'
  | 'WHATSAPP_OPENED'
  | 'PAYMENT_STATUS_UPDATED'
  | 'FUNNEL_RESET'

export interface CreateAdminLogInput {
  adminId: string
  action: AdminAction
  description?: string
  targetUserId?: string
  metadata?: Record<string, unknown>
}

async function resolveValidAdminUserId(adminId: string): Promise<string | null> {
  if (adminId && adminId !== 'admin-system') {
    const exists = await prisma.user.findUnique({ where: { id: adminId }, select: { id: true } })
    if (exists) return exists.id
  }
  // Fallback to any real ADMIN user in the database so virtual 'admin-system' session doesn't violate FK
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  })
  return adminUser?.id ?? null
}

export async function createAdminLog({
  adminId,
  action,
  description,
  targetUserId,
  metadata,
}: CreateAdminLogInput) {
  try {
    const resolvedAdminId = await resolveValidAdminUserId(adminId)
    if (!resolvedAdminId) return

    await prisma.adminActionLog.create({
      data: {
        adminId: resolvedAdminId,
        action,
        description,
        targetUserId: targetUserId ?? null,
        metadata: metadata != null ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    })
  } catch (err) {
    // Non-critical — never let log failure break the main action
    console.error('[AdminLog] Failed to create admin action log:', err)
  }
}

export const getAdminLogs = cache(async ({
  targetUserId,
  limit = 50,
  offset = 0,
}: {
  targetUserId?: string
  limit?: number
  offset?: number
} = {}) => {
  const where = targetUserId ? { targetUserId } : undefined

  const [logs, total] = await Promise.all([
    prisma.adminActionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        action: true,
        description: true,
        createdAt: true,
        metadata: true,
        admin: {
          select: { id: true, name: true, email: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.adminActionLog.count({ where }),
  ])

  return { logs, total }
})
