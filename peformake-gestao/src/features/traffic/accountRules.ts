export interface TrafficClient {
  id: string
  name: string
  segment: string | null
  isActive: boolean
  /** Tem o serviço de Tráfego ativo no cadastro. */
  hasTraffic: boolean
}

export interface AdAccount {
  id: string
  name: string
  businessName: string | null
  metaStatus: string
  hasPaymentMethod: boolean
  isQueryable: boolean
  mcpEnabled: boolean
  clientId: string | null
  enabled: boolean
  /** api: token da Peformake; mcp: lida pelo login do cliente. */
  readSource: 'api' | 'mcp'
  updatedAt: string
}

export type AccountFilter = 'in_use' | 'all' | 'unlinked' | 'enabled' | 'alerts'

const IGNORED_WORDS = new Set([
  'ca', 'c', 'a', 'ads', 'bm', 'reserva', 'conta', 'de', 'do', 'da', 'e', 'dr', 'dra', 'clinica', 'ltda', 'prime',
  'solucoes', 'restaurante', 'pizzaria', 'petiscaria', 'studio', 'multimarcas',
])

function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !IGNORED_WORDS.has(word) && !/^\d+$/.test(word))
}

/** Sugere um cliente só quando há uma única correspondência. Nunca grava sozinho. */
export function suggestClient(accountName: string, clients: readonly TrafficClient[]): TrafficClient | null {
  const accountWords = words(accountName)
  if (accountWords.length === 0) return null

  const matches = clients.filter((client) => {
    const clientWords = words(client.name)
    return clientWords.length > 0 && (
      clientWords.every((word) => accountWords.includes(word)) ||
      accountWords.every((word) => clientWords.includes(word))
    )
  })
  return matches.length === 1 ? (matches[0] ?? null) : null
}

export function accountAlerts(account: AdAccount): string[] {
  const alerts: string[] = []
  if (account.metaStatus !== 'ACTIVE') alerts.push('Conta com restrição na Meta')
  if (!account.hasPaymentMethod) alerts.push('Sem forma de pagamento')
  if (!account.isQueryable) alerts.push('Leitura indisponível')
  if (!account.mcpEnabled) alerts.push('MCP ainda indisponível')
  return alerts
}

export function validateLink(clientId: string | null, enabled: boolean, clients: readonly TrafficClient[]): string | null {
  if (!enabled) return null
  if (!clientId) return 'Escolha o cliente antes de habilitar.'
  const client = clients.find((item) => item.id === clientId)
  if (!client) return 'Cliente não encontrado. Atualize a página.'
  if (!client.isActive) return 'Cliente inativo não pode ter conta habilitada.'
  return null
}

export function filterAccounts(
  accounts: readonly AdAccount[],
  filter: AccountFilter,
  search: string,
  clients: readonly TrafficClient[],
  spending: ReadonlySet<string> = new Set(),
): AdAccount[] {
  const term = search.trim().toLowerCase()
  const clientName = new Map(clients.map((client) => [client.id, client.name.toLowerCase()]))
  return accounts.filter((account) => {
    // "Em uso": vinculada, com leitura ou com gasto recente. A busca procura em todas, para achar a conta na hora de vincular.
    if (filter === 'in_use' && !term && !account.clientId && !account.enabled && !spending.has(account.id)) return false
    if (filter === 'unlinked' && account.clientId) return false
    if (filter === 'enabled' && !account.enabled) return false
    if (filter === 'alerts' && accountAlerts(account).length === 0) return false
    if (!term) return true
    return [account.name, account.businessName ?? '', account.id, account.clientId ? (clientName.get(account.clientId) ?? '') : '']
      .some((value) => value.toLowerCase().includes(term))
  })
}

export interface TrafficSummary {
  activeClients: number
  accounts: number
  enabledAccounts: number
  unlinkedAccounts: number
  activeClientsWithoutEnabled: number
}

export function summarize(clients: readonly TrafficClient[], accounts: readonly AdAccount[]): TrafficSummary {
  const withEnabled = new Set(accounts.filter((a) => a.enabled && a.clientId).map((a) => a.clientId))
  const active = clients.filter((client) => client.isActive)
  return {
    activeClients: active.length,
    accounts: accounts.length,
    enabledAccounts: accounts.filter((a) => a.enabled).length,
    unlinkedAccounts: accounts.filter((a) => !a.clientId).length,
    activeClientsWithoutEnabled: active.filter((client) => !withEnabled.has(client.id)).length,
  }
}

/** Mesmo critério do banco: serviço cujo nome começa com "tráfego" (com ou sem acento). */
export function isTrafficService(name: string): boolean {
  return /^tr.fego/i.test(name.trim())
}
