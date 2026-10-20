import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import GoalsClient from './GoalsClient'

export const metadata: Metadata = {
  title: 'Metas Financeiras | Vynta',
  description: 'Acompanhe e alcance seus objetivos financeiros.',
}

export default async function GoalsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const goals = await prisma.financialGoal.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      transactions: {
        orderBy: { date: 'desc' }
      }
    }
  })

  // Same JSON shape returned by GET /api/goals
  return <GoalsClient initialGoals={JSON.parse(JSON.stringify(goals))} />
}
