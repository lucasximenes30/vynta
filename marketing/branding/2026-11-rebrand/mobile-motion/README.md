# Movimento mobile — 13/11/2026

`navegacao-mobile.mp4` mostra a versão local de produção em Chrome, com viewport
390×844, emulação de toque e conta demo existente. Inclui Painel, Finanças,
Hábitos, Agenda, menu Mais, lançamento rápido e volta pelo histórico.
Vídeo em velocidade real, sem acelerar as transições ou simular teclado.
Não é uma gravação de iPhone físico ou de instalação real do PWA.

## O que mudou

- Barra inferior com destaque deslizante já existente, agora com resposta ao
  toque, ícone ativo levemente elevado, rótulos mais legíveis e ação + em lima
  no escuro. Mais fica ativo nas telas acessadas pelo menu.
- Menu Mais com B1, lavanda/verde/lima, indicação da tela atual e abertura de
  280 ms. Fechamento em 180 ms por X, fundo, Escape ou seleção de uma tela.
  Ações que abrem outro modal passam o controle imediatamente, preservando
  o foco do teclado e o bloqueio da rolagem.
- Lançamento rápido com entrada de 280 ms no mobile. Nenhuma mudança nos
  dados, submissões, fila offline ou geometria de teclado.
- Um pequeno sinal no link acompanha o estado real de navegação do Next,
  com atraso visual de 120 ms para evitar flashes em rotas prontas. Não há
  espera artificial para concluir a animação.
- Skeletons com marca e paleta atuais; Finanças agora antecipa o cartão de
  resultado em vez de quatro cartões que não correspondiam à tela final.
  Linha indeterminada de carregamento, sem porcentagem fictícia.
- Movimento reduzido mantém o feedback estático e fecha o menu imediatamente.
  Não foi aplicado transform no contêiner das páginas, para preservar modais
  fixos e a relação com a viewport.

## Evidências

- `menu-{320,390,430}-{light,dark}.png`: seis combinações de largura/tema.
- `agenda-390.png`: tela e barra inferior; `lancamento-390.png`: sheet.
- `carregamento-390-fixture.png`: componente real PageSkeleton em teste isolado,
  com fonte de sistema e dados sintéticos; não é medição de espera de rede.
- `resultado.json`: verificações de toque, histórico, shell persistente,
  scroll lock, redução de movimento e ausência de overflow/erros JavaScript.

Passaram typecheck, build, segurança/relatórios, regressões mobile e offline,
além de `git diff --check`. Os testes mobile cobrem também 768 e 1440 px para
regressões de layout. Nenhum formulário real foi enviado na gravação.

First Load JS igual à entrega 804351c: Landing 117 kB; Painel 119 kB;
Agenda/Hábitos 120 kB; Finanças 146 kB; Relatórios 119 kB (Next arredondado).
Vídeo não é benchmark de FPS em aparelho. Nenhuma biblioteca adicionada.

Prints da landing recapturados nas dimensões existentes e artes do lançamento
renderizadas novamente com a barra atual. Cache estático v13; cache de dados
v7 e fila offline preservados. Sem merge, deploy ou publicação social.
