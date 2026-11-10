# Variável de post — template de carrossel @somosvynta

Esta pasta guarda a "variável" oficial dos posts: o template atualizado que todo
carrossel novo deve usar como base. O exemplo completo aplicado fica em
`../001-dia-25/` (8 slides + legenda.txt + slides.html — o contexto do primeiro
post, preservado para referência dos próximos).

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

## Renderizar

```bash
# na raiz do repo:
python3 -m http.server 8787
# Puppeteer: viewport 1080x1350 deviceScaleFactor=2, screenshot de cada .slide
# resultado: PNG 2160x2700 (Instagram aceita e faz downscale — sai nítido)
```

Detalhes completos em `.devin/skills/instagram-vynta/SKILL.md`.
