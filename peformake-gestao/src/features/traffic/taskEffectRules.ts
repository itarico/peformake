// Leitura do que cada ação na Meta mudou, para o card dizer se funcionou.

export interface ProposedAction {
  type: 'set_daily_budget' | 'set_status'
  entity_id: string
  level?: string
  daily_budget?: number
  previous?: number
  status?: 'ACTIVE' | 'PAUSED'
}

export interface Window {
  days: number
  spend_cents: number
  results: number
  clicks: number
  impressions: number
}

export interface TaskEffect {
  before: Window
  after: Window
  final: boolean
}

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** "R$ 20,00 → R$ 24,00 por dia", "Pausar", "Ativar". */
export function actionChange(a: ProposedAction | null): { from: string; to: string } | null {
  if (!a) return null
  if (a.type === 'set_daily_budget' && a.daily_budget != null) {
    return { from: a.previous != null ? brl(a.previous) : 'atual', to: `${brl(a.daily_budget)}/dia` }
  }
  if (a.type === 'set_status') return { from: a.status === 'PAUSED' ? 'Ativo' : 'Pausado', to: a.status === 'PAUSED' ? 'Pausado' : 'Ativo' }
  return null
}

const cpr = (w: Window) => (w.results > 0 ? w.spend_cents / w.results : null)

export type EffectTone = 'good' | 'bad' | 'neutral'

/**
 * Compara a média por dia antes e depois. Custo por resultado é o que decide;
 * sem resultado em um dos lados, compara resultados por dia.
 */
export function effectVerdict(e: TaskEffect | null): { text: string; tone: EffectTone; detail: string } | null {
  if (!e || e.after.days < 1 || e.before.days < 1) return null
  const before = cpr(e.before)
  const after = cpr(e.after)
  const perDay = (w: Window) => w.results / w.days
  const days = `${e.after.days} ${e.after.days === 1 ? 'dia' : 'dias'} depois`
  const detail = `Antes: ${brl(e.before.spend_cents / e.before.days)}/dia, ${perDay(e.before).toFixed(1).replace('.', ',')} result./dia. Depois: ${brl(e.after.spend_cents / e.after.days)}/dia, ${perDay(e.after).toFixed(1).replace('.', ',')} result./dia.`
  if (e.after.spend_cents === 0 && e.after.results === 0) return { text: `Sem veiculação ${days}`, tone: 'neutral', detail }
  if (before !== null && after !== null) {
    const pct = Math.round(((after - before) / before) * 100)
    if (Math.abs(pct) < 5) return { text: `Custo por resultado estável (${days})`, tone: 'neutral', detail }
    return {
      text: `Custo por resultado ${pct < 0 ? 'caiu' : 'subiu'} ${Math.abs(pct)}% (${days})`,
      tone: pct < 0 ? 'good' : 'bad',
      detail,
    }
  }
  const b = perDay(e.before)
  const a = perDay(e.after)
  if (b === 0 && a > 0) return { text: `Passou a gerar resultado (${days})`, tone: 'good', detail }
  if (b > 0 && a === 0) return { text: `Parou de gerar resultado (${days})`, tone: 'bad', detail }
  return { text: `Sem resultado para comparar (${days})`, tone: 'neutral', detail }
}

/** Explica ao cliente, em palavras simples, o que mudamos na campanha dele. */
export function clientMessageForAction(a: ProposedAction | null, firstName: string, itemName: string | null): string | null {
  if (!a) return null
  const name = itemName ? `"${itemName}"` : 'sua campanha'
  const hi = `Oi, ${firstName}! `
  if (a.type === 'set_daily_budget' && a.daily_budget != null) {
    const up = a.previous == null || a.daily_budget > a.previous
    return up
      ? `${hi}Vimos que ${name} está trazendo bons resultados e aumentamos o investimento diário para ${brl(a.daily_budget)}. A ideia é alcançar mais pessoas com o que já está funcionando. Seguimos acompanhando de perto.`
      : `${hi}Ajustamos o investimento diário de ${name} para ${brl(a.daily_budget)}, para não gastar mais do que o retorno que ela está trazendo agora. Seguimos acompanhando de perto.`
  }
  if (a.type === 'set_status') {
    return a.status === 'PAUSED'
      ? `${hi}Pausamos ${name}, que estava gastando sem trazer o resultado esperado. A verba fica para os anúncios que estão funcionando melhor.`
      : `${hi}Reativamos ${name} para voltar a trazer contatos. Seguimos acompanhando os resultados.`
  }
  return null
}

/** Ação que dá para desfazer: mudou orçamento (com valor anterior) ou status, e foi feita na Meta. */
export function canUndo(a: ProposedAction | null, actionStatus: string | null): boolean {
  if (!a || actionStatus !== 'done') return false
  if (a.type === 'set_daily_budget') return a.previous != null
  return a.type === 'set_status'
}
