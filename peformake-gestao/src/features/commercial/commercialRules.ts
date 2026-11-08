export type ContactKind = 'novo' | 'lead' | 'cliente' | 'equipe' | 'fornecedor' | 'pessoal' | 'outro'
export type ConversationStatus = 'sem_resposta' | 'aguardando_cliente' | 'parada' | 'em_dia'
export type DealStage = 'novo' | 'qualificacao' | 'negociacao' | 'aguardando' | 'ganho' | 'perdido' | 'pos_venda'
export type SaleStatus = 'pendente' | 'confirmada' | 'recusada'
export type TagColor = 'neutral' | 'accent' | 'ok' | 'warn' | 'brand'
export type TagScope = 'private' | 'group' | 'all'

export interface Tag {
  id: string
  name: string
  color: TagColor
  keywords: string[]
  appliesTo: TagScope
  isActive: boolean
}

export interface ContactTag {
  tagId: string
  source: 'manual' | 'auto'
}

export interface Contact {
  id: string
  chatJid: string
  isGroup: boolean
  phone: string | null
  waName: string | null
  displayName: string | null
  kind: ContactKind
  clientId: string | null
  ownerId: string | null
  notes: string | null
  hidden: boolean
  firstMessageAt: string | null
  lastMessageAt: string | null
  lastInboundAt: string | null
  lastFromMe: boolean | null
  lastPreview: string | null
  unansweredCount: number
  updatedAt: string
  tags: ContactTag[]
  aiSummary: string | null
  aiIntent: Intent | null
  aiSentiment: Sentiment | null
  aiAnalyzedAt: string | null
  avatarPath: string | null
  verifiedName: string | null
  about: string | null
  enrichedAt: string | null
}

export type Intent = 'compra' | 'orcamento' | 'duvida' | 'negociacao' | 'reclamacao' | 'pos_venda' | 'agendamento' | 'pedido_servico' | 'recorrente' | 'sem_intencao'
export type Sentiment = 'positivo' | 'neutro' | 'negativo'
export type SuggestionKind = 'etapa' | 'tipo' | 'pedido'

export interface Suggestion {
  id: string
  contactId: string
  kind: SuggestionKind
  payload: { kind?: ContactKind; deal_id?: string; stage?: DealStage; reason?: string; title?: string; client_id?: string | null }
  evidence: string | null
  createdAt: string
}

export interface CrmEvent {
  id: number
  contactId: string | null
  kind: string
  detail: string
  actorId: string | null
  createdAt: string
}

export const INTENT_LABEL: Record<Intent, string> = {
  compra: 'Quer comprar',
  orcamento: 'Pediu orçamento',
  duvida: 'Dúvida',
  negociacao: 'Negociando',
  reclamacao: 'Reclamação',
  pos_venda: 'Pós-venda',
  agendamento: 'Agendamento',
  pedido_servico: 'Pedido de serviço',
  recorrente: 'Cliente recorrente',
  sem_intencao: 'Sem intenção comercial',
}

export const SENTIMENT_LABEL: Record<Sentiment, string> = { positivo: 'Satisfeito', neutro: 'Neutro', negativo: 'Insatisfeito' }

/** Frase da sugestão para o cartão: o que muda se aceitar. */
export function suggestionText(s: Suggestion): string {
  if (s.kind === 'tipo') return `Marcar como ${KIND_LABEL[s.payload.kind ?? 'outro'] ?? s.payload.kind}`
  if (s.kind === 'etapa') return `Mover a oportunidade para ${STAGE_LABEL[s.payload.stage ?? 'novo'] ?? s.payload.stage}${s.payload.reason ? `: ${s.payload.reason}` : ''}`
  return `Criar tarefa: ${s.payload.title ?? ''}`
}

export interface Deal {
  id: string
  contactId: string
  /** Lead lançado à mão (sem conversa de WhatsApp). */
  leadName: string | null
  leadCompany: string | null
  leadPhone: string | null
  title: string
  stage: DealStage
  serviceId: string | null
  valueCents: number | null
  ownerId: string | null
  nextStep: string | null
  nextStepAt: string | null
  lostReason: string | null
  position: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
}

