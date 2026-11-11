import { z } from 'zod'

const transactionDate = z.union([z.iso.date(), z.iso.datetime({ offset: true })])
  .refine((value) => Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2100, 'Data fora do período permitido')

/** Bound values that drive financial loops as well as their database representation. */
export const transactionInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  amount: z.number().positive().max(999_999_999),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1).max(60),
  date: transactionDate,
  purchaseDate: transactionDate.nullish(),
  totalInstallments: z.number().int().min(1).max(600).nullish(),
  isInstallment: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().int().min(1).max(31).nullish(),
  dueDay: z.number().int().min(1).max(31).nullish(),
  cardId: z.string().uuid().nullish(),
  paymentMethod: z.string().max(60).nullish(),
})
