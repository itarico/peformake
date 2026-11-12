// Autoteste da Bete "4 por vez" com dados FALSOS no navegador (nada vai ao banco).
// 22 coisas pedindo atenção (1 fatura, 20 avisos, novidades do Instagram): abre mostrando só 4, a fatura primeiro;
// "Pronto, manda as próximas 4" traz o lote seguinte; ✓ nas 4 faz a Bete perguntar "Quer ver mais?";
// novidade do Instagram tem "Virar tarefa" (chama social_news_set). Mede iPhone 13 e 1366x800, sem rolagem de lado.
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/bete.cjs   (código 1 se algo quebrar)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const now = Date.now();
const notifs = Array.from({ length: 20 }, (_, i) => ({ id: id(100 + i), kind: `kind_${i}`, title: `Aviso comum ${i + 1}`, body: null, link: '/notificacoes', read_at: null, created_at: new Date(now - (i + 1) * 60_000).toISOString() }));
const news = [{ id: id(300), network: 'instagram', title: 'Reels com até 3 minutos', summary: 'O Instagram passou a recomendar Reels longos.', what_to_do: 'Testar um Reels de 2 minutos por cliente.', impact: 'medio', source_url: null, published_at: null, status: 'nova', created_at: new Date(now).toISOString() }];
const coach = { overdue: [{ id: id(1), name: 'Will motos', amount: 1500 }] };
let rpcs = []; let state = new Map();

async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname; const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  if (p === '/rest/v1/rpc/goals_coach') return json(coach);
  if (p.startsWith('/rest/v1/rpc/')) { rpcs.push(p.slice(13)); return json(null) }
  if (p === '/rest/v1/notifications') return json(notifs);
  if (p === '/rest/v1/social_news') return json(news);
  if (p === '/rest/v1/bete_item_state') { if (req.method() === 'POST') { const b = JSON.parse(req.postData() || '{}'); for (const r of [].concat(b)) state.set(r.item_id, r); return json([]) } return json([...state.values()]) }
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: one ? 'null' : '[]' });
  if (p.startsWith('/functions/')) return json({ ok: true });
  return route.fulfill({ status: 404, headers: h, body: '' });
}

const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
const cards = (p) => p.locator('section[role=dialog] li').count();
// Espera a Bete terminar de "digitar": os botões de resposta aparecem no rodapé do chat.
const waitIdle = async (p) => { await p.waitForTimeout(400); for (let i = 0; i < 60; i++) { if (await p.locator('section[role=dialog] > div:last-child button').count()) break; await p.waitForTimeout(250) } await p.waitForTimeout(300) };

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    const ctx = await b.newContext({ ...opts }); await ctx.route('**/*', mock);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
    rpcs = []; state = new Map();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    // Início: "Precisa de você" com no máximo 4 linhas.
    const home = await p.locator('section[aria-label="Precisa de você"] li').count();
    if (home > 5) fails.push(`${dev}: "Precisa de você" com ${home} linhas (máximo 4 + cadastro)`);
    await p.getByRole('button', { name: /Bete: .* Abrir/ }).click();
    await waitIdle(p);
    const n1 = await cards(p);
    if (n1 !== 4) fails.push(`${dev}: Bete abriu com ${n1} itens (esperado 4)`);
    const first = await p.locator('section[role=dialog] li').first().innerText().catch(() => '');
    if (!/Will motos: fatura/.test(first)) fails.push(`${dev}: primeiro item não é a fatura (${first.slice(0, 60)})`);
    if (!(await p.getByRole('button', { name: /de 2\d · Ver tudo/ }).count())) fails.push(`${dev}: sem o "Ver tudo" discreto`);
    if (await sideScroll(p)) fails.push(`${dev}: rolagem de lado com a Bete aberta`);
    await p.screenshot({ path: `${OUT}/bete-lote1-${dev}.png` });
    await p.getByRole('button', { name: /Pronto, manda as próximas 4/ }).click();
    await waitIdle(p);
    const n2 = await cards(p);
    if (n2 !== 8) fails.push(`${dev}: depois de "próximas 4" há ${n2} itens no chat (esperado 4 + 4)`);
    // Resolve o 2º lote com ✓: a Bete pergunta "Quer ver mais?".
    for (let i = 0; i < 4; i++) { await p.locator('section[role=dialog] li').last().getByRole('button', { name: 'Feito' }).click(); await p.waitForTimeout(150) }
    await waitIdle(p);
    if (!(await p.getByText(/Quer ver mais\?/).count())) fails.push(`${dev}: resolveu o lote e a Bete não perguntou "Quer ver mais?"`);
    await p.screenshot({ path: `${OUT}/bete-quer-mais-${dev}.png` });
    // Vai até a novidade do Instagram (última por prioridade) e vira tarefa.
    await p.getByRole('button', { name: /Ver tudo/ }).first().click();
    await waitIdle(p);
    const ig = p.locator('section[role=dialog] li').filter({ hasText: 'Novidade do Instagram' }).last();
    if (!(await ig.count())) fails.push(`${dev}: novidade do Instagram não apareceu na Bete`);
    else { await ig.getByRole('button', { name: 'Virar tarefa' }).click(); await p.waitForTimeout(600); if (!rpcs.includes('social_news_set')) fails.push(`${dev}: "Virar tarefa" não chamou social_news_set`) }
    if (await sideScroll(p)) fails.push(`${dev}: rolagem de lado no fim`);
    await p.screenshot({ path: `${OUT}/bete-tudo-${dev}.png` });
    if (errs.length) fails.push(`${dev}: erros na página: ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('bete.cjs ok (iPhone 13 e 1366x800)');
})();
