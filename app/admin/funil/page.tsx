import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { buildFunnelPayload } from '@/services/admin/funnel.admin.service'
import FunnelClient from './FunnelClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Funil de Conversão - Vynta Ops',
}

export default async function FunnelPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/admin/login')
  }

  const initialPayload = await buildFunnelPayload('all')

  return <FunnelClient initialPayload={initialPayload} />
}
