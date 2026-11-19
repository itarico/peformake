// Audiovisual em TRÊS PARTES (Italo, 19/11/2026), cada uma para um público, no mesmo PDF (capítulos), em 3 downloads e
// em 3 abas na leitura:
//   1. Cliente (quem fala na câmera): só a fala (ou a cola), as perguntas com pontos, o que vestir/onde/quando. Nada técnico.
//   2. Gravação (Ellcazo): storyboard quadro a quadro (SVG esquemático, sem IA de imagem), shot list, ordem da diária, equipamentos.
//   3. Edição: por bloco, cortes, B-roll, texto na tela, trilha/som, motion; e os derivados (reel, story, anúncio...).
// Funções puras: a tela (StrategyReader) e o PDF (strategyDoc) usam o mesmo modelo. Card sem os campos do motor: tudo
// que falta some sem deixar buraco.
// Opção futura (fora do escopo agora): prévia animada 2D/3D só para vídeos especiais.
import type { StrategyCard } from './cardRules'
import { isFreeAnswer, splitSpeaker, videoDoc, type Question, type ScriptBlock } from './scriptRules'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
/** Sem acento e em minúsculas (as direções vêm em CAIXA ALTA, com ou sem acento). */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export type AvPart = 'cliente' | 'gravacao' | 'edicao'
export const AV_PARTS: { id: AvPart; label: string; title: string; who: string }[] = [
  { id: 'cliente', label: 'Cliente', title: 'Para o cliente', who: 'Quem fala na câmera: a fala, as perguntas e o que levar.' },
  { id: 'gravacao', label: 'Gravação', title: 'Gravação', who: 'Ellcazo: storyboard, shot list, ordem da diária e equipamentos.' },
  { id: 'edicao', label: 'Edição', title: 'Edição', who: 'Edição: cortes, B-roll, texto na tela, trilha, motion e derivados.' },
]

// ───────── Direção → enquadramento, movimento, som, texto na tela ─────────

export type Framing = 'geral' | 'medio' | 'close' | 'detalhe' | 'pov' | 'drone'
export type Move = 'travelling' | 'pan' | 'sobe' | 'desce' | 'entra' | 'sai' | 'zoom'
export const FRAMING_LABEL: Record<Framing, string> = { geral: 'Plano geral', medio: 'Plano médio', close: 'Close', detalhe: 'Detalhe', pov: 'POV', drone: 'Drone' }
export const MOVE_LABEL: Record<Move, string> = { travelling: 'Travelling', pan: 'Pan', sobe: 'Sobe', desce: 'Desce', entra: 'Entra no quadro', sai: 'Sai do quadro', zoom: 'Zoom' }

const OBJ = '(peca|pecas|produto|produtos|mao|maos|unha|unhas|tubo|tubos|etiqueta|tela|celular|objeto|prato|rotulo|embalagem|registro|joelho|luva|caixa|nota)'
/** Palavras que dizem o plano (a primeira citada vale; empate: a mais específica). */
const FRAMING_RX: [Framing, RegExp][] = [
  ['drone', /\bdrone\b|\baere[ao]\b|vista de cima|de cima para baixo|top ?view|zenital/],
  ['pov', /\bpov\b|ponto de vista|primeira pessoa|\bsubjetiva\b/],
  ['detalhe', new RegExp(`\\bdetalhe\\b|\\bmacro\\b|\\binsert\\b|close (n|d)[ao]s? ${OBJ}\\b`)],
  ['close', /\bclose\b|mostra [^.]{0,30}(para|pra) a camera|\bna mao\b|close-up|primeiro plano|primeirissimo|plano fechado|\brosto\b/],
  ['medio', /plano medio|(olha|fala|vira) (para|pra) a camera|\bmedio\b|meio corpo|plano americano|da cintura/],
  ['geral', /plano (aberto|geral)|\baberto\b|\bgeral\b|panoramica|fachada|\bambiente\b|corredor|loja (inteira|toda)|estabelecimento|de longe|corpo inteiro/],
]
const MOVE_RX: [Move, RegExp][] = [
  ['travelling', /travel+ing|acompanha|\bsegue\b|seguindo|\bcaminha(r|ndo)?\b|\banda\b|andando|\bandar\b|passa (pel|por)|\bdolly\b|steady/],
  ['pan', /\bpan\b|panoramica (para|ate|da|do)|gira a camera|camera gira|\bvarre\b/],
  ['sobe', /\bsobe\b|subindo|tilt up|\bergue\b/],
  ['desce', /\bdesce\b|descendo|tilt down/],
  ['entra', /\bentra\b|entrando/],
  ['sai', /\bsai\b|saindo/],
  ['zoom', /\bzoom\b|aproxima|push ?in|\bafasta\b/],
]
const SOUND_RX: [string, RegExp][] = [
  ['Trilha', /trilha|musica|\bbeat\b|batida/],
  ['Voz off', /voz (de fora|off|over|em off)|fora do quadro|narra/],
  ['Som', /\bsfx\b|efeito sonoro|\bsom\b|barulho|ruido|silencio|\baudio\b/],
]