export interface Sale {
  id: string
  dealId: string | null
  contactId: string | null
  clientId: string | null
  description: string
  valueCents: number
  saleDate: string
  status: SaleStatus
  source: 'manual' | 'agente'
  excerpt: string | null
  createdAt: string
}

export interface CommercialSettings {
  replySlaMinutes: number
  staleDays: number
}

export interface Message {
  id: number
  fromMe: boolean
  senderName: string | null
  body: string | null
  messageType: string | null
  sentAt: string
}

export const KIND_LABEL: Record<ContactKind, string> = {
  novo: 'Novo',
  lead: 'Lead',
  cliente: 'Cliente',
  equipe: 'Equipe',
  fornecedor: 'Fornecedor',
  pessoal: 'Pessoal',
  outro: 'Outro',
}

export const STATUS_LABEL: Record<ConversationStatus, string> = {
  sem_resposta: 'Sem resposta',
  aguardando_cliente: 'Aguardando contato',
  parada: 'Parada',
  em_dia: 'Em dia',
}

export const STATUS_HINT: Record<ConversationStatus, string> = {
  sem_resposta: 'A última mensagem é do contato e passou do prazo',
  aguardando_cliente: 'Respondemos por último',
  parada: 'Ninguém escreve há dias',
  em_dia: 'Mensagem recente, dentro do prazo',
}

export const STAGES: readonly { id: DealStage; label: string; hint: string }[] = [
  { id: 'novo', label: 'Novo', hint: 'Chegou, ainda sem conversa de venda' },
  { id: 'qualificacao', label: 'Qualificação', hint: 'Entendendo o que precisa e se faz sentido' },
  { id: 'negociacao', label: 'Negociação', hint: 'Proposta, valores e condições' },
  { id: 'aguardando', label: 'Aguardando retorno', hint: 'A bola está com o contato' },
  { id: 'ganho', label: 'Ganho', hint: 'Fechou. Lance a venda' },
  { id: 'perdido', label: 'Perdido', hint: 'Não fechou, com o motivo' },
  { id: 'pos_venda', label: 'Pós-venda', hint: 'Cliente novo em acompanhamento' },
]

export const STAGE_LABEL: Record<DealStage, string> = Object.fromEntries(STAGES.map((s) => [s.id, s.label])) as Record<DealStage, string>

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = { pendente: 'Pendente', confirmada: 'Confirmada', recusada: 'Recusada' }

export const TAG_COLORS: readonly TagColor[] = ['neutral', 'accent', 'ok', 'warn', 'brand']
export const TAG_COLOR_LABEL: Record<TagColor, string> = { neutral: 'Cinza', accent: 'Azul', ok: 'Verde', warn: 'Laranja', brand: 'Marca' }
export const TAG_TONE: Record<TagColor, string> = {
  neutral: 'bg-raised text-ink',
  accent: 'bg-accent-soft text-accent-ink',
  ok: 'bg-ok-soft text-ok-ink',
  warn: 'bg-warn-soft text-warn-ink',
  brand: 'bg-brand-soft text-ink',
}
export const TAG_SCOPE_LABEL: Record<TagScope, string> = { private: 'Só conversas', group: 'Só grupos', all: 'Conversas e grupos' }

const MINUTE = 60_000
const DAY = 86_400_000

/** Situação da conversa calculada pelas mensagens. Ninguém precisa arrastar nada. */
export function conversationStatus(
  contact: Pick<Contact, 'lastMessageAt' | 'lastFromMe'>,
  settings: CommercialSettings,
  now: number,
): ConversationStatus {
  if (!contact.lastMessageAt) return 'em_dia'
  const age = now - Date.parse(contact.lastMessageAt)
  if (age > settings.staleDays * DAY) return 'parada'
  if (contact.lastFromMe === false && age > settings.replySlaMinutes * MINUTE) return 'sem_resposta'
  if (contact.lastFromMe) return 'aguardando_cliente'
  return 'em_dia'
}

