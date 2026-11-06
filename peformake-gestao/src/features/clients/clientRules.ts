import {
  attentionFlags,
  upsellSuggestion,
  clientKind,
  clientValue,
  contractStatus,
  entityOf,
  healthStatus,
  HEALTH_SCORE,
  type AttentionFlag,
  type ClientKind,
  type ContractStatus,
  type DiscountType,
  type Entity,
  type HealthLevel,
  type HealthStatus,
} from './portfolioRules'

export type TeamRole = 'head_marketing' | 'social_media' | 'designer' | 'traffic_manager' | 'editor' | 'videomaker' | 'closer' | 'squad'

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  head_marketing: 'Head de marketing',
  social_media: 'Social media',
  designer: 'Designer',
  traffic_manager: 'Gestor de tráfego',
  editor: 'Editor',
  videomaker: 'Videomaker',
  closer: 'Closer',
  squad: 'Squad',
}

/** Funções escolhidas uma a uma no cadastro. "squad" entra sozinho, pelo squad escolhido. */
export const ASSIGNABLE_ROLES: readonly Exclude<TeamRole, 'squad'>[] = [
  'head_marketing', 'social_media', 'designer', 'traffic_manager', 'editor', 'videomaker', 'closer',
]

export interface ClientServiceItem {
  id: string
  serviceId: string | null
  name: string
  isActive: boolean
  isAudiovisual: boolean
  quantity: number | null
  notes: string | null
  packageId: string | null
  /** Só chega para administrador. Para os demais fica indefinido. */
  price?: number | null
  discountType?: DiscountType | null
  discountValue?: number | null
}

export interface TeamEntry {
  staffId: string
  name: string
  role: TeamRole
  photoUrl: string | null
}

export interface AssessmentRecord {
  id: string
  level: HealthLevel
  observation: string | null
  assessedAt: string
}

export interface ContractRecord {
  model: string | null
  startDate: string | null
  endDate: string | null
  months: number | null
  billingDay: number | null
}

export interface ClientRecord {
  id: string
  name: string
  segment: string | null
  clientType: string | null
  isActive: boolean
  isLost: boolean
  email: string | null
  phone: string | null
  logoPath: string | null
  logoUrl: string | null
  description: string | null
  targetAudience: string | null
  competitors: string | null
  valueProposition: string | null
  acquisitionChannel: string | null
  lostReason: string | null
  lostAt: string | null
  since: string | null
  nps: number | null
  updatedAt: string
  showOnSite: boolean
  squadId: string | null
  /** CPF/CNPJ só com números. */
  document: string | null
  legalName: string | null
  address: string | null
  billingEmail: string | null
  contract: ContractRecord | null
  services: ClientServiceItem[]
  team: TeamEntry[]
  assessments: AssessmentRecord[]
}

/** Cliente com tudo o que a tela precisa para decidir, calculado uma vez. */
export interface ClientView {
  client: ClientRecord
  kind: ClientKind
  entity: Entity
  value: number
  missingPrices: number
  contract: ContractStatus
  health: HealthStatus
  flags: AttentionFlag[]
  people: number
  /** Frente que vale oferecer agora (só quando o momento é bom). */
  upsell: string | null
}

export function describeClient(client: ClientRecord, today: string): ClientView {
  const kind = clientKind(client.clientType, client.contract?.model ?? null)
  const contract = contractStatus(client.contract, kind, today)
  const health = healthStatus(client.assessments, today)
  const { value, missingPrices } = clientValue(client.services)
  const people = new Set(client.team.map((entry) => entry.staffId)).size
  const active = client.services.filter((item) => item.isActive)
  const attention = {
    isActive: client.isActive && !client.isLost,
    health,
    contract,
    teamSize: people,
    activeServices: active.length,
    serviceNames: active.map((item) => item.name),
    months: client.contract?.startDate ? Math.floor((Date.parse(today) - Date.parse(client.contract.startDate)) / (30.44 * 86_400_000))
      : client.since ? Math.floor((Date.parse(today) - Date.parse(client.since)) / (30.44 * 86_400_000)) : null,
  }
  return {
    client,
    kind,
    entity: entityOf(client.services),
    value,
    missingPrices,
    contract,
    health,
    people,
    flags: attentionFlags(attention),
    upsell: upsellSuggestion(attention),
  }
}

export type StatusFilter = 'active' | 'lost'
export type KindFilter = ClientKind | 'all' | 'recorrente'
export type EntityFilter = Exclude<Entity, 'none'> | 'all'
export type FlagFilter = AttentionFlag | 'any' | 'all'
export type SortKey = 'name' | 'value' | 'health' | 'contract'

export interface ClientFilters {
  status: StatusFilter
  kind: KindFilter
  entity: EntityFilter
  flag: FlagFilter
  search: string
}

export const DEFAULT_FILTERS: ClientFilters = { status: 'active', kind: 'all', entity: 'all', flag: 'all', search: '' }

