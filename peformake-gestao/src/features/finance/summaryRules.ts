// Regras puras da aba Resumo do Financeiro. Os números vêm prontos do banco (fin_dashboard); aqui só se escolhe o que mostrar.

export type SummaryUnit = 'juntas' | 'peformake' | 'ellcazo'
export const SUMMARY_UNITS: { id: SummaryUnit; label: string }[] = [
  { id: 'juntas', label: 'Juntas' },
  { id: 'peformake', label: 'Peformake' },
  { id: 'ellcazo', label: 'Ellcazo' },
]
export const parseUnit = (v: string | null): SummaryUnit => (v === 'peformake' || v === 'ellcazo' ? v : 'juntas')

export interface TrustReason { key: string; unit: string; weight: number; text: string; to: string; label: string }
export interface DashAction { key: string; title: string; amount: number; urgent?: boolean; to: string; label: string; source: string }

/** Abaixo disto os gráficos ficam cinza com aviso (anti-falha 3). */
export const TRUST_MIN = 80

export function trustTone(pct: number): 'ok' | 'warn' | 'low' {
  return pct >= 90 ? 'ok' : pct >= TRUST_MIN ? 'warn' : 'low'
}

/**
 * Frase do selo: "Dados 72% completos: falta importar o extrato desde 03/11; sem despesas fixas".
 * Junta motivos iguais das duas empresas ("da Peformake" e "da Ellcazo" viram um só) e mostra no máximo 3.
 */
export function trustSentence(pct: number, reasons: readonly TrustReason[], max = 3): string {
  if (!reasons.length) return `Dados ${pct}% completos`
  const strip = (t: string) => t.replace(/ da (Peformake|Ellcazo)/, '')
  const parts: string[] = []
  for (const r of reasons) {
    const same = reasons.filter((o) => o.key === r.key)
    // Só junta frase sem número ("2 clientes" de cada empresa não vira "2 das duas").
    const merged = same.length > 1 && !/\d/.test(strip(r.text).replace(/desde \d\d\/\d\d/, '')) && same.every((o) => strip(o.text) === strip(r.text))
    const text = merged ? strip(r.text).replace(/^(.*?)( \(|$)/, (_, a: string, b: string) => `${a} das duas empresas${b}`) : r.text
    if (!parts.includes(text)) parts.push(text)
  }
  const shown = parts.slice(0, max)
  const more = parts.length - shown.length
  return `Dados ${pct}% completos: ${shown.join('; ')}${more > 0 ? ` (+${more})` : ''}`
}

/** "O que fazer agora": no máximo 3, de mais dinheiro em risco; urgente na frente quando empata. Sem repetir a mesma tela duas vezes seguidas sem motivo. */
export function topActions(actions: readonly DashAction[], max = 3): DashAction[] {
  return [...actions]
    .sort((a, b) => (b.amount - a.amount) || (Number(!!b.urgent) - Number(!!a.urgent)))
    .slice(0, max)
}

/** Variação % entre dois valores (null quando não há base). */
export function deltaPct(now: number, before: number): number | null {
  if (!before) return null
  return Math.round(((now - before) / before) * 1000) / 10
}

/** Pontos de uma linha num quadro de largura w e altura h, com o zero visível (o caixa pode ficar negativo). */
export function linePoints(values: readonly number[], w: number, h: number): { pts: [number, number][]; zeroY: number; min: number; max: number } {
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const y = (v: number) => h - ((v - min) / span) * h
  const pts = values.map((v, i) => [values.length === 1 ? w / 2 : (i / (values.length - 1)) * w, y(v)] as [number, number])
  return { pts, zeroY: y(0), min, max }
}

export const AREA_LABEL: Record<string, string> = {
  social: 'Social', design: 'Design', trafego: 'Tráfego', audiovisual: 'Audiovisual', consultoria: 'Consultoria',
  sistemas: 'Sistemas e CRM', comercial: 'Comercial', licitacao: 'Licitações', outros: 'Outros',
}
export const areaLabel = (a: string) => AREA_LABEL[a] ?? a.charAt(0).toUpperCase() + a.slice(1)

/** Mês "2026-11" vira "nov". */
export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const shortMonth = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym

/** "R$ 12,3 mil" para eixos e rótulos curtos. */
export function brlShort(n: number): string {
  const a = Math.abs(n)
  const s = a >= 1000 ? `R$ ${(a / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(a).toLocaleString('pt-BR')}`
  return n < 0 ? `−${s}` : s
}

/** Sem saídas lançadas no mês, o "resultado" é só o que entrou: avisar em vez de mostrar margem de 100%. */
export function resultHint(expensesPaid: number, marginPct: number | null, noProfit: boolean): string {
  if (noProfit) return 'Conferir antes: há diferença entre faturas e Caixa'
  if (!expensesPaid) return 'Sem saídas lançadas'
  return marginPct === null ? '—' : `Margem ${marginPct.toLocaleString('pt-BR')}%`
}
