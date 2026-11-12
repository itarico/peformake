// Regras puras das Perguntas ao cliente (pacote da semana e conversa).
// ATENÇÃO: este arquivo é copiado igual para supabase/functions/client-questions e client-chat (questionRules.ts).
// O teste questionRules.test.ts confere que as cópias estão iguais. Sem imports aqui.

export const MAX_PER_WEEK = 4
/** Opções que a IA deixa prontas por semana: a equipe escolhe as 4 que vão (as mais importantes já vêm marcadas). */
export const MAX_OPTIONS = 8
export const MAX_FOLLOWUPS = 1
/** No máximo 4 perguntas por conversa (a equipe não consegue marcar mais; o banco também recusa). */
export const MAX_PER_CHAT = 4
/** "Mandar todas": limite de perguntas num link só (o banco aceita até 30). */
export const ALL_MAX = 30
/** Pergunta curta e direta: a IA mira em até 90 letras; acima de 120 é descartada. */
export const MAX_QUESTION_LEN = 120
export const SKIP_LABEL = 'Responder depois'

export interface QuestionLite { id: string; status: string; pack: string | null; created_at: string }

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

/** Segunda-feira da semana (horário de Recife/São Paulo, UTC-3 sem horário de verão), em AAAA-MM-DD. */
export function weekStart(now: Date = new Date()): string {
  const local = new Date(now.getTime() - 3 * 3_600_000)
  const day = (local.getUTCDay() + 6) % 7 // 0 = segunda
  return ymd(addDays(new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())), -day))
}

/**
 * Última semana do mês = a semana cuja quinta-feira ainda é deste mês e a quinta seguinte já é do próximo.
 * Assim cada mês tem exatamente uma. Devolve o mês que vem (AAAA-MM) ou null.
 */
