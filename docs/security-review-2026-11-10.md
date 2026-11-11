# Revisão de segurança, relatórios e navegação — 10/11/2026

Registro da primeira etapa. A continuação em [logout e WAF](logout-waf-2026-11-10.md) documenta a revogação de sessões, a tabela aditiva aplicada e as regras publicadas na Vercel, substituindo as limitações correspondentes abaixo.

Alterações locais no Vynta, sem deploy, alteração do banco ou teste de carga em produção. A análise usou as skills e os verificadores do plugin Lagune 0.18.1 via CLI, pois não havia ferramentas MCP da Lagune disponíveis. O contexto foi o AGENTS.md; não havia charter anterior da Lagune.

## Segurança aplicada

| Achado | Alteração | Resultado da revisão |
| --- | --- | --- |
| Destinos de rede controlados pelo usuário (SSRF) | HTTPS e lista de provedores Google Calendar/Web Push; validação também no envio de registros existentes; download limitado e sem redirects | Corrigido no caminho revisado |
| Abuso de operações caras | Quotas atômicas no banco antes de IA, checkout, sync manual, importação/exportação, análise avançada e gravação de transações; falha do limitador retorna 503; limites de bytes/dados e timeouts | Parcial: proteção de borda e teto de gastos dependem da infraestrutura |
| Mutações entre origens (CSRF) | Origin exato e Fetch Metadata no middleware; exceções exatas para os dois webhooks autenticados | Corrigido no caminho revisado |
| Expressões regulares com custo quadrático | Oito padrões substituídos por processamento linear/padrões determinísticos | Scanner sem regex vulnerável; construções dinâmicas revisadas |
| Fórmulas em CSV | Codificação única em todas as células, aspas duplicadas e neutralização de prefixos de fórmula | Corrigido na geração do arquivo; XLSX mantém células tipadas |
| Dependências vulneráveis | Next 15.5.29, React 19.2.9, Zod 4.6.7 e transitivas corrigidas; Prisma/adapter/client alinhados em 6.19.3 | npm audit: 29 ocorrências antes, zero conhecidas depois |
| Cache de análise sem identidade completa | Chave com usuário, período e hash de todo o prompt; removido cache parcial em memória | Corrigido no caminho revisado |
| Sessões e permissões antigas | Permissões atuais consultadas no servidor; HMAC vinculado ao hash atual da senha; tokens antigos recusados após troca de senha/exclusão | Parcial: logout não revoga uma cópia do token no servidor |
| Cartão de outra conta na edição de transação | Verificação de dono antes de atualizar cardId; limites de datas, valores e parcelas | Corrigido no caminho revisado |

Os sete achados encerrados saem da cadeia ativa da Lagune após a verificação. Os dois parciais permanecem em `.lagune/memory/harden.md`. Isto não é uma garantia de ausência de outras vulnerabilidades, nem um pentest externo.

## Cron-job.org

O contrato permanece `GET /api/cron/push` com `Authorization: Bearer <CRON_SECRET>`. Não é necessário Origin, cookie, CSRF token ou login. O handler, `maxDuration = 60`, isolamento dos jobs e autenticação em tempo constante foram preservados. A quota de sincronização manual não se aplica ao job agendado.

Os testes executam o middleware e o handler reais com serviços substituídos: Bearer correto passa e retorna 200; segredo ausente/incorreto retorna 401; falha real de um job continua retornando 500 com os outros jobs executados. Não foram enviados e-mails/pushes, nem acionado o cron real. Uma resposta 500 operacional não é mascarada como sucesso.

A configuração de tracing do Prisma permanece em `next.config.mjs`: inclui o client e seu compilador WASM no pacote serverless. É relevante porque a ausência desse arquivo já havia causado erro no cron.

Ao ajustar o WAF em produção, não aplicar desafio de navegador a `/api/cron/push` ou aos callbacks de pagamento. Preservar a autenticação própria desses endpoints; uma exceção de desafio não deve torná-los públicos. Usar a URL HTTPS canônica no cron para evitar redirecionamentos que descartem Authorization. Se houver novo 500, conferir no JSON qual job falhou e correlacionar com o log da função, sem divulgar o Bearer.

## Relatórios e desempenho

A visão principal foi redesenhada para celular e desktop, incluindo modo escuro, navegação de período, comparação com mês anterior, resultado mensal, categorias e tendência. O resultado do mês é receitas menos despesas; não se confunde com saldo acumulado.

A IA acompanha o período selecionado, tem carregamento, tentativas e fallback identificado como resumo dos números. Respostas antigas são canceladas ao trocar de mês. Meses vazios não disparam geração. A análise avançada de saúde financeira fica explicitamente identificada como atual; metas e exportação são carregadas sob demanda.

`getReportSnapshot` calcula todos os indicadores da visão geral a partir de uma leitura de transações, preservando a matemática compartilhada de parcelas/faturas. A IA faz sua própria leitura autenticada ao gerar a análise. Gráficos principais usam SVG/CSS; Recharts só é carregado ao expandir a análise avançada. Exportadores pesados continuam dinâmicos.

