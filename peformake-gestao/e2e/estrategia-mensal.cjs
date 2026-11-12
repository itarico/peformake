// Autoteste da Estratégia do mês (Consultoria → cliente → Estratégia) com dados FALSOS no navegador (nada vai ao banco nem à IA).
// Mede no iPhone 13 e em 1366x800 (claro e escuro): as 4 semanas à vista, os pop-ups (ação, roteiro em páginas, troca sugerida,
// editar, refazer com ideias, PDF) sem rolagem interna, a aba Relatórios, os slides, e nada de rolagem de lado.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 node e2e/estrategia-mensal.cjs
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const now = new Date(); const pad = (n) => String(n).padStart(2, '0');
const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
const row = { client_id: id(1), name: 'Will motos', logo_path: null, segment: 'Automotivo', document: '29402375000160', instagram: null, website: null, status: 'aprovado', stage: 'done', redo_section: null, error: null, updated_at: '2026-11-11T20:00:00Z', finished_at: '2026-11-11T20:00:00Z', suggestions: 0, can_generate: true, direction: null, questions_open: 0, answers_new: 0, monthly: { month, status: 'pronto', finished_at: '2026-11-12T02:42:00Z', pending: 30, suggestions: 1 } };
const roteiro = Array.from({ length: 14 }, (_, i) => `Cena ${i + 1}: o vendedor mostra a moto CG 160 2022 no pátio, fala do ano, do km e chama para o WhatsApp da loja com a frase "manda a foto da sua moto".`).join('\n');
const areas = ['trafego', 'social', 'design', 'audiovisual', 'vendas', 'atendimento'];
const actions = [];
let n = 0;
for (let w = 1; w <= 4; w++) for (let k = 0; k < (w === 1 ? 11 : 8); k++) {
  const area = areas[k % areas.length];
  actions.push({ id: id(100 + ++n), week: w, area, title: k % 3 ? `Subir a campanha fixa Compramos sua moto ${n}` : `Gravar vídeo Compramos sua moto com CG e XRE e chamar quem quer vender ${n}`, what: area === 'audiovisual' ? roteiro : 'Objetivo: fazer o dono de CG chamar a loja. Texto da arte: "Compramos sua moto hoje". Legenda pronta: Quer vender sua moto? Manda a foto no WhatsApp.', place: 'Meta Ads e Instagram', owner_role: 'gestor de tráfego', due_date: `${month.slice(0, 8)}${pad((w - 1) * 7 + 2)}`, proof: '5 motos compradas na semana e conversas contadas pelo print de segunda', why: 'O relatório mostra 0 conversas em 3.996 cliques: sem contar não dá para decidir a verba.', format: 'anuncio', status: k === 1 ? 'aprovada' : k === 2 ? 'recusada' : 'proposta', routed_table: k === 1 ? 'content_items' : null, routed_id: null, routed_link: k === 1 ? '/conteudo/peca/' + id(9) : null, suggestion: n === 3 ? { titulo: 'Trocar por anúncio de XRE', o_que: roteiro.slice(0, 900), porque: 'A CG saiu do estoque na semana passada.' } : null, done: k === 1 && w === 1 });
}
const strategy = { id: id(50), client_id: id(1), month, status: 'pronto', stage: 'done', error: null, ideas: null, cost_usd: 1.43, adjusted_at: '2026-11-10T11:41:00Z', adjust: { semana: 2, mudou: true, resumo: 'A CG saiu do estoque; sugerimos trocar 1 ação.', trocas: 1 }, finished_at: '2026-11-12T02:42:00Z', approved_at: null, updated_at: '2026-11-12T02:42:00Z',
  doc: { titulo: 'Dezembro com moto no pátio e cada conversa contada', situacao: 'Os anúncios trouxeram 3.996 cliques e o sistema marca zero conversas.', foco: 'Comprar 5 motos por semana.', meta: { texto: 'Comprar 5 motos por semana', numero: '20 motos compradas', como_medir: 'Print das conversas toda segunda.' },
    leitura: [{ fato: 'Os anúncios trouxeram 3.996 cliques e zero conversas registradas', numero: '3.996 cliques', decisao: 'Ligar a contagem de conversas na semana 1' }, { fato: 'Nota 4,3 no Google com 199 avaliações', numero: '4,3 ★', decisao: 'Usar a nota nas artes' }, { fato: 'O anúncio de compra custa metade do de venda', numero: 'R$ 4,10', decisao: 'Manter a campanha fixa de compra' }, { fato: 'Stories com enquete tiveram o dobro de respostas', numero: '2x', decisao: 'Stories diários pedindo motos' }],
    metas_area: [{ area: 'trafego', meta: 'Custo por conversa de compra', numero: 'até R$ 6' }, { area: 'social', meta: 'Respostas nos stories', numero: '40 no mês' }, { area: 'audiovisual', meta: 'Vídeos publicados', numero: '6 vídeos' }],
    semanas: [1, 2, 3, 4].map((w) => ({ semana: w, tema: ['Compramos sua moto', 'Vitrine com preço, ano e km', 'Prova real: quem comprou', 'Vire o ano de moto'][w - 1], objetivo: 'Encher o pátio e contar as conversas.', datas: w === 4 ? ['Natal', 'Réveillon'] : [] })),
    ofertas: [{ nome: 'Avaliação na hora', condicao: 'Manda a foto e recebe a proposta no mesmo dia', porque: 'Tira a desculpa do "depois eu vejo".' }],
    riscos: [{ risco: 'Faltar moto para anunciar', plano_b: 'Anunciar compra em dobro' }], perguntas: ['Quantas motos você consegue comprar por semana?', 'Vai abrir no dia 24?'] },
  actions };
