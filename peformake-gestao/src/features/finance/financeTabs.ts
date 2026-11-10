/** Abas do Financeiro: caixa, cobrança, contratos e lançamentos pelo WhatsApp (só admin). */
export const FINANCE_TABS = [
  { to: '/financeiro', label: 'Caixa' },
  { to: '/financeiro/cobranca', label: 'Cobrança' },
  { to: '/financeiro/contratos', label: 'Contratos' },
  { to: '/financeiro/whatsapp', label: 'WhatsApp', roles: ['admin'] as const },
]
