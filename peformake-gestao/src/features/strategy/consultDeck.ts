// Apresentação do diagnóstico, estilo apresentação de verdade: cada slide tem UMA mensagem (título grande)
// e só uma coisa embaixo: até 4 tópicos curtos, OU um gráfico, OU cards com números grandes. Nada de parágrafo.
// O texto completo fica na tela, atrás de "Ver detalhes" (details), nunca no PDF.
// O mesmo HTML serve para: tela (um slide por vez), PDF (impressão do navegador, @page por orientação), link público e portal.
// Slides "internos" (decisões da Peformake, alertas) só aparecem na tela da equipe; nunca no PDF, link ou portal.
// Medidas em cqw (largura do slide): o slide escala igual na tela e no papel.
import { ellcazoSvg } from '../../components/ui/ellcazoSvg'
import { DECK_FONT_HREF, DECK_FONT_LINK, peformakeCss } from './deckTheme'
import { comparisonSvg, funnelData, funnelSvg, maturitySvg, positioningData, positioningSvg, presenceBarsSvg, presenceData, ratingsData, ratingsSvg, onColor, riskMatrixSvg, SERIES, timelineSvg } from './consultCharts'

type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export type Orientation = 'vertical' | 'paisagem'
export type SlideSection = 'resumo' | 'inteligencia' | 'diagnostico' | 'comunicacao' | 'plano' | 'riscos' | 'do_cliente'
export interface DeckInput {
  name: string
  doc: Doc
  questions?: { question: string; why?: string | null; answer?: string | null }[]
  clientLogoUrl?: string | null
  peformakeLogoUrl?: string | null
  updatedAt?: string | null
  /** Outra apresentação no mesmo estilo (ex.: estratégia do mês): monta os próprios slides. */
  /** `live`: modo apresentação na tela (pode tocar vídeo); sem ele, PDF/impressão. */
  slides?: (o: Orientation, ctx?: { live?: boolean }) => Slide[]
  /** Nome do documento na aba/PDF (padrão: Diagnóstico). */
  title?: string
  /** Identidade: Peformake (padrão) ou Ellcazo (tudo que é do audiovisual: logo + verde-limão e preto). */
  brand?: DeckBrand
}
export type DeckBrand = 'peformake' | 'ellcazo'
const BRAND_NAME: Record<DeckBrand, string> = { peformake: 'Peformake', ellcazo: 'Ellcazo' }
/** Cores da moldura (fundo da aba, botões) de cada identidade. */
const CHROME: Record<DeckBrand, { bg: string; paper: string; acc: string; ink: string; soft: string; line: string; mut: string }> = {
  peformake: { bg: '#0B3C44', paper: '#CFE3E7', acc: '#1FC8DB', ink: '#0B3C44', soft: '#E6F7F9', line: '#D9E2E5', mut: '#CFE3E7' },
  ellcazo: { bg: '#121410', paper: '#E4E8DA', acc: '#B5E61D', ink: '#121410', soft: '#F1F8DA', line: '#E2E6D8', mut: '#D8DECB' },
}
export interface SlideDetail { title: string; items: { k?: string; v: string; url?: string }[] }
export interface Slide {
  kind?: 'cover' | 'statement'
  kicker?: string
  title?: string
  body: string
  section?: SlideSection
  internal?: boolean
  details?: SlideDetail
  /** Slide de decisão interna: índice em inteligencia.decisoes_peformake (vira tarefa). */
  decision?: number
  /** Sem cabeçalho padrão: o corpo traz o próprio selo e título (páginas de referência do audiovisual). */
  bare?: boolean
}

export const esc = (s: unknown) => String(s ?? '').replace(/\s*\[(?:CONFIRMAR|confirmar|A CONFIRMAR)[^\]]*\]/g, '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const arr = (v: unknown): Doc[] => (Array.isArray(v) ? v as Doc[] : [])
const strs = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).map(String).filter((s) => s.trim()) : [])
const chunk = <T,>(a: T[], n: number): T[][] => { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out }
const isUrl = (s: unknown): s is string => typeof s === 'string' && /^https?:\/\//.test(s)
/**
 * Texto do slide: nunca corta com "…" (frase pela metade não serve para o cliente).
 * Se passar muito do tamanho, fica só a primeira frase inteira que couber; senão vai completo e o slide se ajusta (fitSlides).
 */
export const words = (s: unknown, n: number) => {
  const t = String(s ?? '').trim().replace(/\s+/g, ' ')
  const w = t.split(' ')
  if (w.length <= Math.ceil(n * 1.3)) return t
  const cut = w.slice(0, Math.ceil(n * 1.3)).join(' ')
  const m = /^(.*[.!?])\s/.exec(cut + ' ')
  return m && m[1]!.split(' ').length >= Math.ceil(n * 0.5) ? m[1]! : t
}
const pos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const WHO: Record<string, string> = { cliente: 'Cliente', peformake: 'Peformake', juntos: 'Juntos' }
const EFFORT: Record<string, string> = { baixo: 'Rápido', medio: 'Médio', alto: 'Grande' }
const LEVEL: Record<string, string> = { alto: 'alto', medio: 'médio', baixo: 'baixo' }
const TIPO: Record<string, [string, string]> = { gargalo: ['Gargalo', SERIES[1]], oportunidade: ['Oportunidade', SERIES[2]], risco: ['Risco', SERIES[3]], forca: ['Força', SERIES[0]] }

