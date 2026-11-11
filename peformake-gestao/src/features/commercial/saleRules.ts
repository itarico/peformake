// Regras da "Nova venda" (sem tela): conta do item, validação do cliente novo e filtros da lista de vendas.
// O banco recalcula tudo pelo catálogo (sale_create); aqui é só para mostrar o total antes de confirmar.
import type { Service } from '@/features/catalog/ServiceCatalog'
import type { Sale, SaleStatus } from './commercialRules'

export type SaleKind = 'avulso' | 'recorrente'
export type DiscountType = '' | 'percent' | 'fixed'

export interface SaleItemDraft {
  key: string
  serviceId: string
  variantId: string
  quantity: number
  extras: Record<string, number>
  discountType: DiscountType
  discount: string
  kind: SaleKind
  /** Preço diferente do catálogo: só quem edita o catálogo (admin). Vazio = catálogo. */
  price: string
  /** Veio de um pacote: o preço é o do pacote. */
  packageId?: string | null
}

export interface ItemTotals { base: number; line: number; extras: number; discount: number; total: number; needsVariant: boolean }

const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.')) || 0
/** "1.500,50" ou "1500.5" viram número. */
export function parseMoney(s: string): number {
  const t = s.trim()
  if (!t) return 0
  return /,/.test(t) ? num(t) : Number(t) || 0
}

export function newItem(service: Service, key: string): SaleItemDraft {
  return { key, serviceId: service.id, variantId: '', quantity: 1, extras: {}, discountType: '', discount: '', kind: defaultKind(service), price: '' }
}

/** Serviço cobrado por mês nasce Recorrente; o resto (projeto, unidade, hora, diária) nasce Avulso. */
export function defaultKind(service: Pick<Service, 'unit'>): SaleKind {
  return service.unit === 'mês' ? 'recorrente' : 'avulso'
}

export function unitOf(service: Pick<Service, 'area'>): 'peformake' | 'ellcazo' {
  return service.area === 'audiovisual' ? 'ellcazo' : 'peformake'
}

export function itemTotals(item: SaleItemDraft, service: Service | undefined): ItemTotals {
  if (!service) return { base: 0, line: 0, extras: 0, discount: 0, total: 0, needsVariant: false }
  const variants = service.options.filter((o) => o.kind === 'variacao')
  const variant = variants.find((v) => v.id === item.variantId)
  const catalog = variant ? Number(variant.price ?? 0) : variants.length > 0 ? 0 : Number(service.price ?? 0)
  const base = item.price.trim() ? parseMoney(item.price) : catalog
  const qty = Math.max(1, Math.min(999, Math.round(item.quantity) || 1))
  const line = round(base * qty)
  const extras = round(service.options.filter((o) => o.kind === 'extra').reduce((a, e) => a + Number(e.price ?? 0) * (item.extras[e.id] ?? 0), 0))
  const d = parseMoney(item.discount)
  const discount = item.discountType === 'percent' ? round((line + extras) * Math.min(100, Math.max(0, d)) / 100)
    : item.discountType === 'fixed' ? Math.min(line + extras, Math.max(0, d)) : 0
  return { base, line, extras, discount, total: Math.max(0, round(line + extras - discount)), needsVariant: variants.length > 0 && !variant }
}

const round = (n: number) => Math.round(n * 100) / 100

/** Texto curto do item: "Vídeo · Com drone × 2". */
export function itemLabel(item: SaleItemDraft, service: Service | undefined): string {
  if (!service) return 'Serviço'
  const v = service.options.find((o) => o.id === item.variantId)
  return `${service.name}${v ? ` · ${v.name}` : ''}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`
}

