// Aba Design (/conteudo/design) e pop-up "Editar peça" por etapas, com dados FALSOS no navegador (nada vai ao banco).
// Confere no computador (1366x800) e no iPhone 13: sem rolagem de lado, fila com cronômetro, "Entregar arte" abre pop-up,
// e nenhum passo do "Editar peça" rola (todos os 8 tipos × 5 etapas).
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 node e2e/design.cjs
const { chromium, devices } = require('playwright');
const PORT = process.env.PORT || '5199';
const now = Date.now();
const iso = (h) => new Date(now + h * 3600e3).toISOString();
const C = [{ id: 'c1', name: 'Padaria Sol', is_active: true, areas: ['design', 'social'], recurring: true }, { id: 'c2', name: 'Doce Sabor Confeitaria Artesanal Ltda', is_active: true, areas: ['design'], recurring: true }];
const S = [{ id: 's1', full_name: 'Ana Designer', main_role: 'designer' }, { id: 's2', full_name: 'Bruno Silva', main_role: 'designer' }, { id: 's3', full_name: 'Carla Social', main_role: 'social_media' }];
const base = { plan_id: 'p1', client_id: 'c1', kind: 'post', title: 'Promoção de Natal com panetone', headline: 'Panetone artesanal', subtitle: null, cta: 'Peça no WhatsApp', briefing: 'Fundo vermelho, foto do panetone aberto, clima de família. Usar a logo nova no canto e o selo de feito na hora.', caption: null, observations: null, reference_links: ['https://www.pinterest.com/pin/123', 'https://instagram.com/p/abc'], publish_date: '2026-11-20', deadline: '2026-11-18', designer_id: 's1', is_extra: false, revision_note: null, revision_count: 0, legacy_final_urls: [], updated_at: '2026-11-12T10:00:00Z', piece_type: null, spec: {}, carousel_slides: [] };
const items = [
  { ...base, id: 'i1', number: 1, status: 'ready', design_due_at: iso(5) },
  { ...base, id: 'i2', number: 2, status: 'changes_requested', revision_note: 'Trocar a cor do fundo para dourado', design_due_at: iso(40) },
  { ...base, id: 'i3', number: 3, status: 'in_production', client_id: 'c2', designer_id: 's2', design_due_at: iso(-3), kind: 'post', piece_type: 'banner', spec: { width: 1, height: 2, unit: 'm', material: 'Lona', quantity: 2 } },
  { ...base, id: 'i4', number: 4, status: 'ready', designer_id: null, design_due_at: iso(90), kind: 'carrossel', carousel_slides: [{ text: 'Capa' }, { text: '' }, { text: '' }], spec: { purpose: 'criativo' } },
];
const files = [{ id: 'f1', item_id: 'i1', role: 'reference', path: 'i1/a.png', name: 'ref1.png', mime: 'image/png', size_bytes: 10, created_at: '2026-11-12T10:00:00Z' }];
const plans = [{ id: 'p1', client_id: 'c1', month: '2026-11-01', notes: null, planned_at: null, sent_to_client_at: null }];
const T = { content_items: items, content_files: files, content_plans: plans, content_events: [], staff_members: S.map((s) => ({ ...s, avatar_path: null, is_active: true })) };
const RPC = { production_clients: C, production_staff: S, my_staff_id: 's1', design_on_time: [{ designer_id: 's1', delivered: 9, on_time: 8, late: 1 }] };
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
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    for (const role of ['designer', 'admin']) {
      const ctx = await b.newContext(opts); await ctx.route('**/*', mock);
      await ctx.addInitScript((r) => localStorage.setItem('e2e_roles', r), role);
      const p = await ctx.newPage();
      await p.goto(`http://localhost:${PORT}/conteudo`); await p.waitForTimeout(1500);
      const url = new URL(p.url()).pathname;
      if (role === 'designer' && url !== '/conteudo/design') bad(`${dev} designer abriu ${url} (esperado /conteudo/design)`);
      if (role === 'admin' && url !== '/conteudo/quadro') bad(`${dev} admin abriu ${url}`);
      await p.goto(`http://localhost:${PORT}/conteudo/design`); await p.waitForTimeout(1200);
      const cards = await p.locator('ul[aria-label="Fila do design"] > li').count();
      if (cards !== 4) bad(`${dev} ${role}: ${cards} cartões na fila`);
      const first = await p.locator('ul[aria-label="Fila do design"] > li').first().innerText();
      if (!/Entrega/.test(first)) bad(`${dev}: sem cronômetro no 1º cartão`);
      if (await sideScroll(p)) bad(`${dev} design: rolagem de lado`);
      if (!(await p.getByText('8 de 9 no prazo').count())) bad(`${dev}: placar no prazo não apareceu`);
      if (!(await p.getByRole('button', { name: /Baixar referências \(1\)/ }).count())) bad(`${dev}: sem Baixar referências`);
      await p.screenshot({ path: `e2e/capturas/design-${dev}-${role}.png`, fullPage: true });
      await p.getByRole('button', { name: 'Entregar arte' }).first().click(); await p.waitForTimeout(400);
      const m = await measure(p); if (!m || m.sh > m.ch) bad(`${dev} Entregar arte rola ${JSON.stringify(m)}`);
      await p.screenshot({ path: `e2e/capturas/design-entregar-${dev}.png` });
      await p.keyboard.press('Escape');
      if (role === 'admin') {
        await p.goto(`http://localhost:${PORT}/conteudo/peca/i1?editar=1`); await p.waitForTimeout(1500);
        if (await sideScroll(p)) bad(`${dev} peça: rolagem de lado`);
        for (const kind of ['Post', 'Carrossel', 'Story', 'Reels', 'Anúncio', 'Impressão', 'Banner', 'Vetor']) {
          await p.locator('ol[aria-label="Etapas da peça"] button').first().click(); await p.waitForTimeout(150);
          let mm = await measure(p); if (!mm || mm.sh > mm.ch) bad(`${dev} tipo rola ${JSON.stringify(mm)}`);
          await p.getByRole('radio', { name: new RegExp('^' + kind) }).click(); await p.waitForTimeout(200);
          for (let s = 1; s <= 4; s++) {
            mm = await measure(p); if (!mm || mm.sh > mm.ch) bad(`${dev} ${kind} etapa ${s + 1} rola ${JSON.stringify(mm)}`);
            if (kind === 'Banner' && s === 1) await p.screenshot({ path: `e2e/capturas/peca-banner-${dev}.png` });
            if (kind === 'Carrossel' && s === 1) await p.screenshot({ path: `e2e/capturas/peca-carrossel-${dev}.png` });
            if (s < 4) { await p.getByRole('button', { name: 'Próximo' }).click(); await p.waitForTimeout(150) }
          }
          if (kind === 'Post') await p.screenshot({ path: `e2e/capturas/peca-mais-${dev}.png` });
        }
        await p.keyboard.press('Escape'); await p.waitForTimeout(300);
        await p.screenshot({ path: `e2e/capturas/peca-${dev}.png`, fullPage: true });
        for (const old of ['/conteudo/calendario', '/conteudo/redes', '/conteudo/novidades']) {
          await p.goto(`http://localhost:${PORT}${old}`); await p.waitForTimeout(700);
          if (new URL(p.url()).pathname !== '/conteudo/quadro') bad(`${old} não levou ao quadro`);
        }
      }
      await ctx.close();
    }
  }
  await b.close();
  console.log(fails ? `${fails} problema(s)` : 'Tudo certo');
  process.exit(fails ? 1 : 0);
})();
