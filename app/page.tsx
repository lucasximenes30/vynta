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
  description: `Organize gastos, parcelas e faturas para entender o que sobra no mês. Metas, hábitos e agenda no mesmo app. ${TRIAL_DAYS} dias grátis, sem cartão.`,
  openGraph: {
    title: 'Vynta — Seu dinheiro e sua rotina em um só app',
    description: `Finanças, cartões, metas, hábitos, agenda e treinos num painel só. ${TRIAL_DAYS} dias grátis, sem cartão.`,
    images: [{ url: '/images/landing/og.jpg', width: 1200, height: 630 }],
    locale: 'pt_BR',
    type: 'website',
  },
}

// Landing has its own theme color so iOS/Android tint the top chrome dark like the page.
export const viewport: Viewport = { themeColor: '#14121c' }

const PRIMARY_CTA = `Testar ${TRIAL_DAYS} dias grátis`

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
  { title: 'Crie sua conta', text: 'Só nome, e-mail e senha. Sem cartão, sem CPF, sem baixar nada na loja.' },
  { title: 'Anote o primeiro gasto', text: 'Toque no +, digite o valor e o que foi. O Vynta sugere a categoria.' },
  { title: 'Ative os avisos', text: 'Escolha os avisos de contas, agenda e hábitos que quer receber no celular.' },
]

const CARD_POINTS = [
  { icon: CreditCard, text: 'Dia de fechamento e vencimento de cada cartão: você vê a fatura certa de cada mês' },
  { icon: Layers, text: 'Parcelas e assinaturas lançadas sozinhas nos meses seguintes' },
  { icon: FileDown, text: 'Importe a fatura do Nubank por CSV, sem digitar compra por compra' },
  { icon: Sparkles, text: 'Relatório do mês com insights de IA sobre onde dá pra economizar' },
]

const GALLERY = [
  { src: '/images/landing/habits-mobile.webp', title: 'Hábitos', text: 'Marque o dia e não quebre a sequência.' },
  { src: '/images/landing/calendar-mobile.webp', title: 'Agenda', text: 'Seus compromissos, dia a dia.' },
  { src: '/images/landing/goals-mobile.webp', title: 'Metas', text: 'Quanto já guardou e quanto falta.' },
  { src: '/images/landing/workout-mobile.webp', title: 'Treinos', text: 'Sua ficha e suas cargas, sem caderno.' },
  { src: '/images/landing/reports-mobile.webp', title: 'Relatórios', text: 'O mês inteiro em uma tela.' },
  { src: '/images/landing/notes-mobile.webp', title: 'Notas', text: 'Um lugar para guardar suas ideias.' },
]

const REPLACES = ['Planilha de gastos', 'App de finanças', 'App de hábitos', 'Agenda de papel', 'Ficha de treino', 'Bloco de notas']

const FAQ = [
  {
    q: 'Preciso colocar cartão para testar?',
    a: `Não. Você testa tudo por ${TRIAL_DAYS} dias só com nome, e-mail e senha. Nada é cobrado automaticamente: se quiser continuar, você escolhe o plano depois.`,
  },
  {
    q: 'O Vynta se conecta com meu banco?',
    a: 'Não há conexão automática com o banco. Você registra entradas e gastos, cadastra parcelas e recorrências ou importa a fatura do Nubank por CSV. O Vynta organiza o que você informa, sem pedir sua senha bancária.',
  },
  {
    q: 'O Vynta me avisa das contas?',
    a: 'Sim. Com a permissão de notificações ativada, você recebe avisos de contas e faturas, resumo da agenda e lembretes de hábitos e gastos. Você escolhe as categorias. No iPhone, é preciso instalar o Vynta na tela de início e usar iOS 16.4 ou posterior.',
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
    a: 'A conexão usa HTTPS, a senha é armazenada como hash e o acesso aos seus registros exige uma sessão autenticada. Não pedimos a senha do seu banco. Você pode exportar seus registros financeiros pelo app.',
  },
  {
    q: 'Posso usar só a parte financeira?',
    a: 'Pode. Cada área é independente: use só finanças, ou finanças e hábitos, do jeito que fizer sentido pra você. O plano inclui todas.',
  },
]

