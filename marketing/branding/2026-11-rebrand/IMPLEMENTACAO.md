# Implementação — rebranding e revisão mobile

## Primeiro commit — a8913ad

- B1 aprovado pelo responsável: matriz e seis propostas preservadas.
- Símbolo compartilhado, PWA, boot, badge, e-mails e Open Graph atualizados.
- Paleta de marca atualizada mantendo cores semânticas e temas do app.
- Landing reorganizada com broto e produto, animações CSS existentes.
- CTA e copy revisados; evidências em `COPY.md`.
- Guias de agentes, marketing e template-base atualizados e versionados.
- Prints recapturados da conta demo (recriada pelo script documentado).
- Build concluído; First Load JS da landing: 117 kB antes e depois.
- Typecheck passou; regressões isoladas de segurança/relatórios passaram.
- Primeira dobra inspecionada em desktop e 390×844. Nova revisão completa
  ocorrerá após os ajustes de lavanda escura e mobile solicitados em seguida.

A pedido do responsável, a evolução seguinte fica em outro commit: landing
escura baseada em lavanda, fluidez do app, avatares sociais e correções de
largura da agenda/campos de data e hora no PWA. A versão clara deste checkpoint
é intermediária; o guia final será atualizado junto da revisão seguinte.

## Segundo commit — lavanda escura e PWA

- Landing com fundo lavanda profundo, superfícies discretas e CTA lima.
  Preservados reveal, parallax e suporte a movimento reduzido.
- Referência biip observada em navegação somente de leitura: shell persistente,
  item ativo claro, espaçamento e transição curta. Sidebar expandida no desktop,
  compacta no tablet e navegação inferior no celular.
- Troca de rota por fade de 240 ms sem remontar a página ou transformar o
  ancestral dos modais fixos. Nenhuma biblioteca adicionada.
- Agenda: colunas com largura mínima zero, cabeçalho com quebra, indicadores
  abaixo do dia no mobile e títulos longos contidos na lista.
- Novo evento: altura dinâmica da viewport, corpo rolável, rodapé no fluxo,
  área segura inferior e campos de data/hora com largura limitada.
- Regra compartilhada dos campos nativos também atende Finanças, Metas e
  lançamento rápido. Mantido o zoom por gesto; fonte de 16 px no celular.
- Hábitos: sete colunas flexíveis no mobile e coluna de título sem mínimo fixo
  no tablet. Simulador da landing com valor responsivo em telas pequenas.
- Avatar social original e exports Instagram/TikTok em `../social/`.
  PWA com ícones versionados `broto-v2-*`, máscara com margem adicional e
  splash lavanda escura. Cache estático atualizado; fila offline preservada.
- Guia de branding, instruções para agentes e template de posts atualizados.
  Removidos do template os exemplos de promessas de 5/30 segundos.

## Verificação do segundo commit — histórico

- `npx tsc --noEmit -p .`: passou.
- `npm run build`: passou. First Load JS da landing 117 kB, agenda 119 kB,
  painel 119 kB e hábitos 119 kB, iguais ao baseline arredondado do Next.
- `npx tsx scripts/check-security.ts`: passou (serviços isolados).
- `git diff --check`: passou.
- Ícones do manifest conferidos: todos existem e têm as dimensões declaradas;
  exports sociais com 1080×1080. Avatar inspecionado visualmente.
- O primeiro checkpoint foi visto no Chrome, inclusive em 390×844. O acesso
  ao navegador ficou indisponível na retomada do segundo checkpoint, inclusive
  após nova tentativa solicitada pelo responsável. **A revisão visual final
  da LP escura e das telas em 320/390/430 px não foi concluída.** Não houve
  teste em iPhone físico/Safari instalado. Conferir agenda, troca de mês, eventos
  com título longo e campos Data/Início/Fim, teclado aberto e área segura.
- Os prints de `public/images/landing/` já usam B1, mas foram capturados antes
  da última revisão de sidebar/lavanda/agenda. Recapturar essas telas antes de
  usá-las como demonstração exata do novo layout em campanhas.
- Branch de trabalho; sem merge ou deploy em produção. Mudanças pré-existentes
  nos locks e documentos locais não fazem parte destes commits.

## Revisão final — 13/11/2026

Esta etapa conclui a revisão visual em Chrome que estava pendente acima.
B1, avatares aprovados e a direção lavanda/lima/verde foram preservados.

### Correções encontradas na revisão

