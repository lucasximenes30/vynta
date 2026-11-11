'use client'

import { localizeCategoryName } from '@/lib/categories'

import { useState, useEffect, useCallback } from 'react'

import * as Lucide from 'lucide-react'
import { LUCIDE_MAP, CatIcon } from './CategorySelect'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  userId: string | null
}

interface ManageCategoriesModalProps {
  onClose: () => void
  onRefresh: () => void
}

const COLOR_PRESETS = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6',
  '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
  '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b',
  '#f97316', '#ef4444', '#64748b', '#6b7280', '#94a3b8',
]

const ALL_ICONS = [
  'Wallet', 'TrendingUp', 'Laptop', 'Briefcase', 'PiggyBank',
  'Gift', 'Banknote', 'Building', 'Landmark', 'Coins',
  'Gem', 'Award', 'Star', 'Zap', 'Rocket',
  'HeartHandshake', 'Shield', 'Crown', 'Flame', 'Sparkles',
  'Leaf', 'Music', 'Camera', 'Globe',
  'Utensils', 'Car', 'Clapperboard', 'ShoppingBag', 'Receipt',
  'HeartPulse', 'Dumbbell', 'Coffee', 'House', 'Bus',
  'Train', 'Plane', 'Hotel', 'Smartphone', 'Wifi',
  'Fuel', 'ShoppingCart', 'Shirt', 'Dog', 'Stethoscope',
  'Pill', 'Scissors', 'Wrench', 'Book',
  'Cake', 'Beer', 'Baby', 'Cat', 'GraduationCap',
  'MoreHorizontal',
]

// Translation helper
const categoryTranslations: Record<string, string> = {
  'category.Food': 'Alimentação',
  'category.Transport': 'Transporte',
  'category.Entertainment': 'Lazer',
  'category.Shopping': 'Compras',
  'category.Bills': 'Contas',
  'category.Health': 'Saúde',
  'category.General': 'Geral',
  'category.Salary': 'Salário',
  'category.Freelance': 'Freelance',
  'category.Investment': 'Investimento',
  'category.Other': 'Outro',
}

const t = (key: string): string => {
  if (key.startsWith('category.')) return localizeCategoryName(key.slice(9))
  return categoryTranslations[key] || key.replace(/^(category)\./, '');
}

