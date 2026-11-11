import type { Contract } from './teamRules'

// Situação do contrato do membro (staff_contract_docs.status), como aparece na ficha.
export type StaffContractStatus = 'rascunho' | 'enviado' | 'assinado_parcial' | 'assinado' | 'recusado' | 'erro' | 'cancelado'

export const CONTRACT_STATUS: Record<StaffContractStatus, { label: string; tone: string }> = {
  rascunho: { label: 'Não enviado', tone: 'bg-raised text-muted' },
  enviado: { label: 'Enviado', tone: 'bg-accent-soft text-accent-ink' },
  assinado_parcial: { label: 'Falta uma assinatura', tone: 'bg-accent-soft text-accent-ink' },
  assinado: { label: 'Assinado', tone: 'bg-ok-soft text-ok-ink' },
  recusado: { label: 'Recusado', tone: 'bg-warn-soft text-warn-ink' },
  erro: { label: 'Erro no envio', tone: 'bg-warn-soft text-warn-ink' },
  cancelado: { label: 'Cancelado', tone: 'bg-raised text-muted' },
}

/** CLT e Sócio usam modelo simples: pedir revisão de contador/advogado. */
export const needsLawyer = (c: Contract | null) => c === 'clt' || c === 'socio'