export function contactName(contact: Pick<Contact, 'displayName' | 'waName' | 'phone' | 'isGroup' | 'chatJid'>): string {
  return contact.displayName || contact.waName || (contact.phone ? formatPhone(contact.phone) : contact.isGroup ? 'Grupo sem nome' : 'Contato sem nome')
}

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  const local = d.length >= 12 && d.startsWith('55') ? d.slice(2) : d
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return `+${d}`
}

export function formatAgo(iso: string | null, now: number): string {
  if (!iso) return ''
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / MINUTE))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? '1 dia' : `${days} dias`
}

export function formatBRL(cents: number | null): string {
  if (cents === null) return 'Sem valor'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Aceita "1.500", "1500,50" ou "R$ 1.500,00". Devolve centavos ou null. */
export function parseBRL(text: string): number | null {
  const clean = text.replace(/[^\d,.]/g, '')
  if (!clean) return null
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/\.(?=\d{3}(\D|$))/g, '')
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

export type Audience = 'conversas' | 'grupos' | 'todos'

export interface ContactFilters {
  audience: Audience
  status: ConversationStatus | ''
  kind: ContactKind | ''
  tagId: string
  search: string
  showHidden: boolean
}

export const EMPTY_CONTACT_FILTERS: ContactFilters = { audience: 'conversas', status: '', kind: '', tagId: '', search: '', showHidden: false }

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function filterContacts(
  contacts: readonly Contact[],
  filters: ContactFilters,
  settings: CommercialSettings,
  now: number,
  clientName: (id: string) => string | undefined,
): Contact[] {
  const term = fold(filters.search)
  return contacts.filter((c) => {
    if (!filters.showHidden && (c.hidden || c.kind === 'pessoal')) return false
    if (filters.audience === 'conversas' && c.isGroup) return false
    if (filters.audience === 'grupos' && !c.isGroup) return false
    if (filters.kind && c.kind !== filters.kind) return false
    if (filters.tagId && !c.tags.some((t) => t.tagId === filters.tagId)) return false
    if (filters.status && conversationStatus(c, settings, now) !== filters.status) return false
    if (term) {
      const haystack = fold(`${contactName(c)} ${c.phone ?? ''} ${c.clientId ? clientName(c.clientId) ?? '' : ''} ${c.lastPreview ?? ''}`)
      if (!haystack.includes(term)) return false
    }
    return true
  })
}

const STATUS_ORDER: Record<ConversationStatus, number> = { sem_resposta: 0, em_dia: 1, aguardando_cliente: 2, parada: 3 }

/** Sem resposta primeiro (a mais antiga no topo, é a mais urgente). Depois o resto pela mensagem mais nova. */
export function sortContacts(contacts: readonly Contact[], settings: CommercialSettings, now: number): Contact[] {
  return [...contacts].sort((a, b) => {
    const sa = conversationStatus(a, settings, now)
    const sb = conversationStatus(b, settings, now)
    if (sa !== sb) return STATUS_ORDER[sa] - STATUS_ORDER[sb]
    const ta = Date.parse(a.lastMessageAt ?? '1970-01-01')
    const tb = Date.parse(b.lastMessageAt ?? '1970-01-01')
    return sa === 'sem_resposta' ? ta - tb : tb - ta
  })
}

export function countByStatus(contacts: readonly Contact[], settings: CommercialSettings, now: number): Record<ConversationStatus, number> {
  const counts: Record<ConversationStatus, number> = { sem_resposta: 0, aguardando_cliente: 0, parada: 0, em_dia: 0 }
  for (const c of contacts) counts[conversationStatus(c, settings, now)] += 1
  return counts
}

export function isOpenDeal(deal: Pick<Deal, 'stage'>): boolean {
  return deal.stage !== 'ganho' && deal.stage !== 'perdido'
}

export function validateDealTitle(title: string): string | null {
  const clean = title.trim()
  if (clean.length < 3) return 'Dê um nome com pelo menos 3 letras.'
  if (clean.length > 200) return 'Use no máximo 200 caracteres.'
  return null
}

export function validateLostReason(reason: string): string | null {
  return reason.trim().length < 3 ? 'Conte em poucas palavras por que não fechou.' : null
}

export interface SaleTotals {
  confirmedCents: number
  confirmedCount: number
  pendingCents: number
  pendingCount: number
}

/** Faturamento soma só vendas confirmadas. Pendente aparece separado. */
export function saleTotals(sales: readonly Sale[], monthPrefix: string): SaleTotals {
  const totals: SaleTotals = { confirmedCents: 0, confirmedCount: 0, pendingCents: 0, pendingCount: 0 }
  for (const sale of sales) {
    if (!sale.saleDate.startsWith(monthPrefix)) continue
    if (sale.status === 'confirmada') {
      totals.confirmedCents += sale.valueCents
      totals.confirmedCount += 1
    } else if (sale.status === 'pendente') {
      totals.pendingCents += sale.valueCents
      totals.pendingCount += 1
    }
  }
  return totals
}

/** Conversão: ganhos sobre (ganhos + perdidos) fechados no mês. Null sem fechamento. */
export function conversionRate(deals: readonly Deal[], monthPrefix: string): number | null {
  const closed = deals.filter((d) => d.closedAt?.slice(0, 7) === monthPrefix && (d.stage === 'ganho' || d.stage === 'perdido' || d.stage === 'pos_venda'))
  if (closed.length === 0) return null
  const won = closed.filter((d) => d.stage !== 'perdido').length
  return won / closed.length
}

/** Palavras-chave digitadas separadas por vírgula ou linha. */
export function parseKeywords(text: string): string[] {
  return [...new Set(text.split(/[,\n]/).map((k) => fold(k).replace(/[^a-z0-9 *]/g, '').replace(/\*(?!$)/g, '').trim()).filter((k) => k.replace(/\*$/, '').length >= 2))]
}

// ===== Conversa no estilo WhatsApp =====
const RECIFE = 'America/Recife'
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: RECIFE, year: 'numeric', month: '2-digit', day: '2-digit' })

