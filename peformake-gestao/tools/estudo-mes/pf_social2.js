// Peformake · Planejamento de social media + design v2 (13/11/2026): 10 postagens alinhadas à estratégia v2 e ao audiovisual v2,
// cada uma com 2 referências de arte (imagem embutida, link e o que pegar). Usa pf_sm.js (cópia do sm.js com o bloco de arte).
const fs = require('fs')
const path = require('path')
const { K, OUT, img, AD, CSS, fixCover, ul } = require('./pfk.js')
const { Doc, cover, html } = K
const BR = 'Peformake'

// Referências de arte (Biblioteca de Anúncios da Meta, dias no ar em 13/11/2026)
const A = {
  alavant0: ['ad_alavant_0', '1659169755173117', 'Alavant', 108], alavant1: ['ad_alavant_1', '1633848741490201', 'Alavant', 62], alavant2: ['ad_alavant_2', '1106963192187523', 'Alavant', 28],
  maracatu: ['ad_maracatu_1', '1739064560503450', 'Maracatu Digital (Recife)', 1], laquila: ['ad_laquila', '1376669714035197', 'Laquila', 77],
  dezem0: ['ad_dezemhum_0', '1764827027938717', 'Dezemhum', 1], baruk1: ['ad_baruk_1', '1123882513712692', 'Agência Baruk', 4], baruk2: ['ad_baruk_2', '1454864229949918', 'Agência Baruk', 1],
  talisma: ['ad_talisma', '944953507944691', 'Agência Talismã', 221], igor: ['ad_igor2biz', '1031340829759747', '2biz', 107],
  fg0: ['ad_fg_0', '4563672903889780', 'FG Digital', 16], growing1: ['ad_growing_1', '2575105709583574', 'Growing Performance', 7],
  godonto: ['ad_growthodonto', '2055152195075870', 'Growth Odonto', 156], taghy1: ['ad_taghy_1', '1155657710220716', 'Taghy', 15], taghy2: ['ad_taghy_2', '1686621789485393', 'Taghy', 1],
  provex1: ['ad_provex_1', '2600172127121796', 'Provex', 2], fga: ['ad_fga', '1589978998915306', 'Instituto FGA', 52], bindes2: ['ad_bindes2', '1150171760429799', 'Fábio Bindes', 366],
}
const art = (k, take) => { const a = A[k]; return { src: img(a[0]), url: AD(a[1]), at: a[2], d: `Biblioteca de Anúncios · ${a[3]} ${a[3] === 1 ? 'dia' : 'dias'} no ar`, take } }
const ARTS = [
  [art('alavant2', 'Foto real da equipe em pé com o dono, no lugar dele: a composição da capa.'), art('maracatu', 'Uma pessoa por tela, de corpo inteiro, fundo do escritório real.')],
  [art('laquila', 'Uma frase enorme centralizada sobre fundo escuro: o “192” ocupa a capa assim.'), art('alavant1', 'Print do celular recortado com sombra: a tela 5 com o gráfico do sistema.')],
  [art('dezem0', 'Pergunta no topo + celular em mockup: a comparação “vende × enfeita”.'), art('baruk1', 'Faixa de cor só na palavra que importa: “vende” em ciano.')],
  [art('talisma', 'Legenda grande no meio da fala, 2 linhas no máximo.'), art('igor', 'Close do rosto com fundo desfocado: a capa do Reels.')],
  [art('fg0', 'Número grande em caixa (“16 a 20”) + botão desenhado: o contador “20 vagas”.'), art('growing1', 'Caixinha de pergunta do story como título: “Cadê o desconto?”')],
  [art('godonto', 'Celular na mão em primeiro plano, caixinha por cima: a capa do teste.'), art('dezem0', 'Mockup de celular com o anúncio dentro: telas 2 a 4.')],
  [art('taghy2', 'Produto grande + pergunta curta embaixo: o Combo da VOVINA com o “893”.'), art('alavant0', 'Dupla dono + resultado em vermelho; aqui em ciano e com número.')],
  [art('alavant2', 'Equipe e dono juntos no salão: a capa “o marketing veio gravar”.'), art('taghy1', 'Cozinha real, luz quente, sem texto em cima do produto.')],
  [art('taghy2', 'Close do prato com contraste alto: o “depois” de cada erro.'), art('baruk2', 'Fundo escuro de restaurante e texto pequeno no canto: tela final da Ellcazo.')],
  [art('fga', 'Faixa amarela com o prazo (“4 semanas”): aqui “até 19/12” em ciano.'), art('fg0', 'Data grande + botão “Quero o meu”: a tela da oferta.')],
]

