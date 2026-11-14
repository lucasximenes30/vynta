# Identidade Vynta — Broto

**Identidade aprovada em 13/11/2026: B1 (broto lima).** Esta é a referência visual
para landing, app, Instagram, TikTok, stories, e-mails e próximos materiais.
O símbolo anterior de camadas azul/roxo foi aposentado. Não reutilizar a identidade
antiga ao copiar uma pasta de post. O nome continua **Vynta**, perfil **@somosvynta**.

## Arquivos oficiais

- `public/assets/logo/broto-mark.png`: símbolo compacto para assinaturas.
- `public/assets/logo/mascot.webp`: personagem para destaque na landing e nas artes.
- `public/assets/logo/mascot-original.png`: matriz aprovada, 1254×1254.
- `public/assets/logo/logo-mark.png` e `logo.png`: aliases atualizados para fontes
  antigas; preferir os nomes acima em trabalho novo.
- `public/icons/broto-*.png`, `app/icon.png`, `app/apple-icon.png`: exports técnicos.
- `marketing/branding/2026-11-rebrand/candidates/B1.png`: original do sorteio.
- As outras cinco propostas são arquivo de exploração, **não marcas alternativas**.

Use a imagem aprovada, sem redesenhar com emoji, SVG aproximado ou geração nova.
A composição original nasce do canto inferior esquerdo: manter orientação,
proporção e as duas folhas. Não espelhar, esticar, recolorir, acrescentar olhos,
acessórios ou criar outro personagem. A matriz tem fundo lavanda; não fingir que
é recorte transparente. Pode aplicar bordas arredondadas no container de UI.
Na assinatura, símbolo + palavra “Vynta” em Sora, sem slogan em tamanhos pequenos.
Não usar a silhueta técnica do badge como logo principal.

### Brotô — personagem aprovado para tutoriais e posts

Por solicitação posterior do responsável, o broto ganhou um corpo
com braços, pés e expressões em `public/assets/mascot/`. Essa autorização vale
para o personagem auxiliar; **a logo B1 e os avatares aprovados não mudam**.
Poses: apontando, preocupado e celebrando, com PNG transparente e WebP para UI.
Nome do personagem: **Brotô**. Ele acolhe, ensina e celebra pequenos passos, sem
julgar o usuário. O tutorial usa o export leve; a landing mantém a matriz aprovada.
Pacote de anúncio em `marketing/instagram/15-nova-fase/`, com publicação
condicionada à versão nova estar disponível.

## Direção final (ajuste solicitado pelo responsável)

A landing e os materiais principais mantêm o **minimalismo escuro**, agora com
base lavanda profunda `#14121C`, superfícies `#211D2C` e texto `#F5F2FA`.
Creme é apoio opcional, não o fundo padrão da marca. A referência do biip orienta
espaçamento, navegação estável e transições suaves, sem copiar sua paleta clara.
Avatares oficiais em `marketing/branding/social/`: usar as versões centralizadas
para Instagram/TikTok. A matriz original B1 continua válida para composição editorial.
Ícones PWA `broto-v2-*` derivam do avatar com área segura para máscaras do sistema.

## Paleta

| Papel | Cor | Uso |
| --- | --- | --- |
| Verde profundo | `#294E48` | Marca, títulos, botão com texto branco |
| Verde ação | `#32685B` | Ações, foco, links |
| Lima | `#C8E88B` | Destaques e áreas de cor; texto verde profundo |
| Lavanda | `#ADA6CE` | Fundo do personagem e apoio visual |
| Lavanda profunda | `#14121C` | Fundo principal da landing e novos posts |
| Superfície escura | `#211D2C` | Cards e navegação |
| Creme | `#F7F8F2` | Apoio opcional |
| Tinta | `#10231F` | Títulos e texto de maior contraste |

Sora nos títulos e assinatura, Manrope no corpo. O app continua com temas claro
e escuro; cores de erro, receita, despesa e aviso mantêm seu significado.
Não trocar vermelho de despesa ou verde de receita por decoração de marca.

## Linguagem visual

Espaço generoso, títulos legíveis, áreas simples de cor, formas arredondadas,
um único destaque visual por composição. Broto como companhia para pequenos
passos na organização, sem aparência infantil no texto. Evitar o antigo padrão
de glow neon azul/roxo, grid tecnológico e gradientes saturados em toda a arte.
Fundos escuros são o padrão, com lavanda profunda e luz contida. Evitar glow neon
azul saturado. Lima é destaque, não fundo dominante de todas as peças.

Na landing, preservar `LandingMotion`, `data-reveal`, `data-parallax` e CSS leve,
respeitando reduced motion. Sem nova biblioteca de animações.

## Copy

Entrada principal: entender gastos, parcelas e faturas do mês. Rotina, hábitos,
metas, treinos e notas complementam a proposta. Voz próxima, clara, sem culpar
quem está com dificuldade financeira. CTA: **Testar 7 dias grátis**. Sem cartão,
sem CPF, sem cobrança automática **ao fim do teste**. Assinaturas pagas têm suas
condições próprias em `lib/plans.ts`; não sugerir gratuidade permanente.

Não prometer lançamento em exatamente 5 segundos, economia garantida, conexão
bancária, app nas lojas ou lembrete universal em horário exato. Demonstrações
com valores são ilustrativas. Fontes e auditoria: `2026-11-rebrand/COPY.md`.

## Próximos posts e migração

1. Ler este guia e `marketing/README.md` antes de copiar qualquer pasta.
2. Usar os assets oficiais e a paleta atual; nunca extrair a logo de um PNG antigo.
3. Os 12 prints em `public/images/landing/` foram recapturados após os ajustes
   finais de sidebar, lavanda e mobile em 13/11/2026. Recapturar quando o layout
   mudar novamente (ver `2026-11-rebrand/IMPLEMENTACAO.md`).
   Não usar imagens legadas soltas em `public/images/` como fonte de novos posts.
4. Posts já exportados não mudam quando o asset é trocado. PNGs antigos são
   arquivo histórico, não base de branding. Antes de publicar um post já
   preparado, atualizar seu HTML e renderizar novamente.
5. Instagram: 1080×1350; stories/TikTok vertical: 1080×1920. Respeitar área segura
   de interface, legendas e stickers; PNG não substitui sticker interativo.
6. Rever fonte e render. Uma logo nova em cima de layout neon antigo não conclui
   a migração. O template base também deve seguir esta identidade.

Este guia e as propostas viajam no Git. Os lotes históricos de Instagram seguem
fora do versionamento conforme o fluxo do projeto.
