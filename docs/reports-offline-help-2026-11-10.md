# Relatórios, categorias, ajuda e offline — 10/11/2026

## Resultado

- Seletor próprio de mês no desktop, nativo no celular; meses futuros não aparecem. A lista inclui o mês atual e atualiza na virada do mês.
- Saúde financeira acompanha o período selecionado. Uma consulta expande parcelas, recorrências e vencimentos de cartão. O score indica sobra prevista, equilíbrio, organização e cobertura de dados; não exibe percentuais negativos de poupança.
- Semanas de segunda a domingo, com início/fim legíveis e limites do mês. Alertas exigem três compras anteriores distintas na categoria; a compra avaliada não entra na própria média. Sem histórico, a interface informa a limitação.
- Categorias padrão traduzidas por um helper único. Descrições reconhecidas (gasolina, estacionamento, pizza, jiu-jitsu, curso) ganham categoria localmente, sem IA/rede. Leitura corrige legados em Geral, sem uma migração destrutiva; nomes personalizados são preservados.
- Ajuda com busca, explicações atualizadas e botão para refazer tutorial. Tutorial informa que as ações são reais, permite pular e mostra onde retomar. Conteúdo permanece visível com reduced motion.

## Offline

O worker prepara HTML das rotas autorizadas, GETs principais e chunks estáticos. O manifesto de chunks é gerado por `npm run build`; não é versionado. A navegação offline por links usa páginas completas para evitar confundir payloads RSC de árvores diferentes. RSCs guardam query, árvore e tipo de prefetch separadamente.

Leituras autenticadas expiram em 48h desde a gravação. Fila de mutações é um cache separado que não expira, com proprietário conferido no replay e no middleware. O cookie continua HttpOnly. Trocas de conta limpam leituras e ocultam pendências de outras contas. Epoch impede gravação de respostas antigas após logout. Novas tentativas de criação usam o mesmo ID por conta; alterações dependentes recebem o ID definitivo antes do envio. Erros de validação, sessão, limite e servidor conservam a entrada.

Suportado na fila: receitas/despesas sem alocação simultânea de meta, hábitos/check-ins, notas, metas e eventos da agenda. Pagamentos, IA, importação, salário, treino e depósitos/retiradas nas metas exigem internet. Totais renderizados pelo servidor são snapshots; as pendências ficam visíveis no painel offline e os totais atualizam após sincronizar. Telas/consultas não preparadas dependem de uma conexão inicial; quotas/evicção do navegador podem remover caches.

Background Sync envia sem janela aberta em navegadores compatíveis, conforme o agendamento do sistema. Safari/iOS não oferece essa API: sincroniza ao abrir, voltar à janela, recuperar conexão e em novas tentativas enquanto visível. Não há promessa de envio imediato ao conectar 4G/5G/Wi-Fi. Referências: https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API e https://developer.chrome.com/docs/workbox/retrying-requests-when-back-online.

Rascunhos antigos de localStorage não tinham proprietário: são mostrados para revisão/vinculação explícita, nunca atribuídos silenciosamente à conta atual.

## Verificação

- `npx tsc --noEmit -p .`
- `npm run build`
- `npx tsx scripts/check-security.ts`: inclui categorias, score, histórico insuficiente, pico com desvio zero, calendário semanal, parcelas/recorrências e IDs vinculados à conta. Sem banco/IA/e-mails reais.
- `node scripts/check-offline.mjs`: servidor HTTP de fixtures, worker real em Chrome, abertura offline, assets, rotas aquecidas, TTL, erros, fila persistente, replay sem janela, dependências e troca de conta.
- `node scripts/check-reports-ui.mjs`: componentes reais com APIs/roteador de fixtures; desktop/mobile, seletor, reduced motion, semanas, alertas, busca e refazer/pular tutorial. Gera screenshots em diretório temporário.

Os dois testes de navegador usam Playwright e Chrome; instale Playwright num diretório de ferramentas e aponte `PLAYWRIGHT_MODULE` para seu módulo se ele não estiver no projeto. Não adicionam dependência de runtime. Os testes não acessam nem alteram a conta pessoal. Não substituem uma rodada manual em aparelho iOS físico após deploy.

First Load JS (build local): relatórios 118 → 119 kB; finanças 145 → 146 kB; ajuda 109 → 111 kB. A análise avançada deixa de baixar Recharts. Nenhuma mudança de schema/banco.
