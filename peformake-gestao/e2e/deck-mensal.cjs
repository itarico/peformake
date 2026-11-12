// Gera e confere a apresentação da Estratégia do mês nos dois formatos, com Playwright (print de cada slide).
// Uso: node e2e/deck-mensal.cjs <estrategia.json | diagnostico.json> <pasta-saida> [Nome do cliente]
//   estrategia.json: o que monthly_get devolve ({ month, doc, actions }). Falha (código 1) se algum slide cortar conteúdo
//   ou se aparecer texto interno (preço da Peformake, [CONFIRMAR], "a confirmar", cargos da equipe).
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const jiti = require('jiti')(__filename, { interopDefault: true });
const { presentHtml } = jiti(path.join(__dirname, '../src/features/strategy/consultDeck.ts'));
const { monthlyDeckInput } = jiti(path.join(__dirname, '../src/features/strategy/monthlyDeck.ts'));

const [file, out, name = 'Will motos'] = process.argv.slice(2);
if (!file || !out) { console.error('uso: node e2e/deck-mensal.cjs <estrategia.json> <pasta> [nome]'); process.exit(2) }
fs.mkdirSync(out, { recursive: true });
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/logo-pfmk.png')).toString('base64');
// Com "actions" é a estratégia do mês; senão, o diagnóstico ({ doc } ou o doc direto), para conferir as duas apresentações.
const input = Array.isArray(raw.actions) ? monthlyDeckInput({ name, strategy: raw, peformakeLogoUrl: logo })
  : { name, doc: raw.doc ?? raw, questions: (raw.doc ?? raw).do_cliente?.map((q) => ({ question: q.pergunta, why: q.por_que })) ?? [], peformakeLogoUrl: logo };
const INTERNAL = /\[CONFIRMAR|a confirmar|se o cliente confirmar|gestor de tráfego|social media|videomaker|designer|head de marketing|áudio não ouvido|R\$\s?\d[\d.,]*\s*(\/mês|por mês)/i;

(async () => {
  const b = await chromium.launch(); const fails = [];
  for (const o of ['paisagem', 'vertical']) {
    const vp = o === 'paisagem' ? { width: 1366, height: 800 } : { width: 390, height: 844 };
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
    await p.setContent(presentHtml(input, o), { waitUntil: 'networkidle' }).catch(() => {});
    await p.evaluate(() => document.fonts && document.fonts.ready); await p.waitForTimeout(400);
    const n = await p.evaluate(() => document.querySelectorAll('.slide').length);
    for (let i = 0; i < n; i++) {
      const r = await p.evaluate((k) => {
        const S = [...document.querySelectorAll('.slide')]; S.forEach((s, j) => s.classList.toggle('on', j === k));
        const s = S[k]; const foot = s.querySelector('.foot'); const limit = foot ? foot.getBoundingClientRect().top : s.getBoundingClientRect().bottom;
        const boxes = [...s.querySelectorAll('.content > *, .cover-mid, .card, .kpi, .content li')];
        const over = boxes.some((e) => e.getBoundingClientRect().bottom > limit + 2 || e.scrollHeight > e.clientHeight + 4 || e.scrollWidth > e.clientWidth + 4);
        return { over, z: getComputedStyle(s).getPropertyValue('--z').trim() || '1', text: s.innerText, ell: /…|\.\.\./.test(s.innerText) };
      }, i);
      if (r.over) fails.push(`${o}: slide ${i + 1} corta conteúdo`);
      if (r.ell) fails.push(`${o}: slide ${i + 1} tem reticências`);
      const m = INTERNAL.exec(r.text); if (m) fails.push(`${o}: slide ${i + 1} mostra texto interno ("${m[0]}")`);
      if (Number(r.z) < 0.75) fails.push(`${o}: slide ${i + 1} ficou pequeno demais (escala ${r.z})`);
      await p.locator('.slide.on').screenshot({ path: path.join(out, `${o}-${String(i + 1).padStart(2, '0')}.png`) });
    }
    console.log(`${o}: ${n} slides → ${out}`);
    await p.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
})();
