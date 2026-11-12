// Plano tático de conteúdo do audiovisual (Ellcazo): o que cada página mostra, montado do que o sistema já tem.
// Guia da marca (client_brand_guides + client_brand_voice + brand_style), o plano do mês (marca, séries, peças, banco de ideias)
// e os vídeos (avPlan). O que faltar some (a página não aparece); nada é inventado além dos padrões por perfil de fala.
import { resolveGuide } from '../clients/brandGuideRules'
import { PAPEL, type AvVideo, type PerfilFala } from './avPlan'

type Any = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** Contexto de marca e plano (a tela manda tudo; o link público manda o que pode ir ao cliente). */
export interface AvCtx {
  brand?: { voice?: Any | null; guide?: Any | null; client?: { segment?: string | null; niche?: string | null; brand_style?: Any | null } | null } | null
  /** doc.plano */
  plano?: Any | null
  /** doc.titulo e doc.foco */
  titulo?: string | null
  foco?: string | null
}

export interface Tatico {
  mote: string
  essencia: { frase: string; proposito: string; objetivo: string; publico: string[] } | null
  projeto: { papel: string; quemFala: string; quemGrava: string; naDuvida: string } | null
  tom: { cards: { adjetivo: string; linha: string; exemplo: string }[]; evitar: string[] } | null
  expressao: { visual: string; cores: { hex: string; nome: string }[]; ambiente: string[]; presenca: string[] } | null
  linguagem: { titulo: string; frase: string; regras: { k: string; v: string }[] }
  pilares: { titulo: string; sub: string; cards: { n: number; nome: string; dias: string; linha: string }[] } | null
  semana: { dia: string; pilar: string; oque: string; ref: string; destaque: boolean }[]
  pautas: { titulo: string; dias: string; itens: string[] }[]
  /** Código da referência (R1…) e pilar de cada vídeo, na ordem dos vídeos. */
  refs: { code: string; pilar: string; dias: string }[]
  final: string
}

const str = (v: unknown) => String(v ?? '').replace(/\s*\[(?:CONFIRMAR|confirmar|A CONFIRMAR)[^\]]*\]/g, '').trim().replace(/\s+/g, ' ')
const arr = (v: unknown): Any[] => (Array.isArray(v) ? (v as Any[]) : [])
const strs = (v: unknown): string[] => arr(v).map((x) => str(typeof x === 'string' ? x : x?.nome ?? x?.texto ?? x?.regra)).filter(Boolean)
const sentences = (t: string) => str(t).split(/(?<=[.!?])\s+/).filter(Boolean)
const first = (t: string) => sentences(t)[0] ?? ''
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const lc = (s: string) => (s && !/^[A-Z]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)
const uniq = (xs: string[]) => { const seen = new Set<string>(); return xs.map(str).filter((x) => { const k = x.toLowerCase(); if (!x || seen.has(k)) return false; seen.add(k); return true }) }
const nwords = (t: string) => str(t).split(' ').filter(Boolean).length
/** Tópico curto: a primeira oração, sem ponto final. */
export function topic(t: string, max = 9): string {
  const s = first(t).replace(/[.;]$/, '')
  if (nwords(s) <= max) return s
  const c = s.split(/,\s*|;\s*|:\s*|\s+\(|\s+—\s+|\s+e\s+(?=[a-záéíóú]+\s)/)[0]!
  return nwords(c) >= 2 ? c : s
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const dow = (iso: string | null | undefined) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? ''); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay() : -1 }
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const diasLabel = (ds: number[], long = false) => ORDER.filter((d) => ds.includes(d)).map((d) => (long ? DIA_LONGO : DIAS)[d]).join(' · ')

