// PDF da Estratégia interativa: modelo FIXO, sem IA. Só os cards APROVADOS e marcados "Incluir no PDF".
// Identidade Peformake (ciano #1FC8DB, petróleo #056F84, azul-escuro #0B3C44, branco) em tudo;
// o Audiovisual na identidade Ellcazo: verde-limão #B5E61D ou branco (intercalando), preto só nos detalhes (nunca fundo preto),
// Inter, borda de 2px, cantos de 12 a 14px, sombra chapada; uma página por vídeo com a prévia da referência e o botão para assistir.
// Função pura (sem navegador): a tela usa para imprimir/salvar e o agente usa para gerar o PDF com o Chromium.
import { ellcazoSvg } from '@/components/ui/ellcazoSvg'
import type { StrategyCard } from './cardRules'
import { isFreeAnswer, videoDoc } from './scriptRules'

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

/**
 * Audiovisual (Ellcazo), no formato que o cliente grava (o PDF da Rosanne, 18/11): uma página por vídeo, fundo branco,
 * verde-limão nos detalhes; número e tipo, título grande, quem fala, a fala em parágrafos, direção entre colchetes;
 * entrevista = pergunta em destaque + pontos pra resposta espontânea. Embaixo, pequeno: a referência (prévia + assistir)
 * e as outras abordagens, para a equipe.
 */
