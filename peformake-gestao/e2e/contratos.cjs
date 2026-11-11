// Autoteste de Dados das empresas e do contrato do membro com dados FALSOS no navegador (nada vai ao banco nem à Assinafy).
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/contratos.cjs
// Regras: cada etapa dos pop-ups cabe SEM rolar (iPhone 13 e 1366x800); falta de dado da empresa mostra link direto;
// o envio do contrato do membro pede confirmação com nome e e-mail e só então chama contract-sign (simulado).
const { chromium, devices } = require('playwright');
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true }); const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const MEMBERS = [{ id: id(2), name: 'Almeida Teste', job_title: 'Editor', main_role: 'social_media', email: null, phone: null, skills: [], avatar_path: null, active: true, profile_id: null, login_active: false, is_master: false, roles: [], area_admin: [], invited: false, level: 'none', contract: 'pj', pay_schedule: 'mensal' }];
const ote = { month: '2026-11-01', goal_role: 'conteudo', min_pct: 70, cap_pct: 120, contract: 'pj', base_salary: 3000, variable_target: 500, ote: 3500, pay_day: null, unit: 'peformake', notes: null, pay_schedule: 'mensal', advance_pct: null, variable_enabled: false, require_invoice: false, profit_share_pct: null, profit_period: 'mensal', job_rates: {}, has_own_goals: false, goals: [], attainment: null, variable_earned: 0, total_month: 3000 };
const PROFILES = [
  { unit: 'peformake', legal_name: 'EMPRESA TESTE LTDA', trade_name: 'Peformake', document: '11222333000181', address: 'Rua Teste, 1, Recife/PE', representative_name: 'Fulano Teste', representative_document: '52998224725', email: null, phone: null, cnpj_card_path: null, social_contract_path: null },
  { unit: 'ellcazo', legal_name: null, trade_name: 'Ellcazo', document: null, address: null, representative_name: null, representative_document: null, email: null, phone: null, cnpj_card_path: null, social_contract_path: null },
];
const BODY = 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS (PESSOA JURÍDICA)\nEditor\n\nCLÁUSULA 1ª — DO OBJETO\n1.1. ' + 'Texto de teste do contrato. '.repeat(20);
let info = { email: null, document: null, address: null, contract: 'pj', unit: 'peformake', missing: [], usage: 3, enabled: true, last: null };
const calls = [];
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return json({});
  const p = u.pathname;
  if (p.startsWith('/functions/v1/')) { calls.push([p.split('/').pop(), req.postData()]); return json({ ok: true }); }
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop(); calls.push([fn, req.postData()]);
    if (fn === 'access_members') return json(MEMBERS);
    if (fn === 'member_ote') return json(ote);
    if (fn === 'staff_contract_info') return json(info);
    if (fn === 'staff_contract_create') return json(id(900));
    return json(null);
  }
  if (p === '/rest/v1/company_profiles') return json(PROFILES);
  if (p === '/rest/v1/staff_contract_docs') return json({ id: id(900), title: 'Membro PJ (prestação de serviços) · Almeida Teste', body: BODY });
  if (p.startsWith('/rest/v1/')) return json([]);
  if (p.startsWith('/storage/')) return json({ Key: 'x' });
  return json({});
}
const bodyFits = (p) => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); const b = d && d.querySelector('div.overflow-y-auto'); return b ? { sh: b.scrollHeight, ch: b.clientHeight } : null });
async function check(p, dev, label) {
  const r = await bodyFits(p);
  console.log(JSON.stringify({ dev, label, ...r }));
  if (!r) fails.push(`${dev} ${label}: pop-up não abriu`);
  else if (r.sh > r.ch + 1) fails.push(`${dev} ${label}: pop-up com rolagem (${r.sh} > ${r.ch})`);
  await p.screenshot({ path: `${OUT}/contratos-${dev}-${label}.png` });
}
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    // Dados das empresas.
    await p.goto('http://localhost:5200/configuracoes/empresas'); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/contratos-${dev}-empresas.png` });
    if (!/Completo/.test(await p.locator('main').innerText())) fails.push(`${dev}: Peformake completa não aparece como completa`);
    await p.getByRole('tab', { name: 'Ellcazo' }).click(); await p.waitForTimeout(300);
    if (!/Falta: razão social/.test(await p.locator('main').innerText())) fails.push(`${dev}: Ellcazo vazia sem aviso do que falta`);
    await p.goto('http://localhost:5200/configuracoes/empresas?empresa=ellcazo&editar=1'); await p.waitForTimeout(700);
    await check(p, dev, 'empresa-1');
    const d = p.locator('dialog[open]');
    await d.locator('input').nth(0).fill('11.222.333/0001-81'); await d.locator('input').nth(1).fill('ELLCAZO TESTE LTDA'); await d.locator('input').nth(3).fill('Rua das Flores, 100, Recife/PE');
    await d.getByRole('button', { name: 'Salvar e continuar' }).click(); await p.waitForTimeout(400);
    await check(p, dev, 'empresa-2');
    await d.locator('input').nth(0).fill('Fulana Teste'); await d.locator('input').nth(1).fill('529.982.247-25');
    await d.getByRole('button', { name: 'Salvar e continuar' }).click(); await p.waitForTimeout(400);
    await check(p, dev, 'empresa-3');
    const saves = calls.filter(([fn]) => fn === 'company_profile_save');
    if (saves.length < 2 || !/ellcazo/.test(saves[0][1])) fails.push(`${dev}: não salvou a Ellcazo por etapa`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);

    // Contrato do membro: link direto do aviso abre a ficha no contrato.
    await p.goto('http://localhost:5200/equipe/membros?membro=' + id(2) + '&aba=contrato'); await p.waitForTimeout(900);
    await check(p, dev, 'membro-contrato');
    if (!/3 de 10/.test(await p.locator('dialog[open]').innerText())) fails.push(`${dev}: sem o contador da Assinafy`);
    await p.locator('dialog[open]').getByRole('button', { name: 'Enviar contrato para assinar' }).click(); await p.waitForTimeout(300);
    await check(p, dev, 'envio-1');
    await p.locator('dialog[open]').getByRole('button', { name: 'Continuar' }).click(); await p.waitForTimeout(200);
    await check(p, dev, 'envio-2');
    const s = p.locator('dialog[open]');
    await s.locator('input[type=email]').fill('almeida@exemplo.com'); await s.locator('input[inputmode=numeric]').fill('529.982.247-25');
    await s.getByRole('button', { name: 'Ver como fica' }).click(); await p.waitForTimeout(400);
    await check(p, dev, 'envio-3');
    await p.locator('dialog[open]').getByRole('button', { name: 'Ver prévia' }).click(); await p.waitForTimeout(300);
    if (!/Texto de teste do contrato/.test(await p.locator('dialog[open]').last().innerText())) fails.push(`${dev}: prévia sem o texto`);
    await p.locator('dialog[open]').last().getByText('Fechar', { exact: true }).click(); await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/contratos-${dev}-apos-previa.png` }); await p.getByRole('button', { name: 'Enviar para assinar', exact: true }).click(); await p.waitForTimeout(300);
    if (!(await p.getByText(/Enviar para assinatura de Almeida Teste \(almeida@exemplo\.com\)\?/).count())) fails.push(`${dev}: confirmação sem nome e e-mail`);
    if (calls.some(([fn]) => fn === 'contract-sign')) fails.push(`${dev}: enviou antes de confirmar`);
    await p.getByRole('button', { name: 'Sim, confirmar' }).click(); await p.waitForTimeout(400);
    const sent = calls.filter(([fn]) => fn === 'contract-sign').pop();
    if (!sent || !sent[1].includes(id(900))) fails.push(`${dev}: não montou o pedido de envio com o contrato certo`);
    // Empresa incompleta: aviso com link direto.
    info = { ...info, unit: 'ellcazo', missing: ['razão social', 'CNPJ'] };
    await p.goto('http://localhost:5200/equipe/membros?membro=' + id(2) + '&aba=contrato'); await p.waitForTimeout(900);
    await p.locator('dialog[open]').getByRole('button', { name: 'Enviar contrato para assinar' }).click(); await p.waitForTimeout(300);
    const link = p.locator('dialog[open]').last().getByRole('link', { name: 'Completar agora' });
    if (!(await link.count()) || !/empresa=ellcazo&editar=1/.test(await link.getAttribute('href'))) fails.push(`${dev}: falta o link "Complete os dados da Ellcazo"`);
    info = { ...info, unit: 'peformake', missing: [] }; calls.length = 0;
    if (errs.length) fails.push(`${dev}: erro na tela: ${errs[0]}`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHOU:\n' + fails.join('\n')); process.exit(1) }
  console.log('Contratos ok.');
})();
