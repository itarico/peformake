// Pop-ups da Estratégia (19/11): abre cada pop-up das telas de Estratégia (Editar, Refazer, Ver detalhes, Baixar PDF,
// Gerar de novo, Pedir ao agente, blocos do Briefing, Perguntas e Relatórios) e mede: corpo do pop-up sem rolagem interna,
// erros do navegador e botões que não abrem nada. Dados falsos (mock do estrategia-interativa.cjs); nada vai ao banco.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5198 --strictPort &  BASE=http://localhost:5198 node e2e/estrategia-popups.cjs
const { chromium, devices } = require('playwright')
const { mock, C, month } = require('./estrategia-interativa.cjs')
const BASE = process.env.BASE || 'http://localhost:5198'
const board = (parte) => `/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}&parte=${parte}`
const measure = (p) => p.evaluate(() => {
  const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return null
  const b = d.querySelector(':scope > div > div.overflow-y-auto') || d.querySelector('div.overflow-y-auto')
  const title = (d.querySelector('h2')?.textContent || '?').trim().slice(0, 60)
  return { title, rola: b ? b.scrollHeight > b.clientHeight + 2 : false }
})
const close = async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(250); if (await p.locator('dialog[open]').count()) { await p.locator('dialog[open] button[aria-label="Fechar"]').first().click().catch(() => {}); await p.waitForTimeout(200) } }
// [página, rótulo, como abrir]
const CASES = [
  ...['resumo', 'audiovisual', 'social', 'trafego', 'atendimento'].flatMap((t) => [
    [board(t), `${t}: Editar`, async (p) => { if (t === 'audiovisual') await p.getByRole('button', { name: 'Abrir' }).first().click(); await p.locator('button:has-text("Editar")').first().click() }],
    [board(t), `${t}: Refazer`, async (p) => { if (t === 'audiovisual') await p.getByRole('button', { name: 'Abrir' }).first().click(); await p.locator('button:has-text("Refazer")').first().click() }],
    [board(t), `${t}: Ver detalhes`, async (p) => { if (t === 'audiovisual') await p.getByRole('button', { name: 'Abrir' }).first().click(); await p.getByRole('button', { name: 'Ver detalhes' }).first().click() }],
  ]),
  [board('resumo'), 'Baixar PDF', async (p) => p.getByRole('button', { name: 'Baixar PDF' }).click()],
  [board('resumo'), 'Gerar de novo', async (p) => p.getByRole('button', { name: 'Gerar de novo' }).click()],
  [board('social'), 'Mais ideias (menu)', async (p) => { await p.getByRole('button', { name: 'Mais opções da estratégia' }).click(); await p.getByRole('menuitem', { name: /Pedir mais ideias/ }).click() }],
  [board('social'), 'Colar resultado (menu)', async (p) => { await p.getByRole('button', { name: 'Mais opções da estratégia' }).click(); await p.getByRole('menuitem', { name: /colar a resposta/i }).click() }],
  ...['Direção', 'CNPJ', 'Voz', 'Proibidos', 'Quem aparece', 'Quem grava', 'Capacidade', 'Ofertas', 'Datas', 'Reunião', 'Completar', 'Ver tudo'].map((n) => [board('briefing'), `Briefing: ${n}`, async (p) => p.getByRole('button', { name: n, exact: true }).first().click()]),
  [`/estrategia/consultoria?cliente=${C}&ver=perguntas`, 'Perguntas: Responder pela equipe', async (p) => p.getByRole('button', { name: 'Responder pela equipe' }).first().click()],
  [`/estrategia/consultoria?cliente=${C}&ver=perguntas`, 'Perguntas: Editar', async (p) => p.getByRole('button', { name: 'Editar', exact: true }).first().click()],
  [`/estrategia/consultoria?cliente=${C}&ver=perguntas`, 'Perguntas: Enviar ao cliente', async (p) => p.getByRole('button', { name: /Enviar ao cliente/ }).first().click()],
  [`/estrategia/consultoria?cliente=${C}`, 'Cliente: Enviar', async (p) => p.getByRole('button', { name: 'Enviar', exact: true }).first().click()],
  [`/estrategia/consultoria?cliente=${C}`, 'Cliente: Preencher', async (p) => p.getByRole('button', { name: 'Preencher' }).first().click()],
  ['/estrategia/relatorios', 'Relatórios: Configurações', async (p) => p.getByRole('button', { name: 'Configurações' }).first().click()],
  ['/estrategia/relatorios', 'Relatórios: Pedir ao agente', async (p) => p.getByRole('button', { name: 'Pedir ao agente' }).first().click()],
  ['/estrategia/relatorios', 'Relatórios: Semana 1', async (p) => p.getByRole('button', { name: /Semana 1/ }).first().click()],
]
;(async () => {
  const b = await chromium.launch(); const bad = []
  for (const [dev, opts] of [['pc', { viewport: { width: 1366, height: 800 } }], ['iphone', devices['iPhone 13']]]) {
    const ctx = await b.newContext({ ...opts, colorScheme: 'light' }); await ctx.route('**/*', mock)
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)))
    let last = ''
    for (const [path, name, open] of CASES) {
      if (path !== last) { await p.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(700); last = path }
      errs.length = 0
      try { await open(p); await p.waitForTimeout(500) } catch (e) { bad.push(`${dev} · ${name}: não achei o botão (${String(e.message).split('\n')[0].slice(0, 80)})`); await close(p); last = ''; continue }
      const m = await measure(p)
      const what = m ? `pop-up "${m.title}"${m.rola ? ' COM ROLAGEM' : ''}` : 'sem pop-up'
      console.log(`${dev} · ${name}: ${what}${errs.length ? ' · ERRO: ' + errs.join(' | ') : ''}`)
      if ((m && m.rola) || errs.length) bad.push(`${dev} · ${name}: ${what}${errs.length ? ' · ' + errs[0] : ''}`)
      await close(p); last = ''
    }
    await ctx.close()
  }
  await b.close()
  console.log(bad.length ? `\nPROBLEMAS (${bad.length}):\n` + bad.join('\n') : '\nTudo certo.')
})()
