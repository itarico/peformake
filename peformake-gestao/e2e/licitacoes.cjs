// Autoteste da Licitação (ficha do cliente → Financeiro) com dados FALSOS no navegador (nada vai ao banco).
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/licitacoes.cjs
// Regras: cadastro em 4 etapas sem rolagem (desktop 1366x800 e iPhone 13); colar os 8 itens do pedido e conferir R$ 34.650;
// Nova OS sem rolagem e estouro de quantidade pede confirmação; Realizada e Nota fiscal sem rolagem; Cobrança com filtro Licitação.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true }); const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const C = id(1);
const PEDIDO = ['1 (E.T - item 4.2) UN 3 2.650,00 7.950,00', '2 (E.T - item 4.3) UN 5 2.200,00 11.000,00', '3 Edição de vídeo (E.T - item 4.4) UN 4 650,00 2.600,00',
  '4 Produção de áudio (E.T - item 4.5) UN 2 300,00 600,00', '5 (E.T - item 4.6) UN 5 600,00 3.000,00', '6 (E.T - item 4.7) UN 10 700,00 7.000,00',
  '7 Banner (E.T - item 4.8) UN 10 150,00 1.500,00', '8 (E.T - item 4.9) UN 2 500,00 1.000,00'].join('\n');
const ITEMS = [[3, 2650, '(E.T - item 4.2)'], [5, 2200, '(E.T - item 4.3)'], [4, 650, 'Edição de vídeo (E.T - item 4.4)'], [2, 300, 'Produção de áudio (E.T - item 4.5)'], [5, 600, '(E.T - item 4.6)'], [10, 700, '(E.T - item 4.7)'], [10, 150, 'Banner (E.T - item 4.8)'], [2, 500, '(E.T - item 4.9)']]
  .map(([q, p, d], n) => ({ id: id(20 + n), position: n + 1, description: d, unit_label: 'UN', max_qty: q, unit_price: p, archived: false, used_qty: n === 0 ? 3 : n === 5 ? 4 : 0 }));
