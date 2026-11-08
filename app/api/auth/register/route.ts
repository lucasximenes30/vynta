import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { registerUser } from '@/services/user.service'
import { setSession } from '@/lib/auth'
import { FacebookService } from '@/services/facebook.service'
import { notifyAdminsNewAccount } from '@/services/push.service'
import { sendTrackedEmail, upsertBrevoContact } from '@/services/email.service'
import { welcomeEmail } from '@/lib/emailTemplates'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  document: z.string().min(11, 'CPF inválido').max(14).optional(),
  planTier: z.enum(['vip', 'pro', 'trial', 'pro_yearly']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, document } = registerSchema.parse(body)

    // Every new account starts on the free trial; plan choice/payment happens inside the app.
    const result = await registerUser({ name, email, password, document, planTier: 'trial' })
    const eventId = `reg_${result.user.id}`

    // Dispara o evento de CompleteRegistration no CAPI após a resposta (não bloqueia o fluxo)
    const capiIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined
    const userAgent = request.headers.get('user-agent') ?? undefined
    const fbp = request.cookies.get('_fbp')?.value
    const fbc = request.cookies.get('_fbc')?.value

    after(async () => {
      await Promise.all([
        sendTrackedEmail({ user: result.user, key: 'welcome', tag: 'welcome', build: () => welcomeEmail(result.user.name) }),
        upsertBrevoContact({ email: result.user.email, name: result.user.name, attributes: { PLANO: 'TRIAL' } }),
      ])

      try {
        await notifyAdminsNewAccount({
          userId: result.user.id,
          name: result.user.name,
          email: result.user.email,
        })
      } catch (e) {
        console.error('[Auth/Register] Falha ao enviar push admin:', e)
      }

      try {
        await FacebookService.sendEvent('CompleteRegistration', {
          email: result.user.email,
          externalId: result.user.id,
          eventId,
          clientIpAddress: capiIp,
          clientUserAgent: userAgent,
          fbp,
          fbc,
        }, 'https://www.vynta.digital/register')
      } catch (e) {
        console.error('[Auth/Register] Falha ao enviar evento pro Meta CAPI:', e)
      }
    })
    
    // ── Check if user can access (same logic as login) ──────────────────
    const isPaidActive = result.user.subscriptionStatus === 'ACTIVE'
    const isPrivileged = result.user.role === 'ADMIN' || result.user.role === 'COURTESY'
    
    console.log('[Auth/Register] User registration:', {
      email: result.user.email,
      role: result.user.role,
      subscriptionStatus: result.user.subscriptionStatus,
      isPaidActive,
      isPrivileged,
      canAccess: isPaidActive || isPrivileged,
    })
    
    // ── IMPORTANT: Set session for all registered users (active AND inactive) ──
    // Inactive users need a valid session to call /api/payments/create
    // The middleware will block dashboard access based on subscriptionStatus
    // The frontend will redirect inactive users to the unlock screen
    console.log(`[Auth/Register] Setting session for new user ${result.user.email}`)
    await setSession(result.session, result.token)

    // User has access (ACTIVE or privileged) - safe to redirect to dashboard
    return NextResponse.json({ success: true, user: result.user, eventId })
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