/** A regra que aparece primeiro no texto (empate: a primeira da lista). */
function earliest<T>(t: string, rules: [T, RegExp][]): T | null {
  let best: { v: T; at: number } | null = null
  for (const [v, rx] of rules) { const m = rx.exec(t); if (m && (!best || m.index < best.at)) best = { v, at: m.index } }
  return best?.v ?? null
}

/** Enquadramento deduzido da direção. Sem pista: plano médio (a pessoa falando). Campo explícito do bloco vence. */
export function framingOf(dir: string, explicit?: unknown): Framing {
  const e = earliest(norm(str(explicit)), FRAMING_RX)
  return e ?? earliest(norm(dir), FRAMING_RX) ?? 'medio'
}
/** Movimento de câmera ou de quem está no quadro. "Trilha sobe" é som, não movimento. */
export function movementOf(dir: string, explicit?: unknown): Move | null {
  const clean = (t: string) => norm(t).replace(/(trilha|musica|som|volume|audio|beat)( \w+)? (sobe|desce|entra|sai)/g, '')
  return earliest(clean(str(explicit)), MOVE_RX) ?? earliest(clean(dir), MOVE_RX)
}
export const soundOf = (dir: string) => earliest(norm(dir), SOUND_RX) ?? ''
/** "Texto na tela: “Quando o cliente…”" → o texto. */
export function screenTextOf(dir: string): string {
  const m = /(?:texto na tela|lettering|letreiro|t[ií]tulo na tela)\s*:?\s*[“"]?([^”"]+?)[”"]?(?:[.;]\s|[.;]?$)/i.exec(dir)
  return m ? m[1]!.trim() : ''
}
/** 9:16 por padrão; 16:9 quando o formato pede (YouTube, horizontal, paisagem, institucional longo). */
export const orientationOf = (formato: unknown): 'vertical' | 'horizontal' => (/horizontal|16 ?: ?9|paisagem|youtube|deitad|widescreen/.test(norm(str(formato))) ? 'horizontal' : 'vertical')

