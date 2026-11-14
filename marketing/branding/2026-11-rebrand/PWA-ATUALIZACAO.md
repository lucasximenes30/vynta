# Atualização do PWA e dos ícones — 14/11/2026

O `git pull` atualiza o checkout. Só um deploy disponibiliza a versão aos usuários.
O aplicativo instalado recebe código/conteúdo novos ao carregar a versão online;
não precisa ser reinstalado para usar as telas novas. Uma sessão já aberta pode
precisar ser reaberta/recarregada. Isso é diferente do ícone guardado pelo sistema.

## Conferência do projeto

- Manifest aponta para `broto-v2-icon-*`, com URLs diferentes da identidade antiga.
- `id: /dashboard`, start_url e scope permanecem estáveis em relação à main;
  não foi criada uma identidade de instalação nova.
- `app/icon.png` e `app/apple-icon.png` já contêm B1. Next gera as referências.
- Service worker: cache estático v14, cache de dados v7; fila offline separada
  preservada. A atualização não limpa os lançamentos pendentes.
- Nenhuma alteração adicional no código do PWA foi necessária nesta etapa.

## O que se pode afirmar

- Chrome/Android com WebAPK pode atualizar o ícone da instalação. Mudanças de
  identidade podem exigir confirmação do usuário. Desde Chrome 144, a URL ou
  metadados de icons precisam mudar para disparar a atualização — já atendido.
  Não prometer atualização instantânea ou silenciosa em todos os aparelhos.
- Safari/iPhone/iPad: o ícone já adicionado pode permanecer antigo. Para trocar
  os metadados da instalação, pode ser necessário adicionar o app novamente pela
  tela inicial. Isso não é requisito para usar a interface nova.
- Não recomendar reinstalação geral nem limpeza de dados/cache. Antes de remover
  uma instalação para trocar o ícone, sincronizar/conferir lançamentos offline.
  Dados sincronizados da conta continuam no servidor; armazenamento local é outra coisa.

Fontes primárias consultadas em 14/11/2026:
[Chrome — mudanças de atualização desde 144](https://developer.chrome.com/blog/improvements-to-web-app-updates),
[web.dev — atualização de assets e metadados](https://web.dev/learn/pwa/update),
[WebKit — precedência de apple-touch-icon](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
O guia geral do web.dev é de 2022; detalhes atuais do Chrome seguem o artigo de
2026. Não houve validação física de iPhone/Safari nesta entrega.
