// Guia da marca: junta o guia salvo (IA + equipe) com as fontes que já existem (estilo do cadastro e voz do diagnóstico).
// Regra: o que a equipe editou vale mais; depois o que a IA montou; o que faltar sai do cadastro/diagnóstico.

export type GuideSection = 'posicionamento' | 'visual' | 'voz' | 'design' | 'audiovisual'
export const GUIDE_SECTIONS: { id: GuideSection; label: string; short: string }[] = [
  { id: 'posicionamento', label: 'Posicionamento', short: 'Marca' },
  { id: 'visual', label: 'Visual', short: 'Visual' },
  { id: 'voz', label: 'Voz e copy', short: 'Voz' },
  { id: 'design', label: 'Design e copy', short: 'Design' },
  { id: 'audiovisual', label: 'Audiovisual', short: 'Vídeo' },
]

export interface GuideColor { hex: string; nome: string; uso: string }
export interface BrandGuide {
  posicionamento: { frase: string; passar: string[] }
  visual: { cores: GuideColor[]; fontes: { titulo: string; apoio: string; nota: string }; logo: string; foto: string; video: string }
  voz: { essencia: string; tom: { adjetivo: string; exemplo: string }[]; usar: string[]; evitar: string[]; regra_teste: string }
  design: { layout: string; hierarquia: string; ofertas: string; cta: string }
  audiovisual: { mostrar: string[]; apresentador: string; roteiro: string[] }
}

export interface GuidePayload {
  client: { id: string; name: string; segment: string | null; logo_path: string | null; brand_style: Record<string, unknown> | null }
  voice: Record<string, unknown> | null
  guide: Partial<Record<GuideSection, unknown>>
  edited: string[]
  ai_at: string | null
  updated_at: string | null
  has_diagnosis: boolean
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x.trim() : isObj(x) ? s(x.nome) || s(x.texto) : '')).filter(Boolean) : [])
const first = (...vals: string[]) => vals.find((x) => x) ?? ''
const firstList = (...vals: string[][]) => vals.find((x) => x.length) ?? []
const HEX = /^#[0-9a-f]{6}$/i

