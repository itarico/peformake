// Regras puras da guia de revisão (diagnóstico, plano do mês e as outras estratégias):
// chave estável de cada slide, progresso, o que o cliente vê (sem recusados, com textos editados e dados preenchidos)
// e os campos "[CONFIRMAR …]" / "a confirmar" que viram dados para preencher.
import { buildSlides, esc, type DeckInput, type Orientation, type Slide } from '@/features/strategy/consultDeck'

type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export type Mark = 'ok' | 'recusado'
export interface SlideEdit { title?: string; texts?: { from: string; to: string }[] }
export interface SlideReview { s?: Mark; reason?: string; edit?: SlideEdit }
export interface ReviewState {
  slides?: Record<string, SlideReview>
  /** Caminho no documento (ex.: plano.fases.0.passos.3.como) → texto conferido. */
  fills?: Record<string, string>
  /** Passo do plano de ação ('fase.passo') → aprovado ou recusado. */
  steps?: Record<string, Mark>
  /** Ideias que a equipe adicionou (não vieram da IA). Chave do passo: 'a:<id>'. */
  adds?: Record<string, AddedIdea>
}
export type AddArea = 'trafego' | 'social' | 'design' | 'audiovisual' | 'vendas'
export interface AddedIdea { titulo: string; o_que?: string; area: AddArea; fase?: string }
export const ADD_AREA: Record<AddArea, string> = { trafego: 'Tráfego', social: 'Social', design: 'Design', audiovisual: 'Audiovisual', vendas: 'Vendas' }
export const ADDED_KICKER = 'Plano de ação · ideias novas'

/** Id curto para uma ideia nova (minúsculas e números, como o banco aceita). */
export const newAddId = () => Math.random().toString(36).slice(2, 10).padEnd(6, '0')

/**
 * Slides das ideias adicionadas pela equipe, logo depois da última fase do plano (no lugar certo da seção).
 * `skipRefused`: a versão do cliente não mostra a ideia recusada.
 */
export function insertAdded(slides: Slide[], doc: Doc, state: ReviewState | null | undefined, skipRefused = false): Slide[] {
  const list = Object.entries(state?.adds ?? {}).filter(([id, a]) => a?.titulo?.trim() && !(skipRefused && state?.steps?.[`a:${id}`] === 'recusado'))
  if (!list.length) return slides
  const fases = Array.isArray(doc?.plano?.fases) ? doc.plano.fases as Doc[] : []
  const groups: [string, AddedIdea][][] = []
  for (let i = 0; i < list.length; i += 4) groups.push(list.slice(i, i + 4))
  const extra: Slide[] = groups.map((g, gi) => ({
    section: 'plano', kicker: ADDED_KICKER, title: groups.length > 1 ? `Mais ideias para o plano (${gi + 1}/${groups.length})` : 'Mais ideias para o plano',
    body: `<ol class="steps">${g.map(([, a], i) => `<li><span class="num">${gi * 4 + i + 1}</span><span><b class="clamp-2">${esc(a.titulo)}</b><span class="tags"><span class="acc">${esc(ADD_AREA[a.area] ?? a.area)}</span>${a.fase !== undefined && fases[Number(a.fase)]?.periodo ? `<span>${esc(fases[Number(a.fase)]!.periodo)}</span>` : ''}</span></span></li>`).join('')}</ol>`,
    details: { title: 'Ideias novas', items: g.map(([, a]) => ({ k: a.titulo, v: a.o_que?.trim() || ADD_AREA[a.area] })) },
  }))
  let at = -1
  slides.forEach((s, i) => { if (s.section === 'plano' && /fase \d+ de \d+/.test(s.kicker ?? '')) at = i })
  if (at < 0) slides.forEach((s, i) => { if (s.section === 'plano') at = i })
  if (at < 0) at = Math.max(0, slides.length - 2)
  return [...slides.slice(0, at + 1), ...extra, ...slides.slice(at + 1)]
}
export type ReviewKind = 'diagnostico' | 'plano' | 'trafego' | 'social' | 'audiovisual' | 'trimestral'

/**
 * Chave de cada slide: parte + chamada (kicker) + ordem entre os iguais. Não depende do texto,
 * então editar ou preencher não perde a revisão; e é a mesma na tela da equipe e na versão do cliente.
 */
