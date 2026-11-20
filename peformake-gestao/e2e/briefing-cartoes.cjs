// Briefing fixo reorganizado (20/11): cartões juntos, 3 novos (Marketing até hoje, Sazonalidade, Marca e acessos),
// guias com puxa-fio, dinheiro só para admin, pedidos de arquivo nos Documentos. Dados FALSOS (nada vai ao banco).
// Mede cada pop-up e cada pergunta do guia no iPhone 13 e em 1366x800: corpo sem rolagem interna.
// Uso: npx vite --config e2e/shell/vite.config.ts --port 5199 --strictPort &  BASE=http://localhost:5199 node e2e/briefing-cartoes.cjs
const { chromium, devices } = require('playwright')
const base = require('./estrategia-interativa.cjs')
const BASE = process.env.BASE || 'http://localhost:5199'
const OUT = process.env.OUT || 'e2e/capturas'; require('fs').mkdirSync(OUT, { recursive: true })
const { C, month, id } = base
const fails = []
const saves = []
// Briefing antigo: Diferenciais e Proibidos já preenchidos (têm que aparecer dentro dos cartões novos).
const BRIEF = { produtos: [{ nome: 'Pizza grande', preco: 'R$ 59,90' }], links: { instagram: 'https://instagram.com/fornario' }, publico: 'Famílias do bairro',
  diferenciais: 'Forno a lenha', proibidos: 'Política', concorrentes: [{ nome: 'Forno Bom' }] }
const assets = [
  { id: id(801), client_id: C, folder: 'design', name: 'Logo Fornario.png', bucket: 'client-assets', path: `${C}/design/logo.png`, mime: 'image/png', size_bytes: 2048, source: 'manual', created_at: '2026-11-10T10:00:00Z' },
  { id: id(802), client_id: C, folder: 'briefing', name: 'Tabela de preços · lista.pdf', bucket: 'client-assets', path: `${C}/briefing/precos.pdf`, mime: 'application/pdf', size_bytes: 4096, source: 'manual', created_at: '2026-11-11T10:00:00Z' },
]
async function mock(route) {
  const req = route.request(); const u = new URL(req.url())
  const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }
  const t = u.pathname.split('/').pop()
  if (u.hostname.endsWith('supabase.co') && req.method() === 'GET' && t === 'client_assets') return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(assets) })
  if (u.hostname.endsWith('supabase.co') && req.method() === 'GET' && t === 'client_services') return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify([{ services: { is_audiovisual: true } }]) })
  if (u.hostname.endsWith('supabase.co') && req.method() === 'GET' && t === 'client_briefs') {
    const row = { data: BRIEF, updated_at: '2026-11-16T10:00:00Z' }
    return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify((req.headers()['accept'] || '').includes('vnd.pgrst.object') ? row : [row]) })
  }
  if (u.hostname.endsWith('supabase.co') && req.method() === 'POST' && t === 'client_briefs') { try { saves.push(JSON.parse(req.postData() || '{}')) } catch { /* */ } }
  return base.mock(route)
}
const board = `/estrategia/consultoria?cliente=${C}&ver=estrategia&mes=${month}&parte=briefing`
const popup = (p) => p.evaluate(() => {
  const d = [...document.querySelectorAll('dialog[open]')].pop(); if (!d) return null
  const b = d.querySelector('.overflow-y-auto')
  return { title: d.getAttribute('aria-label') || d.querySelector('h2')?.textContent, sh: b ? b.scrollHeight : 0, ch: b ? b.clientHeight : 0, q: d.querySelector('[data-quiz] b')?.textContent ?? '' }
})
let shots = 0
const check = async (p, tag, name) => {
  const m = await popup(p)
  if (!m) { fails.push(`${tag}: ${name} não abriu`); return null }
  if (m.sh > m.ch + 1) { fails.push(`${tag}: "${m.title}" ${m.q ? `(${m.q}) ` : ''}rola ${m.sh}/${m.ch}`); await p.screenshot({ path: `${OUT}/briefing-rola-${tag}-${++shots}.png` }) }
  return m
}
const closeAll = async (p) => { for (let k = 0; k < 4 && (await p.locator('dialog[open]').count()); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150) } }
const NEW = ['Posicionamento', 'Propósito e história', 'Momento e futuro', 'Como o cliente compra', 'Jeito da marca', 'Marketing até hoje', 'Sazonalidade', 'Marca e acessos', 'Histórias e assuntos', 'Público', 'Como quer ser vista', 'Gravação']
const OLD = ['Diferenciais', 'História', 'Visão', 'Objeções', 'Proibidos', 'Personalidade', 'Capacidade', 'Voz']
const TEXT = ['Histórias e assuntos', 'Posicionamento', 'Propósito e história', 'Momento e futuro', 'Como o cliente compra', 'Jeito da marca', 'Marketing até hoje', 'Marca e acessos', 'Público', 'Como quer ser vista']

