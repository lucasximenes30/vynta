---
name: copy-conversao
description: Escreve e revisa copy de conversão (landing, CTAs, e-mails, push, telas de upgrade) do Vynta em PT-BR, mobile-first, com base em pesquisa de copywriting e dados reais do produto.
argument-hint: "[página/tela ou trecho a escrever/revisar]"
triggers:
  - user
  - model
---

# Copy de conversão — Vynta

Use este guia sempre que for escrever ou revisar texto que precisa fazer alguém agir: landing page (`app/page.tsx`), CTAs, cadastro, onboarding, e-mails (`lib/emailTemplates.ts`), push (`services/pushScheduler.service.ts`), telas de assinatura/upgrade.

## Atualização de 13/11/2026 — identidade e copy

Consultar `marketing/branding/README.md` e `marketing/branding/2026-11-rebrand/COPY.md`.
Nova marca: broto B1; creme, verde profundo, lima e lavanda. CTA padrão:
“Testar 7 dias grátis”. Tempos de 5s/30s/1min abaixo são referências antigas,
não promessas aprovadas: usar “lançamento rápido” e explicar o fluxo. Não reutilizar
as estatísticas de exemplo sem fonte primária verificada. Não prometer lembrete
antes de todo compromisso: depende de configurações e agendamento. Identificar
valores de demonstração como ilustrativos. Essas regras atualizam os exemplos históricos.

## 1. Processo (não pule etapas)

1. **Qual é a ação única?** Uma página = um objetivo. Na landing: criar a conta (trial). Tudo que não ajuda nisso sai ou desce.
2. **Nível de consciência do visitante** (Eugene Schwartz):
   - Tráfego frio de anúncio (Meta/TikTok) = *consciente do problema* → abra pela dor concreta, depois a solução, depois o produto.
   - Busca "app de controle financeiro" = *consciente da solução* → diferencie cedo (o que o Vynta faz que os outros não fazem).
   - Retargeting / quem já conhece = *consciente do produto* → oferta, preço, risco zero, CTA.
   - A landing principal atende tráfego frio + solução: dor no hero, diferencial logo abaixo, prova visual do produto sempre perto.
3. **Voz do cliente (VOC)**: escreva com as palavras que o público usa, não com jargão de produto. Fontes: avaliações de concorrentes (Play Store / App Store / Reclame Aqui de Mobills, Organizze), comentários de anúncios, respostas de suporte, mensagens de usuários. Frases reais coletadas:
   - "chegar ao fim do mês sem saber para onde foi o dinheiro"
   - "a fatura do cartão aparece com valor errado" / "passo mais tempo conferindo se o app está certo"
   - "era cansativo demais, a revisão virou tarefa que eu evitava" / "o app me dava tudo, eu queria menos"
   - "tudo te induz a ter conta paga" (irritação com freemium agressivo)
   - "faço de cabeça" / "planilha que eu abandonei"
4. **Hierarquia da mensagem** antes de escrever: promessa principal → 3 benefícios → prova → objeções → oferta → CTA.
5. **Rascunhe muitas versões** do headline (mínimo 10–20, de ângulos diferentes: dor, ganho, velocidade, "sem X", comparação, pergunta) e escolha pela clareza, não pela "criatividade".
6. **Edite cortando**: frase que não move a pessoa para o CTA sai.

## 2. Regras de ouro

