// Conversa do portal (Italo, 20/11): o cliente responde dentro do portal, num chat no estilo WhatsApp, uma pergunta por vez.
// Primeiro o que falta no briefing (quando está abaixo de 80%), depois as perguntas do mês. Sem IA: as perguntas vêm dos
// guias do briefing (QUIZ, com `when`) e do motor do mês (client_questions, com `cond`).
import { MONTHS_FULL, QUIZ, TEXT_FIELDS, fixedStatus, quizMoney, quizText, visibleSteps, type BriefFixed, type MoneyKey, type QuizStep, type TextKey } from '@/features/strategy/brief/briefRules'
import { visibleQuestions, type PortalQuestion } from './portalBriefApi'

export type ListField = 'produtos' | 'links' | 'concorrentes' | 'referencias'
export type FlowField = TextKey | 'gravacao' | 'sazonal' | ListField

export interface FlowStep {
  key: string
  group: string
  q: string
  hint?: string | null
  opts: string[]
  multi?: boolean
  kind: 'quiz' | 'list' | 'question' | 'nps' | 'nps_comment'
  field?: FlowField
  qid?: string
  money?: MoneyKey
}

const LIST: Record<ListField, { label: string; q: string; hint: string; opts?: string[] }> = {
  produtos: { label: 'Produtos', q: 'Quais produtos ou serviços vocês vendem, com o preço de hoje?', hint: 'Ex.: "Pizza grande R$ 59,90; Calzone R$ 42". Pode falar a lista inteira.' },
  links: { label: 'Links', q: 'Cole aqui os links da empresa: site, Instagram, cardápio, Google Maps.', hint: 'Um por linha. O sistema reconhece cada um.' },
  concorrentes: { label: 'Concorrentes', q: 'Quem são os seus concorrentes? Fale os nomes ou cole o @ do Instagram.', hint: 'Ex.: "@pizzariadobairro, Forno Bom".', opts: ['Não tenho concorrente direto'] },
  referencias: { label: 'Referências', q: 'Tem algum post, vídeo ou anúncio que você gosta? Cole o link.', hint: 'Pode ser de outro ramo. Um por linha.' },
}
const isList = (k: string): k is ListField => k in LIST
export const MAX_PER_FIELD = 4

/** Campos que faltam no briefing, do que mais pesa para o que menos pesa (fica fixo durante a conversa). */
export function missingFields(f: BriefFixed, hasVideo: boolean): FlowField[] {
  return fixedStatus(f, hasVideo).checks.filter((c) => !c.done).sort((a, b) => b.weight - a.weight)
    .map((c) => (c.key === 'quem_aparece' ? 'gravacao' : c.key === 'sazonalidade' ? 'sazonal' : c.key) as FlowField)
}

/** Sazonalidade na conversa: os meses por nome (viram números em meses_fortes e meses_fracos) e o porquê. */
export const SEASON_STEPS: QuizStep[] = [
  { q: 'Em quais meses vocês vendem mais?', opts: MONTHS_FULL.map((m) => m[0]!.toUpperCase() + m.slice(1)), multi: true },
  { q: 'E em quais meses vende menos?', opts: MONTHS_FULL.map((m) => m[0]!.toUpperCase() + m.slice(1)), multi: true },
  { q: 'Por que esses meses são assim?', opts: [], open: true },
]
export const monthsIn = (text: string): number[] => {
  const t = n(text)
  return MONTHS_FULL.map((m, i) => (t.includes(n(m)) ? i + 1 : 0)).filter(Boolean)
}

export function fieldSteps(field: FlowField): QuizStep[] {
  if (field === 'sazonal') return SEASON_STEPS
  if (field === 'gravacao') return [...(QUIZ.quem_aparece ?? []), ...(QUIZ.quem_grava ?? [])]
  if (isList(field)) return []
  return QUIZ[field] ?? [{ q: TEXT_FIELDS[field].hint, opts: [], open: true }]
}
export const fieldLabel = (field: FlowField) => (field === 'gravacao' ? 'Gravação' : field === 'sazonal' ? 'Sazonalidade' : isList(field) ? LIST[field].label : TEXT_FIELDS[field].label)

const n = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Os passos da conversa agora: as subperguntas (`when` do guia, `cond` do mês) entram conforme as respostas. */
export const NPS_KEY = 'nps:0'
export const NPS_COMMENT_KEY = 'nps:1'
export const NPS_INDICAR = 'Sim, indicar agora'
/** Puxa-fio do NPS conforme a nota (Italo, 20/11). */
export function npsFollowUp(score: number): { q: string; opts: string[] } {
  if (score <= 6) return { q: 'O que te decepcionou e o que a gente pode melhorar?', opts: [] }
  if (score <= 8) return { q: 'O que faltou para ser 10?', opts: [] }
  return { q: 'Que bom! Indicaria alguém agora?', opts: [NPS_INDICAR, 'Agora não'] }
}