A troca de rota usa Web Animations de 180 ms, apenas opacity/transform, sem biblioteca nova e sem remontar a página. Há cancelamento e respeito a movimento reduzido. O prefetch manual caiu de dez para três rotas e é desativado em conexões lentas/economia de dados; os links preservam o comportamento do Next. A referência visual foi [AbacatePay](https://www.abacatepay.com/).

## Validação

- `npx tsx scripts/check-security.ts`: destinos de rede, origem/middleware, bytes reais, CSV, JWT, falha do limitador, cartão de outra conta, limites financeiros, XLSX com conditional formatting, contrato do cron, isolamento de sessões e snapshot com uma query. Usa mocks explícitos; não acessa serviços de produção.
- Browser local com dados sintéticos e APIs interceptadas: larguras 320, 390, 768 e 1440 px sem overflow horizontal; claro/escuro, troca rápida de mês, fallback da IA, erro/retry do relatório, abertura tardia de análise avançada, exportação, foco do diálogo/Escape e movimento reduzido. Zero erros de JavaScript. Não equivale a uma sessão real ponta a ponta nem a benchmark em aparelho físico.
- `npm audit --json`: zero vulnerabilidades conhecidas. Isso não cobre falhas de lógica ou infraestrutura.
- `npx prisma generate`: geração bem-sucedida, sem mudança de schema/banco.
- Build e typecheck: resultados e comparação de bundles registrados abaixo.

## Especializações Lagune consultadas

| Especialização | Resultado aplicado à revisão |
| --- | --- |
| regex | Scanner sem padrões inseguros após correções; regex dinâmicas usam dicionários fixos e escape de literais; padrões construídos conferidos |
| network | Checker classificou os cinco destinos permitidos como safe; leitura confirmou allowlist e proibição de redirect |
| access-control | Dono do cartão e isolamento do cache corrigidos; revogação apenas por logout permanece aberta |
| credential-endpoint | Contadores duráveis/falha fechada; bot management, MFA e resistência a ataques distribuídos não certificados |
| http-request | Origem exata, callbacks restritos, IP confiado apenas no ambiente Vercel; checker CORS sem allowlist vulnerável |
| serverless | Limites e cache melhorados; permissões, WAF e orçamento de produção não inspecionados |
| csv | Todas as linhas/células passam pelo encoder; XLSX usa tipos de célula |
| upload | Importação JSON limitada a 1 MB/500 itens, autenticada, com quota e dimensões financeiras validadas; não grava arquivo executável |
| sql | Prisma e queryRaw parametrizados; privilégios/timeout do banco não verificados em produção |
| federation | JWT fixa HS256 e rejeita outros propósitos; checker sem verificação com algoritmo livre |
| crypto | Sem achado determinístico; leads de comparação de tags eram identificadores, não segredos; HMAC e safeEqual nos controles revistos |
| secrets | Sem credencial de produção confirmada; leads revisados; dados de teste são gerados por execução; histórico completo/rotação externa não auditados |
| transport | HTTPS/HSTS no código; TLS de produção não certificado por scanner externo |
| payment | Segredo privado/consulta ao provedor preservados; preços do servidor e deduplicação existentes mantidos; exceções de CSRF não removem autenticação |

## Publicação e pendências

- A publicação exigirá um novo login: tokens anteriores não contêm credentialStamp. O cron usa Bearer separado e não participa dessa mudança.
- Não houve deploy ou migração. As permissões atuais adicionam uma leitura de usuário por contexto de requisição (deduplicada com React.cache quando aplicável); a validação no edge permanece sem banco.
- Revogação imediata de tokens copiados no logout exige estado persistente de sessões/revogação. Senha alterada ou conta excluída já invalidam acesso nos handlers.
- WAF/DDoS, regras de bots, limites de gasto, privilégios do banco e TLS implantado precisam de verificação no ambiente. As quotas na aplicação ainda usam o banco; não sustentam sozinhas um ataque volumétrico. Não há conector Vercel disponível nesta sessão.
- Importação de agenda passa a aceitar apenas feeds secretos do Google Calendar, conforme a função apresentada em Ajustes. Feeds antigos de outros provedores serão recusados e não serão acessados pelo cron.
- A CSP completa continua pendente devido aos pixels de marketing existentes. O build já apresentava aviso de metadataBase não definido; isso não impede a compilação.
- Sem ESLint automatizado configurado: `npm run lint` abriria setup interativo.

Referências: [DDoS na Vercel](https://vercel.com/docs/vercel-firewall/ddos-mitigation), [Vercel Firewall](https://vercel.com/docs/vercel-firewall), [cabeçalhos confiáveis da Vercel](https://vercel.com/docs/headers/request-headers), [atualização de segurança do Next](https://nextjs.org/blog/nextjs-security-update-october-14-2026).

Próxima etapa de segurança: concluir regras de infraestrutura e revogação por sessão, então reexecutar `/lagune-harden` e `/lagune-verify` sobre os dois achados restantes. Commit sugerido: `fix: harden SaaS security and refresh responsive reports`.

## Resultado final do build

`npm run build` e `npx tsc --noEmit -p .` concluíram com código 0 após as últimas alterações. O trace de `/api/cron/push` contém `node_modules/.prisma/client/query_compiler_bg.wasm`.

| Rota | First Load JS antes | Depois |
| --- | ---: | ---: |
| /reports | 236 kB | 118 kB |
| /dashboard | 118 kB | 118 kB |
| /finances | 144 kB | 144 kB |
| /login | 121 kB | 122 kB |
| Compartilhado por todas | 103 kB | 103 kB |

Relatórios reduziu 50% do JavaScript inicial medido pelo build. O código específico da rota passou de 7,63 para 8,99 kB, mas deixou de carregar o pacote de gráficos pesados na entrada. Os números não medem a velocidade da rede, da IA ou do banco em produção. Não foi adicionado runtime de animação. O middleware permaneceu em 40,5 kB.

Verificação Lagune concluída: sete achados encerrados; proteção contra abuso distribuído inconclusiva sem configuração da borda; ciclo de sessão ainda reprovado especificamente para revogação de tokens copiados após logout. Todas as outras mudanças descritas nesses dois itens parciais foram confirmadas no código. As cadeias detect/plan/harden passaram no validador do plugin.
