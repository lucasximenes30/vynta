'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, Clock, AlertCircle, ShieldCheck } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

export default function PaymentReturnPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'active' | 'pending' | 'error'>('loading')
  const [message, setMessage] = useState('Estamos confirmando os detalhes do seu pagamento. Isso normalmente leva alguns segundos...')

  useEffect(() => {
    let mounted = true
    let retries = 0
    const maxRetries = 5

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/subscription/status', { method: 'POST' })
        const data = await res.json()

        if (!mounted) return

        if (data.status === 'approved' || data.status === 'already_active' || data.canAccess) {
          setStatus('active')
          setMessage('Tudo certo! Seu acesso completo está liberado. Preparando seu painel...')
          setTimeout(() => {
            router.push('/dashboard')
            router.refresh()
          }, 2500)
          return
        }

        if (data.status === 'pending') {
          if (retries < maxRetries) {
            retries++
            setTimeout(checkStatus, 3000)
            return
          }
          setStatus('pending')
          setMessage('O pagamento ainda está sendo processado pela instituição. Você pode aguardar mais um pouco ou voltar mais tarde.')
          return
        }

        setStatus('error')
        setMessage('Não foi possível localizar o pagamento no momento. Se você já pagou, pode demorar alguns minutos para compensar.')
      } catch (err) {
        if (!mounted) return
        setStatus('error')
        setMessage('Ocorreu um erro de conexão ao verificar. Tente novamente em instantes.')
      }
    }

    checkStatus()

    return () => {
      mounted = false
    }
  }, [router])

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-surface-950 px-4 py-8 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(66,88,249,0.15),transparent_50%),radial-gradient(circle_at_bottom,rgba(17,31,171,0.1),transparent_40%)]" />

      <div className="relative w-full max-w-md space-y-8 text-center animate-dashboard-fade">
        <BrandLogo size="lg" className="justify-center" textClassName="text-3xl text-white" />
        
        <div className="card relative overflow-hidden border-surface-700/60 bg-surface-900/60 backdrop-blur-md px-6 py-10 shadow-2xl">
          {/* Subtle animated border top */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50" />
          
          <div className="flex flex-col items-center gap-6">
            {/* Status Icon */}
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-surface-800/80 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)] border border-surface-700">
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                  <div className="absolute inset-0 rounded-full border border-brand-500/20 animate-ping opacity-20" />
                </>
              ) : status === 'active' ? (
                <div className="animate-fade-in flex items-center justify-center w-full h-full bg-emerald-500/10 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              ) : status === 'pending' ? (
                <div className="animate-fade-in flex items-center justify-center w-full h-full bg-amber-500/10 rounded-full border border-amber-500/20">
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
              ) : (
                <div className="animate-fade-in flex items-center justify-center w-full h-full bg-rose-500/10 rounded-full border border-rose-500/20">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {status === 'active' ? 'Pagamento Aprovado' : 
                 status === 'loading' ? 'Processando...' : 
                 status === 'pending' ? 'Pagamento Pendente' : 
                 'Atenção ao Pagamento'}
              </h1>
              <p className="text-sm font-medium text-surface-400 leading-relaxed max-w-[280px] mx-auto">
                {message}
              </p>
            </div>

            {/* Secure Payment Note */}
            <div className="flex items-center justify-center gap-1.5 mt-2 opacity-60">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-surface-300">Ambiente Seguro</span>
            </div>

            {status !== 'active' && status !== 'loading' && (
               <div className="w-full space-y-3 mt-2">
                 <a 
                   href="https://wa.me/5585992551864?text=Ol%C3%A1%21%20Preciso%20de%20ajuda%20com%20minha%20conta%20Vynta."
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors"
                 >
                   💬 Falar com Suporte
                 </a>
                 <button
                   onClick={() => router.push('/dashboard')}
                   className="btn-secondary w-full"
                 >
                   Voltar ao Painel
                 </button>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
