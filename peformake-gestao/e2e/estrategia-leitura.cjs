// Estratégia em modo LEITURA (Italo, 18/11): o roteiro como documento (estilo do PDF da Rosanne), poucas ações, sem selos.
// Usa 5 vídeos reais da SN Distribuidora (e2e/fixtures/sn-videos.cjs) com o mock do estrategia-interativa.cjs.
// Mede no iPhone 13 e em 1366x800: lista sem os ícones de etapas, faixa do cliente, leitura dos vídeos, pop-ups sem rolagem.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 SHOTS=pasta PREFIX=ui-depois node e2e/estrategia-leitura.cjs
const { chromium, devices } = require('playwright');
const base = require('./estrategia-interativa.cjs');
const { mock, check, close, sideScroll, fails, C, month, id } = base;
const BASE = process.env.BASE || 'http://localhost:5199';
const SHOTS = process.env.SHOTS || 'e2e/capturas'; require('fs').mkdirSync(SHOTS, { recursive: true });
const PREFIX = process.env.PREFIX || 'leitura';
const ONLY_SHOTS = !!process.env.ONLY_SHOTS;
const sn = require('./fixtures/sn-videos.cjs');
const videos = sn.map((v, i) => ({ id: id(700 + i), board_id: id(400), tab: 'audiovisual', kind: 'video', position: v.position, title: v.title,
  data: { formato: v.formato, ganchos: v.ganchos, roteiro: v.roteiro, outras_ideias: v.outras_ideias, filmar: v.filmar, ideia: '' },
  funnel: 'atrair', serves: 'Manda a lista no WhatsApp', goal: null, inspired: v.link ? { link: v.link, numero: v.numero } : null, assumed: null,
  status: 'proposta', reject_reason: null, in_pdf: true, regen_count: 0, is_new: false, updated_at: '2026-11-16T10:00:00Z', redo_pedido: null, redo_requested_at: null }));
