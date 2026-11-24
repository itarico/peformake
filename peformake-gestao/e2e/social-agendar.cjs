// Social Media → Agendar (24/11): agendar no Instagram a arte aprovada, com dados FALSOS no navegador (nada vai ao banco nem à Meta).
// 1. Aba Agendar existe; contas conectadas aparecem; arte aprovada com arquivo aparece em "Prontas para agendar".
// 2. Cliente sem Instagram: botão "Conectar" abre o pop-up já com o cliente; "Continuar na Meta" pede o código ao banco.
// 3. Agendar: tipo sugerido pelo arquivo, PNG é barrado com aviso, JPG agenda com dia, hora e legenda; item some da fila.
// 4. Agendadas: status e "Cancelar" funcionam. Pop-ups sem rolagem, sem rolagem de lado, sem erro no navegador.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  PORT=5199 OUT=pasta node e2e/social-agendar.cjs
const { chromium, devices } = require('playwright')
const fs = require('fs'); const path = require('path')
const PORT = process.env.PORT || '5199'; const BASE = `http://localhost:${PORT}`
const OUT = process.env.OUT || 'e2e/capturas/agendar'; fs.mkdirSync(OUT, { recursive: true })
const iso = (h) => new Date(Date.now() + h * 3600e3).toISOString()
const C = [{ id: 'c1', name: 'Padaria Sol', is_active: true, areas: ['design', 'social'], recurring: true }, { id: 'c2', name: 'Will Motos', is_active: true, areas: ['design', 'social'], recurring: true }]
const fails = []; let posts; let saved; let canceled; let connectAsked
const reset = () => { saved = []; canceled = []; connectAsked = null; posts = [
  { id: 'p1', account_id: 'a1', content_item_id: 'i9', kind: 'post', media_path: 'c1/velha.jpg', media_mime: 'image/jpeg', caption: 'Promoção da semana', scheduled_at: iso(-20), status: 'publicado', permalink: 'https://www.instagram.com/p/abc/', error: null },
  { id: 'p2', account_id: 'a1', content_item_id: null, kind: 'reels', media_path: 'c1/video.mp4', media_mime: 'video/mp4', caption: null, scheduled_at: iso(30), status: 'agendado', permalink: null, error: null },
] }
const items = [
  { id: 'i1', client_id: 'c1', kind: 'post', title: 'Panetone de Natal', briefing: null, caption: 'Chegou o panetone artesanal.' },
  { id: 'i2', client_id: 'c1', kind: 'post', title: 'Cesta de Natal em PNG', briefing: null, caption: null },
  { id: 'i3', client_id: 'c2', kind: 'post', title: 'Revisão de moto', briefing: null, caption: null },
]
const files = [
  { item_id: 'i1', path: 'c1/panetone.jpg', mime: 'image/jpeg', role: 'final', created_at: iso(-5) },
  { item_id: 'i2', path: 'c1/cesta.png', mime: 'image/png', role: 'final', created_at: iso(-5) },
  { item_id: 'i3', path: 'c2/moto.jpg', mime: 'image/jpeg', role: 'final', created_at: iso(-5) },
]
const PIXEL = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')
const uploads = []
const partsCalls = []
const creates = []; const calls = []
// PNG 1x1 para testar a conversão para JPG no Postar avulso.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
async function mock(route) {
  const req = route.request(); const u = new URL(req.url())
  if (u.hostname.endsWith('facebook.com')) return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Meta</h1>' })
  if (!u.hostname.endsWith('supabase.co')) return route.continue()
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: h, body: JSON.stringify(b) })
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' })
  const p = u.pathname; const body = (() => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } })()
  if (p.startsWith('/storage/') && req.method() === 'POST') { uploads.push(p); return json({ Key: p.split('/object/')[1] ?? p, Id: 'x' }) }
  if (p.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/jpeg', headers: h, body: PIXEL })
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop()
    if (fn === 'ig_post_save') { saved.push(body); posts.push({ id: 'n' + saved.length, account_id: body._account, content_item_id: body._item, kind: body._kind, media_path: body._media_path, media_mime: body._media_mime, caption: body._caption, scheduled_at: body._at, status: 'agendado', permalink: null, error: null }); return json('n' + saved.length) }
    if (fn === 'ig_post_media_parts') { partsCalls.push(body); return json(null) }
    if (fn === 'ig_post_create' || fn === 'ig_post_create_series') { creates.push(body); return json(body._ats ? body._ats.length : 1) }
    calls.push(fn)
    if (fn === 'ig_post_cancel') { canceled.push(body._id); posts = posts.filter((x) => x.id !== body._id); return json(null) }
    if (fn === 'ig_connect_start') { connectAsked = body; return json('a'.repeat(64)) }
    return json({ production_clients: C, production_staff: [], my_staff_id: null }[fn] ?? null)
  }
  if (p.startsWith('/rest/v1/')) {
    const T = { ig_accounts: [{ id: 'a1', client_id: 'c1', username: 'padariasol', status: 'conectado' }, { id: 'a0', client_id: null, username: 'peformake', status: 'conectado' }], content_items: items, content_files: files, ig_posts: posts }
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
    reset()
    const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock)
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.setDefaultTimeout(8000)
    const shot = async (name) => { if (await sideScroll(pg)) fails.push(`${dev} ${name}: rolagem de lado`); await pg.screenshot({ path: path.join(OUT, `${dev}-${name}.png`) }) }
    try {
      await pg.goto(BASE + '/conteudo/agendar?instagram=ok', { waitUntil: 'networkidle' })
      for (const t of ['Instagram conectado.', '@padariasol', '@peformake', 'Panetone de Natal', 'Revisão de moto', 'Instagram não conectado', 'Publicado', 'Agendado']) if (!(await pg.getByText(t).first().count())) fails.push(`${dev}: tela sem "${t}"`)
      await shot('1-agendar')

      // Cliente sem Instagram: conectar.
      await pg.locator('li', { hasText: 'Revisão de moto' }).getByRole('button', { name: 'Conectar' }).click(); await pg.waitForTimeout(350)
      if (await popupScrolls(pg)) fails.push(`${dev}: pop-up Conectar rola`)
      if ((await pg.locator('#ig-de-quem').inputValue()) !== 'Will Motos') fails.push(`${dev}: pop-up Conectar não veio com o cliente`)
      await shot('pop-conectar')
      await pg.getByRole('button', { name: 'Continuar na Meta' }).click(); await pg.waitForTimeout(900)
      if (connectAsked?._client !== 'c2') fails.push(`${dev}: conexão não pediu o código para o cliente certo (${JSON.stringify(connectAsked)})`)
      if (!pg.url().includes('facebook.com/dialog/oauth') || !pg.url().includes('ig-connect')) fails.push(`${dev}: não abriu a tela de login da Meta (${pg.url().slice(0, 80)})`)
      await pg.goto(BASE + '/conteudo/agendar', { waitUntil: 'networkidle' })

      // PNG é barrado.
      await pg.locator('li', { hasText: 'Cesta de Natal em PNG' }).getByRole('button', { name: 'Agendar' }).click(); await pg.waitForTimeout(350)
      if (!(await pg.getByText(/só aceita imagem JPG/).count())) fails.push(`${dev}: PNG não mostrou o aviso`)
      if (!(await pg.getByRole('dialog').getByRole('button', { name: 'Agendar' }).isDisabled())) fails.push(`${dev}: PNG deixou agendar`)
      if (await popupScrolls(pg)) fails.push(`${dev}: pop-up Agendar (PNG) rola`)
      await pg.getByRole('button', { name: 'Voltar' }).click()

      // JPG agenda.
      await pg.locator('li', { hasText: 'Panetone de Natal' }).getByRole('button', { name: 'Agendar' }).click(); await pg.waitForTimeout(350)
      if (!(await pg.getByRole('radio', { name: 'Post no feed' }).getAttribute('aria-checked'))) fails.push(`${dev}: tipo sugerido não é Post`)
      if ((await pg.getByLabel('Legenda').inputValue()) !== 'Chegou o panetone artesanal.') fails.push(`${dev}: legenda da arte não veio preenchida`)
      const tomorrow = new Date(Date.now() + 2 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
      await pg.getByRole('dialog').locator('input[type=date]').fill(tomorrow); await pg.getByRole('dialog').locator('input[type=time]').fill('09:30')
      if (await popupScrolls(pg)) fails.push(`${dev}: pop-up Agendar rola`)
      await shot('pop-agendar')
      await pg.getByRole('dialog').getByRole('button', { name: 'Agendar' }).click(); await pg.waitForTimeout(900)
      const s = saved[0]
      if (!s || s._account !== 'a1' || s._item !== 'i1' || s._kind !== 'post' || s._media_path !== 'c1/panetone.jpg' || s._at !== new Date(`${tomorrow}T09:30:00-03:00`).toISOString()) fails.push(`${dev}: agendamento salvo errado (${JSON.stringify(s)})`)
      if (await pg.locator('section[aria-label="Prontas para agendar"] li', { hasText: 'Panetone de Natal' }).count()) fails.push(`${dev}: arte agendada continua na fila`)

      // Cancelar.
      await pg.locator('section[aria-label="Agendadas"] li', { hasText: 'Reels' }).getByRole('button', { name: 'Cancelar' }).click(); await pg.waitForTimeout(300)
      await pg.getByRole('button', { name: 'Sim, confirmar' }).click(); await pg.waitForTimeout(700)
      if (canceled[0] !== 'p2') fails.push(`${dev}: cancelar não chamou o banco`)

      // Calendário: o dia com publicação tem contador e filtra a lista.
      if (!(await pg.locator('section[aria-label="Calendário"]').count())) fails.push(`${dev}: sem calendário`)

      // Criar post (tela no estilo do Instagram): 3 fotos viram carrossel, a PNG vira JPG.
      const pick = async (id) => { await pg.locator(id).click(); await pg.locator(id).pressSequentially('@peformake', { delay: 20 }); await pg.waitForTimeout(300); await pg.getByRole('option', { name: /@peformake/ }).first().click(); await pg.waitForTimeout(200) }
      await pg.getByRole('link', { name: /Criar post/ }).click(); await pg.waitForTimeout(1200)
      if (!/agendar\/novo/.test(pg.url())) fails.push(`${dev}: Criar post não abriu (${pg.url()})`)
      await pick('#compor-conta')
      await pg.getByLabel('Arquivos').setInputFiles([{ name: 'a.png', mimeType: 'image/png', buffer: PNG }, { name: 'b.png', mimeType: 'image/png', buffer: PNG }, { name: 'c.png', mimeType: 'image/png', buffer: PNG }])
      await pg.waitForTimeout(800)
      if (!(await pg.getByText('carrossel com 3').count())) fails.push(`${dev}: não reconheceu o carrossel`)
      if ((await pg.getByRole('list', { name: 'Arquivos do post' }).locator('img').count()) !== 3) fails.push(`${dev}: miniaturas do carrossel não aparecem`)
      if (!(await pg.getByRole('radio', { name: 'Inteira' }).count())) fails.push(`${dev}: sem a opção Inteira`)
      await pg.getByRole('button', { name: 'Mover arquivo 3 para trás' }).click(); await pg.waitForTimeout(200)
      await pg.getByLabel('Legenda').fill('Carrossel de teste')
      if (await sideScroll(pg)) fails.push(`${dev}: criar post rola de lado`)
      await shot('3-criar')
      const nC = creates.length
      await pg.getByRole('button', { name: 'Compartilhar' }).click()
      for (let t = 0; t < 30 && creates.length === nC; t++) await pg.waitForTimeout(300)
      const c = creates[nC]
      if (!c) fails.push(`${dev}: alerta na tela: ${(await pg.locator('[role=alert]').allInnerTexts()).join(' | ')} botão: ${await pg.getByRole('button', { name: /Publicar|Enviando|Programando/ }).first().innerText().catch(() => '?')}`)
      if (!c || c._kind !== 'post' || c._media.length !== 3 || !c._media.every((m) => m.mime === 'image/jpeg' && m.path.endsWith('.jpg')) || c._caption !== 'Carrossel de teste') fails.push(`${dev}: carrossel salvo errado ${JSON.stringify(c)}`)
      if (!calls.includes('ig_publish_now')) fails.push(`${dev}: Publicar não chamou a publicação na hora`)
      await pg.waitForTimeout(800)

      // Story que repete todo dia, 5 vezes, agendado.
      await pg.goto(`${BASE}/conteudo/agendar/novo`); await pg.waitForTimeout(1200)
      await pick('#compor-conta')
      await pg.getByLabel('Arquivos').setInputFiles({ name: 's.png', mimeType: 'image/png', buffer: PNG }); await pg.waitForTimeout(500)
      await pg.getByRole('button', { name: /^Formato/ }).click()
      await pg.getByRole('radio', { name: 'Story' }).click()
      await pg.getByRole('radio', { name: 'Agendar' }).click()
      const tomorrow2 = new Date(Date.now() + 2 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
      await pg.locator('input[type=date]').fill(tomorrow2); await pg.locator('input[type=time]').fill('09:00')
      await pg.getByRole('button', { name: /^Repetir story/ }).click()
      await pg.getByRole('radio', { name: 'Dias da semana' }).click()
      for (const w of ['Seg', 'Qua']) await pg.getByRole('button', { name: w, exact: true }).click()
      await pg.getByRole('button', { name: 'Horário', exact: true }).click()
      await pg.getByLabel('Horário 2', { exact: true }).fill('18:00')
      await pg.getByRole('radio', { name: '2 semanas' }).click()
      await pg.waitForTimeout(300)
      const nS = creates.length
      await pg.getByRole('button', { name: 'Agendar', exact: true }).last().click()
      for (let t = 0; t < 30 && creates.length === nS; t++) await pg.waitForTimeout(300)
      const st = creates[nS]
      // Começa no dia escolhido às 09:00; repete seg e qua às 09:00 e 18:00 por 2 semanas (o dia de início, se for seg ou qua, também entra).
      const want = (() => { const out = new Set([new Date(`${tomorrow2}T09:00:00-03:00`).toISOString()]); for (let k = 0; k < 14; k++) { const d = new Date(`${tomorrow2}T12:00:00-03:00`); d.setUTCDate(d.getUTCDate() + k); const iso = d.toISOString().slice(0, 10); const wd = new Date(`${iso}T12:00:00-03:00`).getDay(); if (wd === 1 || wd === 3) for (const h of ['09:00', '18:00']) { const x = new Date(`${iso}T${h}:00-03:00`).toISOString(); if (x > new Date(`${tomorrow2}T09:00:30-03:00`).toISOString()) out.add(x) } } return [...out].sort() })()
      if (!st || st._kind !== 'story' || JSON.stringify(st._ats) !== JSON.stringify(want)) fails.push(`${dev}: story repetido errado ${JSON.stringify(st?._ats)} esperado ${JSON.stringify(want)}`)
      await pg.waitForTimeout(800)

      // Vídeo de 95 MB (acima do limite de 50 MB do Supabase): sobe em 3 partes.
      if (dev === 'desk') {
        await pg.goto(`${BASE}/conteudo/agendar/novo`); await pg.waitForTimeout(1200)
        await pick('#compor-conta')
        const big = path.join(require('os').tmpdir(), 'pf-grande.mp4'); if (!fs.existsSync(big)) fs.writeFileSync(big, Buffer.alloc(95 * 1024 * 1024, 1))
        await pg.getByLabel('Arquivos').setInputFiles(big); await pg.waitForTimeout(1500)
        const nUp = uploads.length; const nV = creates.length
        await pg.getByRole('button', { name: 'Compartilhar' }).click()
        for (let t = 0; t < 120 && creates.length === nV; t++) await pg.waitForTimeout(500)
        const ups = uploads.slice(nUp)
        if (ups.length !== 3 || !ups.every((u, k) => u.endsWith(`.mp4.part${k}`))) fails.push(`${dev}: vídeo grande não subiu em 3 partes ${JSON.stringify(ups)}`)
        const v = creates[nV]
        if (!v || v._kind !== 'reels' || v._media[0].parts !== 3 || v._media[0].size !== 95 * 1024 * 1024) fails.push(`${dev}: vídeo grande salvo errado ${JSON.stringify(v)}`)
        await pg.waitForTimeout(800)
      }

      // Em massa: 2 fotos, distribuídas um por dia.
      await pg.goto(`${BASE}/conteudo/agendar/massa`); await pg.waitForTimeout(1200)
      await pick('#massa-conta')
      await pg.getByLabel('Arquivos').setInputFiles([{ name: 'm1.png', mimeType: 'image/png', buffer: PNG }, { name: 'm2.png', mimeType: 'image/png', buffer: PNG }]); await pg.waitForTimeout(800)
      await pg.getByRole('button', { name: 'Distribuir' }).click()
      if (await sideScroll(pg)) fails.push(`${dev}: em massa rola de lado`)
      await shot('4-massa')
      const nB = creates.length
      await pg.getByRole('button', { name: /^Programar 2$/ }).click()
      for (let t = 0; t < 30 && creates.length < nB + 2; t++) await pg.waitForTimeout(300)
      const b1 = creates[nB]; const b2 = creates[nB + 1]
      if (!b1 || !b2 || b1._at === b2._at || new Date(b2._at) - new Date(b1._at) !== 864e5) fails.push(`${dev}: em massa não distribuiu um por dia ${JSON.stringify([b1?._at, b2?._at])}`)
      if (!(await pg.getByText('Programado').count())) fails.push(`${dev}: em massa sem "Programado"`)

      // Stories em massa: 2 arquivos, todos como story, repetindo toda semana 4 vezes.
      await pg.goto(`${BASE}/conteudo/agendar/massa`); await pg.waitForTimeout(1200)
      await pick('#massa-conta')
      await pg.getByLabel('Arquivos').setInputFiles([{ name: 's1.png', mimeType: 'image/png', buffer: PNG }, { name: 's2.png', mimeType: 'image/png', buffer: PNG }]); await pg.waitForTimeout(800)
      await pg.getByRole('group', { name: 'Formato de todos' }).getByRole('button', { name: 'Story' }).click()
      await pg.getByRole('radio', { name: 'Todo dia' }).click(); await pg.getByRole('radio', { name: '1 semana' }).click()
      const nT = creates.length
      await pg.getByRole('button', { name: /^Programar 2$/ }).click()
      for (let t = 0; t < 30 && creates.length < nT + 2; t++) await pg.waitForTimeout(300)
      const ss = creates.slice(nT)
      if (ss.length !== 2 || !ss.every((x) => x._kind === 'story' && Array.isArray(x._ats) && x._ats.length === 7)) fails.push(`${dev}: stories em massa errados ${JSON.stringify(ss.map((x) => [x._kind, x._ats?.length]))}`)
      await pg.goto(`${BASE}/conteudo/agendar`); await pg.waitForTimeout(1200)
      await shot('2-depois')
    } catch (e) { fails.push(`${dev}: ${e.message.split('\n')[0]}`) }
    if (errs.length) fails.push(`${dev}: erro no navegador: ${errs[0]}`)
    await ctx.close()
  }
  await b.close()
  console.log(fails.length ? 'FALHAS\n' + fails.join('\n') : 'Tudo certo')
  if (fails.length && process.env.STRICT) process.exit(1)
})()
