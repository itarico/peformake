// Regras do Conteúdo (Design + Social Media): etapas, quem pode mover, filtros e calendário.

export type ContentStatus = 'briefing' | 'ready' | 'in_production' | 'review' | 'client_review' | 'changes_requested' | 'approved' | 'published'
export type ContentKind = 'post' | 'carrossel' | 'story' | 'reels' | 'anuncio'

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
  publishDate: string | null
  deadline: string | null
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
      if (planner || designer) a.push({ to: 'review', label: hasFinal ? 'Enviar para revisão' : 'Envie a arte para revisar', primary: hasFinal })
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
