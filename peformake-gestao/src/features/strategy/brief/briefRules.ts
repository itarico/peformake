// Briefing do cliente (Estratégia interativa): o que o Italo preenche ANTES de gerar a estratégia do mês.
// Dados fixos (client_briefs) + do mês (client_brief_months) + perguntas do mês (client_questions, pack 'briefing_mes').

export interface Produto { nome: string; preco?: string; condicoes?: string }
export interface Concorrente { nome: string; link?: string; porque?: string; novo?: boolean; origem?: 'diagnostico' }
export interface Referencia { link: string; porque?: string; tipo?: 'post' | 'video' | 'anuncio' | 'outro_nicho'; thumb?: string; numero?: string; novo?: boolean }
export const LINK_KEYS = ['site', 'instagram', 'whatsapp', 'catalogo', 'gmn', 'agendamento'] as const
export type LinkKey = (typeof LINK_KEYS)[number]
export const LINK_LABEL: Record<LinkKey, string> = { site: 'Site', instagram: 'Instagram', whatsapp: 'WhatsApp', catalogo: 'Cardápio ou catálogo', gmn: 'Google Meu Negócio', agendamento: 'Agendamento' }

export interface LinkExtra { nome: string; url: string }
export interface BriefFixed {
  produtos?: Produto[]
  links?: Partial<Record<LinkKey, string>>
  /** Links além dos principais (nome dado pela equipe ou deduzido do link). */
  links_extra?: LinkExtra[]
  /** Links que o sistema puxou sozinho e a equipe removeu: não voltam no preenchimento automático. */
  links_off?: string[]
  publico?: string; diferenciais?: string
  concorrentes?: Concorrente[]; referencias?: Referencia[]
  /** Marcado "Não tem concorrente": conta como preenchido. */
  sem_concorrentes?: boolean
  /** Concorrentes do diagnóstico que a equipe removeu (não voltam). */
  concorrentes_off?: string[]
  voz?: string; proibidos?: string
  quem_aparece?: string; quem_grava?: string; capacidade?: string
  /** Tipo de negócio (família do motor de perguntas). Sem ele, o sistema deduz pela descrição. */
  tipo?: string
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
const linksCount = (f: BriefFixed) => Object.values(f.links ?? {}).filter((v) => filled(v)).length + (f.links_extra ?? []).filter((l) => filled(l.url)).length

export interface Check { key: string; label: string; done: boolean; weight: number }

/** O que conta para o medidor "briefing X% completo". Perguntas do mês valem 2 pontos (proporcional às respondidas). */
export function briefChecks(f: BriefFixed, m: BriefMonth, answered: number, total: number): Check[] {
  const precos = (f.produtos ?? []).some((p) => filled(p.preco))
  return [
    { key: 'produtos', label: precos ? 'Produtos' : 'Produtos com preço', done: precos, weight: 1.5 },
    { key: 'links', label: 'Links (2 ou mais)', done: linksCount(f) >= 2, weight: 1 },
    { key: 'publico', label: 'Público', done: filled(f.publico), weight: 1 },
    { key: 'diferenciais', label: 'Diferenciais', done: filled(f.diferenciais), weight: 1 },
    { key: 'concorrentes', label: 'Concorrentes', done: filled(f.concorrentes) || !!f.sem_concorrentes, weight: 0.5 },
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
  if (l.includes('pinterest.') || l.includes('pin.it')) return 'Pinterest'
  if (l.includes('vimeo.com')) return 'Vimeo'
  if (l.includes('behance.net')) return 'Behance'
  if (l.includes('dribbble.com')) return 'Dribbble'
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
  /** Concorrentes achados no diagnóstico (consult_docs.doc.diagnostico.mercado.concorrentes). */
  diagRivals?: { nome?: string; instagram?: string; site?: string; google_maps?: string; diferencial?: string; o_que_fazem?: string }[] | null
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
  const off = new Set((f.links_off ?? []).map(linkKey))
  const put = (k: LinkKey, url: string) => { if (!L[k] && !off.has(linkKey(url)) && !(out.links_extra ?? []).some((x) => linkKey(x.url) === linkKey(url))) L[k] = url }
  if (known.instagram) put('instagram', known.instagram.startsWith('http') ? known.instagram : `https://instagram.com/${known.instagram.replace(/^@/, '')}`)
  if (known.website) put('site', known.website)
  if (known.phone) { const d = known.phone.replace(/\D/g, ''); if (d.length >= 10) put('whatsapp', `https://wa.me/${d.length <= 11 ? `55${d}` : d}`) }
  for (const l of known.links ?? []) {
    const n = l.name.toLowerCase()
    const k: LinkKey | null = /card|cat[aá]l|menu|ifood/.test(n) ? 'catalogo' : /google|gmn|maps|meu neg/.test(n) ? 'gmn' : /agend|reserva/.test(n) ? 'agendamento' : /site/.test(n) ? 'site' : null
    if (k) put(k, l.url)
  }
  // Do diagnóstico: entram sozinhos (com a origem marcada), sem repetir e sem trazer de volta os removidos.
  if (!out.sem_concorrentes && known.diagRivals?.length) {
    const off = new Set((f.concorrentes_off ?? []).map((n) => norm(n)))
    const add = known.diagRivals.filter((r) => r.nome?.trim() && !off.has(norm(r.nome)))
      .map((r) => ({ nome: r.nome!.trim(), link: r.instagram || r.site || r.google_maps || undefined, porque: (r.diferencial || r.o_que_fazem || '').slice(0, 160) || undefined, origem: 'diagnostico' as const }))
    out.concorrentes = mergeCompetitors(out.concorrentes ?? [], add, false)
  }
  if (!out.sem_concorrentes && !(out.concorrentes ?? []).length && known.competitors?.trim()) {
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


// ───────── Links: uma lista só, o sistema reconhece o tipo e dá o nome ─────────
export interface LinkItem { nome: string; url: string; key: LinkKey | null }

/** Reconhece o link pelo endereço (sem IA): Google Maps, Instagram, WhatsApp, cardápio… */
export function detectLink(raw: string): { key: LinkKey | null; nome: string } {
  const u = raw.trim().toLowerCase()
  const handle = (re: RegExp) => { const m = re.exec(raw); return m?.[1] ? ` @${m[1]}` : '' }
  if (/instagram\.com|instagr\.am/.test(u)) return { key: 'instagram', nome: `Instagram${handle(/instagram\.com\/([\w.]+)/i)}` }
  if (/wa\.me|whatsapp\.com|api\.whatsapp/.test(u)) return { key: 'whatsapp', nome: 'WhatsApp' }
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|g\.page|maps\.google|business\.google|g\.co\/kgs/.test(u)) return { key: 'gmn', nome: 'Google Maps' }
  if (/ifood|anota\.?ai|goomer|cardapio|cardápio|menu|aiqfome|deliverydireto|catalogo|catálogo|wa\.me\/c\//.test(u)) return { key: 'catalogo', nome: /ifood/.test(u) ? 'iFood' : 'Cardápio' }
  if (/calendly|agend|booking|reserva|getin|tagme|simplybook|trinks|doctoralia/.test(u)) return { key: 'agendamento', nome: 'Agendamento' }
  if (/tiktok\.com/.test(u)) return { key: null, nome: `TikTok${handle(/tiktok\.com\/@([\w.]+)/i)}` }
  if (/youtu\.?be/.test(u)) return { key: null, nome: 'YouTube' }
  if (/facebook\.com|fb\.com/.test(u)) return { key: null, nome: 'Facebook' }
  if (/linktr\.ee|linkbio|beacons\.ai/.test(u)) return { key: null, nome: 'Link da bio' }
  if (/pinterest\./.test(u)) return { key: null, nome: 'Pinterest' }
  if (/shopee|mercadolivre|amazon\./.test(u)) return { key: null, nome: 'Loja online' }
  return { key: 'site', nome: 'Site' }
}

/** Links do briefing numa lista (principais primeiro, depois os extras). */
export function linkList(f: BriefFixed): LinkItem[] {
  const main = LINK_KEYS.filter((k) => f.links?.[k]?.trim()).map((k) => ({ nome: LINK_LABEL[k], url: f.links![k]!.trim(), key: k as LinkKey }))
  return [...main, ...(f.links_extra ?? []).filter((x) => x.url?.trim()).map((x) => ({ nome: x.nome || detectLink(x.url).nome, url: x.url.trim(), key: null }))]
}

/** Volta da lista para o formato salvo: o 1º de cada tipo vira o link principal; o resto, extra. Removidos ficam em links_off. */
export function fromLinkList(items: LinkItem[], before: BriefFixed): Pick<BriefFixed, 'links' | 'links_extra' | 'links_off'> {
  const links: Partial<Record<LinkKey, string>> = {}
  const extra: LinkExtra[] = []
  for (const it of items) {
    const url = it.url.trim(); if (!url) continue
    const key = it.key ?? detectLink(url).key
    const custom = it.nome.trim() && key && it.nome.trim() !== LINK_LABEL[key] && it.nome.trim() !== detectLink(url).nome
    if (key && !links[key] && !custom) links[key] = url
    else extra.push({ nome: it.nome.trim() || detectLink(url).nome, url })
  }
  const kept = new Set(items.map((i) => linkKey(i.url)))
  const removed = linkList(before).map((i) => i.url).filter((u) => !kept.has(linkKey(u)))
  const off = [...new Set([...(before.links_off ?? []).filter((u) => !kept.has(linkKey(u))), ...removed])]
  return { links, links_extra: extra, links_off: off }
}

// ───────── Quiz: responder tocando em opções (com "Outro") ─────────
export interface QuizStep { q: string; opts: string[]; multi?: boolean }
export const QUIZ: Partial<Record<TextKey, QuizStep[]>> = {
  publico: [
    { q: 'Quem mais compra?', opts: ['Mulheres', 'Homens', 'Casais', 'Famílias com filhos', 'Jovens', 'Empresas'], multi: true },
    { q: 'Qual a idade?', opts: ['18 a 24', '25 a 34', '35 a 44', '45 a 59', '60 ou mais'], multi: true },
    { q: 'Onde mora ou trabalha?', opts: ['No bairro', 'Bairros vizinhos', 'Na cidade toda', 'Região metropolitana', 'Turistas', 'Outras cidades (online)'], multi: true },
    { q: 'Qual a renda?', opts: ['Popular', 'Classe média', 'Média alta', 'Alta'], multi: true },
    { q: 'O que mais pesa na compra?', opts: ['Preço', 'Qualidade', 'Rapidez', 'Atendimento', 'Experiência', 'Confiança na marca'], multi: true },
    { q: 'Quando costuma comprar?', opts: ['Dia a dia', 'Fim de semana', 'À noite', 'No almoço', 'Datas especiais', 'Quando tem promoção'], multi: true },
  ],
  diferenciais: [
    { q: 'Por que escolhem vocês?', opts: ['Qualidade', 'Preço justo', 'Atendimento', 'Rapidez', 'Localização', 'Tradição', 'Produto exclusivo'], multi: true },
    { q: 'O que o cliente mais elogia?', opts: ['Sabor/resultado', 'Ambiente', 'Equipe', 'Entrega', 'Variedade', 'Custo-benefício'], multi: true },
    { q: 'Há quanto tempo existem?', opts: ['Menos de 1 ano', '1 a 3 anos', '3 a 10 anos', 'Mais de 10 anos'] },
  ],
  voz: [
    { q: 'Como a marca fala?', opts: ['Descontraída', 'Próxima, de amigo', 'Profissional', 'Sofisticada', 'Divertida', 'Acolhedora'], multi: true },
    { q: 'Usa gírias e emojis?', opts: ['Sim, bastante', 'Pouco', 'Não'] },
    { q: 'Trata o cliente por', opts: ['Você', 'Vocês/galera', 'Senhor(a)'] },
  ],
  proibidos: [
    { q: 'O que nunca falar ou mostrar?', opts: ['Política', 'Religião', 'Palavrão', 'Concorrente pelo nome', 'Preço baixo como foco', 'Bebida alcoólica', 'Crianças'], multi: true },
  ],
  quem_aparece: [
    { q: 'Quem pode aparecer nos vídeos?', opts: ['O dono', 'A equipe', 'Clientes', 'Só as mãos/produto', 'Ninguém (só produto)'], multi: true },
  ],
  quem_grava: [
    { q: 'Quem grava?', opts: ['Ellcazo', 'O próprio cliente', 'A equipe do cliente', 'Misto'], multi: true },
    { q: 'Com que frequência dá para gravar?', opts: ['Toda semana', 'A cada 15 dias', '1 vez por mês', 'Só quando marcar'] },
  ],
  capacidade: [
    { q: 'Quanto dá para atender por dia?', opts: ['Até 20', '20 a 50', '50 a 100', 'Mais de 100'] },
    { q: 'Qual o gargalo?', opts: ['Cozinha/produção', 'Atendimento', 'Entrega', 'Espaço', 'Agenda', 'Nenhum'], multi: true },
  ],
}

/** Junta as respostas do quiz num texto curto ("Quem mais compra: Mulheres, Casais. Idade: 25 a 34."). */
export function quizText(steps: QuizStep[], answers: string[][]): string {
  return steps.map((s, i) => {
    const a = (answers[i] ?? []).map((x) => x.trim()).filter(Boolean)
    return a.length ? `${s.q.replace(/\?$/, '')}: ${a.join(', ')}.` : ''
  }).filter(Boolean).join(' ')
}

/** Concorrente a partir de um link colado (Instagram, Maps, site): o nome sai do próprio link. */
export function competitorFromLink(link: string): Concorrente {
  const url = /^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`
  const ig = /instagram\.com\/([\w.]+)/i.exec(url)?.[1] ?? /tiktok\.com\/@([\w.]+)/i.exec(url)?.[1]
  const place = /google\.[^/]+\/maps\/place\/([^/@]+)/i.exec(url)?.[1]
  let nome = ig ? `@${ig}` : place ? decodeURIComponent(place.replace(/\+/g, ' ')) : ''
  if (!nome) { try { nome = new URL(url).hostname.replace(/^www\./, '').split('.')[0]! } catch { nome = link.trim() } }
  return { nome, link: url }
}