function audiovisual(cs: StrategyCard[], client: string, month: string) {
  return cs.map((c, i) => {
    const doc = videoDoc(c, i)
    const ref = c.data.referencia?.link ? url(c.data.referencia.link) : c.inspired?.link ? url(c.inspired.link) : ''
    const thumb = coverOf(ref)
    let q = 0
    const blocks = doc.blocks.map((b) => `${b.speaker ? `<p class="spk">${esc(b.speaker)}</p>` : ''}${b.items.map((it) => it.kind === 'dir' ? `<p class="dir">[${esc(it.text)}]</p>`
      : it.pergunta ? `<p class="spk">Pergunta ${++q}</p><p class="q">“${esc(it.text)}”</p>`
      : it.livre || isFreeAnswer(it.text) ? `<p class="pts"><b>Resposta espontânea</b> · ${esc(it.text.replace(/^\(|\)$/g, ''))}</p>`
      : `<p class="fala">${nl(it.text)}</p>`).join('')}`).join('')
    const qs = doc.questions.map((x, k) => `<p class="spk">Pergunta ${q + k + 1}</p><p class="q">“${esc(x.pergunta)}”</p>${x.pontos ? `<p class="pts"><b>Pontos pra resposta espontânea</b> · ${esc(x.pontos)}</p>` : ''}`).join('')
    const ideias = (Array.isArray(c.data.outras_ideias) ? c.data.outras_ideias : []).filter(Boolean)
    const team = ref || ideias.length ? `<div class="team">${ref ? `<div class="refrow">${thumb ? `<a href="${esc(ref)}"><img src="${esc(thumb)}" alt=""></a>` : ''}<div><span class="k2">Referência</span><a class="btn" href="${esc(ref)}">▶ Assistir a referência</a>${c.inspired?.numero ? `<p class="small">${esc(c.inspired.numero)}</p>` : ''}</div></div>` : ''}${ideias.length ? `<span class="k2">Outras abordagens</span><ol>${list(ideias, (g) => `<li>${esc(g)}</li>`)}</ol>` : ''}</div>` : ''
    return `<section class="page ez">
      <header class="ezh"><div><span class="bar"></span><span class="k2">Roteiros · ${esc(monthTitle(month))}</span><b class="who">${esc(client)}</b></div><span class="ezmark">${ellcazoSvg('#B5E61D', 84)}</span></header>
      <span class="k2 num">${esc(doc.number)} / ${esc(doc.type)}</span>
      <h2>${esc(doc.title)}</h2>
      ${blocks}${qs}${!blocks && !qs ? '<p class="fala">(sem fala escrita)</p>' : ''}
      ${team}
      <footer class="ezf"><b>ELLCAZO STUDIO</b><span>${esc(doc.number)} / ${String(cs.length).padStart(2, '0')}</span></footer>
    </section>`
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
.ez{font-family:Inter,Arial,sans-serif;color:#1d1f1a;background:#fff;overflow:visible;padding:18mm 18mm 22mm}
.ezh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #e2e4df;padding-bottom:12px;margin-bottom:22px}
.ezh .bar{display:block;width:30px;height:5px;background:#B5E61D;margin-bottom:10px}.ezh .who{display:block;font-size:19px;margin-top:4px}
.k2{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#4a6b12}.k2.num{margin-bottom:6px}
.ez h2{font-size:38px;font-weight:800;line-height:1.1;margin:0 0 22px;letter-spacing:-.01em}
.ez .spk{font-size:12px;font-weight:700;color:#4a6b12;margin:16px 0 6px}.ez .fala{font-size:15.5px;line-height:1.6;margin:0 0 10px}
.ez .dir{font-size:12.5px;font-style:italic;color:#4a6b12;margin:4px 0 10px}.ez .q{font-size:16px;font-weight:700;line-height:1.45;margin:0 0 6px}
.ez .pts{font-size:13.5px;line-height:1.5;color:#55594f;margin:0 0 8px}.ez .pts b{color:#3b3e36}
.team{margin-top:22px;border-top:1.5px solid #e2e4df;padding-top:12px;break-inside:avoid;font-size:12px;color:#55594f}.team ol{font-size:12px;margin:4px 0 0}
.refrow{display:flex;gap:12px;align-items:center;margin-bottom:10px}.refrow img{width:150px;aspect-ratio:16/9;object-fit:cover;border-radius:10px;display:block}.small{font-size:11px;margin:2px 0}
.ezf{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;border-top:1.5px solid #e2e4df;padding-top:8px;font-size:10.5px;color:#55594f}.ezf b{color:#1d1f1a}
.refimg{width:100%;max-height:220px;object-fit:cover;border-radius:12px;display:block;margin:6px 0}
.noimg{border:2px dashed #000;border-radius:12px;aspect-ratio:16/9;display:grid;place-items:center;font-weight:700}
.btn{display:inline-block;margin:6px 0 2px;background:#B5E61D;color:#1d1f1a;border-radius:99px;padding:5px 12px;font-weight:800;text-decoration:none;font-size:12px}
@media screen{body{background:#e9eef0}.page{margin:12px auto;box-shadow:0 2px 12px #0002}}`

/** HTML completo (abre no navegador, imprime ou vira PDF no Chromium). */
export function strategyHtml(input: DocInput): string {
  TH = input.thumbs ?? {}
  const cs = pdfCards(input.cards)
  const tab = (t: string) => cs.filter((c) => c.tab === t)
  const cover = `<section class="page cover"><div><span class="k">Estratégia do mês</span><h1>${esc(input.name)}<br>${esc(monthTitle(input.month))}</h1></div>
    <div><p>${cs.length} itens aprovados: ${['resumo', 'audiovisual', 'social', 'trafego', 'atendimento', 'referencias'].map((t) => [t, tab(t).length] as const).filter(([, n]) => n).map(([t, n]) => `${n} ${({ resumo: 'do resumo', audiovisual: 'vídeos', social: 'peças de social', trafego: 'campanhas', atendimento: 'roteiros de atendimento', referencias: 'referências' } as Record<string, string>)[t]}`).join(' · ')}</p>
    <div class="logos">${input.peformakeLogoUrl ? `<img src="${esc(input.peformakeLogoUrl)}" alt="Peformake">` : '<b>Peformake</b>'}${input.logoUrl ? `<img src="${esc(input.logoUrl)}" alt="">` : ''}</div></div></section>`
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docName(input.month))} · ${esc(input.name)}</title><style>${CSS}</style></head><body>
${cover}${tab('resumo').length ? resumo(tab('resumo')) : ''}${audiovisual(tab('audiovisual'), input.name, input.month)}${social(tab('social'))}${trafego(tab('trafego'))}${atendimento(tab('atendimento'))}${referencias(tab('referencias'))}
</body></html>`
}
