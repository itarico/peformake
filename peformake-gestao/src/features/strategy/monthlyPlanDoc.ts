// Plano de execução do mês (documento da equipe): o quê, como e quando, com a copy de cada peça.
// Separado da apresentação do cliente (monthlyDeck). Vem de monthly_strategies.doc.plano (função monthly-strategy).
// Identidade Peformake: ciano #1FC8DB, petróleo #056F84, azul-escuro #0B3C44 e branco. Tudo é escapado; só links http(s) viram link.

type Any = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export interface PlanInput { name: string; month: string; doc: Any | null | undefined }

const OBJ_LABEL: Record<string, string> = { vender: 'Vender', autoridade: 'Autoridade', posicionamento: 'Posicionamento', relacionamento: 'Relacionamento', educar: 'Educar' }
const OBJ_COLOR: Record<string, string> = { vender: '#056F84', autoridade: '#0B3C44', posicionamento: '#1FC8DB', relacionamento: '#9FB4BA', educar: '#9FD9E3' }
const FUNIL_LABEL: Record<string, string> = { atrair: 'Atrair', nutrir: 'Nutrir', converter: 'Converter', fidelizar: 'Fidelizar' }
const FORMATO_LABEL: Record<string, string> = { carrossel: 'Carrossel', post: 'Post', reels: 'Reels', story: 'Story', anuncio: 'Anúncio' }
const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const arr = <T = Any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const txt = (v: unknown) => esc(v).replace(/\n/g, '<br>')
/** Link só se for http(s); senão, texto. */
export function link(url: unknown, label?: unknown): string {
  const u = String(url ?? '').trim()
  if (!/^https?:\/\//i.test(u)) return esc(label ?? u)
  const show = label ? esc(label) : esc(u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))
  return `<a href="${esc(u)}" target="_blank" rel="noopener">${show}</a>`
}
export function dayLabel(iso: unknown): string {
  const s = String(iso ?? '')
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return esc(s)
  const d = new Date(`${s.slice(0, 10)}T12:00:00Z`)
  return `${s.slice(8, 10)}/${s.slice(5, 7)} ${WEEKDAY[d.getUTCDay()]}`
}
const monthTitle = (m: string) => { const s = new Date(`${m.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }); return s.charAt(0).toUpperCase() + s.slice(1) }
const tag = (t: unknown, cls = '') => (t ? `<span class="tag ${cls}">${esc(t)}</span>` : '')
const ul = (xs: unknown[]) => (xs.length ? `<ul>${xs.map((x) => `<li>${txt(x)}</li>`).join('')}</ul>` : '')
function table(head: string[], rows: string[][], cls = ''): string {
  if (!rows.length) return ''
  return `<div class="tw"><table class="${cls}"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
}

/** As 12 seções do plano (na ordem do documento) + fontes. Seção sem conteúdo não aparece. */
export const PLAN_SECTION_TITLES: { id: string; title: string }[] = [
  { id: 'mercado', title: '1. Diagnóstico do mercado' }, { id: 'estrategia', title: '2. Estratégia' }, { id: 'acao', title: '3. Plano de ação com KPIs' },
  { id: 'trafego', title: '4. Tráfego' }, { id: 'design', title: '5. Design' }, { id: 'social', title: '6. Social media' }, { id: 'audiovisual', title: '7. Audiovisual' },
  { id: 'vendas', title: '8. Estratégia comercial e atendimento' }, { id: 'consultoria', title: '9. Consultoria' }, { id: 'm360', title: '10. Marketing 360' },
  { id: 'offline', title: '11. Marketing off-line' }, { id: 'ideias', title: '12. Ideias' }, { id: 'fontes', title: 'Fontes' },
]

export function planSections(doc: Any | null | undefined): { id: string; title: string }[] {
  const p = (doc?.plano ?? null) as Any | null
  if (!p) return doc?.titulo ? [{ id: 'resumo', title: 'Resumo do mês' }] : []
  const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : !!v)
  const cal = (p.calendario ?? {}) as Any
  const pecas = arr(cal.pecas)
  const ok: Record<string, boolean> = {
    mercado: has(p.diagnostico_mercado?.resumo) || has(p.pesquisa?.concorrentes) || has(p.pesquisa?.tendencias) || has(p.pesquisa?.mercado),
    estrategia: has(p.tese) || has(p.raciocinio) || has(p.ofertas),
    acao: has(p.plano_acao) || has(p.semanas_plano) || has(doc?.semanas) || has(p.pedir_cliente) || has(p.confirmar),
    trafego: has(p.trafego), design: has(p.design) || has(p.marca?.visual),
    social: pecas.some((x) => x.formato !== 'reels') || has(p.series) || has(cal.stories_rotina),
    audiovisual: has(cal.capturas) || pecas.some((x) => x.formato === 'reels'),
    vendas: has(p.vendas), consultoria: has(p.consultoria), m360: has(p.marketing_360), offline: has(p.offline),
    ideias: has(p.ideias) || has(cal.banco_ideias), fontes: has(p.fontes),
  }
  return PLAN_SECTION_TITLES.filter((s) => ok[s.id])
}