function SectionTitle({ eyebrow, title, subtitle, center = false }: { eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; center?: boolean }) {
  return (
    <div data-reveal className={`space-y-4 ${center ? 'mx-auto text-center' : ''} max-w-2xl`}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sprout-lime">{eyebrow}</p>}
      <h2 className="text-balance font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-[#f5f2fa] md:text-5xl">{title}</h2>
      {subtitle && <p className="text-pretty text-base leading-relaxed text-[#c1bacf] md:text-lg">{subtitle}</p>}
    </div>
  )
}

function CtaNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[13px] text-[#c1bacf] ${className}`}>
      <span className="font-semibold text-[#e8e3ef]">Sem cartão.</span> Sem cobrança automática no fim do teste.
    </p>
  )
}

function PrimaryButton({ location, children = PRIMARY_CTA, className = '' }: { location: string; children?: React.ReactNode; className?: string }) {
  return (
    <TrackedCTA
      href="/register"
      location={location}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-sprout-lime px-7 py-4 text-base font-semibold text-[#294e48] shadow-[0_8px_24px_-12px_rgba(41,78,72,0.4)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-200 active:scale-[0.98] ${className}`}
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
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sprout-lavender/10">
            <Icon className="h-4 w-4 text-sprout-lime" />
          </span>
          <span className="leading-relaxed text-[#d8d3e4]">{text}</span>
        </li>
      ))}
    </ul>
  )
}

