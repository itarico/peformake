// Autoteste da Estratégia interativa (briefing → cards → PDF) com dados FALSOS no navegador (nada vai ao banco nem à IA).
// Mede no iPhone 13 e em 1366x800: faixa no cliente, briefing com medidor, cada pop-up (campo, links, listas, resposta com áudio)
// sem rolagem interna, e a tela sem rolagem de lado. Com cards (fase 2+): abas, contador, card aberto, recusar, refazer, PDF.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 node e2e/estrategia-interativa.cjs
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const C = id(1);
const rows = [{ client_id: C, name: 'Fornario', logo_path: null, segment: 'Pizzaria', document: '29402375000160', instagram: '@fornario', website: null, status: 'aprovado', stage: 'done', redo_section: null, error: null, updated_at: '2026-11-12T10:00:00Z', finished_at: '2026-11-12T10:00:00Z', answers_new: 0, direction: null, monthly: null }];
const month = (() => { const d = new Date(); const m = d.getDate() >= 20 ? d.getMonth() + 1 : d.getMonth(); const y = d.getFullYear() + (m > 11 ? 1 : 0); return `${y}-${String((m % 12) + 1).padStart(2, '0')}` })();
const brief = { produtos: [{ nome: 'Pizza grande Margherita de fermentação natural', preco: 'R$ 59,90', condicoes: 'delivery e salão' }, { nome: 'Combo família', preco: 'R$ 129' }, { nome: 'Calzone' }, { nome: 'Rodízio de terça', preco: 'R$ 49,90' }, { nome: 'Sobremesa' }],
  links: { instagram: 'https://instagram.com/fornario' }, publico: 'Famílias do bairro das Graças e Espinheiro, 25 a 45 anos, que pedem no fim de semana.',
  concorrentes: [{ nome: 'Pizzaria Atlântico' }, { nome: 'Forno Bom', novo: true, porque: 'combo de terça cheio' }],
  referencias: [{ link: 'https://www.instagram.com/reel/abc/', porque: 'Gancho do queijo puxando nos 2 primeiros segundos', novo: true }] };
const Q = (n, status, extra = {}) => ({ id: id(100 + n), client_id: C, area: 'consultoria', pack: 'briefing_mes', focus: month, question: `Em dezembro, pergunta ${n} do briefing do mês com um texto um pouco mais comprido que o normal?`, why: 'Para planejar.', answer: null, status, source: 'briefing', options: ['Não tem', 'Aniversário da empresa', 'Lançamento', 'Promoção', 'Evento na loja'], attachments: [], audio_pending: false, sent_to_portal_at: null, answered_at: null, answered_via: null, created_at: '2026-11-16T10:00:00Z', ...extra });
const questions = [Q(1, 'respondida', { answer: 'Combo família', answered_via: 'cliente', attachments: [{ path: 'equipe/x/a.webm', name: 'a.webm', type: 'audio/webm' }] }), Q(2, 'enviada'), ...[3, 4, 5, 6, 7, 8].map((n) => Q(n, 'pendente'))];
const tables = { client_briefs: { data: brief, updated_at: '2026-11-16T10:00:00Z' }, client_brief_months: { data: { meta: '300 pedidos no mês' } }, client_questions: questions,
  traffic_reports: { period_start: '2026-10-01', period_end: '2026-10-31', summary: 'Outubro: 212 pedidos pelo WhatsApp (+18%). O combo família foi o anúncio que mais trouxe conversa (R$ 3,10 por conversa). Reels do queijo puxando teve 41 mil views.' },
  clients: { phone: '81987122050', description: 'Pizzaria', target_audience: null, value_proposition: 'Forno a lenha', competitors: null, instagram: '@fornario', website: null } };
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname; const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  if (p === '/rest/v1/rpc/consult_list') return json(rows);
  if (p === '/rest/v1/rpc/strategy_board_get') return json(global.BOARD ?? null);
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  const t = p.split('/').pop();
  if (t in tables && req.method() === 'GET') { const v = tables[t]; return json(one ? (Array.isArray(v) ? v[0] ?? null : v) : (Array.isArray(v) ? v : [v])) }
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: req.method() === 'GET' ? 200 : 201, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: one ? 'null' : '[]' });
  if (p.startsWith('/functions/')) return json({ ok: true, results: [{ created: 0 }] });
  if (p.startsWith('/storage/')) return json({ signedURL: '/x.webm' });
  return route.fulfill({ status: 404, headers: h, body: '' });
}
const popup = (p) => p.evaluate(() => {
  const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return null;
  const b = d.querySelector('.overflow-y-auto');
  return { title: d.getAttribute('aria-label'), sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0 };
});
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
const check = async (p, tag, name) => {
  const m = await popup(p);
  if (!m) { fails.push(`${tag}: pop-up ${name} não abriu`); return }
  if (m.sh > m.ch + 1) fails.push(`${tag}: pop-up "${m.title}" rola (${m.sh}/${m.ch})`);
  await p.screenshot({ path: `${OUT}/estrategia-popup-${name}-${tag}.png` });
};
const close = async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(200) };

module.exports = { mock, check, close, sideScroll, fails, C, month, id };
if (require.main === module) (async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ ...opts, colorScheme: scheme }); await ctx.route('**/*', mock);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
      const tag = `${dev}-${scheme}`;
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
      if (!(await p.locator('[data-estrategia-faixa]').count())) fails.push(`${tag}: cliente sem a faixa da estratégia`);
      await p.locator('[data-estrategia-faixa] button').click(); await p.waitForTimeout(700);
      if (!(await p.locator('[data-briefing]').count())) fails.push(`${tag}: faixa não abriu o briefing`);
      const pct = await p.locator('[role=meter]').getAttribute('aria-valuenow').catch(() => null);
      if (!pct || Number(pct) <= 0 || Number(pct) >= 100) fails.push(`${tag}: medidor do briefing estranho (${pct})`);
      if (await sideScroll(p)) fails.push(`${tag}: briefing com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/estrategia-briefing-${tag}.png`, fullPage: true });
      for (const [label, name] of [['Produtos e serviços', 'produtos'], ['Links importantes', 'links'], ['Público', 'texto'], ['Concorrentes', 'concorrentes'], ['Referências', 'referencias'], ['Meta do mês', 'meta'], ['O que funcionou no mês passado', 'funcionou']]) {
        await p.locator('[data-briefing] button', { hasText: label }).first().click(); await p.waitForTimeout(350);
        await check(p, tag, name);
        if (name === 'produtos') { await p.locator('dialog[open]').getByRole('button', { name: 'Adicionar' }).click(); await p.waitForTimeout(200); await check(p, tag, 'produto-novo') }
        await close(p);
      }
      await p.locator('[data-briefing] button', { hasText: 'pergunta 1' }).click(); await p.waitForTimeout(350);
      await check(p, tag, 'resposta');
      if (!(await p.locator('dialog[open]').getByRole('button', { name: /Gravar resposta/ }).count())) fails.push(`${tag}: resposta sem o botão de gravar`);
      if (!(await p.locator('dialog[open] audio').count())) fails.push(`${tag}: resposta com áudio sem o player`);
      await close(p);
      if (errs.length) fails.push(`${tag}: erros na página: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('estrategia-interativa.cjs ok (iPhone 13 e 1366x800, claro e escuro)');
})();