/** Resumo curto (cabe embaixo do quadro). */
export function summary(t: string, max = 90): string {
  const x = t.replace(/\s+/g, ' ').trim()
  if (x.length <= max) return x
  const cut = x.slice(0, max); const sp = cut.lastIndexOf(' ')
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,.;:!?-]+$/, '')}…`
}
/** Primeira letra maiúscula, resto em frase (direção em CAIXA ALTA lê melhor assim). */
function sentence(s: string): string {
  const t = s.trim().replace(/^\[|\]$/g, '').trim()
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '')
  const x = letters.length > 3 && letters === letters.toUpperCase() ? t.toLowerCase() : t
  return x.charAt(0).toUpperCase() + x.slice(1)
}
/** O trecho da direção que contém a palavra (para a edição ler só o que é dela). */
function clauseWith(t: string, rx: RegExp): string {
  for (const c of t.split(/[.;·]\s*|\s+\/\s+/)) if (rx.test(norm(c))) return sentence(c).replace(/[.]$/, '')
  return ''
}

// ───────── Storyboard ─────────

export interface Frame {
  n: number; cena: string; speaker: string; caption: string
  framing: Framing; move: Move | null; sound: string; text: string
}
const steps = (d: Any): Any[] => (Array.isArray(d?.roteiro) ? d.roteiro : []).map((s: Any) => (typeof s === 'string' ? { cena: '', fala: s } : s ?? {})).filter((s: Any) => str(s.cena) || str(s.fala))

/** Um quadro por bloco do roteiro. Sem direção, o bloco herda o plano do anterior. */
export function storyboard(c: Pick<StrategyCard, 'data'>): Frame[] {
  const d = (c.data ?? {}) as Any
  let prev: Framing = 'medio'
  return steps(d).map((s, i) => {
    const cena = str(s.cena)
    const { speaker, text } = splitSpeaker(str(s.fala))
    const hasHint = !!(str(s.plano) || str(s.enquadramento) || earliest(norm(cena), FRAMING_RX))
    const framing = hasHint ? framingOf(cena, s.plano ?? s.enquadramento) : prev
    prev = framing
    return {
      n: i + 1, cena: cena ? sentence(cena) : '', speaker, framing,
      caption: isFreeAnswer(text) ? '(resposta espontânea)' : summary(text),
      move: movementOf(cena, s.movimento), sound: str(s.trilha) ? 'Trilha' : soundOf(cena), text: str(s.texto_tela) || screenTextOf(cena),
    }
  })
}

const LIME = '#B5E61D'; const INK = '#1d1f1a'; const SOFT = '#e2e4df'
const f1 = (n: number) => Math.round(n * 10) / 10
function arrow(x1: number, y1: number, x2: number, y2: number): string {
  const a = Math.atan2(y2 - y1, x2 - x1); const h = 5
  const p = (da: number) => `${f1(x2 - h * Math.cos(a + da))},${f1(y2 - h * Math.sin(a + da))}`
  return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><polygon points="${f1(x2)},${f1(y2)} ${p(0.5)} ${p(-0.5)}" fill="${INK}"/>`
}
function person(cx: number, headY: number, r: number, bottom: number): string {
  const sw = r * 1.7; const sy = headY + r * 1.35; const k = r * 0.9
  return `<path d="M${f1(cx - sw)} ${f1(bottom)} L${f1(cx - sw)} ${f1(sy + k)} Q${f1(cx - sw)} ${f1(sy)} ${f1(cx - sw + k)} ${f1(sy)} L${f1(cx + sw - k)} ${f1(sy)} Q${f1(cx + sw)} ${f1(sy)} ${f1(cx + sw)} ${f1(sy + k)} L${f1(cx + sw)} ${f1(bottom)} Z" fill="${LIME}" stroke="${INK}" stroke-width="1"/><circle cx="${f1(cx)}" cy="${f1(headY)}" r="${f1(r)}" fill="${LIME}" stroke="${INK}" stroke-width="1"/>`
}

