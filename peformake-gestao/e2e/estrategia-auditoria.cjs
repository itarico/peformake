// Auditoria da Estratégia (19/11): passa por todas as telas e abas com dados falsos (mock do estrategia-interativa.cjs),
// tira foto e lista erros do navegador, rolagem de lado, telas vazias e botões. Nada vai ao banco nem à IA.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 SHOTS=pasta node e2e/estrategia-auditoria.cjs
const { chromium, devices } = require('playwright')
const { mock, sideScroll, C, month } = require('./estrategia-interativa.cjs')
const BASE = process.env.BASE || 'http://localhost:5199'
const SHOTS = process.env.SHOTS || 'e2e/capturas'; require('fs').mkdirSync(SHOTS, { recursive: true })
// SO_VIDEOS=1: estratégia só com vídeos (o caso real da Peformake em 19/11), para ver as partes vazias.
if (process.env.SO_VIDEOS) global.BOARD = { ...global.BOARD, cards: global.BOARD.cards.filter((c) => c.tab === 'audiovisual') }
const PAGES = [
  ['lista', '/estrategia/consultoria'],
  ['cliente', `/estrategia/consultoria?cliente=${C}`],
  ...['resumo', 'audiovisual', 'social', 'trafego', 'atendimento', 'referencias', 'briefing'].map((t) => [`parte-${t}`, `/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}&parte=${t}`]),
  ['perguntas', `/estrategia/consultoria?cliente=${C}&ver=perguntas`],
  ['relatorios', '/estrategia/relatorios'],
  ['relatorios-cliente', `/estrategia/relatorios?cliente=${C}`],
]
;(async () => {
  const b = await chromium.launch()
  for (const [dev, opts] of [['desktop', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock)
    const p = await ctx.newPage(); const errs = []
    p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)))
    p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)) })
    for (const [name, path] of PAGES) {
      errs.length = 0
      await p.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(900)
      await p.screenshot({ path: `${SHOTS}/aud-${name}-${dev}.png`, fullPage: false })
      const info = await p.evaluate(() => {
        const main = document.querySelector('main') || document.body
        const tabs = [...main.querySelectorAll('[role=tab]')].map((t) => t.textContent.trim() + (t.getAttribute('aria-selected') === 'true' ? '*' : ''))
        const btns = [...main.querySelectorAll('button, a')].filter((x) => x.offsetParent).map((x) => (x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean)
        const h = [...main.querySelectorAll('h1,h2,h3')].map((x) => x.textContent.trim().slice(0, 50))
        return { url: location.pathname + location.search, tabs, h: h.slice(0, 8), btns: btns.slice(0, 40), text: main.innerText.length, status: [...main.querySelectorAll('[role=status],[role=alert]')].map((x) => x.textContent.trim().slice(0, 80)) }
      })
      const side = await sideScroll(p).catch(() => false)
      console.log(`\n### ${dev} ${name} -> ${info.url}${side ? ' [ROLAGEM DE LADO]' : ''}`)
      console.log('abas:', info.tabs.join(' | '))
      console.log('títulos:', info.h.join(' | '))
      console.log('status:', info.status.join(' | '))
      console.log('botões:', info.btns.join(' · '))
      if (errs.length) console.log('ERROS:', [...new Set(errs)].join(' || '))
    }
    await ctx.close()
  }
  await b.close()
})()