// Ícones simples (traço), para dar ritmo visual.
const ICON: Record<string, string> = {
  alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.3.2 4 1.8 4.5 4.5"/>',
  fala: '<path d="M4 5h16v11H9l-5 4z"/>',
  raio: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  pergunta: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17v.5"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  teste: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/>',
  moeda: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1 1.7 3 2 3 1 3 2.1-1.3 2-3 2c-1.4 0-2.6-.6-3-1.6M12 6v2M12 16v2"/>',
}
const icon = (k: keyof typeof ICON) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`
/** "Assimilação (descobre a loja)" → "Descobre a loja": o nome do dia a dia fica no slide. */
const stage = (e: unknown) => { const t = String(e ?? ''); const m = t.match(/\(([^)]+)\)/); const v = m ? m[1]! : t; return v.charAt(0).toUpperCase() + v.slice(1) }
const bullets = (items: string[], n = 4, w = 14) => `<ul class="bul">${items.slice(0, n).map((t) => `<li>${esc(words(t, w))}</li>`).join('')}</ul>`

/** Lista de slides (o modelo). `internal` inclui os slides só da equipe (tela). */
export function buildSlides(input: DeckInput, o: Orientation, opts: { internal?: boolean; live?: boolean } = {}): Slide[] {
  if (input.slides) return input.slides(o, { live: opts.live }).filter((x) => opts.internal || !x.internal)
  const { doc, name } = input
  const r = doc.resumo ?? {}, d = doc.diagnostico ?? {}, c = doc.comunicacao ?? {}, p = doc.plano ?? {}, intel = doc.inteligencia ?? {}
  const land = o === 'paisagem'
  const out: Slide[] = []
  const add = (s: Slide) => { if (s.internal && !opts.internal) return; out.push(s) }
  const date = new Date(doc.gerado_em ?? input.updatedAt ?? Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const brand = `<div class="cover-top">${input.peformakeLogoUrl ? `<img class="pf-logo" src="${esc(input.peformakeLogoUrl)}" alt="Peformake">` : ''}<span class="brand">Peformake</span></div>`

  add({ kind: 'cover', section: 'resumo', body: `${brand}
    <div class="cover-mid">
      <p class="kicker">Consultoria · para decidir junto</p>
      <h1>${esc(name)}</h1>
      <p class="cv-t">Diagnóstico e plano de ação</p>
    </div>
    <p class="cover-foot"><span>${esc(date)}</span><span>Consultoria <b>Peformake</b></span></p>` })

  // 1. A tese + 3 números
  const mat = arr(intel.maturidade).filter((m) => typeof m.nota === 'number')
  const score = mat.length ? Math.round(mat.reduce((a, m) => a + m.nota, 0) / mat.length) : (typeof r.nota_maturidade === 'number' ? r.nota_maturidade * 10 : null)
  const me = d.presenca_digital?.cliente ?? {}
  const rivals = arr(d.mercado?.concorrentes)
  const kpis = [
    score !== null ? [`${score}<small>/100</small>`, 'Maturidade digital'] : null,
    pos(me.nota_google) ? [`${fmt(me.nota_google)}<small>★</small>`, pos(me.avaliacoes) ? `${me.avaliacoes} avaliações` : 'Nota no Google'] : null,
    pos(me.seguidores) ? [fmt(me.seguidores), 'Seguidores no Instagram'] : null,
    rivals.length ? [String(rivals.length), 'Concorrentes analisados'] : null,
  ].filter(Boolean).slice(0, 3) as [string, string][]
  const tese = intel.tese || r.titulo
  if (tese) add({ kind: 'statement', kicker: 'Em uma frase', section: 'resumo', body: `<p class="big">${esc(words(tese, 24))}</p>${kpis.length ? `<div class="kpis">${kpis.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}`,
    details: r.situacao ? { title: 'A situação', items: [{ v: r.situacao }, ...strs(r.decisoes).map((t) => ({ k: 'Decisão', v: t }))] } : undefined })

  // 2. Descobertas (cards com número grande)
  const desc = arr(intel.descobertas)
  chunk(desc, land ? 3 : 3).forEach((g, i, all) => add({
    title: all.length > 1 ? `O que descobrimos (${i + 1}/${all.length})` : 'O que descobrimos', kicker: 'Descobertas', section: 'inteligencia',
    body: `<div class="${land ? 'grid g3' : 'stack'}">${g.map((x) => { const [lab, col] = TIPO[x.tipo] ?? ['Achado', SERIES[0]]; return `<div class="card find" style="--c:${col};--on:${onColor(col)}"><p class="tag">${esc(lab)}</p><p class="num-big${String(x.numero ?? '').length > 12 ? ' long' : ''} clamp-2">${esc(words(x.numero, 6))}</p><h3 class="clamp-3">${esc(words(x.titulo, 14))}</h3></div>` }).join('')}</div>`,
    details: { title: 'O que descobrimos', items: g.map((x) => ({ k: x.titulo, v: `${x.explicacao}${x.evidencia ? ` (Fonte: ${x.evidencia})` : ''}`, url: isUrl(x.evidencia) ? x.evidencia : undefined })) },
  }))
  if (!desc.length && strs(r.decisoes).length) add({ title: 'As decisões que importam', kicker: 'Resumo', section: 'resumo', body: bullets(strs(r.decisoes), 3) })

  // 3. Números: você × referência
  const comp = arr(intel.comparativos).filter((x) => pos(x.cliente) || pos(x.referencia))
  if (comp.length >= 2) add({ title: 'Você × mercado, em números', kicker: 'Comparativo', section: 'inteligencia', body: `<div class="chart-only">${comparisonSvg(comp.slice(0, 5), name)}</div>`,
    details: { title: 'De onde vêm os números', items: comp.map((x) => ({ k: x.metrica, v: `${name}: ${fmt(x.cliente)} ${x.unidade} · ${x.referencia_nome}: ${fmt(x.referencia)} ${x.unidade}`, url: isUrl(x.fonte) ? x.fonte : undefined })) } })
  if (mat.length) add({ title: `Maturidade digital: ${score}/100`, kicker: 'Diagnóstico', section: 'inteligencia', body: `<div class="chart-only">${maturitySvg(mat)}</div>`,
    details: { title: 'Por que cada nota', items: mat.map((m) => ({ k: `${m.dimensao}: ${m.nota}`, v: m.porque })) } })

  const fun = funnelData(d)
  if (fun) add({ title: d.funil?.titulo || 'Do anúncio à venda', kicker: 'Números dos anúncios', section: 'diagnostico', body: `<div class="chart-only">${funnelSvg(fun)}</div>${d.funil?.texto ? `<p class="caption clamp-2">${esc(words(d.funil.texto, 22))}</p>` : ''}`,
    details: d.funil?.texto ? { title: 'Funil', items: [{ v: d.funil.texto }] } : undefined })

  // 4. Mercado e concorrentes
  const pres = presenceData(d, name)
  if (pres) add({ title: 'Presença digital: você × concorrentes', kicker: 'Mercado', section: 'diagnostico', body: `<div class="chart-only">${presenceBarsSvg(pres)}</div>`,
    details: { title: 'Presença por canal', items: arr(d.presenca_digital?.itens).map((x) => ({ k: x.canal, v: x.observacao, url: isUrl(x.fonte) ? x.fonte : undefined })) } })
  const rat = ratingsData(d, name)
  if (rat) add({ title: 'Reputação no Google', kicker: 'Mercado', section: 'diagnostico', body: `<div class="chart-only">${ratingsSvg(rat)}</div><p class="caption">Nota no Google (nº de avaliações).</p>` })
  if (rivals.length) {
    const lvl = (n: unknown) => (pos(n) ? '$'.repeat(Math.min(5, n as number)) : '–')
    add({ title: 'Quem disputa o mesmo cliente', kicker: 'Concorrentes', section: 'diagnostico',
      body: `<table class="tbl"><thead><tr><th>Concorrente</th><th>Google</th><th>Instagram</th><th>Preço</th></tr></thead><tbody>${[{ nome: name, nota: me.nota_google, avaliacoes: me.avaliacoes, seguidores: me.seguidores, preco_nivel: me.preco_nivel, me: true }, ...rivals.slice(0, land ? 4 : 5)].map((x: Doc) => `<tr${x.me ? ' class="me"' : ''}><td><b>${esc(words(x.nome, 4))}</b></td><td>${pos(x.nota) ? `${fmt(x.nota)}★${pos(x.avaliacoes) ? ` <small>(${x.avaliacoes})</small>` : ''}` : '–'}</td><td>${pos(x.seguidores) ? fmt(x.seguidores) : '–'}</td><td>${lvl(x.preco_nivel)}</td></tr>`).join('')}</tbody></table>`,
      details: { title: 'Concorrentes', items: rivals.map((x) => ({ k: x.nome, v: [x.diferencial || x.o_que_fazem, x.como_anunciam && !/n[aã]o encontrad/i.test(x.como_anunciam) ? `Comunicação: ${x.como_anunciam}` : '', x.preco && !/n[aã]o encontrad/i.test(x.preco) ? `Preço: ${x.preco}` : ''].filter(Boolean).join(' · '), url: [x.site, x.google_maps, x.fonte].find(isUrl) })) } })
  }
  const posi = positioningData(d, name)
  if (posi) add({ title: 'Onde cada um se posiciona', kicker: 'Mercado', section: 'diagnostico', body: `<div class="chart-only">${positioningSvg(posi)}</div>` })
  if (d.swot) {
    const q = (k: string, l: string, cls: string) => `<div class="sw ${cls}"><h3>${l}</h3>${bullets(strs(d.swot[k]), 3, 8)}</div>`
    add({ title: 'Forças, fraquezas, oportunidades e ameaças', kicker: 'Diagnóstico', section: 'diagnostico', body: `<div class="swot">${q('forcas', 'Forças', 'ok')}${q('fraquezas', 'Fraquezas', 'warn')}${q('oportunidades', 'Oportunidades', 'acc')}${q('ameacas', 'Ameaças', 'gray')}</div>`,
      details: { title: 'SWOT completo', items: (['forcas', 'fraquezas', 'oportunidades', 'ameacas'] as const).flatMap((k) => strs(d.swot[k]).map((t) => ({ k: { forcas: 'Força', fraquezas: 'Fraqueza', oportunidades: 'Oportunidade', ameacas: 'Ameaça' }[k], v: t }))) } })
  }

  // 5. Público
  const per = d.publico?.persona
  if (per?.nome) add({ title: `Para quem vender: ${String(per.nome).split(/[\s(,]/)[0]}${/^\d/.test(String(per.idade ?? '')) && String(per.idade).length <= 10 ? `, ${per.idade}` : ''}`, kicker: 'Público', section: 'diagnostico',
    body: `<div class="cols2"><div class="card">${icon('pessoas')}<h3>O que tira o sono</h3>${bullets(strs(per.dores), 3, 10)}</div><div class="card soft">${icon('fala')}<h3>O que faz desistir</h3>${bullets(strs(per.objecoes).length ? strs(per.objecoes) : strs(per.desejos), 3, 10)}</div></div>`,
    details: { title: 'Persona e cliente ideal', items: [{ k: 'Quem é', v: per.quem_e }, ...strs(per.desejos).map((t) => ({ k: 'Desejo', v: t })), { k: 'Cliente ideal', v: d.publico?.icp ?? '' }].filter((x) => x.v) } })
  const jor = arr(d.publico?.jornada)
  if (jor.length) add({ title: 'A jornada de compra', kicker: 'Público', section: 'diagnostico', body: `<ol class="journey">${jor.slice(0, 5).map((j, i) => `<li style="--c:${SERIES[i % SERIES.length]}"><span class="num">${i + 1}</span><b class="clamp-2">${esc(words(stage(j.etapa), 4))}</b><p class="clamp-3">${esc(words(j.o_que_fazer, 12))}</p></li>`).join('')}</ol>`,
    details: { title: 'Jornada', items: jor.map((j) => ({ k: j.etapa, v: `Hoje: ${j.o_que_acontece} · Fazer: ${j.o_que_fazer}` })) } })
  if (d.proposta_valor?.equacao || strs(d.proposta_valor?.diferenciais).length) add({ title: 'Por que comprar de você', kicker: 'Proposta de valor', section: 'diagnostico',
    body: `${d.proposta_valor?.equacao ? `<p class="callout">${esc(words(d.proposta_valor.equacao, 22))}</p>` : ''}${bullets(strs(d.proposta_valor?.diferenciais), 3, 12)}`,
    details: d.proposta_valor?.texto ? { title: 'Proposta de valor', items: [{ v: d.proposta_valor.texto }] } : undefined })

  // 6. Oportunidades e testes
  const ops = arr(intel.oportunidades)
  if (ops.length) add({ title: 'Oportunidades com maior retorno', kicker: 'Oportunidades', section: 'inteligencia',
    body: `<div class="grid ${land ? 'g4' : 'g2'}">${ops.slice(0, 4).map((x, i) => `<div class="card op" style="--c:${SERIES[i % SERIES.length]}">${icon('moeda')}<h3 class="clamp-3">${esc(words(x.titulo, 10))}</h3><p class="clamp-3">${esc(words(String(x.estimativa ?? '').replace(/^estimativa:\s*/i, ''), 14))}</p><p class="tags"><span>Impacto ${esc(LEVEL[x.impacto] ?? x.impacto)}</span><span>Esforço ${esc(LEVEL[x.esforco] ?? x.esforco)}</span></p></div>`).join('')}</div>`,
    details: { title: 'Como fazer', items: ops.map((x) => ({ k: x.titulo, v: `${x.como} · Estimativa: ${x.estimativa}` })) } })
  const hip = arr(intel.hipoteses)
  if (hip.length) add({ title: 'O que vamos testar primeiro', kicker: 'Hipóteses', section: 'inteligencia',
    body: `<ol class="steps">${hip.slice(0, 3).map((x, i) => `<li><span class="num">${i + 1}</span><span><b class="clamp-2">${esc(words(x.hipotese, 16))}</b><small class="clamp-1">Sinal: ${esc(words(x.sinal, 12))}</small></span></li>`).join('')}</ol>`,
    details: { title: 'Como testar', items: hip.map((x) => ({ k: x.hipotese, v: `Teste: ${x.como_testar} · Sinal de sucesso: ${x.sinal}` })) } })

  // 7. Internos (só na tela da equipe)
  arr(intel.decisoes_peformake).forEach((x, i, all) => add({ internal: true, decision: i, title: words(x.decisao, 14), kicker: `Decisão para a Peformake ${i + 1}/${all.length} · interno`, section: 'inteligencia',
    body: `<div class="grid ${land ? 'g3' : 'stack'}">${arr(x.opcoes).slice(0, 3).map((op) => `<div class="card"><h3 class="clamp-2">${esc(words(op.opcao, 10))}</h3><p class="pro clamp-2">+ ${esc(words(op.pros, 12))}</p><p class="con clamp-2">− ${esc(words(op.contras, 12))}</p></div>`).join('')}</div><p class="callout"><b>Recomendação:</b> ${esc(words(x.recomendacao, 18))}</p>`,
    details: { title: 'Por quê', items: [{ v: x.porque }, ...arr(x.opcoes).map((op) => ({ k: op.opcao, v: `Prós: ${op.pros} · Contras: ${op.contras}` }))] } }))
  const probs = arr(intel.problemas_internos)
  if (probs.length) add({ internal: true, title: `${probs.length} ${probs.length === 1 ? 'problema interno' : 'problemas internos'} para resolver`, kicker: 'Interno · só a equipe vê', section: 'inteligencia',
    body: `<ul class="rows">${probs.slice(0, 6).map((x) => `<li><b>${esc(x.problema)}</b><span>${esc(x.como_resolver)}</span></li>`).join('')}</ul>`,
    details: { title: 'Problemas internos', items: probs.map((x) => ({ k: `${x.problema} (${x.area ?? 'geral'})`, v: String(x.como_resolver ?? '') })) } })
  if (intel.red_flags?.alertas?.length) add({ internal: true, title: `Alertas para a Peformake: ${({ verde: 'cliente saudável', amarelo: 'atenção', vermelho: 'risco alto' } as Record<string, string>)[intel.red_flags.veredicto] ?? ''}`, kicker: 'Interno', section: 'inteligencia', body: bullets(strs(intel.red_flags.alertas), 4, 14) })
  if (arr(doc.confirmar).length) add({ internal: true, title: 'Só confirmar com o cliente', kicker: 'Interno', section: 'do_cliente', body: `<ul class="rows">${arr(doc.confirmar).slice(0, 6).map((x) => `<li><b>${esc(words(x.item, 5))}</b><span class="clamp-1">${esc(words(x.encontrado, 14))}</span></li>`).join('')}</ul>` })

  // 8. Comunicação
  if (c.essencia) add({ kind: 'statement', kicker: 'Sugestão de comunicação', section: 'comunicacao', body: `<p class="big">${esc(words(c.essencia, 22))}</p>${c.arquetipo ? `<p class="lead">Arquétipo: <b>${esc(words(c.arquetipo, 8))}</b></p>` : ''}`,
    details: { title: 'Essência e propósito', items: [{ k: 'Propósito', v: c.proposito }, { k: 'Arquétipo', v: c.arquetipo }, { k: 'Papel da Peformake', v: c.papel_peformake }].filter((x) => x.v) } })
  const tom = arr(c.tom)
  if (tom.length) add({ title: 'Tom de voz', kicker: 'Sugestão de comunicação', section: 'comunicacao', body: `<div class="grid ${land ? 'g4' : 'g2'}">${tom.slice(0, 4).map((t, i) => `<div class="card"><h3 class="hl" style="--c:${SERIES[i % SERIES.length]}">${esc(words(t.adjetivo, 3))}</h3><p class="quote clamp-4">“${esc(words(t.exemplo, 20))}”</p></div>`).join('')}</div>` })
  if (strs(c.evitar).length || c.regra_teste) add({ title: 'O que a marca não faz', kicker: 'Sugestão de comunicação', section: 'comunicacao', body: `<div class="cols2"><div class="card">${icon('alerta')}${bullets(strs(c.evitar), 4, 10)}</div>${c.regra_teste ? `<div class="card accent"><p class="up">Regra-teste</p><p class="big2">${esc(words(c.regra_teste, 20))}</p></div>` : ''}</div>`,
    details: c.expressao ? { title: 'Expressão da marca', items: [{ k: 'Paleta', v: c.expressao.paleta }, { k: 'Ambiente', v: c.expressao.ambiente }, { k: 'Presença', v: c.expressao.presenca }].filter((x) => x.v) } : undefined })
  const pil = arr(c.pilares)
  if (pil.length) add({ title: 'Pilares de conteúdo', kicker: 'Sugestão de comunicação', section: 'comunicacao', body: `<div class="grid ${land ? (pil.length > 4 ? 'g3' : 'g4') : 'g2'}">${pil.slice(0, land ? 6 : 4).map((x, i) => `<div class="card"><h3 class="hl clamp-2" style="--c:${SERIES[i % SERIES.length]}">${esc(words(x.nome, 5))}</h3><p class="clamp-3">${esc(words(x.descricao, 14))}</p></div>`).join('')}</div>` })
  const exp = arr(doc.experiencia)
  if (exp.length) add({ title: 'Experiência fora do digital', kicker: 'Experiência do cliente', section: 'comunicacao', body: `<div class="grid ${land ? 'g4' : 'g2'}">${exp.slice(0, 4).map((m) => `<div class="card"><h3>${esc(m.momento)}</h3><p class="clamp-4">${esc(words(strs(m.acoes)[0] ?? m.como_deve_ser, 14))}</p></div>`).join('')}</div>`,
    details: { title: 'Experiência do cliente', items: exp.map((m) => ({ k: m.momento, v: `Hoje: ${m.hoje} · Como deve ser: ${m.como_deve_ser} · Ações: ${strs(m.acoes).join('; ')}` })) } })

  // 9. Plano
  const fases = arr(p.fases)
  if (fases.length) add({ title: 'O plano dos próximos 90 dias', kicker: 'Plano de ação', section: 'plano', body: `${p.prioridade ? `<p class="callout clamp-2">${esc(words(p.prioridade, 20))}</p>` : ''}<div class="chart-wide">${timelineSvg(fases)}</div><div class="grid g3">${fases.map((f, i) => `<div class="card" style="border-top:0.5cqw solid ${SERIES[i % SERIES.length]}"><h3>${esc(f.periodo)}</h3><p class="clamp-3">${esc(words(f.objetivo, 12))}</p></div>`).join('')}</div>` })
  fases.forEach((f, fi) => {
    const steps = arr(f.passos)
    if (!steps.length) return
    const head = String(f.objetivo ?? '').split(/[:.]/)[0]!.trim()
    add({ title: head && head.split(/\s+/).length <= 7 ? `${f.periodo}: ${head.charAt(0).toLowerCase()}${head.slice(1)}` : `Os primeiros passos: ${f.periodo}`, kicker: `Plano de ação · fase ${fi + 1} de ${fases.length}`, section: 'plano',
      body: `<ol class="steps">${steps.slice(0, 4).map((s, i) => `<li><span class="num" style="background:${SERIES[fi % SERIES.length]};color:${onColor(SERIES[fi % SERIES.length]!)}">${i + 1}</span><span><b class="clamp-2">${esc(words(s.acao, 12))}</b><span class="tags"><span class="acc">${esc(WHO[s.quem] ?? s.quem)}</span><span>${esc(EFFORT[s.esforco] ?? s.esforco)}</span><span>${esc(s.area)}</span></span></span></li>`).join('')}</ol>`,
      details: { title: `Como fazer · ${f.periodo}`, items: steps.map((s) => ({ k: s.acao, v: `${s.como} (${WHO[s.quem] ?? s.quem}, esforço ${EFFORT[s.esforco] ?? s.esforco})` })) } })
  })
  const ind = arr(p.indicadores)
  if (ind.length) add({ title: 'Números que vamos acompanhar', kicker: 'Plano de ação', section: 'plano', body: `<div class="grid ${land ? 'g4' : 'g2'}">${ind.slice(0, 4).map((n, i) => `<div class="card ind" style="--c:${SERIES[i % SERIES.length]}">${icon('grafico')}<h3 class="clamp-3">${esc(words(n.nome, 8))}</h3><p class="clamp-3">Meta: ${esc(words(n.meta, 12))}</p></div>`).join('')}</div>`,
    details: { title: 'Como medir', items: ind.map((n) => ({ k: n.nome, v: `Meta: ${n.meta} · ${n.como_medir}` })) } })

  // 10. Riscos (1 slide: matriz) e perguntas (1 slide, máx. 7)
  const ord = { alto: 0, medio: 1, baixo: 2 } as Record<string, number>
  const risks = arr(doc.riscos).sort((a, b) => (ord[a.impacto] ?? 3) - (ord[b.impacto] ?? 3) || (ord[a.probabilidade] ?? 3) - (ord[b.probabilidade] ?? 3)).slice(0, 5)
  if (risks.length) add({ title: 'Riscos para ficar de olho', kicker: 'Riscos', section: 'riscos',
    body: `<div class="split-r"><div class="chart">${riskMatrixSvg(risks)}</div><ol class="legend">${risks.map((x, i) => `<li><span class="num">${i + 1}</span><span class="clamp-2">${esc(words(x.risco, 10))}</span></li>`).join('')}</ol></div>`,
    details: { title: 'Como evitar', items: risks.map((x) => ({ k: x.risco, v: `Probabilidade ${LEVEL[x.probabilidade] ?? '–'}, impacto ${LEVEL[x.impacto] ?? '–'}. ${x.como_evitar}` })) } })
  const qs = (input.questions ?? []).filter((q) => q.question?.trim()).slice(0, 7)
  if (qs.length) add({ title: qs.length > 2 ? `${qs.length} perguntas que mudam o plano` : 'O que precisamos de você', kicker: 'Próximos passos', section: 'do_cliente',
    body: `<ol class="qs">${qs.map((q, k) => `<li><span class="num">${k + 1}</span><div><b class="clamp-2">${esc(words(q.question, 16))}</b>${q.answer ? `<p class="ans clamp-1">✓ ${esc(words(q.answer, 14))}</p>` : ''}</div></li>`).join('')}</ol>`,
    details: { title: 'Por que perguntamos', items: qs.map((q) => ({ k: q.question, v: q.why ?? '' })) } })

  add({ kind: 'cover', section: 'resumo', body: `${brand}<div class="cover-mid"><p class="kicker">Próximo passo</p><h1>${r.primeiro_passo && String(r.primeiro_passo).split(/\s+/).length <= 10 ? esc(r.primeiro_passo) : 'Começar esta semana'}</h1>${r.primeiro_passo && String(r.primeiro_passo).split(/\s+/).length > 10 ? `<p class="lead">${esc(words(r.primeiro_passo, 26))}</p>` : ''}</div><p class="cover-foot"><span>Peformake · assessoria de marketing</span></p>` })
  return out
}

