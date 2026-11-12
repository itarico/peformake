// Guia da marca (cartão + "Ver tudo" + editar cada parte) na peça e na fila do Design, com dados FALSOS no navegador.
// Confere no computador (1366x800) e no iPhone 13: sem rolagem de lado e nenhum pop-up/etapa rola por dentro.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 node e2e/guia-marca.cjs
const { chromium, devices } = require('playwright');
const PORT = process.env.PORT || '5199';
const long = (s, n) => (s + ' ').repeat(n).trim();
const GUIDE = {
  posicionamento: { frase: long('A Grelina transforma ideia em conteúdo que vende, com leveza e sem fórmula pronta.', 2), passar: ['Marketing feito sob medida para o negócio do cliente', 'Leveza e bom humor sem perder seriedade', 'Presença local, de perto', 'Resultado medido, não só post bonito (confirmar)', 'Um quinto item para ver o limite'] },
  visual: { cores: [{ hex: '#D8453B', nome: 'Vermelho tijolo', uso: 'Destaque' }, { hex: '#F4EADB', nome: 'Creme', uso: 'Fundo' }, { hex: '#3A2A24', nome: 'Marrom', uso: 'Texto' }, { hex: '#B6E61F', nome: 'Lima', uso: 'Detalhe' }], fontes: { titulo: 'Bowlby One (sugestão)', apoio: 'Inter (sugestão)', nota: 'confirmar' }, logo: long('Usar em fundo creme ou vermelho, com respiro. Não distorcer, não girar.', 2), foto: long('Luz natural, ambiente real do negócio, enquadramento próximo das pessoas.', 2), video: long('Planos fechados e movimento leve, cores quentes, processo e resultado.', 2) },
  voz: { essencia: long('Uma equipe de marketing que explica o que faz de forma simples, com humor.', 2), tom: [{ adjetivo: 'Leve', exemplo: 'Marketing não precisa ser chato para dar certo.' }, { adjetivo: 'Direto', exemplo: 'Vamos ao que importa: o que o seu cliente quer ver?' }, { adjetivo: 'Próximo', exemplo: 'A gente conhece a sua rua, o seu cliente e o seu balcão.' }], usar: ['Seu negócio', 'A gente faz junto', 'Vamos resolver', 'Ideia que vira venda'], evitar: ['Jargão como funil, lead e engajamento sem explicar', 'Promessa de resultado sem número real', 'Tom de guru ou de urgência falsa', 'Culpar o tráfego pago'], regra_teste: 'Se a peça serve para qualquer concorrente trocando só a logo, não é Grelina.' },
  design: { layout: long('Fundo creme com bloco vermelho para destaque. Cantos arredondados e muito respiro.', 2), hierarquia: long('Primeiro a frase principal, depois o benefício, por último a marca.', 2), ofertas: long('Oferta em bloco vermelho com o preço e a condição em letra menor.', 2), cta: 'Chame no WhatsApp ou no Instagram @grelinabr.' },
  audiovisual: { mostrar: ['Equipe trabalhando no escritório real', 'Telas com o painel de criação e resultados', 'Pessoas do cliente sendo atendidas', 'Logo em fundo creme no final do vídeo', 'Quinto item'], apresentador: long('Fala de forma simples e sorridente, como quem explica para um amigo.', 2), roteiro: ['Gancho: pergunta curta sobre um problema comum', 'Problema: o que trava as vendas', 'Solução: como a Grelina resolve, com exemplo', 'Prova: um número ou depoimento real', 'Chamada para ação: chama a gente no direct', 'Sexto passo'] },
};
const C = [{ id: 'c1', name: 'Grelina', is_active: true, areas: ['design', 'social'], recurring: true }];
const S = [{ id: 's1', full_name: 'Ana Designer', main_role: 'designer' }];
const base = { plan_id: 'p1', client_id: 'c1', kind: 'post', title: 'Post de lançamento', headline: 'Chegou', subtitle: null, cta: 'Peça no WhatsApp', briefing: 'Fundo creme.', caption: null, observations: null, reference_links: [], publish_date: '2026-11-20', deadline: '2026-11-18', designer_id: 's1', is_extra: false, revision_note: null, revision_count: 0, legacy_final_urls: [], updated_at: '2026-11-12T10:00:00Z', piece_type: null, spec: {}, carousel_slides: [], design_due_at: new Date(Date.now() + 5 * 3600e3).toISOString() };
const T = { content_items: [{ ...base, id: 'i1', number: 1, status: 'ready' }], content_files: [], content_plans: [{ id: 'p1', client_id: 'c1', month: '2026-11-01', notes: null, planned_at: null, sent_to_client_at: null }], content_events: [], social_tasks: [], staff_members: S.map((s) => ({ ...s, avatar_path: null, is_active: true })) };
const RPC = { production_clients: C, production_staff: S, my_staff_id: 's1', design_on_time: [],
  brand_guide_get: { client: { id: 'c1', name: 'Grelina', segment: 'Marketing', logo_path: null, brand_style: null }, voice: null, guide: GUIDE, edited: ['voz'], ai_at: '2026-11-12T10:00:00Z', updated_at: '2026-11-12T10:00:00Z', has_diagnosis: false } };
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
  return { t: d.getAttribute('aria-label'), sh: b.scrollHeight, ch: b.clientHeight, sw: d.scrollWidth > d.clientWidth + 1 };
});
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

