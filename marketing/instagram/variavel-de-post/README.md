# Variável de post — template de carrossel @somosvynta

Esta pasta guarda a "variável" oficial dos posts: o template atualizado que todo
carrossel novo deve usar como base. O exemplo completo aplicado fica em
`../001-dia-25/` (8 slides + legenda.txt + slides.html — o contexto do primeiro
post, preservado para referência dos próximos).

## Rebranding de 13/11/2026

A identidade oficial agora é o broto B1. Leia `../../branding/README.md`.
O exemplo `001-dia-25` é histórico, não referência de marca atual.
Use fundo lavanda escuro #14121C, superfícies #211D2C, texto #F5F2FA,
lima #C8E88B e lavanda #ADA6CE,
com `public/assets/logo/broto-mark.png`. Não copiar glow azul/roxo.
Antes de publicar um PNG antigo, migrar o HTML e renderizar novamente.

## O que mudou nesta versão

- **Sem emoji nativo nos slides.** Emojis renderizam estilo Android na captura
  (e inconsistente entre aparelhos). Agora todos os ícones são **Lucide em SVG
  inline** — mesma linguagem visual do app. Paths novos em https://lucide.dev/icons
  (copiar os `<path>`/`<rect>`/`<circle>` e trocar `stroke`/`fill` pela cor).
- Na **legenda** (`legenda.txt`) o emoji continua valendo — quem renderiza é o
  próprio Instagram no celular do usuário.

## Regras fixas (resumo da skill instagram-vynta)

- 1080×1350 (4:5), 7–10 slides, slides 1–3 são capas independentes.
- Uma ideia por slide, 15–25 palavras, fonte grande.
- Produto só aparece depois da dor. Último slide: "manda pra quem" + segue
  @somosvynta + "7 dias grátis — link na bio".
- Dots de progresso no rodapé: slide N tem N pontos acesos.

## Arquétipos prontos no `template.html`

1. Capa/hook (dor ou contraintuitivo)
2. Lista em cards com ícone (suspeitos, erros, dicas)
3. Virada ("o problema não é X")
4. Produto (print do app na moldura de celular)
5. Checklist de benefícios
6. CTA final (send + follow + trial)

## Tela do app no slide de produto

Varie a tela conforme a mensagem — não use sempre `finances-mobile.webp`:
`dashboard`, `cards` (faturas), `goals` (metas), `habits` (sequência/rotina),
`calendar` (agenda/contas), `reports` (relatórios), `notes`, `workout` —
todas em `public/images/landing/*-mobile.webp`. Varie também o layout:
phone à esquerda (texto à direita), inclinado (`transform: rotate`), ou
centralizado emergindo por baixo da dobra.

## Stories

Cada pasta de dia tem `story/stories.html` (fonte) renderizado em
`story/story-NN.png` — 1080×1920 (9:16) → PNG 2160×3840. Dois formatos:
texto+hook com pill "responde na enquete ↓" (o sticker nativo vai embaixo)
e repost com `../slide-01.png` embutido como preview do post.

## Renderizar

```bash
# na raiz do repo — renderiza slides E stories da pasta:
marketing/instagram/render.sh <pasta-do-post>
# slides: viewport 1080x1350 dsf 2 → PNG 2160x2700
# stories: viewport 1080x1920 dsf 2 → PNG 2160x3840
```

Detalhes completos em `.devin/skills/instagram-vynta/SKILL.md`.
