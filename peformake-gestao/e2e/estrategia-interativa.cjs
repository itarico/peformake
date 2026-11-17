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
  if (p === '/rest/v1/rpc/report_month') return json({ month: '2026-11-01', today: '2026-11-17', send_enabled: false, rows: [
    { client_id: C, name: 'Fornario', has_phone: true, whatsapp_enabled: false, has_traffic_service: true, reports: [
      { id: id(901), kind: 'weekly', period_start: '2026-11-09', period_end: '2026-11-16', path: 'x.pdf', sent_at: '2026-11-16T14:26:25Z', send_error: null, by_agent: true, created_at: '2026-11-16T12:00:00Z', spend_cents: 45000, results: 31 },
      { id: id(902), kind: 'weekly', period_start: '2026-11-02', period_end: '2026-11-08', path: 'y.pdf', sent_at: null, send_error: null, by_agent: false, created_at: '2026-11-09T12:00:00Z', spend_cents: 38000, results: 22 }] },
    { client_id: id(77), name: 'Will motos', has_phone: true, whatsapp_enabled: true, has_traffic_service: true, reports: [] }] });
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


const long = (n) => 'Texto de exemplo com bastante conteúdo para medir o pop-up sem rolagem. '.repeat(n);
const mk = (i, tab, kind, title, data, extra = {}) => ({ id: id(500 + i), board_id: id(400), tab, kind, position: i, title, data, funnel: ['atrair', 'provar', 'objecao', 'converter'][i % 4], serves: 'Combo família R$ 129', goal: '300 pedidos', inspired: { link: 'https://www.instagram.com/reel/DfpgOksBZs5/', numero: '41 mil views' }, assumed: i % 3 ? null : 'Preço do combo não confirmado', status: i % 5 === 0 ? 'aprovado' : 'proposta', reject_reason: null, in_pdf: true, regen_count: 0, is_new: false, updated_at: '2026-11-16T10:00:00Z', redo_pedido: null, redo_requested_at: null, ...extra });
const cards = [
  mk(0, 'resumo', 'tese', 'Dezembro é o mês da família na mesa do Fornario', { texto: long(3) }),
  mk(1, 'resumo', 'objetivo', '300 pedidos no WhatsApp', { numero: '300 pedidos', como_medir: 'Contagem das conversas com pedido fechado' }),
  mk(2, 'resumo', 'oferta', 'Combo família', { condicao: 'Pizza grande + refri 2L por R$ 129', quando: 'até 24/12', porque: long(2) }),
  mk(3, 'resumo', 'data', 'Natal', { dia: '24/12', uso: 'Encomendas até 22/12' }),
  mk(4, 'resumo', 'decisao', 'Não abrir rodízio no Natal', { porque: long(2) }),
  mk(5, 'audiovisual', 'video', 'POV: você chega com fome e a pizza sai do forno', { formato: 'POV', ganchos: [long(1), long(1), long(1)], roteiro: Array.from({ length: 8 }, (_, k) => ({ cena: 'Close no forno a lenha, câmera na mão ' + k, fala: long(2) })), outras_ideias: [long(1), long(1), long(1)], referencia: { link: 'https://youtu.be/abcdefghijk', porque: 'gancho visual' }, cruzamento: long(1), filmar: long(2) }),
  mk(6, 'audiovisual', 'video', 'Mito x verdade da massa de fermentação natural', { formato: 'mito x verdade', ganchos: ['a', 'b', 'c'], roteiro: [{ cena: 'x', fala: 'y' }], outras_ideias: ['1', '2', '3'], referencia: { link: '', porque: '' }, cruzamento: '', filmar: '' }),
  mk(7, 'social', 'peca', 'Carrossel: 5 pizzas para o Natal', { formato: 'carrossel', ideia: long(1), slides: Array.from({ length: 8 }, () => long(1)), copy: long(3), legenda: long(6), cta: 'Peça no WhatsApp', ideia_imagem: long(2), referencia_visual: { link: 'https://pinterest.com/x', porque: 'paleta' }, data_sugerida: '05/12' }),
  mk(8, 'trafego', 'campanha', 'Mensagens: Combo família', { campanha: 'x', objetivo: 'Mensagens', publico: long(2), criativo: long(1), verba_opcoes: [{ valor_dia: 'R$ 30/dia', o_que_esperar: long(1) }, { valor_dia: 'R$ 50/dia', o_que_esperar: long(1) }, { valor_dia: 'R$ 80/dia', o_que_esperar: long(1) }], teste_ab: { a: long(1), b: long(1), como_decidir: long(1) } }),
  mk(9, 'atendimento', 'roteiro', 'Roteiro do Combo família', { oferta: 'Combo', roteiro_whatsapp: Array.from({ length: 5 }, () => long(2)), objecoes: Array.from({ length: 3 }, () => ({ objecao: 'Tá caro', resposta: long(2) })), follow_up: Array.from({ length: 3 }, () => ({ quando: 'No dia seguinte', mensagem: long(1) })) }),
  mk(10, 'referencias', 'concorrente', 'Forno Bom', { link: 'https://instagram.com/fornobom', porque: 'combo de terça' }, { is_new: true }),
  mk(11, 'referencias', 'referencia', 'Gancho do queijo puxando', { link: 'https://youtu.be/abcdefghijk', porque: 'Gancho do queijo', numero: '1,2 mi', thumb: '' }),
];
global.BOARD = { id: id(400), client_id: C, month: `${month}-01`, status: 'pronto', step: 'fim', stage: null, error: null, cost_usd: 0, missing: [], engine: 'agente', finished_at: '2026-11-16T10:00:00Z', approved_at: null, pdf_asset_id: null, cards };