export default function ManageCategoriesModal({ onClose, onRefresh }: ManageCategoriesModalProps) {
  
  const isBRL = true;
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editColor, setEditColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [creating, setCreating] = useState(false)
  const [showEditIcons, setShowEditIcons] = useState(false)
  const [showNewIcons, setShowNewIcons] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const fetchCategories = useCallback(() => {
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((data) => {
        setCategories(data.categories || [])
        setLoading(false)
      })
      .catch(() => { setCategories([]); setLoading(false) })
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleClose = () => { setVisible(false); setTimeout(onClose, 200) }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditIcon(cat.icon)
    setEditColor(cat.color)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim() || !editIcon) return
    setSaving(true)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), icon: editIcon, color: editColor }),
      })
      if (res.ok) {
        setEditingId(null)
        fetchCategories()
        onRefresh()
      }
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const deleteCategory = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchCategories()
        onRefresh()
      }
    } catch { /* ignore */ } finally { setDeletingId(null) }
  }

  const createCategory = async () => {
    if (!newName.trim()) return
    if (!newIcon) {
      setCreateError('Por favor, selecione um ícone visual')
      return
    }
    setCreateError('')
    setCreating(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), icon: newIcon, color: newColor }),
      })
      if (res.ok) {
        setShowCreate(false)
        setNewName(''); setNewIcon(''); setNewColor('#6366f1'); setCreateError('')
        fetchCategories()
        onRefresh()
      }
    } catch { /* ignore */ } finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div className="absolute inset-x-0 bottom-0 md:inset-0 flex flex-col justify-end md:items-center md:justify-center pointer-events-none p-0 md:p-4">
        <div 
          className={`pointer-events-auto w-full md:max-w-2xl bg-white shadow-2xl dark:bg-surface-900 md:dark:border dark:border-surface-700/60 rounded-t-[2rem] md:rounded-2xl max-h-[90vh] flex flex-col transition-all duration-300 ease-out ${
            visible ? 'translate-y-0 md:scale-100 opacity-100' : 'translate-y-full md:translate-y-0 md:scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Drag Pill */}
          <div className="md:hidden flex justify-center pt-4 pb-2 shrink-0">
            <div className="w-12 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full" />
          </div>

        <div className="flex items-center justify-between px-6 py-4 pt-0 md:pt-4 border-b border-surface-200 dark:border-surface-700/60">
          <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100 tracking-tight">
            {'Gerenciar Categorias'}
          </h2>
          <button type="button" onClick={handleClose} className="rounded-full p-1.5 text-surface-400 bg-surface-100 dark:bg-surface-800 hover:text-surface-600 dark:hover:text-surface-300 transition-colors">
            <Lucide.X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-safe">
          {loading ? (
            <div className="py-12 text-center text-sm text-surface-400">{'Carregando...'}</div>
          ) : (
            <>
              {/* Category list */}
              <div className="space-y-3 sm:space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="rounded-xl border border-surface-200 dark:border-surface-700/60 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-colors hover:bg-surface-50/50 dark:hover:bg-surface-800/50">
                    {editingId === cat.id ? (
                      <>
                        {/* Edit mode */}
                        <div className="flex-1 flex flex-col gap-4 w-full relative">
                          <div className="grid gap-4 sm:grid-cols-2">
                            {/* Nome */}
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5 block">
                                {'Nome'}
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                maxLength={30}
                                className="input-field text-base sm:text-sm w-full h-12 sm:h-10"
                                placeholder={'Nome da categoria'}
                              />
                            </div>
                            
                            {/* Ícone */}
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5 block">
                                {'Ícone'}
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowEditIcons(!showEditIcons)}
                                className="w-full flex items-center gap-2 rounded-xl border border-surface-200 dark:border-surface-700/60 bg-white dark:bg-surface-800 px-4 h-12 sm:h-10 text-base sm:text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                              >
                                {editIcon ? <CatIcon name={editIcon} className="w-5 h-5" /> : <Lucide.Smile className="w-5 h-5" />}
                                <span className="font-medium">{'Selecionar Ícone'}</span>
                                <Lucide.ChevronDown className={`ml-auto w-4 h-4 text-surface-400 transition-transform ${showEditIcons ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Icon picker grid */}
                          {showEditIcons && (
                            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-surface-200 dark:border-surface-700/60 p-3 bg-surface-50 dark:bg-surface-800/50">
                              {ALL_ICONS.map((iconName) => (
                                <button
                                  key={iconName}
                                  type="button"
                                  onClick={() => setEditIcon(iconName)}
                                  className={`flex items-center justify-center rounded-xl p-2.5 transition-all ${
                                    editIcon === iconName
                                      ? 'bg-brand-600 text-white shadow-[0_2px_8px_rgba(79,70,229,0.3)] scale-105 ring-2 ring-brand-500'
                                      : 'bg-white dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-150 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:scale-105'
                                  }`}
                                  title={iconName}
                                >
                                  <CatIcon name={iconName} className="w-5 h-5" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Color picker */}
                          <div>
                            <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2 block">
                              {'Cor'}
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                              <input
                                type="color"
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg cursor-pointer border-0 shrink-0 shadow-sm"
                              />
                              <div className="flex flex-wrap gap-2 flex-1">
                                {COLOR_PRESETS.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setEditColor(c)}
                                    className={`h-8 w-8 sm:h-6 sm:w-6 rounded-md transition-transform ${editColor === c ? 'ring-2 ring-offset-2 ring-surface-900 dark:ring-surface-100 dark:ring-offset-surface-900 scale-110 shadow-sm' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Actions - Sticky on Mobile */}
                          <div className="flex gap-3 pt-4 border-t border-surface-200 dark:border-surface-700/60 sticky bottom-0 bg-white dark:bg-surface-900 z-10 py-3 -mx-3 px-3 sm:static sm:bg-transparent sm:py-0 sm:mx-0 sm:px-0 mt-2">
                            <button type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="flex-1 btn-secondary py-3 sm:py-2 text-base sm:text-sm font-semibold"
                            >
                              {'Cancelar'}
                            </button>
                            <button type="button"
                              onClick={() => saveEdit(cat.id)}
                              disabled={saving || !editName.trim() || !editIcon}
                              className="flex-1 btn-primary py-3 sm:py-2 text-base sm:text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              {saving ? <Lucide.Loader2 className="w-4 h-4 animate-spin" /> : <Lucide.Check className="w-4 h-4" />}
                              {'Salvar'}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* View mode */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                          >
                            <CatIcon name={cat.icon} className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                              {t(`category.${cat.name}`) || cat.name}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-surface-500 dark:text-surface-400">
                              {cat.userId === null ? ('Padrão') : ('Pessoal')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                          <button type="button"
                            onClick={() => startEdit(cat)}
                            className="p-2 text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20"
                            title={'Editar'}
                          >
                            <Lucide.Pencil className="w-4 h-4" />
                          </button>
                          <button type="button"
                            onClick={() => deleteCategory(cat.id)}
                            disabled={deletingId === cat.id}
                            className="p-2 text-surface-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            title={'Remover'}
                          >
                            {deletingId === cat.id ? (
                              <Lucide.Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Lucide.Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Create new category */}
              {showCreate ? (
                <div className="mt-4 rounded-xl border border-brand-200 dark:border-brand-700/50 bg-brand-50 dark:bg-brand-900/10 p-4 sm:p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-300 uppercase tracking-wider">
                    {'Nova Categoria'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5 block">
                        {'Nome'}
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        maxLength={30}
                        className="input-field text-base sm:text-sm w-full h-12 sm:h-10"
                        placeholder={'Nome da categoria'}
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5 block">
                        {'Ícone'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewIcons(!showNewIcons)}
                        className="flex w-full items-center gap-2 rounded-xl border border-surface-200 dark:border-surface-700/60 bg-white dark:bg-surface-800 px-4 h-12 sm:h-10 text-base sm:text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                      >
                        {newIcon ? <CatIcon name={newIcon} className="w-5 h-5" /> : <Lucide.Smile className="w-5 h-5" />}
                        <span>{'Selecionar Ícone'}</span>
                        <Lucide.ChevronDown className={`ml-auto w-4 h-4 text-surface-400 transition-transform ${showNewIcons ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    
                    {createError && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <Lucide.AlertCircle className="w-3 h-3" />
                        {createError}
                      </p>
                    )}
                    {showNewIcons && (
                      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-surface-200 dark:border-surface-700/60 p-3 bg-surface-50 dark:bg-surface-800/50">
                        {ALL_ICONS.map((iconName) => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setNewIcon(iconName)}
                            className={`flex items-center justify-center rounded-xl p-2.5 transition-all ${
                              newIcon === iconName
                                ? 'bg-brand-600 text-white shadow-[0_2px_8px_rgba(79,70,229,0.3)] scale-105 ring-2 ring-brand-500'
                                : 'bg-white dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-150 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:scale-105'
                            }`}
                            title={iconName}
                          >
                            <CatIcon name={iconName} className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div>
                      <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2 block">
                        {'Cor'}
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="color"
                          value={newColor}
                          onChange={(e) => setNewColor(e.target.value)}
                          className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg cursor-pointer border-0 shrink-0 shadow-sm"
                        />
                        <div className="flex flex-wrap gap-2 flex-1">
                          {COLOR_PRESETS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewColor(c)}
                              className={`h-8 w-8 sm:h-6 sm:w-6 rounded-md transition-transform ${newColor === c ? 'ring-2 ring-offset-2 ring-surface-900 dark:ring-surface-100 dark:ring-offset-surface-900 scale-110 shadow-sm' : 'hover:scale-110'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {newName && newIcon && (
                    <div className="flex items-center gap-3 rounded-xl border border-surface-200 dark:border-surface-700/60 bg-white dark:bg-surface-800 p-3 mt-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: `${newColor}20`, color: newColor }}>
                        <CatIcon name={newIcon} className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{newName}</span>
                    </div>
                  )}

                  {/* Actions - Sticky on Mobile */}
                  <div className="flex gap-3 pt-4 mt-4 border-t border-brand-200/50 dark:border-brand-700/30 sticky bottom-0 bg-brand-50 dark:bg-brand-900/10 z-10 py-3 -mx-4 px-4 sm:static sm:bg-transparent sm:py-0 sm:mx-0 sm:px-0">
                    <button type="button" onClick={() => { setShowCreate(false); setNewName(''); setNewIcon(''); setCreateError(''); }} className="flex-1 btn-secondary py-3 sm:py-2 text-base sm:text-sm font-semibold bg-white dark:bg-surface-800">
                      {"Cancelar"}
                    </button>
                    <button type="button"
                      onClick={createCategory}
                      disabled={creating || !newName.trim()}
                      className="flex-1 btn-primary py-3 sm:py-2 text-base sm:text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      {creating && <Lucide.Loader2 className="w-4 h-4 animate-spin" />}
                      {creating ? ('Criando...') : ('Criar Categoria')}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button"
                  onClick={() => setShowCreate(true)}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-600 text-sm font-semibold text-surface-500 dark:text-surface-400 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all duration-200"
                >
                  <Lucide.Plus className="w-5 h-5" />
                  {'Adicionar Nova Categoria'}
                </button>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}