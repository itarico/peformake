// Briefing do cliente (Estratégia interativa): o que o Italo preenche ANTES de gerar a estratégia do mês.
// Dados fixos (client_briefs) + do mês (client_brief_months) + perguntas do mês (client_questions, pack 'briefing_mes').

export interface Produto { nome: string; preco?: string; condicoes?: string }
export interface Concorrente { nome: string; link?: string; porque?: string; novo?: boolean }
export interface Referencia { link: string; porque?: string; tipo?: 'post' | 'video' | 'anuncio' | 'outro_nicho'; thumb?: string; numero?: string; novo?: boolean }
export const LINK_KEYS = ['site', 'instagram', 'whatsapp', 'catalogo', 'gmn', 'agendamento'] as const
export type LinkKey = (typeof LINK_KEYS)[number]
export const LINK_LABEL: Record<LinkKey, string> = { site: 'Site', instagram: 'Instagram', whatsapp: 'WhatsApp', catalogo: 'Cardápio ou catálogo', gmn: 'Google Meu Negócio', agendamento: 'Agendamento' }

export interface BriefFixed {
  produtos?: Produto[]
  links?: Partial<Record<LinkKey, string>>
  publico?: string; diferenciais?: string
  concorrentes?: Concorrente[]; referencias?: Referencia[]
  voz?: string; proibidos?: string
  quem_aparece?: string; quem_grava?: string; capacidade?: string
}
export interface BriefMonth { ofertas?: string; meta?: string; datas_travam?: string }

/** Campos de texto do briefing (os de lista têm pop-up próprio). */
export type TextKey = 'publico' | 'diferenciais' | 'voz' | 'proibidos' | 'quem_aparece' | 'quem_grava' | 'capacidade'
export const TEXT_FIELDS: Record<TextKey, { label: string; hint: string }> = {
  publico: { label: 'Público', hint: 'Quem compra: idade, bairro, renda, o que busca.' },
  diferenciais: { label: 'Diferenciais', hint: 'Por que comprar aqui e não no concorrente.' },
  voz: { label: 'Voz da marca', hint: 'Como a marca fala: palavras, tom, jeito.' },
  proibidos: { label: 'Proibidos', hint: 'O que nunca falar ou mostrar.' },
  quem_aparece: { label: 'Quem aparece', hint: 'Quem pode aparecer nos vídeos.' },
  quem_grava: { label: 'Quem grava', hint: 'Ellcazo, o próprio cliente, a equipe dele.' },
  capacidade: { label: 'Capacidade de atendimento', hint: 'Quantos pedidos, mesas ou horários dá para atender.' },
}
export type MonthKey = keyof BriefMonth
export const MONTH_FIELDS: Record<MonthKey, { label: string; hint: string }> = {
  ofertas: { label: 'Ofertas e datas', hint: 'O que vender no mês e até quando (ex.: combo X até 20/12).' },
  meta: { label: 'Meta do mês', hint: 'Um número: pedidos, faturamento, agendas, seguidores.' },
  datas_travam: { label: 'Datas que travam', hint: 'Dias sem gravação, férias, loja fechada, reforma.' },
}

const filled = (v: unknown) => typeof v === 'string' ? v.trim().length > 1 : Array.isArray(v) ? v.length > 0 : !!v
const linksCount = (l: BriefFixed['links']) => Object.values(l ?? {}).filter((v) => filled(v)).length

export interface Check { key: string; label: string; done: boolean; weight: number }

/** O que conta para o medidor "briefing X% completo". Perguntas do mês valem 2 pontos (proporcional às respondidas). */
export function briefChecks(f: BriefFixed, m: BriefMonth, answered: number, total: number): Check[] {
  const precos = (f.produtos ?? []).some((p) => filled(p.preco))
  return [
    { key: 'produtos', label: precos ? 'Produtos' : 'Produtos com preço', done: precos, weight: 1.5 },
    { key: 'links', label: 'Links (2 ou mais)', done: linksCount(f.links) >= 2, weight: 1 },
    { key: 'publico', label: 'Público', done: filled(f.publico), weight: 1 },
    { key: 'diferenciais', label: 'Diferenciais', done: filled(f.diferenciais), weight: 1 },
    { key: 'concorrentes', label: 'Concorrentes', done: filled(f.concorrentes), weight: 0.5 },
    { key: 'referencias', label: 'Referências', done: filled(f.referencias), weight: 0.5 },
    { key: 'voz', label: 'Voz da marca', done: filled(f.voz), weight: 0.5 },
    { key: 'proibidos', label: 'Proibidos', done: filled(f.proibidos), weight: 0.5 },
    { key: 'quem_aparece', label: 'Quem aparece', done: filled(f.quem_aparece), weight: 0.5 },
    { key: 'capacidade', label: 'Capacidade', done: filled(f.capacidade), weight: 0.5 },
    { key: 'ofertas', label: 'Ofertas do mês', done: filled(m.ofertas), weight: 1 },
    { key: 'meta', label: 'Meta do mês', done: filled(m.meta), weight: 1 },
    { key: 'datas_travam', label: 'Datas que travam', done: filled(m.datas_travam), weight: 0.5 },
    { key: 'perguntas', label: `Perguntas do mês (${answered}/${total})`, done: total > 0 && answered >= total, weight: 2 },
  ]
}

