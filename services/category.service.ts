import { prisma } from '@/lib/prisma'
import { cache } from 'react'

export interface CreateCategoryInput {
  name: string
  icon: string
  color: string
  userId: string
}

export const getUserCategories = cache(async (userId: string) => {
  const defaults = await prisma.category.findMany({
    where: { userId: null },
    orderBy: { name: 'asc' },
  })

  const custom = await prisma.category.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return { defaults, custom }
})

export async function createCategory(input: CreateCategoryInput) {
  return prisma.category.create({
    data: {
      name: input.name,
      icon: input.icon,
      color: input.color,
      userId: input.userId,
    },
  })
}

export async function seedDefaultCategories() {
  const existing = await prisma.category.findFirst({ where: { userId: null } })
  if (existing) return

  await prisma.category.createMany({
    data: [
      { name: 'Food', icon: 'Utensils', color: '#f43f5e' },
      { name: 'Transport', icon: 'Car', color: '#f59e0b' },
      { name: 'Entertainment', icon: 'Clapperboard', color: '#8b5cf6' },
      { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899' },
      { name: 'Bills', icon: 'Receipt', color: '#3b82f6' },
      { name: 'Health', icon: 'HeartPulse', color: '#10b981' },
      { name: 'General', icon: 'MoreHorizontal', color: '#6b7280' },
      { name: 'Salary', icon: 'Wallet', color: '#22c55e' },
      { name: 'Freelance', icon: 'Laptop', color: '#06b6d4' },
      { name: 'Investment', icon: 'TrendingUp', color: '#a855f7' },
      { name: 'Gym', icon: 'Dumbbell', color: '#f97316' },
      { name: 'Education', icon: 'GraduationCap', color: '#6366f1' },
      { name: 'Restaurant', icon: 'Coffee', color: '#d946ef' },
      { name: 'Home', icon: 'House', color: '#14b8a6' },
    ],
  })
}