- **Clareza > esperteza.** Em 3 segundos o visitante precisa saber: o que é, pra quem é, por que importa. Slogans vagos ("O futuro da organização") são proibidos.
- **Resultado > recurso.** "Veja a fatura certa de cada mês antes dela chegar" > "Gestão de cartões com fechamento". Recurso só entra como prova do resultado.
- **Específico > genérico.** Números, exemplos e situações reais ("anotou o Uber na fila do caixa"). Use números do produto (5 segundos, 7 dias, R$ X/mês) — nunca invente métricas.
- **Você, não nós.** Fale com a pessoa ("você"), frases curtas, ordem direta. Uma ideia por frase.
- **Tom**: brasileiro, próximo, confiante, com leveza (referência: abacatepay.com — "sem letrinha pequena, sem migué", "Você leu até aqui. Tá interessado né?"). Uma piada/irreverência pontual por página, no máximo 2–3; nunca no meio de uma informação de preço ou segurança.
- **Mostre, não conte.** Todo benefício importante precisa de uma prova visual por perto (print, mock animado, notificação).
- **Prova social honesta.** NUNCA invente depoimento, número de usuários, nota, logo de imprensa ou "milhares de pessoas". Sem prova real, use: demo do produto, garantia, transparência (preço na cara, sem pegadinha), história do fundador, dados públicos com fonte.
- **Dados de terceiros** só com fonte nomeada e verificável, ex.: "52% dos brasileiros não sabem exatamente quanto gastam por mês (Datafolha/Planejar, 2025)"; "54% não controlam os gastos do cartão (CNDL/SPC Brasil)"; "36% não sabem o valor das contas do mês seguinte (SPC Brasil/CNDL)".
- **Não fale mal de concorrente por nome.** Compare com categorias ("app de finanças + app de hábitos + agenda") ou com a planilha.

## 3. Hero (acima da dobra)

Estrutura:
1. **Eyebrow/pílula** (opcional): categoria ou novidade curta — "Finanças + rotina num app só".
2. **Headline**: dor ou desejo concreto do público + promessa. ≤ 10 palavras é o ideal; no celular deve caber em 3–4 linhas no tamanho final, sem palavra órfã.
3. **Subheadline**: o mecanismo (como o Vynta entrega) + a principal objeção resolvida. 1–2 frases.
4. **CTA primário** com o benefício/oferta no texto + **microcopy de risco zero logo abaixo** (padrão AbacatePay: "**Sem mensalidade.** Aprovação não leva semanas." → para o Vynta: "**7 dias grátis.** Sem cartão, sem CPF.").
5. **Visual do produto** que entrega a promessa do headline (no mobile: celular com a tela principal, nunca uma tela de desktop encolhida).

Fórmulas úteis:
- "Chega de [dor]." / "[Resultado] sem [esforço indesejado]."
- "Saiba [desejo] antes de [momento de dor]." → "Saiba quanto sobra antes do mês acabar."
- "[Fazer coisa difícil] em [tempo curto]." → "Anote um gasto em 5 segundos."
- "O único app que [diferencial] e [diferencial]."
- Mad-lib interativo (estilo AbacatePay): "Eu ganho R$ [3.000] e quero guardar [10%] → em 12 meses são R$ 3.600". Só com matemática honesta, nada de promessa de resultado.

## 4. CTAs e microcopy

- Texto do botão = o que a pessoa ganha/o que acontece ao clicar, na 1ª pessoa ou imperativo: "Criar minha conta grátis", "Testar 7 dias grátis", "Organizar meu mês". Nunca "Enviar", "Saiba mais", "Começar" sozinho.
- **Mesmo CTA** no hero, no meio, no fim e na barra fixa do mobile (consistência = menos dúvida). Varie só o contexto ao redor.
- Sempre responda perto do botão as 3 objeções de clique: **custo** (grátis por 7 dias), **compromisso** (sem cartão, cancela quando quiser), **tempo** (30 segundos pra criar).
- Cuidado ao exagerar o "grátis": repetir "grátis" demais lembra que um dia vai cobrar. Equilibre com valor ("Organizar meu mês — 7 dias grátis").
- CTA secundário (ex.: "Ver como funciona") precisa ser visualmente mais fraco.
- No celular: botão primário com largura total, altura ≥ 48px, a 1 polegar de distância; barra CTA fixa aparece depois do hero.

## 5. Estrutura da landing (tráfego frio)

