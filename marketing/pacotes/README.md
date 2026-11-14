# Pacote portátil aprovado

`vynta-broto-social-2026-11.zip` reúne artes PNG prontas, fontes editáveis
HTML/CSS/JSON, legendas, stories manuais/automáticos, templates, guias, calendário,
scripts e assets de marca/demo necessários para renderizar em outro computador.

Não contém `.env`, credenciais, dados pessoais, backup do banco ou dependências
do aplicativo. “Fontes” aqui significa código editável; Sora e Manrope são
carregadas no render pelo Google Fonts, não instaladas pelo pacote.

O ZIP está versionado para acompanhar `git pull`. Descompactar mantendo a
estrutura de diretórios; os HTMLs referenciam `/public/...` a partir da raiz.
Guia de criação: `../templates/broto-social/README.md`.
Regenerar o pacote: `python scripts/package-social.py` na raiz do repo.
Não agendar o conteúdo novamente só porque ele está no ZIP: consultar calendário
e IDs remotos antes de qualquer ação para evitar duplicatas.
