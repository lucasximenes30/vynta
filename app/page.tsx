import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, Banknote, Bell, BookOpen, CalendarDays, Car, Check, CreditCard, Droplets, Dumbbell, FileDown, Home,
  Layers, Lock, PiggyBank, RefreshCcw, ShieldCheck, ShoppingCart, Sparkles, StickyNote, Target, Utensils, WifiOff, X, Zap,
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import FunnelTracker from '@/components/FunnelTracker'
import TrackedCTA from '@/components/landing/TrackedCTA'
import ViewTracker from '@/components/landing/ViewTracker'
import StickyMobileCTA from '@/components/landing/StickyMobileCTA'
import LandingMotion from '@/components/landing/LandingMotion'
import SavingsSimulator from '@/components/landing/SavingsSimulator'
import { NotificationsMock, QuickAddMock } from '@/components/landing/ProductMocks'
import {
  PLANS, PLAN_FEATURES, TRIAL_DAYS, YEARLY_DISCOUNT_PERCENT, YEARLY_MONTHLY_EQUIVALENT_CENTS,
  YEARLY_SAVINGS_CENTS, formatBRL,
} from '@/lib/plans'

export const metadata: Metadata = {
  title: { absolute: 'Vynta — Saiba quanto sobra antes do mês acabar' },
  description: `Anote um gasto em 5 segundos, veja a fatura certa de cada cartão e receba um aviso no celular antes de cada conta vencer. Hábitos, agenda e treinos no mesmo app. ${TRIAL_DAYS} dias grátis, sem cartão.`,
  openGraph: {
    title: 'Vynta — Seu dinheiro e sua rotina em um só app',
    description: `Finanças, cartões, metas, hábitos, agenda e treinos num painel só. ${TRIAL_DAYS} dias grátis, sem cartão.`,
    images: [{ url: '/images/landing/og.jpg', width: 1200, height: 630 }],
    locale: 'pt_BR',
    type: 'website',
  },
}

// Landing has its own theme color so iOS/Android tint the top chrome dark like the page.
export const viewport: Viewport = { themeColor: '#07080c' }

const PRIMARY_CTA = 'Criar minha conta grátis'

