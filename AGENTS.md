# Vynta – notas para agentes

## Verificação
- Typecheck: `npx tsc --noEmit -p .`
- Build: `npm run build` (também roda typecheck). Compare o "First Load JS" por rota ao mexer em bundles.
- ESLint não está configurado (`npm run lint` abre um setup interativo).
- Regressões de segurança/relatórios: `npx tsx scripts/check-security.ts` (serviços isolados; não acessa banco, IA, e-mail ou push reais).

## Banco (Neon, sa-east-1) / Prisma
- O histórico de `prisma/migrations` está defasado; o fluxo usado é `npm run db:push`. Schema e banco estão sincronizados (inclusive a tabela legada `life_events`, mantida no schema como `LifeEvent` para não ser dropada).
- Antes de qualquer `db push`, confira o SQL com `npx prisma migrate diff --from-url <DATABASE_URL_UNPOOLED> --to-schema-datamodel prisma/schema.prisma --script` e nunca aplique se houver `DROP` inesperado.
- `@prisma/adapter-neon` deve ter a mesma versão de `@prisma/client`/`prisma`.

## Segurança
- Arquivos em `services/` são módulos server-only comuns: NÃO adicione `'use server'` neles (viraria endpoint público recebendo `userId` arbitrário). Server actions ficam em arquivos `actions.ts` e devem validar a sessão.
- Rate limit: `enforceRateLimits([{ key, limit, windowSec }])` de `lib/rateLimit.ts` (contador atômico na tabela `rate_limits`, vale entre todas as instâncias serverless; NÃO use contador em memória). Já aplicado em login (8/conta e 20/IP por 15 min), admin login (5/5), register (5/IP/h), forgot (3/conta/h), reset, change-password, push test e `/api/track`. Toda rota pública nova que grava no banco ou envia e-mail precisa de limite. Limpeza dos expirados no cron.
- Segredos comparados com `safeEqual` (`lib/password.ts`, tempo constante) — nunca `===`. `JWT_SECRET` é obrigatório em produção (≥ 32 chars; `getJwtSecretKey` lança erro sem ele). `ADMIN_PASSWORD` (senha mestre dos ADMIN) só é aceita com ≥ 16 chars.
- Webhooks falham fechados: Cakto exige `CAKTO_WEBHOOK_SECRET`; AbacatePay exige `ABACATEPAY_WEBHOOK_SECRET` (query `webhookSecret` ou header `X-Webhook-Secret`) e HMAC do corpo bruto. Sem env retorna 503; autenticação inválida retorna 401. Não reintroduzir fallback de eventos sem segredo.
- `/api/auth/force-password-change` só funciona com `forcePasswordChange = true` no banco (não pede a senha atual).
- Cabeçalhos de segurança em `next.config.mjs` (HSTS, X-Frame-Options, nosniff...). Não há CSP completo por causa dos pixels de marketing.
- Sessões: `lib/authToken.ts` só verifica JWT no edge; `getSession` exige registro ativo em `auth_sessions`, consulta permissões atuais e compara `credentialStamp` vinculado ao hash da senha. Logout apaga o registro antes do cookie e revoga cópias daquele token; falha no banco retorna 503 para permitir nova tentativa. `setSession` cria registro apenas em autenticação nova; `refreshSession` preserva ID e expiração absoluta após pagamento, sem recriar sessão revogada. Entradas expiradas são podadas em `after()` após login, sem alterar o cron. Nunca retorne o hash da senha ao cliente.
- Persistência no PWA: sessões comuns duram 90 dias e `renewActiveSession` renova a janela no heartbeat autenticado `/api/track/activity`, no máximo uma vez/dia por cookie. Atualização condicional de registro existente, nunca upsert; logout/expiração não podem ser desfeitos por renovação concorrente. Administradores continuam com 7 dias, sem renovação automática. `EngagementHost` retoma o heartbeat ao abrir/voltar/ficar online e a cada 10 min enquanto visível; erros não apagam o login nem marcam ping bem-sucedido. Tokens ficam apenas no cookie HttpOnly, não em localStorage.
- WAF Hobby: duas regras publicadas (limite por IP nas rotas de autenticação e bloqueio de sondagens), inventário em `docs/vercel-waf-policy.json`. Cron e webhooks não correspondem a essas regras; não ativar challenge global sem avaliar integrações. Ver `docs/logout-waf-2026-11-10.md`.
- Mutações de API exigem Origin igual ao da requisição (`lib/requestPolicy.ts`); exceções exatas apenas para callbacks de pagamento. Cron-job.org continua usando GET com `Authorization: Bearer $CRON_SECRET`, sem Origin/cookie e sem quota de navegação.
- Limites adicionais protegem IA, checkout, importação/exportação, sincronização manual, push e transações. Falha no armazenamento do limitador retorna 503; excesso retorna 429. Não confundir essas quotas com WAF/DDoS de infraestrutura.