const PIL = [['Prova (cases com número)', 30, 'Ótica MD, VOVINA, Fornario; sempre com o número do sistema'], ['A equipe dentro do cliente', 20, 'o marketing gravando no restaurante, o take 7, a diária'], ['Educação para o dono', 20, 'vende × enfeita, teste do celular, 3 erros do vídeo'], ['Italo (marca pessoal)', 15, 'a dicção, o automático; collab com @italosantosdigital'], ['Oferta', 15, 'Raio-X (20 vagas), Diária Ellcazo, Comece 2027']]
function pilaresPage(d) {
  d.page('pf', `${BR} · Pilares, ritmo e design`, 'Gente de verdade, número de verdade e uma porta: o Raio-X', `
  <div class="xg2" style="grid-template-columns:1.1fr 1fr">
    <div class="xbox"><h3>Pilares (da estratégia: tese “o case é o anúncio”)</h3>
      ${PIL.map((p) => `<div class="xbar"><span style="width:230px"><b>${p[0]}</b><small style="display:block;color:#4b6d73;font-size:12px">${p[2]}</small></span><i style="width:${p[1] * 7}px"></i><b>${p[1]}%</b></div>`).join('')}
      <p class="cap" style="margin-top:6px">3 posts por semana no @peformake + stories diários. Toda peça termina no <b>Raio-X no WhatsApp</b> ou na oferta da semana.</p></div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="xbox xdk"><h3>Ritmo da semana</h3>${ul(['<b>Seg</b> educação para o dono (Thyfany escreve, Higor desenha)', '<b>Qua/Qui</b> prova: case ou a equipe no cliente (Reels do Almeida)', '<b>Sex</b> Italo ou oferta (corte de anúncio do Lucas)', '<b>Todo dia</b> stories: bastidor e contador de vagas (Ingrid)'])}</div>
      <div class="xbox"><h3>Design: as regras do período</h3>${ul(['Fundo branco ou azul-escuro; <b>ciano só no número que importa</b>', 'Foto real da equipe e do cliente; nunca banco de imagem', 'Número do case grande na capa, com “dados do sistema”', 'Selo fixo “Raio-X grátis no WhatsApp”', 'Peça de audiovisual com a marca Ellcazo (verde-limão)'])}</div>
    </div>
  </div>`, { cls: 'dense big' })
}

function calPage(d, P) {
  const map = ['Relação · P1 equipe', 'Provar · P4', 'Educação · atrair', 'Atrair · P3', 'Converter · P8', 'Quebrar objeção', 'Provar · P5', 'Atrair · P1', 'Converter · P9', 'Converter · P10']
  const off = ['Raio-X', 'Raio-X', 'Raio-X', 'Raio-X', 'Raio-X (BF, 20 vagas)', 'Raio-X', 'Da gravação ao cliente', 'Raio-X', 'Diária Ellcazo', 'Comece 2027']
  d.page('pf', `${BR} · As 10 postagens no calendário`, 'Cada post serve a uma oferta, com papel e data', `
  <table class="xtab"><thead><tr><th>Nº</th><th>Quando</th><th>Postagem</th><th>Formato</th><th>Papel · vídeo ligado</th><th>Oferta</th></tr></thead><tbody>
  ${P.map((p, i) => `<tr class="${/Venda|Converter/.test(map[i]) ? 'hi' : ''}"><td><b>${String(i + 1).padStart(2, '0')}</b></td><td><b>${p.date}</b></td><td><b>${p.title}</b></td><td>${p.fmt}</td><td>${map[i]}</td><td>${off[i]}</td></tr>`).join('')}
  </tbody></table>
  <p class="cap" style="margin-top:8px">Datas sem post: 20/11 e 08/12 (feriados, só story de horário), 24 a 27/12 (Natal: post de obrigado com a equipe e os clientes). Códigos P = vídeos do Planejamento de audiovisual.</p>`, { cls: 'dense big' })
}

const s = Doc(BR, 'Social media')
cover(s, BR, 'Planejamento de social media e design', 'Artes e posts de 12/11 a 31/12', 'Pilares, ritmo, calendário e as 10 postagens com referência real, 2 referências de arte com imagem e link, copy da arte e legenda pronta.')
const P = require('./pf_posts2.js')
P.forEach((p, i) => { p.arts = ARTS[i] })
pilaresPage(s)
calPage(s, P)
const sm = require('./pf_sm.js')
P.noOverview = true
sm.P[BR] = P
sm.pages(s, BR)
fs.writeFileSync(path.join(OUT, 'social-media.html'), fixCover(html(`Social media ${BR}`, s.pages)).replace('</head>', CSS + '</head>'))
console.log('social', s.pages.length)
