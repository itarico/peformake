// Audiovisual por VÍDEO em três partes (Italo, 19/11/2026, v2): Narração · Gravação · Edição, na tela (3 abas) e no PDF
// (3 páginas seguidas por vídeo):
//   1. Narração (para o cliente): só a fala completa e, se for entrevista, as perguntas. Nada técnico.
//   2. Gravação (Ellcazo): o storyboard da MONTAGEM (construção visual do vídeo na ordem: fala, cena de apoio, detalhe,
//      insert de tela, gráfico, tela de texto), a lista do que captar, "Aproveite a gravação" (stories, reels no celular,
//      fotos) e a referência (só se existir).
//   3. Edição: o guia curto e os tempos da montagem.
// O card traz `data.montagem` [{t, visual, tipo, audio, texto_tela}], `data.captar`, `data.edicao`, `data.extras`,
// `data.referencia` {link, porque}. Sem montagem: deduz dos blocos do roteiro. O que falta some sem deixar buraco.
// Funções puras: a tela (AvPartsView) e o PDF (strategyDoc) usam o mesmo modelo.
import type { StrategyCard } from './cardRules'
import { isFreeAnswer, splitSpeaker, usefulDirection, videoDoc, type Question } from './scriptRules'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
/** Sem acento e em minúsculas (as direções vêm em CAIXA ALTA, com ou sem acento). */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export type AvPart = 'narracao' | 'gravacao' | 'edicao'
export const AV_PARTS: { id: AvPart; label: string }[] = [
  { id: 'narracao', label: 'Narração' },
  { id: 'gravacao', label: 'Gravação' },
  { id: 'edicao', label: 'Edição' },
]

// ───────── Utilidades de texto ─────────

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
/** Texto ou lista (string, array de strings ou de objetos) → linhas. */
export function toLines(v: unknown): string[] {
  if (typeof v === 'string') return v.split(/\n+|;\s+/).map((x) => x.replace(/^[-•\d.)\s]+/, '').trim()).filter(Boolean)
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' || typeof x === 'number' ? String(x) : x && typeof x === 'object' ? Object.values(x).map(str).filter(Boolean).join(' · ') : '')).map((x) => x.trim()).filter(Boolean)
  return []
}
/** "Texto na tela: “Quando o cliente…”" → o texto. */
export function screenTextOf(dir: string): string {
  const m = /(?:texto na tela|lettering|letreiro|t[ií]tulo na tela)\s*:?\s*[“"]?([^”"]+?)[”"]?(?:[.;]\s|[.;]?$)/i.exec(dir)
  return m ? m[1]!.trim() : ''
}
/** 9:16 por padrão; 16:9 quando o formato pede (YouTube, horizontal, paisagem, institucional longo). */
export const orientationOf = (formato: unknown): 'vertical' | 'horizontal' => (/horizontal|16 ?: ?9|paisagem|youtube|deitad|widescreen/.test(norm(str(formato))) ? 'horizontal' : 'vertical')

// ───────── Montagem (o storyboard) ─────────

export type ShotType = 'fala' | 'apoio' | 'detalhe' | 'insert' | 'grafico' | 'texto'
export const SHOT_LABEL: Record<ShotType, string> = { fala: 'Fala', apoio: 'Cena de apoio', detalhe: 'Detalhe', insert: 'Insert de tela', grafico: 'Gráfico', texto: 'Texto na tela' }
export interface Shot { n: number; t: string; tipo: ShotType; visual: string; audio: string; texto: string }

const TYPE_RX: [ShotType, RegExp][] = [
  ['texto', /^texto|lettering|letreiro|cartela|tela de texto|so texto|tipografia/],
  ['grafico', /grafico|numero|contador|dado|percentual|porcentagem|\d+ ?%|barra|chart/],
  ['insert', /insert|print|tela do (celular|computador|site|whatsapp)|screenshot|captura de tela|celular na mao mostrando|mockup/],
  ['detalhe', /detalhe|macro|close (n|d)[ao]s? |closes? de |mao|maos|produto|peca|objeto|textura/],
  ['apoio', /apoio|b-?roll|ambiente|fachada|corredor|plano (aberto|geral)|movimento da loja|equipe trabalhando|drone|cidade|rua|estoque|cena/],
  ['fala', /fala|olha (para|pra) a camera|entrevista|depoimento|talking/],
]
/** Tipo do quadro: o campo do card (com sinônimos) ou deduzido da descrição. */
export function shotTypeOf(tipo: unknown, visual = '', hasSpeech = false): ShotType {
  const t = norm(str(tipo))
  const direct: Record<string, ShotType> = { fala: 'fala', apoio: 'apoio', broll: 'apoio', 'b-roll': 'apoio', detalhe: 'detalhe', close: 'detalhe', insert: 'insert', print: 'insert', tela: 'insert', grafico: 'grafico', numero: 'grafico', texto: 'texto', lettering: 'texto' }
  if (direct[t]) return direct[t]!
  for (const [k, rx] of TYPE_RX) if (rx.test(t)) return k
  const v = norm(visual)
  for (const [k, rx] of TYPE_RX) if (rx.test(v)) return k === 'apoio' && hasSpeech && /fala|camera/.test(v) ? 'fala' : k
  return hasSpeech ? 'fala' : 'apoio'
}

