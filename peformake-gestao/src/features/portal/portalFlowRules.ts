// Conversa do portal (Italo, 20/11): o cliente responde dentro do portal, num chat no estilo WhatsApp, uma pergunta por vez.
// Primeiro o que falta no briefing (quando está abaixo de 80%), depois as perguntas do mês. Sem IA: as perguntas vêm dos
// guias do briefing (QUIZ, com `when`) e do motor do mês (client_questions, com `cond`).
import { QUIZ, TEXT_FIELDS, fixedStatus, quizText, type BriefFixed, type QuizStep, type TextKey } from '@/features/strategy/brief/briefRules'
import { visibleQuestions, type PortalQuestion } from './portalBriefApi'

export type ListField = 'produtos' | 'links' | 'concorrentes' | 'referencias'
export type FlowField = TextKey | 'gravacao' | ListField

export interface FlowStep {
  key: string
  group: string
  q: string
  hint?: string | null
  opts: string[]
  multi?: boolean
  kind: 'quiz' | 'list' | 'question'
  field?: FlowField
  qid?: string
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
  return fixedStatus(f).checks.filter((c) => !c.done).sort((a, b) => b.weight - a.weight)
    .map((c) => (c.key === 'quem_aparece' && hasVideo ? 'gravacao' : c.key) as FlowField)
}

export function fieldSteps(field: FlowField): QuizStep[] {
  if (field === 'gravacao') return [...(QUIZ.quem_aparece ?? []), ...(QUIZ.quem_grava ?? [])]
  if (isList(field)) return []
  return QUIZ[field] ?? [{ q: TEXT_FIELDS[field].hint, opts: [], open: true }]
}
export const fieldLabel = (field: FlowField) => (field === 'gravacao' ? 'Gravação' : isList(field) ? LIST[field].label : TEXT_FIELDS[field].label)

const n = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Os passos da conversa agora: as subperguntas (`when` do guia, `cond` do mês) entram conforme as respostas. */
export function flowSteps(fields: FlowField[], answers: Record<string, string>, questions: PortalQuestion[], monthLabel: string): FlowStep[] {
  const out: FlowStep[] = []
  for (const field of fields) {
    if (isList(field)) { const l = LIST[field]; out.push({ key: `${field}:0`, group: l.label, q: l.q, hint: l.hint, opts: l.opts ?? [], kind: 'list', field }); continue }
    const steps = fieldSteps(field)
    // No máximo 4 perguntas por campo (o resto fica no Briefing para quem quiser), mais as subperguntas que a resposta abrir.
    let base = 0
    const kept = new Set<number>()
    steps.forEach((s, j) => {
      if (s.when) {
        const m = steps.findIndex((x) => x.q === s.when!.q)
        const got = n(answers[`${field}:${m}`] ?? '')
        if (!kept.has(m) || !got || !s.when.has.some((h) => got.includes(n(h)))) return
      } else if (++base > MAX_PER_FIELD) return
      kept.add(j)
      out.push({ key: `${field}:${j}`, group: fieldLabel(field), q: s.q, opts: s.opts, multi: s.multi, kind: 'quiz', field })
    })
  }
  for (const q of visibleQuestions(questions)) {
    if (q.status === 'respondida') continue
    out.push({ key: `q:${q.id}`, group: monthLabel, q: q.question, hint: q.why, opts: q.options.slice(0, 6), multi: true, kind: 'question', qid: q.id })
  }
  return out
}

/** Texto salvo no campo do briefing: as respostas do guia daquele campo, como a equipe já recebe hoje. */
export function fieldText(field: FlowField, answers: Record<string, string>): string {
  const steps = fieldSteps(field)
  return quizText(steps, steps.map((_, j) => (answers[`${field}:${j}`] ? [answers[`${field}:${j}`]!] : [])))
}

/** Links colados ou falados: tudo o que parece endereço (com ou sem http). */
export function linksIn(text: string): string[] {
  const found = text.match(/(https?:\/\/[^\s,;]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/?[^\s,;]*|@[\w.]{3,})/gi) ?? []
  return [...new Set(found.map((u) => (u.startsWith('@') ? `https://instagram.com/${u.slice(1)}` : /^https?:\/\//i.test(u) ? u : `https://${u}`)))]
}

/** Nomes de concorrentes de uma frase: separa por vírgula, ponto e vírgula, linha ou " e ". */
export function namesIn(text: string): string[] {
  return text.split(/[,;\n]+|\s+e\s+/i).map((s) => s.trim().replace(/^[-•.]+\s*/, '')).filter((s) => s.length > 1).slice(0, 10)
}
