// Comunicação completa de cada vídeo do plano do mês (aba Audiovisual): objetivo, ideia, roteiro cena a cena,
// sugestão de filmagem, vídeos de referência, ideias para engajar e a versão para anúncio.
// Tudo sai do que já existe: monthly_strategies.doc.plano (peças, séries, capturas, pesquisa, tráfego), as ações da área
// audiovisual e a varredura das redes (client_scan). O que o plano não traz pronto é deduzido daqui (nada de pedir de novo).
// Nunca entra o que é interno: observações internas, "a confirmar", custo, verba, links do sistema.
import { clientText } from './monthlyDeck'
import { dm, type MonthlyAction, type MonthlyStrategy } from './monthlyRules'

type Any = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export interface AvScene { n: number; tempo: string; imagem: string; fala: string; tela: string }
export interface AvRef { url: string; label: string; note: string; video: boolean; /** Player para tocar dentro da apresentação (TikTok, Instagram, YouTube). */ embed: string }
/** O papel do vídeo no mês (o "estudo" antes do roteiro). */
export type AvPapel = 'converter' | 'autoridade' | 'humanizar' | 'conectar' | 'viralizar' | 'didatico'
export const PAPEL: Record<AvPapel, { label: string; why: string; ideas: string[] }> = {
  converter: { label: 'Converter', why: 'Leva quem já conhece direto para a conversa no WhatsApp: é o vídeo que roda no anúncio',
    ideas: ['Versão depoimento: um cliente diz em 10 segundos por que voltou', 'Versão oferta direta: produto, condição e prazo em 3 telas', 'Versão objeção: responda o "é caro?" ou o "demora?" mais comum'] },
  autoridade: { label: 'Autoridade', why: 'Mostra por que a marca sabe o que faz, e isso justifica o preço sem precisar baixar',
    ideas: ['Versão pergunta e resposta: a dúvida mais comum respondida em 15 segundos', 'Versão "o que ninguém te conta" sobre o processo', 'Versão comparação honesta: o jeito certo × o jeito apressado'] },
  humanizar: { label: 'Humanizar', why: 'Mostra quem faz: gente de verdade cria confiança e perto do fim do ano rende mais que vitrine',
    ideas: ['Versão bastidor sem roteiro: um dia de quem faz, em 5 cortes', 'Versão "quem é quem" da equipe, com nome na tela', 'Versão erro de gravação: o lado leve da rotina'] },
  conectar: { label: 'Conectar', why: 'Puxa conversa e comentário: quem comenta volta a ver a marca nos próximos dias',
    ideas: ['Versão "conta pra gente": pergunta direta para a câmera', 'Versão enquete falada: "isso ou aquilo?"', 'Versão resposta a um comentário real de cliente'] },
  viralizar: { label: 'Viralizar', why: 'Formato que já está em alta no nicho: alcança gente nova que ainda não segue a marca',
    ideas: ['Versão POV com áudio em alta', 'Versão só imagem e som (ASMR), sem fala', 'Versão "exagero": o detalhe mais impressionante em câmera lenta'] },
  didatico: { label: 'Didático', why: 'Ensina algo útil em poucos segundos: é salvo e compartilhado, e posiciona a marca como referência',
    ideas: ['Versão em 3 passos numerados na tela', 'Versão "mito ou verdade"', 'Versão checklist: o que olhar antes de escolher'] },
}
export interface AvAd { gancho: string; variacoes: string[]; texto: string; titulo: string; corte: string; cta: string; formato: string; duracao: string }
export interface AvVideo {
  papel: AvPapel
  /** Por que este vídeo, ligado ao mês e à pesquisa. */
  papelPorque: string
  /** 3 a 5 variações para não ficar preso ao roteiro. */
  ideias: string[]
  /** id da ação (aprovar) ou da peça. */
  key: string
  action: MonthlyAction | null
  pieceId: string | null
  title: string
  week: number
  date: string | null
  objetivo: string
  serie: string
  ideia: string
  duracao: string
  quemFala: string
  cenas: AvScene[]
  fechamento: string
  cta: string
  filmagem: { enquadramento: string[]; locacao: string; luz: string; quem: string; levar: string[]; takes: string[] }
  refs: AvRef[]
  engajar: { gancho: string; pergunta: string; audio: string }
  anuncio: AvAd | null
}
/** Um vídeo da varredura das redes (TikTok, Reels). */
export interface ScanVideo { link: string; autor?: string; texto?: string; views?: number; audio?: string | null; fonte: string }

