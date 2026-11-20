// PDF da Estratégia interativa: modelo FIXO, sem IA. Só os cards APROVADOS e marcados "Incluir no PDF".
// Identidade Peformake (ciano #1FC8DB, petróleo #056F84, azul-escuro #0B3C44, branco) em tudo;
// o Audiovisual na identidade Ellcazo: verde-limão #B5E61D ou branco (intercalando), preto só nos detalhes (nunca fundo preto),
// Inter, borda de 2px, cantos de 12 a 14px, sombra chapada; uma página por vídeo com a prévia da referência e o botão para assistir.
// Função pura (sem navegador): a tela usa para imprimir/salvar e o agente usa para gerar o PDF com o Chromium.
import { ellcazoSvg } from '@/components/ui/ellcazoSvg'
import type { StrategyCard } from './cardRules'
import { editPart, narrationPart, SHOT_LABEL, shootPart, sentenceCase, shotSvg, twoRowCols, videoHead, type Ref } from './avParts'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
export interface DocInput {
  name: string; month: string; cards: StrategyCard[]; logoUrl?: string | null; peformakeLogoUrl?: string | null; ellcazoLogoUrl?: string | null
  /** Capas das referências já embutidas (link → data URI), buscadas na hora de gerar (refThumbs.ts). Sem elas: só o YouTube tem capa. */
  thumbs?: Record<string, string>
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const nl = (v: unknown) => esc(v).replace(/\n/g, '<br>')
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const monthTitle = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1] ?? ''} de ${m.slice(0, 4)}`
const url = (l?: string) => (!l ? '' : /^https?:\/\//.test(l) ? l : `https://${l}`)
const ytThumb = (l?: string) => { const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(l ?? ''); return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : '' }
let TH: Record<string, string> = {}
/** Capa da referência no PDF: a buscada na hora (qualquer rede) ou, sem ela, a do YouTube. */
const coverOf = (l?: string) => (!l ? '' : TH[l] || TH[url(l)] || ytThumb(l))

/** Links de referência dos cards que vão para o PDF (para buscar as capas antes de gerar). */
export function pdfRefLinks(cards: StrategyCard[]): string[] {
  const out = new Set<string>()
  for (const c of pdfCards(cards)) for (const l of [c.data?.referencia?.link, c.data?.referencia_visual?.link, c.tab === 'referencias' ? c.data?.link : null, c.tab === 'audiovisual' ? c.inspired?.link : null]) if (l) out.add(url(String(l)))
  return [...out]
}

/** Os cards que entram no PDF: aprovados e marcados. */
export function pdfCards(cards: StrategyCard[]): StrategyCard[] {
  return cards.filter((c) => c.status === 'aprovado' && c.in_pdf).sort((a, b) => a.position - b.position)
}
/** Nome do arquivo no padrão da pasta do cliente ("Estratégia · 01-12 a 31-12-2026"). */
export function docName(month: string): string {
  const y = Number(month.slice(0, 4)); const m = Number(month.slice(5, 7))
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return `Estratégia · 01-${mm} a ${last}-${mm}-${y}`
}

/** Nome do arquivo só com as narrações (o que vai ao cliente): "Audiovisual · Para o cliente · 01-12 a 31-12-2026". */
export function avClientDocName(month: string): string {
  return `Audiovisual · Para o cliente · ${docName(month).split(' · ')[1]}`
}

/** Sem selos de funil/serve/meta no documento (Italo, 18/11): o PDF é para ler e gravar. */
const meta = (_c: StrategyCard) => ''
const list = (xs: unknown[] | undefined, f: (x: Any, i: number) => string) => (xs ?? []).map(f).join('')

function pfPage(title: string, kicker: string, body: string, dark = false) {
  return `<section class="page pf ${dark ? 'dark' : ''}"><header><span class="k">${esc(kicker)}</span><h2>${esc(title)}</h2></header>${body}<footer>Peformake · assessoria de marketing</footer></section>`
}

