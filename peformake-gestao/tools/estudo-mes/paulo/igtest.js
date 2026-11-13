const { chromium } = require('/opt/node-tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 540, height: 960 } })
  await p.goto('https://www.instagram.com/p/' + process.argv[2] + '/embed/', { waitUntil: 'networkidle', timeout: 30000 }).catch(e=>console.log('nav',e.message))
  const src = await p.$$eval('img', (I) => I.map((i) => [i.src, i.naturalWidth, i.naturalHeight]).filter((x) => x[1] > 200))
  console.log(JSON.stringify(src).slice(0, 600))
  await b.close()
})()