/** Uma linha para o adjetivo do tom (quando o guia só traz o adjetivo e o exemplo). */
const TOM_LINHA: Record<string, string> = {
  caloroso: 'Fala como quem recebe alguém em casa.', acolhedor: 'Fala como quem recebe alguém em casa.', artesanal: 'Mostra o processo de verdade, sem pressa.',
  sofisticado: 'Poucas palavras, muito cuidado em cada detalhe.', elegante: 'Poucas palavras, muito cuidado em cada detalhe.', claro: 'Diz o que é, quanto é e como pedir.',
  direto: 'Diz o que é e como pedir, sem rodeio.', divertido: 'Leve e com humor, sem perder o respeito.', proximo: 'Fala de igual para igual, como um vizinho.',
  confiavel: 'Mostra a prova antes de prometer.', especialista: 'Explica com segurança, sem complicar.', verdadeiro: 'Mostra o real, sem exagero.',
  sereno: 'Sem pressa e sem gritar.', alegre: 'Energia boa, sem forçar.', simples: 'Frases curtas, palavras do dia a dia.',
}
const key = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** Linguagem de vídeo padrão por perfil de fala (quando o plano não traz a própria). */
const LINGUAGEM: Record<PerfilFala, { titulo: string; frase: string; regras: { k: string; v: string }[] }> = {
  pouca: { titulo: 'A câmera conta a história', frase: 'Se o vídeo não dá vontade, ainda não está pronto.', regras: [
    { k: 'Câmera parada', v: 'Tripé ou celular apoiado. O movimento vem do produto.' },
    { k: 'Close', v: 'Mãos, textura, vapor, o detalhe que dá vontade.' },
    { k: 'Câmera lenta', v: 'Só no momento-chave: o corte, o queijo, a primeira mordida.' },
    { k: 'Luz quente', v: 'Natural sempre que der; nada de luz branca de teto.' },
    { k: 'Som ambiente', v: 'Forno, faca, conversa. Trilha baixinha por baixo.' },
  ] },
  media: { titulo: 'A câmera mostra de perto', frase: 'Se o produto não aparece de perto, o vídeo não está pronto.', regras: [
    { k: 'Produto na mão', v: 'Sempre alguém mostrando, nunca só o produto parado.' },
    { k: 'Close no detalhe', v: 'O acabamento, a textura, o que faz diferença.' },
    { k: 'Uso real', v: 'Alguém usando ou provando, de verdade.' },
    { k: 'Luz natural', v: 'Perto da janela ou de dia; evite contraluz.' },
    { k: 'Som limpo', v: 'Fala perto do celular ou com lapela; sem ruído.' },
  ] },
  muita: { titulo: 'A câmera acompanha a explicação', frase: 'Se a pessoa não entendeu em 15 segundos, refaça.', regras: [
    { k: 'Olho na câmera', v: 'Fale com a lente, como numa conversa.' },
    { k: 'Um passo por plano', v: 'Cada etapa em um corte curto.' },
    { k: 'Texto na tela', v: 'Uma palavra-chave por passo, grande e legível.' },
    { k: 'Luz de frente', v: 'Rosto bem iluminado, sem sombra forte.' },
    { k: 'Microfone de lapela', v: 'Voz clara é metade do vídeo.' },
  ] },
}
const QUEM: Record<PerfilFala, { fala: string; grava: string }> = {
  pouca: { fala: 'Você não precisa ser ator. Uma ou duas frases, com calma e verdade: a imagem faz o resto.', grava: 'Você não precisa de equipamento caro. Precisa de tripé, luz boa e paciência para o close.' },
  media: { fala: 'Você não precisa ser ator. Fale do produto como fala com um cliente no balcão.', grava: 'Você não precisa de equipamento caro. Celular em pé, luz de janela e o produto bem de perto.' },
  muita: { fala: 'Você não precisa ser ator. Explique como explica para um cliente: um passo por vez.', grava: 'Você não precisa de equipamento caro. Tripé, rosto iluminado e microfone de lapela.' },
}

