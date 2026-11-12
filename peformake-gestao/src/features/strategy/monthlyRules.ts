// Regras da Estratégia do mês (Consultoria): meses, semanas, áreas e o que mostrar em cada ação.
// As semanas do mês seguem a função monthly-strategy: 1 = dias 1 a 7, 2 = 8 a 14, 3 = 15 a 21, 4 = 22 ao fim.

export type MonthlyStatus = 'na_fila' | 'gerando' | 'pronto' | 'aprovado' | 'erro' | 'limite'
export type ActionArea = 'trafego' | 'social' | 'design' | 'audiovisual' | 'vendas' | 'atendimento'

export interface MonthlyAction {
  id: string; week: 1 | 2 | 3 | 4; area: ActionArea; title: string; what: string; place: string | null; owner_role: string | null
  due_date: string | null; proof: string | null; why: string | null; format: string | null; status: 'proposta' | 'aprovada' | 'recusada'
  routed_table: string | null; routed_id: string | null; routed_link: string | null
  suggestion: { titulo?: string; o_que?: string; porque?: string } | null; done: boolean | null
  /** Adicionada pela equipe na revisão (o link público manda assim). */
  added?: boolean
}
export interface MonthlyDoc {
  titulo?: string; situacao?: string; foco?: string
  meta?: { texto?: string; numero?: string; como_medir?: string }
  leitura?: { fato: string; numero: string; decisao: string }[]
  metas_area?: { area: ActionArea; meta: string; numero: string }[]
  semanas?: { semana: number; tema: string; objetivo: string; datas: string[] }[]
  ofertas?: { nome: string; condicao: string; porque: string }[]
  riscos?: { risco: string; plano_b: string }[]
  perguntas?: string[]
  gerado_em?: string
}
export interface MonthlyStrategy {
  id: string; client_id: string; month: string; status: MonthlyStatus; stage: string; error: string | null
  doc: MonthlyDoc; ideas: string | null; cost_usd: number | null
  adjust: { semana?: number; mudou?: boolean; resumo?: string; trocas?: number } | null; adjusted_at: string | null
  finished_at: string | null; approved_at: string | null; updated_at: string | null
  /** O que quem está vendo pode decidir (admin/head: tudo; cada área: a sua). */
  can?: { all?: boolean; trafego?: boolean; social?: boolean; audiovisual?: boolean }
  actions: MonthlyAction[]
}

export const AREA: Record<ActionArea, { label: string; color: string; queue: string }> = {
  trafego: { label: 'Tráfego', color: '#1f77b4', queue: 'Tarefas de tráfego' },
  social: { label: 'Social', color: '#d6336c', queue: 'Pautas do Social' },
  design: { label: 'Design', color: '#7048e8', queue: 'Fila do designer' },
  audiovisual: { label: 'Audiovisual', color: '#e8590c', queue: 'Roteiros do Audiovisual' },
  vendas: { label: 'Vendas', color: '#2b8a3e', queue: 'Tarefas de atendimento' },
  atendimento: { label: 'Atendimento', color: '#5c7080', queue: 'Tarefas de atendimento' },
}
export const AREA_ORDER: ActionArea[] = ['trafego', 'social', 'design', 'audiovisual', 'vendas', 'atendimento']

