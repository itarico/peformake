import type { ClientDraft } from './clientsApi'
import type { ClientRecord } from './clientRules'
import { clientKind, type ClientKind } from './portfolioRules'

export type DraftErrors = Partial<Record<keyof ClientDraft, string>>

/** Mesmo dia, N meses depois. Dia que não existe no mês final vira o último dia. */
export function addMonths(start: string, months: number): string {
  const [year = 0, month = 1, day = 1] = start.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, last))
  return target.toISOString().slice(0, 10)
}

export function kindToDraft(kind: ClientKind): Pick<ClientDraft, 'clientType' | 'contractModel'> {
  if (kind === 'avulso') return { clientType: 'one-off', contractModel: 'One-off' }
  return { clientType: 'recurring', contractModel: kind === 'tcv' ? 'TCV' : 'MRR' }
}

export function emptyDraft(today: string): ClientDraft {
  return {
    name: '', segment: '', clientType: 'recurring', contractModel: 'MRR', email: '', phone: '', logoPath: null, showOnSite: false,
    acquisitionChannel: '', description: '', targetAudience: '', valueProposition: '', competitors: '',
    startDate: today, endDate: addMonths(today, 12), months: '12', billingDay: '10',
  }
}

export function draftFromClient(client: ClientRecord): ClientDraft {
  const kind = clientKind(client.clientType, client.contract?.model ?? null)
  return {
    name: client.name,
    segment: client.segment ?? '',
    ...kindToDraft(kind),
    email: client.email ?? '',
    phone: client.phone ?? '',
    logoPath: client.logoPath,
    showOnSite: client.showOnSite,
    acquisitionChannel: client.acquisitionChannel ?? '',
    description: client.description ?? '',
    targetAudience: client.targetAudience ?? '',
    valueProposition: client.valueProposition ?? '',
    competitors: client.competitors ?? '',
    startDate: client.contract?.startDate ?? '',
    endDate: client.contract?.endDate ?? '',
    months: client.contract?.months ? String(client.contract.months) : '',
    billingDay: client.contract?.billingDay ? String(client.contract.billingDay) : '',
  }
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Repete no navegador as regras do banco, para o erro aparecer no campo certo antes de enviar. */
export function validateDraft(draft: ClientDraft): DraftErrors {
  const errors: DraftErrors = {}
  const name = draft.name.trim()
  if (name.length < 2) errors.name = 'Digite o nome do cliente.'
  else if (name.length > 120) errors.name = 'Use no máximo 120 caracteres.'

  const digits = draft.phone.replace(/\D/g, '')
  if (!digits) errors.phone = 'O WhatsApp é obrigatório.'
  else if (digits.length < 10 || digits.length > 13) errors.phone = 'Digite DDD e número. Exemplo: (81) 98888-7777.'

  if (draft.email.trim() && !EMAIL.test(draft.email.trim())) errors.email = 'E-mail incompleto. Exemplo: nome@empresa.com.'

  if (draft.startDate && !DATE.test(draft.startDate)) errors.startDate = 'Data inválida.'
  if (draft.endDate && !DATE.test(draft.endDate)) errors.endDate = 'Data inválida.'
  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) errors.endDate = 'O fim não pode ser antes do início.'

  if (draft.months) {
    const months = Number(draft.months)
    if (!Number.isInteger(months) || months < 1 || months > 120) errors.months = 'Use de 1 a 120 meses.'
  }
  if (draft.billingDay) {
    const day = Number(draft.billingDay)
    if (!Number.isInteger(day) || day < 1 || day > 31) errors.billingDay = 'Use um dia de 1 a 31.'
  }
  if (draft.setupFee !== undefined && draft.setupFee.trim()) {
    const fee = parseMoney(draft.setupFee)
    if (fee === null || fee < 0) errors.setupFee = 'Valor inválido. Exemplo: 1.500,00.'
  }
  return errors
}

/** Aceita 1500, 1.500, 1.500,50 e 1500.5. Devolve nulo se não for número. */
export function parseMoney(text: string): number | null {
  const clean = text.replace(/[R$\s]/g, '')
  if (!clean) return null
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(clean) ? clean.replace(/\./g, '') : clean
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Number(normalized)
}

export function moneyText(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
