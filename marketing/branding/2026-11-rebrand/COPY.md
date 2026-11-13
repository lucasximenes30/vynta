# Revisão de copy — 13/11/2026

## Premissa

Vynta é um app de finanças pessoais e rotina para quem acompanha gastos de cabeça,
se perde nas parcelas ou distribui informações entre planilhas e aplicativos.
A porta de entrada é entender o mês financeiro. Hábitos, agenda, notas e treinos
aparecem como continuidade, sem exigir que a pessoa adote todas as áreas.
Público e prioridade são hipóteses editoriais inferidas do produto e da landing,
não resultados de pesquisa com clientes.

## Primeira dobra escolhida

- Categoria: Seu app de finanças e rotina.
- Título: Saiba quanto sobra antes do mês acabar.
- Apoio: Reúna gastos, parcelas e faturas para entender o que sobra no mês.
  O Vynta organiza seu dinheiro e sua rotina no mesmo app.
- CTA: Testar 7 dias grátis (duração vem de `TRIAL_DAYS`).
- Microcopy: Sem cartão. Sem cobrança automática no fim do teste.
- Prova: telas do produto, com indicação de dados ilustrativos.

O título existente foi preservado por expressar uma tarefa concreta. O apoio
explicita a categoria e o mecanismo; não atribui ao app conhecimento de gastos
que não foram cadastrados. Não há plano gratuito permanente anunciado.

## Auditoria aplicada

| Antes | Problema | Ajuste |
| --- | --- | --- |
| Criar minha conta grátis | Duração do teste fica fora do CTA | Testar 7 dias grátis |
| Anote um gasto em 5 segundos | Tempo não medido em teste de uso | Abra o lançamento rápido, informe o valor e descreva a compra |
| Crie a conta em 30 segundos | Tempo não medido | Crie sua conta |
| Nada de formulário | O fluxo contém campos | Explica valor, descrição, sugestão de categoria e atalhos |
| Antes de cada compromisso | Depende da frequência do cron e preferências | Resumo da agenda e lembretes sem garantia universal de antecedência |
| Dados protegidos e criptografados | Alegação ampla sobre armazenamento | HTTPS, hash de senha e sessão autenticada |
| 52% dos brasileiros… | Fonte primária não disponível no projeto | Retirado; demonstração do produto sustenta a seção |
| Hábitos, agenda, metas, treinos e notas conversam com suas finanças | Sugere integrações entre módulos não demonstradas | Áreas disponíveis no mesmo app |
| A partir de R$ 14,99/mês | Condição anual pouco visível na comparação | Equivalente mensal acompanhado do total anual |
| Bora fechar o próximo mês no azul? | Pode sugerir resultado financeiro garantido | Seu próximo mês começa com um gasto anotado |
| Em 12 meses, você junta | Simulação pode soar como promessa | Guardando esse valor por 12 meses; sem rendimentos; depende de aportes |

## Fontes de produto

Confirmadas no código (não equivalem a auditoria de produção):

- `lib/plans.ts`: 7 dias, mensal R$ 24,90, anual R$ 179,90, áreas incluídas.
- `app/api/auth/register/route.ts`: novos cadastros entram no trial.
- `lib/quickCategorize.ts` e `lib/quickAdd.ts`: sugestão e lançamento rápido.
- `lib/invoice.ts`: fechamento, vencimento e parcelas.
- `services/card.service.ts`: importação Nubank CSV.
- `services/pushScheduler.service.ts`: janelas, preferências e necessidade de
  cron frequente para antecedência de compromissos.
- `public/sw.js`, `public/offline-queue.js`: uso offline e fila por conta.
- `lib/password.ts`, `lib/auth.ts`, `lib/authToken.ts`: autenticação e senhas.
- `services/subscription.service.ts`, `app/api/subscription/portal/route.ts`:
  cancelamento e manutenção do acesso pago.

Declarações preexistentes preservadas como política editorial do responsável:
7 dias de garantia, conforme `.devin/skills/copy-conversao/SKILL.md`.
A fala do fundador já constava na landing; não foi inventada nem ampliada.
Não foram criados depoimentos, métricas de clientes ou resultados de economia.

## Exploração de títulos

1. Saiba quanto sobra antes do mês acabar. (escolhido; benefício concreto)
2. Veja para onde seu dinheiro vai.
3. Seu mês financeiro, sem fazer de cabeça.
4. Gastos e faturas no mesmo lugar.
5. Entenda suas contas antes do próximo salário.
6. Organize o dinheiro. Abra espaço para a rotina.
7. Acompanhe hoje o que vence neste mês.
8. Veja suas parcelas na fatura certa.
9. Comece a organizar o mês pelo gasto de hoje.
10. Tire suas contas da cabeça e acompanhe no app.

## Direção visual e validação

Referências consultadas em 13/11/2026: https://www.abacatepay.com/ e
https://biip.club/. Inspiração em espaço, tipografia, áreas de cor, demonstração
e linguagem próxima; sem copiar marca, mascote ou depoimentos.

Avaliação editorial: categoria, problema, mecanismo e clique ficam explícitos.
Isso não comprova conversão. Prioridade posterior: mostrar a primeira tela por
10 segundos a cinco pessoas do público e perguntar o que é, o que ajuda a fazer
e o que ocorre ao clicar. Medir primeira transação por visitante, além de CTA.
A verificação visual mobile/desktop deve constar no relatório de implementação.
