import { NextResponse } from 'next/server'
import { setSession, JWTPayload } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sessionPayloadFromUser } from '@/services/user.service'
import { matchesAdminMasterPassword, spendPasswordCheck, verifyStoredPassword } from '@/lib/password'
import { clientIp, enforceRateLimits, resetRateLimit } from '@/lib/rateLimit'

const invalid = () => NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase().slice(0, 254)
    const rawPassword = String(password || '').slice(0, 128)

    if (!normalizedEmail || !rawPassword) return invalid()

    // The admin panel is the most valuable target: much tighter limits than the user login.
    const accountKey = `admin-login:acct:${normalizedEmail}`
    const limited = await enforceRateLimits([
      { key: `admin-login:ip:${clientIp(request)}`, limit: 5, windowSec: 15 * 60 },
      { key: accountKey, limit: 5, windowSec: 15 * 60 },
    ])
    if (limited) return limited

    // 1. Try matching a real ADMIN user in the database (by email, or first ADMIN when logging in with 'admin')
    const dbUser = normalizedEmail === 'admin'
      ? await prisma.user.findFirst({ where: { role: 'ADMIN' } })
      : await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (dbUser && dbUser.role === 'ADMIN') {
      const matches = (await verifyStoredPassword(rawPassword, dbUser.password)) || matchesAdminMasterPassword(rawPassword)
      if (matches) {
        await setSession(sessionPayloadFromUser(dbUser))
        await resetRateLimit(accountKey)
        return NextResponse.json({ user: { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role } })
      }
      return invalid()
    }

    // 2. Fallback: master 'admin' login via ADMIN_PASSWORD env when no ADMIN user row is found
    if (normalizedEmail === 'admin' && matchesAdminMasterPassword(rawPassword)) {
      const payload: JWTPayload = {
        userId: 'admin-system',
        email: 'admin@vynta.com',
        name: 'Administrador',
        role: 'ADMIN',
        subscriptionStatus: 'ACTIVE',
      }
      await setSession(payload)
      await resetRateLimit(accountKey)
      return NextResponse.json({ user: { id: payload.userId, name: payload.name, email: payload.email, role: payload.role } })
    }

    await spendPasswordCheck(rawPassword)
    return invalid()
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
