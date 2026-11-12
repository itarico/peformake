// Lista as chamadas ao banco que o Início (/) dispara (dados falsos, nada vai ao banco).
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/inicio-chamadas.cjs   (ROLES=admin por padrão)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const calls = [];
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = new URL(req.url());
    if (!u.hostname.endsWith('supabase.co')) return route.continue();
    const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '{}' });
    calls.push(req.method() + ' ' + u.pathname.replace('/rest/v1/', '') + (u.pathname.includes('/rpc/') ? ' ' + (req.postData() || '') : ''));
    return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: u.pathname.includes('/rpc/') ? 'null' : '[]' });
  });
  await ctx.addInitScript((r) => { try { localStorage.setItem('e2e_roles', r) } catch {} }, process.env.ROLES || 'admin');
  const p = await ctx.newPage();
  await p.goto('http://localhost:5200' + (process.env.URL || '/')); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(2500);
  const count = {}; for (const c of calls) count[c] = (count[c] || 0) + 1;
  for (const [c, n] of Object.entries(count).sort()) console.log(String(n).padStart(2), c);
  console.log('TOTAL', calls.length);
  await b.close();
})();
