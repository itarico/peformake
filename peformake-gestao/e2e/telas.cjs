// Autoteste das telas de Clientes e Financeiro com dados FALSOS interceptados no navegador (nada vai ao banco).
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/telas.cjs   (falha com código 1 se algo quebrar)
const { chromium, devices } = require('playwright');
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true }); const fails = [];
let seq = 0; const uid = () => '00000000-0000-4000-8000-' + String(++seq).padStart(12, '0');
const names = ['Padaria Sol','Clínica Vida','Will Motos','Brio Burguer','3LM','Fornario','Ótica Real','Pet Mania','Construtora Alfa','Studio Bela','João da Silva Santos (PF)','Mercado Bom Preço','Academia Força','Escola Saber','Doce Sabor Confeitaria Artesanal Ltda','Auto Peças Recife','Imobiliária Lar','Farmácia Saúde','Restaurante Mar','Loja Moda Já'];
const T = { clients: [], services: [], client_services: [], client_service_prices: [], client_contracts: [], client_team: [], staff_members: [], client_assessments: [], fin_categories: [], fin_entries: [], invoices: [], invoice_groups: [], invoice_items: [], billing_settings: [{ id: true, gateway: 'asaas', gateway_env: 'production', auto_charge: true, reminders_enabled: false, monthly_generate: true, merge_monthly: true, fine_enabled: true, fine_pct: 2, interest_pct: 1, discount_enabled: false, discount_pct: 0, discount_days: 0, sweep_enabled: false, sweep_share_pct: 0 }], delivery_credits: [], client_contacts: [], client_links: [], client_events: [], team_settings: [{ id: true, job_company_pct: 25 }], service_packages: [], staff_squads: [], staff_squad_members: [], client_contract_docs: [], billing_events: [] };
const svc = [['Tráfego','trafego'],['Social Mídia','social'],['Plano Mobile Quinzenal','audiovisual']].map(([n,a]) => { const s = { id: uid(), name: n, area: a, is_audiovisual: a==='audiovisual', is_active: true, delivery_qty: 4, delivery_format: 'vídeos', delivery_unit: 'vídeo' }; T.services.push(s); return s });
for (const u of ['peformake','ellcazo']) for (const [k,n] of [['entrada','Mensalidade de cliente'],['entrada','Serviço avulso'],['saida','Equipe'],['saida','Aluguel'],['saida','Ferramentas']]) T.fin_categories.push({ id: uid(), unit: u, kind: k, name: n, is_active: true });
for (let s = 0; s < 6; s++) T.staff_members.push({ id: uid(), full_name: 'Pessoa ' + s, avatar_path: null, main_role: 'social_media', is_active: true });
for (let i = 0; i < 60; i++) {
  const c = { id: uid(), name: names[i % names.length] + (i >= names.length ? ' ' + Math.floor(i / names.length) : ''), segment: 'Varejo', client_type: i % 7 === 0 ? 'one-off' : 'recurring', is_active: true, is_lost: i % 15 === 14, email: null, phone: '81988887777', logo_path: null, legacy_logo_url: null, description: null, updated_at: '2026-11-10T10:00:00Z', document: i % 3 ? null : '12345678909', legal_name: null, address: null, billing_email: null, instagram: null, website: null, is_partner: false, squad_id: null, show_on_site: false, legacy_created_at: '2026-0' + (1 + i % 9) + '-01T00:00:00Z', nps: null, lost_reason: null, lost_at: null, target_audience: null, competitors: null, value_proposition: null, acquisition_channel: null };
  T.clients.push(c);
  T.client_contracts.push({ client_id: c.id, contract_model: 'MRR', start_date: '2026-03-01', end_date: '2027-03-01', months: 12, billing_day: [10, 20, 30][i % 3] });
  for (const s of svc.slice(0, 1 + i % 3)) { const cs = { id: uid(), client_id: c.id, service_id: s.id, is_active: true, quantity: 1, notes: null, package_id: null, billing_month: null, legacy_created_at: null, deliver_qty: null, deliver_format: null }; T.client_services.push(cs); T.client_service_prices.push({ client_service_id: cs.id, price: 800 + i * 13.37, discount_type: null, discount_value: null }) }
  T.client_team.push({ client_id: c.id, staff_id: T.staff_members[i % 6].id, role_in_client: 'social_media' });
  // 3 faturas por cliente no mês (stress: 180)
  for (let k = 0; k < 3; k++) {
    const st = ['pendente','pago','vencido','pendente','cancelado'][(i + k) % 5];
    const inv = { id: uid(), client_id: c.id, unit: k === 2 ? 'ellcazo' : 'peformake', description: k === 0 ? 'Mensalidade 11/2026 · Tráfego, Social Mídia' : 'Avulso ' + k, amount: 500 + i * 10 + k + 0.45, due_date: '2026-11-' + String(5 + (i % 20)).padStart(2, '0'), status: st, source: k === 0 ? 'mensalidade' : 'avulso', gateway: i % 4 ? 'asaas' : null, gateway_id: i % 4 ? 'pay_' + i + k : null, payment_url: i % 4 ? 'https://example.com/p' : null, gateway_error: i % 9 === 0 ? 'CPF ausente' : null, paid_at: st === 'pago' ? '2026-11-08T15:00:00Z' : null, paid_amount: st === 'pago' ? 500 : null, group_id: null, pay_token: uid(), clients: { name: c.name, logo_path: null, legacy_logo_url: null }, invoice_groups: null, invoice_items: [{ id: uid(), description: 'Tráfego', quantity: 1, amount: 500, state: 'confirmado' }] };
    T.invoices.push(inv);
  }
  for (let k = 0; k < 3; k++) T.fin_entries.push({ id: uid(), unit: k === 2 ? 'ellcazo' : 'peformake', kind: k === 1 ? 'saida' : 'entrada', category_id: k ? null : T.fin_categories[0].id, description: (k === 1 ? 'Pagamento fornecedor ' : 'Recebido ') + c.name, amount: 100 + i * 7.5, due_date: '2026-11-' + String(1 + (i % 28)).padStart(2, '0'), paid_at: i % 2 ? '2026-11-' + String(1 + (i % 28)).padStart(2, '0') : null, status: i % 2 ? 'pago' : 'pendente', source: ['manual','extrato','contrato'][k], review_status: i % 5 === 0 ? 'a_revisar' : null, bank_ref: null, client_id: k === 1 ? null : c.id, clients: k === 1 ? null : { name: c.name, logo_path: null, legacy_logo_url: null } });
}
T.delivery_credits.push({ id: uid(), client_id: T.clients[0].id, service: 'Social Mídia', measure: 'posts', month: '2026-10-01', qty: 2, status: 'sugerido', discount: 150, clients: { name: T.clients[0].name } });
const RPC = { fin_month_summary: {atrasadas:3,categorias:[{kind:'entrada',total:14000,category:'Mensalidade de cliente'},{kind:'saida',total:3000,category:'Equipe'}],saidas_pagas:3000,sem_categoria:12,vencido_pagar:200,entradas_pagas:14000,vencido_receber:1500,saidas_previstas:5000,vencido_pagar_qtd:1,entradas_previstas:48570,vencido_receber_qtd:3}, contracts_overview: T.clients.slice(0, 30).map((c, i) => ({ client_id: c.id, client_name: c.name, logo_path: null, client_type: c.client_type, contract_model: 'MRR', start_date: '2026-03-01', end_date: '2027-03-01', months: 12, billing_day: 10, monthly: 1500 + i, has_document: i % 2 === 0, doc_id: null, doc_status: ['assinado', 'aguardando_aceite', null][i % 3], sign_method: 'aceite', sent_at: null, signed_at: null, has_pdf: false })), can_see_av_price: true, dash_clients: {nps:{answers:0,neutral:0,promoters:0,detractors:0},flow:[{left:0,month:'2026-10-01',joined:1,at_start:28},{left:3,month:'2026-11-01',joined:0,at_start:29}],active:24,health:{bom:9,ruim:1,neutro:3,muito_ruim:1},tenure:{buckets:{lt3:9,'3to6':12,gt12:0,'6to12':3,unknown:0},avg_months:4.5,lost_avg_months:4},lost_90d:4,services:[{n:12,name:'Tráfego'}],unassessed:10,lost_reasons:[{n:1,reason:'Fim de contrato'},{n:1,reason:'Fim do contrato'}],renewals_60d:1,one_off_active:7}, can_see_prices: true, can_finance: true };
function filt(rows, params) {
  for (const [k, v] of params) {
    if (['select','order','limit','or','offset'].includes(k)) continue;
    const m = /^(not\.)?(eq|neq|in|gte|lte|gt|lt|is)\.(.*)$/.exec(v); if (!m) continue;
    const [, , op, val] = m; const vals = op === 'in' ? val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/"/g,'')) : null;
    rows = rows.filter(r => { const x = r[k]; const sx = x === null || x === undefined ? null : String(x);
      if (op === 'eq') return sx === val; if (op === 'neq') return sx !== val; if (op === 'in') return vals.includes(sx); if (op === 'is') return val === 'null' ? x == null : String(x) === val;
      if (op === 'gte') return sx >= val; if (op === 'lte') return sx <= val; if (op === 'gt') return sx > val; if (op === 'lt') return sx < val; return true });
  }
  return rows;
}
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const json = (b, s = 200, h = {}) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range', ...h }, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return json({});
  const p = u.pathname;
  if (p.startsWith('/rest/v1/rpc/')) { const fn = p.split('/').pop(); if (req.method() !== 'GET' && req.method() !== 'POST') return json(null); return json(fn in RPC ? RPC[fn] : (/(_save|_set|_import|_generate|_decide)/.test(fn) ? null : [])); }
  if (p.startsWith('/rest/v1/')) {
    const t = p.split('/').pop(); if (req.method() !== 'GET' && req.method() !== 'HEAD') return json([], 201);
    let rows = filt(T[t] ?? [], [...u.searchParams]); const lim = u.searchParams.get('limit'); if (lim) rows = rows.slice(0, +lim);
    const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    return json(one ? (rows[0] ?? null) : rows, 200, { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }
  if (p.startsWith('/storage/')) return route.fulfill({ status: 404, body: '' });
  return json({});
}
const pages0 = [['clientes','/clientes?aba=recorrentes'],['ficha','/clientes/' + T.clients[0].id],['ficha-financeiro','/clientes/' + T.clients[0].id + '?aba=financeiro'],['ficha-pf','/clientes/' + T.clients[10].id + '?novo=1'],['caixa','/financeiro/caixa'],['cobranca','/financeiro/cobranca'],['contratos','/financeiro/contratos'],['cobranca-fatura','/financeiro/cobranca?fatura=' + T.invoices[1].id]];
const pages = process.env.ONLY ? pages0.filter(x => x[0] === process.env.ONLY) : pages0;
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock); const p = await ctx.newPage();
    for (const [name, url] of pages) {
      const errs = []; p.removeAllListeners('pageerror'); p.removeAllListeners('console');
      p.on('pageerror', e => errs.push('PAGEERR ' + (e.stack||e.message).slice(0,400))); p.on('console', m => m.type()==='error' && errs.push(m.text().slice(0,160)));
      const t0 = Date.now(); await p.goto('http://localhost:5200' + url); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(1500);
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, btn: document.querySelectorAll('button,a').length,
        tiny: [...document.querySelectorAll('button,a,input,select')].filter(e => { const r = e.getBoundingClientRect(); return r.width>0 && r.height>0 && (r.height < 30) }).length,
        wide: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 2).slice(0,3).map(e => e.tagName + '.' + String(e.className).slice(0,40)),
        nested: [...document.querySelectorAll('main *')].filter(e => { const s = getComputedStyle(e); return (s.overflowY==='auto'||s.overflowY==='scroll') && e.scrollHeight > e.clientHeight+2 }).length,
        words: document.querySelector('main')?.innerText.split(/\s+/).length, first: (() => { const el = [...document.querySelectorAll('main ul > li')].filter(e => e.getBoundingClientRect().height > 0).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0]; return el ? Math.round(el.getBoundingClientRect().top / innerHeight * 100) : null })(), head: (document.querySelector('main')?.innerText || '').slice(0, 220).replace(/\n+/g,' | ') }));
      await p.screenshot({ path: `${OUT}/n-${dev}-${name}.png`, fullPage: false });
      const hit = name === 'cobranca-fatura' ? await p.evaluate((id) => !!document.getElementById('fatura-' + id)?.className.includes('ring-2'), T.invoices[1].id) : true;
      if (!hit) fails.push(`${dev} ${name}: o aviso não abriu a fatura exata`);
      const r = { dev, name, ms: Date.now()-t0, ...m, errs: [...new Set(errs)].slice(0,3) };
      console.log(JSON.stringify(r));
      // Regras: sem erro na tela, sem rolagem de lado, sem tela branca e, no celular, o 1º item da lista antes de metade da tela.
      if (r.errs.some((e) => e.startsWith('PAGEERR'))) fails.push(`${dev} ${name}: erro na tela`);
      if (r.sw > r.cw + 2) fails.push(`${dev} ${name}: rolagem de lado (${r.sw} > ${r.cw})`);
      if (!r.words || r.words < 15 || /não abriu direito/.test(r.head)) fails.push(`${dev} ${name}: tela vazia ou com erro`);
      if (dev === 'iphone' && ['caixa', 'cobranca'].includes(name) && (r.first === null || r.first > 50)) fails.push(`${dev} ${name}: 1º item em ${r.first}% da altura`);
    }
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHOU:\n' + fails.join('\n')); process.exit(1) }
  console.log('Telas ok.');
})();
