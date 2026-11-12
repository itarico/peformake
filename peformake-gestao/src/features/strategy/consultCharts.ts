// Gráficos da Consultoria em SVG puro (texto): os mesmos na tela, na apresentação web e no PDF.
// Só desenham com dado de verdade; quem chama decide se mostra (funções *Data devolvem null sem dado).
type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

// Identidade das apresentações (Ellcazo): verde-limão + branco, detalhes em preto. 0 = destaque (cliente/principal), 1 = preto (alerta/rival),
// 2 = verde da marca (bom), 3 = cinza (médio/referência). A tela do sistema usa outra paleta (components/charts).
export const SERIES: readonly string[] & { 0: string; 1: string; 2: string; 3: string } = ['#1FC8DB', '#0B3C44', '#056F84', '#9FB4BA', '#5D6C73', '#CFE0E4']
/** Cor do texto em cima de uma cor da série: preto nas claras, branco nas escuras. */
export const onColor = (c: string): string => (['#0B3C44', '#5D6C73'].includes(c) ? '#FFFFFF' : '#0B3C44')
const INK = 'currentColor'
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
/** Rótulo sem "…": quebra em até 2 linhas nas palavras; se ainda sobrar, fica a parte que cabe, terminando numa palavra inteira. */
const lines2 = (s: string, n: number): string[] => {
  const w = String(s ?? '').trim().split(/\s+/).filter(Boolean)
  const out: string[] = ['']
  for (const t of w) {
    const cur = out[out.length - 1]!
    if (!cur || (cur + ' ' + t).length <= n) out[out.length - 1] = cur ? `${cur} ${t}` : t
    else if (out.length < 2) out.push(t)
    else break
  }
  return out.map((l) => l.replace(/[,;:(–-]+$/, '').trim()).filter(Boolean)
}
/** Conteúdo de <text> com 1 ou 2 linhas (tspan), centrado na mesma altura. */
const tl = (s: string, n: number, x: number | string): string => {
  const l = lines2(s, n)
  return l.length < 2 ? esc(l[0] ?? '') : `<tspan x="${x}" dy="-0.5em">${esc(l[0])}</tspan><tspan x="${x}" dy="1.15em">${esc(l[1])}</tspan>`
}
const cut = (s: string, n: number) => lines2(s, n)[0] ?? ''
const svg = (w: number, h: number, body: string, label: string) =>
  `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;height:auto;font-family:inherit">${body}</svg>`
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
// Na IA, 0 em nota/nível/quantidade quer dizer "não se sabe".
const pos = (v: unknown): v is number => isNum(v) && v > 0

export const PRESENCE_AXES = [['site', 'Site'], ['instagram', 'Instagram'], ['google', 'Google'], ['avaliacoes', 'Avaliações'], ['anuncios', 'Anúncios']] as const

// ───────── Dados (puros, testáveis) ─────────
export interface Series { name: string; values: number[] }

/** Teia de presença: cliente × até 3 concorrentes (0 a 10 por canal). */
export function presenceData(d: Doc, clientName: string): Series[] | null {
  const pres = (p: Doc | undefined) => (p && PRESENCE_AXES.every(([k]) => isNum(p[k])) ? PRESENCE_AXES.map(([k]) => Math.max(0, Math.min(10, p[k] as number))) : null)
  const me = pres(d.presenca_digital?.cliente?.presenca)
  const rivals = ((d.mercado?.concorrentes ?? []) as Doc[]).map((c) => ({ name: String(c.nome ?? ''), values: pres(c.presenca) })).filter((c) => c.values) as Series[]
  if (!me || rivals.length === 0) return null
  return [{ name: clientName, values: me }, ...rivals.slice(0, 3)]
}

/** Avaliações (nota e quantidade) do cliente e dos concorrentes com nota conhecida. */
export function ratingsData(d: Doc, clientName: string): { name: string; nota: number; avaliacoes: number | null; me: boolean }[] | null {
  const rows: { name: string; nota: number; avaliacoes: number | null; me: boolean }[] = []
  const c = d.presenca_digital?.cliente
  if (c && pos(c.nota_google)) rows.push({ name: clientName, nota: c.nota_google, avaliacoes: pos(c.avaliacoes) ? c.avaliacoes : null, me: true })
  for (const r of (d.mercado?.concorrentes ?? []) as Doc[]) if (pos(r.nota)) rows.push({ name: String(r.nome), nota: r.nota, avaliacoes: pos(r.avaliacoes) ? r.avaliacoes : null, me: false })
  return rows.filter((r) => !r.me).length ? rows : null
}

/** Mapa de posicionamento (preço × proposta), 1 a 5. */
export function positioningData(d: Doc, clientName: string): { name: string; x: number; y: number; me: boolean }[] | null {
  const ok = (v: Doc | undefined) => v && pos(v.preco_nivel) && pos(v.proposta_nivel)
  const pts = ((d.mercado?.concorrentes ?? []) as Doc[]).filter(ok).map((c) => ({ name: String(c.nome), x: c.preco_nivel, y: c.proposta_nivel, me: false }))
  const me = d.presenca_digital?.cliente
  if (ok(me)) pts.unshift({ name: clientName, x: me.preco_nivel, y: me.proposta_nivel, me: true })
  return pts.length >= 2 ? pts : null
}

/** Funil do tráfego: etapas numéricas; nos documentos antigos, lê os números escritos ("R$ 1.581,43", "3.996"). */
export function funnelData(d: Doc): { label: string; value: number }[] | null {
  const f = d.funil ?? {}
  let rows: { label: string; value: number }[] = Array.isArray(f.etapas) ? f.etapas.filter((e: Doc) => isNum(e.valor)).map((e: Doc) => ({ label: String(e.rotulo), value: e.valor })) : []
  if (!rows.length && Array.isArray(f.numeros)) {
    rows = (f.numeros as Doc[]).map((n) => {
      const raw = String(n.valor ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
      return { label: String(n.rotulo), value: Number(raw) }
    }).filter((r) => Number.isFinite(r.value) && String(r.label).trim())
  }
  return rows.length >= 2 ? rows.slice(0, 5) : null
}

/** Esforço por área: quantos passos do plano cada área tem (alto pesa 3, médio 2, baixo 1). */
export function effortData(p: Doc): { label: string; value: number }[] | null {
  const m = new Map<string, number>()
  for (const f of (p.fases ?? []) as Doc[]) for (const s of (f.passos ?? []) as Doc[]) {
    const w = s.esforco === 'alto' ? 3 : s.esforco === 'medio' ? 2 : 1
    m.set(String(s.area ?? 'Outros'), (m.get(String(s.area ?? 'Outros')) ?? 0) + w)
  }
  const rows = [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  return rows.length ? rows : null
}

// ───────── Desenhos ─────────
export function radarSvg(series: Series[], axes: readonly string[] = PRESENCE_AXES.map(([, l]) => l)): string {
  const W = 460, H = 360, cx = W / 2, cy = 175, R = 125, n = axes.length
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + (R * v / 10) * Math.cos(a), cy + (R * v / 10) * Math.sin(a)] as const }
  let body = ''
  for (const lvl of [2.5, 5, 7.5, 10]) body += `<polygon points="${axes.map((_, i) => pt(i, lvl).join(',')).join(' ')}" fill="none" stroke="${INK}" stroke-opacity="0.15"/>`
  axes.forEach((a, i) => {
    const [x, y] = pt(i, 10); const [lx, ly] = pt(i, 11.6)
    body += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${INK}" stroke-opacity="0.15"/>`
    body += `<text x="${lx}" y="${ly + 4}" text-anchor="${Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'}" font-size="13" fill="${INK}">${esc(a)}</text>`
  })
  series.forEach((s, k) => {
    const c = SERIES[k % SERIES.length]
    body += `<polygon points="${s.values.map((v, i) => pt(i, v).join(',')).join(' ')}" fill="${c}" fill-opacity="${k === 0 ? 0.28 : 0.08}" stroke="${c}" stroke-width="${k === 0 ? 3 : 1.8}"/>`
  })
  const legend = series.map((s, k) => `<g transform="translate(${10 + (k % 2) * 225},${H - 34 + Math.floor(k / 2) * 18})"><rect width="12" height="12" rx="3" fill="${SERIES[k % SERIES.length]}"/><text x="18" y="11" font-size="12.5" fill="${INK}">${esc(cut(s.name, 26))}</text></g>`).join('')
  return svg(W, H + (series.length > 2 ? 18 : 0), body + legend, 'Presença digital: cliente e concorrentes')
}

export function ratingsSvg(rows: { name: string; nota: number; avaliacoes: number | null; me: boolean }[]): string {
  const W = 520, rowH = 38, H = rows.length * rowH + 10, x0 = 170, bw = W - x0 - 90
  const body = rows.map((r, i) => {
    const y = 6 + i * rowH, w = Math.max(2, (Math.min(5, r.nota) / 5) * bw)
    return `<text x="${x0 - 10}" y="${y + 19}" text-anchor="end" font-size="13" font-weight="${r.me ? 700 : 500}" fill="${INK}">${tl(r.name, 22, x0 - 10)}</text>`
      + `<rect x="${x0}" y="${y + 6}" width="${bw}" height="18" rx="9" fill="${INK}" fill-opacity="0.08"/>`
      + `<rect x="${x0}" y="${y + 6}" width="${w}" height="18" rx="9" fill="${r.me ? SERIES[0] : SERIES[3]}"/>`
      + `<text x="${x0 + bw + 8}" y="${y + 19}" font-size="13" font-weight="700" fill="${INK}">${r.nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}<tspan font-weight="400" fill-opacity="0.65"> ${r.avaliacoes !== null ? `(${r.avaliacoes.toLocaleString('pt-BR')})` : ''}</tspan></text>`
  }).join('')
  return svg(W, H, body, 'Nota e número de avaliações')
}

export function positioningSvg(pts: { name: string; x: number; y: number; me: boolean }[]): string {
  const W = 480, H = 380, L = 56, T = 16, PW = W - L - 20, PH = H - T - 56
  const m = 26 // margem interna: ponto no 1 ou no 5 não encosta na borda
  const px = (v: number) => L + m + ((v - 1) / 4) * (PW - 2 * m), py = (v: number) => T + PH - m - ((v - 1) / 4) * (PH - 2 * m)
  let body = `<rect x="${L}" y="${T}" width="${PW}" height="${PH}" rx="12" fill="${INK}" fill-opacity="0.04" stroke="${INK}" stroke-opacity="0.15"/>`
  body += `<line x1="${L + PW / 2}" y1="${T}" x2="${L + PW / 2}" y2="${T + PH}" stroke="${INK}" stroke-opacity="0.15" stroke-dasharray="4 4"/><line x1="${L}" y1="${T + PH / 2}" x2="${L + PW}" y2="${T + PH / 2}" stroke="${INK}" stroke-opacity="0.15" stroke-dasharray="4 4"/>`
  body += `<text x="${L + PW / 2}" y="${H - 14}" text-anchor="middle" font-size="13" fill="${INK}">Preço: mais barato → mais caro</text>`
  body += `<text transform="translate(18 ${T + PH / 2}) rotate(-90)" text-anchor="middle" font-size="13" fill="${INK}">Proposta: preço → valor/experiência</text>`
  // Pontos e nomes nunca se cobrem: se já tem alguém perto, desce/sobe o próximo até achar lugar.
  const placed: { x: number; y: number }[] = []
  for (const p of pts) {
    const x = px(p.x)
    let y = py(p.y)
    for (let k = 1; placed.some((q) => Math.abs(q.y - y) < 22 && Math.abs(q.x - x) < 130) && k < 12; k++) y = py(p.y) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 24
    placed.push({ x, y })
    body += `<circle cx="${x}" cy="${y}" r="${p.me ? 10 : 7}" fill="${p.me ? SERIES[0] : SERIES[1]}" fill-opacity="${p.me ? 1 : 0.85}" stroke="${p.me ? '#0B3C44' : '#fff'}" stroke-width="2"/>`
    const right = x > L + PW * 0.62
    body += `<text x="${right ? x - 13 : x + 13}" y="${y + 4}" text-anchor="${right ? 'end' : 'start'}" font-size="12.5" font-weight="${p.me ? 700 : 500}" fill="${INK}">${tl(p.name, 20, right ? x - 13 : x + 13)}</text>`
  }
  return svg(W, H, body, 'Mapa de posicionamento: preço e proposta')
}

export function funnelSvg(rows: { label: string; value: number }[]): string {
  // Escala log: R$, impressões e cliques têm tamanhos muito diferentes e todos precisam aparecer.
  const W = 540, rowH = 40, H = rows.length * rowH + 6, x0 = 190, bw = W - x0 - 90
  const lg = (v: number) => Math.log10(Math.max(1, v) + 1), max = Math.max(...rows.map((r) => lg(r.value)), 1)
  const body = rows.map((r, i) => {
    const y = 3 + i * rowH, w = r.value > 0 ? Math.max(8, (lg(r.value) / max) * bw) : 4
    return `<text x="${x0 - 10}" y="${y + 22}" text-anchor="end" font-size="13" fill="${INK}">${tl(r.label, 26, x0 - 10)}</text>`
      + `<rect x="${x0}" y="${y + 6}" width="${w}" height="24" rx="8" fill="${r.value > 0 ? SERIES[i % SERIES.length] : SERIES[1]}"/>`
      + `<text x="${x0 + w + 8}" y="${y + 23}" font-size="14" font-weight="700" fill="${r.value > 0 ? INK : SERIES[1]}">${r.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</text>`
  }).join('')
  return svg(W, H, body, 'Funil do tráfego')
}

export function timelineSvg(fases: Doc[]): string {
  const W = 600, H = 150, n = Math.max(1, fases.length), seg = (W - 40) / n
  let body = `<line x1="20" y1="44" x2="${W - 20}" y2="44" stroke="${INK}" stroke-opacity="0.2" stroke-width="6" stroke-linecap="round"/>`
  fases.forEach((f, i) => {
    const x = 20 + seg * i + seg / 2, c = SERIES[i % SERIES.length]
    body += `<circle cx="${x}" cy="44" r="16" fill="${c}"/><text x="${x}" y="49" text-anchor="middle" font-size="13" font-weight="700" fill="${onColor(c ?? '')}">${i + 1}</text>`
    body += `<text x="${x}" y="88" text-anchor="middle" font-size="15" font-weight="700" fill="${INK}">${esc(f.periodo)}</text>`
    body += `<text x="${x}" y="110" text-anchor="middle" font-size="12.5" fill="${INK}" fill-opacity="0.75">${(f.passos ?? []).length} passos</text>`
  })
  return svg(W, H - 20, body, 'Linha do tempo do plano')
}

export function hbarsSvg(rows: { label: string; value: number }[], color = SERIES[0]): string {
  const W = 520, rowH = 34, H = rows.length * rowH + 6, x0 = 190, bw = W - x0 - 40, max = Math.max(...rows.map((r) => r.value), 1)
  const body = rows.map((r, i) => {
    const y = 3 + i * rowH
    return `<text x="${x0 - 10}" y="${y + 19}" text-anchor="end" font-size="13" fill="${INK}">${tl(r.label, 26, x0 - 10)}</text>`
      + `<rect x="${x0}" y="${y + 6}" width="${Math.max(4, (r.value / max) * bw)}" height="18" rx="9" fill="${color}"/>`
      + `<text x="${x0 + Math.max(4, (r.value / max) * bw) + 6}" y="${y + 19}" font-size="12.5" font-weight="700" fill="${INK}">${r.value}</text>`
  }).join('')
  return svg(W, H, body, 'Distribuição')
}

/** 5 forças: barras de pressão (baixa, média, alta). */
export function forcesSvg(rows: Doc[]): string {
  const lvl = { baixa: 1, media: 2, alta: 3 } as Record<string, number>
  const col = { baixa: SERIES[2], media: SERIES[3], alta: SERIES[1] } as Record<string, string>
  const W = 520, rowH = 34, H = rows.length * rowH + 6, x0 = 190, bw = W - x0 - 70
  const body = rows.map((r, i) => {
    const y = 3 + i * rowH, v = lvl[r.nivel] ?? 0
    return `<text x="${x0 - 10}" y="${y + 19}" text-anchor="end" font-size="13" fill="${INK}">${tl(String(r.forca), 26, x0 - 10)}</text>`
      + `<rect x="${x0}" y="${y + 6}" width="${bw}" height="18" rx="9" fill="${INK}" fill-opacity="0.08"/>`
      + `<rect x="${x0}" y="${y + 6}" width="${(v / 3) * bw}" height="18" rx="9" fill="${col[r.nivel] ?? SERIES[0]}"/>`
      + `<text x="${x0 + bw + 8}" y="${y + 19}" font-size="12.5" font-weight="700" fill="${INK}">${r.nivel === 'media' ? 'média' : esc(r.nivel)}</text>`
  }).join('')
  return svg(W, H, body, 'Pressão do mercado (5 forças)')
}

/** Velocímetro 0 a 10 (maturidade digital). */
export function gaugeSvg(value: number | null | undefined, label = 'Maturidade digital'): string {
  const v = isNum(value) ? Math.max(0, Math.min(10, value)) : 0
  const W = 240, cx = 120, cy = 120, r = 90
  const arc = (a: number, b: number, c: string | undefined) => {
    const p = (t: number) => [cx + r * Math.cos(Math.PI * (1 - t / 10)), cy - r * Math.sin(Math.PI * (1 - t / 10))]
    const [x1, y1] = p(a), [x2, y2] = p(b)
    return `<path d="M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}" fill="none" stroke="${c}" stroke-width="18" stroke-linecap="butt"/>`
  }
  const ang = Math.PI * (1 - v / 10)
  const body = arc(0, 4, SERIES[1]) + arc(4, 7, SERIES[3]) + arc(7, 10, SERIES[2])
    + `<line x1="${cx}" y1="${cy}" x2="${cx + (r - 22) * Math.cos(ang)}" y2="${cy - (r - 22) * Math.sin(ang)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="7" fill="${INK}"/>`
    + `<text x="${cx}" y="${cy + 34}" text-anchor="middle" font-size="30" font-weight="700" fill="${INK}">${isNum(value) ? v : '–'}/10</text>`
  return svg(W, 170, body, label)
}

/** Você × referência por métrica (cada linha na sua escala: unidades diferentes). */
export function comparisonSvg(rows: Doc[], clientName: string): string {
  const W = 640, rowH = 78, H = rows.length * rowH + 34, x0 = 270, bw = W - x0 - 90
  let body = `<g transform="translate(${x0},8)"><rect width="12" height="12" rx="3" fill="${SERIES[0]}"/><text x="18" y="11" font-size="13" fill="${INK}">${esc(cut(clientName, 22))}</text><rect x="190" width="12" height="12" rx="3" fill="${SERIES[3]}"/><text x="208" y="11" font-size="13" fill="${INK}">Referência</text></g>`
  rows.forEach((r, i) => {
    const y = 34 + i * rowH, a = isNum(r.cliente) ? Math.max(0, r.cliente) : 0, b = isNum(r.referencia) ? Math.max(0, r.referencia) : 0, max = Math.max(a, b, 1e-9)
    const val = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${r.unidade && String(r.unidade).length <= 4 ? ` ${esc(r.unidade)}` : ''}`
    const ml = lines2(String(r.metrica), 34)
    ml.forEach((l, k) => { body += `<text x="${x0 - 12}" y="${y + 20 + k * 17}" text-anchor="end" font-size="14" font-weight="700" fill="${INK}">${esc(l)}</text>` })
    body += `<text x="${x0 - 12}" y="${y + 20 + ml.length * 17 + 2}" text-anchor="end" font-size="11.5" fill="${INK}" fill-opacity="0.6">vs ${esc(cut(String(r.referencia_nome ?? ''), 38))}</text>`
    body += `<rect x="${x0}" y="${y + 8}" width="${Math.max(3, (a / max) * bw)}" height="20" rx="6" fill="${SERIES[0]}"/><text x="${x0 + Math.max(3, (a / max) * bw) + 8}" y="${y + 23}" font-size="14" font-weight="700" fill="${INK}">${val(a)}</text>`
    body += `<rect x="${x0}" y="${y + 32}" width="${Math.max(3, (b / max) * bw)}" height="20" rx="6" fill="${SERIES[3]}"/><text x="${x0 + Math.max(3, (b / max) * bw) + 8}" y="${y + 47}" font-size="14" font-weight="700" fill="${INK}">${val(b)}</text>`
  })
  return svg(W, H, body, 'Comparativo com o mercado')
}

/** Maturidade por dimensão (0 a 100), cor pela faixa. */
export function maturitySvg(rows: Doc[]): string {
  const W = 600, rowH = 40, H = rows.length * rowH + 6, x0 = 230, bw = W - x0 - 60
  const col = (v: number) => (v < 40 ? SERIES[1] : v < 70 ? SERIES[3] : SERIES[2])
  const body = rows.map((r, i) => {
    const y = 3 + i * rowH, v = Math.max(0, Math.min(100, Number(r.nota) || 0))
    return `<text x="${x0 - 12}" y="${y + 22}" text-anchor="end" font-size="14" fill="${INK}">${tl(String(r.dimensao), 28, x0 - 12)}</text>`
      + `<rect x="${x0}" y="${y + 8}" width="${bw}" height="20" rx="10" fill="${INK}" fill-opacity="0.08"/>`
      + `<rect x="${x0}" y="${y + 8}" width="${Math.max(4, (v / 100) * bw)}" height="20" rx="10" fill="${col(v)}"/>`
      + `<text x="${x0 + bw + 10}" y="${y + 23}" font-size="14" font-weight="700" fill="${INK}">${v}</text>`
  }).join('')
  return svg(W, H, body, 'Maturidade digital por dimensão')
}

/** Matriz probabilidade × impacto (3 × 3) com os riscos numerados. */
export function riskMatrixSvg(rows: Doc[]): string {
  const W = 420, H = 380, L = 70, T = 16, S = 100
  const ix = (v: string) => ({ baixo: 0, medio: 1, alto: 2 } as Record<string, number>)[v] ?? 1
  const heat = (x: number, y: number) => { const s = x + y; return s >= 3 ? SERIES[1] : s === 2 ? SERIES[3] : SERIES[2] }
  let body = ''
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) body += `<rect x="${L + x * S + 2}" y="${T + (2 - y) * S + 2}" width="${S - 4}" height="${S - 4}" rx="10" fill="${heat(x, y)}" fill-opacity="0.16"/>`
  const labels = ['baixa', 'média', 'alta']
  labels.forEach((l, i) => {
    body += `<text x="${L + i * S + S / 2}" y="${T + 3 * S + 22}" text-anchor="middle" font-size="13" fill="${INK}">${l}</text>`
    body += `<text x="${L - 10}" y="${T + (2 - i) * S + S / 2 + 4}" text-anchor="end" font-size="13" fill="${INK}">${['baixo', 'médio', 'alto'][i]}</text>`
  })
  body += `<text x="${L + 1.5 * S}" y="${H - 4}" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}">Probabilidade</text>`
  body += `<text transform="translate(14 ${T + 1.5 * S}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}">Impacto</text>`
  const cells = new Map<string, number[]>()
  rows.forEach((r, i) => { const k = `${ix(r.probabilidade)}:${ix(r.impacto)}`; cells.set(k, [...(cells.get(k) ?? []), i]) })
  const OFF: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-18, 0], [18, 0]], 3: [[-18, -16], [18, -16], [0, 18]], 4: [[-18, -18], [18, -18], [-18, 18], [18, 18]] }
  for (const [k, idx] of cells) {
    const [x, y] = k.split(':').map(Number) as [number, number]
    idx.slice(0, 4).forEach((i, n) => {
      const [dx, dy] = OFF[Math.min(4, idx.length)]![n]!
      const cx = L + x * S + S / 2 + dx, cy = T + (2 - y) * S + S / 2 + dy
      body += `<circle cx="${cx}" cy="${cy}" r="15" fill="${INK}"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${i + 1}</text>`
    })
  }
  return svg(W, H, body, 'Matriz de riscos: probabilidade e impacto')
}