export function deckCss(o: Orientation, brand: DeckBrand = 'peformake'): string {
  const land = o === 'paisagem'
  // Escala por orientação: no retrato o slide é mais estreito, então as letras ocupam mais da largura.
  const k = land ? 1 : 1.5
  const f = (n: number) => `calc(${(n * k).toFixed(2)}cqw * var(--z, 1))`
  // Tema único (deckTheme.ts): o mesmo desenho em todas as apresentações; o audiovisual troca para a Ellcazo por cima.
  return `@import url('${DECK_FONT_HREF}');${peformakeCss(f, land, k)}${brand === 'ellcazo' ? ellcazoCss(f, land) : ''}`
}

/**
 * Identidade Ellcazo (tudo do audiovisual): plano tático de conteúdo. Fundo verde-limão e branco intercalados (preto só nos detalhes),
 * tipografia grande e pesada, cartões com borda preta e sombra deslocada, poucos elementos por página.
 */
function ellcazoCss(f: (n: number) => string, land: boolean): string {
  const k = land ? 1 : 1.5
  // Cabeçalho, rodapé e capa com tamanho fixo (não crescem nem encolhem com o conteúdo).
  const fx = (n: number) => `${(n * k).toFixed(3)}cqw`
  const bd = `${f(0.22)} solid #121410`
  const sh = `${f(0.6)} ${f(0.6)} 0 #121410`
  const cols = (n: number) => (land ? `repeat(${n},minmax(0,1fr))` : '1fr')
  return `
  .pfd{--ink:#121410;--muted:#4A5040;--acc:#121410;--fill:#B5E61D;--deep:#121410;--soft:#F1F8DA;--line:#121410;--canvas:#F4F5EC}
  .pfd .slide{background:#FFFFFF} .pfd .slide.alt{background:var(--fill)}
  .pfd .slide.alt :is(.kick,.pill,.card.lime,.quote,.rule){background:#FFFFFF}
  .pfd .slide>.in{padding:${land ? '5cqw 6.5cqw 6cqw' : '9cqw 8cqw 12cqw'}}
  .pfd .head{margin-bottom:${fx(2)}}
  .pfd .kick,.pfd .pill{display:inline-flex;align-self:flex-start;align-items:center;gap:0;background:var(--fill);color:#121410;border:${bd};box-shadow:${fx(0.4)} ${fx(0.4)} 0 #121410;border-radius:999px;padding:${fx(0.45)} ${fx(1.4)};font-weight:850;text-transform:uppercase;letter-spacing:.09em;font-size:${fx(1.15)};line-height:1.2}
  .pfd .kick:before{display:none}
  .pfd h2{font-size:${fx(4.1)};font-weight:900;letter-spacing:-.035em;line-height:1.04;margin-top:${fx(1.6)}}
  .pfd .content{gap:${f(2)};padding-top:${f(0.4)}}
  .pfd .lead{font-size:${f(1.85)};color:var(--muted);line-height:1.35}
  .pfd .foot{bottom:${land ? '2.4cqw' : '4cqw'};align-items:center;color:#3B4034;font-size:${fx(1.2)}}
  .pfd .foot{display:flex;justify-content:space-between} .pfd .foot b:before{display:none} .pfd .foot .flogo{background:none;-webkit-mask:none;mask:none;width:auto;height:auto;display:inline-flex;align-items:center;gap:${fx(0.6)}} .pfd .foot .flogo svg{height:${fx(2.6)};width:auto}
  .pfd .foot .flogo b{font-weight:900;font-size:${fx(1.5)};letter-spacing:-.02em;color:#121410}
  .pfd .card{background:#FDFDF8;border:${bd};box-shadow:${sh};border-radius:${f(1.6)};padding:${f(2.1)} ${f(2.3)};gap:${f(0.9)};overflow:visible;margin:0 ${f(0.6)} ${f(0.6)} 0}
  .pfd .card.lime{background:var(--fill)} .pfd .card.dark{background:#121410;color:#F4F5EC}
  .pfd .card h3{font-size:${f(2.25)};font-weight:900;letter-spacing:-.02em;line-height:1.12;display:flex;align-items:center;gap:${f(0.7)}}
  .pfd .card h3 .ic{width:${f(2.4)};height:${f(2.4)};flex:none}
  .pfd .card p{font-size:${f(1.7)};line-height:1.42;color:#23271E}
  .pfd .card.lime p,.pfd .card.lime li{color:#121410}
  .pfd .bul li:before{background:#121410;width:${f(0.55)};height:${f(0.55)};top:.55em}
  .pfd .card .bul li{font-size:${f(1.7)};line-height:1.35}
  .pfd .g2{grid-template-columns:${cols(2)}} .pfd .g3{grid-template-columns:${cols(3)}} .pfd .g4{grid-template-columns:${land ? 'repeat(4,minmax(0,1fr))' : 'repeat(2,minmax(0,1fr))'}}
  .pfd .grid{gap:${f(2)}}
  .pfd .box{background:#FDFDF8;border:${bd};border-radius:${f(1)};padding:${f(1)} ${f(1.4)};font-weight:800;font-size:${f(1.6)};line-height:1.35;color:#121410;margin-top:${f(0.4)}}
  .pfd .quote{background:var(--fill);border:${bd};border-radius:${f(1)};padding:${f(1)} ${f(1.3)};font-style:italic;font-size:${f(1.55)};line-height:1.4;color:#121410;margin-top:auto}
  .pfd .strip{align-self:flex-start;background:#121410;color:#F4F5EC;border-radius:${f(1)};padding:${f(1)} ${f(1.8)};font-weight:850;font-size:${f(1.7)};line-height:1.3}
  .pfd .chips{display:flex;flex-wrap:wrap;align-items:center;gap:${f(0.8)} ${f(1)};font-size:${f(1.5)}} .pfd .chips>b{font-weight:900;font-size:${f(1.7)}}
  .pfd .chips span{border:${bd};border-radius:999px;padding:${f(0.4)} ${f(1.2)};font-weight:750;background:#FDFDF8}
  .pfd .sw2{display:grid;grid-template-columns:1fr 1fr;gap:${f(1)} ${f(1.4)};margin-top:${f(0.6)}} .pfd .sw2 span{display:flex;align-items:center;gap:${f(0.8)};font-weight:800;font-size:${f(1.4)};line-height:1.15}
  .pfd .sw2 i{flex:none;width:${f(3.2)};height:${f(3.2)};border:${bd};border-radius:${f(0.7)};background:var(--c)}
  .pfd .rule{display:flex;align-items:center;background:var(--fill);border:${bd};box-shadow:${sh};border-radius:${f(1.6)};padding:${f(3)};font-size:${f(3.4)};font-weight:900;line-height:1.12;letter-spacing:-.025em}
  .pfd .split{display:grid;grid-template-columns:${land ? '0.9fr 1.6fr' : '1fr'};gap:${f(2.4)};align-items:stretch}
  .pfd .rows{gap:${f(1)}} .pfd .rows li{display:grid;grid-template-columns:${land ? `${f(16)} 1fr` : '1fr'};gap:${f(0.4)} ${f(1.4)};align-items:center;background:#FDFDF8;border:${bd};box-shadow:${f(0.4)} ${f(0.4)} 0 #121410;border-radius:${f(1)};padding:${f(0.9)} ${f(1.6)};font-size:${f(1.6)};margin:0 ${f(0.4)} ${f(0.4)} 0}
  .pfd .rows li b{font-weight:900}
  .pfd .cal{list-style:none;display:flex;flex-direction:column;gap:${f(0.9)}}
  .pfd .cal li{display:grid;grid-template-columns:${land ? `${f(11)} ${f(19)} 1fr auto` : `${f(10)} 1fr auto`};gap:${f(1.4)};align-items:center;background:#FDFDF8;border:${bd};box-shadow:${f(0.4)} ${f(0.4)} 0 #121410;border-radius:${f(1)};padding:${f(0.85)} ${f(1.6)};font-size:${f(1.6)};line-height:1.25;margin:0 ${f(0.4)} ${f(0.4)} 0}
  .pfd .cal li b{font-weight:900} .pfd .cal li .r{font-weight:900;font-size:${f(1.35)};white-space:nowrap} ${land ? '' : '.pfd .cal li .pl{display:none}'}
  .pfd .cal li.hot{background:#121410;color:#F4F5EC;box-shadow:${f(0.4)} ${f(0.4)} 0 var(--fill)} .pfd .cal li.hot b{color:var(--fill)} .pfd .cal li.hot .r{color:var(--fill)}
  .pfd .pil .n{font-size:${f(5.2)};font-weight:900;line-height:.9;letter-spacing:-.04em} .pfd .pil .u{font-size:${f(1.15)};font-weight:850;letter-spacing:.1em;text-transform:uppercase}
  .pfd .pil .d{font-weight:850;font-size:${f(1.55)}}
  .pfd .card .up{font-size:${f(1.15)};font-weight:850;letter-spacing:.1em;text-transform:uppercase;opacity:1}
  .pfd .cover{background:var(--fill);color:#121410} .pfd .cover:after,.pfd .cover:before{display:none} .pfd .cover>.in{justify-content:space-between;padding:${land ? '5.5cqw 6.5cqw' : '10cqw 8cqw'}}
  .pfd .cover .tc-top{display:flex;align-items:center;gap:${fx(1.2)}} .pfd .cover .tc-top svg{height:${fx(6)};width:auto}
  .pfd .cover .tc-top b{display:block;font-size:${fx(3)};font-weight:900;letter-spacing:-.03em;line-height:1} .pfd .cover .tc-top small{display:block;font-size:${fx(1.1)};font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-top:${fx(0.4)}}
  .pfd .cover h1{font-size:${fx(10)};font-weight:900;letter-spacing:-.045em;line-height:.98;color:#F4F5EC;-webkit-text-stroke:${fx(0.3)} #121410;paint-order:stroke fill;text-shadow:${fx(0.7)} ${fx(0.7)} 0 #121410;max-width:none;margin:0}
  .pfd .cover .tc-t{font-size:${fx(3.6)};font-weight:900;letter-spacing:-.03em;margin-top:${fx(2)};line-height:1.05} .pfd .cover .tc-s{font-size:${fx(1.8)};font-weight:650;margin-top:${fx(1.4)};max-width:80cqw}
  .pfd .cover .pill{background:#F4F5EC;font-size:${fx(1.4)};padding:${fx(0.7)} ${fx(1.8)}}
  .pfd .statement,.pfd .statement.alt{background:var(--fill);color:#121410} .pfd .statement>.in{justify-content:flex-start} .pfd .statement .foot{display:none}
  .pfd .statement .kick{background:#FFFFFF}
  .pfd .statement .content{flex:1;justify-content:center;gap:${fx(1.4)}} .pfd .go{font-size:${fx(8)};font-weight:900;letter-spacing:-.045em;line-height:1;color:#121410}
  .pfd .go-sub{font-size:${fx(1.9)};font-style:italic;text-transform:uppercase;letter-spacing:.02em;max-width:${land ? '74cqw' : '84cqw'};line-height:1.35}
  .pfd .go-foot{position:absolute;left:${land ? '6.5cqw' : '8cqw'};right:${land ? '6.5cqw' : '8cqw'};bottom:${land ? '4.5cqw' : '8cqw'};display:flex;justify-content:space-between;align-items:flex-end;font-size:${fx(1.8)}}
  .pfd .go-foot .lg{display:flex;align-items:center;gap:${fx(1)}} .pfd .go-foot svg{height:${fx(6)};width:auto} .pfd .go-foot b{font-size:${fx(4.4)};font-weight:900;letter-spacing:-.04em;color:#121410}
  .pfd .ref{flex:1;min-height:0;display:grid;grid-template-columns:${land ? `${f(19)} 1fr` : '1fr'};gap:${f(2.6)};align-items:start}
  .pfd .ref-m{display:flex;flex-direction:column;gap:${f(1.3)};min-width:0} .pfd .ref-m h2{margin-top:${f(0.4)}}
  .pfd .vt{position:relative;display:block;width:${land ? '100%' : `${f(18)}`};aspect-ratio:9/16;${land ? '' : 'max-height:58cqw;'}border:${bd};box-shadow:${sh};border-radius:${f(1.8)};overflow:hidden;background:#FFFFFF;color:#121410;text-decoration:none}
  .pfd .vt iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .pfd .vt img.th{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0} .pfd .vt.has img.th,.pfd .vt img.th.on{opacity:1}
  .pfd .vt .ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${f(1.2)};padding:${f(1.6)};text-align:center}
  .pfd .vt.has .ph{display:none} .pfd .vt .ph b{font-size:${f(2.2)};font-weight:900;color:#121410} .pfd .vt .ph .qr{width:70%;height:auto;border-radius:${f(0.6)}} .pfd .vt .ph .pl-ic{width:${f(4.4)};height:${f(4.4)};color:#121410}
  .pfd .vt .go-btn{position:absolute;left:${f(1.2)};right:${f(1.2)};bottom:${f(1.4)};display:flex;justify-content:center;background:var(--fill);color:#121410;border:${bd};box-shadow:${f(0.35)} ${f(0.35)} 0 #121410;border-radius:999px;padding:${f(0.6)} ${f(0.6)};font-weight:900;font-size:${f(1.15)};text-decoration:underline;white-space:nowrap}
  .pfd .vt.live{background:#000} .pfd .vlink{display:block;margin-top:${f(1)};font-size:${f(1.2)};color:#3B4034;font-weight:700;text-align:center}
  .pfd .vars{display:grid;grid-template-columns:${cols(3)};gap:${f(1.2)}} .pfd .vars li{list-style:none;display:flex;gap:${f(0.8)};align-items:flex-start;background:#FDFDF8;border:${bd};border-radius:${f(1)};padding:${f(0.9)} ${f(1.1)};font-size:${f(1.45)};line-height:1.3;font-weight:650}
  .pfd .vars li .num{flex:none;width:${f(2.4)};height:${f(2.4)};font-size:${f(1.2)};background:#121410;color:var(--fill);border-radius:50%;display:inline-grid;place-items:center;font-weight:900}
  .pfd .vh{font-size:${f(1.15)};font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:${f(-0.4)}}
  .pfd .dose{align-self:flex-start;display:flex;gap:${f(0.8)};align-items:baseline;flex-wrap:wrap;background:#121410;color:#F4F5EC;border-radius:${f(1)};padding:${f(0.8)} ${f(1.5)};font-size:${f(1.45)};line-height:1.35} .pfd .dose b{color:var(--fill);font-weight:900}
  .pfd .paras{list-style:none;display:grid;grid-template-columns:${land ? 'var(--pc,1fr)' : '1fr'};gap:${f(1.1)} ${f(2.2)}}
  .pfd .paras li{display:grid;grid-template-columns:${f(3)} 1fr;gap:${f(1.2)};align-items:start;background:#FDFDF8;border:${bd};border-radius:${f(1)};padding:${f(1)} ${f(1.4)}}
  .pfd .paras .num{width:${f(2.8)};height:${f(2.8)};font-size:${f(1.3)};background:var(--fill);color:#121410;border:${bd};font-weight:900}
  .pfd .paras .fala{font-size:${f(1.75)};font-weight:700;line-height:1.35} .pfd .paras .img{font-size:${f(1.35)};color:#4A5040;line-height:1.3;margin-top:${f(0.3)}}
  .pfd .paras .sem{font-size:${f(1.6)};font-weight:650;line-height:1.35} .pfd .paras .tela{display:inline-block;margin-top:${f(0.5)};background:#121410;color:var(--fill);font-weight:800;font-size:${f(1.2)};border-radius:${f(0.5)};padding:${f(0.2)} ${f(0.8)}}
  .pfd .paras.dense .img{display:none} .pfd .paras.dense li{padding:${f(0.7)} ${f(1.2)}} .pfd .rule.long{font-size:${f(2.6)}}
  .pfd .ref .card{padding:${f(1.5)} ${f(1.8)};gap:${f(0.6)}} .pfd .ref .card .bul{gap:${f(0.6)}} .pfd .ref .card .bul li{font-size:${f(1.5)};line-height:1.3} .pfd .ref .card h3{font-size:${f(2)}} .pfd .ref .lead{font-size:${f(1.6)}} .pfd .ref h2{font-size:${f(3.6)}}
  .pfd .end{font-size:${f(1.55)};line-height:1.35} .pfd .end b{font-weight:900}
  `
}

