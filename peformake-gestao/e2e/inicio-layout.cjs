// Prints do Início (dados falsos, nada vai ao banco) no iPhone 13 e em 1366x800, e mede rolagem dupla e buracos por linha.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 & PORT=5199 node e2e/inicio-layout.cjs   (ROLES=admin por padrão)
const { chromium } = require('playwright');
const path = require('path');
const PORT = process.env.PORT || 5200;
const ym = (k) => { const d = new Date(Date.UTC(2026, 10 - k, 1)); return d.toISOString().slice(0, 7); };
const days = (n, f) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.UTC(2026, 9, 22 + i)); return f(d.toISOString().slice(0, 10), i); });
const FAKE = {
  dash_home_business: {
    months: Array.from({ length: 12 }, (_, i) => ({ month: ym(11 - i), active: 14 + i, joined: i % 3, left: i % 4 === 0 ? 1 : 0, mrr_peformake: 8000 + i * 900, mrr_ellcazo: 3000 + i * 500, received: 9000 + i * 1200, costs: 4000 })),
    paying_clients: 20,
    top_clients: [['Disalp', 2600], ['Natalia de Mendo', 2300], ['Wil motos', 1900], ['Ferraris', 1600], ['CIA Coffe', 1450], ['Cajá Limão', 1200], ['Transpeto', 900]].map(([name, amount]) => ({ name, amount })),
    by_service: [['Produção Audiovisual', 13000], ['Tráfego', 5400], ['Design', 2400], ['Social Media', 2300], ['Plano Mobile Sensorial', 1100], ['Consultoria', 540], ['Visita mobile', 500], ['Apresentador', 500]].map(([name, amount]) => ({ name, amount })),
    tenure_avg_months: 5.6, lost_tenure_avg_months: 3.1,
  },
  dash_traffic: { period: ['2026-10-22', '2026-11-20'], daily: days(30, (day, i) => ({ day, spend_cents: (200 + (i * 37) % 300) * 100, results: i % 7 })), totals: { spend_cents: 869000, results: 80, clicks: 900, impressions: 40000 }, previous: { spend_cents: 640000, results: 60, clicks: 800, impressions: 30000 }, accounts_linked: 9, accounts_spending: 7, open_alerts: 1, low_balance: 5, tasks: { todo: 100, doing: 50, review: 35, done_period: 20 }, recommendations_open: 20, top_clients: [] },
  dash_commercial: { period: ['2026-10-22', '2026-11-20'], new_contacts_daily: days(30, (day, i) => ({ day, n: (i * 5) % 9 })), new_contacts: 111, new_contacts_prev: 80, unanswered: 69, deals_by_stage: {}, pipeline_cents: 0, sales_cents: 0, sales_cents_prev: 0, sales_pending: 0, won: 0, lost: 0, nps: { responses: 0, promoters: 0, detractors: 0 } },
  dash_content: { total: 10, by_status: { briefing: 2, review: 1, approved: 7 }, late: 0, publish_next7: 3, revisions: 0, clients: 5, plans_ready: 3, plans_total: 5, designers: [] },
  dash_av: { total: 3, by_status: { review: 1 }, shoots_next7: 1, late: 0, delivered_month: 2, videos_planned: 6 },
  operation_progress: [
    { client_id: 'a', name: 'APM', areas: ['design'], design: { total: 12, done: 7, waiting: 2 }, audiovisual: null, trafego: null, pct: 58 },
    { client_id: 'b', name: '3LM', areas: ['audiovisual'], design: null, audiovisual: { total: 4, done: 1, waiting: 0 }, trafego: null, pct: 25 },
    { client_id: 'c', name: 'Disalp', areas: ['trafego'], design: null, audiovisual: null, trafego: { weekly_sent: 2, weekly_due: 3, strategy: true }, pct: 75 },
  ],
};
(async () => {
  const b = await chromium.launch();
  const out = path.join(__dirname, 'capturas');
  for (const [name, vp, mobile] of [['iphone13', { width: 390, height: 844 }, true], ['1366', { width: 1366, height: 800 }, false]]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1 });
    await ctx.route('**/*', (route) => {
      const req = route.request(); const u = new URL(req.url());
      if (!u.hostname.endsWith('supabase.co')) return route.continue();
      const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '{}' });
      const fn = u.pathname.split('/rpc/')[1];
      const body = fn ? (FAKE[fn] !== undefined ? FAKE[fn] : null) : [];
      return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(body) });
    });
    await ctx.addInitScript((r) => { try { localStorage.setItem('e2e_roles', r) } catch {} }, process.env.ROLES || 'admin');
    const p = await ctx.newPage();
    await p.goto(`http://localhost:${PORT}/`); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(2500);
    const m = await p.evaluate(() => {
      const doc = document.documentElement;
      const hscroll = doc.scrollWidth > doc.clientWidth;
      // Rolagem interna: algum elemento (fora html/body) com overflow que rola na vertical.
      const inner = [...document.querySelectorAll('main *')].filter((el) => { const s = getComputedStyle(el); return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2; }).map((el) => el.className.toString().slice(0, 60));
      // Por linha da grade: cartões com alturas diferentes = buraco.
      const rows = [...document.querySelectorAll('main .grid')].map((g) => { const kids = [...g.children].map((k) => k.getBoundingClientRect()); const tops = {}; kids.forEach((r) => { const t = Math.round(r.top); (tops[t] ||= []).push(Math.round(r.height)); }); return Object.values(tops).filter((hs) => new Set(hs).size > 1); }).flat();
      const errors = [...document.querySelectorAll('main')].map((x) => x.innerText).join(' ').includes('Não foi possível');
      return { hscroll, inner, unevenRows: rows, errors };
    });
    console.log(name, JSON.stringify(m));
    // O conteúdo rola dentro do layout: aumenta a janela até caber tudo para o print sair inteiro.
    const full = await p.evaluate(() => Math.max(...[...document.querySelectorAll('*')].map((el) => el.scrollHeight)));
    await p.setViewportSize({ width: vp.width, height: Math.min(full + 40, 6000) }); await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, `inicio-${name}.png`), fullPage: true });
    await ctx.close();
  }
  await b.close();
})();