export function normalizeHex(v: unknown): string | null {
  const t = s(v).toUpperCase()
  if (HEX.test(t)) return t
  if (/^#[0-9A-F]{3}$/.test(t)) return '#' + t.slice(1).split('').map((c) => c + c).join('')
  if (/^[0-9A-F]{6}$/.test(t)) return '#' + t
  return null
}

function colors(v: unknown): GuideColor[] {
  if (!Array.isArray(v)) return []
  return v.map((c) => (isObj(c) ? { hex: normalizeHex(c.hex) ?? '', nome: s(c.nome), uso: s(c.uso) } : { hex: normalizeHex(c) ?? '', nome: '', uso: '' }))
    .filter((c) => c.hex).slice(0, 8)
}
function tones(v: unknown): { adjetivo: string; exemplo: string }[] {
  if (!Array.isArray(v)) return []
  return v.map((t) => (isObj(t) ? { adjetivo: s(t.adjetivo), exemplo: s(t.exemplo) } : { adjetivo: s(t), exemplo: '' })).filter((t) => t.adjetivo || t.exemplo).slice(0, 6)
}

/** O guia que a tela mostra: guia salvo > cadastro (brand_style) > voz do diagnóstico. */
export function resolveGuide(p: Pick<GuidePayload, 'guide' | 'voice' | 'client'>): BrandGuide {
  const g = (p.guide ?? {}) as Partial<Record<GuideSection, Obj>>
  const bs = (p.client?.brand_style ?? {}) as Obj
  const v = (p.voice ?? {}) as Obj
  const ex = (isObj(v.expressao) ? v.expressao : {}) as Obj
  const pos = isObj(g.posicionamento) ? g.posicionamento : {}
  const vis = isObj(g.visual) ? g.visual : {}
  const voz = isObj(g.voz) ? g.voz : {}
  const des = isObj(g.design) ? g.design : {}
  const av = isObj(g.audiovisual) ? g.audiovisual : {}
  const gf = isObj(vis.fontes) ? vis.fontes : {}
  const bf = isObj(bs.fontes) ? bs.fontes : {}
  return {
    posicionamento: {
      frase: first(s(pos.frase), s(v.essencia), s(bs.essencia)),
      passar: firstList(strs(pos.passar), strs(bs.personalidade), s(v.proposito) ? [s(v.proposito)] : []),
    },
    visual: {
      cores: colors(vis.cores).length ? colors(vis.cores) : colors(bs.cores),
      fontes: { titulo: first(s(gf.titulo), s(bf.titulo)), apoio: first(s(gf.apoio), s(bf.apoio)), nota: first(s(gf.nota), s(bf.nota)) },
      logo: first(s(vis.logo), s(bs.grafismo), s(bs.logo)),
      foto: first(s(vis.foto), s(bs.foto), s(ex.ambiente)),
      video: first(s(vis.video), s(bs.video)),
    },
    voz: {
      essencia: first(s(voz.essencia), s(v.essencia), s(bs.voz)),
      tom: tones(voz.tom).length ? tones(voz.tom) : tones(v.tom),
      usar: firstList(strs(voz.usar), strs(bs.faca)),
      evitar: firstList(strs(voz.evitar), strs(v.evitar), strs(bs.evite)),
      regra_teste: first(s(voz.regra_teste), s(v.regra_teste)),
    },
    design: {
      layout: first(s(des.layout), s(bs.layout), s(ex.presenca)),
      hierarquia: s(des.hierarquia), ofertas: s(des.ofertas), cta: s(des.cta),
    },
    audiovisual: { mostrar: strs(av.mostrar), apresentador: s(av.apresentador), roteiro: strs(av.roteiro) },
  }
}

/** Quanto do guia está preenchido (0 a 100), para o cartão dizer se vale montar com IA. */
export function guideFill(g: BrandGuide): number {
  const checks = [
    g.posicionamento.frase, g.posicionamento.passar.length, g.visual.cores.length, g.visual.fontes.titulo, g.visual.logo, g.visual.foto,
    g.voz.essencia, g.voz.tom.length, g.voz.evitar.length, g.voz.regra_teste, g.design.layout, g.design.cta,
    g.audiovisual.mostrar.length, g.audiovisual.apresentador, g.audiovisual.roteiro.length,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function sectionFilled(g: BrandGuide, id: GuideSection): boolean {
  if (id === 'posicionamento') return !!(g.posicionamento.frase || g.posicionamento.passar.length)
  if (id === 'visual') return !!(g.visual.cores.length || g.visual.fontes.titulo || g.visual.foto)
  if (id === 'voz') return !!(g.voz.essencia || g.voz.tom.length || g.voz.evitar.length)
  if (id === 'design') return !!(g.design.layout || g.design.cta)
  return !!(g.audiovisual.mostrar.length || g.audiovisual.roteiro.length)
}

/** Texto de lista ↔ uma linha por item (para os campos de edição). */
export const linesToList = (t: string) => t.split('\n').map((x) => x.replace(/^[-•\s]+/, '').trim()).filter(Boolean).slice(0, 12)
export const listToLines = (l: string[]) => l.join('\n')

/** Cor do texto que fica legível em cima da cor (para as amostras). */
export function inkOn(hex: string): string {
  const h = normalizeHex(hex) ?? '#FFFFFF'
  const [r = 1, g = 1, b = 1] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.55 ? '#0E0F0C' : '#FFFFFF'
}

/** O que cada área precisa ver primeiro no cartão. */
export type GuideFocus = 'geral' | 'design' | 'social' | 'audiovisual' | 'trafego'
export function focusLines(g: BrandGuide, focus: GuideFocus): { label: string; text: string }[] {
  const tom = g.voz.tom.map((t) => t.adjetivo).filter(Boolean).join(', ')
  const all: Record<string, string> = {
    pos: g.posicionamento.frase,
    tom,
    evitar: g.voz.evitar.slice(0, 3).join(' · '),
    layout: g.design.layout,
    cta: g.design.cta,
    foto: g.visual.foto,
    mostrar: g.audiovisual.mostrar.slice(0, 3).join(' · '),
    apresentador: g.audiovisual.apresentador,
    usar: g.voz.usar.slice(0, 3).join(' · '),
    oferta: g.design.ofertas,
  }
  const LABEL: Record<string, string> = { pos: 'Quer passar', tom: 'Tom', evitar: 'Evitar', layout: 'Layout', cta: 'Chamada', foto: 'Foto', mostrar: 'Mostrar', apresentador: 'Apresentador', usar: 'Usar', oferta: 'Oferta' }
  const ORDER: Record<GuideFocus, string[]> = {
    geral: ['pos', 'tom', 'evitar'],
    design: ['layout', 'cta', 'evitar'],
    social: ['tom', 'usar', 'evitar'],
    audiovisual: ['mostrar', 'apresentador', 'foto'],
    trafego: ['oferta', 'cta', 'tom'],
  }
  return ORDER[focus].map((k) => ({ label: LABEL[k] ?? k, text: all[k] ?? '' })).filter((x) => x.text).slice(0, 3)
}
