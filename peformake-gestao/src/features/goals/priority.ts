// Bete "4 por vez": em vez de despejar 20 coisas, mostra as 4 mais importantes e pergunta se quer as próximas.
// Ordem: dinheiro em risco > cliente insatisfeito ou esperando > algo parado/atrasado > tarefa de hoje > novidade.

export const PAGE = 4

/** 0 dinheiro · 1 cliente · 2 parado/atrasado · 3 hoje · 4 novidade. */
export type Prio = 0 | 1 | 2 | 3 | 4

export const PRIO_LABEL: Record<Prio, string> = { 0: 'Dinheiro', 1: 'Cliente', 2: 'Atrasado', 3: 'Hoje', 4: 'Novidade' }

/** Prioridade de cada tipo de aviso do sininho (o que não está aqui é novidade comum). */
const NOTICE_PRIO: Record<string, Prio> = {
  billing_late: 0, crm_sale_pending: 0, fin_wa_review: 3,
  crm_complaint: 1, crm_nps_detractor: 1, rating_low: 1, content_client_changes_requested: 1, av_client_changes_requested: 1,
  client_answer: 1, crm_new_lead: 1, site_lead: 1, social_request: 1,
  task_waiting: 2, contract_waiting: 2, content_changes_requested: 2,
  content_review: 3, av_review: 3, content_ready: 3,
}
export const noticePrio = (kind: string | undefined): Prio => (kind && kind in NOTICE_PRIO ? NOTICE_PRIO[kind]! : 4)

/** Sem prioridade explícita: urgente conta como atrasado, hoje como hoje, o resto como novidade. */
export function prioOf(i: { prio?: Prio; level: 'urgente' | 'hoje' | 'info' }): Prio {
  if (i.prio !== undefined) return i.prio
  return i.level === 'urgente' ? 2 : i.level === 'hoje' ? 3 : 4
}

const LEVEL_ORDER = { urgente: 0, hoje: 1, info: 2 } as const

/** Mais importante primeiro; no empate, urgente antes; no empate de novo, mantém a ordem de chegada. */
export function byPriority<T extends { prio?: Prio; level: 'urgente' | 'hoje' | 'info' }>(items: readonly T[]): T[] {
  return items.map((x, i) => ({ x, i })).sort((a, b) => prioOf(a.x) - prioOf(b.x) || LEVEL_ORDER[a.x.level] - LEVEL_ORDER[b.x.level] || a.i - b.i).map((v) => v.x)
}

/**
 * Próximo lote: as `size` mais importantes que ainda não foram mostradas.
 * `rest` é quanto ainda sobra depois deste lote (para o "Te mando as próximas 4?").
 */
export function nextBatch<T extends { id: string; prio?: Prio; level: 'urgente' | 'hoje' | 'info' }>(items: readonly T[], shown: ReadonlySet<string>, size = PAGE): { batch: T[]; rest: number } {
  const left = byPriority(items).filter((i) => !shown.has(i.id))
  return { batch: left.slice(0, size), rest: Math.max(0, left.length - size) }
}

/** Lista simples paginada (avisos da semana, pendências, "Precisa de você"): primeiros `pages * size`. */
export function firstPages<T>(list: readonly T[], pages: number, size = PAGE): { shown: T[]; more: number } {
  const n = Math.max(1, pages) * size
  return { shown: list.slice(0, n), more: Math.max(0, list.length - n) }
}

/** Texto do botão "próximas": "Te mando as próximas 4?" ou "a última" quando sobra só uma. */
export function moreLabel(rest: number, size = PAGE): string {
  if (rest <= 0) return ''
  if (rest === 1) return 'Manda a última'
  return `Manda as próximas ${Math.min(size, rest)}`
}