function mixBar(mix: Any[]): string {
  const total = mix.reduce((m, x) => m + (Number(x.percentual) || 0), 0) || 100
  const bar = mix.map((x) => `<span style="width:${((Number(x.percentual) || 0) / total) * 100}%;background:${OBJ_COLOR[x.objetivo] ?? '#ccc'}" title="${esc(OBJ_LABEL[x.objetivo] ?? x.objetivo)}"></span>`).join('')
  const legend = mix.map((x) => `<div class="mixrow"><i style="background:${OBJ_COLOR[x.objetivo] ?? '#ccc'}"></i><b>${esc(OBJ_LABEL[x.objetivo] ?? x.objetivo)} ${esc(x.percentual)}%</b><span>${esc(x.papel)}</span></div>`).join('')
  return `<div class="mixbar">${bar}</div>${legend}`
}

function pieceCard(p: Any): string {
  const c = (p.copy ?? null) as Any | null
  const head = `<div class="ph"><b>${esc(p.id)}</b><span>${dayLabel(p.data)}</span>${tag(FORMATO_LABEL[p.formato] ?? p.formato, 'f')}${tag(OBJ_LABEL[p.objetivo] ?? p.objetivo, `o-${esc(p.objetivo)}`)}${tag(FUNIL_LABEL[p.funil] ?? p.funil, 'n')}${p.serie ? tag(p.serie, 's') : ''}${p.vira_anuncio ? tag('Vira anúncio', 'a') : ''}</div>`
  const title = `<h4>${esc(p.titulo)}</h4><p class="muted">${txt(p.ideia)}</p>`
  if (!c) return `<article class="piece">${head}${title}<p class="warn">Copy não ficou pronta nesta geração: escrever a partir da ideia.</p></article>`
  const art = c.direcao_arte ? `<div class="kv"><b>Direção de arte</b><span>Fundo: ${esc(c.direcao_arte.fundo)} · Tipografia: ${esc(c.direcao_arte.tipografia)} · Elementos: ${esc(c.direcao_arte.elementos)} · Imagem: ${esc(c.direcao_arte.foto_ou_video)}</span></div>` : ''
  const slides = arr(c.slides).length ? `<ol class="slides">${arr(c.slides).map((s) => `<li><b>${esc(s.titulo)}</b>${s.texto ? ` ${txt(s.texto)}` : ''}</li>`).join('')}</ol>` : ''
  const cenas = arr(c.roteiro?.cenas)
  const roteiro = cenas.length ? `<div class="kv"><b>Roteiro${c.roteiro?.duracao ? ` (${esc(c.roteiro.duracao)})` : ''}</b></div>${table(['#', 'Imagem', 'Fala', 'Texto na tela'], cenas.map((s, i) => [String(i + 1), txt(s.imagem), txt(s.fala), txt(s.texto_tela)]), 'tight')}${c.roteiro?.fechamento ? `<p><b>Fechamento:</b> ${txt(c.roteiro.fechamento)}</p>` : ''}` : ''
  const onScreen = arr(c.texto_na_tela).length ? `<div class="kv"><b>Texto na tela</b><span>${arr(c.texto_na_tela).map(esc).join(' · ')}</span></div>` : ''
  const caption = c.legenda ? `<div class="caption"><b>Legenda</b><p>${txt(c.legenda)}</p>${arr(c.hashtags).length ? `<p class="muted">${arr(c.hashtags).map((h) => esc(String(h).startsWith('#') ? h : `#${h}`)).join(' ')}</p>` : ''}</div>` : ''
  const ads = arr(c.anuncio).length ? `<div class="kv"><b>Versões para anúncio (testar)</b></div>${table(['Gancho', 'Texto principal', 'Título'], arr(c.anuncio).map((a) => [txt(a.gancho), txt(a.texto_principal), txt(a.titulo)]), 'tight')}` : ''
  const foot = `<div class="pf">${c.cta ? `<span><b>CTA:</b> ${esc(c.cta)}</span>` : ''}${c.metrica ? `<span><b>Funcionou se:</b> ${esc(c.metrica.nome)} ${esc(c.metrica.meta)}</span>` : ''}${p.material ? `<span><b>Material:</b> ${esc(p.material)}</span>` : ''}${p.tendencia_link ? `<span><b>Referência:</b> ${link(p.tendencia_link)}</span>` : ''}</div>`
  const internal = c.observacoes_internas ? `<p class="internal">Interno: ${txt(c.observacoes_internas)}</p>` : ''
  return `<article class="piece">${head}${title}${c.gancho ? `<p class="hook">“${esc(c.gancho)}”</p>` : ''}${art}${slides}${roteiro}${onScreen}${caption}${ads}${foot}${internal}</article>`
}

