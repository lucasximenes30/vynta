---
name: instagram-vynta
description: Pesquisa e produção editorial do Vynta em PT-BR: tendências verificadas, posicionamento, carrosséis e stories em HTML, renders e calendário com evidências.
argument-hint: "[tema, lote, auditoria ou campanha]"
triggers:
  - user
  - model
---

# Instagram Vynta — pesquisa, criação e aprendizado

Objetivo: conteúdo útil e reconhecível que aproxima pessoas do teste de 7 dias.
Não garantir viralização ou conversão. Guia canônico: `marketing/AGENTS.md`.
Branding: `marketing/branding/README.md`. Copy: skill `copy-conversao` e
`marketing/branding/2026-11-rebrand/COPY.md`; verificar alegações no código atual.

## 1. Entender antes de propor

Leia calendário, materiais e todos os agendados no conector disponível.
Registre o estado real; arquivo local não prova qual mídia está no Zernio.
Analise resultados por idade e formato. Diferencie fatos, hipóteses e limites
da amostra. Não acessar dados pessoais do app para produzir conteúdo.

## 2. Pesquisar o momento

Pesquise fontes primárias atuais para datas, preços, regras e funcionalidades.
Registre URL, data da consulta/evento e afirmação sustentada. Observe concorrentes
como referência de posicionamento, sem copiar artes/copy. Escolha tendências com
ligação concreta à vida do público e ao produto. Não force memes nem use feriados
sensíveis como gancho comercial. Voláteis: checagem D-1/D0 e alternativa atemporal.
Pesquisa de sites não é pesquisa representativa com consumidores.

Brief: público/situação; tensão sem julgamento; utilidade; evidência; formato;
uma ação desejada; hipótese a medir; validade da informação.

## 3. Distribuir os assuntos

Misture identificação, checklist, tutorial real, bastidor e tendência pertinente.
Hipótese inicial: dois conteúdos úteis, um tutorial, um bastidor e uma tendência
por semana; ajustar ao tempo e aos dados. Sem post diário obrigatório, 7–10 slides
fixos, áudio em alta compulsório ou multiplicadores universais de alcance.
Anúncio da marca pode apresentar o produto já na capa.

## 4. Escrever

Gancho claro, uma ideia por slide, informação nova em cada passo e uma ação final.
Preferir 15–30 palavras no corpo; termos essenciais/fontes podem exigir mais.
Quantidade de slides serve à história. Legenda complementa: contexto, detalhe
útil, pergunta quando natural, CTA e 3–5 hashtags relevantes. Validar limites
vigentes da plataforma antes de publicar.

Não usar culpa para vender. Sem promessas de economia, velocidade, hábito,
automação bancária ou superioridade absoluta. Exemplos identificados e somados.
Distinguir previsão, vencimento, receita e saldo bancário; 13º não é gerado pela
configuração de salário recorrente. Respeitar condições de push e offline.

## 5. Criar a arte a partir do código

Preservar B1 e **Brotô** aprovado (`public/assets/mascot/`). Variar poses com
função narrativa; ele não precisa ocupar todas as telas. Lavanda #14121C, lima
#C8E88B, apoio #ADA6CE, Sora/Manrope. Sem emoji nativo nas artes.
Variar módulos e composição de screenshots demo conforme o assunto.

Fonte HTML/CSS e legenda por pasta. Feed 1080×1350 CSS @2x; story 1080×1920 @2x.
Template canônico aprovado: `marketing/templates/broto-social/README.md`.
Pacote: `marketing/pacotes/vynta-broto-social-2026-11.zip`.
Referências: `marketing/instagram/15-nova-fase/` e
`marketing/instagram/revisao-2026-11/`.
Gerar novo lote: `node scripts/build-social-revision.mjs marketing/instagram/SEU-LOTE`.
Render: `node scripts/render-social-revision.mjs marketing/instagram/SEU-LOTE`, com Playwright disponível
ou `PLAYWRIGHT_MODULE` externo. Não adicionar dependências ao app só para artes.

## 6. Revisar e entregar

Esperar fontes e decode de imagens. Inspecionar cada PNG, texto, recortes,
contraste, contas, dados demo, ordem e dimensões, também em escala mobile.
Stories precisam de área segura e instrução de sticker nativo: desenho não cria
interação. Áudio depende de direitos e suporte da plataforma.

Entregar fontes + PNGs + legenda + stories/roteiro + pesquisa + calendário com
status real. Horário é hipótese sem amostra suficiente. Anúncio de recurso
depende da versão publicada. Preparar proposta concreta antes de qualquer
aprovação necessária; respeitar escopo e verificar o resultado remoto pela API.

## 7. Medir e melhorar

Comparar 24h/72h/7d, por formato/tema. Numeradores e denominadores explícitos:
shares/alcance, saves/alcance, visitas/alcance e follows/visitas.
Não chamar shares de DMs sem essa métrica. Cadastro/assinatura exigem atribuição
real, não inferência de likes. Uma hipótese por teste de formato ou gancho.

## Referências e manutenção

Revisada em 13/11/2026. A Meta oferece recomendações gerais e personalizadas no
[Best Practices](https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/).
Isso não sustenta multiplicadores universais de saves, número ideal fixo de slides
ou ordem imutável de sinais. Consultar documentação atual em cada lote.
Pesquisa do Vynta: `marketing/auditoria/2026-11-13/README.md`.
Pode ser extraída para um repositório de skill depois; separar configuração da
marca do método antes de distribuir para outros projetos.
