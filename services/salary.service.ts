import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export interface SalaryPaymentInput {
  amount: number
  /** Day-of-month for 'fixed', or Nth business day for 'business_day' */
  day: number
  payDayType: 'fixed' | 'business_day'
}

export interface SalaryPayment {
  id: string
  slot: number
  amount: number
  day: number
  payDayType: 'fixed' | 'business_day'
}

/** Salary config = recurring INCOME transactions flagged with salarySlot (1|2). */
export async function getSalaryConfig(userId: string): Promise<SalaryPayment[]> {
  const txs = await prisma.transaction.findMany({
    where: { userId, salarySlot: { not: null }, type: 'INCOME' },
    orderBy: { salarySlot: 'asc' },
  })
  return txs.map((t) => ({
    id: t.id,
    slot: t.salarySlot!,
    amount: Number(t.amount),
    day: t.recurringDay ?? 1,
    payDayType: t.payDayType === 'business_day' ? 'business_day' : 'fixed',
  }))
}

/**
 * Replaces the salary schedule. Existing slots are updated in place (preserving
 * the original start date so past months keep counting); missing slots are
 * created starting at the current month; extra slots are removed.
 */
export async function setSalaryConfig(userId: string, payments: SalaryPaymentInput[]) {
  if (payments.length < 1 || payments.length > 2) {
    throw new Error('Configure 1 (mensal) ou 2 (quinzenal) pagamentos')
  }
  for (const p of payments) {
    if (!(p.amount > 0) || !(p.day >= 1)) {
      throw new Error('Pagamento inválido')
    }
    if (p.payDayType === 'business_day' && p.day > 22) {
      throw new Error('Dia útil deve ser entre 1 e 22')
    }
    if (p.payDayType !== 'business_day' && p.day > 31) {
      throw new Error('Dia deve ser entre 1 e 31')
    }
  }

  const existing = await prisma.transaction.findMany({
    where: { userId, salarySlot: { not: null } },
  })

  const now = new Date()
  // Recurring income counts from `date` onward — start of the current month so
  // the salary the user just configured already applies to this month.
  const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 12, 0, 0))
  const titles = payments.length === 2 ? ['Salário (1ª quinzena)', 'Salário (2ª quinzena)'] : ['Salário']

  await prisma.$transaction(async (tx) => {
    for (const old of existing) {
      if (!payments[old.salarySlot! - 1]) {
        await tx.transaction.delete({ where: { id: old.id } })
      }
    }
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i]
      const slot = i + 1
      const found = existing.find((e) => e.salarySlot === slot)
      const data = {
        title: titles[i],
        amount: new Decimal(p.amount),
        type: 'INCOME' as const,
        category: 'Salary',
        isRecurring: true,
        recurringDay: p.day,
        payDayType: p.payDayType,
        salarySlot: slot,
        isActive: true,
        isInstallment: false,
        endDate: null,
        cardId: null,
      }
      if (found) {
        await tx.transaction.update({ where: { id: found.id }, data })
      } else {
        await tx.transaction.create({ data: { ...data, date: startDate, userId } })
      }
    }
  })
}

export async function clearSalaryConfig(userId: string) {
  await prisma.transaction.deleteMany({
    where: { userId, salarySlot: { not: null } },
  })
}
