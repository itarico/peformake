// Auditoria de Social media e Design (19/11): passa por todas as telas do menu "Social Media" com dados FALSOS
// (nada vai ao banco nem à IA), no computador (1366x800) e no iPhone 13. Tira foto, lista erros do navegador,
// rolagem de lado, abas, títulos e botões de cada tela, e abre os pop-ups principais medindo a rolagem interna.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 SHOTS=pasta node e2e/social-auditoria.cjs
//   VAZIO=1 (sem peças nem pedidos, para ver os estados vazios)   STRICT=1 (sai com erro se algo falhar)
const { chromium, devices } = require('playwright')
const PORT = process.env.PORT || '5199'
const BASE = `http://localhost:${PORT}`
const SHOTS = process.env.SHOTS || 'e2e/capturas'; require('fs').mkdirSync(SHOTS, { recursive: true })
const now = Date.now()
const iso = (h) => new Date(now + h * 3600e3).toISOString()
const day = (d) => new Date(now + d * 864e5).toISOString().slice(0, 10)
const month = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) + '-01'
const C = [
  { id: 'c1', name: 'Padaria Sol', is_active: true, areas: ['design', 'social'], recurring: true },
  { id: 'c2', name: 'Doce Sabor Confeitaria Artesanal Ltda', is_active: true, areas: ['design'], recurring: true },
  { id: 'c3', name: 'Will Motos', is_active: true, areas: ['social', 'trafego'], recurring: true },
]
const S = [{ id: 's1', full_name: 'Ana Designer', main_role: 'designer' }, { id: 's2', full_name: 'Bruno Silva', main_role: 'designer' }, { id: 's3', full_name: 'Carla Social', main_role: 'social_media' }]
const base = { plan_id: 'p1', client_id: 'c1', kind: 'post', title: 'Promoção de Natal com panetone', headline: 'Panetone artesanal', subtitle: null, cta: 'Peça no WhatsApp', briefing: 'Fundo vermelho, foto do panetone aberto, clima de família. Usar a logo nova no canto.', caption: null, observations: null, reference_links: ['https://www.pinterest.com/pin/123'], publish_date: day(3), deadline: day(1), designer_id: 's1', is_extra: false, revision_note: null, revision_count: 0, legacy_final_urls: [], updated_at: iso(-20), piece_type: null, spec: {}, carousel_slides: [] }
let items = [
  { ...base, id: 'i1', number: 1, status: 'ready', design_due_at: iso(5) },
  { ...base, id: 'i2', number: 2, status: 'changes_requested', revision_note: 'Trocar a cor do fundo para dourado', revision_count: 1, design_due_at: iso(40) },
  { ...base, id: 'i3', number: 3, status: 'in_production', client_id: 'c2', plan_id: 'p2', designer_id: 's2', design_due_at: iso(-3), deadline: day(-1) },
  { ...base, id: 'i4', number: 4, status: 'ready', designer_id: null, design_due_at: iso(90), kind: 'carrossel', carousel_slides: [{ text: 'Capa' }, { text: '' }, { text: '' }] },
  { ...base, id: 'i5', number: 5, status: 'briefing', title: null, headline: null, briefing: null },
  { ...base, id: 'i6', number: 6, status: 'client_review' },
  { ...base, id: 'i7', number: 7, status: 'approved' },
  { ...base, id: 'i8', number: 8, status: 'review', client_id: 'c3', plan_id: 'p3' },
]
const plans = [{ id: 'p1', client_id: 'c1', month, notes: 'Natal e fim de ano. Oferta do panetone.', planned_at: null, sent_to_client_at: null }, { id: 'p2', client_id: 'c2', month, notes: null, planned_at: iso(-48), sent_to_client_at: null }, { id: 'p3', client_id: 'c3', month, notes: null, planned_at: null, sent_to_client_at: null }]
const files = [{ id: 'f1', item_id: 'i1', role: 'reference', path: 'i1/a.png', name: 'ref1.png', mime: 'image/png', size_bytes: 10, created_at: iso(-20) }, { id: 'f2', item_id: 'i6', role: 'final', path: 'i6/a.png', name: 'arte.png', mime: 'image/png', size_bytes: 10, created_at: iso(-2) }]
const tasks = [{ id: 't1', client_id: 'c1', title: 'Responder pedido de story do cliente', description: null, status: 'a_fazer', source: 'pedido_cliente', network: 'instagram', priority: true, due_date: day(1), ref_table: null, ref_id: null, created_at: iso(-5) }, { id: 't2', client_id: 'c3', title: 'Trocar a bio do Instagram', description: 'Vem da estratégia do mês', status: 'a_fazer', source: 'estrategia', network: 'instagram', priority: false, due_date: null, ref_table: null, ref_id: null, created_at: iso(-30) }]
let creative = [
  { id: 'r1', client_id: 'c1', source: 'manual', mode: 'agente', brief: 'Promoção de terça: 2 smash por R$ 39', formats: ['feed'], status: 'rendering', step: 'copy', error: null, item_ids: [], created_at: iso(-1), copy: {}, agent_notes: { log: ['Lendo o pedido', 'Escrevendo a copy'] } },
  { id: 'r2', client_id: 'c3', source: 'whatsapp', mode: 'agente', brief: 'Arte da revisão de moto', formats: ['feed', 'story'], status: 'done', step: 'pronto', error: null, item_ids: ['i6'], created_at: iso(-30), copy: { headline: 'Revisão completa', cta: 'Agende' }, agent_notes: { por_que: 'Foto real da oficina.' } },
  { id: 'r3', client_id: 'c2', source: 'manual', mode: 'agente', brief: 'Bolo de pote', formats: ['story'], status: 'failed', step: 'foto', error: 'Sem foto na pasta do cliente no Drive.', item_ids: [], created_at: iso(-50), copy: {}, agent_notes: {} },
  { id: 'r4', client_id: 'c1', source: 'manual', mode: 'modelo', brief: 'Pão de queijo', formats: ['feed'], status: 'done', step: null, error: null, item_ids: ['i7'], created_at: iso(-70), copy: { headline: 'Pão de queijo quentinho' }, agent_notes: {} },
]
const season = [
  { client_id: 'c1', client: 'Padaria Sol', niche: 'padaria', mine: true, season_key: 'natal', key: 'natal', name: 'Natal', date: day(36), days: 36, ask_by: day(20), prepare_from: day(10), idea: 'Mesa de Natal com panetone e a família.', kind: 'geral', request: null },
  { client_id: 'c3', client: 'Will Motos', niche: null, mine: false, season_key: 'natal', key: 'natal', name: 'Natal', date: day(36), days: 36, ask_by: day(20), prepare_from: day(10), idea: 'Mesa de Natal com panetone e a família.', kind: 'geral', request: { id: 'r1', status: 'rendering', step: 'arte' } },
  { client_id: 'c1', client: 'Padaria Sol', niche: 'padaria', mine: true, season_key: 'dia-padeiro', key: 'dia-padeiro', name: 'Dia do Padeiro', date: day(2), days: 2, ask_by: day(-1), prepare_from: day(-5), idea: 'Homenagem à equipe da cozinha.', kind: 'nicho', request: null },
]
if (process.env.VAZIO) { items = []; creative = []; tasks.length = 0; season.length = 0 }
const T = () => ({ content_items: items, content_files: files, content_plans: plans, content_events: [{ id: 'e1', item_id: 'i1', kind: 'status', from_status: 'briefing', to_status: 'ready', message: null, actor_name: 'Carla Social', created_at: iso(-10) }], social_tasks: tasks, staff_members: S.map((s) => ({ ...s, avatar_path: null, is_active: true })), creative_requests: creative, design_settings: [{ auto_enabled: true, auto_to_portal: true, drive_root_id: 'x', ai_takeover: false, ai_takeover_minutes: 10, hub_auto_reply: false, hub_reply_groups: false, drive_account_id: '', delivery_whatsapp: true }], google_accounts: [], client_team: [] })
const RPC = { production_clients: C, production_staff: S, my_staff_id: 's1', seasonal_board: season, dash_content: { by_status: { briefing: 1, ready: 2, in_production: 1, client_review: 1, approved: 1 }, total: 8, clients: 3, plans_ready: 1, plans_total: 3, late: 1, publish_next7: 2, designers: [] }, design_on_time: [{ designer_id: 's1', delivered: 9, on_time: 8, late: 1 }] }
function filt(rows, params) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue
    const m = /^(not\.)?(eq|neq|in|like|is)\.(.*)$/.exec(v); if (!m) continue
    const [, not, op, val] = m
    const vals = op === 'in' ? val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/"/g, '')) : [val]
    rows = rows.filter((r) => {
      const x = r[k] == null ? null : String(r[k])
      let ok = op === 'in' || op === 'eq' ? vals.includes(x) : op === 'neq' ? x !== val : op === 'is' ? (val === 'null' ? x == null : x === val) : op === 'like' ? new RegExp('^' + val.replace(/[%*]/g, '.*') + '$').test(x ?? '') : true
      return not ? !ok : ok
    })
  }
  return rows
}
const writes = []
async function mock(route) {
  const req = route.request(); const u = new URL(req.url())
  if (!u.hostname.endsWith('supabase.co')) return route.continue()
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(b) })
  if (req.method() === 'OPTIONS') return json({})
  const p = u.pathname
  if (p.startsWith('/storage/')) return json({ data: [] })
  if (p.startsWith('/rest/v1/rpc/')) { const fn = p.split('/').pop(); if (!(fn in RPC)) writes.push(fn); return json(fn in RPC ? RPC[fn] : null) }
  if (p.startsWith('/rest/v1/')) {
    if (req.method() !== 'GET') { writes.push(req.method() + ' ' + p); return json([]) }
    const rows = filt(T()[p.split('/').pop()] ?? [], [...u.searchParams])
    return json((req.headers()['accept'] || '').includes('vnd.pgrst.object') ? (rows[0] ?? null) : rows)
  }
  if (p.startsWith('/functions/')) { writes.push('fn ' + p); return json({}) }
  return route.fulfill({ status: 404, body: '' })
}
const sideScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
const measure = (p) => p.evaluate(() => {
  const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return null
  const b = d.querySelector(':scope > div > div.overflow-y-auto') || d
  return { sh: b.scrollHeight, ch: b.clientHeight, title: (d.querySelector('h2')?.textContent || '').trim() }
})
const PAGES = [
  ['planejamento', '/conteudo/planejamento'],
  ['planejamento-cliente', '/conteudo/planejamento?cliente=c1'],
  ['quadro', '/conteudo/quadro'],
  ['design', '/conteudo/design'],
  ['datas', '/conteudo/datas'],
  ['pedidos', '/conteudo/automatico'],
  ['peca-pronta', '/conteudo/peca/i1'],
  ['peca-briefing', '/conteudo/peca/i5'],
  ['peca-cliente', '/conteudo/peca/i6'],
  ['peca-revisao', '/conteudo/peca/i8'],
]
// Pop-ups: [tela, nome, como abrir]
const POPS = [
  ['/conteudo/quadro', 'pedir-arte', (p) => p.getByRole('button', { name: 'Pedir arte' }).first().click()],
  ['/conteudo/quadro', 'tarefa', async (p) => { if (await p.getByRole('tab', { name: /Tarefas/ }).isVisible()) await p.getByRole('tab', { name: /Tarefas/ }).click(); await p.getByText('Responder pedido de story do cliente').click() }],
  ['/conteudo/quadro', 'nova-tarefa', async (p) => { if (await p.getByRole('tab', { name: /Tarefas/ }).isVisible()) await p.getByRole('tab', { name: /Tarefas/ }).click(); await p.getByRole('button', { name: /^Tarefa$/ }).click() }],
  ['/conteudo/design', 'entregar', (p) => p.getByRole('button', { name: 'Entregar arte' }).first().click()],
  ['/conteudo/datas', 'nova-data', (p) => p.getByRole('button', { name: /Nova data/ }).click()],
  ['/conteudo/datas', 'mandar-design', (p) => p.getByRole('button', { name: 'Mandar para o design' }).first().click()],
  ['/conteudo/automatico', 'modelo-rapido', (p) => p.getByRole('button', { name: /modelo rápido/i }).click()],
  ['/conteudo/peca/i1', 'editar-peca', (p) => p.getByRole('button', { name: 'Editar' }).first().click()],
  ['/conteudo/peca/i8', 'pedir-ajuste', async (p) => { await p.getByRole('button', { name: 'Outras ações da peça' }).click(); await p.getByRole('menuitem', { name: 'Pedir ajuste' }).click() }],
  ['/conteudo/peca/i3', 'entregar-na-peca', (p) => p.getByRole('button', { name: 'Entregar arte' }).click()],
  ['/conteudo/planejamento?cliente=c1', 'pauta', (p) => p.getByRole('button', { name: 'Editar' }).click()],
  ['/conteudo/peca/i1', 'excluir', async (p) => { await p.getByRole('button', { name: 'Mais ações da peça' }).click(); await p.getByRole('menuitem', { name: 'Excluir peça' }).click() }],
]
;(async () => {
  const b = await chromium.launch(); let fails = 0
  const bad = (m) => { fails++; console.log('  FALHOU ' + m) }
  for (const [dev, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    for (const role of (process.env.ROLES || 'admin,designer').split(',')) {
      const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock)
      await ctx.addInitScript((r) => localStorage.setItem('e2e_roles', r), role)
      const p = await ctx.newPage(); const errs = []
      p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)))
      p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load|404|net::/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)) })
      for (const [name, path] of (role === 'designer' ? PAGES.filter(([n]) => ['design', 'quadro', 'peca-pronta'].includes(n)) : PAGES)) {
        errs.length = 0
        await p.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(900)
        await p.screenshot({ path: `${SHOTS}/soc-${name}-${dev}-${role}.png`, fullPage: true })
        const info = await p.evaluate(() => {
          const main = document.querySelector('main') || document.body
          const tabs = [...main.querySelectorAll('[role=tab], nav a')].filter((x) => x.offsetParent).map((t) => t.textContent.trim() + (t.getAttribute('aria-selected') === 'true' || t.getAttribute('aria-current') === 'page' ? '*' : ''))
          const btns = [...main.querySelectorAll('button, a')].filter((x) => x.offsetParent).map((x) => (x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 32)).filter(Boolean)
          const h = [...main.querySelectorAll('h1,h2,h3')].filter((x) => x.offsetParent).map((x) => x.textContent.trim().slice(0, 50))
          return { url: location.pathname + location.search, tabs, h: h.slice(0, 12), btns: btns.slice(0, 50), status: [...main.querySelectorAll('[role=status],[role=alert]')].map((x) => x.textContent.trim().slice(0, 80)) }
        })
        const side = await sideScroll(p).catch(() => false)
        console.log(`\n### ${dev} ${role} ${name} -> ${info.url}${side ? ' [ROLAGEM DE LADO]' : ''}`)
        if (side) bad(`${dev} ${name}: rolagem de lado`)
        console.log('abas:', info.tabs.join(' | '))
        console.log('títulos:', info.h.join(' | '))
        if (info.status.length) console.log('status:', info.status.join(' | '))
        console.log('botões:', info.btns.join(' · '))
        if (errs.length) { bad(`${dev} ${name}: erros`); console.log('ERROS:', [...new Set(errs)].join(' || ')) }
      }
      if (role === 'admin') {
        console.log(`\n=== pop-ups ${dev}`)
        for (const [path, name, open] of POPS) {
          await p.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(800)
          try { await open(p); await p.waitForTimeout(500) } catch (e) { bad(`${dev} pop-up ${name}: não abriu (${String(e.message).split('\n')[0].slice(0, 90)})`); continue }
          const m = await measure(p)
          if (!m) { bad(`${dev} pop-up ${name}: nenhum pop-up aberto`); await p.screenshot({ path: `${SHOTS}/soc-pop-${name}-${dev}.png` }); continue }
          await p.screenshot({ path: `${SHOTS}/soc-pop-${name}-${dev}.png` })
          console.log(`${name}: "${m.title}" ${m.sh}/${m.ch}${m.sh > m.ch ? ' ROLA' : ''}`)
          if (m.sh > m.ch) bad(`${dev} pop-up ${name} rola (${m.sh} > ${m.ch})`)
        }
      }
      await ctx.close()
    }
  }
  await b.close()
  console.log('\nGravações tentadas (mock, nada foi ao banco):', [...new Set(writes)].join(', ') || 'nenhuma')
  console.log(fails ? `${fails} problema(s)` : 'Tudo certo')
  process.exit(process.env.STRICT && fails ? 1 : 0)
})()
