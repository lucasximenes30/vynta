import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { findLoginUser, loginUser } from '@/services/user.service'
import { setSession } from '@/lib/auth'
import { clientIp, enforceRateLimits, resetRateLimit } from '@/lib/rateLimit'

const loginSchema = z.object({
  email: z.string().email('Invalid email').max(254),
  password: z.string().min(1, 'Password is required').max(128),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Per IP (credential stuffing from one machine) and per account (distributed brute force).
    const accountKey = `login:acct:${email.trim().toLowerCase()}`
    // The account lookup runs alongside the rate-limit check (one DB round trip instead of two);
    // the password is only verified after the limit passes.
    const userLookup = findLoginUser(email)
    userLookup.catch(() => {})
    const limited = await enforceRateLimits([
      { key: `login:ip:${clientIp(request)}`, limit: 20, windowSec: 15 * 60 },
      { key: accountKey, limit: 8, windowSec: 15 * 60 },
    ])
    if (limited) return limited

    const result = await loginUser({ email, password }, userLookup)
    after(() => resetRateLimit(accountKey))
    
    // ── Check account status before setting session ──────────────────────
    const isPaidActive = result.user.subscriptionStatus === 'ACTIVE'
    const isPrivileged = result.user.role === 'ADMIN' || result.user.role === 'COURTESY'
    
    console.log('[Auth/Login] User authentication:', {
      email: result.user.email,
      subscriptionStatus: result.user.subscriptionStatus,
      role: result.user.role,
      isPaidActive,
      isPrivileged,
      canAccess: isPaidActive || isPrivileged,
    })
    
    // ── IMPORTANT: Set session for all authenticated users (active AND inactive) ──
    // Inactive users need a valid session to call /api/payments/create
    // The middleware will block dashboard access based on subscriptionStatus
    // The frontend will redirect inactive users to the unlock screen
    console.log(`[Auth/Login] Setting session for user ${result.user.email}`)
    await setSession(result.session, result.token)

    // If user is inactive and not privileged, return inactive status
    // Frontend will redirect them to unlock screen instead of dashboard
    if (!isPaidActive && !isPrivileged) {
      console.log(`[Auth/Login] User ${result.user.email} is INACTIVE - frontend will show unlock screen`)
      return NextResponse.json(
        {
          success: false,
          error: 'Sua conta está inativa. Finalize o pagamento para liberar seu acesso.',
          status: 'inactive',
          user: result.user,
        },
        { status: 200 },
      )
    }

    // User is active or privileged - safe to redirect to dashboard
    console.log(`[Auth/Login] User ${result.user.email} granted dashboard access (ACTIVE: ${isPaidActive}, Privileged: ${isPrivileged})`)
    return NextResponse.json({ success: true, user: result.user })
  } catch (error: any) {
    const message = error instanceof z.ZodError
      ? error.errors[0]?.message ?? 'Invalid input'
      : error.message ?? 'Something went wrong'

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
