# Revisão da semana — fontes e artes prontas para aprovação

Sete posts revisados e quatorze stories. **Nenhuma substituição no Zernio foi
executada.** Os lotes originais continuam preservados nas pastas anteriores.
IDs e datas propostas em `posts.json`; análise em
`../../auditoria/2026-11-13/README.md`.

![Capas revisadas](capas.jpg)

| Pasta | Proposta São Paulo | Feed | Situação remota |
| --- | --- | --- | --- |
| 15-reset-domingo | 15/11 18h30 | 6 slides | Original antigo agendado |
| 16-planilha-abandonada | 16/11 12h | 6 slides | Original antigo agendado |
| 17-decimo-terceiro | 17/11 12h30 | 6 slides | Original antigo agendado |
| 18-organizar-mes | 18/11 19h | 6 slides | Original antigo agendado |
| 19-gta6-dia-d | 19/11 10h | Imagem única | Original antigo agendado |
| 20-black-friday-d7 | 20/11 11h | 6 slides | Original antigo agendado |
| 21-role-40-reais | 21/11 11h | 6 slides | Original ainda agendado em 14/11 |

O anúncio do Brotô é o pacote separado `../rascunhos/nova-fase/`, sugerido para
14/11 às 11h, condicionado a deploy autorizado e smoke test até 10h30.

Cada pasta: `slides.html`, `legenda.txt`, `preview.jpg`, PNGs locais e `story/`
com fontes, preview, PNGs e roteiro de stickers/horários. Os PNGs de alta resolução
são regeneráveis e ficam fora do Git neste lote. Previews não são mídias de postagem.

Regenerar na raiz do repo:

```sh
node scripts/build-social-revision.mjs
node scripts/render-social-revision.mjs
```

O render usa Chrome/Playwright; `PLAYWRIGHT_MODULE` aceita instalação externa.
Espera Sora/Manrope e todas as imagens, verifica texto dentro do canvas e gera
`render-check.json`. Feed: 2160×2700; story: 2160×3840. Não publica nada.
Alterar `posts.json` antes de regenerar; os HTMLs são derivados.

GTA: reconferir a Rockstar em 18 e 19/11. `fallback-legenda.txt` retira data/preço
e mantém o tema lazer; a arte já não afirma que o jogo foi lançado. Se a pauta
perder sentido, adiar em vez de forçar. Não há parceria com a Rockstar.

Stories não estão agendados. As áreas tracejadas indicam stickers nativos a
adicionar no Instagram. Publicar o story de repost somente após o feed correspondente.