- Landing em 320 px: removida a largura mínima implícita das grades de
  notificações/lançamento rápido; chips agora quebram linha. Ajustado contraste
  do indicador de gasto e do valor de renda do simulador.
- Tema do sistema: mudanças claro/escuro passam a atualizar a interface em
  tempo real. Movimento reduzido também cobre menus, sheets e elementos revelados.
- Agenda, Metas e Hábitos acompanham a área visível via `visualViewport`,
  compartilhando o hook já usado no lançamento rápido. Rodapé de Metas fica
  dentro da área disponível; modal de Hábitos permite rolar até Salvar.
- Drawer Mais rolável em telas baixas, com bloqueio do scroll de fundo e Escape.
- Hábitos: títulos e estatísticas legíveis, ações separadas no celular e seletor
  de ícones sem corte; preservadas as sete colunas de dias.
- Filtros de Finanças quebram linha; cabeçalho de Ajustes cabe em 320 px.
- `metadataBase` usa `APP_URL`, com fallback para o domínio público.
- Cache estático passou de v10 para v11. Cache de dados v7 e código da fila
  offline permanecem intactos. Zoom por gesto continua permitido.

### Testes efetivamente executados

- Build de produção local no Google Chrome headless, viewports 320, 390, 430,
  768 e 1440 px. Conta demo existente: senha atualizada com autorização explícita;
  sem executar seed, apagar/recriar conta ou modificar schema.
- Landing inteira nas cinco larguras: texto, preços, imagens (inclusive galeria
  com carregamento tardio), FAQ, destinos dos links, CTA e barra fixa mobile.
  Simulador no máximo: renda R$ 15.000 e 30%, resultado R$ 4.500/mês e
  R$ 54.000/ano. Login e cadastro abriram pelos links, sem cadastrar/comprar.
  Nenhuma imagem quebrada ou overflow horizontal da página. A galeria mantém
  sua rolagem horizontal intencional.
- Dez telas × cinco larguras × dois temas do sistema = 100 verificações:
  Agenda, Hábitos, Painel, Finanças, Cartões, Metas, Relatórios, Notas, Treino
  e Ajustes. Sem erros JavaScript, cabeçalhos cortados ou overflow da página.
- Navegação inferior e sidebar mantendo o shell; drawer Mais em 320×568,
  fechamento e restauração do scroll; preferência de movimento reduzido.
- Agenda: navegação de meses, título longo sintético, formulário novo e edição
  de evento demo existente, campos Data/Início/Fim. Formulários preenchidos
  e fechados sem gravar eventos/transações de teste na conta.
- Campos de data de Finanças, Metas e lançamento rápido; sete dias de Hábitos;
  rolagem dos modais e acesso aos botões inferiores em telas baixas.
- Regressão isolada com componentes reais: viewport visual simulada com altura
  390 e deslocamento 70, comprovando rodapé dentro da área visível. É simulação
  de geometria do teclado, não teste de teclado físico ou Safari.
- Troca de tema sem recarregar; auditoria automatizada **somente de contraste**
  da landing com axe, sem violações no resultado final.
- Avatares sob recorte circular e ícones maskable sob máscara circular com área
  segura de 80%, inspecionados visualmente. Dimensões dos ícones/shortcuts do
  manifest conferidas; favicon, Apple e OG preservados. Evidências em `validacao/`.
- Atualização do SW em contexto isolado: remove v10, cria v11 e preserva
  marcadores no cache de dados e na fila pendente. Regressões offline cobrem
  TTL de 48h, falhas, replay, IDs dependentes e isolamento por conta.

### Prints e reprodução

Os 12 WebPs de `public/images/landing/` foram recapturados da demo após os
ajustes: nove mobile 780×1688 (390×844 @2x) e três desktop 1600×1000. Fontes,
imagens e barras dos gráficos aguardam carregamento antes do screenshot.
O ranking global de Hábitos fica fora do recorte; não foram exportados dados
de outras contas. `og.jpg` permanece 1200×630.

- `scripts/capture-branding.mjs`: usa apenas origem local e login da demo existente;
  não executa seed. Executar com `node --env-file=.env scripts/capture-branding.mjs`
  contra o servidor local, com `DEMO_PASSWORD` configurado sem expor a senha.
- `scripts/check-mobile-layout.mjs`: após build, executar com Node; componentes
  reais com dados sintéticos, sem acesso ao banco.
- Ambos usam Chrome/Playwright. `PLAYWRIGHT_MODULE` pode apontar para uma
  instalação externa; nenhuma dependência foi adicionada ao bundle do app.
