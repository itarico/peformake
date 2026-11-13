const { chromium } = require('/opt/node-tools/node_modules/playwright')
;(async () => {
  const dir = '/tmp/claude-0/-home-user-peformake/4934d95e-3b67-551c-8aa3-832e43422260/scratchpad/paulo/'
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1333, height: 750 }, deviceScaleFactor: 1 })
  await p.goto('file://' + dir + 'estrategia-nov-dez.html')
  await p.emulateMedia({ media: 'print' })
  const n = await p.$$eval('.pg', (x) => x.length)
  const issues = await p.$$eval('.pg', (S) => S.map((s, i) => {
    const r = s.getBoundingClientRect(); const out = []
    s.querySelectorAll('*').forEach((e) => {
      if (e.closest('.foot') || s.classList.contains('cover')) return
      const q = e.getBoundingClientRect()
      if (q.width && (q.bottom > r.bottom - 44 || q.right > r.right - 20)) out.push('out:' + (e.className || e.tagName))
    })
    s.querySelectorAll('.card,.vr,.saw,.do,.camp,.opt,.wd,td,.body').forEach((e) => { if (e.scrollHeight > e.clientHeight + 2) out.push('clip:' + e.className) })
    return out.length ? (i + 1) + ': ' + [...new Set(out)].slice(0, 6).join(', ') : null
  }).filter(Boolean))
  console.log('pages', n); console.log(issues.join('\n'))
  const els = await p.$$('.pg')
  for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: dir + 'shots/p' + String(i + 1).padStart(2, '0') + '.png' })
  if (process.argv[2] === 'pdf') await p.pdf({ path: dir + 'estrategia-nov-dez.pdf', width: '1333px', height: '750px', printBackground: true })
  await b.close()
})()
