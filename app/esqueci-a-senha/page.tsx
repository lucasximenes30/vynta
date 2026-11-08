'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck } from 'lucide-react'
import AuthShell from '@/components/AuthShell'

export default function EsqueciASenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data.error || 'Não foi possível enviar agora. Tente novamente.')
      else setSent(true)
    } catch {
      setError('Sem conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle={sent ? undefined : 'Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.'}
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="text-surface-200">
            Se existir uma conta com <strong className="text-white">{email}</strong>, você vai receber um e-mail em instantes com o link para redefinir a senha.
          </p>
          <p className="text-sm text-surface-400">Não chegou? Confira a caixa de spam ou promoções. O link vale por 1 hora.</p>
          <button type="button" onClick={() => setSent(false)} className="text-sm font-medium text-brand-300 hover:text-brand-200">
            Usar outro e-mail
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-surface-200">E-mail</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="auth-input"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-[15px] font-semibold text-white transition hover:bg-brand-400 disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Enviando...' : 'Enviar link de redefinição'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-surface-400">
        Lembrou a senha? <Link href="/login" className="font-semibold text-brand-300 hover:text-brand-200">Entrar</Link>
      </p>
    </AuthShell>
  )
}