/** Monta o plano tático (dados de cada página). */
export function buildTatico(name: string, _month: string, videos: AvVideo[], ctx: AvCtx = {}, perfil: PerfilFala = 'media'): Tatico {
  const b = ctx.brand ?? null
  const v = (b?.voice ?? {}) as Any
  const g = b ? resolveGuide({ guide: (b.guide ?? {}) as never, voice: b.voice ?? null, client: { id: '', name, segment: b.client?.segment ?? null, logo_path: null, brand_style: b.client?.brand_style ?? null } }) : null
  const p = (ctx.plano ?? {}) as Any
  const marca = (p.marca ?? {}) as Any
  const ex = (v.expressao ?? {}) as Any
  const bs = (b?.client?.brand_style ?? {}) as Any

  const mote = str(ctx.titulo).split(/:\s/)[0]!.trim()
  const mote2 = nwords(mote) <= 8 ? mote : ''

  // Essência.
  const frase = first(str(g?.posicionamento.frase || bs.essencia))
  const proposito = str(v.proposito)
  const arq = str(v.arquetipo).replace(/^[^:]{1,20}:\s*/, '')
  const passar = (g?.posicionamento.passar ?? []).filter((x) => x !== proposito)
  const publico = uniq([arq ? cap(first(arq)) : '', passar.length > 1 ? `${[passar[0]!, ...passar.slice(1, -1).map(lc)].join(', ')} e ${lc(passar.at(-1)!)}.` : passar[0] ?? '']).slice(0, 2)
  const objetivo = topic(str(ctx.foco), 16)
  const essencia = frase && (proposito || publico.length) ? { frase, proposito, objetivo, publico } : null

  // Tom de voz.
  const tonsRaw = g?.voz.tom.length ? g.voz.tom : []
  const tom = tonsRaw.slice(0, 4).map((t) => ({ adjetivo: cap(str(t.adjetivo)), linha: TOM_LINHA[key(t.adjetivo)] ?? '', exemplo: first(str(t.exemplo)) || str(t.exemplo) })).filter((t) => t.adjetivo)
  const evitar = uniq([...(g?.voz.evitar ?? []), ...strs(marca.copy?.evitar)].map((x) => cap(topic(x, 5)))).filter((x) => nwords(x) <= 6).slice(0, 5)
  const tomSec = tom.length >= 2 ? { cards: tom, evitar } : null

  // Projeto em uma página.
  const adjs = tom.map((t) => t.adjetivo.toLowerCase())
  const naDuvida = adjs.length >= 2 ? `Na dúvida: se ficou ${adjs.slice(0, 3).slice(0, -1).join(', ')} e ${adjs.slice(0, 3).at(-1)}, está certo.` : ''
  const ideia = first(str(marca.visual?.ideia_central))
  const papel = str(p.papel_audiovisual) || (frase ? `Mostrar, em cada vídeo, ${lc(frase.replace(/\.$/, ''))}.` : ideia)
  const projeto = papel ? { papel, quemFala: str(p.quem_fala) || QUEM[perfil].fala, quemGrava: str(p.quem_grava) || QUEM[perfil].grava, naDuvida } : null

  // Expressão de marca.
  const cores = (g?.visual.cores ?? []).slice(0, 4).map((c) => ({ hex: c.hex, nome: c.nome || c.hex }))
  const okText = (t: string) => (/(n[ãa]o cadastrad|at[ée] o guia|a definir|confirmar|pendente)/i.test(t) ? '' : t)
  const visual = okText(first(str(ex.paleta))) || (cores.length ? '' : okText(first(str(marca.visual?.cores))))
  const amb = sentences(str(ex.ambiente || g?.visual.foto || marca.visual?.fotografia)).map((x) => topic(x, 8))
  const ambiente = uniq(amb.flatMap((x) => (nwords(x) > 8 ? x.split(/,\s*/) : [x])).map((x) => cap(x.replace(/\.$/, '')))).filter((x) => nwords(x) >= 2).slice(0, 3)
  const presenca = uniq([...sentences(str(ex.presenca || g?.design.layout)).map((x) => cap(topic(x, 8))), g?.audiovisual.apresentador ? cap(topic(g.audiovisual.apresentador, 8)) : '', ...(g?.audiovisual.mostrar ?? []).map((x) => cap(topic(x, 8)))]).slice(0, 3)
  const expressao = (visual || cores.length) && (ambiente.length || presenca.length) ? { visual, cores, ambiente, presenca } : null

  // Linguagem de vídeo: a do plano (linguagem_video) ou o padrão do perfil; a frase-regra vem do guia quando existe.
  const own = arr(p.linguagem_video).map((x) => ({ k: str(x.regra ?? x.k ?? x.nome), v: str(x.como ?? x.v ?? x.descricao) })).filter((x) => x.k && x.v)
  const regra = str(g?.voz.regra_teste).replace(/\ba pe[çc]a\b/i, 'o vídeo').replace(/\bpe[çc]a\b/i, 'vídeo')
  const L = LINGUAGEM[perfil]
  const linguagem = { titulo: L.titulo, frase: str(p.linguagem_frase) || (regra && nwords(regra) <= 22 ? regra : L.frase), regras: (own.length >= 3 ? own : L.regras).slice(0, 5) }

  // Pilares: as séries dos vídeos (ou o papel, quando o vídeo não tem série), com os dias da semana.
  const series = arr(p.series)
  const pilarOf = (x: AvVideo) => x.serie || PAPEL[x.papel].label
  const groups = new Map<string, AvVideo[]>()
  for (const x of videos) groups.set(pilarOf(x), [...(groups.get(pilarOf(x)) ?? []), x])
  const pil = [...groups.entries()].map(([nome, vs]) => {
    const s = series.find((y) => str(y.nome) === nome)
    return { nome, vs, n: vs.length, dias: diasLabel(vs.map((x) => dow(x.date))), linha: topic(str(s?.o_que_e), 12) || topic(PAPEL[vs[0]!.papel].why, 12), codigo: str(s?.codigo) }
  }).sort((a, c) => c.n - a.n || (a.vs[0]!.date ?? '').localeCompare(c.vs[0]!.date ?? ''))
  const pilares = pil.length ? { titulo: mote2 || `Os vídeos de ${name}`, sub: ideia, cards: pil.slice(0, 4).map((x) => ({ n: x.n, nome: x.nome, dias: x.dias, linha: x.linha })) } : null

  // Calendário: o mês dia a dia, com o código da referência. Dia especial = vídeo que vira anúncio.
  const refs = videos.map((x, i) => ({ code: `R${i + 1}`, pilar: pilarOf(x), dias: x.date ? `${DIA_LONGO[dow(x.date)] ?? ''} ${x.date.slice(8, 10)}/${x.date.slice(5, 7)}` : `Semana ${x.week}` }))
  const ads = videos.filter((x) => x.anuncio).length
  const semana = videos.map((x, i) => ({ dia: x.date ? `${DIAS[dow(x.date)]} ${x.date.slice(8, 10)}/${x.date.slice(5, 7)}` : `Semana ${x.week}`, pilar: refs[i]!.pilar, oque: x.title, ref: refs[i]!.code, destaque: !!x.anuncio && ads <= Math.max(1, Math.floor(videos.length / 2)) }))

  // Banco de pautas: por pilar, as ideias do cardápio (fora o vídeo já planejado) e os episódios das séries.
  const used = new Set(videos.map((x) => key(x.title)))
  const pautas = pil.map((x) => {
    const s = series.find((y) => str(y.nome) === x.nome)
    const itens = uniq([...strs(s?.episodios), ...x.vs.flatMap((y) => y.cardapio.slice(1).filter((c) => !c.padrao).map((c) => c.titulo))])
      .map((t) => topic(t.replace(/^['"“]([^'"”]+)['"”]\s*/, '$1. '), 12)).filter((t) => { const k = key(t); if (used.has(k) || nwords(t) < 2) return false; used.add(k); return true }).slice(0, 5)
    return { titulo: x.nome, dias: diasLabel(x.vs.map((y) => dow(y.date)), true), itens }
  }).filter((x) => x.itens.length >= 2)

  const final = ideia || objetivo
  return { mote: mote2, essencia, projeto, tom: tomSec, expressao, linguagem, pilares, semana, pautas, refs, final }
}
