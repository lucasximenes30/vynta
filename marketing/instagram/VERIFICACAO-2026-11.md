# Agendamento conferido — 14/11/2026

Autorização explícita do responsável para substituir a fila pela campanha nova.
Aplicado via conector Zernio à única conta correspondente: Instagram @somosvynta.

- Sete feeds antigos atualizados nos próprios IDs, substituindo integralmente
  legenda, mídias e datas. Nenhuma versão antiga permaneceu agendada.
- Quatorze stories novos, dois por dia. Nenhuma ação de publicação imediata.
- Anúncio: 15/11 às 11h; primeiro story 10h45. Reset de domingo guardado para
  reaproveitamento. Rolê transferido de 14/11 para sábado, 21/11, às 11h.
- Os 21 payloads passaram pela validação prévia do Zernio.
- Relistagem posterior: 21 agendados, sem páginas restantes. Conferidos conta,
  tipo feed/story, status, fuso, horário principal e por plataforma, legenda
  principal e override, contagem e ordem das mídias. Não há item em 14/11.
- As 52 imagens nas URLs permanentes do Zernio foram baixadas e comparadas por
  SHA-256: iguais aos arquivos locais aprovados. Não há referência temporária.
- Snapshot mínimo anterior preservado localmente em `.cache/`, para auditoria.
  Manifesto final versionado: `agendamento-2026-11-15-a-21.json`.
- Histórico já publicado permaneceu intacto. Não houve merge/deploy.

Stories automáticos foram renderizados sem placeholders de stickers e
inspecionados visualmente. Fontes e imagens carregadas; 2160×3840, uma imagem
por agendamento. Versões manuais não foram agendadas. Os posts futuros dependem
da disponibilidade normal da integração; status scheduled não é published.

Os scripts de template também foram exercitados em lote separado: um exemplo
gerado com `coverVariant` independente da data e oito renders (seis feed/dois
stories). `git diff --check` aprovado. Não houve mudança de código do aplicativo
nesta etapa; seguem válidos os checks de TypeScript/build/segurança/mobile/offline
da entrega bdb2448, com First Load JS preservado e limites de iPhone documentados.
