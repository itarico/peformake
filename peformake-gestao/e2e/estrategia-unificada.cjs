// Autoteste da Estratégia unificada (plano do mês por seções) com dados FALSOS no navegador (nada vai ao banco nem à IA).
// Mede no iPhone 13 e em 1366x800: no máximo 3 botões no cabeçalho de cada tela, nada de rolagem de lado, pop-ups sem rolagem interna,
// as abas de seção de cada área (Consultoria, Tráfego, Social media, Audiovisual), a Biblioteca e o Plano de execução por seção.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 node e2e/estrategia-unificada.cjs
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true });
const fails = [];
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const now = new Date(); const pad = (n) => String(n).padStart(2, '0');
const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
const long = (t) => Array.from({ length: 12 }, (_, i) => `${t} ${i + 1}: texto longo para testar a paginação do pop-up sem rolagem interna, com detalhes do que fazer.`).join('\n');
const areas = ['trafego', 'social', 'design', 'audiovisual', 'vendas', 'atendimento'];
const actions = [];
for (let n = 1; n <= 30; n++) {
  const area = areas[n % areas.length];
  actions.push({ id: id(100 + n), week: 1 + (n % 4), area, title: `Ação ${n} de ${area}: subir a campanha Compramos sua moto com CG e XRE`, what: long('Passo'), place: 'Meta Ads', owner_role: 'gestor', due_date: month.slice(0, 8) + '05', proof: '20 conversas', why: 'x', format: area === 'social' && n % 2 ? 'tarefa' : 'post', status: n % 5 ? 'proposta' : 'aprovada', routed_table: null, routed_id: null, routed_link: n % 5 ? null : '/trafego/tarefas', suggestion: null, done: false });
}
const pecas = Array.from({ length: 12 }, (_, i) => ({ id: `P${pad(i + 1)}`, data: `${month.slice(0, 8)}${pad(2 + i * 2)}`, formato: i % 3 ? 'carrossel' : 'reels', serie: 'S1', titulo: `Peça ${i + 1}`, objetivo: 'vender', funil: 'atrair', ideia: 'Mostrar a moto', material: 'foto', vira_anuncio: false, tendencia_link: '', copy: { legenda: 'Legenda', slides: [], roteiro: { cenas: [] } } }));
const doc = {
  titulo: 'Dezembro com moto no pátio', situacao: 'x', foco: 'Comprar 5 motos por semana', meta: { numero: '20 motos', texto: 'compradas', como_medir: 'x' },
  semanas: [1, 2, 3, 4].map((w) => ({ semana: w, tema: `Tema ${w}`, objetivo: 'x', datas: [] })), gerado_em: now.toISOString(),
  plano: {
    tese: { posicionamento: 'Neste mês o foco é a compra rápida', percepcao: 'x', porque: 'y' }, mix: [{ objetivo: 'vender', percentual: 60, papel: 'x' }, { objetivo: 'autoridade', percentual: 40, papel: 'y' }],
    semanas_plano: [1, 2, 3, 4].map((w) => ({ semana: w, intencao: 'x', kpi: 'conversas', meta: '30' })),
    diagnostico_mercado: { resumo: 'O concorrente X baixou o preço.', pontos: [{ fato: 'X anuncia há 40 dias', link: 'https://x.com', implicacao: long('Implicação') }] },
    plano_acao: [1, 2, 3, 4].flatMap((w) => [{ semana: w, acao: 'Subir campanha', area: 'trafego', responsavel: 'gestor', prazo: '05/12', kpi: 'conversas', ponto_de_partida: '12', meta: '30' }, { semana: w, acao: 'Postar carrossel', area: 'social', responsavel: 'social', prazo: '06/12', kpi: 'salvos', ponto_de_partida: '10', meta: '40' }]),
    trafego: { resumo: 'Conversas no WhatsApp', verba_mes: 'R$ 1.500', divisao: [{ campanha: 'Compra', objetivo: 'msg', percentual: 70, verba_dia: 'R$ 35', porque: 'x' }], campanhas: [{ nome: 'Compramos sua moto', objetivo: 'mensagens', destino: 'WhatsApp', conjuntos: [{ nome: 'Raio 10 km', publico: 'homens 25-50', verba_dia: 'R$ 20', criativos: ['A1'] }], corte: 'x', escala: 'y' }], testes: [{ hipotese: 'Vídeo ganha de foto', como: 'x', metrica: 'CPC', prazo: '7 dias' }], kpis_semana: [{ semana: 1, kpi: 'custo por conversa', meta: 'R$ 6' }], anuncios: [] },
    design: { ideia_visual: 'Pátio cheio', identidade_aplicada: { cores: 'azul', tipografia: 'Geist', imagem: 'foto real', elementos_fixos: 'selo' }, layouts: [{ nome: 'Vitrine', estrutura: 'foto + preço', uso: 'P01' }], pecas_chave: [{ peca_id: 'P01', por_que: 'abre o mês', layout: 'Vitrine', cuidado: 'preço' }], nao_fazer: ['fundo branco'] },
    series: [{ codigo: 'S1', nome: 'Moto do dia', formato: 'carrossel', frequencia: '2x', objetivo: 'vender', o_que_e: 'x', episodios: ['a'] }],
    calendario: { ritmo: '3 posts por semana', pecas, capturas: [{ data: month.slice(0, 8) + '04', onde: 'Loja', quem: 'Will', quem_apresenta: 'Will', o_que_gravar: ['Pátio', 'Moto CG'], pecas: ['P01'] }], stories_rotina: [{ dia: 'Seg', quadro: 'Moto da semana', sequencia: 'x' }], banco_ideias: [{ tipo: 'video', ideia: 'Antes e depois' }] },
    vendas: { ofertas: [{ nome: 'Avaliação na hora', para_quem: 'donos de CG', o_que_inclui: 'proposta', preco: 'R$ 0', ancora_concorrente: 'R$ 50 no concorrente', escassez_prazo: 'até 20/12', garantia: 'pagamento no dia', canal: 'WhatsApp' }], funil: { leads: '200', conversas: '80', vendas: '20', premissas_conversao: '25%', ticket_medio: 'R$ 9 mil', receita_meta: 'R$ 150 a 180 mil' }, caminho: 'x', sla: { primeira_resposta: '15 min', quem_responde: 'vendedor', horario: '8h às 18h', regra: 'x' }, script: [{ etapa: 'Primeira', mensagem: 'Oi!' }], follow_up: [{ quando: 'D1', mensagem: 'Oi' }], objecoes: [{ objecao: 'Tá caro', de_onde: 'conversa real', resposta: 'x' }], upsell: [{ quando: 'fechou', oferta: 'capacete', mensagem: 'x' }], reativacao: [], indicacao_parcerias: [{ acao: 'Indique', como: 'x', recompensa: 'R$ 100' }], indicadores: [{ indicador: 'conversas', ponto_de_partida: '12', meta: '80' }] },
    consultoria: [{ tema: 'preço', recomendacao: 'Tabela de compra pública', porque: 'x', impacto: '+20%' }],
    marketing_360: { resumo: 'Instagram leva ao WhatsApp', canais: [{ canal: 'Google', papel: 'busca', acao_do_mes: 'fotos novas', conecta_com: 'WhatsApp' }] },
    offline: [{ onde: 'vitrine', acao: 'Faixa Compramos sua moto', quando: 'S1', custo: 'baixo' }],
    ideias: [{ tipo: 'collab', ideia: 'Parceria com oficina', quando: 'S2' }], pedir_cliente: [{ ate: '05/12', item: 'fotos', porque: 'x' }],
    contratado: { trafego: true, social: true, design: true, audiovisual: true, consultoria: true },
  },
};
const strategy = { id: id(50), client_id: id(1), month, status: 'pronto', stage: 'done', error: null, ideas: null, cost_usd: 4.9, adjust: null, adjusted_at: null, finished_at: now.toISOString(), approved_at: null, updated_at: now.toISOString(), can: { all: true, trafego: true, social: true, audiovisual: true }, doc, actions };
const consultRow = { client_id: id(1), name: 'Will motos', logo_path: null, segment: 'Automotivo', document: '29402375000160', status: 'aprovado', stage: 'done', updated_at: now.toISOString(), finished_at: now.toISOString(), monthly: { status: 'pronto', pending: 3, suggestions: 0, month, finished_at: null } };
const board = Array.from({ length: 14 }, (_, i) => ({ client_id: id(1 + i), name: i ? `Cliente com nome comprido número ${i}` : 'Will motos', logo_path: null, strategy_id: i % 3 ? id(50) : null, status: i % 3 ? 'pronto' : null, finished_at: null, pending: i % 4, approved: 1, total: 5 }));

