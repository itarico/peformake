// Regras do Conteúdo (Design + Social Media): etapas, quem pode mover, filtros e calendário.

export type ContentStatus = 'briefing' | 'ready' | 'in_production' | 'review' | 'client_review' | 'changes_requested' | 'approved' | 'published'
export type ContentKind = 'post' | 'carrossel' | 'story' | 'reels' | 'anuncio' | 'impressao' | 'banner' | 'vetor'

/** Campos de cada tipo (content_items.spec). Só o que o tipo usa é preenchido. */
export interface PieceSpec {
  /** Carrossel: para postar ou para criativo de anúncio. */
  purpose?: 'postagem' | 'criativo'
  width?: number
  height?: number
  unit?: 'cm' | 'm' | 'px'
  material?: string
  finishing?: string
  quantity?: number
  /** Vetor: o que vetorizar e formatos pedidos. */
  vectorWhat?: string
  formats?: string[]
}

export interface CarouselSlide { text: string }

export interface ContentItem {
  id: string
  planId: string
  clientId: string
  month: string
  number: number
  kind: ContentKind
  status: ContentStatus
  title: string | null
  headline: string | null
  subtitle: string | null
  cta: string | null
  briefing: string | null
  caption: string | null
  observations: string | null
  referenceLinks: string[]
  carouselSlides: CarouselSlide[]
  spec: PieceSpec
  publishDate: string | null
  deadline: string | null
  /** Hora-limite da entrega do design (prazo de Configurações → Inteligência, gravado quando vai para o design). */
  designDueAt?: string | null
  designerId: string | null
  isExtra: boolean
  revisionNote: string | null
  revisionCount: number
  legacyFinalUrls: string[]
  updatedAt: string
}

export const STATUS_ORDER: ContentStatus[] = ['briefing', 'ready', 'in_production', 'changes_requested', 'review', 'client_review', 'approved', 'published']

export const STATUS_LABEL: Record<ContentStatus, string> = {
  briefing: 'Briefing',
  ready: 'Pronto para produzir',
  in_production: 'Em produção',
  review: 'Revisão interna',
  client_review: 'Com o cliente',
  changes_requested: 'Ajuste pedido',
  approved: 'Aprovado',
  published: 'Publicado',
}

export const STATUS_TONE: Record<ContentStatus, string> = {
  briefing: 'bg-raised text-muted',
  ready: 'bg-accent-soft text-accent-ink',
  in_production: 'bg-accent-soft text-accent-ink',
  review: 'bg-warn-soft text-warn-ink',
  client_review: 'bg-warn-soft text-warn-ink',
  changes_requested: 'bg-warn-soft text-warn-ink',
  approved: 'bg-ok-soft text-ok-ink',
  published: 'bg-ok-soft text-ok-ink',
}

export const KIND_LABEL: Record<ContentKind, string> = {
  post: 'Post',
  carrossel: 'Carrossel',
  story: 'Story',
  reels: 'Reels',
  anuncio: 'Anúncio',
  impressao: 'Impressão',
  banner: 'Banner',
  vetor: 'Vetor',
}

/** Cartões do 1º passo: nome, explicação curta e que formulário o tipo usa. */
export const KIND_CARDS: { kind: ContentKind; label: string; hint: string; form: 'social' | 'carrossel' | 'print' | 'vetor' }[] = [
  { kind: 'post', label: 'Post', hint: 'Feed', form: 'social' },
  { kind: 'carrossel', label: 'Carrossel', hint: 'Várias telas', form: 'carrossel' },
  { kind: 'story', label: 'Story', hint: 'Vertical', form: 'social' },
  { kind: 'reels', label: 'Reels', hint: 'Capa de vídeo', form: 'social' },
  { kind: 'anuncio', label: 'Anúncio', hint: 'Criativo', form: 'social' },
  { kind: 'impressao', label: 'Impressão', hint: 'Flyer, cardápio, cartão', form: 'print' },
  { kind: 'banner', label: 'Banner', hint: 'Adesivo, lona', form: 'print' },
  { kind: 'vetor', label: 'Vetor', hint: 'Logo, arte vetorizada', form: 'vetor' },
]

export function formOf(kind: ContentKind): 'social' | 'carrossel' | 'print' | 'vetor' {
  return KIND_CARDS.find((c) => c.kind === kind)?.form ?? 'social'
}

