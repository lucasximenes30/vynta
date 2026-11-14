'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'

export default function ForcePasswordChangePage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/force-password-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Algo deu errado')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de rede. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-surface-950 px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(50,104,91,0.26),transparent_45%),radial-gradient(circle_at_bottom,rgba(32,59,54,0.2),transparent_36%)]" />

      <div className="relative w-full max-w-md space-y-6 animate-auth-fade">
        <div className="text-center">
          <BrandLogo
            size="lg"
            className="justify-center"
            textClassName="font-display text-3xl text-white"
            priority
          />
          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Crie sua nova senha
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[1.03rem] leading-relaxed text-surface-200 sm:text-base">
            Seu acesso precisa ser atualizado por questões de segurança. Por favor, cadastre uma nova senha.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card space-y-5 border-surface-700/70 bg-surface-900/85 px-5 py-6 shadow-elevated backdrop-blur sm:px-8 sm:py-8"
        >
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-sm font-medium text-surface-200">
              Nova senha
            </label>
            <input
              id="newPassword"
              type="password"
              required
              className="input-field"
              placeholder="Digite a nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-200">
              Confirmar nova senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              className="input-field"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-900/40 bg-red-900/20 p-3 text-sm text-red-300">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary h-11 w-full text-sm font-semibold">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Atualizando...
              </span>
            ) : (
              'Atualizar Senha'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
