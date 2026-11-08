import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPromoEligibility } from '@/services/subscription.service'
import UnlockClient from './UnlockClient'

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ state?: string, feature?: string }> }) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  const { state, feature } = await searchParams
  const promoEligible = session.plan === 'FREE_TRIAL' && (await getPromoEligibility(session.userId))

  return <UnlockClient session={session} state={state} feature={feature} promoEligible={promoEligible} />
}