/** Tamanhos comuns para impressão e banner (largura × altura). */
export const SIZE_PRESETS: Record<'impressao' | 'banner', { label: string; width: number; height: number; unit: 'cm' | 'm' }[]> = {
  impressao: [
    { label: 'A4', width: 21, height: 29.7, unit: 'cm' },
    { label: 'A5', width: 14.8, height: 21, unit: 'cm' },
    { label: 'Cartão', width: 9, height: 5, unit: 'cm' },
    { label: 'Flyer 10×15', width: 10, height: 15, unit: 'cm' },
  ],
  banner: [
    { label: '1×2 m', width: 1, height: 2, unit: 'm' },
    { label: '0,8×1,2 m', width: 0.8, height: 1.2, unit: 'm' },
    { label: '3×1 m', width: 3, height: 1, unit: 'm' },
    { label: 'Adesivo 10×10', width: 10, height: 10, unit: 'cm' },
  ],
}
export const MATERIALS: Record<'impressao' | 'banner', string[]> = {
  impressao: ['Papel couché', 'Papel offset', 'Papel kraft', 'Cartão 300 g'],
  banner: ['Lona', 'Adesivo vinil', 'Adesivo perfurado', 'PVC'],
}
export const VECTOR_FORMATS = ['AI', 'PDF', 'SVG', 'EPS', 'PNG'] as const

/** Resumo de uma linha do que é específico do tipo (cartão da peça e fila do design). */
export function specSummary(item: Pick<ContentItem, 'kind' | 'spec' | 'carouselSlides'>): string | null {
  const s = item.spec ?? {}
  const f = formOf(item.kind)
  if (f === 'carrossel') {
    const n = item.carouselSlides?.length ?? 0
    return [n ? `${n} telas` : null, s.purpose === 'criativo' ? 'para anúncio' : s.purpose === 'postagem' ? 'para postar' : null].filter(Boolean).join(' · ') || null
  }
  if (f === 'print') {
    const num = (v: number) => String(v).replace('.', ',')
    return [s.width && s.height ? `${num(s.width)}×${num(s.height)} ${s.unit ?? 'cm'}` : null, s.material, s.quantity ? `${s.quantity} un.` : null].filter(Boolean).join(' · ') || null
  }
  if (f === 'vetor') return [s.vectorWhat, s.formats?.length ? s.formats.join(', ') : null].filter(Boolean).join(' · ') || null
  return null
}

export interface Actor {
  planner: boolean
  designer: boolean
}

export interface StatusAction {
  to: ContentStatus
  label: string
  needsNote?: boolean
  primary?: boolean
}

// O próximo passo de cada etapa, para quem pode dar o passo. Erros de regra o banco repete.
export function actionsFor(item: Pick<ContentItem, 'status'>, actor: Actor, hasFinal: boolean): StatusAction[] {
  const a: StatusAction[] = []
  const { planner, designer } = actor
  switch (item.status) {
    case 'briefing':
      if (planner) a.push({ to: 'ready', label: 'Mandar para o design', primary: true })
      break
    case 'ready':
    case 'changes_requested':
      if (planner || designer) a.push({ to: 'in_production', label: 'Começar a produzir', primary: true })
      if (planner && item.status === 'ready') a.push({ to: 'briefing', label: 'Voltar para briefing' })
      break
    case 'in_production':
      // Decisão do Italo (12/11): o design entrega direto ao cliente; a revisão interna fica opcional para a social.
      if (planner || designer) a.push({ to: 'client_review', label: hasFinal ? 'Entregar ao cliente' : 'Envie a arte para entregar', primary: hasFinal })
      if (planner) a.push({ to: 'review', label: 'Revisar antes do cliente' })
      break
    case 'review':
      if (planner) {
        a.push({ to: 'client_review', label: 'Mandar para o cliente', primary: true })
        a.push({ to: 'approved', label: 'Aprovar sem o cliente' })
        a.push({ to: 'changes_requested', label: 'Pedir ajuste', needsNote: true })
      }
      break
    case 'client_review':
      if (planner) {
        a.push({ to: 'approved', label: 'Cliente aprovou', primary: true })
        a.push({ to: 'changes_requested', label: 'Cliente pediu ajuste', needsNote: true })
      }
      break
    case 'approved':
      if (planner) {
        a.push({ to: 'published', label: 'Marcar como publicado', primary: true })
        a.push({ to: 'changes_requested', label: 'Reabrir para ajuste', needsNote: true })
      }
      break
    case 'published':
      break
  }
  return a
}

// Quem tem a vez: quem precisa agir agora em cada etapa.
export function waitingOn(status: ContentStatus): 'social' | 'design' | 'client' | null {
  if (status === 'briefing' || status === 'review') return 'social'
  if (status === 'ready' || status === 'in_production' || status === 'changes_requested') return 'design'
  if (status === 'client_review') return 'client'
  return null
}

export interface ContentFilters {
  clientId: string
  designerId: string
  status: ContentStatus | ''
  query: string
}
export const EMPTY_FILTERS: ContentFilters = { clientId: '', designerId: '', status: '', query: '' }

