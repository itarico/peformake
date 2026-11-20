import { ROLE_LABELS, type AppRole } from '@/lib/roles'
import { sumMetrics, type DailyMetric } from '@/features/traffic/metricsRules'

const TOKEN = /^[A-Za-z0-9_-]{43}$/
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** O link fica depois do #, que o navegador nunca envia ao servidor. */
export function parsePortalToken(hash: string): string | null {
  const token = (hash.replace(/^#/, '').trim().split('/')[0] ?? '')
  return TOKEN.test(token) ? token : null
}

export type PortalSection = 'indicacoes' | 'briefing' | 'perguntas' | 'aprovar'
/** Parte do portal que o link abre direto: /portal#<código>/indicacoes (fim da conversa), /briefing ou /perguntas. */
export function portalSection(hash: string): PortalSection | null {
  const m = /^#?[A-Za-z0-9_-]{43}\/(indicacoes|briefing|perguntas|aprovar)\/?$/.exec(hash.trim())
  return (m?.[1] as PortalSection | undefined) ?? null
}

export function portalUrl(origin: string, token: string, section?: PortalSection): string {
  return `${origin}/portal#${token}${section ? `/${section}` : ''}`
}

/** Abas do portal: o cliente com briefing abaixo de 80% cai primeiro no Briefing (Italo, 20/11: "obrigatoriamente"). */
export type PortalTab = 'painel' | 'briefing' | 'perguntas'
export const BRIEF_REQUIRED = 80
export function startTab(section: PortalSection | null, fixedPercent: number | null): PortalTab {
  // Link de "arte pronta para aprovar" (/aprovar): vai direto às aprovações, mesmo com briefing incompleto.
  if (section === 'aprovar') return 'painel'
  if (fixedPercent !== null && fixedPercent < BRIEF_REQUIRED) return 'briefing'
  if (section === 'briefing' || section === 'perguntas') return section
  return 'painel'
}

/** Mensagem do botão Enviar do passo Briefing (a equipe manda pelo WhatsApp dela). */
export function briefShareMessage(clientName: string, url: string, person?: string | null): string {
  const who = person?.trim() ? person.trim().split(/\s+/)[0] : clientName.trim()
  return `Olá, ${who}! Para a estratégia da ${clientName.trim()} sair do jeito certo, preciso que você confira e complete o briefing no seu painel da Peformake. `
    + `Dá para responder tocando nas opções, escrevendo ou falando, e mandar arquivos. Leva uns 10 minutos:
${url}

Obrigado!`
}

export function portalShareMessage(clientName: string, url: string): string {
  return `Olá, ${clientName}! Este é o seu painel da Peformake, com os resultados atualizados: ${url}`
}

/** Primeiro dia do mês, alguns meses antes de hoje, até hoje. */
export function historyRange(today: string, months: number): { from: string; to: string } {
  const [year = 0, month = 1] = today.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - months, 1))
  return { from: start.toISOString().slice(0, 10), to: today }
}

export interface MonthSummary {
  month: string
  label: string
  spendCents: number
  conversations: number
  leads: number
  isCurrent: boolean
}

/** Um item por mês, do mais recente para o mais antigo. Meses sem gasto também aparecem. */
export function monthlyHistory(rows: readonly DailyMetric[], today: string, months: number): MonthSummary[] {
  const [year = 0, month = 1] = today.split('-').map(Number)
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1))
    const key = date.toISOString().slice(0, 7)
    const totals = sumMetrics(rows.filter((row) => row.day.startsWith(key)))
    return {
      month: key,
      label: `${MONTHS[date.getUTCMonth()]}/${String(date.getUTCFullYear()).slice(2)}`,
      spendCents: totals.spendCents,
      conversations: totals.conversations,
      leads: totals.leads,
      isCurrent: index === 0,
    }
  })
}

export interface TeamMember {
  name: string
  jobTitle: string | null
  mainRole: string | null
  photoUrl: string | null
}

export function teamRoleLabel(member: Pick<TeamMember, 'jobTitle' | 'mainRole'>): string {
  if (member.jobTitle?.trim()) return member.jobTitle.trim()
  if (member.mainRole && member.mainRole in ROLE_LABELS) return ROLE_LABELS[member.mainRole as AppRole]
  return 'Equipe Peformake'
}

const code = (error: unknown) => (error as { code?: string } | null)?.code

export function isInvalidLink(error: unknown): boolean {
  return code(error) === 'PF007'
}

export function portalLinkErrorMessage(error: unknown): string {
  const value = code(error)
  if (value === '42501') return 'Só administrador ou head de marketing gera links do portal.'
  if (value === 'PF003') return 'Cliente inativo. Reative o cliente antes de gerar o link.'
  if (value === 'PF004') return 'Cliente não encontrado. Atualize a página.'
  return 'Não foi possível concluir. Nada foi alterado. Tente de novo.'
}
