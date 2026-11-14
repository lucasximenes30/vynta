# Template oficial — Brotô social

**Aprovado por Lucas em 14/11/2026.** Usar como ponto de partida em novos posts.
Não voltar ao neon nem ao lote histórico `001-dia-25`. O template oferece uma
base consistente; cada novo assunto ainda exige pesquisa, copy e revisão visual.

## O que significa “fontes” no pacote

São os **arquivos editáveis**: HTML/CSS, JSON de conteúdo e scripts de geração.
Os PNGs são as artes prontas. A tipografia é Sora/Manrope, carregada pelo Google
Fonts no render; o pacote não instala fontes no computador nem muda o app.
Matrizes aprovadas da marca e prints demo ficam em `public/` e acompanham o ZIP.

## Arquivos de referência

- `template.html`: exemplo aprovado, com seis composições (capa, destaque,
  lista, Brotô orientando, tela real e encerramento). Os textos são um exemplo,
  não copy para repetir em todos os posts.
- `post.example.json`: estrutura para um novo lote; editar conteúdo e datas.
- `../../instagram/revisao-2026-11/`: variações aprovadas de capa, poses e telas.
- `../../instagram/15-nova-fase/`: lançamento aprovado e apresentação do Brotô.
- `../../pacotes/vynta-broto-social-2026-11.zip`: artes e fontes para transportar.

## Fluxo para novos lotes

1. Ler `marketing/AGENTS.md`, branding e skill instagram-vynta. Pesquisar fatos e
   tendências atuais; não herdar datas, preços ou conclusões de um post anterior.
2. Criar pasta de lote em `marketing/instagram/` e copiar `post.example.json` como
   `posts.json`. Preencher o brief, pauta, data/fuso, copy e fontes. Não copiar IDs
   do Zernio: cada publicação nova tem sua própria identidade.
3. Gerar e renderizar, na raiz do repo:

```sh
node scripts/build-social-revision.mjs marketing/instagram/SEU-LOTE
node scripts/render-social-revision.mjs marketing/instagram/SEU-LOTE
```

Chrome/Playwright precisam estar disponíveis. `PLAYWRIGHT_MODULE` pode apontar
para instalação externa; não adicionar dependências ao app para gerar posts.
Sem argumento, esses scripts regeneram o lote histórico de revisão: **sempre
passar a pasta nova quando criando outro lote**.

4. `coverVariant` seleciona uma composição independente do dia: 15 (agenda),
   16 (tipografia), 17 (13º, só usar nesse assunto), 18 (finanças), 19 (Brotô),
   20 (27/NOV, só usar em contexto compatível), 21 (recibo/rolê). Para outra
   pauta, editar a composição no HTML ou adaptar o gerador — não reutilizar
   datas desenhadas sem revisar. `emphasis` controla texto/tamanho do destaque.
5. Revisar todas as artes em tamanho real e mobile, fontes carregadas, imagens,
   fatos, contas, recortes, contraste e chamadas. Não prometer “perfeição automática”.
6. Produzir legenda e stories. Separar a versão manual (sticker nativo) da
   automática (`story/automaticos/`, sem pedir clique em sticker inexistente).
   API de Stories aceita uma mídia por post; legenda não é exibida.
7. Publicar/agendar apenas no escopo autorizado. Relistar no Zernio e conferir
   status, horário com fuso, conta, ordem e URLs das mídias. Atualizar calendário.

## Identidade

B1 é a logo; Brotô é o guia. Não redesenhar, espelhar ou substituir avatares.
Lavanda #14121C, lima #C8E88B e verde; creme como apoio. Variar as telas demo,
dar espaço ao texto e usar o personagem quando ele ajuda a contar a história.
Arquivos PNG finais: feed 2160×2700, stories 2160×3840. Previews JPG não são
as mídias de postagem.
