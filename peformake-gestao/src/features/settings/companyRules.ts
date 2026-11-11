// Dados das empresas que entram nos contratos (mesma regra de public.company_profile_missing).
export type Unit = 'peformake' | 'ellcazo'
export const UNIT_LABEL: Record<Unit, string> = { peformake: 'Peformake', ellcazo: 'Ellcazo' }

export interface CompanyProfile {
  unit: Unit
  legal_name: string | null; trade_name: string | null; document: string | null; address: string | null
  representative_name: string | null; representative_document: string | null; email: string | null; phone: string | null
  cnpj_card_path: string | null; social_contract_path: string | null
}

/** O que falta para a empresa entrar num contrato. Vazio = completo. */
export function companyMissing(p: Partial<CompanyProfile> | null | undefined): string[] {
  const has = (v: string | null | undefined) => !!v && v.trim().length > 0
  return [
    !has(p?.legal_name) && 'razão social',
    !has(p?.document) && 'CNPJ',
    !has(p?.address) && 'endereço',
    !has(p?.representative_name) && 'representante',
    !has(p?.representative_document) && 'CPF do representante',
  ].filter((x): x is string => !!x)
}

/** Link direto para completar os dados da empresa (abre o pop-up já na empresa certa). */
export const companyLink = (unit: Unit) => `/configuracoes/empresas?empresa=${unit}&editar=1`
