# Evidências da revisão final

Capturas do build local no Chrome, em 13/11/2026. Telas autenticadas usam
somente a conta demo. As imagens não representam Safari ou PWA instalado.

| Evidência | Escopo |
| --- | --- |
| [Landing desktop](landing-1440-hero.png) | Primeira dobra em 1440 px |
| [Landing mobile](landing-390-hero.png) | Primeira dobra em 390 px |
| [Simulador](landing-320-simulator.png) | Maior valor em 320 px |
| [Agenda escura](calendar-320-dark-final.png) | Calendário e cabeçalho em 320 px |
| [Agenda clara](calendar-320-light-final.png) | Mesmo layout no tema claro |
| [Novo evento](calendar-modal-320-final.png) | Data, início, fim e rodapé em 320×568 |
| [Hábitos: rodapé](habit-modal-footer-final.png) | Botão alcançável após rolar o modal |
| [Avatares e máscaras](brand-masks.png) | Recorte circular e área segura dos ícones |

[Matriz do app](final-matrix.json): 100 combinações de rota, largura e tema,
com medidas de viewport/cabeçalho/campos e lista de erros JavaScript.
[Resultados da landing](landing-results.json): cinco larguras, imagens, links
e ausência de overflow da página. A galeria possui scroll horizontal próprio.

Os 12 screenshots de produto em formato final estão em
[`public/images/landing/`](../../../../public/images/landing/).
Procedimentos, verificações e limitações em [IMPLEMENTACAO.md](../IMPLEMENTACAO.md).
