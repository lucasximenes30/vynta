# Marketing Vynta — instruções para agentes

Leia este arquivo, `branding/README.md` e `.devin/skills/instagram-vynta/SKILL.md`
antes de produzir conteúdo. Instruções do responsável na conversa prevalecem.

## Posicionamento e voz

- Proposta: **seu dinheiro e sua rotina, um passo de cada vez**. Demonstrar
  finanças, agenda e hábitos; não prometer automação bancária.
- Próximo, claro, adulto e sem julgamento. Humor de situação, nunca humilhar
  quem está endividado ou prometer que disciplina resolve tudo.
- Personagem: **Brotô**, guia auxiliar aprovado. Poses em `public/assets/mascot/`:
  apontando para ensinar, preocupado para acolher, celebrando para avanços.
  Não precisa aparecer em todo slide. Logo B1, ícones e avatares ficam intactos.
- Lavanda profunda, lima e verde; Sora/Manrope; respiro. Não herdar o neon dos
  lotes antigos. Somente telas demo atualizadas, sem dados pessoais.

## Pesquisa por lote

Preferência explícita atualizada em 14/11: feed e stories todos os dias,
com lote de sábado a sábado e revisão no sábado à noite/domingo de manhã.
Isso é uma escolha editorial do responsável, não uma regra do algoritmo.
Validar cobertura por data antes de encerrar; não deixar o dia atual vazio
nem duplicar o sábado compartilhado por lotes. Incluir treinos na rotação
de pautas, junto de finanças, hábitos e agenda, sem prescrever exercícios.
Correção aplicada: anúncio em 14/11 às 12h; treino em 15/11 às 18h30.
Horários completos e IDs no calendário e no inventário JSON.

1. Conferir calendário local e estado real do Zernio, paginando se necessário.
   Separar publicado, agendado, rascunho e proposta. Salvar snapshot mínimo antes
   de alterações remotas; não versionar credenciais/dados do proprietário.
2. Consultar fontes primárias atuais: organizador, órgão oficial, documentação
   da plataforma e páginas dos concorrentes. Registrar URL, consulta, data do
   evento e afirmação sustentada. Pesquisa de sites não é pesquisa de consumidores.
3. Selecionar tendências por afinidade, utilidade, momento e evidência. Não
   preencher cota de memes nem explorar feriados sensíveis para vender.
4. Revalidar eventos voláteis D-1/D0. Preparar alternativa sem data/preço. Rumor
   não vira anúncio; converter dólar não prova preço brasileiro.
5. Comparar métricas por formato e idade. Amostra pequena gera hipótese, não
   regra de algoritmo. Separar alcance, impressões, visitas e conversões.

## Copy verificável

- Preços/trial em `lib/plans.ts`; funcionalidades no código/telas atuais.
  CTA: teste de 7 dias, sem cartão; nunca plano gratuito permanente.
- Sem garantia de 5s/30s, economia, ausência de surpresas ou hábito em 7 dias.
  Exemplos numéricos devem fechar a conta e ser identificados como ilustrativos.
- Salário recorrente não cria 13º automaticamente; recebimento segue datas
  cadastradas, sem confirmação bancária. Resultado mensal não é saldo bancário.
- Notificações exigem configuração/permissões. Offline exige preparação/cache
  e suporta fluxos específicos; não prometer tudo offline em qualquer aparelho.
- Não inventar depoimentos, usuários, percentuais ou inferioridade do concorrente.
  Não transformar orientação geral em aconselhamento financeiro individual.

## Produção e revisão

- **Template aprovado em 14/11/2026:** `marketing/templates/broto-social/README.md`.
  Usar o HTML de exemplo, estrutura JSON e composições aprovadas como base.
  “Fontes” significa arquivos editáveis (HTML/CSS/JSON/scripts); PNGs são artes finais.
  Pacote portátil completo em `marketing/pacotes/vynta-broto-social-2026-11.zip`.
  Não usar o exemplo como copy fixa nem regenerar um lote já agendado por engano.
- Uma ideia por slide. Imagem única, carrossel enxuto ou Reel original conforme
  a história; sem quantidade mágica de slides ou frequência obrigatória diária.
- Pasta final `instagram/DD-slug/`, mês/ano no calendário. Revisões não aprovadas
  podem ficar em `instagram/revisao-AAAA-MM/DD-slug/`, separadas do remoto atual.
- Entregar HTML, PNGs 2160×2700, legenda, fontes e roteiro dos stories.
  Stories 2160×3840; reservar controles e sticker nativo. PNG não é enquete.
- Padrão editorial de 3–5 hashtags relevantes, não fórmula de alcance. Uma ação
  principal por peça. Áudio opcional, adequado e licenciado para a conta.
- Esperar fontes/imagens e inspecionar todos os renders também em escala mobile:
  contraste, quebras, sobreposição, contas, recortes e texto completo.
- Planejar stories com o feed. Respostas do público viram pauta; não publicar
  apenas para cumprir uma cota. Geradores locais nunca publicam automaticamente.

## Zernio e publicação

- Preparar conteúdo/horários concretos antes de pedir aprovação, quando ainda
  necessária. Respeitar autorização persistente e escopo do usuário.
- **Autorização recebida em 14/11/2026:** substituir toda a fila da semana pelos
  materiais novos e agendar o anúncio para amanhã, 15/11. Aplicado: sete feeds e
  quatorze stories, até 21/11. Não pedir novamente autorização para esta operação
  já concluída; futuras mudanças seguem o novo escopo solicitado. Histórico
  publicado preservado. IDs/status em `instagram/agendamento-2026-11-15-a-21.json`.
- Anúncio só após deploy autorizado e smoke test. Aprovação editorial não
  autoriza merge/deploy. Conferir ID/status/data contra snapshot antes de editar,
  preservando mudanças feitas pelo responsável e evitando duplicações.
- Depois de atualizar, reler mídias/ordem/legenda/fuso/data/status pela API e
  atualizar calendário. Informar etapas manuais de áudio/sticker quando houver.
- Stories automáticos usam `story/automaticos/`: uma mídia por post, sem enquete,
  caixinha ou link-sticker fictício. As versões manuais continuam disponíveis;
  não postar ambas no mesmo horário. No lançamento, o deploy deve estar pronto
  antes do primeiro story (15/11 às 10h45); se atrasar, reagendar anúncio e stories.

## Aprendizado

Janelas sugeridas: 24h, 72h, 7 dias. Medir saves/alcance, shares/alcance,
visitas/alcance e follows/visitas com atribuição disponível. Não chamar shares
agregados de DMs. Trials precisam de UTM/eventos verificados; cliques zerados na
API não provam zero vendas. Comparar uma variável por experimento e reavaliar
após duas semanas, sem prometer significância. Auditoria inicial:
`auditoria/2026-11-13/README.md`.
