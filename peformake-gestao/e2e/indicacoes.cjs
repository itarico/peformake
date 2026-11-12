// Autoteste do fim da conversa e das Indicações no portal, com dados FALSOS no navegador (nada vai ao banco).
// Mede no iPhone 13 e em 1366x800 (claro e escuro):
// - fim da conversa com nota 10: tela de obrigado com o logo e o botão "Indicar agora" que leva ao portal em Indicações;
// - fim com nota 7: só o obrigado, sem convite para indicar;
// - portal aberto em /portal#<código>/indicacoes: área Indicações no topo, pop-up "Indicar alguém" sem rolagem, envio e lista.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 node e2e/indicacoes.cjs
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const fails = [];
const TOKEN = 'aB3_-'.repeat(8) + 'xyz';
let nps = 10; let brand = 'peformake'; let sent = [];
const chat = () => ({
  client: 'Will motos', greeting: 'Will', status: 'concluida', stage: 'fim', brand, progress: { done: 4, total: 4 }, transcribe: false, nps: false, options: [],
  closing: { promoter: nps >= 9, portal: nps >= 9 ? `/portal#${TOKEN}/indicacoes` : null },
  messages: [{ from: 'ia', text: 'Pronto! Suas respostas já chegaram para a equipe. Muito obrigado 🙏', at: '', files: [] }],
});
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname;
  if (p === '/functions/v1/client-chat') return json(chat());
  if (p === '/rest/v1/rpc/portal_get') return json({ name: 'Will motos', segment: 'Motos', logo_path: null, services: ['Tráfego', 'Consultoria'], team: [], has_traffic: false });
  if (p === '/rest/v1/rpc/portal_referrals') return json({ brand, items: sent });
  if (p === '/rest/v1/rpc/portal_referral_create') {
    const b = JSON.parse(req.postData() || '{}');
    sent = [{ id: 'r' + sent.length, name: b._data.name, company: b._data.company || null, status: 'novo', status_label: 'Recebida', created_at: '2026-11-12T12:00:00Z' }, ...sent];
    return json('00000000-0000-4000-8000-000000000001');
  }
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: '[]' });
  return json({});
}
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
const popup = (p) => p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) return null; const b = d.querySelector('.overflow-y-auto'); return { title: d.getAttribute('aria-label'), sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0 } });

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ ...opts, colorScheme: scheme }); await ctx.route('**/*', mock);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
      const tag = `${dev}-${scheme}`;
      sent = []; brand = 'peformake';
      // Nota 10: obrigado + convite para indicar.
      nps = 10;
      await p.goto(BASE + '/conversa/' + 'c'.repeat(48), { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      if (!(await p.getByRole('heading', { name: /Obrigado, Will/ }).count())) fails.push(`${tag}: sem a tela de obrigado`);
      if (!(await p.locator('img[alt="Peformake"]').count())) fails.push(`${tag}: sem o logo da Peformake no fim`);
      if (await sideScroll(p)) fails.push(`${tag}: fim da conversa com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/indicacoes-fim-10-${tag}.png` });
      await p.getByRole('button', { name: /Indicar agora/ }).click(); await p.waitForTimeout(700);
      if (!p.url().includes('/portal#' + TOKEN + '/indicacoes')) fails.push(`${tag}: "Indicar agora" não levou ao portal (${p.url()})`);
      const top = await p.evaluate(() => { const s = document.getElementById('indicacoes'); return s ? Math.round(s.getBoundingClientRect().top) : null });
      if (top == null) fails.push(`${tag}: portal sem a área Indicações`);
      else if (top > innerHeightSafe(opts)) fails.push(`${tag}: Indicações fora da primeira tela (top ${top})`);
      if (await sideScroll(p)) fails.push(`${tag}: portal com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/indicacoes-portal-${tag}.png` });
      await p.getByRole('button', { name: 'Indicar alguém' }).click(); await p.waitForTimeout(400);
      const m = await popup(p);
      if (!m) fails.push(`${tag}: pop-up Indicar não abriu`);
      else if (m.sh > m.ch + 1) fails.push(`${tag}: pop-up "${m.title}" rola (${m.sh}/${m.ch})`);
      await p.screenshot({ path: `${OUT}/indicacoes-popup-${tag}.png` });
      await p.getByLabel('Nome').fill('Maria Souza'); await p.getByLabel('WhatsApp com DDD').fill('81 98888-7777');
      await p.getByLabel(/Empresa ou ramo/).fill('Padaria Sol');
      await p.getByRole('button', { name: 'Enviar indicação' }).click(); await p.waitForTimeout(700);
      if (await p.locator('dialog[open]').count()) fails.push(`${tag}: pop-up não fechou depois de enviar`);
      if (!(await p.getByText(/vai falar com Maria/).count())) fails.push(`${tag}: sem a confirmação do envio`);
      if (!(await p.getByText('Recebida').count())) fails.push(`${tag}: lista sem a indicação e a situação`);
      await p.screenshot({ path: `${OUT}/indicacoes-lista-${tag}.png` });
      // Nota 7: só o obrigado.
      nps = 7; brand = 'ellcazo';
      await p.goto(BASE + '/conversa/' + 'd'.repeat(48), { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      if (await p.getByRole('button', { name: /Indicar agora/ }).count()) fails.push(`${tag}: nota 7 mostrou convite para indicar`);
      if (!(await p.getByRole('img', { name: 'Ellcazo' }).count())) fails.push(`${tag}: cliente Ellcazo sem o logo da Ellcazo`);
      await p.screenshot({ path: `${OUT}/indicacoes-fim-7-${tag}.png` });
      if (errs.length) fails.push(`${tag}: erros na página: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('indicacoes.cjs ok (iPhone 13 e 1366x800, claro e escuro)');
})();
function innerHeightSafe(o) { return (o.viewport && o.viewport.height) || 800 }