const BID = {
  id: id(10), client_id: C, client_name: 'Órgão Teste', unit: 'ellcazo', buyer: 'Órgão Teste', number: '1234567', process: null, issued_on: '2025-08-25', starts_on: '2025-08-25', ends_on: '2026-12-01',
  payment_days: 30, due_from: 'realizacao', nf_instructions: 'Constar obrigatoriamente o nº do pedido na nota fiscal.\nEnviar o arquivo .XML da nota para o e-mail: nfe@exemplo.com', notes: null, files: [], status: 'ativa', items: ITEMS,
  orders: [
    { id: id(31), bid_id: id(10), seq: 2, planned_on: '2026-11-12', done_on: null, status: 'aberta', notes: null, over_ok: false, nf_number: null, nf_on: null, nf_files: [], invoice_id: null, amount: 2800, lines: [{ item_id: id(25), qty: 4, unit_price: 700, description: '(E.T - item 4.7)' }], invoice: null },
    { id: id(30), bid_id: id(10), seq: 1, planned_on: '2026-11-01', done_on: '2026-11-05', status: 'realizada', notes: null, over_ok: false, nf_number: null, nf_on: null, nf_files: [], invoice_id: id(40), amount: 7950, lines: [{ item_id: id(20), qty: 3, unit_price: 2650, description: '(E.T - item 4.2)' }], invoice: { id: id(40), status: 'pendente', due_date: '2026-12-05', paid_at: null } },
  ],
};
let bids = [];
const calls = [];
const client = { id: C, name: 'Órgão Teste', segment: 'Governo', client_type: 'one-off', is_active: true, is_lost: false, email: null, phone: null, logo_path: null, legacy_logo_url: null, description: null, updated_at: '2026-11-10T10:00:00Z', document: '02709449006009', legal_name: null, address: null, billing_email: null, instagram: null, website: null, is_partner: false, squad_id: null, show_on_site: false, legacy_created_at: '2026-01-01T00:00:00Z', nps: null, lost_reason: null, lost_at: null };
const INV = { id: id(40), client_id: C, unit: 'ellcazo', description: 'Licitação · Pedido 1234567 · OS 1', amount: 7950, due_date: '2026-12-05', status: 'pendente', source: 'manual', ref: 'licitacao:' + id(30), gateway: 'manual', gateway_id: 'licitacao:' + id(30), payment_url: null, gateway_error: null, paid_at: null, paid_amount: null, group_id: null, pay_token: id(41), clients: { name: 'Órgão Teste', logo_path: null, legacy_logo_url: null }, invoice_groups: null, invoice_items: [] };
const OTHER = { ...INV, id: id(42), ref: null, source: 'mensalidade', description: 'Mensalidade 11/2026', pay_token: id(43), client_id: id(2), clients: { name: 'Outro cliente', logo_path: null, legacy_logo_url: null } };
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
    if (fn === 'bid_list') return json(bids);
    if (fn === 'bid_alerts') return json([]);
    if (fn === 'bid_save') { bids = [BID]; return json(id(10)); }
    if (fn === 'bid_order_create') { const b = JSON.parse(req.postData() || '{}'); if (!b._force) return route.fulfill({ status: 400, contentType: 'application/json', headers: h, body: JSON.stringify({ code: 'PF021', message: 'Passa da quantidade da licitação:\n• (E.T - item 4.2): pediu 1, restam 0' }) }); return json(id(32)); }
    if (fn === 'bid_order_done') return json({ invoice_id: id(44), due_date: '2026-12-12', waiting_nf: false });
    if (fn === 'bid_order_nf') return json({ invoice_id: id(40), due_date: null });
    return json(null);
  }
  const table = p.replace('/rest/v1/', '');
  if (table === 'clients') return json(one ? client : [client]);
  if (table === 'invoices') return json(u.searchParams.get('client_id') ? [INV] : [INV, OTHER]);
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: one ? 'null' : '[]' });
  if (p.startsWith('/storage/')) return route.fulfill({ status: 404, headers: h, body: '' });
  return json({});
}
const fits = (p) => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); const b = d && d.querySelector('div.overflow-y-auto'); return b ? { sh: b.scrollHeight, ch: b.clientHeight, t: d.querySelector('h2')?.textContent } : null });
async function check(p, dev, label) {
  await p.waitForTimeout(250);
  const r = await fits(p);
  console.log(JSON.stringify({ dev, label, ...r }));
  if (!r) fails.push(`${dev} ${label}: pop-up não abriu`);
  else if (r.sh > r.ch + 1) fails.push(`${dev} ${label}: pop-up com rolagem (${r.sh} > ${r.ch})`);
  await p.screenshot({ path: `${OUT}/licitacao-${dev}-${label}.png` });
}
const dlg = (p) => p.locator('dialog[open]').last();
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    bids = [];
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + `/clientes/${C}?aba=contrato&licitacao=nova`); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1200);
    await check(p, dev, '1-pedido');
    await dlg(p).getByLabel('Órgão ou empresa compradora').fill('Órgão Teste');
    await dlg(p).getByLabel('Nº do pedido').fill('1234567');
    await dlg(p).getByLabel('Valor do pedido (conferir)').fill('34.650,00');
    await dlg(p).getByLabel('Emissão').fill('2025-08-25');
    await dlg(p).getByLabel('Fim (data de entrega)').fill('2026-08-25');
    await dlg(p).getByRole('button', { name: 'Continuar' }).click();
    await check(p, dev, '2-itens-vazio');
    await dlg(p).getByRole('button', { name: 'Colar itens' }).click();
    await dlg(p).getByLabel(/Cole as linhas/).fill(PEDIDO);
    await check(p, dev, '2-colar');
    await dlg(p).getByRole('button', { name: 'Ler os itens' }).click();
    await check(p, dev, '2-itens');
    const body = await dlg(p).innerText();
    if (!/8 itens/.test(body) || !/34\.650,00/.test(body)) fails.push(`${dev}: itens colados errados (${body.replace(/\s+/g, ' ').slice(0, 200)})`);
    if (!/Confere com o pedido/.test(body)) fails.push(`${dev}: total não conferiu com o pedido`);
    await dlg(p).getByRole('button', { name: /Edição de vídeo/ }).click();
    await check(p, dev, '2-editar-item');
    await dlg(p).getByRole('button', { name: 'Pronto' }).click();
    await dlg(p).getByRole('button', { name: 'Continuar' }).click();
    await check(p, dev, '3-pagamento');
    await dlg(p).getByRole('button', { name: 'Ellcazo' }).click();
    await dlg(p).getByRole('button', { name: /Nº do pedido na NF/ }).click();
    await dlg(p).getByRole('button', { name: 'Continuar' }).click();
    await check(p, dev, '4-anexos');
    await dlg(p).getByRole('button', { name: /Salvar licitação/ }).click(); await p.waitForTimeout(700);
    const sent = calls.filter(([fn]) => fn === 'bid_save').pop();
    const d = sent ? JSON.parse(sent[1])._data : null;
    if (!d || d.items.length !== 8 || d.unit !== 'ellcazo' || d.payment_days !== 30 || d.number !== '1234567' || !/pedido na nota/.test(d.nf_instructions)) fails.push(`${dev}: bid_save com dados errados (${sent && sent[1].slice(0, 300)})`);
    // Cartão da licitação com o saldo.
    await p.waitForTimeout(600);
    const main = await p.locator('main').innerText();
    if (!/Usado R\$\s?10\.750,00 de R\$\s?34\.650,00/.test(main)) fails.push(`${dev}: barra de saldo ausente (${main.slice(0, 300).replace(/\s+/g, ' ')})`);
    await p.screenshot({ path: `${OUT}/licitacao-${dev}-ficha.png`, fullPage: true });
    // Nova OS com estouro: pede confirmação.
    await p.getByRole('button', { name: 'Nova OS' }).click(); await p.waitForTimeout(300);
    await check(p, dev, '5-nova-os');
    await dlg(p).getByRole('button', { name: 'Mais (E.T - item 4.2)' }).click();
    await dlg(p).getByRole('button', { name: /Criar OS/ }).click(); await p.waitForTimeout(400);
    const conf = await p.locator('dialog[open][aria-label="Confirmar"]').innerText().catch(() => '');
    if (!/Passa da quantidade/.test(conf)) fails.push(`${dev}: estouro não pediu confirmação`);
    await p.locator('dialog[open][aria-label="Confirmar"]').getByRole('button', { name: 'Sim, confirmar' }).click(); await p.waitForTimeout(500);
    const oc = calls.filter(([fn]) => fn === 'bid_order_create').pop();
    if (!oc || !JSON.parse(oc[1])._force) fails.push(`${dev}: OS com estouro não foi enviada com confirmação`);
    // Realizada e NF.
    await p.getByRole('button', { name: 'Realizada' }).first().click(); await p.waitForTimeout(300);
    await check(p, dev, '6-realizada');
    if (!/vence/.test(await dlg(p).innerText())) fails.push(`${dev}: pop-up Realizada sem vencimento`);
    await dlg(p).getByRole('button', { name: 'Confirmar' }).click(); await p.waitForTimeout(400);
    await p.getByRole('button', { name: 'Anexar NF' }).first().click(); await p.waitForTimeout(300);
    await check(p, dev, '7-nota');
    if (!/pedido na nota: 1234567/i.test(await dlg(p).innerText())) fails.push(`${dev}: NF sem lembrete do nº do pedido`);
    await p.keyboard.press('Escape');
    // Cobrança: filtro Licitação e sem "Copiar link".
    await p.goto(BASE + '/financeiro/cobranca?tipo=licitacao'); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1200);
    const cob = await p.locator('main').innerText();
    if (/Outro cliente/.test(cob)) fails.push(`${dev}: filtro Licitação mostrou fatura comum`);
    if (!/Licitação · Pedido 1234567/.test(cob)) fails.push(`${dev}: fatura da licitação não apareceu na Cobrança`);
    if (await p.locator('main').getByRole('button', { name: 'Copiar link' }).count()) fails.push(`${dev}: fatura de licitação com "Copiar link" (Asaas)`);
    await p.screenshot({ path: `${OUT}/licitacao-${dev}-cobranca.png` });
    if (errs.length) fails.push(`${dev}: erro na tela: ${errs[0]}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails.length ? 'FALHAS:\n' + fails.join('\n') : 'OK: licitação sem rolagem e fluxo completo');
  process.exit(fails.length ? 1 : 0);
})();
