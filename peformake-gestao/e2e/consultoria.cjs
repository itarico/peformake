// Autoteste da aba Estratégia → Consultoria com dados FALSOS no navegador (nada vai ao banco nem à IA).
// Mede no iPhone 13 e em 1366x800: 1º item da lista até 35% da altura, sem rolagem de lado, cada aba do documento
// sem rolagem de lado, e os pop-ups (Falta pouco, Direcionamento, Enviar, Ver detalhes) sem rolagem interna.
// Uso: npx vite --config e2e/shell/vite.config.ts & node e2e/consultoria.cjs   (código 1 se algo quebrar)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5200';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const L = (s, n) => Array.from({ length: n }, (_, i) => `${s} ${i + 1}, com um texto de tamanho real para medir o layout no celular`);
const statuses = ['pronto', 'falta_dados', 'gerando', 'aprovado', 'enviado', 'na_fila', 'erro', 'limite', 'falta_dados'];
const rows = statuses.map((st, i) => ({ client_id: id(i + 1), name: ['Will motos', 'APM', 'Brio Burguer', 'CIA COFFE', 'Fornario', 'Italo santos', 'MF maquinas', 'Restaurante do Vando', 'Sn Distribuidora'][i], logo_path: null, segment: 'Automotivo', document: st === 'falta_dados' ? null : '29402375000160', instagram: null, website: null, status: st, stage: st === 'gerando' ? 'plano' : 'done', redo_section: null, error: st === 'erro' ? 'Falha temporária' : null, updated_at: '2026-11-11T20:00:00Z', finished_at: '2026-11-11T20:00:00Z', suggestions: 0, can_generate: i % 2 === 0, direction: null }));
const doc = {
  gerado_em: '2026-11-11T20:00:00Z',
  resumo: { titulo: 'Will Motos Prime: transformar cliques em conversas e confiança em vendas', situacao: L('Situação', 6).join('. '), decisoes: L('Decisão', 5), primeiro_passo: 'Confirmar o WhatsApp oficial e o endereço certo na Av. Caxangá.', nota_maturidade: 4 },
  diagnostico: {
    negocio: { texto: L('Negócio', 4).join('. '), pontos: L('Ponto', 4) },
    swot: { forcas: L('Força', 4), fraquezas: L('Fraqueza', 4), oportunidades: L('Oportunidade', 4), ameacas: L('Ameaça', 4) },
    mercado: { texto: L('Mercado', 3).join('. '), concorrentes: [1, 2, 3, 4].map((k) => ({ nome: 'Concorrente ' + k, o_que_fazem: L('Faz', 1)[0], como_anunciam: L('Anuncia', 1)[0], fonte: 'https://exemplo-' + k + '.com.br/uma/pagina/bem/comprida/para/testar' })),
      cinco_forcas: ['Concorrência direta', 'Novos entrantes', 'Poder do cliente', 'Poder do fornecedor', 'Substitutos'].map((f, k) => ({ forca: f, nivel: ['alta', 'media', 'baixa'][k % 3], porque: L('Porque', 1)[0] })) },
    publico: { persona: { nome: 'Jonas', idade: '28 anos', quem_e: L('Quem', 1)[0], dores: L('Dor', 3), desejos: L('Desejo', 3), objecoes: L('Objeção', 3) }, icp: L('ICP', 2).join('. '), jornada: ['Descobre', 'Pesquisa', 'Simula', 'Compra', 'Indica'].map((e) => ({ etapa: e, o_que_acontece: L('Acontece', 1)[0], o_que_fazer: L('Fazer', 1)[0] })) },
    proposta_valor: { texto: L('Valor', 2).join('. '), diferenciais: L('Diferencial', 3), equacao: L('Equação', 1)[0] },
    presenca_digital: { nota: 3, itens: ['Site', 'Instagram', 'Google', 'Reclame Aqui', 'Anúncios', 'WhatsApp'].map((c, k) => ({ canal: c, situacao: ['bom', 'atencao', 'ruim', 'nao_encontrado'][k % 4], observacao: L('Obs', 1)[0], fonte: 'https://www.olx.com.br/perfil/x' })) },
    funil: { tem_dados: true, texto: L('Funil', 2).join('. '), numeros: [{ rotulo: 'Investido 30 dias', valor: 'R$ 1.581,43' }, { rotulo: 'Cliques', valor: '3.996' }, { rotulo: 'Contatos', valor: '0' }] },
  },
  comunicacao: { essencia: L('Essência', 1)[0], proposito: L('Propósito', 1)[0], papel_peformake: L('Papel', 2).join('. '), arquetipo: 'Cara comum: próximo e sem frescura.', tom: ['Direto', 'Animado', 'Confiável', 'Acessível'].map((a) => ({ adjetivo: a, exemplo: L('Exemplo', 1)[0] })), evitar: L('Evitar', 5), expressao: { paleta: L('Paleta', 1)[0], ambiente: L('Ambiente', 1)[0], presenca: L('Presença', 1)[0] }, regra_teste: 'Se a peça não mostra a moto e a parcela em 3 segundos, não é Will Motos.' },
  experiencia: ['Recepção', 'Atendimento e venda', 'Ambiente', 'Pós-venda e despedida'].map((m) => ({ momento: m, hoje: L('Hoje', 1)[0], como_deve_ser: L('Deve', 1)[0], acoes: L('Ação', 3) })),
  plano: { prioridade: L('Prioridade', 1)[0], fases: ['30 dias', '60 dias', '90 dias'].map((p) => ({ periodo: p, objetivo: L('Objetivo', 1)[0], passos: [1, 2, 3, 4, 5].map(() => ({ area: 'Presença digital', acao: L('Ação', 1)[0], como: L('Como', 3).join(' '), quem: 'juntos', esforco: 'baixo' })) })), por_area: [{ area: 'Tráfego pago', foco: L('Foco', 1)[0] }], indicadores: L('Indicador', 4).map((n) => ({ nome: n, meta: 'Meta realista', como_medir: 'Planilha semanal' })) },
  riscos: ['alto', 'medio', 'baixo', 'alto'].map((i) => ({ risco: L('Risco', 1)[0], impacto: i, como_evitar: L('Evitar', 1)[0] })),
  do_cliente: L('Pergunta', 14).map((q) => ({ pergunta: q, por_que: L('Porque', 1)[0] })),
  frameworks: ['SWOT', 'Pesquisa de nicho', 'Concorrentes', '5 Forças', 'Persona', 'ICP', 'Jornada', 'Proposta de valor', 'Equação de valor', 'Arquétipo'].map((n) => ({ nome: n, como_usou: L('Usou', 1)[0] })),
  fontes: Array.from({ length: 19 }, (_, k) => ({ url: `https://site-${k}.com.br/pagina/${k}`, title: k % 2 ? `Página ${k} com um título longo de fonte pública` : '' })),
};
const docRow = { client_id: id(1), status: 'pronto', stage: 'done', redo_section: null, error: null, doc, finished_at: '2026-11-11T20:00:00Z', approved_at: null, sent_at: null, cost_usd: 1.47, done_at: '2026-11-11T19:55:00Z' };