- Exemplos finais e matriz de resultados estão em [`validacao/README.md`](validacao/README.md).

### Verificação técnica final

Passaram: `npx tsc --noEmit -p .`, `npm run build`,
`npx tsx scripts/check-security.ts`, `git diff --check`,
`node scripts/check-mobile-layout.mjs` e `node scripts/check-offline.mjs`.
Lint não executado: configuração interativa existente.

| Rota | Baseline First Load JS | Final |
| --- | --- | --- |
| Landing | 117 kB | 117 kB |
| Agenda | 119 kB | 120 kB |
| Painel | 119 kB | 119 kB |
| Hábitos | 119 kB | 120 kB |

Valores arredondados pelo Next. Agenda e Hábitos cresceram 1 kB; nenhuma
biblioteca de animação foi adicionada.

### Limitações restantes

- Não houve Safari/iPhone físico, teclado nativo, instalação real do PWA ou
  verificação visual do splash instalado. O splash foi revisado no código;
  máscaras e atualização do SW foram testadas separadamente no Chrome.
- A validação responsiva não substitui teste de gestos/áreas seguras em aparelho.
- Relatórios foram capturados com seu fallback local de dados. A integração
  externa de IA retornou erro de modelo no ambiente; chamadas de IA e trackers
  externos foram bloqueados nas capturas finais. Não foi validada geração remota.
- Não foram efetuados pagamentos, disparos de mensagens ou publicações sociais.
- Trabalho restrito a `codex/rebranding-vynta`, sem merge na main ou deploy.
  Arquivos locais pré-existentes permanecem fora deste trabalho.

## Continuação — salário, movimento e personagem (13/11/2026)

### Resultado implementado

- Finanças, Painel e Relatórios usam resultado **mensal**. O saldo acumulado
  aparece separadamente, limitado à data atual no mês em andamento.
- Cada quinzena entra no cálculo a partir de sua data cadastrada. Entradas
  futuras ficam em `pendingIncome`, fora do resultado, tendência e análise
  avançada. Exemplo testado: R$ 1.000 na primeira quinzena, R$ 1.000 ainda
  previsto e R$ 500 de despesas resultam em R$ 500, não R$ 1.500.
- Despesas continuam incluindo os compromissos previstos no mês; a interface
  explica essa regra. Os valores seguem datas cadastradas, sem integração que
  confirme recebimentos bancários. A data de referência usa São Paulo para
  não antecipar o pagamento na virada do dia UTC.
- Reabrir e salvar salário preserva centavos. Modal acompanha a viewport
  visível e permite rolar até o rodapé. Remoção com falha não informa sucesso.
  A descrição de dia útil agora informa corretamente que feriados não são
  ajustados; a regra existente considera segunda a sexta.
- O vídeo do Biip enviado pelo responsável foi analisado: hover independente,
  destaque ativo que percorre a sidebar, recolhimento/expansão e entrada curta
  do conteúdo. Aplicação no Vynta em CSS, preservando B1 e o shell entre rotas.
  A barra inferior também desloca o destaque. Movimento reduzido desliga
  essas transições. Não houve acesso autenticado ao Biip pela extensão.
- Personagem derivado B1 em três poses: apontando, preocupado e celebrando.
  PNGs transparentes e WebPs de UI em `public/assets/mascot/`. O tutorial usa
  o personagem, com descrições e ações legíveis em mobile. Logo, avatares,
  favicon e ícones PWA aprovados não foram substituídos.
- Sete slides e dois stories renderizados, legenda e instruções em
  `marketing/instagram/rascunhos/nova-fase/`. Data ainda não escolhida; material
  pronto para revisão e publicação manual depois do deploy autorizado.
- Doze prints da landing recapturados após os ajustes, nas mesmas dimensões
  e formatos. Imagens/fontes/gráficos aguardados; somente dados demo.
- Cache estático v12 para os novos assets. Cache de dados v7 e fila offline
  preservados. Nenhuma alteração de schema ou recriação da demo nesta etapa.

### Validação desta continuação

- Passaram `npx tsc --noEmit -p .`, `npm run build`,
  `npx tsx scripts/check-security.ts` e `git diff --check`.
- `scripts/check-security.ts`: teste isolado de quinzenas antes/no dia de
  pagamento, dia útil, configuração tardia, virada UTC/Brasil, separação entre
  saldo mensal/acumulado e consistência dos gráficos/análise avançada.
  A leitura de transações continua única, sem consultas adicionais por mês.
