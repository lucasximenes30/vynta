import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'

/** Dark centered card used by the auth side pages (password recovery/reset). */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-[#07080c] px-4 py-10 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(66,88,249,0.25),transparent_60%)]" />
      <div className="relative w-full max-w-[420px] animate-auth-fade">
        <Link href="/" className="mx-auto mb-8 flex w-fit" aria-label="Voltar para o início">
          <BrandLogo size="lg" textClassName="font-display text-2xl text-white" priority />
        </Link>
        <div className="mb-7 text-center">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-surface-400">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-7">
          {children}
        </div>
      </div>
    </div>
  )
}