export function slideKeys(slides: Pick<Slide, 'kind' | 'section' | 'kicker'>[]): string[] {
  const seen = new Map<string, number>()
  return slides.map((s) => {
    const base = `${s.section ?? s.kind ?? ''}|${s.kind === 'cover' ? 'capa' : (s.kicker ?? '')}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return `${base}|${n}`
  })
}

const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** Textos editáveis de um slide (o que aparece escrito, fora dos gráficos), na ordem, sem repetir. */
export function textSegments(body: string): string[] {
  const noSvg = body.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<(style|script)[\s\S]*?<\/\1>/g, '')
  const out: string[] = []
  for (const m of noSvg.matchAll(/>([^<]+)</g)) {
    const t = unesc(m[1]!).replace(/\s+/g, ' ').trim()
    if (t.length < 2 || /^[\d\s/.,%★$–-]+$/.test(t) || out.includes(t)) continue
    out.push(t)
  }
  return out
}

/** Aplica a edição no slide (título e trechos de texto). Trecho que não existe mais é ignorado. */
export function applyEdit(s: Slide, e: SlideEdit | undefined): Slide {
  if (!e) return s
  let body = s.body
  for (const t of e.texts ?? []) {
    if (!t.from || t.from === t.to) continue
    body = body.split(`>${escHtml(t.from)}<`).join(`>${escHtml(t.to)}<`)
  }
  return { ...s, title: e.title?.trim() ? e.title.trim() : s.title, body }
}

// ───────── Dados a preencher ─────────
const MARK = /\s*\[(?:CONFIRMAR|confirmar|A CONFIRMAR)([^\]]*)\]/g
const LOOSE = /\b(a confirmar|a conferir|a definir)\b/i
/** Partes do documento que entram na apresentação (fontes e frameworks não). */
const ROOTS = ['resumo', 'diagnostico', 'comunicacao', 'experiencia', 'plano', 'riscos', 'inteligencia', 'confirmar']

export interface FillField {
  path: string
  /** Texto atual sem a marcação (é o que a pessoa corrige ou confirma). */
  text: string
  /** O que falta confirmar (o que vinha dentro do colchete, ou o item da lista "confirmar"). */
  hint: string
  /** Onde está (ex.: Plano · Fixar a campanha…). */
  where: string
  internal: boolean
}

const LABEL: Record<string, string> = { resumo: 'Resumo', diagnostico: 'Diagnóstico', comunicacao: 'Comunicação', experiencia: 'Experiência', plano: 'Plano', riscos: 'Riscos', inteligencia: 'Descobertas', confirmar: 'Confirmar com o cliente' }

export const stripMarks = (s: string) => s.replace(MARK, '').replace(/\s+([.,;:!?])/g, '$1').trim()

/** Todos os "[CONFIRMAR …]", "a confirmar" e itens da lista "confirmar" do documento, como campos simples. */
export function findFills(doc: Doc): FillField[] {
  const out: FillField[] = []
  const walk = (v: unknown, path: string[], ctx: string) => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, [...path, String(i)], ctx)); return }
    if (v && typeof v === 'object') {
      const o = v as Doc
      const label = [o.acao, o.titulo, o.item, o.nome, o.risco, o.momento, o.etapa, o.canal, o.decisao].find((x) => typeof x === 'string' && x.trim()) as string | undefined
      for (const [k, x] of Object.entries(o)) walk(x, [...path, k], label ? String(label) : ctx)
      return
    }
    if (typeof v !== 'string' || path.length < 2) return
    if (path[0] === 'confirmar') {
      if (path[2] !== 'encontrado') return
      const item = String(doc.confirmar?.[Number(path[1])]?.item ?? 'Confirmar')
      out.push({ path: path.join('.'), text: stripMarks(v), hint: item, where: LABEL.confirmar!, internal: true })
      return
    }
    const marks = [...v.matchAll(MARK)].map((m) => m[1]!.trim()).filter(Boolean)
    const has = v.match(MARK) || LOOSE.test(v)
    if (!has) return
    const root = path[0]!
    const internal = root === 'inteligencia' && /^(decisoes_peformake|red_flags|problemas_internos|confirmar|perguntas)$/.test(path[1] ?? '')
    const short = ctx.length > 48 ? `${ctx.slice(0, 46).trim()}…` : ctx
    out.push({ path: path.join('.'), text: stripMarks(v), hint: marks.join(' · ') || (v.match(LOOSE)?.[0] ?? 'confirmar'), where: [LABEL[root] ?? root, short].filter(Boolean).join(' · '), internal })
  }
  for (const r of ROOTS) if (doc?.[r] !== undefined) walk(doc[r], [r], '')
  return out
}

function setPath(o: Doc, p: string[], v: unknown): void {
  let cur: Doc = o
  for (const k of p.slice(0, -1)) { if (!cur[k] || typeof cur[k] !== 'object') return; cur = cur[k] }
  if (typeof cur[p[p.length - 1]!] === 'string') cur[p[p.length - 1]!] = v
}

/** Documento com os dados preenchidos (só troca texto que existe; nunca cria campo). */
export function applyFills(doc: Doc, fills: Record<string, string> | undefined): Doc {
  if (!fills || !Object.keys(fills).length) return doc
  const out = structuredClone(doc)
  for (const [k, v] of Object.entries(fills)) if (typeof v === 'string' && v.trim()) setPath(out, k.split('.'), v.trim())
  return out
}

/** Tira do plano os passos recusados (a versão do cliente não mostra o que a equipe não aprovou). */
export function removeRefusedSteps(doc: Doc, steps: Record<string, Mark> | undefined): Doc {
  const refused = Object.entries(steps ?? {}).filter(([, v]) => v === 'recusado').map(([k]) => k)
  if (!refused.length || !Array.isArray(doc?.plano?.fases)) return doc
  const out = structuredClone(doc)
  out.plano.fases = (out.plano.fases as Doc[]).map((f, fi) => ({ ...f, passos: (Array.isArray(f.passos) ? f.passos : []).filter((_: unknown, si: number) => !refused.includes(`${fi}.${si}`)) }))
  return out
}

/** Slides que o cliente vê: sem os recusados (nem os internos), com o texto editado. */
export function clientSlides(slides: Slide[], state: ReviewState | null | undefined): Slide[] {
  const keys = slideKeys(slides)
  return slides.flatMap((s, i) => {
    const r = state?.slides?.[keys[i]!]
    if (s.internal || r?.s === 'recusado') return []
    return [applyEdit(s, r?.edit)]
  })
}

/** A apresentação do cliente com a revisão aplicada (link público, portal, PDF e "Abrir apresentação"). */
export function reviewedInput(input: DeckInput, state: ReviewState | null | undefined): DeckInput {
  if (!state || (!state.fills && !state.slides && !state.steps && !state.adds)) return input
  const doc = removeRefusedSteps(applyFills(input.doc, state.fills), state.steps)
  const base: DeckInput = { ...input, doc }
  return { ...base, slides: (o: Orientation) => clientSlides(input.slides ? input.slides(o) : insertAdded(buildSlides(base, o), doc, state, true), state) }
}

// ───────── Progresso ─────────
export interface Progress { total: number; reviewed: number; ok: number; refused: number; edited: number; toFill: number }

export function progress(keys: string[], state: ReviewState | null | undefined, toFill: number): Progress {
  let ok = 0, refused = 0, edited = 0, reviewed = 0
  for (const k of keys) {
    const r = state?.slides?.[k]
    if (!r) continue
    if (r.s === 'ok') ok++
    if (r.s === 'recusado') refused++
    if (r.edit && (r.edit.title || r.edit.texts?.length)) edited++
    if (r.s || r.edit) reviewed++
  }
  return { total: keys.length, reviewed, ok, refused, edited, toFill }
}

export function progressLabel(p: Progress): string {
  const fill = p.toFill ? ` · ${p.toFill} ${p.toFill === 1 ? 'dado para preencher' : 'dados para preencher'}` : ''
  return `${p.reviewed} de ${p.total} revisados${fill}`
}

/** Campos de preenchimento que aparecem em cada slide (marca invisível no texto, procurada no slide montado). */
export function fillsBySlide(input: DeckInput, o: Orientation, fields: FillField[], opts: { internal?: boolean } = {}): string[][] {
  const doc = structuredClone(input.doc)
  fields.forEach((f, n) => setPath(doc, f.path.split('.'), `${f.text} ⟦${n}⟧`))
  const slides = buildSlides({ ...input, doc, slides: undefined }, o, opts)
  return slides.map((s) => {
    const hay = `${s.title ?? ''} ${s.body} ${JSON.stringify(s.details ?? '')}`
    return fields.flatMap((f, n) => (hay.includes(`⟦${n}⟧`) ? [f.path] : []))
  })
}

/** Passos do plano de ação de um slide "Plano de ação · fase N de M" (índice da fase), ou null. */
export function planPhaseOf(s: Pick<Slide, 'kicker' | 'section'>): number | null {
  const m = /fase (\d+) de \d+/.exec(s.kicker ?? '')
  return s.section === 'plano' && m ? Number(m[1]) - 1 : null
}
