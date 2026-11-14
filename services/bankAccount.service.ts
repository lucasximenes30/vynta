import { prisma } from '@/lib/prisma'
import { Prisma, type BankAccount } from '@prisma/client'
import { z } from 'zod'
import { financialToday } from '@/lib/financialPeriod'
import type { BankAccountView } from '@/lib/bankAccounts'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data do saldo').refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`)
  const today = financialToday()
  const limit = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= limit
}, 'Use uma data válida, até hoje')

export const bankAccountSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da conta').max(60),
  balanceCents: z.number().int().min(-999_999_999_999).max(999_999_999_999),
  balanceDate: dateSchema,
  isPrimary: z.boolean(),
}).strict()

export class BankAccountError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

function view(row: BankAccount): BankAccountView {
  return { id: row.id, name: row.name, balanceCents: Math.round(Number(row.balance) * 100), balanceDate: row.balanceDate.toISOString().slice(0, 10), isPrimary: row.isPrimary }
}

export async function getBankAccounts(userId: string): Promise<BankAccountView[]> {
  return (await prisma.bankAccount.findMany({ where: { userId }, orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] })).map(view)
}

export async function saveBankAccount(userId: string, input: unknown, id?: string) {
  const data = bankAccountSchema.parse(input)
  return prisma.$transaction(async tx => {
    // Serialize all mutations for this owner, including concurrent first-account creation.
    // No credential fields are selected and no User record is changed.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
    const rows = await tx.bankAccount.findMany({ where: { userId } })
    const existing = id ? rows.find(row => row.id === id) : undefined
    if (id && !existing) throw new BankAccountError('Conta não encontrada', 404)
    if (!id && rows.length >= 20) throw new BankAccountError('Você pode cadastrar até 20 contas', 400)
    if (rows.some(row => row.id !== id && row.name.toLocaleLowerCase('pt-BR') === data.name.toLocaleLowerCase('pt-BR'))) throw new BankAccountError('Já existe uma conta com esse nome', 409)
    // A primary account stays primary until another one explicitly takes its place.
    const isPrimary = data.isPrimary || rows.length === 0 || Boolean(existing?.isPrimary)
    if (isPrimary) await tx.bankAccount.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } })
    const values = { name: data.name, balance: new Prisma.Decimal(data.balanceCents).dividedBy(100), balanceDate: new Date(`${data.balanceDate}T12:00:00Z`), isPrimary }
    const row = id
      ? await tx.bankAccount.update({ where: { id, userId }, data: values })
      : await tx.bankAccount.create({ data: { ...values, userId } })
    return view(row)
  })
}

export async function removeBankAccount(userId: string, id: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
    const existing = await tx.bankAccount.findFirst({ where: { id, userId } })
    if (!existing) throw new BankAccountError('Conta não encontrada', 404)
    await tx.bankAccount.delete({ where: { id, userId } })
    if (existing.isPrimary) {
      const next = await tx.bankAccount.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })
      if (next) await tx.bankAccount.update({ where: { id: next.id, userId }, data: { isPrimary: true } })
    }
  })
}
