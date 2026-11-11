# Login persistente no PWA — 10/11/2026

Solicitado após a publicação do commit `8c20431`, cujo deploy foi confirmado Ready. O objetivo é abrir e fechar o app normalmente sem precisar refazer login a cada semana.

## Comportamento

- Sessões comuns começam com 90 dias de validade. Durante o uso online, a janela é renovada automaticamente, no máximo uma vez por dia por cookie. Não há prazo absoluto que desconecte quem continua usando o app.
- O heartbeat já existente de atividade faz essa renovação; não há endpoint ou biblioteca nova. Ele roda ao abrir/voltar ao app, voltar a ficar online e a cada 10 minutos enquanto a página estiver visível. O banco só recebe a atualização de expiração quando a renovação é necessária.
- Sessões válidas de sete dias emitidas pelo deploy anterior passam para a nova janela na próxima atividade, sem novo login. Tokens mais antigos que a implantação do registro de sessões continuam exigindo a autenticação inicial descrita na revisão de segurança.
- Cookie HttpOnly persistente e Secure em produção; nenhum token fica em localStorage. Fechar o PWA não encerra a sessão. Falhas de rede/servidor preservam o login existente e permitem nova tentativa.
- Logout, troca de senha, exclusão da conta ou expiração continuam revogando acesso. A renovação faz UPDATE condicional de uma sessão ativa e nunca INSERT/upsert, inclusive em corrida com logout. Outros aparelhos permanecem independentes.
- A sessão expira após até 90 dias sem renovação. Limpar os dados do navegador/PWA ou usar navegação privada também pode exigir novo login. A autenticação não altera a validade da assinatura paga.
- Contas ADMIN mantêm prazo de sete dias e não recebem a renovação automática.

## Validação

`scripts/check-security.ts` simula mais de 400 dias de uso da mesma sessão, atualização de sessões de sete dias, cookie persistente, renovação concorrente com logout, registros expirados, falha do banco e independência de aparelhos. Também verifica o handler real do heartbeat com dependências isoladas: sem sessão retorna 401, sessão válida dispara renovação e a resposta é no-store. Os testes anteriores de webhook/cron continuam passando.

Typecheck e build passaram. First Load JS mantido em 118 kB para relatórios e dashboard, 145 kB para finanças e 122 kB para login; middleware 40,6 kB. Não se simulou a passagem de 400 dias num aparelho real: a evidência é a execução da política real de sessão com relógio controlado e persistência isolada. Nenhuma nova alteração de schema, cron, webhook ou regra de WAF é necessária.
