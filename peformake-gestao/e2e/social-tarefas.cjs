// Social Media: tarefas separadas das artes e designer só com a tela dele (24/11), com dados FALSOS no navegador.
// 1. Admin: Tarefas geral em A fazer · Fazendo · Feito, agrupada por cliente (logo e contagem; título só ao abrir);
//    o pop-up da tarefa aceita, recusa com motivo e vira arte (24/11).
// 2. Designer: qualquer endereço de /conteudo cai no Design; sem abas, sem "Nova arte", sem botão "Prazos"; cartão sempre com o lugar da imagem.
// 3. Admin no Design: vê o botão "Prazos".
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 OUT=pasta node e2e/social-tarefas.cjs
const { chromium, devices } = require('playwright')
const fs = require('fs'); const path = require('path')
const PORT = process.env.PORT || '5199'; const BASE = `http://localhost:${PORT}`
const OUT = process.env.OUT || 'e2e/capturas/tarefas'; fs.mkdirSync(OUT, { recursive: true })
const iso = (h) => new Date(Date.now() + h * 3600e3).toISOString(); const day = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10)
const month = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) + '-01'
const C = [{ id: 'c1', name: 'Padaria Sol', is_active: true, areas: ['design', 'social'], recurring: true }]
const S = [{ id: 's1', full_name: 'Ana Designer', main_role: 'designer' }]
const item = (id, over) => ({ id, plan_id: 'p1', client_id: 'c1', number: 1, kind: 'post', status: 'ready', title: 'Promoção de Natal', subtitle: null, caption: null, briefing: 'Fundo vermelho com panetone.', observations: null, reference_links: [], publish_date: day(4), deadline: day(2), designer_id: 's1', is_extra: false, priority: false, revision_count: 0, revision_note: null, sent_to_client_at: null, approved_at: null, published_at: null, created_at: iso(-20), updated_at: iso(-2), design_started_at: null, delivered_at: null, delivered_on_time: null, ai_deadline_at: null, cta: null, format: null, size: null, slides: null, ...over })
let tasks; const fails = []; const saves = []
const reset = () => { saves.length = 0; tasks = [
  { id: 't1', client_id: 'c1', title: 'Responder pedido de story do cliente', description: 'Story do panetone até sexta', status: 'a_fazer', source: 'pedido_cliente', network: 'instagram', priority: true, due_date: day(1), ref_table: null, ref_id: null, created_at: iso(-3) },
  { id: 't2', client_id: 'c1', title: 'Post da campanha de Natal (estratégia aprovada)', description: null, status: 'a_fazer', source: 'estrategia', network: 'instagram', priority: false, due_date: day(5), ref_table: null, ref_id: null, created_at: iso(-5) },
  { id: 't3', client_id: null, title: 'Trocar a bio do Instagram', description: null, status: 'fazendo', source: 'manual', network: 'instagram', priority: false, due_date: null, ref_table: null, ref_id: null, created_at: iso(-8) },
  { id: 't4', client_id: 'c1', title: 'Arquivar destaques antigos', description: null, status: 'feito', source: 'manual', network: 'instagram', priority: false, due_date: null, ref_table: null, ref_id: null, created_at: iso(-24 * 30) },
] }
const items = [item('i1', {}), item('i2', { number: 2, reference_links: ['https://www.instagram.com/p/abc123/'] })]
async function mock(route) {
  const req = route.request(); const u = new URL(req.url())
  if (!u.hostname.endsWith('supabase.co')) return route.continue()
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: h, body: JSON.stringify(b) })
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' })
  const p = u.pathname; const body = (() => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } })()
  if (p.endsWith('/functions/v1/ref-thumb')) return json({ thumbs: {} })
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop()
    if (fn === 'social_task_refuse' || fn === 'social_task_to_art') { saves.push({ fn, ...body }); return json(null) }
    if (fn === 'social_task_save') { saves.push(body); const t = tasks.find((x) => x.id === body._id); if (t && body._data.status) t.status = body._data.status; return json(null) }
    return json({ production_clients: C, production_staff: S, my_staff_id: 's1', seasonal_board: [] }[fn] ?? null)
  }
  if (p.startsWith('/rest/v1/')) {
    const T = { social_tasks: tasks, content_items: items, content_plans: [{ id: 'p1', client_id: 'c1', month, notes: null, planned_at: null, sent_to_client_at: null }], content_files: [], content_events: [], staff_members: S.map((s) => ({ ...s, avatar_path: null, is_active: true })), design_settings: [{ delivery_whatsapp: true, sla_hours: {} }] }
    const rows = T[p.split('/').pop()] ?? []
    if ((req.headers()['accept'] || '').includes('vnd.pgrst.object')) return json(rows[0] ?? null)
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': `0-${rows.length}/${rows.length}` }, body: JSON.stringify(rows) })
  }
  return route.fulfill({ status: 404, body: '' })
}
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
const popupScrolls = (p) => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return false; return [...d.querySelectorAll('*')].some((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)) })

