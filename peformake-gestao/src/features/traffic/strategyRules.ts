// Regras de tela da estratégia do mês: etapa, prazo do direcionamento e destino de cada item.

export type Destination = 'design' | 'social' | 'audiovisual' | 'traffic' | 'client' | 'internal'
export type Stage = 'none' | 'preparing' | 'review' | 'approved' | 'sent'

export const DESTINATION_LABEL: Record<Destination, string> = {
  design: 'Design',
  social: 'Social media',
  audiovisual: 'Audiovisual',
  traffic: 'Tráfego',
  client: 'Cliente',
  internal: 'Interno',
}

/** O que acontece ao aprovar, para o botão dizer a verdade. */
export const DESTINATION_ACTION: Record<Destination, string> = {
  design: 'vira arte para o design',
  social: 'vira pauta da social media',
  audiovisual: 'vira roteiro no audiovisual',
  traffic: 'vira tarefa do tráfego',
  client: 'vira tarefa de atendimento',
  internal: 'vira tarefa interna',
}

export const STAGE_LABEL: Record<Stage, string> = {
  none: 'Sem estratégia',
  preparing: 'Agente preparando',
  review: 'Para revisar',
  approved: 'Aprovada',
  sent: 'Enviada ao cliente',
}

export interface StageInput {
  strategy: { status: 'draft' | 'approved' | 'sent'; updatedAt: string } | null
  request: { status: 'queued' | 'done' | 'failed'; requestedAt: string } | null
}

const PREPARING_WINDOW_MS = 30 * 60 * 1000

/** Pedido na fila, recente e mais novo que a estratégia: o agente está trabalhando. */
export function isPreparing({ strategy, request }: StageInput, now: Date): boolean {
  if (!request || request.status !== 'queued') return false
  if (now.getTime() - new Date(request.requestedAt).getTime() > PREPARING_WINDOW_MS) return false
  return !strategy || request.requestedAt > strategy.updatedAt
}

export function stageOf(input: StageInput, now: Date): Stage {
  if (isPreparing(input, now)) return 'preparing'
  if (!input.strategy) return 'none'
  if (input.strategy.status === 'sent') return 'sent'
  if (input.strategy.status === 'approved') return 'approved'
  return 'review'
}

/** O direcionamento vale até o dia 14 do mês anterior ao mês da estratégia. */
export function directionDeadline(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
  return `${prev.y}-${String(prev.m).padStart(2, '0')}-14`
}

export function deadlineText(today: string, month: string): { text: string; late: boolean } {
  const deadline = directionDeadline(month)
  const days = Math.round((Date.parse(deadline) - Date.parse(today)) / 86_400_000)
  const br = `${deadline.slice(8)}/${deadline.slice(5, 7)}`
  if (days < 0) return { text: `Prazo era ${br}. Salvar agora faz o agente refazer a estratégia.`, late: true }
  if (days === 0) return { text: 'Prazo é hoje. O agente gera amanhã às 8h.', late: false }
  return { text: `Preencha até ${br} (faltam ${days} ${days === 1 ? 'dia' : 'dias'}). O agente gera no dia 15 às 8h.`, late: false }
}

/** Para onde o item aprovado foi, para abrir direto. */
export function routedLink(table: string | null, id: string | null): string | null {
  if (!table || !id) return null
  if (table === 'content_items') return `/conteudo/peca/${id}`
  if (table === 'av_projects') return `/audiovisual/projeto/${id}`
  if (table === 'traffic_tasks') return '/trafego/tarefas'
  return null
}

export function decisionCounts(items: readonly { status: 'proposed' | 'approved' | 'rejected' }[]) {
  return {
    total: items.length,
    proposed: items.filter((i) => i.status === 'proposed').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  }
}

/** Meses que dá para planejar: dois para trás, o atual e dois à frente. */
export function monthOptions(today: string): string[] {
  const [y, m] = today.split('-').map(Number) as [number, number]
  return [-2, -1, 0, 1, 2].map((offset) => {
    const d = new Date(Date.UTC(y, m - 1 + offset, 1))
    return d.toISOString().slice(0, 10)
  })
}
