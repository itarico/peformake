// PDF curto do audiovisual ("roteiro de bolso"), identidade Ellcazo (logo + verde-limão e preto).
// No máximo meia página por vídeo: papel, gancho, 3 ideias rápidas, as falas principais e o QR da referência.
// O mês inteiro cabe em 1 a 3 páginas A4. Só os vídeos aprovados e nada interno (o que entra já vem limpo de avVideos).
// A versão longa (estudo, filmagem, anúncio) continua na apresentação.
import { ellcazoSvg } from '@/components/ui/EllcazoMark'
import { esc, words } from './consultDeck'
import { qrSvg } from './avDeck'
import { PAPEL, whenLabel, type AvScene, type AvVideo } from './avPlan'
import { monthName } from './monthlyRules'

/** Vídeos por página: 2 (meia página cada) até 6 vídeos; acima disso, 3 por página para caber em 3 páginas. */
export const perPage = (n: number) => (n <= 6 ? 2 : 3)

/** As falas que contam: até 5 (com muitas cenas, as primeiras e a última, que é a chamada). */
export function mainLines(cenas: AvScene[], max = 5): AvScene[] {
  const fal = cenas.filter((c) => c.fala)
  if (fal.length <= max) return fal
  return [...fal.slice(0, max - 1), fal[fal.length - 1]!]
}

const chunk = <T,>(a: T[], n: number): T[][] => { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out }

function block(v: AvVideo, i: number, dense: boolean): string {
  const ref = v.refs.find((r) => r.video) ?? v.refs[0]
  const lines = mainLines(v.cenas, dense ? 4 : 5)
  const wl = dense ? 14 : 18
  return `<article class="v${dense ? ' dense' : ''}">
    <div class="main">
      <p class="k"><span class="n">${i + 1}</span>${esc(whenLabel(v))}${v.duracao ? ` · ${esc(v.duracao)}` : ''}<span class="tag">${esc(PAPEL[v.papel].label)}</span>${v.anuncio ? '<span class="tag o">Vira anúncio</span>' : ''}</p>
      <h2>${esc(words(v.title, 12))}</h2>
      ${v.engajar.gancho ? `<p class="g"><b>Gancho</b>“${esc(words(v.engajar.gancho, 16))}”</p>` : ''}
      ${v.ideias.length ? `<p class="h">Ideias rápidas</p><ul>${v.ideias.slice(0, 3).map((t) => `<li>${esc(words(t, 12))}</li>`).join('')}</ul>` : ''}
      ${lines.length ? `<p class="h">Falas principais</p><ol>${lines.map((c) => `<li><span>${c.n}</span>“${esc(words(c.fala, wl))}”</li>`).join('')}</ol>` : ''}
    </div>
    ${ref ? `<a class="ref" href="${esc(ref.url)}">${qrSvg(ref.url)}<b>Referência</b><small>${esc(ref.label.split(' · ')[0]!)}</small></a>` : ''}
  </article>`
}

export interface PocketOpts { name: string; month: string; videos: AvVideo[] }

export function pocketHtml(x: PocketOpts): string {
  const n = x.videos.length
  const per = perPage(n)
  const pages = chunk(x.videos, per)
  const logo = ellcazoSvg('#B5E61D', 22)
  const head = `<header><span class="logo">${logo}</span><span><b>Roteiro de bolso · ${esc(monthName(x.month))}</b><small>${esc(x.name)} · ${n} ${n === 1 ? 'vídeo aprovado' : 'vídeos aprovados'}</small></span><span class="br">Ellcazo · Produtora audiovisual</span></header>`
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Roteiro de bolso · ${esc(x.name)} · ${esc(monthName(x.month))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#E4E8DA;font-family:Geist,system-ui,-apple-system,sans-serif;color:#121410;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;padding:9mm 10mm;display:flex;flex-direction:column;gap:4mm;background:#fff;margin:0 auto 8mm;page-break-after:always;break-after:page;overflow:hidden}
.page:last-child{page-break-after:auto;break-after:auto;margin-bottom:0}
@media print{html,body{background:#fff}.page{margin:0}}
header{display:flex;align-items:center;gap:10px;background:#121410;color:#D8DECB;border-radius:10px;padding:7px 12px;flex:none}
header b{display:block;color:#fff;font-size:14px}header small{font-size:11px}header .br{margin-left:auto;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#B5E61D;font-weight:700}
.logo{display:flex}
.list{flex:1;display:grid;gap:4mm;min-height:0}
.v{display:flex;gap:5mm;border:1.5px solid #121410;border-radius:12px;padding:5mm 5.5mm;min-height:0;overflow:hidden}
.main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2.2mm}
.k{margin:0;display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:11px;color:#4b5244;font-weight:600}
.n{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#121410;color:#B5E61D;font-weight:800;font-size:12px}
.tag{background:#B5E61D;color:#121410;border-radius:99px;padding:1px 8px;font-weight:700}.tag.o{background:#F1F8DA}
h2{margin:0;font-size:17px;line-height:1.2}
.g{margin:0;background:#F1F8DA;border-left:4px solid #B5E61D;border-radius:6px;padding:2.2mm 3mm;font-size:13.5px;line-height:1.35;font-weight:600}
.g b{display:block;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#4E6B00}
.h{margin:1mm 0 0;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#4E6B00}
ul,ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:1.2mm;font-size:12px;line-height:1.35}
ul li{padding-left:12px;position:relative}ul li:before{content:"";position:absolute;left:0;top:.5em;width:6px;height:6px;border-radius:50%;background:#B5E61D;outline:1px solid #121410}
ol li{display:flex;gap:6px}ol li span{flex:none;width:16px;font-weight:800;color:#4E6B00}
.ref{flex:none;width:30mm;display:flex;flex-direction:column;align-items:center;gap:1mm;text-decoration:none;color:#121410;text-align:center;align-self:flex-start}
.ref .qr{width:28mm;height:28mm}.ref b{font-size:11px}.ref small{font-size:9.5px;color:#4b5244}
.dense{padding:4mm 5mm}.dense h2{font-size:15px}.dense .g{font-size:12px}.dense ul,.dense ol{font-size:11px}.dense .ref{width:24mm}.dense .ref .qr{width:22mm;height:22mm}
</style></head><body>
${pages.map((g, pi) => `<section class="page">${pi === 0 ? head : ''}<div class="list" style="grid-template-rows:repeat(${per},minmax(0,1fr))">${g.map((v, k) => block(v, pi * per + k, per > 2)).join('')}</div></section>`).join('')}
</body></html>`
}

/** Abre o roteiro de bolso numa janela e chama a impressão ("Salvar como PDF"). */
export function printPocket(x: PocketOpts) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(pocketHtml(x))
  w.document.close()
  const go = () => { w.focus(); w.print() }
  const ready = (w.document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
  if (ready) void ready.then(() => setTimeout(go, 250)); else setTimeout(go, 800)
}