export function briefPercent(checks: Check[], answered = 0, total = 8): number {
  const max = checks.reduce((s, c) => s + c.weight, 0)
  const got = checks.reduce((s, c) => s + (c.key === 'perguntas' ? c.weight * (total ? Math.min(1, answered / total) : 0) : c.done ? c.weight : 0), 0)
  return Math.round((got / max) * 100)
}

/** O que falta, em palavras curtas (o que mais pesa primeiro). */
export function briefMissing(checks: Check[]): string[] {
  return checks.filter((c) => !c.done).sort((a, b) => b.weight - a.weight).map((c) => c.label)
}

// ───────── Listas acumulativas (concorrentes e referências): nunca duplica ─────────
const norm = (s: string | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[/?#].*$|\s+|@/g, '')
const linkKey = (s: string | undefined) => (s ?? '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '')

export function sameCompetitor(a: Concorrente, b: Concorrente): boolean {
  if (a.link && b.link && linkKey(a.link) === linkKey(b.link)) return true
  return !!norm(a.nome) && norm(a.nome) === norm(b.nome)
}
/** Soma os itens novos (com o selo "novo") sem duplicar os que já existem. */
export function mergeCompetitors(cur: Concorrente[], add: Concorrente[], markNew = true): Concorrente[] {
  const out = [...cur]
  for (const x of add) if (x.nome?.trim() && !out.some((c) => sameCompetitor(c, x))) out.push({ ...x, ...(markNew ? { novo: true } : {}) })
  return out
}
export function mergeReferences(cur: Referencia[], add: Referencia[], markNew = true): Referencia[] {
  const out = [...cur]
  for (const x of add) if (x.link?.trim() && !out.some((r) => linkKey(r.link) === linkKey(x.link))) out.push({ ...x, ...(markNew ? { novo: true } : {}) })
  return out
}

/** Miniatura que dá para deduzir do link (YouTube). As outras vêm da coleta ou ficam com ícone. */
export function thumbOf(r: Pick<Referencia, 'link' | 'thumb'>): string | null {
  if (r.thumb) return r.thumb
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(r.link ?? '')
  return yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : null
}

/** Rede do link, para o rótulo curto da referência. */
export function netOf(link: string): string {
  const l = link.toLowerCase()
  if (l.includes('instagram.com')) return 'Instagram'
  if (l.includes('tiktok.com')) return 'TikTok'
  if (l.includes('youtu')) return 'YouTube'
  if (l.includes('facebook.com/ads') || l.includes('ads/library')) return 'Anúncio'
  try { return new URL(l.startsWith('http') ? l : `https://${l}`).hostname.replace(/^www\./, '') } catch { return 'Link' }
}

/**
 * Preenche o que o sistema já sabe (cadastro, links, voz da marca), sem apagar o que o Italo já escreveu.
 * Só entra em campo vazio.
 */
export function prefill(f: BriefFixed, known: {
  description?: string | null; target_audience?: string | null; value_proposition?: string | null; competitors?: string | null
  instagram?: string | null; website?: string | null; phone?: string | null; links?: { name: string; url: string }[]
  voz?: { tom?: unknown; evitar?: unknown; essencia?: string | null } | null
}): BriefFixed {
  const out: BriefFixed = { ...f, links: { ...(f.links ?? {}) } }
  const set = <K extends TextKey>(k: K, v: string | null | undefined) => { if (!filled(out[k]) && v && v.trim()) out[k] = v.trim() }
  set('publico', known.target_audience)
  set('diferenciais', known.value_proposition)
  const list = (v: unknown) => Array.isArray(v) ? v.map(String).join(', ') : typeof v === 'string' ? v : ''
  if (known.voz) set('voz', [known.voz.essencia, list(known.voz.tom) && `Tom: ${list(known.voz.tom)}`].filter(Boolean).join('. '))
  if (known.voz && list(known.voz.evitar)) set('proibidos', `Evitar: ${list(known.voz.evitar)}`)
  const L = out.links!
  if (!L.instagram && known.instagram) L.instagram = known.instagram.startsWith('http') ? known.instagram : `https://instagram.com/${known.instagram.replace(/^@/, '')}`
  if (!L.site && known.website) L.site = known.website
  if (!L.whatsapp && known.phone) { const d = known.phone.replace(/\D/g, ''); if (d.length >= 10) L.whatsapp = `https://wa.me/${d.length <= 11 ? `55${d}` : d}` }
  for (const l of known.links ?? []) {
    const n = l.name.toLowerCase()
    const k: LinkKey | null = /card|cat[aá]l|menu|ifood/.test(n) ? 'catalogo' : /google|gmn|maps|meu neg/.test(n) ? 'gmn' : /agend|reserva/.test(n) ? 'agendamento' : /site/.test(n) ? 'site' : null
    if (k && !L[k]) L[k] = l.url
  }
  if (!(out.concorrentes ?? []).length && known.competitors?.trim()) {
    out.concorrentes = known.competitors.split(/[,;\n]+/).map((s) => s.trim()).filter((s) => s.length > 1).slice(0, 8).map((nome) => ({ nome }))
  }
  return out
}

/** Texto curto do campo para a linha do briefing. */
export function short(v: string | undefined, n = 70): string {
  const t = (v ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

/** Mês da pergunta: o pacote do mês guarda 'AAAA-MM' em focus. */
export const focusOf = (month: string) => month.slice(0, 7)
