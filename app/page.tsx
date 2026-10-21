import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, Bell, CalendarDays, Check, CreditCard, Dumbbell, FileDown, Flame, Lock,
  PieChart, RefreshCcw, ShieldCheck, Smartphone, Sparkles, StickyNote, Target, Wallet, X, Zap,
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import FunnelTracker from '@/components/FunnelTracker'
import TrackedCTA from '@/components/landing/TrackedCTA'
import ViewTracker from '@/components/landing/ViewTracker'
import StickyMobileCTA from '@/components/landing/StickyMobileCTA'
import { AgendaMock, FinanceMock, GoalsMock, HabitsMock, QuickAddMock, WorkoutMock } from '@/components/landing/ProductMocks'
import {
  PLANS, PLAN_FEATURES, TRIAL_DAYS, YEARLY_DISCOUNT_PERCENT, YEARLY_MONTHLY_EQUIVALENT_CENTS,
  YEARLY_SAVINGS_CENTS, formatBRL,
} from '@/lib/plans'

export const metadata: Metadata = {
  title: { absolute: 'Vynta — Controle financeiro, hábitos e rotina em um só app' },
  description: `Saiba pra onde vai cada real, controle cartões e parcelas, mantenha seus hábitos e organize sua semana em um só lugar. Teste ${TRIAL_DAYS} dias grátis, sem cartão.`,
  openGraph: {
    title: 'Vynta — Seu dinheiro e sua rotina em um só app',
    description: `Finanças, cartões, metas, hábitos, agenda e treinos num painel só. ${TRIAL_DAYS} dias grátis, sem cartão.`,
    images: ['/images/painel V2.webp'],
    locale: 'pt_BR',
    type: 'website',
  },
}

const PRIMARY_CTA = `Testar ${TRIAL_DAYS} dias grátis`

const PAINS = [
  {
    title: 'O mês acaba antes do salário',
    text: 'Você trabalha o mês todo e, na última semana, não sabe explicar pra onde o dinheiro foi.',
  },
  {
    title: 'A fatura sempre assusta',
    text: 'Parcelas esquecidas, assinaturas que você nem usa e uma fatura maior do que você esperava.',
  },
  {
    title: 'Cinco apps, nenhum hábito',
    text: 'Planilha pra gastos, um app pra hábitos, outro pra treino, agenda no papel. Em duas semanas você larga tudo.',
  },
]

const STEPS = [
  {
    title: 'Crie sua conta em 30 segundos',
    text: 'Só nome, e-mail e senha. Sem cartão, sem CPF, sem instalar nada.',
  },
  {
    title: 'Anote um gasto em segundos',
    text: 'Toque no +, digite o valor e o que foi — a categoria é sugerida sozinha. Menos tempo que a fila do caixa.',
  },
  {
    title: 'Enxergue o mês inteiro',
    text: 'Saldo, fatura, contas a vencer, metas e hábitos do dia em um painel só.',
  },
]

const FINANCE_POINTS = [
  { icon: CreditCard, text: 'Cartões com dia de fechamento e vencimento: veja a fatura certa de cada mês' },
  { icon: RefreshCcw, text: 'Parcelas e assinaturas lançadas automaticamente nos meses seguintes' },
  { icon: Bell, text: 'Alertas de contas e faturas que estão pra vencer' },
  { icon: Sparkles, text: 'Relatórios mensais com insights de IA sobre seus gastos' },
]

const MODULES = [
  {
    icon: Target,
    title: 'Metas',
    text: 'Defina quanto quer juntar e acompanhe cada depósito até chegar lá.',
    Mock: GoalsMock,
  },
  {
    icon: Flame,
    title: 'Hábitos',
    text: 'Marque o dia, mantenha a sequência e veja sua evolução semana a semana.',
    Mock: HabitsMock,
  },
  {
    icon: CalendarDays,
    title: 'Agenda',
    text: 'Compromissos e lembretes do mês, junto com suas contas e metas.',
    Mock: AgendaMock,
  },
  {
    icon: Dumbbell,
    title: 'Treinos',
    text: 'Monte sua ficha, registre cargas e acompanhe sua evolução.',
    Mock: WorkoutMock,
  },
]

const REPLACES = [
  'Planilha de gastos',
  'App de controle financeiro',
  'App de hábitos',
  'Agenda',
  'Ficha de treino',
  'Bloco de notas',
]

