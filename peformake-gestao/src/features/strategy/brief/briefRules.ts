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
  proposito?: string; percepcao?: string; arquetipo?: string; posicionamento?: string; historia?: string; jornada?: string; objecoes?: string; visao?: string
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
  | 'proposito' | 'percepcao' | 'arquetipo' | 'posicionamento' | 'historia' | 'jornada' | 'objecoes' | 'visao'
export const TEXT_FIELDS: Record<TextKey, { label: string; hint: string }> = {
  publico: { label: 'Público', hint: 'Quem compra: idade, bairro, renda, o que busca.' },
  proposito: { label: 'Propósito', hint: 'Por que a empresa existe além de ganhar dinheiro (Círculo Dourado: por quê, como, o quê).' },
  percepcao: { label: 'Como quer ser vista', hint: 'Como quer ser percebida, como é vista hoje e o que falta (Prisma de Identidade de Kapferer).' },
  arquetipo: { label: 'Personalidade', hint: 'O arquétipo da marca (os 12 arquétipos) e marcas que inspiram ou não.' },
  posicionamento: { label: 'Posicionamento', hint: 'Para quem, que problema resolve melhor, em que categoria e por que acreditar.' },
  historia: { label: 'História', hint: 'Como começou, a virada, as dificuldades e as conquistas: vira conteúdo.' },
  jornada: { label: 'Jornada de compra', hint: 'Como descobre, o que faz antes de comprar, o "trabalho" que contrata (JTBD) e o pós-venda.' },
  objecoes: { label: 'Objeções', hint: 'O que perguntam antes de comprar e o que falam quando não fecham.' },
  visao: { label: 'Visão', hint: 'Onde quer estar em 3 anos e o maior obstáculo de hoje.' },
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
    { key: 'proposito', label: 'Propósito', done: filled(f.proposito), weight: 0.5 },
    { key: 'percepcao', label: 'Como quer ser vista', done: filled(f.percepcao), weight: 0.5 },
    { key: 'posicionamento', label: 'Posicionamento', done: filled(f.posicionamento), weight: 0.5 },
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
/**
 * Guia de perguntas de um campo (Italo, 20/11: "a partir de uma pergunta ir aprofundando até a essência").
 * `when`: só aparece se a resposta da pergunta `q` tiver uma das palavras. `open`: pergunta aberta (texto ou fala).
 */
export interface QuizStep { q: string; opts: string[]; multi?: boolean; when?: { q: string; has: string[] }; open?: boolean }
const W = (q: string, ...has: string[]) => ({ q, has })
export const QUIZ: Partial<Record<TextKey, QuizStep[]>> = {
  publico: [
    { q: 'Quem mais compra?', opts: ['Mulheres', 'Homens', 'Casais', 'Famílias com filhos', 'Jovens', 'Empresas'], multi: true },
    { q: 'Idade dos filhos dessas famílias?', opts: ['Bebês', 'Crianças', 'Adolescentes'], multi: true, when: W('Quem mais compra?', 'familias') },
    { q: 'Que tipo de empresa compra e quem decide lá dentro?', opts: ['Pequenos comércios', 'Indústrias', 'Escritórios', 'Órgão público', 'Dono decide', 'Comprador decide'], multi: true, when: W('Quem mais compra?', 'empresas') },
    { q: 'Qual a idade?', opts: ['18 a 24', '25 a 34', '35 a 44', '45 a 59', '60 ou mais'], multi: true },
    { q: 'Onde mora ou trabalha?', opts: ['No bairro', 'Bairros vizinhos', 'Na cidade toda', 'Região metropolitana', 'Turistas', 'Outras cidades (online)'], multi: true },
    { q: 'Qual a renda?', opts: ['Popular', 'Classe média', 'Média alta', 'Alta'], multi: true },
    { q: 'O que faz a pessoa procurar vocês? (a dor ou o desejo)', opts: ['Resolver um problema urgente', 'Economizar', 'Se sentir bem', 'Status', 'Praticidade', 'Presentear'], multi: true },
    { q: 'Conte com as palavras do cliente: o que ele diz quando chega ou elogia?', opts: [], open: true },
    { q: 'O que mais pesa na compra?', opts: ['Preço', 'Qualidade', 'Rapidez', 'Atendimento', 'Experiência', 'Confiança na marca'], multi: true },
    { q: 'O que faz ele desistir de comprar?', opts: ['Preço', 'Demora', 'Desconfiança', 'Não achou o que queria', 'Atendimento'], multi: true },
    { q: 'Quando costuma comprar?', opts: ['Dia a dia', 'Fim de semana', 'À noite', 'No almoço', 'Datas especiais', 'Quando tem promoção'], multi: true },
    { q: 'Onde ele passa o tempo online?', opts: ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'WhatsApp', 'Google'], multi: true },
  ],
  diferenciais: [
    { q: 'Por que escolhem vocês?', opts: ['Qualidade', 'Preço justo', 'Atendimento', 'Rapidez', 'Localização', 'Tradição', 'Produto exclusivo'], multi: true },
    { q: 'Qualidade como? O que fazem diferente?', opts: ['Matéria-prima melhor', 'Feito à mão', 'Equipe especializada', 'Garantia', 'Tecnologia'], multi: true, when: W('Por que escolhem vocês?', 'qualidade') },
    { q: 'Por que conseguem um preço melhor?', opts: ['Compra direto da fábrica', 'Produção própria', 'Custo baixo', 'Volume'], multi: true, when: W('Por que escolhem vocês?', 'preco') },
    { q: 'O que tem de especial no atendimento?', opts: ['Responde rápido no WhatsApp', 'Pós-venda', 'Atendimento personalizado', 'Horário estendido', 'Conhece o cliente pelo nome'], multi: true, when: W('Por que escolhem vocês?', 'atendimento') },
    { q: 'O que é exclusivo de vocês? Conte.', opts: [], open: true, when: W('Por que escolhem vocês?', 'exclusivo') },
    { q: 'O que o cliente mais elogia?', opts: ['Sabor/resultado', 'Ambiente', 'Equipe', 'Entrega', 'Variedade', 'Custo-benefício'], multi: true },
    { q: 'Tem prova disso?', opts: ['Depoimentos', 'Avaliações no Google', 'Prêmios', 'Números de vendas', 'Antes e depois', 'Ainda não'], multi: true },
    { q: 'Há quanto tempo existem?', opts: ['Menos de 1 ano', '1 a 3 anos', '3 a 10 anos', 'Mais de 10 anos'] },
    { q: 'Em uma frase: o que só vocês fazem e ninguém mais na região?', opts: [], open: true },
  ],
  voz: [
    { q: 'Como a marca fala?', opts: ['Descontraída', 'Próxima, de amigo', 'Profissional', 'Sofisticada', 'Divertida', 'Acolhedora', 'Técnica'], multi: true },
    { q: 'Até onde vai a brincadeira?', opts: ['Pode zoar e usar meme', 'Leve, sem exagero', 'Só no conteúdo, nunca no anúncio'], when: W('Como a marca fala?', 'descontraida', 'divertida', 'amigo') },
    { q: 'O que passa autoridade para essa marca?', opts: ['Dados e números', 'Anos de experiência', 'Certificações', 'Clientes conhecidos', 'Resultados mostrados'], multi: true, when: W('Como a marca fala?', 'profissional', 'tecnica', 'sofisticada') },
    { q: 'Como ela mostra cuidado com o cliente?', opts: ['Explica com calma', 'Pergunta como ele está', 'Acompanha depois da compra', 'Fala de família'], multi: true, when: W('Como a marca fala?', 'acolhedora') },
    { q: 'Se a marca fosse uma pessoa, quem seria?', opts: ['Amigo do bairro', 'Especialista', 'Mãe ou pai cuidadoso', 'Jovem antenado', 'Empresário de sucesso'] },
    { q: 'Usa gírias e emojis?', opts: ['Sim, bastante', 'Pouco', 'Não'] },
    { q: 'Trata o cliente por', opts: ['Você', 'Vocês/galera', 'Senhor(a)', 'Pelo nome'] },
    { q: 'Palavras ou expressões que a marca SEMPRE usa', opts: [], open: true },
    { q: 'Palavras que a marca NUNCA usa', opts: [], open: true },
    { q: 'Escreva (ou fale) uma frase do jeito que a marca diria no Instagram', opts: [], open: true },
  ],
  proibidos: [
    { q: 'O que nunca falar ou mostrar?', opts: ['Política', 'Religião', 'Palavrão', 'Concorrente pelo nome', 'Preço baixo como foco', 'Bebida alcoólica', 'Crianças'], multi: true },
    { q: 'Tem regra de conselho ou lei da profissão?', opts: ['Não mostrar preço', 'Não prometer resultado', 'Não mostrar paciente', 'Não usar antes e depois', 'Não tem'], multi: true },
    { q: 'Algo que já deu problema e não pode repetir?', opts: [], open: true },
  ],
  quem_aparece: [
    { q: 'Quem pode aparecer nos vídeos?', opts: ['O dono', 'A equipe', 'Clientes', 'Só as mãos/produto', 'Ninguém (só produto)'], multi: true },
    { q: 'O dono fica à vontade na câmera?', opts: ['Muito, fala solto', 'Mais ou menos', 'Precisa de roteiro', 'Prefere não falar'], when: W('Quem pode aparecer nos vídeos?', 'dono') },
    { q: 'Quantas pessoas da equipe topam aparecer? Quem se destaca?', opts: [], open: true, when: W('Quem pode aparecer nos vídeos?', 'equipe') },
    { q: 'Tem clientes que topam gravar depoimento?', opts: ['Sim, vários', 'Uns 2 ou 3', 'Preciso perguntar'], when: W('Quem pode aparecer nos vídeos?', 'clientes') },
  ],
  quem_grava: [
    { q: 'Quem grava?', opts: ['Ellcazo', 'O próprio cliente', 'A equipe do cliente', 'Misto'], multi: true },
    { q: 'Com que aparelho?', opts: ['Celular bom', 'Celular simples', 'Câmera'], when: W('Quem grava?', 'proprio', 'equipe', 'misto') },
    { q: 'Com que frequência dá para gravar?', opts: ['Toda semana', 'A cada 15 dias', '1 vez por mês', 'Só quando marcar'] },
    { q: 'Melhor dia e horário para gravar sem atrapalhar o movimento?', opts: [], open: true },
  ],
  proposito: [
    { q: 'Por que a empresa existe, além de ganhar dinheiro?', opts: ['Facilitar a vida das pessoas', 'Cuidar da saúde e do bem-estar', 'Trazer alegria', 'Dar acesso a quem não tinha', 'Valorizar a região', 'Transformar vidas'], multi: true },
    { q: 'Como a empresa nasceu?', opts: ['Paixão do dono', 'Viu uma necessidade', 'Negócio de família', 'Oportunidade de mercado', 'Virada de vida'] },
    { q: 'Quantas gerações e o que se mantém desde o começo?', opts: [], open: true, when: W('Como a empresa nasceu?', 'familia') },
    { q: 'Que necessidade era essa? Conte.', opts: [], open: true, when: W('Como a empresa nasceu?', 'necessidade') },
    { q: 'O que mudaria na vida das pessoas se a empresa fechasse amanhã?', opts: [], open: true },
    { q: 'Como vocês fazem isso de um jeito diferente (o "como")?', opts: [], open: true },
    { q: 'Em uma frase: qual é a missão?', opts: [], open: true },
  ],
  percepcao: [
    { q: 'Como a marca QUER ser vista?', opts: ['A mais confiável', 'A mais moderna', 'A de melhor preço', 'A mais premium', 'A mais próxima', 'A especialista', 'A mais divertida'], multi: true },
    { q: 'E como você acha que ela É vista hoje?', opts: ['A mais confiável', 'A mais moderna', 'A de melhor preço', 'A mais premium', 'A mais próxima', 'A especialista', 'Pouco conhecida'], multi: true },
    { q: 'O que falta para sair de como é vista para como quer ser vista?', opts: [], open: true },
    { q: 'Quem compra quer se sentir como?', opts: ['Esperto', 'Cuidado', 'Especial', 'Moderno', 'Seguro', 'Parte de um grupo'], multi: true },
    { q: 'Que relação a marca tem com o cliente?', opts: ['Amiga', 'Professora', 'Parceira', 'Cuidadora', 'Inspiradora'] },
    { q: 'Visual: que estilo representa a marca?', opts: ['Cores vivas', 'Tons neutros', 'Escuro e elegante', 'Natural', 'Minimalista', 'Cheio de energia'], multi: true },
    { q: '3 palavras que as pessoas devem lembrar ao ver a marca', opts: [], open: true },
  ],
  arquetipo: [
    { q: 'Qual personalidade combina mais com a marca? (até 2)', opts: ['Cuidador (protege)', 'Herói (supera)', 'Sábio (ensina)', 'Explorador (aventura)', 'Criador (inova)', 'Governante (lidera)', 'Mago (transforma)', 'Inocente (simples e otimista)', 'Cara comum (igual a você)', 'Amante (prazer e beleza)', 'Bobo da corte (diversão)', 'Rebelde (quebra regras)'], multi: true },
    { q: 'Uma marca famosa com o jeito que vocês querem ter (e por quê)', opts: [], open: true },
    { q: 'Uma marca que vocês NÃO querem parecer', opts: [], open: true },
  ],
  posicionamento: [
    { q: 'Para quem é, principalmente? (o cliente que vocês mais querem)', opts: [], open: true },
    { q: 'Que problema vocês resolvem melhor que todo mundo?', opts: [], open: true },
    { q: 'O que o cliente diria que vocês são? (a categoria)', opts: [], open: true },
    { q: 'Por que acreditar? Qual a prova?', opts: ['Anos de mercado', 'Clientes atendidos', 'Certificação', 'Garantia', 'Resultados mostrados', 'Avaliações'], multi: true },
    { q: 'Contra quem competem de verdade?', opts: ['Concorrente direto', 'O cliente fazer sozinho', 'Não fazer nada', 'Loja online', 'Informal ou mais barato'], multi: true },
  ],
  historia: [
    { q: 'Como começou? Conte o momento da virada', opts: [], open: true },
    { q: 'Qual foi a maior dificuldade e como superaram?', opts: [], open: true },
    { q: 'Um cliente ou caso que marcou a história', opts: [], open: true },
    { q: 'Conquistas que dão orgulho', opts: ['Prêmio', 'Nova unidade', 'Cliente grande', 'Marca de vendas', 'Reconhecimento na mídia'], multi: true },
  ],
  jornada: [
    { q: 'Como o cliente descobre vocês?', opts: ['Instagram', 'Google', 'Indicação', 'Passou na frente', 'Anúncio', 'Marketplace'], multi: true },
    { q: 'O que ele faz antes de comprar?', opts: ['Compara preço', 'Pede indicação', 'Olha avaliações', 'Visita o perfil', 'Pergunta no WhatsApp', 'Visita a loja'], multi: true },
    { q: 'Quanto tempo do primeiro contato até comprar?', opts: ['Na hora', 'No mesmo dia', 'Alguns dias', 'Semanas', 'Meses'] },
    { q: 'Que "trabalho" o cliente contrata quando compra de vocês?', opts: [], open: true },
    { q: 'Depois de comprar ele volta ou indica?', opts: ['Volta todo mês', 'Volta às vezes', 'Compra uma vez', 'Indica muito'], multi: true },
    { q: 'O que fazem no pós-venda?', opts: ['Mensagem de agradecimento', 'Pede avaliação', 'Cupom para voltar', 'Acompanha o resultado', 'Nada ainda'], multi: true },
  ],
  objecoes: [
    { q: 'O que o cliente mais pergunta antes de comprar?', opts: ['Preço', 'Prazo', 'Garantia', 'Forma de pagamento', 'Se funciona', 'Onde fica'], multi: true },
    { q: 'O que ele fala quando não fecha?', opts: ['Tá caro', 'Vou pensar', 'Vou ver com alguém', 'Depois eu volto', 'Achei mais barato'], multi: true },
    { q: 'Como vocês respondem hoje ao "tá caro"?', opts: [], open: true, when: W('O que ele fala quando não fecha?', 'caro', 'barato') },
    { q: 'Qual o medo do cliente na hora de comprar?', opts: [], open: true },
  ],
  visao: [
    { q: 'Onde a empresa quer estar em 3 anos?', opts: ['Mais unidades', 'Referência na região', 'Vender para o Brasil todo', 'Lançar produto novo', 'Franquia', 'Crescer a equipe'], multi: true },
    { q: 'Qual o maior obstáculo hoje?', opts: ['Falta de clientes', 'Equipe', 'Caixa', 'Tempo do dono', 'Concorrência', 'Marca pouco conhecida'], multi: true },
    { q: 'O que seria um sucesso absoluto com a Peformake em 12 meses?', opts: [], open: true },
  ],
  capacidade: [
    { q: 'Quanto dá para atender por dia?', opts: ['Até 20', '20 a 50', '50 a 100', 'Mais de 100'] },
    { q: 'Qual o gargalo?', opts: ['Cozinha/produção', 'Atendimento', 'Entrega', 'Espaço', 'Agenda', 'Nenhum'], multi: true },
    { q: 'Quantos horários livres por semana, e em quais dias?', opts: [], open: true, when: W('Qual o gargalo?', 'agenda') },
    { q: 'Quantas pessoas atendem o WhatsApp e em que horário?', opts: [], open: true, when: W('Qual o gargalo?', 'atendimento') },
    { q: 'Quanto tempo leva do pedido à entrega?', opts: [], open: true },
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