## Performance
- Prisma roda sem o engine Rust (`engineType = "client"` no generator, exige o adapter `PrismaNeon`): cold start bem menor nas funções serverless. Depois de mexer no schema, `npx prisma generate`.
- `components/SidebarLayout.tsx` é só um roteador fino; o chrome do app (sidebar, bottom nav, quick add, push, tour, engagement) fica em `components/AppShell.tsx`, carregado via `next/dynamic` apenas nas rotas do app — landing/login/register não baixam esse código.
- Login (`/api/auth/login` e `/api/admin/auth/login`): a busca do usuário roda em paralelo com o rate limit; reset do contador vai para `after()` de `next/server`. Upgrade de senha legada ocorre antes da assinatura, pois a sessão fica vinculada ao hash final.
- Deploy na Vercel em `gru1` (`vercel.json`) para ficar junto do banco em São Paulo.
- `services/transaction.service.ts`: todas as leituras derivam de um único `loadUserTransactions` (1 query) — não reintroduzir queries por mês/loop.
- Categorias: `lib/categories.ts` centraliza traduções; `lib/quickCategorize.ts` sugere instantaneamente por descrição e normaliza legados em Geral, preservando categorias personalizadas. Reutilize esses helpers em listas, relatórios e sugestões.
- Ícones referenciados por nome: use `getIconByName` de `lib/icons.ts` (nunca `(Lucide as any)[name]`, que põe todos os ícones no bundle).
- Bibliotecas pesadas (recharts, exceljs, jspdf) devem ser carregadas via `next/dynamic` / `import()`.
- Relatórios: `getReportSnapshot` deriva resumo, comparação, categorias e tendência de uma leitura de transações. A análise avançada usa `getFinancialOccurrences` (uma leitura, com parcelas/recorrências/faturas) + `lib/financialHealth.ts`; todo o painel usa SVG/CSS, sem Recharts. O período é limitado ao mês atual e anteriores; `ReportMonthPicker` tem seletor próprio no desktop. Cache de insights inclui usuário, período e hash de todos os dados do prompt.

