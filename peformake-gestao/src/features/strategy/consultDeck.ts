// Apresentação (deck) do diagnóstico: 1 ideia por slide, capa, cards, gráficos e rodapé com página.
// O mesmo HTML serve para: PDF (impressão do navegador, @page por orientação), link público vivo e portal do cliente.
// Medidas em cqw (largura do slide): o slide escala igual na tela e no papel, sem quebrar no meio.
import { effortData, forcesSvg, funnelData, funnelSvg, gaugeSvg, hbarsSvg, positioningData, positioningSvg, presenceData, radarSvg, ratingsData, ratingsSvg, SERIES, timelineSvg } from './consultCharts'

type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export type Orientation = 'vertical' | 'paisagem'
export interface DeckInput {
  name: string
  doc: Doc
  questions?: { question: string; why?: string | null; answer?: string | null }[]
  clientLogoUrl?: string | null
  peformakeLogoUrl?: string | null
  updatedAt?: string | null
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const chunk = <T,>(a: T[], n: number): T[][] => { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out.length ? out : [[]] }
const arr = (v: unknown): Doc[] => (Array.isArray(v) ? v as Doc[] : [])
const strs = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).map(String).filter((s) => s.trim()) : [])
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
const isUrl = (s: unknown) => typeof s === 'string' && /^https?:\/\//.test(s)
const WHO: Record<string, string> = { cliente: 'Cliente', peformake: 'Peformake', juntos: 'Juntos' }
const EFFORT: Record<string, string> = { baixo: 'Rápido', medio: 'Médio', alto: 'Grande' }
const IMPACT: Record<string, string> = { alto: 'Impacto alto', medio: 'Impacto médio', baixo: 'Impacto baixo' }

