// Regra de repetição do story (pedido do Italo, 24/11/2026): todo dia ou em dias da semana escolhidos, em um ou mais
// horários, por um período (1 semana, 2 semanas, 1 mês, 2 meses ou até uma data). Cada repetição vira uma publicação
// da mesma série (aparece no calendário e "Parar série" cancela as próximas).

export type RepeatFreq = 'nao' | 'dia' | 'semana'
export type RepeatSpan = '1s' | '2s' | '1m' | '2m' | 'ate'
export interface RepeatRule { freq: RepeatFreq; weekdays: number[]; hours: string[]; span: RepeatSpan; until: string }

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const SPANS: { id: RepeatSpan; label: string; days: number }[] = [
  { id: '1s', label: '1 semana', days: 7 }, { id: '2s', label: '2 semanas', days: 14 },
  { id: '1m', label: '1 mês', days: 30 }, { id: '2m', label: '2 meses', days: 60 }, { id: 'ate', label: 'Até uma data', days: 0 },
]
/** O Instagram aceita agendar até 75 dias; acima de 60 repetições vira bagunça no calendário. */
export const MAX_REPEATS = 60
export const MAX_DAYS_AHEAD = 75

export function defaultRule(hour: string, startDay: string): RepeatRule {
  // Dias da semana começam vazios: a pessoa marca os que quer (a tela avisa se nenhum foi marcado).
  return { freq: 'nao', weekdays: [], hours: [hour], span: '2s', until: addDays(startDay, 14) }
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00-03:00`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const instant = (day: string, hour: string) => new Date(`${day}T${hour}:00-03:00`).toISOString()

/**
 * Datas em que o story vai sair. `start` é o dia e a hora do campo Quando (ou agora). Repetições começam no dia de
 * `start` e só valem do minuto seguinte em diante; o resultado vem em ordem, sem repetir, com no máximo 60.
 */
export function repeatDates(rule: RepeatRule, startDay: string, startAt: string, nowMs = Date.now()): string[] {
  const out = new Set<string>([startAt])
  if (rule.freq !== 'nao' && rule.hours.length > 0) {
    const span = SPANS.find((s) => s.id === rule.span)!
    const lastDay = rule.span === 'ate' ? rule.until : addDays(startDay, span.days - 1)
    const limit = nowMs + MAX_DAYS_AHEAD * 864e5
    for (let d = startDay; d <= lastDay; d = addDays(d, 1)) {
      const wd = new Date(`${d}T12:00:00-03:00`).getDay()
      if (rule.freq === 'semana' && !rule.weekdays.includes(wd)) continue
      for (const h of rule.hours) {
        if (!/^\d{2}:\d{2}$/.test(h)) continue
        const at = instant(d, h)
        const ms = new Date(at).getTime()
        if (ms > new Date(startAt).getTime() + 30_000 && ms > nowMs + 60_000 && ms <= limit) out.add(at)
      }
    }
  }
  return [...out].sort().slice(0, MAX_REPEATS)
}

/** Resumo para mostrar antes de salvar: "Sai 9 vezes · seg e qua às 09:00 e 18:00 · até 07/12". */
export function repeatSummary(rule: RepeatRule, dates: string[]): string {
  if (rule.freq === 'nao' || dates.length <= 1) return 'Sai uma vez.'
  const days = rule.freq === 'dia' ? 'todo dia' : rule.weekdays.length ? [...rule.weekdays].sort().map((w) => WEEKDAYS[w]!.toLowerCase()).join(', ') : 'nenhum dia escolhido'
  const hours = [...rule.hours].sort().join(' e ')
  const last = new Date(dates[dates.length - 1]!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
  return `Sai ${dates.length} vezes · ${days} às ${hours} · até ${last}${dates.length >= MAX_REPEATS ? ' (máximo de 60)' : ''}`
}
