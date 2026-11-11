'use client'

import { useState, useEffect, useRef } from 'react'

import * as Lucide from 'lucide-react'
import ManageCategoriesModal from './ManageCategoriesModal'
import { localizeCategoryName } from '@/lib/categories'

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface CategorySelectProps {
  value: string
  onChange: (name: string) => void
  type: 'INCOME' | 'EXPENSE'
}

const CATEGORY_DEFAULTS: Record<string, { icon: string; color: string }> = {
  Food: { icon: 'Utensils', color: '#f43f5e' },
  Transport: { icon: 'Car', color: '#f59e0b' },
  Entertainment: { icon: 'Clapperboard', color: '#8b5cf6' },
  Shopping: { icon: 'ShoppingBag', color: '#ec4899' },
  Bills: { icon: 'Receipt', color: '#3b82f6' },
  Health: { icon: 'HeartPulse', color: '#10b981' },
  General: { icon: 'MoreHorizontal', color: '#6b7280' },
  Salary: { icon: 'Wallet', color: '#22c55e' },
  Freelance: { icon: 'Laptop', color: '#06b6d4' },
  Investment: { icon: 'TrendingUp', color: '#a855f7' },
  Other: { icon: 'MoreHorizontal', color: '#6b7280' },
  Gym: { icon: 'Dumbbell', color: '#f97316' },
  Education: { icon: 'GraduationCap', color: '#6366f1' },
  Restaurant: { icon: 'Coffee', color: '#d946ef' },
  Home: { icon: 'House', color: '#14b8a6' },
}

const LUCIDE_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Utensils: Lucide.Utensils, Car: Lucide.Car, Clapperboard: Lucide.Clapperboard,
  ShoppingBag: Lucide.ShoppingBag, Receipt: Lucide.Receipt, HeartPulse: Lucide.HeartPulse,
  MoreHorizontal: Lucide.MoreHorizontal, Wallet: Lucide.Wallet, Laptop: Lucide.Laptop,
  TrendingUp: Lucide.TrendingUp, Dumbbell: Lucide.Dumbbell, Coffee: Lucide.Coffee,
  House: Lucide.House, GraduationCap: Lucide.GraduationCap, Bus: Lucide.Bus,
  Train: Lucide.Train, Plane: Lucide.Plane, Hotel: Lucide.Hotel, Smartphone: Lucide.Smartphone,
  Wifi: Lucide.Wifi, Fuel: Lucide.Fuel, ShoppingCart: Lucide.ShoppingCart,
  Shirt: Lucide.Shirt, Baby: Lucide.Baby, Dog: Lucide.Dog, Cat: Lucide.Cat,
  Stethoscope: Lucide.Stethoscope, Pill: Lucide.Pill, Scissors: Lucide.Scissors,
  Wrench: Lucide.Wrench, Book: Lucide.Book, Cake: Lucide.Cake, Beer: Lucide.Beer,
  Briefcase: Lucide.Briefcase, PiggyBank: Lucide.PiggyBank, Gift: Lucide.Gift,
  Banknote: Lucide.Banknote, Building: Lucide.Building, Landmark: Lucide.Landmark,
  Coins: Lucide.Coins, Gem: Lucide.Gem, Award: Lucide.Award, Star: Lucide.Star,
  Zap: Lucide.Zap, Rocket: Lucide.Rocket, HeartHandshake: Lucide.HeartHandshake,
  FileText: Lucide.FileText, Shield: Lucide.Shield, Package: Lucide.Package,
  Clock: Lucide.Clock, Sparkles: Lucide.Sparkles, Crown: Lucide.Crown,
  Flame: Lucide.Flame, Leaf: Lucide.Leaf, Music: Lucide.Music, Camera: Lucide.Camera,
  Palette: Lucide.Palette, Globe: Lucide.Globe, User: Lucide.User, Users: Lucide.Users
}

function CatIcon({ name, className = 'w-4 h-4' }: { name: string; className?: string }) {
  const Icon = LUCIDE_MAP[name]
  if (!Icon) return <span className={`${className} opacity-50`}>•</span>
  return <Icon className={className} />
}

// Re-export for use in other components
export { LUCIDE_MAP, CatIcon }

const t = (key: string): string => {
  const category = key.replace(/^(category)\./, '');
  const translated = localizeCategoryName(category, 'pt-BR');
  return translated !== category ? translated : category;
}

export default function CategorySelect({ value, onChange, type }: CategorySelectProps) {
  
  const isBRL = true;
  const [categories, setCategories] = useState<Category[]>(() => Object.entries(CATEGORY_DEFAULTS).map(([name, style]) => ({ id: name, name, ...style })))
  const [open, setOpen] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((data) => { if (data.categories?.length) setCategories([...data.categories, ...Object.entries(CATEGORY_DEFAULTS).filter(([name]) => !data.categories.some((c: Category) => localizeCategoryName(c.name) === localizeCategoryName(name))).map(([name, style]) => ({ id: name, name, ...style }))]) })
      .catch(() => {})
  }, [open, showManage])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedCat = categories.find((c) => c.name === value)
  const defaults = selectedCat
    ? { icon: selectedCat.icon, color: selectedCat.color }
    : CATEGORY_DEFAULTS[value] || { icon: 'MoreHorizontal', color: '#6b7280' }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input-field w-full flex items-center gap-3"
      >
        <CatIcon name={defaults.icon} className="w-4 h-4 text-surface-600 dark:text-surface-300" />
        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: defaults.color }} />
        <span className="flex-1 text-left text-sm">{t(`category.${value}`) || value || ('Selecione...')}</span>
        <Lucide.ChevronDown className={`w-4 h-4 text-surface-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-surface-200 bg-white shadow-xl dark:border-surface-700/60 dark:bg-surface-800 overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {categories.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-surface-400">{'Carregando categorias...'}</div>
            )}
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { onChange(cat.name); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  cat.name === value
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                    : 'text-surface-700 hover:bg-surface-50 dark:text-surface-200 dark:hover:bg-surface-700/50'
                }`}
              >
                <CatIcon name={cat.icon} className="w-4 h-4" />
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="flex-1 text-left">{t(`category.${cat.name}`) || cat.name}</span>
                {cat.name === value && (
                  <Lucide.Check className="w-4 h-4 text-brand-600 dark:text-brand-400" strokeWidth={2.5} />
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-surface-100 dark:border-surface-700/60">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors"
              onClick={() => { setOpen(false); setShowManage(true) }}
            >
              <Lucide.Settings2 className="w-4 h-4" />
              {'Gerenciar Categorias'}
            </button>
          </div>
        </div>
      )}

      {showManage && (
        <ManageCategoriesModal
          onClose={() => { setShowManage(false); setOpen(true) }}
          onRefresh={() => setCategories((prev) => [...prev])}
        />
      )}
    </div>
  )
}