const arr = (v: unknown): Any[] => (Array.isArray(v) ? (v as Any[]) : [])
const str = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ')
const isUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//.test(v)
/** Texto que pode ir ao cliente: sem "a confirmar", sem link do sistema, sem colchetes de confirmação. */
const pub = (v: unknown) => clientText(str(v).replace(/\s*\[(?:CONFIRMAR|confirmar|A CONFIRMAR)[^\]]*\]/g, '').replace(/Plano do m[êe]s \(sua se[çc][ãa]o\):\s*\S+/gi, ''))
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const uniq = (xs: string[]) => { const seen = new Set<string>(); return xs.map(str).filter((x) => { const k = x.toLowerCase(); if (!x || seen.has(k)) return false; seen.add(k); return true }) }

export const OBJETIVO: Record<string, string> = {
  vender: 'Venda', autoridade: 'Autoridade', posicionamento: 'Posicionamento', relacionamento: 'Engajamento', educar: 'Autoridade', engajamento: 'Engajamento',
}
/** Objetivo do vídeo de um plano antigo (sem o campo): pelo assunto. */
function guessObjetivo(t: string): string {
  if (/(compr|vend|pre[çc]o|oferta|promo|reserv|pe[çc]a|encomend|whatsapp|garant)/i.test(t)) return 'Venda'
  if (/(como|por que|porque|dica|segredo|bastidor|processo|explic)/i.test(t)) return 'Autoridade'
  return 'Engajamento'
}

const STOP = new Set('a o e de da do das dos em no na nos nas um uma para com por que se sua seu the and of to in é ao à os as mais como sem vai já'.split(' '))
const keys = (t: string) => new Set(str(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w)))
const overlap = (a: Set<string>, b: Set<string>) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n }

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
const VIDEO_HOST = /(tiktok\.com|instagram\.com|youtube\.com|youtu\.be|facebook\.com|fb\.watch|kwai)/
function refLabel(u: string): string {
  const h = host(u)
  if (/tiktok/.test(h)) { const m = /tiktok\.com\/(@[^/]+)/.exec(u); return `TikTok${m ? ` · ${m[1]}` : ''}` }
  if (/instagram/.test(h)) return /\/reel\//.test(u) ? 'Reels do Instagram' : 'Instagram'
  if (/youtu/.test(h)) return 'YouTube'
  if (/facebook\.com\/ads\/library/.test(u)) return 'Anúncio na Biblioteca da Meta'
  if (/facebook/.test(h)) return 'Facebook'
  return h || 'Referência'
}
/** Link do vídeo → player para tocar dentro da apresentação ('' quando a rede não deixa). */
export function embedUrl(u: string): string {
  const tk = /tiktok\.com\/.*\/video\/(\d+)/.exec(u)
  if (tk) return `https://www.tiktok.com/player/v1/${tk[1]}?music_info=1&description=0&rel=0`
  const ig = /instagram\.com\/(reel|reels|p|tv)\/([\w-]+)/.exec(u)
  if (ig) return `https://www.instagram.com/${ig[1] === 'reels' ? 'reel' : ig[1]}/${ig[2]}/embed`
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/.exec(u)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return ''
}
const fmtViews = (n?: number) => (n && n > 0 ? `${n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : n >= 1000 ? `${Math.round(n / 1000).toLocaleString('pt-BR')} mil` : n} views` : '')
/** "1.124.679 views, 100.015 curtidas" → "1,1 mi views" (o primeiro número que for de views). */
function viewsOf(numeros: unknown): string {
  const m = /([\d.]+)\s*(?:views|visualiza)/i.exec(str(numeros))
  return m ? fmtViews(Number(m[1]!.replace(/\./g, ''))) : ''
}

