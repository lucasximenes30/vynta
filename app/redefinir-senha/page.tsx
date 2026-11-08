'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import AuthShell from '@/components/AuthShell'

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return setError('As senhas não são iguais.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data.error || 'Não foi possível redefinir agora.')
      else setDone(true)
    } catch {
      setError('Sem conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthShell title="Link inválido">
        <p className="text-center text-surface-300">Este link de redefinição está incompleto.</p>
        <Link href="/esqueci-a-senha" className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-brand-500 font-semibold text-white hover:bg-brand-400">
          Pedir um novo link
        </Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Senha alterada!">
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="text-surface-200">Sua nova senha já está valendo. Entre com ela para continuar.</p>
          <Link href="/login" className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-500 font-semibold text-white hover:bg-brand-400">
            Ir para o login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Criar nova senha" subtitle="Escolha uma senha com pelo menos 6 caracteres.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-surface-200">Nova senha</label>
          <div className="relative">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              className="auth-input pr-11"
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-surface-500 hover:text-surface-200"
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium text-surface-200">Confirme a nova senha</label>
          <input
            id="confirm"
            type={show ? 'text' : 'password'}
            required
            minLength={6}
            autoComplete="new-password"
            className="auth-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200">
            {error}{' '}
            {error.includes('expirou') && <Link href="/esqueci-a-senha" className="font-semibold underline">Pedir novo link</Link>}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-[15px] font-semibold text-white transition hover:bg-brand-400 disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </AuthShell>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
