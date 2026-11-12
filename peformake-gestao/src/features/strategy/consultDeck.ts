// Apresentação do diagnóstico, estilo apresentação de verdade: cada slide tem UMA mensagem (título grande)
// e só uma coisa embaixo: até 4 tópicos curtos, OU um gráfico, OU cards com números grandes. Nada de parágrafo.
// O texto completo fica na tela, atrás de "Ver detalhes" (details), nunca no PDF.
// O mesmo HTML serve para: tela (um slide por vez), PDF (impressão do navegador, @page por orientação), link público e portal.
// Slides "internos" (decisões da Peformake, alertas) só aparecem na tela da equipe; nunca no PDF, link ou portal.
// Medidas em cqw (largura do slide): o slide escala igual na tela e no papel.
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
  slides?: (o: Orientation) => Slide[]
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
export function buildSlides(input: DeckInput, o: Orientation, opts: { internal?: boolean } = {}): Slide[] {
  if (input.slides) return input.slides(o).filter((x) => opts.internal || !x.internal)
  const { doc, name } = input
  const r = doc.resumo ?? {}, d = doc.diagnostico ?? {}, c = doc.comunicacao ?? {}, p = doc.plano ?? {}, intel = doc.inteligencia ?? {}
  const land = o === 'paisagem'
  const out: Slide[] = []
  const add = (s: Slide) => { if (s.internal && !opts.internal) return; out.push(s) }
  const date = new Date(doc.gerado_em ?? input.updatedAt ?? Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const brand = `<div class="cover-top">${input.peformakeLogoUrl ? `<img class="pf-logo" src="${esc(input.peformakeLogoUrl)}" alt="Peformake">` : ''}<span class="brand">Peformake</span></div>`

  add({ kind: 'cover', section: 'resumo', body: `${brand}
    <div class="cover-mid">
      <p class="kicker">Diagnóstico e plano de ação</p>
      <h1>${esc(name)}</h1>
    </div>
    <p class="cover-foot">${esc(date)} · Consultoria Peformake</p>` })

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
    body: `<div class="${land ? 'grid g3' : 'stack'}">${g.map((x) => { const [lab, col] = TIPO[x.tipo] ?? ['Achado', SERIES[0]]; return `<div class="card find" style="--c:${col}"><p class="tag">${esc(lab)}</p><p class="num-big${String(x.numero ?? '').length > 12 ? ' long' : ''} clamp-2">${esc(words(x.numero, 6))}</p><h3 class="clamp-3">${esc(words(x.titulo, 14))}</h3></div>` }).join('')}</div>`,
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

  add({ kind: 'cover', section: 'resumo', body: `${brand}<div class="cover-mid"><p class="kicker">Próximo passo</p><h1>${r.primeiro_passo && String(r.primeiro_passo).split(/\s+/).length <= 10 ? esc(r.primeiro_passo) : 'Começar esta semana'}</h1>${r.primeiro_passo && String(r.primeiro_passo).split(/\s+/).length > 10 ? `<p class="lead">${esc(words(r.primeiro_passo, 26))}</p>` : ''}</div><p class="cover-foot">Peformake · assessoria de marketing</p>` })
  return out
}

export function deckCss(o: Orientation, brand: DeckBrand = 'peformake'): string {
  const land = o === 'paisagem'
  // Escala por orientação: no retrato o slide é mais estreito, então as letras ocupam mais da largura.
  const k = land ? 1 : 1.5
  const f = (n: number) => `calc(${(n * k).toFixed(2)}cqw * var(--z, 1))`
  return `
  .pfd{--ink:#0B3C44;--muted:#5D6C73;--acc:#007A8A;--fill:#1FC8DB;--deep:#056F84;--soft:#E6F6F8;--line:#D9E2E5;--canvas:#F3F7F8;color:var(--ink);font-family:Geist,ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pfd *{box-sizing:border-box;margin:0;padding:0}
  .pfd .slide{container-type:inline-size;position:relative;width:100%;aspect-ratio:${land ? '16 / 9' : '210 / 297'};background:#fff;overflow:hidden;break-after:page;break-inside:avoid;page-break-after:always}
  .pfd .slide>.in{position:absolute;inset:0;display:flex;flex-direction:column;padding:${land ? '5cqw 6cqw 6cqw' : '9cqw 8cqw 11cqw'}}
  .pfd .slide:last-child{break-after:auto;page-break-after:auto}
  .pfd .head{margin-bottom:${f(2.6)}}
  .pfd .kick{color:var(--ink);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:${f(1.2)};display:flex;align-items:center;gap:${f(.9)}} .pfd .kick:before{content:"";flex:none;width:${f(2.4)};height:${f(.55)};border-radius:99px;background:var(--fill)}
  .pfd h2{font-size:${f(3.9)};line-height:1.06;font-weight:800;letter-spacing:-.03em;margin-top:${f(.9)}}
  .pfd .content{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;padding-top:${f(1.2)};gap:${f(2.2)};font-size:${f(2)};line-height:1.38}
  .pfd .content:has(> .chart-only:only-child),.pfd .content:has(> .split-r:only-child){justify-content:center;padding-top:0}
  .pfd .foot{position:absolute;left:${land ? '6cqw' : '8cqw'};right:${land ? '6cqw' : '8cqw'};bottom:${land ? '2cqw' : '3.6cqw'};display:flex;justify-content:space-between;color:var(--muted);font-size:${f(1.15)}}
  .pfd .foot b{color:var(--ink)} .pfd .foot b:before{content:"";display:inline-block;width:.55em;height:.55em;border-radius:50%;background:var(--fill);margin-right:.45em;vertical-align:.05em}
  .pfd .slide.internal{background:#fffaf0} .pfd .slide.internal .kick{color:#b06a00}
  .pfd .cover{background:radial-gradient(circle at 88% 12%,rgba(31,200,219,.22) 0,rgba(31,200,219,0) 42%),#0B3C44;color:#fff} .pfd .cover:after{content:"";position:absolute;left:${land ? '6cqw' : '8cqw'};bottom:0;width:${land ? '14cqw' : '22cqw'};height:${f(.8)};background:var(--fill)} .pfd .cover>.in{justify-content:space-between;padding-bottom:${land ? '5cqw' : '9cqw'}}
  .pfd .cover .cover-top{display:flex;align-items:center;gap:${f(1)}}
  .pfd .cover .pf-logo{height:${f(4.2)};width:auto;filter:brightness(0) invert(1)}
  .pfd .cover .brand{font-weight:700;font-size:${f(2.2)};letter-spacing:-.01em}
  .pfd .cover .cli-logo{height:${f(7)};width:auto;max-width:40cqw;background:#fff;border-radius:${f(1.2)};padding:${f(.8)};margin-bottom:${f(1.8)}}
  .pfd .cover .cli-mono{display:inline-grid;place-items:center;width:${f(7)};height:${f(7)};border-radius:${f(1.8)};background:var(--fill);color:#0B3C44;font-weight:800;font-size:${f(2.8)};margin-bottom:${f(1.8)}}
  .pfd .cover .kicker{color:var(--fill);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:${f(1.4)}}
  .pfd .cover .cover-mid{padding-bottom:${f(1)}} .pfd .cover h1{font-size:${f(5.8)};line-height:1.04;font-weight:800;letter-spacing:-.035em;margin-top:${f(.8)};max-width:${land ? '78cqw' : '84cqw'}}
  .pfd .cover .cover-foot{opacity:.75;font-size:${f(1.2)}} .pfd .cover .lead{color:#fff;opacity:.9;margin-top:${f(1.4)};max-width:${land ? '70cqw' : '84cqw'}}
  .pfd .statement{background:var(--canvas)} .pfd .statement>.in{justify-content:center}
  .pfd .statement .content{justify-content:center;gap:${f(3)}}
  .pfd .big{font-size:${f(4.2)};line-height:1.14;font-weight:750;letter-spacing:-.025em}
  .pfd .big2{font-size:${f(2.6)};line-height:1.22;font-weight:650}
  .pfd .lead{font-size:${f(2)};color:var(--muted)}
  .pfd .caption{font-size:${f(1.4)};color:var(--muted);text-align:center}
  .pfd .up{text-transform:uppercase;letter-spacing:.08em;font-weight:700;font-size:${f(1.2)};opacity:.85}
  .pfd .kpis{display:grid;grid-template-columns:repeat(${land ? 3 : 1},1fr);gap:${f(1.6)}}
  .pfd .kpi{background:#fff;border-radius:${f(1.6)};border-left:${f(.7)} solid var(--fill);padding:${f(1.6)} ${f(2)};display:flex;${land ? 'flex-direction:column' : 'align-items:baseline;gap:' + f(1.4)}}
  .pfd .kpi b{font-size:${f(4.4)};line-height:1;font-weight:800;color:var(--ink);letter-spacing:-.035em} .pfd .kpi b small{font-size:.45em;font-weight:700;color:var(--muted);margin-left:.1em}
  .pfd .kpi span{font-size:${f(1.4)};color:var(--muted);margin-top:${f(.6)}}
  .pfd .grid{display:grid;gap:${f(1.6)}} .pfd .g2{grid-template-columns:1fr 1fr} .pfd .g3{grid-template-columns:repeat(3,1fr)} .pfd .g4{grid-template-columns:repeat(4,1fr)}
  .pfd .stack{display:flex;flex-direction:column;gap:${f(1.6)}}
  .pfd .cols2{display:grid;grid-template-columns:${land ? '1fr 1fr' : '1fr'};gap:${f(1.8)}}
  .pfd .card{background:#fff;border:1px solid var(--line);border-radius:${f(1.6)};padding:${f(2)};display:flex;flex-direction:column;gap:${f(.8)};min-height:0;overflow:hidden}
  .pfd .card.soft{background:var(--soft);border-color:transparent} .pfd .card.accent{background:var(--ink);color:#fff;border-color:transparent;justify-content:center} .pfd .card.accent .up{color:var(--fill);opacity:1} .pfd .card.accent p{color:#fff}
  .pfd .card h3{font-size:${f(2.2)};line-height:1.2;font-weight:700}
  .pfd .card p{font-size:${f(1.75)};line-height:1.4;color:#3B4037} .pfd .card h3.hl{border-top:${f(.5)} solid var(--c);padding-top:${f(.9)}}
  .pfd .find{border-top:${f(.6)} solid var(--c)} .pfd .card.find .tag{color:var(--ink);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:${f(1.1)}}
  .pfd .card .num-big.long{font-size:${f(3)}} .pfd .card .num-big{font-size:${f(4.6)};line-height:1;font-weight:800;letter-spacing:-.03em;color:var(--ink)}
  .pfd .stack .find{display:grid;grid-template-columns:${f(26)} 1fr;align-items:center;column-gap:${f(2)}} .pfd .stack .find .tag{grid-column:1/-1}
  .pfd .op{border-top:${f(.6)} solid var(--c)} .pfd .card.op .est{font-weight:800;color:var(--acc);font-size:${f(1.9)};line-height:1.15}
  .pfd .card.ind .meta-big{font-size:${f(2.8)};line-height:1.05;font-weight:800;color:var(--ink)} .pfd .card.ind{border-top:${f(.6)} solid var(--c)}
  .pfd .card .pro{color:#007A8A} .pfd .card .con{color:#8f2d1c}
  .pfd .ic{width:${f(2.8)};height:${f(2.8)};color:var(--ink)}
  .pfd .bul{list-style:none;display:flex;flex-direction:column;gap:${f(1)}} .pfd .bul li{position:relative;padding-left:${f(1.8)};font-size:${f(2)};line-height:1.3}
  .pfd .card .bul li{font-size:${f(1.7)}} .pfd .sw .bul{gap:${f(.7)}} .pfd .sw .bul li{font-size:${f(1.5)}}
  .pfd .bul li:before{content:"";position:absolute;left:0;top:.5em;width:${f(.7)};height:${f(.7)};border-radius:50%;background:var(--deep)}
  .pfd .steps,.pfd .qs{list-style:none;display:flex;flex-direction:column;gap:${f(1.6)}}
  .pfd .steps li,.pfd .qs li{display:flex;gap:${f(1.6)};align-items:flex-start;font-size:${f(2.2)};line-height:1.3}
  .pfd .steps li>span:last-child{display:flex;flex-direction:column;gap:${f(.5)}} .pfd .steps small{font-size:${f(1.4)};color:var(--muted)}
  .pfd .qs{gap:${f(1.3)}} .pfd .qs li{font-size:${f(1.95)}}
  .pfd .num{flex:none;display:inline-grid;place-items:center;width:${f(3.2)};height:${f(3.2)};border-radius:50%;background:var(--fill);color:var(--ink);font-weight:800;font-size:${f(1.5)}}
  .pfd .ans{color:#007A8A;font-size:${f(1.4)};margin-top:${f(.3)}}
  .pfd .swot{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:${f(1.4)};flex:1;min-height:0}
  .pfd .sw{border-radius:${f(1.6)};padding:${f(1.5)} ${f(1.8)};overflow:hidden} .pfd .sw h3{font-size:${f(1.9)};margin-bottom:${f(.7)}}
  .pfd .sw.ok{background:var(--soft)} .pfd .sw.warn{background:#0B3C44;color:#fff} .pfd .sw.warn .bul li:before{background:var(--fill)} .pfd .sw.acc{background:#D3F0F4} .pfd .sw.gray{background:var(--canvas)}
  .pfd .journey{list-style:none;display:grid;grid-template-columns:repeat(${land ? 5 : 1},1fr);gap:${f(1.4)}}
  .pfd .journey li{border-${land ? 'top' : 'left'}:${f(.6)} solid var(--c);background:var(--canvas);border-radius:${f(1.2)};padding:${f(1.6)};display:flex;flex-direction:${land ? 'column' : 'row'};gap:${f(.8)};align-items:${land ? 'flex-start' : 'center'};font-size:${f(1.6)}}
  .pfd .journey b{font-size:${f(1.9)}} ${land ? '' : `.pfd .journey b{flex:0 0 ${f(18)}}`}
  .pfd .journey .num{background:var(--ink);color:var(--fill)}
  .pfd .callout{background:var(--soft);border-left:${f(.7)} solid var(--fill);border-radius:${f(1.2)};padding:${f(1.6)} ${f(2)};font-size:${f(2.1)};font-weight:650;line-height:1.25}
  .pfd .card .quote{font-style:italic;font-size:${f(1.7)}}
  .pfd .rows{list-style:none;display:flex;flex-direction:column;gap:${f(1.2)}} .pfd .rows li{display:grid;grid-template-columns:${land ? '22cqw' : '30cqw'} 1fr;gap:${f(1.4)};font-size:${f(1.8)}}
  .pfd .tags{display:flex;flex-wrap:wrap;gap:${f(.6)}} .pfd .tags span{font-size:${f(1.2)};font-weight:700;background:var(--canvas);border-radius:999px;padding:${f(.3)} ${f(1)};color:var(--muted)} .pfd .tags .acc{background:var(--fill);color:var(--ink)}
  .pfd .card .tags{margin-top:auto}
  .pfd .tbl{width:100%;border-collapse:collapse;font-size:${f(1.9)}} .pfd .tbl th{text-align:left;color:var(--muted);font-weight:700;font-size:${f(1.3)};text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid var(--line);padding:${f(.8)} ${f(1)}}
  .pfd .tbl td{border-bottom:1px solid var(--line);padding:${f(1.3)} ${f(1)};vertical-align:middle} .pfd .tbl td small{color:var(--muted);font-size:.75em} .pfd .tbl tr.me td{background:var(--soft)} .pfd .tbl tr.me td:first-child b{color:var(--acc)}
  .pfd .chart-only{flex:1;min-height:0;display:flex;justify-content:center;align-items:center;color:var(--ink)} .pfd .chart-only svg{${land ? 'height:100%;max-height:36cqw;width:auto!important;max-width:100%' : 'width:100%!important;height:auto;max-height:110cqw'}}
  .pfd .chart-wide svg{max-height:${land ? '9cqw' : '22cqw'}}
  .pfd .split-r{display:grid;grid-template-columns:${land ? '1fr 1fr' : '1fr'};gap:${f(2)};align-items:center} .pfd .split-r svg{max-height:${land ? '32cqw' : '62cqw'};width:auto!important;margin:0 auto}
  .pfd .wbar{display:flex;gap:2px;height:${f(1.1)};border-radius:99px;overflow:hidden;margin-top:auto} .pfd .wbar i{display:block;background:var(--c)}
  .pfd .dot{display:inline-block;flex:none;width:.62em;height:.62em;border-radius:50%;background:var(--c);margin-right:.45em;vertical-align:.04em}
  .pfd .lrow{display:flex;flex-wrap:wrap;gap:${f(.6)} ${f(2)};font-size:${f(1.35)};color:var(--muted)}
  .pfd .atag{display:block;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:${f(1.1)};color:var(--muted)}
  .pfd .steps.two{display:grid;grid-template-columns:1fr 1fr;column-gap:${f(3)}}
  .pfd .pill{flex:none;display:inline-grid;place-items:center;min-width:${f(6.4)};height:${f(3.2)};padding:0 ${f(1)};border-radius:99px;background:var(--fill);color:var(--ink);font-weight:800;font-size:${f(1.45)}}
  .pfd .metabox{background:var(--ink);color:#fff;border-radius:${f(1.6)};padding:${f(1.8)} ${f(2.4)};display:flex;align-items:baseline;flex-wrap:wrap;gap:${f(.6)} ${f(1.6)}} .pfd .metabox b{color:var(--fill);font-size:${f(4)};line-height:1;font-weight:800;letter-spacing:-.03em} .pfd .metabox span{font-size:${f(1.9)};opacity:.85}
  .pfd .stack.lst .find{display:flex;align-items:stretch}
  .pfd .steps.lg{gap:${f(2.2)}} .pfd .steps.lg li{font-size:${f(2.6)}} .pfd .qs.lg{gap:${f(2)}} .pfd .qs.lg li{font-size:${f(2.5)}}
  .pfd .grid.tall{flex:1;min-height:0} .pfd .tall .card{padding:${f(2.4)}} .pfd .tall .card h3{font-size:${f(2.9)};line-height:1.12} .pfd .tall .wbar{height:${f(1.6)}}
  .pfd .card.xl{padding:${f(2.6)}} .pfd .card.xl h3{font-size:${f(2.8)}} .pfd .card.xl p{font-size:${f(2.1)}}
  .pfd .card .wk{font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:${f(1.1)};color:var(--muted)} .pfd .card .cnt{font-size:${f(1.35)};color:var(--muted)}
  .pfd .legend{list-style:none;display:flex;flex-direction:column;gap:${f(1)}} .pfd .legend li{display:flex;gap:${f(1.2)};align-items:center;font-size:${f(1.8)};line-height:1.25} .pfd .legend .num{background:var(--ink);color:#fff;width:${f(2.8)};height:${f(2.8)}}
  ${brand === 'ellcazo' ? ellcazoCss(f) : ''}`
}

/** Identidade Ellcazo por cima do mesmo sistema de slides: preto, verde-limão e branco (só o que é do audiovisual). */
function ellcazoCss(f: (n: number) => string): string {
  return `
  .pfd{--ink:#121410;--muted:#5F6656;--acc:#4E6B00;--fill:#B5E61D;--deep:#121410;--soft:#F1F8DA;--line:#E2E6D8;--canvas:#F5F7EF}
  .pfd .cover{background:radial-gradient(circle at 86% 14%,rgba(181,230,29,.2) 0,rgba(181,230,29,0) 44%),#121410}
  .pfd .cover .ecz-logo{height:${f(5.4)};width:auto;display:block}
  .pfd .sw.warn{background:#121410} .pfd .card.accent{background:#121410} .pfd .card .pro,.pfd .ans{color:#4E6B00}
  .pfd .statement{background:#121410;color:#fff} .pfd .statement .kick{color:#fff} .pfd .statement .lead{color:#D8DECB}
  .pfd .statement .card{background:#1D2019;border-color:#2C3125;color:#fff} .pfd .statement .card p{color:#D8DECB} .pfd .statement .card h3{color:#fff}
  .pfd .statement .tags span{background:#2C3125;color:#E4E8DA} .pfd .statement .tags .acc{background:var(--fill);color:#121410}
  .pfd .statement .foot{color:#8C9480} .pfd .statement .foot b{color:#fff}
  .pfd .statement .callout{background:#1D2019;color:#fff}
  .pfd .scn{list-style:none;display:flex;flex-direction:column;gap:${f(1.2)}}
  .pfd .scn li{display:grid;grid-template-columns:${f(7.5)} 1fr;gap:${f(1.4)};align-items:start;border-bottom:1px solid var(--line);padding-bottom:${f(1.2)}}
  .pfd .scn li:last-child{border-bottom:0}
  .pfd .scn .t{display:flex;flex-direction:column;align-items:flex-start;gap:${f(.4)}} .pfd .scn .t .num{background:#121410;color:var(--fill)} .pfd .scn .t small{font-size:${f(1.2)};color:var(--muted);font-weight:700}
  .pfd .scn .img{font-size:${f(1.6)};color:var(--muted);line-height:1.3} .pfd .scn .fala{font-size:${f(2)};font-weight:650;line-height:1.3;margin-top:${f(.3)}}
  .pfd .scn .tela{display:inline-block;margin-top:${f(.6)};background:var(--fill);color:#121410;font-weight:800;font-size:${f(1.35)};border-radius:${f(.6)};padding:${f(.25)} ${f(.9)}}
  .pfd .kv{display:flex;flex-direction:column;gap:${f(.9)}} .pfd .kv p{font-size:${f(1.7)};line-height:1.35;color:#2A2E24} .pfd .kv b{display:block;font-size:${f(1.15)};text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
  .pfd .refs{list-style:none;display:flex;flex-direction:column;gap:${f(1.2)}}
  .pfd .refs li{display:grid;grid-template-columns:${f(3.2)} 1fr;gap:${f(1.4)};align-items:start;font-size:${f(1.7)};line-height:1.3}
  .pfd .refs a{color:#121410;font-weight:700;text-decoration:none;border-bottom:${f(.3)} solid var(--fill)} .pfd .refs small{display:block;color:var(--muted);font-size:${f(1.3)};margin-top:${f(.3)};word-break:break-all}
  .pfd .vlist{list-style:none;display:flex;flex-direction:column;gap:${f(1)}} .pfd .vlist li{display:grid;grid-template-columns:${f(3.2)} 1fr auto;gap:${f(1.4)};align-items:center;border-bottom:1px solid var(--line);padding-bottom:${f(1)};font-size:${f(1.9)}}
  .pfd .vlist li:last-child{border-bottom:0} .pfd .vlist .num{background:#121410;color:var(--fill)} .pfd .vlist small{display:block;color:var(--muted);font-size:${f(1.3)}}
  `
}

/**
 * Ajusta cada slide ao espaço: se algum texto não couber, diminui a escala do slide (--z) até caber.
 * Roda na tela, no modo apresentação e antes do PDF. Função autocontida (vai como texto para a aba nova).
 */
export function fitSlides(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('.slide').forEach((s) => {
    let z = 1
    s.style.setProperty('--z', '1')
    const over = () => {
      const c = (s.querySelector('.content') ?? s.querySelector('.in')) as HTMLElement | null
      if (!c) return false
      if (c.scrollHeight > c.clientHeight + 2) return true
      let bad = false
      // Cards e caixas: nada pode passar da borda. Títulos: só a largura (a altura das letras sempre passa um pouco).
      s.querySelectorAll<HTMLElement>('.card, .sw, .kpi').forEach((e) => { if (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2) bad = true })
      s.querySelectorAll<HTMLElement>('h1, h2, .big').forEach((e) => { if (e.scrollWidth > e.clientWidth + 2) bad = true })
      const inner = s.querySelector<HTMLElement>('.in')
      const foot = s.querySelector<HTMLElement>('.foot')
      const last = (s.querySelector('.content') ?? s.querySelector('.cover-mid'))?.lastElementChild
      if (inner && last && foot && last.getBoundingClientRect().bottom > foot.getBoundingClientRect().top + 2) bad = true
      return bad
    }
    while (over() && z > 0.55) { z = Math.round((z - 0.05) * 100) / 100; s.style.setProperty('--z', String(z)) }
  })
}

/** Um slide em HTML (sem <html>). */
export function slideHtml(s: Slide, i: number, total: number, name: string, brand: DeckBrand = 'peformake'): string {
  const cls = ['slide', s.kind === 'cover' ? 'cover' : s.kind === 'statement' ? 'statement' : '', s.internal ? 'internal' : ''].filter(Boolean).join(' ')
  const head = s.title || (s.kicker && s.kind !== 'cover') ? `<div class="head">${s.kicker ? `<p class="kick">${esc(s.kicker)}</p>` : ''}${s.title ? `<h2>${esc(s.title)}</h2>` : ''}</div>` : ''
  const foot = s.kind === 'cover' ? '' : `<div class="foot"><span><b>${BRAND_NAME[brand]}</b> · ${esc(name)}</span><span>${i + 1} / ${total}</span></div>`
  return `<section class="${cls}" aria-label="Slide ${i + 1} de ${total}"><div class="in">${s.kind === 'cover' ? s.body : `${head}<div class="content">${s.body}</div>`}${foot}</div></section>`
}

/** Slides em HTML (para o PDF, o link público e o portal: nunca os internos). */
export function deckSlidesHtml(input: DeckInput, o: Orientation): string {
  const list = buildSlides(input, o)
  return list.map((s, i) => slideHtml(s, i, list.length, input.name, input.brand)).join('')
}

export function deckSlideCount(input: DeckInput, o: Orientation): number { return buildSlides(input, o).length }

/** Documento completo para imprimir/salvar em PDF: uma página por slide, no tamanho certo. */
export function deckHtml(input: DeckInput, o: Orientation): string {
  const page = o === 'paisagem' ? '338.67mm 190.5mm' : '210mm 297mm'
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(input.title ?? 'Diagnóstico')} · ${esc(input.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
    const list = buildSlides(input, k)
    const css = deckCss(k, input.brand).replace(/\.pfd/g, `#${id} .pfd`)
    const size = k === 'paisagem'
      ? `#${id} .pfd{width:min(calc(var(--vw) - 24px),calc((var(--vh) - 88px) * ${(16 / 9).toFixed(4)}))}`
      // Vertical em tela cheia: o slide fica da altura da tela (o conteúdo se ajusta com fitSlides).
      : `#${id}{padding-top:max(58px,env(safe-area-inset-top))} #${id} .pfd{width:min(calc(var(--vw) - 16px),640px)} #${id} .pfd .slide{aspect-ratio:auto;height:min(calc(var(--vh) - 130px),calc((var(--vw) - 16px) * 2.1))} #${id} .pfd .slide:not(.cover)>.in>.content{justify-content:center}`
    const details = list.map((x) => (x.details?.items.length ? { t: x.details.title, i: x.details.items.map((it) => ({ k: it.k ?? '', v: it.v, u: it.url ?? '' })) } : null))
    return { id, details, css: `${css}\n${size}`, html: `<div class="stage" id="${id}"${k === o ? '' : ' hidden'}><div class="pfd measure">${list.map((x, n) => slideHtml(x, n, list.length, input.name, input.brand)).join('')}</div></div>` }
  }
  const a = stage('paisagem'), b = stage('vertical')
  const C = CHROME[input.brand ?? 'peformake']
  const det = JSON.stringify({ sp: a.details, sv: b.details }).replace(/</g, '\\u003c')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(input.name)} · ${BRAND_NAME[input.brand ?? 'peformake']}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>:root{--vw:100vw;--vh:100dvh}html,body{margin:0;height:100%;background:${C.bg};overflow:hidden;font-family:Geist,system-ui,sans-serif}
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
