'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'

const HELP_SECTIONS = [
  {
    id: 'finances',
    title: 'Finanças',
    icon: Lucide.Wallet,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          O módulo financeiro é o coração do Vynta. Ele permite gerenciar suas receitas, despesas e faturas de cartão de crédito de forma centralizada.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-surface-600 dark:text-surface-400 marker:text-brand-500">
          <li><strong>Como usar:</strong> Adicione transações clicando no botão "Nova Transação". Você pode vincular despesas a cartões de crédito.</li>
          <li><strong>Cartões:</strong> Quando você compra no crédito, o valor vai para a fatura do cartão. Pague a fatura para debitar o valor do seu saldo disponível.</li>
          <li><strong>Dica:</strong> Sempre concilie suas contas bancárias verificando se o saldo no Vynta bate com o saldo real do seu banco.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'calendar',
    title: 'Agenda',
    icon: Lucide.CalendarDays,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Sua agenda pessoal para não perder compromissos, reuniões e eventos importantes.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-surface-600 dark:text-surface-400 marker:text-brand-500">
          <li><strong>Como usar:</strong> Clique em qualquer dia no calendário para visualizar ou adicionar eventos daquele dia.</li>
          <li><strong>Tipos de evento:</strong> Você pode definir horários de início e fim.</li>
          <li><strong>Dica:</strong> Use notas para expandir as informações de um evento complexo (você pode vincular notas a eventos!).</li>
        </ul>
      </div>
    )
  },
  {
    id: 'habits',
    title: 'Hábitos',
    icon: Lucide.CheckSquare,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Construa consistência acompanhando suas atividades diárias e construindo sequências (streaks).
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-surface-600 dark:text-surface-400 marker:text-brand-500">
          <li><strong>Como usar:</strong> Crie um hábito e marque-o como concluído todos os dias clicando no check.</li>
          <li><strong>Sequências:</strong> O sistema conta quantos dias seguidos você manteve o hábito.</li>
          <li><strong>Dica:</strong> Se você falhar um dia, a sequência quebra. Comece com apenas 1 ou 2 hábitos para garantir que vai conseguir mantê-los.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'workout',
    title: 'Treinos',
    icon: Lucide.Dumbbell,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Sua ficha de academia digital. Gerencie sua rotina de exercícios, registre cargas e acompanhe volume.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-surface-600 dark:text-surface-400 marker:text-brand-500">
          <li><strong>Como usar:</strong> Primeiro crie um "Plano de Treino" e adicione "Dias". Depois, vá no banco de exercícios e adicione-os aos dias criados.</li>
          <li><strong>Execução:</strong> No painel, você verá o treino de hoje baseado no dia da semana. Registre o volume levantado e marque como concluído.</li>
          <li><strong>Dica:</strong> O botão "Dicas do IA" gera insights automáticos sobre onde você pode melhorar baseando-se no seu sexo (informado nas configurações) e no volume de exercícios.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'goals',
    title: 'Metas',
    icon: Lucide.Target,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Objetivos financeiros para ajudar você a poupar dinheiro com um propósito (ex: Viagem, Carro, Fundo de Emergência).
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-surface-600 dark:text-surface-400 marker:text-brand-500">
          <li><strong>Como usar:</strong> Crie uma meta definindo um valor alvo. Depois, adicione valores a ela usando o botão "Guardar Dinheiro".</li>
          <li><strong>Retiradas:</strong> Caso precise usar o dinheiro, você pode registrar uma retirada.</li>
          <li><strong>Dica:</strong> O dinheiro nas metas não subtrai do seu saldo financeiro principal automaticamente. As metas servem para organização lógica.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'notes',
    title: 'Notas',
    icon: Lucide.StickyNote,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Uma base de conhecimento rápida para capturar ideias.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-surface-600 dark:text-surface-400 marker:text-brand-500">
          <li><strong>Como usar:</strong> Crie notas com cores e categorias personalizadas. Você pode "Fixar" notas importantes no topo.</li>
          <li><strong>Dica:</strong> Em atualizações futuras, você poderá integrar notas diretamente com transações financeiras.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'faq',
    title: 'Dúvidas Frequentes (FAQ)',
    icon: Lucide.HelpCircle,
    color: 'text-brand-500',
    bg: 'bg-brand-500/10',
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-surface-900 dark:text-white text-sm">Onde altero a moeda ou idioma?</h4>
          <p className="text-sm text-surface-600 dark:text-surface-400">O Vynta opera em BRL (Reais) nativamente. O idioma pode ser consultado na área de Configurações, porém o português é o padrão obrigatório.</p>
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold text-surface-900 dark:text-white text-sm">Como excluo um registro errado?</h4>
          <p className="text-sm text-surface-600 dark:text-surface-400">Na maioria dos módulos (como transações ou exercícios), basta clicar no ícone de "lixeira" vermelho ou usar o menu de três pontos (...) na tabela.</p>
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold text-surface-900 dark:text-white text-sm">Como funciona a inteligência artificial (Insights)?</h4>
          <p className="text-sm text-surface-600 dark:text-surface-400">A IA analisa seus relatórios financeiros (no módulo Relatórios) e seus treinos para gerar análises e conselhos automáticos em português.</p>
        </div>
      </div>
    )
  },
  {
    id: 'pwa',
    title: 'Instalação do Aplicativo',
    icon: Lucide.Download,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Você pode instalar o Vynta no seu celular ou computador para ter acesso mais rápido, como um aplicativo nativo.
        </p>
        <div className="space-y-3">
          <h4 className="font-semibold text-surface-900 dark:text-white text-sm">No iPhone/iPad (Safari)</h4>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Toque no ícone de <Lucide.Share className="inline w-4 h-4 mx-1 text-blue-500" /> (Compartilhar) na barra inferior do Safari e, em seguida, role a tela e toque em <strong>"Adicionar à Tela de Início"</strong>.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold text-surface-900 dark:text-white text-sm">No Android (Chrome)</h4>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Abra o menu do navegador (três pontinhos no canto superior direito) e toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold text-surface-900 dark:text-white text-sm">No Computador (Chrome/Edge)</h4>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Procure pelo ícone de instalação (um monitor com setinha para baixo) no lado direito da barra de endereços (onde você digita o site) e clique nele.
          </p>
        </div>
      </div>
    )
  }
]

