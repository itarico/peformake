// Roteiro como DOCUMENTO (Italo, 18/11: "abrir, ler, passar para o cliente e ele já conseguir gravar").
// Transforma o card de vídeo no formato do PDF da Rosanne: número + tipo, título grande, quem fala, a fala em parágrafos,
// direção só entre colchetes quando muda o que se vê; entrevista = pergunta em destaque + "pontos pra resposta espontânea".
// Função pura: a tela (StrategyReader) e o PDF (strategyDoc) usam o mesmo modelo.
import type { StrategyCard } from './cardRules'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any

/** `pergunta`: fala que pede resposta do entrevistado (fica em destaque); `livre`: espaço da resposta espontânea. */
export type ScriptItem = { kind: 'fala'; text: string; pergunta?: boolean; livre?: boolean } | { kind: 'dir'; text: string }
export interface ScriptBlock { speaker: string; items: ScriptItem[] }
export interface Question { pergunta: string; pontos: string }
export interface ScriptDoc {
  number: string; type: string; title: string
  blocks: ScriptBlock[]
  questions: Question[]
  /** Linhas curtas para a equipe (nunca no meio da fala): quem grava, referência etc. Vão para "Ver detalhes". */
  extras: { label: string; value: string }[]
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
/** "S1 · Título" → "Título" (o número já vai no rótulo). */
export const cleanTitle = (t: string) => t.replace(/^\s*S\d+\s*[·.:-]\s*/i, '').trim()

/** Direção em CAIXA ALTA vira frase normal (lê melhor). */
function sentence(s: string): string {
  const t = s.trim().replace(/^\[|\]$/g, '').trim()
  if (!t) return ''
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '')
  const caps = letters.length > 3 && letters === letters.toUpperCase()
  const x = caps ? t.toLowerCase() : t
  return x.charAt(0).toUpperCase() + x.slice(1)
}

/** Direções que não ajudam quem grava (rótulo de etapa ou só o nome de quem fala): somem da leitura. */
const NOISE = /^(abertura|meio|fecho|final|fim|gancho|cta|chamada|desenvolvimento|in[ií]cio|encerramento|corte)\.?$/i