/** Quadro esquemático (SVG) do plano: a silhueta no tamanho do plano, seta de movimento, ícone de som e de texto na tela. */
export function frameSvg(f: Pick<Frame, 'n' | 'framing' | 'move' | 'sound' | 'text'>, orient: 'vertical' | 'horizontal' = 'vertical'): string {
  const W = orient === 'vertical' ? 90 : 160; const H = orient === 'vertical' ? 160 : 90
  const cx = W / 2; const m = Math.min(W, H)
  let body = ''
  switch (f.framing) {
    case 'geral': {
      const g = H * 0.84; const r = m * 0.05
      body = `<line x1="4" y1="${f1(H * 0.58)}" x2="${W - 4}" y2="${f1(H * 0.58)}" stroke="${SOFT}" stroke-width="1"/><line x1="0" y1="${f1(g)}" x2="${W}" y2="${f1(g)}" stroke="${INK}" stroke-width="1"/>`
        + `<line x1="${f1(cx - r * 0.7)}" y1="${f1(g - r * 3.2)}" x2="${f1(cx - r * 0.9)}" y2="${f1(g)}" stroke="${INK}" stroke-width="1.4"/><line x1="${f1(cx + r * 0.7)}" y1="${f1(g - r * 3.2)}" x2="${f1(cx + r * 0.9)}" y2="${f1(g)}" stroke="${INK}" stroke-width="1.4"/>`
        + person(cx, g - r * 7.2, r, g - r * 3)
      break
    }
    case 'medio': body = person(cx, H * 0.42, m * 0.13, H); break
    case 'close': body = person(cx, H * (orient === 'vertical' ? 0.46 : 0.5), m * 0.27, H + 2); break
    case 'detalhe': {
      const w = m * 0.5; const h = m * 0.34; const y = H / 2 - h / 2; const b = m * 0.12; const o = m * 0.14
      body = `<rect x="${f1(cx - w / 2)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h * 0.22)}" fill="${LIME}" stroke="${INK}" stroke-width="1"/>`
        + [[o, o, 1, 1], [W - o, o, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]].map(([x, yy, sx, sy]) => `<path d="M${f1(x!)} ${f1(yy! + sy! * b)} L${f1(x!)} ${f1(yy!)} L${f1(x! + sx! * b)} ${f1(yy!)}" fill="none" stroke="${INK}" stroke-width="1.4"/>`).join('')
      break
    }
    case 'pov': {
      const hz = H * 0.5
      body = `<line x1="0" y1="${f1(hz)}" x2="${W}" y2="${f1(hz)}" stroke="${SOFT}" stroke-width="1"/>` + person(cx, hz - m * 0.12, m * 0.05, hz + m * 0.12)
        + `<path d="M0 ${f1(H)} L${f1(W * 0.06)} ${f1(H * 0.74)} L${f1(W * 0.3)} ${f1(H * 0.7)} L${f1(W * 0.32)} ${f1(H)} Z" fill="${LIME}" stroke="${INK}" stroke-width="1"/>`
        + `<path d="M${W} ${f1(H)} L${f1(W * 0.94)} ${f1(H * 0.74)} L${f1(W * 0.7)} ${f1(H * 0.7)} L${f1(W * 0.68)} ${f1(H)} Z" fill="${LIME}" stroke="${INK}" stroke-width="1"/>`
      break
    }
    case 'drone': {
      const lines = [0.2, 0.4, 0.6, 0.8].map((k) => `<line x1="${f1(W * k)}" y1="0" x2="${f1(W * k)}" y2="${H}" stroke="${SOFT}" stroke-width="1"/><line x1="0" y1="${f1(H * k)}" x2="${W}" y2="${f1(H * k)}" stroke="${SOFT}" stroke-width="1"/>`).join('')
      const r = m * 0.06
      body = lines + `<ellipse cx="${f1(cx)}" cy="${f1(H / 2)}" rx="${f1(r * 2.2)}" ry="${f1(r * 1.1)}" fill="${LIME}" stroke="${INK}" stroke-width="1"/><circle cx="${f1(cx)}" cy="${f1(H / 2)}" r="${f1(r)}" fill="${LIME}" stroke="${INK}" stroke-width="1"/>`
      break
    }
  }
  let mv = ''
  const y9 = H * 0.92
  switch (f.move) {
    case 'travelling': mv = arrow(W * 0.18, y9, W * 0.82, y9); break
    case 'pan': mv = `<path d="M${f1(W * 0.2)} ${f1(H * 0.2)} Q${f1(cx)} ${f1(H * 0.08)} ${f1(W * 0.78)} ${f1(H * 0.2)}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` + arrow(W * 0.74, H * 0.18, W * 0.82, H * 0.23); break
    case 'sobe': mv = arrow(W * 0.88, H * 0.75, W * 0.88, H * 0.25); break
    case 'desce': mv = arrow(W * 0.88, H * 0.25, W * 0.88, H * 0.75); break
    case 'entra': mv = arrow(W * 0.02, H * 0.62, W * 0.3, H * 0.62); break
    case 'sai': mv = arrow(W * 0.7, H * 0.62, W * 0.98, H * 0.62); break
    case 'zoom': mv = arrow(W * 0.1, H * 0.1, W * 0.24, H * 0.1 + W * 0.14) + arrow(W * 0.9, H * 0.9, W * 0.76, H * 0.9 - W * 0.14); break
  }
  const snd = f.sound ? `<g transform="translate(6 ${f1(H - 16)})"><circle cx="3" cy="9" r="3" fill="${INK}"/><path d="M6 9 V0 L12 2 V5 L6 3" fill="${INK}"/></g>` : ''
  const txt = f.text ? `<g><rect x="${f1(W * 0.16)}" y="${f1(H * 0.12)}" width="${f1(W * 0.68)}" height="12" rx="3" fill="#fff" stroke="${INK}" stroke-width="1"/><text x="${f1(cx)}" y="${f1(H * 0.12 + 9)}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="8" font-weight="800" fill="${INK}">Aa</text></g>` : ''
  const label = `<text x="5" y="11" font-family="Inter,Arial,sans-serif" font-size="7.5" font-weight="800" fill="${INK}">${FRAMING_LABEL[f.framing].toUpperCase()}</text>`
  const num = `<circle cx="${W - 10}" cy="9" r="6.5" fill="${LIME}" stroke="${INK}" stroke-width="1"/><text x="${W - 10}" y="11.6" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="7.5" font-weight="800" fill="${INK}">${f.n}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Quadro ${f.n}: ${FRAMING_LABEL[f.framing]}${f.move ? `, ${MOVE_LABEL[f.move]}` : ''}" data-quadro="${f.framing}"><defs><clipPath id="ezq-${orient[0]}"><rect width="${W}" height="${H}" rx="6"/></clipPath></defs><g clip-path="url(#ezq-${orient[0]})"><rect width="${W}" height="${H}" fill="#fff"/>${body}${mv}${snd}${txt}</g>${label}${num}<rect x="0.6" y="0.6" width="${W - 1.2}" height="${H - 1.2}" rx="6" fill="none" stroke="${INK}" stroke-width="1.2"/></svg>`
}