/** "Hoje", "Ontem", dia da semana nos últimos 7 dias ou a data. */
export function dayLabel(iso: string, now = Date.now()): string {
  const day = dayKeyFmt.format(new Date(iso))
  const today = dayKeyFmt.format(new Date(now))
  const yesterday = dayKeyFmt.format(new Date(now - 86_400_000))
  if (day === today) return 'Hoje'
  if (day === yesterday) return 'Ontem'
  const diff = (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86_400_000
  if (diff > 0 && diff < 7) {
    const w = new Intl.DateTimeFormat('pt-BR', { timeZone: RECIFE, weekday: 'long' }).format(new Date(iso))
    return w.charAt(0).toUpperCase() + w.slice(1)
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: RECIFE, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

/** Junta as mensagens por dia, mantendo a ordem. */
export function groupByDay<T extends { sentAt: string }>(messages: readonly T[], now = Date.now()): { day: string; label: string; items: T[] }[] {
  const out: { day: string; label: string; items: T[] }[] = []
  for (const m of messages) {
    const day = dayKeyFmt.format(new Date(m.sentAt))
    const last = out[out.length - 1]
    if (last && last.day === day) last.items.push(m)
    else out.push({ day, label: dayLabel(m.sentAt, now), items: [m] })
  }
  return out
}

/** Iniciais e uma cor fixa por nome, para o avatar sem foto. */
export function avatarOf(name: string): { initials: string; hue: number } {
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  const initials = (parts.length > 1 ? (parts[0]![0] ?? '') + (parts[parts.length - 1]![0] ?? '') : (parts[0] ?? '?').slice(0, 2)).toUpperCase()
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return { initials: initials || '?', hue: h }
}

/** Hora curta da lista: hoje "14:32", ontem "Ontem", depois a data. */
export function listTime(iso: string | null, now = Date.now()): string {
  if (!iso) return ''
  const label = dayLabel(iso, now)
  if (label === 'Hoje') return new Intl.DateTimeFormat('pt-BR', { timeZone: RECIFE, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  if (label === 'Ontem') return label
  return new Intl.DateTimeFormat('pt-BR', { timeZone: RECIFE, day: '2-digit', month: '2-digit' }).format(new Date(iso))
}

export const MEDIA_LABEL: Record<string, string> = { image: 'Foto', video: 'Vídeo', audio: 'Áudio', document: 'Documento', sticker: 'Figurinha', location: 'Localização' }
