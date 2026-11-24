// Social Media por cliente (24/11): lista com logo e criativos do mês; área do cliente com planejamento em cartões,
// revisão da arte do design (aprovar, ajuste, não aprovar), sugestões da estratégia, tarefas filtradas, agendar e guia.
// Dados FALSOS no navegador (nada vai ao banco).
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 node e2e/social-cliente.cjs
const { chromium, devices } = require('playwright')
const fs = require('fs')
const PORT = process.env.PORT || '5199'; const BASE = `http://localhost:${PORT}`
const OUT = process.env.OUT || 'e2e/capturas/social-cliente'; fs.mkdirSync(OUT, { recursive: true })
const now = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const MONTH = now.slice(0, 8) + '01'
const C = [{ id: 'c1', name: 'Padaria Sol', is_active: true, areas: ['design', 'social'], recurring: true }, { id: 'c2', name: 'Will Motos', is_active: true, areas: ['design', 'social'], recurring: true }]
const BOARD = [
  { id: 'c1', name: 'Padaria Sol', logo_path: null, legacy_logo_url: null, owed: 8, planned: 3, approved: 1, review: 1, no_brief: 0, suggestions: 2, tasks: 1 },
  { id: 'c2', name: 'Will Motos', logo_path: null, legacy_logo_url: null, owed: 4, planned: 4, approved: 0, review: 0, no_brief: 0, suggestions: 0, tasks: 0 },
]
const item = (id, status, title) => ({ id, plan_id: 'pl1', client_id: 'c1', number: Number(id.slice(1)), kind: 'post', status, title, headline: null, subtitle: null, cta: null, briefing: 'x', caption: null, observations: null, reference_links: [], publish_date: MONTH, deadline: null, designer_id: null, is_extra: false, revision_note: null, revision_count: 0, legacy_final_urls: [], updated_at: MONTH, carousel_slides: [], spec: {} })
const fails = []; let calls
const PIXEL = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')
async function mock(route) {
  const req = route.request(); const u = new URL(req.url())
  if (!u.hostname.endsWith('supabase.co')) return route.continue()
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(b) })
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' })
  const p = u.pathname; const body = (() => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } })()
  if (p.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/jpeg', headers: h, body: PIXEL })
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop(); calls.push({ fn, body })
    const R = {
      production_clients: C, production_staff: [], my_staff_id: null, social_clients_board: BOARD,
      social_client_suggestions: { actions: [{ id: 's1', area: 'design', title: 'Arte da promoção de fim de ano', what: 'Duas artes com o panetone', format: 'post', due_date: MONTH, week: 1 }], cards: [{ id: 'k1', title: 'Bastidores da fornada', kind: 'reels', goal: 'Mostrar o processo', month: MONTH }] },
      seasonal_board: [{ client_id: 'c1', client: 'Padaria Sol', niche: null, mine: false, season_key: 'natal', key: 'natal', name: 'Natal', date: now, days: 10, ask_by: now, prepare_from: now, idea: 'Ceia com os pães da casa', kind: 'geral', request: null }],
      brand_guide_get: { client: { id: 'c1', name: 'Padaria Sol', segment: null, logo_path: null, brand_style: null }, voice: null, guide: { posicionamento: { frase: 'O pão quentinho do bairro', passar: ['Fresco', 'Perto'] } }, edited: [], ai_at: null, updated_at: null, has_diagnosis: false },
    }
    return json(R[fn] ?? null)
  }
  if (p.startsWith('/rest/v1/')) {
    const T = {
      content_plans: [{ id: 'pl1', client_id: 'c1', month: MONTH, notes: 'Natal e fim de ano', planned_at: null, sent_to_client_at: null }],
      content_items: [item('i1', 'client_review', 'Panetone artesanal'), item('i2', 'in_production', 'Cesta de Natal'), item('i3', 'approved', 'Pão de queijo')],
      content_files: [{ id: 'f1', item_id: 'i1', role: 'final', path: 'c1/panetone.jpg', name: 'panetone.jpg', mime: 'image/jpeg', size_bytes: 10, created_at: MONTH }],
      social_tasks: [{ id: 't1', client_id: 'c1', title: 'Responder comentários', description: null, status: 'a_fazer', source: 'manual', network: 'instagram', priority: false, due_date: null, created_at: MONTH },
        { id: 't2', client_id: 'c2', title: 'Tarefa de outro cliente', description: null, status: 'a_fazer', source: 'manual', network: 'instagram', priority: false, due_date: null, created_at: MONTH }],
    }
    const rows = T[p.split('/').pop()] ?? []
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': `0-${rows.length}/${rows.length}` }, body: JSON.stringify(rows) })
  }
  return route.fulfill({ status: 404, body: '' })
}
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
const popupScrolls = (p) => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return false; return [...d.querySelectorAll('*')].some((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)) })

