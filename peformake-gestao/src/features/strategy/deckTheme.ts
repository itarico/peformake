// Tema das apresentações (diagnóstico, estratégia do mês, áreas, relatórios e audiovisual), tirado da apresentação
// de estratégia do grupo do Paulo (12/11/2026), que o Italo aprovou como padrão: fundo claro, título grande e pesado,
// selo em pílula, cartões brancos com borda escura e sombra deslocada, blocos escuros para o que é decisão,
// capa escura com o anel ciano. Tudo em cqw (largura do slide): escala igual na tela, no celular e no PDF.

/** Cores da identidade Peformake nas apresentações. */
export const THEME = {
  ink: '#0B3C44', deep: '#056F84', fill: '#1FC8DB', soft: '#E3F7FA', canvas: '#F3FAFB', line: '#D5E8EB', muted: '#4B6D73', text: '#24525A', onInk: '#D6EEF1',
} as const
/** Ellcazo (audiovisual): fundo verde-limão ou branco, intercalados; preto só nos detalhes. */
export const ELLCAZO = { lime: '#B5E61D', black: '#121410', paper: '#FFFFFF', muted: '#3B4034' } as const

/** Fonte das apresentações (Inter com corte de título nos tamanhos grandes). */
export const DECK_FONT = "Inter,'Inter Display',Geist,ui-sans-serif,system-ui,-apple-system,sans-serif"
export const DECK_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..900&display=swap'
export const DECK_FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${DECK_FONT_HREF}" rel="stylesheet">`

/** Monograma PF/MK (máscara: a cor vem do texto em volta, escuro no slide claro e branco na capa). */
export const PF_MARK = 'data:image/png;base64,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'

