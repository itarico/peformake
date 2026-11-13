// Peformake v2 (13/11/2026): kit comum dos documentos da própria Peformake (estratégia, venda, tráfego, social).
// Lê pf_kit3.js (cópia congelada do build3.js de 13/11) para não depender do arquivo que outro agente edita.
const fs = require('fs')
const path = require('path')
const GEN = __dirname
const src = fs.readFileSync(path.join(GEN, 'pf_kit3.js'), 'utf8')
const partA = src.slice(0, src.indexOf('// ---------------- conteúdo por marca'))
const partB = src.slice(src.indexOf('// ---------------- páginas'), src.indexOf('D.Fornario.pieces[3][3]'))
const K = new Function('require', '__dirname', partA + partB + '\nreturn { Doc, card, ul, cover, tesePage, offerPage, avCover, studyPage, html, ell, logo, PER }')(require, GEN)

const OUT = path.resolve(GEN, '..', 'peformake')
fs.mkdirSync(OUT, { recursive: true })
const DIRS = [path.join(GEN, 'pf_thumbs'), path.resolve(GEN, '..', '..', 'avs', 'th')]
const img = (k) => {
  for (const d of DIRS) { const f = path.join(d, k + '.jpg'); if (fs.existsSync(f)) return 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64') }
  throw new Error('miniatura não encontrada: ' + k)
}
const AD = (id) => 'https://www.facebook.com/ads/library/?id=' + id
const TT = (u, id) => `https://www.tiktok.com/@${u}/video/${id}`
const fixCover = (h) => h.replace(/Para Peformake e equipe Peformake/g, 'Para a equipe Peformake')

// Anúncios de referência da Biblioteca (dias no ar contados em 13/11/2026)
const ADS = {
  alldaya: { im: 'ad_alldaya', id: '1318513082458951', page: 'Alldaya Marketing', d: 425, what: '“Quer vender mais uniformes?” Nicho dito na 1ª frase, formulário' },
  bindes2: { im: 'ad_bindes2', id: '1150171760429799', page: 'Fábio Bindes (restaurantes)', d: 366, what: '“Prazer, eu sou…” Rosto do dono e a própria história como prova' },
  brunoluis: { im: 'ad_brunoluis', id: '1184798890478496', page: 'Bruno Luís (salões)', d: 288, what: '“O Instagram está MATANDO os salões”: dor forte e botão do WhatsApp' },
  bindes: { im: 'ad_bindes', id: '3461623043997383', page: 'Fábio Bindes (restaurantes)', d: 230, what: '“Demorei 10 anos… te explico em 1 minuto”: aula curta como anúncio' },
  talisma: { im: 'ad_talisma', id: '944953507944691', page: 'Agência Talismã (advogados)', d: 221, what: '“Mas eu só consigo cliente por indicação”: a objeção vira gancho' },
  trivo: { im: 'ad_trivo', id: '970745148664742', page: 'Trivo (marmorarias)', d: 212, what: 'Humor: “as pedras começaram a falar”; marca lembrada sem promessa' },
  growthodonto: { im: 'ad_growthodonto', id: '2055152195075870', page: 'Growth Odonto', d: 156, what: 'Responde no story “se são tão bons, por que…”: objeção na tela' },
  alavant: { im: 'ad_alavant_0', id: '1659169755173117', page: 'Alavant (restaurantes)', d: 108, what: 'Case com a dona da confeitaria: “depois de duas agências…”' },
  igor2biz: { im: 'ad_igor2biz', id: '1031340829759747', page: '2biz (restaurantes)', d: 107, what: 'Close do especialista falando; chamada “fale com um especialista”' },
  laquila: { im: 'ad_laquila', id: '1376669714035197', page: 'Laquila (advogados)', d: 77, what: '“Somos o nosso próprio case”: quem viveu a dor ensina' },
  fga: { im: 'ad_fga', id: '1589978998915306', page: 'Instituto FGA', d: 52, what: '“O risco é nosso”: plano de 3 meses ou devolve; garantia na 1ª linha' },
  alpha: { im: 'ad_alpha', id: '1042390958807047', page: 'Alpha Assessoria (delivery)', d: 28, what: '“A maior assessoria de…”: autoridade por tamanho' },
  baruk: { im: 'ad_baruk_0', id: '1095856403078936', page: 'Agência Baruk', d: 7, what: '“Antes de pôr mais dinheiro, faz um teste”: ensina em vez de prometer' },
  growing: { im: 'ad_growing_0', id: '1179610087733475', page: 'Growing Performance', d: 8, what: '“Dobrar o faturamento em 2027”: aula ao vivo como isca' },
  provex: { im: 'ad_provex_0', id: '1644772870382192', page: 'Provex Assessoria', d: 1, what: 'Black Friday: “15 dias de anúncio grátis” (briga de preço)' },
  maracatu: { im: 'ad_maracatu_1', id: '1739064560503450', page: 'Maracatu Digital (Recife)', d: 1, what: 'Rosto da equipe e “solicite uma proposta”: o local mais parecido' },
  dezemhum: { im: 'ad_dezemhum_1', id: '4167174020249377', page: 'Dezemhum (gastronomia)', d: 1, what: '“Seu marketing traz cliente ou só faz post?”: pergunta direta' },
  taghy: { im: 'ad_taghy_1', id: '1155657710220716', page: 'Taghy (gastronomia)', d: 15, what: '“Vídeos mensais” e agência completa para comida de verdade' },
}

const CSS = `<style>
.xg2{display:grid;grid-template-columns:1fr 1fr;gap:26px}.xg3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.xtab{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:2px solid var(--dk);border-radius:14px;overflow:hidden;box-shadow:5px 5px 0 var(--dk);font-size:14px;line-height:1.32}
.xtab th{background:var(--dk);color:#fff;text-align:left;padding:7px 9px;font:800 10.5px Inter;text-transform:uppercase;letter-spacing:.05em}
.xtab td{padding:9px 10px;border-top:1px solid #d5e8eb;vertical-align:top}.xtab td b{font-weight:800}.xtab td small{display:block;color:#4b6d73;font-size:11.5px}
.xtab tr.hi td{background:#E3F7FA}.xtab tr.lo td{background:#fff3f1}.xtab a{color:var(--pe);font-weight:700}
.xbar{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:14px}.xbar span{width:170px;line-height:1.2}.xbar i{display:block;height:20px;background:var(--cy);border:1.5px solid var(--dk);border-radius:5px}.xbar b{font:800 14px Inter;white-space:nowrap}
.xk{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.xk div{background:var(--dk);color:#fff;border-radius:12px;padding:9px 11px}.xk b{display:block;font:800 22px 'Inter Display';color:var(--cy)}.xk span{font-size:12px;line-height:1.25;display:block}
.xbox{background:#fff;border:2px solid var(--dk);border-radius:14px;padding:13px 15px;box-shadow:5px 5px 0 var(--dk)}.xbox h3{font:800 16.5px 'Inter Display',Inter;margin-bottom:7px}
.xbox ul li{font-size:14.2px;margin-bottom:6px;line-height:1.32}.xbox p{font-size:14.2px;line-height:1.38}
.xdk{background:var(--dk);color:#fff}.xdk h3{color:var(--cy)}.xdk ul li:before{background:var(--cy)}
.xq{display:block;font-style:italic;background:#E3F7FA;border-left:4px solid var(--cy);padding:5px 9px;border-radius:6px;margin:5px 0;font-size:14px;line-height:1.32}
.xq:before{content:"“"}.xq:after{content:"”"}
.xl{font:800 10.5px Inter;text-transform:uppercase;letter-spacing:.07em;color:var(--pe);display:block;margin-bottom:2px}
.xof{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.xofc{background:#fff;border:2px solid var(--dk);border-radius:16px;box-shadow:6px 6px 0 var(--dk);padding:14px 16px;position:relative}
.xofc.main{background:var(--dk);color:#fff}.xofc.main .xl{color:var(--cy)}.xofc h3{font:800 20px 'Inter Display';margin-bottom:6px}
.xofc .r{display:grid;grid-template-columns:104px 1fr;gap:8px;padding:4px 0;border-top:1px dashed #b9d6db;font-size:13.2px;line-height:1.3}.xofc.main .r{border-color:#2b6670}
.xofc .r .xl{margin:1px 0 0}.xofc .win{margin-top:7px;background:#E3F7FA;color:var(--dk);border-radius:9px;padding:7px 10px;font-size:13px;line-height:1.3}
.xofc.main .win{background:var(--cy)}
.xch{display:flex;gap:10px;align-items:stretch;margin-bottom:14px}.xch>div{flex:1;background:#fff;border:2px solid var(--dk);border-radius:12px;padding:10px 11px;box-shadow:4px 4px 0 var(--dk);font-size:13px;line-height:1.3}
.xch>div.v{background:var(--dk);color:#fff}.xch>div.v b{color:var(--cy)}
.xfl{display:flex;gap:8px;align-items:stretch}.xfl>div{flex:1;background:#fff;border:2px solid var(--dk);border-radius:12px;padding:9px 10px;position:relative;box-shadow:4px 4px 0 var(--dk);font-size:12.6px;line-height:1.28}
.xfl>div h4{font:800 14px 'Inter Display';margin-bottom:3px}.xfl>div .m{display:block;margin-top:5px;background:var(--dk);color:var(--cy);font:800 12.5px Inter;border-radius:7px;padding:4px 7px}
.xfl>div .w{display:block;margin-top:4px;color:#4b6d73;font-size:11.8px}
.xref{display:flex;gap:8px;align-items:flex-start}.xref a.t{flex:0 0 auto}.xref img{width:54px;height:76px;object-fit:cover;border-radius:7px;border:1.5px solid var(--dk)}
.xref .ri{font-size:11.6px;line-height:1.25}.xref .ri b{display:block;font-size:12px}.xref .ri em{font-style:normal;font-weight:800;color:var(--pe)}
.xsc{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.xsc div{background:#fff;border:2px solid var(--dk);border-radius:12px;padding:8px 9px;text-align:center}
.xsc b{display:block;font:800 26px 'Inter Display';color:var(--pe)}.xsc span{font-size:11.5px;line-height:1.2;display:block}
.xsc div.ok b{color:#0a8f5b}.xsc div.mid b{color:#c77d00}
.xnote{margin-top:10px;font-size:13.4px;line-height:1.35;background:#fff;border-left:6px solid var(--cy);padding:8px 12px;border-radius:8px}
.xone{background:var(--cy);color:var(--dk);border:2px solid var(--dk);border-radius:14px;padding:10px 14px;font-size:14.5px;line-height:1.35;box-shadow:5px 5px 0 var(--dk)}
.xone b.k{display:block;font:800 11px Inter;text-transform:uppercase;letter-spacing:.08em}
.xstep{display:grid;grid-template-columns:34px 1fr;gap:10px;margin-bottom:8px}.xstep>b{width:34px;height:34px;border-radius:10px;background:var(--dk);color:var(--cy);display:flex;align-items:center;justify-content:center;font:800 16px Inter}
.xstep h4{font:800 15px 'Inter Display';margin-bottom:2px}.xstep p{font-size:13.2px;line-height:1.32}
.xmsg{background:#DCF8C6;border:1.5px solid #9cc98a;border-radius:10px 10px 10px 2px;padding:7px 10px;font-size:13px;line-height:1.32;margin:4px 0}
.xmsg.me{background:#fff;border-color:#b9d6db;border-radius:10px 10px 2px 10px}
.xmsg small{display:block;font:800 10px Inter;text-transform:uppercase;letter-spacing:.06em;color:#4b6d73;margin-bottom:2px}
.big .body{display:flex;flex-direction:column;justify-content:space-evenly}.big .body>*{flex:0 0 auto}
.big .xbox p,.big .xbox ul li{font-size:15.6px;line-height:1.42}.big .xbox h3{font-size:18.5px}.big .xbox{padding:16px 18px}
.big .xtab{font-size:15.2px}.big .xtab td{padding:11px 12px}.big .xtab th{font-size:11.5px;padding:9px 12px}.big .xtab td small{font-size:12.5px}
.big .xch>div{font-size:16.5px;padding:16px 15px;line-height:1.42;min-height:170px}.big .xch>div b.lb{font-size:12.5px}.big .xfl>div{font-size:15px;padding:13px 13px;line-height:1.38;min-height:150px}.big .xfl>div h4{font-size:16.5px}
.big .xq{font-size:15.2px;margin:7px 0}.big .xbar{font-size:15px;margin-bottom:10px}.big .xbar i{height:24px}
.big .xofc .r{font-size:15px;grid-template-columns:120px 1fr;padding:6px 0;line-height:1.36}.big .xofc h3{font-size:23px}.big .xofc .win{font-size:14.6px;padding:9px 12px}
.big .xmsg{font-size:15.2px;padding:9px 12px;margin:7px 0}.big .xstep{margin-bottom:14px}.big .xstep p{font-size:15.4px;line-height:1.4}.big .xstep h4{font-size:17.5px}.big .xl{font-size:12px}
.big .xk b{font-size:26px}.big .xk span{font-size:13.2px}.big .xnote{font-size:15px}
.big .eq{font-size:15.5px}.big .cal td{padding-top:9px;padding-bottom:9px}
.xch>div b.lb{display:block;font:800 11px Inter;text-transform:uppercase;letter-spacing:.07em;color:var(--pe);margin-bottom:3px}.xch>div.v b.lb{color:var(--cy)}
</style>`

module.exports = { K, OUT, img, AD, TT, ADS, CSS, fixCover, ul: K.ul }