function resumo(cs: StrategyCard[]) {
  const by = (k: string) => cs.filter((c) => c.kind === k)
  const tese = by('tese')[0]
  const block = (label: string, xs: StrategyCard[], f: (c: StrategyCard) => string) => xs.length ? `<h3>${label}</h3><div class="grid">${xs.map((c) => `<div class="card"><b>${esc(c.title)}</b>${f(c)}<p class="meta">${meta(c)}</p></div>`).join('')}</div>` : ''
  return pfPage('Estratégia do mês', 'Estratégia', `
    ${tese ? `<div class="tese"><span class="k">Tese do mês</span><p class="big">${esc(tese.title)}</p><p>${nl(tese.data.texto)}</p></div>` : ''}
    ${block('Objetivos', by('objetivo'), (c) => `<p class="num">${esc(c.data.numero)}</p><p>${esc(c.data.como_medir)}</p>`)}
    ${block('Ações do mês', by('acao'), (c) => `<p>${nl(c.data.o_que)}</p>${c.data.oferta ? `<p class="mut">Oferta: ${esc(c.data.oferta)}${c.data.quando ? ` · ${esc(c.data.quando)}` : ''}</p>` : ''}${(c.data.opcoes ?? []).length ? `<ol>${list(c.data.opcoes, (o) => `<li>${o.link ? `<a href="${esc(url(o.link))}">${esc(o.nome || o.link)}</a>` : `<b>${esc(o.nome)}</b>`}${o.porque ? ` · ${esc(o.porque)}` : ''}</li>`)}</ol>` : ''}`)}
    ${block('Ofertas', by('oferta'), (c) => `<p>${esc(c.data.condicao)}</p><p class="mut">${esc(c.data.quando)}</p>`)}
    ${block('Datas', by('data'), (c) => `<p class="num">${esc(c.data.dia)}</p><p>${esc(c.data.uso)}</p>`)}
    ${block('Decisões', by('decisao'), (c) => `<p>${esc(c.data.porque)}</p>`)}`)
}

function social(cs: StrategyCard[]) {
  return cs.map((c, i) => pfPage(c.title, `Social media · peça ${i + 1} de ${cs.length}`, `
    <p class="meta">${[c.data.formato ? `<span class="tag">${esc(c.data.formato)}</span>` : '', c.data.data_sugerida ? `<span class="mut">Data: ${esc(c.data.data_sugerida)}</span>` : '', meta(c)].filter(Boolean).join(' ')}</p>
    <div class="two"><div><h3>Ideia</h3><p>${nl(c.data.ideia)}</p><h3>Copy</h3><p>${nl(c.data.copy)}</p>${(c.data.slides ?? []).length ? `<h3>Slides</h3><ol>${list(c.data.slides, (s) => `<li>${esc(s)}</li>`)}</ol>` : ''}</div>
    <div><h3>Legenda</h3><p class="box">${nl(c.data.legenda)}</p><h3>Chamada</h3><p>${esc(c.data.cta)}</p><h3>Imagem (foto real)</h3><p>${nl(c.data.ideia_imagem)}</p>${c.data.referencia_visual?.link ? `${coverOf(c.data.referencia_visual.link) ? `<a href="${esc(url(c.data.referencia_visual.link))}"><img class="refimg" src="${esc(coverOf(c.data.referencia_visual.link))}" alt="Referência visual"></a>` : ''}<p><a href="${esc(url(c.data.referencia_visual.link))}">Referência visual</a> · ${esc(c.data.referencia_visual.porque)}</p>` : ''}</div></div>`)).join('')
}

