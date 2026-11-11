// Autoteste do Financeiro → Resumo com dados FALSOS (fin_dashboard interceptado; nada vai ao banco).
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/resumo.cjs   (falha com código 1 se algo quebrar)
const { chromium, devices } = require('playwright');
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true }); const fails = [];
const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(Date.UTC(2025, 11 + i, 1)); return d.toISOString().slice(0, 7) });
const pts = Array.from({ length: 14 }, (_, i) => ({ date: new Date(Date.UTC(2026, 10, 11 + i * 7)).toISOString().slice(0, 10), balance: 1900 + i * 5200 - (i > 3 && i < 8 ? 26000 : 0) }));
const DASH = (unit) => ({
  unit, units: unit === 'juntas' ? ['peformake', 'ellcazo'] : [unit], month: '2026-11', today: '2026-11-11', is_current: true,
  cards: { received: 1900, received_prev: 1500, received_delta_pct: 26.7, expected: 24040, to_receive: 20840, to_receive_n: 30, overdue: 8050, overdue_clients: 4, overdue_max_days: 134, expenses_paid: 0, expenses_open: 0, result: 1900, margin_pct: 100, goal: 20000, goal_pct: 9.5, mrr: 24770 },
  goals: { peformake: 15000, ellcazo: 5000 },
  trust: { pct: 38, no_profit: false, checks: [{ unit: 'peformake', name: 'Faturas pagas = baixas no Caixa', a: 1400, b: 1400, ok: true }, { unit: 'ellcazo', name: 'Faturas pagas = baixas no Caixa', a: 500, b: 500, ok: true }],
    reasons: [
      { key: 'extrato', unit: 'peformake', weight: 30, text: 'falta importar o extrato da Peformake (nunca importado)', to: '/financeiro/caixa', label: 'Importar extrato' },
      { key: 'extrato', unit: 'ellcazo', weight: 30, text: 'falta importar o extrato da Ellcazo (nunca importado)', to: '/financeiro/caixa', label: 'Importar extrato' },
      { key: 'fixas', unit: 'peformake', weight: 20, text: 'sem despesas fixas da Peformake (Contas fixas)', to: '/financeiro/caixa', label: 'Cadastrar contas fixas' },
      { key: 'fixas', unit: 'ellcazo', weight: 20, text: 'sem despesas fixas da Ellcazo (Contas fixas)', to: '/financeiro/caixa', label: 'Cadastrar contas fixas' },
      { key: 'prolabore', unit: 'peformake', weight: 10, text: 'lucro sem pró-labore/impostos da Peformake', to: '/financeiro/caixa', label: 'Cadastrar contas fixas' },
    ] },
  actions: [
    { key: 'atraso:a', title: 'Fuctura Soluções: R$ 4.200,00 em atraso há 134 dias', amount: 4200, urgent: true, to: '/clientes/00000000-0000-4000-8000-000000000001?aba=contrato&acao=cobrar', label: 'Cobrar', source: 'Faturas vencidas e não pagas' },
    { key: 'atraso:b', title: 'Ótica CM Prime: R$ 2.550,00 em atraso há 73 dias', amount: 2550, urgent: true, to: '/clientes/00000000-0000-4000-8000-000000000002?aba=contrato&acao=cobrar', label: 'Cobrar', source: 'Faturas vencidas e não pagas' },
    { key: 'sem_doc', title: '2 clientes sem CPF/CNPJ com fatura perto de vencer', amount: 1300, to: '/financeiro/cobranca', label: 'Completar', source: 'Sem documento o boleto/Pix não sai' },
    { key: 'extrato', title: 'falta importar o extrato da Peformake (nunca importado)', amount: 0, to: '/financeiro/caixa', label: 'Importar', source: 'Selo de confiança' },
  ],
  series: months.map((m, i) => ({ month: m, received_p: i > 9 ? 1400 + i * 300 : 0, received_e: i > 9 ? 500 + i * 100 : 0, expected_p: 900 * i, expected_e: 400 * i, expenses: 0 })),
  cash: { start: 1900, points: pts, min: -14000, min_date: pts[5].date, negative_on: pts[4].date, end: pts[13].balance, in: 72030, out: 26000 },
  by_area: [{ area: 'audiovisual', amount: 12970 }, { area: 'trafego', amount: 4450 }, { area: 'design', amount: 1960 }, { area: 'licitacao', amount: 1900 }],
  concentration: { top: [{ id: 'x1', name: 'Ótica CM Prime', amount: 3150, pct: 21.3 }, { id: 'x2', name: 'Fuctura Soluções', amount: 2700, pct: 9.7 }], total: 27790, top1_pct: 21.3, top5_pct: 43.5 },
  delinquency: months.slice(6).map((m, i) => ({ month: m, billed: 1000 + i * 100, late: i < 5 ? 1000 + i * 100 : 350, pct: i < 5 ? 100 : 20 })),
  expenses: [],
  insights: [
    { kind: 'ritmo', tone: 'warn', title: 'Ritmo do mês: recebido 59% do que venceu até hoje', value: 59, source: 'R$ 1.900,00 de R$ 3.200,00 (vencimentos de 01 até hoje)', to: '/financeiro/cobranca', label: 'Ver Cobrança' },
    { kind: 'lucro', tone: 'ok', title: 'Lucrando com Audiovisual: 55% da receita', value: 12970, source: 'R$ 12.970,00 nas faturas do mês', to: null, label: null },
    { kind: 'gargalo', tone: 'warn', title: 'Receita concentrada: Ótica CM Prime é 21% do faturado', value: 21, source: 'Últimos 3 meses', to: '/comercial', label: 'Prospectar' },
    { kind: 'dica', tone: 'neutral', title: 'Fuctura Soluções atrasou em 5 meses: propor cartão recorrente ou pré-pago', value: 5, source: 'Faturas pagas com atraso', to: '/clientes/x?aba=contrato', label: 'Abrir cliente' },
    { kind: 'dica', tone: 'warn', title: 'Caixa projetado negativo em 09/12: antecipar cobranças ou adiar despesas', value: -14000, source: 'Caixa projetado 90 dias', to: '/financeiro/caixa', label: 'Ver Caixa' },
  ],
  clients: Array.from({ length: 40 }, (_, i) => ({ id: '00000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'), name: 'Cliente de teste com nome comprido ' + i, mrr: 600 + i * 20, paid3: i * 100, overdue: i < 4 ? 1000 * (4 - i) : 0, days: i < 4 ? 30 * (4 - i) : 0, nps: i % 5 ? 9 : 5, risk: i < 2 ? 'alto' : i < 6 ? 'medio' : 'baixo' })),
});
const calls = [];
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return json({});
  if (u.pathname.endsWith('/rpc/fin_dashboard')) { const body = JSON.parse(req.postData() || '{}'); calls.push(body); return json(DASH(body._unit || 'juntas')) }
  if (u.pathname.endsWith('/rpc/fin_goal_save')) { calls.push({ goal: JSON.parse(req.postData() || '{}') }); return json(null) }
  if (u.pathname.startsWith('/rest/v1/rpc/')) return json([]);
  if (u.pathname.startsWith('/rest/v1/')) return json([], 200);
  return json({});
}
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push('PAGEERR ' + (e.stack || e.message).slice(0, 300)));
    await p.goto('http://localhost:5200/financeiro'); await p.waitForSelector('[data-kpi-row]', { timeout: 15000 }).catch(() => fails.push(`${dev}: cartões não apareceram`));
    await p.waitForTimeout(900);
    const m = await p.evaluate(() => {
      const kpi = document.querySelector('[data-kpi-row]')?.getBoundingClientRect();
      const tabs = [...document.querySelectorAll('nav[aria-label="Áreas de Financeiro"] a')].map((a) => a.textContent);
      const nested = [...document.querySelectorAll('main *')].filter((e) => { const s = getComputedStyle(e); return (s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 2 }).length;
      return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, kpiTop: kpi ? Math.round(kpi.top / innerHeight * 100) : null, cols: kpi ? getComputedStyle(document.querySelector('[data-kpi-row]')).gridTemplateColumns.split(' ').length : 0,
        tabs, nested, trust: document.querySelector('[data-trust]')?.textContent, grey: !!document.querySelector('[data-grey]'), actions: document.querySelectorAll('section[aria-label="O que fazer agora"] li').length, path: location.pathname };
    });
    await p.screenshot({ path: `${OUT}/resumo-${dev}.png`, fullPage: false });
    await p.screenshot({ path: `${OUT}/resumo-${dev}-inteira.png`, fullPage: true });
    console.log(JSON.stringify({ dev, ...m }));
    if (m.sw > m.cw + 2) fails.push(`${dev}: rolagem de lado`);
    if (m.tabs[0] !== 'Resumo') fails.push(`${dev}: Resumo não é a 1ª aba (${m.tabs})`);
    if (dev === 'iphone' && (m.kpiTop === null || m.kpiTop > 35)) fails.push(`${dev}: 1º conteúdo em ${m.kpiTop}% da altura (máx. 35%)`);
    if (m.cols !== (dev === 'iphone' ? 2 : 4)) fails.push(`${dev}: cartões em ${m.cols} colunas`);
    if (m.actions !== 3) fails.push(`${dev}: "O que fazer agora" com ${m.actions} itens (esperado 3)`);
    if (!m.grey) fails.push(`${dev}: dados 38% e gráficos não ficaram cinza`);
    if (!/Dados 38%/.test(m.trust || '')) fails.push(`${dev}: selo de confiança ausente`);
    // Filtro de empresa
    await p.getByRole('button', { name: 'Ellcazo', exact: true }).click(); await p.waitForTimeout(500);
    if (!calls.some((c) => c._unit === 'ellcazo')) fails.push(`${dev}: filtro Ellcazo não chamou o banco`);
    if (!/empresa=ellcazo/.test(p.url())) fails.push(`${dev}: filtro não foi para a URL`);
    // Selo: detalhe em pop-up
    await p.locator('[data-trust]').click(); await p.waitForTimeout(300);
    if (!(await p.getByText('Conferência automática').isVisible())) fails.push(`${dev}: detalhe do selo não abriu`);
    await p.screenshot({ path: `${OUT}/resumo-${dev}-selo.png` });
    await p.keyboard.press('Escape');
    // Ver mais gráficos e detalhes
    await p.getByRole('button', { name: 'Ver mais gráficos' }).click(); await p.waitForTimeout(400);
    if (!(await p.getByText('Receita por área').isVisible())) fails.push(`${dev}: "Ver mais gráficos" não abriu`);
    await p.screenshot({ path: `${OUT}/resumo-${dev}-mais.png`, fullPage: true });
    await p.getByRole('button', { name: 'Ver detalhes por cliente' }).click(); await p.waitForTimeout(400);
    const dlg = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); const r = d?.getBoundingClientRect(); return d ? { h: Math.round(r.height), vh: innerHeight, sw: d.scrollWidth, cw: d.clientWidth } : null });
    if (!dlg) fails.push(`${dev}: detalhes por cliente não abriu`); else if (dlg.sw > dlg.cw + 2) fails.push(`${dev}: tabela com rolagem de lado`);
    await p.screenshot({ path: `${OUT}/resumo-${dev}-clientes.png` });
    await p.keyboard.press('Escape');
    // Meta
    await p.locator('button[aria-label^="Meta"]').first().click(); await p.waitForTimeout(300);
    await p.getByLabel('Ellcazo (R$ por mês)').fill('7.500,00'); await p.getByRole('button', { name: 'Salvar' }).click(); await p.waitForTimeout(400);
    if (!calls.some((c) => c.goal && c.goal._unit === 'ellcazo' && c.goal._target === 7500)) fails.push(`${dev}: meta não foi salva (${JSON.stringify(calls.filter((c) => c.goal))})`);
    // Caixa e redirecionamentos
    await p.goto('http://localhost:5200/financeiro?repasses=1'); await p.waitForTimeout(800);
    if (!p.url().includes('/financeiro/caixa?repasses=1')) fails.push(`${dev}: /financeiro?repasses=1 não foi para o Caixa (${p.url()})`);
    if (errs.length) fails.push(`${dev}: erro na tela ${errs[0]}`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHOU:\n' + fails.join('\n')); process.exit(1) }
  console.log('Resumo ok.');
})();
