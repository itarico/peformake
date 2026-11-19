// PDF da Estratégia interativa: modelo FIXO, sem IA. Só os cards APROVADOS e marcados "Incluir no PDF".
// Identidade Peformake (ciano #1FC8DB, petróleo #056F84, azul-escuro #0B3C44, branco) em tudo;
// o Audiovisual na identidade Ellcazo: verde-limão #B5E61D ou branco (intercalando), preto só nos detalhes (nunca fundo preto),
// Inter, borda de 2px, cantos de 12 a 14px, sombra chapada; uma página por vídeo com a prévia da referência e o botão para assistir.
// Função pura (sem navegador): a tela usa para imprimir/salvar e o agente usa para gerar o PDF com o Chromium.
import { ellcazoSvg } from '@/components/ui/ellcazoSvg'
import type { StrategyCard } from './cardRules'
import { isFreeAnswer, videoDoc } from './scriptRules'
import { AV_PARTS, clientPart, editPart, FRAMING_LABEL, frameSvg, MOVE_LABEL, shootPart, type AvPart } from './avParts'

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

/** Nome do arquivo de uma parte do audiovisual ("Audiovisual · Para o cliente · 01-12 a 31-12-2026"). */
export function avDocName(month: string, part: AvPart): string {
  return `Audiovisual · ${AV_PARTS.find((p) => p.id === part)!.title} · ${docName(month).split(' · ')[1]}`
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
  return pfPage('Resumo do mês', 'Estratégia', `
    ${tese ? `<div class="tese"><span class="k">Tese do mês</span><p class="big">${esc(tese.title)}</p><p>${nl(tese.data.texto)}</p></div>` : ''}
    ${block('Objetivos', by('objetivo'), (c) => `<p class="num">${esc(c.data.numero)}</p><p>${esc(c.data.como_medir)}</p>`)}
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
  return cs.map((c) => pfPage(c.title, 'Atendimento no WhatsApp', `
    <div class="two"><div><h3>Roteiro</h3>${list(c.data.roteiro_whatsapp, (m) => `<p class="bubble">${nl(m)}</p>`)}</div>
    <div><h3>Objeções</h3>${list(c.data.objecoes, (o) => `<div class="card"><b>${esc(o.objecao)}</b><p>${nl(o.resposta)}</p></div>`)}
    <h3>Follow-up</h3>${list(c.data.follow_up, (o) => `<p><b>${esc(o.quando)}:</b> ${nl(o.mensagem)}</p>`)}</div></div>`)).join('')
}

function referencias(cs: StrategyCard[]) {
  if (!cs.length) return ''
  return pfPage('Referências', 'Concorrentes e inspirações', `<div class="grid">${cs.map((c) => `<div class="card"><span class="k">${c.kind === 'concorrente' ? 'Concorrente' : c.kind === 'outro_nicho' ? 'Outro nicho' : c.kind === 'anuncio' ? 'Anúncio' : 'Referência'}</span>${coverOf(c.data.link) ? `<a href="${esc(url(c.data.link))}"><img class="refimg" src="${esc(coverOf(c.data.link))}" alt=""></a>` : ''}<b>${esc(c.title)}</b><p>${esc(c.data.porque)}</p>${c.data.numero ? `<p class="num">${esc(c.data.numero)}</p>` : ''}${c.data.link ? `<p><a href="${esc(url(c.data.link))}">${esc(String(c.data.link).replace(/^https?:\/\/(www\.)?/, '').slice(0, 48))}</a></p>` : ''}</div>`).join('')}</div>`)
}

/** Cabeçalho e rodapé Ellcazo das páginas de vídeo. */
const ezHead = (client: string, month: string, part: string) => `<header class="ezh"><div><span class="bar"></span><span class="k2">${esc(part)} · ${esc(monthTitle(month))}</span><b class="who">${esc(client)}</b></div><span class="ezmark">${ellcazoSvg('#B5E61D', 84)}</span></header>`
const ezFoot = (n: string, total: number) => `<footer class="ezf"><b>ELLCAZO STUDIO</b><span>${esc(n)} / ${String(total).padStart(2, '0')}</span></footer>`
const refOf = (c: StrategyCard) => (c.data.referencia?.link ? url(c.data.referencia.link) : c.inspired?.link ? url(c.inspired.link) : '')
const refRow = (c: StrategyCard) => {
  const ref = refOf(c); if (!ref) return ''
  const thumb = coverOf(ref)
  return `<div class="refrow">${thumb ? `<a href="${esc(ref)}"><img src="${esc(thumb)}" alt=""></a>` : ''}<div><span class="k2">Referência</span><a class="btn" href="${esc(ref)}">▶ Assistir a referência</a>${c.inspired?.numero ? `<p class="small">${esc(c.inspired.numero)}</p>` : ''}</div></div>`
}
const ul = (title: string, xs: string[], note = '') => (xs.length ? `<div><span class="k2">${esc(title)}${note ? ` <i>· ${esc(note)}</i>` : ''}</span><ol>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : '')

/** Parte 1, para quem fala na câmera (o formato do PDF da Rosanne): a fala, as perguntas, a cola e o que levar. */
function avClient(c: StrategyCard, i: number) {
  const doc = videoDoc(c, i); const p = clientPart(c, i)
  let q = 0
  const blocks = p.blocks.map((b) => `${b.speaker ? `<p class="spk">${esc(b.speaker)}</p>` : ''}${b.items.map((it) => it.kind === 'dir' ? `<p class="dir">[${esc(it.text)}]</p>`
    : it.pergunta ? `<p class="spk">Pergunta ${++q}</p><p class="q">“${esc(it.text)}”</p>`
    : it.livre || isFreeAnswer(it.text) ? `<p class="pts"><b>Resposta espontânea</b> · ${esc(it.text.replace(/^\(|\)$/g, ''))}</p>`
    : `<p class="fala">${nl(it.text)}</p>`).join('')}`).join('')
  const qs = p.questions.map((x, k) => `<p class="spk">Pergunta ${q + k + 1}</p><p class="q">“${esc(x.pergunta)}”</p>${x.pontos ? `<p class="pts"><b>Pontos pra resposta espontânea</b> · ${esc(x.pontos)}</p>` : ''}`).join('')
  const cola = p.cola.length ? `<div class="cola"><span class="k2">${p.blocks.length ? 'Se preferir falar com suas palavras' : 'Cola de tópicos'}</span><ul>${p.cola.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''
  const lg = p.logistics.length ? `<p class="lg">${p.logistics.map((l) => `<span><b>${esc(l.label)}:</b> ${esc(l.value)}</span>`).join('')}</p>` : ''
  return { doc, body: `${lg}${blocks}${qs}${cola}${!blocks && !qs && !cola ? '<p class="fala">(sem fala escrita)</p>' : ''}${refRow(c) ? `<div class="team">${refRow(c)}</div>` : ''}` }
}

/** Parte 2, para a Ellcazo: storyboard esquemático, shot list, ordem da diária, equipamentos, referência e outras abordagens. */
function avShoot(c: StrategyCard, i: number) {
  const doc = videoDoc(c, i); const p = shootPart(c)
  const sb = p.frames.length ? `<span class="k2">Storyboard</span><ol class="sb ${p.orient === 'horizontal' ? 'h' : ''}">${p.frames.map((f) => `<li>${frameSvg(f, p.orient)}<b>${esc(FRAMING_LABEL[f.framing])}${f.move ? ` · ${esc(MOVE_LABEL[f.move])}` : ''}${f.sound ? ` · ${esc(f.sound)}` : ''}</b>${f.caption ? `<span>${esc(f.speaker ? `${f.speaker}: ` : '')}${esc(f.caption)}</span>` : ''}</li>`).join('')}</ol>` : '<p class="pts">Sem roteiro em blocos para montar o storyboard.</p>'
  const ideias = (Array.isArray(c.data.outras_ideias) ? c.data.outras_ideias : []).filter(Boolean)
  const cols = [ul('Shot list', p.shotList), ul('Ordem da diária', p.order), ul('Equipamentos', p.gear, p.gearSuggested ? 'sugeridos' : '')].filter(Boolean)
  return { doc, body: `${sb}${cols.length ? `<div class="cols">${cols.join('')}</div>` : ''}${p.team ? `<p class="pts"><b>Equipe e local</b> · ${esc(p.team)}</p>` : ''}${refRow(c) || ideias.length ? `<div class="team">${refRow(c)}${ideias.length ? `<span class="k2">Outras abordagens</span><ol>${list(ideias, (g) => `<li>${esc(g)}</li>`)}</ol>` : ''}</div>` : ''}` }
}

/** Parte 3, para a edição: o que fazer em cada bloco, os derivados e a publicação. */
function avEdit(c: StrategyCard, i: number) {
  const doc = videoDoc(c, i); const p = editPart(c)
  const beats = p.beats.length ? `<ol class="beats">${p.beats.map((b) => `<li><span class="n">${b.n}</span><div>${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ''}${b.items.length ? b.items.map((x) => `<p><b>${esc(x.label)}:</b> ${esc(x.value)}</p>`).join('') : '<p class="mut">Segue o roteiro.</p>'}</div></li>`).join('')}</ol>` : '<p class="pts">Sem roteiro em blocos.</p>'
  const pub = p.publicacao.length ? `<div><span class="k2">Publicação</span>${p.publicacao.map((x) => `<p><b>${esc(x.label)}:</b> ${esc(x.value)}</p>`).join('')}</div>` : ''
  const cols = [ul('Derivados', p.derivados), pub].filter(Boolean)
  return { doc, body: `${ul('Para o vídeo todo', p.general)}${beats}${cols.length ? `<div class="cols two">${cols.join('')}</div>` : ''}` }
}

const AV_RENDER: Record<AvPart, (c: StrategyCard, i: number) => { doc: ReturnType<typeof videoDoc>; body: string }> = { cliente: avClient, gravacao: avShoot, edicao: avEdit }

/** Abertura de cada parte (capítulo): fundo verde-limão, para quem é e a lista dos vídeos. */
function avChapter(part: AvPart, k: number, cs: StrategyCard[], client: string, month: string) {
  const meta = AV_PARTS.find((x) => x.id === part)!
  return `<section class="page ez cap" data-parte="${part}"><div><span class="ezmark">${ellcazoSvg('#1d1f1a', 96)}</span><span class="k2">Audiovisual · ${esc(client)} · ${esc(monthTitle(month))}</span>
    <p class="pn">Parte ${k}</p><h2>${esc(meta.title)}</h2><p class="lead">${esc(meta.who)}</p></div>
    <ol class="toc">${cs.map((c, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b> ${esc(videoDoc(c, i).title)}</li>`).join('')}</ol>
    <footer class="ezf"><b>ELLCAZO STUDIO</b><span>${cs.length} ${cs.length === 1 ? 'vídeo' : 'vídeos'}</span></footer></section>`
}

/**
 * Audiovisual (Ellcazo) em três partes, cada uma para um público (Italo, 19/11): capítulo de abertura (verde-limão) e
 * uma página por vídeo (fundo branco, verde-limão nos detalhes, preto só nos traços; nunca fundo preto).
 */
function audiovisual(cs: StrategyCard[], client: string, month: string, parts: AvPart[] = AV_PARTS.map((p) => p.id)) {
  if (!cs.length) return ''
  return parts.map((part) => {
    const k = AV_PARTS.findIndex((x) => x.id === part) + 1
    const label = AV_PARTS[k - 1]!.title
    return avChapter(part, k, cs, client, month) + cs.map((c, i) => {
      const { doc, body } = AV_RENDER[part](c, i)
      return `<section class="page ez" data-parte="${part}">
      ${ezHead(client, month, label)}
      <span class="k2 num">${esc(doc.number)} / ${esc(doc.type)}</span>
      <h2>${esc(doc.title)}</h2>
      ${body}
      ${ezFoot(doc.number, cs.length)}
    </section>`
    }).join('')
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
.ez .lg{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.ez .lg span{background:#f1f9dc;border-radius:99px;padding:3px 10px;font-size:11.5px}
.cola{background:#f1f9dc;border-radius:12px;padding:8px 12px;margin:10px 0}.cola ul{font-size:13px;margin:4px 0 0;padding-left:18px}
.sb{list-style:none;padding:0;margin:4px 0 10px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.sb.h{grid-template-columns:repeat(3,1fr)}
.sb li{break-inside:avoid;display:flex;flex-direction:column;gap:2px}.sb svg{width:100%;height:auto;display:block}.sb b{font-size:9.5px;line-height:1.2}.sb span{font-size:9.5px;line-height:1.3;color:#55594f}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:6px 0}.cols.two{grid-template-columns:1fr 1fr}.cols ol{font-size:11.5px;margin:2px 0 0;padding-left:16px}.cols p{font-size:11.5px;margin:2px 0}.k2 i{font-weight:400;text-transform:none;color:#55594f}
.beats{list-style:none;padding:0;margin:0 0 10px}.beats li{display:flex;gap:10px;padding:7px 0;border-bottom:1.5px solid #e2e4df;break-inside:avoid}.beats .n{flex:none;width:22px;height:22px;border-radius:99px;background:#B5E61D;display:grid;place-items:center;font-weight:800;font-size:11px}
.beats p{font-size:12.5px;margin:1px 0}.beats .cap{color:#55594f;font-size:11.5px}
.ez.cap{background:#B5E61D;display:flex;flex-direction:column;justify-content:space-between}.ez.cap .k2{color:#1d1f1a;margin-top:18mm}.ez.cap .pn{font-size:16px;font-weight:800;margin:10mm 0 0}.ez.cap h2{font-size:54px;margin:2px 0 10px}
.ez.cap .lead{font-size:16px;max-width:130mm;line-height:1.4}.toc{list-style:none;padding:0;margin:0 0 16mm;font-size:13px;line-height:1.9}.toc b{display:inline-block;width:28px}.ez.cap .ezf{border-top-color:#1d1f1a}
.btn{display:inline-block;margin:6px 0 2px;background:#B5E61D;color:#1d1f1a;border-radius:99px;padding:5px 12px;font-weight:800;text-decoration:none;font-size:12px}
@media screen{body{background:#e9eef0}.page{margin:12px auto;box-shadow:0 2px 12px #0002}}`

/** HTML completo (abre no navegador, imprime ou vira PDF no Chromium). */
export function strategyHtml(input: DocInput, opts: { part?: AvPart } = {}): string {
  TH = input.thumbs ?? {}
  const cs = pdfCards(input.cards)
  const tab = (t: string) => cs.filter((c) => c.tab === t)
  // Uma parte do audiovisual sozinha (download separado): o capítulo abre o documento.
  if (opts.part) return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(avDocName(input.month, opts.part))} · ${esc(input.name)}</title><style>${CSS}</style></head><body>
${audiovisual(tab('audiovisual'), input.name, input.month, [opts.part])}
</body></html>`
  const cover = `<section class="page cover"><div><span class="k">Estratégia do mês</span><h1>${esc(input.name)}<br>${esc(monthTitle(input.month))}</h1></div>
    <div><p>${cs.length} itens aprovados: ${['resumo', 'audiovisual', 'social', 'trafego', 'atendimento', 'referencias'].map((t) => [t, tab(t).length] as const).filter(([, n]) => n).map(([t, n]) => `${n} ${({ resumo: 'do resumo', audiovisual: 'vídeos', social: 'peças de social', trafego: 'campanhas', atendimento: 'roteiros de atendimento', referencias: 'referências' } as Record<string, string>)[t]}`).join(' · ')}</p>
    <div class="logos">${input.peformakeLogoUrl ? `<img src="${esc(input.peformakeLogoUrl)}" alt="Peformake">` : '<b>Peformake</b>'}${input.logoUrl ? `<img src="${esc(input.logoUrl)}" alt="">` : ''}</div></div></section>`
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docName(input.month))} · ${esc(input.name)}</title><style>${CSS}</style></head><body>
${cover}${tab('resumo').length ? resumo(tab('resumo')) : ''}${audiovisual(tab('audiovisual'), input.name, input.month)}${social(tab('social'))}${trafego(tab('trafego'))}${atendimento(tab('atendimento'))}${referencias(tab('referencias'))}
</body></html>`
}