const steps = (d: Any): Any[] => (Array.isArray(d?.roteiro) ? d.roteiro : []).map((s: Any) => (typeof s === 'string' ? { cena: '', fala: s } : s ?? {})).filter((s: Any) => str(s.cena) || str(s.fala))

/** Rótulo de etapa ("Fecho", "Abertura"…): não descreve imagem. */
const STAGE = /^(abertura|meio|fecho|final|fim|gancho|cta|chamada|desenvolvimento|in[ií]cio|encerramento|corte)\.?$/i

/** Duração em segundos: `duracao_s` ou o fim do último tempo da montagem ("50–60s" → 60). */
export function durationOf(d: Any): number | null {
  const n = Number(str(d?.duracao_s).replace(/\D+$/, ''))
  if (n > 0) return n
  const ts = (Array.isArray(d?.montagem) ? d.montagem : []).map((m: Any) => str(m?.t)).filter(Boolean)
  const last = ts.length ? /(\d+)\D*$/.exec(ts[ts.length - 1]) : null
  return last ? Number(last[1]) : null
}

/** A construção visual do vídeo, na ordem. `data.montagem` ou, sem ela, um quadro por bloco do roteiro. */
export function montage(c: Pick<StrategyCard, 'data'>): Shot[] {
  const d = (c.data ?? {}) as Any
  const given = (Array.isArray(d.montagem) ? d.montagem : []).filter((m: Any) => m && typeof m === 'object' && (str(m.visual) || str(m.audio) || str(m.texto_tela)))
  if (given.length) return given.map((m: Any, i: number) => ({
    n: i + 1, t: str(m.t).replace(/\s*-\s*/, '–'), visual: sentence(str(m.visual)), audio: str(m.audio), texto: str(m.texto_tela ?? m.texto),
    tipo: shotTypeOf(m.tipo, str(m.visual), !!str(m.audio)),
  }))
  const ss = steps(d); const dur = durationOf(d)
  const slot = dur && ss.length ? dur / ss.length : 0
  return ss.map((s, i) => {
    const cena = STAGE.test(str(s.cena)) ? '' : str(s.cena)
    const { speaker, text } = splitSpeaker(str(s.fala))
    const free = isFreeAnswer(text)
    const texto = str(s.texto_tela) || screenTextOf(cena)
    const speech = !!text && !free
    // O texto na tela vai no próprio campo; a descrição fica só com a imagem.
    const img = cena.replace(/(?:texto na tela|lettering|letreiro|t[ií]tulo na tela)\s*:?\s*[“"][^”"]*[”"]\.?\s*/i, '').trim()
    return {
      n: i + 1, t: slot ? `${Math.round(i * slot)}–${Math.round((i + 1) * slot)}s` : '',
      visual: img ? summary(sentence(img), 80) : speaker ? `${speaker} falando` : '',
      audio: free ? '(resposta espontânea)' : text ? summary(`${speaker ? `${speaker}: ` : ''}${text}`, 90) : '',
      texto, tipo: shotTypeOf(s.tipo, img || (texto && !speech ? 'texto' : ''), speech || (!!speaker && !img)),
    }
  })
}

// ───────── Quadro esquemático (SVG) ─────────

const LIME = '#B5E61D'; const INK = '#1d1f1a'; const SOFT = '#e2e4df'
const f1 = (n: number) => Math.round(n * 10) / 10
const escX = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
function person(cx: number, headY: number, r: number, bottom: number): string {
  const sw = r * 1.7; const sy = headY + r * 1.35; const k = r * 0.9
  return `<path d="M${f1(cx - sw)} ${f1(bottom)} L${f1(cx - sw)} ${f1(sy + k)} Q${f1(cx - sw)} ${f1(sy)} ${f1(cx - sw + k)} ${f1(sy)} L${f1(cx + sw - k)} ${f1(sy)} Q${f1(cx + sw)} ${f1(sy)} ${f1(cx + sw)} ${f1(sy + k)} L${f1(cx + sw)} ${f1(bottom)} Z" fill="${LIME}" stroke="${INK}" stroke-width="1"/><circle cx="${f1(cx)}" cy="${f1(headY)}" r="${f1(r)}" fill="${LIME}" stroke="${INK}" stroke-width="1"/>`
}
const line = (x1: number, y1: number, x2: number, y2: number, w = 1, c = INK) => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`

/** Desenho do quadro pelo tipo: pessoa falando, cena de apoio, detalhe, insert de tela, gráfico ou tela de texto. */
export function shotSvg(s: Pick<Shot, 'n' | 't' | 'tipo' | 'texto'>, orient: 'vertical' | 'horizontal' = 'vertical'): string {
  const W = orient === 'vertical' ? 90 : 160; const H = orient === 'vertical' ? 160 : 90
  const cx = W / 2; const cy = H / 2; const m = Math.min(W, H)
  let body = ''
  switch (s.tipo) {
    case 'fala': {
      const r = m * 0.15
      body = person(cx, H * 0.5, r, H + 2)
        + `<path d="M${f1(cx + r * 1.2)} ${f1(H * 0.5 - r * 2.6)} h${f1(m * 0.34)} a4 4 0 0 1 4 4 v${f1(m * 0.12)} a4 4 0 0 1 -4 4 h${f1(-m * 0.22)} l-5 5 v-5 h${f1(-m * 0.12 + 5)} a4 4 0 0 1 -4 -4 v${f1(-m * 0.12)} a4 4 0 0 1 4 -4 z" fill="#fff" stroke="${INK}" stroke-width="1"/>`
        + [0.3, 0.55, 0.8].map((k) => `<circle cx="${f1(cx + r * 1.2 + m * 0.34 * k)}" cy="${f1(H * 0.5 - r * 2.6 + 4 + m * 0.06)}" r="1.4" fill="${INK}"/>`).join('')
      break
    }
    case 'apoio': {
      const g = H * 0.78
      body = line(0, g, W, g) + line(4, H * 0.3, W - 4, H * 0.3, 1, SOFT)
        + [0.08, 0.36, 0.64].map((k, i) => `<rect x="${f1(W * k)}" y="${f1(g - H * (0.28 + i * 0.06))}" width="${f1(W * 0.26)}" height="${f1(H * (0.28 + i * 0.06))}" fill="${i === 1 ? LIME : '#fff'}" stroke="${INK}" stroke-width="1"/>`).join('')
        + line(W * 0.08, g - H * 0.14, W * 0.34, g - H * 0.14, 1) + line(W * 0.64, g - H * 0.2, W * 0.9, g - H * 0.2, 1)
        + person(W * 0.8, g - m * 0.2, m * 0.045, g)
      break
    }
    case 'detalhe': {
      const w = m * 0.56; const h = m * 0.38; const y = cy - h / 2; const b = m * 0.12; const o = m * 0.12
      body = `<rect x="${f1(cx - w / 2)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h * 0.22)}" fill="${LIME}" stroke="${INK}" stroke-width="1"/>`
        + line(cx - w * 0.3, y + h * 0.35, cx + w * 0.1, y + h * 0.35, 1.4)
        + [[o, o + 8, 1, 1], [W - o, o + 8, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]].map(([x, yy, sx, sy]) => `<path d="M${f1(x!)} ${f1(yy! + sy! * b)} L${f1(x!)} ${f1(yy!)} L${f1(x! + sx! * b)} ${f1(yy!)}" fill="none" stroke="${INK}" stroke-width="1.4"/>`).join('')
      break
    }
    case 'insert': {
      const w = orient === 'vertical' ? W * 0.56 : W * 0.3; const h = w * 1.9; const x = cx - w / 2; const y = cy - h / 2 + 4
      body = `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="5" fill="#fff" stroke="${INK}" stroke-width="1.4"/><rect x="${f1(x + 3)}" y="${f1(y + 5)}" width="${f1(w - 6)}" height="${f1(h * 0.14)}" rx="2" fill="${LIME}" stroke="${INK}" stroke-width=".8"/>`
        + [0.32, 0.44, 0.56, 0.68].map((k, i) => line(x + 5, y + h * k, x + w - 5 - (i % 2) * w * 0.25, y + h * k, 1.6, i % 2 ? SOFT : INK)).join('')
        + `<circle cx="${f1(cx)}" cy="${f1(y + h - 6)}" r="2" fill="none" stroke="${INK}" stroke-width=".8"/>`
      break
    }
    case 'grafico': {
      const x0 = W * 0.16; const y0 = H * 0.8; const x1 = W * 0.86; const top = H * (orient === 'vertical' ? 0.34 : 0.26)
      const bw = (x1 - x0) / 4.6
      body = line(x0, top - 6, x0, y0, 1.2) + line(x0, y0, x1, y0, 1.2)
        + [0.3, 0.55, 0.95].map((k, i) => `<rect x="${f1(x0 + bw * (0.5 + i * 1.4))}" y="${f1(y0 - (y0 - top) * k)}" width="${f1(bw)}" height="${f1((y0 - top) * k)}" fill="${i === 2 ? LIME : '#fff'}" stroke="${INK}" stroke-width="1"/>`).join('')
        + `<polyline points="${f1(x0 + bw)},${f1(y0 - (y0 - top) * 0.45)} ${f1(x0 + bw * 2.4)},${f1(y0 - (y0 - top) * 0.62)} ${f1(x1 - bw * 0.4)},${f1(top - 4)}" fill="none" stroke="${INK}" stroke-width="1.4"/>`
      break
    }
    case 'texto': {
      body = `<rect x="6" y="${f1(cy - m * 0.34)}" width="${W - 12}" height="${f1(m * 0.68)}" rx="6" fill="${LIME}" stroke="${INK}" stroke-width="1"/><text x="${f1(cx)}" y="${f1(cy + m * 0.06)}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${f1(m * 0.26)}" font-weight="800" fill="${INK}">Aa</text>`
        + line(cx - m * 0.26, cy + m * 0.18, cx + m * 0.26, cy + m * 0.18, 2)
      break
    }
  }
  const txt = s.texto && s.tipo !== 'texto' ? `<rect x="${f1(W * 0.14)}" y="${f1(H * 0.18)}" width="${f1(W * 0.72)}" height="12" rx="3" fill="#fff" stroke="${INK}" stroke-width="1"/><text x="${f1(cx)}" y="${f1(H * 0.18 + 9)}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="8" font-weight="800" fill="${INK}">Aa</text>` : ''
  const time = s.t ? `<rect x="4" y="4" width="${f1(Math.min(W - 26, 6 + s.t.length * 4.6))}" height="12" rx="6" fill="#fff" stroke="${INK}" stroke-width=".8"/><text x="8" y="12.6" font-family="Inter,Arial,sans-serif" font-size="7.5" font-weight="800" fill="${INK}">${escX(s.t)}</text>` : ''
  const num = `<circle cx="${W - 10}" cy="10" r="6.5" fill="${LIME}" stroke="${INK}" stroke-width="1"/><text x="${W - 10}" y="12.6" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="7.5" font-weight="800" fill="${INK}">${s.n}</text>`
  const id = `ezq-${orient[0]}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Quadro ${s.n}${s.t ? ` (${escX(s.t)})` : ''}: ${SHOT_LABEL[s.tipo]}" data-quadro="${s.tipo}"><defs><clipPath id="${id}"><rect width="${W}" height="${H}" rx="6"/></clipPath></defs><g clip-path="url(#${id})"><rect width="${W}" height="${H}" fill="#fff"/>${body}${txt}</g>${time}${num}<rect x="0.6" y="0.6" width="${W - 1.2}" height="${H - 1.2}" rx="6" fill="none" stroke="${INK}" stroke-width="1.2"/></svg>`
}

// ───────── Topo do vídeo ─────────

export interface VideoHead { title: string; meta: string; idea: string }
/** Título, "formato · duração" e a ideia em 1 frase. */
export function videoHead(c: Pick<StrategyCard, 'title' | 'data'>, index = 0): VideoHead {
  const d = (c.data ?? {}) as Any; const doc = videoDoc(c, index)
  const dur = durationOf(d)
  const raw = str(d.ideia) || str(d.frase_alma) || str(d.logline)
  const first = /^(.+?[.!?])(\s|$)/.exec(raw)?.[1] ?? raw
  return { title: doc.title, meta: [str(d.formato) || 'Vídeo', dur ? `${dur} s` : ''].filter(Boolean).join(' · '), idea: summary(first, 160) }
}

// ───────── 1. Narração ─────────

export interface NarrationPart { paras: { speaker: string; text: string; pergunta?: boolean; livre?: boolean }[]; questions: Question[]; cola: string[] }
/** Só a fala completa (sem nenhuma direção) e as perguntas da entrevista. Quem fala só aparece quando há mais de uma pessoa. */
export function narrationPart(c: Pick<StrategyCard, 'title' | 'data'>, index = 0): NarrationPart {
  const d = (c.data ?? {}) as Any
  const doc = videoDoc(c, index)
  const paras = doc.blocks.flatMap((b) => b.items.filter((it) => it.kind === 'fala').map((it) => ({ speaker: b.speaker, text: it.text, pergunta: !!it.pergunta, livre: !!it.livre || isFreeAnswer(it.text) })))
  const many = new Set(paras.map((p) => p.speaker).filter(Boolean)).size > 1
  let last = ''
  const out = paras.map((p) => { const sp = many && p.speaker !== last ? p.speaker : ''; last = p.speaker; return { ...p, speaker: sp } })
  return { paras: out, questions: doc.questions, cola: out.length ? [] : toLines(d.producao?.cola ?? d.cola) }
}

// ───────── 2. Gravação ─────────

export interface Ref { link: string; porque: string; thumb?: string }
export interface Extras { stories: string[]; reels: string[]; fotos: { tema: string; como: string; ref: Ref | null }[] }
export interface ScriptScene { n: number; cena: string; speaker: string; fala: string }
export interface ShootPart {
  orient: 'vertical' | 'horizontal'; shots: Shot[]; captar: string[]; extras: Extras | null; ref: Ref | null
  /** Etapas da estrutura (ex.: Gancho → Vazamento 1 → … → Chamada). */
  estrutura: { nome: string; passos: string[] }
  /** Roteiro completo cena a cena: o que se grava + a fala inteira. */
  roteiro: ScriptScene[]
  /** Como vai ser a gravação: local, quem, ordem dos planos. */
  como: string[]
}
const refOf = (r: Any): Ref | null => (r && typeof r === 'object' && str(r.link) ? { link: str(r.link), porque: str(r.porque), thumb: str(r.thumb) || undefined } : null)

/** "Aproveite a gravação": stories, reels no celular e fotos. Vazio → null (não mostra). */
export function extrasOf(d: Any): Extras | null {
  const e = d?.extras
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null
  const fotos = (Array.isArray(e.fotos) ? e.fotos : []).map((f: Any) => (typeof f === 'string' ? { tema: f.trim(), como: '', ref: null } : { tema: str(f?.tema), como: str(f?.como), ref: refOf(f?.referencia) })).filter((f: Extras['fotos'][number]) => f.tema || f.como)
  const x = { stories: toLines(e.stories), reels: toLines(e.reels_celular ?? e.reels), fotos }
  return x.stories.length || x.reels.length || x.fotos.length ? x : null
}

/** Para a Ellcazo: a montagem em quadros, o que captar, o que aproveitar e a referência (só se existir). */
export function shootPart(c: Pick<StrategyCard, 'data' | 'inspired'>): ShootPart {
  const d = (c.data ?? {}) as Any; const p = (d.producao ?? {}) as Any
  const ref = refOf(d.referencia) ?? (c.inspired?.link ? { link: str(c.inspired.link), porque: '' } : null)
  const est = d.estrutura
  const estrutura = typeof est === 'object' && est && !Array.isArray(est)
    ? { nome: str(est.nome), passos: toLines(est.passos) }
    : { nome: str(est), passos: toLines(d.arco) }
  const roteiro = (Array.isArray(d.roteiro) ? d.roteiro : []).map((s: Any, i: number) => {
    const raw = typeof s === 'string' ? s : str(s?.fala)
    const { speaker, text } = splitSpeaker(raw)
    return { n: i + 1, cena: typeof s === 'string' ? '' : usefulDirection(str(s?.cena), speaker), speaker, fala: text }
  }).filter((s: ScriptScene) => s.cena || s.fala).map((s: ScriptScene, i: number) => ({ ...s, n: i + 1 }))
  const como = toLines(d.gravacao_como ?? p.plano_diaria ?? p.plano_da_diaria)
  return { orient: orientationOf(d.formato), shots: montage(c), captar: toLines(d.captar ?? p.shot_list ?? d.shot_list), extras: extrasOf(d), ref, estrutura, roteiro, como }
}

/** Storyboard em 2 linhas: número de colunas para n quadros. */
export const twoRowCols = (n: number) => Math.max(1, Math.ceil(n / 2))
/** Direção em CAIXA ALTA → frase normal (lê melhor no roteiro). */
export function sentenceCase(t: string): string {
  let x = t.trim()
  if (!x) return x
  if (x === x.toUpperCase()) x = x.toLowerCase()
  x = x.charAt(0).toUpperCase() + x.slice(1)
  return x.replace(/([.!?]\s+)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
    .replace(/\bitalo\b/g, 'Italo').replace(/\bwhatsapp\b/gi, 'WhatsApp').replace(/\binstagram\b/gi, 'Instagram')
}

// ───────── 3. Edição ─────────

export interface EditPart { guide: string[]; times: Shot[] }
/** O guia curto (`data.edicao`) e os tempos da montagem. */
export function editPart(c: Pick<StrategyCard, 'data'>): EditPart {
  const d = (c.data ?? {}) as Any
  const g = d.edicao ?? d.producao?.edicao
  const guide = typeof g === 'string' ? g.split(/\n+/).map((x) => x.trim()).filter(Boolean) : toLines(g)
  return { guide, times: montage(c) }
}

/** Derivados e publicação (do motor): ficam em "Ver detalhes". */
export function productionExtras(c: Pick<StrategyCard, 'data'>): { label: string; value: string }[] {
  const p = ((c.data ?? {}) as Any).producao ?? {}
  const pub = (p.publicacao ?? {}) as Any
  const der = (Array.isArray(p.derivados) ? p.derivados : []).map((x: Any) => typeof x === 'string' ? x
    : [str(x?.formato) || str(x?.estrutura), str(x?.duracao_s) ? `${str(x.duracao_s)} s` : '', str(x?.gancho) && `abre com “${str(x.gancho)}”`, str(x?.usa) && `usa ${str(x.usa)}`, str(x?.gravar_a_mais) && `gravar a mais: ${str(x.gravar_a_mais)}`].filter(Boolean).join(' · ')).filter(Boolean)
  return [
    ...(der.length ? [{ label: 'Derivados', value: der.join(' | ') }] : []),
    ...[['Capa', pub.capa], ['Primeira linha', pub.primeira_linha], ['Legenda', pub.legenda], ['Chamada nos comentários', pub.cta_comentario]].filter(([, v]) => str(v)).map(([l, v]) => ({ label: String(l), value: str(v) })),
  ]
}

/**
 * Resumo do motor por vídeo, acima de "Ver detalhes" (pendência técnica, 19/11): estrutura, intenção, notas da banca e
 * derivados em 1 linha cada. Só o que existir; o detalhe completo dos derivados segue em "Ver detalhes".
 */
export function videoFacts(c: Pick<StrategyCard, 'data'>): { key: 'estrutura' | 'intencao' | 'notas' | 'derivados'; label: string; value: string }[] {
  const d = (c.data ?? {}) as Any
  const est = d.estrutura
  const estrutura = typeof est === 'object' && est && !Array.isArray(est)
    ? [str(est.codigo ?? est.code), str(est.nome)].filter(Boolean).join(' · ')
    : str(est)
  const der = (Array.isArray(d.producao?.derivados) ? d.producao.derivados : []) as Any[]
  const derNames = der.map((x) => (typeof x === 'string' ? x : str(x?.formato) || str(x?.estrutura))).filter(Boolean)
  const out: { key: 'estrutura' | 'intencao' | 'notas' | 'derivados'; label: string; value: string }[] = []
  if (estrutura) out.push({ key: 'estrutura', label: 'Estrutura', value: estrutura })
  if (str(d.intencao)) out.push({ key: 'intencao', label: 'Intenção', value: str(d.intencao) })
  if (str(d.notas)) out.push({ key: 'notas', label: 'Notas', value: str(d.notas) })
  if (der.length) out.push({ key: 'derivados', label: 'Derivados', value: derNames.length ? `${der.length} · ${summary(derNames.join(' · '), 80)}` : String(der.length) })
  return out
}
