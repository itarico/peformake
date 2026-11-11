// Autoteste de Clientes → Resumo e do funil do Comercial com dados FALSOS (nada vai ao banco).
// Uso: npx vite --config e2e/shell/vite.config.ts & PORT=5200 node e2e/clientes-resumo.cjs   (falha com código 1 se algo quebrar)
const { chromium, devices } = require('playwright');
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true }); const fails = [];
const PORT = process.env.PORT || 5200;
const id = (i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0');
const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2025, 11 + i, 1)).toISOString().slice(0, 10));
const RPC = {
  dash_clients: {
    active: 24, lost_90d: 4, one_off_active: 7, unassessed: 10, renewals_60d: 1,
    health: { muito_bom: 3, bom: 9, neutro: 3, ruim: 1, muito_ruim: 1 },
    services: [{ name: 'Tráfego', n: 12 }, { name: 'Social Mídia', n: 8 }],
    flow: months.map((m, i) => ({ month: m, at_start: 20 + i, joined: i % 3, left: i % 4 === 0 ? 1 : 0 })),
    tenure: { avg_months: 7.5, lost_avg_months: 4, buckets: { lt3: 9, '3to6': 6, '6to12': 4, '12to24': 3, gt24: 2, gt12: 5, unknown: 1 } },
    nps: { answers: 10, promoters: 6, neutral: 2, detractors: 2 },
    lost_reasons: [{ reason: 'Fim de contrato', n: 2 }],
    lost_suggested: [{ id: id(1), name: 'Auto Nunes Comércio de Peças Ltda', since: '2026-09-01' }, { id: id(2), name: 'Grelina', since: '2026-09-05' }],
  },
  dash_clients_avulsos: {
    total: 15, bought_90d: 7, new_month: 2, buyers: 8, repeat: 3,
    new_by_month: months.map((m, i) => ({ month: m, n: i % 3 })),
    activity: { ativo: 7, esfriando: 5, inativo: 1 },
    frequency: { f1: 5, f2: 2, f3: 1, f4: 1, none: 1 },
    recency: { le90: 7, d91to180: 5, gt180: 1, none: 1 },
    cooling: Array.from({ length: 5 }, (_, i) => ({ id: id(10 + i), name: 'Cliente avulso com nome comprido ' + i, last: '2026-0' + (6 + (i % 2)) + '-1' + i, n: 1 + i })),
    revenue_12m: 12000, paid_count_12m: 9, ticket: 1333.33,
  },
  dash_commercial: {
    period: ['2026-10-12', '2026-11-11'], new_contacts: 30, new_contacts_prev: 20, new_contacts_daily: [], unanswered: 2,
    sales_cents: 500000, sales_cents_prev: 300000, sales_pending: 1, won: 4, lost: 3,
    nps: { responses: 0, promoters: 0, detractors: 0 }, pipeline_cents: 900000,
    deals_by_stage: { novo: 12, qualificacao: 6, negociacao: 4, aguardando: 2, ganho: 3, pos_venda: 1 },
  },
};
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return json({});
  if (u.pathname.startsWith('/rest/v1/rpc/')) { const fn = u.pathname.split('/').pop(); return json(fn in RPC ? RPC[fn] : []) }
  if (u.pathname.startsWith('/rest/v1/')) return json([], 200);
  return json({});
}
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    for (const theme of ['light', 'dark']) {
      const ctx = await b.newContext({ ...opts, colorScheme: theme }); await ctx.route('**/*', mock); const p = await ctx.newPage();
      await p.addInitScript((t) => { try { localStorage.setItem('theme', t) } catch { /* sem armazenamento */ } }, theme);
      const errs = []; p.on('pageerror', (e) => errs.push('PAGEERR ' + (e.stack || e.message).slice(0, 300)));
      await p.goto(`http://localhost:${PORT}/clientes`);
      await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await p.waitForSelector('section[aria-label="Clientes avulsos"]', { timeout: 15000 }).catch(() => fails.push(`${dev}/${theme}: resumo de clientes não abriu`));
      await p.waitForTimeout(600);
      const m = await p.evaluate(() => {
        const nested = [...document.querySelectorAll('main *')].filter((e) => { const s = getComputedStyle(e); return (s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 2 }).length;
        const over = [...document.querySelectorAll('main section *')].filter((e) => { const r = e.getBoundingClientRect(); const sec = e.closest('section').getBoundingClientRect(); return r.width > 0 && r.right > sec.right + 1 }).map((e) => e.className && String(e.className).slice(0, 60)).slice(0, 5);
        const gauge = document.querySelector('svg[aria-label^="Nota da carteira"]')?.getAttribute('aria-label');
        return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, nested, over, gauge,
          tenure: [...document.querySelectorAll('section[aria-label="Tempo de casa"] li')].map((l) => l.textContent),
          freq: document.querySelectorAll('section[aria-label="Quantas vezes compraram"] li').length,
          cooling: document.querySelectorAll('section[aria-label="Esfriando"] li').length,
          lost: document.querySelectorAll('section[aria-label="Saíram sem avisar?"] li').length };
      });
      console.log(JSON.stringify({ dev, theme, ...m }));
      await p.screenshot({ path: `${OUT}/clientes-resumo-${dev}-${theme}.png`, fullPage: true });
      if (m.sw > m.cw + 2) fails.push(`${dev}/${theme}: rolagem de lado`);
      if (m.nested) fails.push(`${dev}/${theme}: ${m.nested} rolagem(ns) interna(s)`);
      if (m.over.length) fails.push(`${dev}/${theme}: algo sai do cartão: ${m.over.join(' | ')}`);
      if (!/: 68 de 100, Atenção/.test(m.gauge || '')) fails.push(`${dev}/${theme}: velocímetro errado (${m.gauge})`);
      if (m.tenure.length !== 6) fails.push(`${dev}/${theme}: tempo de casa com ${m.tenure.length} faixas`);
      if (m.freq !== 5) fails.push(`${dev}/${theme}: frequência com ${m.freq} linhas`);
      if (m.cooling !== 3) fails.push(`${dev}/${theme}: esfriando deveria mostrar 3 (mostra ${m.cooling})`);
      if (m.lost !== 2) fails.push(`${dev}/${theme}: sugestões de perdido: ${m.lost}`);
      // Ver detalhes do esfriando: pop-up sem rolagem interna.
      await p.getByRole('button', { name: 'Ver detalhes' }).click(); await p.waitForTimeout(400);
      const dlg = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) return null; const bad = [d, ...d.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)).length; return { items: d.querySelectorAll('li').length, bad } });
      if (!dlg || dlg.items !== 5 || dlg.bad) fails.push(`${dev}/${theme}: Ver detalhes errado ${JSON.stringify(dlg)}`);
      if (theme === 'light') await p.screenshot({ path: `${OUT}/clientes-resumo-${dev}-detalhes.png` });
      await p.keyboard.press('Escape');
      // Funil do Comercial: barras decrescentes com %.
      await p.goto(`http://localhost:${PORT}/comercial/resumo`);
      await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await p.waitForSelector('section[aria-label="Funil"]', { timeout: 15000 }).catch(() => fails.push(`${dev}/${theme}: funil não abriu`));
      await p.waitForTimeout(400);
      const f = await p.evaluate(() => ({ rows: [...document.querySelectorAll('section[aria-label="Funil"] li')].map((l) => l.getAttribute('aria-label')), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      console.log(JSON.stringify({ dev, theme, funil: f.rows }));
      const vals = f.rows.map((r) => Number(/: (\d+)/.exec(r)?.[1]));
      if (vals.join() !== '28,16,10,6,4') fails.push(`${dev}/${theme}: funil ${vals.join()}`);
      if (!/60% da etapa anterior/.test(f.rows[3] || '')) fails.push(`${dev}/${theme}: % do funil errado (${f.rows[3]})`);
      if (f.sw > f.cw + 2) fails.push(`${dev}/${theme}: comercial com rolagem de lado`);
      await p.locator('section[aria-label="Funil"]').screenshot({ path: `${OUT}/comercial-funil-${dev}-${theme}.png` });
      if (errs.length) fails.push(`${dev}/${theme}: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails.length) { console.log('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('OK');
})();