const reports = [{ id: id(700), kind: 'weekly', period_start: '2026-11-03', period_end: '2026-11-09', summary: 'Investimento de R$ 420 com 3.996 cliques. '.repeat(30), path: 'x/y.pdf', sent_at: '2026-11-10T10:00:00Z', created_at: '2026-11-10T10:00:00Z' }, { id: id(701), kind: 'monthly', period_start: '2026-10-01', period_end: '2026-10-31', summary: 'Outubro fechou com 12 motos compradas.', path: null, sent_at: null, created_at: '2026-11-01T10:00:00Z' }];

async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname; const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  if (p === '/rest/v1/rpc/consult_list') return json([row]);
  if (p === '/rest/v1/rpc/monthly_get') return json(strategy);
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  if (p === '/rest/v1/traffic_reports') return json(reports);
  if (p === '/rest/v1/clients') return json(one ? { phone: '81987122050' } : [{ phone: '81987122050' }]);
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: one ? 'null' : '[]' });
  if (p.startsWith('/functions/')) return json({ ok: true });
  return route.fulfill({ status: 404, headers: h, body: '' });
}

const popup = (p) => p.evaluate(() => {
  const d = document.querySelector('dialog[open]'); if (!d) return null;
  const b = d.querySelector('.overflow-y-auto');
  return { title: d.getAttribute('aria-label'), sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0 };
});
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
const check = async (p, tag, name) => {
  const m = await popup(p);
  if (!m) { fails.push(`${tag}: pop-up ${name} não abriu`); return }
  if (m.sh > m.ch + 1) fails.push(`${tag}: pop-up "${name}" rola (${m.sh}/${m.ch})`);
  await p.screenshot({ path: `${OUT}/mensal-popup-${name}-${tag}.png` });
};
const close = async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(200) };

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ ...opts, colorScheme: scheme }); await ctx.route('**/*', mock);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
      const tag = `${dev}-${scheme}`;
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${id(1)}&aba=estrategia&mes=${month.slice(0, 7)}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
      if (!(await p.getByRole('tab', { name: /Estratégia/, selected: true }).count())) fails.push(`${tag}: aba Estratégia não abriu pelo link`);
      const weeks = await p.locator('section[aria-label^="Semana "]').count();
      if (weeks !== 4) fails.push(`${tag}: ${weeks} semanas à vista (esperado 4)`);
      if (await sideScroll(p)) fails.push(`${tag}: estratégia com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/mensal-semanas-${tag}.png`, fullPage: true });

      // Ação com roteiro longo: resumo, roteiro em páginas, troca sugerida.
      const av = p.locator('section[aria-label="Semana 1"] li button').nth(3);
      await av.click(); await p.waitForTimeout(300); await check(p, tag, 'acao-resumo');
      await p.getByRole('tab', { name: 'Roteiro' }).click(); await p.waitForTimeout(200); await check(p, tag, 'acao-roteiro');
      if (!(await p.getByRole('button', { name: /Continua/ }).count())) fails.push(`${tag}: roteiro longo sem páginas`);
      await p.getByRole('button', { name: 'Editar' }).click(); await p.waitForTimeout(250); await check(p, tag, 'editar');
      await p.getByRole('tab', { name: 'Texto' }).click(); await p.waitForTimeout(200); await check(p, tag, 'editar-texto');
      await close(p); await close(p);
      await p.locator('section[aria-label="Semana 1"] li button').nth(2).click(); await p.waitForTimeout(300); await check(p, tag, 'troca');
      await close(p);
      await p.getByRole('button', { name: /Refazer com ideias/ }).click(); await p.waitForTimeout(250); await check(p, tag, 'ideias'); await close(p);
      await p.getByRole('button', { name: /^PDF$/ }).click(); await p.waitForTimeout(250); await check(p, tag, 'pdf'); await close(p);

      // Esta semana e slides.
      await p.getByRole('tab', { name: /Esta semana|Semana 1/ }).click(); await p.waitForTimeout(300);
      if ((await p.locator('section[aria-label^="Semana "]').count()) !== 1) fails.push(`${tag}: "Esta semana" não mostra só uma semana`);
      await p.getByRole('tab', { name: 'Slides' }).click(); await p.waitForTimeout(600);
      const cut = await p.evaluate(() => [...document.querySelectorAll('.pfd .slide')].some((s) => /…/.test(s.textContent || '')));
      if (cut) fails.push(`${tag}: slide com frase cortada por "…"`);
      if (await sideScroll(p)) fails.push(`${tag}: slides com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/mensal-slides-${tag}.png` });
      for (let i = 0; i < 12; i++) { const nx = p.getByRole('button', { name: 'Próximo slide' }); if (await nx.isDisabled()) break; await nx.click(); await p.waitForTimeout(120) }
      await p.screenshot({ path: `${OUT}/mensal-slides-fim-${tag}.png` });

      // Relatórios do cliente dentro da Consultoria.
      await p.getByRole('tab', { name: 'Relatórios' }).click(); await p.waitForTimeout(500);
      if (!(await p.getByText('03/11 a 09/11').count())) fails.push(`${tag}: relatório semanal não aparece na aba Relatórios`);
      await p.getByText('03/11 a 09/11').click(); await p.waitForTimeout(250); await check(p, tag, 'relatorio'); await close(p);
      if (await sideScroll(p)) fails.push(`${tag}: relatórios com rolagem de lado`);
      if (errs.length) fails.push(`${tag}: erros na página: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('estrategia-mensal.cjs ok (iPhone 13 e 1366x800, claro e escuro)');
})();