/**
 * Ajusta cada slide ao espaço: começa com as letras maiores (até 1,4×, para a página não ficar vazia)
 * e diminui a escala do slide (--z) até tudo caber. Roda na tela, no modo apresentação e antes do PDF.
 * Função autocontida (vai como texto para a aba nova).
 */
export function fitSlides(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('.slide').forEach((s) => {
    let z = s.classList.contains('cover') ? 1 : 1.4
    s.style.setProperty('--z', String(z))
    const over = () => {
      const c = (s.querySelector('.content') ?? s.querySelector('.in')) as HTMLElement | null
      if (!c) return false
      if (c.scrollHeight > c.clientHeight + 2) return true
      let bad = false
      // Cards e caixas: nada pode passar da borda. Títulos: só a largura (a altura das letras sempre passa um pouco).
      s.querySelectorAll<HTMLElement>('.card, .sw, .kpi, .journey li').forEach((e) => { if (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2) bad = true })
      s.querySelectorAll<HTMLElement>('h1, h2, h3, .big').forEach((e) => { if (e.scrollWidth > e.clientWidth + 2) bad = true })
      const inner = s.querySelector<HTMLElement>('.in')
      const foot = s.querySelector<HTMLElement>('.foot')
      const last = (s.querySelector('.content') ?? s.querySelector('.cover-mid'))?.lastElementChild
      if (inner && last && foot && foot.getClientRects().length && last.getBoundingClientRect().bottom > foot.getBoundingClientRect().top + 2) bad = true
      return bad
    }
    while (over() && z > 0.55) { z = Math.round((z - 0.05) * 100) / 100; s.style.setProperty('--z', String(z)) }
  })
}