export function filterItems(items: readonly ContentItem[], f: ContentFilters, clientName: (id: string) => string): ContentItem[] {
  const q = f.query.trim().toLocaleLowerCase('pt-BR')
  return items.filter((i) =>
    (!f.clientId || i.clientId === f.clientId)
    && (!f.designerId || (f.designerId === 'none' ? i.designerId === null : i.designerId === f.designerId))
    && (!f.status || i.status === f.status)
    && (!q || `${i.title ?? ''} ${i.headline ?? ''} ${clientName(i.clientId)}`.toLocaleLowerCase('pt-BR').includes(q)))
}

export function isLate(item: Pick<ContentItem, 'deadline' | 'status'>, today: string): boolean {
  return !!item.deadline && item.deadline < today && !['approved', 'published', 'client_review'].includes(item.status)
}

export function itemTitle(item: Pick<ContentItem, 'title' | 'headline' | 'number'>): string {
  return item.title?.trim() || item.headline?.trim() || `Peça ${item.number}`
}

export function briefingMissing(item: Pick<ContentItem, 'title' | 'briefing' | 'headline'>): string | null {
  if (!item.title?.trim()) return 'Falta o título.'
  if (!item.briefing?.trim() && !item.headline?.trim()) return 'Falta o briefing ou a chamada.'
  return null
}

// Grade do mês: semanas de segunda a domingo, com dias de fora do mês como null.
export function monthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const first = new Date(Date.UTC(y, m - 1, 1))
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const offset = (first.getUTCDay() + 6) % 7
  const cells: (string | null)[] = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= days; d++) cells.push(`${month.slice(0, 8)}${String(d).padStart(2, '0')}`)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export interface PlanSummary {
  total: number
  noBriefing: number
  inDesign: number
  waitingClient: number
  approved: number
  late: number
}

export function summarize(items: readonly ContentItem[], today: string): PlanSummary {
  return {
    total: items.length,
    noBriefing: items.filter((i) => i.status === 'briefing').length,
    inDesign: items.filter((i) => waitingOn(i.status) === 'design').length,
    waitingClient: items.filter((i) => i.status === 'client_review').length,
    approved: items.filter((i) => i.status === 'approved' || i.status === 'published').length,
    late: items.filter((i) => isLate(i, today)).length,
  }
}

const SAFE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mov', 'pdf', 'webm', 'mp3']
const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', mov: 'video/quicktime', pdf: 'application/pdf', webm: 'audio/webm', mp3: 'audio/mpeg',
}

export function fileCheck(name: string, size: number): { ext: string; mime: string } | string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (!SAFE_EXT.includes(ext)) return 'Formato não aceito. Use imagem, vídeo, PDF ou áudio.'
  if (size > 50 * 1024 * 1024) return 'Arquivo acima de 50 MB.'
  if (size <= 0) return 'Arquivo vazio.'
  return { ext: ext === 'jpeg' ? 'jpg' : ext, mime: MIME_BY_EXT[ext] as string }
}

/** No quadro só entra peça com briefing lançado (pedido do Italo, 12/11). Peça vazia fica só na pauta do mês. */
export function onBoard(item: Pick<ContentItem, 'status' | 'briefing'>): boolean {
  return item.status !== 'briefing' || !!item.briefing?.trim()
}

/** Fila do design: peças que estão com o designer agora. */
export const DESIGN_QUEUE: ContentStatus[] = ['changes_requested', 'ready', 'in_production']

/** Hora-alvo da entrega: a hora-limite gravada; senão o prazo do design às 18h; senão a publicação às 9h (Recife). */
export function deliveryTarget(item: Pick<ContentItem, 'deadline' | 'publishDate' | 'designDueAt'>): string | null {
  if (item.designDueAt) return item.designDueAt
  if (item.deadline) return `${item.deadline}T18:00:00-03:00`
  if (item.publishDate) return `${item.publishDate}T09:00:00-03:00`
  return null
}

/** Ordem da fila: as minhas primeiro, depois ajuste pedido, depois a entrega mais próxima. */
export function designQueue<T extends Pick<ContentItem, 'status' | 'designerId' | 'deadline' | 'publishDate' | 'designDueAt'>>(items: readonly T[], myStaffId: string | null): T[] {
  return items.filter((i) => DESIGN_QUEUE.includes(i.status)).sort((a, b) => {
    const mine = Number(b.designerId === myStaffId && !!myStaffId) - Number(a.designerId === myStaffId && !!myStaffId)
    if (mine) return mine
    const adj = Number(b.status === 'changes_requested') - Number(a.status === 'changes_requested')
    if (adj) return adj
    return (deliveryTarget(a) ?? '9999').localeCompare(deliveryTarget(b) ?? '9999')
  })
}

/** Primeiras palavras do briefing para o cartão da fila. */
export function shortBriefing(item: Pick<ContentItem, 'briefing' | 'headline'>, max = 140): string {
  const t = (item.briefing?.trim() || item.headline?.trim() || '').replace(/\s+/g, ' ')
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}