(async () => {
  const b = await chromium.launch(); let fails = 0, checks = 0;
  const bad = (m) => { fails++; console.log('FALHOU ' + m) };
  const ok = (m, label) => { checks++; if (!m || m.sh > m.ch || m.sw) bad(`${label} rola ${JSON.stringify(m)}`) };
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock);
    await ctx.addInitScript(() => localStorage.setItem('e2e_roles', 'admin'));
    const p = await ctx.newPage(); p.on('pageerror', (e) => bad('erro na página: ' + e.message.slice(0, 200)));
    await p.goto(`http://localhost:${PORT}/conteudo/peca/i1`); await p.waitForTimeout(1500);
    const card = p.locator('section[aria-label="Guia da marca"]');
    if (!(await card.count())) bad(`${dev}: cartão do guia não aparece na peça`);
    if (await sideScroll(p)) bad(`${dev} peça: rolagem de lado`);
    await card.screenshot({ path: `e2e/capturas/guia-cartao-${dev}.png` }).catch(() => {});
    await card.getByRole('button', { name: 'Ver tudo' }).click(); await p.waitForTimeout(400);
    for (const tab of ['Marca', 'Visual', 'Voz', 'Design', 'Vídeo']) {
      await p.locator('dialog[open]').last().getByRole('tab', { name: tab }).click(); await p.waitForTimeout(200);
      ok(await measure(p), `${dev} ver tudo · ${tab}`);
      await p.screenshot({ path: `e2e/capturas/guia-${dev}-${tab}.png` });
      await p.locator('dialog[open]').last().getByRole('button', { name: 'Editar' }).click(); await p.waitForTimeout(300);
      ok(await measure(p), `${dev} editar ${tab} · etapa 1`);
      const next = p.locator('dialog[open]').last().getByRole('button', { name: 'Próximo' });
      if (await next.count()) { await next.click(); await p.waitForTimeout(200); ok(await measure(p), `${dev} editar ${tab} · etapa 2`); await p.screenshot({ path: `e2e/capturas/guia-editar-${dev}-${tab}.png` }) }
      await p.keyboard.press('Escape'); await p.waitForTimeout(250);
      if (!(await p.locator('dialog[open]').count())) bad(`${dev}: fechar a edição fechou o guia`);
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // Briefing da peça: atalho para o guia dentro do pop-up de edição.
    await p.goto(`http://localhost:${PORT}/conteudo/peca/i1?editar=1`); await p.waitForTimeout(1300);
    await p.getByRole('radio', { name: /^Post/ }).click(); await p.waitForTimeout(200);
    await p.locator('dialog[open]').last().getByRole('button', { name: 'Próximo' }).click({ timeout: 5000 }); await p.waitForTimeout(150);
    await p.screenshot({ path: `e2e/capturas/guia-briefing-${dev}.png` });
    ok(await measure(p), `${dev} peça · briefing`);
    await p.locator('dialog[open]').last().getByRole('button', { name: 'Guia da marca' }).click(); await p.waitForTimeout(300);
    ok(await measure(p), `${dev} guia pelo briefing`);
    await p.keyboard.press('Escape');
    await p.goto(`http://localhost:${PORT}/conteudo/design`); await p.waitForTimeout(1300);
    if (await sideScroll(p)) bad(`${dev} design: rolagem de lado`);
    await p.getByRole('button', { name: 'Guia da marca' }).first().click(); await p.waitForTimeout(400);
    ok(await measure(p), `${dev} guia pela fila do Design`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} problema(s) em ${checks} medições` : `Tudo certo (${checks} medições)`);
  process.exit(fails ? 1 : 0);
})();
