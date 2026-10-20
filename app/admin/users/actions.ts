'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { hash } from 'bcryptjs'
import { SALT_ROUNDS } from '@/lib/constants'
import { createAdminLog } from '@/services/admin/admin.log.service'

async function ensureAdmin() {
  const session = await requireAuth()
  const role = session.role as string
  const id = session.userId
  if (role !== 'ADMIN') {
    throw new Error('Unauthorized access')
  }
  return { id, role }
}

export async function changeUserAccess(
  userId: string,
  data: {
    plan: string
    role: string
    canUseFinance: boolean
    canUseHabits: boolean
    canUseWorkout: boolean
    canUseGoals: boolean
    canUseNotes: boolean
    canUseAgenda: boolean
  }
) {
  const session = await ensureAdmin()

  await prisma.user.update({
    where: { id: userId },
    data: data as any,
  })

  await createAdminLog({
    adminId: session.id,
    action: 'ACCESS_CHANGED',
    description: `Acesso alterado para plano ${data.plan}`,
    targetUserId: userId,
    metadata: { newAccess: data.plan, newRole: data.role },
  })

  revalidatePath('/admin/users')
}

export async function changeUserStatus(userId: string, active: boolean) {
  const session = await ensureAdmin()

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: active ? 'ACTIVE' : 'INACTIVE',
    },
  })

  await createAdminLog({
    adminId: session.id,
    action: 'STATUS_CHANGED',
    description: active ? 'Conta ativada manualmente' : 'Conta inativada manualmente',
    targetUserId: userId,
    metadata: { active },
  })

  revalidatePath('/admin/users')
}

export async function generateTemporaryPassword(userId: string): Promise<string> {
  const session = await ensureAdmin()

  // Generate an 8 character secure random string
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#'
  let tempPassword = ''
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    tempPassword += charset[randomIndex]
  }

  const hashedPassword = await hash(tempPassword, SALT_ROUNDS)

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
    },
  })

  await createAdminLog({
    adminId: session.id,
    action: 'PASSWORD_RESET',
    description: 'Senha temporária gerada pelo admin',
    targetUserId: userId,
  })

  return tempPassword
}

export async function createUser(data: { name: string; email: string; phone?: string | null }) {
  const session = await ensureAdmin()

  const { createUserAdmin } = await import('@/services/admin/user.admin.service')
  const result = await createUserAdmin(data)

  await createAdminLog({
    adminId: session.id,
    action: 'USER_CREATED',
    description: `Usuário ${data.name} criado manualmente`,
    targetUserId: result.user.id,
    metadata: { email: data.email },
  })

  revalidatePath('/admin/users')
  return result
}

export async function updateUser(id: string, data: { name: string; email: string; phone?: string | null }) {
  const session = await ensureAdmin()

  const { updateUserAdmin } = await import('@/services/admin/user.admin.service')
  const user = await updateUserAdmin(id, data)

  await createAdminLog({
    adminId: session.id,
    action: 'USER_UPDATED',
    description: `Dados do usuário atualizados`,
    targetUserId: id,
    metadata: { name: data.name, email: data.email },
  })

  revalidatePath('/admin/users')
  return user
}

export async function deleteUser(userId: string) {
  const session = await ensureAdmin()

  // Prevent admin from deleting themselves
  if (userId === session.id) {
    throw new Error('Não é possível deletar a própria conta admin.')
  }

  // Get user info before deletion for log
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  const { deleteUserAdmin } = await import('@/services/admin/user.admin.service')
  await deleteUserAdmin(userId)

  await createAdminLog({
    adminId: session.id,
    action: 'USER_DELETED',
    description: `Usuário ${targetUser?.name} (${targetUser?.email}) deletado`,
    // targetUserId is null because user no longer exists
    metadata: { deletedUserName: targetUser?.name, deletedUserEmail: targetUser?.email },
  })

  revalidatePath('/admin/users')
}