// ───────── As três partes ─────────

/** Texto ou lista (string, array de strings ou de objetos) → linhas. */
export function toLines(v: unknown): string[] {
  if (typeof v === 'string') return v.split(/\n+|;\s+/).map((x) => x.replace(/^[-•\d.)\s]+/, '').trim()).filter(Boolean)
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' || typeof x === 'number' ? String(x) : x && typeof x === 'object' ? Object.values(x).map(str).filter(Boolean).join(' · ') : '')).map((x) => x.trim()).filter(Boolean)
  return []
}
/** Direção que é para a equipe (câmera, edição): não vai para o cliente. */
const TECH = /\bplano\b|\bclose\b|travel+ing|\bpan\b|\bdrone\b|\bpov\b|\bcorte\b|\bcorta\b|transic|b-?roll|texto na tela|lettering|trilha|\bsfx\b|enquadr|\binsert\b|\bdetalhe\b|\bgrua\b|gimbal|\bzoom\b|\bfade\b|motion|camera (lenta|sobe|desce|gira)|em off|fora do quadro/

export interface ClientPart { blocks: ScriptBlock[]; cola: string[]; questions: Question[]; logistics: { label: string; value: string }[] }
/** Para quem fala na câmera: a fala (sem direção técnica), a cola, as perguntas e o que levar. */
export function clientPart(c: Pick<StrategyCard, 'title' | 'data'>, index = 0): ClientPart {
  const d = (c.data ?? {}) as Any; const p = (d.producao ?? {}) as Any
  const doc = videoDoc(c, index)
  const blocks = doc.blocks.map((b) => ({ ...b, items: b.items.filter((it) => it.kind !== 'dir' || !TECH.test(norm(it.text))) })).filter((b) => b.items.some((it) => it.kind === 'fala'))
  const f = str(d.filmar)
  const pick = (...vs: unknown[]) => vs.map((v) => (Array.isArray(v) ? toLines(v).join(', ') : str(v))).find(Boolean) ?? ''
  const logistics = [
    { label: 'O que vestir', value: pick(d.vestir, d.roupa, d.figurino, p.vestir, p.roupa, p.figurino) },
    { label: 'Onde', value: pick(d.local, p.local, /(?:Onde|Local):\s*([^.;\n]+)/i.exec(f)?.[1]) },
    { label: 'Quando', value: pick(d.horario, d.data_gravacao, p.horario, p.data, /Di[aá]ria\s+(?:em\s+|dia\s+)?(\d{1,2}\/\d{1,2}[^.;\n]*)/i.exec(f)?.[1]) },
    { label: 'Duração', value: typeof d.duracao_s === 'number' || /^\d+$/.test(str(d.duracao_s)) ? `cerca de ${str(d.duracao_s)} segundos` : '' },
  ].filter((x) => x.value)
  return { blocks, cola: toLines(p.cola ?? d.cola), questions: doc.questions, logistics }
}

