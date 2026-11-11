import { offlineRecordId } from '@/lib/offlineMutation'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseISO, startOfDay, endOfDay } from 'date-fns'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')

    if (!startStr || !endStr) {
      return NextResponse.json({ error: 'Parâmetros start e end são obrigatórios' }, { status: 400 })
    }

    const startDate = parseISO(startStr)
    const endDate = parseISO(endStr)

    // Buscar CalendarEvents
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: session.userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    // Em implementações futuras, buscar treinos (WorkoutDayAssignment)
    // e Hábitos, formatá-los no formato de eventos e retornar aqui.
    // const workouts = await prisma.workoutDayAssignment.findMany(...)
    // const habits = await prisma.habitCheckin.findMany(...)

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json({ error: 'Erro interno ao buscar eventos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { title, description, date, startTime, endTime, isAllDay, category, color, isRecurring, recurrence } = data

    if (!title || !date) {
      return NextResponse.json({ error: 'Título e data são obrigatórios' }, { status: 400 })
    }

    const createData = {
      userId: session.userId,
      title,
      description,
      date: parseISO(date),
      startTime,
      endTime,
      isAllDay: isAllDay ?? false,
      category,
      color: color || 'bg-brand-500',
      isRecurring: isRecurring ?? false,
      recurrence,
    }
    const id = offlineRecordId(req, session.userId)
    const event = id
      ? await prisma.calendarEvent.upsert({ where: { id }, create: { ...createData, id }, update: {} })
      : await prisma.calendarEvent.create({ data: createData })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json({ error: 'Erro interno ao criar evento' }, { status: 500 })
  }
}
