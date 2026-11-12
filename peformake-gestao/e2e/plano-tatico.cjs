// Gera e confere o plano tático do audiovisual (apresentação Ellcazo) com dados reais: PDF 16:9 e print de cada página.
// Uso: node e2e/plano-tatico.cjs <dados.json> <pasta-saida> [--todos]
//   dados.json: { name, segment, niche, brand_style, voice, guide, st: { id, month, doc }, actions, scan, takes }
//   --todos: trata todos os vídeos (não recusados) como aprovados (amostra antes da aprovação).
// Falha (código 1) se alguma página cortar conteúdo, ficar pequena demais, mostrar reticências ou texto interno.
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const jiti = require('jiti')(__filename, { interopDefault: true, alias: { '@': path.join(__dirname, '../src') } });
const { deckHtml, presentHtml } = jiti(path.join(__dirname, '../src/features/strategy/consultDeck.ts'));
const { avDeckInput, fetchThumbs } = jiti(path.join(__dirname, '../src/features/strategy/avDeck.ts'));
const { avVideos, scanVideos } = jiti(path.join(__dirname, '../src/features/strategy/avPlan.ts'));

const [file, out, flag] = process.argv.slice(2);
if (!file || !out) { console.error('uso: node e2e/plano-tatico.cjs <dados.json> <pasta> [--todos]'); process.exit(2) }
fs.mkdirSync(out, { recursive: true });
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const actions = d.actions.map((a) => (flag === '--todos' && a.area === 'audiovisual' && a.status === 'proposta' ? { ...a, status: 'aprovada' } : a));
const client = { segment: d.segment ?? d.brand_style?.segmento ?? null, niche: d.niche ?? null };
const videos = avVideos({ month: d.st.month, doc: d.st.doc, actions }, scanVideos(d.scan ?? []), d.takes ?? [], client).filter((v) => v.action?.status === 'aprovada');
const ctx = { brand: { voice: d.voice, guide: d.guide, client: { segment: client.segment, niche: client.niche, brand_style: d.brand_style } }, plano: d.st.doc.plano, titulo: d.st.doc.titulo, foco: d.st.doc.foco };
const INTERNAL = /\[CONFIRMAR|a confirmar|confirmar com|observa[çc][õo]es internas|videomaker|gestor de tráfego|US\$|\/plano\/|R\$\s?\d[\d.,]*\s*(\/mês|por mês)/i;

(async () => {
  const thumbs = await fetchThumbs(videos.flatMap((v) => v.refs.map((r) => r.url)));
  const input = avDeckInput({ name: d.name, month: d.st.month, videos, ctx, thumbs });
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}); const fails = [];
  const p = await b.newPage({ viewport: { width: 1366, height: 800 }, deviceScaleFactor: 1, ignoreHTTPSErrors: !!process.env.HTTPS_PROXY });
  await p.setContent(deckHtml(input, 'paisagem'), { waitUntil: 'networkidle' }).catch(() => {});
  await p.evaluate(() => document.fonts && document.fonts.ready); await p.waitForTimeout(1500);
  await p.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const n = await p.evaluate(() => document.querySelectorAll('.slide').length);
  for (let i = 0; i < n; i++) {
    const r = await p.evaluate((k) => {
      const s = document.querySelectorAll('.slide')[k]; const foot = s.querySelector('.foot');
      const limit = foot && getComputedStyle(foot).display !== 'none' ? foot.getBoundingClientRect().top : s.getBoundingClientRect().bottom;
      const right = s.getBoundingClientRect().right;
      const boxes = [...s.querySelectorAll('.content > *, .cover-mid, .card, .content li, .vt')];
      const over = boxes.filter((e) => e.getBoundingClientRect().bottom > limit + 2 || e.getBoundingClientRect().right > right + 1 || (!/^H[12]$/.test(e.tagName) && e.scrollHeight > e.clientHeight + 4) || e.scrollWidth > e.clientWidth + 4).map((e) => e.className || e.tagName);
      return { over, z: getComputedStyle(s).getPropertyValue('--z').trim() || '1', text: s.innerText, thumb: !!s.querySelector('.vt.has') };
    }, i);
    if (r.over.length) fails.push(`página ${i + 1} corta conteúdo (${r.over.slice(0, 3).join(', ')})`);
    if (Number(r.z) < 0.75) fails.push(`página ${i + 1} ficou pequena demais (escala ${r.z})`);
    const m = INTERNAL.exec(r.text); if (m) fails.push(`página ${i + 1} mostra texto interno ("${m[0]}")`);
    if (r.text.replace(/\s+/g, ' ').trim().length < 40) fails.push(`página ${i + 1} está quase vazia`);
    await (await p.$$('.slide'))[i].screenshot({ path: path.join(out, `p${String(i + 1).padStart(2, '0')}.png`) });
  }
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: path.join(out, 'plano-tatico.pdf'), width: '338.67mm', height: '190.5mm', printBackground: true, preferCSSPageSize: true });
  fs.writeFileSync(path.join(out, 'apresentacao.html'), presentHtml(input, 'paisagem'));
  console.log(`${d.name}: ${n} páginas, ${videos.length} vídeos, miniaturas ${Object.keys(thumbs).length}`);
  await b.close();
  if (fails.length) { console.log(fails.join('\n')); process.exit(1) }
})();
