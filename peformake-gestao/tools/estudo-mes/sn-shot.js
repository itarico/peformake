const { chromium } = require('/opt/node-tools/node_modules/playwright')
const fs = require('fs'), path = require('path')
;(async () => {
  const root = path.resolve(__dirname, '..')
  const only = process.argv[3]
  const b = await chromium.launch()
  for (const m of ['sn']) for (const f of ['estrategia', 'social-media', 'audiovisual']) {
    if (only && !(m + '/' + f).includes(only)) continue
    const file = path.join(root, m, f + '-nov-dez')
    const p = await b.newPage({ viewport: { width: 1333, height: 750 }, deviceScaleFactor: 1 })
    await p.goto('file://' + file + '.html'); await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(300)
    const issues = await p.$$eval('.pg', (S) => S.map((s, i) => {
      const r = s.getBoundingClientRect(); const out = []
      s.querySelectorAll('*').forEach((e) => {
        if (e.closest('.foot') || s.classList.contains('cover') || s.classList.contains('avcover')) return
        const q = e.getBoundingClientRect()
        if (q.width && (q.bottom > r.bottom - 44 || q.right > r.right - 20)) out.push('out:' + (e.className || e.tagName))
      })
      s.querySelectorAll('.card,.vr,.saw,.do,.camp,.opt,.wd,td,.body,.sw,.bx,.leg,.left,.rgt,.two,.rf,.est,.why').forEach((e) => { if (e.scrollHeight > e.clientHeight + 2) out.push('clip:' + e.className) })
      return out.length ? (i + 1) + ': ' + [...new Set(out)].slice(0, 6).join(', ') : null
    }).filter(Boolean))
    const sd = path.join(root, 'shots', m); fs.mkdirSync(sd, { recursive: true })
    const els = await p.$$('.pg')
    for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: path.join(sd, f + '-' + String(i + 1).padStart(2, '0') + '.png') })
    if (process.argv[2] === 'pdf') await p.pdf({ path: file + '.pdf', width: '1333px', height: '750px', printBackground: true })
    console.log(m, f, els.length, issues.join(' | '))
    await p.close()
  }
  await b.close()
})()
