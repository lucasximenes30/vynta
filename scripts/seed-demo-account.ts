// Demo account used for the landing page screenshots (no real person's data on the marketing site).
// Usage: DEMO_PASSWORD='...' npx tsx --env-file=.env scripts/seed-demo-account.ts
// Re-running wipes ONLY this demo account and recreates it with dates relative to today.
import { hash } from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { SALT_ROUNDS } from '../lib/constants'

const EMAIL = 'demo@vynta.digital'
const NAME = 'Marina Costa'

const today = new Date()
const Y = today.getFullYear()
const M = today.getMonth()
const pad = (n: number) => String(n).padStart(2, '0')
/** Transaction date convention: `<local day>T12:00:00Z`. */
const day = (monthOffset: number, d: number) => {
  const dt = new Date(Date.UTC(Y, M + monthOffset, d, 12))
  return dt
}
/** Calendar convention: midnight UTC of the local day. */
const calDay = (offsetDays: number) => new Date(Date.UTC(Y, M, today.getDate() + offsetDays))
const dateKey = (offsetDays: number) => {
  const d = new Date(Y, M, today.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function main() {
  const password = process.env.DEMO_PASSWORD
  if (!password || password.length < 12) throw new Error('Defina DEMO_PASSWORD (mín. 12 caracteres)')

  await prisma.user.deleteMany({ where: { email: EMAIL } })

  const user = await prisma.user.create({
    data: {
      name: NAME,
      email: EMAIL,
      password: await hash(password, SALT_ROUNDS),
      role: 'COURTESY',
      plan: 'COURTESY',
      subscriptionStatus: 'ACTIVE',
      canUseFinance: true, canUseHabits: true, canUseWorkout: true, canUseGoals: true, canUseNotes: true, canUseAgenda: true,
      hasWorkoutModule: true,
      hasSeenDashboard: true,
      tourCompletedAt: new Date(),
      emailOptOut: true,
      lastSeenAt: new Date(),
      createdAt: day(-3, 1),
    },
  })
  const userId = user.id
  await prisma.notificationPreference.create({ data: { userId } })

  const card = await prisma.card.create({
    data: { userId, name: 'Nubank', lastFourDigits: '4821', closingDay: 3, dueDay: 10, color: 'purple', limitAmount: 8000, provider: 'nubank' },
  })

  type Tx = Parameters<typeof prisma.transaction.create>[0]['data']
  const tx: Omit<Tx, 'user'>[] = [
    // Salário: recorrente no 5º dia útil (salarySlot 1), a partir de 3 meses atrás
    { title: 'Salário', amount: 6200, type: 'INCOME', category: 'Salary', date: day(-3, 1), isRecurring: true, recurringDay: 5, payDayType: 'business_day', salarySlot: 1 },
    { title: 'Freela landing page', amount: 1200, type: 'INCOME', category: 'Freelance', date: day(-1, 15) },
    { title: 'Freela identidade visual', amount: 850, type: 'INCOME', category: 'Freelance', date: day(0, 3) },

    // Fixos
    { title: 'Aluguel', amount: 1650, type: 'EXPENSE', category: 'Home', date: day(-3, 1), isRecurring: true, recurringDay: 5 },
    { title: 'Internet', amount: 99.9, type: 'EXPENSE', category: 'Bills', date: day(-3, 1), isRecurring: true, recurringDay: 15 },
    { title: 'Academia', amount: 119.9, type: 'EXPENSE', category: 'Gym', date: day(-3, 1), isRecurring: true, recurringDay: 8 },
    { title: 'Conta de luz', amount: 187.4, type: 'EXPENSE', category: 'Bills', date: day(0, 18) },
    { title: 'Conta de luz', amount: 171.2, type: 'EXPENSE', category: 'Bills', date: day(-1, 18) },

    // Cartão
    { title: 'Notebook', amount: 3890, installmentAmount: 389, type: 'EXPENSE', category: 'Shopping', date: day(-2, 22), purchaseDate: day(-2, 22), isInstallment: true, totalInstallments: 10, cardId: card.id },
    { title: 'Streaming', amount: 44.9, type: 'EXPENSE', category: 'Entertainment', date: day(-3, 12), isRecurring: true, recurringDay: 12, cardId: card.id },
    { title: 'Spotify', amount: 21.9, type: 'EXPENSE', category: 'Entertainment', date: day(-3, 20), isRecurring: true, recurringDay: 20, cardId: card.id },
    { title: 'iFood', amount: 58.7, type: 'EXPENSE', category: 'Restaurant', date: day(0, 4), cardId: card.id },
    { title: 'Uber', amount: 24.3, type: 'EXPENSE', category: 'Transport', date: day(0, 6), cardId: card.id },
    { title: 'Tênis de corrida', amount: 429.9, type: 'EXPENSE', category: 'Shopping', date: day(-1, 9), cardId: card.id },
    { title: 'iFood', amount: 46.2, type: 'EXPENSE', category: 'Restaurant', date: day(-1, 21), cardId: card.id },

    // Dia a dia (débito/Pix)
    { title: 'Mercado', amount: 312.45, type: 'EXPENSE', category: 'Food', date: day(0, 2) },
    { title: 'Padaria', amount: 18.5, type: 'EXPENSE', category: 'Food', date: day(0, 7) },
    { title: 'Farmácia', amount: 64.8, type: 'EXPENSE', category: 'Health', date: day(0, 8) },
    { title: 'Uber', amount: 32.5, type: 'EXPENSE', category: 'Transport', date: day(0, Math.max(1, today.getDate() - 1)) },
    { title: 'Mercado', amount: 286.1, type: 'EXPENSE', category: 'Food', date: day(-1, 3) },
    { title: 'Mercado', amount: 241.75, type: 'EXPENSE', category: 'Food', date: day(-1, 17) },
    { title: 'Cinema', amount: 62, type: 'EXPENSE', category: 'Entertainment', date: day(-1, 25) },
    { title: 'Curso de inglês', amount: 189, type: 'EXPENSE', category: 'Education', date: day(-1, 10) },
    { title: 'Restaurante', amount: 134, type: 'EXPENSE', category: 'Restaurant', date: day(-1, 12) },
    { title: 'Mercado', amount: 298.9, type: 'EXPENSE', category: 'Food', date: day(-2, 4) },
    { title: 'Gasolina', amount: 180, type: 'EXPENSE', category: 'Transport', date: day(-2, 14) },
    { title: 'Presente aniversário', amount: 120, type: 'EXPENSE', category: 'Shopping', date: day(-2, 27) },
  ]
  // createdAt = date: the salary only counts from the month it was configured (recurringStartRef)
  for (const data of tx) await prisma.transaction.create({ data: { ...data, userId, createdAt: data.date } as Tx })

  // Hábitos com sequência realista (alguns dias falhados)
  const habits = [
    { title: 'Beber 2L de água', icon: 'Droplets', color: 'cyan', skip: [5, 12] },
    { title: 'Ler 20 minutos', icon: 'BookOpen', color: 'purple', skip: [2, 6, 9, 15] },
    { title: 'Treinar', icon: 'Dumbbell', color: 'orange', skip: [1, 3, 5, 8, 10, 12, 15, 17] },
    { title: 'Sem gastos por impulso', icon: 'Target', color: 'green', skip: [11] },
  ]
  for (const [order, h] of habits.entries()) {
    const habit = await prisma.habit.create({ data: { userId, title: h.title, icon: h.icon, color: h.color, order } })
    const checkins = []
    // Hoje (0) fica em aberto para 2 hábitos, mostrando o lembrete da noite
    for (let i = order < 2 ? 0 : 1; i <= 20; i++) if (!h.skip.includes(i)) checkins.push({ habitId: habit.id, date: dateKey(-i) })
    await prisma.habitCheckin.createMany({ data: checkins })
  }

  // Agenda
  const events = [
    { title: 'Academia', offset: 0, startTime: '07:00', endTime: '08:00', color: 'bg-orange-500', category: 'Saúde' },
    { title: 'Reunião com cliente', offset: 0, startTime: '14:30', endTime: '15:30', color: 'bg-blue-500', category: 'Trabalho' },
    { title: 'Dentista', offset: 2, startTime: '10:00', endTime: '11:00', color: 'bg-pink-500', category: 'Saúde' },
    { title: 'Entrega do freela', offset: 4, startTime: '18:00', endTime: null, color: 'bg-violet-500', category: 'Trabalho' },
    { title: 'Jantar com a família', offset: 5, startTime: '20:00', endTime: '22:00', color: 'bg-emerald-500', category: 'Pessoal' },
    { title: 'Aula de inglês', offset: 1, startTime: '19:00', endTime: '20:00', color: 'bg-indigo-500', category: 'Estudos' },
    { title: 'Revisar orçamento do mês', offset: 8, startTime: '09:00', endTime: null, color: 'bg-brand-500', category: 'Finanças' },
  ]
  for (const e of events) {
    await prisma.calendarEvent.create({ data: { userId, title: e.title, date: calDay(e.offset), startTime: e.startTime, endTime: e.endTime, color: e.color, category: e.category } })
  }

  // Metas
  const travel = await prisma.financialGoal.create({
    data: { userId, title: 'Viagem para o Chile', targetAmount: 6000, currentAmount: 3720, category: 'Viagem', color: 'bg-blue-500', deadline: day(7, 1) },
  })
  const reserve = await prisma.financialGoal.create({
    data: { userId, title: 'Reserva de emergência', targetAmount: 15000, currentAmount: 8400, category: 'Reserva de Emergência', color: 'bg-emerald-500', deadline: day(12, 1) },
  })
  await prisma.financialGoal.create({
    data: { userId, title: 'Curso de UX', targetAmount: 1800, currentAmount: 1350, category: 'Educação', color: 'bg-violet-500', deadline: day(2, 1) },
  })
  await prisma.goalTransaction.createMany({
    data: [
      { goalId: travel.id, amount: 3000, date: day(-2, 6), description: 'Valor inicial' },
      { goalId: travel.id, amount: 420, date: day(-1, 6), description: 'Depósito do mês' },
      { goalId: travel.id, amount: 300, date: day(0, 6), description: 'Depósito do mês' },
      { goalId: reserve.id, amount: 7600, date: day(-2, 6), description: 'Valor inicial' },
      { goalId: reserve.id, amount: 800, date: day(0, 6), description: 'Depósito do mês' },
    ],
  })

  // Notas
  await prisma.note.createMany({
    data: [
      { userId, title: 'Roteiro do Chile', content: 'Santiago 4 dias, Valle Nevado 1 dia, San Pedro de Atacama 3 dias. Ver passagem em março.', category: 'Viagem', isPinned: true, color: 'brand', financialGoalId: travel.id },
      { userId, title: 'Ideias de economia', content: 'Cancelar 1 streaming, levar marmita 3x por semana, comparar plano de celular.', category: 'Finanças', color: 'emerald' },
      { userId, title: 'Livros do mês', content: 'Hábitos Atômicos (terminar), Psicologia Financeira (começar).', category: 'Leitura' },
    ],
  })

  // Treino A/B/C com exercícios do catálogo
  const pick = async (names: string[]) => {
    const rows = await prisma.exercise.findMany({ where: { isSystem: true, namePt: { in: names } }, select: { id: true, namePt: true } })
    return names.map((n) => rows.find((r) => r.namePt === n)).filter(Boolean) as { id: string }[]
  }
  const plan = await prisma.workoutPlan.create({ data: { userId, name: 'Hipertrofia ABC' } })
  const days = [
    { name: 'Treino A — Peito e tríceps', weekDay: 1, ex: ['Supino reto', 'Supino inclinado', 'Crucifixo com halteres', 'Extensao de triceps no cabo'], weight: [40, 32, 14, 25] },
    { name: 'Treino B — Costas e bíceps', weekDay: 3, ex: ['Puxada alta aberta', 'Remada maquina', 'Rosca Scott', 'Rosca Alternada com Halteres'], weight: [50, 45, 20, 12] },
    { name: 'Treino C — Pernas e ombros', weekDay: 5, ex: ['Agachamento Livre', 'Leg press', 'Elevacao lateral', 'Panturrilha em pe'], weight: [60, 140, 8, 40] },
  ]
  for (const [order, d] of days.entries()) {
    const wd = await prisma.workoutDay.create({ data: { planId: plan.id, name: d.name, order, weekDay: d.weekDay } })
    const exercises = await pick(d.ex)
    await prisma.workoutDayExercise.createMany({
      data: exercises.map((e, i) => ({ workoutDayId: wd.id, exerciseId: e.id, order: i, sets: 4, reps: i < 2 ? '8-10' : '12', targetWeight: d.weight[i] })),
    })
  }

  console.log(`Conta demo pronta: ${EMAIL} (${userId})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
