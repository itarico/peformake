// Gera e confere a apresentação da Consultoria (deck) nos dois formatos, com Playwright.
// Uso: node e2e/deck.cjs <doc.json> <saida-sem-extensao> [Nome do cliente]
//   doc.json: { doc, questions? } (ou só o doc). Gera <saida>-vertical.pdf/.html e <saida>-paisagem.pdf/.html.
// Falha (código 1) se algum slide cortar conteúdo ou se o PDF não tiver 1 página por slide.
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const jiti = require('jiti')(__filename, { interopDefault: true });
const { deckHtml, deckSlideCount } = jiti(path.join(__dirname, '../src/features/strategy/consultDeck.ts'));

const [file, out, name = 'Will motos'] = process.argv.slice(2);
if (!file || !out) { console.error('uso: node e2e/deck.cjs <doc.json> <saida> [nome]'); process.exit(2) }
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const input = { name, doc: raw.doc ?? raw, questions: raw.questions ?? (raw.doc ?? raw).do_cliente?.map((q) => ({ question: q.pergunta, why: q.por_que })) ?? [],
  peformakeLogoUrl: 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/logo-pfmk.png')).toString('base64') };

(async () => {
  const b = await chromium.launch(); const fails = [];
  for (const o of ['vertical', 'paisagem']) {
    const html = deckHtml(input, o); fs.writeFileSync(`${out}-${o}.html`, html);
    const p = await b.newPage({ viewport: o === 'paisagem' ? { width: 1280, height: 720 } : { width: 794, height: 1123 } });
    await p.setContent(html, { waitUntil: 'networkidle' }).catch(() => {});
    await p.evaluate(() => document.fonts && document.fonts.ready);
    await p.emulateMedia({ media: 'print' });
    // Conteúdo que não cabe no slide = corte. Mede cada bloco de conteúdo contra a área útil do slide.
    const cut = await p.evaluate(() => [...document.querySelectorAll('.slide')].map((s, i) => {
      const box = s.getBoundingClientRect(); const foot = s.querySelector('.foot'); const limit = foot ? foot.getBoundingClientRect().top : box.bottom;
      const clamped = (e) => getComputedStyle(e).webkitLineClamp && getComputedStyle(e).webkitLineClamp !== 'none';
      const boxes = [...s.querySelectorAll('.content > *, .cover-mid, .card, .sw, .kpi, .journey li, .content li')].filter((e) => !clamped(e));
      const over = boxes.some((e) => e.getBoundingClientRect().bottom > limit + 2 || e.scrollHeight > e.clientHeight + 4);
      return over ? i + 1 : 0
    }).filter(Boolean));
    if (cut.length) fails.push(`${o}: conteúdo cortado nos slides ${cut.join(', ')}`);
    const pdf = await p.pdf({ path: `${out}-${o}.pdf`, preferCSSPageSize: true, printBackground: true });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    const n = deckSlideCount(input, o);
    if (pages !== n) fails.push(`${o}: PDF com ${pages} páginas para ${n} slides`);
    const svgs = (html.match(/<svg /g) || []).length;
    console.log(`${o}: ${n} slides, ${pages} páginas no PDF, ${svgs} gráficos/ícones → ${out}-${o}.pdf`);
    await p.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
})();