## Mobile / PWA
- Lançamento rápido: `openQuickAdd('EXPENSE'|'INCOME')` de `lib/quickAdd.ts` abre a sheet global (host em `AppShell`). Também abre via `?add=expense|income` (shortcuts do manifest), tecla `n` e drawer "Mais".
- Após criar/apagar uma transação, dispare `vynta:transaction-created` — as telas com dados financeiros escutam e fazem `router.refresh()`.
- Datas de transação são sempre `<dia local>T12:00:00Z` (ver `todayDateValue`), nunca horário real em UTC.
- Offline: páginas/RSC/GETs têm TTL de 48h (`DATA_CACHE` em `public/sw.js`), com aquecimento explícito de HTML + assets e invalidação na troca de conta. `scripts/offline-assets.mjs` gera o manifesto dos chunks após o build. A fila em `public/offline-queue.js` usa CacheStorage separado, é vinculada à conta e NÃO expira; `lib/quickAdd.ts` acessa via mensagens assíncronas. Nunca descarte registros em 400/401/429/5xx. Criações suportadas usam IDs idempotentes derivados da conta (`lib/offlineMutation.ts`); o replay remapeia IDs temporários. `x-vynta-owner` é conferido no middleware, além da sessão ativa das rotas. Background Sync quando disponível; no iOS, retomada ao abrir/voltar/ficar online. Rascunhos legados sem conta exigem revisão na interface. Ver `docs/reports-offline-help-2026-11-10.md`.
- Pagamentos: webhook `subscription.completed/renewed` ativa via `activateRecurringSubscription` (idempotente por charge); `subscription.cancelled` via `cancelRecurringSubscription` (acesso até o fim do período pago). O segredo na URL ou header autentica o evento; o HMAC usa chave pública e serve só de integridade.

## Notificações push (PWA)
- Web Push com VAPID (`web-push`). Envs: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (ver `.env.example`). Trocar as chaves VAPID invalida todas as inscrições.
- Servidor: `services/push.service.ts` (envio, poda de inscrições 404/410, preferências) e `services/pushScheduler.service.ts` (lembretes). Cliente: `lib/push.ts`, `components/push/*`. SW: handlers `push`, `notificationclick` (envia `vynta:navigate` para o app aberto) e `pushsubscriptionchange` em `public/sw.js`.
- Agendamento: `GET /api/cron/push` com `Authorization: Bearer $CRON_SECRET` (Vercel Cron em `vercel.json`, 2x/dia — compatível com o plano Hobby). É idempotente: cada envio é reservado em `push_logs (userId, key)` antes de sair, então pode rodar em qualquer frequência. Com cron a cada 15 min (Pro ou agendador externo) os avisos "compromisso em X min" também passam a funcionar.
- Janelas no fuso do usuário (`notification_preferences.timezone`): manhã 07–11h ("resumo do dia" único com agenda+contas — enviado sempre que ao menos uma das categorias está ligada, mesmo vazio), noite 19–22h (hábitos, "gastou algo hoje?"), "compromisso em X min" 06–23h, trial no último dia.
- Login/registro desvinculam o aparelho da conta anterior (`detachPushFromAccount`); o app revincula ao abrir (`syncPushSubscription`).