function trafego(cs: StrategyCard[]) {
  return cs.map((c) => pfPage(c.title, 'Tráfego pago', `
    <p class="meta">${meta(c)}</p>
    <div class="two"><div><h3>Objetivo</h3><p>${esc(c.data.objetivo)}</p><h3>Público</h3><p>${nl(c.data.publico)}</p><h3>Criativo</h3><p>${nl(c.data.criativo)}</p></div>
    <div><h3>Verba por dia</h3>${list(c.data.verba_opcoes, (o) => `<div class="card"><b>${esc(o.valor_dia)}</b><p>${esc(o.o_que_esperar)}</p></div>`)}
    <h3>Teste A/B</h3><p><b>A:</b> ${esc(c.data.teste_ab?.a)}<br><b>B:</b> ${esc(c.data.teste_ab?.b)}<br><span class="mut">${esc(c.data.teste_ab?.como_decidir)}</span></p></div></div>`)).join('')
}

function atendimento(cs: StrategyCard[]) {
  const plano = cs.filter((c) => c.kind === 'plano').map((c) => pfPage(c.title, 'Plano de vendas', `
    <div class="grid">${[['Meta do mês', c.data.meta], ['Ticket', c.data.ticket], ['Quem vende', c.data.quem_vende]].filter(([, v]) => v).map(([k, v]) => `<div class="card"><span class="k">${k}</span><p class="num">${esc(v)}</p></div>`).join('')}</div>
    ${(c.data.canais ?? []).length ? `<h3>Canais</h3><p>${(c.data.canais as string[]).map(esc).join(' · ')}</p>` : ''}
    <div class="two"><div>${(c.data.etapas ?? []).length ? `<h3>Etapas da venda</h3><ol>${list(c.data.etapas, (e) => `<li><b>${esc(e.etapa)}</b>${e.o_que_fazer ? ` · ${esc(e.o_que_fazer)}` : ''}${e.quem ? ` <span class="mut">(${esc(e.quem)})</span>` : ''}</li>`)}</ol>` : ''}</div>
    <div>${(c.data.semanas ?? []).length ? `<h3>Meta por semana</h3>${list(c.data.semanas, (w) => `<p><b>${esc(w.semana)}</b> · ${esc(w.meta)}${w.foco ? ` <span class="mut">· ${esc(w.foco)}</span>` : ''}</p>`)}` : ''}</div></div>`)).join('')
  return plano + cs.filter((c) => c.kind !== 'plano').map((c) => pfPage(c.title, 'Plano de vendas · WhatsApp', `
    <div class="two"><div><h3>Roteiro</h3>${list(c.data.roteiro_whatsapp, (m) => `<p class="bubble">${nl(m)}</p>`)}</div>
    <div><h3>Objeções</h3>${list(c.data.objecoes, (o) => `<div class="card"><b>${esc(o.objecao)}</b><p>${nl(o.resposta)}</p></div>`)}
    <h3>Follow-up</h3>${list(c.data.follow_up, (o) => `<p><b>${esc(o.quando)}:</b> ${nl(o.mensagem)}</p>`)}</div></div>`)).join('')
}

function referencias(cs: StrategyCard[]) {
  if (!cs.length) return ''
  return pfPage('Referências', 'Concorrentes e inspirações', `<div class="grid">${cs.map((c) => `<div class="card"><span class="k">${c.kind === 'concorrente' ? 'Concorrente' : c.kind === 'outro_nicho' ? 'Outro nicho' : c.kind === 'anuncio' ? 'Anúncio' : 'Referência'}</span>${coverOf(c.data.link) ? `<a href="${esc(url(c.data.link))}"><img class="refimg" src="${esc(coverOf(c.data.link))}" alt=""></a>` : ''}<b>${esc(c.title)}</b><p>${esc(c.data.porque)}</p>${c.data.numero ? `<p class="num">${esc(c.data.numero)}</p>` : ''}${c.data.link ? `<p><a href="${esc(url(c.data.link))}">${esc(String(c.data.link).replace(/^https?:\/\/(www\.)?/, '').slice(0, 48))}</a></p>` : ''}</div>`).join('')}</div>`)
}

