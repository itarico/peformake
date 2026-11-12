// Apresentação/PDF do audiovisual do mês para o CLIENTE, com a identidade da Ellcazo (logo + verde-limão e preto).
// Mesmo sistema de slides do diagnóstico (consultDeck): uma mensagem por slide, nada cortado com "…" (fitSlides ajusta).
// Só os vídeos aprovados. Por vídeo: abertura (objetivo, ideia, gancho) → roteiro cena a cena → como filmar →
// referências e engajamento → versão para anúncio (quando vira anúncio). Nada interno (custo, "a confirmar", observações).
import { ellcazoSvg } from '@/components/ui/EllcazoMark'
import { esc, words, type DeckInput, type Orientation, type Slide } from './consultDeck'
import QRCode from 'qrcode'
import { PAPEL, whenLabel, type AvVideo } from './avPlan'
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

export interface AvDeckOpts { name: string; month: string; videos: AvVideo[] }

export function buildAvSlides(x: AvDeckOpts, o: Orientation, ctx: { live?: boolean } = {}): Slide[] {
  const live = !!ctx.live
  const land = o === 'paisagem'
  const mes = monthName(x.month)
  const vids = x.videos
  const out: Slide[] = []
  const logo = ellcazoSvg('#B5E61D', 40).replace('<svg ', '<svg class="ecz-logo" ')
  const brand = `<div class="cover-top">${logo}<span class="brand">Ellcazo · Produtora audiovisual</span></div>`
  const n = vids.length

  out.push({ kind: 'cover', body: `${brand}<div class="cover-mid"><p class="kicker">Vídeos de ${esc(mes)}</p><h1>${esc(x.name)}</h1></div><p class="cover-foot">${n} ${n === 1 ? 'vídeo aprovado' : 'vídeos aprovados'} · referência, ideias, roteiro e filmagem</p>` })

  // Os vídeos do mês, de relance.
  chunk(vids, land ? 5 : 7).forEach((g, gi, all) => out.push({
    kicker: 'O mês em vídeo', title: all.length > 1 ? `Os vídeos de ${mes} (${gi + 1}/${all.length})` : `Os vídeos de ${mes}`,
    body: `<ol class="vlist">${g.map((v, k) => `<li><span class="num">${gi * (land ? 5 : 7) + k + 1}</span><span><b>${esc(words(v.title, 10))}</b><small>${esc(whenLabel(v))}${v.duracao ? ` · ${esc(v.duracao)}` : ''}</small></span><span class="tags"><span class="acc">${esc(PAPEL[v.papel].label)}</span>${v.anuncio ? '<span>Vira anúncio</span>' : ''}</span></li>`).join('')}</ol>`,
  }))

  vids.forEach((v, i) => {
    const tag = `Vídeo ${i + 1} de ${n} · ${whenLabel(v)}`
    const kv = (k: string, val: string) => (val ? `<p><b>${esc(k)}</b>${esc(words(val, 22))}</p>` : '')
    const ref = v.refs.find((r) => r.video) ?? v.refs[0]
    // 1. A página do vídeo (estudo e execução): a referência para assistir, o papel no mês e ideias rápidas.
    //    Na tela, a referência toca ali mesmo; no PDF, vira QR + link clicável.
    const player = ref
      ? (live && ref.embed
        ? `<div class="ref-live"><iframe src="${esc(ref.embed)}" title="Vídeo de referência" loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`
        : `<a class="ref-card" href="${esc(ref.url)}" target="_blank" rel="noreferrer">${qrSvg(ref.url)}<span><b>Assista à referência</b>${esc(ref.label)}<small>${esc(ref.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48))}</small></span></a>`)
      : ''
    const others = v.refs.filter((r) => r !== ref).slice(0, 2)
    out.push({
      kicker: `${tag} · ${PAPEL[v.papel].label}`, title: words(v.title, 12),
      body: `<div class="vpage${player ? '' : ' noref'}">${player ? `<div class="vref">${player}${ref?.note ? `<p class="refnote">${esc(words(ref.note, 14))}</p>` : ''}${live && ref?.embed ? `<a class="refnote" href="${esc(ref.url)}" target="_blank" rel="noreferrer">Não tocou? Abrir em ${esc(ref.label.split(' · ')[0]!)}</a>` : ''}</div>` : ''}
        <div class="vmain"><p class="tags"><span class="acc">${esc(PAPEL[v.papel].label)}</span>${v.objetivo !== PAPEL[v.papel].label ? `<span>${esc(v.objetivo)}</span>` : ''}${v.duracao ? `<span>${esc(v.duracao)}</span>` : ''}${v.anuncio ? '<span>Vira anúncio</span>' : ''}</p>
        <p class="why">${esc(words(v.papelPorque, 34))}</p>
        ${v.engajar.gancho ? `<p class="callout"><b>Gancho (0 a 3 s):</b> “${esc(words(v.engajar.gancho, 18))}”</p>` : ''}
        ${v.ideias.length ? `<div class="ideas"><h3>Ideias rápidas</h3><ul class="bul">${v.ideias.slice(0, 5).map((t) => `<li>${esc(words(t, 16))}</li>`).join('')}</ul></div>` : ''}
        ${others.length ? `<p class="more">Mais referências: ${others.map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.label)}</a>`).join(' · ')}</p>` : ''}</div></div>`,
      details: { title: 'Estudo do vídeo', items: [
        { k: `Papel: ${PAPEL[v.papel].label}`, v: v.papelPorque }, v.ideia ? { k: 'A ideia', v: v.ideia } : null,
        ...v.refs.map((r) => ({ k: r.label, v: r.note || 'Referência', url: r.url })),
      ].filter(Boolean) as { k?: string; v: string; url?: string }[] },
    })

    // 2. Roteiro cena a cena, de apoio ("caso precise").
    if (v.cenas.length) {
      const parts = sceneChunks(v.cenas, land ? 4 : 6)
      parts.forEach((g, gi) => {
        const last = gi === parts.length - 1
        out.push({
          kicker: `Vídeo ${i + 1} · Roteiro, caso precise${v.quemFala ? ` · ${words(v.quemFala, 8)}` : ''}`, title: parts.length > 1 ? `${words(v.title, 8)} (${gi + 1}/${parts.length})` : words(v.title, 10),
          body: `<ol class="scn">${g.map((c) => `<li><span class="t"><span class="num">${c.n}</span>${c.tempo ? `<small>${esc(c.tempo)}</small>` : ''}</span><span><p class="img">${esc(words(c.imagem, 22))}</p>${c.fala ? `<p class="fala">“${esc(words(c.fala, 28))}”</p>` : ''}${c.tela ? `<span class="tela">${esc(words(c.tela, 10))}</span>` : ''}</span></li>`).join('')}</ol>
            ${last && (v.fechamento || v.cta) ? `<p class="callout light">${v.fechamento ? `<b>Fechamento:</b> ${esc(words(v.fechamento, 26))}` : ''}${v.fechamento && v.cta ? '<br>' : ''}${v.cta ? `<b>Chamada:</b> ${esc(words(v.cta, 16))}` : ''}</p>` : ''}`,
          details: { title: 'Roteiro completo', items: v.cenas.map((c) => ({ k: `Cena ${c.n}${c.tempo ? ` (${c.tempo})` : ''}`, v: [c.imagem, c.fala && `Fala: “${c.fala}”`, c.tela && `Na tela: ${c.tela}`].filter(Boolean).join(' · ') })) },
        })
      })
    }

    // 3. Como filmar e engajar (uma página).
    const f = v.filmagem
    out.push({
      kicker: `Vídeo ${i + 1} · Filmagem`, title: 'Como filmar',
      body: `<div class="cols2"><div class="card"><div class="kv">${kv('Enquadramento', f.enquadramento.join('; '))}${kv('Luz', f.luz)}${kv('Onde', f.locacao)}${kv('Quem aparece', f.quem)}</div></div>
        <div class="card soft">${f.levar.length ? `<h3>O que levar</h3><ul class="bul">${f.levar.map((t) => `<li>${esc(words(t, 14))}</li>`).join('')}</ul>` : ''}${f.takes.length ? `<h3>Takes extras</h3><ul class="bul">${f.takes.map((t) => `<li>${esc(words(t, 14))}</li>`).join('')}</ul>` : ''}</div></div>
        <p class="callout light"><b>Para engajar:</b> ${esc(words(v.engajar.pergunta, 22))}${v.engajar.audio ? `<br><b>Áudio:</b> ${esc(words(v.engajar.audio, 16))}` : ''}</p>`,
    })

    // 4. Versão para anúncio.
    const ad = v.anuncio
    if (ad) out.push({
      kicker: `Vídeo ${i + 1} · Anúncio`, title: 'Versão para anúncio',
      body: `<p class="callout"><b>Gancho:</b> “${esc(words(ad.gancho, 18))}”</p>
        <div class="cols2"><div class="card"><div class="kv">${kv('Formato', ad.formato)}${kv('Duração', ad.duracao)}${kv('Corte', ad.corte)}${kv('Chamada', ad.cta)}</div></div>
        <div class="card soft">${ad.variacoes.length ? `<h3>Outros ganchos para testar</h3><ul class="bul">${ad.variacoes.map((t) => `<li>“${esc(words(t, 14))}”</li>`).join('')}</ul>` : ''}${ad.texto ? `<div class="kv">${kv('Texto do anúncio', ad.texto)}${kv('Título', ad.titulo)}</div>` : ''}</div></div>`,
    })
  })

  out.push({ kind: 'cover', body: `${brand}<div class="cover-mid"><p class="kicker">Próximo passo</p><h1>Luz, câmera e ação</h1><p class="lead">A Ellcazo agenda a gravação e manda cada vídeo pronto para você aprovar antes de ir ao ar.</p></div><p class="cover-foot">Ellcazo · Produtora audiovisual</p>` })
  return out
}

/** Entrada da apresentação (tela, PDF e link público) com a identidade Ellcazo. */
export function avDeckInput(x: AvDeckOpts): DeckInput {
  return { name: x.name, doc: {}, brand: 'ellcazo', title: `Vídeos de ${monthName(x.month)}`, slides: (o, ctx) => buildAvSlides(x, o, ctx) }
}

/** Mensagem do WhatsApp (a pessoa confere e manda). */
export function avMessage(name: string, month: string, link: string | null, n: number): string {
  return [
    'Oi! Tudo bem? Aqui é da Ellcazo, a produtora da Peformake.',
    `Separamos ${n === 1 ? 'o vídeo' : `os ${n} vídeos`} de ${monthName(month).toLowerCase()} da ${name.trim()}: roteiro cena a cena, como vamos filmar e as referências.`,
    link ? `Está tudo aqui (abre no celular):\n${link}` : 'Vou te mandar o PDF por aqui.',
    'Se quiser mudar alguma coisa, me fala antes da gravação.',
  ].join('\n\n')
}
