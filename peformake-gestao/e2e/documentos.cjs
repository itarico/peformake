// Autoteste da lista de documentos (Consultoria → cliente) e da Apresentação (/documento/:id) com dados FALSOS.
// Mede no iPhone 13 e em 1366x800: uma linha por documento, sem rolagem de lado, botões à vista sem quebrar a linha,
// "Apresentação" desabilitada sem .html, e na Apresentação: uma página por vez, ←/→, OK avança, Virar tarefa sem rolagem.
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/documentos.cjs   (código 1 se algo quebrar)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const fails = [];
const C = '00000000-0000-4000-8000-000000000001';
const A = (n) => '00000000-0000-4000-9000-' + String(n).padStart(12, '0');
const asset = (n, folder, name, file, extra = {}) => ({ id: A(n), client_id: C, folder, name, bucket: 'client-files', path: `${C}/${folder}/${file}`, mime: file.endsWith('.html') ? 'text/html' : 'application/pdf', created_at: '2026-11-12T10:00:00Z', approved_at: null, sent_at: null, ...extra });
const assets = [
  asset(1, 'estrategia', 'Estratégia · 12-11 a 31-12-2026.pdf', 'Estrategia-12-11-a-31-12-2026.pdf'),
  asset(2, 'estrategia', 'Estratégia · 12-11 a 31-12-2026.html', 'Estrategia-12-11-a-31-12-2026.html'),
  asset(3, 'social', 'Planejamento de social media · 12-11 a 31-12-2026.pdf', 'Planejamento-de-social-media-12-11-a-31-12-2026.pdf', { sent_at: '2026-11-12T12:00:00Z', approved_at: '2026-11-12T12:00:00Z' }),
  asset(4, 'audiovisual', 'Planejamento de audiovisual · 12-11 a 31-12-2026.pdf', 'Planejamento-de-audiovisual-12-11-a-31-12-2026.pdf'),
  asset(5, 'trafego', 'Estratégia de tráfego · 12-11 a 31-12-2026.pdf', 'Estrategia-de-trafego-12-11-a-31-12-2026.pdf'),
];
const page = (i, t) => `<section class="pg ${i ? 'dense' : 'cover'}" id="p${i + 1}"><div class="tag">Brio · parte ${i + 1}</div><h1>${t}</h1><div class="card"><a href="https://exemplo.com">link</a></div></section>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>:root{--s:1}body{margin:0;font-family:Inter,sans-serif}.pg{width:1333px;height:750px;position:relative;overflow:hidden;background:#F3FAFB;padding:40px 56px;display:flex;flex-direction:column;box-sizing:border-box}h1{font:800 38px/1.1 Inter;color:#0B3C44}.tag{background:#1FC8DB;padding:6px 14px;border-radius:999px;align-self:flex-start}.card{border:2px solid #0B3C44;border-radius:16px;padding:20px;margin-top:20px;height:300px;background:#fff}@media screen{body{height:100vh;overflow:hidden}.pg{display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(var(--s))}.pg.on{display:flex}.nav{position:fixed;bottom:0}}</style></head><body>`
  + ['Entrar no mercado com o combo para dividir', 'Perfil parado desde 29/10', 'Ofertas e vendas', 'Decisões'].map((t, i) => page(i, t)).join('') + `<div class="nav">nav</div><script>document.body.dataset.ran='1'</script></body></html>`;
let reviews = [];
const rows = [{ client_id: C, name: 'Brio Burguer', logo_path: null, segment: 'Hamburgueria', document: '29402375000160', instagram: null, website: null, status: 'pronto', stage: 'done', redo_section: null, error: null, updated_at: '2026-11-11T20:00:00Z', finished_at: '2026-11-11T20:00:00Z', suggestions: 0, can_generate: true, direction: null }];

