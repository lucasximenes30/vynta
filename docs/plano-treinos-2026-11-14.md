# Proposta: Treinos como destaque do Vynta

Pesquisa e leitura técnica em 14/11/2026. Plano para revisão do responsável;
nenhuma implementação, migração ou alteração de conta nesta etapa.

## Direção recomendada

**Sua ficha à mão, seu progresso salvo e seu treino dentro da vida real.**

Público inicial proposto: pessoa que já tem uma ficha ou orientação e quer
executar, registrar e acompanhar pelo celular. Validar com 5–8 usuários atuais
antes de ampliar para quem procura prescrição automática. Ter muitas áreas no
mesmo app não basta: o fluxo na academia precisa ser simples e confiável.

## Mercado e implicações

Fontes primárias consultadas; comparação de recursos divulgados, não teste
prático de assinaturas nem comprovação de superioridade do Vynta.

| Referência | O que oferece/divulga | Aplicação ao Vynta |
| --- | --- | --- |
| [Hevy](https://www.hevyapp.com/features/track-workouts/) | Registro por série, descanso automático e RPE | Facilitar a execução, poucos toques e informação anterior visível |
| [Rotinas do Hevy](https://www.hevyapp.com/features/gym-routines/) | Rotinas reutilizáveis, reorganização e superséries | Duplicar fichas e separar ajustes da sessão de mudanças no modelo |
| [Strong](https://www.strong.app/) | Registro simples, progresso, melhores séries e exportação | Histórico útil e portabilidade; o app deve exigir pouca atenção durante o treino |
| [Fitbod](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout) | Personalização por objetivo, experiência, equipamentos, duração e recuperação | Preferências de contexto são úteis; prescrição algorítmica é uma frente muito maior |
| [MFIT](https://mfit.mfitpersonal.com.br/pages/solucoes-para-alunos.html) | Experiência do aluno vinculada ao profissional e acesso à ficha | Facilitar trazer a ficha existente; não exigir que o usuário a reconstrua toda |
| [Trainerize](https://www.trainerize.com/features/) | Programas, hábitos, agenda e acompanhamento profissional | Integração com rotina já existe no mercado; diferenciar pela experiência e pelo público, não alegar exclusividade |

Não competir agora com gestão de academias, cobrança de personal ou rede social
fitness completa. Também não prometer Apple Watch/HealthKit ou execução de timers
em segundo plano equivalente à de aplicativos nativos sem prova no PWA/iPhone.

## Base atual: reaproveitar

Há plano ativo, divisões/dias, catálogo e exercício personalizado, séries,
repetições, carga alvo, notas, ordenação, treino escolhido por data, checklist
diário, sessão com séries executadas, pontuação e ranking. Não reescrever tudo.
O modelo já guarda detalhes por série; falta transformar isso em histórico útil.

## Achados técnicos

Inspeção de código, com um teste isolado da validação. Não houve auditoria visual
completa, teste em iPhone físico ou reprodução de todos os cenários abaixo.

1. **Validação errada para repetições — confirmada.**
   `services/workoutSession.service.ts` usa `normalizeOptionalSetsDone` também
   para `actualReps`, aceitando somente 1–50. A API admite 0–1000. O teste isolado
   da função retornou erro para 0, 51 e 100, e aceitou 12. O cliente também usa o
   parser de séries. Corrigir validações distintas e mensagens coerentes.
2. **Rascunho da execução descartado — confirmado no código.**
   `closeWorkoutExecutionModal` em `app/workout/WorkoutClient.tsx` limpa exercícios
   e notas; iniciar novamente reconstrói a partir da ficha. Não há persistência
   de execução nesse componente. Provar com E2E fechar/reabrir/recarregar antes
   da correção. Manter rascunho por conta e oferecer retomar/descartar explícito.
3. **Exclusão de ficha ligada ao histórico — confirmada no modelo.**
   `deleteWorkoutPlan` faz delete; relações de WorkoutSession com plano/dia usam
   onDelete Cascade. Substituir exclusão cotidiana por arquivamento e preservar
   uma fotografia da ficha em cada sessão. Testar sem apagar dados reais.
4. **Reenvio pode duplicar sessões — risco demonstrável no caminho de gravação.**
   POST cria nova sessão, sem chave idempotente. Se a gravação ocorrer e a resposta
   se perder, repetir pode criar outra. Reprodução com falha de rede pendente.
5. **Dois caminhos de conclusão.** Checklist usa WorkoutLog; execução detalhada
   usa WorkoutSession. Ambos acionam estatísticas. Conciliar sem duplicar treinos,
   pontuação ou descartar registros legados. Ainda não há prova de divergência real
   na conta de um usuário; criar casos de teste antes de migrar.
6. **Fuso e virada do dia — risco.** Página usa getLocalToday no servidor e o log
   usa setHours local. Comparar servidor UTC e São Paulo às 21h–23h59. Usar um dia
   de treino consistente com o fuso do usuário, inclusive sessão após meia-noite.
7. **Gamificação.** A sequência premia dias consecutivos e bônus de sete dias;
   não representa bem fichas com descanso. Planejar metas semanais e descanso
   neutro. Ranking deve ser opcional, com privacidade e sem incentivar mais carga.
8. **Manutenção e escala.** WorkoutClient tem cerca de 3.800 linhas. Ranking lê
   todas as estatísticas antes de limitar o retorno. Separar editor, execução,
   histórico e progresso; consultar ranking sob demanda, com paginação/posição
   eficiente. Baseline do último build: Treinos 121 kB First Load JS.

## Entrega 1 — Fundamentos confiáveis (P0)

- Corrigir repetições, datas e semântica de conclusão parcial/total.
- Sessão única com identidade estável; submissão idempotente e estado de envio.
- Salvar rascunho a cada alteração, isolado por usuário; retomar ao voltar.
- Offline: registrar séries localmente, mostrar pendente/sincronizado e reconciliar
  quando a rede voltar, sem descartar a fila existente ou dados em erros de API.
- Arquivar fichas/dias, manter histórico e exportação dos registros.
- Revisar autenticação, ownership, limites, concorrência e validação das APIs.
- Definir migração reversível de WorkoutLog/WorkoutSession, com backup e comparação
  antes/depois. Não deduplicar apenas por data: duas sessões no dia podem ser legítimas.

Aceite: fechar/reabrir não perde preenchimento; repetir envio não duplica; dois
usuários não compartilham rascunhos; trocar ficha preserva sessões; datas e
rep ranges têm testes; sessão parcial não vira completa por acidente.

## Entrega 2 — Experiência de academia (P1, primeira versão pública)

Três destinos claros: **Hoje / Fichas / Progresso**.

Hoje: treino previsto, iniciar/retomar e opção de descanso. Durante o treino,
tela própria com exercício atual, referência da última sessão, carga/repetições,
check por série e próxima ação alcançável pelo polegar. Campos com teclado
adequado, vírgula decimal, zeros válidos e botões de pelo menos 44 px.

Timer de descanso editável com +15s/pular, calculado por horário final para
reconciliação ao retornar. Som/vibração opcionais onde suportados; nunca prometer
alarme com PWA suspenso no iPhone sem validação física. Animações leves, apenas
nas transições; ao registrar uma série a resposta visual deve ser imediata.

Ao terminar: resumo de séries registradas, duração com pausa definida, notas e
histórico acessível. Não mostrar estimativas de calorias sem método confiável.
Brotô no acolhimento e no resumo; durante a série, espaço para os controles.

Aceite: iniciar em até duas ações a partir de Treinos; repetir dados anteriores
sem redigitar; encerrar parcial explicitamente; teclado não cobre salvar; modo
reduzido e offline funcionam. A meta de rapidez é critério de QA, não promessa
de marketing antes de medir em aparelhos reais.

## Entrega 3 — Ficha e progresso que fazem sentido (P1/P2)

- Duplicar ficha/dia, arquivar e retomar versões anteriores.
- Histórico por exercício: carga, repetições e séries realmente concluídas;
  referência à sessão anterior, sem confundir carga alvo com executada.
- Gráficos leves e resumo semanal; comparar exercícios/unidades compatíveis.
- Tipos de exercício: carga×repetições, peso corporal, duração e distância.
- Catálogo com nomes PT-BR, equipamentos, busca por sinônimos e favoritos.
- Instruções e mídias com licença e revisão; não raspar vídeos de concorrentes.
- Superséries e tipos de série após estabilizar o fluxo básico.

## Entrega 4 — Diferenciais do Vynta (hipóteses a validar)

1. **Treino dentro da semana real:** agendar sessão nos horários escolhidos e
   avisar conflito com compromissos, sem remanejar agenda automaticamente.
2. **Consistência sem culpa:** metas semanais configuradas, descanso respeitado
   e hábito vinculado por escolha do usuário; uma conclusão, um registro.
3. **Sua ficha entra no app:** importar texto/PDF/foto para rascunho com revisão
   obrigatória, exibindo campos incertos. IA organiza o documento, não inventa
   exercícios/cargas. Verificar custo, privacidade e retenção antes de habilitar.
4. **Custo da rotina:** opcionalmente ligar gasto de academia já cadastrado a
   frequência registrada. Não duplicar despesa, exigir vínculo explícito e
   evitar mensagens de culpa por custo/ausência.

Começar por agenda e consistência; importação é a próxima aposta se usuários
confirmarem que montar a ficha é a principal barreira. Não são recursos únicos
no mercado; a oportunidade é entregá-los com simplicidade no contexto do Vynta.

## Fora da primeira versão

Prescrição automática de treino por IA, dieta, reabilitação, diagnóstico de dor,
estimativa de recuperação como fato clínico, rede social pública, watch app,
integração nativa de saúde e vídeos próprios em grande escala. Dependem de
validação profissional, técnica, de demanda e/ou orçamento específicos.

## Sequência e validação

1. Entrevistar 5–8 usuários: observar montar ficha, registrar série e retomar
   sessão; incluir usuários de academia e treino em casa. Não inferir demanda
   apenas a partir de concorrentes.
2. Aprovar protótipo navegável de Hoje/Execução/Resumo em 390 px.
3. Entregar P0 e núcleo P1 juntos para piloto; evitar lançar apenas uma nova
   aparência sobre persistência frágil.
4. Medir piloto por duas semanas; expandir progresso e integração após corrigir
   falhas. Prazo de engenharia só depois da decisão de modelo/migração e protótipo.
5. QA 320/390/430, tablet e desktop; iPhone Safari instalado, Android, teclado,
   tela bloqueada, retorno do segundo plano, rede oscilando, dois aparelhos,
   duas sessões no dia, virada do dia e logout com rascunho pendente.

Métricas: primeira sessão registrada entre quem iniciou configuração; sessões
salvas/iniciadas (separar abandono intencional); sucesso de retomada; falhas de
sincronização; sessões duplicadas; uso em duas semanas consecutivas. Instrumentar
apenas eventos necessários, sem enviar cargas/notas pessoais para marketing.
Definir baseline antes de metas percentuais. Meta operacional: nenhuma perda
ou duplicação nos cenários de regressão; não é garantia universal de zero bugs.

Performance: não aumentar o JS da landing ou de Finanças; comparar Treinos com
121 kB, carregar gráficos/editor/importação sob demanda e medir ações em celular
intermediário. TypeScript, build, segurança, regressões e diff --check em cada entrega.

## Aprovação proposta

Aprovar **P0 + execução mobile + último treino + descanso + resumo/histórico
básico** como Treinos 2.0. Depois, progresso e agenda/hábitos. Preservar todas as
fichas e sessões existentes. Pacote aprovado pelo usuário em 14/11/2026, com commit/push autorizado na main.
Execução e limites registrados em `treinos-2.0-2026-11-14.md`.
