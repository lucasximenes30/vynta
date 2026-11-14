import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getReportSnapshot } from '@/services/transaction.service'
import ReportsClient from './ReportsClient'
import { financialToday } from '@/lib/financialPeriod'
export const metadata: Metadata = { title: 'Relatórios' }
export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const now = financialToday()
  const report = await getReportSnapshot(session.userId, now.getFullYear(), now.getMonth() + 1)
  return <ReportsClient initialReport={report} />
}
