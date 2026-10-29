# Vynta – notas para agentes

## Verificação
- Typecheck: `npx tsc --noEmit -p .`
- Build: `npm run build` (também roda typecheck). Compare o "First Load JS" por rota ao mexer em bundles.
- ESLint não está configurado (`npm run lint` abre um setup interativo).

## Banco (Neon, sa-east-1) / Prisma
- O histórico de `prisma/migrations` está defasado; o fluxo usado é `npm run db:push`. Schema e banco estão sincronizados (inclusive a tabela legada `life_events`, mantida no schema como `LifeEvent` para não ser dropada).
- Antes de qualquer `db push`, confira o SQL com `npx prisma migrate diff --from-url <DATABASE_URL_UNPOOLED> --to-schema-datamodel prisma/schema.prisma --script` e nunca aplique se houver `DROP` inesperado.
- `@prisma/adapter-neon` deve ter a mesma versão de `@prisma/client`/`prisma`.

## Segurança
- Arquivos em `services/` são módulos server-only comuns: NÃO adicione `'use server'` neles (viraria endpoint público recebendo `userId` arbitrário). Server actions ficam em arquivos `actions.ts` e devem validar a sessão.

## Performance
- Deploy na Vercel em `gru1` (`vercel.json`) para ficar junto do banco em São Paulo.
- `services/transaction.service.ts`: todas as leituras derivam de um único `loadUserTransactions` (1 query) — não reintroduzir queries por mês/loop.
- Ícones referenciados por nome: use `getIconByName` de `lib/icons.ts` (nunca `(Lucide as any)[name]`, que põe todos os ícones no bundle).
- Bibliotecas pesadas (recharts, exceljs, jspdf) devem ser carregadas via `next/dynamic` / `import()`.

## Mobile / PWA
- Lançamento rápido: `openQuickAdd('EXPENSE'|'INCOME')` de `lib/quickAdd.ts` abre a sheet global (host em `SidebarLayout`). Também abre via `?add=expense|income` (shortcuts do manifest), tecla `n` e drawer "Mais".
- Após criar/apagar uma transação, dispare `vynta:transaction-created` — as telas com dados financeiros escutam e fazem `router.refresh()`.
- Datas de transação são sempre `<dia local>T12:00:00Z` (ver `todayDateValue`), nunca horário real em UTC.
- Fila e cache offline (48h): `readQueue/enqueueTransaction/enqueueMutation/syncQueue` em `lib/quickAdd.ts` + interceptação de mutações offline em `components/RouterCacheSync.tsx`; SW em `public/sw.js` mantém cache de estáticos (`STATIC_CACHE`) e cache de páginas/RSC/GETs autenticados com TTL de 48h (`DATA_CACHE`, limpo em `/api/auth/logout|login|register`).
- Pagamentos: webhook `subscription.completed/renewed` ativa via `activateRecurringSubscription` (idempotente por charge); `subscription.cancelled` via `cancelRecurringSubscription` (acesso até o fim do período pago). Só o `webhookSecret` na URL autentica o evento — o HMAC usa chave pública e serve só de integridade.

## Notificações push (PWA)
- Web Push com VAPID (`web-push`). Envs: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (ver `.env.example`). Trocar as chaves VAPID invalida todas as inscrições.
- Servidor: `services/push.service.ts` (envio, poda de inscrições 404/410, preferências) e `services/pushScheduler.service.ts` (lembretes). Cliente: `lib/push.ts`, `components/push/*`. SW: handlers `push`, `notificationclick` (envia `vynta:navigate` para o app aberto) e `pushsubscriptionchange` em `public/sw.js`.
- Agendamento: `GET /api/cron/push` com `Authorization: Bearer $CRON_SECRET` (Vercel Cron em `vercel.json`, 2x/dia — compatível com o plano Hobby). É idempotente: cada envio é reservado em `push_logs (userId, key)` antes de sair, então pode rodar em qualquer frequência. Com cron a cada 15 min (Pro ou agendador externo) os avisos "compromisso em X min" também passam a funcionar.
- Janelas no fuso do usuário (`notification_preferences.timezone`): manhã 07–11h ("resumo do dia" único com agenda+contas — enviado sempre que ao menos uma das categorias está ligada, mesmo vazio), noite 19–22h (hábitos, "gastou algo hoje?"), "compromisso em X min" 06–23h, trial no último dia.
- Login/registro desvinculam o aparelho da conta anterior (`detachPushFromAccount`); o app revincula ao abrir (`syncPushSubscription`).

## Agenda externa (iCal / Google)
- `services/calendarSync.service.ts` importa o feed iCal secreto (`User.icalFeedUrl`, salvo em Ajustes → "Agenda do Google", API `app/api/calendar/feed`). Roda dentro de `GET /api/cron/push` antes dos pushes, então a cada rodada do cron os eventos ficam frescos.
- Eventos importados têm `CalendarEvent.source = 'ical'` + `externalId` (`uid` ou `uid@dia-hora` para ocorrências de recorrência) sob `@@unique([userId, source, externalId])` — nunca edite/remova esses campos por fora; o sync faz upsert por `externalId` e apaga o que saiu do feed.
- Expansão de RRULE via `node-ical` (`expandRecurringEvent`) na janela −30d → +180d; eventos únicos entram em qualquer data. Horários convertidos para o fuso de `notification_preferences.timezone` e gravados na convenção do app: `date` = meia-noite UTC do dia local, `startTime` = 'HH:mm'.
- Somente leitura: o que o usuário cria no Vynta não volta para o Google.
- Teste local de entrega: endpoint HTTPS falso + `http_ece` para decifrar (web-push exige https). iOS só recebe push com o app instalado na tela de início (16.4+).

## Navegação / cache do cliente
- `experimental.staleTimes.dynamic = 30` (next.config): telas visitadas são reaproveitadas por 30s. `components/RouterCacheSync.tsx` marca o cache como sujo após qualquer `fetch` não-GET bem-sucedido para `/api/*` e faz `router.refresh()` na próxima troca de tela. Mutações novas via `fetch('/api/...')` já ficam cobertas.
- Skeletons por rota (`components/PageSkeleton.tsx` + `loading.tsx`) — mantenha-os parecidos com o layout real.
- Pixels de marketing (Utmify, Facebook) só carregam nas rotas de aquisição/checkout (`components/MarketingScripts.tsx`); não os coloque nas telas logadas.
- Animações simples: use as classes CSS `animate-in fade-in zoom-in-95 slide-in-from-bottom-*` (definidas em `globals.css`) em vez de framer-motion; `collapse-grid[data-open]` para acordeões.