/** Um slide em HTML (sem <html>). */
export function slideHtml(s: Slide, i: number, total: number, name: string, brand: DeckBrand = 'peformake', label?: string): string {
  // `alt`: páginas intercaladas (na Ellcazo, fundo verde-limão e branco alternados).
  const cls = ['slide', s.kind === 'cover' ? 'cover' : s.kind === 'statement' ? 'statement' : '', s.internal ? 'internal' : '', i % 2 ? 'alt' : ''].filter(Boolean).join(' ')
  const head = !s.bare && (s.title || (s.kicker && s.kind !== 'cover')) ? `<div class="head">${s.kicker ? `<p class="kick">${esc(s.kicker)}</p>` : ''}${s.title ? `<h2>${esc(s.title)}</h2>` : ''}</div>` : ''
  const foot = s.kind === 'cover' ? ''
    : brand === 'ellcazo' ? `<div class="foot"><span class="flogo">${ellcazoSvg('#121410', 30)}<b>Ellcazo</b></span><span>${esc(name)} • ${esc(label ?? 'Plano tático de conteúdo')}</span></div>`
      : `<div class="foot"><span class="fl"><i class="flogo"></i><b>${BRAND_NAME[brand]}</b> assessoria</span><span class="fc">${esc(label ? `${name} · ${label}` : name)}</span><span class="pn">${i + 1}${total > 1 ? ` <small>/ ${total}</small>` : ''}</span></div>`
  return `<section class="${cls}" aria-label="Slide ${i + 1} de ${total}"><div class="in">${s.kind === 'cover' ? s.body : `${head}<div class="content">${s.body}</div>`}${foot}</div></section>`
}