## E-mail (Brevo), engajamento e oferta 1º mês
- Envio via API transacional da Brevo em `services/email.service.ts` (`sendEmail`, `upsertBrevoContact`, tokens assinados de reset de senha/descadastro). Templates HTML em `lib/emailTemplates.ts`. Envs: `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `BREVO_LIST_ID` (opcional), `APP_URL`. A Brevo bloqueia IPs não autorizados: a restrição de IP precisa ficar DESLIGADA (Vercel usa IP dinâmico). Teste local: `npx tsx --env-file=.env scripts/send-test-emails.ts <email>`.
- Reset de senha: `/esqueci-a-senha` → `POST /api/auth/forgot-password` (resposta sempre igual, 1 envio/2 min por conta) → `/redefinir-senha?token=` → `POST /api/auth/reset-password`. Token JWT de 1h atrelado ao hash da senha atual (uso único, sem tabela).
- Último acesso: `User.lastSeenAt`, gravado por `POST /api/track/activity` (heartbeat do `EngagementHost` no `AppShell`, máx. 1 escrita/10 min). Accounts antigas sem valor usam `activityTrackingStart()` (menor `lastSeenAt`) como base, para não serem tratadas como "sumidas desde o cadastro".
- Remarketing por e-mail: `services/emailScheduler.service.ts` roda no `GET /api/cron/push` (never-used, inactive 3d+, trial-last-day, trial-expired, promo-ending). Dedupe permanente em `email_logs (userId, key)`; respeita `User.emailOptOut` (`/api/email/unsubscribe`).
- Push de reengajamento (2, 3, 5, 7, 10, 14 dias sem abrir) e da oferta no `pushScheduler` (janela 09–21h, ou seja, roda no cron das 20h).
- Oferta 1º mês (`PROMO_FIRST_MONTH` em `lib/plans.ts`, R$14,90/30 dias): checkout AVULSO (`createPromoCheckout`, `planTier: 'promo'` em `/api/payments/create`); a ativação reconhece pelo `PaymentTransaction.rawStatus = PROMO_CHECKOUT_STATUS` e grava `subscriptionId = promo_<checkout>` sem renovação. Elegível: `FREE_TRIAL` que nunca pagou, até 7 dias após o fim do trial (`isPromoEligible`). Quem está no mês promo pode acessar `/subscription`; ao assinar, os dias restantes são somados.
- Admin → Usuários: coluna/filtro "Último acesso", resumo de uso e aba "Atividade" (`getUserRecentActivity`, `getLastActivityByUser`).

## Agenda externa (iCal / Google)
- `services/calendarSync.service.ts` importa o feed iCal secreto (`User.icalFeedUrl`, salvo em Ajustes → "Agenda do Google", API `app/api/calendar/feed`). Roda dentro de `GET /api/cron/push` antes dos pushes, então a cada rodada do cron os eventos ficam frescos.
- Eventos importados têm `CalendarEvent.source = 'ical'` + `externalId` (`uid` ou `uid@dia-hora` para ocorrências de recorrência) sob `@@unique([userId, source, externalId])` — nunca edite/remova esses campos por fora; o sync faz upsert por `externalId` e apaga o que saiu do feed.
- Expansão de RRULE via `node-ical` (`expandRecurringEvent`) na janela −30d → +180d; eventos únicos entram em qualquer data. Horários convertidos para o fuso de `notification_preferences.timezone` e gravados na convenção do app: `date` = meia-noite UTC do dia local, `startTime` = 'HH:mm'.
- Somente leitura: o que o usuário cria no Vynta não volta para o Google.
- Teste local de entrega: endpoint HTTPS falso + `http_ece` para decifrar (web-push exige https). iOS só recebe push com o app instalado na tela de início (16.4+).

## Cartões e faturas
- `Card.provider` (`'nubank'` | null) marca cartões importáveis. Import: `POST /api/cards/import` → `importCardInvoice` em `services/card.service.ts` (cria o cartão se `card` em vez de `cardId`, deduplica por chave natural título+data+valor+parcela, atualiza `limitAmount = limiteDisponívelInformado + comprometido`).
- "Limite usado" NUNCA é `Σ amount` das despesas do cartão — use `computeCommittedLimit` (`lib/invoice.ts`): só conta itens de faturas ainda não vencidas (parcelas já pagas liberam limite; recorrente conta 1×). Usado em `CardsClient`, `importCardInvoice` e no alerta `card_limit` de `lib/notifications.ts`.
- `lib/invoice.ts` é a fonte única da matemática de fatura: parser do CSV Nubank (`date,title,amount`, `" - Parcela X/Y"` no título, negativos/pagamentos ignorados), ciclo de fechamento (`billMonthIndexForDate`: compra NO dia do `closingDay` ou após cai na próxima fatura (regra do Nubank — `>=`); `dueDay < closingDay` vence no mês seguinte ao fechamento), itens/totais por fatura e status.
- Lançamentos parcelados importados guardam `date` = data de postagem na fatura e `purchaseDate` = postagem − (parcela atual − 1) meses; `amount` = valor da parcela × total, `installmentAmount` = valor da parcela. Itens marcados "Fixo" viram `isRecurring` + `recurringDay` = dia da postagem (dedupe por título+valor, independente do mês).
- Visualizador de faturas é inline: `CardInvoicePanel` dentro do tile em `collapse-grid[data-open]` (não é modal).
- Sininho + push + avaliador offline do SW alertam `card_bill` 7/3/1 dias antes e no vencimento (`lib/notifications.ts`, `pushScheduler` chave `invoice:{cardId}:{due}:{d}`, SW `invoiceBills` + dedupe via `localKey`). Transações com `cardId` NUNCA geram notificação própria — só a fatura única avisa.
- Atribuição mensal: gastos de cartão pertencem ao mês de VENCIMENTO da fatura (postagem em out → fatura de nov → conta em nov), não ao mês da postagem. `txInMonth`/`cardTxContributesToMonth` e `computeBalance` em `services/transaction.service.ts` implementam isso — parcelas/recorrentes importados só contam a partir da fatura de postagem (`postingParcelaIndex`), nunca retroativo.

## Salário
- Config em Finanças → botão "Salário" (`app/finances/SalaryModal.tsx` → `POST|DELETE /api/salary` → `services/salary.service.ts`).
- Resumos: `income` só inclui datas já alcançadas; `pendingIncome` separa receitas futuras. `balance` é resultado do mês; `accumulatedBalance` é o histórico até hoje (ou fim do mês passado). Não misturar as duas grandezas nem antecipar a segunda quinzena. `financialToday` usa o dia de São Paulo, independente do fuso do servidor. Despesas do mês continuam incluindo os compromissos previstos; não são saldo bancário confirmado.
- Salário = transação(ões) INCOME recorrentes com `salarySlot` 1 (mensal ou 1ª quinzena) e 2 (2ª quinzena). `payDayType` `'fixed'` (dia do mês) ou `'business_day'` (`recurringDay` = N-ésimo dia útil — ver `lib/payday.ts`, `effectivePayDay`). A primeira ocorrência usa a data de configuração (`createdAt`): começa no primeiro pagamento nessa data ou depois dela, sem incluir pagamentos anteriores retroativamente.

## Navegação / cache do cliente
- `experimental.staleTimes.dynamic = 30` (next.config): telas visitadas são reaproveitadas por 30s. `components/RouterCacheSync.tsx` marca o cache como sujo após qualquer `fetch` não-GET bem-sucedido para `/api/*` e faz `router.refresh()` na próxima troca de tela. Mutações novas via `fetch('/api/...')` já ficam cobertas.
- Skeletons por rota (`components/PageSkeleton.tsx` + `loading.tsx`) — mantenha-os parecidos com o layout real.
- Pixels de marketing (Utmify, Facebook) e o Google Tag Manager (`components/GoogleTagManager.tsx`, `GTM-TVT2XQSL`, serve a tag do GA4) só carregam nas rotas de aquisição/checkout (`components/MarketingScripts.tsx`); não os coloque nas telas logadas.
- Animações simples: use as classes CSS `animate-in fade-in zoom-in-95 slide-in-from-bottom-*` (definidas em `globals.css`) em vez de framer-motion; `collapse-grid[data-open]` para acordeões.

## Branding — broto (13/11/2026)
- Identidade oficial: `marketing/branding/README.md`. Símbolo B1 aprovado; substitui as camadas azul/roxo. Novos materiais devem usar `public/assets/logo/broto-mark.png` e `mascot.webp`.
- Paleta: lavanda escura (#14121C), verde profundo, lima e lavanda; creme apenas como apoio. Não copiar branding neon antigo de posts arquivados. `scripts/build-brand-assets.mjs` gera exports técnicos preservando a matriz.
- Copy atual e evidências: `marketing/branding/2026-11-rebrand/COPY.md`. Não transformar tempos ilustrativos (5s/30s) em garantias. CTA: teste de 7 dias, não plano gratuito permanente.
- Personagem auxiliar aprovado, chamado **Brotô**: poses em `public/assets/mascot/` (apontando, preocupado, celebrando). Não substitui logo, avatares ou ícones. Tutorial e ilustrações da landing usam WebP leve; matrizes PNG ficam para artes. Na landing, aponta junto ao produto e celebra no CTA final, também no mobile. Cabeçalho e notificações mantêm B1. Pacote de anúncio com data proposta no calendário em `marketing/instagram/15-nova-fase/`.

## Landing page (`app/page.tsx`)
- Copy: siga a skill `.devin/skills/copy-conversao` (pesquisa, regras, fatos do produto). Nunca invente depoimento/número de usuários.
- Animações sem biblioteca (estilo abacatepay.com): script inline liga `html.motion` antes do paint; `components/landing/LandingMotion.tsx` adiciona `.is-in` em `[data-reveal]` (variações `left|right|zoom|fade`, `data-reveal-stagger`, filhos `.pop-in`/`.grow-x`) e faz parallax em `[data-parallax]`. Entrada do hero com `.rise`/`.rise-zoom`/`.pop` + `--d`. CSS em `globals.css` (só transform/opacity, respeita reduced motion). Não traga framer-motion de volta para a landing.
- Prints vêm da conta demo `demo@vynta.digital` (COURTESY, `emailOptOut`): recrie com `DEMO_PASSWORD=... npx tsx --env-file=.env scripts/seed-demo-account.ts` (apaga e recria só essa conta, datas relativas a hoje). Imagens em `public/images/landing/` (webp, mobile 780×1688 = 390px @2x; desktop 1600×1000; `og.jpg` 1200×630).

## Instagram @somosvynta (`marketing/instagram/`)

Leia `marketing/AGENTS.md`, `marketing/templates/broto-social/README.md` e
`.devin/skills/instagram-vynta/SKILL.md` antes de produzir posts. O template Brotô foi
aprovado em 14/11; o pacote completo viaja em `marketing/pacotes/`.
O guia de marketing centraliza pesquisa primária, checagem D-1/D0, tom sem julgamento,
formatos, render, calendário, autorização e métricas. Não usar regras antigas de
7–10 slides obrigatórios, 5–8 hashtags, áudio sempre em alta ou promessas de 5s/30s.

- Personagem aprovado: **Brotô**, poses em `public/assets/mascot/`. Não substitui B1,
  avatares ou ícones. Pacote de lançamento em `marketing/instagram/15-nova-fase/`.
- Calendário distingue remoto atual de proposta. Revisão de 13/11/2026 e fontes em
  `marketing/auditoria/2026-11-13/`; posts corrigidos em `marketing/instagram/revisao-2026-11/`.
- Fontes viajam no Git; renders da revisão são regeneráveis por
  `scripts/build-social-revision.mjs` e `scripts/render-social-revision.mjs`.
- Não publicar anúncio da nova versão antes de deploy autorizado e smoke test.

## Apresentação da nova fase

- `ReleaseNotice` é carregado apenas no shell logado. Personagem: `MASCOT_NAME`;
  edição: `RELEASE_ID` em `lib/release.ts`. Não mudar o ID para corrigir copy.
- `POST /api/release-notice`: sessão + Origin + rate limit, resposta sem cache.
  `claimReleaseNotice` usa recibo durável na tabela existente Notification, namespace
  `vynta-release-`, chave única por usuário/edição; concorrência concede uma apresentação.
  Recibos são lidos e não entram no sininho financeiro. Não apagá-los em limpezas
  enquanto a edição estiver ativa. Não é necessária migração de schema.
- O recibo precede a apresentação: garante no máximo uma autorização por conta,
  inclusive em outro aparelho. Uma resposta perdida pode impedir a apresentação;
  não prometer entrega exatamente uma vez sob falhas de rede.
- Preview Vercel não consome recibo. QA visual usa endpoint simulado e conta demo;
  regressão isolada verifica concorrência/contas/auth/Origin/limites/falhas.
- Respeitar tutorial/modal ativo, movimento reduzido, viewport e teclado. Offline
  adia o aviso; nunca colocar recibo na fila offline nem invalidar cache financeiro.
