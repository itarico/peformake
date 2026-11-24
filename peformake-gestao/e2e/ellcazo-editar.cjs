// Ficha do cliente da Ellcazo: botão Editar abre pop-up sem rolagem e grava por ellcazo_client_update. Dados FALSOS.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort & PORT=5199 node e2e/ellcazo-editar.cjs
const { chromium, devices } = require('playwright');
const PORT = process.env.PORT || 5199; const fails = []; const calls = [];
const C = '00000000-0000-4000-8000-000000000001';
const SHEET = { id: C, name: 'Studio Bela', logo_path: null, legacy_logo_url: null, is_active: true, instagram: null, email: null, document: null, contact: 'Bela', phone: null, projects: [], invoices: [] };
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return json({});
  const p = u.pathname;
  if (p.startsWith('/rest/v1/rpc/')) { const fn = p.split('/').pop(); if (fn === 'ellcazo_client_update') { calls.push(JSON.parse(req.postData() || '{}')); return json(null); } return json(fn === 'ellcazo_client_sheet' ? SHEET : []); }
  if (p.startsWith('/rest/v1/')) return json((req.headers()['accept'] || '').includes('vnd.pgrst.object') ? null : []);
  return route.fulfill({ status: 404, body: '' });
}
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock);
    await ctx.addInitScript(() => localStorage.setItem('e2e_roles', 'ellcazo'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await p.goto(`http://localhost:${PORT}ROTA`.replace('ROTA', process.env.ROTA || '/clientes/' + C)); await p.waitForTimeout(1500);
    const edit = p.getByRole('button', { name: 'Editar' });
    if (!(await edit.count())) { fails.push(`${dev}: sem botão Editar (${p.url()})`); await ctx.close(); continue; }
    await edit.click(); await p.waitForTimeout(400);
    const scroll = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) return 'sem pop-up'; return [...d.querySelectorAll('*')].some((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)) ? 'rola' : 'ok'; });
    if (scroll !== 'ok') fails.push(`${dev}: pop-up ${scroll}`);
    await p.getByLabel('WhatsApp').fill('77 99999-0000'); await p.getByLabel('CPF ou CNPJ').fill('12345678909');
    const n = calls.length; await p.getByRole('button', { name: 'Salvar' }).click(); await p.waitForTimeout(600);
    const sent = calls[n];
    if (!sent || sent._client !== C || sent._data.phone !== '77 99999-0000' || sent._data.document !== '12345678909') fails.push(`${dev}: não gravou certo ${JSON.stringify(sent)}`);
    if (await p.locator('dialog[open]').count()) fails.push(`${dev}: pop-up não fechou`);
    if (errs.length) fails.push(`${dev}: erro ${errs[0]}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails.length ? 'FALHAS\n' + fails.join('\n') : 'OK ellcazo-editar');
  process.exit(fails.length ? 1 : 0);
})();