// Ícones simples (traço), para dar ritmo visual aos cards.
const ICON: Record<string, string> = {
  alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  loja: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.3.2 4 1.8 4.5 4.5"/>',
  fala: '<path d="M4 5h16v11H9l-5 4z"/>',
  raio: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  pergunta: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17v.5"/>',
  mapa: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
}
const icon = (k: keyof typeof ICON) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`

interface Slide { kind?: 'cover' | 'statement'; title?: string; kicker?: string; body: string }

function slides(input: DeckInput, o: Orientation): Slide[] {
  const { doc, name } = input
  const r = doc.resumo ?? {}, d = doc.diagnostico ?? {}, c = doc.comunicacao ?? {}, p = doc.plano ?? {}
  const land = o === 'paisagem'
  const out: Slide[] = []
  const add = (s: Slide) => out.push(s)
  const date = new Date(doc.gerado_em ?? input.updatedAt ?? Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  // Capa
  add({ kind: 'cover', body: `
    <div class="cover-top">${input.peformakeLogoUrl ? `<img class="pf-logo" src="${esc(input.peformakeLogoUrl)}" alt="Peformake">` : ''}<span class="brand">Peformake</span></div>
    <div class="cover-mid">
      ${input.clientLogoUrl ? `<img class="cli-logo" src="${esc(input.clientLogoUrl)}" alt="">` : `<span class="cli-mono">${esc(initials(name))}</span>`}
      <p class="kicker">Diagnóstico e plano de ação</p>
      <h1>${esc(name)}</h1>
      ${r.titulo ? `<p class="lead">${esc(r.titulo)}</p>` : ''}
    </div>
    <p class="cover-foot">${esc(date)} · Consultoria Peformake</p>` })

  if (r.situacao) add({ title: 'Onde a empresa está hoje', kicker: 'Resumo', body: `<div class="split"><p class="para clamp-12">${esc(r.situacao)}</p><div class="card center">${gaugeSvg(r.nota_maturidade)}<p class="muted small">Maturidade digital</p></div></div>` })
  const dec = strs(r.decisoes)
  if (dec.length) add({ title: 'As decisões que importam', kicker: 'Resumo', body: `<ol class="steps">${dec.slice(0, 5).map((t, i) => `<li><span class="num">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>` })
  if (r.primeiro_passo) add({ kind: 'statement', kicker: 'Primeiro passo desta semana', body: `<p class="big">${esc(r.primeiro_passo)}</p>` })

  // Diagnóstico
  if (d.negocio?.texto) add({ title: 'O negócio hoje', kicker: 'Diagnóstico', body: `<div class="split"><p class="para clamp-10">${esc(d.negocio.texto)}</p><div class="card">${icon('loja')}<ul class="bul">${strs(d.negocio.pontos).slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></div>` })
  if (d.swot) {
    const q = (k: string, l: string, cls: string) => `<div class="sw ${cls}"><h3>${l}</h3><ul class="bul">${strs(d.swot[k]).slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`
    add({ title: 'Forças, fraquezas, oportunidades e ameaças', kicker: 'Diagnóstico', body: `<div class="swot">${q('forcas', 'Forças', 'ok')}${q('fraquezas', 'Fraquezas', 'warn')}${q('oportunidades', 'Oportunidades', 'acc')}${q('ameacas', 'Ameaças', 'gray')}</div>` })
  }
  const forces = arr(d.mercado?.cinco_forcas)
  if (d.mercado?.texto || forces.length) add({ title: 'O mercado e a pressão da concorrência', kicker: 'Mercado', body: `<div class="split"><p class="para clamp-10">${esc(d.mercado?.texto)}</p>${forces.length ? `<div class="card chart">${forcesSvg(forces)}</div>` : ''}</div>` })
  const rivals = arr(d.mercado?.concorrentes)
  chunk(rivals, land ? 3 : 4).forEach((g, i, all) => {
    if (!g.length) return
    add({ title: all.length > 1 ? `Concorrentes (${i + 1}/${all.length})` : 'Concorrentes', kicker: 'Mercado', body: `<div class="grid ${land ? 'g3' : 'g2'}">${g.map((x) => {
      const links = [['Site', x.site], ['Instagram', x.instagram && !isUrl(x.instagram) ? `https://instagram.com/${String(x.instagram).replace(/^@/, '')}` : x.instagram], ['Google Maps', x.google_maps], ['Anúncios', x.biblioteca_anuncios]].filter(([, u]) => isUrl(u))
      const meta = [typeof x.nota === 'number' && x.nota > 0 ? `★ ${x.nota.toLocaleString('pt-BR')}${typeof x.avaliacoes === 'number' && x.avaliacoes > 0 ? ` (${x.avaliacoes})` : ''}` : '', x.preco && !/n[aã]o encontrad/i.test(String(x.preco)) ? `Preço: ${x.preco}` : ''].filter(Boolean)
      return `<div class="card"><h3>${esc(x.nome)}</h3><p class="clamp-4">${esc(x.diferencial || x.o_que_fazem)}</p>${meta.length ? `<p class="meta">${meta.map(esc).join(' · ')}</p>` : ''}${x.como_anunciam && !/^n[aã]o encontrad/i.test(String(x.como_anunciam)) ? `<p class="muted small clamp-2">${esc(x.como_anunciam)}</p>` : ''}${links.length ? `<p class="links">${links.map(([l, u]) => `<a href="${esc(u)}">${l}</a>`).join('')}</p>` : isUrl(x.fonte) ? `<p class="links"><a href="${esc(x.fonte)}">${esc(host(x.fonte))}</a></p>` : ''}</div>`
    }).join('')}</div>` })
  })
  const pres = presenceData(d, name)
  if (pres) add({ title: 'Presença digital: você × concorrentes', kicker: 'Mercado', body: `<div class="chart-only">${radarSvg(pres)}</div><p class="muted small center">Nota de 0 a 10 por canal, pelo que está público hoje.</p>` })
  const rat = ratingsData(d, name)
  if (rat) add({ title: 'Reputação: nota e avaliações', kicker: 'Mercado', body: `<div class="chart-only">${ratingsSvg(rat)}</div><p class="muted small center">Nota no Google (número de avaliações entre parênteses).</p>` })
  const pos = positioningData(d, name)
  if (pos) add({ title: 'Onde cada um se posiciona', kicker: 'Mercado', body: `<div class="chart-only">${positioningSvg(pos)}</div>` })

  const per = d.publico?.persona
  if (per?.nome) add({ title: 'Para quem vender', kicker: 'Público', body: `<div class="split"><div class="card">${icon('pessoas')}<h3>${esc(per.nome)}${per.idade ? `, ${esc(per.idade)}` : ''}</h3><p class="clamp-4">${esc(per.quem_e)}</p><div class="three"><div><b>Dores</b><ul class="bul">${strs(per.dores).slice(0, 3).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div><div><b>Desejos</b><ul class="bul">${strs(per.desejos).slice(0, 3).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></div></div><div class="card soft">${icon('alvo')}<h3>Cliente ideal</h3><p class="clamp-10">${esc(d.publico?.icp)}</p></div></div>` })
  const jor = arr(d.publico?.jornada)
  if (jor.length) add({ title: 'A jornada de compra', kicker: 'Público', body: `<ol class="journey">${jor.slice(0, 5).map((j, i) => `<li style="--c:${SERIES[i % SERIES.length]}"><span class="num">${i + 1}</span><b>${esc(j.etapa)}</b><p class="clamp-4">${esc(j.o_que_acontece)}</p><p class="muted small clamp-3">Fazer: ${esc(j.o_que_fazer)}</p></li>`).join('')}</ol>` })
  if (d.proposta_valor?.texto) add({ title: 'Por que comprar de você', kicker: 'Proposta de valor', body: `<div class="split"><div><p class="para clamp-8">${esc(d.proposta_valor.texto)}</p>${d.proposta_valor.equacao ? `<p class="callout">${esc(d.proposta_valor.equacao)}</p>` : ''}</div><div class="card">${icon('check')}<ul class="bul">${strs(d.proposta_valor.diferenciais).slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></div>` })
  const itens = arr(d.presenca_digital?.itens)
  if (itens.length) {
    const dot = { bom: SERIES[2], atencao: SERIES[3], ruim: SERIES[1], nao_encontrado: '#9aa5ab' } as Record<string, string>
    add({ title: `Presença digital · ${esc(d.presenca_digital?.nota ?? '–')}/10`, kicker: 'Diagnóstico', body: `<ul class="rows">${itens.slice(0, 6).map((x) => `<li><span class="dot" style="background:${dot[x.situacao] ?? '#9aa5ab'}"></span><b>${esc(x.canal)}</b><span class="clamp-2">${esc(x.observacao)}</span></li>`).join('')}</ul>` })
  }
  const fun = funnelData(d)
  if (fun || d.funil?.texto) add({ title: 'Do anúncio à venda', kicker: 'Números', body: `<div class="split">${fun ? `<div class="chart">${funnelSvg(fun)}</div>` : ''}<p class="para clamp-10">${esc(d.funil?.texto)}</p></div>` })

  // Sugestão de comunicação
  if (c.essencia) add({ kind: 'statement', kicker: 'Sugestão de comunicação', body: `<p class="big">${esc(c.essencia)}</p>${c.proposito ? `<p class="lead">${esc(c.proposito)}</p>` : ''}${c.arquetipo ? `<p class="muted">Arquétipo: <b>${esc(c.arquetipo)}</b></p>` : ''}` })
  const tom = arr(c.tom)
  if (tom.length) add({ title: 'Tom de voz', kicker: 'Sugestão de comunicação', body: `<div class="grid g2">${tom.slice(0, 4).map((t, i) => `<div class="card"><h3 style="color:${SERIES[i % SERIES.length]}">${esc(t.adjetivo)}</h3><p class="quote clamp-4">“${esc(t.exemplo)}”</p></div>`).join('')}</div>` })
  if (strs(c.evitar).length || c.regra_teste) add({ title: 'O que evitar', kicker: 'Sugestão de comunicação', body: `<div class="split"><div class="card">${icon('alerta')}<ul class="bul">${strs(c.evitar).slice(0, 5).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>${c.regra_teste ? `<div class="card accent"><p class="small up">Regra-teste</p><p class="big2">${esc(c.regra_teste)}</p></div>` : ''}</div>` })
  if (c.expressao) add({ title: 'Expressão da marca', kicker: 'Sugestão de comunicação', body: `<div class="grid g3">${[['Paleta', c.expressao.paleta], ['Ambiente', c.expressao.ambiente], ['Presença', c.expressao.presenca]].filter(([, v]) => v).map(([k, v]) => `<div class="card"><h3>${k}</h3><p class="clamp-8">${esc(v)}</p></div>`).join('')}</div>` })
  const pil = arr(c.pilares)
  if (pil.length) add({ title: 'Pilares de conteúdo', kicker: 'Sugestão de comunicação', body: `<div class="grid ${land ? 'g3' : 'g2'}">${pil.slice(0, 6).map((x, i) => `<div class="card"><h3 style="color:${SERIES[i % SERIES.length]}">${esc(x.nome)}</h3><p class="clamp-5">${esc(x.descricao)}</p></div>`).join('')}</div>` })
  if (c.papel_peformake) add({ kind: 'statement', kicker: 'O papel da Peformake', body: `<p class="big2">${esc(c.papel_peformake)}</p>` })
  const exp = arr(doc.experiencia)
  if (exp.length) add({ title: 'Experiência do cliente (fora do digital)', kicker: 'Experiência', body: `<div class="grid g2">${exp.slice(0, 4).map((m) => `<div class="card"><h3>${esc(m.momento)}</h3><p class="clamp-3">${esc(m.como_deve_ser)}</p><ul class="bul small">${strs(m.acoes).slice(0, 2).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('')}</div>` })

  // Plano
  const fases = arr(p.fases)
  if (p.prioridade || fases.length) add({ title: 'O plano dos próximos 90 dias', kicker: 'Plano de ação', body: `${p.prioridade ? `<p class="callout">${esc(p.prioridade)}</p>` : ''}${fases.length ? `<div class="chart-wide">${timelineSvg(fases)}</div><div class="grid g3">${fases.map((f, i) => `<div class="card" style="border-top:0.5cqw solid ${SERIES[i % SERIES.length]}"><h3>${esc(f.periodo)}</h3><p class="clamp-4">${esc(f.objetivo)}</p></div>`).join('')}</div>` : ''}` })
  fases.forEach((f, fi) => {
    chunk(arr(f.passos), land ? 3 : 4).forEach((g, i, all) => {
      if (!g.length) return
      add({ title: `Plano de ação · ${esc(f.periodo)}${all.length > 1 ? ` (${i + 1}/${all.length})` : ''}`, kicker: `Fase ${fi + 1} de ${fases.length}`, body: `${i === 0 ? `<p class="callout">${esc(f.objetivo)}</p>` : ''}<div class="grid ${land ? 'g3' : 'g2'}">${g.map((s) => `<div class="card" style="border-left:0.6cqw solid ${SERIES[fi % SERIES.length]}"><h3 class="clamp-3">${esc(s.acao)}</h3><p class="small clamp-6">${esc(s.como)}</p><p class="tags"><span>${esc(s.area)}</span><span class="acc">${esc(WHO[s.quem] ?? s.quem)}</span><span>${esc(EFFORT[s.esforco] ?? s.esforco)}</span></p></div>`).join('')}</div>` })
    })
  })
  const eff = effortData(p)
  if (eff) add({ title: 'Onde está o esforço', kicker: 'Plano de ação', body: `<div class="split"><div class="chart">${hbarsSvg(eff)}</div><ul class="rows">${arr(p.por_area).slice(0, 5).map((a) => `<li><b>${esc(a.area)}</b><span class="clamp-2">${esc(a.foco)}</span></li>`).join('')}</ul></div><p class="muted small">Peso pelo tamanho de cada passo (rápido 1, médio 2, grande 3).</p>` })
  const ind = arr(p.indicadores)
  if (ind.length) add({ title: 'Números para acompanhar', kicker: 'Plano de ação', body: `<table><thead><tr><th>Indicador</th><th>Meta</th><th>Como medir</th></tr></thead><tbody>${ind.slice(0, 6).map((n) => `<tr><td><b>${esc(n.nome)}</b></td><td>${esc(n.meta)}</td><td>${esc(n.como_medir)}</td></tr>`).join('')}</tbody></table>` })

  const ord = { alto: 0, medio: 1, baixo: 2 } as Record<string, number>
  const risks = arr(doc.riscos).sort((a, b) => (ord[a.impacto] ?? 3) - (ord[b.impacto] ?? 3))
  chunk(risks, 4).forEach((g, i, all) => {
    if (!g.length) return
    add({ title: all.length > 1 ? `Riscos e como evitar (${i + 1}/${all.length})` : 'Riscos e como evitar', kicker: 'Riscos', body: `<div class="grid g2">${g.map((x) => `<div class="card ${x.impacto === 'alto' ? 'warnb' : ''}"><p class="small up">${esc(IMPACT[x.impacto] ?? '')}</p><h3 class="clamp-3">${esc(x.risco)}</h3><p class="small clamp-4">Como evitar: ${esc(x.como_evitar)}</p></div>`).join('')}</div>` })
  })
  const qs = (input.questions ?? []).filter((q) => q.question?.trim())
  chunk(qs, land ? 6 : 8).forEach((g, i, all) => {
    if (!g.length) return
    add({ title: all.length > 1 ? `O que precisamos de você (${i + 1}/${all.length})` : 'O que precisamos de você', kicker: 'Próximos passos', body: `<ol class="qs">${g.map((q, k) => `<li><span class="num">${i * (land ? 6 : 8) + k + 1}</span><div><b class="clamp-2">${esc(q.question)}</b>${q.answer ? `<p class="ans clamp-2">✓ ${esc(q.answer)}</p>` : ''}</div></li>`).join('')}</ol>` })
  })
  add({ kind: 'cover', body: `<div class="cover-top">${input.peformakeLogoUrl ? `<img class="pf-logo" src="${esc(input.peformakeLogoUrl)}" alt="Peformake">` : ''}<span class="brand">Peformake</span></div><div class="cover-mid"><p class="kicker">Vamos juntos</p><h1>Próximo passo: 30 minutos para passar o plano</h1><p class="lead">${r.primeiro_passo ? esc(r.primeiro_passo) : 'Marcamos uma conversa para tirar dúvidas e começar.'}</p></div><p class="cover-foot">Peformake · assessoria de marketing</p>` })
  return out
}

export function deckCss(o: Orientation): string {
  const land = o === 'paisagem'
  // Escala por orientação: no retrato o slide é mais estreito, então as letras ocupam mais da largura.
  const k = land ? 1 : 1.45
  const f = (n: number) => `${(n * k).toFixed(2)}cqw`
  return `
  .pfd{--ink:#16262c;--muted:#5d6c73;--acc:#007a8a;--fill:#1fc8db;--soft:#e6f6f8;--line:#d9e2e5;--canvas:#f3f7f8;color:var(--ink);font-family:Geist,ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pfd *{box-sizing:border-box;margin:0;padding:0}
  .pfd .slide{container-type:inline-size;position:relative;width:100%;aspect-ratio:${land ? '16 / 9' : '210 / 297'};background:#fff;overflow:hidden;break-after:page;break-inside:avoid;page-break-after:always}
  .pfd .slide>.in{position:absolute;inset:0;display:flex;flex-direction:column;padding:${land ? '4.2cqw 5cqw 5cqw' : '7cqw 7cqw 8cqw'}}
  .pfd .slide:last-child{break-after:auto;page-break-after:auto}
  .pfd .head{margin-bottom:${f(2)}}
  .pfd .kick{color:var(--acc);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:${f(1.15)}}
  .pfd h2{font-size:${f(3.3)};line-height:1.12;font-weight:700;letter-spacing:-.02em;margin-top:${f(.5)}}
  .pfd .content{flex:1;min-height:0;display:flex;flex-direction:column;gap:${f(1.4)};font-size:${f(1.55)};line-height:1.42}
  .pfd .foot{position:absolute;left:${land ? '5cqw' : '7cqw'};right:${land ? '5cqw' : '7cqw'};bottom:${land ? '1.6cqw' : '2.6cqw'};display:flex;justify-content:space-between;color:var(--muted);font-size:${f(1)};border-top:1px solid var(--line);padding-top:${f(.6)}}
  .pfd .foot b{color:var(--acc)}
  .pfd .cover{background:linear-gradient(135deg,#062a31 0%,#0b4a55 55%,#0e7180 100%);color:#fff} .pfd .cover>.in{justify-content:space-between;padding-bottom:${land ? '4cqw' : '7cqw'}}
  .pfd .cover .cover-top{display:flex;align-items:center;gap:${f(1)}}
  .pfd .cover .pf-logo{height:${f(4.2)};width:auto;filter:brightness(0) invert(1)}
  .pfd .cover .brand{font-weight:700;font-size:${f(2.2)};letter-spacing:-.01em}
  .pfd .cover .cli-logo{height:${f(7)};width:auto;max-width:40cqw;background:#fff;border-radius:${f(1.2)};padding:${f(.8)};margin-bottom:${f(1.6)}}
  .pfd .cover .cli-mono{display:inline-grid;place-items:center;width:${f(7)};height:${f(7)};border-radius:${f(1.8)};background:var(--fill);color:#062a31;font-weight:800;font-size:${f(2.8)};margin-bottom:${f(1.6)}}
  .pfd .cover .kicker{color:var(--fill);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:${f(1.4)}}
  .pfd .cover h1{font-size:${f(5.4)};line-height:1.05;font-weight:800;letter-spacing:-.03em;margin:${f(.6)} 0 ${f(1.2)}}
  .pfd .cover .lead{font-size:${f(2)};opacity:.92;max-width:${land ? '70cqw' : '86cqw'};line-height:1.3}
  .pfd .cover .cover-foot{opacity:.75;font-size:${f(1.2)}}
  .pfd .statement{background:var(--canvas)} .pfd .statement>.in{justify-content:center}
  .pfd .statement .content{justify-content:center}
  .pfd .big{font-size:${f(3.6)};line-height:1.18;font-weight:700;letter-spacing:-.02em}
  .pfd .big2{font-size:${f(2.4)};line-height:1.25;font-weight:600}
  .pfd .lead{font-size:${f(1.9)};line-height:1.35}
  .pfd .para{font-size:${f(1.75)};line-height:1.5}
  .pfd .muted{color:var(--muted)} .pfd .small{font-size:${f(1.25)}} .pfd .center{text-align:center}
  .pfd .up{text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:var(--muted)}
  .pfd .split{display:grid;grid-template-columns:${land ? '1.15fr 1fr' : '1fr'};gap:${f(2)};align-items:start;min-height:0}
  .pfd .grid{display:grid;gap:${f(1.4)};min-height:0} .pfd .g2{grid-template-columns:1fr 1fr} .pfd .g3{grid-template-columns:repeat(${land ? 3 : 2},1fr)}
  .pfd .card{background:#fff;border:1px solid var(--line);border-radius:${f(1.4)};padding:${f(1.6)};display:flex;flex-direction:column;gap:${f(.6)};min-height:0;overflow:hidden}
  .pfd .card.soft{background:var(--soft);border-color:transparent} .pfd .card.accent{background:var(--acc);color:#fff;border-color:transparent} .pfd .card.accent .up{color:#cdeff3}
  .pfd .card.warnb{border-color:#eb6834;border-width:2px}
  .pfd .card h3{font-size:${f(1.8)};line-height:1.2;font-weight:700}
  .pfd .card.center{align-items:center} .pfd .card.center svg{max-width:${land ? '100%' : '55%'}}
  .pfd .ic{width:${f(2.6)};height:${f(2.6)};color:var(--acc)}
  .pfd .bul{list-style:none;display:flex;flex-direction:column;gap:${f(.5)}} .pfd .card .bul{font-size:${f(1.35)}} .pfd .card .bul li{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden} .pfd .bul li{position:relative;padding-left:${f(1.4)}} .pfd .bul li:before{content:"";position:absolute;left:0;top:.6em;width:${f(.55)};height:${f(.55)};border-radius:50%;background:var(--acc)}
  .pfd .steps,.pfd .qs{list-style:none;display:flex;flex-direction:column;gap:${f(1.1)}}
  .pfd .steps li,.pfd .qs li{display:flex;gap:${f(1.2)};align-items:flex-start;font-size:${f(1.8)};line-height:1.35}
  .pfd .qs li{font-size:${f(1.45)}}
  .pfd .num{flex:none;display:inline-grid;place-items:center;width:${f(3)};height:${f(3)};border-radius:50%;background:var(--soft);color:var(--acc);font-weight:800;font-size:${f(1.4)}}
  .pfd .ans{color:#1a7f55;font-size:${f(1.25)};margin-top:${f(.3)}}
  .pfd .swot{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:${f(1.2)};flex:1;min-height:0}
  .pfd .sw{border-radius:${f(1.4)};padding:${f(1.5)};overflow:hidden} .pfd .sw .bul{font-size:${f(1.35)}} .pfd .sw .bul li{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${land ? 3 : 4};overflow:hidden} .pfd .sw h3{font-size:${f(1.9)};margin-bottom:${f(.6)}}
  .pfd .sw.ok{background:#e3f4ec} .pfd .sw.warn{background:#fbe9e0} .pfd .sw.acc{background:var(--soft)} .pfd .sw.gray{background:#eef1f2}
  .pfd .journey{list-style:none;display:grid;grid-template-columns:repeat(${land ? 5 : 2},1fr);gap:${f(1.2)}} .pfd .journey li{font-size:${f(1.35)}}
  .pfd .journey li{border-top:${f(.5)} solid var(--c);background:var(--canvas);border-radius:${f(1)};padding:${f(1.3)};display:flex;flex-direction:column;gap:${f(.4)}}
  .pfd .journey .num{background:var(--c);color:#fff}
  .pfd .callout{background:var(--soft);border-left:${f(.6)} solid var(--acc);border-radius:${f(1)};padding:${f(1.3)} ${f(1.6)};font-size:${f(1.8)};font-weight:600;line-height:1.3}
  .pfd .quote{font-style:italic;font-size:${f(1.6)}}
  .pfd .rows{list-style:none;display:flex;flex-direction:column;gap:${f(.9)}} .pfd .rows li{display:grid;grid-template-columns:auto ${land ? '12cqw' : '22cqw'} 1fr;gap:${f(1)};align-items:start}
  .pfd .rows li:not(:has(.dot)){grid-template-columns:${land ? '14cqw' : '26cqw'} 1fr}
  .pfd .dot{width:${f(1.2)};height:${f(1.2)};border-radius:50%;margin-top:.35em}
  .pfd .meta{font-weight:700;color:var(--acc);font-size:${f(1.3)}}
  .pfd .links{display:flex;flex-wrap:wrap;gap:${f(.6)};margin-top:auto} .pfd .links a{font-size:${f(1.1)};color:var(--acc);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:${f(.25)} ${f(.8)}}
  .pfd .tags{display:flex;flex-wrap:wrap;gap:${f(.5)};margin-top:auto} .pfd .tags span{font-size:${f(1.05)};font-weight:700;background:var(--canvas);border-radius:999px;padding:${f(.25)} ${f(.8)}} .pfd .tags .acc{background:var(--soft);color:var(--acc)}
  .pfd .three{display:grid;grid-template-columns:1fr 1fr;gap:${f(1)};font-size:${f(1.3)}}
  .pfd table{width:100%;border-collapse:collapse;font-size:${f(1.45)}} .pfd th{text-align:left;color:var(--muted);font-weight:700;border-bottom:2px solid var(--line);padding:${f(.6)} ${f(.8)}} .pfd td{border-bottom:1px solid var(--line);padding:${f(.8)};vertical-align:top}
  .pfd .chart,.pfd .chart-only,.pfd .chart-wide{color:var(--ink)} .pfd .chart-only{flex:1;min-height:0;display:flex;justify-content:center;align-items:center} .pfd .chart-only svg{max-height:${land ? '36cqw' : '80cqw'};width:auto!important;max-width:100%}
  .pfd .clamp-2,.pfd .clamp-3,.pfd .clamp-4,.pfd .clamp-5,.pfd .clamp-6,.pfd .clamp-8,.pfd .clamp-10,.pfd .clamp-12{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
  ${[2, 3, 4, 5, 6, 8, 10, 12].map((n) => `.pfd .clamp-${n}{-webkit-line-clamp:${n}}`).join('')}
  `
}

/** Slides em HTML (sem <html>): para a tela (apresentação web e portal) e para o PDF. */
export function deckSlidesHtml(input: DeckInput, o: Orientation): string {
  const list = slides(input, o)
  const total = list.length
  return list.map((s, i) => {
    const cls = s.kind === 'cover' ? 'slide cover' : s.kind === 'statement' ? 'slide statement' : 'slide'
    const head = s.title || (s.kicker && s.kind !== 'cover') ? `<div class="head">${s.kicker ? `<p class="kick">${esc(s.kicker)}</p>` : ''}${s.title ? `<h2>${s.title.includes('<') ? s.title : esc(s.title)}</h2>` : ''}</div>` : ''
    const foot = s.kind === 'cover' ? '' : `<div class="foot"><span><b>Peformake</b> · Diagnóstico de ${esc(input.name)}</span><span>${i + 1} / ${total}</span></div>`
    return `<section class="${cls}" aria-label="Slide ${i + 1} de ${total}"><div class="in">${s.kind === 'cover' ? s.body : `${head}<div class="content">${s.body}</div>`}${foot}</div></section>`
  }).join('')
}

export function deckSlideCount(input: DeckInput, o: Orientation): number { return slides(input, o).length }

/** Documento completo para imprimir/salvar em PDF: uma página por slide, no tamanho certo. */
export function deckHtml(input: DeckInput, o: Orientation): string {
  const page = o === 'paisagem' ? '338.67mm 190.5mm' : '210mm 297mm'
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diagnóstico · ${esc(input.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>@page{size:${page};margin:0}html,body{margin:0;background:#cfd8dc}body{padding:16px;display:flex;flex-direction:column;gap:16px;align-items:center}
.pfd{width:min(100%,${o === 'paisagem' ? '1100px' : '760px'})} .pfd .slide{box-shadow:0 2px 14px rgba(0,0,0,.18);margin-bottom:16px}
@media print{html,body{background:#fff;padding:0;gap:0}.pfd{width:${o === 'paisagem' ? '338.67mm' : '210mm'}}.pfd .slide{width:${o === 'paisagem' ? '338.67mm' : '210mm'};height:${o === 'paisagem' ? '190.5mm' : '297mm'};aspect-ratio:auto;box-shadow:none;margin:0}}
${deckCss(o)}</style></head><body><div class="pfd">${deckSlidesHtml(input, o)}</div></body></html>`
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
