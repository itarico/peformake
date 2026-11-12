// Apresentação da Estratégia do mês para o CLIENTE, no mesmo sistema do diagnóstico (consultDeck): uma mensagem por slide,
// nada cortado com "…" (fitSlides ajusta a escala), gráfico no lugar de texto. Cerca de 14 slides:
// capa → o mês em uma frase → dado vira decisão → as semanas (gráfico) → 1 slide por semana → como medimos → ofertas →
// o que fica com você → o que precisamos saber → se algo sair do plano → fechamento.
// Nunca mostra o que é interno: cargos da equipe, tarefas de bastidor (pedir peça, registrar, separar), "a confirmar", nomes da equipe.
// Mês já começado: as semanas que já tinham acabado quando a estratégia foi gerada ficam fora (o plano vale dali para frente).
// O texto completo de cada slide fica em "Ver detalhes" (só na tela da equipe).
import { esc, words, type DeckInput, type Orientation, type Slide } from './consultDeck'
import { onColor } from './consultCharts'
import { AREA, dm, monthName, pastWeeks, weekRange, weeksOf, type ActionArea, type MonthlyAction, type MonthlyStrategy } from './monthlyRules'


/** Cores das áreas na apresentação (identidade Peformake: ciano, petróleo e cinzas). A tela do sistema usa AREA.color. */
export const DECK_AREA: Record<ActionArea, string> = {
  trafego: '#1FC8DB', social: '#0B3C44', design: '#056F84', audiovisual: '#5D6C73', vendas: '#9FB4BA', atendimento: '#CFE0E4',
}
const SHOW: ActionArea[] = ['trafego', 'social', 'design', 'audiovisual', 'vendas']

/** Frase que é recado interno (o que ainda falta combinar, suposição, áudio...): não vai para o cliente. */
const INTERNAL = /(a confirmar|confirmar com|a fechar com|se o cliente confirmar|n[ãa]o ouvid|ouvir o [áa]udio|sem pre[çc]o divulgado antes|suposi[çc][ãa]o|\[confirmar)/i
/** Tarefa de bastidor (pedido interno entre áreas, registro): fica fora do slide do cliente. */
const BACKSTAGE = /^(pedir|registrar|separar|cobrar|conferir|briefar|anotar)\b|\(conclu[ií]d[oa]\)/i
const sentences = (s: unknown) => String(s ?? '').trim().replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean)
/** Só as frases que o cliente pode ler. */
export const clientText = (s: unknown) => sentences(s).filter((x) => !INTERNAL.test(x)).join(' ')
/** Número curto: só a primeira parte (antes de ";" ou de uma segunda frase), sem parênteses. */
export const shortNum = (s: unknown) => (sentences(s)[0] ?? '').split(/;/)[0]!.replace(/\s*\([^)]*\)/g, '').replace(/[.\s]+$/, '').trim()
/** "30 conversas iniciadas até 30/11" → ["30 conversas", "iniciadas até 30/11"]. */
export function bigNum(s: unknown): [string, string] {
  const t = shortNum(s)
  const m = /^((?:R\$\s?)?[\d.,]+\s?%?(?:\s?mil)?)\s+(\S+)\s*(.*)$/i.exec(t)
  return m ? [`${m[1]} ${m[2]}`, m[3] || 'meta do mês'] : [t, 'meta do mês']
}
/** Número de meta bem curto: se ficar longo, corta no primeiro " e " ou vírgula ("30 conversas até 30/11 e 0 dias parados" → "30 conversas até 30/11"). */
export const tight = (s: unknown) => { const t = shortNum(s); if (t.length <= 26) return t; const m = /^(.{8,}?)(?:,\s| e )/.exec(t); return m ? m[1]! : t }
/** Data da semana que cabe num cartão: "20/12 - Dia do Mecânico" → "20/12 · Dia do Mecânico" (só se o nome for curto). */
export function dateLabel(datas: string[] | undefined): string | null {
  for (const d of datas ?? []) {
    const m = /^(\d{1,2}\/\d{1,2})\s*[-–:]\s*(.+)$/.exec(String(d).replace(/\s*\([^)]*\)/g, '').trim())
    if (m && m[2]!.split(/\s+/).length <= 5) return `${m[1]} · ${m[2]}`
  }
  return null
}
/** Ação que a equipe adicionou na guia de revisão (monthly_action_add). O link público marca com `added`. */
export const ADDED_WHY = 'Ideia adicionada pela equipe na revisão.'
export const isAdded = (a: MonthlyAction) => !!a.added || a.why === ADDED_WHY
const isClient = (a: MonthlyAction) => (a.owner_role ?? '').trim().toLowerCase() === 'cliente'

