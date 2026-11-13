// Semeia lembretes de "postar story" na agenda de uma conta.
// Uso: npx tsx --env-file=.env scripts/seed-story-events.ts <email>
// Convenção do app: date = meia-noite UTC do dia local; startTime = 'HH:mm' local.
import { prisma } from '../lib/prisma'

// Lembretes pedidos: 1h, 15 min e 5 min antes (o de 5 min cai no mesmo tick do de 15 min com cron a cada 15 min).
const REMINDERS = [5, 15, 60]

const EVENTS: { date: string; time: string; title: string; description: string }[] = [
  // Sex 13/11
  { date: '2026-11-13', time: '09:30', title: '📲 Story 1 — enquete superstição (sexta-13)', description: 'Postar story-01.png + sticker de enquete abaixo do pill: "Você tem alguma superstição?" → "Tenho minhas manias 😅" / "Azar é desculpa 😂"' },
  { date: '2026-11-13', time: '19:30', title: '📲 Story 2 — repost + enquete (sexta-13)', description: 'story-02.png (ou repost do carrossel das 11h) + enquete "A sua favorita da lista é…" → "\'Mês que vem eu começo\'" / "\'É só R$ 15\'". Caixinha opcional: "Qual a sua desculpa pra não olhar a conta?"' },
  // Sáb 14/11
  { date: '2026-11-14', time: '10:00', title: '📲 Story 1 — enquete plano de sábado', description: 'Postar story-01.png + enquete "Qual o plano de hoje?" → "Rolê na rua 🍻" / "Netflix e delivery 🍕" (antes do post das 11h)' },
  { date: '2026-11-14', time: '19:00', title: '📲 Story 2 — repost + enquete rolê', description: 'story-02.png ou repost do carrossel + enquete "Você calcula o rolê antes de sair?" → "Conto tudinho 🧮" / "Vou no feeling 🎲". Sticker de link opcional pra bio.' },
  // Dom 15/11
  { date: '2026-11-15', time: '11:00', title: '📲 Story 1 — enquete extrato no fds', description: 'Postar story-01.png + enquete "Você confere o extrato no fim de semana?" → "Confiro com medo 😨" / "Nem olho 🙈"' },
  { date: '2026-11-15', time: '19:30', title: '📲 Story 2 — repost + caixinha meta', description: 'story-02.png ou repost do carrossel das 18h30 + caixinha "Qual sua meta de organização pra essa semana?" (respostas viram pauta)' },
  // Seg 16/11
  { date: '2026-11-16', time: '08:30', title: '📲 Story 1 — enquete planilha', description: 'Postar story-01.png + enquete "Já tentou se organizar numa planilha esse ano?" → "Comecei e larguei 📉" / "Nem tento mais 😂"' },
  { date: '2026-11-16', time: '19:30', title: '📲 Story 2 — repost + enquete desafio', description: 'story-02.png ou repost do carrossel das 12h + enquete "Toparia o desafio: anotar TUDO por 7 dias?" → "Topo 💪" / "Só se for fácil 😅". Link opcional pra bio.' },
  // Ter 17/11
  { date: '2026-11-17', time: '12:00', title: '📲 Story 1 — enquete 13º (4 opções)', description: 'Postar story-01.png + enquete "O que você vai fazer com o 13º?" → "Quitar dívidas 🧾" / "Black Friday 🛒" / "Guardar tudo 🛡️" / "Já tá gasto 😭" (antes do post das 12h30)' },
  { date: '2026-11-17', time: '20:00', title: '📲 Story 2 — repost + caixinha 13º', description: 'story-02.png ou repost + caixinha "O que já \'comprou\' com o 13º na cabeça?" (responder as mais engraçadas)' },
  // Qua 18/11
  { date: '2026-11-18', time: '12:30', title: '📲 Story 1 — enquete "ainda anotando?"', description: 'Postar story-01.png + enquete "Ainda tá anotando os gastos essa semana?" → "Firme 💪" / "Que gastos? 😅"' },
  { date: '2026-11-18', time: '20:00', title: '📲 Story 2 — repost + link bio', description: 'story-02.png ou repost do carrossel das 19h + sticker de link pra bio ("7 dias grátis, sem cartão"). Caixinha opcional: "Qual passo parece impossível?"' },
  // Qui 19/11 — GTA 6 D-0
  { date: '2026-11-19', time: '10:30', title: '📲 Story 1 — enquete GTA 6 D-0', description: 'Postar story-01.png + enquete "E aí?" → "Já tô em Vice City 🌴" / "Esperando a promoção 💸" / "Só vim pelo meme 😂". Sticker de música trap/synthwave opcional.' },
  { date: '2026-11-19', time: '20:00', title: '📲 Story 2 — repost + caixinha desafio', description: 'story-02.png ou repost da imagem das 10h + caixinha "O desafio funcionou pra você? O GTA coube?" + link opcional pra bio.' },
  // Sex 20/11 — feriadão
  { date: '2026-11-20', time: '10:00', title: '📲 Story 1 — enquete Black Friday', description: 'Postar story-01.png + enquete "Vai cair em alguma \'promoção\' esse feriadão?" → "Já tô com a lista 📝" / "Meu bolso não deixa 😅"' },
  { date: '2026-11-20', time: '19:00', title: '📲 Story 2 — repost + caixinha BF', description: 'story-02.png ou repost do carrossel das 11h + caixinha "Qual produto você tá de olho pra Black Friday?" (alimenta os posts 21–27)' },
]

async function main() {
  const email = process.argv[2]
  if (!email) throw new Error('Uso: npx tsx --env-file=.env scripts/seed-story-events.ts <email>')

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true, email: true, canUseAgenda: true,
      notificationPrefs: { select: { timezone: true, agenda: true } },
      pushSubscriptions: { select: { id: true } },
    },
  })
  if (!user) throw new Error(`Usuário não encontrado: ${email}`)
  console.log('user:', user.id, '| tz:', user.notificationPrefs?.timezone, '| agenda pref:', user.notificationPrefs?.agenda, '| subscriptions:', user.pushSubscriptions.length, '| canUseAgenda:', user.canUseAgenda)

  let created = 0, updated = 0
  for (const ev of EVENTS) {
    const date = new Date(`${ev.date}T00:00:00Z`)
    const exists = await prisma.calendarEvent.findFirst({
      where: { userId: user.id, title: ev.title, date, startTime: ev.time },
      select: { id: true, reminders: true },
    })
    if (exists) {
      if (JSON.stringify(exists.reminders) !== JSON.stringify(REMINDERS)) {
        await prisma.calendarEvent.update({ where: { id: exists.id }, data: { reminders: REMINDERS } })
        updated++
        console.log('lembretes atualizados:', ev.date, ev.time, ev.title)
      } else {
        console.log('skip (já existe):', ev.date, ev.time, ev.title)
      }
      continue
    }
    await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title: ev.title,
        description: ev.description,
        date,
        startTime: ev.time,
        isAllDay: false,
        category: 'Marketing',
        color: 'bg-pink-500',
        reminders: REMINDERS,
      },
    })
    created++
    console.log('criado:', ev.date, ev.time, ev.title)
  }
  console.log(`\n${created} criados, ${updated} com lembretes atualizados`)
}

main().finally(() => prisma.$disconnect())
