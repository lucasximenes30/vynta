# Contas bancárias — 14/11/2026

Cadastro manual em Finanças, separado das transações. Guarda nome, saldo exato
em Decimal(12,2), data da conferência e conta principal. Não guarda número de
conta, agência ou credenciais bancárias. Não importa extratos automaticamente.
Entradas e saídas, pagamentos de faturas, receitas recorrentes e transferências
não alteram esse saldo: o usuário o atualiza após conferir o banco.

Schema novo `bank_accounts`: diff revisado antes do db:push, exclusivamente
CREATE TABLE/INDEX e chave estrangeira para users, sem DROP. Aplicado ao banco
configurado em 14/11. Deploy do código ainda necessário para exibir o recurso.
Cliente Prisma gerado com engineType client e versões existentes preservadas.

API escopada pela sessão; não aceita userId no corpo. Origin e rate limit
persistente nas mutações. Zod rejeita valores fracionários em centavos,
datas inexistentes/futuras e campos extras. Mutações bloqueiam a linha do
proprietário durante a transação; escolha de principal não pode disputar
com outra gravação dessa conta. Exclusão promove a próxima conta quando há.
Não há escrita em transactions, cards ou salary.

Interface dinamicamente carregada em Finanças. Formulário usa dialog nativo,
foco/Tab/Escape e rolagem interna. GET pode usar fallback offline do SW dentro
do TTL existente: o saldo continua acompanhado da data e não é anunciado como
consulta ao banco. Mutações requerem conexão, não entram na fila offline.
Nenhuma alteração em service worker, identidade PWA ou fila offline.

Validação: TypeScript, build, check-security e diff --check passaram. Testes
novos cobrem autenticação, Origin, limite, proprietário da sessão, ID inválido,
tentativa de edição de outra conta, datas/valores inválidos e parser monetário.
Chrome com conta demo e respostas de contas simuladas: 320/390/430/768/1440
nos temas claro/escuro, sem overflow; editar/salvar, Escape e viewport curta
320×430 com botão alcançável. Não é teste de teclado ou Safari no iPhone físico.
First Load JS: landing 117 kB, Painel 119 kB, Finanças 146 kB, sem aumento
no valor arredondado do build. Finanças passou de 26,1 para 26,2 kB na rota.

O cadastro solicitado pelo titular foi conferido por releitura e comparação
do hash das transações antes/depois. Valores, e-mail, extrato e scripts pessoais
ficam fora do Git. Não recriar conta demo nem incluir fixtures pessoais em testes.
