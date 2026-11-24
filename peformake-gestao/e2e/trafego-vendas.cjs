// Tráfego → Vendas (24/11): conectar WhatsApp e Pixel do cliente, marcar venda e mandar à Meta, com dados FALSOS
// no navegador (nada vai ao banco, à Wasender nem à Meta).
// 1. Lista: cliente com erro de envio e "parece venda" vem primeiro; cada linha mostra o próximo passo.
// 2. Cliente sem nada: pop-up do WhatsApp (número + autorização → QR → conectado) e do Pixel (ID, token, ligar envio).
// 3. Cliente pronto: "Vendeu" numa conversa de anúncio → salva e envia → aviso "enviada à Meta"; aba Vendas com Reenviar.
// Em cada tela: sem erro no navegador, sem rolagem de lado, pop-up sem rolagem interna.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 OUT=pasta node e2e/trafego-vendas.cjs
const { chromium, devices } = require('playwright')
const fs = require('fs'); const path = require('path')
const PORT = process.env.PORT || '5199'; const BASE = `http://localhost:${PORT}`
const OUT = process.env.OUT || 'e2e/capturas/vendas'; fs.mkdirSync(OUT, { recursive: true })
const iso = (h) => new Date(Date.now() + h * 3600e3).toISOString()
const fails = []; let board; let leads; let sales; let waStep; let metaCalls; let saved; let tracking

