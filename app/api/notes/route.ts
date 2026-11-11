import { offlineRecordId } from '@/lib/offlineMutation'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const notes = await prisma.note.findMany({
      where: { userId: session.userId },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json(notes)
  } catch (error: any) {
    console.error('Erro ao buscar notas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { title, content, category, color, isPinned, financialGoalId, eventId, transactionId } = data

    if (!content) {
      return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 })
    }

    const createData = {
      userId: session.userId,
      title,
      content,
      category,
      color: color || 'default',
      isPinned: isPinned || false,
      financialGoalId,
      eventId,
      transactionId
    }
    const id = offlineRecordId(req, session.userId)
    const note = id
      ? await prisma.note.upsert({ where: { id }, create: { ...createData, id }, update: {} })
      : await prisma.note.create({ data: createData })

    return NextResponse.json(note)
  } catch (error: any) {
    console.error('Erro ao criar nota:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
