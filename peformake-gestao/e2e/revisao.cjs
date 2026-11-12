// Autoteste da guia de revisão (/revisao/diagnostico/:id) com dados no navegador (nada vai ao banco).
// Confere: atalhos (Enter, setas, R, E, D, A, ?, Esc), progresso, nada corta no slide (computador e iPhone 13),
// pop-ups sem rolagem interna, resumo e "Aprovar e finalizar" abrindo o envio (sem mandar nada).
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &
//      FIXTURE=doc.json PORT=5199 node e2e/revisao.cjs     (doc.json: { doc, name?, questions? }; código 1 se algo quebrar)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const BASE = `http://localhost:${process.env.PORT || '5200'}`;
const OUT = process.env.OUT || 'e2e/capturas'; fs.mkdirSync(OUT, { recursive: true });
const fx = JSON.parse(fs.readFileSync(process.env.FIXTURE, 'utf8'));
const CID = '00000000-0000-4000-8000-000000000001';
const fails = [];
let state = {}; let finalized = 0;
const questions = (fx.questions || []).map((q, i) => ({ id: '00000000-0000-4000-9000-' + String(i).padStart(12, '0'), client_id: CID, area: 'consultoria', pack: null, focus: null, question: q.question, why: q.why, answer: q.answer, status: q.status || 'pendente', source: 'x', options: [], attachments: [], audio_pending: false, sent_to_portal_at: null, answered_at: null, answered_via: null, created_at: '2026-11-11T00:00:00Z' }));
const docRow = { client_id: CID, status: 'pronto', stage: 'done', redo_section: null, error: null, doc: fx.doc, finished_at: '2026-11-11T20:00:00Z', approved_at: null, sent_at: null, cost_usd: 1, done_at: null };