/** CSS da identidade Peformake. `f(n)`: tamanho que acompanha a escala do slide; `k`: 1 na horizontal, 1.5 na vertical. */
export function peformakeCss(f: (n: number) => string, land: boolean, k: number): string {
  const T = THEME
  const px = (n: number) => `${(n * k).toFixed(3)}cqw`
  // Cabeçalho, rodapé e capa não acompanham a escala do conteúdo: título do mesmo tamanho em todas as páginas.
  const fx = (n: number) => px(n)
  const bd = `${px(0.15)} solid ${T.ink}`
  const sh = (n = 0.45) => `${px(n)} ${px(n)} 0 ${T.ink}`
  const padX = land ? '4.2cqw' : '7cqw'
  return `
  .pfd{--ink:${T.ink};--muted:${T.muted};--acc:${T.deep};--fill:${T.fill};--deep:${T.deep};--soft:${T.soft};--line:${T.line};--canvas:${T.canvas};--text:${T.text};color:var(--ink);font-family:${DECK_FONT};font-optical-sizing:auto;-webkit-font-smoothing:antialiased;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pfd *{box-sizing:border-box;margin:0;padding:0}
  .pfd .slide{container-type:inline-size;position:relative;width:100%;aspect-ratio:${land ? '16 / 9' : '210 / 297'};background:var(--canvas);overflow:hidden;break-after:page;break-inside:avoid;page-break-after:always}
  .pfd .slide>.in{position:absolute;inset:0;display:flex;flex-direction:column;padding:${land ? `3cqw ${padX} 4.9cqw` : `7cqw ${padX} 11cqw`}}
  .pfd .slide:last-child{break-after:auto;page-break-after:auto}
  .pfd .head{margin-bottom:${fx(1.7)}}
  .pfd .kick,.pfd .pill{display:inline-flex;align-items:center;width:fit-content;max-width:100%;background:var(--fill);color:var(--ink);border:${bd};border-radius:999px;padding:${fx(0.4)} ${fx(1.05)};font-weight:800;font-size:${fx(0.95)};line-height:1.25;letter-spacing:.08em;text-transform:uppercase}
  .pfd h2{font-size:${fx(3.15)};line-height:1.06;font-weight:800;letter-spacing:-.025em;margin-top:${fx(1)};max-width:${land ? '88cqw' : '86cqw'};text-wrap:balance}
  .pfd .content{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;gap:${f(1.7)};font-size:${f(1.6)};line-height:1.38}
  .pfd .content:has(> .chart-only:only-child),.pfd .content:has(> .split-r:only-child){justify-content:center}
  .pfd .foot{position:absolute;left:${padX};right:${padX};bottom:${land ? '1.55cqw' : '3.6cqw'};display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:${fx(1)};color:var(--muted);font-size:${fx(0.95)};font-weight:500}
  .pfd .foot .fl{display:flex;align-items:center;gap:${fx(0.6)}} .pfd .foot .fl b{color:var(--ink);font-weight:800} .pfd .foot .fc{text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${land ? '50cqw' : '46cqw'}} .pfd .foot .pn{justify-self:end;font-weight:800;color:var(--ink)} .pfd .foot .pn small{font-weight:500;color:var(--muted)}
  .pfd .flogo{display:inline-block;flex:none;width:${fx(1.9)};height:${fx(1.7)};background:currentColor;-webkit-mask:url(${PF_MARK}) center/contain no-repeat;mask:url(${PF_MARK}) center/contain no-repeat}
  .pfd .foot .flogo{color:var(--ink)}
  .pfd .slide.internal{background:#FFF8EA} .pfd .slide.internal .kick{background:#FFD27A}
  .pfd .cover{background:var(--ink);color:#fff} .pfd .cover>.in{justify-content:space-between;padding:${land ? '3.9cqw 5.4cqw' : '9cqw 8cqw'};z-index:1}
  .pfd .cover:after{content:"";position:absolute;right:${land ? '-13.5cqw' : '-26cqw'};top:${land ? '-13.5cqw' : '-22cqw'};width:${land ? '48cqw' : '78cqw'};height:${land ? '48cqw' : '78cqw'};border-radius:50%;border:${land ? '5.25cqw' : '8cqw'} solid var(--fill)}
  .pfd .cover:before{content:"";position:absolute;right:${land ? '9cqw' : '-12cqw'};bottom:${land ? '-19.5cqw' : '-26cqw'};width:${land ? '31.5cqw' : '62cqw'};height:${land ? '31.5cqw' : '62cqw'};border-radius:50%;background:var(--deep)}
  .pfd .cover .cover-top{display:flex;align-items:center;gap:${fx(1.05)};color:#BFE9EF;font-weight:600;font-size:${fx(1.15)}}
  .pfd .cover .pf-logo{height:${fx(3.45)};width:auto;filter:brightness(0) invert(1)}
  .pfd .cover .brand{font-weight:600} .pfd .cover .brand:not(:empty):after{content:" · assessoria de marketing"}
  .pfd .cover .cli-logo{height:${fx(6)};width:auto;max-width:40cqw;background:#fff;border-radius:${fx(1.2)};padding:${fx(0.8)};margin-bottom:${fx(1.8)}}
  .pfd .cover .cli-mono{display:inline-grid;place-items:center;width:${fx(6)};height:${fx(6)};border-radius:${fx(1.6)};background:var(--fill);color:var(--ink);font-weight:800;font-size:${fx(2.6)};margin-bottom:${fx(1.8)}}
  .pfd .cover .cover-mid{max-width:${land ? '66cqw' : '84cqw'};position:relative}
  .pfd .cover .kicker{display:inline-block;background:var(--fill);color:var(--ink);border-radius:999px;padding:${fx(0.5)} ${fx(1.2)};font-weight:800;font-size:${fx(1.05)};letter-spacing:.08em;text-transform:uppercase;margin-bottom:${fx(1.9)}}
  .pfd .cover h1{font-size:${fx(4.6)};line-height:1.04;font-weight:800;letter-spacing:-.03em;color:#fff;text-wrap:balance}
  .pfd .cover .cv-t{font-size:${fx(3.3)};line-height:1.1;font-weight:700;letter-spacing:-.02em;color:var(--fill);margin-top:${fx(0.8)}}
  .pfd .cover .lead{color:#D6EEF1;font-size:${fx(1.6)};line-height:1.4;margin-top:${fx(1.65)};max-width:${land ? '56cqw' : '80cqw'}}
  .pfd .cover .cover-foot{display:flex;gap:${fx(3)};color:#BFE9EF;font-weight:600;font-size:${fx(1.15)}} .pfd .cover .cover-foot b{color:var(--fill)}
  .pfd .statement>.in{justify-content:center} .pfd .statement .head{margin-bottom:${f(1.4)}}
  .pfd .statement .content{flex:none;justify-content:center;gap:${f(2.6)}}
  .pfd .big{font-size:${f(3.6)};line-height:1.12;font-weight:800;letter-spacing:-.025em;text-wrap:balance}
  .pfd .big2{font-size:${f(2.4)};line-height:1.2;font-weight:700}
  .pfd .lead{font-size:${f(1.65)};line-height:1.4;color:var(--text)}
  .pfd .caption{font-size:${f(1.15)};color:var(--muted);text-align:center}
  .pfd .up{text-transform:uppercase;letter-spacing:.07em;font-weight:800;font-size:${f(0.9)};color:var(--deep)}
  .pfd .kpis{display:grid;grid-template-columns:repeat(${land ? 3 : 1},1fr);gap:${f(1.6)}}
  .pfd .kpi{background:var(--ink);color:#fff;border-radius:${f(1.2)};padding:${f(1.5)} ${f(1.8)};display:flex;${land ? 'flex-direction:column' : `align-items:baseline;gap:${f(1.4)}`};gap:${f(0.5)}}
  .pfd .kpi b{font-size:${f(3.9)};line-height:1;font-weight:800;color:var(--fill);letter-spacing:-.03em} .pfd .kpi b small{font-size:.45em;font-weight:700;color:#9FDBE3;margin-left:.12em}
  .pfd .kpi span{font-size:${f(1.2)};line-height:1.3;color:var(--onink,#D6EEF1)}
  .pfd .grid{display:grid;gap:${f(1.65)}} .pfd .g2{grid-template-columns:repeat(2,minmax(0,1fr))} .pfd .g3{grid-template-columns:repeat(3,minmax(0,1fr))} .pfd .g4{grid-template-columns:repeat(4,minmax(0,1fr))}
  .pfd .stack{display:flex;flex-direction:column;gap:${f(1.3)}}
  .pfd .cols2{display:grid;grid-template-columns:${land ? '1fr 1fr' : '1fr'};gap:${f(2)}}
  .pfd .card{position:relative;background:#fff;border:${bd};border-radius:${f(1.2)};box-shadow:${sh()};padding:${f(1.5)} ${f(1.65)};display:flex;flex-direction:column;gap:${f(0.7)};min-height:0;overflow:hidden}
  .pfd .card.soft{background:var(--soft)} .pfd .card.accent{background:var(--ink);color:#fff;justify-content:center} .pfd .card.accent .up{color:var(--fill)} .pfd .card.accent p{color:#D6EEF1}
  .pfd .card h3{font-size:${f(1.75)};line-height:1.16;font-weight:800;letter-spacing:-.01em}
  .pfd .card p{font-size:${f(1.4)};line-height:1.38;color:var(--text)}
  .pfd .card h3.hl{display:flex;align-items:flex-start;gap:${f(0.6)}} .pfd .card h3.hl:before{content:"";flex:none;margin-top:.22em;width:${f(0.95)};height:${f(0.95)};border-radius:${f(0.2)};background:var(--c,var(--fill));border:${px(0.11)} solid var(--ink)}
  .pfd .card.find .tag{align-self:flex-start;background:var(--c,var(--fill));color:var(--on,var(--ink));border:${px(0.11)} solid var(--ink);border-radius:999px;padding:${f(0.2)} ${f(0.8)};font-weight:800;text-transform:uppercase;letter-spacing:.07em;font-size:${f(0.85)}}
  .pfd .card .num-big{font-size:${f(3.6)};line-height:1;font-weight:800;letter-spacing:-.03em;color:var(--deep)} .pfd .card .num-big.long{font-size:${f(2.6)}}
  .pfd .stack .find{display:grid;grid-template-columns:${f(24)} 1fr;align-items:center;column-gap:${f(2)}} .pfd .stack .find .tag{grid-column:1/-1;justify-self:start}
  .pfd .card.op .est{font-weight:800;color:var(--deep);font-size:${f(1.7)};line-height:1.15}
  .pfd .card.ind .meta-big{font-size:${f(2.6)};line-height:1.05;font-weight:800;color:var(--deep)}
  .pfd .card .pro{color:#00707E} .pfd .card .con{color:#8F2D1C}
  .pfd .ic{width:${f(2.3)};height:${f(2.3)};color:var(--deep);flex:none}
  .pfd .bul{list-style:none;display:flex;flex-direction:column;gap:${f(0.85)}} .pfd .bul li{position:relative;padding-left:${f(1.7)};font-size:${f(1.6)};line-height:1.35}
  .pfd .bul li:before{content:"";position:absolute;left:${f(0.1)};top:.42em;width:${f(0.7)};height:${f(0.7)};border-radius:${f(0.15)};background:var(--fill);border:${px(0.11)} solid var(--ink)}
  .pfd .card .bul li{font-size:${f(1.4)}} .pfd .sw .bul{gap:${f(0.6)}} .pfd .sw .bul li{font-size:${f(1.3)}}
  .pfd .steps,.pfd .qs{list-style:none;display:flex;flex-direction:column;gap:${f(1.3)}}
  .pfd .steps li,.pfd .qs li{display:flex;gap:${f(1.3)};align-items:flex-start;font-size:${f(1.85)};line-height:1.3}
  .pfd .steps li>span:last-child{display:flex;flex-direction:column;gap:${f(0.45)}} .pfd .steps small{font-size:${f(1.2)};color:var(--muted)}
  .pfd .qs li{font-size:${f(1.7)};background:#fff;border:${bd};border-radius:${f(1)};box-shadow:${sh(0.3)};padding:${f(0.8)} ${f(1.2)};align-items:center}
  .pfd .num{flex:none;display:inline-grid;place-items:center;width:${f(2.5)};height:${f(2.5)};border-radius:${f(0.7)};background:var(--ink);color:#fff;font-weight:800;font-size:${f(1.15)}}
  .pfd .ans{color:#00707E;font-size:${f(1.2)};margin-top:${f(0.3)}}
  .pfd .swot{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:${f(1.6)};flex:1;min-height:0}
  .pfd .sw{border:${bd};box-shadow:${sh()};border-radius:${f(1.2)};padding:${f(1.3)} ${f(1.6)};overflow:hidden;background:#fff} .pfd .sw h3{font-size:${f(1.6)};font-weight:800;margin-bottom:${f(0.6)}}
  .pfd .sw.ok{background:#fff} .pfd .sw.warn{background:var(--ink);color:#fff} .pfd .sw.warn h3{color:var(--fill)} .pfd .sw.acc{background:var(--soft)} .pfd .sw.gray{background:#fff}
  .pfd .journey{list-style:none;display:grid;grid-template-columns:repeat(${land ? 5 : 1},minmax(0,1fr));gap:${f(1.4)}}
  .pfd .journey li{background:#fff;border:${bd};box-shadow:${sh(0.35)};border-radius:${f(1.1)};padding:${f(1.4)};display:flex;flex-direction:${land ? 'column' : 'row'};gap:${f(0.7)};align-items:${land ? 'flex-start' : 'center'};font-size:${f(1.4)};line-height:1.35}
  .pfd .journey b{font-size:${f(1.65)};font-weight:800} ${land ? '' : `.pfd .journey b{flex:0 0 ${f(18)}}`}
  .pfd .journey .num{background:var(--ink);color:var(--fill)}
  .pfd .callout{background:#fff;border:${bd};border-left:${px(0.75)} solid var(--fill);border-radius:${f(0.9)};padding:${f(1.1)} ${f(1.5)};font-size:${f(1.75)};font-weight:650;line-height:1.3}
  .pfd .card .quote{font-style:italic;font-size:${f(1.4)};color:var(--text)}
  .pfd .rows{list-style:none;display:flex;flex-direction:column;gap:${f(1)}} .pfd .rows li{display:grid;grid-template-columns:${land ? '24cqw' : '30cqw'} 1fr;gap:${f(1.4)};align-items:center;background:#fff;border:${bd};border-radius:${f(0.9)};box-shadow:${sh(0.3)};padding:${f(0.8)} ${f(1.3)};font-size:${f(1.5)}} .pfd .rows li b{font-weight:800}
  .pfd .tags{display:flex;flex-wrap:wrap;gap:${f(0.5)}} .pfd .tags span{font-size:${f(0.95)};font-weight:700;background:var(--soft);border:${px(0.1)} solid var(--deep);border-radius:999px;padding:${f(0.2)} ${f(0.8)};color:var(--deep)} .pfd .tags .acc{background:var(--ink);border-color:var(--ink);color:#fff}
  .pfd .card .tags{margin-top:auto}
  .pfd .tbl{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:${bd};border-radius:${f(1.1)};overflow:hidden;box-shadow:${sh()};font-size:${f(1.55)}}
  .pfd .tbl th{text-align:left;background:var(--ink);color:#fff;font-weight:800;font-size:${f(0.95)};text-transform:uppercase;letter-spacing:.06em;padding:${f(0.75)} ${f(1.1)}}
  .pfd .tbl td{border-top:1px solid var(--line);padding:${f(1)} ${f(1.1)};vertical-align:middle} .pfd .tbl td small{color:var(--muted);font-size:.75em} .pfd .tbl tr.me td{background:var(--soft)} .pfd .tbl tr.me td:first-child b{color:var(--deep)}
  .pfd .chart-only{flex:1;min-height:0;display:flex;justify-content:center;align-items:center;color:var(--ink);background:#fff;border:${bd};border-radius:${f(1.2)};box-shadow:${sh()};padding:${f(1.6)} ${f(2)};margin:0 ${px(0.45)} ${px(0.45)} 0}
  ${land ? '' : '.pfd .chart-only{flex:0 1 auto;margin-top:auto;margin-bottom:auto}'}
  .pfd .chart-only svg{${land ? 'height:100%;max-height:34cqw;width:auto!important;max-width:100%' : 'width:100%!important;height:auto;max-height:108cqw'}}
  .pfd .chart-wide{background:#fff;border:${bd};border-radius:${f(1.1)};box-shadow:${sh(0.35)};padding:${f(0.8)} ${f(1.4)}} .pfd .chart-wide svg{display:block;width:100%;max-height:${land ? '8cqw' : '20cqw'}}
  .pfd .split-r{display:grid;grid-template-columns:${land ? '1fr 1fr' : '1fr'};gap:${f(2.4)};align-items:center} .pfd .split-r .chart{background:#fff;border:${bd};border-radius:${f(1.2)};box-shadow:${sh()};padding:${f(1.2)}} .pfd .split-r svg{display:block;max-height:${land ? '30cqw' : '58cqw'};width:auto!important;margin:0 auto}
  .pfd .wbar{display:flex;gap:2px;height:${f(1.1)};border-radius:99px;overflow:hidden;margin-top:auto;border:${px(0.1)} solid var(--ink)} .pfd .wbar i{display:block;background:var(--c)}
  .pfd .dot{display:inline-block;flex:none;width:.62em;height:.62em;border-radius:${f(0.15)};background:var(--c);border:${px(0.09)} solid var(--ink);margin-right:.45em;vertical-align:.02em}
  .pfd .lrow{display:flex;flex-wrap:wrap;gap:${f(0.6)} ${f(2)};font-size:${f(1.15)};color:var(--muted)}
  .pfd .atag{display:block;font-weight:800;text-transform:uppercase;letter-spacing:.07em;font-size:${f(0.95)};color:var(--deep)}
  .pfd .steps.two{display:grid;grid-template-columns:1fr 1fr;column-gap:${f(3)}}
  .pfd .steps .pill{flex:none;justify-content:center;min-width:${f(6.4)};height:${f(2.7)};letter-spacing:.02em;font-size:${f(1.2)}}
  .pfd .metabox{background:var(--ink);color:#fff;border-radius:${f(1.2)};padding:${f(1.5)} ${f(2.2)};display:flex;align-items:baseline;flex-wrap:wrap;gap:${f(0.6)} ${f(1.6)}} .pfd .metabox b{color:var(--fill);font-size:${f(3.6)};line-height:1;font-weight:800;letter-spacing:-.03em} .pfd .metabox span{font-size:${f(1.6)};color:#D6EEF1}
  .pfd .stack.lst .find{display:flex;align-items:stretch}
  .pfd .steps.lg{gap:${f(1.5)}} .pfd .steps.lg li{font-size:${f(2.1)}} .pfd .qs.lg{gap:${f(1.3)}} .pfd .qs.lg li{font-size:${f(1.9)}}
  .pfd .steps.lg li{background:#fff;border:${bd};border-radius:${f(1)};box-shadow:${sh(0.3)};padding:${f(0.9)} ${f(1.3)};align-items:center}
  .pfd .grid.tall{flex:1;min-height:0} .pfd .tall .card{padding:${f(1.8)}} .pfd .tall .card h3{font-size:${f(2.3)};line-height:1.12} .pfd .tall .wbar{height:${f(1.5)}}
  .pfd .card.xl{padding:${f(2.2)}} .pfd .card.xl h3{font-size:${f(2.3)}} .pfd .card.xl p{font-size:${f(1.7)}}
  .pfd .card .wk{font-weight:800;text-transform:uppercase;letter-spacing:.07em;font-size:${f(0.95)};color:var(--deep)} .pfd .card .cnt{font-size:${f(1.2)};color:var(--muted)}
  .pfd .legend{list-style:none;display:flex;flex-direction:column;gap:${f(0.9)}} .pfd .legend li{display:flex;gap:${f(1.1)};align-items:center;font-size:${f(1.55)};line-height:1.25} .pfd .legend .num{width:${f(2.4)};height:${f(2.4)}}
  `
}