const FAQ = [
  {
    q: 'Preciso colocar cartão para testar?',
    a: `Não. Você testa tudo por ${TRIAL_DAYS} dias só com nome, e-mail e senha. Nada é cobrado automaticamente: se quiser continuar, você escolhe o plano depois.`,
  },
  {
    q: 'O Vynta se conecta com meu banco?',
    a: 'Não. Os lançamentos são manuais e rápidos, e parcelas e assinaturas se repetem sozinhas. Assim você não compartilha a senha do banco com ninguém, e registrar faz você prestar atenção no que gasta.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Sim — foi feito pra celular. Instala na tela inicial como um app (sem loja), abre rápido e o lançamento rápido anota um gasto em poucos segundos, até sem internet: ele fica salvo no aparelho e é enviado sozinho depois.',
  },
  {
    q: 'Como funciona a cobrança?',
    a: `Assinatura recorrente via Pix ou cartão: ${formatBRL(PLANS.pro.priceCents)} por mês ou ${formatBRL(PLANS.pro_yearly.priceCents)} por ano. Você cancela quando quiser, em poucos cliques, e o acesso continua até o fim do período pago.`,
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

function SectionTitle({ eyebrow, title, subtitle, center = false }: { eyebrow?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={`space-y-4 ${center ? 'mx-auto text-center' : ''} max-w-2xl`}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">{eyebrow}</p>}
      <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-white md:text-5xl">{title}</h2>
      {subtitle && <p className="text-base leading-relaxed text-surface-400 md:text-lg">{subtitle}</p>}
    </div>
  )
}

function ProductShot({ src, alt, width = 1601, height = 882, priority = false, className = '' }: { src: string; alt: string; width?: number; height?: number; priority?: boolean; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 shadow-2xl shadow-black/40 ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(min-width: 1024px) 640px, 100vw"
        className="h-auto w-full rounded-xl"
      />
    </div>
  )
}

function PrimaryButton({ location, children = PRIMARY_CTA, className = '' }: { location: string; children?: React.ReactNode; className?: string }) {
  return (
    <TrackedCTA
      href="/register"
      location={location}
      className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_40px_-10px_rgba(66,88,249,0.9)] transition hover:bg-brand-400 active:scale-[0.98] ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </TrackedCTA>
  )
}

export default function LandingPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#07080c] font-sans text-surface-200 selection:bg-brand-500/30">
      <FunnelTracker eventName="landing_view" />

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[radial-gradient(ellipse_at_top,rgba(66,88,249,0.22),transparent_60%)]" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#07080c]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Vynta">
            <BrandLogo size="md" textClassName="text-white" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-surface-400 md:flex">
            <a href="#recursos" className="transition hover:text-white">Recursos</a>
            <a href="#como-funciona" className="transition hover:text-white">Como funciona</a>
            <a href="#planos" className="transition hover:text-white">Preço</a>
            <a href="#duvidas" className="transition hover:text-white">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="px-2 py-2 text-sm font-medium text-surface-300 transition hover:text-white">
              Entrar
            </Link>
            <TrackedCTA
              href="/register"
              location="header"
              className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-[#07080c] transition hover:bg-surface-200"
            >
              Testar grátis
            </TrackedCTA>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-24">
        <div className="animate-fade-in space-y-7 text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-surface-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Finanças, hábitos, agenda e treinos num só lugar
          </p>
          <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
            Chega de terminar o mês sem saber{' '}
            <span className="bg-gradient-to-r from-brand-300 to-violet-300 bg-clip-text text-transparent">pra onde foi o dinheiro.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-surface-400 lg:mx-0">
            O Vynta mostra seu saldo real, a fatura de cada cartão e as contas que estão pra vencer. E ainda organiza seus hábitos, sua agenda e seus treinos no mesmo app.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <PrimaryButton location="hero" className="w-full sm:w-auto" />
            <a href="#como-funciona" className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3.5 text-[15px] font-medium text-surface-200 transition hover:bg-white/5">
              Ver como funciona
            </a>
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-surface-400 lg:justify-start">
            {['Sem cartão de crédito', 'Sem CPF', 'Instala como app no celular'].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[280px] sm:hidden">
          <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-brand-500/25 blur-3xl" />
          <div className="relative h-[440px] overflow-hidden rounded-[2rem] border border-white/15 bg-[#07080c] p-1.5 shadow-2xl shadow-black/60 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
            <Image src="/images/Painel Mobile V2.webp" alt="Painel do Vynta no celular" width={666} height={1280} priority sizes="280px" className="h-auto w-full rounded-[1.6rem]" />
          </div>
        </div>

        <div className="relative mx-auto hidden w-full max-w-xl sm:block lg:max-w-none">
          <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-brand-500/20 blur-3xl" />
          <ProductShot src="/images/painel V2.webp" alt="Painel do Vynta com saldo, receitas, despesas, hábitos e agenda" width={1593} height={755} priority className="relative" />
          <div className="absolute -bottom-8 -left-3 hidden w-[34%] rounded-[1.4rem] border border-white/15 bg-[#07080c] p-1 shadow-2xl shadow-black/60 sm:block lg:-left-10">
            <Image src="/images/Finanças Mobile V2.webp" alt="Tela de finanças do Vynta no celular" width={837} height={1600} className="h-auto w-full rounded-[1.2rem]" sizes="220px" />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-4 px-4 py-6 text-sm text-surface-400 sm:px-6 md:grid-cols-4">
          {[
            { icon: ShieldCheck, text: 'Dados protegidos e criptografados' },
            { icon: Lock, text: 'Não pedimos senha do banco' },
            { icon: Smartphone, text: 'Celular e computador' },
            { icon: RefreshCcw, text: 'Cancele quando quiser' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0 text-brand-300" />
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* Pains */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <SectionTitle center eyebrow="Se identifica?" title="Organizar a vida não deveria dar tanto trabalho." />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PAINS.map((pain) => (
            <div key={pain.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <X className="h-5 w-5 text-rose-400" strokeWidth={2.5} />
              <h3 className="mt-4 text-lg font-semibold text-white">{pain.title}</h3>
              <p className="mt-2 leading-relaxed text-surface-400">{pain.text}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-lg text-surface-300">
          O problema não é falta de disciplina. É ter a sua vida espalhada em lugares demais.{' '}
          <span className="font-semibold text-white">O Vynta junta tudo num painel só.</span>
        </p>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="scroll-mt-20 border-t border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <SectionTitle center eyebrow="Como funciona" title="Do cadastro ao mês organizado em minutos." />
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative rounded-2xl border border-white/[0.08] bg-[#0b0c12] p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 font-display text-sm font-semibold text-brand-300">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-surface-400">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <PrimaryButton location="how_it_works">Criar minha conta grátis</PrimaryButton>
          </div>
        </div>
      </section>

      {/* Quick add — built for the phone in your pocket */}
      <section className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <QuickAddMock />
          </div>
          <div className="order-1 space-y-6 lg:order-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
              <Zap className="h-5 w-5 text-brand-300" />
            </div>
            <SectionTitle
              title="Comprou, anotou, pronto. Menos de 30 segundos."
              subtitle="A maioria dos apps pede formulário. O Vynta pede só o essencial — feito pra você anotar ainda na fila do caixa, antes de guardar o celular no bolso."
            />
            <ul className="space-y-4">
              {[
                'Um toque no botão + e o teclado já abre no valor',
                'Escreveu “uber”, “mercado” ou “ifood”? A categoria entra sozinha',
                'O dia já vem certo — e seus lançamentos frequentes viram atalhos',
                'Sem internet? Fica salvo no aparelho e é enviado quando conectar',
              ].map((text) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                    <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
                  </span>
                  <span className="leading-relaxed text-surface-300">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Finance deep dive */}
      <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
              <Wallet className="h-5 w-5 text-brand-300" />
            </div>
            <SectionTitle
              title="Seu dinheiro sob controle, de verdade."
              subtitle="Não é só anotar gastos. O Vynta entende como cartão, parcela e assinatura funcionam no Brasil e te mostra o mês como ele realmente vai ser."
            />
            <ul className="space-y-4">
              {FINANCE_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                    <Icon className="h-4 w-4 text-brand-300" />
                  </span>
                  <span className="leading-relaxed text-surface-300">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-violet-500/10 blur-3xl" />
            <div className="relative mx-auto max-w-md">
              <FinanceMock />
            </div>
          </div>
        </div>
      </section>

      {/* Other modules */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 md:pb-28">
        <SectionTitle center eyebrow="E não para no dinheiro" title="Tudo que importa na sua semana, no mesmo lugar." />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {MODULES.map(({ icon: Icon, title, text, Mock }) => (
            <article key={title} className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <div className="p-6">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-5 w-5 text-brand-300" />
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                </div>
                <p className="mt-2 leading-relaxed text-surface-400">{text}</p>
              </div>
              <div className="mt-auto bg-gradient-to-b from-transparent to-brand-500/[0.06] px-6 pb-6">
                <Mock />
              </div>
            </article>
          ))}
        </div>
        <ul className="mt-6 grid gap-3 text-sm text-surface-400 sm:grid-cols-3">
          {[
            { icon: StickyNote, text: 'Notas ligadas às suas metas e gastos' },
            { icon: FileDown, text: 'Exporte relatórios em PDF, Excel e CSV' },
            { icon: PieChart, text: 'Gráficos por categoria e evolução mensal' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] px-4 py-3">
              <Icon className="h-4 w-4 shrink-0 text-brand-300" />
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* Replaces */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2">
          <SectionTitle
            title="Um app no lugar de seis."
            subtitle="Quando tudo está no mesmo lugar, você abre todo dia. E é aí que a organização começa a funcionar."
          />
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0c12] p-6">
            <ul className="space-y-3">
              {REPLACES.map((item) => (
                <li key={item} className="flex items-center justify-between gap-4 text-surface-400">
                  <span className="line-through decoration-surface-600">{item}</span>
                  <X className="h-4 w-4 text-surface-600" />
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
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Por que o Vynta existe</p>
        <blockquote className="mt-6 font-display text-xl font-medium leading-snug text-white sm:text-2xl md:text-3xl">
          “Eu vivia com uma planilha de gastos, um app de hábitos e anotações espalhadas pelo celular. Criei o Vynta pra resolver isso pra mim. Hoje é onde eu organizo meu dinheiro e minha rotina, todo dia.”
        </blockquote>
        <p className="mt-6 text-sm text-surface-400">Lucas Ximenes, criador do Vynta</p>
      </section>

      {/* Pricing */}
      <section id="planos" className="scroll-mt-20 border-t border-white/[0.06] bg-gradient-to-b from-brand-500/[0.06] to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 md:py-28">
          <ViewTracker eventName="plan_viewed" metadata={{ source: 'landing_page' }} />
          <SectionTitle
            center
            eyebrow="Preço simples"
            title="Um plano com tudo incluso."
            subtitle={`Comece com ${TRIAL_DAYS} dias grátis. Você só paga se decidir continuar.`}
          />

          <div className="mt-12 grid items-stretch gap-5 md:grid-cols-2">
            {/* Yearly */}
            <div className="relative flex flex-col rounded-2xl border border-brand-400/50 bg-gradient-to-b from-brand-500/[0.12] to-[#0b0c12] p-7 shadow-[0_0_80px_-30px_rgba(66,88,249,0.7)] md:order-2">
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
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 font-semibold text-white transition hover:bg-brand-400"
              >
                {PRIMARY_CTA} <ArrowRight className="h-4 w-4" />
              </TrackedCTA>
            </div>

            {/* Monthly */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0b0c12] p-7 md:order-1">
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
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                {PRIMARY_CTA}
              </TrackedCTA>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
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

          <div className="mt-6 flex flex-col items-center justify-center gap-x-8 gap-y-3 text-sm text-surface-400 sm:flex-row">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> 7 dias de garantia após o pagamento</span>
            <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-400" /> Pix ou cartão</span>
            <span className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-emerald-400" /> Sem fidelidade</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="duvidas" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28">
        <SectionTitle center title="Perguntas frequentes" />
        <div className="mt-10 divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-white">
                {item.q}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-surface-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-surface-400">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-brand-400/30 bg-gradient-to-br from-brand-600 via-brand-700 to-violet-800 px-6 py-14 text-center md:py-20">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
          <div className="relative space-y-6">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              Comece hoje e feche o próximo mês no azul.
            </h2>
            <p className="mx-auto max-w-lg text-brand-100/90">
              {TRIAL_DAYS} dias grátis, sem cartão e sem CPF. Se não fizer diferença na sua rotina, você não paga nada.
            </p>
            <TrackedCTA
              href="/register"
              location="final_cta"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-[15px] font-semibold text-brand-700 shadow-xl transition hover:bg-brand-50 active:scale-[0.98]"
            >
              {PRIMARY_CTA} <ArrowRight className="h-4 w-4" />
            </TrackedCTA>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] pb-28 pt-10 md:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-surface-500 sm:px-6 md:flex-row">
          <BrandLogo size="sm" textClassName="text-surface-300" />
          <p>© {new Date().getFullYear()} Vynta. Feito no Brasil.</p>
          <div className="flex gap-5">
            <Link href="/login" className="transition hover:text-white">Entrar</Link>
            <a href="#duvidas" className="transition hover:text-white">Dúvidas</a>
          </div>
        </div>
      </footer>

      <StickyMobileCTA />
    </main>
  )
}