// Vídeo completo no formato novo (montagem de 12 quadros, captar, edição, aproveite a gravação, referência).
const fx = require('./fixtures/av-montagem.cjs');
videos.push({ ...videos[0], id: id(799), position: 99, title: fx.title, data: fx.data, inspired: null });
const others = global.BOARD.cards.filter((c) => c.tab !== 'audiovisual');
global.BOARD = { ...global.BOARD, cards: [...videos, ...others] };

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desktop', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
    const tag = dev; const shot = (n, full = true) => p.screenshot({ path: `${SHOTS}/${PREFIX}-${n}-${tag}.png`, fullPage: full });
    await p.goto(`${BASE}/estrategia/consultoria`, { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    await shot('lista');
    if (!ONLY_SHOTS && (await p.locator('[data-etapas-mini] [data-dot]').count())) fails.push(`${tag}: lista ainda com os ícones das etapas`);
    await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
    await shot('cliente');
    await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}&parte=audiovisual`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    await shot('videos', false); await shot('videos-inteira');
    if (!ONLY_SHOTS) {
      if (await sideScroll(p)) fails.push(`${tag}: vídeos com rolagem de lado`);
      const docs = await p.locator('[data-roteiro]').count();
      if (docs !== videos.length) fails.push(`${tag}: leitura com ${docs} roteiros (esperado ${videos.length})`);
      const txt = await p.locator('[data-roteiro]').first().innerText();
      if (!/Tem! De 100 litros/.test(txt)) fails.push(`${tag}: roteiro sem a fala completa`);
      if (/Abertura|Meio|Fecho|Atrair|Provar|suposição/.test(txt)) fails.push(`${tag}: leitura com rótulos/selos (${txt.match(/Abertura|Meio|Fecho|Atrair|Provar|suposição/)[0]})`);
      if (!(await p.locator('[data-roteiro]').nth(4).locator('[data-pergunta-entrevista]').count())) fails.push(`${tag}: depoimento sem a pergunta em destaque`);
      // Três abas por vídeo (Italo, 19/11, v2): Narração (padrão) · Gravação (montagem em quadros) · Edição (guia e tempos).
      const v1 = p.locator('[data-roteiro]').first();
      if (!(await v1.locator('[data-parte-av="narracao"]').count())) fails.push(`${tag}: vídeo não abre na Narração`);
      if (/plano|close|travelling|corredor/i.test(await v1.locator('[data-parte-av="narracao"]').innerText())) fails.push(`${tag}: Narração com direção técnica`);
      if (await v1.locator('[data-nota]').count()) fails.push(`${tag}: nota em destaque no vídeo`);
      await v1.getByRole('tab', { name: 'Gravação' }).click(); await p.waitForTimeout(200);
      const q = await v1.locator('[data-storyboard] svg[data-quadro]').count();
      if (q !== sn[0].roteiro.length) fails.push(`${tag}: storyboard (sem montagem) com ${q} quadros (esperado ${sn[0].roteiro.length})`);
      if (await v1.locator('[data-aproveite]').count()) fails.push(`${tag}: "Aproveite a gravação" sem extras`);
      // O vídeo completo (montagem).
      const vm = p.locator('[data-roteiro]').last();
      await vm.scrollIntoViewIfNeeded();
      const head = await vm.locator('header').innerText();
      if (!/Reel \(ensinar\) · 60 s/i.test(head) || !(await vm.locator('[data-ideia]').count())) fails.push(`${tag}: topo do vídeo sem formato · duração ou ideia`);
      // Captura do cartão inteiro: o app rola por dentro, então a janela cresce só para a foto (as medidas são em 1366x800).
      const vp = p.viewportSize(); const vmShot = async (n) => { await p.setViewportSize({ width: vp.width, height: 2400 }); await vm.scrollIntoViewIfNeeded(); await vm.screenshot({ path: `${SHOTS}/${PREFIX}-${n}-${tag}.png` }); await p.setViewportSize(vp) };
      await vmShot('narracao');
      await vm.getByRole('tab', { name: 'Gravação' }).click(); await p.waitForTimeout(200);
      const qm = await vm.locator('[data-storyboard] svg[data-quadro]').count();
      if (qm !== 12) fails.push(`${tag}: montagem com ${qm} quadros (esperado 12)`);
      const tipos = new Set(await vm.locator('[data-storyboard] svg[data-quadro]').evaluateAll((xs) => xs.map((x) => x.getAttribute('data-quadro'))));
      if (tipos.size !== 6) fails.push(`${tag}: montagem com ${tipos.size} tipos de quadro (esperado 6)`);
      if (!(await vm.locator('[data-captar] li').count())) fails.push(`${tag}: gravação sem "O que captar"`);
      if (!/Stories[\s\S]*Reels no celular[\s\S]*Fotos/.test(await vm.locator('[data-aproveite]').innerText().catch(() => ''))) fails.push(`${tag}: sem "Aproveite a gravação" com os 3 grupos`);
      if (!(await vm.getByText('Assistir a referência').count())) fails.push(`${tag}: gravação sem a referência`);
      if (await sideScroll(p)) fails.push(`${tag}: gravação com rolagem de lado`);
      await vmShot('gravacao');
      await vm.getByRole('tab', { name: 'Edição' }).click(); await p.waitForTimeout(200);
      if ((await vm.locator('[data-tempos] li').count()) !== 12) fails.push(`${tag}: edição sem os 12 tempos`);
      if (!/Ritmo rápido/.test(await vm.locator('[data-parte-av="edicao"]').innerText())) fails.push(`${tag}: edição sem o guia`);
      if (await sideScroll(p)) fails.push(`${tag}: edição com rolagem de lado`);
      await vmShot('edicao');
      for (const nm of ['Gerar de novo', 'Baixar PDF', 'Enviar ao cliente']) if (!(await p.getByRole('button', { name: nm }).count())) fails.push(`${tag}: topo sem "${nm}"`);
      // Editar: pop-up com o texto inteiro, sem rolagem.
      await p.locator('[data-roteiro]').first().getByRole('button', { name: /^Editar/ }).click(); await p.waitForTimeout(300);
      await check(p, tag, 'leitura-editar'); await p.screenshot({ path: `${SHOTS}/${PREFIX}-editar-${tag}.png` });
      const ta = await p.locator('dialog[open] textarea').first().inputValue().catch(() => '');
      if (!/SANDRA: Tem! De 100 litros/.test(ta)) fails.push(`${tag}: editar sem o roteiro inteiro no campo`);
      const tabs = p.locator('dialog[open] [role=tablist] [role=tab]'); for (let k = 0; k < await tabs.count(); k++) { await tabs.nth(k).click(); await p.waitForTimeout(120); await check(p, tag, `leitura-editar-${k}`) }
      await close(p);
      await p.locator('[data-roteiro]').first().getByRole('button', { name: /^Refazer/ }).click(); await p.waitForTimeout(250);
      await check(p, tag, 'leitura-refazer'); await close(p);
      await p.locator('[data-roteiro]').first().getByRole('button', { name: /Ver detalhes/ }).click(); await p.waitForTimeout(250);
      await check(p, tag, 'leitura-detalhes'); await p.screenshot({ path: `${SHOTS}/${PREFIX}-detalhes-${tag}.png` });
      const dt = p.locator('dialog[open] [role=tablist] [role=tab]'); for (let k = 0; k < await dt.count(); k++) { await dt.nth(k).click(); await p.waitForTimeout(120); await check(p, tag, `leitura-detalhes-${k}`) }
      await close(p);
      await p.getByRole('button', { name: 'Baixar PDF' }).click(); await p.waitForTimeout(250); await check(p, tag, 'leitura-pdf');
      if ((await p.locator('dialog[open] [role=radio]').count()) !== 2) fails.push(`${tag}: Baixar PDF sem Completo · Só a narração`);
      await p.locator('dialog[open] [role=radio]', { hasText: 'narração' }).click(); await p.waitForTimeout(120); await check(p, tag, 'leitura-pdf-parte');
      await p.screenshot({ path: `${SHOTS}/${PREFIX}-baixar-${tag}.png` }); await close(p);
      for (const t of ['resumo', 'social', 'trafego', 'atendimento', 'referencias']) {
        await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}&parte=${t}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
        if (!(await p.locator(`[data-leitura="${t}"]`).count())) fails.push(`${tag}: parte ${t} sem a leitura`);
        if (await sideScroll(p)) fails.push(`${tag}: parte ${t} com rolagem de lado`);
        await shot(`parte-${t}`);
      }
      // Sem ?parte: com a estratégia pronta, abre a leitura (não o briefing).
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      if (!(await p.locator('[data-leitura]').count())) fails.push(`${tag}: sem ?parte não abriu a leitura`);
      await p.goto(`${BASE}/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}&parte=briefing`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      await shot('briefing');
    }
    if (errs.length) fails.push(`${tag}: erros na página: ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('estrategia-leitura.cjs ok');
})();
