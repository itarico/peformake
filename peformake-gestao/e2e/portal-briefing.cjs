// Autoteste do Briefing e das Perguntas no portal do cliente, com dados FALSOS no navegador (nada vai ao banco).
// Mede no iPhone 13 e em 1366x800:
// - briefing abaixo de 80%: o portal abre primeiro na aba Briefing;
// - cada item do briefing abre o pop-up certo, o guia "Responder com opções" anda, e nenhum pop-up rola por dentro;
// - salvar manda o pedaço para portal_brief_save com o código do link;
// - Perguntas: a subpergunta só aparece quando a resposta da mãe pede; responder chama portal_brief_answer.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 node e2e/portal-briefing.cjs
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const TOKEN = 'aB3_-'.repeat(8) + 'xyz';
const fails = []; const calls = [];
const CLIENT = '00000000-0000-4000-8000-000000000001';
let brief = {};
let questions = [];
const reset = () => {
  brief = { publico: 'Mulheres de 25 a 44 anos do bairro', produtos: [{ nome: 'Pizza grande', preco: 'R$ 59,90' }] };
  questions = [
    { id: 'q1', question: 'O que vocês vendem ou fazem?', why: 'Pode marcar mais de um.', options: ['Motos', 'Carros', 'Peças e acessórios'], cond: null, answer: null, status: 'pendente', answered_via: null },
    { id: 'q2', question: 'As motos são novas, seminovas ou as duas?', why: 'Muda o anúncio.', options: ['Novas (0 km)', 'Seminovas'], cond: { q: 'O que vocês vendem ou fazem?', has: ['moto'] }, answer: null, status: 'pendente', answered_via: null },
    { id: 'q3', question: 'Os carros são novos, seminovos ou as duas?', why: null, options: ['Novos', 'Seminovos'], cond: { q: 'O que vocês vendem ou fazem?', has: ['carro'] }, answer: null, status: 'pendente', answered_via: null },
    { id: 'q4', question: 'Qual número faria dezembro ser um mês bom para você?', why: 'Ex.: 300 pedidos.', options: ['Vender mais', 'Clientes novos'], cond: null, answer: null, status: 'pendente', answered_via: null },
  ];
};
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname;
  const body = () => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } };
  if (p === '/rest/v1/rpc/portal_get') return json({ name: 'Will motos', segment: 'Motos', logo_path: null, services: ['Consultoria'], team: [], has_traffic: false });
  if (p === '/rest/v1/rpc/portal_brief') return json({ data: brief, known: { segment: 'Motos', instagram: '@willmotos', phone: '81988887777' }, links: [], voz: null, rivals: null, has_video: true, docs: [{ name: 'cardapio.pdf', at: '2026-11-20T12:00:00Z' }], questions });
  if (p === '/rest/v1/rpc/portal_brief_save') { const b = body(); calls.push(['save', b._token, Object.keys(b._patch || {})]); brief = { ...brief, ...b._patch }; return json(null) }
  if (p === '/rest/v1/rpc/portal_brief_answer') { const b = body(); calls.push(['answer', b._token, b._id]); questions = questions.map((q) => (q.id === b._id ? { ...q, answer: b._answer, status: 'respondida', answered_via: 'cliente' } : q)); return json(null) }
  if (p === '/rest/v1/rpc/consult_list') return json([{ client_id: CLIENT, name: 'Will motos', logo_path: null, segment: 'Motos', document: '29402375000160', consultoria: true, areas: { trafego: false, social: false, audiovisual: false }, status: 'falta_dados', stage: null, updated_at: '2026-11-20T10:00:00Z', suggestions: 0, can_generate: true, direction: null, questions_open: 0, questions_answered: 0, answers_new: 0 }]);
  if (p === '/rest/v1/rpc/brief_portal_link') { calls.push(['link']); return json(TOKEN) }
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  if (p === '/rest/v1/clients') { const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object'); return json(one ? { phone: '81988887777' } : [{ phone: '81988887777' }]) }
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: '[]' });
  return json({});
}
const popup = (p) => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return null; const b = d.querySelector('.overflow-y-auto'); return { title: (d.querySelector('h2')?.textContent || '').trim(), sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0 } });
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
const check = async (p, dev, where) => {
  const m = await popup(p);
  if (!m) { fails.push(`${dev} ${where}: pop-up não abriu`); return null }
  const ok = m.sh <= m.ch + 1
  console.log(`${dev} | ${where} | ${m.title} | ${ok ? 'ok' : 'ROLA'} ${m.sh}/${m.ch}`);
  if (!ok) { fails.push(`${dev} ${where}: ${m.title} rola ${m.sh}/${m.ch}`); await p.screenshot({ path: `${OUT}/portal-briefing-${dev}-${where.replace(/\W+/g, '_')}.png` }) }
  return m;
};
const esc = async (p) => { for (let k = 0; k < 3 && (await p.locator('dialog[open]').count()); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150) } };

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desk', { viewport: { width: 1366, height: 800 } }]]) {
    reset(); calls.length = 0;
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`${BASE}/portal#${TOKEN}`); await p.waitForTimeout(1500);
    const tab = await p.locator('[role=tab][aria-selected=true]').innerText().catch(() => '');
    if (!/Briefing/.test(tab)) fails.push(`${dev}: com briefing baixo devia abrir no Briefing (abriu "${tab}")`);
    if (await sideScroll(p)) fails.push(`${dev}: rolagem lateral no Briefing`);
    await p.screenshot({ path: `${OUT}/portal-briefing-${dev}.png`, fullPage: true });
    // Cada item do briefing (ver e revisar tudo).
    await p.getByRole('button', { name: 'Ver e revisar tudo' }).click(); await p.waitForTimeout(300);
    const tiles = await p.locator('[data-portal-briefing] [data-item]').evaluateAll((els) => els.map((e) => e.getAttribute('title')));
    for (let i = 0; i < tiles.length; i++) {
      await p.locator('[data-portal-briefing] [data-item]').nth(i).click(); await p.waitForTimeout(350);
      await check(p, dev, `item ${tiles[i]}`);
      const opt = p.locator('dialog[open]').getByRole('button', { name: /^(Escolher|Escolher opções|Responder com opções)/ }).first();
      if (await opt.count()) {
        await opt.click(); await p.waitForTimeout(250);
        for (let k = 0; k < 4; k++) {
          await check(p, dev, `${tiles[i]} guia ${k + 1}`);
          const first = p.locator('dialog[open] [data-quiz] [role=group] button').first();
          if (await first.count()) await first.click();
          const nx = p.locator('dialog[open]').getByRole('button', { name: /^(Próxima|Pular)$/ });
          if (!(await nx.count())) break;
          await nx.click(); await p.waitForTimeout(200);
        }
      }
      const add = p.locator('dialog[open]').getByRole('button', { name: /Adicionar/ }).last();
      if (/Produtos/.test(tiles[i] || '') && (await add.count())) { await add.click(); await p.waitForTimeout(250); await check(p, dev, 'produtos › adicionar') }
      await esc(p);
    }
    // Salvar um campo pelo guia de passos.
    await p.getByRole('button', { name: 'Só o que falta' }).click().catch(() => {});
    await p.locator('[data-completar]').click(); await p.waitForTimeout(350);
    await check(p, dev, 'completar passo 1');
    const dig = p.locator('dialog[open]').getByRole('button', { name: /^Digitar/ });
    if (await dig.count()) { await dig.click(); await p.waitForTimeout(250); await check(p, dev, 'completar › digitar') }
    const ta = p.locator('dialog[open] textarea').first();
    if (await ta.count()) { await ta.fill('Teste do autoteste'); await p.locator('dialog[open]').getByRole('button', { name: /Salvar e seguir|Salvar e terminar|Salvar/ }).first().click(); await p.waitForTimeout(700) }
    else await p.locator('dialog[open]').getByRole('button', { name: 'Pular' }).click().catch(() => {});
    if (!calls.some((c) => c[0] === 'save' && c[1] === TOKEN)) { fails.push(`${dev}: salvar não chamou portal_brief_save com o código (${JSON.stringify(calls)})`); await p.screenshot({ path: `${OUT}/portal-briefing-salvar-${dev}.png` }) }
    await esc(p);
    // Perguntas.
    await p.locator('[data-aba=perguntas]').click(); await p.waitForTimeout(400);
    const n0 = await p.locator('[data-portal-perguntas] li').count();
    if (n0 !== 2) fails.push(`${dev}: devia mostrar 2 perguntas antes da resposta (mostrou ${n0})`);
    await p.locator('[data-responder]').click(); await p.waitForTimeout(350);
    await check(p, dev, 'pergunta 1');
    await p.locator('dialog[open]').getByRole('button', { name: 'Motos' }).click();
    await p.locator('dialog[open]').getByRole('button', { name: /Salvar/ }).first().click(); await p.waitForTimeout(900);
    const m2 = await check(p, dev, 'pergunta 2 (subpergunta)');
    if (m2 && !/motos são novas/.test(m2.title)) fails.push(`${dev}: depois de "Motos" devia vir a subpergunta das motos (veio "${m2.title}")`);
    await esc(p);
    const n1 = await p.locator('[data-portal-perguntas] li').count();
    if (n1 !== 3) fails.push(`${dev}: com "Motos" devia mostrar 3 perguntas (mostrou ${n1})`);
    if (!calls.some((c) => c[0] === 'answer' && c[2] === 'q1')) fails.push(`${dev}: responder não chamou portal_brief_answer`);
    if (await sideScroll(p)) fails.push(`${dev}: rolagem lateral nas Perguntas`);
    await p.screenshot({ path: `${OUT}/portal-perguntas-${dev}.png`, fullPage: true });
    // Briefing completo (>= 80%): abre no Painel.
    brief = { ...brief, produtos: [{ nome: 'X', preco: 'R$ 1' }], publico: 'aaaa', diferenciais: 'aaaa', voz: 'aaaa', proibidos: 'aaa', quem_aparece: 'aaa', capacidade: 'aaa', proposito: 'aaa', percepcao: 'aaa', posicionamento: 'aaa', sem_concorrentes: true, referencias: [{ link: 'https://x.com' }], links: { site: 'https://a.com', instagram: 'https://instagram.com/a' } };
    await p.goto(`${BASE}/portal#${TOKEN}/perguntas`); await p.reload(); await p.waitForTimeout(1500);
    const tab2 = await p.locator('[role=tab][aria-selected=true]').innerText().catch(() => '');
    if (!/Perguntas/.test(tab2)) fails.push(`${dev}: com briefing completo e link /perguntas devia abrir em Perguntas (abriu "${tab2}")`);
    // Ficha do cliente → passo Briefing → Enviar: mensagem com o link do PORTAL (aba Briefing), pelo WhatsApp da pessoa.
    await p.goto(`${BASE}/estrategia/consultoria?cliente=${CLIENT}`); await p.waitForTimeout(2000);
    const send = p.locator('[data-passos] li').first().getByRole('button', { name: 'Enviar' });
    if (!(await send.count())) fails.push(`${dev}: passo Briefing sem botão Enviar`);
    else {
      await send.click(); await p.waitForTimeout(500);
      await check(p, dev, 'ficha › enviar briefing');
      await p.locator('dialog[open]').getByRole('button', { name: 'Preparar mensagem' }).click(); await p.waitForTimeout(700);
      await check(p, dev, 'ficha › enviar briefing (mensagem)');
      const wa = await p.locator('dialog[open] a[href*="wa.me"]').getAttribute('href').catch(() => null);
      if (!wa || !decodeURIComponent(wa).includes(`/portal#${TOKEN}/briefing`)) fails.push(`${dev}: mensagem do Enviar sem o link do portal na aba Briefing (${wa})`);
      if (!calls.some((c) => c[0] === 'link')) fails.push(`${dev}: Enviar não pediu brief_portal_link`);
      await p.screenshot({ path: `${OUT}/portal-briefing-enviar-${dev}.png` });
      await esc(p);
    }
    if (errs.length) fails.push(`${dev}: erros na página: ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails.length ? `\nFALHAS (${fails.length}):\n- ${fails.join('\n- ')}` : '\nTudo certo.');
  process.exit(fails.length ? 1 : 0);
})();