/** Vídeos coletados das redes (client_scan) do mês: TikTok e Reels, com link. */
export function scanVideos(rows: { source: string; data: Any }[]): ScanVideo[] {
  const out: ScanVideo[] = []
  for (const r of rows ?? []) {
    const list = r.source === 'tiktok' ? arr(r.data?.videos) : r.source === 'instagram' ? arr(r.data?.reels) : []
    for (const v of list) if (isUrl(v.link) && !v.anuncio && !v.publi) out.push({ link: v.link, autor: str(v.autor), texto: str(v.texto), views: Number(v.views) || 0, audio: v.audio ?? null, fonte: r.source })
  }
  const seen = new Set<string>()
  return out.filter((v) => (seen.has(v.link) ? false : (seen.add(v.link), true))).sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
}

/** Áudio em alta na varredura: o que se repete e não é "som original". */
export function trendingAudio(scan: ScanVideo[]): string {
  const n = new Map<string, number>()
  for (const v of scan) { const a = str(v.audio); if (!a || /(som original|original sound|original audio|[áa]udio original)/i.test(a)) continue; n.set(a, (n.get(a) ?? 0) + 1) }
  const top = [...n.entries()].sort((a, b) => b[1] - a[1])[0]
  return top && top[1] >= 2 ? top[0].replace(/\s*\(.*\)$/, '') : ''
}

/** "25 a 30 segundos (fala o pizzaiolo, olhando para a câmera)" → ["25 a 30 segundos", "fala o pizzaiolo, olhando para a câmera"]. */
function splitDur(d: string): [string, string] {
  const m = /^(.*?)\s*\((.+)\)\s*$/.exec(str(d))
  return m ? [m[1]!, m[2]!] : [str(d), '']
}

/** Plano antigo (texto corrido): "GANCHO (0 a 3s): ... Fala: "..." Texto na tela: ... CENA 1 (3 a 9s): ... CTA (24 a 30s): ...". */
export function parseLegacy(what: string): { cenas: AvScene[]; duracao: string; quem: string; precisa: string[]; regras: string[] } {
  const t = str(what)
  const duracao = /(\d+\s*a\s*\d+\s*segundos)/i.exec(t)?.[1] ?? ''
  const quem = /^(N[ÓO]S GRAVAMOS|O CLIENTE GRAVA[^.]*)/i.exec(t)?.[1] ?? ''
  const precisa = (/PRECISA(?: NO DIA)?:\s*([^]*?)(?=\s+(?:ATEN[ÇC][ÃA]O|REGRAS)\b|$)/i.exec(t)?.[1] ?? '').replace(/\.$/, '').split(/,\s*|;\s*/).map(str).filter(Boolean)
  const regras = (/REGRAS:\s*([^]*?)(?=\s+(?:PRECISA|ATEN[ÇC][ÃA]O)\b|$)/i.exec(t)?.[1] ?? '').split(/\.\s+/).map((x) => str(x).replace(/\.$/, '')).filter((x) => x && !/^(n[ãa]o|nunca|enviar|mandar|cobrar|avisar)\b/i.test(x))
  const re = /(GANCHO|CENAS?\s*[\d a-z]*?|CTA)\s*\(([^)]+)\):\s*([^]*?)(?=\s+(?:GANCHO|CENAS?\s*\d|CTA)\s*\([^)]*\):|\s+(?:ATEN[ÇC][ÃA]O|REGRAS|PRECISA)\b|$)/g
  const cenas: AvScene[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    const body = m[3]!
    const fala = /fala:\s*"([^"]+)"/i.exec(body)?.[1] ?? ''
    const tela = /texto(?: na tela)?:\s*([^]*?)(?=\s+fala:|$)/i.exec(body)?.[1]?.replace(/\.$/, '') ?? ''
    const imagem = body.split(/\s*(?:fala:|texto(?: na tela)?:)/i)[0]!.replace(/\.$/, '')
    cenas.push({ n: cenas.length + 1, tempo: m[2]!.replace(/\s*a\s*/, '–'), imagem: cap(str(imagem)), fala: str(fala), tela: str(tela) })
  }
  return { cenas, duracao, quem, precisa, regras }
}

