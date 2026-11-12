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
  member(4, 'Lucas'), member(5, 'Ingrid Rayane'), member(7, 'Teste Falso', { email: 'teste+peformake@example.com', invited: true, level: 'user', main_role: 'ellcazo' }), member(6, 'Aleffer', { contract: 'freela', pay_schedule: 'mensal' }),
];
const cat = (key, func, title, unit, better, target, extra = {}) => ({ key, func, title, how: 'Como mede ' + key, unit, better, target, param_label: null, param: null, is_default: false, historic: better === 'mais', has_history: false, history: null, value: { done: 18, total: 20, actual: 90 }, ...extra });
const CATALOG = [
  cat('ed_prazo', 'editor', 'Edição entregue em até {n} h', 'pct', 'mais', 80, { param_label: 'horas', param: 24, is_default: true, has_history: true, history: 76 }),
  cat('ed_sem_ajuste', 'editor', 'Vídeos aprovados sem ajuste', 'pct', 'mais', 70, { is_default: true }),
  cat('ed_entregas', 'editor', 'Vídeos editados no mês', 'qtd', 'mais', 4),
  cat('ed_atraso', 'editor', 'Nenhuma edição atrasada', 'qtd', 'menos', 0, { param_label: 'horas', param: 24 }),
  cat('cap_na_data', 'videomaker', 'Gravações feitas na data marcada', 'pct', 'mais', 80, { is_default: true }),
  cat('cap_bruto', 'videomaker', 'Bruto enviado em até {n} h', 'pct', 'mais', 80, { param_label: 'horas', param: 3, is_default: true }),
  cat('cap_pontual', 'videomaker', 'Chegou no horário (até {n} min)', 'pct', 'mais', 80, { param_label: 'min', param: 10 }),
  cat('cap_gravacoes', 'videomaker', 'Gravações no mês', 'qtd', 'mais', 4),
];
const ote = (contract, extra = {}) => ({ month: '2026-11-01', goal_role: 'audiovisual', min_pct: 70, cap_pct: 120, contract, base_salary: 3000, variable_target: 2000, ote: 5000, pay_day: null, unit: 'peformake', notes: null, pay_schedule: 'quinzenal', advance_pct: 50, variable_enabled: contract === 'pj', require_invoice: false, profit_share_pct: contract === 'socio' ? 10 : null, profit_period: 'trimestral', job_rates: {}, has_own_goals: false, functions: ['editor', 'videomaker'], catalog: CATALOG, max_goals: 2, goal_share: 1000, hits: 1, goals: [{ key: 'ed_prazo', target: 80, param: 24, actual: 90, done: 18, total: 20, pct: 113, hit: true, weight: 1, origem: 'funcao', func: 'editor' }, { key: 'ed_sem_ajuste', target: 70, param: null, actual: 50, done: 5, total: 10, pct: 71, hit: false, weight: 1, origem: 'funcao', func: 'editor' }], attainment: 86, variable_earned: 1000, total_month: 4000, ...extra });
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
    if (fn === 'member_pay_config_save') return json(null);
    if (fn === 'member_ote') return json(currentOte);
    if (fn === 'partner_profit') return json({ start: '2026-07-01', end: '2026-09-30', entradas: 30000, saidas: 18000, resultado: 12000, pct: 10, valor: 1200, launched: false });
    if (fn === 'team_pay_overview') return json(MEMBERS.map((m) => ({ ...currentOte, staff_id: m.id, name: m.name, avatar_path: null, job_title: null, has_pay: !!m.contract, contract: m.contract, pay_schedule: m.pay_schedule })));
    return json(null);
  }
  if (p === '/functions/v1/member-access') { calls.push(['member-access', req.postData()]); return json({ ok: true, email: 'teste+peformake@example.com', password: 'Abcd2345Efgh67' }); }
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
    // Selo honesto: só linha de acesso (nenhum e-mail saiu) não diz "Convite enviado".
    if (/Convite enviado/.test(text)) fails.push(`${dev}: lista diz "Convite enviado" sem e-mail enviado`);
    if (!/Acesso liberado · falta entrar/.test(text)) fails.push(`${dev}: lista sem "Acesso liberado · falta entrar"`);
    await p.getByRole('button', { name: /Teste Falso/ }).first().click(); await p.waitForTimeout(300);
    await p.locator('dialog[open]').getByRole('tab', { name: 'Acesso' }).click(); await p.waitForTimeout(200); await check(p, dev, 'acesso-botoes');
    await p.locator('dialog[open]').getByRole('button', { name: /Criar login agora/ }).click(); await p.waitForTimeout(400);
    if (!(await p.getByText('Abcd2345Efgh67').count())) fails.push(`${dev}: senha temporária não apareceu`);
    if (!(await p.getByRole('button', { name: /Copiar mensagem para WhatsApp/ }).count())) fails.push(`${dev}: sem "Copiar mensagem para WhatsApp"`);
    await check(p, dev, 'acesso-senha');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // Membro vindo do sistema antigo: abre, edita e tem Remover.
    await p.getByRole('button', { name: /Almeida/ }).first().click(); await p.waitForTimeout(300);
    const phone = await p.locator('dialog[open] input[inputmode="tel"]').inputValue();
    if (phone !== '(81) 99999-0000') fails.push(`${dev}: telefone sem máscara (${phone})`);
    await check(p, dev, 'dados');
    await p.locator('dialog[open]').getByRole('tab', { name: 'Função' }).click(); await p.waitForTimeout(200); await check(p, dev, 'funcao');
    await p.locator('dialog[open]').getByRole('tab', { name: 'Dados' }).click();
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
      if (c) { await p.locator('dialog[open]').getByRole('tab', { name: '1 Tipo' }).click(); await p.waitForTimeout(200); await check(p, dev, 'tipo-' + c); }
      if (c === 'pj' || c === 'clt') {
        await p.locator('dialog[open]').getByRole('tab', { name: '3 Metas' }).click(); await p.waitForTimeout(200); await check(p, dev, 'metas-' + c);
        const mt = await p.locator('dialog[open]').innerText();
        if (!(await p.locator('dialog[open] [role=tablist][aria-label^="Funções"]').innerText()).match(/Edição[\s\S]*Captação/)) fails.push(`${dev} ${c}: metas sem as funções da pessoa`);
        if (!/Edição entregue em até 24 h/.test(mt) || !/18 de 20 · 90%/.test(mt)) fails.push(`${dev} ${c}: meta de edição sem prazo/realizado`);
        if (!/2 de 2 ligadas/.test(mt)) fails.push(`${dev} ${c}: contador de metas errado`);
        if (/Metas próprias|Metas da área/.test(mt)) fails.push(`${dev} ${c}: ainda mostra Metas da área/próprias`);
        if (!(await p.locator('dialog[open] [role=switch][aria-checked=false]').first().isDisabled())) fails.push(`${dev} ${c}: deixou ligar a 3ª meta`);
        await p.locator('dialog[open]').getByRole('tab', { name: /Captação/ }).click(); await p.waitForTimeout(150); await check(p, dev, 'metas-captacao-' + c);
        await p.locator('dialog[open]').getByRole('tab', { name: '2 Valores' }).click(); await p.waitForTimeout(150); await check(p, dev, 'valores-ote-' + c);
        const vt = await p.locator('dialog[open]').innerText();
        if (!/OTE R\$\s?5\.000 = fixo R\$\s?3\.000 \+ variável R\$\s?2\.000/.test(vt)) fails.push(`${dev} ${c}: divisão 60/40 não aparece (${vt.slice(0, 200)})`);
        await p.locator('dialog[open] input[inputmode=decimal]').first().fill('10000'); await p.waitForTimeout(100);
        if (!/fixo R\$\s?6\.000 \+ variável R\$\s?4\.000/.test(await p.locator('dialog[open]').innerText())) fails.push(`${dev} ${c}: OTE digitado não dividiu`);
        await p.locator('dialog[open]').getByRole('tab', { name: '3 Metas' }).click(); await p.waitForTimeout(150);
        await p.locator('dialog[open]').getByRole('tab', { name: /Edição/ }).click(); await p.waitForTimeout(100);
        await p.locator('dialog[open] [role=switch][aria-checked=true]').first().click(); await p.waitForTimeout(100);
        await p.locator('dialog[open]').getByRole('button', { name: /^Salvar$/ }).click(); await p.waitForTimeout(300);
        const sv = calls.filter(([fn]) => fn === 'member_pay_config_save').pop();
        const body = sv ? JSON.parse(sv[1])._data : null;
        if (!body || body.base_salary !== 6000 || body.variable_target !== 4000 || body.goals.length !== 1 || !body.variable_enabled) fails.push(`${dev} ${c}: salvar mandou errado ${sv && sv[1]}`);
      }
    }
    // Sem função marcada: explica e leva para a aba Função.
    currentOte = ote('pj', { functions: [], catalog: [], goals: [] });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.getByRole('button', { name: /Almeida/ }).first().click(); await p.waitForTimeout(200);
    await p.locator('dialog[open]').getByRole('tab', { name: 'Pagamento' }).click(); await p.waitForTimeout(400);
    await p.locator('dialog[open]').getByRole('tab', { name: '3 Metas' }).click(); await p.waitForTimeout(200); await check(p, dev, 'metas-sem-funcao');
    if (!/não tem função marcada/.test(await p.locator('dialog[open]').innerText())) fails.push(`${dev}: sem aviso de função não marcada`);
    await p.locator('dialog[open]').getByRole('button', { name: 'Marcar funções' }).click(); await p.waitForTimeout(200);
    if (!(await p.locator('dialog[open]').getByRole('tab', { name: 'Função', selected: true }).count())) fails.push(`${dev}: Marcar funções não abriu a aba Função`);
    // Remover quem tem login: duas perguntas.
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.getByRole('button', { name: /Thyfany/ }).first().click(); await p.waitForTimeout(200);
    await p.locator('dialog[open]').getByRole('button', { name: 'Remover' }).click(); await p.waitForTimeout(200);
    if (!(await p.getByText(/Remover Thyfany Rayane da equipe\?/).count())) fails.push(`${dev}: confirmação de remover errada`);
    await p.getByRole('button', { name: 'Sim, confirmar' }).click(); await p.waitForTimeout(200);
    if (!(await p.getByText(/tem acesso ao sistema: remover o acesso também\?/).count())) fails.push(`${dev}: não perguntou sobre o acesso`);
    await p.getByRole('button', { name: 'Voltar' }).click(); await p.waitForTimeout(300);
    const deact = calls.filter(([fn]) => fn === 'member_deactivate').pop();
    if (!deact || !/"_revoke":false/.test(deact[1] || '')) fails.push(`${dev}: remover não chamou member_deactivate mantendo o acesso (${deact && deact[1]})`);
    if (errs.length) fails.push(`${dev}: erro na tela: ${errs[0]}`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHOU:\n' + fails.join('\n')); process.exit(1) }
  console.log('Membros ok.');
})();