const CSS = `
:root{--lime:#1FC8DB;--deep:#056F84;--ink:#0B3C44;--paper:#fff;--soft:#EAF6F8;--line:#D9E2E5;--muted:#5D6C73}
*{box-sizing:border-box}html,body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:0 16px 48px}
header.cover{background:var(--ink);color:#fff;padding:28px 16px 22px;border-bottom:6px solid var(--lime)}
header.cover .in{max-width:980px;margin:0 auto}header.cover small{color:var(--lime);font-weight:700;letter-spacing:.08em;text-transform:uppercase}
header.cover h1{margin:6px 0 4px;font-size:28px;line-height:1.15}header.cover p{margin:0;color:#C9CFC2}
nav.toc{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0}nav.toc a{font-size:12px;padding:4px 10px;border-radius:999px;background:var(--soft);color:var(--ink);text-decoration:none;border:1px solid var(--line)}
section{margin-top:28px;break-inside:auto}h2{font-size:20px;margin:0 0 10px;padding-left:10px;border-left:6px solid var(--lime)}
h3{font-size:15px;margin:16px 0 6px}h4{font-size:15px;margin:6px 0 2px}p{margin:6px 0}a{color:var(--deep);overflow-wrap:anywhere}td,li,p{overflow-wrap:anywhere}
.thesis{background:var(--ink);color:#fff;border-radius:14px;padding:18px}.thesis .big{font-size:19px;font-weight:700;line-height:1.35;color:var(--lime)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.card{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff;break-inside:avoid}
.card b.k{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.mixbar{display:flex;height:14px;border-radius:7px;overflow:hidden;margin:12px 0 8px;border:1px solid var(--line)}.mixbar span{display:block;height:100%}
.mixrow{display:flex;gap:8px;align-items:baseline;margin:3px 0}.mixrow i{width:10px;height:10px;border-radius:2px;display:inline-block;flex:none}.mixrow span{color:var(--muted)}
.tw{overflow-x:auto;margin:8px 0}table{width:100%;border-collapse:collapse;font-size:13px}th{background:var(--ink);color:#fff;text-align:left;padding:7px 8px;font-weight:600}
td{border-bottom:1px solid var(--line);padding:7px 8px;vertical-align:top}tbody tr:nth-child(even) td{background:#FAFCF4}table.tight td{padding:5px 6px}
.tag{display:inline-block;font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;background:var(--soft);border:1px solid var(--line);margin-right:4px}
.tag.o-vender{background:var(--deep);color:#fff;border-color:var(--deep)}.tag.o-autoridade{background:var(--ink);color:#fff;border-color:var(--ink)}.tag.o-posicionamento{background:var(--lime);border-color:var(--lime)}
.tag.a{background:#fff;border-color:var(--deep);color:var(--deep)}
.piece{border:1px solid var(--line);border-left:5px solid var(--lime);border-radius:12px;padding:12px 14px;margin:12px 0;break-inside:avoid-page}
.ph{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px}.ph b{font-size:13px}.hook{font-size:16px;font-weight:700;margin:8px 0}
.kv{margin:6px 0}.kv b{display:block;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
ol.slides{margin:6px 0 6px 18px;padding:0}ol.slides li{margin:3px 0}
.caption{background:var(--soft);border-radius:10px;padding:8px 10px;margin:8px 0}.caption b{font-size:12px;color:var(--muted);text-transform:uppercase}
.pf{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;margin-top:6px}.muted{color:var(--muted)}.warn{color:#9A5B00}
.internal{font-size:12px;color:#7A4B00;background:#FFF6DF;border-radius:8px;padding:6px 8px}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chips span{font-size:12px;padding:2px 8px;border-radius:999px;border:1px solid var(--line)}.chips.no span{border-color:#E9B4B4;color:#8A2B2B}
footer{margin-top:36px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:10px}
@media (max-width:600px){header.cover h1{font-size:22px}.thesis .big{font-size:16px}table{font-size:12px}}
@media print{@page{size:A4;margin:14mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}nav.toc{display:none}header.cover{padding:18px 0}.wrap{padding:0}a{color:var(--ink)}}
`

