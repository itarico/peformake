// Apresentação/PDF do audiovisual do mês para o CLIENTE: o "plano tático de conteúdo" da Ellcazo (logo + verde-limão e preto).
// Uma peça só para a tela (apresentação e link público) e o PDF (16:9, uma página por slide).
// Ordem: capa → essência → o projeto em uma página → tom de voz → expressão de marca → linguagem de vídeo → linha editorial
// → calendário → banco de pautas → uma página por referência (vídeo + 3 jeitos de gravar + quem fala/quem grava) e o roteiro
// por parágrafo → próximo passo. Seção sem dado não aparece. Só os vídeos aprovados e nada interno (custo, "a confirmar", observações).
import { ellcazoSvg } from '../../components/ui/ellcazoSvg'
import { esc, words, type DeckInput, type Orientation, type Slide } from './consultDeck'
import QRCode from 'qrcode'
import { PERFIL_FALA, type AvVideo } from './avPlan'
import { buildTatico, type AvCtx } from './avTatico'
import { monthName } from './monthlyRules'

const chunk = <T,>(a: T[], n: number): T[][] => { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out }
/** Cenas por slide: equilibra (7 cenas em 2 slides = 4 + 3, nunca 6 + 1). */
export function sceneChunks<T>(xs: T[], max: number): T[][] {
  if (xs.length <= max) return [xs]
  const parts = Math.ceil(xs.length / max)
  return chunk(xs, Math.ceil(xs.length / parts))
}

/** QR code em SVG (no PDF, o vídeo de referência abre pelo celular). */
export function qrSvg(text: string): string {
  try {
    const m = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules
    const n = m.size
    let d = ''
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m.get(x, y)) d += `M${x + 2} ${y + 2}h1v1h-1z`
    return `<svg class="qr" viewBox="0 0 ${n + 4} ${n + 4}" aria-hidden="true"><rect width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#121410"/></svg>`
  } catch { return '' }
}

export interface AvDeckOpts {
  name: string; month: string; videos: AvVideo[]
  /** Guia da marca e plano do mês (o que faltar some). */
  ctx?: AvCtx
  /** Miniaturas já buscadas (link do vídeo → imagem). */
  thumbs?: Record<string, string>
}

