// Apresentação da Estratégia do mês, no mesmo estilo do diagnóstico (consultDeck): uma mensagem por slide,
// no máximo 4 itens curtos embaixo, nenhuma frase cortada (fitSlides ajusta a escala). Texto completo em "Ver detalhes".
import { esc, words, type DeckInput, type Orientation, type Slide } from './consultDeck'
import { AREA, monthName, weekRange, type MonthlyAction, type MonthlyStrategy } from './monthlyRules'

const chunk = <T,>(a: T[], n: number): T[][] => { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out }
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
const tag = (a: MonthlyAction) => `<span style="display:inline-block;font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:.62em;color:${AREA[a.area].color};margin-right:.5em">${esc(AREA[a.area].label)}</span>`

export interface MonthlyDeckOpts { name: string; strategy: MonthlyStrategy; clientLogoUrl?: string | null; peformakeLogoUrl?: string | null }

export function buildMonthlySlides(x: MonthlyDeckOpts, o: Orientation): Slide[] {
  const { strategy: st, name } = x
  const d = st.doc ?? {}
  const land = o === 'paisagem'
  const mes = monthName(st.month)
  const live = st.actions.filter((a) => a.status !== 'recusada')
  const out: Slide[] = []
  const brand = `<div class="cover-top">${x.peformakeLogoUrl ? `<img class="pf-logo" src="${esc(x.peformakeLogoUrl)}" alt="Peformake">` : ''}<span class="brand">Peformake</span></div>`
  const logo = x.clientLogoUrl ? `<img class="cli-logo" src="${esc(x.clientLogoUrl)}" alt="">` : `<span class="cli-mono">${esc(initials(name))}</span>`

  out.push({ kind: 'cover', body: `${brand}<div class="cover-mid">${logo}<p class="kicker">Estratégia de ${esc(mes)}</p><h1>${esc(name)}</h1></div><p class="cover-foot">${esc(monthName(st.month, true))} · Consultoria Peformake</p>` })

  const kpis = [
    d.meta?.numero ? [esc(words(d.meta.numero, 6)), esc(words(d.meta.texto ?? 'Meta do mês', 8))] : null,
    live.length ? [String(live.length), 'Ações planejadas'] : null,
    ['4', 'Semanas já planejadas'],
  ].filter(Boolean) as [string, string][]
  if (d.titulo) out.push({ kind: 'statement', kicker: `${mes} em uma frase`, body: `<p class="big">${esc(words(d.titulo, 22))}</p><div class="kpis">${kpis.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`,
    details: { title: 'Onde estamos', items: [d.situacao ? { v: d.situacao } : null, d.foco ? { k: 'Aposta do mês', v: d.foco } : null, d.meta?.como_medir ? { k: 'Como medimos', v: d.meta.como_medir } : null].filter(Boolean) as { k?: string; v: string }[] } })

  const leit = d.leitura ?? []
  chunk(leit, 3).forEach((g, i, all) => out.push({
    kicker: 'Dado vira decisão', title: all.length > 1 ? `O que os números dizem (${i + 1}/${all.length})` : 'O que os números dizem',
    body: `<div class="${land ? 'grid g3' : 'stack'}">${g.map((l) => `<div class="card find" style="--c:#007a8a"><p class="num-big${String(l.numero).length > 12 ? ' long' : ''}">${esc(words(l.numero, 6))}</p><h3>${esc(words(l.fato, 14))}</h3><p>→ ${esc(words(l.decisao, 16))}</p></div>`).join('')}</div>`,
    details: { title: 'Dado vira decisão', items: g.map((l) => ({ k: `${l.numero} · ${l.fato}`, v: `Decisão: ${l.decisao}` })) },
  }))

  const weeks = (d.semanas ?? []).slice(0, 4)
  if (weeks.length) out.push({
    kicker: 'O mês inteiro', title: 'As 4 semanas',
    body: `<div class="${land ? 'grid g4' : 'stack'}">${weeks.map((w) => `<div class="card soft"><p class="tag" style="color:var(--acc);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.6em">Semana ${w.semana} · ${esc(weekRange(st.month, w.semana))}</p><h3>${esc(words(w.tema, 8))}</h3>${land ? `<p>${esc(words(w.objetivo, 14))}</p>` : ''}</div>`).join('')}</div>`,
    details: { title: 'As 4 semanas', items: weeks.map((w) => ({ k: `Semana ${w.semana}: ${w.tema}`, v: [w.objetivo, w.datas?.length ? `Datas: ${w.datas.join(', ')}` : ''].filter(Boolean).join(' · ') })) },
  })

  for (const w of [1, 2, 3, 4] as const) {
    const acts = live.filter((a) => a.week === w)
    if (!acts.length) continue
    const theme = weeks.find((x2) => x2.semana === w)?.tema
    chunk(acts, 4).forEach((g, i, all) => out.push({
      kicker: `Semana ${w} · ${weekRange(st.month, w)}`, title: `${theme ? words(theme, 8) : `Semana ${w}`}${all.length > 1 ? ` (${i + 1}/${all.length})` : ''}`,
      body: `<ul class="steps">${g.map((a) => `<li><span class="num" style="background:${AREA[a.area].color};color:#fff">${a.due_date ? esc(a.due_date.slice(8, 10)) : w}</span><span>${tag(a)}<b>${esc(words(a.title, 12))}</b>${a.proof ? `<small>Meta: ${esc(words(a.proof, 12))}</small>` : ''}</span></li>`).join('')}</ul>`,
      details: { title: `Semana ${w}`, items: g.map((a) => ({ k: `${AREA[a.area].label}: ${a.title}`, v: [a.place && `Onde: ${a.place}`, a.owner_role && `Quem: ${a.owner_role}`, a.due_date && `Até ${a.due_date.slice(8, 10)}/${a.due_date.slice(5, 7)}`, a.proof && `Número que prova: ${a.proof}`, a.why && `Por quê: ${a.why}`].filter(Boolean).join(' · ') })) },
    }))
  }

  const metas = d.metas_area ?? []
  if (metas.length) chunk(metas, land ? 3 : 4).forEach((g, i, all) => out.push({
    kicker: 'Metas do mês', title: all.length > 1 ? `Como vamos medir (${i + 1}/${all.length})` : 'Como vamos medir',
    body: `<div class="${land ? 'grid g3' : 'stack'}">${g.map((m) => `<div class="card ind" style="--c:${AREA[m.area]?.color ?? '#007a8a'}"><p class="tag" style="color:var(--c);font-weight:800;text-transform:uppercase;font-size:.6em;letter-spacing:.08em">${esc(AREA[m.area]?.label ?? m.area)}</p><p class="meta-big">${esc(words(m.numero, 6))}</p><p>${esc(words(m.meta, 14))}</p></div>`).join('')}</div>`,
  }))

  const ofertas = d.ofertas ?? []
  if (ofertas.length) out.push({
    kicker: 'Ofertas', title: ofertas.length === 1 ? 'A oferta do mês' : 'As ofertas do mês',
    body: `<div class="${land ? `grid g${Math.min(3, ofertas.length)}` : 'stack'}">${ofertas.slice(0, 3).map((f) => `<div class="card soft"><h3>${esc(words(f.nome, 8))}</h3><p>${esc(words(f.condicao, 16))}</p></div>`).join('')}</div>`,
    details: { title: 'Ofertas', items: ofertas.map((f) => ({ k: f.nome, v: `${f.condicao} · Por quê: ${f.porque}` })) },
  })

  const riscos = d.riscos ?? []
  if (riscos.length) out.push({
    kicker: 'Atenção', title: 'Se algo sair do plano',
    body: `<div class="${land ? `grid g${Math.min(3, riscos.length)}` : 'stack'}">${riscos.slice(0, 3).map((r) => `<div class="card"><h3>${esc(words(r.risco, 12))}</h3><p>Plano B: ${esc(words(r.plano_b, 14))}</p></div>`).join('')}</div>`,
  })

  const qs = d.perguntas ?? []
  if (qs.length) out.push({ kicker: 'Do seu lado', title: 'O que precisamos saber de você', body: `<ul class="qs">${qs.slice(0, 4).map((q, i) => `<li><span class="num">${i + 1}</span><span>${esc(words(q, 18))}</span></li>`).join('')}</ul>` })

  out.push({ kind: 'cover', body: `${brand}<div class="cover-mid"><p class="kicker">Próximo passo</p><h1>Bora executar ${esc(mes.toLowerCase())}?</h1><p class="lead">A gente acompanha toda segunda e ajusta o que mudar.</p></div><p class="cover-foot">Peformake · assessoria de marketing</p>` })
  return out
}

/** DeckInput para SlideViewer, modo apresentação e PDF (mesmas funções do diagnóstico). */
export function monthlyDeckInput(x: MonthlyDeckOpts): DeckInput {
  return { name: x.name, doc: {}, title: `Estratégia de ${monthName(x.strategy.month)}`, clientLogoUrl: x.clientLogoUrl, peformakeLogoUrl: x.peformakeLogoUrl, slides: (o) => buildMonthlySlides(x, o) }
}
