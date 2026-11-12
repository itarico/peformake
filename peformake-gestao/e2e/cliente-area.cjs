// Regra da operação: cliente sem o serviço da área (ou perdido) não aparece. Dados FALSOS no navegador.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 node e2e/cliente-area.cjs
//
// Confere no computador (1366x800) e no iPhone 13: sem rolagem de lado, fila com cronômetro, "Entregar arte" abre pop-up,
// e nenhum passo do "Editar peça" rola (todos os 8 tipos × 5 etapas).
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 node e2e/design.cjs
const { chromium, devices } = require('playwright');
const PORT = process.env.PORT || '5199';
const now = Date.now();
const iso = (h) => new Date(now + h * 3600e3).toISOString();
const C = [{ id: 'c3', name: 'Dra. Andrea Teste', is_active: true, areas: ['audiovisual'], recurring: true }, { id: 'c4', name: 'Cliente Perdido Teste', is_active: false, areas: ['social'], recurring: true }, { id: 'c1', name: 'Padaria Sol', is_active: true, areas: ['design', 'social'], recurring: true }, { id: 'c2', name: 'Doce Sabor Confeitaria Artesanal Ltda', is_active: true, areas: ['design'], recurring: true }];
const S = [{ id: 's1', full_name: 'Ana Designer', main_role: 'designer' }, { id: 's2', full_name: 'Bruno Silva', main_role: 'designer' }, { id: 's3', full_name: 'Carla Social', main_role: 'social_media' }];
const base = { plan_id: 'p1', client_id: 'c1', kind: 'post', title: 'Promoção de Natal com panetone', headline: 'Panetone artesanal', subtitle: null, cta: 'Peça no WhatsApp', briefing: 'Fundo vermelho, foto do panetone aberto, clima de família. Usar a logo nova no canto e o selo de feito na hora.', caption: null, observations: null, reference_links: ['https://www.pinterest.com/pin/123', 'https://instagram.com/p/abc'], publish_date: '2026-11-20', deadline: '2026-11-18', designer_id: 's1', is_extra: false, revision_note: null, revision_count: 0, legacy_final_urls: [], updated_at: '2026-11-12T10:00:00Z', piece_type: null, spec: {}, carousel_slides: [] };
const items = [
  { ...base, id: 'i1', number: 1, status: 'ready', design_due_at: iso(5) },
  { ...base, id: 'i2', number: 2, status: 'changes_requested', revision_note: 'Trocar a cor do fundo para dourado', design_due_at: iso(40) },
  { ...base, id: 'i3', number: 3, status: 'in_production', client_id: 'c2', designer_id: 's2', design_due_at: iso(-3), kind: 'post', piece_type: 'banner', spec: { width: 1, height: 2, unit: 'm', material: 'Lona', quantity: 2 } },
  { ...base, id: 'i4', number: 4, status: 'ready', designer_id: null, design_due_at: iso(90), kind: 'carrossel', carousel_slides: [{ text: 'Capa' }, { text: '' }, { text: '' }], spec: { purpose: 'criativo' } },
];
items.push({ ...base, id: 'i8', number: 8, status: 'ready', client_id: 'c3', designer_id: null, design_due_at: iso(9) }, { ...base, id: 'i9', number: 9, status: 'ready', client_id: 'c4', designer_id: null, design_due_at: iso(9) });
items.push({ ...base, id: 'i5', number: 5, status: 'briefing' }, { ...base, id: 'i6', number: 6, status: 'client_review' }, { ...base, id: 'i7', number: 7, status: 'approved' });
const files = [{ id: 'f1', item_id: 'i1', role: 'reference', path: 'i1/a.png', name: 'ref1.png', mime: 'image/png', size_bytes: 10, created_at: '2026-11-12T10:00:00Z' }];
const plans = [{ id: 'p1', client_id: 'c1', month: '2026-11-01', notes: null, planned_at: null, sent_to_client_at: null }];
const T = { content_items: items, content_files: files, content_plans: plans, content_events: [], social_tasks: [{ id: 't9', client_id: 'c3', title: 'Tarefa da Andrea', description: null, status: 'a_fazer', source: 'pedido_cliente', network: 'instagram', priority: false, due_date: null, ref_table: null, ref_id: null, created_at: '2026-11-12T10:00:00Z' }, { id: 't1', client_id: 'c1', title: 'Responder pedido de story do cliente', description: null, status: 'a_fazer', source: 'pedido_cliente', network: 'instagram', priority: true, due_date: '2026-11-14', ref_table: null, ref_id: null, created_at: '2026-11-12T10:00:00Z' }], staff_members: S.map((s) => ({ ...s, avatar_path: null, is_active: true })) };
const RPC = { production_clients: C, production_staff: S, my_staff_id: 's1', dash_content: { by_status: { briefing: 1, ready: 2, approved: 1 }, total: 7, clients: 2, plans_ready: 1, plans_total: 2, late: 1, publish_next7: 2, designers: [] }, design_on_time: [{ designer_id: 's1', delivered: 9, on_time: 8, late: 1 }] };
function filt(rows, params) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    const m = /^(eq|in)\.(.*)$/.exec(v); if (!m) continue;
    const vals = m[1] === 'in' ? m[2].replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/"/g, '')) : [m[2]];
    rows = rows.filter((r) => vals.includes(String(r[k])));
  }
  return rows;
}
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return json({});
  const p = u.pathname;
  if (p.startsWith('/rest/v1/rpc/')) { const fn = p.split('/').pop(); return json(fn in RPC ? RPC[fn] : []); }
  if (p.startsWith('/rest/v1/')) {
    const rows = filt(T[p.split('/').pop()] ?? [], [...u.searchParams]);
    return json((req.headers()['accept'] || '').includes('vnd.pgrst.object') ? (rows[0] ?? null) : rows);
  }
  return route.fulfill({ status: 404, body: '' });
}
const measure = (p) => p.evaluate(() => {
  const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return null;
  const b = d.querySelector(':scope > div > div.overflow-y-auto');
  return { sh: b.scrollHeight, ch: b.clientHeight };
});
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

(async () => {
  const b = await chromium.launch(); let fails = 0;
  const bad = (m) => { fails++; console.log('FALHOU ' + m) };
  const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } }); await ctx.route('**/*', mock);
  await ctx.addInitScript(() => localStorage.setItem('e2e_roles', 'admin'));
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERRO na página: ' + e.message.slice(0, 200)));
  for (const path of ['/conteudo/design', '/conteudo/quadro', '/conteudo/calendario', '/social/quadro', '/social']) {
    await p.goto(`http://localhost:${PORT}${path}`); await p.waitForTimeout(1500);
    const txt = await p.locator('body').innerText();
    if (/Andrea Teste|Perdido Teste/.test(txt)) bad(`${path}: cliente fora da área apareceu: ${txt.split('\n').filter((l) => /Andrea Teste|Perdido Teste/.test(l)).join(' / ').slice(0, 200)}`);
    if (path === '/conteudo/design' && !/Padaria Sol/.test(txt)) bad(`${path}: cliente certo sumiu`);
    console.log('ok ' + path);
  }
  const cards = await (async () => { await p.goto(`http://localhost:${PORT}/conteudo/design`); await p.waitForTimeout(1200); return p.locator('ul[aria-label="Fila do design"] > li').count() })();
  if (cards !== 4) bad(`fila do design com ${cards} cartões (esperado 4)`);
  await b.close();
  console.log(fails ? `${fails} falha(s)` : 'TUDO OK'); process.exit(fails ? 1 : 0);
})();
