// Regras do Audiovisual: etapas, quem pode mover e agenda de captação.

export type AvStatus = 'script' | 'scheduled' | 'captured' | 'editing' | 'review' | 'client_review' | 'changes_requested' | 'approved' | 'delivered' | 'cancelled'

export interface AvProject {
  id: string
  clientId: string
  kind: 'monthly' | 'project'
  month: string | null
  title: string
  status: AvStatus
  briefing: string | null
  script: string | null
  videoCount: number
  format: string | null
  referenceLinks: string[]
  shootAt: string | null
  shootEndAt: string | null
  location: string | null
  shootNotes: string | null
  videomakerId: string | null
  editorId: string | null
  rawLink: string | null
  finalLink: string | null
  dueDate: string | null
  revisionNote: string | null
  revisionCount: number
  updatedAt: string
  // Audiovisual 2.0
  scriptStatus: 'rascunho' | 'enviado' | 'aprovado' | 'ajuste'
  scriptNote: string | null
  shootDurationMin: number | null
  scriptwriterId: string | null
  ownerId: string | null
  shootConfirmedAt: string | null
  checkinAt: string | null
  checkinDistanceM: number | null
  checkoutAt: string | null
  rawSentAt: string | null
  rawLinks: { kind: string; url: string; note?: string }[]
  editDueAt: string | null
  staffToken: string | null
  googleEventId: string | null
  locationLat: number | null
  locationLng: number | null
}

export const AV_ORDER: AvStatus[] = ['script', 'scheduled', 'captured', 'editing', 'changes_requested', 'review', 'client_review', 'approved', 'delivered', 'cancelled']

export const AV_LABEL: Record<AvStatus, string> = {
  script: 'Roteiro',
  scheduled: 'Captação marcada',
  captured: 'Captado',
  editing: 'Em edição',
  review: 'Revisão interna',
  client_review: 'Com o cliente',
  changes_requested: 'Ajuste pedido',
  approved: 'Aprovado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const AV_TONE: Record<AvStatus, string> = {
  script: 'bg-raised text-muted',
  scheduled: 'bg-accent-soft text-accent-ink',
  captured: 'bg-accent-soft text-accent-ink',
  editing: 'bg-accent-soft text-accent-ink',
  review: 'bg-warn-soft text-warn-ink',
  client_review: 'bg-warn-soft text-warn-ink',
  changes_requested: 'bg-warn-soft text-warn-ink',
  approved: 'bg-ok-soft text-ok-ink',
  delivered: 'bg-ok-soft text-ok-ink',
  cancelled: 'bg-raised text-muted',
}

// As 10 etapas agrupadas em 5 fases de produtora, para o quadro caber na tela sem rolar para o lado.
export type AvPhase = 'pre' | 'shoot' | 'edit' | 'approval' | 'done'
export const AV_PHASES: { key: AvPhase; label: string; hint: string; statuses: AvStatus[] }[] = [
  { key: 'pre', label: 'Pré-produção', hint: 'Briefing e roteiro', statuses: ['script'] },
  { key: 'shoot', label: 'Captação', hint: 'Marcada ou já gravada', statuses: ['scheduled', 'captured'] },
  { key: 'edit', label: 'Edição', hint: 'Montagem e ajustes', statuses: ['editing', 'changes_requested'] },
  { key: 'approval', label: 'Aprovação', hint: 'Revisão interna e cliente', statuses: ['review', 'client_review'] },
  { key: 'done', label: 'Entregue', hint: 'Aprovado e entregue', statuses: ['approved', 'delivered'] },
]
export function phaseOf(s: AvStatus): AvPhase | null {
  return AV_PHASES.find((p) => p.statuses.includes(s))?.key ?? null
}

// Projeto parado de um mês anterior que ainda não foi entregue: vai para "Pendências", não polui o mês atual.
export function isBacklog(p: Pick<AvProject, 'month' | 'status'>, month: string): boolean {
  return !!p.month && p.month < month && !['delivered', 'cancelled', 'approved'].includes(p.status)
}

