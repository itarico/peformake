// Audiovisual: painel de clientes ao lado da agenda. Regras puras.
// Ideia do Italo (24/11): gravar a partir do dia 15 do mês anterior, para o conteúdo do mês seguinte chegar pronto;
// cliente fixo que passou de um mês sem gravar aparece em vermelho.

export interface PanelClient {
  id: string
  name: string
  fixed: boolean
  lastShoot: string | null
  nextShoot: string | null
  nextProject: string | null
  shootsMonth: number
  shootsTotal: number
  daysSince: number | null
}

export type Urgency = 'urgente' | 'marcar' | 'agendado' | 'ok'

/** Dias sem gravar a partir dos quais o cliente fixo fica em vermelho. */
export const LATE_DAYS = 30
/** Dia do mês em que abre a janela para gravar o conteúdo do mês seguinte. */
export const WINDOW_DAY = 15

/** `today` em AAAA-MM-DD (Brasília). Avulso nunca cobra: só mostra o que tem. */
export function urgency(c: PanelClient, today: string): Urgency {
  if (c.nextShoot) return 'agendado'
  if (!c.fixed) return 'ok'
  if (c.daysSince === null || c.daysSince >= LATE_DAYS) return 'urgente'
  if (Number(today.slice(8, 10)) >= WINDOW_DAY && c.shootsMonth === 0) return 'marcar'
  if (Number(today.slice(8, 10)) >= WINDOW_DAY && c.daysSince >= WINDOW_DAY) return 'marcar'
  return 'ok'
}

const shortDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })

/** Uma linha que diz a situação e o que fazer. */
export function statusLine(c: PanelClient, today: string): string {
  const u = urgency(c, today)
  if (u === 'agendado') return `Gravação dia ${shortDay(c.nextShoot as string)}`
  if (c.daysSince === null) return c.fixed ? 'Nenhuma gravação marcada ainda' : 'Sem gravação'
  const ago = c.daysSince === 0 ? 'Gravou hoje' : c.daysSince === 1 ? 'Gravou ontem' : `Gravou há ${c.daysSince} dias`
  if (u === 'urgente') return `${ago}: marcar com urgência`
  if (u === 'marcar') return `${ago}: marcar a do próximo mês`
  return ago
}

const WEIGHT: Record<Urgency, number> = { urgente: 0, marcar: 1, ok: 2, agendado: 3 }

/** Quem precisa de agendamento primeiro; dentro do mesmo grupo, quem está há mais tempo sem gravar. */
export function sortPanel(list: readonly PanelClient[], today: string): PanelClient[] {
  return [...list].sort((a, b) => WEIGHT[urgency(a, today)] - WEIGHT[urgency(b, today)]
    || (b.daysSince ?? 9999) - (a.daysSince ?? 9999) || a.name.localeCompare(b.name, 'pt-BR'))
}

export function countToSchedule(list: readonly PanelClient[], today: string): number {
  return list.filter((c) => { const u = urgency(c, today); return u === 'urgente' || u === 'marcar' }).length
}
