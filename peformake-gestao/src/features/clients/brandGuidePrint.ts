// Guia da marca em PDF (impressão do navegador), na identidade da Peformake (ciano, petróleo e branco).
// Uma página A4 por parte do guia, texto curto, nada de parágrafo. Serve para mandar ao freelancer ou imprimir para a gravação.
import { GUIDE_SECTIONS, inkOn, type BrandGuide } from './brandGuideRules'

const LIME = '#1FC8DB', DEEP = '#056F84', BLACK = '#0B3C44'
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const li = (items: string[]) => (items.length ? `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '')
const row = (k: string, v: string) => (v ? `<div class="row"><b>${esc(k)}</b><p>${esc(v)}</p></div>` : '')

export function guideHtml(name: string, g: BrandGuide, logoUrl?: string | null): string {
  const pages: Record<string, string> = {
    posicionamento: `${g.posicionamento.frase ? `<p class="big">${esc(g.posicionamento.frase)}</p>` : ''}${g.posicionamento.passar.length ? `<h3>Toda peça precisa passar</h3>${li(g.posicionamento.passar)}` : ''}`,
    visual: `${g.visual.cores.length ? `<div class="sw">${g.visual.cores.map((c) => `<div class="c" style="background:${esc(c.hex)};color:${inkOn(c.hex)}"><b>${esc(c.nome || c.hex)}</b><span>${esc(c.hex)}</span><small>${esc(c.uso)}</small></div>`).join('')}</div>` : ''}
      ${row('Fonte de título', g.visual.fontes.titulo)}${row('Fonte de apoio', g.visual.fontes.apoio)}${row('Nota', g.visual.fontes.nota)}
      ${row('Logo', g.visual.logo)}${row('Foto', g.visual.foto)}${row('Vídeo', g.visual.video)}`,
    voz: `${g.voz.essencia ? `<p class="big">${esc(g.voz.essencia)}</p>` : ''}
      ${g.voz.tom.length ? `<div class="tones">${g.voz.tom.map((t) => `<div><b>${esc(t.adjetivo)}</b><p>“${esc(t.exemplo)}”</p></div>`).join('')}</div>` : ''}
      <div class="two"><div><h3>Usar</h3>${li(g.voz.usar)}</div><div><h3>Evitar</h3>${li(g.voz.evitar)}</div></div>
      ${g.voz.regra_teste ? `<p class="rule">${esc(g.voz.regra_teste)}</p>` : ''}`,
    design: `${row('Layout', g.design.layout)}${row('Hierarquia', g.design.hierarquia)}${row('Oferta e preço', g.design.ofertas)}${row('Chamada para ação', g.design.cta)}`,
    audiovisual: `${g.audiovisual.mostrar.length ? `<h3>A captação precisa mostrar</h3>${li(g.audiovisual.mostrar)}` : ''}${row('Apresentador', g.audiovisual.apresentador)}
      ${g.audiovisual.roteiro.length ? `<h3>Roteiro-base</h3><ol>${g.audiovisual.roteiro.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}`,
  }
  const body = GUIDE_SECTIONS.filter((s) => (pages[s.id] ?? '').replace(/\s/g, '')).map((s, i) => `<section><header><small>${String(i + 1).padStart(2, '0')} · Guia da marca</small><h2>${esc(s.label)}</h2></header>${pages[s.id]}</section>`).join('')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Guia da marca · ${esc(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Inter,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${BLACK};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cover{height:297mm;padding:22mm;background:${LIME};display:flex;flex-direction:column;justify-content:space-between;page-break-after:always}
.cover small{letter-spacing:.2em;text-transform:uppercase;font-weight:800;font-size:11px}.cover h1{font-size:56px;line-height:1;margin:0;font-weight:800;letter-spacing:-.02em}
.cover img{max-width:42mm;max-height:42mm;border-radius:12px;background:#fff;padding:4mm}.cover p{margin:0;font-size:14px}
section{min-height:297mm;padding:20mm 20mm 16mm;page-break-after:always;border-top:6mm solid ${BLACK}}
section header{border-bottom:3px solid ${LIME};padding-bottom:8px;margin-bottom:16px}section header small{color:${DEEP};letter-spacing:.18em;text-transform:uppercase;font-weight:800;font-size:10px}
h2{font-size:30px;margin:4px 0 0;font-weight:800;letter-spacing:-.01em}h3{font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin:18px 0 6px}
.big{font-size:22px;line-height:1.35;font-weight:600;margin:0 0 10px;padding-left:12px;border-left:6px solid ${LIME}}
ul,ol{margin:0;padding-left:20px;font-size:14px;line-height:1.6}.row{display:grid;grid-template-columns:42mm 1fr;gap:10px;border-top:1px solid #e3e6dc;padding:9px 0;font-size:14px}.row p{margin:0;line-height:1.5}
.sw{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.c{border-radius:12px;padding:12px;min-height:30mm;display:flex;flex-direction:column;gap:2px;border:1px solid #0001}.c span{font-family:monospace;font-size:12px}.c small{font-size:11px;opacity:.85}
.tones{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.tones div{background:#F4F9E4;border-radius:12px;padding:10px}.tones p{margin:4px 0 0;font-size:13px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.rule{margin-top:18px;background:${BLACK};color:#fff;border-radius:12px;padding:12px 14px;font-weight:600}
</style></head><body>
<div class="cover"><small>Guia da marca</small><div>${logoUrl ? `<img src="${esc(logoUrl)}" alt="">` : ''}<h1>${esc(name)}</h1><p style="margin-top:10px">O que toda peça, roteiro e gravação precisa seguir.</p></div><p>Peformake · Ellcazo · ${new Date().toLocaleDateString('pt-BR')}</p></div>
${body}</body></html>`
}

export function printGuide(name: string, g: BrandGuide, logoUrl?: string | null) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(guideHtml(name, g, logoUrl))
  w.document.close()
  const go = () => { w.focus(); w.print() }
  const ready = (w.document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
  if (ready) void ready.then(() => setTimeout(go, 300)); else setTimeout(go, 800)
}
