// Autoteste de Equipe → Membros com dados FALSOS no navegador (nada vai ao banco).
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/membros.cjs
// Regras: lista mostra o tipo de contrato (ou "definir"); pop-up de cada etapa e de cada tipo de contrato cabe SEM rolar
// (scrollHeight <= clientHeight do corpo do Dialog) no iPhone 13 e no desktop 1366x800; telefone com máscara; Remover pergunta.
const { chromium, devices } = require('playwright');
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true }); const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const member = (n, name, extra = {}) => ({ id: id(n), name, job_title: null, main_role: 'social_media', email: null, phone: null, skills: [], avatar_path: null, active: true, profile_id: null, login_active: false, is_master: false, roles: [], area_admin: [], invited: false, level: 'none', contract: null, pay_schedule: null, ...extra });
const MEMBERS = [
  member(1, 'Italo', { profile_id: id(101), login_active: true, is_master: true, level: 'total', contract: 'socio', pay_schedule: 'mensal' }),
  member(2, 'Almeida', { phone: '5581999990000', contract: 'pj', pay_schedule: 'quinzenal' }),
  member(3, 'Thyfany Rayane', { profile_id: id(103), login_active: true, level: 'user' }),
  member(4, 'Lucas'), member(5, 'Ingrid Rayane'), member(6, 'Aleffer', { contract: 'freela', pay_schedule: 'mensal' }),
];
const ote = (contract, extra = {}) => ({ month: '2026-11-01', goal_role: 'conteudo', min_pct: 70, cap_pct: 120, contract, base_salary: 3000, variable_target: 500, ote: 3500, pay_day: null, unit: 'peformake', notes: null, pay_schedule: 'quinzenal', advance_pct: 50, variable_enabled: false, require_invoice: false, profit_share_pct: contract === 'socio' ? 10 : null, profit_period: 'trimestral', job_rates: {}, has_own_goals: false, goals: [{ key: 'artes', target: 22, actual: 5, pct: 23, weight: 1, origem: 'area' }, { key: 'planos', target: 13, actual: 1, pct: 8, weight: 1, origem: 'area' }], attainment: 15, variable_earned: 0, total_month: 3000, ...extra });
let currentOte = ote(null);
const calls = [];
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return json({});
  const p = u.pathname;
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop(); calls.push([fn, req.postData()]);
    if (fn === 'access_members') return json(MEMBERS);
    if (fn === 'member_ote') return json(currentOte);
    if (fn === 'partner_profit') return json({ start: '2026-07-01', end: '2026-09-30', entradas: 30000, saidas: 18000, resultado: 12000, pct: 10, valor: 1200, launched: false });
    if (fn === 'team_pay_overview') return json(MEMBERS.map((m) => ({ ...currentOte, staff_id: m.id, name: m.name, avatar_path: null, job_title: null, has_pay: !!m.contract, contract: m.contract, pay_schedule: m.pay_schedule })));
    return json(null);
  }
  if (p.startsWith('/rest/v1/')) return json([]);
  if (p.startsWith('/storage/')) return route.fulfill({ status: 404, body: '' });
  return json({});
}
const bodyFits = (p) => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); const b = d && d.querySelector('div.overflow-y-auto'); return b ? { sh: b.scrollHeight, ch: b.clientHeight } : null });
async function check(p, dev, label) {
  const r = await bodyFits(p);
  console.log(JSON.stringify({ dev, label, ...r }));
  if (!r) fails.push(`${dev} ${label}: pop-up não abriu`);
  else if (r.sh > r.ch + 1) fails.push(`${dev} ${label}: pop-up com rolagem (${r.sh} > ${r.ch})`);
  await p.screenshot({ path: `${OUT}/membros-${dev}-${label}.png` });
}
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:5200/equipe/membros'); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/membros-${dev}-lista.png` });
    const text = await p.locator('main').innerText();
    if (!/Contrato: definir/.test(text)) fails.push(`${dev}: lista sem o aviso "Contrato: definir"`);
    if (!/PJ · Quinzenal/.test(text)) fails.push(`${dev}: lista sem o tipo "PJ · Quinzenal"`);
    if (!/sem contrato definido/.test(text)) fails.push(`${dev}: resumo sem "sem contrato definido"`);
    // Membro vindo do sistema antigo: abre, edita e tem Remover.
    await p.getByRole('button', { name: /Almeida/ }).first().click(); await p.waitForTimeout(300);
    const phone = await p.locator('dialog[open] input[inputmode="tel"]').inputValue();
    if (phone !== '(81) 99999-0000') fails.push(`${dev}: telefone sem máscara (${phone})`);
    await check(p, dev, 'dados');
    if (!(await p.locator('dialog[open]').getByRole('button', { name: 'Remover' }).count())) fails.push(`${dev}: sem botão Remover`);
    await p.locator('dialog[open] input[inputmode="tel"]').fill('99999');
    await p.locator('dialog[open]').getByRole('button', { name: /^Salvar/ }).click(); await p.waitForTimeout(200);
    const alert = await p.locator('dialog[open] [role=alert]').innerText().catch(() => '');
    if (!/Telefone com DDD/.test(alert)) fails.push(`${dev}: telefone inválido sem mensagem amigável (${alert})`);
    await p.locator('dialog[open]').getByRole('tab', { name: 'Acesso' }).click(); await p.waitForTimeout(200); await check(p, dev, 'acesso');
    for (const c of [null, 'clt', 'pj', 'freela', 'socio']) {
      currentOte = ote(c, c === 'clt' ? { variable_enabled: true, advance_pct: 40 } : {});
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      await p.getByRole('button', { name: /Almeida/ }).first().click(); await p.waitForTimeout(200);
      await p.locator('dialog[open]').getByRole('tab', { name: 'Pagamento' }).click(); await p.waitForTimeout(500);
      await check(p, dev, 'pagamento-' + (c ?? 'definir'));
      if (c === 'pj' || c === 'clt') { await p.locator('dialog[open]').getByRole('tab', { name: 'Metas da variável' }).click(); await p.waitForTimeout(200); await check(p, dev, 'metas-' + c); }
    }
    // Remover quem tem login: duas perguntas.
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.getByRole('button', { name: /Thyfany/ }).first().click(); await p.waitForTimeout(200);
    await p.locator('dialog[open]').getByRole('button', { name: 'Remover' }).click(); await p.waitForTimeout(200);
    const q1 = await p.locator('dialog[open]').last().innerText();
    if (!/Remover Thyfany Rayane da equipe\?/.test(q1)) fails.push(`${dev}: confirmação de remover errada`);
    await p.getByRole('button', { name: 'Sim, confirmar' }).click(); await p.waitForTimeout(200);
    const q2 = await p.locator('dialog[open]').last().innerText();
    if (!/tem acesso ao sistema: remover o acesso também\?/.test(q2)) fails.push(`${dev}: não perguntou sobre o acesso`);
    await p.getByRole('button', { name: 'Voltar' }).last().click(); await p.waitForTimeout(300);
    const deact = calls.filter(([fn]) => fn === 'member_deactivate').pop();
    if (!deact || !/"_revoke":false/.test(deact[1] || '')) fails.push(`${dev}: remover não chamou member_deactivate mantendo o acesso (${deact && deact[1]})`);
    if (errs.length) fails.push(`${dev}: erro na tela: ${errs[0]}`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHOU:\n' + fails.join('\n')); process.exit(1) }
  console.log('Membros ok.');
})();