export function flowSteps(fields: FlowField[], answers: Record<string, string>, questions: PortalQuestion[], monthLabel: string, nps?: { brand: string; done: boolean }): FlowStep[] {
  const out: FlowStep[] = []
  for (const field of fields) {
    if (isList(field)) { const l = LIST[field]; out.push({ key: `${field}:0`, group: l.label, q: l.q, hint: l.hint, opts: l.opts ?? [], kind: 'list', field }); continue }
    const steps = fieldSteps(field)
    // Mesma regra da equipe (visibleSteps): subpergunta pela resposta e puxa-fio depois de responder. No máximo 4 perguntas
    // principais por campo (o resto fica na aba Briefing); subperguntas e puxa-fios entram atrás da que os abriu.
    const vis = new Set(visibleSteps(steps, steps.map((_, j) => (answers[`${field}:${j}`] ? [answers[`${field}:${j}`]!] : []))))
    let base = 0
    const kept = new Set<number>()
    steps.forEach((s, j) => {
      if (!vis.has(j)) return
      if (s.when) { if (!kept.has(steps.findIndex((x) => x.q === s.when!.q))) return }
      else if (s.money !== 'verba_anuncio' && ++base > MAX_PER_FIELD) return // a verba de anúncio sempre entra
      kept.add(j)
      out.push({ key: `${field}:${j}`, group: fieldLabel(field), q: s.q, opts: s.opts, multi: s.multi, kind: 'quiz', field, ...(s.money ? { money: s.money } : {}) })
    })
  }
  for (const q of visibleQuestions(questions)) {
    if (q.status === 'respondida') continue
    out.push({ key: `q:${q.id}`, group: monthLabel, q: q.question, hint: q.why, opts: q.options.slice(0, 14), multi: true, kind: 'question', qid: q.id })
  }
  // NPS no fim das perguntas do mês, uma vez por mês (o puxa-fio segue a nota dada nesta conversa).
  if (nps && questions.length && (!nps.done || answers[NPS_KEY] !== undefined)) {
    const who = nps.brand === 'ellcazo' ? 'a Ellcazo' : 'a Peformake'
    out.push({ key: NPS_KEY, group: 'Avaliação', q: `De 0 a 10, quanto você indicaria ${who} para um amigo?`, opts: Array.from({ length: 11 }, (_, i) => String(i)), kind: 'nps' })
    const score = Number(answers[NPS_KEY])
    if (answers[NPS_KEY] !== undefined && Number.isFinite(score)) {
      const f = npsFollowUp(score)
      out.push({ key: NPS_COMMENT_KEY, group: 'Avaliação', q: f.q, hint: score >= 9 ? null : 'Pode falar: o microfone é o jeito mais rápido.', opts: f.opts, kind: 'nps_comment' })
    }
  }
  return out
}

/** O que salvar no briefing com as respostas do guia: o texto do cartão (sem as de dinheiro), o dinheiro à parte e os meses. */
export function fieldPatch(field: FlowField, answers: Record<string, string>): Partial<BriefFixed> {
  const steps = fieldSteps(field)
  const arr = steps.map((_, j) => (answers[`${field}:${j}`] ? [answers[`${field}:${j}`]!] : []))
  if (field === 'sazonal') return { meses_fortes: monthsIn(arr[0]?.[0] ?? ''), meses_fracos: monthsIn(arr[1]?.[0] ?? ''), ...(arr[2]?.[0] ? { sazonalidade: arr[2][0] } : {}) }
  const text = quizText(steps, arr.map((a, j) => (steps[j]!.money ? [] : a)))
  const money = quizMoney(steps, arr)
  if (field === 'gravacao') return { quem_aparece: text, quem_grava: text }
  return { ...(text ? { [field]: text } : {}), ...money }
}
export const fieldText = (field: FlowField, answers: Record<string, string>) => String(Object.values(fieldPatch(field, answers))[0] ?? '')

/** Links colados ou falados: tudo o que parece endereço (com ou sem http). */
export function linksIn(text: string): string[] {
  const found = text.match(/(https?:\/\/[^\s,;]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/?[^\s,;]*|@[\w.]{3,})/gi) ?? []
  return [...new Set(found.map((u) => (u.startsWith('@') ? `https://instagram.com/${u.slice(1)}` : /^https?:\/\//i.test(u) ? u : `https://${u}`)))]
}

/** Nomes de concorrentes de uma frase: separa por vírgula, ponto e vírgula, linha ou " e ". */
export function namesIn(text: string): string[] {
  return text.split(/[,;\n]+|\s+e\s+/i).map((s) => s.trim().replace(/^[-•.]+\s*/, '')).filter((s) => s.length > 1).slice(0, 10)
}