;(async () => {
  const b = await chromium.launch()
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    calls = []
    const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock)
    await ctx.addInitScript(() => localStorage.setItem('e2e_roles', 'admin'))
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.setDefaultTimeout(8000)
    const shot = (n) => pg.screenshot({ path: `${OUT}/${dev}-${n}.png` })
    try {
      // 1. Lista de clientes.
      await pg.goto(`${BASE}/conteudo/planejamento`); await pg.waitForTimeout(1500)
      const txt = await pg.evaluate(() => document.body.innerText)
      if (!txt.includes('Faltam 5 de 8 criativos')) fails.push(`${dev}: lista sem "Faltam 5 de 8 criativos"`)
      if (!txt.includes('1 para revisar') || !txt.includes('2 sugestões')) fails.push(`${dev}: lista sem revisar/sugestões`)
      if (await sideScroll(pg)) fails.push(`${dev}: lista rola de lado`)
      await shot('1-lista')

      // 2. Cliente: cartões do mês, pauta, data sazonal.
      await pg.getByRole('link', { name: /Padaria Sol/ }).first().click(); await pg.waitForTimeout(1500)
      if (!/\/conteudo\/cliente\/c1/.test(pg.url())) fails.push(`${dev}: não abriu o cliente (${pg.url()})`)
      const t2 = await pg.evaluate(() => document.body.innerText)
      for (const s of ['Panetone artesanal', 'Cesta de Natal', 'Pão de queijo', 'Faltam 5 de 8', 'Pauta do mês', 'Natal', 'Novo briefing']) if (!t2.includes(s)) fails.push(`${dev}: cliente sem "${s}"`)
      if (!(await pg.getByRole('button', { name: 'Modelo rápido' }).count())) fails.push(`${dev}: sem botão Modelo rápido`)
      if (await sideScroll(pg)) fails.push(`${dev}: cliente rola de lado`)
      await shot('2-cliente')

      // 3. Revisar: aprovar chama o banco com 'approved'; pedir ajuste exige o texto.
      await pg.getByRole('tab', { name: /Revisar/ }).click(); await pg.waitForTimeout(900)
      await pg.getByRole('button', { name: 'Aprovar' }).first().click(); await pg.waitForTimeout(700)
      const ap = calls.find((c) => c.fn === 'content_item_set_status')
      if (!ap || ap.body._item_id !== 'i1' || ap.body._status !== 'approved') fails.push(`${dev}: aprovar errado ${JSON.stringify(ap)}`)
      await pg.getByRole('button', { name: 'Ajuste' }).first().click(); await pg.waitForTimeout(300)
      if (await popupScrolls(pg)) fails.push(`${dev}: pop-up ajuste rola`)
      await pg.getByLabel('O que ajustar').fill('Trocar a cor do fundo')
      await pg.getByRole('button', { name: 'Mandar para o design' }).click(); await pg.waitForTimeout(700)
      const aj = calls.filter((c) => c.fn === 'content_item_set_status').pop()
      if (!aj || aj.body._status !== 'changes_requested' || aj.body._note !== 'Trocar a cor do fundo') fails.push(`${dev}: ajuste errado ${JSON.stringify(aj)}`)
      await shot('3-revisar')

      // 4. Sugestões: aprovar a ação do plano do mês.
      await pg.getByRole('tab', { name: /Sugestões/ }).click(); await pg.waitForTimeout(900)
      await pg.locator('li', { hasText: 'Arte da promoção de fim de ano' }).getByRole('button', { name: 'Aprovar' }).click(); await pg.waitForTimeout(700)
      const sg = calls.find((c) => c.fn === 'monthly_action_decide')
      if (!sg || sg.body._id !== 's1' || sg.body._approve !== true) fails.push(`${dev}: sugestão errada ${JSON.stringify(sg)}`)
      await shot('4-sugestoes')

      // 5. Tarefas só do cliente.
      await pg.getByRole('tab', { name: /Tarefas/ }).click(); await pg.waitForTimeout(900)
      const t5 = await pg.evaluate(() => document.body.innerText)
      if (!t5.includes('Responder comentários') || t5.includes('Tarefa de outro cliente')) fails.push(`${dev}: tarefas não filtraram pelo cliente`)

      // 6. Guia de marca organizado.
      await pg.getByRole('tab', { name: /Guia de marca/ }).click(); await pg.waitForTimeout(900)
      const t6 = await pg.evaluate(() => document.body.innerText)
      if (!t6.includes('O pão quentinho do bairro') || !t6.includes('Voz e copy')) fails.push(`${dev}: guia sem as partes`)
      await shot('6-guia')

      // 7. Modelo rápido abre com o cliente.
      await pg.getByRole('button', { name: 'Modelo rápido' }).click(); await pg.waitForTimeout(400)
      if (!(await pg.locator('dialog[open]').count())) fails.push(`${dev}: Modelo rápido não abriu`)
      if (await popupScrolls(pg)) fails.push(`${dev}: pop-up Modelo rápido rola`)
      await shot('7-modelo')
    } catch (e) { fails.push(`${dev}: ${e.message.split('\n')[0]}`) }
    if (errs.length) fails.push(`${dev}: erro no navegador: ${errs[0]}`)
    await ctx.close()
  }
  await b.close()
  console.log(fails.length ? 'FALHAS\n' + fails.join('\n') : 'Tudo certo')
  if (fails.length && process.env.STRICT) process.exit(1)
})()