/** Semanas que ainda valem: as que não tinham acabado quando a estratégia foi gerada. */
export function activeWeeks(st: Pick<MonthlyStrategy, 'month' | 'doc'>): (1 | 2 | 3 | 4)[] {
  const past = pastWeeks(st.month, st.doc?.gerado_em)
  const live = ([1, 2, 3, 4] as const).filter((w) => !past.includes(w))
  return live.length ? [...live] : [4]
}

/** Até 4 ações que mostram a semana para o cliente: uma por área (tráfego, social, design, vídeo, vendas), sem bastidor. */
export function weekHighlights(acts: MonthlyAction[]): { show: MonthlyAction[]; rest: number } {
  const seen = new Set<string>()
  const cand = acts.filter((a) => !isClient(a) && SHOW.includes(a.area) && !BACKSTAGE.test(a.title))
    .filter((a) => { const k = a.title.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
  const show: MonthlyAction[] = []
  for (const ar of SHOW) { const a = cand.find((x) => x.area === ar); if (a) show.push(a) }
  for (const a of cand) { if (show.length >= 4) break; if (!show.includes(a)) show.push(a) }
  const pick = show.slice(0, 4).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  return { show: pick, rest: acts.filter((a) => !isClient(a)).length - pick.length }
}

export interface MonthlyDeckOpts { name: string; strategy: MonthlyStrategy; clientLogoUrl?: string | null; peformakeLogoUrl?: string | null
  /** Apresentação de uma área (Tráfego, Social e design): entra no selo da capa. */
  label?: string }

export function buildMonthlySlides(x: MonthlyDeckOpts, o: Orientation): Slide[] {
  const { strategy: st, name } = x
  const d = st.doc ?? {}
  const land = o === 'paisagem'
  const mes = monthName(st.month)
  const wks = activeWeeks(st)
  const midMonth = wks[0] !== 1
  const live = st.actions.filter((a) => a.status !== 'recusada' && wks.includes(a.week))
  const team = live.filter((a) => !isClient(a))
  const out: Slide[] = []
  const brand = `<div class="cover-top">${x.peformakeLogoUrl ? `<img class="pf-logo" src="${esc(x.peformakeLogoUrl)}" alt="Peformake">` : ''}<span class="brand">Peformake</span></div>`
  // Sem logo do cliente na apresentação (pedido do Italo, 13/11): a capa leva só a marca da Peformake e o nome.
  const logo = ''
  const range = weeksOf(st.month)
  const from = midMonth ? (d.gerado_em ? dm(new Date(new Date(d.gerado_em).getTime() - 3 * 3600_000).toISOString().slice(0, 10)) : dm(range[wks[0]! - 1]!.from)) : dm(range[0]!.from)
  const period = `${from} a ${dm(range[3]!.to)}`
  const areaTag = (a: MonthlyAction) => `<span class="atag"><span class="dot" style="--c:${DECK_AREA[a.area]}"></span>${esc(AREA[a.area].label)}</span>`

  // 1. Capa
  out.push({ kind: 'cover', body: `${brand}<div class="cover-mid">${logo}<p class="kicker">${x.label ? `${esc(x.label)} · ` : ''}Estratégia de ${esc(mes)}</p><h1>${esc(name)}</h1></div><p class="cover-foot">${esc(period)} · Consultoria Peformake</p>` })

  // 2. O mês em uma frase + 3 números
  const [metaBig, metaLabel] = d.meta?.numero ? bigNum(d.meta.numero) : ['', '']
  const content = team.filter((a) => ['social', 'design', 'audiovisual'].includes(a.area)).length
  const ads = team.filter((a) => a.area === 'trafego').length
  const kpis = [
    metaBig ? [esc(words(metaBig, 4)), esc(words(metaLabel, 7))] : null,
    content ? [String(content), 'posts, artes e vídeos'] : null,
    ads ? [String(ads), 'ações nos anúncios'] : null,
  ].filter(Boolean) as [string, string][]
  if (d.titulo) out.push({ kind: 'statement', kicker: midMonth ? `${mes}: de ${from} em diante` : `${mes} em uma frase`, body: `<p class="big">${esc(words(d.titulo, 22))}</p>${kpis.length ? `<div class="kpis">${kpis.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('')}</div>` : ''}`,
    details: { title: 'Onde estamos', items: [d.situacao ? { v: d.situacao } : null, d.foco ? { k: 'Aposta do mês', v: d.foco } : null, d.meta?.texto ? { k: 'Meta', v: `${d.meta.texto} (${d.meta.numero ?? ''})` } : null, d.meta?.como_medir ? { k: 'Como medimos', v: d.meta.como_medir } : null].filter(Boolean) as { k?: string; v: string }[] } })

  // 3. Dado vira decisão: os 3 achados mais fortes que o cliente pode ver
  const leit = (d.leitura ?? []).filter((l) => !INTERNAL.test(`${l.fato} ${l.decisao} ${l.numero}`))
  if (leit.length) out.push({
    kicker: 'Dado vira decisão', title: 'O que os números dizem',
    body: `<div class="${land ? 'grid g3' : 'stack lst'}">${leit.slice(0, 3).map((l) => { const n = shortNum(l.numero); return `<div class="card find" style="--c:#1FC8DB"><p class="num-big${n.length > 12 ? ' long' : ''}">${esc(words(n, 6))}</p><p>${esc(words(clientText(l.fato) || l.fato, 16))}</p><h3>→ ${esc(words(sentences(l.decisao)[0] ?? l.decisao, 14))}</h3></div>` }).join('')}</div>`,
    details: { title: 'Dado vira decisão', items: (d.leitura ?? []).map((l) => ({ k: `${l.numero} · ${l.fato}`, v: `Decisão: ${l.decisao}` })) },
  })

  // 4. As semanas, com o peso de cada área (gráfico de barras empilhadas)
  const weeks = (d.semanas ?? []).filter((w) => wks.includes(w.semana as 1 | 2 | 3 | 4)).slice(0, 4)
  const areasUsed = SHOW.filter((ar) => team.some((a) => a.area === ar))
  if (weeks.length) out.push({
    kicker: midMonth ? `De ${period}` : 'O mês inteiro', title: weeks.length === 4 ? 'As 4 semanas' : `As próximas ${weeks.length} semanas`,
    body: `<div class="${land ? `grid tall g${weeks.length}` : 'stack'}">${weeks.map((w) => {
      const acts = team.filter((a) => a.week === w.semana)
      const bars = SHOW.map((ar) => [ar, acts.filter((a) => a.area === ar).length] as const).filter(([, n]) => n > 0)
      return `<div class="card soft"><p class="wk">Semana ${w.semana}<br>${esc(weekRange(st.month, w.semana))}</p><h3>${esc(words(w.tema, 7))}</h3>${dateLabel(w.datas) ? `<p class="cnt"><b>${esc(dateLabel(w.datas))}</b></p>` : ''}<p class="cnt">${acts.length} entregas</p><div class="wbar">${bars.map(([ar, n]) => `<i style="--c:${DECK_AREA[ar]};flex:${n}"></i>`).join('')}</div></div>`
    }).join('')}</div><div class="lrow">${areasUsed.map((ar) => `<span><span class="dot" style="--c:${DECK_AREA[ar]}"></span>${AREA[ar].label}</span>`).join('')}</div>`,
    details: { title: 'As semanas', items: weeks.map((w) => ({ k: `Semana ${w.semana}: ${w.tema}`, v: [w.objetivo, w.datas?.length ? `Datas: ${w.datas.join(', ')}` : ''].filter(Boolean).join(' · ') })) },
  })

  // 5. Uma semana por slide: o objetivo e até 4 entregas (uma por área)
  for (const w of wks) {
    const acts = live.filter((a) => a.week === w)
    if (!acts.length) continue
    const theme = (d.semanas ?? []).find((x2) => x2.semana === w)
    const { show, rest } = weekHighlights(acts.filter((a) => !isAdded(a)))
    if (!show.length) continue
    const goal = clientText(theme?.objetivo)
    out.push({
      kicker: `Semana ${w} · ${weekRange(st.month, w)}`, title: theme?.tema ? words(theme.tema, 8) : `Semana ${w}`,
      body: `${goal ? `<p class="lead">${esc(words(sentences(goal).slice(0, 2).join(' '), 26))}</p>` : ''}<ul class="steps lg">${show.map((a) => `<li><span class="num" style="background:${DECK_AREA[a.area]};color:${onColor(DECK_AREA[a.area])}">${a.due_date ? esc(a.due_date.slice(8, 10)) : w}</span><span>${areaTag(a)}<b>${esc(words(a.title, 12))}</b></span></li>`).join('')}</ul>${rest > 0 ? `<p class="caption" style="text-align:left">E mais ${rest} ${rest === 1 ? 'entrega' : 'entregas'} da equipe nesta semana.</p>` : ''}`,
      details: { title: `Semana ${w}`, items: acts.map((a) => ({ k: `${AREA[a.area].label}: ${a.title}`, v: [a.place && `Onde: ${a.place}`, a.owner_role && `Quem: ${a.owner_role}`, a.due_date && `Até ${dm(a.due_date)}`, a.proof && `Número que prova: ${a.proof}`, a.why && `Por quê: ${a.why}`].filter(Boolean).join(' · ') })) },
    })
  }

  // 5b. Ação adicionada pela equipe na revisão: um slide próprio para cada (não some no meio da semana).
  for (const a of live.filter(isAdded)) {
    out.push({
      kicker: `Semana ${a.week} · ideia nova`, title: words(a.title, 12),
      body: `<p class="lead">${areaTag(a)}</p><ul class="steps lg"><li><span class="num" style="background:${DECK_AREA[a.area]};color:${onColor(DECK_AREA[a.area])}">${a.due_date ? esc(a.due_date.slice(8, 10)) : a.week}</span><span><b>${esc(words(a.title, 16))}</b>${a.what?.trim() ? `<span class="caption" style="text-align:left">${esc(words(clientText(a.what) || a.what, 30))}</span>` : ''}</span></li></ul><p class="caption" style="text-align:left">Semana ${a.week} · ${esc(weekRange(st.month, a.week))}${a.due_date ? ` · até ${esc(dm(a.due_date))}` : ''}</p>`,
      details: a.what?.trim() ? { title: a.title, items: [{ v: a.what }] } : undefined,
    })
  }

  // 6. Como vamos medir: a meta do mês + o número de cada área
  const metas = (d.metas_area ?? []).filter((m) => SHOW.includes(m.area)).slice(0, 4)
  if (metas.length || metaBig) out.push({
    kicker: 'Metas', title: 'Como vamos medir',
    body: `${metaBig ? `<div class="metabox"><b>${esc(words(metaBig, 4))}</b><span>${esc(words(metaLabel, 8))} · a meta do mês</span></div>` : ''}${metas.length ? `<div class="grid ${land ? `g${metas.length}` : 'g2'}">${metas.map((m) => `<div class="card ind" style="--c:${DECK_AREA[m.area] ?? '#1FC8DB'}"><p class="atag">${esc(AREA[m.area]?.label ?? m.area)}</p><p class="meta-big">${esc(words(tight(m.numero), 6))}</p><p>${esc(words(m.meta, 12))}</p></div>`).join('')}</div>` : ''}`,
    details: { title: 'Como medimos', items: [d.meta?.como_medir ? { k: 'Meta do mês', v: d.meta.como_medir } : null, ...metas.map((m) => ({ k: AREA[m.area]?.label ?? m.area, v: `${m.numero}: ${m.meta}` }))].filter(Boolean) as { k?: string; v: string }[] },
  })

  // 7. Ofertas (sem os recados de "a confirmar")
  const ofertas = (d.ofertas ?? []).slice(0, 3)
  if (ofertas.length) out.push({
    kicker: 'Ofertas', title: ofertas.length === 1 ? 'A oferta do mês' : 'As ofertas do mês',
    body: `<div class="${land ? `grid g${ofertas.length}` : 'stack'}">${ofertas.map((f) => `<div class="card soft xl"><h3 class="hl" style="--c:#1FC8DB">${esc(words(f.nome, 8))}</h3><p>${esc(words(clientText(f.condicao) || clientText(f.porque), 18))}</p></div>`).join('')}</div>`,
    details: { title: 'Ofertas', items: (d.ofertas ?? []).map((f) => ({ k: f.nome, v: `${f.condicao} · Por quê: ${f.porque}` })) },
  })

  // 8. O que fica com você (ações do próprio cliente, com data)
  const mine = live.filter(isClient).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')).slice(0, 6)
  if (mine.length) out.push({
    kicker: 'Do seu lado', title: 'O que fica com você',
    body: `<ul class="steps lg${land && mine.length > 3 ? ' two' : ''}">${mine.map((a) => `<li><span class="pill">${a.due_date ? esc(dm(a.due_date)) : `Sem. ${a.week}`}</span><span><b>${esc(words(a.title, 11))}</b></span></li>`).join('')}</ul>`,
    details: { title: 'Do seu lado', items: mine.map((a) => ({ k: a.title, v: [a.due_date && `Até ${dm(a.due_date)}`, a.proof && `Número que prova: ${a.proof}`].filter(Boolean).join(' · ') })) },
  })

  // 9. O que precisamos saber
  const qs = d.perguntas ?? []
  if (qs.length) out.push({ kicker: 'Do seu lado', title: 'O que precisamos saber de você', body: `<ul class="qs lg">${qs.slice(0, 4).map((q, i) => `<li><span class="num">${i + 1}</span><span>${esc(words(q, 22))}</span></li>`).join('')}</ul>` })

  // 10. Se algo sair do plano
  const riscos = (d.riscos ?? []).filter((r) => !INTERNAL.test(r.risco)).slice(0, 3)
  if (riscos.length) out.push({
    kicker: 'Plano B', title: 'Se algo sair do plano',
    body: `<div class="${land ? `grid g${riscos.length}` : 'stack'}">${riscos.map((r) => `<div class="card xl"><h3>${esc(words(r.risco, 14))}</h3><p><b>Plano B:</b> ${esc(words(clientText(r.plano_b) || r.plano_b, 18))}</p></div>`).join('')}</div>`,
  })

  out.push({ kind: 'cover', body: `${brand}<div class="cover-mid"><p class="kicker">Próximo passo</p><h1>Bora executar ${esc(mes.toLowerCase())}?</h1><p class="lead">Toda segunda a gente confere os números da semana e ajusta o plano.</p></div><p class="cover-foot">Peformake · assessoria de marketing</p>` })
  return out
}

/** DeckInput para SlideViewer, modo apresentação, link público e PDF (mesmas funções do diagnóstico). */
export function monthlyDeckInput(x: MonthlyDeckOpts): DeckInput {
  return { name: x.name, doc: {}, title: `Estratégia de ${monthName(x.strategy.month)}`, clientLogoUrl: x.clientLogoUrl, peformakeLogoUrl: x.peformakeLogoUrl, slides: (o) => buildMonthlySlides(x, o) }
}

/** Apresentação de uma área (Tráfego · Social media e design): o mesmo plano só com as ações e as metas da área. */
export const AREA_DECK = {
  trafego: { label: 'Tráfego', areas: ['trafego'] as ActionArea[] },
  social: { label: 'Social media e design', areas: ['social', 'design'] as ActionArea[] },
} as const
export type DeckArea = keyof typeof AREA_DECK
export const isDeckArea = (v: unknown): v is DeckArea => v === 'trafego' || v === 'social'

export function areaStrategy(st: MonthlyStrategy, area: DeckArea): MonthlyStrategy {
  const ar = AREA_DECK[area].areas
  const d = st.doc ?? {}
  return { ...st, actions: st.actions.filter((a) => ar.includes(a.area)), doc: { ...d, metas_area: (d.metas_area ?? []).filter((m) => ar.includes(m.area)), perguntas: [] } }
}

export function monthlyAreaDeckInput(x: MonthlyDeckOpts, area: DeckArea): DeckInput {
  const cfg = AREA_DECK[area]
  const input = monthlyDeckInput({ ...x, strategy: areaStrategy(x.strategy, area), label: cfg.label })
  return { ...input, title: `${cfg.label} · ${monthName(x.strategy.month)}` }
}
