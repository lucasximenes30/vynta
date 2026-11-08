import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPromoEligibility } from '@/services/subscription.service'
import SubscriptionClient from './SubscriptionClient'

export default async function SubscriptionPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  if (session.role === 'ADMIN' || session.role === 'COURTESY') redirect('/dashboard')

  // Se já for PRO ou PRO_YEARLY, não precisa de upgrade, redireciona pro dashboard
  // (exceto quem está no mês promocional avulso: esse precisa poder assinar o plano recorrente)
  if (session.plan === 'PRO' || session.plan === 'PRO_YEARLY') {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { subscriptionId: true } })
    if (!user?.subscriptionId?.startsWith('promo_')) redirect('/dashboard')
    return <SubscriptionClient session={session} promoEligible={false} onPromoMonth />
  }

  return <SubscriptionClient session={session} promoEligible={await getPromoEligibility(session.userId)} />
}