// Turns the scroll animations on before first paint (no flash of hidden content). If the JS that
// reveals the elements never runs (slow network, blocker), everything is shown after 3s anyway.
const MOTION_BOOT = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var r=document.documentElement;r.classList.add('motion');setTimeout(function(){if(r.dataset.motionReady===undefined)r.classList.remove('motion')},3000)}catch(e){}})()`

const MARQUEE = [
  { icon: ShoppingCart, text: 'Mercado' },
  { icon: CreditCard, text: 'Fatura do cartão' },
  { icon: Layers, text: 'Parcela 3/10' },
  { icon: RefreshCcw, text: 'Assinaturas' },
  { icon: Banknote, text: 'Salário no 5º dia útil' },
  { icon: Car, text: 'Uber' },
  { icon: Utensils, text: 'iFood' },
  { icon: Home, text: 'Aluguel' },
  { icon: Dumbbell, text: 'Treino A' },
  { icon: Droplets, text: 'Beber 2L de água' },
  { icon: BookOpen, text: 'Ler 20 min' },
  { icon: CalendarDays, text: 'Reunião às 14h' },
  { icon: Target, text: 'Viagem de férias' },
  { icon: PiggyBank, text: 'Reserva de emergência' },
  { icon: StickyNote, text: 'Ideias de economia' },
]

const PAINS = [
  {
    title: 'O mês acaba antes do salário',
    text: 'Você trabalha o mês inteiro e, na última semana, não consegue explicar pra onde o dinheiro foi.',
  },
  {
    title: 'A fatura sempre assusta',
    text: 'Parcela esquecida, assinatura que você nem usa e um valor bem maior do que você imaginava.',
  },
  {
    title: 'Planilha abandonada',
    text: 'Uma planilha pros gastos, um app pros hábitos, outro pro treino. Duas semanas depois, você largou tudo.',
  },
]

const STEPS = [
  { title: 'Crie a conta em 30 segundos', text: 'Só nome, e-mail e senha. Sem cartão, sem CPF, sem baixar nada na loja.' },
  { title: 'Anote o primeiro gasto', text: 'Toque no +, digite o valor e o que foi. A categoria entra sozinha.' },
  { title: 'Ative os avisos', text: 'A partir daí, o Vynta te lembra das contas, dos compromissos e dos hábitos do dia.' },
]

const CARD_POINTS = [
  { icon: CreditCard, text: 'Dia de fechamento e vencimento de cada cartão: você vê a fatura certa de cada mês' },
  { icon: Layers, text: 'Parcelas e assinaturas lançadas sozinhas nos meses seguintes' },
  { icon: FileDown, text: 'Importa a fatura do Nubank (CSV) em um clique' },
  { icon: Sparkles, text: 'Relatório do mês com insights de IA sobre onde dá pra economizar' },
]

const GALLERY = [
  { src: '/images/landing/habits-mobile.webp', title: 'Hábitos', text: 'Marque o dia e não quebre a sequência.' },
  { src: '/images/landing/calendar-mobile.webp', title: 'Agenda', text: 'Compromissos do mês, com aviso antes.' },
  { src: '/images/landing/goals-mobile.webp', title: 'Metas', text: 'Quanto já guardou e quanto falta.' },
  { src: '/images/landing/workout-mobile.webp', title: 'Treinos', text: 'Sua ficha e suas cargas, sem caderno.' },
  { src: '/images/landing/reports-mobile.webp', title: 'Relatórios', text: 'O mês inteiro em uma tela.' },
  { src: '/images/landing/notes-mobile.webp', title: 'Notas', text: 'Ideias ligadas às suas metas.' },
]

const REPLACES = ['Planilha de gastos', 'App de finanças', 'App de hábitos', 'Agenda de papel', 'Ficha de treino', 'Bloco de notas']

const FAQ = [
  {
    q: 'Preciso colocar cartão para testar?',
    a: `Não. Você testa tudo por ${TRIAL_DAYS} dias só com nome, e-mail e senha. Nada é cobrado automaticamente: se quiser continuar, você escolhe o plano depois.`,
  },
  {
    q: 'O Vynta se conecta com meu banco?',
    a: 'Não, e isso é de propósito: você não compartilha a senha do banco com ninguém. Os lançamentos são rápidos (5 segundos), parcelas e assinaturas se repetem sozinhas e a fatura do Nubank pode ser importada por CSV.',
  },
  {
    q: 'O Vynta me avisa das contas?',
    a: 'Sim. Com as notificações ativadas, você recebe no celular (ou no computador) um aviso de manhã quando uma conta ou fatura vence, um lembrete antes de cada compromisso e, à noite, os hábitos e gastos que faltam anotar — mesmo com o app fechado. Você escolhe o que recebe.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Foi feito pra ele. Instala na tela inicial como um app (sem loja), abre rápido e anota um gasto até sem internet: fica salvo no aparelho e é enviado sozinho quando a conexão volta.',
  },
  {
    q: 'Como funciona a cobrança?',
    a: `Assinatura via Pix ou cartão: ${formatBRL(PLANS.pro.priceCents)} por mês ou ${formatBRL(PLANS.pro_yearly.priceCents)} por ano. Sem fidelidade: você cancela em poucos cliques e o acesso continua até o fim do período pago.`,
  },
  {
    q: 'E se eu pagar e não gostar?',
    a: 'Você tem 7 dias após o pagamento para pedir o reembolso integral, sem precisar explicar o motivo.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Seus dados ficam em um banco de dados protegido, com conexão criptografada (HTTPS) e senha armazenada com criptografia. Não pedimos dados bancários e não vendemos suas informações.',
  },
  {
    q: 'Posso usar só a parte financeira?',
    a: 'Pode. Cada área é independente: use só finanças, ou finanças e hábitos, do jeito que fizer sentido pra você. O plano inclui todas.',
  },
]

function SectionTitle({ eyebrow, title, subtitle, center = false }: { eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; center?: boolean }) {
  return (
    <div data-reveal className={`space-y-4 ${center ? 'mx-auto text-center' : ''} max-w-2xl`}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">{eyebrow}</p>}
      <h2 className="text-balance font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-white md:text-5xl">{title}</h2>
      {subtitle && <p className="text-pretty text-base leading-relaxed text-surface-400 md:text-lg">{subtitle}</p>}
    </div>
  )
}

function CtaNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[13px] text-surface-400 ${className}`}>
      <span className="font-semibold text-surface-200">{TRIAL_DAYS} dias grátis.</span> Sem cartão, sem CPF.
    </p>
  )
}