/** 1ª mensalidade: mês seguinte ao início (regra do Italo). Devolve "dez/2026". */
export function firstBillingMonth(start: string): string {
  const [y, m] = start.split('-').map(Number)
  if (!y || !m) return ''
  const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return m === 12 ? `jan/${y + 1}` : `${names[m]}/${y}`
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export interface NewClientDraft { company: string; person: string; phone: string; email: string }
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Mesmas regras do cadastro rápido (Novo cliente). Empresa vazia = pessoa física. */
export function validateNewClient(d: NewClientDraft): Partial<Record<keyof NewClientDraft, string>> {
  const out: Partial<Record<keyof NewClientDraft, string>> = {}
  const digits = d.phone.replace(/\D/g, '')
  if (d.person.trim().length < 2) out.person = 'Digite o nome do responsável.'
  if (d.company.trim() && d.company.trim().length < 2) out.company = 'Nome curto demais.'
  if (!digits) out.phone = 'O WhatsApp é obrigatório.'
  else if (digits.length < 10 || digits.length > 13) out.phone = 'Use DDD e número, ex.: (81) 98888-7777.'
  if (d.email.trim() && !EMAIL.test(d.email.trim())) out.email = 'E-mail incompleto.'
  return out
}

export type SaleTag = 'ativo' | 'inativo' | 'perdido' | 'lead' | 'ganho'
export const SALE_TAG_LABEL: Record<SaleTag, string> = { ativo: 'Cliente ativo', inativo: 'Cliente inativo', perdido: 'Perdido', lead: 'Lead', ganho: 'Lead ganho' }

export interface SaleListFilters { q: string; status: '' | SaleStatus; kind: '' | SaleKind; unit: '' | 'peformake' | 'ellcazo' }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Busca por nome do cliente ou do que foi vendido, mais filtros de situação, tipo e empresa. */
export function filterSales(sales: readonly Sale[], f: SaleListFilters, label: (s: Sale) => string): Sale[] {
  const q = fold(f.q.trim())
  return sales.filter((s) =>
    (!f.status || s.status === f.status)
    && (!f.kind || (s.kind ?? 'avulso') === f.kind)
    && (!f.unit || s.unit === f.unit)
    && (!q || fold(`${label(s)} ${s.description}`).includes(q)))
}

// ---------- Completar venda (sugerida pelo agente ou antiga, sem serviço/empresa/tipo) ----------

/** Venda sem itens: precisa escolher o serviço antes de confirmar (ou, se já confirmada, para gerar a cobrança). */
export function needsCompletion(s: Pick<Sale, 'status' | 'hasItems' | 'billed'>): boolean {
  return (s.status === 'pendente' || s.status === 'confirmada') && s.hasItems === false && !s.billed
}

/** Já confirmada e nada foi para o Financeiro: selo "Sem cobrança — completar". */
export function confirmedWithoutBilling(s: Pick<Sale, 'status' | 'hasItems' | 'billed'>): boolean {
  return s.status === 'confirmada' && needsCompletion(s)
}

const AUDIOVISUAL = /(foto|fotogr|video|capta|filmag|drone|cobertura|edica|grava|ensaio|making|reels?)/

/**
 * Sugere o serviço do catálogo pelo texto da venda ("Cobertura fotográfica..." → serviço de foto da Ellcazo).
 * Conta as palavras da descrição que aparecem no nome do serviço (pelo começo da palavra);
 * texto de foto/vídeo dá preferência ao audiovisual (Ellcazo). Sem nada parecido: null.
 */
export function suggestService<S extends Pick<Service, 'id' | 'name' | 'area'>>(description: string, services: readonly S[]): S | null {
  const text = fold(description)
  const words = text.split(/[^a-z0-9]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 5))
  const av = AUDIOVISUAL.test(text)
  let best: S | null = null
  let bestScore = 0
  for (const s of services) {
    const name = fold(s.name)
    let score = words.reduce((a, w) => a + (name.includes(w) ? 2 : 0), 0)
    if (score > 0 && av && s.area === 'audiovisual') score += 1
    if (score > bestScore) { best = s; bestScore = score }
  }
  if (!best && av) best = services.find((s) => s.area === 'audiovisual') ?? null
  return best
}

/** Centavos viram "600,00" para o campo de valor. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