export function nextMonthFocus(monday: string): string | null {
  const m = new Date(`${monday}T12:00:00Z`)
  const thu = addDays(m, 3)
  const next = addDays(thu, 7)
  if (thu.getUTCMonth() === next.getUTCMonth()) return null
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}`
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const monthName = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym

/** Rótulo curto do pacote para a tela: "Semana de 10/11" ou "Diagnóstico". */
export function packLabel(pack: string | null, focus?: string | null): string {
  if (!pack) return 'Do diagnóstico'
  const label = `Semana de ${pack.slice(8, 10)}/${pack.slice(5, 7)}`
  return focus === 'proximo_mes' ? `${label} · mês que vem` : label
}

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// Perguntas genéricas que o Italo não quer (qualquer assessoria faria). Tudo o que bater aqui é descartado.
const GENERIC = [
  'cliente ideal', 'publico alvo', 'qual seu publico', 'qual o seu publico', 'quem e seu cliente', 'quem e o seu cliente', 'qual seu objetivo', 'qual o seu objetivo',
  'quais seus objetivos', 'qual sua missao', 'quais seus valores', 'qual seu diferencial', 'qual o seu diferencial', 'o que voce espera', 'o que achou do nosso trabalho',
  'como podemos ajudar', 'tem alguma duvida', 'qual seu orcamento', 'qual o seu orcamento', 'qual seu nicho',
  // perguntas bobas: não mudam nenhuma decisão
  'esta satisfeito', 'gostou do', 'gostou da', 'o que achou', 'como esta o movimento', 'como estao as vendas', 'tudo bem por ai', 'qual seu horario',
  'qual o horario', 'qual seu endereco', 'qual o endereco', 'qual seu instagram', 'tem fotos', 'pode mandar fotos', 'pode enviar fotos', 'ja pensou em',
  'o que acha de postar', 'gostaria de postar', 'qual cor', 'quais cores', 'tem logo', 'tem interesse em', 'quer aumentar as vendas', 'quer vender mais',
]
export function isGeneric(question: string): boolean {
  const q = norm(question)
  return q.length < 18 || GENERIC.some((g) => q.includes(g))
}

const words = (s: string) => new Set(norm(s).split(' ').filter((w) => w.length > 3))
/** Parecida demais com outra (mesma pergunta com outras palavras). */
export function isSimilar(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true
  const A = words(a); const B = words(b)
  if (!A.size || !B.size) return false
  let inter = 0
  for (const w of A) if (B.has(w)) inter++
  return inter / (A.size + B.size - inter) >= 0.6
}

/** Filtra as perguntas novas: nada genérico, nada repetido (nem entre si), no máximo `limit`. */
export function pickNew<T extends { pergunta: string }>(candidates: T[], existing: string[], limit = MAX_PER_WEEK): T[] {
  const out: T[] = []
  for (const c of candidates) {
    const q = (c.pergunta ?? '').trim()
    if (!q || q.length > MAX_QUESTION_LEN || isGeneric(q)) continue
    if (existing.some((e) => isSimilar(e, q)) || out.some((o) => isSimilar(o.pergunta, q))) continue
    out.push({ ...c, pergunta: q })
    if (out.length >= limit) break
  }
  return out
}

/** Botões de resposta rápida: até 4, curtos, sem repetir. */
export function cleanOptions(opts: unknown): string[] {
  if (!Array.isArray(opts)) return []
  const out: string[] = []
  for (const o of opts) {
    const t = String(o ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
    if (t && !out.some((x) => norm(x) === norm(t)) && norm(t) !== norm(SKIP_LABEL)) out.push(t)
    if (out.length >= 4) break
  }
  return out
}

/** O que vai marcado no "Enviar ao cliente": o pacote mais novo ainda sem resposta (até 4); se não houver pacote, as 4 mais antigas. */
export function defaultToSend(qs: QuestionLite[]): string[] {
  const open = qs.filter((q) => q.status === 'pendente' || q.status === 'enviada')
  const packs = open.map((q) => q.pack).filter((p): p is string => !!p).sort()
  const latest = packs[packs.length - 1]
  const pool = latest ? open.filter((q) => q.pack === latest) : open
  return [...pool].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(0, MAX_PER_WEEK).map((q) => q.id)
}

/** Próxima pergunta da conversa: a primeira da lista que não foi respondida nem pulada. */
export function nextQuestion(ids: string[], done: Set<string>, skipped: Set<string>): string | null {
  return ids.find((id) => !done.has(id) && !skipped.has(id)) ?? null
}

export const canFollowUp = (followups: Record<string, number>, qid: string) => (followups[qid] ?? 0) < MAX_FOLLOWUPS

/** Nota do NPS digitada ou tocada: só um número de 0 a 10 ("8", "nota 8", "8!"). */
export function parseNps(text: string): number | null {
  const m = norm(text).match(/^(nota )?(10|[0-9])$/)
  return m ? Number(m[2]) : null
}

export function npsCategory(score: number): 'promotor' | 'neutro' | 'detrator' {
  return score >= 9 ? 'promotor' : score >= 7 ? 'neutro' : 'detrator'
}

export const firstName = (name: string) => (name.trim().split(/\s+/)[0] ?? '').replace(/^./, (c) => c.toUpperCase())

/** Mensagem que a equipe manda pelo WhatsApp dela com o link da conversa. */
/** Bom dia / boa tarde / boa noite pelo horário de Recife. */
export function greeting(now: Date = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Recife' }).format(now))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

/** Mensagem que a equipe manda pelo WhatsApp dela com o link da conversa (chama a pessoa pelo nome). */
export function chatInvite(clientName: string, n: number, link: string, nextMonth: string | null = null, person: string | null = null, now: Date = new Date()): string {
  const who = person?.trim() ? firstName(person) : clientName.trim()
  const qty = n === 1 ? 'esta pergunta rápida' : `estas ${n} perguntas rápidas`
  const what = nextMonth ? `e planejar ${monthName(nextMonth)}` : ''
  return `${greeting(now)}, ${who}! Tudo bem?\n\n`
    + `Preciso que você responda ${qty} para ajudar a gente nas estratégias de marketing da ${clientName.trim()}${what ? ` ${what}` : ''}. `
    + `Dá para responder com um toque, por texto ou por áudio, em uns 3 minutos:\n${link}\n\nObrigado!`
}

export const chatLink = (origin: string, token: string) => `${origin.replace(/\/$/, '')}/conversa/${token}`
