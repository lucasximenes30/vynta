// Guesses a default category from a free-text description ("uber", "mercado", "ifood"...).
// Pure and client-safe. Category names match the seeded default categories.

type Rule = [category: string, keywords: string[]]

const EXPENSE_RULES: Rule[] = [
  ['Restaurant', ['ifood', 'i food', 'rappi', 'restaurante', 'lanche', 'lanchonete', 'pizza', 'hamburguer', 'burger', 'mc donalds', 'mcdonalds', 'bk', 'subway', 'sushi', 'acai', 'sorvete', 'cafe', 'cafeteria', 'starbucks', 'padaria', 'almoco', 'jantar', 'janta', 'marmita', 'pastel', 'churrasco', 'bar', 'cerveja', 'chopp', 'delivery', 'esfiha', 'coxinha', 'salgado']],
  ['Food', ['mercado', 'supermercado', 'feira', 'hortifruti', 'sacolao', 'acougue', 'atacadao', 'assai', 'carrefour', 'pao de acucar', 'extra', 'compras do mes', 'mercearia', 'comida']],
  ['Transport', ['uber', '99', '99pop', 'taxi', 'onibus', 'metro', 'trem', 'brt', 'passagem', 'gasolina', 'combustivel', 'etanol', 'alcool', 'diesel', 'posto', 'estacionamento', 'zona azul', 'pedagio', 'sem parar', 'oficina', 'mecanico', 'pneu', 'ipva', 'licenciamento', 'multa', 'bilhete unico', 'cabify', 'indrive', 'lavagem', 'lava jato']],
  ['Bills', ['luz', 'energia', 'enel', 'cemig', 'copel', 'agua', 'sabesp', 'internet', 'wifi', 'vivo', 'claro', 'tim', 'oi', 'celular', 'telefone', 'gas', 'condominio', 'aluguel', 'boleto', 'fatura', 'conta de', 'iptu', 'seguro', 'netflix', 'spotify', 'prime video', 'disney', 'hbo', 'max', 'youtube premium', 'icloud', 'google one', 'assinatura', 'globoplay', 'deezer', 'chatgpt']],
  ['Health', ['farmacia', 'drogaria', 'remedio', 'medicamento', 'drogasil', 'raia', 'pague menos', 'consulta', 'medico', 'dentista', 'exame', 'hospital', 'clinica', 'plano de saude', 'unimed', 'psicologo', 'terapia', 'fisioterapia', 'vitamina', 'suplemento', 'whey', 'creatina']],
  ['Gym', ['academia', 'smart fit', 'smartfit', 'bluefit', 'crossfit', 'personal', 'pilates', 'natacao', 'luta', 'jiu jitsu', 'muay thai']],
  ['Entertainment', ['cinema', 'filme', 'show', 'ingresso', 'teatro', 'balada', 'festa', 'jogo', 'game', 'steam', 'playstation', 'xbox', 'viagem', 'hotel', 'airbnb', 'passeio', 'parque', 'role', 'lazer']],
  ['Shopping', ['roupa', 'tenis', 'sapato', 'camisa', 'calca', 'shopee', 'shein', 'amazon', 'mercado livre', 'magalu', 'magazine', 'americanas', 'aliexpress', 'renner', 'riachuelo', 'cea', 'zara', 'presente', 'eletronico', 'fone', 'perfume', 'maquiagem', 'cosmetico', 'loja']],
  ['Home', ['casa', 'movel', 'moveis', 'decoracao', 'leroy', 'material de construcao', 'reforma', 'limpeza', 'faxina', 'diarista', 'lavanderia', 'utensilio', 'eletrodomestico', 'tok stok', 'pet', 'racao', 'veterinario', 'petshop']],
  ['Education', ['curso', 'faculdade', 'escola', 'mensalidade', 'livro', 'apostila', 'udemy', 'alura', 'ingles', 'idioma', 'material escolar']],
  ['Investment', ['investimento', 'tesouro', 'cdb', 'acoes', 'cripto', 'bitcoin', 'reserva', 'poupanca', 'aporte']],
]

const INCOME_RULES: Rule[] = [
  ['Salary', ['salario', 'pagamento', 'holerite', 'adiantamento', 'vale', '13', 'decimo', 'ferias', 'plr', 'bonus']],
  ['Freelance', ['freela', 'freelance', 'job', 'servico', 'cliente', 'projeto', 'venda', 'vendi', 'comissao', 'pix recebido', 'bico']],
  ['Investment', ['rendimento', 'dividendo', 'juros', 'resgate', 'cashback']],
]

export const QUICK_EXPENSE_CATEGORIES = ['Restaurant', 'Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Home', 'Gym', 'Education', 'General']
export const QUICK_INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'General']

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function guessCategory(description: string, type: 'INCOME' | 'EXPENSE'): string | null {
  const text = ` ${normalizeText(description)} `
  if (text.trim().length < 2) return null
  for (const [category, keywords] of type === 'EXPENSE' ? EXPENSE_RULES : INCOME_RULES) {
    if (keywords.some((k) => text.includes(` ${k} `) || (k.length >= 4 && text.includes(` ${k}`)))) return category
  }
  return null
}