export default function HelpClient() {
  const router = useRouter()
  const [openSection, setOpenSection] = useState<string | null>(null)

  const toggleSection = (id: string) => {
    setOpenSection(prev => prev === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-300">
      <header className="border-b border-surface-200/80 bg-white/80 dark:bg-surface-900/80 dark:border-surface-800 sticky top-0 z-30 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/settings')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-colors"
            >
              <Lucide.ArrowLeft strokeWidth={1.5} className="w-5 h-5" />
            </button>
            <h1 className="font-display text-base font-semibold tracking-tight">Central de Ajuda</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-8 pb-32">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-2">
            <Lucide.BookOpen strokeWidth={1.5} className="w-8 h-8" />
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Como usar o Vynta</h2>
          <p className="text-surface-500 dark:text-surface-400 max-w-lg mx-auto">
            Descubra como extrair o máximo do seu ecossistema de gestão pessoal. Clique em qualquer seção para expandir.
          </p>
        </div>

        <div className="space-y-4">
          {HELP_SECTIONS.map((section) => {
            const isOpen = openSection === section.id
            const Icon = section.icon
            
            return (
              <div 
                key={section.id}
                className="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-sm overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.bg} ${section.color}`}>
                      <Icon strokeWidth={1.5} className="w-5 h-5" />
                    </div>
                    <span className="font-display font-semibold text-lg">{section.title}</span>
                  </div>
                  <Lucide.ChevronDown 
                    strokeWidth={1.5} 
                    className={`w-5 h-5 text-surface-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                  />
                </button>

                <div className="collapse-grid" data-open={isOpen} aria-hidden={!isOpen}>
                  <div>
                    <div className="px-6 pb-6 pt-2 border-t border-surface-100 dark:border-surface-800 sm:ml-[4.5rem]">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
