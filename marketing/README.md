# Marketing — @somosvynta (guia para agentes/IA)

**Rebranding de 13/11/2026:** o Vynta agora usa o **broto lima (B1)**.
Leia primeiro [branding/README.md](branding/README.md): identidade oficial para
Instagram, TikTok, stories e toda comunicação. O símbolo de camadas azul/roxo e
o visual neon anterior foram aposentados para novos materiais.

Sistema de produção de conteúdo do Instagram da **Vynta** (app de organização de
vida + finanças — finanças, cartões/faturas, metas, hábitos, agenda, notas,
treino, relatórios com IA, PWA offline). Conta: **@somosvynta**. Objetivo de
conversão: link na bio → cadastro → **trial de 7 dias** (sem cartão, sem CPF,
sem cobrança automática).

## ⚠️ Dependência externa (leia antes de zipar/mover)

Os HTMLs referenciam imagens que ficam **na raiz do repo, fora desta pasta**:

- `public/images/landing/*-mobile.webp` — prints do app (finances, dashboard,
  cards, goals, habits, calendar, reports, notes, workout)
- `public/assets/logo/broto-mark.png` — logo; `mascot.webp` — personagem

Para renderizar em outro PC, leve junto essas duas pastas (ou o repo inteiro)
mantendo a estrutura `<raiz>/public/...` + `<raiz>/marketing/...`. Editar
HTML/legenda não exige os assets; só o render exige.

## Estrutura

```
marketing/
└── instagram/
    ├── CALENDARIO.md            # agenda do lote: data, tema, formato, horários
    ├── render.sh                # renderiza slides + stories de uma pasta
    ├── variavel-de-post/
    │   ├── template.html        # template base dos carrosséis
    │   └── README.md            # regras visuais detalhadas
    └── DD-slug/                 # uma pasta por DIA DO MÊS de publicação
        ├── slides.html          # fonte do carrossel/imagem
        ├── slide-NN.png         # render 2160×2700 (4:5)
        ├── legenda.txt          # legenda pronta pra colar
        └── story/
            ├── stories.html     # fonte dos stories
            ├── story-NN.png     # render 2160×3840 (9:16)
            └── plano.md         # horários + stickers nativos a adicionar
```

- `DD` = dia do mês em que vai ao ar (não ordem de criação). Pastas `NNN-slug`
  (001–003) são a numeração antiga.
- Dia de post no feed: uma pasta = um post (carrossel 7–10 slides OU imagem
  única quando fizer mais sentido, ex.: hype/tendência).
- Stories: ao menos 1–2 por dia. `story-01` é manhã (hook + enquete),
  `story-02` é noite (repost com `../slide-01.png` embutido + interação).
  O sticker nativo (enquete/caixinha/link) é adicionado no app em cima do pill
  "responde na enquete ↓" que marca a posição — `plano.md` diz qual sticker,
  pergunta e opções.

## Identidade visual (não negociável)

- Canvas: `1080×1350` CSS nos posts, `1080×1920` nos stories; render @2x.
- Fundo lavanda escuro `#14121C`, superfícies `#211D2C`, títulos `#F5F2FA`, destaque lima
  `#C8E88B`, apoio lavanda `#ADA6CE`. Sem glow azul/roxo ou grid como padrão.
- Símbolo oficial: broto B1. Não recolorir, espelhar ou recriar o personagem.
  Guia completo e arquivos oficiais em `branding/README.md`.
- Fontes: **Sora** (títulos) + **Manrope** (corpo), via Google Fonts.
- **NUNCA emoji nativo na arte** — ícones = Lucide em SVG inline
  (`<svg viewBox="0 0 24 24">`, paths de lucide.dev/icons). Emoji só em
  `legenda.txt` e nos textos dos stickers (o IG renderiza).
- Prints do app sempre dentro da moldura `.phone` (border-radius 56px,
  border 10px `#1a1c22`, outline + box-shadow grande).
- Rodapé dos slides: `@somosvynta` + dots de progresso (slide N = N dots
  acesos — recorte o último `<i>` sem `class="on"`).
- Cada `slides.html`/`stories.html` termina com o script que mostra só a
  seção `?slide=N` — mantenha-o.

## Regras editoriais

- Carrossel 7–10 slides; slides 1–3 funcionam como capas independentes;
  uma ideia por slide; produto só aparece depois da dor; último slide =
  "manda pra quem" + segue @somosvynta + "7 dias grátis — link na bio".
- **Telas do app:** varie — escolha a que bate com a mensagem do slide
  (fatura→cards, metas→goals, hábito→habits, agenda→calendar, visão
  geral→dashboard…) e alterne o layout (phone esq./dir., `rotate`, central
  emergindo por baixo). Não repita a mesma tela em todo post.
- **Legenda:** hook na 1ª linha (aparece antes do "...mais"), corpo curto,
  pergunta simples pra comentário, CTA de trial, 5–8 hashtags de nicho.
- **Horários padrão:** feed fds/feriado 10h–11h, úteis ~12h ou 19h, domingo
  18h30+; stories ~9h–12h (puxa assunto) e ~19h–20h30 (repost+interação).
  Sempre adicionar áudio em alta ao publicar (inclusive em carrossel).
- **Tendências:** mínimo 1 por semana (feriados, lançamentos, datas de
  dinheiro tipo 13º/BF). Verificar datas reais antes de escrever.
- **Fatos do produto:** só o que existe no app (lista acima). Nunca inventar
  depoimentos, % de usuários ou valores de economia.
- Regras completas do algoritmo/copy: `.devin/skills/instagram-vynta/SKILL.md`
  e `.devin/skills/copy-conversao/SKILL.md` (ficam no repo, fora desta pasta).

## Workflow para produzir um dia novo

1. Escolher gancho/tema (ver `CALENDARIO.md` pra continuidade do arco).
2. Usar o template atualizado; ao copiar uma pasta antiga, migrar logo, paleta
   e prints conforme `branding/README.md` antes de renomear `DD-novo-slug`.
3. Reescrever `slides.html` (CSS da identidade atual), `legenda.txt`,
   `story/stories.html` e `story/plano.md`.
4. `marketing/instagram/render.sh DD-novo-slug`
   (sobe `python3 -m http.server 8787` na raiz do repo se preciso; usa
   Chrome headless — `google-chrome` no PATH, ou `CHROME=<bin>`).
5. Revisar os PNGs em tamanho real; atualizar `CALENDARIO.md`.

## Backlog registrado

- Destaques do perfil (capas na identidade — "Gastos invisíveis",
  "Desafio 7 dias", "Como funciona", "Memes") — ainda não feito.
- Semana 21–27/11: arco Black Friday (aquecimento → lista → dia D 27/11).
- 30/11: 13º caindo (gancho "caiu o 13º").