/** Cabeçalho e rodapé Ellcazo das páginas de vídeo. */
const ezHead = (client: string, month: string, part: string) => `<header class="ezh"><div><span class="bar"></span><span class="k2">${esc(part)} · ${esc(monthTitle(month))}</span><b class="who">${esc(client)}</b></div><span class="ezmark">${ellcazoSvg('#1d1f1a', 84)}</span></header>`
const ezFoot = (right: string) => `<footer class="ezf"><b>ELLCAZO STUDIO</b><span>${esc(right)}</span></footer>`
const refRow = (r: Ref | null, label = '▶ Assistir a referência') => {
  if (!r) return ''
  const ref = url(r.link); const thumb = r.thumb || coverOf(ref)
  return `<div class="refrow">${thumb ? `<a href="${esc(ref)}"><img src="${esc(thumb)}" alt=""></a>` : ''}<div><a class="btn" href="${esc(ref)}">${esc(label)}</a>${r.porque ? `<p class="small">${esc(r.porque)}</p>` : ''}</div></div>`
}

/** Página 1 (para o cliente): só a fala completa e as perguntas. */
function avNarration(c: StrategyCard, i: number) {
  const p = narrationPart(c, i)
  let q = 0
  const paras = p.paras.map((x) => `${x.speaker ? `<p class="spk">${esc(x.speaker)}</p>` : ''}${x.pergunta ? `<p class="spk">Pergunta ${++q}</p><p class="q">“${esc(x.text)}”</p>` : x.livre ? '<p class="pts">Resposta espontânea</p>' : `<p class="fala">${nl(x.text)}</p>`}`).join('')
  const qs = p.questions.map((x, k) => `<p class="spk">Pergunta ${q + k + 1}</p><p class="q">“${esc(x.pergunta)}”</p>${x.pontos ? `<p class="pts">${esc(x.pontos)}</p>` : ''}`).join('')
  const cola = p.cola.length ? `<ul class="cola">${p.cola.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''
  return `${paras}${qs}${cola}` || '<p class="pts">(sem fala escrita)</p>'
}

/** Página 2 (Ellcazo): a montagem em quadros, o que captar, aproveite a gravação e a referência (só se existir). */
function avShoot(c: StrategyCard) {
  const p = shootPart(c)
  const n = p.shots.length
  const cols = twoRowCols(n)
  const est = p.estrutura.nome || p.estrutura.passos.length
    ? `<div class="est"><span class="k2">Estrutura</span>${p.estrutura.nome ? `<b>${esc(p.estrutura.nome)}</b>` : ''}${p.estrutura.passos.length ? `<ol class="steps">${p.estrutura.passos.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}</div>` : ''
  const sb = n ? `<span class="k2">Storyboard</span><ol class="sb${cols > 7 ? ' tight' : ''}" style="grid-template-columns:repeat(${cols},1fr)">${p.shots.map((s) => `<li>${shotSvg(s, p.orient)}<b>${esc(SHOT_LABEL[s.tipo])}</b>${s.texto ? `<i>“${esc(s.texto)}”</i>` : ''}</li>`).join('')}</ol>` : ''
  const rot = p.roteiro.length ? `<span class="k2">Roteiro completo</span><table class="rot">${p.roteiro.map((s) => `<tr><td class="n">${s.n}</td><td class="cena">${esc(sentenceCase(s.cena))}</td><td>${s.speaker ? `<b class="who2">${esc(s.speaker)}</b>` : ''}${nl(s.fala)}</td></tr>`).join('')}</table>` : ''
  const como = p.como.length ? `<div class="como"><span class="k2">Como vai ser a gravação</span><ol>${p.como.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''
  const cap = p.captar.length ? `<div><span class="k2">O que captar</span><ul>${p.captar.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''
  const e = p.extras
  const ex = e ? `<div><span class="k2">Aproveite a gravação</span>${e.stories.length ? `<p><b>Stories:</b> ${esc(e.stories.join(' · '))}</p>` : ''}${e.reels.length ? `<p><b>Reels no celular:</b> ${esc(e.reels.join(' · '))}</p>` : ''}${e.fotos.length ? `<p><b>Fotos</b></p><ul>${e.fotos.map((f) => `<li>${esc(f.tema)}${f.como ? ` · ${esc(f.como)}` : ''}${f.ref ? ` · <a href="${esc(url(f.ref.link))}">ver referência</a>` : ''}</li>`).join('')}</ul>` : ''}</div>` : ''
  return `${est}${sb}${rot}${como}${cap || ex ? `<div class="cols two">${cap}${ex}</div>` : ''}${refRow(p.ref)}`
}

/** Página 3 (edição): o guia curto e os tempos principais da montagem. */
function avEdit(c: StrategyCard) {
  const p = editPart(c)
  const guide = p.guide.map((x) => `<p class="fala">${esc(x)}</p>`).join('')
  const times = p.times.length ? `<span class="k2">Tempos</span><table class="tempos">${p.times.map((s) => `<tr><td><b>${esc(s.t || `Quadro ${s.n}`)}</b></td><td>${esc(SHOT_LABEL[s.tipo])}</td><td>${esc(s.visual || s.audio)}${s.texto ? ` · <b>“${esc(s.texto)}”</b>` : ''}</td></tr>`).join('')}</table>` : ''
  return `${guide}${times}` || '<p class="pts">Sem guia de edição.</p>'
}

/**
 * Audiovisual (Ellcazo) por VÍDEO, 3 páginas seguidas (Italo, 19/11, v2): Narração (branco) · Gravação (branco) ·
 * Edição (verde-limão). Preto só nos traços, nunca de fundo. `only: 'narracao'` = só as narrações (vai ao cliente).
 */
function audiovisual(cs: StrategyCard[], client: string, month: string, only?: 'narracao') {
  if (!cs.length) return ''
  const total = String(cs.length).padStart(2, '0')
  return cs.map((c, i) => {
    const h = videoHead(c, i); const num = String(i + 1).padStart(2, '0')
    const page = (part: string, label: string, body: string, k: number, lime = false) => `<section class="page ez${lime ? ' lime' : ''}" data-parte="${part}" data-video="${num}">
      ${ezHead(client, month, `Vídeo ${num} · ${label}`)}
      <span class="k2 num">${esc(h.meta)}</span>
      <h2>${esc(h.title)}</h2>
      ${h.idea && k === 1 ? `<p class="idea">${esc(h.idea)}</p>` : ''}
      ${body}
      ${ezFoot(only ? `${num} / ${total}` : `Vídeo ${num} de ${total} · ${k}/3`)}
    </section>`
    const n1 = page('narracao', 'Narração', avNarration(c, i), 1)
    if (only) return n1
    return n1 + page('gravacao', 'Gravação', avShoot(c), 2) + page('edicao', 'Edição', avEdit(c), 3, true)
  }).join('')
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#0B3C44;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;padding:16mm 15mm 18mm;position:relative;page-break-after:always;overflow:hidden}
h2{font-size:26px;margin:4px 0 14px;line-height:1.15}h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#056F84;margin:14px 0 6px}
p{font-size:12.5px;line-height:1.45;margin:4px 0}ol{font-size:12.5px;line-height:1.45;padding-left:18px;margin:4px 0}a{color:#056F84}
.k{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#056F84}.mut{color:#5c7080}.num{font-size:20px;font-weight:800;color:#056F84}
.tag{display:inline-block;background:#1FC8DB22;color:#056F84;border-radius:99px;padding:1px 8px;font-size:10.5px;font-weight:700;margin-right:4px}
.meta{font-size:11px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{border:1px solid #d6e4e8;border-radius:12px;padding:9px 11px;break-inside:avoid}.card b{font-size:13px}.box{background:#f2f8f9;border-radius:10px;padding:8px 10px}
.bubble{background:#e7f8fa;border-radius:12px 12px 12px 2px;padding:7px 10px}
.tese{background:#0B3C44;color:#fff;border-radius:14px;padding:16px 18px;margin-bottom:6px}.tese .k{color:#1FC8DB}.tese .big{font-size:20px;font-weight:800;line-height:1.25}
.pf header{border-bottom:3px solid #1FC8DB;margin-bottom:10px;padding-bottom:6px}.pf footer{position:absolute;bottom:8mm;left:15mm;font-size:10px;color:#5c7080}
.cover{background:#0B3C44;color:#fff;display:flex;flex-direction:column;justify-content:space-between}.cover h1{font-size:40px;line-height:1.08;margin:0}.cover .k{color:#1FC8DB}
.cover .logos{display:flex;gap:14px;align-items:center}.cover .logos img{height:44px;border-radius:10px;background:#fff;padding:4px}
.ez{font-family:Inter,Arial,sans-serif;color:#1d1f1a;background:#fff;overflow:visible;padding:15mm 18mm 20mm}
.ezh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #e2e4df;padding-bottom:10px;margin-bottom:16px}
.ezh .bar{display:block;width:30px;height:5px;background:#B5E61D;margin-bottom:10px}.ezh .who{display:block;font-size:19px;margin-top:4px}
.k2{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#4a6b12}.k2.num{margin-bottom:6px}
.ez h2{font-size:32px;font-weight:800;line-height:1.1;margin:0 0 14px;letter-spacing:-.01em}
.ez .spk{font-size:11.5px;font-weight:700;color:#4a6b12;margin:11px 0 3px}.ez .fala{font-size:14.5px;line-height:1.5;margin:0 0 6px}
.ez .dir{font-size:12px;font-style:italic;color:#4a6b12;margin:2px 0 5px}.ez .q{font-size:16px;font-weight:700;line-height:1.45;margin:0 0 6px}
.ez .pts{font-size:13.5px;line-height:1.5;color:#55594f;margin:0 0 8px}.ez .pts b{color:#3b3e36}
.team{margin-top:14px;border-top:1.5px solid #e2e4df;padding-top:8px;font-size:11px;color:#55594f}.team ol{font-size:11px;margin:2px 0 0}
.refrow{display:flex;gap:12px;align-items:center;margin-bottom:6px}.refrow img{width:120px;aspect-ratio:16/9;object-fit:cover;border-radius:10px;display:block}.small{font-size:11px;margin:2px 0}
.ezf{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;border-top:1.5px solid #e2e4df;padding-top:8px;font-size:10.5px;color:#55594f}.ezf b{color:#1d1f1a}
.refimg{width:100%;max-height:220px;object-fit:cover;border-radius:12px;display:block;margin:6px 0}
.noimg{border:2px dashed #000;border-radius:12px;aspect-ratio:16/9;display:grid;place-items:center;font-weight:700}
.cola{font-size:14px;line-height:1.5;padding-left:18px}.ez .idea{font-size:14px;line-height:1.45;color:#3b3e36;margin:-6px 0 14px;max-width:150mm}
.sb{list-style:none;padding:0;margin:4px 0 12px;display:grid;gap:9px 7px}
.sb li{break-inside:avoid;display:flex;flex-direction:column;gap:2px;min-width:0}.sb svg{width:100%;height:auto;display:block}.sb b{font-size:9.5px;line-height:1.2;margin-top:2px}.sb span{font-size:9.5px;line-height:1.3;color:#3b3e36}.sb i{font-size:9px;line-height:1.25;font-style:normal;font-weight:700;color:#4a6b12}
.sb.tight{gap:6px 4px}.sb.tight b{font-size:8.5px}.sb.tight i{font-size:8px}
.est{margin:0 0 12px}.est b{display:block;font-size:13px;margin:2px 0 5px}.steps{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:5px;counter-reset:st}.steps li{counter-increment:st;font-size:10.5px;font-weight:700;border:1.5px solid #1d1f1a;border-radius:99px;padding:2px 9px}.steps li::before{content:counter(st) " · ";color:#4a6b12}
.rot{width:100%;border-collapse:collapse;margin:4px 0 12px}.rot td{font-size:12px;line-height:1.45;padding:7px 8px 7px 0;border-bottom:1.5px solid #e2e4df;vertical-align:top}.rot td.n{width:20px;font-weight:800;color:#4a6b12}.rot td.cena{width:34%;font-size:11px;color:#3b3e36}.rot tr{break-inside:avoid}.who2{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#4a6b12}
.como{margin:0 0 10px}.como ol{font-size:11.5px;line-height:1.45;margin:2px 0 0;padding-left:18px}
.cols{display:grid;gap:14px;margin:6px 0 10px}.cols.two{grid-template-columns:1fr 1fr}.cols ul{font-size:11.5px;line-height:1.45;margin:2px 0 0;padding-left:16px}.cols p{font-size:11.5px;margin:3px 0}
.tempos{width:100%;border-collapse:collapse;margin-top:4px}.tempos td{font-size:11.5px;line-height:1.35;padding:5px 6px 5px 0;border-bottom:1.5px solid #1d1f1a22;vertical-align:top}.tempos td:first-child{width:52px;white-space:nowrap}.tempos td:nth-child(2){width:92px;color:#3b3e36}
.ez.lime{background:#B5E61D}.ez.lime .k2{color:#1d1f1a}.ez.lime .ezh,.ez.lime .ezf{border-color:#1d1f1a44}.ez.lime .ezh .bar{background:#fff}
.btn{display:inline-block;margin:6px 0 2px;background:#B5E61D;color:#1d1f1a;border-radius:99px;padding:5px 12px;font-weight:800;text-decoration:none;font-size:12px}
@media screen{body{background:#e9eef0}.page{margin:12px auto;box-shadow:0 2px 12px #0002}}`

/** HTML completo (abre no navegador, imprime ou vira PDF no Chromium). */
export function strategyHtml(input: DocInput, opts: { only?: 'narracao' } = {}): string {
  TH = input.thumbs ?? {}
  const cs = pdfCards(input.cards)
  const tab = (t: string) => cs.filter((c) => c.tab === t)
  // Só as narrações de todos os vídeos (download "Para o cliente", é o que vai no Enviar ao cliente).
  if (opts.only) return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(avClientDocName(input.month))} · ${esc(input.name)}</title><style>${CSS}</style></head><body>
${audiovisual(tab('audiovisual'), input.name, input.month, 'narracao')}
</body></html>`
  const cover = `<section class="page cover"><div><span class="k">Estratégia do mês</span><h1>${esc(input.name)}<br>${esc(monthTitle(input.month))}</h1></div>
    <div><p>${cs.length} itens aprovados: ${['resumo', 'audiovisual', 'social', 'trafego', 'atendimento', 'referencias'].map((t) => [t, tab(t).length] as const).filter(([, n]) => n).map(([t, n]) => `${n} ${({ resumo: 'do resumo', audiovisual: 'vídeos', social: 'peças de social', trafego: 'campanhas', atendimento: 'itens do plano de vendas', referencias: 'referências' } as Record<string, string>)[t]}`).join(' · ')}</p>
    <div class="logos">${input.peformakeLogoUrl ? `<img src="${esc(input.peformakeLogoUrl)}" alt="Peformake">` : '<b>Peformake</b>'}${input.logoUrl ? `<img src="${esc(input.logoUrl)}" alt="">` : ''}</div></div></section>`
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docName(input.month))} · ${esc(input.name)}</title><style>${CSS}</style></head><body>
${cover}${tab('resumo').length ? resumo(tab('resumo')) : ''}${audiovisual(tab('audiovisual'), input.name, input.month)}${social(tab('social'))}${trafego(tab('trafego'))}${atendimento(tab('atendimento'))}${referencias(tab('referencias'))}
</body></html>`
}
