// Briefing do cliente (Estratégia interativa): o que o Italo preenche ANTES de gerar a estratégia do mês.
// Dados fixos (client_briefs) + do mês (client_brief_months) + perguntas do mês (client_questions, pack 'briefing_mes').

export interface Produto { nome: string; preco?: string; condicoes?: string; tipo?: 'produto' | 'servico' }
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
  /** Essência da marca (Italo, 20/11): o agente lê tudo para entender como a empresa quer ser vista. */
  /** Momento do negócio (SWOT): forças, fraquezas, onde está, onde quer chegar. */
  momento?: string
  proposito?: string; percepcao?: string; arquetipo?: string; posicionamento?: string; historia?: string; jornada?: string; objecoes?: string; visao?: string
  /** Marketing até hoje, marca e acessos, e o porquê da sazonalidade (Italo, 20/11). */
  marketing?: string; marca?: string; sazonalidade?: string
  /** Histórias e assuntos (conversa de 1 a 3 minutos por pergunta): matéria-prima de artes, vídeos e textos. */
  historias?: string
  /** Meses fortes e fracos (1 a 12). Datas comemorativas o sistema já sabe: não se pergunta. */
  meses_fortes?: number[]; meses_fracos?: number[]
  /** Valores em dinheiro: só administrador vê na tela; o agente lê. */
  verba_anuncio?: string; ticket_medio?: string; faturamento_mes?: string; gasto_ano_cliente?: string; margem_principal?: string
  /** Tipo de negócio (família do motor de perguntas). Sem ele, o sistema deduz pela descrição. */
  tipo?: string
  /** Como a equipe chama o tipo (ex.: Pizzaria, Igreja, ou um tipo novo escrito à mão). */
  tipo_label?: string
  /** Cartão CNPJ da Receita (o agente lê antes de gerar). */
  cnpj?: Record<string, unknown>
}
export interface BriefMonth { ofertas?: string; meta?: string; datas_travam?: string }

/** Campos de texto do briefing (os de lista têm pop-up próprio). */
export type TextKey = 'publico' | 'diferenciais' | 'voz' | 'proibidos' | 'quem_aparece' | 'quem_grava' | 'capacidade'
  | 'momento' | 'proposito' | 'percepcao' | 'arquetipo' | 'posicionamento' | 'historia' | 'jornada' | 'objecoes' | 'visao'
  | 'marketing' | 'marca' | 'sazonalidade' | 'historias'
export const TEXT_FIELDS: Record<TextKey, { label: string; hint: string }> = {
  publico: { label: 'Público', hint: 'Quem compra: idade, bairro, renda, o que busca e o melhor cliente.' },
  momento: { label: 'Momento e futuro', hint: 'Pontos fortes e fracos, quanto dá para atender, onde quer chegar e o que impede (SWOT e visão).' },
  proposito: { label: 'Propósito e história', hint: 'Por que existe além do dinheiro, como começou, a virada e as conquistas (Círculo Dourado).' },
  percepcao: { label: 'Como quer ser vista', hint: 'Como quer ser percebida, como é vista hoje e o que falta (Prisma de Identidade de Kapferer).' },
  arquetipo: { label: 'Personalidade', hint: 'O arquétipo da marca (os 12 arquétipos) e marcas que inspiram ou não.' },
  posicionamento: { label: 'Posicionamento', hint: 'Para quem, por que escolhem vocês e não o concorrente, o que resolve melhor e a prova.' },
  historia: { label: 'História', hint: 'Como começou, a virada, as dificuldades e as conquistas: vira conteúdo.' },
  jornada: { label: 'Como o cliente compra', hint: 'Como descobre, o que pergunta, o que trava a compra, o "trabalho" que contrata (JTBD) e o pós-venda.' },
  objecoes: { label: 'Objeções', hint: 'O que perguntam antes de comprar e o que falam quando não fecham.' },
  visao: { label: 'Visão', hint: 'Onde quer estar em 3 anos e o maior obstáculo de hoje.' },
  diferenciais: { label: 'Diferenciais', hint: 'Por que comprar aqui e não no concorrente.' },
  voz: { label: 'Jeito da marca', hint: 'A personalidade (arquétipo), como fala e o que nunca falar ou mostrar.' },
  proibidos: { label: 'Proibidos', hint: 'O que nunca falar ou mostrar.' },
  marketing: { label: 'Marketing até hoje', hint: 'O que já fizeram (anúncio, influenciador, outra agência), o que funcionou, o que não funcionou e a verba.' },
  marca: { label: 'Marca e acessos', hint: 'Logo, cores, fontes e fotos, e quais acessos a Peformake já tem (Instagram, anúncios, Google).' },
  historias: { label: 'Histórias e assuntos', hint: 'Conversas longas para virar conteúdo: o dia a dia, os clientes, o que ensinar, a história, os bastidores e os conselhos. Falar é o melhor jeito.' },
  sazonalidade: { label: 'Sazonalidade', hint: 'Os meses fortes e fracos do ano e por quê. As datas comemorativas o sistema já sabe.' },
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

// ───────── Cartões juntos (Italo, 20/11: "16 cartões que se repetem viram ~10") ─────────
/**
 * Cartão novo = chave principal + chaves antigas. O cartão mostra o texto que já existia em todas,
 * grava na principal e não apaga as outras (o agente continua lendo tudo).
 */
export const MERGED: Partial<Record<TextKey, TextKey[]>> = {
  posicionamento: ['diferenciais'],
  proposito: ['historia'],
  momento: ['visao', 'capacidade'],
  jornada: ['objecoes'],
  voz: ['arquetipo', 'proibidos'],
}
export const cardKeys = (k: TextKey): TextKey[] => [k, ...(MERGED[k] ?? [])]
/** Feito quando qualquer uma das chaves do cartão tem texto. */
export const cardDone = (f: BriefFixed, k: TextKey) => cardKeys(k).some((x) => filled(f[x]))
/** Texto que o cartão abre: o da chave principal e, sem repetir, o das antigas com o nome na frente. */
export function cardText(f: BriefFixed, k: TextKey): string {
  const main = (f[k] ?? '').trim()
  const rest = (MERGED[k] ?? []).map((x) => [x, (f[x] ?? '').trim()] as const).filter(([, v]) => v.length > 1 && !main.includes(v))
  return [main, ...rest.map(([x, v]) => `${TEXT_FIELDS[x].label}: ${v}`)].filter(Boolean).join('\n')
}

/** Dinheiro do briefing: só administrador vê e preenche na tela (CLAUDE.md); o agente lê. */
export type MoneyKey = 'verba_anuncio' | 'ticket_medio' | 'faturamento_mes' | 'gasto_ano_cliente' | 'margem_principal'
export const MONEY_FIELDS: Record<MoneyKey, { label: string; placeholder: string }> = {
  verba_anuncio: { label: 'Verba de anúncio por mês', placeholder: 'Ex.: R$ 1.500' },
  faturamento_mes: { label: 'Faturamento por mês', placeholder: 'Ex.: R$ 60 mil' },
  ticket_medio: { label: 'Ticket médio', placeholder: 'Ex.: R$ 120' },
  gasto_ano_cliente: { label: 'Gasto por ano do cliente fiel', placeholder: 'Ex.: R$ 1.800' },
  margem_principal: { label: 'Margem do produto principal', placeholder: 'Ex.: 35%' },
}
/** Que dinheiro cada cartão pergunta. */
export const CARD_MONEY: Partial<Record<TextKey, MoneyKey[]>> = { marketing: ['verba_anuncio'], momento: ['faturamento_mes', 'ticket_medio'], publico: ['gasto_ano_cliente'], jornada: ['margem_principal'] }

export const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
export const MONTHS_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** Resumo da sazonalidade em palavras (para a linha do cartão e para quem lê o briefing). */
export function seasonText(f: Pick<BriefFixed, 'meses_fortes' | 'meses_fracos'>): string {
  const ls = (xs?: number[]) => [...new Set(xs ?? [])].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b).map((m) => MONTHS_FULL[m - 1]).join(', ')
  return [ls(f.meses_fortes) && `Fortes: ${ls(f.meses_fortes)}`, ls(f.meses_fracos) && `Fracos: ${ls(f.meses_fracos)}`].filter(Boolean).join(' · ')
}

