// Regras que transformam o cadastro em decisão: valor, contrato, saúde e alertas.
// Datas no formato AAAA-MM-DD, sempre comparadas em UTC para não variar com o fuso.

export type ClientKind = 'fixo' | 'tcv' | 'avulso'
export type Entity = 'peformake' | 'ellcazo' | 'none'
export type HealthLevel = 'muito_ruim' | 'ruim' | 'neutro' | 'bom' | 'muito_bom'
export type DiscountType = 'percent' | 'fixed'

export const HEALTH_LEVELS: readonly HealthLevel[] = ['muito_ruim', 'ruim', 'neutro', 'bom', 'muito_bom']
export const HEALTH_LABEL: Record<HealthLevel, string> = {
  muito_ruim: 'Muito ruim',
  ruim: 'Ruim',
  neutro: 'Neutro',
  bom: 'Bom',
  muito_bom: 'Muito bom',
}
export const HEALTH_SCORE: Record<HealthLevel, number> = { muito_ruim: 1, ruim: 2, neutro: 3, bom: 4, muito_bom: 5 }
export const KIND_LABEL: Record<ClientKind, string> = { fixo: 'Fixo', tcv: 'TCV', avulso: 'Avulso' }

/** Uma avaliação vale por este tempo. Depois disso, o cliente pede nova avaliação. */
export const ASSESSMENT_VALID_DAYS = 30
/** Contrato que termina dentro deste prazo pede renovação. */
export const CONTRACT_WARNING_DAYS = 30

const DAY = 86_400_000
const toDay = (value: string) => Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
export const daysBetween = (from: string, to: string) => Math.round((toDay(to) - toDay(from)) / DAY)

export function clientKind(clientType: string | null, contractModel: string | null): ClientKind {
  if (clientType === 'one-off' || contractModel === 'One-off') return 'avulso'
  if (contractModel === 'TCV') return 'tcv'
  return 'fixo'
}

export interface ServiceLine {
  isActive: boolean
  isAudiovisual: boolean
  quantity: number | null
  price?: number | null
  discountType?: DiscountType | null
  discountValue?: number | null
}

/** Ellcazo quando todos os serviços ativos são de audiovisual. Sem serviço ativo, nenhuma. */
export function entityOf(services: readonly ServiceLine[]): Entity {
  const active = services.filter((item) => item.isActive)
  if (active.length === 0) return 'none'
  return active.every((item) => item.isAudiovisual) ? 'ellcazo' : 'peformake'
}

export function lineValue(line: Pick<ServiceLine, 'price' | 'quantity' | 'discountType' | 'discountValue'>): number {
  const base = (line.price ?? 0) * Math.max(line.quantity ?? 1, 1)
  const discount = line.discountValue ?? 0
  if (line.discountType === 'percent') return Math.max(base * (1 - Math.min(discount, 100) / 100), 0)
  if (line.discountType === 'fixed') return Math.max(base - discount, 0)
  return base
}

export function clientValue(services: readonly ServiceLine[]): { value: number; missingPrices: number } {
  const active = services.filter((item) => item.isActive)
  return {
    value: Math.round(active.reduce((sum, item) => sum + lineValue(item), 0) * 100) / 100,
    missingPrices: active.filter((item) => item.price === null || item.price === undefined).length,
  }
}

export interface ContractInfo {
  startDate: string | null
  endDate: string | null
  months: number | null
}

export type ContractState = 'project' | 'none' | 'ok' | 'ending' | 'expired'

export interface ContractStatus {
  state: ContractState
  daysLeft: number | null
  elapsedMonths: number | null
  totalMonths: number | null
}

export function contractStatus(contract: ContractInfo | null, kind: ClientKind, today: string): ContractStatus {
  if (kind === 'avulso') return { state: 'project', daysLeft: null, elapsedMonths: null, totalMonths: null }
  const end = contract?.endDate ?? null
  const start = contract?.startDate ?? null
  const total = contract?.months ?? (start && end ? Math.max(Math.round(daysBetween(start, end) / 30.44), 1) : null)
  const elapsed = start ? Math.min(Math.max(Math.floor(daysBetween(start, today) / 30.44) + 1, 0), total ?? Infinity) : null
  if (!end) return { state: 'none', daysLeft: null, elapsedMonths: elapsed, totalMonths: total }
  const daysLeft = daysBetween(today, end)
  const state: ContractState = daysLeft < 0 ? 'expired' : daysLeft <= CONTRACT_WARNING_DAYS ? 'ending' : 'ok'
  return { state, daysLeft, elapsedMonths: elapsed, totalMonths: total }
}

export interface AssessmentEntry {
  level: HealthLevel
  assessedAt: string
}

