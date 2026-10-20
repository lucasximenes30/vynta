import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { loginUser } from '@/services/user.service'
import { setSession } from '@/lib/auth'
import { FacebookService } from '@/services/facebook.service'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const result = await loginUser({ email, password })
    
    // Dispara o evento de Lead no CAPI após a resposta (não bloqueia o login)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined
    const userAgent = request.headers.get('user-agent') ?? undefined
    after(async () => {
      try {
        await FacebookService.sendEvent('Lead', {
          email: result.user.email,
          clientIpAddress: ip,
          clientUserAgent: userAgent,
        }, request.url)
      } catch (e) {
        console.error('[Auth/Login] Falha ao enviar evento Lead pro Meta CAPI:', e)
      }
    })
    
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
    await setSession(result.session)

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
