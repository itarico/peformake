// Lista da Consultoria (20/11): cada cliente mostra o passo da ficha (1 Briefing, 2 Perguntas, 3 Diagnóstico, 4 Estratégia)
// e o botão da linha leva ao ponto exato. Dados FALSOS no navegador (nada vai ao banco nem à IA). iPhone 13 e 1366x800.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 node e2e/consultoria-lista.cjs
const { chromium, devices } = require('playwright')
const base = require('./estrategia-interativa.cjs')
const { id, sideScroll } = base
const BASE = process.env.BASE || 'http://localhost:5199'
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true })
const full = { produtos: [{ nome: 'Pizza', preco: 'R$ 59' }, { nome: 'Combo', preco: 'R$ 129' }, { nome: 'Calzone', preco: 'R$ 40' }], links: { instagram: 'https://instagram.com/x', site: 'https://x.com' },
  publico: 'Famílias do bairro, 25 a 45 anos, que pedem no fim de semana.', concorrentes: [{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }], referencias: [{ link: 'https://www.instagram.com/reel/abc/', porque: 'gancho' }],
  diferenciais: 'Massa de 48h', quem_aparece: 'O dono', capacidade: '200 pizzas por noite', proposito: 'Juntar a família', percepcao: 'Pizzaria do bairro', posicionamento: 'Artesanal', objecoes: ['caro'], tom: 'leve', essencia: 'família', historia: 'Desde 1999', ticket: 'R$ 80', canais: ['WhatsApp'], publico_detalhe: 'x' }
const row = (n, name, status, extra = {}) => ({ client_id: id(n), name, logo_path: null, segment: 'Pizzaria', document: '29402375000160', instagram: '@x', website: null, status, stage: 'done', redo_section: null, error: null, updated_at: null, finished_at: '2026-11-12T10:00:00Z', answers_new: 0, direction: null, monthly: null, ...extra })
const ROWS = [
  row(1, 'Alfa (briefing)', 'aprovado'),
  row(2, 'Beta (perguntas)', 'aprovado'),
  row(3, 'Gama (revisar diag)', 'pronto'),
  row(4, 'Delta (cnpj)', 'falta_dados', { document: null }),
  row(5, 'Épsilon (estratégia)', 'enviado', { answers_new: 2 }),
  row(6, 'Zeta (criar diag)', 'erro'),
]
const BRIEFS = ROWS.slice(1).map((r) => ({ client_id: r.client_id, data: full }))
const VOICE = { essencia: 'Família na mesa', tom: ['leve', 'próximo'], evitar: ['gírias', 'preço no feed'] }
const QS = [{ client_id: id(2), status: 'pendente' }, { client_id: id(2), status: 'enviada' }]
const fails = []
async function mock(route) {
  const u = new URL(route.request().url()); const p = u.pathname
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) })
  if (u.hostname.endsWith('supabase.co') && route.request().method() === 'GET') {
    if (p === '/rest/v1/client_briefs' && !u.searchParams.get('client_id')) return json(BRIEFS)
    if (p === '/rest/v1/client_briefs') return json(u.searchParams.get('client_id') === `eq.${id(1)}` ? null : { data: full, updated_at: '2026-11-16T10:00:00Z' })
    if (p === '/rest/v1/client_brand_voice') return json(u.searchParams.get('client_id') ? VOICE : ROWS.slice(1).map((r) => ({ client_id: r.client_id, ...VOICE })))
    if (p === '/rest/v1/client_questions' && !u.searchParams.get('client_id') && (u.searchParams.get('status') ?? '').startsWith('in.')) return json(QS)
    if (p === '/rest/v1/client_questions' && !u.searchParams.get('client_id')) return json([])
    if (p === '/rest/v1/clients' && !u.searchParams.get('id')) return json(ROWS.map((r) => ({ id: r.client_id, description: 'Pizzaria', value_proposition: 'Forno', target_audience: 'Famílias', competitors: 'A, B', instagram: '@x', website: 'x.com', phone: '81999990000', document: r.document })))
  }
  if (u.hostname.endsWith('supabase.co') && p === '/rest/v1/rpc/consult_list') return json(ROWS)
  return base.mock(route)
}