export type Trend = 'up' | 'down' | 'flat' | null

export interface HealthStatus {
  latest: HealthLevel | null
  daysSince: number | null
  isStale: boolean
  average: number | null
  trend: Trend
  months: { month: string; average: number }[]
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

/** Última avaliação, média dos últimos 30 dias, tendência contra os 30 dias anteriores e meses recentes. */
export function healthStatus(entries: readonly AssessmentEntry[], today: string): HealthStatus {
  const sorted = [...entries].sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))
  const latest = sorted[0]
  if (!latest) return { latest: null, daysSince: null, isStale: true, average: null, trend: null, months: [] }
  const age = (entry: AssessmentEntry) => daysBetween(entry.assessedAt.slice(0, 10), today)
  const recent = mean(sorted.filter((entry) => age(entry) <= 30).map((entry) => HEALTH_SCORE[entry.level]))
  const before = mean(sorted.filter((entry) => age(entry) > 30 && age(entry) <= 60).map((entry) => HEALTH_SCORE[entry.level]))
  const trend: Trend = recent === null || before === null ? null : recent - before >= 0.5 ? 'up' : before - recent >= 0.5 ? 'down' : 'flat'

  const byMonth = new Map<string, number[]>()
  for (const entry of sorted) {
    const key = entry.assessedAt.slice(0, 7)
    byMonth.set(key, [...(byMonth.get(key) ?? []), HEALTH_SCORE[entry.level]])
  }
  const daysSince = age(latest)
  return {
    latest: latest.level,
    daysSince,
    isStale: daysSince > ASSESSMENT_VALID_DAYS,
    average: recent === null ? null : Math.round(recent * 10) / 10,
    trend,
    months: [...byMonth.entries()].slice(0, 3).map(([month, scores]) => ({ month, average: Math.round((mean(scores) ?? 0) * 10) / 10 })),
  }
}

export type AttentionFlag = 'risk' | 'stale' | 'ending' | 'expired' | 'no_team' | 'no_service' | 'upsell'

export const ATTENTION_LABEL: Record<AttentionFlag, string> = {
  risk: 'Relacionamento em risco',
  stale: 'Sem avaliação recente',
  ending: 'Contrato vencendo',
  expired: 'Contrato vencido',
  no_team: 'Sem equipe',
  no_service: 'Sem serviço ativo',
  upsell: 'Hora de oferecer mais',
}

export interface AttentionInput {
  isActive: boolean
  health: HealthStatus
  contract: ContractStatus
  teamSize: number
  activeServices: number
  /** Nomes dos serviços ativos, para achar o que falta oferecer. */
  serviceNames?: readonly string[]
  /** Meses como cliente. */
  months?: number | null
}

const strip = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** As frentes que completam o "marketing inteiro num time só", na ordem em que costumam vender. */
const AREAS: { label: string; match: RegExp }[] = [
  { label: 'Tráfego pago', match: /trafego/ },
  { label: 'Social media', match: /social/ },
  { label: 'Audiovisual', match: /video|captacao|camera|mobile|diaria|visita|audiovisual|edicao|videocast/ },
  { label: 'Design', match: /design|arte/ },
]

/**
 * Upsell na hora certa: cliente satisfeito (última avaliação boa ou muito boa, recente), com pelo menos 3 meses de casa,
 * sem contrato vencendo e sem outro alerta grave, e que ainda não tem todas as frentes. Devolve a frente sugerida.
 */
export function upsellSuggestion(input: AttentionInput): string | null {
  if (!input.isActive || input.activeServices === 0) return null
  const latest = input.health.latest
  if (!latest || HEALTH_SCORE[latest] < 4 || input.health.isStale) return null
  if ((input.months ?? 0) < 3) return null
  if (input.contract.state === 'ending' || input.contract.state === 'expired') return null
  const names = (input.serviceNames ?? []).map(strip)
  const missing = AREAS.find((a) => !names.some((n) => a.match.test(n)))
  return missing?.label ?? null
}

/** O que pede ação agora, do mais grave para o mais leve. Cliente perdido não gera alerta. */
export function attentionFlags(input: AttentionInput): AttentionFlag[] {
  if (!input.isActive) return []
  const flags: AttentionFlag[] = []
  if (input.health.latest && HEALTH_SCORE[input.health.latest] <= 2) flags.push('risk')
  if (input.contract.state === 'expired') flags.push('expired')
  if (input.contract.state === 'ending') flags.push('ending')
  if (input.activeServices === 0) flags.push('no_service')
  if (input.teamSize === 0) flags.push('no_team')
  if (input.health.isStale) flags.push('stale')
  if (flags.length === 0 && upsellSuggestion(input)) flags.push('upsell')
  return flags
}
