// Confere o "Plano de execução" (documento da equipe) no celular (iPhone 13) e no computador (1366x800), com Playwright.
// Uso: node e2e/plano-execucao.cjs <estrategia.json> <pasta-saida> [Nome do cliente]
//   estrategia.json: o que monthly_plan_get devolve ({ month, doc }). Falha (código 1) se a página rolar para o lado,
//   se faltar a tese ou se algum link não for http(s). Salva um print de cada tela (página inteira).
const fs = require('fs'); const path = require('path');
const { chromium, devices } = require('playwright');
const jiti = require('jiti')(__filename, { interopDefault: true });
const { planHtml } = jiti(path.join(__dirname, '../src/features/strategy/monthlyPlanDoc.ts'));

const [file, out, name = 'Cliente'] = process.argv.slice(2);
if (!file || !out) { console.error('uso: node e2e/plano-execucao.cjs <estrategia.json> <pasta> [nome]'); process.exit(2) }
fs.mkdirSync(out, { recursive: true });
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const html = planHtml({ name: raw.name ?? name, month: String(raw.month).slice(0, 10), doc: raw.doc });

(async () => {
  const b = await chromium.launch(); const fails = [];
  for (const [label, opts] of [['iphone13', devices['iPhone 13']], ['1366x800', { viewport: { width: 1366, height: 800 } }]]) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage();
    await p.setContent(html, { waitUntil: 'load' })
    const r = await p.evaluate(() => ({
      sw: document.scrollingElement.scrollWidth, w: window.innerWidth, h: document.scrollingElement.scrollHeight,
      tese: !!document.querySelector('#tese .big'), pecas: document.querySelectorAll('.piece').length,
      badLinks: [...document.querySelectorAll('a[href]')].filter((a) => !/^(https?:|#)/.test(a.getAttribute('href'))).length,
    }))
    if (r.sw > r.w + 1) fails.push(`${label}: rola para o lado (${r.sw} > ${r.w})`)
    if (!r.tese) fails.push(`${label}: sem a tese do mês`)
    if (r.badLinks) fails.push(`${label}: ${r.badLinks} link(s) inválido(s)`)
    await p.screenshot({ path: path.join(out, `plano-${label}.png`), fullPage: true })
    console.log(label, JSON.stringify(r))
    await ctx.close()
  }
  await b.close()
  if (fails.length) { console.error(fails.join('\n')); process.exit(1) }
  console.log('ok')
})()
