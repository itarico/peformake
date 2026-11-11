// Levantamento automático dos pop-ups: abre cada pop-up (Dialog) que um botão das telas abre, em cada aba/etapa,
// no computador (1366x800) e no iPhone 13, e mede se o corpo rola (scrollHeight > clientHeight).
// Dados FALSOS interceptados no navegador (nada vai ao banco). Regra: nenhum pop-up pode ter rolagem interna.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 node e2e/popups.cjs
//   ONLY=/clientes,/financeiro  (só essas telas)   JSON=saida.json (grava a tabela)   STRICT=1 (falha se algum rolar)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const PORT = process.env.PORT || '5200';
const OUT = process.env.OUT || 'e2e/capturas'; fs.mkdirSync(OUT, { recursive: true });
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

const C0 = T.clients[0].id;
const PAGES0 = ['/clientes', '/clientes/' + C0, '/clientes/' + C0 + '?aba=financeiro', '/clientes/' + C0 + '?aba=equipe', '/clientes/' + C0 + '?aba=servicos',
  '/financeiro', '/financeiro/cobranca', '/financeiro/contratos', '/financeiro/whatsapp',
  '/audiovisual', '/audiovisual/producao', '/audiovisual/orcamentos', '/audiovisual/orcamentos/novo', '/audiovisual/fotos', '/audiovisual/roteiros', '/audiovisual/servicos',
  '/social', '/social/quadro', '/social/briefings', '/social/contas', '/conteudo', '/datas', '/automatico',
  '/trafego', '/contas', '/tarefas', '/campanhas', '/estrategia', '/metodologia/nichos', '/servicos', '/integracoes',
  '/equipe/membros', '/configuracoes', '/configuracoes/automacoes', '/configuracoes/inteligencia', '/comercial/pacotes', '/comercial/funil', '/comercial/prospeccao', '/comercial/whatsapp'];
const PAGES = process.env.ONLY ? process.env.ONLY.split(',').map((u) => u.replace(':id', C0)) : PAGES0;
const SKIP_TEXT = /^(sair|entrar|menu|fechar|mais|voltar|anterior|próximo|hoje|\d+)$/i;

const measure = (p) => p.evaluate(() => {
  const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return null;
  const b = d.querySelector(':scope > div > div.overflow-y-auto') || d.querySelector('div.overflow-y-auto');
  const title = (d.querySelector('h2')?.textContent || d.getAttribute('aria-label') || '?').trim().slice(0, 60);
  const inner = [...d.querySelectorAll('*')].filter((e) => e !== b && e.tagName !== 'UL' && e.getAttribute('role') !== 'listbox' && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 2).length;
  return { title, sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0, inner };
});
// Abas e etapas do pop-up: role=tab, botões de grupo (Segmented) no topo do corpo, e "Continuar" de assistentes.
const tabsOf = (p) => p.evaluate(() => {
  const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return [];
  const tabs = [...d.querySelectorAll('[role=tab]')].map((e) => e.textContent.trim());
  const groups = [...d.querySelectorAll('[role=group] > button[aria-pressed]')].filter((e) => e.closest('[role=group]').getAttribute('aria-label')?.match(/parte|etapa|aba|seção|passo/i)).map((e) => e.textContent.trim());
  return [...new Set([...tabs, ...groups])].filter(Boolean).slice(0, 8);
});

(async () => {
  const b = await chromium.launch();
  const rows = new Map();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock); const p = await ctx.newPage();
    p.on('dialog', (x) => x.dismiss().catch(() => {}));
    for (const url of PAGES) {
      await p.goto('http://localhost:' + PORT + url).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(900);
      const labels = await p.evaluate((skip) => [...document.querySelectorAll('main button, main [role=button], header button')]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.disabled && !e.closest('nav, aside, dialog') })
        .map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50))
        .filter((t) => t && !new RegExp(skip, 'i').test(t)), SKIP_TEXT.source);
      const uniq = [...new Set(labels)].slice(0, 45);
      for (const label of uniq) {
        const here = p.url();
        const btn = p.locator('main button, main [role=button], header button').filter({ hasNot: p.locator('dialog') }).and(p.locator(`:is(button,[role=button])`)).filter({ hasText: label }).first();
        const byAria = p.locator(`main [aria-label="${label.replace(/"/g, '\\"')}"], header [aria-label="${label.replace(/"/g, '\\"')}"]`).first();
        const target = (await byAria.count()) ? byAria : btn;
        if (!(await target.count())) continue;
        await target.click({ timeout: 1500 }).catch(() => {});
        await p.waitForTimeout(450);
        const m = await measure(p);
        if (m) {
          const states = [['', m]];
          for (const t of await tabsOf(p)) {
            const tb = p.locator('dialog[open]').last().locator(`[role=tab], [role=group] > button[aria-pressed]`).filter({ hasText: t }).first();
            await tb.click({ timeout: 1000 }).catch(() => {}); await p.waitForTimeout(250);
            const mm = await measure(p); if (mm) states.push([t, mm]);
          }
          for (const [tab, s] of states) {
            const key = `${url.replace(C0, ':id')} › ${s.title}${tab ? ' · ' + tab : ''}`;
            const row = rows.get(key) || { key, via: label }; row[dev] = s; rows.set(key, row);
            if (s.sh > s.ch + 1) await p.screenshot({ path: `${OUT}/popup-${dev}-${key.replace(/[^\w]+/g, '_').slice(0, 80)}.png` }).catch(() => {});
          }
          for (let k = 0; k < 3 && (await p.locator('dialog[open]').count()); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150) }
        }
        if (p.url() !== here) { await p.goto(here).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600) }
      }
    }
    await ctx.close();
  }
  await b.close();
  const list = [...rows.values()].sort((a, b) => a.key.localeCompare(b.key));
  const cell = (s) => (s ? (s.sh > s.ch + 1 ? `ROLA ${s.sh}/${s.ch}` : `ok ${s.sh}/${s.ch}`) : '-');
  for (const r of list) console.log([r.key, cell(r.desk), cell(r.iphone)].join(' | '));
  if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify(list, null, 1));
  const bad = list.filter((r) => [r.desk, r.iphone].some((s) => s && s.sh > s.ch + 1));
  console.log(`\n${list.length} pop-ups/etapas medidos; ${bad.length} com rolagem.`);
  if (process.env.STRICT && bad.length) process.exit(1);
})();
