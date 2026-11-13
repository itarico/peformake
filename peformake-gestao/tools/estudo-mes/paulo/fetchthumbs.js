const { chromium } = require('/opt/node-tools/node_modules/playwright')
const fs = require('fs'), crypto = require('crypto')
const idxF = 'thumbs/index.json'; const idx = JSON.parse(fs.readFileSync(idxF, 'utf8'))
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
const tt = JSON.parse(fs.readFileSync('badtt.json','utf8'))
const ig = []
async function save(url, imgUrl, headers = {}) {
  const r = await fetch(imgUrl, { headers: { 'User-Agent': UA, ...headers } }); const b = Buffer.from(await r.arrayBuffer())
  if (b.length < 3000) throw new Error('small ' + b.length)
  const key = crypto.createHash('md5').update(url).digest('hex').slice(0, 10)
  fs.writeFileSync('thumbs/' + key + '.img', b); idx[url] = { ...(idx[url] || {}), url, file: 'thumbs/' + key + '.img' }
}
;(async () => {
  for (const u of tt) {
    try {
      const h = await (await fetch(u, { headers: { 'User-Agent': UA } })).text()
      const m = h.match(/"cover":"([^"]+)"/) || h.match(/"originCover":"([^"]+)"/)
      if (!m) throw new Error('no cover')
      await save(u, JSON.parse('"' + m[1] + '"')); console.log('ok', u)
    } catch (e) { console.log('fail', u, e.message) }
  }
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 540, height: 960 } })
  for (const c of ig) {
    const url = 'https://www.instagram.com/p/' + c + '/'
    try {
      await p.goto(url + 'embed/', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
      const src = await p.$$eval('img', (I) => I.filter((i) => i.naturalWidth > 200).map((i) => i.src))
      if (!src.length) throw new Error('no img')
      await save(url, src[0]); console.log('ok', url)
    } catch (e) { console.log('fail', url, e.message) }
  }
  await b.close(); fs.writeFileSync(idxF, JSON.stringify(idx))
})()