1. Hero (dor + promessa + CTA + produto).
2. Faixa de confiança (segurança, sem senha do banco, cancela quando quiser).
3. Dor/identificação ("Se identifica?") — 3 dores reais em palavras do cliente.
4. Virada: "o problema não é disciplina, é ter a vida espalhada" → o Vynta.
5. Diferenciais com demo (lançamento em 5s, avisos push, cartão/fatura certa, hábitos/agenda/treino).
6. Como funciona (3 passos, o 1º sempre "crie a conta em 30s").
7. Ancoragem: "um app no lugar de seis" / quanto custaria separado.
8. Fundador (prova humana enquanto não há depoimentos).
9. Preço (anual em destaque, equivalente mensal, garantia de 7 dias, sem fidelidade).
10. FAQ = objeções reais (cartão? banco? segurança? celular? cancelamento?).
11. CTA final emocional + reforço de risco zero ("Você leu até aqui...").

Cada seção: 1 título que funciona sozinho (quem só lê títulos entende a venda), 1 frase de apoio, prova visual. Títulos ≤ 8 palavras no mobile.

## 6. Mobile-first

- Escreva e revise SEMPRE olhando a largura de 360–390px. Quebras feias (nome cortado, palavra sozinha na linha) se resolvem encurtando o texto, `text-balance`/`text-wrap: balance`, ou `<br className="hidden sm:inline" />` — não diminuindo a fonte até ficar ilegível.
- Parágrafos de no máximo 2–3 linhas no celular. Listas > parágrafos.
- Esconda no mobile o que é secundário, nunca o que é prova ou objeção.

## 7. Fatos do Vynta (use só o que é verdade — confira `lib/plans.ts` antes)

- Trial: `TRIAL_DAYS` (7) dias grátis, só nome, e-mail e senha. Sem cartão, sem CPF. Nada cobrado automaticamente.
- Preço: `PLANS.pro` mensal e `PLANS.pro_yearly` anual (equivalente mensal `YEARLY_MONTHLY_EQUIVALENT_CENTS`, economia `YEARLY_DISCOUNT_PERCENT`%). Pix ou cartão. Sem fidelidade. Garantia de 7 dias após o pagamento.
- Diferenciais reais: lançamento rápido (botão +, categoria automática, funciona offline), push com app fechado (contas/faturas, compromissos, hábitos, "gastou algo hoje?"), cartões com fechamento/vencimento e parcelas, importação de fatura Nubank (CSV), salário por dia útil, relatórios com IA, hábitos, agenda (sincroniza Google Agenda via iCal, só leitura), treinos, metas, notas, PWA instalável.
- NÃO prometa: conexão com banco/Open Finance, app nas lojas, resultado financeiro garantido ("economize R$ X"), número de usuários.

## 8. Checklist final

- [ ] Em 3 segundos dá pra entender o que é, pra quem e por quê?
- [ ] O headline usa palavras do cliente e cabe bem em 390px?
- [ ] Todo CTA diz o que a pessoa ganha e tem microcopy de risco zero?
- [ ] Cada benefício tem prova visual por perto?
- [ ] Alguma afirmação inventada ou sem fonte? (remova)
- [ ] As objeções (preço, cartão, banco, segurança, tempo, cancelamento) estão respondidas?
- [ ] Lendo só os títulos das seções, a venda faz sentido?
- [ ] Os valores vêm de `lib/plans.ts` (não hardcoded)?

## 9. Depois (trial → assinatura) — ainda não implementado

Para a próxima fase (converter antes do fim dos 7 dias): marcar o "momento aha" (1º gasto, 1º push recebido), mostrar progresso do que a pessoa já organizou ("você já anotou 23 gastos"), perda (não ganho) no fim do trial ("seus lançamentos e lembretes param em 2 dias"), oferta com prazo real (`PROMO_FIRST_MONTH`), anual como padrão, garantia de 7 dias ao lado do botão de pagar.
