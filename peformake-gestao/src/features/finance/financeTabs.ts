/** Abas do Financeiro: resumo (só admin), caixa, cobrança, contratos (só admin) e lançamentos pelo WhatsApp (só admin). */
export const FINANCE_TABS = [
  { to: '/financeiro', label: 'Resumo', roles: ['admin'] as const },
  { to: '/financeiro/caixa', label: 'Caixa' },
  { to: '/financeiro/cobranca', label: 'Cobrança' },
  { to: '/financeiro/contratos', label: 'Contratos', roles: ['admin'] as const },
  { to: '/financeiro/whatsapp', label: 'WhatsApp', roles: ['admin'] as const },
]
