import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { setSession, JWTPayload } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sessionPayloadFromUser } from '@/services/user.service'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const rawPassword = String(password || '')
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!normalizedEmail || !rawPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // 1. Try matching a real ADMIN user in the database (by email, or first ADMIN when logging in with 'admin')
    const dbUser = normalizedEmail === 'admin'
      ? await prisma.user.findFirst({ where: { role: 'ADMIN' } })
      : await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (dbUser && dbUser.role === 'ADMIN') {
      const isBcryptHash = /^\$2[aby]\$/.test(dbUser.password)
      const matchesUserPassword = isBcryptHash
        ? await compare(rawPassword, dbUser.password).catch(() => false)
        : dbUser.password === rawPassword
      const matchesEnvPassword = Boolean(adminPassword && rawPassword === adminPassword)

      if (matchesUserPassword || matchesEnvPassword) {
        const payload = sessionPayloadFromUser(dbUser)
        const token = await setSession(payload)

        return NextResponse.json({
          user: {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
          },
          token,
        })
      }
    }

    // 2. Fallback: master 'admin' login via ADMIN_PASSWORD env when no ADMIN user row is found
    if (normalizedEmail === 'admin' && adminPassword && rawPassword === adminPassword) {
      const payload: JWTPayload = {
        userId: 'admin-system',
        email: 'admin@vynta.com',
        name: 'Administrador',
        role: 'ADMIN',
        subscriptionStatus: 'ACTIVE',
      }

      const token = await setSession(payload)

      return NextResponse.json({
        user: {
          id: payload.userId,
          name: payload.name,
          email: payload.email,
          role: payload.role,
        },
        token,
      })
    }

    return NextResponse.json(
      { error: 'Credenciais inválidas' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
