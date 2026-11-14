# Segunda revisão — 13/11/2026

Evidências do build local da branch `codex/rebranding-vynta`, com a conta demo
existente. Chrome desktop automatizado; não são capturas de iPhone/Safari.

- `navegacao-desktop.mp4`: hover independente, troca de telas, destaque ativo
  deslizante e recolhimento/expansão da sidebar, mantendo o shell do app.
- `sidebar-desktop.png`: resultado em 1440×900.
- `tutorial-mobile.png`: personagem no tutorial, 390×844.
- `tutorial-320-rodape.png`: tutorial após rolar até as ações, 320×568.
- `salario-320-rodape.png`: configuração de salário e botões em 320×568.
- `financas-mobile-claro.png`: resultado mensal no tema claro, 390×844.
- `relatorios-mobile.png`: relatório no tema escuro, 390×844.
- `navegacao-local.json`: dez medições entre clique e rota/cabeçalho visíveis.

As medições de 56–239 ms são de navegação local com servidor aquecido e cache/
prefetch do Next. Não representam cold start, rede móvel ou promessa de tempo
em produção. As animações de 180–280 ms podem terminar depois desse marco.
O teste confirmou a mesma instância do shell e nenhum erro JavaScript.

A referência foi o vídeo do Biip enviado pelo responsável. Não foi possível
abrir a sessão pessoal via extensão nesta conversa. O vídeo e suas extrações
permanecem locais e não fazem parte das evidências versionadas.

Os 12 prints de landing foram recapturados em `public/images/landing/`;
o carrossel completo fica em `marketing/instagram/rascunhos/nova-fase/`.
O PNG do tutorial em 320 px mostra rolagem intencional do conteúdo, com ações
acessíveis; não simula a presença de teclado nativo.
