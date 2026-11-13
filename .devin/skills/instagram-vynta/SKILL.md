---
name: instagram-vynta
description: Social media do Vynta — cria posts virais de Instagram (carrossel, legenda, hashtags) em PT-BR para crescer @somosvynta no orgânico e converter em trial. Baseado em dados do algoritmo de 2025 e na voz do cliente.
argument-hint: "[tema/ideia do post ou 'novo carrossel']"
triggers:
  - user
  - model
---

# Instagram do Vynta (@somosvynta)

Use esta skill sempre que for criar conteúdo para o Instagram do Vynta. O objetivo do perfil é: **crescer alcance com conteúdo compartilhável/salvável → transformar seguidor em trial de 7 dias** (link na bio → landing → cadastro). Combine com a skill `copy-conversao` para tom e regras de copy.

## 1. O que o algoritmo premia (Mosseri, jan/2025)

Os 3 sinais de ranking, nessa ordem de atenção: **watch time**, **likes por alcance**, **sends por alcance**.

- **Sends (envios por DM) é o sinal que mais impulsiona alcance para não-seguidores** (unconnected reach). O post ideal é o que a pessoa "manda pra um amigo": identificação forte ("sou eu"), utilidade que vira favor, ou humor compartilhável.
- **Likes pesam mais para seguidores** (connected reach) — posts que geram "é eu!" ganham like fácil.
- **Saves** indicam utilidade; carrossel é o formato mais salvo do Instagram (posts de 5–7 slides geram ~3,4x mais saves que imagem única).
- Para recomendação: sem marca d'água de outro app, conteúdo original, e **use áudio em alta até em carrossel** (o post concorre a aparecer em superfícies de vídeo).
- Comentários: pergunta simples de responder na legenda ("qual foi o gasto invisível do seu mês?").

## 2. Carrossel — regras de ouro

- **Tamanho: 1080×1350px (4:5)** — ocupa mais tela que quadrado. Todos os slides são cortados no formato do 1º; mantenha todos iguais.
- **7–10 slides** é a faixa com melhor desempenho (~17% acima da média do perfil). Máx. 20.
- **Slide 1 = só gancho.** Um trabalho: parar o scroll e gerar o arraste. Não ensina, não apresenta.
- **Slide 2 também é capa:** o Instagram reexibe o carrossel começando pelo slide 2 para quem rolou sem engajar. Slides 1–3 precisam funcionar como primeira impressão, cada um com seu próprio gancho (ângulos diferentes do mesmo tema, não repetição).
- **Uma ideia por slide, 15–25 palavras no máximo.** Fonte grande, alto contraste, espaçamento generoso. Não é PowerPoint.
- Progressão narrativa: cada slide entrega e promete o próximo ("spoiler", "mas tem um porém", "a solução não é a que você pensa").
- **Último slide = CTA com 3 elementos:** (1) pedido de compartilhamento/salvar ("Manda pra quem vive no vermelho no fim do mês"), (2) "Segue @somosvynta" + ícone do Instagram, (3) oferta do produto ("Testa 7 dias grátis — link na bio"). A ordem importa: send primeiro, porque é o sinal de alcance.
- Indicador de continuação no slide 1 ("arrasta →") e progressão (números/pontos) ajudam.

## 3. Pilares de conteúdo do Vynta

Alterne entre eles (volume game: 30–100 posts até achar o formato vencedor; reaproveite os que performam em novos ângulos/hooks):

1. **Identificação/dor** (maior potencial de send): "dia 25 e o salário sumiu", gastos invisíveis (cafezinho, Uber, assinatura esquecida), "faço de cabeça", planilha abandonada, fatura que assusta.
2. **Lista salvável**: "7 gastos invisíveis que comem seu salário", "5 coisas pra anotar hoje e nunca mais ser pego pela fatura".
3. **Mito vs verdade / contrarian**: "Você não gasta demais — você só não vê os gastos", "Planilha não falha por disciplina".
4. **Como eu organizo meu mês** (tutorial com telas do app): lançamento rápido, aviso de fatura, salário por dia útil.
5. **POV/humor/meme**: situações de quem vive no limite — "POV: você conferindo o extrato no dia 28".
6. **Bastidores/founder** (conexão humana): por que o Vynta existe, decisões de produto, novidades.

Formato vencedor para SaaS (top of funnel): **dor → agitação → virada → produto como resposta → resultado → CTA**. Não nomeie o produto nos 2 primeiros slides — primeiro a pessoa precisa se reconhecer na dor.

## 4. Copy dos slides

- Voz do cliente (nunca jargão): "pra onde foi o dinheiro", "faço de cabeça", "planilha que eu abandonei", "a fatura chega e assusta", "o Uber só dessa vez", "a assinatura que você nem usa".
- Frases curtas, ordem direta, "você". Uma piada leve por post, no máximo.
- Números concretos e específicos ("47 gastos pequenos", "R$ 12 de cafezinho") — mas **nunca invente estatística nem depoimento**. Dados externos só com fonte nomeada (ex.: CNDL/SPC, Datafolha/Planejar) e checável.
- Proibido prometer: Open Finance/conexão bancária, app na loja, economia garantida em R$, número de usuários.
- Fatos do produto: confira `lib/plans.ts` e a seção 7 da skill `copy-conversao` (7 dias grátis, sem cartão/CPF, lançamento rápido, push de fatura, hábitos+agenda+treinos no mesmo app, PWA).