/** O que conta para o medidor "briefing X% completo". Perguntas do mês valem 2 pontos (proporcional às respondidas). */
/** `video`: o cliente tem serviço de vídeo (só ele tem o cartão Gravação). */
export function briefChecks(f: BriefFixed, m: BriefMonth, answered: number, total: number, video = true): Check[] {
  const precos = (f.produtos ?? []).some((p) => filled(p.preco))
  return [
    { key: 'produtos', label: precos ? 'Produtos' : 'Produtos com preço', done: precos, weight: 1.5 },
    { key: 'links', label: 'Links (2 ou mais)', done: linksCount(f) >= 2, weight: 1 },
    { key: 'publico', label: 'Público', done: filled(f.publico), weight: 1 },
    { key: 'posicionamento', label: 'Posicionamento', done: cardDone(f, 'posicionamento'), weight: 1 },
    { key: 'concorrentes', label: 'Concorrentes', done: filled(f.concorrentes) || !!f.sem_concorrentes, weight: 0.5 },
    { key: 'referencias', label: 'Referências', done: filled(f.referencias), weight: 0.5 },
    { key: 'voz', label: 'Jeito da marca', done: cardDone(f, 'voz'), weight: 0.75 },
    ...(video ? [{ key: 'quem_aparece', label: 'Gravação', done: filled(f.quem_aparece), weight: 0.5 }] : []),
    { key: 'momento', label: 'Momento e futuro', done: cardDone(f, 'momento'), weight: 0.75 },
    { key: 'proposito', label: 'Propósito e história', done: cardDone(f, 'proposito'), weight: 0.5 },
    { key: 'percepcao', label: 'Como quer ser vista', done: filled(f.percepcao), weight: 0.5 },
    { key: 'jornada', label: 'Como o cliente compra', done: cardDone(f, 'jornada'), weight: 0.5 },
    { key: 'marketing', label: 'Marketing até hoje', done: filled(f.marketing), weight: 0.75 },
    { key: 'sazonalidade', label: 'Sazonalidade', done: filled(f.meses_fortes) || filled(f.meses_fracos), weight: 0.5 },
    { key: 'marca', label: 'Marca e acessos', done: filled(f.marca), weight: 0.5 },
    { key: 'historias', label: 'Histórias e assuntos', done: filled(f.historias), weight: 0.5 },
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
/** Itens do briefing FIXO (o do mês entra no passo Perguntas, Italo 20/11). */
export const MONTH_CHECKS = new Set(['ofertas', 'meta', 'datas_travam', 'perguntas'])

export function briefMissing(checks: Check[]): string[] {
  return checks.filter((c) => !c.done).sort((a, b) => b.weight - a.weight).map((c) => c.label)
}

/** Medidor só do briefing FIXO (passo 1 da ficha e o portal do cliente usam o mesmo número). */
export function fixedStatus(f: BriefFixed, video = true): { percent: number; missing: string[]; checks: Check[] } {
  const checks = briefChecks(f, {}, 0, 8, video).filter((c) => !MONTH_CHECKS.has(c.key))
  return { percent: briefPercent(checks), missing: briefMissing(checks), checks }
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

/** Soma produtos lidos de um arquivo sem repetir pelo nome (o que já existe fica como está). */
export function mergeProducts(cur: Produto[], add: Produto[]): { list: Produto[]; added: number } {
  const k = (x: string | undefined) => norm(x)
  const list = [...cur]
  for (const p of add) if (p.nome?.trim() && !list.some((c) => k(c.nome) === k(p.nome))) list.push(p)
  return { list, added: list.length - cur.length }
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
/**
 * Guia de perguntas de um campo (Italo, 20/11: "a partir de uma pergunta ir aprofundando até a essência").
 * `when`: só aparece se a resposta da pergunta `q` tiver uma das palavras. `open`: pergunta aberta (texto ou fala).
 */
export interface QuizStep {
  q: string; opts: string[]; multi?: boolean; open?: boolean
  /** Só aparece se a resposta da pergunta `q` tiver uma das palavras. `has: []`: aparece quando ela foi respondida (puxa-fio). */
  when?: { q: string; has: string[]; short?: number }
  /** Pergunta de dinheiro: a resposta vai para o campo de valor (só administrador vê), não para o texto. */
  money?: MoneyKey
}
const W = (q: string, ...has: string[]) => ({ q, has })
/** Puxa-fio (Italo, 20/11): pergunta curta que só aparece depois que a anterior foi respondida, para a resposta ir fundo. */
const fio = (q: string, p = 'Me dá um exemplo real disso'): QuizStep => ({ q: p, opts: [], open: true, when: { q, has: [] } })
/** Pergunta aberta + o puxa-fio dela. */
const aberta = (q: string, p?: string, when?: { q: string; has: string[] }): QuizStep[] => [{ q, opts: [], open: true, ...(when ? { when } : {}) }, fio(q, p)]
/** É um puxa-fio (pergunta extra de aprofundar). */
export const isFio = (s: QuizStep) => !!s.open && !!s.when && s.when.has.length === 0

/**
 * Histórias e assuntos (Italo, 20/11): 6 conversas grandes e abertas, de 1 a 3 minutos cada, para artes, vídeos e textos.
 * Nada de pergunta "boba" ou de formulário. Resposta curta puxa o fio UMA vez.
 */
export const HISTORIAS: string[] = [
  'Me conta como é um dia normal aí, do abrir ao fechar: o que acontece, quem chega, o que dá mais trabalho e o que você mais gosta de fazer.',
  'Me conta sobre os seus clientes: as dúvidas que eles mais trazem, o que eles costumam errar antes de chegar até você, e algum atendimento que te marcou, seja engraçado, difícil ou emocionante.',
  'Imagina que você vai ensinar alguém a escolher bem um produto ou serviço como o seu. O que você diria? O que diferencia um bom de um ruim, e o que as pessoas acreditam no seu ramo que não é verdade?',
  'Conta a história de vocês desde o começo: por que começou, o momento mais difícil, a virada, e do que vocês têm mais orgulho hoje.',
  'O que acontece aí dentro que o cliente não vê e ia achar interessante? Como é feito, quem faz, algum cuidado ou detalhe que ninguém imagina.',
  'Se você fosse dar um conselho para alguém começando no seu ramo, o que diria? E qual a maior lição que o seu negócio te ensinou?',
]
export const HISTORIA_FIO = 'Me conta um caso real disso?'
/** Resposta com menos que isso (caracteres) puxa o fio. */
export const HISTORIA_CURTA = 240

/** O que nunca falar (entra no guia do Jeito da marca; o portal ainda abre o campo antigo). */
const PROIBIDOS: QuizStep[] = [
  { q: 'O que nunca falar ou mostrar?', opts: ['Política', 'Religião', 'Palavrão', 'Concorrente pelo nome', 'Preço baixo como foco', 'Bebida alcoólica', 'Crianças'], multi: true },
  { q: 'Tem regra de conselho ou lei da profissão?', opts: ['Não mostrar preço', 'Não prometer resultado', 'Não mostrar paciente', 'Não usar antes e depois', 'Não tem'], multi: true },
  ...aberta('Algo que já deu problema e não pode repetir?', 'O que aconteceu e como resolveram?'),
]

export const QUIZ: Partial<Record<TextKey, QuizStep[]>> = {
  proibidos: PROIBIDOS,
  historias: HISTORIAS.flatMap((q) => [{ q, opts: [], open: true }, { q: HISTORIA_FIO, opts: [], open: true, when: { q, has: [], short: HISTORIA_CURTA } }]),
  publico: [
    { q: 'Quem mais compra?', opts: ['Mulheres', 'Homens', 'Casais', 'Famílias com filhos', 'Jovens', 'Empresas'], multi: true },
    { q: 'Idade dos filhos dessas famílias?', opts: ['Bebês', 'Crianças', 'Adolescentes'], multi: true, when: W('Quem mais compra?', 'familias') },
    { q: 'Que tipo de empresa compra e quem decide lá dentro?', opts: ['Pequenos comércios', 'Indústrias', 'Escritórios', 'Órgão público', 'Dono decide', 'Comprador decide'], multi: true, when: W('Quem mais compra?', 'empresas') },
    { q: 'Qual a idade?', opts: ['18 a 24', '25 a 34', '35 a 44', '45 a 59', '60 ou mais'], multi: true },
    { q: 'Onde mora ou trabalha?', opts: ['No bairro', 'Bairros vizinhos', 'Na cidade toda', 'Região metropolitana', 'Turistas', 'Outras cidades (online)'], multi: true },
    { q: 'Até qual bairro ou raio atendem ou entregam?', opts: [], open: true },
    { q: 'Qual a renda?', opts: ['Popular', 'Classe média', 'Média alta', 'Alta'], multi: true },
    ...aberta('Descreva o seu melhor cliente: quem é, o que compra e por que volta', 'Por que ele é o melhor? O que tem de diferente dos outros?'),
    { q: 'Quantas vezes por ano um cliente fiel compra?', opts: ['1 vez', '2 a 4 vezes', '5 a 12 vezes', 'Toda semana'] },
    { q: 'Quanto um cliente fiel gasta no ano?', opts: ['Até R$ 500', 'R$ 500 a 2 mil', 'R$ 2 a 10 mil', 'Mais de R$ 10 mil'], money: 'gasto_ano_cliente' },
    { q: 'O que faz a pessoa procurar vocês? (a dor ou o desejo)', opts: ['Resolver um problema urgente', 'Economizar', 'Se sentir bem', 'Status', 'Praticidade', 'Presentear'], multi: true },
    ...aberta('Conte com as palavras do cliente: o que ele diz quando chega ou elogia?', 'O que um cliente diria sobre vocês para um amigo?'),
    { q: 'O que mais pesa na compra?', opts: ['Preço', 'Qualidade', 'Rapidez', 'Atendimento', 'Experiência', 'Confiança na marca'], multi: true },
    { q: 'O que faz ele desistir de comprar?', opts: ['Preço', 'Demora', 'Desconfiança', 'Não achou o que queria', 'Atendimento'], multi: true },
    { q: 'Quando costuma comprar?', opts: ['Dia a dia', 'Fim de semana', 'À noite', 'No almoço', 'Datas especiais', 'Quando tem promoção'], multi: true },
    { q: 'Onde ele passa o tempo online?', opts: ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'WhatsApp', 'Google'], multi: true },
    ...aberta('E o cliente que dá trabalho e você não quer mais: como ele é?', 'Por que esse cliente não compensa?'),
    ...aberta('Por que um cliente deixou de comprar com vocês? Conte um caso', 'O que daria para ter feito diferente?'),
  ],
  // Posicionamento + Diferenciais.
  posicionamento: [
    { q: 'Por que escolhem vocês?', opts: ['Qualidade', 'Preço justo', 'Atendimento', 'Rapidez', 'Localização', 'Tradição', 'Produto exclusivo'], multi: true },
    { q: 'Qualidade como? O que fazem diferente?', opts: ['Matéria-prima melhor', 'Feito à mão', 'Equipe especializada', 'Garantia', 'Tecnologia'], multi: true, when: W('Por que escolhem vocês?', 'qualidade') },
    { q: 'Por que conseguem um preço melhor?', opts: ['Compra direto da fábrica', 'Produção própria', 'Custo baixo', 'Volume'], multi: true, when: W('Por que escolhem vocês?', 'preco') },
    { q: 'O que tem de especial no atendimento?', opts: ['Responde rápido no WhatsApp', 'Pós-venda', 'Atendimento personalizado', 'Horário estendido', 'Conhece o cliente pelo nome'], multi: true, when: W('Por que escolhem vocês?', 'atendimento') },
    ...aberta('O que é exclusivo de vocês? Conte.', 'Desde quando é assim e por que ninguém copiou?', W('Por que escolhem vocês?', 'exclusivo')),
    { q: 'O que o cliente mais elogia?', opts: ['Sabor/resultado', 'Ambiente', 'Equipe', 'Entrega', 'Variedade', 'Custo-benefício'], multi: true },
    ...aberta('Para quem é, principalmente? (o cliente que vocês mais querem)', 'Por que esse cliente e não outro?'),
    ...aberta('Que problema vocês resolvem melhor que todo mundo?', 'Me dá um exemplo real de um cliente que teve isso resolvido'),
    ...aberta('O que o cliente diria que vocês são? (a categoria)', 'E o que vocês gostariam que ele dissesse?'),
    { q: 'Por que acreditar? Qual a prova?', opts: ['Anos de mercado', 'Clientes atendidos', 'Depoimentos', 'Avaliações no Google', 'Prêmios ou certificação', 'Garantia', 'Antes e depois', 'Ainda não tem'], multi: true },
    { q: 'Contra quem competem de verdade?', opts: ['Concorrente direto', 'O cliente fazer sozinho', 'Não fazer nada', 'Loja online', 'Informal ou mais barato'], multi: true },
    ...aberta('O que o concorrente faz melhor que vocês? Seja sincero', 'Por que vocês ainda não fazem igual?'),
    ...aberta('Por que um cliente troca vocês pelo concorrente?', 'Me dá um exemplo real de quando isso aconteceu'),
    ...aberta('Qual concorrente você admira e qual quer superar?', 'O que precisa acontecer para passar dele?'),
    ...aberta('Em uma frase: o que só vocês fazem e ninguém mais na região?', 'Por que você acha que só vocês fazem isso?'),
  ],
  // Jeito da marca = personalidade (arquétipo) + voz + proibidos.
  voz: [
    { q: 'Como a marca fala?', opts: ['Descontraída', 'Próxima, de amigo', 'Profissional', 'Sofisticada', 'Divertida', 'Acolhedora', 'Técnica'], multi: true },
    { q: 'Até onde vai a brincadeira?', opts: ['Pode zoar e usar meme', 'Leve, sem exagero', 'Só no conteúdo, nunca no anúncio'], when: W('Como a marca fala?', 'descontraida', 'divertida', 'amigo') },
    { q: 'O que passa autoridade para essa marca?', opts: ['Dados e números', 'Anos de experiência', 'Certificações', 'Clientes conhecidos', 'Resultados mostrados'], multi: true, when: W('Como a marca fala?', 'profissional', 'tecnica', 'sofisticada') },
    { q: 'Como ela mostra cuidado com o cliente?', opts: ['Explica com calma', 'Pergunta como ele está', 'Acompanha depois da compra', 'Fala de família'], multi: true, when: W('Como a marca fala?', 'acolhedora') },
    { q: 'Qual personalidade combina mais com a marca? (até 2)', opts: ['Cuidador (protege)', 'Herói (supera)', 'Sábio (ensina)', 'Explorador (aventura)', 'Criador (inova)', 'Governante (lidera)', 'Mago (transforma)', 'Inocente (simples e otimista)', 'Cara comum (igual a você)', 'Amante (prazer e beleza)', 'Bobo da corte (diversão)', 'Rebelde (quebra regras)'], multi: true },
    { q: 'Usa gírias e emojis?', opts: ['Sim, bastante', 'Pouco', 'Não'] },
    { q: 'Trata o cliente por', opts: ['Você', 'Vocês/galera', 'Senhor(a)', 'Pelo nome'] },
    ...aberta('Uma marca famosa com o jeito que vocês querem ter (e por quê)', 'O que exatamente vocês admiram nela?'),
    ...aberta('Uma marca que vocês NÃO querem parecer', 'Por que não? O que incomoda nela?'),
    ...aberta('Palavras ou expressões que a marca SEMPRE usa', 'Onde essas palavras aparecem hoje? (atendimento, post, placa)'),
    { q: 'Palavras que a marca NUNCA usa', opts: [], open: true },
    ...aberta('O que você nunca faria, mesmo que vendesse muito?', 'Por que isso é inegociável?'),
    { q: 'Escreva (ou fale) uma frase do jeito que a marca diria no Instagram', opts: [], open: true },
    ...PROIBIDOS,
  ],
  quem_aparece: [
    { q: 'Quem pode aparecer nos vídeos?', opts: ['O dono', 'A equipe', 'Clientes', 'Só as mãos/produto', 'Ninguém (só produto)'], multi: true },
    { q: 'O dono fica à vontade na câmera?', opts: ['Muito, fala solto', 'Mais ou menos', 'Precisa de roteiro', 'Prefere não falar'], when: W('Quem pode aparecer nos vídeos?', 'dono') },
    ...aberta('Quantas pessoas da equipe topam aparecer? Quem se destaca?', 'Por que essa pessoa se destaca? O que ela tem?', W('Quem pode aparecer nos vídeos?', 'equipe')),
    { q: 'Tem clientes que topam gravar depoimento?', opts: ['Sim, vários', 'Uns 2 ou 3', 'Preciso perguntar'], when: W('Quem pode aparecer nos vídeos?', 'clientes') },
  ],
  quem_grava: [
    { q: 'Quem grava?', opts: ['Ellcazo', 'O próprio cliente', 'A equipe do cliente', 'Misto'], multi: true },
    { q: 'Com que aparelho?', opts: ['Celular bom', 'Celular simples', 'Câmera'], when: W('Quem grava?', 'proprio', 'equipe', 'misto') },
    { q: 'Com que frequência dá para gravar?', opts: ['Toda semana', 'A cada 15 dias', '1 vez por mês', 'Só quando marcar'] },
    { q: 'Melhor dia e horário para gravar sem atrapalhar o movimento?', opts: [], open: true },
  ],
  // Momento e futuro = SWOT + visão + capacidade de atendimento.
  momento: [
    ...aberta('O que a empresa faz muito bem hoje? (os pontos fortes)'),
    { q: 'O que não está bom hoje?', opts: ['Poucos clientes novos', 'Cliente não volta', 'Preço pressionado', 'Equipe', 'Atendimento lento', 'Marca pouco conhecida', 'Redes sociais paradas'], multi: true },
    ...aberta('Conte mais sobre o que não está bom: desde quando e por quê?', 'O que já tentaram para resolver?'),
    { q: 'Como está o movimento hoje?', opts: ['Crescendo', 'Estável', 'Caindo', 'Sazonal (oscila)'] },
    ...aberta('Por que está caindo, na sua visão?', 'Por que você acha isso? O que mudou?', W('Como está o movimento hoje?', 'caindo')),
    { q: 'Quanto fatura por mês, mais ou menos?', opts: ['Até R$ 20 mil', 'R$ 20 a 50 mil', 'R$ 50 a 150 mil', 'R$ 150 a 500 mil', 'Mais de R$ 500 mil'], money: 'faturamento_mes' },
    { q: 'Quanto o cliente gasta em média por compra? (ticket médio)', opts: ['Até R$ 50', 'R$ 50 a 150', 'R$ 150 a 500', 'R$ 500 a 2 mil', 'Mais de R$ 2 mil'], money: 'ticket_medio' },
    { q: 'Quanto dá para atender por dia?', opts: ['Até 20', '20 a 50', '50 a 100', 'Mais de 100'] },
    { q: 'Qual o gargalo?', opts: ['Cozinha/produção', 'Atendimento', 'Entrega', 'Espaço', 'Agenda', 'Nenhum'], multi: true },
    { q: 'Quantos horários livres por semana, e em quais dias?', opts: [], open: true, when: W('Qual o gargalo?', 'agenda') },
    { q: 'Quantas pessoas atendem o WhatsApp e em que horário?', opts: [], open: true, when: W('Qual o gargalo?', 'atendimento') },
    { q: 'Onde a empresa quer estar em 3 anos?', opts: ['Mais unidades', 'Referência na região', 'Vender para o Brasil todo', 'Lançar produto novo', 'Franquia', 'Crescer a equipe'], multi: true },
    ...aberta('E nos próximos 12 meses: o que precisa acontecer para ser um ano bom?', 'Como você vai saber que deu certo? Que número?'),
    { q: 'O que impede de chegar lá hoje?', opts: ['Falta de clientes', 'Equipe', 'Caixa', 'Tempo do dono', 'Concorrência', 'Processo bagunçado', 'Marca pouco conhecida'], multi: true },
    ...aberta('Que oportunidade vocês veem no mercado agora?', 'Por que você acha que ninguém aproveitou ainda?'),
    ...aberta('Se a verba fosse ilimitada, o que faria amanhã?', 'E qual pedaço disso dá para começar pequeno, já?'),
    ...aberta('Tem projeto parado esperando dinheiro ou tempo?', 'O que falta exatamente para destravar?'),
    ...aberta('O que preocupa (ameaças: concorrente novo, preço, crise)?', 'Já aconteceu algo assim? O que fizeram?'),
    { q: 'O que seria um sucesso absoluto com a Peformake em 12 meses?', opts: [], open: true },
  ],
  // Propósito e história.
  proposito: [
    { q: 'Por que a empresa existe, além de ganhar dinheiro?', opts: ['Facilitar a vida das pessoas', 'Cuidar da saúde e do bem-estar', 'Trazer alegria', 'Dar acesso a quem não tinha', 'Valorizar a região', 'Transformar vidas'], multi: true },
    { q: 'Como a empresa nasceu?', opts: ['Paixão do dono', 'Viu uma necessidade', 'Negócio de família', 'Oportunidade de mercado', 'Virada de vida'] },
    ...aberta('Quantas gerações e o que se mantém desde o começo?', 'Por que isso nunca mudou?', W('Como a empresa nasceu?', 'familia')),
    { q: 'Há quanto tempo existem?', opts: ['Menos de 1 ano', '1 a 3 anos', '3 a 10 anos', 'Mais de 10 anos'] },
    ...aberta('Conte o começo: quem, onde e o momento da virada', 'Lembra de um detalhe desse dia? (lugar, frase, sensação)'),
    ...aberta('Um cliente ou caso que marcou a história', 'O que esse cliente diria sobre vocês?'),
    { q: 'Conquistas que dão orgulho', opts: ['Prêmio', 'Nova unidade', 'Cliente grande', 'Marca de vendas', 'Reconhecimento na mídia'], multi: true },
    ...aberta('O que mudaria na vida das pessoas se a empresa fechasse amanhã?', 'Por que você acha isso?'),
    ...aberta('Como vocês fazem isso de um jeito diferente (o "como")?', 'Me dá um exemplo real do dia a dia'),
    ...aberta('Quais valores vocês não negociam?', 'Me dá um exemplo real de quando isso custou caro e vocês mantiveram'),
    ...aberta('Do que a equipe mais se orgulha?', 'O que um cliente diria sobre isso?'),
    ...aberta('Quem na equipe tem uma história boa para contar?', 'Qual é a história? Conte um pedaço'),
    { q: 'Em uma frase: qual é a missão?', opts: [], open: true },
  ],
  percepcao: [
    { q: 'Como a marca QUER ser vista?', opts: ['A mais confiável', 'A mais moderna', 'A de melhor preço', 'A mais premium', 'A mais próxima', 'A especialista', 'A mais divertida'], multi: true },
    { q: 'E como você acha que ela É vista hoje?', opts: ['A mais confiável', 'A mais moderna', 'A de melhor preço', 'A mais premium', 'A mais próxima', 'A especialista', 'Pouco conhecida'], multi: true },
    ...aberta('O que falta para sair de como é vista para como quer ser vista?', 'Por que você acha que ainda não chegou lá?'),
    { q: 'Quem compra quer se sentir como?', opts: ['Esperto', 'Cuidado', 'Especial', 'Moderno', 'Seguro', 'Parte de um grupo'], multi: true },
    { q: 'Que relação a marca tem com o cliente?', opts: ['Amiga', 'Professora', 'Parceira', 'Cuidadora', 'Inspiradora'] },
    { q: 'Visual: que estilo representa a marca?', opts: ['Cores vivas', 'Tons neutros', 'Escuro e elegante', 'Natural', 'Minimalista', 'Cheio de energia'], multi: true },
    ...aberta('3 palavras que as pessoas devem lembrar ao ver a marca', 'O que um cliente diria sobre isso?'),
  ],
  // Como o cliente compra = jornada + objeções.
  jornada: [
    { q: 'Como o cliente descobre vocês?', opts: ['Instagram', 'Google', 'Indicação', 'Passou na frente', 'Anúncio', 'Marketplace'], multi: true },
    ...aberta('Mais ou menos quanto vem de cada canal?', 'Como vocês sabem disso? (perguntam, cupom, palpite)'),
    { q: 'Qual canal traz o cliente que mais compra ou volta?', opts: ['Instagram', 'Google', 'Indicação', 'Passou na frente', 'Anúncio', 'Marketplace'] },
    { q: 'Quem mais indica vocês?', opts: ['Clientes', 'Parceiros', 'Profissionais da área', 'Ninguém em especial'], multi: true },
    { q: 'O que ele faz antes de comprar?', opts: ['Compara preço', 'Pede indicação', 'Olha avaliações', 'Visita o perfil', 'Pergunta no WhatsApp', 'Visita a loja'], multi: true },
    { q: 'Quanto tempo do primeiro contato até comprar?', opts: ['Na hora', 'No mesmo dia', 'Alguns dias', 'Semanas', 'Meses'] },
    ...aberta('Quem responde o WhatsApp e em quanto tempo, em média?', 'E fora do horário, o que acontece?'),
    ...aberta('Qual a frase ou pergunta que mais fecha venda?', 'Por que você acha que ela funciona?'),
    { q: 'Têm meta por vendedor? Usam sistema ou CRM?', opts: ['Meta por vendedor', 'Usam CRM ou sistema', 'Só planilha', 'Nada disso'], multi: true },
    { q: 'Qual a margem do produto principal?', opts: ['Até 20%', '20% a 40%', '40% a 60%', 'Mais de 60%', 'Não sei'], money: 'margem_principal' },
    { q: 'O que o cliente mais pergunta antes de comprar?', opts: ['Preço', 'Prazo', 'Garantia', 'Forma de pagamento', 'Se funciona', 'Onde fica'], multi: true },
    { q: 'O que ele fala quando não fecha?', opts: ['Tá caro', 'Vou pensar', 'Vou ver com alguém', 'Depois eu volto', 'Achei mais barato'], multi: true },
    ...aberta('Como vocês respondem hoje ao "tá caro"?', 'E funciona? O que o cliente responde?', W('O que ele fala quando não fecha?', 'caro', 'barato')),
    ...aberta('Qual o medo do cliente na hora de comprar?', 'O que um cliente diria sobre isso?'),
    ...aberta('Que "trabalho" o cliente contrata quando compra de vocês? (o que ele quer resolver de verdade)', 'Me dá um exemplo real de um cliente'),
    { q: 'Quanto tempo leva do pedido à entrega (ou ao resultado)?', opts: [], open: true },
    { q: 'Depois de comprar ele volta ou indica?', opts: ['Volta todo mês', 'Volta às vezes', 'Compra uma vez', 'Indica muito'], multi: true },
    { q: 'Fazem pós-venda ou pedem indicação? Como?', opts: ['Mensagem de agradecimento', 'Pede avaliação', 'Pede indicação', 'Cupom para voltar', 'Acompanha o resultado', 'Nada ainda'], multi: true },
  ],
  // Novo (Italo, 20/11): o que já foi feito, o que deu certo e a verba (dinheiro só para admin).
  marketing: [
    { q: 'O que já fizeram de marketing?', opts: ['Anúncio no Instagram/Facebook', 'Google Ads', 'Influenciador', 'Outra agência ou assessoria', 'Panfleto, rádio ou outdoor', 'Só postar no Instagram', 'Nada ainda'], multi: true },
    { q: 'Quem fazia os anúncios?', opts: ['O dono', 'Alguém da equipe', 'Agência ou assessoria', 'Freelancer'], multi: true, when: W('O que já fizeram de marketing?', 'anuncio', 'google') },
    ...aberta('Como foi com a outra agência: quanto tempo e por que saiu?', 'O que ela fazia que você gostaria que continuasse?', W('O que já fizeram de marketing?', 'agencia')),
    ...aberta('Que influenciador e qual foi o resultado?', 'Quanto vendeu ou quantos clientes vieram?', W('O que já fizeram de marketing?', 'influenciador')),
    ...aberta('O que funcionou melhor até hoje?', 'Por que você acha que funcionou?'),
    ...aberta('O que não funcionou?', 'Por que você acha que não deu certo?'),
    ...aberta('Qual post ou vídeo mais deu resultado até hoje?', 'Por que você acha que ele funcionou?'),
    ...aberta('Qual a nota no Google e o que mais aparece nas avaliações?', 'O que um cliente diria sobre isso?'),
    ...aberta('Já tiveram crise ou reclamação pública? Como resolveram?', 'O que aprenderam com isso?'),
    { q: 'Existe comunidade, grupo ou evento de clientes?', opts: ['Grupo no WhatsApp', 'Clube ou fidelidade', 'Evento para clientes', 'Ainda não'], multi: true },
    ...aberta('Com quais negócios vizinhos ou parceiros dá para fazer ação juntos?', 'Já fizeram algo juntos? Como foi?'),
    ...aberta('Tem influenciador, cliente famoso ou líder local que já é fã?', 'Como ele conheceu vocês?'),
    { q: 'Como vocês sabem se uma ação deu resultado?', opts: ['Pergunta como conheceu', 'Cupom ou código', 'Relatório da agência', 'Movimento na loja', 'Não medimos'], multi: true },
    { q: 'Quanto dá para investir em anúncio por mês?', opts: ['Até R$ 500', 'R$ 500 a 1.500', 'R$ 1.500 a 3 mil', 'R$ 3 a 10 mil', 'Mais de R$ 10 mil', 'Ainda não sei'], money: 'verba_anuncio' },
    { q: 'Tem conteúdo pronto que dá para reaproveitar?', opts: ['Fotos', 'Vídeos', 'Depoimentos', 'Posts antigos que foram bem', 'Não tem'], multi: true },
  ],
  // Novo: identidade visual e acessos (nunca pedir senha aqui).
  marca: [
    { q: 'Tem logo em arquivo?', opts: ['Sim, em boa qualidade (PDF, PNG, vetor)', 'Só uma imagem simples', 'Não tem logo'] },
    { q: 'A marca tem cores definidas?', opts: ['Sim, com o código (ex.: #1FC8DB)', 'Sim, mas sem o código', 'Ainda não'] },
    { q: 'Quais são as cores? (nomes ou códigos)', opts: [], open: true, when: W('A marca tem cores definidas?', 'sim') },
    ...aberta('Como as pessoas reconhecem a marca hoje? (uma cor, um desenho, uma frase, a fachada)', 'O que um cliente diria sobre isso?'),
    { q: 'Tem fonte (tipo de letra) definida?', opts: ['Sim, sei o nome', 'Sim, mas não sei o nome', 'Não'] },
    { q: 'Tem manual da marca?', opts: ['Sim', 'Não', 'Não sei'] },
    { q: 'Tem fotos boas?', opts: ['Dos produtos', 'Do espaço', 'Da equipe', 'Do dono', 'Não tem fotos boas'], multi: true },
    { q: 'Que acessos a Peformake já tem?', opts: ['Instagram', 'Facebook', 'Gerenciador de anúncios (Meta)', 'Google Meu Negócio', 'Google Ads', 'Site', 'Nenhum ainda'], multi: true },
    { q: 'Quem é o dono das contas?', opts: ['O dono da empresa', 'Alguém da equipe', 'A agência antiga', 'Não sei'], multi: true },
    ...aberta('Falta algum acesso? Qual e com quem está?', 'O que precisa para liberar? (quem, até quando)', W('Quem é o dono das contas?', 'agencia', 'nao sei', 'equipe')),
  ],
}

/** Guia do Direcionamento da equipe (Italo, 20/11: "algo para nos guiar para sair uma resposta completa"). */
export const DIRECTION_QUIZ: QuizStep[] = [
  { q: 'O que o dono quer conquistar neste mês', opts: ['Vender mais', 'Lançar produto ou serviço', 'Clientes novos', 'Ganhar seguidores', 'Fortalecer a marca', 'Encher a agenda', 'Abrir unidade'], multi: true },
  { q: 'O que ele pediu para a gente fazer', opts: ['Mais vídeos', 'Anúncios', 'Promoção', 'Evento', 'Influenciador', 'Parceria', 'Conteúdo educativo'], multi: true },
  { q: 'Qual oferta ou produto é prioridade', opts: ['O carro-chefe', 'Um lançamento', 'Estoque parado', 'O de maior margem', 'Combo ou kit'], multi: true },
  { q: 'O que NÃO fazer', opts: ['Falar de preço', 'Usar humor', 'Mostrar a equipe', 'Fazer promoção', 'Falar de concorrente', 'Temas políticos'], multi: true },
  { q: 'Qual o tom que ele quer', opts: ['Sério e confiável', 'Leve e divertido', 'Premium', 'Próximo e popular', 'Técnico'], multi: true },
  { q: 'O que mudou no negócio desde o mês passado', opts: ['Nada', 'Preço novo', 'Equipe nova', 'Reforma ou mudança', 'Produto novo', 'Problema a resolver'], multi: true },
]

export function quizText(steps: QuizStep[], answers: string[][]): string {
  return steps.map((s, i) => {
    if (s.money) return ''
    const a = (answers[i] ?? []).map((x) => x.trim()).filter(Boolean)
    return a.length ? `${s.q.replace(/\?$/, '')}: ${a.join(', ')}.` : ''
  }).filter(Boolean).join(' ')
}

const nrm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/**
 * Quais perguntas do guia aparecem (índices em `steps`): a que depende de outra só aparece quando a resposta pede
 * e a outra está à mostra; o puxa-fio (`has: []`) aparece quando a anterior foi respondida. `money`: false esconde as de dinheiro.
 */
export function visibleSteps(steps: QuizStep[], answers: string[][], money = true): number[] {
  const out: number[] = []
  const shown = new Set<number>()
  steps.forEach((s, k) => {
    if (s.money && !money) return
    if (s.when) {
      const m = steps.findIndex((x) => x.q === s.when!.q)
      if (m < 0 || m >= k || !shown.has(m)) return
      const got = nrm((answers[m] ?? []).join(' ')).trim()
      if (!got) return
      if (s.when.has.length && !s.when.has.some((h) => got.includes(nrm(h)))) return
      // Puxa-fio de conversa longa: só quando a resposta veio curta (uma vez, sem cansar).
      if (s.when.short && got.length >= s.when.short) return
    }
    shown.add(k); out.push(k)
  })
  return out
}

/** Respostas das perguntas de dinheiro, para os campos de valor. */
export function quizMoney(steps: QuizStep[], answers: string[][]): Partial<Record<MoneyKey, string>> {
  const out: Partial<Record<MoneyKey, string>> = {}
  steps.forEach((s, i) => { const a = (answers[i] ?? []).map((x) => x.trim()).filter(Boolean); if (s.money && a.length) out[s.money] = a.join(', ') })
  return out
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