;(async () => {
  const b = await chromium.launch()
  for (const [tag, opts, roles] of [['iphone', devices['iPhone 13'], 'admin'], ['desk', { viewport: { width: 1366, height: 800 } }, 'admin'], ['equipe', devices['iPhone 13'], 'social_media']]) {
    const ctx = await b.newContext(opts); await ctx.route('**/*', mock)
    await ctx.addInitScript((r) => { try { localStorage.setItem('e2e_roles', r) } catch { /* */ } }, roles)
    const p = await ctx.newPage(); const errs = []
    p.on('pageerror', (e) => errs.push(e.message))
    await p.goto(BASE + board); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1200)
    await p.locator('[data-ver-tudo]').click(); await p.waitForTimeout(300)
    const tiles = (await p.locator('[data-briefing] [data-item] span.line-clamp-2').allInnerTexts()).map((x) => x.trim())
    for (const n of NEW) if (!tiles.includes(n)) fails.push(`${tag}: falta o cartão ${n}`)
    for (const n of OLD) if (tiles.includes(n)) fails.push(`${tag}: cartão antigo ainda aparece: ${n}`)
    const tile = (n) => p.locator('[data-briefing] [data-item]').filter({ has: p.locator('span.line-clamp-2', { hasText: new RegExp(`^${n}$`) }) }).first()

    // Cada cartão de texto: modo de resposta, o guia inteiro (uma resposta por pergunta) e o texto com o resultado.
    if (tag !== 'desk' || true) for (const n of (tag === 'equipe' ? ['Marketing até hoje', 'Momento e futuro'] : TEXT)) {
      await tile(n).click(); await p.waitForTimeout(350)
      const first = await check(p, tag, n)
      if (!first) continue
      const d = p.locator('dialog[open]').last()
      // Já preenchido abre no texto; o resto abre nos 3 jeitos (Falar, Escolher, Digitar).
      if (await d.locator('[data-modo-resposta]').count()) {
        const modes = (await d.locator('[data-modo-resposta] b').allInnerTexts()).join(',')
        if (modes !== 'Falar,Escolher,Digitar') fails.push(`${tag}: ${n} modos ${modes}`)
        await d.getByRole('button', { name: /Escolher/ }).click()
      } else await d.getByRole('button', { name: /Escolher opções/ }).click()
      await p.waitForTimeout(250)
      let fio = 0, money = 0
      for (let k = 0; k < 40; k++) {
        const m = await check(p, tag, `${n} guia ${k + 1}`); if (!m) break
        const q = p.locator('dialog[open]').last()
        if (!(await q.locator('[data-quiz]').count())) break
        if (await q.locator('[data-puxa-fio]').count()) fio++
        if (/administrador/.test(await q.locator('p, [id]').first().innerText().catch(() => '')) || /só administrador vê/.test((await q.innerText()))) money++
        if (await q.locator('[data-quiz] textarea').count()) await q.locator('[data-quiz] textarea').fill('Exemplo real: a cliente Ana voltou três vezes no mês')
        else await q.locator('[data-quiz] [role=group] button[aria-pressed]').first().click()
        const nx = q.getByRole('button', { name: /^(Próxima|Usar respostas)$/ })
        const lastStep = (await nx.innerText()) === 'Usar respostas'
        await nx.click(); await p.waitForTimeout(200)
        if (lastStep) break
      }
      if (!fio) fails.push(`${tag}: ${n} sem puxa-fio no guia`)
      if (tag === 'equipe' && money) fails.push(`${tag}: ${n} mostrou pergunta de dinheiro para quem não é admin`)
      if (tag !== 'equipe' && /Marketing|Momento/.test(n) && !money) fails.push(`${tag}: ${n} sem a pergunta de dinheiro para admin`)
      const back = await check(p, tag, `${n} texto`)
      const d2 = p.locator('dialog[open]').last()
      const cash = await d2.locator('[data-dinheiro]').count()
      if (tag === 'equipe' && cash) fails.push(`${tag}: ${n} mostrou valores para quem não é admin`)
      if (tag !== 'equipe' && /Marketing|Momento/.test(n) && !cash) fails.push(`${tag}: ${n} sem os campos de valor`)
      if (back && n === 'Posicionamento') {
        const txt = await d2.locator('textarea').first().inputValue()
        if (!/Diferenciais: Forno a lenha/.test(txt)) fails.push(`${tag}: Posicionamento não trouxe o texto de Diferenciais (${txt.slice(0, 60)})`)
        await d2.getByRole('button', { name: /^Salvar/ }).first().click(); await p.waitForTimeout(500)
        const last = saves.at(-1)?.data ?? {}
        if (!last.posicionamento || last.diferenciais !== 'Forno a lenha') fails.push(`${tag}: salvar Posicionamento não gravou na chave principal mantendo a antiga`)
      }
      if (back && n === 'Marketing até hoje' && tag === 'iphone') {
        await d2.getByRole('button', { name: /^Salvar/ }).first().click(); await p.waitForTimeout(500)
        const last = saves.at(-1)?.data ?? {}
        if (!last.verba_anuncio || /R\$/.test(last.marketing ?? '')) fails.push(`${tag}: verba não foi para o campo de valor (${JSON.stringify(last).slice(0, 120)})`)
      }
      await closeAll(p)
    }

    // Sazonalidade: tocar nos meses (1x forte, 2x fraco) e o porquê.
    await tile('Sazonalidade').click(); await p.waitForTimeout(300)
    if (await check(p, tag, 'Sazonalidade')) {
      const d = p.locator('dialog[open]').last()
      await d.locator('[data-sazonalidade] button[aria-label^="dezembro"]').click()
      await d.locator('[data-sazonalidade] button[aria-label^="fevereiro"]').click(); await d.locator('[data-sazonalidade] button[aria-label^="fevereiro"]').click()
      const st = await d.locator('[data-sazonalidade] [data-mes]').evaluateAll((xs) => xs.map((x) => x.getAttribute('data-mes')))
      if (st[11] !== 'forte' || st[1] !== 'fraco') fails.push(`${tag}: meses não marcaram (${st.join(',')})`)
      if (/comemorativ/i.test(await d.locator('[data-sazonalidade]').innerText())) fails.push(`${tag}: sazonalidade pergunta data comemorativa`)
      await d.locator('textarea').fill('Dezembro enche com as festas; fevereiro cai com o carnaval')
      await check(p, tag, 'Sazonalidade preenchida')
      await d.getByRole('button', { name: /^Salvar/ }).first().click(); await p.waitForTimeout(500)
      const last = saves.at(-1)?.data ?? {}
      if (JSON.stringify(last.meses_fortes) !== '[12]' || JSON.stringify(last.meses_fracos) !== '[2]') fails.push(`${tag}: sazonalidade não gravou (${JSON.stringify(last).slice(0, 120)})`)
      await closeAll(p)
    }
    // Gravação (cliente com vídeo).
    await tile('Gravação').click(); await p.waitForTimeout(300); await check(p, tag, 'Gravação'); await closeAll(p)

    // Documentos: 18 pedidos em 5 grupos, o já anexado marcado, Importar abre a lista das outras pastas.
    const reqs = await p.locator('[data-pedidos] [data-pedido]').evaluateAll((xs) => xs.map((x) => `${x.getAttribute('data-pedido')}:${x.getAttribute('data-feito')}`))
    if (reqs.length !== 18) fails.push(`${tag}: ${reqs.length} pedidos de arquivo`)
    if (!reqs.includes('precos:sim') || !reqs.includes('fotos:nao')) fails.push(`${tag}: marcação dos pedidos errada (${reqs.join(' ')})`)
    const anexar = p.locator('[data-pedido="fotos"] button', { hasText: 'Anexar' })
    const [chooser] = await Promise.all([p.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null), anexar.click()])
    if (!chooser) fails.push(`${tag}: Anexar não abriu a escolha de arquivo`)
    await p.locator('[data-pedido="logo"] button[aria-label^="Importar"]').click(); await p.waitForTimeout(300)
    const imp = await check(p, tag, 'Importar')
    if (imp && !(await p.locator('dialog[open] [data-importar] li').count())) fails.push(`${tag}: Importar sem arquivos das outras pastas`)
    await closeAll(p)

    if (await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)) fails.push(`${tag}: tela rola de lado`)
    await p.screenshot({ path: `${OUT}/briefing-cartoes-${tag}.png`, fullPage: true })
    for (const e of errs) fails.push(`${tag}: erro no navegador: ${e}`)
    await ctx.close()
  }
  await b.close()
  console.log(fails.length ? `FALHAS (${fails.length}):\n- ${fails.join('\n- ')}` : 'Briefing: cartões, guias, dinheiro, sazonalidade e pedidos de arquivo ok, sem rolagem.')
  process.exit(fails.length ? 1 : 0)
})()
