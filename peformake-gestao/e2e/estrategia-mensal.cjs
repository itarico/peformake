// Autoteste da Estratégia do mês (Consultoria → cliente → Estratégia) com dados FALSOS no navegador (nada vai ao banco nem à IA).
// Mede no iPhone 13 e em 1366x800 (claro e escuro): cabeçalho com UM botão principal (Revisar em slides → /revisao/plano/...),
// as seções como filtro, os pop-ups (ação, texto em páginas, editar, refazer com ideias, baixar, enviar ao cliente) sem rolagem interna,
// a aba Relatórios, as telas Tráfego e Audiovisual com o link da revisão já na área, e nada de rolagem de lado.
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
  if (p === '/rest/v1/rpc/monthly_area_board') return json([{ client_id: id(1), name: 'Will motos', logo_path: null, strategy_id: id(50), status: 'pronto', finished_at: null, pending: 8, approved: 1, total: 9 }]);
  if (p === '/rest/v1/rpc/monthly_share_create') return json('a'.repeat(64));
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

const menu = async (p, label, item) => { await p.getByRole('button', { name: label }).click(); await p.waitForTimeout(150); await p.getByRole('menuitem', { name: item }).click(); await p.waitForTimeout(400) };

(async () => {
  const b = await chromium.launch();
  const mes = month.slice(0, 7);
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ ...opts, colorScheme: scheme }); await ctx.route('**/*', mock);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
      const tag = `${dev}-${scheme}`;
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${id(1)}&aba=estrategia&mes=${mes}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
      if (!(await p.getByRole('tab', { name: /Plano/, selected: true }).count())) fails.push(`${tag}: aba Plano do mês não abriu pelo link`);
      // UM botão principal: "Revisar em slides" no cabeçalho, abrindo a guia do plano em aba nova.
      const rev = p.locator('[data-cliente-cabecalho] [data-revisar-slides]');
      if ((await rev.count()) !== 1) fails.push(`${tag}: cabeçalho sem Revisar em slides`);
      else if ((await rev.getAttribute('href')) !== `/revisao/plano/${id(1)}/${mes}` || (await rev.getAttribute('target')) !== '_blank') fails.push(`${tag}: Revisar em slides não abre /revisao/plano/... em aba nova`);
      const strong = await p.evaluate(() => [...document.querySelectorAll('main .bg-brand')].filter((e) => e.offsetParent).length);
      if (strong > 1) fails.push(`${tag}: ${strong} botões principais na tela (meta 1)`);
      if (!(await p.getByRole('button', { name: /Aprovar (S|semana )\d/ }).count())) fails.push(`${tag}: sem Aprovar semana`);
      // Seções por área como filtro.
      const secs = await p.getByRole('tablist', { name: 'Seções do plano' }).getByRole('tab').count();
      if (secs < 3) fails.push(`${tag}: ${secs} seções no filtro`);
      if (await sideScroll(p)) fails.push(`${tag}: plano com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/mensal-plano-${tag}.png`, fullPage: true });

      // Uma ação do tráfego: resumo, texto em páginas, editar.
      await p.getByRole('tab', { name: /^Tráfego/ }).click(); await p.waitForTimeout(300);
      await p.locator('section[aria-label="Ações"] li button').first().click(); await p.waitForTimeout(300); await check(p, tag, 'acao-resumo');
      await p.getByRole('tab', { name: 'O que fazer' }).click(); await p.waitForTimeout(200); await check(p, tag, 'acao-texto');
      await p.getByRole('button', { name: 'Editar' }).click(); await p.waitForTimeout(250); await check(p, tag, 'editar');
      await p.getByRole('tab', { name: 'Texto' }).click(); await p.waitForTimeout(200); await check(p, tag, 'editar-texto');
      await close(p); await close(p);
      await menu(p, 'Mais opções do plano', /Refazer com ideias/); await check(p, tag, 'ideias'); await close(p);
      await menu(p, 'Mais opções do plano', /Baixar a apresentação/); await check(p, tag, 'baixar'); await close(p);
      await menu(p, 'Mais opções do plano', /Enviar ao cliente/); await p.waitForTimeout(300); await check(p, tag, 'enviar'); await close(p);

      // Relatórios do cliente dentro da Consultoria.
      await p.getByRole('tab', { name: 'Relatórios' }).click(); await p.waitForTimeout(500);
      if (!(await p.getByText('03/11 a 09/11').count())) fails.push(`${tag}: relatório semanal não aparece na aba Relatórios`);
      await p.getByText('03/11 a 09/11').click(); await p.waitForTimeout(250); await check(p, tag, 'relatorio'); await close(p);
      if (await sideScroll(p)) fails.push(`${tag}: relatórios com rolagem de lado`);

      // Tráfego, Social media e Audiovisual: o mesmo plano só com a parte da área, e a revisão em slides já filtrada.
      for (const [path, area] of [[`/estrategia/trafego?cliente=${id(1)}&mes=${mes}`, 'trafego'], [`/estrategia/social?cliente=${id(1)}&mes=${mes}`, 'social'], [`/audiovisual/plano-do-mes?cliente=${id(1)}&mes=${mes}`, 'audiovisual']]) {
        await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
        const l = p.locator('[data-revisar-slides]');
        if ((await l.count()) !== 1) { fails.push(`${tag}: ${area} sem Revisar em slides`); continue }
        if ((await l.getAttribute('href')) !== `/revisao/plano/${id(1)}/${mes}?area=${area}`) fails.push(`${tag}: ${area}: link da revisão sem a área (${await l.getAttribute('href')})`);
        if (await sideScroll(p)) fails.push(`${tag}: ${area} com rolagem de lado`);
        await p.screenshot({ path: `${OUT}/mensal-${area}-${tag}.png` });
      }
      if (errs.length) fails.push(`${tag}: erros na página: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('estrategia-mensal.cjs ok (iPhone 13 e 1366x800, claro e escuro)');
})();