function PrimaryButton({ location, children = PRIMARY_CTA, className = '' }: { location: string; children?: React.ReactNode; className?: string }) {
  return (
    <TrackedCTA
      href="/register"
      location={location}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-500 px-7 py-4 text-base font-semibold text-white shadow-[0_12px_40px_-12px_rgba(66,88,249,0.95)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-400 active:scale-[0.98] ${className}`}
    >
      <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative">{children}</span>
      <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
    </TrackedCTA>
  )
}

function CheckList({ items }: { items: { icon?: React.ComponentType<{ className?: string }>; text: string }[] }) {
  return (
    <ul className="space-y-3.5" data-reveal-stagger="90">
      {items.map(({ icon: Icon = Check, text }) => (
        <li key={text} data-reveal className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Icon className="h-4 w-4 text-emerald-400" />
          </span>
          <span className="leading-relaxed text-surface-300">{text}</span>
        </li>
      ))}
    </ul>
  )
}

function Phone({ src, alt, priority = false, sizes = '280px', className = '' }: { src: string; alt: string; priority?: boolean; sizes?: string; className?: string }) {
  return (
    <div className={`rounded-[2.2rem] border border-white/15 bg-[#050608] p-1.5 shadow-2xl shadow-black/70 ring-1 ring-black/40 ${className}`}>
      <Image src={src} alt={alt} width={780} height={1688} priority={priority} sizes={sizes} className="h-auto w-full rounded-[1.8rem]" />
    </div>
  )
}

function Toast({ icon: Icon, tone, title, body, className, delay, float }: { icon: React.ComponentType<{ className?: string }>; tone: string; title: string; body: string; className: string; delay: string; float: string }) {
  return (
    <div className={`pop absolute z-10 ${className}`} style={{ ['--d' as string]: delay }}>
      <div className="lp-float flex w-[214px] items-center gap-2.5 rounded-2xl border border-white/10 bg-[#11131c]/90 p-2.5 shadow-xl shadow-black/50 backdrop-blur-md" style={{ ['--fd' as string]: float }}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-semibold text-white">{title}</span>
          <span className="block truncate text-[11px] text-surface-400">{body}</span>
        </span>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-clip bg-[#07080c] font-sans text-surface-200 selection:bg-brand-500/30">
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      <LandingMotion />
      <FunnelTracker eventName="landing_view" onceKey="landing_view" />

      {/* Covers the iOS status bar / bottom toolbar areas, where Safari shows the light body bg */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#07080c]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1000px] bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(66,88,249,0.28),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1000px] bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />

      {/* Header */}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0b0c12]/75 px-3 shadow-lg shadow-black/20 backdrop-blur-xl sm:h-16 sm:px-5">
          <Link href="/" aria-label="Vynta">
            <BrandLogo size="md" textClassName="text-white" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-surface-400 md:flex">
            <a href="#recursos" className="transition hover:text-white">Recursos</a>
            <a href="#como-funciona" className="transition hover:text-white">Como funciona</a>
            <a href="#planos" className="transition hover:text-white">Preço</a>
            <a href="#duvidas" className="transition hover:text-white">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/login" className="px-2.5 py-2 text-sm font-medium text-surface-300 transition hover:text-white">
              Entrar
            </Link>
            <TrackedCTA
              href="/register"
              location="header"
              className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-[#07080c] transition hover:bg-brand-50"
            >
              <span className="sm:hidden">Testar grátis</span>
              <span className="hidden sm:inline">Criar conta grátis</span>
            </TrackedCTA>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-8 lg:pb-28">
        <div className="text-center lg:text-left">
          <p className="rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-surface-300">
            <span className="relative flex h-2 w-2">
              <span className="lp-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Finanças + rotina num app só
          </p>
          <h1 className="rise-soft mt-6 text-balance font-display text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.1rem]" style={{ ['--d' as string]: '0.08s' }}>
            Saiba quanto sobra{' '}
            <span className="bg-gradient-to-r from-brand-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">antes do mês acabar.</span>
          </h1>
          <p className="rise-soft mx-auto mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-surface-400 sm:text-lg lg:mx-0" style={{ ['--d' as string]: '0.16s' }}>
            Anote um gasto em 5 segundos, veja a fatura certa de cada cartão e receba um aviso no celular antes de cada conta vencer.
          </p>
          <div className="rise-soft mt-8 flex flex-col items-center gap-3 lg:items-start" style={{ ['--d' as string]: '0.24s' }}>
            <PrimaryButton location="hero" className="w-full sm:w-auto" />
            <CtaNote />
          </div>
          <ul className="rise mt-8 hidden flex-wrap items-center gap-x-5 gap-y-2 text-sm text-surface-400 sm:flex sm:justify-center lg:justify-start" style={{ ['--d' as string]: '0.32s' }}>
            {['Instala como app no celular', 'Funciona sem internet', 'Cancele quando quiser'].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Product visual: desktop panel (sm+) with the phone in front; phone only on mobile */}
        <div className="rise-soft relative mx-auto w-full max-w-[560px] lg:max-w-none" style={{ ['--d' as string]: '0.2s' }}>
          <div aria-hidden className="absolute inset-x-6 top-10 bottom-0 rounded-[3rem] bg-brand-500/30 blur-[80px]" />
          <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c12] shadow-2xl shadow-black/60 sm:ml-24 sm:mb-16 sm:block">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="ml-3 rounded-md bg-white/[0.05] px-3 py-0.5 text-[10px] text-surface-500">vynta.digital/dashboard</span>
            </div>
            <Image src="/images/landing/dashboard-desktop.webp" alt="Painel do Vynta com progresso do dia, agenda e finanças" width={1600} height={1000} sizes="(min-width: 1024px) 560px, 90vw" className="h-auto w-full" />
          </div>

          <div className="relative mx-auto w-[248px] sm:absolute sm:bottom-0 sm:left-0 sm:w-[180px]" data-parallax="-0.03">
            <div className="relative h-[470px] overflow-hidden rounded-[2.2rem] [mask-image:linear-gradient(to_bottom,black_82%,transparent)] sm:h-auto sm:[mask-image:none]">
              <Phone src="/images/landing/finances-mobile.webp" alt="Tela de finanças do Vynta no celular com saldo, receitas e despesas" priority sizes="(min-width: 640px) 180px, 248px" />
            </div>
          </div>

          <Toast icon={CreditCard} tone="bg-amber-400/15 text-amber-300" title="Fatura vence em 3 dias" body="Nubank · R$ 538,80 · dia 10" className="-left-1 top-[34%] sm:-top-5 sm:left-auto sm:right-6" delay="0.9s" float="0s" />
          <Toast icon={Check} tone="bg-emerald-400/15 text-emerald-300" title="Gasto anotado" body="Uber · R$ 32,50 · Transporte" className="-right-1 top-[57%] sm:-right-4 sm:top-auto sm:bottom-3" delay="1.4s" float="1.5s" />
          <Toast icon={Bell} tone="bg-brand-400/15 text-brand-200" title="Falta 1 hábito hoje" body="Ler 20 minutos · 2 de 3 feitos" className="bottom-6 left-1/2 -translate-x-1/2 sm:hidden" delay="1.9s" float="3s" />
        </div>
      </section>

      {/* Marquee */}
      <section aria-label="O que cabe no Vynta" className="lp-marquee-row relative overflow-hidden border-y border-white/[0.06] bg-white/[0.015] py-5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="lp-marquee">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-3 pr-3">
              {MARQUEE.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-surface-300">
                  <Icon className="h-4 w-4 text-brand-300" />
                  {text}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-white/[0.06]">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-4 px-5 py-6 text-sm text-surface-400 sm:px-6 md:grid-cols-4" data-reveal-stagger="70">
          {[
            { icon: ShieldCheck, text: 'Dados protegidos e criptografados' },
            { icon: Lock, text: 'Não pedimos senha do banco' },
            { icon: Bell, text: 'Aviso antes de cada conta vencer' },
            { icon: RefreshCcw, text: 'Sem fidelidade, cancele quando quiser' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} data-reveal="fade" className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0 text-brand-300" />
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* Pains */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28">
        <SectionTitle center eyebrow="Se identifica?" title="Organizar a vida não deveria dar tanto trabalho." />
        <div className="mt-12 grid gap-4 md:grid-cols-3" data-reveal-stagger="110">
          {PAINS.map((pain) => (
            <div key={pain.title} data-reveal className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/15">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                <X className="h-5 w-5 text-rose-400" strokeWidth={2.5} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{pain.title}</h3>
              <p className="mt-2 leading-relaxed text-surface-400">{pain.text}</p>
            </div>
          ))}
        </div>
        <div data-reveal className="mx-auto mt-10 max-w-2xl text-center">
          <p className="text-lg text-surface-300">
            Você não está sozinho: <span className="font-semibold text-white">52% dos brasileiros</span> têm uma ideia, mas não sabem o valor exato do que gastam por mês.
          </p>
          <p className="mt-2 text-xs text-surface-500">Pesquisa Datafolha/Planejar, 2025</p>
          <p className="mt-6 text-lg text-surface-300">
            O problema não é falta de disciplina. É a vida espalhada em lugares demais.{' '}
            <span className="font-semibold text-white">O Vynta junta tudo num painel só.</span>
          </p>
        </div>
      </section>

      {/* Savings simulator */}
      <section className="border-t border-white/[0.06] bg-gradient-to-b from-brand-500/[0.07] to-transparent">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 sm:px-6 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionTitle
            eyebrow="Faça a conta"
            title="Quanto dá pra juntar em um ano?"
            subtitle="Escolha os valores e veja. O Vynta mostra todo dia quanto sobra no mês e quanto falta pra sua meta, então guardar deixa de ser “se sobrar”."
          />
          <div data-reveal="zoom">
            <SavingsSimulator />
          </div>
        </div>
      </section>

      {/* Quick add */}
      <section id="recursos" className="scroll-mt-24 border-t border-white/[0.06]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 md:py-28 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1" data-reveal="zoom">
            <div className="relative">
              <div aria-hidden className="absolute inset-0 m-auto h-64 w-64 rounded-full bg-brand-500/25 blur-[80px]" />
              <div className="relative" data-parallax="-0.04">
                <QuickAddMock />
              </div>
            </div>
          </div>
          <div className="order-1 space-y-7 lg:order-2">
            <span data-reveal className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
              <Zap className="h-5 w-5 text-brand-300" />
            </span>
            <SectionTitle
              title="Comprou, anotou. 5 segundos."
              subtitle="Nada de formulário. O Vynta pede só o essencial, pra você anotar ainda na fila do caixa, antes de guardar o celular no bolso."
            />
            <CheckList
              items={[
                { text: 'Um toque no + e o teclado já abre no valor' },
                { text: 'Escreveu “uber”, “mercado” ou “ifood”? A categoria entra sozinha' },
                { text: 'Seus lançamentos frequentes viram atalhos de um toque' },
                { icon: WifiOff, text: 'Sem internet? Fica salvo no aparelho e sobe sozinho depois' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Push reminders */}
      <section className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 md:py-28 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-7">
            <span data-reveal className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
              <Bell className="h-5 w-5 text-brand-300" />
            </span>
            <SectionTitle
              title="O Vynta te avisa. Você só aparece pra resolver."
              subtitle="Juros de atraso e sequência quebrada acontecem por esquecimento, não por falta de dinheiro ou de vontade. Os avisos chegam no celular mesmo com o app fechado."
            />
            <CheckList
              items={[
                { text: 'De manhã: contas e faturas que vencem hoje, amanhã ou atrasaram' },
                { text: 'Antes de cada compromisso da agenda, com o horário' },
                { text: 'À noite: os hábitos que faltam e os gastos que você ainda não anotou' },
                { text: 'Você escolhe o que recebe e desliga quando quiser' },
              ]}
            />
            <p data-reveal className="text-sm text-surface-500">Funciona no Android, no iPhone (com o app na tela de início) e no computador.</p>
          </div>
          <div data-reveal className="relative">
            <div aria-hidden className="absolute inset-0 m-auto h-72 w-72 rounded-full bg-violet-500/20 blur-[90px]" />
            <div className="relative" data-parallax="0.05">
              <NotificationsMock />
            </div>
          </div>
        </div>
      </section>

      {/* Cards & invoices */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1" data-reveal="zoom">
            <div className="relative mx-auto flex max-w-md justify-center gap-4">
              <div aria-hidden className="absolute inset-0 m-auto h-72 w-72 rounded-full bg-purple-500/20 blur-[90px]" />
              <Phone src="/images/landing/cards-mobile.webp" alt="Tela de cartões do Vynta com fatura atual e limite usado" sizes="240px" className="relative w-[230px] sm:w-[250px]" />
              <div className="relative mt-16 hidden w-[200px] sm:block" data-parallax="-0.06">
                <Phone src="/images/landing/reports-mobile.webp" alt="Relatório financeiro do mês no Vynta" sizes="200px" />
              </div>
            </div>
          </div>
          <div className="order-1 space-y-7 lg:order-2">
            <span data-reveal className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
              <CreditCard className="h-5 w-5 text-brand-300" />
            </span>
            <SectionTitle
              title="A fatura para de ser surpresa."
              subtitle="O Vynta entende como cartão, parcela e assinatura funcionam no Brasil e mostra o mês como ele realmente vai ser, não só o que já passou."
            />
            <CheckList items={CARD_POINTS} />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="overflow-hidden border-t border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionTitle center eyebrow="E não para no dinheiro" title="Sua semana inteira no mesmo app." subtitle="Hábitos, agenda, metas, treinos e notas conversam com as suas finanças. Você abre um app só, todo dia." />
        </div>
        <ul className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-6 lg:mx-auto lg:max-w-6xl lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible" data-reveal-stagger="80">
          {GALLERY.map((item) => (
            <li key={item.title} data-reveal className="w-[64vw] max-w-[240px] shrink-0 snap-center lg:w-auto lg:max-w-none">
              <div className="transition duration-500 hover:-translate-y-2">
                <Phone src={item.src} alt={`Tela de ${item.title} do Vynta`} sizes="(min-width: 1024px) 180px, 240px" />
              </div>
              <h3 className="mt-4 text-center font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-center text-sm text-surface-400">{item.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-center text-xs text-surface-500 lg:hidden">Arraste para o lado →</p>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="scroll-mt-24 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28">
          <SectionTitle center eyebrow="Como funciona" title="Do cadastro ao mês organizado em minutos." />
          <div className="relative mt-12">
            <div aria-hidden data-reveal="fade" className="absolute left-[16%] right-[16%] top-[2.6rem] z-10 hidden h-px md:block">
              <div className="grow-x h-px w-full bg-gradient-to-r from-brand-500/0 via-brand-400/60 to-brand-500/0" />
            </div>
            <ol className="grid gap-4 md:grid-cols-3" data-reveal-stagger="120">
              {STEPS.map((step, i) => (
                <li key={step.title} data-reveal className="relative rounded-2xl border border-white/[0.08] bg-[#0b0c12] p-6">
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-display text-sm font-semibold text-white shadow-[0_0_30px_-6px_rgba(66,88,249,0.9)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-surface-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div data-reveal className="mt-10 flex flex-col items-center gap-3">
            <PrimaryButton location="how_it_works" />
            <CtaNote />
          </div>
        </div>
      </section>

      {/* Replaces */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 sm:px-6 md:grid-cols-2">
          <SectionTitle
            title="Um app no lugar de seis."
            subtitle="Quando tudo está no mesmo lugar, você abre todo dia. E é aí que a organização começa a funcionar de verdade."
          />
          <div data-reveal="right" className="rounded-2xl border border-white/[0.08] bg-[#0b0c12] p-6">
            <ul className="space-y-3" data-reveal-stagger="70">
              {REPLACES.map((item) => (
                <li key={item} data-reveal="left" className="flex items-center justify-between gap-4 text-surface-400">
                  <span className="line-through decoration-rose-400/60">{item}</span>
                  <X className="h-4 w-4 text-rose-400/70" />
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/[0.08] pt-5">
              <BrandLogo size="sm" textClassName="text-white" />
              <span className="text-sm font-semibold text-emerald-400">a partir de {formatBRL(YEARLY_MONTHLY_EQUIVALENT_CENTS)}/mês</span>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 md:py-28">
        <p data-reveal className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Por que o Vynta existe</p>
        <blockquote data-reveal className="mt-6 text-balance font-display text-xl font-medium leading-snug text-white sm:text-2xl md:text-3xl">
          “Eu vivia com uma planilha de gastos, um app de hábitos e anotações espalhadas pelo celular. Criei o Vynta pra resolver isso pra mim. Hoje é onde eu organizo meu dinheiro e minha rotina, todo dia.”
        </blockquote>
        <p data-reveal className="mt-6 text-sm text-surface-400">Lucas Ximenes, criador do Vynta</p>
      </section>

      {/* Pricing */}
      <section id="planos" className="scroll-mt-24 border-t border-white/[0.06] bg-gradient-to-b from-brand-500/[0.07] to-transparent">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-6 md:py-28">
          <ViewTracker eventName="plan_viewed" metadata={{ source: 'landing_page' }} />
          <SectionTitle
            center
            eyebrow="Preço sem letrinha miúda"
            title="Um plano. Tudo incluso."
            subtitle={`Comece com ${TRIAL_DAYS} dias grátis. Você só paga se decidir continuar.`}
          />

          <div className="mt-12 grid items-stretch gap-5 md:grid-cols-2" data-reveal-stagger="120">
            {/* Yearly */}
            <div data-reveal className="relative flex flex-col rounded-3xl border border-brand-400/50 bg-gradient-to-b from-brand-500/[0.14] to-[#0b0c12] p-7 shadow-[0_0_90px_-30px_rgba(66,88,249,0.8)] md:order-2">
              <span className="absolute -top-3 left-7 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                Economize {YEARLY_DISCOUNT_PERCENT}%
              </span>
              <h3 className="text-lg font-semibold text-white">Anual</h3>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-semibold tracking-tight text-white">{formatBRL(YEARLY_MONTHLY_EQUIVALENT_CENTS)}</span>
                <span className="text-surface-400">/mês</span>
              </div>
              <p className="mt-2 text-sm text-surface-400">
                {formatBRL(PLANS.pro_yearly.priceCents)} cobrados uma vez por ano · você economiza {formatBRL(YEARLY_SAVINGS_CENTS)}
              </p>
              <TrackedCTA
                href="/register?plan=pro_yearly"
                location="pricing_yearly"
                event="checkout_started"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 font-semibold text-white transition hover:bg-brand-400 active:scale-[0.98]"
              >
                Testar {TRIAL_DAYS} dias grátis <ArrowRight className="h-4 w-4" />
              </TrackedCTA>
            </div>

            {/* Monthly */}
            <div data-reveal className="flex flex-col rounded-3xl border border-white/10 bg-[#0b0c12] p-7 md:order-1">
              <h3 className="text-lg font-semibold text-white">Mensal</h3>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-semibold tracking-tight text-white">{formatBRL(PLANS.pro.priceCents)}</span>
                <span className="text-surface-400">/mês</span>
              </div>
              <p className="mt-2 text-sm text-surface-400">Cobrado todo mês · cancele quando quiser</p>
              <TrackedCTA
                href="/register?plan=pro"
                location="pricing_monthly"
                event="checkout_started"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-4 font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
              >
                Testar {TRIAL_DAYS} dias grátis
              </TrackedCTA>
            </div>
          </div>

          <div data-reveal className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
            <p className="text-sm font-semibold text-white">Os dois planos incluem:</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-surface-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal className="mt-6 flex flex-col items-center justify-center gap-x-8 gap-y-3 text-sm text-surface-400 sm:flex-row">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> 7 dias de garantia após o pagamento</span>
            <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-emerald-400" /> Pix ou cartão</span>
            <span className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-emerald-400" /> Sem fidelidade</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="duvidas" className="mx-auto max-w-3xl scroll-mt-24 px-5 py-20 sm:px-6 md:py-28">
        <SectionTitle center title="Ficou alguma dúvida?" subtitle="As perguntas que mais recebemos, respondidas sem enrolação." />
        <div data-reveal className="lp-faq mt-10 divide-y divide-white/[0.08] rounded-3xl border border-white/[0.08] bg-white/[0.02]">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-white">
                {item.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-surface-400 transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="pt-3 leading-relaxed text-surface-400">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24 sm:px-6">
        <div data-reveal="zoom" className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-brand-400/30 bg-gradient-to-br from-brand-600 via-brand-700 to-violet-800 px-6 py-14 text-center md:py-20">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_60%)]" />
          <div aria-hidden className="absolute -bottom-24 left-1/2 h-48 w-[80%] -translate-x-1/2 rounded-full bg-violet-400/30 blur-3xl" />
          <div className="relative space-y-6">
            <h2 className="mx-auto max-w-2xl text-balance font-display text-[2rem] font-semibold leading-tight tracking-tight text-white md:text-5xl">
              Você leu até aqui. Bora fechar o próximo mês no azul?
            </h2>
            <p className="mx-auto max-w-lg text-pretty text-brand-100/90">
              Em 1 minuto você cria a conta, anota o primeiro gasto e liga os avisos. Se não fizer diferença em {TRIAL_DAYS} dias, você não paga nada.
            </p>
            <div className="flex flex-col items-center gap-3">
              <TrackedCTA
                href="/register"
                location="final_cta"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-base font-semibold text-brand-700 shadow-xl transition duration-300 hover:-translate-y-0.5 hover:bg-brand-50 active:scale-[0.98] sm:w-auto"
              >
                {PRIMARY_CTA} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </TrackedCTA>
              <p className="text-[13px] text-brand-100/80"><span className="font-semibold text-white">Sem cartão, sem CPF.</span> Cancele quando quiser.</p>
            </div>
          </div>
        </div>
      </section>

      <footer id="contato" className="border-t border-white/[0.06] pb-32 pt-10 md:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 text-sm text-surface-500 sm:px-6 md:flex-row">
          <BrandLogo size="sm" textClassName="text-surface-300" />
          <div className="flex flex-col items-center gap-1.5 text-center text-xs text-surface-400">
            <p className="text-sm text-surface-300">© {new Date().getFullYear()} Vynta · CNPJ: 61.751.793/0001-75</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <a href="https://wa.me/5585992551864" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                WhatsApp: (85) 99255-1864
              </a>
              <span aria-hidden className="hidden sm:inline">·</span>
              <a href="mailto:lucasximenes177@gmail.com" className="transition hover:text-white">
                lucasximenes177@gmail.com
              </a>
            </div>
          </div>
          <div className="flex gap-5">
            <Link href="/login" className="transition hover:text-white">Entrar</Link>
            <a href="#duvidas" className="transition hover:text-white">Dúvidas</a>
            <a href="#planos" className="transition hover:text-white">Preço</a>
          </div>
        </div>
      </footer>

      <StickyMobileCTA />
    </main>
  )
}