// Iniciais para o selo de equipe no cartão.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? ''))).toUpperCase()
}

export interface AvActor {
  manager: boolean
  videomaker: boolean
  editor: boolean
}

export interface AvAction {
  to: AvStatus
  label: string
  needsNote?: boolean
  primary?: boolean
  // Campo que precisa estar preenchido antes.
  requires?: 'shootAt' | 'rawLink' | 'finalLink'
}

export function avActionsFor(p: Pick<AvProject, 'status'>, a: AvActor): AvAction[] {
  const out: AvAction[] = []
  switch (p.status) {
    case 'script':
      if (a.manager) out.push({ to: 'scheduled', label: 'Marcar captação', primary: true, requires: 'shootAt' })
      break
    case 'scheduled':
      if (a.manager || a.videomaker) out.push({ to: 'captured', label: 'Material captado', primary: true, requires: 'rawLink' })
      if (a.manager) out.push({ to: 'script', label: 'Voltar para roteiro' })
      break
    case 'captured':
    case 'changes_requested':
      if (a.manager || a.editor) out.push({ to: 'editing', label: 'Começar edição', primary: true })
      break
    case 'editing':
      if (a.manager || a.editor) out.push({ to: 'review', label: 'Enviar para revisão', primary: true, requires: 'finalLink' })
      break
    case 'review':
      if (a.manager) {
        out.push({ to: 'client_review', label: 'Mandar para o cliente', primary: true })
        out.push({ to: 'approved', label: 'Aprovar sem o cliente' })
        out.push({ to: 'changes_requested', label: 'Pedir ajuste', needsNote: true })
      }
      break
    case 'client_review':
      if (a.manager) {
        out.push({ to: 'approved', label: 'Cliente aprovou', primary: true })
        out.push({ to: 'changes_requested', label: 'Cliente pediu ajuste', needsNote: true })
      }
      break
    case 'approved':
      if (a.manager) out.push({ to: 'delivered', label: 'Marcar como entregue', primary: true })
      break
    case 'delivered':
    case 'cancelled':
      break
  }
  if (a.manager && p.status !== 'cancelled' && p.status !== 'delivered') out.push({ to: 'cancelled', label: 'Cancelar' })
  if (a.manager && p.status === 'cancelled') out.push({ to: 'script', label: 'Reabrir' })
  return out
}

export function missingFor(action: AvAction, p: Pick<AvProject, 'shootAt' | 'rawLink' | 'finalLink'>): string | null {
  if (action.requires === 'shootAt' && !p.shootAt) return 'Preencha a data da captação e salve.'
  if (action.requires === 'rawLink' && !p.rawLink) return 'Coloque o link do material bruto e salve.'
  if (action.requires === 'finalLink' && !p.finalLink) return 'Coloque o link do vídeo final e salve.'
  return null
}

// Próximas captações, da mais próxima para a mais distante.
export function upcomingShoots(list: readonly AvProject[], now: Date, days = 14): AvProject[] {
  const until = now.getTime() + days * 86_400_000
  return list
    .filter((p) => p.shootAt && p.status !== 'cancelled' && new Date(p.shootAt).getTime() >= now.getTime() - 6 * 3_600_000 && new Date(p.shootAt).getTime() <= until)
    .sort((a, b) => (a.shootAt as string).localeCompare(b.shootAt as string))
}

export function isAvLate(p: Pick<AvProject, 'dueDate' | 'status'>, today: string): boolean {
  return !!p.dueDate && p.dueDate < today && ['captured', 'editing', 'changes_requested'].includes(p.status)
}

export function shootText(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

// Converte o horário de Brasília do campo datetime-local em ISO e de volta.
export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(new Date(iso).getTime() - 3 * 3_600_000)
  return d.toISOString().slice(0, 16)
}
export function fromLocalInput(value: string): string {
  return value ? new Date(`${value}:00-03:00`).toISOString() : ''
}


