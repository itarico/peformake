// Tráfego → Vendas: regras puras (sem banco) da tela que liga o WhatsApp e o Pixel do cliente e marca vendas.

export type WaStatus = 'novo' | 'aguardando_qr' | 'conectado' | 'desconectado' | 'erro'
export type MetaStatus = 'nao_enviar' | 'pendente' | 'enviado' | 'erro'

export interface SalesClient {
  id: string
  name: string
  wa: { status: WaStatus; phone: string | null; error: string | null } | null
  pixelId: string | null
  wabaId: string | null
  testEventCode: string | null
  sendEnabled: boolean
  hasToken: boolean
  leads: number
  fromAds: number
  hints: number
  sales: number
  valueCents: number
  sendErrors: number
}

export interface Lead {
  id: string
  name: string | null
  phone: string | null
  lastAt: string
  lastPreview: string | null
  source: 'anuncio' | 'organico'
  adTitle: string | null
  saleHint: boolean
}

export interface Sale {
  id: string
  leadId: string | null
  valueCents: number
  soldAt: string
  note: string | null
  metaStatus: MetaStatus
  metaError: string | null
}

/** +55 81 99999-1234 a partir de 5581999991234. Sem telefone, devolve vazio. */
export function phoneLabel(phone: string | null): string {
  const d = (phone ?? '').replace(/\D/g, '')
  if (d.length < 10) return d ? `+${d}` : ''
  const local = d.length > 11 ? d.slice(d.length - 11) : d
  const country = d.length > 11 ? `+${d.slice(0, d.length - 11)} ` : ''
  const rest = local.slice(2)
  return `${country}${local.slice(0, 2)} ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`
}

export function leadLabel(lead: Pick<Lead, 'name' | 'phone'>): string {
  return lead.name?.trim() || phoneLabel(lead.phone) || 'Contato sem nome'
}

export const waConnected = (c: Pick<SalesClient, 'wa'>) => c.wa?.status === 'conectado'

/** O próximo passo de cada cliente, em ordem: WhatsApp, Pixel, ligar o envio. Null quando está tudo pronto. */
export function nextStep(c: SalesClient): 'whatsapp' | 'pixel' | 'envio' | null {
  if (!waConnected(c)) return 'whatsapp'
  if (!c.pixelId) return 'pixel'
  if (!c.sendEnabled) return 'envio'
  return null
}

/** Quem precisa de atenção primeiro: erro de envio, sinal de venda sem marcar, depois quem falta configurar, depois por nome. */
export function sortClients(list: readonly SalesClient[]): SalesClient[] {
  const weight = (c: SalesClient) => (c.sendErrors > 0 ? 0 : c.hints > 0 ? 1 : waConnected(c) ? 2 : c.wa || c.pixelId ? 3 : 4)
  return [...list].sort((a, b) => weight(a) - weight(b) || a.name.localeCompare(b.name, 'pt-BR'))
}

export const META_LABEL: Record<MetaStatus, string> = {
  nao_enviar: 'Só no sistema',
  pendente: 'Enviando à Meta',
  enviado: 'Enviada à Meta',
  erro: 'A Meta recusou',
}

/** Só números, de 8 a 20 dígitos: o ID do Pixel (conjunto de dados) como aparece no Gerenciador de Eventos. */
export function validPixel(text: string): boolean {
  const d = text.replace(/\D/g, '')
  return d.length >= 8 && d.length <= 20
}

/** Dia (AAAA-MM-DD, horário de Brasília) vira o instante salvo: hoje usa a hora de agora, outro dia usa meio-dia. */
export function soldAtFromDay(day: string, now = new Date()): string {
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  return day === today ? now.toISOString() : new Date(`${day}T12:00:00-03:00`).toISOString()
}

export function saleErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return 'Você não tem permissão para isso.'
  if (code === 'PF004') return 'Cliente ou conversa não encontrado. Atualize a página.'
  if (code === 'PF011') return 'O ID do Pixel tem só números (de 8 a 20). Confira no Gerenciador de Eventos.'
  if (code === 'PF012') return 'Informe o ID do Pixel antes de ligar o envio.'
  if (code === 'PF013') return 'Informe o valor da venda.'
  if (code === 'PF014') return 'A data da venda não pode ser no futuro.'
  if (code === 'PF015') return 'Venda já enviada à Meta não pode ser apagada.'
  return (error as Error | null)?.message?.startsWith('Não') || (error as Error | null)?.message?.startsWith('Sem') ? (error as Error).message : 'Não foi possível salvar. Nada foi alterado. Tente de novo.'
}
