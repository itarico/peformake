// Autoteste da Nova venda (Comercial → Vendas) com dados FALSOS no navegador (nada vai ao banco).
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/vendas.cjs
// Regras: um botão "Nova venda"; pop-up em 3 etapas sem rolagem (scrollHeight <= clientHeight do corpo do Dialog)
// no iPhone 13 e no desktop 1366x800; cliente novo cadastrado dentro do pop-up; venda sai em 3 etapas;
// negócio do funil já entra preenchido; lista com busca; celular: primeiro item antes de 35% da altura.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true }); const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const CATALOG = {
  can_edit: true, can_see_prices: true,
  services: [
    { id: id(1), name: 'Vídeo unitário', area: 'audiovisual', description: null, deliverables: null, unit: 'unidade', is_active: true, price: 150, clients: 0,
      options: [{ id: id(11), kind: 'variacao', name: 'Simples', price: 150 }, { id: id(12), kind: 'variacao', name: 'Com drone', price: 400 }, { id: id(13), kind: 'extra', name: 'Legenda', price: 50 }, { id: id(14), kind: 'extra', name: 'Trilha', price: 80 }] },
    { id: id(2), name: 'Gestão de tráfego', area: 'trafego', description: null, deliverables: null, unit: 'mês', is_active: true, price: 1500, clients: 3, options: [] },
    { id: id(3), name: 'Social media', area: 'social', description: null, deliverables: null, unit: 'mês', is_active: true, price: 1200, clients: 2, options: [] },
    { id: id(4), name: 'Identidade visual', area: 'design', description: null, deliverables: null, unit: 'projeto', is_active: true, price: 2500, clients: 0, options: [] },
  ],
  packages: [{ id: id(30), name: 'Pacote Presença', description: null, is_active: true, promo_price: null, promo_starts: null, promo_ends: null, items: [{ service_id: id(2), name: 'Gestão de tráfego', area: 'trafego', quantity: 1, price: 1300 }, { service_id: id(3), name: 'Social media', area: 'social', quantity: 1, price: 1000 }] }],
};
const FIND = [
  { kind: 'cliente', client_id: id(100), deal_id: null, contact_id: null, name: 'Marcenaria Ouro', company: 'Ouro Móveis Ltda', phone: '5581999990000', email: null, photo: null, avatar: null, tag: 'ativo' },
  { kind: 'lead', client_id: null, deal_id: id(200), contact_id: null, name: 'Mariana Costa', company: 'Doce Mar', phone: '81988887777', email: null, photo: null, avatar: null, tag: 'lead' },
  { kind: 'cliente', client_id: id(101), deal_id: null, contact_id: null, name: 'Mar Azul Pousada', company: null, phone: null, email: 'contato@marazul.com', photo: null, avatar: null, tag: 'perdido' },
];
const SALES = Array.from({ length: 8 }, (_, i) => ({ id: id(500 + i), deal_id: null, contact_id: null, client_id: id(100), description: i % 2 ? 'Mensal: Gestão de tráfego' : 'Vídeo unitário · Com drone', value_cents: 150000, sale_date: '2026-11-0' + (i + 1), status: i === 0 ? 'pendente' : 'confirmada', source: 'manual', excerpt: null, created_at: '2026-11-01T10:00:00Z', kind: i % 2 ? 'recorrente' : 'avulso', unit: i % 2 ? 'peformake' : 'ellcazo', seller_id: id(900) }));
const calls = [];
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  const p = u.pathname;
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop(); calls.push([fn, req.postData()]);
    if (fn === 'catalog_list') return json(CATALOG);
    if (fn === 'sale_find') { const q = (JSON.parse(req.postData() || '{}')._q || '').toLowerCase(); return json(FIND.filter((f) => !q || f.name.toLowerCase().includes(q))); }
    if (fn === 'sale_create') return json({ client_id: id(777), client_created: true, sale_ids: [id(778)], status: 'confirmada', total: 3250, recurring: true });
    return json(null);
  }
  const table = p.replace('/rest/v1/', '');
  if (table === 'staff_members') return json([{ id: id(900), full_name: 'Teste Layout', avatar_path: null, profile_id: '00000000-0000-0000-0000-000000000000', main_role: 'admin', skills: [] }, { id: id(901), full_name: 'Bruna Vendas', avatar_path: null, profile_id: id(902), main_role: 'closer', skills: [] }]);
  if (table === 'crm_sales') return json(SALES);
  const deal = { id: id(200), contact_id: null, lead_name: 'Mariana Costa', lead_company: 'Doce Mar', lead_phone: '81988887777', service_id: id(2), title: 'Oportunidade: Doce Mar' };
  if (table === 'crm_deals' && u.searchParams.get('id')) return json(one ? deal : [deal]);
  if (table === 'commercial_settings' && one) return json({ reply_sla_minutes: 30, stale_days: 7 });
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: one ? 'null' : '[]' });
  if (p.startsWith('/storage/')) return route.fulfill({ status: 404, headers: h, body: '' });
  return json({});
}
const fits = (p) => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); const b = d && d.querySelector('div.overflow-y-auto'); return b ? { sh: b.scrollHeight, ch: b.clientHeight } : null });
async function check(p, dev, label) {
  await p.waitForTimeout(250);
  const r = await fits(p);
  console.log(JSON.stringify({ dev, label, ...r }));
  if (!r) fails.push(`${dev} ${label}: pop-up não abriu`);
  else if (r.sh > r.ch + 1) fails.push(`${dev} ${label}: pop-up com rolagem (${r.sh} > ${r.ch})`);
  await p.screenshot({ path: `${OUT}/vendas-${dev}-${label}.png` });
}
const dlg = (p) => p.locator('dialog[open]');
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '/comercial/vendas'); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/vendas-${dev}-lista.png` });
    const header = await p.evaluate(() => { const c = document.querySelector('main [data-conteudo]'); return c ? Math.round(c.getBoundingClientRect().top / innerHeight * 100) : 999 });
    console.log(JSON.stringify({ dev, primeiroItemPct: header }));
    if (dev === 'iphone' && header > 35) fails.push(`${dev}: lista começa em ${header}% da altura (meta 35%)`);
    const main = await p.locator('main').innerText();
    if (/Lançar servi|Lançar venda/.test(main)) fails.push(`${dev}: ainda tem "Lançar serviço/venda"`);
    if ((await p.getByRole('button', { name: 'Nova venda' }).count()) !== 1) fails.push(`${dev}: deveria ter 1 botão "Nova venda"`);
    // Busca da lista
    await p.getByPlaceholder('Buscar por cliente ou serviço').fill('drone'); await p.waitForTimeout(200);
    const rows = await p.locator('main [data-lista] > div').count();
    if (rows !== 4) fails.push(`${dev}: busca "drone" deveria mostrar 4 vendas (${rows})`);
    await p.getByPlaceholder('Buscar por cliente ou serviço').fill('');

    // Nova venda com cliente novo: etapa 1 → 2 → 3.
    await p.getByRole('button', { name: 'Nova venda' }).click(); await p.waitForTimeout(400);
    await check(p, dev, '1-cliente');
    await dlg(p).getByPlaceholder(/Nome, empresa/).fill('mar'); await p.waitForTimeout(700);
    if (!(await dlg(p).getByText('Lead').count())) fails.push(`${dev}: resultado sem etiqueta Lead`);
    if (!(await dlg(p).getByText('Cliente ativo').count())) fails.push(`${dev}: resultado sem etiqueta Cliente ativo`);
    await check(p, dev, '1-busca');
    await dlg(p).getByPlaceholder(/Nome, empresa/).fill('Padaria Sol'); await p.waitForTimeout(600);
    await dlg(p).getByRole('button', { name: /Cadastrar cliente/ }).click(); await p.waitForTimeout(200);
    const person = await dlg(p).getByLabel('Nome do responsável *').inputValue();
    if (person !== 'Padaria Sol') fails.push(`${dev}: o nome buscado não foi para o cadastro (${person})`);
    await dlg(p).getByLabel('Nome da empresa').fill('Padaria Sol');
    await dlg(p).getByLabel('Nome do responsável *').fill('João Lima');
    await dlg(p).getByLabel('WhatsApp do responsável *').fill('(81) 97777-6666');
    await check(p, dev, '1-cadastro');
    await dlg(p).getByRole('button', { name: 'Continuar' }).click();
    await check(p, dev, '2-catalogo');
    await dlg(p).getByPlaceholder('Buscar serviço ou pacote').fill('video');
    await dlg(p).getByRole('button', { name: /Vídeo unitário/ }).click();
    await dlg(p).getByRole('button', { name: /Com drone/ }).click();
    await dlg(p).getByRole('button', { name: /\+ Legenda/ }).click();
    await dlg(p).getByRole('button', { name: 'Mais' }).click();
    await check(p, dev, '2-variacao');
    await dlg(p).getByRole('button', { name: 'Pronto' }).click();
    await dlg(p).getByRole('button', { name: 'Adicionar serviço' }).click();
    await dlg(p).getByRole('button', { name: /Gestão de tráfego/ }).click();
    await check(p, dev, '2-lista');
    const foot = await dlg(p).locator('footer').innerText();
    if (!/2\.350,00/.test(foot)) fails.push(`${dev}: total errado no rodapé (${foot.replace(/\s+/g, ' ')})`);
    await dlg(p).getByRole('button', { name: 'Continuar' }).click();
    await check(p, dev, '3-confirmar');
    const body = await dlg(p).innerText();
    if (!/1ª mensalidade em dez\/2026/.test(body)) fails.push(`${dev}: sem aviso da 1ª mensalidade`);
    if (!/Vencimento/.test(body) || !/Início/.test(body)) fails.push(`${dev}: faltou Início ou Vencimento`);
    if (!(await dlg(p).getByRole('button', { name: /Bruna/ }).count())) fails.push(`${dev}: vendedor não é escolhido por foto`);
    await dlg(p).getByRole('button', { name: 'Confirmar venda' }).click(); await p.waitForTimeout(500);
    const sent = calls.filter(([fn]) => fn === 'sale_create').pop();
    const payload = sent ? JSON.parse(sent[1])._data : null;
    if (!payload || payload.new_client?.person !== 'João Lima' || payload.items.length !== 2 || payload.items[0].variant_id !== id(12) || payload.items[0].quantity !== 2 || payload.items[1].kind !== 'recorrente')
      fails.push(`${dev}: sale_create com dados errados (${sent && sent[1]})`);
    await check(p, dev, '4-pronto');
    if (!(await dlg(p).getByRole('link', { name: /Abrir ficha do cliente/ }).count())) fails.push(`${dev}: sem "Abrir ficha do cliente"`);
    if (!(await dlg(p).getByRole('link', { name: /Gerar contrato/ }).count())) fails.push(`${dev}: sem "Gerar contrato" na venda recorrente`);
    await dlg(p).getByRole('button', { name: 'Fechar' }).first().click(); await p.waitForTimeout(200);

    // Veio do funil: lead já preenchido e serviço do negócio já escolhido.
    await p.goto(BASE + '/comercial/vendas?nova=1&negocio=' + id(200)); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1000);
    const comp = await dlg(p).getByLabel('Nome da empresa').inputValue().catch(() => '');
    if (comp !== 'Doce Mar') fails.push(`${dev}: negócio do funil não preencheu o cliente (${comp})`);
    await check(p, dev, 'funil-1');
    await dlg(p).getByRole('button', { name: 'Continuar' }).click(); await p.waitForTimeout(200);
    if (!(await dlg(p).getByText(/Gestão de tráfego/).count())) fails.push(`${dev}: serviço do negócio não veio`);
    // Rota antiga continua funcionando.
    await p.goto(BASE + '/comercial/lancar-servico'); await p.waitForTimeout(900);
    if (!(await p.locator('dialog[open]').count())) fails.push(`${dev}: rota antiga não abre a Nova venda`);
    if (errs.length) fails.push(`${dev}: erro na tela: ${errs[0]}`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHOU:\n' + fails.join('\n')); process.exit(1) }
  console.log('Vendas ok.');
})();
