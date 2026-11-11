// Autoteste do papel Ellcazo (só ellcazo) com dados FALSOS no navegador: menu, rotas bloqueadas que redirecionam,
// Cobrança com ações nas faturas da Ellcazo e ficha resumida do cliente. Também confere que o admin segue igual.
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/ellcazo.cjs
const { chromium, devices } = require('playwright');
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true }); const fails = [];
const C = '00000000-0000-4000-8000-000000000001';
const inv = (id, unit, status) => ({ id, client_id: C, unit, description: 'Gravação ' + id.slice(-1), amount: 900, due_date: '2026-11-20', status, source: 'manual', ref: id, gateway: null, gateway_id: null, payment_url: null, gateway_error: null, paid_at: null, paid_amount: null, group_id: null, pay_token: id, charge_sent_at: null, charge_sent_how: null, clients: { name: 'Studio Bela', logo_path: null, legacy_logo_url: null }, invoice_groups: null, invoice_items: [] });
const T = { clients: [{ id: C, name: 'Studio Bela', document: null, billing_email: null, email: null, is_active: true, is_lost: false }], invoices: [inv('00000000-0000-4000-8000-0000000000a1', 'ellcazo', 'pendente')], fin_entries: [], fin_categories: [], billing_settings: [{ id: true }] };
const RPC = { ellcazo_client_sheet: { id: C, name: 'Studio Bela', logo_path: null, legacy_logo_url: null, is_active: true, instagram: null, contact: 'Bela', phone: '81988887777',
  projects: [{ id: 'p1', title: 'Vídeos de 11/2026', status: 'scheduled', shoot_at: '2026-11-20T10:00:00Z', due_date: null, delivered_at: null }],
  invoices: [{ id: 'i1', description: 'Gravação avulsa', amount: 900, due_date: '2026-11-02', status: 'vencido', paid_at: null }] }, can_finance: true };
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return json({});
  const p = u.pathname;
  if (p.startsWith('/rest/v1/rpc/')) { const fn = p.split('/').pop(); return json(fn in RPC ? RPC[fn] : []); }
  if (p.startsWith('/rest/v1/')) { const t = p.split('/').pop(); const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object'); const rows = T[t] ?? []; return json(one ? (rows[0] ?? null) : rows); }
  return route.fulfill({ status: 404, body: '' });
}
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    for (const role of ['ellcazo', 'admin']) {
      const ctx = await b.newContext(opts); await ctx.route('**/*', mock);
      await ctx.addInitScript((r) => localStorage.setItem('e2e_roles', r), role);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
      const go = async (url) => { await p.goto('http://localhost:5200' + url); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(900); };
      const text = () => p.evaluate(() => document.body.innerText);
      const hasLink = (href) => p.evaluate((h) => [...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === h && a.getBoundingClientRect().width > 0), href);
      await go('/financeiro/cobranca');
      const menuCom = await p.evaluate(() => [...document.querySelectorAll('nav a, aside a')].some((a) => a.getAttribute('href') === '/comercial'));
      const anyLink = (h) => p.evaluate((x) => [...document.querySelectorAll('a')].some((a) => (a.getAttribute('href') || '').startsWith(x)), h);
      let tabContr = await anyLink('/financeiro/contratos');
      if (!tabContr) { const more = p.locator('button:has-text("Mais")').first(); if (await more.count()) { await more.click().catch(() => {}); await p.waitForTimeout(200); tabContr = await anyLink('/financeiro/contratos'); await p.keyboard.press('Escape') } }
      if (role === 'ellcazo') {
        if (menuCom) fails.push(`${dev} ellcazo: Comercial ainda no menu`);
        if (tabContr) fails.push(`${dev} ellcazo: aba Contratos aparece`);
        await go('/comercial'); if (!p.url().endsWith('/inicio')) fails.push(`${dev} ellcazo: /comercial não redirecionou (${p.url()})`);
        await go('/comercial/funil'); if (!p.url().endsWith('/inicio')) fails.push(`${dev} ellcazo: /comercial/funil não redirecionou`);
        await go('/financeiro/contratos'); if (!p.url().endsWith('/financeiro/caixa')) fails.push(`${dev} ellcazo: /financeiro/contratos não redirecionou (${p.url()})`);
        if (/não tem acesso/i.test(await text())) fails.push(`${dev} ellcazo: tela de bloqueio em vez de redirecionar`);
        await go('/financeiro/cobranca');
        const t = await text();
        if (!/Studio Bela/.test(t)) fails.push(`${dev} ellcazo: nome do cliente não aparece na Cobrança`);
        if (!(await p.locator('button:has-text("Cobrar")').count())) fails.push(`${dev} ellcazo: sem botão Cobrar na fatura da Ellcazo`);
        if (!(await p.locator('button[aria-label="Nova cobrança"], button:has-text("Nova cobrança")').count())) fails.push(`${dev} ellcazo: sem Nova cobrança`);
        await p.locator('button[aria-label^="Mais ações de Studio Bela"]').first().click().catch(() => fails.push(`${dev} ellcazo: sem menu de ações da fatura`));
        await p.waitForTimeout(300);
        const menu = await text();
        for (const must of ['Recebi (marcar pago)', 'Mudar vencimento', 'Copiar link de pagamento']) if (!menu.includes(must)) fails.push(`${dev} ellcazo: falta "${must}"`);
        if (menu.includes('Criar link no Asaas agora')) fails.push(`${dev} ellcazo: aparece Criar link no Asaas`);
        await p.screenshot({ path: `${OUT}/ellcazo-${dev}-cobranca.png` });
        await p.keyboard.press('Escape');
        await go('/clientes/' + C);
        const f = await text();
        if (!/Studio Bela/.test(f) || !/Projetos da Ellcazo/.test(f) || !/Faturas da Ellcazo/.test(f)) fails.push(`${dev} ellcazo: ficha resumida não abriu`);
        if (/não tem acesso/i.test(f)) fails.push(`${dev} ellcazo: ficha bloqueada`);
        const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (sw > 2) fails.push(`${dev} ellcazo: ficha com rolagem de lado`);
        await p.screenshot({ path: `${OUT}/ellcazo-${dev}-ficha.png` });
      } else {
        if (dev === 'desk' && !menuCom) fails.push(`${dev} admin: Comercial sumiu do menu`);
        if (!tabContr) fails.push(`${dev} admin: aba Contratos sumiu`);
        await go('/financeiro/contratos'); if (!p.url().endsWith('/financeiro/contratos')) fails.push(`${dev} admin: Contratos redirecionou`);
        await go('/comercial/funil'); if (!p.url().includes('/comercial')) fails.push(`${dev} admin: Comercial redirecionou`);
      }
      if (errs.length) fails.push(`${dev} ${role}: erro na tela: ${errs[0]}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails.length) { console.error('FALHOU:\n' + fails.join('\n')); process.exit(1) }
  console.log('Ellcazo ok.');
})();
