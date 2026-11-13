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

## Verificação e limites

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
