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
    document: '', legalName: '', address: '', billingEmail: '', instagram: '', website: '',
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
    document: formatDocument(client.document ?? ''),
    legalName: client.legalName ?? '',
    address: client.address ?? '',
    billingEmail: client.billingEmail ?? '',
    instagram: client.instagram ? `@${client.instagram}` : '',
    website: client.website ?? '',
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
  else if (!isValidPhone(digits)) errors.phone = 'Número inválido. Use DDD e número, ex.: (81) 98888-7777.'

  // E-mail é opcional: só confere o formato quando preenchido.
  if (draft.email.trim() && !EMAIL.test(draft.email.trim())) errors.email = 'E-mail incompleto. Exemplo: nome@empresa.com.'
  if (draft.instagram.trim() && !/^@?[a-z0-9._]{1,30}$/i.test(instagramHandle(draft.instagram))) errors.instagram = 'Perfil inválido. Ex.: @empresa ou o link do perfil.'
  if (draft.website.trim() && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+.*$/i.test(draft.website.trim())) errors.website = 'Site inválido. Ex.: empresa.com.br'

  if (draft.document.trim() && !isValidDocument(draft.document)) errors.document = 'CPF ou CNPJ inválido. Confira os números.'
  if (draft.billingEmail.trim() && !EMAIL.test(draft.billingEmail.trim())) errors.billingEmail = 'E-mail incompleto.'

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

/** Formata 11 dígitos como CPF e 14 como CNPJ; o resto fica como está. */
export function formatDocument(value: string): string {
  const d = value.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  return value
}

/** Confere os dígitos verificadores de CPF (11) ou CNPJ (14). */
export function isValidDocument(value: string): boolean {
  const d = value.replace(/\D/g, '')
  if (/^(\d)\1+$/.test(d)) return false
  const nums = d.split('').map(Number)
  if (d.length === 11) {
    const check = (len: number) => {
      const sum = nums.slice(0, len).reduce((acc, n, i) => acc + n * (len + 1 - i), 0)
      const r = (sum * 10) % 11
      return r === 10 ? 0 : r
    }
    return check(9) === nums[9] && check(10) === nums[10]
  }
  if (d.length === 14) {
    const check = (len: number) => {
      const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      const sum = nums.slice(0, len).reduce((acc, n, i) => acc + n * weights[i]!, 0)
      const r = sum % 11
      return r < 2 ? 0 : 11 - r
    }
    return check(12) === nums[12] && check(13) === nums[13]
  }
  return false
}

/** Telefone brasileiro real: DDD válido e celular com 9 dígitos começando em 9, ou fixo com 8 dígitos. Aceita +55. */
export function isValidPhone(value: string): boolean {
  let d = value.replace(/\D/g, '')
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  if (d.length !== 10 && d.length !== 11) return false
  const ddd = Number(d.slice(0, 2))
  if (ddd < 11 || ddd > 99 || ddd % 10 === 0) return false
  const rest = d.slice(2)
  if (rest.length === 9) return rest.startsWith('9') && !/^(\d)\1+$/.test(rest)
  return /^[2-5]/.test(rest) && !/^(\d)\1+$/.test(rest)
}

/** "@empresa", "instagram.com/empresa/" ou "https://www.instagram.com/empresa?x" viram "empresa". */
export function instagramHandle(value: string): string {
  return value.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '')
}
