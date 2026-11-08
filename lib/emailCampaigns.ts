// Labels for the e-mail tags (email_logs.tag), shared by the admin screens.
export const EMAIL_CAMPAIGNS: Record<string, { label: string; description: string }> = {
  welcome: { label: 'Boas-vindas', description: 'Enviado no cadastro' },
  'password-reset': { label: 'Redefinição de senha', description: 'Pedido em "Esqueci a senha"' },
  'never-used': { label: 'Nunca usou', description: 'Conta com 20h+ sem nenhum lançamento' },
  inactive: { label: 'Inativo 3d+', description: '3 dias ou mais sem abrir o app' },
  'trial-last-day': { label: 'Último dia do teste', description: 'Oferta do 1º mês' },
  'trial-expired': { label: 'Teste expirado', description: 'Oferta do 1º mês após o fim do teste' },
  'promo-ending': { label: 'Fim do mês promocional', description: 'Convite para o plano recorrente' },
}

export const campaignLabel = (tag?: string | null) => (tag && EMAIL_CAMPAIGNS[tag]?.label) || tag || 'Outro'
