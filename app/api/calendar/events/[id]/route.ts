import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from 'date-fns'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const data = await req.json()
    
    // Verifica se o evento pertence ao usuário
    const existing = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        description: data.description !== undefined ? data.description : existing.description,
        date: data.date ? parseISO(data.date) : existing.date,
        startTime: data.startTime !== undefined ? data.startTime : existing.startTime,
        endTime: data.endTime !== undefined ? data.endTime : existing.endTime,
        isAllDay: data.isAllDay !== undefined ? data.isAllDay : existing.isAllDay,
        category: data.category !== undefined ? data.category : existing.category,
        color: data.color !== undefined ? data.color : existing.color,
        isRecurring: data.isRecurring !== undefined ? data.isRecurring : existing.isRecurring,
        recurrence: data.recurrence !== undefined ? data.recurrence : existing.recurrence,
        reminders: Array.isArray(data.reminders) ? data.reminders.filter((r: unknown) => Number.isInteger(r)).slice(0, 8) : existing.reminders,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating calendar event:', error)
    return NextResponse.json({ error: 'Erro interno ao atualizar evento' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    
    const existing = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    }

    await prisma.calendarEvent.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json({ error: 'Erro interno ao deletar evento' }, { status: 500 })
  }
}
