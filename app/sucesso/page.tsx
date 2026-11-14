import BrandLogo from '@/components/BrandLogo'
import Link from 'next/link'

export default function SucessoPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-surface-950 px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(50,104,91,0.26),transparent_45%),radial-gradient(circle_at_bottom,rgba(32,59,54,0.2),transparent_36%)]" />

      <div className="relative w-full max-w-lg space-y-8 animate-auth-fade">
        <div className="text-center">
          <BrandLogo
            size="lg"
            className="justify-center mx-auto"
            textClassName="font-display text-3xl text-white"
            priority
          />
          <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight text-white mb-4">
            Acesso Liberado!
          </h1>
          <p className="mx-auto max-w-sm text-lg leading-relaxed text-surface-200">
            Sua compra foi aprovada e sua conta Vynta foi criada com sucesso.
          </p>
        </div>

        <div className="card space-y-6 border-surface-700/70 bg-surface-900/85 p-8 shadow-elevated backdrop-blur text-center">
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-xl font-medium text-white">Como acessar sua conta</h2>
            
            <p className="text-surface-300 text-sm leading-relaxed">
              Use o <strong>mesmo e-mail</strong> que você utilizou no momento da compra. Como geramos sua conta de forma segura, você precisará definir sua própria senha no primeiro acesso.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <p className="text-brand-300 text-sm font-medium">Passo 1: Clique em "Esqueceu a senha?" na tela de login.</p>
            <p className="text-brand-300 text-sm font-medium">Passo 2: Defina sua senha e acesse a plataforma.</p>
          </div>

          <div className="pt-6">
            <Link href="/login" className="btn-primary h-12 w-full text-sm font-semibold flex items-center justify-center">
              Ir para o Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
