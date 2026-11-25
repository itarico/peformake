// Fluxo de ponta a ponta de Social media e Design (21/11), com dados FALSOS no navegador (nada vai ao banco nem ao WhatsApp).
// 1. Social media pede a arte no pop-up "Nova arte" (vai direto para o designer, status ready).
// 2. Designer abre a fila do Design, abre o briefing (marca Em produção) e "Entregar arte" com o arquivo (status client_review).
// 3. Cliente abre o link do aviso (/portal#<código>/aprovar): mesmo com briefing incompleto e perguntas do mês,
//    NÃO cai na conversa obrigatória; vê a arte e aprova (status approved).
// 4. Social media abre a peça e marca como publicada (status published).
// Em cada tela: sem erro no navegador, sem rolagem de lado, pop-up sem rolagem interna.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 OUT=pasta node e2e/social-fluxo.cjs
const { chromium, devices } = require('playwright')
const fs = require('fs'); const path = require('path')
const PORT = process.env.PORT || '5199'; const BASE = `http://localhost:${PORT}`
const OUT = process.env.OUT || 'e2e/capturas/fluxo'; fs.mkdirSync(OUT, { recursive: true })
const TOKEN = 'aB3_-'.repeat(8) + 'xyz'
const now = Date.now(); const iso = (h) => new Date(now + h * 3600e3).toISOString(); const day = (d) => new Date(now + d * 864e5).toISOString().slice(0, 10)
const month = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) + '-01'
const C = [{ id: 'c1', name: 'Padaria Sol', is_active: true, areas: ['design', 'social'], recurring: true }]
const S = [{ id: 's1', full_name: 'Ana Designer', main_role: 'designer' }, { id: 's3', full_name: 'Carla Social', main_role: 'social_media' }]
const base = { plan_id: 'p1', client_id: 'c1', kind: 'post', subtitle: null, caption: null, observations: null, reference_links: [], publish_date: day(4), deadline: day(2), designer_id: 's1', is_extra: false, revision_note: null, revision_count: 0, legacy_final_urls: [], updated_at: iso(-3), piece_type: null, spec: {}, carousel_slides: [], design_due_at: null, priority: false, headline: null, cta: null }
let items; let files; let events; let newId
const plans = [{ id: 'p1', client_id: 'c1', month, notes: 'Natal.', planned_at: null, sent_to_client_at: null }]
const reset = () => { items = []; files = []; events = []; newId = 0 }
const RPC = { production_clients: C, production_staff: S, my_staff_id: 's1', seasonal_board: [],
  social_clients_board: [{ id: 'c1', name: 'Padaria Sol', logo_path: null, legacy_logo_url: null, owed: 8, planned: 0, approved: 0, review: 0, no_brief: 0, suggestions: 0, tasks: 0 }] }
const fails = []; const calls = []
function filt(rows, params) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'or'].includes(k)) continue
    const m = /^(not\.)?(eq|neq|in|is)\.(.*)$/.exec(v); if (!m) continue
    const [, not, op, val] = m; const vals = op === 'in' ? val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/"/g, '')) : [val]
    rows = rows.filter((r) => { const x = r[k] == null ? null : String(r[k]); const ok = op === 'is' ? (val === 'null' ? x === null : true) : op === 'neq' ? x !== val : vals.includes(x); return not ? !ok : ok })
  }
  return rows
}
async function mock(route) {
  const req = route.request(); const u = new URL(req.url())
  if (!u.hostname.endsWith('supabase.co')) return route.continue()
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: h, body: JSON.stringify(b) })
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' })
  const p = u.pathname
  if (p.startsWith('/storage/')) return json({ Key: 'x', data: [] })
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop(); const body = JSON.parse(req.postData() || '{}'); calls.push(fn)
    const set = (id, st) => { const it = items.find((x) => x.id === id); if (it) { events.push({ id: 'e' + events.length, item_id: id, kind: 'status', from_status: it.status, to_status: st, message: null, actor_name: 'Equipe', created_at: new Date().toISOString() }); it.status = st; it.updated_at = new Date().toISOString() } }
    if (fn === 'content_plan_ensure') return json('p1')
    if (fn === 'content_item_save') { const d = body._data || {}; const id = 'n' + (++newId); items.push({ ...base, id, number: items.length + 1, status: 'briefing', title: d.title, briefing: d.briefing, kind: d.kind || 'post', publish_date: d.publish_date || null, headline: d.headline || null, carousel_slides: d.carousel_slides || [], spec: d.spec || {} }); return json(id) }
    if (fn === 'content_item_set_status') { set(body._item_id, body._status); return json(null) }
    if (fn === 'content_file_register') { files.push({ id: 'f' + files.length, item_id: body._item_id, role: body._role, path: body._path, name: body._name, mime: body._mime, size_bytes: 1, created_at: new Date().toISOString() }); return json(null) }
    if (fn === 'portal_get') return json({ name: 'Padaria Sol', segment: 'Padaria', logo_path: null, services: ['Social media'], team: [], has_traffic: false })
    if (fn === 'portal_brief') return json({ data: {}, known: { segment: 'Padaria' }, links: [], voz: null, rivals: null, has_video: false, docs: [], questions: [{ id: 'q1', question: 'Qual a meta de dezembro?', why: null, options: ['Vender mais'], cond: null, answer: null, status: 'pendente', answered_via: null }], brand: 'peformake', nps_done: true })
    if (fn === 'portal_content') return json({ items: items.filter((i) => ['client_review', 'changes_requested', 'approved', 'published'].includes(i.status)).map((i) => ({ id: i.id, number: i.number, kind: i.kind, status: i.status, title: i.title, caption: null, publish_date: i.publish_date, month, revision_note: null, files: files.filter((f) => f.item_id === i.id && f.role === 'final').map((f) => ({ path: f.path, mime: f.mime, name: f.name })), legacy_urls: [] })), videos: [] })
    if (fn === 'portal_content_decide') { if (body._token !== TOKEN) return json({ message: 'Link invalido', code: 'PF007' }, 400); set(body._item_id, body._approve ? 'approved' : 'changes_requested'); return json(null) }
    return json(fn in RPC ? RPC[fn] : null)
  }
  if (p.startsWith('/rest/v1/')) {
    const T = { content_items: items, content_plans: plans, content_files: files, content_events: events, social_tasks: [], staff_members: S.map((s) => ({ ...s, avatar_path: null, is_active: true })), design_settings: [{ delivery_whatsapp: true, sla_hours: {} }] }
    const rows = filt(T[p.split('/').pop()] ?? [], [...u.searchParams])
    if ((req.headers()['accept'] || '').includes('vnd.pgrst.object')) return json(rows[0] ?? null)
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...h, 'content-range': `0-${rows.length}/${rows.length}` }, body: JSON.stringify(rows) })
  }
  return route.fulfill({ status: 404, body: '' })
}
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
const popupScrolls = (p) => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return false; return [...d.querySelectorAll('*')].some((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)) })
const status = (id) => items.find((x) => x.id === id)?.status

