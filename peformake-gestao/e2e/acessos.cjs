// Teste de acessos por cargo (20/11, antes de liberar a equipe): entra com cada cargo (login falso do e2e/shell) em todas
// as rotas e anota: abriu ou foi barrado, valor em R$ na tela de quem não é admin, erro do navegador, menu de cada um.
// Dados falsos do e2e/popups.cjs. Uso: npx vite --config e2e/shell/vite.config.ts --port 5198 --strictPort &  BASE=http://localhost:5198 node e2e/acessos.cjs
const { chromium } = require('playwright')
const { mock, PAGES0 } = require('./popups.cjs')
const BASE = process.env.BASE || 'http://localhost:5198'
const ROLES = (process.env.ROLES || 'admin,head_marketing,traffic_manager,social_media,designer,videomaker,editor,sdr,closer,ellcazo,parceiro').split(',')
const EXTRA = ['/inicio', '/equipe', '/equipe/metas', '/comercial', '/whatsapp', '/estrategia/consultoria', '/estrategia/relatorios', '/trafego/painel', '/trafego/relatorios', '/audiovisual/plano-do-mes']
const MONEY_OK = new Set(['admin', 'ellcazo'])
;(async () => {
  const b = await chromium.launch(); const out = []
  for (const role of ROLES) {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } }); await ctx.route('**/*', mock)
    await ctx.addInitScript((r) => { try { localStorage.setItem('e2e_roles', r) } catch {} }, role)
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)))
    await p.goto(BASE + '/inicio', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(600)
    const menu = await p.evaluate(() => [...document.querySelectorAll('nav a')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/')))
    const opened = [], blocked = [], money = [], broke = []
    for (const path of [...new Set([...EXTRA, ...PAGES0])]) {
      errs.length = 0
      await p.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(450)
      const r = await p.evaluate(() => { const m = document.querySelector('main') || document.body; const t = m.innerText; return { url: location.pathname, t: t.slice(0, 4000), deny: /sem acesso|não tem acesso|acesso restrito|sem permissão/i.test(t), money: (t.match(/R\$\s?\d/g) || []).length } })
      const moved = r.url !== path.split('?')[0]
      if (r.deny || (moved && /\/(inicio|equipe|sem-modulo|login)$/.test(r.url) && !path.startsWith(r.url))) blocked.push(path); else opened.push(moved ? `${path}→${r.url}` : path)
      if (!r.deny && r.money && !MONEY_OK.has(role)) money.push(`${path} (${r.money}x R$)`)
      if (errs.length) broke.push(`${path}: ${errs[0]}`)
    }
    out.push({ role, menu, opened, blocked, money, broke })
    console.log(`\n### ${role}\nmenu: ${menu.join(' ')}\nabre (${opened.length}): ${opened.join(' ')}\nbarrado (${blocked.length}): ${blocked.join(' ')}${money.length ? `\nR$ PARA NÃO-ADMIN: ${money.join(' | ')}` : ''}${broke.length ? `\nERROS: ${broke.join(' | ')}` : ''}`)
    await ctx.close()
  }
  await b.close()
})()