export interface ShootPart { orient: 'vertical' | 'horizontal'; frames: Frame[]; shotList: string[]; order: string[]; gear: string[]; gearSuggested: boolean; team: string; ref: string }
/** Para a Ellcazo: storyboard, shot list, ordem da diária e equipamentos (deduzidos quando o card não traz). */
export function shootPart(c: Pick<StrategyCard, 'data' | 'inspired'>): ShootPart {
  const d = (c.data ?? {}) as Any; const p = (d.producao ?? {}) as Any
  const orient = orientationOf(d.formato)
  const frames = storyboard(c)
  const given = toLines(p.equipamentos ?? d.equipamentos)
  const has = (pred: (f: Frame) => boolean) => frames.some(pred)
  const gear = given.length ? given : frames.length ? [
    orient === 'vertical' ? 'Câmera ou celular na vertical (9:16)' : 'Câmera na horizontal (16:9)',
    ...(has((f) => !f.move || f.move === 'zoom') ? ['Tripé'] : []),
    ...(has((f) => f.move === 'travelling' || f.move === 'pan' || f.framing === 'pov') ? ['Gimbal ou estabilizador'] : []),
    ...(has((f) => f.framing === 'drone') ? ['Drone'] : []),
    ...(has((f) => !!f.speaker) || Array.isArray(d.perguntas) ? ['Microfone de lapela'] : []),
    ...(has((f) => f.framing === 'close' || f.framing === 'detalhe') ? ['Luz de preenchimento'] : []),
  ] : []
  return {
    orient, frames, shotList: toLines(p.shot_list ?? d.shot_list), order: toLines(p.plano_diaria ?? d.plano_diaria), gear, gearSuggested: !given.length,
    team: str(d.filmar), ref: str(d.referencia?.link) || str(c.inspired?.link),
  }
}

export interface EditBeat { n: number; caption: string; items: { label: string; value: string }[] }
export interface EditPart { beats: EditBeat[]; general: string[]; derivados: string[]; publicacao: { label: string; value: string }[] }
const EDIT_RX = {
  corte: /corta para|\bcorte\b|jump ?cut|match ?cut|transic|\bfade\b|chicote|whip|congela/,
  broll: /b-?roll|cobre com|cobertura|imagens? d[eao]s?\b|\binsert\b/,
  motion: /motion|anima|grafismo|\bseta\b|contador|split|\bzoom\b|legenda animada|lettering/,
}
/** Para a edição: por bloco, o que fazer (do card ou deduzido da direção); depois os derivados e a publicação. */
export function editPart(c: Pick<StrategyCard, 'data'>): EditPart {
  const d = (c.data ?? {}) as Any; const p = (d.producao ?? {}) as Any
  const frames = storyboard(c)
  const beats = steps(d).map((s, i) => {
    const cena = str(s.cena); const f = frames[i]!
    const items = [
      { label: 'Corte', value: str(s.corte) || str(s.transicao) || clauseWith(cena, EDIT_RX.corte) },
      { label: 'B-roll', value: str(s.broll) || str(s.b_roll) || clauseWith(cena, EDIT_RX.broll) || (f.framing === 'detalhe' && !f.speaker ? sentence(cena) : '') },
      { label: 'Texto na tela', value: f.text },
      { label: 'Trilha e som', value: str(s.trilha) || str(s.som) || (f.sound ? clauseWith(cena, /trilha|musica|beat|batida|sfx|efeito sonoro|\bsom\b|barulho|ruido|silencio|audio|voz|fora do quadro|narra/) || f.sound : '') },
      { label: 'Motion', value: str(s.motion) || clauseWith(cena, EDIT_RX.motion) },
    ].filter((x) => x.value)
    return { n: i + 1, caption: f.caption || f.cena, items }
  })
  const pub = (p.publicacao ?? d.publicacao ?? {}) as Any
  const derivados = (Array.isArray(p.derivados) ? p.derivados : []).map((x: Any) => typeof x === 'string' ? x
    : [str(x?.formato) || str(x?.estrutura), str(x?.duracao_s) ? `${str(x.duracao_s)} s` : '', str(x?.gancho) && `abre com “${str(x.gancho)}”`, str(x?.usa) && `usa ${str(x.usa)}`, str(x?.gravar_a_mais) && `gravar a mais: ${str(x.gravar_a_mais)}`].filter(Boolean).join(' · ')).filter(Boolean)
  return {
    beats, general: toLines(d.edicao ?? p.edicao), derivados,
    publicacao: [{ label: 'Capa', value: str(pub.capa) }, { label: 'Primeira linha', value: str(pub.primeira_linha) }, { label: 'Legenda', value: str(pub.legenda) }, { label: 'Chamada nos comentários', value: str(pub.cta_comentario) }].filter((x) => x.value),
  }
}
