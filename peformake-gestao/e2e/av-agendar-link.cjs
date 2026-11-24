// /audiovisual?agendar=<cliente>: a tarefa "Marcar a gravação" abre o pop-up de agendar. Dados FALSOS.
// Uso: PORT=5199 node e2e/av-agendar-link.cjs (com o servidor de teste no ar)
const { chromium } = require('playwright');
const PORT = process.env.PORT || 5199; const C = '00000000-0000-4000-8000-000000000001';
(async () => {
  const b = await chromium.launch(); const fails = [];
  for (const role of ['ellcazo', 'admin']) {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
    await ctx.route('**/*', (route) => {
      const req = route.request(); const u = new URL(req.url());
      if (!u.hostname.endsWith('supabase.co')) return route.continue();
      const json = (x) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(x) });
      if (req.method() === 'OPTIONS') return json({});
      const fn = u.pathname.split('/').pop();
      if (fn === 'production_clients') return json([{ id: C, name: 'Studio Bela', is_active: true, areas: ['audiovisual'], recurring: true, logo_path: null }]);
      return json((req.headers()['accept'] || '').includes('vnd.pgrst.object') ? null : []);
    });
    await ctx.addInitScript((r) => localStorage.setItem('e2e_roles', r), role);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await p.goto(`http://localhost:${PORT}/audiovisual?agendar=${C}`); await p.waitForTimeout(2000);
    if (!(await p.locator('dialog[open]').count())) fails.push(`${role}: pop-up de agendar não abriu`);
    if (p.url().includes('agendar=')) fails.push(`${role}: o endereço ficou com ?agendar`);
    if (errs.length) fails.push(`${role}: erro ${errs[0]}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails.length ? 'FALHAS\n' + fails.join('\n') : 'OK av-agendar-link');
  process.exit(fails.length ? 1 : 0);
})();