const MIC = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'
const CAM = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="7" width="13" height="10" rx="2"/><path d="M15.5 10.5l6-3v9l-6-3z"/></svg>'
const PLAY = '<svg class="pl-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>'
const net = (u: string) => (/tiktok/.test(u) ? 'TikTok' : /instagram/.test(u) ? 'Instagram' : /youtu/.test(u) ? 'YouTube' : /facebook|fb\.watch/.test(u) ? 'Facebook' : 'a rede')
/** Miniatura sem chave: YouTube direto; TikTok pelo oEmbed público (a página busca sozinha); Instagram fica com o bloco da rede. */
export function directThumb(u: string): string {
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/.exec(u)
  return yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : ''
}
/** Busca as miniaturas que dão sem chave (para o PDF já sair com a capa do vídeo). */
export async function fetchThumbs(urls: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  await Promise.all([...new Set(urls)].map(async (u) => {
    const d = directThumb(u)
    if (d) { out[u] = d; return }
    if (!/tiktok\.com\/.*\/video\//.test(u)) return
    try {
      const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`)
      const j = (await r.json()) as { thumbnail_url?: string }
      if (j.thumbnail_url) out[u] = j.thumbnail_url
    } catch { /* sem miniatura: fica o bloco da rede */ }
  }))
  return out
}
/** Na página (apresentação, link e PDF), completa as miniaturas do TikTok que ainda não vieram. */
const THUMB_JS = `<script>(function(){if(window.__pfOe)return;window.__pfOe=1;function go(){document.querySelectorAll('img[data-oe]').forEach(function(im){if(im.getAttribute('data-done'))return;im.setAttribute('data-done','1');fetch('https://www.tiktok.com/oembed?url='+encodeURIComponent(im.getAttribute('data-oe'))).then(function(r){return r.json()}).then(function(j){if(j&&j.thumbnail_url){im.onload=function(){var a=im.closest('.vt');if(a)a.classList.add('has')};im.src=j.thumbnail_url}}).catch(function(){})})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go()})()</script>`

export function buildAvSlides(x: AvDeckOpts, o: Orientation, ctx: { live?: boolean } = {}): Slide[] {
  const live = !!ctx.live
  const land = o === 'paisagem'
  const mes = monthName(x.month)
  const vids = x.videos
  const name = x.name.trim()
  const perfil = vids.length ? mostCommon(vids.map((v) => v.perfil)) : 'media'
  const t = buildTatico(name, x.month, vids, x.ctx ?? {}, perfil)
  const out: Slide[] = []
  let sec = 0
  const num = () => String(++sec).padStart(2, '0')

  // Capa.
  const parts = [t.tom && 'tom de voz', (t.expressao || true) && 'linguagem de vídeo', t.pilares && 'linha editorial', t.semana.length && 'calendário', vids.length && 'referências'].filter(Boolean) as string[]
  const sub = parts.length > 1 ? `${cap(parts.slice(0, -1).join(', '))} e ${parts.at(-1)}` : cap(parts[0] ?? '')
  out.push({ kind: 'cover', body: `<div class="tc-top">${ellcazoSvg('#121410', 60)}<span><b>Ellcazo</b><small>Produtora audiovisual</small></span></div>
    <div class="cover-mid"><h1>${esc(name)}</h1><p class="tc-t">Plano tático de conteúdo</p><p class="tc-s">${esc(sub)}</p></div>
    <span class="pill">${esc(t.mote || `Vídeos de ${mes}`)}</span>` })

  // Essência.
  const e = t.essencia
  if (e) out.push({
    kicker: 'Diretriz da marca · Essência', title: words(e.frase, 18),
    body: `<div class="grid ${e.publico.length ? 'g2' : ''}"><div class="card lime"><h3>Propósito</h3>${e.proposito ? `<p>${esc(words(e.proposito, 30))}</p>` : ''}${e.objetivo ? `<p class="box">Neste mês: ${esc(words(e.objetivo, 30))}</p>` : ''}</div>
      ${e.publico.length ? `<div class="card"><h3>Público e experiência</h3>${e.publico.map((p) => `<p>${esc(words(p, 26))}</p>`).join('')}</div>` : ''}</div>`,
  })

  // O projeto em uma página.
  const pj = t.projeto
  if (pj) out.push({
    kicker: 'Antes de começar', title: `O projeto ${name} em uma página`,
    body: `<div class="grid g3"><div class="card lime"><h3>Nosso papel</h3><p>${esc(words(pj.papel, 30))}</p></div><div class="card"><h3>${MIC} Quem fala</h3><p>${esc(words(pj.quemFala, 26))}</p></div><div class="card"><h3>${CAM} Quem grava</h3><p>${esc(words(pj.quemGrava, 26))}</p></div></div>
      ${pj.naDuvida ? `<p class="strip">${esc(pj.naDuvida)}</p>` : ''}<p class="dose"><b>${esc(PERFIL_FALA[perfil].label)}.</b> ${esc(PERFIL_FALA[perfil].regra)}</p>`,
  })

  // 01 Tom de voz.
  if (t.tom) {
    const n = num()
    out.push({
      kicker: `${n} · Tom de voz`, title: `Como ${name} fala`,
      body: `<div class="grid ${t.tom.cards.length >= 4 ? 'g4' : t.tom.cards.length === 3 ? 'g3' : 'g2'}">${t.tom.cards.map((c) => `<div class="card"><h3>${esc(c.adjetivo)}</h3>${c.linha ? `<p>${esc(c.linha)}</p>` : ''}${c.exemplo ? `<p class="quote">“${esc(words(c.exemplo, 16))}”</p>` : ''}</div>`).join('')}</div>
        ${t.tom.evitar.length ? `<p class="chips"><b>Evitamos:</b>${t.tom.evitar.map((v) => `<span>${esc(v)}</span>`).join('')}</p>` : ''}`,
    })
  }

  // 02 Expressão de marca + linguagem de vídeo (a linguagem sempre aparece: o padrão do perfil vale quando o plano não traz).
  const nx = num()
  const ex = t.expressao
  if (ex) out.push({
    kicker: `${nx} · Expressão de marca`, title: `Como ${name} se apresenta`,
    body: `<div class="grid ${[ex.ambiente.length, ex.presenca.length].filter(Boolean).length === 2 ? 'g3' : 'g2'}"><div class="card"><h3>Visual</h3>${ex.visual ? `<p>${esc(words(ex.visual, 24))}</p>` : ''}${ex.cores.length ? `<div class="sw2">${ex.cores.map((c) => `<span><i style="--c:${esc(c.hex)}"></i>${esc(c.nome)}</span>`).join('')}</div>` : ''}</div>
      ${ex.ambiente.length ? `<div class="card"><h3>Ambiente</h3><ul class="bul">${ex.ambiente.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
      ${ex.presenca.length ? `<div class="card"><h3>Presença</h3><ul class="bul">${ex.presenca.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}</div>`,
  })
  out.push({
    kicker: `${nx} · Linguagem de vídeo`, title: t.linguagem.titulo,
    body: `<div class="split"><p class="rule${t.linguagem.frase.split(' ').length > 11 ? ' long' : ''}">${esc(t.linguagem.frase)}</p><ul class="rows">${t.linguagem.regras.map((r) => `<li><b>${esc(r.k)}</b><span>${esc(words(r.v, 14))}</span></li>`).join('')}</ul></div>`,
  })

  // 03 Linha editorial.
  if (t.pilares) {
    const n = num()
    const cs = t.pilares.cards
    out.push({
      kicker: `${n} · Linha editorial`, title: t.pilares.titulo,
      body: `${t.pilares.sub ? `<p class="lead">${esc(words(t.pilares.sub, 22))}</p>` : ''}<div class="grid ${cs.length >= 4 ? 'g4' : cs.length === 3 ? 'g3' : 'g2'} pil">${cs.map((c, i) => `<div class="card${i === 0 ? ' lime' : ''}"><span class="n">${c.n}</span><span class="u">${c.n === 1 ? 'vídeo no mês' : 'vídeos no mês'}</span><h3>${esc(c.nome)}</h3>${c.dias ? `<span class="d">${esc(c.dias)}</span>` : ''}${c.linha ? `<p>${esc(words(c.linha, 16))}</p>` : ''}</div>`).join('')}</div>`,
    })
  }

  // 04 Calendário e banco de pautas.
  if (t.semana.length) {
    const n = num()
    chunk(t.semana, 7).forEach((g, gi, all) => out.push({
      kicker: `${n} · Calendário de conteúdo`, title: all.length > 1 ? `${mes}, vídeo a vídeo (${gi + 1}/${all.length})` : `${mes}, vídeo a vídeo`,
      body: `<ul class="cal">${g.map((r) => `<li${r.destaque ? ' class="hot"' : ''}><b>${esc(r.dia)}</b><b class="pl">${esc(r.pilar)}</b><span>${esc(words(r.oque, 12))}${r.destaque ? ' · vira anúncio' : ''}</span><span class="r">${esc(r.ref)}</span></li>`).join('')}</ul>`,
    }))
    chunk(t.pautas, land ? 3 : 2).forEach((g, gi, all) => out.push({
      kicker: `${n} · Banco de pautas`, title: all.length > 1 && gi > 0 ? 'Nunca travar na hora de gravar (continuação)' : 'Nunca travar na hora de gravar',
      body: `<div class="grid ${g.length >= 3 ? 'g3' : 'g2'}">${g.map((c, i) => `<div class="card${(gi + i) % 2 ? ' lime' : ''}">${c.dias ? `<span class="up">${esc(c.dias)}</span>` : ''}<h3>${esc(c.titulo)}</h3><ul class="bul">${c.itens.map((it) => `<li>${esc(words(it, 12))}</li>`).join('')}</ul></div>`).join('')}</div>`,
    }))
  }

  // Uma página por referência + o roteiro por parágrafo.
  vids.forEach((v, i) => {
    const r = t.refs[i]!
    const ref = v.refs.find((y) => y.video && y.embed) ?? v.refs.find((y) => y.video) ?? v.refs[0]
    const thumb = ref ? (x.thumbs?.[ref.url] || directThumb(ref.url)) : ''
    const player = !ref ? `<div class="vt"><div class="ph">${PLAY}<b>Sem vídeo de referência</b></div></div>`
      : live && ref.embed ? `<div class="vt live"><iframe src="${esc(ref.embed)}" title="Vídeo de referência" loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></div><a class="vlink" href="${esc(ref.url)}" target="_blank" rel="noreferrer">▶ Abrir no ${esc(net(ref.url))}</a>`
        : `<a class="vt${thumb ? ' has' : ''}" href="${esc(ref.url)}" target="_blank" rel="noreferrer">${thumb ? `<img class="th on" src="${esc(thumb)}" alt="" referrerpolicy="no-referrer">` : /tiktok\.com\/.*\/video\//.test(ref.url) ? `<img class="th" data-oe="${esc(ref.url)}" alt="" referrerpolicy="no-referrer">` : ''}<span class="ph">${PLAY}<b>${esc(net(ref.url))}</b>${qrSvg(ref.url)}</span><span class="go-btn">▶ Assistir no ${esc(net(ref.url))}</span></a>`
    const tag = `${r.code} · ${r.dias} · ${r.pilar}`
    out.push({
      bare: true, kicker: `Vídeo ${i + 1} · ${r.code}`, title: words(v.title, 12),
      body: `${thumb || !ref ? '' : THUMB_JS}<div class="ref"><div class="ref-v">${player}</div><div class="ref-m"><span class="pill">${esc(tag)}</span><h2>${esc(words(v.title, 12))}</h2>${v.direcao ? `<p class="lead">${esc(words(v.direcao, 22))}</p>` : ''}
        ${v.variacoes.length ? `<p class="vh">3 jeitos de gravar</p><ol class="vars">${v.variacoes.slice(0, 3).map((y, k) => `<li><span class="num">${k + 1}</span><span>${esc(words(y, 12))}</span></li>`).join('')}</ol>` : ''}
        <div class="grid g2"><div class="card lime"><h3>${MIC} Quem fala</h3><ul class="bul">${v.falaTopicos.map((y) => `<li>${esc(words(y, 14))}</li>`).join('')}</ul></div><div class="card"><h3>${CAM} Quem grava</h3><ul class="bul">${v.gravaTopicos.map((y) => `<li>${esc(words(y, 14))}</li>`).join('')}</ul></div></div></div></div>`,
      details: v.cardapio.length ? { title: `Cardápio de ideias (${v.cardapio.length})`, items: v.cardapio.map((c) => ({ k: c.titulo, v: c.variacoes.join(' · ') })) } : undefined,
    })
    if (v.cenas.length) {
      const many = v.cenas.length > 4 && land
      const dense = v.cenas.length > 6
      out.push({
        bare: true, kicker: `Vídeo ${i + 1} · Roteiro`, title: `Roteiro: ${words(v.title, 10)}`,
        body: `<span class="pill">${esc(r.code)} · Roteiro${v.duracao ? ` · ${esc(v.duracao)}` : ''}</span><h2>${esc(words(v.title, 12))}</h2>
          <p class="dose"><b>${esc(PERFIL_FALA[v.perfil].label)}.</b> ${esc(PERFIL_FALA[v.perfil].regra)}</p>
          <ol class="paras${dense ? ' dense' : ''}" style="--pc:${many ? '1fr 1fr' : '1fr'}">${v.cenas.map((c, k) => `<li><span class="num">${k + 1}</span><div>${c.fala ? `<p class="fala">“${esc(words(c.fala, 30))}”</p>${c.imagem ? `<p class="img">${esc(words(c.imagem, 16))}</p>` : ''}` : `<p class="sem">${esc(words(c.imagem || 'Só imagem e som', 18))}</p>`}${c.tela ? `<span class="tela">Na tela: ${esc(words(c.tela, 8))}</span>` : ''}</div></li>`).join('')}</ol>
          ${v.cta ? `<p class="end"><b>Chamada:</b> ${esc(words(v.cta, 16))}</p>` : ''}`,
        details: { title: 'Roteiro completo', items: v.cenas.map((c) => ({ k: `Momento ${c.n}`, v: [c.fala && `Fala: “${c.fala}”`, c.imagem && `Imagem: ${c.imagem}`, c.tela && `Na tela: ${c.tela}`].filter(Boolean).join(' · ') })) },
      })
    }
  })

  // Próximo passo.
  out.push({ kind: 'statement', kicker: 'Próximo passo', body: `<div class="go-foot"><span>${esc(t.mote || `${name} · ${mes}`)}</span><span class="lg">${ellcazoSvg('#121410', 60)}<b>Ellcazo</b></span></div><h1 class="go">Vamos começar?</h1>${t.final ? `<p class="go-sub">${esc(words(t.final, 26))}</p>` : `<p class="go-sub">A Ellcazo agenda a gravação e manda cada vídeo pronto para você aprovar.</p>`}` })
  return out
}

function mostCommon<T>(xs: T[]): T { const m = new Map<T, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]![0] }
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Entrada da apresentação (tela, PDF e link público) com a identidade Ellcazo. */
export function avDeckInput(x: AvDeckOpts): DeckInput {
  return { name: x.name, doc: {}, brand: 'ellcazo', title: 'Plano tático de conteúdo', slides: (o, ctx) => buildAvSlides(x, o, ctx) }
}

/** Mensagem do WhatsApp (a pessoa confere e manda). */
export function avMessage(name: string, month: string, link: string | null, n: number): string {
  return [
    'Oi! Tudo bem? Aqui é da Ellcazo, a produtora da Peformake.',
    `Separamos o plano tático de ${monthName(month).toLowerCase()} da ${name.trim()}: tom de voz, linha editorial, calendário e ${n === 1 ? 'a referência do vídeo' : `as referências dos ${n} vídeos`}, com o roteiro de cada um.`,
    link ? `Está tudo aqui (abre no celular):\n${link}` : 'Vou te mandar o PDF por aqui.',
    'Se quiser mudar alguma coisa, me fala antes da gravação.',
  ].join('\n\n')
}
