// Metas por função da pessoa (Pagamento → 3 Metas) e OTE. O catálogo e o cálculo ficam no banco
// (member_goal_catalog, member_goal_value, member_goal_suggest, member_ote); aqui só as regras puras da tela.
// Regra do Italo (12/11/2026): OTE = 60% fixo + 40% variável; no máximo 2 metas; cada meta BATIDA paga 20% do OTE
// (metade da variável), tudo ou nada por meta.

export const MAX_GOALS = 2
export const OTE_FIXED_PCT = 60

/** OTE total → fixo (60%) e variável (40%), em reais inteiros. */
export function splitOte(total: number): { fixed: number; variable: number; perGoal: number } {
  const t = Math.max(0, Math.round(Number(total) || 0))
  const fixed = Math.round((t * OTE_FIXED_PCT) / 100)
  const variable = t - fixed
  return { fixed, variable, perGoal: Math.round(variable / MAX_GOALS) }
}
/** Quem digitou o fixo: o OTE que dá esse fixo (fixo ÷ 60%). */
export const oteFromFixed = (fixed: number) => Math.round(((Number(fixed) || 0) * 100) / OTE_FIXED_PCT)
/** Variável ganha no mês: cada meta batida = metade da variável (até o total). */
export const earnedByHits = (variable: number, hits: number) => Math.min(variable, Math.round((variable / MAX_GOALS) * Math.max(0, hits) * 100) / 100)

/** Funções que têm metas (mesmas chaves de staff_members.main_role e skills). */
export const FUNC_LABEL: Record<string, string> = {
  editor: 'Edição', videomaker: 'Captação', fotografo: 'Fotografia', designer: 'Design', social_media: 'Social',
  traffic_manager: 'Tráfego', comercial: 'Comercial', head_marketing: 'Relacionamento',
}

export interface GoalValue { done: number; total: number; actual: number | null }
export interface CatalogGoal {
  key: string; func: string; title: string; how: string; unit: 'pct' | 'qtd' | 'brl'; better: 'mais' | 'menos'
  target: number; param_label: 'horas' | 'min' | 'dia' | 'dias' | null; param: number | null; is_default: boolean; value: GoalValue | null
  /** Média dos 3 meses anteriores (base do alvo sugerido); has_history false = alvo conservador. */
  history?: number | null; has_history?: boolean; historic?: boolean
}
export interface SavedGoal { key: string; target: number; param?: number | null; origem: 'area' | 'pessoal' | 'funcao' }
export interface GoalDraft { on: boolean; target: string; param: string }

/** Título com o parâmetro no lugar de {n} (ex.: "Edição entregue em até 24 h"). */
export const fillTitle = (title: string, param: number | string | null | undefined) => title.replace(/\{n\}/g, param === null || param === undefined || param === '' ? 'N' : String(param))

const money = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/** Realizado do mês em uma linha: "18 de 20 · 90%", "6 no mês", "Nenhuma agora". */
export function progressText(g: Pick<CatalogGoal, 'unit' | 'better'>, v: GoalValue | null | undefined): string {
  if (!v) return 'Sem dados'
  const done = Number(v.done) || 0
  if (g.unit === 'pct') return Number(v.total) > 0 ? `${done} de ${v.total} · ${v.actual ?? 0}%` : 'Sem dados no mês'
  if (g.unit === 'brl') return `${money(done)} no mês`
  if (g.better === 'menos') return done === 0 ? 'Nenhuma agora' : `${done} agora`
  return `${done} no mês`
}

/** Estado inicial: o que já foi salvo, ou as sugeridas pelas funções (até 5). */
export function initDrafts(catalog: CatalogGoal[], saved: SavedGoal[], hasOwn: boolean): Record<string, GoalDraft> {
  const mine = new Map(saved.filter((g) => g.origem === (hasOwn ? 'pessoal' : 'funcao')).map((g) => [g.key, g]))
  let on = 0
  return Object.fromEntries(catalog.map((c) => {
    const s = mine.get(c.key)
    const ligada = !!s && on < MAX_GOALS
    if (ligada) on++
    const param = s?.param ?? c.param
    return [c.key, { on: ligada, target: String(s ? s.target : c.target), param: param === null || param === undefined ? '' : String(param) }]
  }))
}

/** De onde veio o alvo sugerido, em poucas palavras. */
export function suggestionText(c: Pick<CatalogGoal, 'unit' | 'has_history' | 'history' | 'historic'>): string | null {
  if (c.historic === false) return null
  if (!c.has_history || c.history === null || c.history === undefined) return 'sem histórico'
  const h = Number(c.history)
  return `média ${c.unit === 'pct' ? Math.round(h) + '%' : c.unit === 'brl' ? money(h) : h.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`
}

export const countOn = (d: Record<string, GoalDraft>) => Object.values(d).filter((x) => x.on).length

/** Liga/desliga respeitando o máximo de 5. */
export function toggleDraft(d: Record<string, GoalDraft>, key: string): Record<string, GoalDraft> {
  const cur = d[key]
  if (!cur) return d
  if (!cur.on && countOn(d) >= MAX_GOALS) return d
  return { ...d, [key]: { ...cur, on: !cur.on } }
}

const toNum = (s: string) => Number(String(s).replace(/\./g, '').replace(',', '.'))

/** O que vai para member_pay_config_save: só as ligadas, com alvo e parâmetro. Metas antigas (fora do catálogo) continuam. */
export function goalsPayload(catalog: CatalogGoal[], d: Record<string, GoalDraft>, saved: SavedGoal[] = []) {
  const keys = new Set(catalog.map((c) => c.key))
  const legacy = saved.filter((g) => g.origem === 'pessoal' && !keys.has(g.key)).map((g) => ({ key: g.key, target: g.target, param: null as number | null }))
  const mine = catalog.filter((c) => d[c.key]?.on).map((c) => {
    const x = d[c.key]!
    const t = x.target.trim() === '' ? NaN : toNum(x.target)
    const p = c.param_label ? toNum(x.param) : NaN
    return { key: c.key, target: Number.isFinite(t) ? t : c.target, param: c.param_label && Number.isFinite(p) && p > 0 ? p : null }
  })
  return [...mine, ...legacy].slice(0, MAX_GOALS)
}

/** Agrupa por função, na ordem em que as funções vêm. */
export function byFunction(catalog: CatalogGoal[]): [string, CatalogGoal[]][] {
  const m = new Map<string, CatalogGoal[]>()
  for (const c of catalog) m.set(c.func, [...(m.get(c.func) ?? []), c])
  return [...m.entries()]
}
