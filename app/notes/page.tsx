import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import NotesClient from './NotesClient'

export const metadata: Metadata = {
  title: 'Smart Notes | Vynta',
  description: 'Anotações rápidas e integradas ao seu ecosistema.',
}

export default async function NotesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const notes = await prisma.note.findMany({
    where: { userId: session.userId },
    orderBy: [
      { isPinned: 'desc' },
      { updatedAt: 'desc' }
    ]
  })

  // Same JSON shape returned by GET /api/notes
  return <NotesClient initialNotes={JSON.parse(JSON.stringify(notes))} />
}
