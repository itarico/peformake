// Audiovisual (24/11): painel de clientes ao lado da agenda, entrega no calendário e quadro de Tarefas. Dados FALSOS no navegador.
// 1. Agenda: painel "Clientes" com abas Fixos e Avulsos; quem passou de 30 dias sem gravar vem primeiro e em destaque;
//    quem já tem gravação marcada mostra o dia; a entrega aparece no calendário no dia do prazo.
// 2. Tocar num cliente sem gravação abre "Agendar gravação" já com ele.
// 3. Tarefas: A fazer · Fazendo · Feito; a tarefa de entrega criada pelo sistema leva ao projeto; Começar muda a etapa; Nova tarefa sem rolagem.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 OUT=pasta node e2e/av-agenda-tarefas.cjs
const { chromium, devices } = require('playwright')
const fs = require('fs'); const path = require('path')
const PORT = process.env.PORT || '5199'; const BASE = `http://localhost:${PORT}`
const OUT = process.env.OUT || 'e2e/capturas/av'; fs.mkdirSync(OUT, { recursive: true })
const now = new Date(); const sp = (d) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const today = sp(now); const month = today.slice(0, 7) + '-01'
const lastDay = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate()
const dayN = (n) => `${today.slice(0, 8)}${String(Math.min(n, lastDay)).padStart(2, '0')}`
const shootDay = dayN(Math.min(Number(today.slice(8)) + 1, lastDay)); const dueDay = dayN(Math.min(Number(today.slice(8)) + 2, lastDay))
const C = [
  { id: 'c1', name: 'Padaria Sol', is_active: true, areas: ['audiovisual'], recurring: true },
  { id: 'c2', name: 'Will Motos', is_active: true, areas: ['audiovisual'], recurring: true },
  { id: 'c3', name: 'Auto Nunes', is_active: true, areas: ['audiovisual'], recurring: true },
  { id: 'c4', name: 'Casamento Ana', is_active: true, areas: ['audiovisual'], recurring: false },
]
const panel = [
  { id: 'c1', name: 'Padaria Sol', logo_path: null, fixed: true, last_shoot: null, next_shoot: `${shootDay}T17:00:00Z`, next_project: 'p1', shoots_month: 1, shoots_total: 3, days_since: 12 },
  { id: 'c2', name: 'Will Motos', logo_path: null, fixed: true, last_shoot: '2026-10-01T12:00:00Z', next_shoot: null, next_project: null, shoots_month: 0, shoots_total: 2, days_since: 41 },
  { id: 'c3', name: 'Auto Nunes', logo_path: null, fixed: true, last_shoot: null, next_shoot: null, next_project: null, shoots_month: 1, shoots_total: 4, days_since: 4 },
  { id: 'c4', name: 'Casamento Ana', logo_path: null, fixed: false, last_shoot: null, next_shoot: null, next_project: null, shoots_month: 0, shoots_total: 0, days_since: null },
]
const project = { id: 'p1', client_id: 'c1', kind: 'monthly', month, title: 'Vídeos do mês', status: 'scheduled', briefing: null, script: null, video_count: 4, format: null, reference_links: [], shoot_at: `${shootDay}T17:00:00Z`, shoot_end_at: `${shootDay}T20:00:00Z`, location: 'Boa Viagem', shoot_notes: null, videomaker_id: null, editor_id: null, raw_link: null, final_link: null, due_date: dueDay, revision_note: null, revision_count: 0, updated_at: now.toISOString(), script_status: 'aprovado', script_note: null, shoot_duration_min: 180, scriptwriter_id: null, owner_id: null, shoot_confirmed_at: null, checkin_at: null, checkin_distance_m: null, checkout_at: null, raw_sent_at: null, raw_links: [], edit_due_at: null, staff_token: null, google_event_id: null, location_lat: null, location_lng: null }
let tasks; const fails = []; const saves = []
const reset = () => { saves.length = 0; tasks = [
  { id: 't1', area: 'audiovisual', client_id: 'c1', title: 'Entregar vídeos de Padaria Sol', description: null, status: 'a_fazer', source: 'sistema', priority: false, due_date: dueDay, ref_table: 'av_projects', ref_id: 'p1', created_at: now.toISOString() },
  { id: 't2', area: 'audiovisual', client_id: null, title: 'Marcar reunião com a Thyfany', description: null, status: 'fazendo', source: 'manual', priority: true, due_date: null, ref_table: null, ref_id: null, created_at: now.toISOString() },
] }
async function mock(route) {
  const req = route.request(); const u = new URL(req.url())
  if (!u.hostname.endsWith('supabase.co')) return route.continue()
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: h, body: JSON.stringify(b) })
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' })
  const p = u.pathname; const body = (() => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } })()
  if (p.includes('/functions/v1/av-calendar')) return json({ events: [], problems: [] })
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop()
    if (fn === 'team_task_save') { saves.push(body); const t = tasks.find((x) => x.id === body._id); if (t && body._data.status) t.status = body._data.status; return json(body._id ?? 'novo') }
    return json({ production_clients: C, production_staff: [], my_staff_id: null, av_clients_panel: panel }[fn] ?? null)
  }
  if (p.startsWith('/rest/v1/')) {
    const T = { av_projects: [project], team_tasks: tasks, google_accounts: [], av_settings: [{ delivery_days: 3, edit_hours: 24, raw_until_hour: 18, default_duration_min: 180, checkin_radius_m: 400, calendar_account_ids: [], notify_client: true, notify_team: true, auto_client_whatsapp: true }] }
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
    reset()
    const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock)
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.setDefaultTimeout(8000)
    const shot = async (name) => { if (await sideScroll(pg)) fails.push(`${dev} ${name}: rolagem de lado`); await pg.screenshot({ path: path.join(OUT, `${dev}-${name}.png`), fullPage: true }) }
    try {
      await pg.goto(BASE + '/audiovisual', { waitUntil: 'networkidle' }); await pg.waitForTimeout(500)
      const names = await pg.locator('aside[aria-labelledby="clientes-av"] li span.font-medium').allInnerTexts()
      if (names.join() !== 'Will Motos,Auto Nunes,Padaria Sol') fails.push(`${dev}: ordem dos fixos = ${names.join()}`)
      for (const t of ['1 para agendar', 'Gravou há 41 dias: marcar com urgência', 'Gravou há 4 dias', /Gravação dia \d\d\/\d\d/, 'Fixos', 'Avulsos']) if (!(await pg.locator('aside[aria-labelledby="clientes-av"]').getByText(t).first().count())) fails.push(`${dev}: painel sem "${t}"`)
      if (dueDay !== shootDay && !(await pg.getByText('Entrega · Padaria Sol').first().count())) fails.push(`${dev}: entrega não aparece no calendário`)
      await shot('1-agenda')
      await pg.getByRole('tab', { name: /Avulsos/ }).click(); await pg.waitForTimeout(200)
      if (!(await pg.getByText('Casamento Ana').count()) || (await pg.locator('aside[aria-labelledby="clientes-av"]').getByText('Will Motos').count())) fails.push(`${dev}: aba Avulsos errada`)
      await pg.getByRole('tab', { name: /Fixos/ }).click()
      await pg.getByRole('button', { name: 'Agendar gravação de Will Motos' }).click(); await pg.waitForTimeout(500)
      if (!(await pg.locator('dialog[open]').count())) fails.push(`${dev}: tocar no cliente não abriu o agendamento`)
      if (await popupScrolls(pg)) fails.push(`${dev}: pop-up de agendar rola`)
      await pg.screenshot({ path: path.join(OUT, `${dev}-pop-agendar.png`) }); await pg.keyboard.press('Escape')

      await pg.goto(BASE + '/audiovisual/tarefas', { waitUntil: 'networkidle' }); await pg.waitForTimeout(400)
      if (!(await pg.getByRole('link', { name: 'Tarefas', exact: true }).count())) fails.push(`${dev}: sem a aba Tarefas no audiovisual`)
      for (const t of ['Entregar vídeos de Padaria Sol', 'Sistema sugeriu', 'Marcar reunião com a Thyfany', 'Minha']) if (!(await pg.getByText(t).first().count())) fails.push(`${dev}: tarefas sem "${t}"`)
      await pg.locator('li', { hasText: 'Entregar vídeos de Padaria Sol' }).getByRole('button', { name: 'Começar' }).click(); await pg.waitForTimeout(500)
      if (saves[0]?._id !== 't1' || saves[0]?._data.status !== 'fazendo') fails.push(`${dev}: Começar não mudou a etapa (${JSON.stringify(saves[0])})`)
      const href = await pg.locator('li', { hasText: 'Entregar vídeos de Padaria Sol' }).getByRole('link', { name: /Abrir/ }).getAttribute('href')
      if (href !== '/audiovisual/projeto/p1') fails.push(`${dev}: tarefa de entrega não leva ao projeto (${href})`)
      await pg.getByRole('button', { name: 'Tarefa', exact: true }).click(); await pg.waitForTimeout(350)
      if (await popupScrolls(pg)) fails.push(`${dev}: pop-up Nova tarefa rola`)
      await pg.getByLabel('O que fazer').fill('Marcar reunião com o cliente na quinta'); await pg.screenshot({ path: path.join(OUT, `${dev}-pop-tarefa.png`) })
      await pg.getByRole('button', { name: 'Salvar' }).click(); await pg.waitForTimeout(500)
      const novo = saves.find((x) => x._id === null)
      if (!novo || novo._area !== 'audiovisual' || novo._data.title !== 'Marcar reunião com o cliente na quinta') fails.push(`${dev}: nova tarefa salva errada (${JSON.stringify(novo)})`)
      await shot('2-tarefas')
    } catch (e) { fails.push(`${dev}: ${e.message.split('\n')[0]}`) }
    if (errs.length) fails.push(`${dev}: erro no navegador: ${errs[0]}`)
    await ctx.close()
  }
  await b.close()
  console.log(fails.length ? 'FALHAS\n' + fails.join('\n') : 'Tudo certo')
  if (fails.length && process.env.STRICT) process.exit(1)
})()