;(async () => {
  const b = await chromium.launch()
  const png = path.join(OUT, 'arte.png')
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'))
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    reset()
    const open = async (role) => {
      const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock)
      if (role) await ctx.addInitScript((r) => localStorage.setItem('e2e_roles', r), role)
      const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); return { ctx, pg, errs }
    }
    const done = async ({ ctx, pg, errs }, where) => {
      if (await sideScroll(pg)) fails.push(`${dev} ${where}: rolagem de lado`)
      if (errs.length) fails.push(`${dev} ${where}: erro ${errs[0]}`)
      await pg.screenshot({ path: path.join(OUT, `${dev}-${where}.png`), fullPage: true }); await ctx.close()
    }
    try {
      // 1. Social media pede a arte.
      let s = await open('admin')
      // 24/11: o briefing nasce dentro do cliente, por etapas (formato, texto, material).
      await s.pg.goto(BASE + '/conteudo/cliente/c1', { waitUntil: 'networkidle' })
      await s.pg.getByRole('button', { name: 'Novo briefing' }).first().click(); await s.pg.waitForTimeout(400)
      if (await popupScrolls(s.pg)) fails.push(`${dev}: pop-up Novo briefing rola`)
      // Carrossel por etapas (25/11): quantos cards, texto e foto de cada card, briefing geral, material e publicar.
      await s.pg.getByRole('radio', { name: 'Carrossel' }).click(); await s.pg.waitForTimeout(200)
      await s.pg.getByRole('radio', { name: '3' }).click()
      await s.pg.getByRole('button', { name: 'Continuar' }).click(); await s.pg.waitForTimeout(150)
      for (const [n, t] of [[1, 'Os 3 sabores de panetone'], [2, 'Chocolate, frutas e doce de leite'], [3, 'Peça no WhatsApp']]) {
        await s.pg.getByLabel(`Texto do card ${n}`).fill(t)
        if (!(await s.pg.getByRole('button', { name: `Foto de referência do card ${n}` }).count())) fails.push(`${dev}: card ${n} sem foto de referência`)
        if (await popupScrolls(s.pg)) fails.push(`${dev}: pop-up do card ${n} rola`)
        await s.pg.getByRole('button', { name: 'Continuar' }).click(); await s.pg.waitForTimeout(150)
      }
      await s.pg.getByLabel('Briefing geral do carrossel').fill('Carrossel com os 3 sabores de panetone e o preço de cada um.')
      if (await popupScrolls(s.pg)) fails.push(`${dev}: pop-up Novo briefing (texto) rola`)
      await s.pg.getByRole('button', { name: 'Continuar' }).click(); await s.pg.waitForTimeout(150)
      if (await popupScrolls(s.pg)) fails.push(`${dev}: pop-up Novo briefing (fotos) rola`)
      await s.pg.getByRole('button', { name: 'Continuar' }).click(); await s.pg.waitForTimeout(150)
      await s.pg.getByRole('button', { name: 'Mandar para o design' }).click(); await s.pg.waitForTimeout(1200)
      const id = items[0]?.id
      if (status(id) !== 'ready') fails.push(`${dev}: pedido não foi para o design (status ${status(id)})`)
      if (!s.pg.url().includes('/conteudo/cliente/c1')) fails.push(`${dev}: depois de pedir, saiu da tela do cliente (${s.pg.url()})`)
      await done(s, '1-pedido')

      // 2. Designer produz e entrega.
      s = await open('designer')
      await s.pg.goto(BASE + '/conteudo/design', { waitUntil: 'networkidle' })
      // Clientes começam fechados (24/11): abre o grupo. Sem "Comecei": abrir o briefing já marca Em produção.
      for (let n = 0; n < 20; n++) { const g = s.pg.locator('ul[aria-label="Fila do design por cliente"] > li > button[aria-expanded="false"]'); if (!(await g.count())) break; await g.first().click(); await s.pg.waitForTimeout(100) }
      const card = s.pg.locator('li', { hasText: 'Carrossel com os 3 sabores' }).last()
      await card.getByRole('button', { name: /Abrir o briefing/ }).click(); await s.pg.waitForTimeout(700)
      if (status(id) !== 'in_production') fails.push(`${dev}: abrir o briefing não marcou em produção (${status(id)})`)
      if (await popupScrolls(s.pg)) fails.push(`${dev}: pop-up do briefing no Design rola`)
      if (await s.pg.getByRole('button', { name: 'Salvar' }).count()) fails.push(`${dev}: designer consegue editar o briefing`)
      // Dossiê (25/11): tudo numa tela, só para ver e baixar; nenhum campo para digitar.
      const dos = await s.pg.locator('dialog[open]').innerText()
      if (!dos.includes('Card 1:') || !dos.includes('Os 3 sabores de panetone') || !dos.includes('Carrossel · 3 cards')) fails.push(`${dev}: dossiê sem os cards (${dos.slice(0, 200)})`)
      if (await s.pg.locator('dialog[open] input, dialog[open] textarea').count()) fails.push(`${dev}: dossiê tem campo editável`)
      await s.pg.keyboard.press('Escape'); await s.pg.waitForTimeout(300)
      await card.getByRole('button', { name: 'Entregar arte' }).click(); await s.pg.waitForTimeout(400)
      if (await popupScrolls(s.pg)) fails.push(`${dev}: pop-up Entregar arte rola`)
      await s.pg.setInputFiles('#entrega-arquivo', png); await s.pg.waitForTimeout(300)
      await s.pg.getByRole('button', { name: 'Entregar ao cliente' }).click(); await s.pg.waitForTimeout(1200)
      if (status(id) !== 'client_review') fails.push(`${dev}: entrega não foi ao cliente (${status(id)})`)
      if (!files.some((f) => f.item_id === id && f.role === 'final')) fails.push(`${dev}: arte final não foi registrada`)
      await done(s, '2-entrega')

      // 3. Cliente aprova pelo link do aviso.
      s = await open(null)
      await s.pg.goto(`${BASE}/portal#${TOKEN}/aprovar`); await s.pg.waitForTimeout(1500)
      if (await s.pg.locator('[data-portal-chat]').count()) fails.push(`${dev}: link /aprovar caiu na conversa obrigatória`)
      const approvals = s.pg.getByRole('heading', { name: 'Artes e vídeos' })
      if (!(await approvals.count())) fails.push(`${dev}: portal não mostrou "Artes e vídeos"`)
      else if (!(await approvals.isVisible())) fails.push(`${dev}: "Artes e vídeos" não está na tela`)
      const inView = await s.pg.evaluate(() => { const h = document.getElementById('aprovar'); if (!h) return false; const r = h.getBoundingClientRect(); return r.top >= -5 && r.top < window.innerHeight })
      if (!inView) fails.push(`${dev}: o portal não rolou até as aprovações`)
      await s.pg.getByRole('button', { name: 'Aprovar', exact: true }).first().click(); await s.pg.waitForTimeout(1000)
      if (status(id) !== 'approved') fails.push(`${dev}: aprovação do cliente não gravou (${status(id)})`)
      await done(s, '3-portal')

      // 4. Social media publica.
      s = await open('admin')
      await s.pg.goto(`${BASE}/conteudo/peca/${id}`, { waitUntil: 'networkidle' })
      await s.pg.getByRole('button', { name: 'Marcar como publicado' }).click(); await s.pg.waitForTimeout(800)
      if (status(id) !== 'published') fails.push(`${dev}: não marcou publicado (${status(id)})`)
      await done(s, '4-publicado')
      console.log(`${dev}: fluxo ${items.map((i) => i.status).join(',')}`)
    } catch (e) { fails.push(`${dev}: parou: ${e.message.split('\n')[0]}`) }
  }
  await b.close()
  console.log(fails.length ? 'FALHAS:\n- ' + fails.join('\n- ') : 'OK: pedir, produzir, entregar, cliente aprovar e publicar (computador e iPhone)')
  process.exit(fails.length ? 1 : 0)
})()
