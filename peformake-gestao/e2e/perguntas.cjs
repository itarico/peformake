// Autoteste das Perguntas ao cliente com dados FALSOS no navegador (nada vai ao banco nem à IA).
// Mede no iPhone 13 e em 1366x800: botão "Enviar perguntas" em cada cliente da lista, aba Perguntas,
// pop-ups (enviar, editar, responder) sem rolagem interna, e a conversa do cliente (/conversa/...) sem rolagem de lado,
// com a caixa de texto e os botões visíveis na tela.
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/perguntas.cjs   (código 1 se algo quebrar)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const names = ['Will motos', 'APM', 'Brio Burguer', 'CIA COFFE', 'Fornario', 'Restaurante do Vando com nome comprido'];
const rows = names.map((name, i) => ({ client_id: id(i + 1), name, logo_path: null, segment: 'Automotivo', document: '29402375000160', instagram: null, website: null, status: ['pronto', 'aprovado', 'falta_dados', 'enviado', 'gerando', 'erro'][i], stage: 'done', redo_section: null, error: null, updated_at: '2026-11-11T20:00:00Z', finished_at: '2026-11-11T20:00:00Z', suggestions: 0, can_generate: true, direction: null, questions_open: 4, answers_new: i === 0 ? 2 : 0, answers_last: '2026-11-12T10:00:00Z' }));
const Q = (n, status, extra = {}) => ({ id: id(100 + n), client_id: id(1), area: 'consultoria', pack: n < 5 ? '2026-11-09' : null, focus: 'semana', question: `Pergunta ${n}: os anúncios de compra de moto trouxeram quantas conversas no WhatsApp da loja desde o ajuste da semana passada?`, why: 'Relatório mostra 0 conversas em 3.996 cliques. · Muda: se mantemos a campanha.', answer: null, status, source: 'ia_semanal', options: ['Nenhuma', '1 a 5', '6 a 15', 'Mais de 15'], attachments: [], audio_pending: false, sent_to_portal_at: status === 'enviada' ? '2026-11-11T10:00:00Z' : null, answered_at: null, answered_via: null, created_at: `2026-11-09T1${n}:00:00Z`, ...extra });
const questions = [Q(1, 'pendente'), Q(2, 'pendente'), Q(3, 'enviada'), Q(4, 'pendente'), Q(5, 'pendente'), Q(6, 'pendente'), Q(7, 'pendente'),
  Q(8, 'respondida', { answer: 'Umas 25 motos se o financiamento ajudar, principalmente Biz e Pop.', answered_at: '2026-11-12T10:00:00Z', answered_via: 'cliente', attachments: [{ path: 'x/y/a.webm', name: 'audio.webm', type: 'audio/webm' }, { path: 'x/y/b.png', name: 'fachada-da-loja-nova.png', type: 'image/png' }], audio_pending: true }),
  Q(9, 'respondida', { answer: 'Sim', answered_at: '2026-11-11T10:00:00Z', answered_via: 'equipe' })];
const sessions = [{ id: id(900), token: 'a'.repeat(48), status: 'concluida', stage: 'fim', nps_score: 9, evaluation: 'Atendimento rápido; melhorar os relatórios.', created_at: '2026-11-11T10:00:00Z', finished_at: '2026-11-12T10:00:00Z', last_seen_at: '2026-11-12T10:00:00Z', cost_usd: 0.0002 }];
const long = 'Os anúncios ficaram parados de 02 a 08/11. Foi você que pausou por falta de moto ou foi problema na conta? Quando quer voltar?';
const chatState = (stage) => ({
  client: 'Will motos', greeting: 'Will', status: 'aberta', stage, progress: { done: stage === 'nps' ? 4 : 1, total: 4 }, transcribe: false, nps: stage === 'nps',
  options: stage === 'nps' ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] : ['Eu pausei', 'Foi problema', 'Não sabia', 'Quero voltar já', 'Responder depois'],
  messages: [
    { from: 'ia', text: 'Oi! Aqui é a assistente da Peformake 👋 São 4 perguntas rápidas sobre a Will motos. Pode tocar num botão, escrever ou mandar áudio. Vamos lá?', at: '', files: [] },
    { from: 'ia', text: long, at: '', files: [] }, { from: 'cliente', text: 'depende', at: '', files: [] },
    { from: 'ia', text: 'Para ajudar: você tem uma meta aproximada? Exemplo: "umas 30 motos".', at: '', files: [] },
    { from: 'cliente', text: '📎 fachada.png', at: '', files: [{ name: 'fachada.png', type: 'image/png' }] },
    ...(stage === 'nps' ? [{ from: 'ia', text: 'Obrigado! De 0 a 10, quanto você indicaria a Peformake para um amigo?', at: '', files: [] }] : [{ from: 'ia', text: long, at: '', files: [] }]),
  ],
});