function reset() {
  waStep = 0; metaCalls = []; saved = []; tracking = null
  board = [
    { id: 'c1', name: 'Padaria Sol', wa: { status: 'conectado', phone: '5581999991234', error: null }, pixel_id: '1234567890123456', waba_id: null, test_event_code: null, send_enabled: true, has_token: true, leads: 14, from_ads: 9, hints: 1, sales: 3, value_cents: 125000, send_errors: 1 },
    { id: 'c2', name: 'Will Motos', wa: null, pixel_id: null, waba_id: null, test_event_code: null, send_enabled: false, has_token: false, leads: 0, from_ads: 0, hints: 0, sales: 0, value_cents: 0, send_errors: 0 },
    { id: 'c3', name: 'Doce Sabor Confeitaria Artesanal Ltda', wa: { status: 'conectado', phone: '5581988887777', error: null }, pixel_id: null, waba_id: null, test_event_code: null, send_enabled: false, has_token: false, leads: 4, from_ads: 0, hints: 0, sales: 0, value_cents: 0, send_errors: 0 },
  ]
  leads = [
    { id: 'l1', client_id: 'c1', name: 'Marina Souza', phone: '5581977776666', last_at: iso(-1), last_preview: 'Segue o comprovante do pix', source: 'anuncio', ad_title: 'Panetone artesanal de Natal', sale_hint: true },
    { id: 'l2', client_id: 'c1', name: null, phone: '5581966665555', last_at: iso(-5), last_preview: 'Qual o valor da cesta?', source: 'anuncio', ad_title: 'Cesta de Natal', sale_hint: false },
    { id: 'l3', client_id: 'c1', name: 'João', phone: '5581955554444', last_at: iso(-30), last_preview: 'Vocês abrem domingo?', source: 'organico', ad_title: null, sale_hint: false },
  ]
  sales = [
    { id: 's1', client_id: 'c1', lead_id: 'l3', value_cents: 45000, sold_at: iso(-40), note: 'Cesta grande', meta_status: 'enviado', meta_error: null },
    { id: 's2', client_id: 'c1', lead_id: null, value_cents: 80000, sold_at: iso(-60), note: null, meta_status: 'erro', meta_error: 'Token da Meta inválido ou vencido. Gere outro no Gerenciador de Eventos e salve em Pixel.' },
  ]
}
async function mock(route) {
  const req = route.request(); const u = new URL(req.url())
  if (!u.hostname.endsWith('supabase.co')) return route.continue()
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: h, body: JSON.stringify(b) })
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' })
  const p = u.pathname; const body = (() => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } })()
  if (p.endsWith('/functions/v1/wa-client')) {
    if (!body.client_id || !/^Bearer/.test(req.headers()['authorization'] || '')) return json({ error: 'sem login' }, 401)
    if (body.action === 'start') { waStep = 1; return json({ status: 'aguardando_qr', qr: '2@qr-de-teste' }) }
    if (body.action === 'status') { waStep += 1; if (waStep >= 2) board.find((c) => c.id === body.client_id).wa = { status: 'conectado', phone: '5581912345678', error: null }; return json({ status: waStep >= 2 ? 'conectado' : 'aguardando_qr' }) }
    return json({ qr: '2@outro-qr' })
  }
  if (p.endsWith('/functions/v1/meta-conversion')) { metaCalls.push(body.sale_id); const s = sales.find((x) => x.id === body.sale_id); if (s) { s.meta_status = 'enviado'; s.meta_error = null } return json({ ok: true }) }
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop()
    if (fn === 'traffic_sales_board') return json({ clients: board, sessions_used: 2, sessions_limit: 10 })
    if (fn === 'traffic_sale_save') { const id = 'n' + (saved.length + 1); saved.push(body); sales.unshift({ id, client_id: body._client, lead_id: body._lead, value_cents: body._value_cents, sold_at: body._sold_at, note: body._note, meta_status: 'pendente', meta_error: null }); return json({ id, meta_status: 'pendente' }) }
    if (fn === 'traffic_tracking_save') { tracking = body; const c = board.find((x) => x.id === body._client); c.pixel_id = body._pixel_id; c.send_enabled = body._send_enabled; c.has_token = !!body._token; return json(null) }
    if (fn === 'traffic_sale_delete') { sales = sales.filter((s) => s.id !== body._id); return json(null) }
    return json(null)
  }
  if (p.startsWith('/rest/v1/')) {
    const t = p.split('/').pop(); const cid = (u.searchParams.get('client_id') || '').replace('eq.', '')
    const T = { wa_leads: leads.filter((l) => l.client_id === cid), client_sales: sales.filter((s) => s.client_id === cid), clients: [{ id: 'c9', name: 'Ótica Prime', segment: 'Ótica', is_active: true, is_lost: false }], ad_accounts: [], client_services: [], services: [] }
    const rows = T[t] ?? []
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
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message))
    const shot = async (name) => { if (await sideScroll(pg)) fails.push(`${dev} ${name}: rolagem de lado`); await pg.screenshot({ path: path.join(OUT, `${dev}-${name}.png`), fullPage: false }) }
    const popup = async (name) => { await pg.waitForTimeout(350); if (await popupScrolls(pg)) fails.push(`${dev}: pop-up ${name} rola`); await shot(`pop-${name}`) }
    try {
      // 1. Lista.
      await pg.goto(BASE + '/trafego/vendas', { waitUntil: 'networkidle' })
      const rows = await pg.locator('ul > li button span.font-semibold').allInnerTexts()
      if (rows[0] !== 'Padaria Sol') fails.push(`${dev}: quem tem erro de envio devia vir primeiro (veio ${rows[0]})`)
      for (const t of ['1 envio recusado', '1 parece venda', 'Conectar WhatsApp', 'Conectar Pixel', '2 de 10 vagas']) if (!(await pg.getByText(t).count())) fails.push(`${dev}: lista sem "${t}"`)
      if (!(await pg.getByRole('link', { name: 'Vendas' }).count())) fails.push(`${dev}: sem a aba Vendas no Tráfego`)
      await shot('1-lista')

      // 2. Cliente sem nada: WhatsApp por QR e Pixel.
      await pg.getByRole('button', { name: /Will Motos/ }).click(); await pg.waitForTimeout(400)
      await pg.getByRole('button', { name: 'Conectar WhatsApp' }).last().click(); await popup('whatsapp')
      const gerar = pg.getByRole('button', { name: 'Gerar QR code' })
      if (!(await gerar.isDisabled())) fails.push(`${dev}: QR liberado sem número e sem autorização`)
      await pg.getByLabel('Número de vendas do cliente, com DDD').fill('81 91234-5678')
      await pg.getByRole('checkbox').check(); await gerar.click(); await pg.waitForTimeout(700)
      if (!(await pg.getByAltText('QR code para conectar o WhatsApp').count())) fails.push(`${dev}: QR code não apareceu`)
      await popup('whatsapp-qr')
      await pg.waitForTimeout(5600)
      if (!(await pg.getByText('Conectado: +55 81 91234-5678').count())) fails.push(`${dev}: não mostrou conectado depois de ler o QR`)
      await popup('whatsapp-ok'); await pg.getByRole('button', { name: 'Pronto' }).click(); await pg.waitForTimeout(300)

      await pg.getByRole('button', { name: 'Pixel do cliente' }).click(); await popup('pixel')
      await pg.getByLabel('ID do Pixel').fill('123'); if (!(await pg.getByRole('button', { name: 'Salvar' }).isDisabled())) fails.push(`${dev}: Pixel inválido deixou salvar`)
      await pg.getByLabel('ID do Pixel').fill('9876543210987654'); await pg.getByLabel('Token da API de Conversões').fill('token-de-teste')
      await pg.getByRole('switch', { name: 'Enviar vendas à Meta' }).click()
      await pg.getByRole('tab', { name: 'Mais opções' }).click(); await popup('pixel-mais')
      await pg.getByRole('button', { name: 'Salvar' }).click(); await pg.waitForTimeout(600)
      if (!tracking || tracking._pixel_id !== '9876543210987654' || tracking._send_enabled !== true || tracking._token !== 'token-de-teste') fails.push(`${dev}: Pixel não foi salvo como digitado (${JSON.stringify(tracking)})`)
      if (!(await pg.getByText('Pixel enviando').count())) fails.push(`${dev}: depois de salvar, o Pixel não aparece como enviando`)
      await shot('2-cliente-conectado')

      // 3. Cliente pronto: Vendeu → envia à Meta.
      await pg.goto(BASE + '/trafego/vendas?cliente=c1', { waitUntil: 'networkidle' })
      for (const t of ['Marina Souza', 'Parece venda', 'Anúncio', '+55 81 96666-5555']) if (!(await pg.getByText(t).count())) fails.push(`${dev}: conversas sem "${t}"`)
      await shot('3-conversas')
      await pg.locator('li', { hasText: 'Marina Souza' }).getByRole('button', { name: 'Vendeu' }).click(); await popup('vendeu')
      await pg.getByLabel('Valor da venda').fill('189,90'); await pg.getByRole('button', { name: 'Salvar venda' }).click(); await pg.waitForTimeout(900)
      if (saved[0]?._value_cents !== 18990 || saved[0]?._lead !== 'l1' || saved[0]?._client !== 'c1') fails.push(`${dev}: venda salva errada (${JSON.stringify(saved[0])})`)
      if (metaCalls[0] !== 'n1') fails.push(`${dev}: a venda não foi enviada à Meta`)
      if (!(await pg.getByText('Venda salva e enviada à Meta.').count())) fails.push(`${dev}: sem o aviso de venda enviada`)
      if (await pg.locator('li', { hasText: 'Marina Souza' }).getByRole('button', { name: 'Vendeu' }).count()) fails.push(`${dev}: conversa vendida ainda mostra o botão Vendeu`)
      await pg.getByRole('tab', { name: /Vendas/ }).click(); await pg.waitForTimeout(400)
      await pg.getByRole('button', { name: 'Reenviar' }).click(); await pg.waitForTimeout(800)
      if (!metaCalls.includes('s2')) fails.push(`${dev}: Reenviar não chamou a Meta`)
      if (await pg.getByRole('button', { name: 'Reenviar' }).count()) fails.push(`${dev}: venda reenviada ainda mostra Reenviar`)
      await shot('4-vendas')
      await pg.getByRole('button', { name: 'Venda sem conversa' }).click(); await popup('venda-sem-conversa')
    } catch (e) { fails.push(`${dev}: ${e.message.split('\n')[0]}`) }
    if (errs.length) fails.push(`${dev}: erro no navegador: ${errs[0]}`)
    await ctx.close()
  }
  await b.close()
  console.log(fails.length ? 'FALHAS\n' + fails.join('\n') : 'Tudo certo')
  if (fails.length && process.env.STRICT) process.exit(1)
})()