/** Slides em HTML (para o PDF, o link público e o portal: nunca os internos). */
export function deckSlidesHtml(input: DeckInput, o: Orientation): string {
  const list = buildSlides(input, o)
  return list.map((s, i) => slideHtml(s, i, list.length, input.name, input.brand, input.title)).join('')
}

export function deckSlideCount(input: DeckInput, o: Orientation): number { return buildSlides(input, o).length }

/** Documento completo para imprimir/salvar em PDF: uma página por slide, no tamanho certo. */
export function deckHtml(input: DeckInput, o: Orientation): string {
  const page = o === 'paisagem' ? '338.67mm 190.5mm' : '210mm 297mm'
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(input.title ?? 'Diagnóstico')} · ${esc(input.name)}</title>
${DECK_FONT_LINK}
<style>@page{size:${page};margin:0}html,body{margin:0;background:${CHROME[input.brand ?? 'peformake'].paper}}body{padding:16px;display:flex;flex-direction:column;gap:16px;align-items:center}
.pfd{width:min(100%,${o === 'paisagem' ? '1100px' : '760px'})} .pfd .slide{box-shadow:0 2px 14px rgba(0,0,0,.18);margin-bottom:16px}
@media print{html,body{background:#fff;padding:0;gap:0}.pfd{width:${o === 'paisagem' ? '338.67mm' : '210mm'}}.pfd .slide{width:${o === 'paisagem' ? '338.67mm' : '210mm'};height:${o === 'paisagem' ? '190.5mm' : '297mm'};aspect-ratio:auto;box-shadow:none;margin:0}}
${deckCss(o, input.brand)}</style></head><body><div class="pfd">${deckSlidesHtml(input, o)}</div>
<script>var pfFit=${fitSlides.toString()};function run(){pfFit(document)}(document.fonts?document.fonts.ready:Promise.resolve()).then(run);window.addEventListener('beforeprint',run)</script></body></html>`
}

/**
 * Modo apresentação: aba só com os slides, um por vez, tela cheia, setas/teclado/arrastar.
 * Vale para a equipe (antes de enviar) e para o link público do cliente.
 */
/** Texto dos detalhes no modo apresentação: sem links soltos nem "(Fonte: ...)" no meio da frase (os links viram "fonte"). */
export function presentClean(v: unknown): string {
  return String(v ?? '').replace(/\s*\((?:fontes?)\s*:[^)]*\)/gi, '').replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').replace(/[.,;]\s*,?\s*(?:e\s*)?$/, '.').replace(/\.,/g, '.').trim()
}
export function presentUrls(it: { v: unknown; u?: string }): string[] {
  const a: string[] = [...(String(it.v ?? '').match(/https?:\/\/[^\s),]+/g) ?? [])]
  if (it.u && /^https?:/.test(it.u)) a.unshift(it.u)
  return a.filter((u, k) => a.indexOf(u) === k).slice(0, 3)
}

export function presentHtml(input: DeckInput, o: Orientation): string {
  // As duas orientações vão juntas: "Vertical/Horizontal" troca na hora; "Girar" vira a tela (celular deitado na TV/notebook);
  // "?" abre os detalhes do slide; ✕ fecha (ou volta). Vertical ocupa a tela toda; troca de slide animada.
  const stage = (k: Orientation) => {
    const id = k === 'paisagem' ? 'sp' : 'sv'
    const list = buildSlides(input, k, { live: true })
    const css = deckCss(k, input.brand).replace(/\.pfd/g, `#${id} .pfd`)
    const size = k === 'paisagem'
      ? `#${id} .pfd{width:min(calc(var(--vw) - 24px),calc((var(--vh) - 88px) * ${(16 / 9).toFixed(4)}))}`
      // Vertical em tela cheia: o slide fica da altura da tela (o conteúdo se ajusta com fitSlides).
      : `#${id}{padding-top:max(58px,env(safe-area-inset-top))} #${id} .pfd{width:min(calc(var(--vw) - 16px),640px)} #${id} .pfd .slide{aspect-ratio:auto;height:min(calc(var(--vh) - 130px),calc((var(--vw) - 16px) * 2.1))} #${id} .pfd .slide:not(.cover)>.in>.content{justify-content:center}`
    const details = list.map((x) => (x.details?.items.length ? { t: x.details.title, i: x.details.items.map((it) => ({ k: it.k ?? '', v: it.v, u: it.url ?? '' })) } : null))
    return { id, details, css: `${css}\n${size}`, html: `<div class="stage" id="${id}"${k === o ? '' : ' hidden'}><div class="pfd measure">${list.map((x, n) => slideHtml(x, n, list.length, input.name, input.brand, input.title)).join('')}</div></div>` }
  }
  const a = stage('paisagem'), b = stage('vertical')
  const C = CHROME[input.brand ?? 'peformake']
  const det = JSON.stringify({ sp: a.details, sv: b.details }).replace(/</g, '\\u003c')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(input.name)} · ${BRAND_NAME[input.brand ?? 'peformake']}</title>