async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname;
  if (p === '/rest/v1/rpc/consult_list') return json(rows);
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  if (p === '/rest/v1/consult_docs') return json(docRow);
  if (p === '/rest/v1/clients') return json({ phone: '81987122050' });
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: (req.headers()['accept'] || '').includes('vnd.pgrst.object') ? 'null' : '[]' });
  if (p.startsWith('/functions/')) return json({ ok: true, idle: true });
  return route.fulfill({ status: 404, headers: h, body: '' });
}

const popup = (p) => p.evaluate(() => {
  const d = document.querySelector('dialog[open]'); if (!d) return null;
  const b = d.querySelector('.overflow-y-auto');
  return { title: d.getAttribute('aria-label'), sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0 };
});
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ ...opts, colorScheme: scheme }); await ctx.route('**/*', mock);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
      const tag = `${dev}-${scheme}`;
      // /estrategia abre a Consultoria; /estrategia/frameworks (antigo) também.
      await p.goto(BASE + '/estrategia', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
      if (!p.url().includes('/estrategia/consultoria')) fails.push(`${tag}: /estrategia não abriu a Consultoria (${p.url()})`);
      await p.goto(BASE + '/estrategia/frameworks', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
      if (!p.url().includes('/estrategia/consultoria')) fails.push(`${tag}: /estrategia/frameworks não levou para a Consultoria`);
      if (await p.getByRole('link', { name: 'Frameworks' }).count()) fails.push(`${tag}: aba Frameworks ainda aparece`);
      const first = await p.evaluate(() => { const e = document.querySelector('main [data-conteudo] li'); return e ? Math.round(e.getBoundingClientRect().top / innerHeight * 100) : 999 });
      if (dev === 'iphone' && first > 35) fails.push(`${tag}: 1º cliente em ${first}% (meta 35%)`);
      const n = await p.locator('main [data-conteudo] li').count();
      if (n !== rows.length) fails.push(`${tag}: lista com ${n} clientes (esperado ${rows.length})`);
      if (await sideScroll(p)) fails.push(`${tag}: lista com rolagem de lado`);
      await p.screenshot({ path: `${OUT}/consultoria-lista-${tag}.png` });
      // Falta CNPJ → pop-up de 1 passo
      await p.getByRole('button', { name: 'Informar CNPJ' }).first().click(); await p.waitForTimeout(300);
      let m = await popup(p); if (!m) fails.push(`${tag}: pop-up Falta pouco não abriu`); else if (m.sh > m.ch + 1) fails.push(`${tag}: pop-up "${m.title}" rola (${m.sh}/${m.ch})`);
      await p.getByRole('tab', { name: /Links/ }).click().catch(() => fails.push(`${tag}: pop-up sem a aba Links`)); await p.waitForTimeout(150);
      m = await popup(p); if (m && m.sh > m.ch + 1) fails.push(`${tag}: aba Links do pop-up rola (${m.sh}/${m.ch})`);
      if (!(await p.getByText('Google Maps').count())) fails.push(`${tag}: campo de link do nicho não apareceu`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      // Documento
      await p.goto(BASE + '/estrategia/consultoria?cliente=' + id(1), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
      for (const t of ['Resumo', 'Diagnóstico', 'Comunicação', 'Plano', 'Riscos', 'Do cliente']) {
        const tab = p.getByRole('tab', { name: t, exact: true });
        if (!(await tab.count())) { fails.push(`${tag}: aba ${t} não existe`); continue }
        await tab.click(); await p.waitForTimeout(200);
        if (await sideScroll(p)) fails.push(`${tag}: aba ${t} com rolagem de lado`);
        if (t === 'Diagnóstico' && !(await p.getByText('Forças', { exact: true }).count())) fails.push(`${tag}: SWOT não apareceu`);
        if (t === 'Comunicação' && !(await p.getByText('Experiência do cliente (fora do digital)').count())) fails.push(`${tag}: experiência do cliente não apareceu`);
        await p.screenshot({ path: `${OUT}/consultoria-${t.replace(/\W/g, '')}-${tag}.png`, fullPage: true });
      }
      await p.getByRole('tab', { name: 'Resumo', exact: true }).click();
      // Antes de aprovar, a apresentação fica travada com a dica.
      const deckBtn = p.getByRole('button', { name: 'Baixar apresentação' }).first();
      if (!(await deckBtn.isDisabled())) fails.push(`${tag}: Baixar apresentação liberado antes de aprovar`);
      if (!(await p.getByText('Aprove para gerar a apresentação').count())) fails.push(`${tag}: sem a dica "Aprove para gerar a apresentação"`);
      for (const [btn, name] of [['Ver detalhes (frameworks usados e fontes)', 'Ver detalhes'], ['Direcionamento', 'Direcionamento'], ['Enviar ao cliente', 'Enviar']]) {
        await p.getByRole('button', { name: btn }).first().click(); await p.waitForTimeout(300);
        m = await popup(p); if (!m) { fails.push(`${tag}: pop-up ${name} não abriu`); continue }
        if (m.sh > m.ch + 1) fails.push(`${tag}: pop-up "${m.title}" rola (${m.sh}/${m.ch})`);
        if (name === 'Ver detalhes') { await p.getByRole('tab', { name: /Fontes/ }).click(); await p.waitForTimeout(150); m = await popup(p); if (m && m.sh > m.ch + 1) fails.push(`${tag}: Fontes rola (${m.sh}/${m.ch})`) }
        if (name === 'Enviar' && !(await p.getByRole('link', { name: 'Abrir no WhatsApp' }).count())) fails.push(`${tag}: sem botão do WhatsApp (envio manual)`);
        await p.screenshot({ path: `${OUT}/consultoria-popup-${name.replace(/\W/g, '')}-${tag}.png` });
        await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      }
      if (errs.length) fails.push(`${tag}: erros na página: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails.length) { console.error('FALHAS:\n' + fails.join('\n')); process.exit(1) }
  console.log('consultoria.cjs ok (iPhone 13 e 1366x800, claro e escuro)');
})();