module.exports = { mock, check, close, sideScroll, fails, C, month, id };
if (require.main === module) (async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ ...opts, colorScheme: scheme }); await ctx.route('**/*', mock);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
      const tag = `${dev}-${scheme}`;
      await p.goto(`${BASE}/estrategia/consultoria`, { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
      if (!(await p.locator('[data-passo]').count())) fails.push(`${tag}: lista sem o passo da estratégia`);
      if (await sideScroll(p)) fails.push(`${tag}: lista com rolagem de lado`);
      if (!(await p.locator('[data-etapas-mini]').count())) fails.push(`${tag}: lista sem as etapas do cliente`);
      if (!(await p.locator('[data-resumo]').count())) fails.push(`${tag}: lista sem o resumo do cliente`);
      if (await p.getByRole('link', { name: 'Biblioteca' }).count()) fails.push(`${tag}: Biblioteca ainda aparece`);
      if (!(await p.getByRole('link', { name: 'Relatórios' }).count())) fails.push(`${tag}: sem a aba Relatórios na Estratégia`);
      await p.screenshot({ path: `${OUT}/estrategia-lista-${tag}.png` });
      // Relatórios em Tráfego: o mês em cartões (Semana 1, 2, 3… + Mensal).
      await p.goto(`${BASE}/estrategia/relatorios`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      if ((await p.locator('[data-cliente-rel]').count()) !== 2) fails.push(`${tag}: Relatórios do mês sem os clientes`);
      const chips = await p.locator('[data-cliente-rel]').first().locator('[data-slot]').evaluateAll((els) => els.map((e) => e.getAttribute('data-slot')));
      if (chips.length !== 5) fails.push(`${tag}: cartões do mês: ${chips.length} (esperado 4 semanas + mensal)`);
      if (await sideScroll(p)) fails.push(`${tag}: Relatórios com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/relatorios-mes-${tag}.png` });
      await p.locator('[data-slot="sent"]').first().click(); await p.waitForTimeout(300);
      if (!(await p.locator('[data-relatorio]').count())) fails.push(`${tag}: cartão do relatório não abriu`);
      await check(p, tag, 'relatorio'); await close(p);
      await p.getByRole('button', { name: /Configurações/ }).click(); await p.waitForTimeout(300); await check(p, tag, 'relatorio-config'); await close(p);
      await p.goto(`${BASE}/estrategia/relatorios?cliente=${C}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
      if (!p.url().includes('/estrategia/relatorios?cliente=')) fails.push(`${tag}: /estrategia/relatorios perdeu o cliente`);
      if ((await p.locator('[data-cliente-rel]').count()) !== 1) fails.push(`${tag}: Relatórios com ?cliente não filtrou o cliente`);
      await p.goto(`${BASE}/trafego/relatorios`, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
      if (!p.url().includes('/estrategia/relatorios')) fails.push(`${tag}: /trafego/relatorios não foi para Estratégia → Relatórios`);
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}&aba=relatorios`, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
      if (!p.url().includes('/estrategia/relatorios?cliente=')) fails.push(`${tag}: link antigo ?aba=relatorios não foi para Estratégia → Relatórios`);
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
      if (!(await p.locator('[data-estrategia-faixa]').count())) fails.push(`${tag}: cliente sem a faixa da estratégia`);
      await p.screenshot({ path: `${OUT}/estrategia-cliente-${tag}.png` });
      await p.locator('[data-linha="briefing"] button').click(); await p.waitForTimeout(700);
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
      // Produtos: importar de arquivo (CSV aqui; PDF, Excel e Word passam pelo mesmo leitor).
      await p.locator('[data-briefing] button', { hasText: 'Produtos e serviços' }).first().click(); await p.waitForTimeout(300);
      await p.locator('dialog[open]').getByRole('button', { name: /Importar/ }).click(); await p.waitForTimeout(200);
      if (!(await p.locator('[data-importar-modo="menu"]').count())) fails.push(`${tag}: Importar não abriu as 3 opções`);
      await check(p, tag, 'importar-menu');
      await p.locator('[data-importar]').setInputFiles({ name: 'cardapio.csv', mimeType: 'text/csv', buffer: Buffer.from('Produto;Preço;Obs\nPizza grande;59,90;\nCalzone;42;só delivery\nRefri 2L;12,00;\nPizza doce;49,9;\nBorda recheada;8;\nCombo família;129;até 24/12\n') });
      await p.waitForTimeout(600);
      const note = await p.locator('dialog[open] [role=status]').textContent().catch(() => '');
      if (!/Encontrei 6/.test(note || '')) fails.push(`${tag}: importar produtos não leu o arquivo (${note})`);
      await check(p, tag, 'produtos-importados');
      // Colar a lista de uma vez.
      await p.locator('dialog[open]').getByRole('button', { name: /Importar/ }).click(); await p.waitForTimeout(150);
      await p.locator('dialog[open]').getByRole('button', { name: /Colar a lista/ }).click(); await p.waitForTimeout(150);
      await p.locator('dialog[open] textarea[aria-label="Lista de produtos"]').fill('Esfiha de carne — R$ 6,50\nEsfiha de queijo — R$ 6,00\nKibe 4,90');
      await check(p, tag, 'importar-colar');
      await p.locator('dialog[open]').getByRole('button', { name: 'Ler a lista' }).click(); await p.waitForTimeout(300);
      const note2 = await p.locator('dialog[open] [role=status]').first().textContent().catch(() => '');
      if (!/Encontrei 3/.test(note2 || '')) fails.push(`${tag}: colar a lista não leu (${note2})`);
      await close(p);
      // Links: cola o link e o sistema dá o nome.
      await p.locator('[data-briefing] button', { hasText: 'Links importantes' }).first().click(); await p.waitForTimeout(300);
      const before = await p.locator('[data-link]').count();
      await p.locator('dialog[open] input[aria-label=Link]').fill('https://maps.app.goo.gl/xyz');
      if ((await p.locator('dialog[open] input[aria-label="Nome do link"]').first().inputValue()) !== 'Google Maps') fails.push(`${tag}: link do Maps não foi reconhecido`);
      await p.locator('dialog[open]').getByRole('button', { name: 'Adicionar' }).click(); await p.waitForTimeout(200);
      if ((await p.locator('[data-link]').count()) <= before && before < 3) fails.push(`${tag}: link não entrou na lista`);
      await check(p, tag, 'links-lista'); await close(p);
      // Perguntas respondidas: dá para editar a resposta (vem preenchida).
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}&ver=perguntas`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      if (!(await p.locator('[data-respondida]').count())) fails.push(`${tag}: perguntas sem as respondidas`);
      else {
        await p.locator('[data-respondida]').first().getByRole('button', { name: 'Editar resposta' }).click(); await p.waitForTimeout(300);
        if ((await p.locator('dialog[open] textarea').inputValue().catch(() => '')) !== 'Combo família') fails.push(`${tag}: editar resposta não veio preenchido`);
        await check(p, tag, 'editar-resposta'); await close(p);
      }
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      await p.locator('[data-linha="briefing"] button').click(); await p.waitForTimeout(700);
      // Completar em passos: só o que falta, um por vez, Pular passa para o próximo.
      await p.locator('[data-completar]').click(); await p.waitForTimeout(300);
      const t1 = await p.locator('dialog[open]').getAttribute('aria-label');
      if (!(await p.locator('dialog[open] [data-passos]').count())) fails.push(`${tag}: passos sem o rodapé Salvar e seguir / Pular`);
      await check(p, tag, 'passo-1');
      await p.locator('dialog[open]').getByRole('button', { name: 'Pular' }).click(); await p.waitForTimeout(300);
      const t2 = await p.locator('dialog[open]').getAttribute('aria-label');
      if (!t2 || t2 === t1) fails.push(`${tag}: Pular não foi para o próximo passo (${t1} → ${t2})`);
      await check(p, tag, 'passo-2'); await close(p);
      if (await p.locator('dialog[open]').count()) fails.push(`${tag}: fechar não saiu dos passos`);
      // Concorrentes: colar o link e "Não tem concorrente".
      await p.locator('[data-briefing] button', { hasText: 'Concorrentes' }).first().click(); await p.waitForTimeout(300);
      if (!(await p.locator('[data-sem-concorrente]').count())) fails.push(`${tag}: concorrentes sem "Não tem concorrente"`);
      await p.locator('dialog[open] input[aria-label="Cole o link do concorrente"]').fill('instagram.com/forno.bom');
      await p.locator('dialog[open] input[aria-label="Cole o link do concorrente"]').press('Enter'); await p.waitForTimeout(200);
      if (!(await p.locator('dialog[open]').getByText('@forno.bom').count())) fails.push(`${tag}: concorrente pelo link não entrou`);
      await check(p, tag, 'concorrentes-rapido'); await close(p);
      // Público: quiz com opções e "Outro".
      await p.locator('[data-briefing] button', { hasText: 'Público' }).first().click(); await p.waitForTimeout(300);
      await p.locator('dialog[open]').getByRole('button', { name: 'Responder com opções' }).click(); await p.waitForTimeout(200);
      if (!(await p.locator('[data-quiz]').count())) fails.push(`${tag}: quiz não abriu`);
      await check(p, tag, 'quiz');
      await p.locator('dialog[open]').getByRole('button', { name: 'Mulheres' }).click();
      await p.locator('dialog[open]').getByRole('button', { name: 'Próxima' }).click(); await p.waitForTimeout(150);
      await p.locator('dialog[open]').getByRole('button', { name: 'Outro' }).click();
      await p.locator('dialog[open] input[aria-label="Outra resposta"]').fill('31 a 40');
      for (let k = 0; k < 6; k++) { const bt = p.locator('dialog[open]').getByRole('button', { name: /^(Próxima|Pular|Usar respostas)$/ }); const t = await bt.textContent(); await bt.click(); await p.waitForTimeout(120); if (t === 'Usar respostas') break }
      const txt = await p.locator('dialog[open] textarea').inputValue().catch(() => '');
      if (!/Mulheres/.test(txt) || !/31 a 40/.test(txt)) fails.push(`${tag}: quiz não virou texto (${txt.slice(0, 80)})`);
      await close(p);
      await p.locator('[data-briefing] button', { hasText: 'pergunta 1' }).click(); await p.waitForTimeout(350);
      await check(p, tag, 'resposta');
      if (!(await p.locator('dialog[open]').getByRole('button', { name: /Gravar resposta/ }).count())) fails.push(`${tag}: resposta sem o botão de gravar`);
      if (!(await p.locator('dialog[open]').getByRole('button', { name: /Foto ou arquivo/ }).count())) fails.push(`${tag}: resposta sem anexar foto ou arquivo`);
      await p.locator('dialog[open] [data-anexar]').setInputFiles({ name: 'cardapio.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([255, 216, 255]) }); await p.waitForTimeout(150);
      if (!(await p.locator('dialog[open]').getByText('cardapio.jpg').count())) fails.push(`${tag}: anexo não apareceu na resposta`);
      if (!(await p.locator('dialog[open] audio').count())) fails.push(`${tag}: resposta com áudio sem o player`);
      await close(p);
      // Cards: cada aba, contador, card aberto em cada parte (sem rolar), recusar, refazer e PDF.
      for (const t of ['resumo', 'audiovisual', 'social', 'trafego', 'atendimento', 'referencias']) {
        await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}&parte=${t}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
        if (!(await p.locator(`[data-aba-cards="${t}"]`).count())) { fails.push(`${tag}: aba ${t} sem cards`); continue }
        if (!(await p.locator('[data-contador]').count())) fails.push(`${tag}: aba ${t} sem o contador de aprovados`);
        if (t === 'social') {
          await p.getByRole('button', { name: 'Mais ideias' }).click(); await p.waitForTimeout(250);
          if (!(await p.locator('[data-mais-ideias]').count())) fails.push(`${tag}: Mais ideias não abriu`);
          await check(p, tag, 'mais-ideias'); await close(p);
        }
        if (await sideScroll(p)) fails.push(`${tag}: aba ${t} com rolagem de lado`);
        await p.screenshot({ path: `${OUT}/estrategia-aba-${t}-${tag}.png`, fullPage: true });
        const rows = await p.locator('[data-aba-cards] li button').count();
        for (let r = 0; r < Math.min(rows, t === 'resumo' ? 5 : 2); r++) {
          await p.locator('[data-aba-cards] li button').nth(r).click(); await p.waitForTimeout(300);
          const parts = p.locator('dialog[open] [role=tablist] [role=tab]');
          const np = await parts.count();
          if (!np) await check(p, tag, `${t}-${r}`);
          for (let k = 0; k < np; k++) { await parts.nth(k).click(); await p.waitForTimeout(150); await check(p, tag, `${t}-${r}-parte${k}`) }
          if (r === 0 && t === 'audiovisual') {
            await p.locator('dialog[open]').getByRole('button', { name: 'Recusar' }).click(); await p.waitForTimeout(150); await check(p, tag, 'recusar');
            await p.locator('dialog[open]').getByRole('button', { name: 'Voltar' }).click(); await p.waitForTimeout(150);
            await p.locator('dialog[open] footer').getByRole('button', { name: /Refazer/ }).click(); await p.waitForTimeout(150); await check(p, tag, 'refazer');
            if (!(await p.locator('dialog[open]').getByRole('button', { name: 'Outro gancho' }).count())) fails.push(`${tag}: refazer sem os atalhos de pedido`);
            await p.locator('dialog[open]').getByRole('button', { name: 'Colar card refeito' }).click(); await p.waitForTimeout(150); await check(p, tag, 'refazer-colar');
          }
          await close(p);
        }
      }
      // Revisão um por um: moldura do formato, texto ao lado, barra de ações sempre visível.
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}&parte=resumo&revisar=todos`, { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
      if (!(await p.locator('[data-revisao]').count())) fails.push(`${tag}: modo revisão não abriu`);
      for (let k = 0; k < 10; k++) {
        if (!(await p.locator('[data-mockup]').count())) break;
        if (await sideScroll(p)) fails.push(`${tag}: revisão ${k + 1} com rolagem de lado`);
        const ft = await p.evaluate(() => { const f = document.querySelector('[data-revisao] footer'); if (!f) return null; const r = f.getBoundingClientRect(); return r.bottom <= innerHeight + 1 });
        if (!ft) fails.push(`${tag}: revisão ${k + 1} sem a barra de ações na tela`);
        await p.screenshot({ path: `${OUT}/estrategia-revisao-${k + 1}-${tag}.png` });
        await p.getByRole('button', { name: 'Próximo' }).click(); await p.waitForTimeout(350);
      }
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);

      // Colar resultado do chat (menu ⋯ da estratégia).
      await p.getByRole('button', { name: 'Mais opções da estratégia' }).click(); await p.waitForTimeout(150);
      await p.getByRole('menuitem', { name: 'Colar resultado' }).or(p.getByText('Colar resultado')).first().click(); await p.waitForTimeout(250);
      await check(p, tag, 'colar-resultado');
      await p.locator('dialog[open] textarea').fill('{"cards":[{"aba":"blog","tipo":"x","titulo":"A"}]}');
      await p.locator('dialog[open]').getByRole('button', { name: 'Importar cards' }).click(); await p.waitForTimeout(250);
      if (!(await p.locator('dialog[open] [role=alert]').count())) fails.push(`${tag}: colar resultado não avisou o JSON errado`);
      await close(p);
      // PDF: com tudo decidido, o botão vira "Aprovar e gerar PDF".
      const saved = global.BOARD.cards; global.BOARD = { ...global.BOARD, cards: saved.map((c) => ({ ...c, status: 'aprovado' })) };
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}&parte=resumo`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      const pdfBtn = p.getByRole('button', { name: /Aprovar e gerar PDF/ });
      if (!(await pdfBtn.count())) fails.push(`${tag}: sem o botão Aprovar e gerar PDF com tudo aprovado`);
      else { await pdfBtn.click(); await p.waitForTimeout(300); await check(p, tag, 'pdf'); await close(p) }
      global.BOARD = { ...global.BOARD, cards: saved };
      if (errs.length) fails.push(`${tag}: erros na página: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('estrategia-interativa.cjs ok (iPhone 13 e 1366x800, claro e escuro)');
})();