async function mock(route) {
  const req = route.request(); const u = new URL(req.url());
  if (!u.hostname.endsWith('supabase.co')) return route.continue();
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' };
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' });
  const p = u.pathname; const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  if (p === '/rest/v1/rpc/consult_list') return json([consultRow]);
  if (p === '/rest/v1/rpc/monthly_get') return json(strategy);
  if (p === '/rest/v1/rpc/monthly_plan_get') return json({ ...strategy, name: 'Will motos' });
  if (p === '/rest/v1/rpc/monthly_area_board') return json(board);
  if (p.startsWith('/rest/v1/rpc/')) return json(null);
  if (p.startsWith('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': '*/0' }, body: one ? 'null' : '[]' });
  if (p.startsWith('/functions/')) return json({ ok: true });
  return route.fulfill({ status: 404, headers: h, body: '' });
}
const popup = (p) => p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) return null; const b = d.querySelector('.overflow-y-auto'); return { sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0 } });
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
// Botões visíveis no cabeçalho do plano/quadro (o <header> dentro do conteúdo, fora do cabeçalho da seção).
const headerButtons = (p) => p.evaluate(() => { const h = document.querySelector('[data-plan-header]'); if (!h) return -1; return [...h.querySelectorAll('button, a')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 }).length });
const check = async (p, tag, name) => { const m = await popup(p); if (!m) { fails.push(`${tag}: pop-up ${name} não abriu`); return } if (m.sh > m.ch + 1) fails.push(`${tag}: pop-up "${name}" rola (${m.sh}/${m.ch})`); await p.keyboard.press('Escape'); await p.waitForTimeout(200) };

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['iphone', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 800 } }]]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => { errs.push(String(e.message).slice(0, 160)); if (process.env.STACK) console.log(e.stack) });
    const go = async (path, name) => {
      await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
      if (await sideScroll(p)) fails.push(`${dev}: ${name} rola de lado`);
      await p.screenshot({ path: `${OUT}/unificada-${name}-${dev}.png`, fullPage: false });
    };
    const hdr = async (name) => { const n = await headerButtons(p); if (n > 3) fails.push(`${dev}: ${name} tem ${n} botões no cabeçalho`); if (n < 0) fails.push(`${dev}: ${name} sem cabeçalho`) };

    // Consultoria → plano do mês (as 12 seções)
    await go(`/estrategia/consultoria?cliente=${id(1)}&aba=estrategia&mes=${month.slice(0, 7)}`, 'consultoria-plano'); await hdr('consultoria-plano');
    const chips = await p.getByRole('tablist', { name: 'Seções do plano' }).getByRole('tab').count();
    if (chips < 12) fails.push(`${dev}: consultoria mostra ${chips} seções (esperado 12)`);
    for (const sec of ['Mercado', 'Tráfego', 'Vendas e ofertas', 'Audiovisual']) {
      await p.getByRole('tablist', { name: 'Seções do plano' }).getByRole('tab', { name: new RegExp(`^${sec}`) }).click(); await p.waitForTimeout(250);
      const det = p.getByRole('button', { name: /Ver detalhes/ }).first();
      if (await det.count()) { await det.click(); await p.waitForTimeout(250); await check(p, dev, `detalhe-${sec}`) }
      if (await sideScroll(p)) fails.push(`${dev}: seção ${sec} rola de lado`);
    }
    await p.getByRole('tablist', { name: 'Seções do plano' }).getByRole('tab', { name: /^Tráfego/ }).click(); await p.waitForTimeout(250);
    if (!(await p.getByRole('button', { name: /^Aprovar$/ }).count())) fails.push(`${dev}: sem Aprovar nas ações de tráfego`);
    await p.locator('ul li button.min-w-0').first().click(); await p.waitForTimeout(250); await check(p, dev, 'acao');
    await p.getByRole('button', { name: 'Mais opções do plano' }).click(); await p.waitForTimeout(150);
    if ((await p.getByRole('menuitem').count()) < 3) fails.push(`${dev}: menu ⋯ do plano com poucas opções`);
    await p.keyboard.press('Escape');
    // Diagnóstico: uma ação principal + ⋯
    await go(`/estrategia/consultoria?cliente=${id(1)}`, 'consultoria-diagnostico');

    // Tráfego: quadro e cliente
    await go(`/estrategia/trafego?mes=${month.slice(0, 7)}`, 'trafego-quadro'); await hdr('trafego-quadro');
    await go(`/estrategia/trafego?cliente=${id(1)}&mes=${month.slice(0, 7)}`, 'trafego-cliente'); await hdr('trafego-cliente');
    const tChips = await p.getByRole('tablist', { name: 'Seções do plano' }).getByRole('tab').allInnerTexts();
    if (!/Tráfego/.test(tChips[0] ?? '') || tChips.some((t) => /Social|Design|Audiovisual|Consultoria/.test(t))) fails.push(`${dev}: abas da tela de Tráfego erradas: ${tChips.join(', ')}`);
    await go(`/estrategia/trafego?ver=historico`, 'trafego-historico');
    // Social media
    await go(`/estrategia/social?cliente=${id(1)}&mes=${month.slice(0, 7)}`, 'social-cliente'); await hdr('social-cliente');
    const sChips = await p.getByRole('tablist', { name: 'Seções do plano' }).getByRole('tab').allInnerTexts();
    if (!/Social/.test(sChips[0] ?? '') || !sChips.some((t) => /Design/.test(t)) || sChips.some((t) => /Tráfego|Consultoria/.test(t))) fails.push(`${dev}: abas da tela de Social erradas: ${sChips.join(', ')}`);
    // Audiovisual (Ellcazo)
    await go(`/audiovisual/plano-do-mes?mes=${month.slice(0, 7)}`, 'av-quadro');
    await go(`/audiovisual/plano-do-mes?cliente=${id(1)}&mes=${month.slice(0, 7)}`, 'av-cliente'); await hdr('av-cliente');
    if (!(await p.getByText(/Captação/).count())) fails.push(`${dev}: audiovisual sem a pauta de captação`);
    // Biblioteca e rotas antigas
    await go('/estrategia/nichos', 'biblioteca');
    if (!p.url().includes('/estrategia/biblioteca')) fails.push(`${dev}: /estrategia/nichos não levou à Biblioteca (${p.url()})`);
    await go('/metodologia/estudos', 'biblioteca-estudos');
    if (!p.url().includes('secao=estudos')) fails.push(`${dev}: /metodologia/estudos não levou a Estudos (${p.url()})`);
    // Plano de execução só da seção
    await go(`/plano/${id(1)}/${month.slice(0, 7)}?secao=trafego`, 'plano-trafego');
    const frame = await p.frameLocator('iframe[title="Plano de execução"]').locator('h2').allInnerTexts();
    if (frame.length !== 1 || !/Tráfego/.test(frame[0])) fails.push(`${dev}: plano por seção mostrou: ${frame.join(' | ')}`);
    if (errs.length) fails.push(`${dev}: erros na página: ${errs.join(' / ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails.length ? `FALHAS (${fails.length}):\n- ${fails.join('\n- ')}` : 'OK: tudo certo');
  process.exit(fails.length ? 1 : 0);
})();
