// Teste real da compressão e divisão (usa o Chrome instalado, que tem codificador H.264).
// Precisa do vídeo %TEMP%/pf-story70.mp4 (70 s, ~135 MB): ffmpeg -f lavfi -i testsrc2=size=1080x1920:rate=30 -f lavfi -i sine -t 70 -c:v libx264 -b:v 16M -c:a aac -movflags +faststart pf-story70.mp4
// Uso: PORT=5199 node e2e/video-prep-chrome.cjs
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs')
;(async () => {
  const b = await chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } })
  const uploads = []; const creates = []
  await ctx.route('**/*', async (route) => {
    const req = route.request(); const u = new URL(req.url()); if (!u.hostname.endsWith('supabase.co')) return route.continue()
    const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: h, body: '' })
    if (u.pathname.startsWith('/storage/') && req.method() === 'POST') { const len = (req.postDataBuffer() || Buffer.alloc(0)).length; uploads.push({ p: u.pathname.split('/').pop(), len }); return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: '{"Key":"x"}' }) }
    const fn = u.pathname.split('/').pop()
    if (u.pathname.includes('/rpc/')) { if (fn.startsWith('ig_post_create')) { creates.push(JSON.parse(req.postData() || '{}')); return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: '1' }) } return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: fn === 'my_staff_id' ? 'null' : '[]' }) }
    const rows = fn === 'ig_accounts' ? [{ id: 'a0', client_id: null, username: 'peformake', status: 'conectado' }] : []
    return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(rows) })
  })
  await ctx.addInitScript(() => localStorage.setItem('e2e_roles', 'admin'))
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message))
  await pg.goto('http://localhost:5199/conteudo/agendar/novo'); await pg.waitForTimeout(1500)
  await pg.getByLabel('Arquivos').setInputFiles(path.join(process.env.TEMP, 'pf-story70.mp4')); await pg.waitForTimeout(2500)
  await pg.getByRole('button', { name: /^Formato/ }).click(); await pg.getByRole('radio', { name: 'Story' }).click(); await pg.waitForTimeout(500)
  const txt = await pg.evaluate(() => document.body.innerText)
  console.log('opcoes:', txt.includes('Comprimir para caber no limite'), txt.includes('Dividir em partes de 60 s'), 'regras:', txt.includes('será comprimido'), txt.includes('2 partes'))
  await pg.screenshot({ path: path.join(process.env.TEMP, 'prep-antes.png') })
  const t = Date.now()
  await pg.getByRole('button', { name: 'Compartilhar' }).click()
  for (let i = 0; i < 400 && creates.length < 2; i++) await pg.waitForTimeout(1000)
  console.log('segundos', Math.round((Date.now() - t) / 1000), 'envios', JSON.stringify(uploads.map((u) => [u.p.slice(-12), Math.round(u.len / 1048576) + 'MB'])))
  console.log('posts', JSON.stringify(creates.map((c) => [c._kind, c._at])))
  console.log('erros', errs.slice(0, 2), await pg.locator('[role=alert]').allInnerTexts())
  await b.close()
})()
