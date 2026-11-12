// Autoteste da guia de revisão do plano do mês (/revisao/plano/:id/:mes), dados no navegador (nada vai ao banco).
// Confere: visões por área, aprovar uma ação na semana, adicionar ação (A), nada corta, resumo e "Aprovar e finalizar".
// Uso: FIXTURE=monthly_get.json PORT=5199 node e2e/revisao-mes.cjs
const { chromium, devices } = require('playwright');
const fs = require('fs');
const BASE = `http://localhost:${process.env.PORT || '5200'}`;
const OUT = process.env.OUT || 'e2e/capturas'; fs.mkdirSync(OUT, { recursive: true });
const st = JSON.parse(fs.readFileSync(process.env.FIXTURE, 'utf8'));
const CID = st.client_id; const MES = String(st.month).slice(0, 7);
const fails = []; let state = {}; const decided = []; const added = [];

async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname; let body = null; try { body = req.postDataJSON() } catch { /* */ }
  if (p === '/rest/v1/rpc/monthly_get') return json(st);
  if (p === '/rest/v1/rpc/review_get') return json({ state, finished_at: null, updated_at: null });
  if (p === '/rest/v1/rpc/review_save') { const sec = { ...(state[body._section] || {}) }; if (body._value === null) delete sec[body._key]; else sec[body._key] = body._value; state = { ...state, [body._section]: sec }; return json(state) }
  if (p === '/rest/v1/rpc/monthly_action_decide') { const a = st.actions.find((x) => x.id === body._id); if (a) { a.status = body._approve ? 'aprovada' : 'recusada'; a.routed_link = body._approve ? '/trafego/tarefas' : null } decided.push(body._id); return json(body._approve ? '/trafego/tarefas' : null) }
  if (p === '/rest/v1/rpc/monthly_action_add') { const id = '00000000-0000-4000-a000-' + String(added.length).padStart(12, '0'); added.push(body); st.actions.push({ id, week: body._week || 1, area: body._area, title: body._title, what: body._what, place: null, owner_role: null, due_date: null, proof: null, why: null, format: null, status: 'proposta', routed_table: null, routed_id: null, routed_link: null, suggestion: null, done: null }); return json(id) }
  if (p === '/rest/v1/rpc/monthly_share_create') return json('y'.repeat(64));
  if (p.startsWith('/rest/v1/rpc/')) return json([]);
  if (p === '/rest/v1/clients') return json({ name: 'Will motos', logo_path: null, phone: '81987122050' });
  if (p.startsWith('/rest/v1/')) return json([]);
  return json({});
}
const popup = (p) => p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) return null; const b = d.querySelector('.overflow-y-auto'); return { title: d.getAttribute('aria-label'), sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0 } });
const cut = (p) => p.evaluate(() => {
  const s = document.querySelector('[data-testid=slide] .slide'); if (!s) return null;
  const box = s.getBoundingClientRect(); const foot = s.querySelector('.foot'); const limit = foot ? foot.getBoundingClientRect().top : box.bottom;
  const clamped = (e) => getComputedStyle(e).webkitLineClamp && getComputedStyle(e).webkitLineClamp !== 'none';
  const bad = [...s.querySelectorAll('.content > *, .cover-mid, .card, .kpi, .content li')].filter((e) => !clamped(e)).find((e) => e.getBoundingClientRect().bottom > limit + 2);
  return bad ? (bad.textContent || '').trim().slice(0, 60) : null;
});

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desktop', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
    await p.goto(`${BASE}/revisao/plano/${CID}/${MES}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const lab = await p.locator('[data-testid=progresso]').innerText().catch(() => '');
    const total = Number((/de (\d+)/.exec(lab) || [])[1] || 0);
    if (!total) fails.push(`${dev}: não abriu (${lab})`);
    for (let k = 0; k < total; k++) {
      const c = await cut(p); if (c) fails.push(`${dev}: slide ${k + 1} corta: "${c}"`);
      await p.screenshot({ path: `${OUT}/mes-${dev}-${String(k + 1).padStart(2, '0')}.png` });
      const ap = p.getByRole('button', { name: /^Aprovar: / });
      if (dev === 'desktop' && !decided.length && await ap.count()) { await ap.first().click(); await p.waitForTimeout(300) }
      if (dev === 'desktop') await p.keyboard.press('ArrowRight'); else await p.getByRole('button', { name: 'OK' }).last().click();
      await p.waitForTimeout(120);
    }
    if (dev === 'desktop') {
      if (!decided.length) fails.push('desktop: não aprovou nenhuma ação');
      await p.keyboard.press('a'); await p.waitForTimeout(200);
      const d = await popup(p); if (!d) fails.push('desktop: A não abriu'); else if (d.sh > d.ch + 1) fails.push(`desktop: pop-up ${d.title} rola`);
      await p.screenshot({ path: `${OUT}/mes-${dev}-adicionar.png` });
      await p.keyboard.type('Promoção com emplacamento grátis'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
      if (!added.length) fails.push('desktop: adicionar ação não chamou o banco');
      // Visão por área
      await p.getByRole('tab', { name: 'Tráfego' }).click(); await p.waitForTimeout(300);
      const lt = await p.locator('[data-testid=progresso]').innerText();
      if (!/de \d+/.test(lt)) fails.push('desktop: visão Tráfego não abriu');
      if (!p.url().includes('area=trafego')) fails.push('desktop: filtro não foi para a URL');
      await p.getByRole('tab', { name: 'Audiovisual' }).click(); await p.waitForTimeout(500);
      const la = await p.locator('[data-testid=progresso]').innerText();
      const nav = Number((/de (\d+)/.exec(la) || [])[1] || 0);
      if (!nav) fails.push('desktop: visão Audiovisual sem slides');
      for (let k = 0; k < Math.min(nav, 6); k++) { await p.screenshot({ path: `${OUT}/mes-av-${k + 1}.png` }); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150) }
      await p.getByRole('tab', { name: 'Tudo' }).click(); await p.waitForTimeout(200);
      await p.getByRole('button', { name: /Slides|\d+ \/ \d+/ }).first().click(); await p.waitForTimeout(150);
      await p.getByRole('button', { name: 'Ir para o resumo' }).click(); await p.waitForTimeout(200);
    }
    if (!(await p.locator('[data-testid=resumo]').count())) fails.push(`${dev}: não chegou ao resumo`);
    await p.screenshot({ path: `${OUT}/mes-${dev}-resumo.png` });
    const before = decided.length;
    await p.getByRole('button', { name: 'Aprovar e finalizar' }).click(); await p.waitForTimeout(1200);
    if (dev === 'desktop' && decided.length <= before) fails.push('desktop: finalizar não aprovou as pendentes');
    const d = await popup(p); if (!d || !/Enviar/.test(d.title)) fails.push(`${dev}: envio não abriu`);
    await p.screenshot({ path: `${OUT}/mes-${dev}-enviar.png` });
    if (errs.length) fails.push(`${dev}: erros: ${errs.join(' | ')}`);
    console.log(`${dev}: ${total} slides, ${decided.length} ações decididas`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.log('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('ok: revisão do plano do mês');
})();