async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname; const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  if (p === '/rest/v1/rpc/consult_list') return json(rows);
  if (p === '/rest/v1/rpc/production_clients') return json([{ id: C, name: 'Brio Burguer', is_active: true, areas: ['trafego', 'social', 'audiovisual', 'consultoria'], recurring: true }]);
  if (p === '/rest/v1/rpc/agent_doc_page_task') { const b = JSON.parse(req.postData() || '{}'); reviews.push({ page_index: b._page, state: 'tarefa', task_link: '/trafego/tarefas?tarefa=x' }); return json('/trafego/tarefas?tarefa=x') }
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  if (p === '/rest/v1/agent_doc_reviews') {
    if (req.method() === 'POST') { const b = JSON.parse(req.postData() || '{}'); reviews = reviews.filter((r) => r.page_index !== b.page_index).concat([{ page_index: b.page_index, state: b.state, task_link: null }]); return route.fulfill({ status: 201, headers: h, body: '' }) }
    return json(reviews);
  }
  if (p === '/rest/v1/client_assets') {
    const id = u.searchParams.get('id'); const path = u.searchParams.get('path');
    if (id) return json(one ? (assets.find((a) => 'eq.' + a.id === id) ?? null) : assets.filter((a) => 'eq.' + a.id === id));
    if (path) return json(one ? (assets.find((a) => 'eq.' + a.path === path) ?? null) : assets.filter((a) => 'eq.' + a.path === path));
    return json(assets);
  }
  if (p === '/rest/v1/clients') return json(one ? { name: 'Brio Burguer', phone: '81987122050' } : [{ name: 'Brio Burguer', phone: '81987122050' }]);
  if (p === '/rest/v1/consult_docs') return json(one ? null : []);
  if (p.startsWith('/storage/v1/object/sign/') && req.method() === 'POST') return json({ signedURL: '/object/sign/x.html?token=t' });
  if (p.startsWith('/storage/v1/object/sign') || p.includes('x.html')) return route.fulfill({ status: 200, contentType: 'text/html', headers: h, body: html });
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: one ? 'null' : '[]' });
  return route.fulfill({ status: 404, headers: h, body: '' });
}
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
const popup = (p) => p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) return null; const b = d.querySelector('.overflow-y-auto'); return { sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0 } });

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    reviews = [];
    const ctx = await b.newContext({ ...opts }); await ctx.route('**/*', mock);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
    await p.goto(BASE + `/estrategia/consultoria?cliente=${C}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const ids = await p.$$eval('[data-lista-docs] [data-doc]', (l) => l.map((e) => e.getAttribute('data-doc')));
    if (ids.join() !== 'diagnostico,estrategia,trafego,social,audiovisual') fails.push(`${dev}: linhas ${ids.join()}`);
    if (await sideScroll(p)) fails.push(`${dev}: lista com rolagem de lado`);
    const hs = await p.$$eval('[data-lista-docs] [data-doc]', (l) => l.map((e) => Math.round(e.getBoundingClientRect().height)));
    if (Math.max(...hs) > 70) fails.push(`${dev}: linha alta demais (${hs})`);
    if (await p.locator('[data-doc=social] [data-acao=aprovar]').count()) fails.push(`${dev}: enviado ainda com Aprovar e enviar`);
    if (!(await p.locator('[data-doc=estrategia] a[data-acao=apresentacao]').count())) fails.push(`${dev}: estratégia sem link de Apresentação`);
    if (!(await p.locator('[data-doc=audiovisual] button[data-acao=apresentacao][aria-disabled=true]').count())) fails.push(`${dev}: audiovisual sem .html deveria ter Apresentação desabilitada`);
    await p.locator('[data-doc=audiovisual] [data-acao=apresentacao]').dispatchEvent('click'); await p.waitForTimeout(200);
    if (!(await p.locator('[data-doc=audiovisual]', { hasText: 'próxima versão' }).count())) fails.push(`${dev}: dica "próxima versão" não apareceu`);
    if (!(await p.locator('[data-perguntas]').count())) fails.push(`${dev}: faixa Perguntas sumiu`);
    await p.screenshot({ path: `${OUT}/documentos-lista-${dev}.png`, fullPage: true });

    await p.locator('[data-doc=estrategia] a[data-acao=apresentacao]').click(); await p.waitForTimeout(1500);
    if (!p.url().includes('/documento/' + A(1))) fails.push(`${dev}: Apresentação não abriu (${p.url()})`);
    const f = p.frameLocator('iframe');
    const vis = async () => p.evaluate(() => { const d = document.querySelector('iframe')?.contentDocument; return d ? [...d.querySelectorAll('section.pg')].filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.id) : null });
    let v = await vis(); if (JSON.stringify(v) !== '["p1"]') fails.push(`${dev}: página visível ${JSON.stringify(v)}`);
    const ran = await p.evaluate(() => document.querySelector('iframe')?.contentDocument?.body?.dataset.ran);
    if (ran) fails.push(`${dev}: script do documento rodou`);
    const fit = await p.evaluate(() => { const fr = document.querySelector('iframe'); const s = fr.contentDocument.querySelector('section.pg.pf-on').getBoundingClientRect(); return s.width <= fr.clientWidth + 1 && s.height <= fr.clientHeight + 1 });
    if (!fit) fails.push(`${dev}: página não cabe no espaço`);
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
    v = await vis(); if (JSON.stringify(v) !== '["p2"]') fails.push(`${dev}: → não avançou (${JSON.stringify(v)})`);
    await p.locator('[data-revisar=ok]').click(); await p.waitForTimeout(600);
    v = await vis(); if (JSON.stringify(v) !== '["p3"]') fails.push(`${dev}: OK não avançou (${JSON.stringify(v)})`);
    if (!(await p.locator('[data-progresso]', { hasText: '1 de 4' }).count())) fails.push(`${dev}: progresso não mostra 1 de 4`);
    await p.locator('[data-revisar=tarefa]').click(); await p.waitForTimeout(400);
    const val = await p.locator('dialog[open] input').inputValue();
    if (val !== 'Ofertas e vendas') fails.push(`${dev}: título da tarefa "${val}"`);
    const pp = await popup(p); if (pp && pp.sh > pp.ch + 1) fails.push(`${dev}: Virar tarefa com rolagem (${pp.sh}>${pp.ch})`);
    await p.screenshot({ path: `${OUT}/documentos-tarefa-${dev}.png` });
    await p.locator('dialog[open]').getByRole('button', { name: 'Criar tarefa' }).click(); await p.waitForTimeout(800);
    if (!(await p.locator('[data-progresso]', { hasText: '2 de 4' }).count())) fails.push(`${dev}: progresso depois da tarefa`);
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
    if (!(await p.getByRole('link', { name: /Virou tarefa/ }).count())) fails.push(`${dev}: página com tarefa sem "Virou tarefa · abrir"`);
    if (await sideScroll(p)) fails.push(`${dev}: apresentação com rolagem de lado`);
    await p.keyboard.press('?'); await p.waitForTimeout(300);
    const hp = await popup(p); if (!hp) fails.push(`${dev}: "?" não abriu a ajuda`); else if (hp.sh > hp.ch + 1) fails.push(`${dev}: ajuda com rolagem`);
    await p.keyboard.press('Escape');
    await p.screenshot({ path: `${OUT}/documentos-apresentacao-${dev}.png` });
    if (errs.length) fails.push(`${dev}: erros ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.log('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('documentos: tudo certo');
})();