${DECK_FONT_LINK}
<style>:root{--vw:100vw;--vh:100dvh}html,body{margin:0;height:100%;background:${C.bg};overflow:hidden;font-family:Inter,Geist,system-ui,sans-serif}
.app{position:fixed;left:0;top:0;width:var(--vw);height:var(--vh);transform-origin:0 0}
body.rot .app{transform:translateX(100vw) rotate(90deg)}
.stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top)) 8px 64px;box-sizing:border-box}.stage[hidden]{display:none}
.pfd .slide{display:none;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.45)} .pfd .slide.on{display:block}
.pfd.measure .slide{display:block;position:absolute;visibility:hidden;width:inherit}
@media (prefers-reduced-motion:no-preference){
.pfd .slide.on.in-r{animation:pfIn .45s cubic-bezier(.2,.7,.2,1) both;--dx:36px}.pfd .slide.on.in-l{animation:pfIn .45s cubic-bezier(.2,.7,.2,1) both;--dx:-36px}
@keyframes pfIn{from{opacity:0;transform:translateX(var(--dx))}to{opacity:1;transform:none}}
.pfd .slide.on .content>*,.pfd .slide.on .cover-mid>*,.pfd .slide.on .grid>*,.pfd .slide.on .bul>li,.pfd .slide.on .steps>li,.pfd .slide.on .qs>li,.pfd .slide.on .rows>li,.pfd .slide.on .kpis>*,.pfd .slide.on .journey>li{animation:pfUp .5s cubic-bezier(.2,.7,.2,1) both}
.pfd .slide.on :is(.grid,.bul,.steps,.qs,.rows,.kpis,.journey)>*:nth-child(2){animation-delay:.08s}.pfd .slide.on :is(.grid,.bul,.steps,.qs,.rows,.kpis,.journey)>*:nth-child(3){animation-delay:.16s}
.pfd .slide.on :is(.grid,.bul,.steps,.qs,.rows,.kpis,.journey)>*:nth-child(4){animation-delay:.24s}.pfd .slide.on :is(.grid,.bul,.steps,.qs,.rows,.kpis,.journey)>*:nth-child(n+5){animation-delay:.32s}
.pfd .slide.on .content>*:nth-child(2){animation-delay:.1s}.pfd .slide.on .chart-only svg{animation:pfGrow .7s cubic-bezier(.2,.7,.2,1) both}
@keyframes pfUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes pfGrow{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}}
.bar{position:absolute;left:0;right:0;bottom:max(10px,env(safe-area-inset-bottom));display:flex;justify-content:center;align-items:center;gap:6px;color:${C.mut};font-size:14px}
.bar button{all:unset;cursor:pointer;min-width:42px;height:42px;padding:0 6px;box-sizing:border-box;border-radius:21px;display:grid;place-items:center;background:rgba(255,255,255,.1);color:#fff;font-size:17px}
.bar button.t{font-size:12.5px;font-weight:600;padding:0 11px}.bar button.q{background:${C.acc};color:${C.ink};font-weight:800}.bar button[hidden]{display:none}
.bar button:disabled{opacity:.3;cursor:default} .bar span{min-width:54px;text-align:center;font-variant-numeric:tabular-nums}
.menu{position:absolute;right:50%;transform:translateX(50%);bottom:calc(max(10px,env(safe-area-inset-bottom)) + 52px);display:flex;flex-direction:column;gap:2px;min-width:210px;padding:6px;border-radius:16px;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.4);z-index:15}.menu[hidden]{display:none}
.menu button{all:unset;cursor:pointer;min-height:42px;padding:0 12px;border-radius:10px;color:${C.ink};font-size:14px;font-weight:600;display:flex;align-items:center}.menu button:hover{background:${C.soft}}.menu button[hidden]{display:none}
.close{all:unset;position:absolute;top:max(10px,env(safe-area-inset-top));right:10px;cursor:pointer;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.12);color:#fff;font-size:18px;z-index:20}
.dlg{position:absolute;inset:0;background:rgba(5,25,30,.6);display:none;align-items:center;justify-content:center;padding:16px;z-index:9}.dlg.on{display:flex}
.dlg .box{background:#fff;color:${C.ink};border-radius:18px;max-width:560px;width:100%;max-height:calc(var(--vh) - 32px);display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.dlg header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px 10px;border-bottom:1px solid ${C.line}}.dlg h3{margin:0;font-size:18px}
.dlg header button{all:unset;cursor:pointer;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;border:1.5px solid ${C.ink};font-size:16px}
.dlg .body{padding:12px 18px 6px;font-size:15px;line-height:1.45;overflow:auto}.dlg .it{margin:0 0 10px}.dlg .it b{display:block}.dlg .it a{color:${input.brand === 'ellcazo' ? '#4E6B00' : '#056F84'};font-size:13px;margin-left:4px}
.dlg .pg{display:flex;justify-content:space-between;align-items:center;padding:8px 18px 14px;font-size:13px}.dlg .pg button{all:unset;cursor:pointer;font-weight:600;padding:8px 4px}.dlg .pg button:disabled{opacity:.35;cursor:default}
${a.css}
${b.css}</style></head><body><div class="app">${a.html}${b.html}
<button class="close" id="c" aria-label="Fechar a apresentação">✕</button>
<div class="bar"><button id="p" aria-label="Anterior">‹</button><span id="n"></span><button id="x" aria-label="Próximo">›</button><button id="qq" class="q" aria-label="Detalhes deste slide (Enter)" title="Detalhes deste slide (Enter)" hidden>?</button><button id="mm" aria-label="Mais opções" aria-haspopup="menu" aria-expanded="false">⋯</button></div>
<div class="menu" id="m" role="menu" hidden><button id="q" role="menuitem" hidden>? Detalhes deste slide (Enter)</button><button id="o" role="menuitem"></button><button id="r" role="menuitem">⟳ Girar a tela</button><button id="f" role="menuitem">⛶ Tela cheia</button></div>
<div class="dlg" id="dl" role="dialog" aria-modal="true" aria-labelledby="dt"><div class="box"><header><h3 id="dt"></h3><button id="dc" aria-label="Fechar detalhes">✕</button></header><div class="body" id="db"></div><div class="pg" id="dp"><button id="dpp">‹ Anteriores</button><span id="dpn"></span><button id="dpx">Próximas ›</button></div></div></div></div>
<script>var pfFit=${fitSlides.toString()};var DET=${det};var cur='${o === 'paisagem' ? 'sp' : 'sv'}',i=0,d,S,rot=false,pg=0;
function dims(){var w=innerWidth,h=innerHeight;if(rot){var t=w;w=h;h=t}document.documentElement.style.setProperty('--vw',w+'px');document.documentElement.style.setProperty('--vh',h+'px')}
function use(id){cur=id;['sp','sv'].forEach(function(k){document.getElementById(k).hidden=k!==id});d=document.querySelector('#'+id+' .pfd');S=[].slice.call(d.querySelectorAll('.slide'));document.getElementById('o').textContent=id==='sp'?'▯ Ver na vertical':'▭ Ver na horizontal';fit()}
function show(k,dir){var prev=i;i=Math.max(0,Math.min(S.length-1,k));S.forEach(function(s,j){s.classList.remove('in-r','in-l');s.classList.toggle('on',j===i)});if(dir!==0&&i!==prev){void S[i].offsetWidth;S[i].classList.add(i>prev?'in-r':'in-l')}
document.getElementById('n').textContent=(i+1)+' / '+S.length;document.getElementById('p').disabled=i===0;document.getElementById('x').disabled=i===S.length-1;document.getElementById('q').hidden=document.getElementById('qq').hidden=!(DET[cur]&&DET[cur][i])}
function fit(){dims();d.classList.add('measure');pfFit(d);d.classList.remove('measure');show(i,0)}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var clean=${presentClean.toString()};var urls=${presentUrls.toString()};
function page(){var x=DET[cur][i];if(!x)return;var long=x.i.some(function(it){return clean(it.v).length>220});var per=long?2:4,n=Math.max(1,Math.ceil(x.i.length/per));pg=Math.max(0,Math.min(n-1,pg));document.getElementById('dt').textContent=x.t;
document.getElementById('db').innerHTML=x.i.slice(pg*per,pg*per+per).map(function(it){return '<p class="it">'+(it.k?'<b>'+esc(it.k)+'</b>':'')+esc(clean(it.v))+urls(it).map(function(u,k){return '<a href="'+esc(u)+'" target="_blank" rel="noreferrer">fonte'+(k?' '+(k+1):'')+'</a>'}).join('')+'</p>'}).join('');
document.getElementById('dp').style.display=n>1?'flex':'none';document.getElementById('dpn').textContent=(pg+1)+' de '+n;document.getElementById('dpp').disabled=pg===0;document.getElementById('dpx').disabled=pg>=n-1}
function openD(){pg=0;page();document.getElementById('dl').classList.add('on')}function closeD(){document.getElementById('dl').classList.remove('on')}
(document.fonts?document.fonts.ready:Promise.resolve()).then(function(){use(cur)});window.addEventListener('resize',fit);use(cur);
var M=document.getElementById('m'),MM=document.getElementById('mm');function menu(v){M.hidden=!v;MM.setAttribute('aria-expanded',v?'true':'false')}MM.onclick=function(e){e.stopPropagation();menu(M.hidden)};M.addEventListener('click',function(){menu(false)});addEventListener('click',function(e){if(!M.hidden&&!M.contains(e.target)&&e.target!==MM)menu(false)},true);
document.getElementById('p').onclick=function(){show(i-1)};document.getElementById('x').onclick=function(){show(i+1)};
document.getElementById('o').onclick=function(){use(cur==='sp'?'sv':'sp')};
document.getElementById('r').onclick=function(){rot=!rot;document.body.classList.toggle('rot',rot);if(rot&&cur==='sv')use('sp');else fit()};
document.getElementById('q').onclick=openD;document.getElementById('qq').onclick=openD;document.getElementById('dc').onclick=closeD;document.getElementById('dl').addEventListener('click',function(e){if(e.target.id==='dl')closeD()});
document.getElementById('dpp').onclick=function(){pg--;page()};document.getElementById('dpx').onclick=function(){pg++;page()};
document.getElementById('f').onclick=function(){if(document.fullscreenElement)document.exitFullscreen();else if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen()};
document.getElementById('c').onclick=function(){if(document.fullscreenElement){document.exitFullscreen()}var t=window.top;try{if(t.opener){t.close();return}}catch(e){}try{if(t.history.length>1){t.history.back();return}}catch(e){}try{t.close()}catch(e){}};
addEventListener('keydown',function(e){if(e.key==='Escape'&&!M.hidden){menu(false);return}if(document.getElementById('dl').classList.contains('on')){if(e.key==='Escape')closeD();if(e.key==='ArrowRight'&&!document.getElementById('dpx').disabled){pg++;page()}if(e.key==='ArrowLeft'&&!document.getElementById('dpp').disabled){pg--;page()}return}if(e.key==='Enter'){if(!document.getElementById('q').hidden){e.preventDefault();openD()}return}if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown')show(i+1);if(e.key==='ArrowLeft'||e.key==='PageUp')show(i-1)});
var t0=null;addEventListener('touchstart',function(e){t0=rot?e.touches[0].clientY:e.touches[0].clientX},{passive:true});addEventListener('touchend',function(e){if(t0===null||document.getElementById('dl').classList.contains('on'))return;var v=rot?e.changedTouches[0].clientY:e.changedTouches[0].clientX;var dx=v-t0;t0=null;if(Math.abs(dx)>50)show(dx<0?i+1:i-1)});
['sp','sv'].forEach(function(k){document.querySelector('#'+k+' .pfd').addEventListener('click',function(e){if(e.target.closest('a'))return;var r=d.getBoundingClientRect();var mid=rot?(e.clientY>r.top+r.height/2):(e.clientX>r.left+r.width/2);show(mid?i+1:i-1)})})</script></body></html>`
}

/** Abre o modo apresentação numa aba nova (só os slides do cliente, sem os internos). */
export function openPresentation(input: DeckInput, o: Orientation) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(presentHtml(input, o))
  w.document.close()
}

/** Abre a apresentação numa aba e chama a impressão (salvar como PDF). */
export function printDeck(input: DeckInput, o: Orientation) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(deckHtml(input, o))
  w.document.close()
  const go = () => { w.focus(); w.print() }
  // Espera a fonte e as imagens para não sair o PDF com letra trocada.
  const ready = (w.document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
  if (ready) void ready.then(() => setTimeout(go, 250)); else setTimeout(go, 800)
}