;(async () => {
  const b = await chromium.launch()
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const open = async (role) => {
      reset(); const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock)
      await ctx.addInitScript((r) => localStorage.setItem('e2e_roles', r), role)
      const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.setDefaultTimeout(8000); return { ctx, pg, errs }
    }
    const close = async ({ ctx, pg, errs }, name) => { if (await sideScroll(pg)) fails.push(`${dev} ${name}: rolagem de lado`); if (errs.length) fails.push(`${dev} ${name}: erro ${errs[0]}`); await pg.screenshot({ path: path.join(OUT, `${dev}-${name}.png`) }); await ctx.close() }
    try {
      // 1. Admin: Tarefas é geral (24/11), agrupada por cliente com a logo; tocar abre os títulos; o pop-up decide.
      let s = await open('admin'); const pg = s.pg
      await pg.goto(BASE + '/conteudo/tarefas', { waitUntil: 'networkidle' })
      const tcols = await pg.locator('[data-conteudo] > section').evaluateAll((l) => l.map((e) => e.getAttribute('aria-label')))
      if (tcols.join() !== 'A fazer,Fazendo,Feito') fails.push(`${dev}: colunas das tarefas = ${tcols.join()}`)
      if (await pg.getByText('Responder pedido de story do cliente').count()) fails.push(`${dev}: título aparece antes de abrir o cliente`)
      const group = pg.locator('section[aria-label="A fazer"] button[aria-expanded]', { hasText: 'Padaria Sol' })
      if (!(await group.innerText()).includes('2 tarefas')) fails.push(`${dev}: grupo do cliente sem a contagem`)
      await group.click(); await pg.waitForTimeout(200)
      const first = await pg.locator('section[aria-label="A fazer"] li li').first().innerText()
      if (!/Responder pedido de story/.test(first) || !/Cliente pediu/.test(first)) fails.push(`${dev}: a tarefa do cliente com prioridade devia vir primeiro (${first})`)
      if (await pg.getByText('Arquivar destaques antigos').count()) fails.push(`${dev}: tarefa feita há mais de 7 dias ainda aparece`)
      // Aceitar
      await pg.getByRole('button', { name: /Responder pedido de story/ }).click(); await pg.waitForTimeout(400)
      if (await popupScrolls(pg)) fails.push(`${dev}: pop-up da tarefa rola`)
      await pg.getByRole('button', { name: 'Aceitar' }).click(); await pg.waitForTimeout(500)
      if (saves[0]?._id !== 't1' || saves[0]?._data?.status !== 'fazendo') fails.push(`${dev}: Aceitar não mudou a etapa (${JSON.stringify(saves[0])})`)
      // Virar arte
      if (!(await pg.getByRole('button', { name: /Post da campanha de Natal/ }).count())) await group.click()
      await pg.getByRole('button', { name: /Post da campanha de Natal/ }).click(); await pg.waitForTimeout(400)
      await pg.getByRole('button', { name: 'Virar arte' }).click(); await pg.waitForTimeout(200)
      await pg.getByRole('radio', { name: 'Carrossel' }).click()
      await pg.getByRole('button', { name: 'Mandar para o design' }).click(); await pg.waitForTimeout(500)
      const art = saves.find((x) => x.fn === 'social_task_to_art')
      if (!art || art._id !== 't2' || art._kind !== 'carrossel') fails.push(`${dev}: Virar arte errado (${JSON.stringify(art)})`)
      // Recusar com motivo
      if (dev === 'iphone') { await pg.getByRole('tab', { name: /Fazendo/ }).click(); await pg.waitForTimeout(200) }
      await pg.locator('section[aria-label="Fazendo"] button[aria-expanded]', { hasText: 'Geral' }).click(); await pg.waitForTimeout(200)
      await pg.getByRole('button', { name: /Trocar a bio do Instagram/ }).click(); await pg.waitForTimeout(400)
      await pg.getByRole('button', { name: 'Recusar' }).click(); await pg.waitForTimeout(200)
      await pg.getByLabel('Por que não vai ser feita').fill('O cliente desistiu')
      await pg.getByRole('button', { name: 'Recusar tarefa' }).click(); await pg.waitForTimeout(500)
      const ref = saves.find((x) => x.fn === 'social_task_refuse')
      if (!ref || ref._id !== 't3' || ref._reason !== 'O cliente desistiu') fails.push(`${dev}: Recusar errado (${JSON.stringify(ref)})`)
      await pg.getByRole('button', { name: 'Tarefa', exact: true }).click(); await pg.waitForTimeout(300)
      if (await popupScrolls(pg)) fails.push(`${dev}: pop-up Nova tarefa rola`)
      await pg.keyboard.press('Escape')
      await close(s, 'tarefas')

      // 2. Designer: só a tela dele.
      s = await open('designer')
      for (const url of ['/conteudo', '/conteudo/quadro', '/conteudo/tarefas', '/conteudo/planejamento', '/conteudo/datas']) {
        await s.pg.goto(BASE + url, { waitUntil: 'networkidle' })
        if (!s.pg.url().endsWith('/conteudo/design')) fails.push(`${dev}: designer abriu ${url} (${s.pg.url()})`)
      }
      for (const t of ['Artes', 'Tarefas', 'Planejamento']) if (await s.pg.getByRole('link', { name: t, exact: true }).count()) fails.push(`${dev}: designer vê a aba ${t}`)
      if (await s.pg.getByRole('button', { name: 'Prazos' }).count()) fails.push(`${dev}: designer vê o botão Prazos`)
      if (await s.pg.getByRole('button', { name: 'Nova arte' }).count()) fails.push(`${dev}: designer vê Nova arte`)
      for (let n = 0; n < 5; n++) { const c = s.pg.locator('ul[aria-label="Fila do design por cliente"] > li > button[aria-expanded="false"]'); if (!(await c.count())) break; await c.first().click(); await s.pg.waitForTimeout(100) }
      const covers = await s.pg.getByText('Sem referência').count()
      if (covers !== 2) fails.push(`${dev}: ${covers} cartões com o lugar da imagem (esperado 2)`)
      if (!(await s.pg.getByText(/em \d dia/).count())) fails.push(`${dev}: designer não vê o tempo da arte`)
      await close(s, 'designer')

      // 3. Admin no Design: vê Prazos.
      s = await open('admin'); await s.pg.goto(BASE + '/conteudo/design', { waitUntil: 'networkidle' })
      if (!(await s.pg.getByRole('button', { name: 'Prazos' }).count())) fails.push(`${dev}: admin sem o botão Prazos`)
      await close(s, 'design-admin')
    } catch (e) { fails.push(`${dev}: ${e.message.split('\n')[0]}`) }
  }
  await b.close()
  console.log(fails.length ? 'FALHAS\n' + fails.join('\n') : 'Tudo certo')
  if (fails.length && process.env.STRICT) process.exit(1)
})()