export function filterClients(items: readonly ClientView[], filters: ClientFilters): ClientView[] {
  const term = normalize(filters.search)
  return items.filter((item) => {
    const { client } = item
    if (filters.status === 'active' ? !isLiveClient(client) : isLiveClient(client)) return false
    if (filters.kind === 'recorrente' ? item.kind === 'avulso' : filters.kind !== 'all' && item.kind !== filters.kind) return false
    if (filters.entity !== 'all' && item.entity !== filters.entity) return false
    if (filters.flag === 'any' && !item.flags.some((f) => f !== 'upsell')) return false
    // "Contrato vencendo" também mostra os já vencidos (o número do atalho conta os dois).
    if (filters.flag === 'ending' && !item.flags.includes('ending') && !item.flags.includes('expired')) return false
    if (filters.flag !== 'all' && filters.flag !== 'any' && filters.flag !== 'ending' && !item.flags.includes(filters.flag)) return false
    if (!term) return true
    return [client.name, client.segment, client.email, client.phone, ...client.team.map((entry) => entry.name)]
      .some((value) => value && normalize(value).includes(term))
  })
}

const byName = (a: ClientView, b: ClientView) => a.client.name.localeCompare(b.client.name, 'pt-BR')

/** Saúde: pior primeiro, sem avaliação no topo. Contrato: o que vence antes primeiro, sem data no fim. */
export function sortClients(items: readonly ClientView[], key: SortKey): ClientView[] {
  const list = [...items]
  if (key === 'name') return list.sort(byName)
  if (key === 'value') return list.sort((a, b) => b.value - a.value || byName(a, b))
  if (key === 'health') {
    const score = (item: ClientView) => (item.health.latest ? HEALTH_SCORE[item.health.latest] : 0)
    return list.sort((a, b) => score(a) - score(b) || byName(a, b))
  }
  const left = (item: ClientView) => item.contract.daysLeft ?? Number.POSITIVE_INFINITY
  return list.sort((a, b) => left(a) - left(b) || byName(a, b))
}

export interface PortfolioSummary {
  active: number
  recurringValue: number
  projectValue: number
  needAttention: number
  atRisk: number
  contractsEnding: number
  upsell: number
}

/** Ativo de verdade: nem perdido nem desativado. Perdido ou excluído não entra em conta nenhuma. */
export const isLiveClient = (client: Pick<ClientRecord, 'isActive' | 'isLost'>) => client.isActive && !client.isLost

export function summarizePortfolio(items: readonly ClientView[]): PortfolioSummary {
  const active = items.filter((item) => isLiveClient(item.client))
  return {
    active: active.length,
    recurringValue: active.filter((item) => item.kind !== 'avulso').reduce((sum, item) => sum + item.value, 0),
    projectValue: active.filter((item) => item.kind === 'avulso').reduce((sum, item) => sum + item.value, 0),
    needAttention: active.filter((item) => item.flags.some((f) => f !== 'upsell')).length,
    upsell: active.filter((item) => item.flags.includes('upsell')).length,
    atRisk: active.filter((item) => item.flags.includes('risk')).length,
    contractsEnding: active.filter((item) => item.flags.includes('ending') || item.flags.includes('expired')).length,
  }
}

export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function activeServiceNames(client: Pick<ClientRecord, 'services'>): string[] {
  return [...new Set(client.services.filter((item) => item.isActive).map((item) => item.name))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Uma pessoa por linha, com as funções juntas. Squad por último. */
export function groupTeam(team: readonly TeamEntry[]): { staffId: string; name: string; photoUrl: string | null; roles: TeamRole[] }[] {
  const map = new Map<string, { staffId: string; name: string; photoUrl: string | null; roles: TeamRole[] }>()
  for (const entry of team) {
    const current = map.get(entry.staffId) ?? { staffId: entry.staffId, name: entry.name, photoUrl: entry.photoUrl, roles: [] }
    if (!current.roles.includes(entry.role)) current.roles.push(entry.role)
    map.set(entry.staffId, current)
  }
  const order = (role: TeamRole) => (role === 'squad' ? 99 : ASSIGNABLE_ROLES.indexOf(role))
  return [...map.values()]
    .map((person) => ({ ...person, roles: person.roles.sort((a, b) => order(a) - order(b)) }))
    .sort((a, b) => order(a.roles[0] ?? 'squad') - order(b.roles[0] ?? 'squad') || a.name.localeCompare(b.name, 'pt-BR'))
}

/** Link de WhatsApp só quando o número pode ser usado; assume Brasil se não houver código do país. */
export function whatsappLink(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `https://wa.me/55${digits}`
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return `https://wa.me/${digits}`
  return null
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function clientStatusLabel(client: Pick<ClientRecord, 'isActive' | 'isLost'>): string {
  if (client.isActive) return 'Ativo'
  return client.isLost ? 'Perdido' : 'Inativo'
}
