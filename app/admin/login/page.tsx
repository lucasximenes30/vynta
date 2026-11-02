'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: identifier, password }),
      })

      if (!res.ok) {
        throw new Error('Credenciais inválidas')
      }

      router.push('/admin/users')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <BrandLogo size="lg" className="justify-center mb-6" />
          <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white tracking-tight">
            Acesso Restrito
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-2 text-sm">
            Painel de controle operacional
          </p>
        </div>

        <div className="bg-white dark:bg-surface-900 p-8 rounded-3xl shadow-xl shadow-brand-900/5 dark:shadow-black/40 border border-surface-200/50 dark:border-surface-800/50 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500" />
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-start gap-3">
                <Lucide.AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
                Identificador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-surface-400">
                  <Lucide.Shield className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:focus:ring-brand-400/20 dark:focus:border-brand-400 transition-all outline-none"
                  placeholder="seu@email.com ou admin"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-surface-400">
                  <Lucide.Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:focus:ring-brand-400/20 dark:focus:border-brand-400 transition-all outline-none"
                  placeholder="•••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-semibold shadow-lg shadow-brand-600/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Lucide.Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lucide.LogIn className="w-5 h-5" />
                  <span>Entrar no Painel</span>
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
           <Link href="/login" className="text-sm text-surface-500 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors">
              &larr; Voltar para o app
           </Link>
        </div>
      </div>
    </div>
  )
}