async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname; const body = req.postDataJSON ? (() => { try { return req.postDataJSON() } catch { return null } })() : null;
  if (p === '/rest/v1/rpc/review_get') return json({ state, finished_at: null, updated_at: null });
  if (p === '/rest/v1/rpc/review_save') {
    const sec = { ...(state[body._section] || {}) }; if (body._value === null) delete sec[body._key]; else sec[body._key] = body._value; state = { ...state, [body._section]: sec }; return json(state);
  }
  if (p === '/rest/v1/rpc/consult_review_finalize') { finalized++; return json({ tasks: Object.values(state.steps || {}).filter((v) => v === 'ok').length, filled: 0 }) }
  if (p === '/rest/v1/rpc/consult_share_create') return json('x'.repeat(64));
  if (p.startsWith('/rest/v1/rpc/')) return json([]);
  if (p === '/rest/v1/consult_docs') return json(docRow);
  if (p === '/rest/v1/clients') return json({ name: fx.name || 'Will motos', logo_path: null, phone: '81987122050' });
  if (p === '/rest/v1/client_questions') return json(questions);
  if (p.startsWith('/rest/v1/')) return json([]);
  if (p.startsWith('/functions/')) return json({ ok: true });
  return route.fulfill({ status: 404, headers: h, body: '' });
}
const popup = (p) => p.evaluate(() => {
  const d = document.querySelector('dialog[open]'); if (!d) return null;
  const b = d.querySelector('.overflow-y-auto');
  return { title: d.getAttribute('aria-label'), sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0 };
});
const cut = (p) => p.evaluate(() => {
  const s = document.querySelector('[data-testid=slide] .slide'); if (!s) return 'sem slide';
  const box = s.getBoundingClientRect(); const foot = s.querySelector('.foot'); const limit = foot ? foot.getBoundingClientRect().top : box.bottom;
  const clamped = (e) => getComputedStyle(e).webkitLineClamp && getComputedStyle(e).webkitLineClamp !== 'none';
  const boxes = [...s.querySelectorAll('.content > *, .cover-mid, .card, .sw, .kpi, .journey li, .content li')].filter((e) => !clamped(e));
  const bad = boxes.find((e) => e.getBoundingClientRect().bottom > limit + 2 || e.getBoundingClientRect().right > box.right + 2);
  return bad ? (bad.textContent || '').trim().slice(0, 60) : null;
});
const label = (p) => p.locator('[data-testid=progresso]').first().innerText();
const checkPopup = async (p, tag, what) => { const d = await popup(p); if (!d) fails.push(`${tag}: ${what} não abriu`); else if (d.sh > d.ch + 1) fails.push(`${tag}: pop-up "${d.title}" rola (${d.sh} > ${d.ch})`) };

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desktop', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    state = {}; finalized = 0;
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
    await p.goto(`${BASE}/revisao/diagnostico/${CID}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const first = await label(p).catch(() => '');
    if (!/^0 de \d+ revisados/.test(first)) fails.push(`${dev}: progresso inicial "${first}"`);
    const total = Number((/de (\d+)/.exec(first) || [])[1] || 0);
    if (await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)) fails.push(`${dev}: rolagem para o lado`);
    await p.screenshot({ path: `${OUT}/revisao-${dev}-capa.png` });

    // Atalhos (no celular, os mesmos botões: testa o teclado só no computador)
    if (dev === 'desktop') {
      await p.keyboard.press('Enter'); await p.waitForTimeout(150);
      if (!/^1 de/.test(await label(p))) fails.push(`${dev}: Enter não aprovou o slide`);
      await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
      await p.keyboard.press('r'); await p.waitForTimeout(150); await checkPopup(p, dev, 'R (recusar)');
      await p.keyboard.type('número errado'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
      if (!/^2 de/.test(await label(p))) fails.push(`${dev}: Recusar não contou`);
      if (!JSON.stringify(state.slides || {}).includes('número errado')) fails.push(`${dev}: motivo da recusa não salvou`);
      await p.keyboard.press('e'); await p.waitForTimeout(150); await checkPopup(p, dev, 'E (editar)');
      await p.screenshot({ path: `${OUT}/revisao-${dev}-editar.png` });
      await p.keyboard.press('Escape'); await p.waitForTimeout(150);
      if (await popup(p)) fails.push(`${dev}: Esc não fechou`);
      await p.keyboard.press('d'); await p.waitForTimeout(150); await checkPopup(p, dev, 'D (detalhes)'); await p.keyboard.press('Escape');
      await p.keyboard.press('?'); await p.waitForTimeout(150); await checkPopup(p, dev, '? (atalhos)'); await p.keyboard.press('Escape');
      await p.keyboard.press('a'); await p.waitForTimeout(150); await checkPopup(p, dev, 'A (adicionar)');
      await p.screenshot({ path: `${OUT}/revisao-${dev}-adicionar.png` });
      await p.keyboard.type('Promoção com emplacamento grátis'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
      if (!Object.keys(state.adds || {}).length) fails.push(`${dev}: Adicionar não salvou`);
    }
    // Todos os slides: nada corta; pop-ups dos painéis sem rolagem
    for (let k = 0; k < total + 1; k++) {
      const c = await cut(p);
      if (c && c !== 'sem slide') fails.push(`${dev}: slide ${k + 1} corta: "${c}"`);
      if (k < total) await p.screenshot({ path: `${OUT}/revisao-${dev}-${String(k + 1).padStart(2, '0')}.png` });
      const fillBtn = p.getByRole('button', { name: /^Preencher/ });
      if (k < total && await fillBtn.count()) {
        await fillBtn.first().click(); await p.waitForTimeout(150); await checkPopup(p, `${dev} slide ${k + 1}`, 'Preencher');
        if (dev === 'desktop' && !state.fills) { await p.getByRole('button', { name: 'Está certo assim' }).click(); await p.waitForTimeout(200) }
        await p.keyboard.press('Escape'); await p.waitForTimeout(100);
      }
      const step = p.getByRole('button', { name: /^Aprovar: / });
      if (dev === 'desktop' && await step.count() && !state.steps) { await step.first().click(); await p.waitForTimeout(150) }
      if (dev === 'desktop') await p.keyboard.press('ArrowRight');
      else await p.getByRole('button', { name: 'OK' }).last().click().catch(() => {});
      await p.waitForTimeout(120);
    }
    if (!(await p.locator('[data-testid=resumo]').count())) fails.push(`${dev}: não chegou ao resumo`);
    await p.screenshot({ path: `${OUT}/revisao-${dev}-resumo.png`, fullPage: dev === 'iphone' });
    if (dev === 'desktop' && !state.fills) fails.push(`${dev}: preencher dado não salvou`);
    await p.getByRole('button', { name: 'Aprovar e finalizar' }).click(); await p.waitForTimeout(500);
    if (!finalized) fails.push(`${dev}: finalizar não chamou o banco`);
    await checkPopup(p, dev, 'Enviar ao cliente');
    const wa = await p.locator('dialog[open] a[href^="https://wa.me/"]').count();
    if (!wa) fails.push(`${dev}: envio sem o botão do WhatsApp`);
    await p.screenshot({ path: `${OUT}/revisao-${dev}-enviar.png` });
    if (errs.length) fails.push(`${dev}: erros na página: ${errs.join(' | ')}`);
    console.log(`${dev}: ${total} slides, progresso final "${await label(p).catch(() => '?')}"`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.log('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('ok: guia de revisão');
})();