const pieceOf = (pecas: Any[], a: MonthlyAction): Any | null => {
  const id = /^(P\d+)\s*·/.exec(a.title)?.[1]
  if (id) return pecas.find((p) => str(p.id) === id) ?? null
  const t = a.title.toLowerCase()
  return pecas.find((p) => str(p.titulo) && t.includes(str(p.titulo).toLowerCase())) ?? null
}
const areaVideo = (a: MonthlyAction) => a.area === 'audiovisual'

/** Os vídeos do mês, na ordem de data. `scan` = varredura das redes (opcional). */
export function avVideos(st: Pick<MonthlyStrategy, 'doc' | 'actions' | 'month'>, scan: ScanVideo[] = []): AvVideo[] {
  const p = ((st.doc as Any)?.plano ?? {}) as Any
  const pecas = arr(p.calendario?.pecas)
  const caps = arr(p.calendario?.capturas)
  const series = arr(p.series)
  const pq = (p.pesquisa ?? {}) as Any
  const research = [...arr(pq.tendencias).map((t) => ({ link: t.link, name: str(t.tendencia), text: `${str(t.tendencia)} ${str(t.ideia)}`, views: viewsOf(t.numeros), plat: str(t.plataforma) })),
    ...arr(pq.referencias).map((r) => ({ link: r.link, name: str(r.nome), text: `${str(r.nome)} ${str(r.o_que_faz)} ${str(r.como_usamos)}`, views: '', plat: '' }))].filter((r) => isUrl(r.link))
  const ads = arr(p.trafego?.anuncios)
  const adPieces = new Set(arr(p.trafego?.campanhas).flatMap((c) => arr(c.conjuntos).flatMap((s) => arr(s.criativos).map(str))))
  const audio = trendingAudio(scan)
  // Palavras que aparecem em quase tudo (o nome do produto do nicho: "pizza", "moto") não servem para achar a referência certa.
  const docs = [...pecas.map((x) => `${str(x.titulo)} ${str(x.ideia)}`), ...research.map((x) => x.text), ...scan.map((v) => v.texto ?? '')].map(keys)
  const df = new Map<string, number>(); for (const d of docs) for (const w of d) df.set(w, (df.get(w) ?? 0) + 1)
  const kf = (t: string) => { const k0 = keys(t); for (const w of [...k0]) if ((df.get(w) ?? 0) > Math.max(2, docs.length * 0.12)) k0.delete(w); return k0 }
  const bank = arr(p.calendario?.banco_ideias).filter((x) => /v[íi]deo|reels/i.test(str(x.tipo))).map((x) => str(x.ideia))
  const acts = (st.actions ?? []).filter((a) => areaVideo(a) && a.status !== 'recusada')

  const out = acts.map((a): AvVideo => {
    const pc = pieceOf(pecas, a)
    const c = (pc?.copy ?? {}) as Any
    const r = (c.roteiro ?? {}) as Any
    const legacy = pc ? null : parseLegacy(a.what)
    const [dur, durNote] = splitDur(str(r.duracao))
    const cenas: AvScene[] = pc
      ? arr(r.cenas).map((x, i) => ({ n: i + 1, tempo: '', imagem: pub(x.imagem), fala: pub(x.fala), tela: pub(x.texto_tela) }))
      : legacy!.cenas.map((x) => ({ ...x, imagem: pub(x.imagem), fala: pub(x.fala), tela: pub(x.tela) }))
    const title = str(pc?.titulo) || a.title.replace(/^P\d+\s*·\s*/, '').replace(/^Gravar (?:o )?v[íi]deo\s+/i, '')
    const objKey = str(pc?.objetivo).toLowerCase()
    const allText = `${title} ${str(pc?.ideia)} ${cenas.map((x) => `${x.imagem} ${x.fala}`).join(' ')}`
    const objetivo = OBJETIVO[objKey] ?? guessObjetivo(`${title} ${a.what.slice(0, 400)}`)
    const serie = series.find((s) => str(s.codigo) === str(pc?.serie))
    const cta = pub(c.cta) || cenas.at(-1)?.fala || ''

    // Filmagem: da captação marcada para esta peça; o resto, das próprias cenas.
    const capt = pc ? caps.find((k) => arr(k.pecas).map(str).includes(str(pc.id))) : null
    const imgs = cenas.map((x) => x.imagem).join(' · ')
    const enq = uniq([
      'Vertical 9:16, câmera ou celular em pé',
      /(de frente|para a c[âa]mera|olhando)/i.test(imgs + durNote) ? 'Plano médio de frente, olhando para a câmera' : '',
      /(close|detalhe|m[ãa]os)/i.test(imgs) ? 'Close nos detalhes (mãos, produto, textura)' : '',
      /(plano aberto|fachada|sal[ãa]o|p[áa]tio|fila|ambiente|loja)/i.test(imgs) ? 'Plano aberto para mostrar o lugar' : '',
      /(c[âa]mera lenta|slow)/i.test(imgs) ? 'Câmera lenta no momento de impacto' : '',
      /(volta|em torno|passando|acompanha)/i.test(imgs) ? 'Câmera em movimento, acompanhando a ação' : '',
      ...(legacy?.regras.map((x) => cap(pub(x))) ?? []),
    ]).slice(0, 4)
    const luzTxt = [...cenas.map((x) => x.imagem), str(c.direcao_arte?.fundo)].map((t) => /luz [^,.;)·]+/i.exec(t)?.[0]).find(Boolean)?.trim()
    const luz = luzTxt ? cap(luzTxt) : legacy?.regras.some((x) => /de dia/i.test(x)) ? 'Luz natural, de dia' : 'Luz natural ou a luz do próprio lugar; evitar contraluz'
    const quem = pub(durNote ? cap(durNote) : capt?.quem_apresenta ? `${str(capt.quem_apresenta)} apresenta` : capt?.quem || legacy?.precisa.find((x) => /(falar|apresent|vendedor|dono)/i.test(x)) || '')
    const locacao = pub(capt?.onde || legacy?.precisa.find((x) => /(loja|av\.|rua|local)/i.test(x)) || /\(([^)]*(?:visita|loja|est[úu]dio)[^)]*)\)/i.exec(a.what)?.[1] || '')
    const temFala = cenas.some((x) => x.fala)
    const material = /\(([^)]+)\)/.exec(str(pc?.material))?.[1]
    const levar = uniq([
      ...(legacy?.precisa.filter((x) => !/(falar|apresent|^loja|av\.|rua )/i.test(x)).map(cap) ?? []),
      material ? `Pronto para gravar: ${material}` : '',
      'Tripé e celular com bateria e espaço',
      temFala ? 'Microfone de lapela para a fala' : '',
      /(luz quente|escur|noite)/i.test(`${imgs} ${luz}`) ? 'Luz de apoio (LED) para não escurecer' : '',
    ].map(pub)).slice(0, 5)
    const takes = uniq([
      ...arr(capt?.o_que_gravar).map(pub).filter((x) => overlap(kf(x), kf(allText)) >= 2).slice(0, 2),
      'Cenas de apoio de 3 a 5 segundos de cada etapa (para cortes)',
      temFala ? 'Uma versão sem fala, só som ambiente' : '',
      pc?.vira_anuncio || adPieces.has(str(pc?.id)) ? 'O gancho falado de 3 jeitos (para testar no anúncio)' : '',
    ]).slice(0, 4)

    // Referências: a tendência da peça, a pesquisa que fala do mesmo assunto e os vídeos coletados das redes.
    const k = kf(allText)
    const refs: AvRef[] = []
    const push = (url: string, label: string, note: string) => { if (isUrl(url) && !refs.some((x) => x.url === url)) refs.push({ url, label, note: pub(note), video: VIDEO_HOST.test(host(url)), embed: embedUrl(url) }) }
    if (isUrl(pc?.tendencia_link)) { const rr = research.find((x) => x.link === pc.tendencia_link); push(pc.tendencia_link, refLabel(pc.tendencia_link), rr ? [rr.name, rr.views].filter(Boolean).join(' · ') : 'A referência deste vídeo') }
    for (const rr of research.map((x) => ({ x, n: overlap(k, kf(x.text)) })).filter((y) => y.n >= 3).sort((a2, b2) => b2.n - a2.n)) push(rr.x.link, refLabel(rr.x.link), [rr.x.name, rr.x.views].filter(Boolean).join(' · '))
    const fromScan = scan.map((v) => ({ v, n: overlap(k, kf(v.texto ?? '')) })).sort((a2, b2) => b2.n - a2.n || (b2.v.views ?? 0) - (a2.v.views ?? 0))
    for (const { v } of fromScan.slice(0, 2)) push(v.link, refLabel(v.link), ['Em alta no nicho', fmtViews(v.views)].filter(Boolean).join(' · '))
    const videosFirst = [...refs.filter((x) => x.video), ...refs.filter((x) => !x.video)]
    const finalRefs = (videosFirst.filter((x) => x.video).length >= 2 ? videosFirst.filter((x) => x.video) : videosFirst).slice(0, 4)

    // Engajar: gancho dos 3 primeiros segundos, pergunta para comentário e áudio.
    const gancho = pub(c.gancho) || cenas[0]?.fala || cenas[0]?.tela || title
    const comentaCta = /coment/i.test(cta) ? cta : ''
    const pergunta = comentaCta || (objetivo === 'Venda' ? 'Fixe um comentário: "Comenta QUERO que a gente te chama no WhatsApp."'
      : objetivo === 'Autoridade' ? 'Pergunte na legenda: "Você já sabia disso? Conta aqui nos comentários."'
        : 'Pergunte na legenda: "E aí, qual é o seu? Conta aqui nos comentários."')
    const som = /(som ambiente|asmr|sem fala)/i.test(`${durNote} ${imgs}`) ? 'Som ambiente alto: o próprio som prende' : ''
    const audioTip = audio ? `Áudio em alta no nicho: ${audio} (baixinho, por trás${temFala ? ' da fala' : ''})` : som

    // Versão para anúncio: quando a peça vira anúncio (ou o tráfego usa a peça).
    const tAd = ads.find((x) => str(x.peca_id) === str(pc?.id))
    const isAd = !!pc?.vira_anuncio || !!tAd || adPieces.has(str(pc?.id)) || (!pc && /an[úu]ncio/i.test(`${a.what} ${a.title}`))
    const variants = uniq([...arr(c.anuncio).map((x) => pub(x.gancho)), ...arr(tAd?.variacoes).map(pub)])
    const crit = str(tAd?.criativo)
    const secs = /(\d+)\s*(?:s\b|seg)/i.exec(crit)?.[1]
    const lastN = cenas.length
    const anuncio: AvAd | null = isAd ? {
      gancho: variants[0] || gancho,
      variacoes: variants.slice(1, 3),
      texto: pub(arr(c.anuncio)[0]?.texto_principal || tAd?.texto_principal),
      titulo: pub(arr(c.anuncio)[0]?.titulo || tAd?.titulo),
      corte: lastN >= 3 ? `Gancho nos 3 primeiros segundos, cenas ${lastN > 4 ? `1, 2, 3 e ${lastN}` : cenas.map((x) => x.n).join(', ')} e a tela final com a chamada` : 'O vídeo inteiro, com o gancho nos 3 primeiros segundos',
      cta: pub(tAd?.cta) || cta || 'Chame no WhatsApp',
      formato: '9:16 (Reels e Stories), com legenda na tela',
      duracao: secs ? `${secs} segundos` : 'Até 15 segundos',
    } : null

    // Estudo: o papel do vídeo no mês (vem do plano novo; nos antigos, deduzido do objetivo, do funil e do assunto).
    const funil = str(pc?.funil).toLowerCase()
    const topViews = Math.max(0, ...finalRefs.map((x) => { const m = /([\d,]+)\s*(mi|mil) views/.exec(x.note); return m ? Number(m[1]!.replace(',', '.')) * (m[2] === 'mi' ? 1e6 : 1e3) : 0 }))
    const papel: AvPapel = (Object.keys(PAPEL) as AvPapel[]).find((x) => x === str(pc?.papel).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      ?? (objetivo === 'Venda' || funil === 'converter' ? 'converter'
        : /(como|passo|dica|explic|por que|porque|insumo|segredo|aprenda)/i.test(title) ? 'didatico'
          : /(bastidor|equipe|quem faz|cozinha|v[ée]spera|rotina|time)/i.test(allText) && objetivo !== 'Posicionamento' ? 'humanizar'
            : funil === 'fidelizar' || objetivo === 'Engajamento' ? 'conectar'
              : funil === 'atrair' && topViews >= 1e5 ? 'viralizar' : 'autoridade')
    const tend = research.find((x) => x.link === pc?.tendencia_link)
    const porque = pub(pc?.papel_porque) || [PAPEL[papel].why + '.', tend && arr(pq.tendencias).find((t) => t.link === tend.link)?.por_que_serve ? pub(arr(pq.tendencias).find((t) => t.link === tend.link)!.por_que_serve) : '', finalRefs[0]?.url === pc?.tendencia_link && /views/.test(finalRefs[0]?.note ?? '') ? `A referência prova: ${finalRefs[0]!.note.split(' · ').pop()}.` : ''].filter(Boolean).join(' ')
    const seriesEps = arr(serie?.episodios).map(str).filter((e) => e && !pecas.some((x) => overlap(keys(e), keys(str(x.titulo))) >= 2))
    const ideias = uniq([
      ...arr(c.ideias_rapidas).map(pub),
      ...variantsFor(arr(c.anuncio).map((x) => pub(x.gancho)).filter((g) => g && g !== gancho)).slice(0, 1),
      ...research.filter((x) => x.link !== pc?.tendencia_link && overlap(k, kf(x.text)) >= 3).map((x) => pub(arr(pq.tendencias).find((t) => t.link === x.link)?.ideia ?? '')).filter(Boolean).slice(0, 1),
      ...seriesEps.slice(0, 1).map((e) => `Outro episódio da série: ${e}`),
      ...bank.filter((b) => overlap(kf(b), k) >= 2).slice(0, 1),
      ...PAPEL[papel].ideas,
    ]).filter((x, i, all) => !all.slice(0, i).some((y) => overlap(keys(x), keys(y)) >= 3)).slice(0, 5)
    const nf = (c.filmagem ?? {}) as Any
    const ne = (c.engajamento ?? {}) as Any

    return {
      papel, papelPorque: porque, ideias,
      key: a.id, action: a, pieceId: pc ? str(pc.id) : null, title: pub(title) || title, week: a.week, date: str(pc?.data) || a.due_date, objetivo,
      serie: serie ? str(serie.nome) : '', ideia: pub(pc?.ideia), duracao: dur || legacy?.duracao || '', quemFala: pub(durNote),
      cenas, fechamento: pub(r.fechamento), cta,
      filmagem: {
        enquadramento: arr(nf.enquadramento).length ? arr(nf.enquadramento).map(pub) : str(nf.enquadramento) ? [pub(nf.enquadramento)] : enq,
        locacao: pub(nf.locacao) || locacao, luz: pub(nf.luz) || pub(luz), quem: pub(nf.quem_aparece) || quem,
        levar: arr(nf.levar).length ? arr(nf.levar).map(pub) : levar, takes: arr(nf.takes_extras).length ? arr(nf.takes_extras).map(pub) : takes,
      },
      refs: finalRefs, engajar: { gancho, pergunta: pub(ne.pergunta_comentario) || pergunta, audio: pub(ne.audio) || audioTip }, anuncio,
    }
  })
  return out.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.week - b.week)
}

/** Ganchos alternativos viram ideia: "Abrir com: “...”". */
const variantsFor = (gs: string[]) => gs.map((g) => `Abrir com outro gancho: “${g}”`)

/** "03/12 · Semana 1". */
export const whenLabel = (v: Pick<AvVideo, 'date' | 'week'>) => [v.date ? dm(v.date) : '', `Semana ${v.week}`].filter(Boolean).join(' · ')
