import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import SubscriptionClient from './SubscriptionClient'

export default async function SubscriptionPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  // Se já for PRO, PRO_YEARLY ou ADMIN/COURTESY, não precisa de upgrade, redireciona pro dashboard
  if (
    session.plan === 'PRO' ||
    session.plan === 'PRO_YEARLY' ||
    session.role === 'ADMIN' ||
    session.role === 'COURTESY'
  ) {
    redirect('/dashboard')
  }

  return <SubscriptionClient session={session} />
}