/** "SANDRA: texto" → { speaker: 'Sandra', text }. Sem nome: speaker vazio (continua com quem falava). */
export function splitSpeaker(fala: string): { speaker: string; text: string } {
  const m = /^\s*([A-ZÀ-Ý][A-ZÀ-Ý0-9 .'’()-]{1,30}):\s*([\s\S]*)$/.exec(fala)
  if (!m) return { speaker: '', text: fala.trim() }
  const name = m[1]!.trim().replace(/\s*\(.*\)$/, '')
  const nice = name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())
  return { speaker: nice === 'Voz' ? 'Voz (fora do quadro)' : nice, text: m[2]!.trim() }
}

/** A cena só vira direção quando diz algo além de "quem fala" ou do rótulo da etapa. */
function usefulDirection(cena: string, speaker: string): string {
  const t = sentence(cena)
  if (!t || NOISE.test(t)) return ''
  const plain = t.replace(/[.]$/, '').toLowerCase()
  if (speaker && plain === speaker.toLowerCase().replace(/ \(.*\)$/, '')) return ''
  if (/^(cliente|voz|sandra)$/i.test(plain)) return ''
  return t.endsWith('.') ? t : `${t}.`
}

/** Monta os blocos de fala: o mesmo falante seguido vira um bloco só, com parágrafos e direções entre eles. */
export function scriptBlocks(roteiro: unknown, fala?: unknown): ScriptBlock[] {
  const out: ScriptBlock[] = []
  let cur: ScriptBlock | null = null
  const push = (speaker: string, it: ScriptItem) => {
    if (!cur || (speaker && speaker !== cur.speaker)) { cur = { speaker, items: [] }; out.push(cur) }
    cur.items.push(it)
  }
  const steps = Array.isArray(roteiro) ? (roteiro as Any[]) : []
  for (const s of steps) {
    const raw = typeof s === 'string' ? s : str(s?.fala)
    const { speaker, text } = splitSpeaker(raw)
    const who = speaker || (cur as ScriptBlock | null)?.speaker || ''
    const dir = usefulDirection(typeof s === 'string' ? '' : str(s?.cena), who)
    if (dir) push(who, { kind: 'dir', text: dir })
    for (const p of text.split(/\n{1,}/).map((x) => x.trim()).filter(Boolean)) push(who, { kind: 'fala', text: p })
  }
  // Formato novo possível: a fala inteira num texto só (parágrafos separados por linha em branco).
  if (!out.length && str(fala)) {
    for (const line of str(fala).split(/\n+/).map((x) => x.trim()).filter(Boolean)) {
      if (/^\[.*\]$/.test(line)) { push((cur as ScriptBlock | null)?.speaker ?? '', { kind: 'dir', text: sentence(line) }); continue }
      const { speaker, text } = splitSpeaker(line)
      push(speaker || (cur as ScriptBlock | null)?.speaker || '', { kind: 'fala', text })
    }
  }
  return out
}

/** Quem fala, tirado de "Quem fala: X." do campo filmar (quando a fala não traz o nome). */
export function whoSpeaks(filmar: unknown): string {
  const m = /Quem fala:\s*([^.;\n]+)/i.exec(str(filmar))
  return m ? m[1]!.trim() : ''
}

/** Perguntas de entrevista: o campo novo `perguntas` ou, no formato antigo, a pergunta seguida de "(resposta livre)". */
export function interviewQuestions(d: Any): Question[] {
  if (Array.isArray(d?.perguntas)) return (d.perguntas as Any[]).map((q) => ({ pergunta: str(q?.pergunta ?? q), pontos: Array.isArray(q?.pontos) ? q.pontos.join(' · ') : str(q?.pontos ?? q?.pontos_resposta) })).filter((q) => q.pergunta)
  return []
}

const LABELS: Record<string, string> = {
  papel: 'Papel', linguagem: 'Linguagem', alvo: 'Para quem', frase_alma: 'Frase-alma', objetivo: 'Objetivo', duracao_s: 'Duração (s)', cruzamento: 'Por que vai dar certo', ideia: 'Ideia',
}
const KNOWN = new Set(['formato', 'ganchos', 'roteiro', 'outras_ideias', 'referencia', 'filmar', 'fala', 'perguntas', 'nasceu_de', 'referencia_nota', 'nota_qualidade', 'arco', ...Object.keys(LABELS)])

/** Detalhes para a equipe (atrás de "Ver detalhes"): campos conhecidos e qualquer campo novo de texto, sem quebrar se faltar. */
export function teamExtras(c: Pick<StrategyCard, 'data'>): { label: string; value: string }[] {
  const d = (c.data ?? {}) as Any
  const out: { label: string; value: string }[] = []
  const f = str(d.filmar)
  if (f) out.push({ label: 'Gravação', value: f })
  for (const [k, l] of Object.entries(LABELS)) { const v = d[k]; if (typeof v === 'string' && v.trim()) out.push({ label: l, value: v.trim() }); else if (typeof v === 'number') out.push({ label: l, value: String(v) }) }
  if (Array.isArray(d.arco) && d.arco.length) out.push({ label: 'Arco', value: d.arco.map(String).join(' → ') })
  if (Array.isArray(d.nasceu_de) && d.nasceu_de.length) out.push({ label: 'Nasceu de', value: (d.nasceu_de as Any[]).map((x) => (typeof x === 'string' ? x : [x?.dado, x?.fonte ? `(${x.fonte})` : ''].filter(Boolean).join(' '))).join(' · ') })
  if (d.referencia_nota && typeof d.referencia_nota === 'object' && d.referencia_nota.nota != null) out.push({ label: 'Nota da referência', value: String(d.referencia_nota.nota) })
  if (d.nota_qualidade && typeof d.nota_qualidade === 'object' && d.nota_qualidade.total != null) out.push({ label: 'Nota do roteiro', value: String(d.nota_qualidade.total) })
  for (const [k, v] of Object.entries(d)) {
    if (KNOWN.has(k) || typeof v !== 'string' || !v.trim()) continue
    out.push({ label: k.replace(/_/g, ' ').replace(/^\w/, (x) => x.toUpperCase()), value: v.trim() })
  }
  return out
}

/** O vídeo como documento: número, tipo, título, blocos de fala, perguntas e detalhes. */
export function videoDoc(c: Pick<StrategyCard, 'title' | 'data'>, index: number): ScriptDoc {
  const d = (c.data ?? {}) as Any
  const blocks = scriptBlocks(d.roteiro, d.fala)
  const who = whoSpeaks(d.filmar)
  // Sem nome na fala: usa quem fala do "filmar".
  for (const b of blocks) if (!b.speaker && who) b.speaker = who.split(/[;,]| e | ou /)[0]!.trim()
  // Entrevista no formato antigo: "(resposta livre)" logo depois de uma fala → aquela fala é a pergunta.
  blocks.forEach((b, i) => {
    const falas = b.items.filter((x) => x.kind === 'fala')
    if (!falas.length || !falas.every((x) => isFreeAnswer(x.text))) return
    for (const x of falas) (x as { livre?: boolean }).livre = true
    const prev = blocks[i - 1]?.items.filter((x) => x.kind === 'fala').pop()
    if (prev && /\?\s*$/.test(prev.text)) (prev as { pergunta?: boolean }).pergunta = true
  })
  return {
    number: String(index + 1).padStart(2, '0'), type: str(d.formato) || 'Vídeo', title: cleanTitle(c.title || ''),
    blocks, questions: interviewQuestions(d), extras: teamExtras(c),
  }
}

/** Um bloco "(resposta livre)" é espaço para o entrevistado: na leitura vira "resposta espontânea". */
export const isFreeAnswer = (t: string) => /^\(.*(resposta|livre|palavras dele|palavras dela).*\)$/i.test(t.trim())

// ───────── Edição em texto corrido (pop-up Editar) ─────────

/** roteiro [{cena, fala}] → texto: "[direção]" numa linha e "NOME: fala" na outra. */
export function roteiroToText(roteiro: unknown): string {
  const steps = Array.isArray(roteiro) ? (roteiro as Any[]) : []
  return steps.map((s) => {
    if (typeof s === 'string') return s
    const cena = str(s?.cena); const fala = str(s?.fala)
    return [cena ? `[${cena}]` : '', fala].filter(Boolean).join('\n')
  }).join('\n\n')
}

/** Texto → roteiro [{cena, fala}]. Cada "[direção]" abre um passo; a fala é o que vem até o próximo colchete. */
export function textToRoteiro(text: string): { cena: string; fala: string }[] {
  const out: { cena: string; fala: string }[] = []
  let cur: { cena: string; fala: string } | null = null
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim()
    if (!line) { cur = cur && cur.fala ? null : cur; continue }
    const dir = /^\[(.*)\]$/.exec(line)
    if (dir) { cur = { cena: dir[1]!.trim(), fala: '' }; out.push(cur); continue }
    if (!cur || (cur.fala && /^[A-ZÀ-Ý][A-ZÀ-Ý0-9 .'’()-]{1,30}:/.test(line))) { cur = { cena: '', fala: '' }; out.push(cur) }
    cur.fala = cur.fala ? `${cur.fala}\n${line}` : line
  }
  return out.filter((s) => s.cena || s.fala)
}
