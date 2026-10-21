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
- Fila offline: `readQueue/enqueueTransaction/syncQueue` em `lib/quickAdd.ts`; SW em `public/sw.js` (cache só de estáticos e página inicial — nunca `/api/*` nem HTML autenticado).
- Pagamentos: webhook `subscription.completed/renewed` ativa via `activateRecurringSubscription` (idempotente por charge); `subscription.cancelled` via `cancelRecurringSubscription` (acesso até o fim do período pago). Só o `webhookSecret` na URL autentica o evento — o HMAC usa chave pública e serve só de integridade.
