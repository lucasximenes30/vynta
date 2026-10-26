'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { trackFunnelEvent } from '@/lib/funnel'
import { TRIAL_DAYS, isBillingTier } from '@/lib/plans'
import { detachPushFromAccount } from '@/lib/push'

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const planParam = searchParams.get('plan')
  const intendedPlan = isBillingTier(planParam) ? planParam : null
  const isRegister = mode === 'register'

  useEffect(() => {
    detachPushFromAccount().catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get('error') === 'inactive') router.replace('/unlock?state=expired')
  }, [searchParams, router])

  useEffect(() => {
    if (!isRegister) return
    const storageKey = 'vynta_funnel_signup_started'
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, 'true')
      trackFunnelEvent('signup_started', intendedPlan ? { planTier: intendedPlan } : undefined)
    }
  }, [isRegister, intendedPlan])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(isRegister ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegister ? { name, email, password, planTier: 'trial' } : { email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(translateError(data.error))
        return
      }

      if (isRegister) trackFunnelEvent('signup_completed', intendedPlan ? { planTier: intendedPlan } : undefined)

      if (data.status === 'inactive') {
        router.push('/unlock?state=expired')
        return
      }

      router.push(isRegister && intendedPlan ? `/subscription?plan=${intendedPlan}&welcome=1` : '/dashboard')
      router.refresh()
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-[#07080c] px-4 py-10 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(66,88,249,0.25),transparent_60%)]" />

      <div className="relative w-full max-w-[420px] animate-auth-fade">
        <Link href="/" className="mx-auto mb-8 flex w-fit" aria-label="Voltar para o início">
          <BrandLogo size="lg" textClassName="font-display text-2xl text-white" priority />
        </Link>

        <div className="mb-7 text-center">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            {isRegister ? `Comece seus ${TRIAL_DAYS} dias grátis` : 'Bem-vindo de volta'}
          </h1>
          <p className="mt-2 text-surface-400">
            {isRegister ? 'Sem cartão e sem CPF. Leva menos de um minuto.' : 'Entre para continuar organizando sua rotina.'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-7"
        >
          {isRegister && (
            <Field label="Como podemos te chamar?" htmlFor="name">
              <input
                id="name"
                type="text"
                required
                autoComplete="given-name"
                className="auth-input"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          )}

          <Field label="E-mail" htmlFor="email">
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
          </Field>

          <Field
            label={isRegister ? 'Crie uma senha' : 'Senha'}
            htmlFor="password"
            aside={!isRegister && (
              <Link href="/esqueci-a-senha" className="text-sm font-medium text-brand-300 transition hover:text-brand-200">
                Esqueceu?
              </Link>
            )}
          >
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isRegister ? 6 : undefined}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="auth-input pr-11"
                placeholder={isRegister ? 'Mínimo de 6 caracteres' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-surface-500 transition hover:text-surface-200"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-[15px] font-semibold text-white shadow-[0_10px_40px_-12px_rgba(66,88,249,0.9)] transition hover:bg-brand-400 active:scale-[0.99] disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? isRegister ? 'Criando sua conta...' : 'Entrando...'
              : isRegister ? 'Criar conta grátis' : 'Entrar'}
          </button>

          {isRegister && (
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-1 text-xs text-surface-400">
              {[`${TRIAL_DAYS} dias grátis`, 'Sem cartão', 'Nenhuma cobrança automática'].map((item) => (
                <li key={item} className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </form>

        <p className="mt-6 text-center text-surface-400">
          {isRegister ? 'Já tem uma conta? ' : 'Ainda não tem conta? '}
          <Link
            href={isRegister ? '/login' : '/register'}
            className="font-semibold text-brand-300 transition hover:text-brand-200"
          >
            {isRegister ? 'Entrar' : `Testar ${TRIAL_DAYS} dias grátis`}
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, htmlFor, aside, children }: { label: string; htmlFor: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-surface-200">{label}</label>
        {aside}
      </div>
      {children}
    </div>
  )
}

function translateError(message?: string): string {
  if (!message) return 'Algo deu errado. Tente novamente.'
  const map: Record<string, string> = {
    'Email already registered': 'Este e-mail já tem uma conta. Faça login ou recupere sua senha.',
    'Invalid email or password': 'E-mail ou senha incorretos.',
    'Invalid email': 'Digite um e-mail válido.',
    'Name must be at least 2 characters': 'Digite seu nome (mínimo de 2 letras).',
    'Password must be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
  }
  return map[message] ?? message
}
