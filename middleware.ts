import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

const protectedRoutes = ['/dashboard', '/habits', '/reports', '/cards', '/workout', '/goals', '/notes', '/calendar', '/finances', '/settings']
const publicRoutes = ['/', '/login', '/register', '/sucesso', '/esqueci-a-senha', '/unlock']

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value
  const path = request.nextUrl.pathname

  // If the user installed the PWA from the landing page ("/") before logging in, iOS bookmarks "/"
  // as the home screen URL. Redirect authenticated users straight to /dashboard at the edge so cold
  // starts never render the marketing landing page first.
  if (path === '/' && sessionToken) {
    const session = await verifyToken(sessionToken)
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route))
  const isAdminRoute = path.startsWith('/admin') && !path.startsWith('/admin/login')
  const isForcePasswordRoute = path === '/force-password-change'

  if (isAdminRoute) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const session = await verifyToken(sessionToken)
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (isProtectedRoute || isForcePasswordRoute) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    const session = await verifyToken(sessionToken)
    
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Handle force password change flow
    if (session.forcePasswordChange && !isForcePasswordRoute && !isAdminRoute) {
      return NextResponse.redirect(new URL('/force-password-change', request.url))
    }
    
    if (!session.forcePasswordChange && isForcePasswordRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (isProtectedRoute) {
      let isExpired = false;
      let currentState = 'active';
      
      if (session.plan === 'FREE_TRIAL') {
        const now = Date.now();
        
        if (session.subscriptionExpiresAt) {
          const expiresAt = new Date(session.subscriptionExpiresAt as string).getTime();
          if (now > expiresAt) {
            isExpired = true;
            currentState = 'trial_expired';
          }
        } else if (session.createdAt) {
          // Fallback para usuários antigos do trial de 3 dias que ainda não têm subscriptionExpiresAt na sessão
          const createdAt = new Date(session.createdAt as string).getTime();
          const oneDayInMs = 24 * 60 * 60 * 1000;
          if (now > createdAt + oneDayInMs) {
            isExpired = true;
            currentState = 'trial_expired';
          }
        }
      } else if (session.plan === 'VIP' || session.plan === 'PRO' || session.plan === 'PRO_YEARLY') {
         if (session.subscriptionStatus === 'INACTIVE' || session.subscriptionStatus === 'PENDING') {
            isExpired = true;
            currentState = 'payment_pending';
         } else if (session.subscriptionStatus === 'PAST_DUE' || session.subscriptionStatus === 'CANCELED' || session.subscriptionStatus === 'EXPIRED') {
            isExpired = true;
            currentState = 'expired';
         } else if (session.subscriptionEndDate) {
            const endDate = new Date(session.subscriptionEndDate as string).getTime();
            if (Date.now() > endDate) {
               isExpired = true;
               currentState = 'expired';
            }
         }
      } else if (session.plan === 'FREE') {
        isExpired = true;
        currentState = 'expired';
      }

      const isPaidActive = session.subscriptionStatus === 'ACTIVE' && !isExpired;
      const isPrivileged = session.role === 'COURTESY' || session.role === 'ADMIN' || session.plan === 'COURTESY' || session.plan === 'ADMIN';

      if (!isPaidActive && !isPrivileged) {
        return NextResponse.redirect(new URL(`/unlock?state=${currentState}`, request.url))
      }

      // Feature Flags Check
      if (!isPrivileged) {
        if (path.startsWith('/goals') && !session.canUseGoals) {
          return NextResponse.redirect(new URL('/unlock?feature=goals', request.url))
        }
        if (path.startsWith('/notes') && !session.canUseNotes) {
          return NextResponse.redirect(new URL('/unlock?feature=notes', request.url))
        }
        if (path.startsWith('/calendar') && !session.canUseAgenda) {
          return NextResponse.redirect(new URL('/unlock?feature=agenda', request.url))
        }
        if ((path.startsWith('/finances') || path.startsWith('/cards')) && !session.canUseFinance) {
          return NextResponse.redirect(new URL('/unlock?feature=finance', request.url))
        }
        if (path.startsWith('/habits') && !session.canUseHabits) {
          return NextResponse.redirect(new URL('/unlock?feature=habits', request.url))
        }
        if (path.startsWith('/workout') && !session.canUseWorkout) {
          return NextResponse.redirect(new URL('/unlock?feature=workout', request.url))
        }
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/habits/:path*', '/reports/:path*', '/cards/:path*', '/workout/:path*', '/admin/:path*', '/force-password-change', '/goals/:path*', '/notes/:path*', '/calendar/:path*', '/finances/:path*'],
}