// ===== Audiovisual 2.0: etapas do quadro de Produção =====
export type AvStage = 'roteiro' | 'aguardando' | 'captacao' | 'edicao' | 'interna' | 'cliente' | 'entregue'
export const AV_STAGES: { key: AvStage; label: string; hint: string }[] = [
  { key: 'roteiro', label: 'Roteiro', hint: 'Escrever e aprovar' },
  { key: 'aguardando', label: 'Aguardando captação', hint: 'Roteiro aprovado, data marcada' },
  { key: 'captacao', label: 'Captação', hint: 'Gravando ou mandando o bruto' },
  { key: 'edicao', label: 'Edição', hint: 'Montagem e ajustes' },
  { key: 'interna', label: 'Aprovação interna', hint: 'Responsável revisa' },
  { key: 'cliente', label: 'Aprovação do cliente', hint: 'No portal do cliente' },
]
export function stageOf(p: Pick<AvProject, 'status' | 'scriptStatus' | 'checkinAt' | 'rawSentAt'>): AvStage | null {
  switch (p.status) {
    case 'script': return 'roteiro'
    case 'scheduled': return p.checkinAt && !p.rawSentAt ? 'captacao' : 'aguardando'
    case 'captured': return 'captacao'
    case 'editing': case 'changes_requested': return 'edicao'
    case 'review': return 'interna'
    case 'client_review': return 'cliente'
    case 'approved': case 'delivered': return 'entregue'
    default: return null
  }
}

/** Cronômetro: quanto falta e a cor (vermelho perto ou passou, amarelo no meio, verde longe). */
export function countdown(target: string | null, now: number): { text: string; tone: 'red' | 'yellow' | 'green' } | null {
  if (!target) return null
  const diff = new Date(target).getTime() - now
  const abs = Math.abs(diff)
  const h = Math.floor(abs / 3_600_000)
  const m = Math.floor((abs % 3_600_000) / 60_000)
  const days = Math.floor(h / 24)
  const day = (t: number) => new Date(t).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const sameDay = day(new Date(target).getTime()) === day(now)
  const span = days >= 1 && !sameDay ? `${days} ${days === 1 ? 'dia' : 'dias'}` : h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m} min`
  if (diff < 0) return { text: `atrasado ${span}`, tone: 'red' }
  const tone = diff <= 24 * 3_600_000 ? 'red' : diff <= 72 * 3_600_000 ? 'yellow' : 'green'
  return { text: sameDay ? `hoje, em ${span}` : `em ${span}`, tone }
}

/** Alvo do cronômetro em cada etapa. */
export function countdownTarget(p: Pick<AvProject, 'status' | 'shootAt' | 'editDueAt' | 'scriptStatus' | 'checkinAt' | 'rawSentAt'>): string | null {
  const st = stageOf(p)
  if (st === 'roteiro' || st === 'aguardando') return p.shootAt
  if (st === 'edicao') return p.editDueAt
  return null
}

export const SCRIPT_LABEL: Record<AvProject['scriptStatus'], string> = { rascunho: 'Roteiro em rascunho', enviado: 'Roteiro com o cliente', aprovado: 'Roteiro aprovado', ajuste: 'Cliente pediu ajuste no roteiro' }

/** Lê latitude e longitude de um link do Google Maps (…/@-8.05,-34.9,17z ou ?q=-8.05,-34.9) ou de "lat, lng". */
export function coordsFromMapsLink(text: string): { lat: number; lng: number } | null {
  const m = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(text) ?? /[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(text) ?? /^\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\s*$/.exec(text)
  if (!m) return null
  const lat = Number(m[1]); const lng = Number(m[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

/** No quadro só entra o que já tem gravação agendada (pedido do Italo, 12/11). Roteiro sem data fica em "Sem data". */
export function onBoard(p: Pick<AvProject, 'status' | 'shootAt'>): boolean {
  return p.status !== 'script' || !!p.shootAt
}