/** HTML completo do plano de execução (página inteira, pronta para ver ou imprimir). only: só a seção de uma área. */
export function planHtml({ name, month, doc, only }: PlanInput & { only?: string | null }): string {
  const d = (doc ?? {}) as Any
  const p = (d.plano ?? null) as Any | null
  let secs = planSections(d)
  const blocks: Record<string, string> = {}
  const sec = (id: string, inner: string) => { const t = PLAN_SECTION_TITLES.find((x) => x.id === id)?.title ?? id; blocks[id] = `<section id="${id}"><h2>${esc(t)}</h2>${inner}</section>` }
  if (!p) {
    blocks.resumo = `<section id="resumo"><h2>Resumo do mês</h2><p class="warn">Este plano foi gerado na versão anterior (sem calendário, copy e pesquisa). Gere de novo para ter o plano de execução completo.</p>
      ${d.titulo ? `<p><b>${esc(d.titulo)}</b></p>` : ''}${d.foco ? `<p>${txt(d.foco)}</p>` : ''}
      ${table(['Semana', 'Tema', 'Objetivo'], arr(d.semanas).map((w) => [esc(w.semana), esc(w.tema), txt(w.objetivo)]))}</section>`
  } else {
    const ok = new Set(secs.map((x) => x.id))
    const cal = (p.calendario ?? {}) as Any
    const pecas = arr(cal.pecas)
    // 1. Mercado (curto: o diagnóstico é o passado)
    const dm = (p.diagnostico_mercado ?? {}) as Any
    const pq = (p.pesquisa ?? {}) as Any
    if (ok.has('mercado')) sec('mercado', `${dm.resumo ? `<p><b>${txt(dm.resumo)}</b></p>` : ''}
      ${arr(dm.pontos).length ? table(['Fato', 'O que muda no mês'], arr(dm.pontos).map((x) => [`${txt(x.fato)}<br>${link(x.link)}`, txt(x.implicacao)])) : ''}
      ${arr(pq.concorrentes).length ? `<h3>Concorrentes: o que fazem agora</h3>${table(['Concorrente', 'O que faz agora', 'Números', 'Como usamos'], arr(pq.concorrentes).map((c) => [`<b>${esc(c.nome)}</b><br>${link(c.link)}`, txt(c.o_que_faz_agora), txt(c.numeros), txt(c.como_usamos)]))}` : ''}
      ${arr(pq.tendencias).length ? `<h3>Tendências e virais</h3>${table(['Tendência', 'Onde e números', 'Por que serve', 'Ideia de uso'], arr(pq.tendencias).map((x) => [`<b>${esc(x.tendencia)}</b><br>${link(x.link)}`, `${esc(x.plataforma)}<br><span class="muted">${txt(x.numeros)}</span>`, txt(x.por_que_serve), txt(x.ideia)]))}` : ''}
      ${arr(pq.referencias).length ? `<h3>Referências de fora</h3>${table(['Referência', 'O que faz', 'Como usamos'], arr(pq.referencias).map((x) => [`<b>${esc(x.nome)}</b><br>${link(x.link)}`, txt(x.o_que_faz), txt(x.como_usamos)]))}` : ''}
      ${arr(pq.mercado).length ? `<h3>Mercado</h3>${table(['Fato', 'O que muda no mês'], arr(pq.mercado).map((x) => [`${txt(x.fato)}<br>${link(x.link)}`, txt(x.implicacao)]))}` : ''}
      ${arr(pq.datas).length ? `<h3>Datas do mês</h3>${table(['Data', 'O quê', 'Uso'], arr(pq.datas).map((x) => [esc(x.data), esc(x.nome), txt(x.uso)]))}` : ''}`)
    // 2. Estratégia
    const t = (p.tese ?? {}) as Any
    if (ok.has('estrategia')) sec('estrategia', `${t.posicionamento ? `<div class="thesis"><div class="big">${txt(t.posicionamento)}</div>${t.percepcao ? `<p><b>Percepção que vamos construir:</b> ${txt(t.percepcao)}</p>` : ''}${t.porque ? `<p><b>Por quê:</b> ${txt(t.porque)}</p>` : ''}</div>` : ''}
      <div class="grid" style="margin-top:10px">${t.venda ? `<div class="card"><b class="k">Como gera venda</b>${txt(t.venda)}</div>` : ''}${t.autoridade ? `<div class="card"><b class="k">Como constrói autoridade</b>${txt(t.autoridade)}</div>` : ''}${d.meta ? `<div class="card"><b class="k">Meta do mês</b><b>${esc(d.meta.numero)}</b> ${txt(d.meta.texto)}<br><span class="muted">${txt(d.meta.como_medir)}</span></div>` : ''}</div>
      ${arr(p.mix).length ? `<h3>Mix de conteúdo por objetivo</h3>${mixBar(arr(p.mix))}` : ''}
      ${arr(p.raciocinio).length ? `<h3>Dado → decisão → ação → número</h3>${table(['Dado', 'Decisão', 'Ação', 'Número esperado'], arr(p.raciocinio).map((r) => [`${txt(r.dado)}<br><span class="muted">${txt(r.fonte)}</span>`, txt(r.decisao), txt(r.acao), `<b>${txt(r.numero_esperado)}</b>`]))}` : ''}
      ${arr(p.ofertas).length ? `<h3>Ofertas do mês</h3>${table(['Oferta', 'Para quem', 'O que inclui', 'Condição', 'Preço e âncora', 'Validade e canal', 'Por quê'], arr(p.ofertas).map((o) => [`<b>${esc(o.nome)}</b>`, txt(o.para_quem), txt(o.o_que_inclui), txt(o.condicao), txt(o.preco_e_ancora), `${txt(o.validade)}<br>${txt(o.canal)}`, txt(o.porque)]))}` : ''}`)
    // 3. Plano de ação com KPIs
    const sp = arr(p.semanas_plano)
    if (ok.has('acao')) sec('acao', `${sp.length || arr(d.semanas).length ? `<div class="grid">${[1, 2, 3, 4].map((n) => {
      const a = sp.find((x) => Number(x.semana) === n) ?? {}
      const b = arr(d.semanas).find((x) => Number(x.semana) === n) ?? {}
      return `<div class="card"><b class="k">Semana ${n}${b.tema ? ` · ${esc(b.tema)}` : ''}</b>${txt(a.intencao ?? b.objetivo)}${a.kpi ? `<p><b>${esc(a.kpi)}:</b> ${esc(a.meta)}</p>` : ''}${arr(b.datas).length ? `<p class="muted">${arr(b.datas).map(esc).join(' · ')}</p>` : ''}</div>`
    }).join('')}</div>` : ''}
      ${arr(p.plano_acao).length ? table(['Semana', 'Ação', 'Responsável', 'Prazo', 'KPI', 'Hoje → meta'], arr(p.plano_acao).map((r) => [esc(r.semana), txt(r.acao), esc(r.responsavel), esc(r.prazo), esc(r.kpi), `${esc(r.ponto_de_partida)} → <b>${esc(r.meta)}</b>`])) : ''}
      ${arr(p.pedir_cliente).length ? `<h3>O que pedir ao cliente</h3>${table(['Até', 'O quê', 'Por quê'], arr(p.pedir_cliente).map((x) => [`<b>${esc(x.ate)}</b>`, txt(x.item), txt(x.porque)]))}` : ''}
      ${arr(p.confirmar).length ? `<h3>A confirmar (interno)</h3>${ul(arr(p.confirmar))}` : ''}`)
    // 4. Tráfego
    const tr = (p.trafego ?? null) as Any | null
    if (tr) sec('trafego', `<p>${txt(tr.resumo)}</p>${tr.verba_mes ? `<p><b>Verba do mês (sugestão):</b> ${txt(tr.verba_mes)}</p>` : ''}
      ${table(['Campanha', 'Objetivo', '% da verba', 'Verba/dia', 'Por quê'], arr(tr.divisao).map((x) => [`<b>${esc(x.campanha)}</b>`, esc(x.objetivo), `${esc(x.percentual)}%`, esc(x.verba_dia), txt(x.porque)]))}
      ${arr(tr.campanhas).map((c) => `<h3>${esc(c.nome)}</h3><p class="muted">${esc(c.objetivo)} · destino: ${esc(c.destino)}</p>${table(['Conjunto', 'Público', 'Verba/dia', 'Criativos'], arr(c.conjuntos).map((s) => [`<b>${esc(s.nome)}</b>`, txt(s.publico), esc(s.verba_dia), arr(s.criativos).map(esc).join(', ')]), 'tight')}<p><b>Corte:</b> ${txt(c.corte)}<br><b>Escala:</b> ${txt(c.escala)}</p>`).join('')}
      ${arr(tr.testes).length ? `<h3>Testes A/B</h3>${table(['Hipótese', 'Como', 'Métrica', 'Prazo'], arr(tr.testes).map((x) => [txt(x.hipotese), txt(x.como), txt(x.metrica), esc(x.prazo)]))}` : ''}
      ${arr(tr.kpis_semana).length ? `<h3>KPI por semana</h3>${table(['Semana', 'KPI', 'Meta'], arr(tr.kpis_semana).map((x) => [esc(x.semana), esc(x.kpi), `<b>${esc(x.meta)}</b>`]))}` : ''}
      ${arr(tr.anuncios).length ? `<h3>Anúncios e variações</h3>${table(['Peça', 'Conjunto e público', 'Criativo', 'Texto principal e ganchos', 'Título e CTA'], arr(tr.anuncios).map((x) => [`<b>${esc(x.peca_id)}</b>`, `${esc(x.conjunto)}<br><span class="muted">${txt(x.publico)}</span>`, txt(x.criativo), `${txt(x.texto_principal)}${arr(x.variacoes).length ? `<br><span class="muted">${arr(x.variacoes).map(esc).join('<br>')}</span>` : ''}`, `${esc(x.titulo)}<br>${esc(x.cta)}`]))}` : ''}`)
    // 5. Design
    const dz = (p.design ?? null) as Any | null
    const mv = (p.marca?.visual ?? {}) as Any
    if (ok.has('design')) sec('design', `${dz?.ideia_visual ? `<p><b>${txt(dz.ideia_visual)}</b></p>` : mv.ideia_central ? `<p><b>${txt(mv.ideia_central)}</b></p>` : ''}
      <div class="grid">${(dz?.identidade_aplicada ? [['Cores', dz.identidade_aplicada.cores], ['Tipografia', dz.identidade_aplicada.tipografia], ['Imagem', dz.identidade_aplicada.imagem], ['Elementos fixos', dz.identidade_aplicada.elementos_fixos]] : [['Cores', mv.cores], ['Tipografia', mv.tipografia], ['Fotografia e vídeo', mv.fotografia], ['Elementos fixos', mv.elementos]]).filter((x) => x[1]).map(([k, v]) => `<div class="card"><b class="k">${k}</b>${txt(v)}</div>`).join('')}</div>
      ${arr(dz?.layouts).length ? `<h3>Layouts do mês</h3>${table(['Layout', 'Estrutura', 'Usar em'], arr(dz!.layouts).map((x) => [`<b>${esc(x.nome)}</b>`, txt(x.estrutura), txt(x.uso)]))}` : ''}
      ${arr(dz?.pecas_chave).length ? `<h3>Peças-chave</h3>${table(['Peça', 'Por que importa', 'Layout', 'Cuidado'], arr(dz!.pecas_chave).map((x) => [`<b>${esc(x.peca_id)}</b>`, txt(x.por_que), esc(x.layout), txt(x.cuidado)]))}` : ''}
      ${arr(mv.regras).length ? `<h3>Regras visuais</h3>${ul(arr(mv.regras))}` : ''}${[...arr(dz?.nao_fazer), ...arr(mv.nao_fazer)].length ? `<h3>Não fazer</h3>${ul([...arr(dz?.nao_fazer), ...arr(mv.nao_fazer)])}` : ''}`)
    // 6. Social media
    const mc = (p.marca?.copy ?? {}) as Any
    const feed = pecas.filter((x) => x.formato !== 'reels')
    if (ok.has('social')) sec('social', `${cal.ritmo ? `<p><b>Ritmo:</b> ${txt(cal.ritmo)}</p>` : ''}
      ${arr(p.series).length ? `<h3>Séries de conteúdo</h3>${table(['#', 'Série', 'Formato e frequência', 'Objetivo', 'O que é', 'Episódios'], arr(p.series).map((x) => [esc(x.codigo), `<b>${esc(x.nome)}</b>`, `${esc(x.formato)}<br>${esc(x.frequencia)}`, esc(OBJ_LABEL[x.objetivo] ?? x.objetivo), txt(x.o_que_e), arr(x.episodios).map(esc).join(' · ')]))}` : ''}
      ${pecas.length ? `<h3>Calendário</h3>${table(['Data', 'Peça', 'Formato', 'Série', 'Objetivo', 'Funil', 'Material'], pecas.map((x) => [dayLabel(x.data), `<b>${esc(x.id)}</b> ${esc(x.titulo)}${x.vira_anuncio ? ' ' + tag('anúncio', 'a') : ''}`, esc(FORMATO_LABEL[x.formato] ?? x.formato), esc(x.serie), esc(OBJ_LABEL[x.objetivo] ?? x.objetivo), esc(FUNIL_LABEL[x.funil] ?? x.funil), txt(x.material)]))}` : ''}
      ${arr(cal.nao_postar).length ? `<h3>Sem post</h3>${ul(arr(cal.nao_postar).map((x) => `${x.data}: ${x.motivo}`))}` : ''}
      ${mc.tom || arr(mc.usar).length ? `<h3>Regras de texto</h3>${mc.tom ? `<p>${txt(mc.tom)}</p>` : ''}${arr(mc.usar).length ? `<div class="chips">${arr(mc.usar).map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}${arr(mc.evitar).length || arr(mc.palavras_proibidas).length ? `<div class="chips no" style="margin-top:6px">${[...arr(mc.evitar), ...arr(mc.palavras_proibidas)].map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}` : ''}
      ${feed.length ? `<h3>Copy de cada peça</h3>${feed.map(pieceCard).join('')}` : ''}
      ${arr(cal.stories_rotina).length || arr(cal.stories_extras).length ? `<h3>Stories</h3>${table(['Dia', 'Quadro', 'Sequência'], arr(cal.stories_rotina).map((x) => [esc(x.dia), `<b>${esc(x.quadro)}</b>`, txt(x.sequencia)]))}
      ${arr(cal.stories_extras).length ? table(['Data', 'Sequência', 'Telas'], arr(cal.stories_extras).map((x) => [esc(x.data), `<b>${esc(x.nome)}</b>`, txt(x.telas)])) : ''}` : ''}
      ${arr(cal.destaques).length ? `<p><b>Destaques fixos:</b> ${arr(cal.destaques).map(esc).join(' · ')}</p>` : ''}`)
    // 7. Audiovisual
    const reels = pecas.filter((x) => x.formato === 'reels')
    if (ok.has('audiovisual')) sec('audiovisual', `${arr(cal.capturas).length ? `<h3>Pauta de captação</h3>${table(['Data', 'Onde e quem', 'Quem apresenta', 'Lista de cenas', 'Peças'], arr(cal.capturas).map((x) => [esc(x.data), `${txt(x.onde)}<br><span class="muted">${txt(x.quem)}</span>`, txt(x.quem_apresenta), arr(x.o_que_gravar).map(esc).join('<br>'), arr(x.pecas).map(esc).join(', ')]))}` : ''}
      ${reels.length ? `<h3>Roteiros</h3>${reels.map(pieceCard).join('')}` : ''}`)
    // 8. Vendas
    const v = (p.vendas ?? null) as Any | null
    if (v) sec('vendas', `${arr(v.ofertas).length ? `<h3>Ofertas do mês</h3>${table(['Oferta', 'Para quem e o que inclui', 'Preço e âncora', 'Prazo e garantia', 'Canal'], arr(v.ofertas).map((o) => [`<b>${esc(o.nome)}</b>`, `${txt(o.para_quem)}<br><span class="muted">${txt(o.o_que_inclui)}</span>`, `<b>${esc(o.preco)}</b><br><span class="muted">${txt(o.ancora_concorrente)}</span>`, `${txt(o.escassez_prazo)}<br>${txt(o.garantia)}`, esc(o.canal)]))}` : ''}
      ${v.funil ? `<h3>Funil e metas</h3><div class="grid">${[['Leads', v.funil.leads], ['Conversas', v.funil.conversas], ['Vendas', v.funil.vendas], ['Ticket médio', v.funil.ticket_medio], ['Receita', v.funil.receita_meta]].map(([k, x]) => `<div class="card"><b class="k">${k}</b><b>${esc(x)}</b></div>`).join('')}</div><p class="muted">${txt(v.funil.premissas_conversao)}</p>` : ''}
      ${v.sla ? `<h3>Atendimento (SLA)</h3><p><b>Primeira resposta:</b> ${esc(v.sla.primeira_resposta)} · ${esc(v.sla.quem_responde)} · ${esc(v.sla.horario)}<br>${txt(v.sla.regra)}</p>` : ''}
      <h3>Caminho até a venda</h3><p>${txt(v.caminho)}</p>
      ${table(['Etapa', 'Mensagem pronta'], arr(v.script).map((x) => [`<b>${esc(x.etapa)}</b>`, txt(x.mensagem)]))}
      ${arr(v.follow_up).length ? `<h3>Follow-up</h3>${table(['Quando', 'Mensagem'], arr(v.follow_up).map((x) => [esc(x.quando), txt(x.mensagem)]))}` : ''}
      ${arr(v.objecoes).length ? `<h3>Objeções e respostas</h3>${table(['Objeção', 'De onde', 'Resposta'], arr(v.objecoes).map((x) => [`<b>${esc(x.objecao)}</b>`, esc(x.de_onde), txt(x.resposta)]))}` : ''}
      ${arr(v.upsell).length ? `<h3>Upsell e cross-sell</h3>${table(['Quando', 'Oferta', 'Mensagem'], arr(v.upsell).map((x) => [esc(x.quando), txt(x.oferta), txt(x.mensagem)]))}` : ''}
      ${arr(v.reativacao).length ? `<h3>Reativação de clientes antigos</h3>${table(['Público', 'Oferta', 'Mensagem'], arr(v.reativacao).map((x) => [esc(x.publico), txt(x.oferta), txt(x.mensagem)]))}` : ''}
      ${arr(v.indicacao_parcerias).length ? `<h3>Indicação e parcerias</h3>${table(['Ação', 'Como funciona', 'Recompensa'], arr(v.indicacao_parcerias).map((x) => [`<b>${esc(x.acao)}</b>`, txt(x.como), txt(x.recompensa)]))}` : ''}
      ${arr(v.indicadores).length ? `<h3>KPIs</h3>${table(['Indicador', 'Hoje', 'Meta'], arr(v.indicadores).map((x) => [esc(x.indicador), esc(x.ponto_de_partida), `<b>${esc(x.meta)}</b>`]))}` : ''}
      ${arr(v.combinar_com_cliente).length ? `<h3>Combinar com o cliente</h3>${ul(arr(v.combinar_com_cliente))}` : ''}`)
    // 9 a 12
    if (ok.has('consultoria')) sec('consultoria', table(['Tema', 'Recomendação', 'Por quê', 'Impacto'], arr(p.consultoria).map((x) => [`<b>${esc(x.tema)}</b>`, txt(x.recomendacao), txt(x.porque), txt(x.impacto)])))
    if (ok.has('m360')) sec('m360', `${p.marketing_360?.resumo ? `<p><b>${txt(p.marketing_360.resumo)}</b></p>` : ''}${table(['Canal', 'Papel', 'Ação do mês', 'Conecta com'], arr(p.marketing_360?.canais).map((x) => [`<b>${esc(x.canal)}</b>`, txt(x.papel), txt(x.acao_do_mes), txt(x.conecta_com)]))}`)
    if (ok.has('offline')) sec('offline', table(['Onde', 'Ação', 'Quando', 'Custo'], arr(p.offline).map((x) => [`<b>${esc(x.onde)}</b>`, txt(x.acao), esc(x.quando), esc(x.custo)])))
    if (ok.has('ideias')) sec('ideias', `${arr(p.ideias).length ? table(['Tipo', 'Ideia', 'Quando'], arr(p.ideias).map((x) => [esc(x.tipo), txt(x.ideia), esc(x.quando)])) : ''}${arr(cal.banco_ideias).length ? `<h3>Banco de ideias de conteúdo</h3>${ul(arr(cal.banco_ideias).map((x) => `${x.tipo === 'video' ? 'Vídeo' : 'Arte'}: ${x.ideia}`))}` : ''}`)
    if (ok.has('fontes')) sec('fontes', `<ul>${arr(p.fontes).map((f) => `<li>${link(f.url, f.title || undefined)}</li>`).join('')}</ul>${p.varredura?.aviso ? `<p class="muted">${esc(p.varredura.aviso)}</p>` : ''}`)
  }
  if (only && blocks[only]) secs = secs.filter((x) => x.id === only)
  const parts = secs.map((x) => blocks[x.id]).filter(Boolean)
  const toc = secs.length > 1 ? `<nav class="toc">${secs.map((s) => `<a href="#${s.id}">${esc(s.title)}</a>`).join('')}</nav>` : ''
  const when = d.gerado_em ? new Date(String(d.gerado_em)).toLocaleDateString('pt-BR') : ''
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plano de execução · ${esc(name)} · ${esc(monthTitle(month))}</title><style>${CSS}</style></head><body>
<header class="cover"><div class="in"><small>Plano de execução · uso da equipe${only && blocks[only] ? ` · ${esc(secs[0]?.title ?? '')}` : ''}</small><h1>${esc(name)} · ${esc(monthTitle(month))}</h1><p>${esc(d.titulo ?? '')}</p></div></header>
<div class="wrap">${toc}${parts.join('\n')}<footer>Peformake · assessoria de marketing${when ? ` · gerado em ${esc(when)}` : ''}. Documento interno: a apresentação do cliente é outra.</footer></div></body></html>`
}

/** Abre o plano numa aba e chama a impressão (salvar como PDF). */
export function printPlan(input: PlanInput & { only?: string | null }) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(planHtml(input))
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 500)
}