## 5. Legenda (arquivo separado `legenda.txt`)

Estrutura:
1. **Linha 1 = gancho** (só ~125 chars aparecem antes do "ver mais") — repete o hook do slide 1 com palavras buscáveis.
2. 3–5 linhas que **complementam** o carrossel (não repetem) e dão motivo pra arrastar.
3. **Pergunta fácil de responder** → comentários ("Qual gasto invisível mais te pegou esse mês?").
4. CTA único: "Testa 7 dias grátis — link na bio" (e "segue @somosvynta" se couber natural).
5. **5–8 hashtags de nicho** na própria legenda (não no comentário): mistura de médias do nicho + específicas. Banco base: `#financaspessoais #controlefinanceiro #organizacaofinanceira #vidaorganizada #appdefinancas #dinheiro #salario #somosvynta`. Não usar hashtags genéricas gigantes (#sucesso #brasil).

## 6. Identidade visual dos slides

Gerar slides em HTML/CSS e exportar PNG 1080×1350 (deviceScaleFactor 2 → 2160×2700).
**Rebranding aprovado em 13/11/2026:** ler `marketing/branding/README.md` antes de
produzir qualquer arte. O broto B1 substitui o símbolo de camadas azul/roxo.

- Fundo lavanda escuro `#14121C`; superfícies `#211D2C`; texto `#F5F2FA`.
- Destaque lima `#C8E88B`; apoio lavanda `#ADA6CE`. Sem glow azul e grid neon como padrão.
- Tipografia: Sora nos títulos, Manrope no corpo. Espaço e contraste generosos.
- Logo: `public/assets/logo/broto-mark.png`. Personagem: `public/assets/logo/mascot.webp`.
  Preservar fundo, cores, proporção, orientação e as duas folhas. Não inventar variantes.
- Prints: somente os atualizados em `public/images/landing/`, em moldura de celular.
- Rodapé: `@somosvynta` + progressão de slides, nas cores atuais.
- Pastas e PNGs anteriores são arquivo histórico; não são referência visual vigente.
- Ícone do Instagram no slide de CTA: desenhar em SVG inline (quadrado arredondado + círculo + ponto), gradiente ou branco; não usar imagem externa.
- **NUNCA emoji nativo nos slides** — renderiza estilo Android na captura e inconsistente entre aparelhos. Ícones sempre **Lucide em SVG inline** (paths em https://lucide.dev/icons), dentro de `.icbox` (container arredondado translúcido) ou `.icline` (inline no texto). Emojis só na legenda.txt — quem renderiza é o Instagram.
- Base dos slides: `marketing/instagram/variavel-de-post/template.html` (arquétipos prontos: capa, lista em cards, virada, produto, checklist, CTA). Exemplo aplicado: `marketing/instagram/001-dia-25/slides.html`.

## 7. Workflow de produção

1. Definir tema + formato (dor / lista / mito / tutorial / POV).
2. Escrever os slides (texto final, 15–25 palavras) e revisar com o checklist.
3. Montar `slides.html` na pasta do post `marketing/instagram/DD-slug/` seguindo a seção 6.
4. Renderizar PNGs: servir a pasta por HTTP local e capturar cada slide via Puppeteer/Chromium com viewport 1080×1350 dsf=2 (`scripts/` ou script ad-hoc em /tmp — ver `marketing/instagram/` por exemplos de posts anteriores).
5. Revisar os PNGs em 1080×1350 real (zoom mobile): texto legível sem esforço, sem quebra feia, nada cortado.
6. Escrever `legenda.txt` na mesma pasta (linha 1 hook + corpo + pergunta + CTA + hashtags), pronta pra copiar e colar.
7. Entregar: pasta com `slide-01.png … slide-NN.png` + `legenda.txt` (+ `slides.html` fonte pra reaproveitar).

## 8. Checklist antes de entregar

- [ ] Slide 1 para o scroll sozinho? Slides 1–3 funcionam como capas independentes?
- [ ] 7–10 slides, uma ideia por slide, ≤25 palavras por slide?
- [ ] O produto só aparece depois que a pessoa se reconheceu na dor?
- [ ] Último slide pede envio/save + "segue @somosvynta" + trial na bio?
- [ ] Alguma estatística ou depoimento inventado? (remover ou citar fonte)
- [ ] Legenda com hook nos primeiros 125 chars, pergunta e 5–8 hashtags de nicho?
- [ ] PNGs 1080×1350, texto legível a 100% no celular, identidade atual do broto Vynta?
- [ ] Sugestão de horário ao usuário: manhã (9h–11h) ou início da noite; lembrar de adicionar áudio ao postar.
