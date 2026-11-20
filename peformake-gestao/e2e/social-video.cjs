// Vídeo do fluxo de Social media e Design (19/11), com dados FALSOS no navegador (nada vai ao banco, ninguém é avisado).
// Mostra: arte aprovada na estratégia chega como briefing → social media manda ao design → designer começa e entrega →
// a peça vai para "Com o cliente" (portal + aviso no WhatsApp no sistema real) → pedido avulso pelo pop-up "Nova arte".
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 OUT=pasta node e2e/social-video.cjs
//   DEV=iphone para gravar no celular (padrão: computador 1366x800).
const { chromium, devices } = require('playwright')
const fs = require('fs'); const path = require('path')
const PORT = process.env.PORT || '5199'; const BASE = `http://localhost:${PORT}`
const OUT = process.env.OUT || 'e2e/capturas/video'; fs.mkdirSync(OUT, { recursive: true })
const now = Date.now(); const iso = (h) => new Date(now + h * 3600e3).toISOString(); const day = (d) => new Date(now + d * 864e5).toISOString().slice(0, 10)
const month = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) + '-01'
const C = [{ id: 'c1', name: 'Padaria Sol', is_active: true, areas: ['design', 'social'], recurring: true }, { id: 'c3', name: 'Will Motos', is_active: true, areas: ['social'], recurring: true }]
const S = [{ id: 's1', full_name: 'Ana Designer', main_role: 'designer' }, { id: 's3', full_name: 'Carla Social', main_role: 'social_media' }]
const base = { plan_id: 'p1', client_id: 'c1', kind: 'post', subtitle: null, caption: null, observations: null, reference_links: [], publish_date: day(4), deadline: day(2), designer_id: 's1', is_extra: false, revision_note: null, revision_count: 0, legacy_final_urls: [], updated_at: iso(-3), piece_type: null, spec: {}, carousel_slides: [], design_due_at: null }
const items = [
  { ...base, id: 'i1', number: 1, status: 'briefing', title: 'Natal: mesa da família com panetone', headline: 'O Natal tem cheiro de pão', cta: 'Encomende no WhatsApp', briefing: 'Ideia: mesa de Natal com o panetone da casa.\n\nVeio da Estratégia do mês.' },
  { ...base, id: 'i2', number: 2, status: 'in_production', title: 'Combo café da manhã', headline: 'Café + pão na chapa', cta: 'Peça já', briefing: 'Foto do combo na bancada.', design_due_at: iso(6) },
  { ...base, id: 'i3', number: 3, status: 'approved', title: 'Pão de queijo quentinho', headline: 'Saiu agora', cta: 'Venha', briefing: 'Foto do forno.' },
]
const plans = [{ id: 'p1', client_id: 'c1', month, notes: 'Natal e fim de ano. Oferta do panetone.', planned_at: null, sent_to_client_at: null }]
const files = []
const events = []
const RPC = { production_clients: C, production_staff: S, my_staff_id: 's1', seasonal_board: [], design_on_time: [{ designer_id: 's1', delivered: 9, on_time: 8, late: 1 }] }
let newId = 0
function filt(rows, params) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue
    const m = /^(not\.)?(eq|neq|in|like)\.(.*)$/.exec(v); if (!m) continue
    const [, not, op, val] = m; const vals = op === 'in' ? val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/"/g, '')) : [val]
    rows = rows.filter((r) => { const x = r[k] == null ? null : String(r[k]); const ok = op === 'neq' ? x !== val : op === 'like' ? true : vals.includes(x); return not ? !ok : ok })
  }
  return rows
}
async function mock(route) {
  const req = route.request(); const u = new URL(req.url())
  if (!u.hostname.endsWith('supabase.co')) return route.continue()
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(b) })
  if (req.method() === 'OPTIONS') return json({})
  const p = u.pathname
  if (p.startsWith('/storage/')) return json({ Key: 'x', data: [] })
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop(); const body = JSON.parse(req.postData() || '{}')
    if (fn === 'content_item_set_status') {
      const it = items.find((x) => x.id === body._item_id)
      if (it) { events.push({ id: 'e' + events.length, item_id: it.id, kind: 'status', from_status: it.status, to_status: body._status, message: body._note, actor_name: 'Equipe', created_at: new Date().toISOString() }); it.status = body._status; it.updated_at = new Date().toISOString(); if (body._status === 'ready') it.design_due_at = iso(24) }
      return json(null)
    }
    if (fn === 'content_plan_ensure') return json('p1')
    if (fn === 'content_item_save') {
      const d = body._data || {}; const id = 'n' + (++newId)
      items.push({ ...base, id, number: items.length + 1, status: 'briefing', title: d.title, headline: d.headline || null, cta: d.cta || null, briefing: d.briefing, kind: d.kind || 'post', publish_date: d.publish_date || null, updated_at: new Date().toISOString() })
      return json(id)
    }
    if (fn === 'content_file_register') { files.push({ id: 'f' + files.length, item_id: body._item_id, role: body._role, path: body._path, name: body._name, mime: body._mime, size_bytes: 1, created_at: new Date().toISOString() }); return json(null) }
    return json(fn in RPC ? RPC[fn] : null)
  }
  if (p.startsWith('/rest/v1/')) {
    const T = { content_items: items, content_plans: plans, content_files: files, content_events: events, social_tasks: [], staff_members: S.map((s) => ({ ...s, avatar_path: null, is_active: true })), design_settings: [{ delivery_whatsapp: true }] }
    const rows = filt(T[p.split('/').pop()] ?? [], [...u.searchParams])
    return json((req.headers()['accept'] || '').includes('vnd.pgrst.object') ? (rows[0] ?? null) : rows)
  }
  return route.fulfill({ status: 404, body: '' })
}
// Legenda grande no rodapé, para o vídeo se explicar sozinho.
const say = async (p, text, ms = 2600) => {
  await p.evaluate((t) => {
    let el = document.getElementById('pf-legenda')
    if (!el) { el = document.createElement('div'); el.id = 'pf-legenda'; el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;max-width:min(860px,92vw);background:#0B3C44;color:#fff;font:600 18px/1.35 system-ui,sans-serif;padding:14px 20px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.35);text-align:center;pointer-events:none'; document.body.appendChild(el) }
    el.textContent = t
  }, text)
  await p.waitForTimeout(ms)
}
;(async () => {
  const dev = process.env.DEV === 'iphone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 800 } }
  const size = process.env.DEV === 'iphone' ? { width: 390, height: 844 } : { width: 1366, height: 800 }
  const b = await chromium.launch({ slowMo: 120 })
  const ctx = await b.newContext({ ...dev, colorScheme: 'light', recordVideo: { dir: OUT, size } })
  await ctx.route('**/*', mock)
  const p = await ctx.newPage()
  const png = path.join(OUT, 'arte-final.png')
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'))

  await p.goto(BASE + '/conteudo/quadro', { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  await say(p, '1. Peças: o que está parado aparece no topo; o quadro tem Tarefas, Briefings, Produção e Aprovado.', 3500)
  await say(p, 'A arte aprovada na Estratégia do mês já chegou como briefing para a social media.', 3000)
  if (await p.getByRole('tab', { name: /Briefings/ }).isVisible()) await p.getByRole('tab', { name: /Briefings/ }).click()
  await p.getByText('Natal: mesa da família com panetone').click(); await p.waitForTimeout(1200)
  await say(p, '2. A social media confere o briefing (Editar completa o que faltar) e manda para o design.', 3200)
  await p.getByRole('button', { name: 'Mandar para o design' }).click(); await p.waitForTimeout(1200)
  await say(p, 'Pronto: foi para o designer fixo do cliente, que é avisado na hora. O prazo começa a correr.', 3000)

  await p.goto(BASE + '/conteudo/design', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000)
  await say(p, '3. Design: a fila do designer, por cliente, com o tempo que falta para entregar cada arte.', 3500)
  const card = p.locator('li', { hasText: 'Natal: mesa da família com panetone' }).last()
  await card.getByRole('button', { name: 'Comecei' }).click(); await p.waitForTimeout(900)
  await say(p, 'Ao tocar em "Comecei", a arte fica Em produção e o tempo de trabalho começa a contar.', 2800)
  await card.getByRole('button', { name: 'Entregar arte' }).click(); await p.waitForTimeout(800)
  await p.setInputFiles('#entrega-arquivo', png); await p.waitForTimeout(600)
  await say(p, '4. Entregar arte: escolhe o arquivo e entrega. Vai direto ao portal e o cliente recebe o link no WhatsApp.', 3500)
  await p.getByRole('button', { name: 'Entregar ao cliente' }).click(); await p.waitForTimeout(1200)

  await p.goto(BASE + '/conteudo/quadro', { waitUntil: 'networkidle' }); await p.waitForTimeout(900)
  if (await p.getByRole('tab', { name: /Aprovado/ }).isVisible()) await p.getByRole('tab', { name: /Aprovado/ }).click()
  await say(p, '5. No quadro, a peça passou para Aprovado com o selo "Com o cliente". Quando ele aprovar no portal, vira "Aprovada".', 3800)

  await p.getByRole('button', { name: 'Nova arte' }).click(); await p.waitForTimeout(700)
  await say(p, '6. Pedido avulso (ex.: o cliente pediu no WhatsApp): "Nova arte" abre um pop-up curto.', 2800)
  await p.locator('#nova-arte-cliente').fill('Padaria'); await p.waitForTimeout(500); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter')
  await p.getByRole('radio', { name: 'Carrossel' }).click()
  await p.getByLabel('O que a arte precisa ter').fill('Carrossel com os 3 sabores de panetone e o preço de cada um. Fotos reais da vitrine.')
  await say(p, 'Cliente, tipo e o que a arte precisa ter. O resto (designer e prazo) o sistema preenche.', 3000)
  await p.getByRole('button', { name: 'Continuar' }).click(); await p.waitForTimeout(600)
  await say(p, 'Fotos e link são opcionais. "Mandar para o design" e pronto.', 2600)
  await p.getByRole('button', { name: 'Mandar para o design' }).click(); await p.waitForTimeout(1600)
  await say(p, 'Fim. Tudo foi feito com dados de teste: nada foi gravado nem enviado a ninguém.', 3000)

  const v = p.video(); await ctx.close(); await b.close()
  const file = await v.path(); const dest = path.join(OUT, `fluxo-social-design-${process.env.DEV === 'iphone' ? 'celular' : 'computador'}.webm`)
  fs.renameSync(file, dest); console.log('vídeo:', dest)
})().catch((e) => { console.error(e); process.exit(1) })