function Phone({ src, alt, priority = false, sizes = '280px', className = '' }: { src: string; alt: string; priority?: boolean; sizes?: string; className?: string }) {
  return (
    <div className={`rounded-[2.2rem] border border-white/15 bg-[#050608] p-1.5 shadow-2xl shadow-black/25 ring-1 ring-black/40 ${className}`}>
      <Image src={src} alt={alt} width={780} height={1688} priority={priority} sizes={sizes} className="h-auto w-full rounded-[1.8rem]" />
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="landing relative min-h-[100dvh] overflow-x-clip bg-[#14121c] font-sans text-[#e8e3ef] selection:bg-sprout-lime">
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      <LandingMotion />
      <FunnelTracker eventName="landing_view" onceKey="landing_view" />

      {/* Covers the iOS status bar / bottom toolbar areas, where Safari shows the light body bg */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#14121c]" />
      <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-[650px] w-[65%] bg-[radial-gradient(ellipse_at_top_right,rgba(173,166,206,0.18),transparent_70%)]" />

      {/* Header */}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#201c2b]/85 px-3 shadow-lg shadow-brand-950/5 backdrop-blur-xl sm:h-16 sm:px-5">
          <Link href="/" aria-label="Vynta">
            <BrandLogo size="md" textClassName="text-[#f5f2fa]" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-[#c1bacf] md:flex">
            <a href="#recursos" className="transition hover:text-sprout-lime">Recursos</a>
            <a href="#como-funciona" className="transition hover:text-sprout-lime">Como funciona</a>
            <a href="#planos" className="transition hover:text-sprout-lime">Preço</a>
            <a href="#duvidas" className="transition hover:text-sprout-lime">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/login" className="px-2.5 py-2 text-sm font-medium text-[#d8d3e4] transition hover:text-sprout-lime">
              Entrar
            </Link>
            <TrackedCTA
              href="/register"
              location="header"
              className="rounded-full bg-sprout-lime px-3.5 py-2 text-sm font-semibold text-[#294e48] transition hover:bg-brand-200"
            >
              <span className="sm:hidden">Testar grátis</span>
              <span className="hidden sm:inline">Testar {TRIAL_DAYS} dias grátis</span>
            </TrackedCTA>
          </div>
        </div>
      </header>

      {/* Hero: the approved sprout introduces the brand; the real app shows the product. */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-28">
        <div className="relative z-10 text-center lg:text-left">
          <p className="rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#241f31]/70 px-3.5 py-2 text-xs font-medium text-sprout-lime">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            Seu app de finanças e rotina
          </p>
          <h1 className="rise-soft mt-6 text-balance font-display text-[2.75rem] font-semibold leading-[1.08] tracking-[-0.055em] text-[#f5f2fa] sm:text-6xl lg:text-[4.4rem]" style={{ ['--d' as string]: '0.08s' }}>
            Saiba quanto sobra <span className="lp-highlight">antes do mês acabar.</span>
          </h1>
          <p className="rise-soft mx-auto mt-6 max-w-lg text-pretty text-base leading-relaxed text-[#c1bacf] sm:text-lg lg:mx-0" style={{ ['--d' as string]: '0.16s' }}>
            Reúna gastos, parcelas e faturas para entender o que sobra no mês. O Vynta organiza seu dinheiro e sua rotina no mesmo app.
          </p>
          <div className="rise-soft mt-8 flex flex-col items-center gap-3 lg:items-start" style={{ ['--d' as string]: '0.24s' }}>
            <PrimaryButton location="hero" className="w-full sm:w-auto" />
            <CtaNote />
          </div>
          <a href="#recursos" className="rise mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sprout-lime underline decoration-brand-300 underline-offset-4" style={{ ['--d' as string]: '0.32s' }}>Dá uma olhada por dentro <ArrowRight className="h-4 w-4" /></a>
        </div>
        <div className="rise-soft relative mx-auto h-[420px] w-full max-w-[480px] sm:h-[510px]" style={{ ['--d' as string]: '0.2s' }}>
          <div className="absolute right-0 top-0 w-[78%] overflow-hidden rounded-[2.5rem] bg-sprout-lavender shadow-[0_24px_70px_-35px_rgba(41,78,72,0.3)]" data-parallax="0.025">
            <Image src="/assets/logo/mascot.webp" alt="Broto do Vynta, com duas folhas lima e um sorriso" width={640} height={640} priority sizes="(min-width: 640px) 375px, 70vw" className="h-auto w-full" />
          </div>
          <div className="absolute bottom-6 left-0 w-[44%] sm:bottom-5" data-parallax="-0.025">
            <Phone src="/images/landing/finances-mobile.webp" alt="Finanças do Vynta: saldo, receitas e despesas do mês" priority sizes="(min-width: 640px) 210px, 40vw" />
          </div>
          <div className="lp-float absolute bottom-16 right-0 flex max-w-[56%] items-center gap-2 rounded-2xl border border-white/10 bg-[#211d2c] p-3 shadow-lg shadow-brand-900/5 sm:bottom-24 sm:p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sprout-lime"><Check className="h-4 w-4 text-brand-800" /></span>
            <span className="text-xs leading-relaxed text-sprout-lime sm:text-sm"><strong className="block text-[#f5f2fa]">Um gasto anotado.</strong>Um passo para entender o mês.</span>
          </div>
          <p className="absolute bottom-0 right-0 text-[10px] text-[#aaa1bd] sm:text-xs">Tela demonstrativa · dados ilustrativos</p>
        </div>
      </section>

      {/* Marquee */}
      <section aria-label="O que cabe no Vynta" className="lp-marquee-row relative overflow-hidden border-y border-white/10 bg-[#211d2c]/60 py-5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="lp-marquee">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-3 pr-3">
              {MARQUEE.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-[#241f31]/70 px-4 py-2 text-sm text-[#d8d3e4]">
                  <Icon className="h-4 w-4 text-sprout-lime" />
                  {text}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-white/10">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-4 px-5 py-6 text-sm text-[#c1bacf] sm:px-6 md:grid-cols-4" data-reveal-stagger="70">
          {[
            { icon: ShieldCheck, text: 'Conexão protegida por HTTPS' },
            { icon: Lock, text: 'Não pedimos senha do banco' },
            { icon: Bell, text: 'Avisos de contas e faturas' },
            { icon: RefreshCcw, text: 'Sem fidelidade, cancele quando quiser' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} data-reveal="fade" className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0 text-sprout-lime" />
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
            <div key={pain.title} data-reveal className="rounded-2xl border border-white/10 bg-[#241f31]/70 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/15">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                <X className="h-5 w-5 text-rose-400" strokeWidth={2.5} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[#f5f2fa]">{pain.title}</h3>
              <p className="mt-2 leading-relaxed text-[#c1bacf]">{pain.text}</p>
            </div>
          ))}
        </div>
        <div data-reveal className="mx-auto mt-10 max-w-2xl text-center">
          <p className="mt-6 text-lg text-[#d8d3e4]">
            Quando cada informação fica em um lugar, acompanhar o mês dá mais trabalho.{' '}
            <span className="font-semibold text-[#f5f2fa]">O Vynta junta tudo num painel só.</span>
          </p>
        </div>
      </section>

      {/* Savings simulator */}
      <section className="border-t border-white/10 bg-gradient-to-b from-sprout-lavender/[0.06] to-transparent">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 sm:px-6 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionTitle
            eyebrow="Faça a conta"
            title="Quanto dá pra juntar em um ano?"
            subtitle="Simule um valor mensal para guardar. Depois, acompanhe no Vynta seus gastos e o progresso da sua meta."
          />
          <div data-reveal="zoom">
            <SavingsSimulator />
          </div>
        </div>
      </section>

      {/* Quick add */}
      <section id="recursos" className="scroll-mt-24 border-t border-white/10">
        <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 md:py-28 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1" data-reveal="zoom">
            <div className="relative">
              <div aria-hidden className="absolute inset-0 m-auto h-64 w-64 rounded-full bg-sprout-lavender/15 blur-[80px]" />
              <div className="relative" data-parallax="-0.04">
                <QuickAddMock />
              </div>
            </div>
          </div>
          <div className="order-1 space-y-7 lg:order-2">
            <span data-reveal className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
              <Zap className="h-5 w-5 text-sprout-lime" />
            </span>
            <SectionTitle
              title="Comprou? Anote antes de esquecer."
              subtitle="Abra o lançamento rápido, informe o valor e descreva a compra. A categoria sugerida e os atalhos ajudam na próxima vez."
            />
            <CheckList
              items={[
                { text: 'Um toque no + e o teclado já abre no valor' },
                { text: 'Escreveu “uber”, “mercado” ou “ifood”? Veja a categoria sugerida' },
                { text: 'Seus lançamentos frequentes viram atalhos de um toque' },
                { icon: WifiOff, text: 'Sem internet? Fica salvo no aparelho e sobe sozinho depois' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Push reminders */}
      <section className="border-t border-white/10 bg-[#211d2c]/60">
        <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 md:py-28 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-7">
            <span data-reveal className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15">
              <Bell className="h-5 w-5 text-sprout-lime" />
            </span>
            <SectionTitle
              title="Menos coisas para lembrar de cabeça."
              subtitle="Ative as notificações para receber avisos de contas, faturas e hábitos, mesmo com o app fechado. Você decide quais lembretes fazem sentido."
            />
            <CheckList
              items={[
                { text: 'De manhã: contas e faturas que vencem hoje, amanhã ou atrasaram' },
                { text: 'Resumo da agenda para consultar os compromissos do dia' },
                { text: 'À noite: os hábitos que faltam e os gastos que você ainda não anotou' },
                { text: 'Você escolhe o que recebe e desliga quando quiser' },
              ]}
            />
            <p data-reveal className="text-sm text-[#aaa1bd]">Requer permissão de notificações. No iPhone: iOS 16.4 ou posterior e app instalado na tela de início.</p>
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
              <CreditCard className="h-5 w-5 text-sprout-lime" />
            </span>
            <SectionTitle
              title="Veja as parcelas na fatura certa."
              subtitle="Cadastre fechamento, vencimento e compras. O Vynta distribui as parcelas pelas faturas e mostra o limite comprometido com os lançamentos registrados."
            />
            <CheckList items={CARD_POINTS} />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="overflow-hidden border-t border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionTitle center eyebrow="E não para no dinheiro" title="Sua semana inteira no mesmo app." subtitle="Acompanhe hábitos, consulte a agenda e registre seus treinos junto das finanças. Comece pela área que você precisa e use as outras no seu ritmo." />
        </div>
        <ul className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-6 lg:mx-auto lg:max-w-6xl lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible" data-reveal-stagger="80">
          {GALLERY.map((item) => (
            <li key={item.title} data-reveal className="w-[64vw] max-w-[240px] shrink-0 snap-center lg:w-auto lg:max-w-none">
              <div className="transition duration-500 hover:-translate-y-2">
                <Phone src={item.src} alt={`Tela de ${item.title} do Vynta`} sizes="(min-width: 1024px) 180px, 240px" />
              </div>
              <h3 className="mt-4 text-center font-semibold text-[#f5f2fa]">{item.title}</h3>
              <p className="mt-1 text-center text-sm text-[#c1bacf]">{item.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-center text-xs text-[#aaa1bd] lg:hidden">Arraste para o lado →</p>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="scroll-mt-24 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28">
          <SectionTitle center eyebrow="Como funciona" title="Comece pelo gasto de hoje." />
          <div className="relative mt-12">
            <div aria-hidden data-reveal="fade" className="absolute left-[16%] right-[16%] top-[2.6rem] z-10 hidden h-px md:block">
              <div className="grow-x h-px w-full bg-gradient-to-r from-brand-500/0 via-brand-400/60 to-brand-500/0" />
            </div>
            <ol className="grid gap-4 md:grid-cols-3" data-reveal-stagger="120">
              {STEPS.map((step, i) => (
                <li key={step.title} data-reveal className="relative rounded-2xl border border-white/10 bg-[#211d2c] p-6">
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-display text-sm font-semibold text-white shadow-[0_0_30px_-6px_rgba(50,104,91,0.9)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-[#f5f2fa]">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-[#c1bacf]">{step.text}</p>
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
      <section className="border-y border-white/10 bg-[#211d2c]/60">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 sm:px-6 md:grid-cols-2">
          <SectionTitle
            title="Dinheiro e rotina, lado a lado."
            subtitle="Reúna o que hoje está espalhado entre planilhas e anotações. Todas as áreas estão incluídas; você escolhe quais usar."
          />
          <div data-reveal="right" className="rounded-2xl border border-white/10 bg-[#211d2c] p-6">
            <ul className="space-y-3" data-reveal-stagger="70">
              {REPLACES.map((item) => (
                <li key={item} data-reveal="left" className="flex items-center justify-between gap-4 text-[#c1bacf]">
                  <span className="line-through decoration-rose-400/60">{item}</span>
                  <X className="h-4 w-4 text-rose-400/70" />
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-5">
              <BrandLogo size="sm" textClassName="text-[#f5f2fa]" />
              <span className="text-right text-sm font-semibold text-sprout-lime">{formatBRL(YEARLY_MONTHLY_EQUIVALENT_CENTS)}/mês no anual<br /><span className="text-xs font-normal text-[#c1bacf]">{formatBRL(PLANS.pro_yearly.priceCents)} cobrados por ano</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 md:py-28">
        <p data-reveal className="text-xs font-semibold uppercase tracking-[0.18em] text-sprout-lime">Por que o Vynta existe</p>
        <blockquote data-reveal className="mt-6 text-balance font-display text-xl font-medium leading-snug text-[#f5f2fa] sm:text-2xl md:text-3xl">
          “Eu vivia com uma planilha de gastos, um app de hábitos e anotações espalhadas pelo celular. Criei o Vynta pra resolver isso pra mim. Hoje é onde eu organizo meu dinheiro e minha rotina, todo dia.”
        </blockquote>
        <p data-reveal className="mt-6 text-sm text-[#c1bacf]">Lucas Ximenes, criador do Vynta</p>
      </section>

      {/* Pricing */}
      <section id="planos" className="scroll-mt-24 border-t border-white/10 bg-gradient-to-b from-sprout-lavender/[0.06] to-transparent">
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
            <div data-reveal className="relative flex flex-col rounded-3xl border border-sprout-lavender/40 bg-gradient-to-b from-[#393044] to-[#211d2c] p-7 shadow-[0_16px_50px_-25px_rgba(41,78,72,0.2)] md:order-2">
              <span className="absolute -top-3 left-7 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                Economize {YEARLY_DISCOUNT_PERCENT}%
              </span>
              <h3 className="text-lg font-semibold text-[#f5f2fa]">Anual</h3>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-semibold tracking-tight text-[#f5f2fa]">{formatBRL(YEARLY_MONTHLY_EQUIVALENT_CENTS)}</span>
                <span className="text-[#c1bacf]">/mês</span>
              </div>
              <p className="mt-2 text-sm text-[#c1bacf]">
                {formatBRL(PLANS.pro_yearly.priceCents)} cobrados uma vez por ano · você economiza {formatBRL(YEARLY_SAVINGS_CENTS)}
              </p>
              <TrackedCTA
                href="/register?plan=pro_yearly"
                location="pricing_yearly"
                event="checkout_started"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sprout-lime py-4 font-semibold text-[#294e48] transition hover:bg-brand-200 active:scale-[0.98]"
              >
                Testar {TRIAL_DAYS} dias grátis <ArrowRight className="h-4 w-4" />
              </TrackedCTA>
            </div>

            {/* Monthly */}
            <div data-reveal className="flex flex-col rounded-3xl border border-white/10 bg-[#211d2c] p-7 md:order-1">
              <h3 className="text-lg font-semibold text-[#f5f2fa]">Mensal</h3>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-semibold tracking-tight text-[#f5f2fa]">{formatBRL(PLANS.pro.priceCents)}</span>
                <span className="text-[#c1bacf]">/mês</span>
              </div>
              <p className="mt-2 text-sm text-[#c1bacf]">Cobrado todo mês · cancele quando quiser</p>
              <TrackedCTA
                href="/register?plan=pro"
                location="pricing_monthly"
                event="checkout_started"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#241f31]/70 py-4 font-semibold text-[#f5f2fa] transition hover:bg-white/10 active:scale-[0.98]"
              >
                Testar {TRIAL_DAYS} dias grátis
              </TrackedCTA>
            </div>
          </div>

          <div data-reveal className="mt-8 rounded-3xl border border-white/10 bg-[#241f31]/70 p-6 md:p-8">
            <p className="text-sm font-semibold text-[#f5f2fa]">Os dois planos incluem:</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-[#d8d3e4]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sprout-lime" strokeWidth={2.5} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal className="mt-6 flex flex-col items-center justify-center gap-x-8 gap-y-3 text-sm text-[#c1bacf] sm:flex-row">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sprout-lime" /> 7 dias de garantia após o pagamento</span>
            <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-sprout-lime" /> Pix ou cartão</span>
            <span className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-sprout-lime" /> Sem fidelidade</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="duvidas" className="mx-auto max-w-3xl scroll-mt-24 px-5 py-20 sm:px-6 md:py-28">
        <SectionTitle center title="Ficou alguma dúvida?" subtitle="O que você precisa saber antes de começar." />
        <div data-reveal className="lp-faq mt-10 divide-y divide-white/10 rounded-3xl border border-white/10 bg-[#241f31]/70">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-[#f5f2fa]">
                {item.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-[#c1bacf] transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="pt-3 leading-relaxed text-[#c1bacf]">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24 sm:px-6">
        <div data-reveal="zoom" className="relative mx-auto grid max-w-6xl items-center gap-8 overflow-hidden rounded-[2.5rem] bg-[#292236] p-8 sm:p-12 md:grid-cols-[1fr_240px] md:p-16">
          <div className="relative z-10 space-y-6 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sprout-lime">Um passo de cada vez</p>
            <h2 className="max-w-2xl text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">Seu próximo mês começa com um gasto anotado.</h2>
            <p className="max-w-lg text-pretty leading-relaxed text-white/75">Experimente com a sua rotina por {TRIAL_DAYS} dias. Ao final do teste, você escolhe se quer assinar.</p>
            <TrackedCTA href="/register" location="final_cta" className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-sprout-lime px-7 py-4 font-semibold text-[#294e48] transition hover:-translate-y-0.5 hover:bg-brand-200 sm:w-auto">
              {PRIMARY_CTA} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </TrackedCTA>
            <p className="text-xs text-white/70">Sem cartão. Sem cobrança automática no fim do teste.</p>
          </div>
          <Image src="/assets/logo/mascot.webp" alt="" width={320} height={320} sizes="240px" className="lp-float mx-auto hidden w-full rounded-[2rem] md:block" />
        </div>
      </section>

      <footer id="contato" className="border-t border-white/10 pb-32 pt-10 md:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 text-sm text-[#aaa1bd] sm:px-6 md:flex-row">
          <BrandLogo size="sm" textClassName="text-[#d8d3e4]" />
          <div className="flex flex-col items-center gap-1.5 text-center text-xs text-[#c1bacf]">
            <p className="text-sm text-[#d8d3e4]">© {new Date().getFullYear()} Vynta · CNPJ: 61.751.793/0001-75</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <a href="https://wa.me/5585992551864" target="_blank" rel="noopener noreferrer" className="transition hover:text-sprout-lime">
                WhatsApp: (85) 99255-1864
              </a>
              <span aria-hidden className="hidden sm:inline">·</span>
              <a href="mailto:lucasximenes177@gmail.com" className="transition hover:text-sprout-lime">
                lucasximenes177@gmail.com
              </a>
            </div>
          </div>
          <div className="flex gap-5">
            <Link href="/login" className="transition hover:text-sprout-lime">Entrar</Link>
            <a href="#duvidas" className="transition hover:text-sprout-lime">Dúvidas</a>
            <a href="#planos" className="transition hover:text-sprout-lime">Preço</a>
          </div>
        </div>
      </footer>

      <StickyMobileCTA />
    </main>
  )
}