- `node scripts/check-mobile-layout.mjs`: cinco larguras, temas, calendário,
  eventos longos, campos de data, drawer, sete dias de hábitos, modais/rodapés,
  viewport visual reduzida, sidebar recolhida/hover e centavos do salário.
- `node scripts/check-offline.mjs`: cache frio, rotas não visitadas, TTL,
  persistência da fila, falhas, replay e isolamento de contas passaram.
- Chrome com build de produção local: Finanças, Painel e Relatórios em
  320/390/430/768/1440 px, temas claro/escuro (30 combinações), sem overflow
  horizontal. Tutorial e Salário em 320×568, botões alcançáveis por rolagem.
- Dez trocas reais de rota em desktop/mobile, sem remontar o shell e sem
  erros JavaScript. Destaque alinhado ao item ativo e redução de movimento
  verificados. Tempos locais aquecidos de 56–239 ms entre clique e rota/título
  visíveis; não equivalem a uma medição de rede móvel/cold start em produção.
- Sete slides e dois stories inspecionados após o render; corrigidas
  sobreposições entre personagem/textos e afastados phones do rodapé.
  Arte final: 2160×2700; stories: 2160×3840.
- Evidências, vídeo e métricas em [`segunda-revisao/README.md`](segunda-revisao/README.md).

| Rota | Entrega anterior (789fb51) | Esta continuação |
| --- | --- | --- |
| Landing | 117 kB | 117 kB |
| Painel | 119 kB | 119 kB |
| Agenda | 120 kB | 120 kB |
| Hábitos | 120 kB | 120 kB |
| Finanças | 146 kB | 146 kB |
| Relatórios | 119 kB | 119 kB |

First Load JS arredondado pelo Next. Modal de salário carregado sob demanda;
removida a chamada desnecessária de câmbio na tela BRL. Sem nova biblioteca de
animação nem dependência de produção. Em relação ao baseline inicial, Agenda
e Hábitos mantêm o acréscimo de 1 kB documentado na primeira revisão.

### Limites da evidência

Safari/iPhone físico, teclado nativo, gestos e splash do PWA instalado continuam
sem teste em aparelho. Isso descreve o ambiente de teste disponível, não um
defeito confirmado aguardando autorização para correção. Chrome responsivo e
viewport visual simulada não foram apresentados como testes de iPhone.

Geração remota de insights não foi revalidada (limitação de integração já
registrada acima); capturas usam os relatórios locais. Não houve merge na main,
deploy, postagem, pagamento, e-mail ou push real. O novo personagem é uma
proposta de aplicação solicitada pelo responsável, sem substituir a identidade
aprovada. Arquivos pessoais e o stash preexistente continuam preservados.

## Refinamento mobile após aprovação (13/11/2026)

A pedido do responsável, a fluidez aprovada no desktop foi ampliada no mobile:
resposta ao toque, ícones ativos e + em lima, menu Mais com B1 e lavanda,
entrada/saída suaves, indicação da tela atual e skeletons alinhados ao branding
e ao layout real. O destaque inferior que já deslizava foi preservado.

As transições não atrasam a navegação. O feedback de espera usa o estado do
Next Link; os skeletons usam CSS. Sem biblioteca nova, transform no ancestral
dos modais ou alteração de zoom por gesto. Movimento reduzido desliga os
deslocamentos e mantém o sinal de carregamento estático.

Testes efetivamente executados: `npx tsc --noEmit -p .`, `npm run build`,
`npx tsx scripts/check-security.ts`, `node scripts/check-mobile-layout.mjs`,
`node scripts/check-offline.mjs` e `git diff --check`, todos aprovados.
Chrome com toque emulado: 320/390/430 px × claro/escuro, navegação/volta,
mesmo shell entre rotas, Mais ativo na Agenda, fechar/reabrir o menu,
passagem do menu ao lançamento rápido e restauração de rolagem. Sem overflow
horizontal ou erros JavaScript. Skeleton de Finanças também validado nas três
larguras e com movimento reduzido. A regressão isolada manteve cobertura de
calendário, campos, rodapés, sete dias de hábitos e desktop/tablet.

Vídeo de 390×844 e screenshots em [`mobile-motion/README.md`](mobile-motion/README.md).
Gravação do build de produção local, em velocidade real; não é iPhone físico,
Safari, teste de teclado nativo, instalação real do PWA ou benchmark de FPS.
Essas limitações de ambiente continuam explícitas.