let chatStage = 'perguntas';
async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname; const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  if (p === '/rest/v1/rpc/consult_list') return json(rows);
  if (p === '/rest/v1/rpc/client_chat_open') return json('b'.repeat(48));
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  if (p === '/rest/v1/client_questions') return json(questions);
  if (p === '/rest/v1/client_chat_sessions') return json(sessions);
  if (p === '/rest/v1/clients') return json(one ? { phone: '81987122050' } : [{ phone: '81987122050' }]);
  if (p === '/rest/v1/consult_docs') return json(one ? null : []);
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: one ? 'null' : '[]' });
  if (p === '/functions/v1/client-chat') return json(chatState(chatStage));
  if (p.startsWith('/functions/')) return json({ ok: true, results: [{ created: 0 }] });
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
  if (m.sh > m.ch + 1) fails.push(`${tag}: pop-up "${m.title}" rola (${m.sh}/${m.ch})`);
  await p.screenshot({ path: `${OUT}/perguntas-popup-${name}-${tag}.png` });
};

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ ...opts, colorScheme: scheme }); await ctx.route('**/*', mock);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
      const tag = `${dev}-${scheme}`;
      // Lista: cada cliente tem "Enviar perguntas".
      await p.goto(BASE + '/estrategia/consultoria', { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
      const btns = await p.getByRole('button', { name: 'Enviar perguntas' }).count();
      if (btns !== rows.length) fails.push(`${tag}: ${btns} botões "Enviar perguntas" na lista (esperado ${rows.length})`);
      if (await sideScroll(p)) fails.push(`${tag}: lista com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/perguntas-lista-${tag}.png` });
      await p.getByRole('button', { name: 'Enviar perguntas' }).first().click(); await p.waitForTimeout(400);
      await check(p, tag, 'escolher');
      const checked = await p.locator('dialog[open] input[type=checkbox]:checked').count();
      if (checked !== 4) fails.push(`${tag}: ${checked} perguntas marcadas para enviar (esperado as 4 da semana)`);
      await p.getByRole('button', { name: /Preparar mensagem/ }).click(); await p.waitForTimeout(400);
      await check(p, tag, 'mensagem');
      const wa = await p.locator('dialog[open] a[href^="https://wa.me/"]').getAttribute('href').catch(() => null);
      if (!wa || !decodeURIComponent(wa).includes('/conversa/' + 'b'.repeat(48))) fails.push(`${tag}: mensagem do WhatsApp sem o link da conversa`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);

      // Aba Perguntas do cliente.
      await p.goto(BASE + '/estrategia/consultoria?cliente=' + id(1) + '&aba=perguntas', { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
      if (!(await p.getByRole('tab', { name: /Perguntas/, selected: true }).count())) fails.push(`${tag}: aba Perguntas não abriu pelo link`);
      if (!(await p.getByText('Ouvir áudio').count())) fails.push(`${tag}: resposta por áudio sem o botão Ouvir`);
      if (!(await p.getByText('Conversa concluída', { exact: false }).count())) fails.push(`${tag}: sem a linha da conversa (NPS)`);
      if (await sideScroll(p)) fails.push(`${tag}: aba Perguntas com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/perguntas-aba-${tag}.png`, fullPage: true });
      for (const [label, name] of [['Editar', 'editar'], ['Responder pela equipe', 'responder']]) {
        await p.getByRole('button', { name: label }).first().click(); await p.waitForTimeout(300);
        await check(p, tag, name); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      }
      await p.getByRole('button', { name: /Enviar ao cliente/ }).first().click(); await p.waitForTimeout(300);
      await check(p, tag, 'enviar-aba'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);

      // Conversa do cliente.
      for (const st of ['perguntas', 'nps']) {
        chatStage = st;
        await p.goto(BASE + '/conversa/' + 'c'.repeat(48), { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
        if (await sideScroll(p)) fails.push(`${tag}: conversa (${st}) com rolagem de lado`);
        const vis = await p.evaluate(() => { const f = document.querySelector('footer'); if (!f) return null; const r = f.getBoundingClientRect(); return { bottom: Math.round(r.bottom), h: innerHeight, docH: document.documentElement.scrollHeight } });
        if (!vis) fails.push(`${tag}: conversa (${st}) sem a área de resposta`);
        else { if (vis.bottom > vis.h + 1) fails.push(`${tag}: área de resposta (${st}) fora da tela`); if (vis.docH > vis.h + 1) fails.push(`${tag}: conversa (${st}) com rolagem dupla`) }
        const opts = st === 'nps' ? 11 : 5;
        const n = await p.locator('footer button').filter({ hasText: /\S/ }).count();
        if (n < opts) fails.push(`${tag}: conversa (${st}) com ${n} botões de resposta (esperado ${opts})`);
        if (st === 'perguntas' && !(await p.getByRole('button', { name: /Gravar áudio|Enviar/ }).count())) fails.push(`${tag}: sem botão de áudio/enviar`);
        await p.screenshot({ path: `${OUT}/perguntas-conversa-${st}-${tag}.png` });
      }
      chatStage = 'perguntas';
      if (errs.length) fails.push(`${tag}: erros na página: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('perguntas.cjs ok (iPhone 13 e 1366x800, claro e escuro)');
})();