;(async () => {
  const b = await chromium.launch()
  for (const [dev, opts] of [['desktop', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock)
    const p = await ctx.newPage(); const errs = []
    p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)))
    await p.goto(`${BASE}/estrategia/consultoria`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
    await p.screenshot({ path: `${OUT}/lista-consultoria-${dev}.png`, fullPage: true })
    if (await sideScroll(p)) fails.push(`${dev}: rolagem de lado`)
    const lines = await p.$$eval('li[data-cliente]', (ls) => ls.map((l) => ({ id: l.dataset.cliente, n: l.dataset.passo, go: l.dataset.acaoLista, name: l.querySelector('b')?.textContent, text: l.querySelector('[data-situacao]')?.textContent, btn: l.querySelector('[data-acao]')?.innerText, h: Math.round(l.getBoundingClientRect().height) })))
    for (const l of lines) console.log(`${dev} | passo ${l.n} | ${l.name} | ${l.text} | [${l.btn}] | ${l.h}px`)
    const expect = { [id(1)]: ['1', 'briefing'], [id(2)]: ['2', 'enviar-perguntas'], [id(3)]: ['3', 'revisar-diag'], [id(4)]: ['3', 'cnpj'], [id(5)]: ['4', 'estrategia'], [id(6)]: ['3', 'criar-diag'] }
    for (const l of lines) { const e = expect[l.id]; if (!e || e[0] !== l.n || e[1] !== l.go) fails.push(`${dev}: ${l.name} passo ${l.n}/${l.go}, esperado ${e}`) }
    if (lines.some((l) => l.h > 80)) fails.push(`${dev}: linha alta demais (${Math.max(...lines.map((l) => l.h))}px)`)
    // Ordem: resposta nova primeiro, depois o passo mais atrasado.
    if (lines[0]?.id !== id(5) || lines[1]?.id !== id(1)) fails.push(`${dev}: ordem ${lines.map((l) => l.name).join(', ')}`)
    // Cada botão da linha: onde leva.
    const click = async (cid) => { await p.goto(`${BASE}/estrategia/consultoria`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); await p.click(`li[data-cliente="${cid}"] [data-acao]`); await p.waitForTimeout(700) }
    const url = () => { const u = new URL(p.url()); return Object.fromEntries(u.searchParams) }
    const dlg = () => p.evaluate(() => [...document.querySelectorAll('dialog[open]')].pop()?.getAttribute('aria-label') ?? document.querySelector('dialog[open] h2')?.textContent ?? null)
    await click(id(1)); let q = url(); if (q.cliente !== id(1) || q.ver !== 'estrategia' || q.parte !== 'briefing' || q.so !== '1') fails.push(`${dev}: Preencher briefing -> ${JSON.stringify(q)}`); else console.log(`${dev} ok briefing -> ${p.url().split('?')[1]}`)
    await click(id(2)); let d = await dlg(); if (!d) fails.push(`${dev}: Enviar perguntas não abriu pop-up`); else console.log(`${dev} ok enviar perguntas -> pop-up "${d}"`)
    await p.keyboard.press('Escape')
    await click(id(3)); if (!p.url().includes(`/revisao/diagnostico/${id(3)}`)) fails.push(`${dev}: Revisar diagnóstico -> ${p.url()}`); else console.log(`${dev} ok revisar -> ${new URL(p.url()).pathname}`)
    await click(id(4)); d = await dlg(); if (!d) fails.push(`${dev}: Informar CNPJ não abriu pop-up`); else console.log(`${dev} ok cnpj -> pop-up "${d}"`)
    await p.keyboard.press('Escape')
    await click(id(5)); q = url(); if (q.cliente !== id(5) || q.ver !== 'estrategia' || q.parte !== 'resumo') fails.push(`${dev}: Abrir estratégia -> ${JSON.stringify(q)}`); else console.log(`${dev} ok estratégia -> ${p.url().split('?')[1]}`)
    const rpc = []; p.on('request', (r) => { if (r.url().includes('/rpc/')) rpc.push(new URL(r.url()).pathname.split('/').pop()) })
    await click(id(6)); await p.waitForTimeout(600); if (!rpc.some((x) => /consult_request|diag/.test(x))) fails.push(`${dev}: Criar diagnóstico não chamou o banco (${rpc.join(',')})`); else console.log(`${dev} ok criar diag -> rpc ${rpc.filter((x) => /consult|diag/.test(x)).join(',')}`)
    // Nome abre a ficha.
    await p.goto(`${BASE}/estrategia/consultoria`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
    await p.click(`li[data-cliente="${id(2)}"] button >> nth=0`); await p.waitForTimeout(500)
    if (url().cliente !== id(2) || url().ver) fails.push(`${dev}: nome não abriu a ficha`)
    // Ficha do mesmo cliente: o passo da vez tem que bater com o da lista (2).
    const cur = await p.$$eval('[data-passos] > li', (ls) => ls.findIndex((l) => l.querySelector('[aria-label$="agora"]')) + 1)
    if (cur !== 2) fails.push(`${dev}: ficha diz passo ${cur}, lista diz 2`); else console.log(`${dev} ok ficha no passo ${cur}`)
    if (errs.length) fails.push(`${dev}: erros ${[...new Set(errs)].join(' | ')}`)
    await ctx.close()
  }
  await b.close()
  console.log(fails.length ? `\nFALHAS:\n- ${fails.join('\n- ')}` : '\nTudo certo.')
  process.exit(fails.length ? 1 : 0)
})()