First Load JS permaneceu igual à entrega 804351c: Landing 117 kB, Painel
119 kB, Agenda/Hábitos 120 kB, Finanças 146 kB e Relatórios 119 kB.
Doze prints recapturados nos formatos anteriores e artes renderizadas novamente
para refletir a barra inferior atual. Cache estático v13; dados v7 e fila
offline intactos. Nenhum merge na main, deploy ou publicação.

## Brotô, apresentação da nova fase e revisão editorial (13/11/2026)

O personagem aprovado recebeu o nome **Brotô**, aplicado ao anúncio, stories e
novo aviso no app. A apresentação usa o shell logado e carregamento separado,
com foco contido/restaurado, Escape, viewport visível e movimento reduzido.
Recibo durável por conta/edição na tabela Notification existente, chave única
para concorrência entre abas/aparelhos. Sem schema novo. Preview Vercel não
consome o recibo. A semântica é no máximo uma autorização: se a resposta se
perder depois da gravação, o aviso pode não aparecer; não repetirá por isso.
Detalhes e capturas em [broto-release/README.md](broto-release/README.md).

Validação executada: TypeScript, build, regressões isoladas de segurança,
mobile, offline e `git diff --check`, todos aprovados. O teste mobile/offline
usou `PLAYWRIGHT_MODULE` apontando para instalação externa; nenhuma dependência
foi adicionada ao app. Testes de recibo cobrem oito chamadas concorrentes,
contas independentes, falha de armazenamento, sessão, Origin, rate limit,
identidade derivada da sessão e preview sem consumir.

QA visual em Chrome com produção local e sessão demo: dez combinações
320/390/430/768/1440 × claro/escuro, sem overflow ou erro JS; botão acessível
em 320×568, Tab/Escape e reload; espera por diálogo/tutorial e retomada após
offline verificadas. Endpoint do aviso simulado, sem consumir
recibo de usuário real. Não foi teste de Safari/iPhone físico/teclado nativo
ou instalação PWA. Limites de ambiente continuam explícitos.

First Load JS igual à entrega f17a52e: landing 117 kB, Painel 119 kB,
Agenda/Hábitos 120 kB, Finanças 146 kB e Relatórios 119 kB. Cache estático v14;
dados v7 e fila offline preservados. Sem biblioteca de animação nova.

Auditoria do Zernio: sete agendados, 47 mídias conferidas contra os PNGs locais
(idênticas), legendas completas e dez registros publicados com métricas.
Pesquisa primária, fontes, limites da amostra e proposta de calendário em
`marketing/auditoria/2026-11-13/README.md`. Sete pacotes revisados: 37 artes de
feed e 14 stories, além dos sete slides e dois stories do lançamento com nome.
Fontes/imagens aguardadas no render e todos os previews inspecionados.
Guias de marketing, AGENTS e skill local atualizados para pesquisa verificável,
tom sem julgamento e aprendizado por métricas, sem regras de algoritmo inventadas.

Recomendação editorial: anúncio em 14/11 às 11h São Paulo, somente depois de
deploy autorizado e smoke test até 10h30; rolê sugerido para 21/11. Proposta
ainda não aplicada no Zernio. Nenhum merge, deploy, postagem, e-mail ou push
real; nenhuma recriação da demo. Arquivos pessoais e stash preservados.


## Aprovação e agendamento (14/11/2026)

Pesquisa e materiais aprovados. Template oficial em `marketing/templates/broto-social/`,
pacote completo versionado em `marketing/pacotes/`. Fontes significam arquivos
editáveis; tipografia Sora/Manrope é carregada no render. Gerador/render aceitam
pasta de lote e foram exercitados com exemplo separado (oito renders).

Zernio: sete feeds substituídos e quatorze stories agendados para 15–21/11,
um feed por dia. Anúncio transferido para domingo, 15/11, conforme “amanhã”
na instrução de 14/11. Rolê em sábado, 21/11; reset guardado. Verificados
status, conta, datas/fuso, legendas, tipo, ordem e 52 mídias por hash.
Stories automáticos não simulam stickers; versões manuais preservadas.
Calendário e IDs refletem o remoto. Sem publicação imediata, merge ou deploy.

PWA: nenhuma mudança adicional necessária. Ícones B1 versionados, identidade
manifest estável, cache v14 e fila preservada. Código do app atualiza após deploy;
ícone instalado pode depender de confirmação no Chrome ou nova adição no iOS.
Fontes e limitações em `PWA-ATUALIZACAO.md`. Não recomendar reinstalação geral.
Nenhuma alteração de app desde os testes aprovados de bdb2448 nesta etapa.
