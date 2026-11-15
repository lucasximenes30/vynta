# Treinos 2.0 — primeiro pacote aprovado

Implementação de P0 e núcleo P1 do plano `plano-treinos-2026-11-14.md`, autorizada
pelo usuário, incluindo commit/push na main. Não inclui as hipóteses futuras de
prescrição, importação, superséries, agenda/hábitos ou wearables.

## Entregue

- Hoje, Ficha e Progresso; início pela programação ou diretamente por qualquer
  treino da ficha. Um único fluxo para registrar séries e concluir.
- Execução dinâmica, controles numéricos de 44 px, rolagem própria, safe areas,
  ajuste à visualViewport, foco contido no diálogo e Escape, movimento reduzido.
- Rascunho salvo a cada alteração, separado por usuário. Fechar/recarregar não
  descarta; pausa explícita exclui o tempo da duração. Descarte exige confirmação.
- Referência à última sessão da ficha e cópia voluntária de seus valores reais.
  Campos começam vazios; metas são referências, não registros realizados.
- Descanso de 30/60/90/120/180 segundos, início ao marcar série, +15 s e pular.
  O deadline continua correto ao retornar do segundo plano. Sem alarme nativo.
- Revisão antes de finalizar; completo/parcial determinado pelas séries.
  Resumo com Brotô, duração, observações e histórico paginado com cursor estável.
- Validação corrige repetições acima de 50 e aceita zero sem confundir com séries.
  Inteiros, limites de carga, números de série repetidos, exercícios alheios e
  datas futuras são verificados também no servidor.
- Envio pendente fica no aparelho até confirmação. Retenta ao abrir Treinos,
  voltar à aba ou ficar online, além da ação manual. Payload final congelado e
  ID derivado da conta + UUID impedem duplicação nos retries do novo cliente.
  Erro 400 confirmado permite voltar à correção; falha ambígua mantém payload.
- Autenticação/permissão, Origin, dono do rascunho, rate limit persistente,
  transação com trava por usuário e resposta sem cache. Falhas internas não
  devolvem mensagens cruas do banco. Rascunhos de outras contas não são enviados.
- Arquivamento preserva dias, exercícios e sessões. Nomes ficam em snapshots;
  a lista de Hoje projeta sessões novas e mantém fallback para check-ins antigos.
  Ranking corrigido para “geral”, pois os pontos existentes não são semanais.

## Banco

`prisma migrate diff` foi executado contra o schema atual antes de `db:push`.
Somente seis colunas nullable adicionadas, sem DROP nem alteração de valores
originais. SQL abaixo. `prisma generate` executado com adapter/client 6.19.3.

```sql
ALTER TABLE workout_day_exercises ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE workout_days ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE workout_session_exercises ADD COLUMN "exerciseName" TEXT;
ALTER TABLE workout_sessions ADD COLUMN "dayName" TEXT,
  ADD COLUMN "durationSeconds" INTEGER, ADD COLUMN "planName" TEXT;
```

Inicialização dos novos snapshots, somente onde NULL, em transação:

```sql
UPDATE workout_sessions s SET "planName" = p.name FROM workout_plans p
WHERE s."planId" = p.id AND s."planName" IS NULL;
UPDATE workout_sessions s SET "dayName" = d.name FROM workout_days d
WHERE s."workoutDayId" = d.id AND s."dayName" IS NULL;
UPDATE workout_session_exercises s SET "exerciseName" = e."namePt" FROM exercises e
WHERE s."exerciseId" = e.id AND s."exerciseName" IS NULL;
```

Uma sessão e um exercício existentes receberam os nomes atuais. Não é possível
recuperar nomes anteriores que nunca foram guardados. Não houve exclusão de dados,
recriação de demo, mudanças em transações financeiras ou na fila offline global.

## Verificação executada

- Regressões isoladas em `scripts/check-workout.ts`, também chamadas pelo teste
  de segurança: reps 0/100/1000, decimais, fronteira de dia em São Paulo, pausa,
  persistência e conflito de rascunho, contas distintas, oito retries concorrentes
  com uma criação/pontuação, duas sessões distintas no mesmo dia, parcial,
  duplicação de séries/exercícios, cursor com datas iguais, arquivamento por update,
  preservação do dia dos pontos legados, autenticação, permissão, Origin e limite.
- Chrome headless, conta demo existente: 320/390/430/768/1440 px nos temas claro
  e escuro. Em cada combinação: preencher reps/carga, marcar série, pausar,
  recarregar e retomar. Sem overflow horizontal de página ou diálogo.
- Movimento reduzido em 320 px; viewport de 390×450 para redução da área útil.
- Rede offline durante conclusão, retorno com resposta 503 simulada e novo envio
  com o mesmo identificador. Rascunho mantido até confirmação; resumo, histórico,
  referência anterior e nova sessão com outro UUID conferidos.
- Deadline vencido simulado, seguido de recarga/retomada: descanso mostra “Pronto”.
- Mutações de sessão e histórico do QA visual usam respostas simuladas; leituras
  iniciais da ficha são da demo. Não foram criados treinos pessoais para testar.
- Evidências locais em `.cache/workout-review/` (prints e `results.json`).
- Revalidação no build de produção local: 320/390/1440 px, fluxo offline/retry,
  resumo/histórico, foco após confirmação e animação (desligada em reduced motion).
  Passou; prints finais sem indicador de desenvolvimento em `.cache/workout-final/`.
- `npx tsc --noEmit -p .`, `npm run build`, `npx tsx scripts/check-security.ts`
  e `git diff --check`: passaram. O teste de segurança inclui falhas simuladas
  intencionais de cron/webhook; seus logs não representam falhas da suíte.

First Load JS do build final (mesmos valores arredondados da referência):

| Rota | Antes | Depois |
|---|---:|---:|
| Treinos | 121 kB | 121 kB |
| Landing | 117 kB | 117 kB |
| Painel | 119 kB | 119 kB |
| Finanças | 146 kB | 146 kB |
| Agenda / Hábitos | 120 kB | 120 kB |

O chunk da página Treinos tem 17,6 kB; a execução é carregada dinamicamente e não
entra no bundle de landing/Finanças. Esses valores não são um benchmark de CPU,
rede ou FPS em aparelhos físicos.

## Limitações explícitas

- Não houve teste em iPhone físico, Safari nativo, teclado nativo, PWA instalado,
  suspensão real do sistema ou sincronização em segundo plano. Viewport reduzida
  e Chrome não substituem essas validações.
- Rascunho é local ao aparelho. Limpar armazenamento/desinstalar o PWA antes de
  sincronizar pode perdê-lo. Não há transferência de rascunho entre aparelhos.
  A retomada automática do envio depende de abrir o módulo Treinos autenticado.
- O mecanismo de revisão detecta conflitos observados entre abas; localStorage
  não oferece transação atômica entre processos. Não prometer edição simultânea
  de rascunhos em múltiplas abas. Servidor deduplica o envio final por UUID.
- Check-ins legados ficam preservados; não se convertem em séries inventadas.
  O histórico detalhado mostra WorkoutSession, não soma WorkoutLog à mesma sessão.
  Clientes antigos sem UUID continuam aceitos por compatibilidade; a garantia
  de retry idempotente vale para o fluxo novo, que sempre envia o identificador.
- Arquivos/fichas arquivados permanecem no banco; uma interface de restauração,
  gráficos por exercício e integrações são parte das próximas entregas.
- Duração indica tempo com cronômetro ativo, incluindo descansos; não mede tempo
  fisiológico, calorias ou recuperação. Limite de registro: sete dias.