const pad = (n: number) => String(n).padStart(2, '0')
/** "2026-12-01" do dia de hoje no fuso de Recife. */
export function monthStart(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01` }
export function addMonths(month: string, n: number): string {
  const y = Number(month.slice(0, 4)); const m = Number(month.slice(5, 7)) - 1 + n
  return `${y + Math.floor(m / 12)}-${pad(((m % 12) + 12) % 12 + 1)}-01`
}
export function monthName(month: string, withYear = false): string {
  const s = new Date(`${month.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Mês que abre primeiro: até o dia 19, o mês atual; do dia 20 em diante, o seguinte (é quando se planeja). */
export function defaultMonth(today: Date): string {
  const cur = monthStart(today)
  return today.getDate() >= 20 ? addMonths(cur, 1) : cur
}
/** Os dois meses que dá para ver/gerar: o atual e o seguinte. */
export function monthOptions(today: Date): string[] { const cur = monthStart(today); return [cur, addMonths(cur, 1)] }
/** ?mes=2026-12 → "2026-12-01" (só se for um dos meses permitidos). */
export function parseMonthParam(v: string | null, today: Date): string {
  const opts = monthOptions(today)
  const m = v && /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : null
  return m && opts.includes(m) ? m : defaultMonth(today)
}

export function weeksOf(month: string): { week: 1 | 2 | 3 | 4; from: string; to: string }[] {
  const y = Number(month.slice(0, 4)); const m = Number(month.slice(5, 7))
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return ([1, 2, 3, 4] as const).map((w) => ({ week: w, from: `${month.slice(0, 8)}${pad((w - 1) * 7 + 1)}`, to: `${month.slice(0, 8)}${pad(w === 4 ? last : w * 7)}` }))
}
/** Semana de hoje dentro do mês (null se hoje não é desse mês). */
export function currentWeek(month: string, today: Date): 1 | 2 | 3 | 4 | null {
  if (monthStart(today) !== month) return null
  return Math.min(4, Math.floor((today.getDate() - 1) / 7) + 1) as 1 | 2 | 3 | 4
}
export const dm = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')
export const weekRange = (month: string, w: number) => { const x = weeksOf(month)[w - 1]!; return `${dm(x.from)} a ${dm(x.to)}` }

/** Situação curta da ação: o que a pessoa precisa saber para agir. */
export function actionState(a: Pick<MonthlyAction, 'status' | 'done' | 'routed_table' | 'area'>): { label: string; tone: 'muted' | 'info' | 'ok' | 'warn' } {
  if (a.status === 'recusada') return { label: 'Recusada', tone: 'muted' }
  if (a.status === 'proposta') return { label: 'Para aprovar', tone: 'warn' }
  if (a.done) return { label: 'Feito', tone: 'ok' }
  return { label: `Na fila · ${AREA[a.area].label}`, tone: 'info' }
}

/** Resumo da semana: quantas aprovar, quantas na produção, quantas feitas. */
export function weekSummary(actions: MonthlyAction[]): { total: number; pending: number; routed: number; done: number } {
  const live = actions.filter((a) => a.status !== 'recusada')
  return { total: live.length, pending: live.filter((a) => a.status === 'proposta').length, routed: live.filter((a) => a.status === 'aprovada').length, done: live.filter((a) => a.done).length }
}

export function statusLabel(s: MonthlyStatus | null | undefined): { label: string; tone: 'warn' | 'info' | 'ok' | 'muted' | 'bad' } {
  switch (s) {
    case 'na_fila': return { label: 'Na fila', tone: 'muted' }
    case 'gerando': return { label: 'Gerando', tone: 'info' }
    case 'pronto': return { label: 'Pronta para revisar', tone: 'info' }
    case 'aprovado': return { label: 'Em produção', tone: 'ok' }
    case 'limite': return { label: 'Limite do mês atingido', tone: 'bad' }
    case 'erro': return { label: 'Não deu certo', tone: 'bad' }
    default: return { label: 'Não gerada', tone: 'muted' }
  }
}

/**
 * Texto longo (roteiro, briefing) em partes que cabem no pop-up sem rolar: corta em parágrafos e,
 * se um parágrafo for grande, em frases. Nunca corta frase no meio.
 */
export function textPages(text: string, max = 520): string[] {
  const parts = text.replace(/\r/g, '').split(/\n{1,}/).map((p) => p.trim()).filter(Boolean)
  // Frase maior que a página (raro) vai em pedaços por palavra, para nunca rolar.
  const byWords = (t: string) => { const out: string[] = []; let c = ''; for (const w of t.split(' ')) { if (c && (c + ' ' + w).length > max) { out.push(c); c = w } else c = c ? `${c} ${w}` : w } if (c) out.push(c); return out }
  // Cada pedaço lembra se começa parágrafo (quebra de linha) ou continua o anterior (espaço).
  const units = parts.flatMap((p) => (p.length <= max ? [p] : p.split(/(?<=[.!?])\s+/).flatMap((x) => (x.length <= max ? [x] : byWords(x))))
    .map((x, i) => ({ t: x.trim(), br: i === 0 })).filter((u) => u.t))
  const pages: string[] = []
  let cur = ''
  for (const u of units) {
    const next = cur ? `${cur}${u.br ? '\n' : ' '}${u.t}` : u.t
    if (cur && next.length > max) { pages.push(cur); cur = u.t } else cur = next
  }
  if (cur) pages.push(cur)
  return pages.length ? pages : ['']
}

/** Mensagem para o cliente com o link da apresentação do mês (a pessoa confere e manda pelo WhatsApp dela). */
export function monthlyMessage(name: string, month: string, link: string | null): string {
  const mes = monthName(month).toLowerCase()
  return [
    `Oi! Tudo bem? Aqui é da Peformake.`,
    `Fechamos a estratégia de ${mes} da ${name.trim()}: o que vamos fazer semana a semana, por que, a meta e o que fica do seu lado.`,
    link ? `A apresentação está aqui (abre no celular, um slide por vez):\n${link}` : `Vou te mandar o PDF por aqui.`,
    `Qualquer ideia ou mudança, me fala que a gente ajusta toda segunda.`,
  ].join('\n\n')
}

/** Mês já começado: semanas que acabaram antes de a estratégia ser gerada (ficam fora da apresentação). */
export function pastWeeks(month: string, generatedAt: string | null | undefined): number[] {
  if (!generatedAt) return []
  const gen = new Date(new Date(generatedAt).getTime() - 3 * 3600_000).toISOString().slice(0, 10)
  return weeksOf(month).filter((w) => w.to < gen).map((w) => w.week)
}
