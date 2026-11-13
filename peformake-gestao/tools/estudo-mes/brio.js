// Brio Burguer: Estratégia + Planejamento de social media (13/11/2026), no design aprovado (build3.js / pf.js).
// Não altera os arquivos das outras marcas: só lê build3.js e sm.js e escreve em ../brio.
const fs = require('fs')
const path = require('path')
const GEN = __dirname
const src = fs.readFileSync(path.join(GEN, 'build3.js'), 'utf8')
const partA = src.slice(0, src.indexOf('// ---------------- conteúdo por marca'))
const partB = src.slice(src.indexOf('// ---------------- páginas'), src.indexOf('D.Fornario.pieces[3][3]'))
const K = new Function('require', '__dirname', partA + partB + '\nreturn { Doc, card, ul, cover, tesePage, offerPage, html }')(require, GEN)
const { Doc, card, ul, cover, tesePage, offerPage, html } = K
const { AD, POSTS, ADS, TRENDS } = require('./brio_data.js')

const BR = 'Brio Burguer'
const OUT = path.resolve(GEN, '..', 'brio')
fs.mkdirSync(OUT, { recursive: true })
const TH = path.resolve(GEN, '..', '..', 'brio2', 'th')
const img = (k) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(TH, k + '.jpg')).toString('base64')
const TT = (u, id) => `https://www.tiktok.com/@${u}/video/${id}`

// ---------------- Estratégia em uma página ----------------
const b = {
  role: 'o lanche da galera',
  card: `<p class="lead">Hambúrguer artesanal <b>só delivery</b> em São Lourenço da Mata, com maionese da casa e <b>site próprio</b> de pedidos.</p>
      <div class="kv"><span>Público</span>Galera de 18 a 35 anos, classes B e C, que se junta em casa em São Lourenço e Camaragibe</div>
      <div class="kv"><span>Canal</span>Site próprio [endereço a confirmar] e WhatsApp (81) 8642-3948 [confirmar se é o do atendimento]</div>
      <div class="goal"><span class="gl">Se só uma coisa for feita</span><b>Lançar o Combo da Galera na Black Friday (27 a 29/11) com a Garantia Chegou Quente</b>: preço por pessoa na tela e o termômetro como prova. Meta: 40 combos até 31/12.</div>`,
  teseTitle: 'A caixa é a vitrine: chega quente e rende pra galera',
  tese: 'O Brio não tem salão: a única vitrine é <b>a caixa chegando na casa da galera</b>. Os concorrentes brigam por preço de entrada (R$ 14,90, R$ 17,90). O Brio vai mostrar o que ninguém mostra: <b>o termômetro na porta</b> e <b>quanto sai por pessoa</b>. O vilão é o marketing no automático: “Sextou” e perfil parado.',
  moves: [['Voltar a existir em 18/11', 'Perfil parado desde 29/10. 3 posts por semana e stories todo dia antes de qualquer anúncio.'], ['Uma diária que rende 10 vídeos', 'Quinta 26/11 com a Ellcazo: tudo pronto para a Black Friday e para dezembro.'], ['Dezembro vende janeiro', 'Vale-Brio do Amigo Secreto: vendido até 23/12, usado até 31/01.']],
}

// ---------------- Diagnóstico ----------------
function diag1(d) {
  const max = 2431
  const chart = `<div class="chart">${POSTS.map((p) => `<div class="col ${p[2] === max ? 'best' : ''}"><span class="val">${p[2].toLocaleString('pt-BR')}</span><i style="height:${Math.max(3, Math.round((p[2] / max) * 100))}%"></i><span class="lab"><b>${p[0]}</b>${p[1]}</span></div>`).join('')}</div>`
  d.page('pf', 'Diagnóstico 1 de 3 · O perfil em números', 'Quando o lanche aparece de verdade, o Brio é visto 3,5 vezes mais', `
  <div class="dg">
    <div>
      <div class="stats">${[['5.076', 'seguidores no @brioburger_br'], ['685', 'views de média nos 9 últimos Reels'], ['0,16%', 'curtidas por seguidor (3 a 21 por post)'], ['15 dias', 'sem postar (último em 29/10)']].map((s) => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
      ${chart}
      <div class="mat"><b>4<small>/10</small></b><span>Maturidade digital. Produto bom e site próprio; perfil parado, nunca anunciou, nada medido (pedidos do site por origem: 0 no sistema).</span></div>
    </div>
    <div class="swot">
      <div class="sw s1"><h4>Forças</h4>${ul(['Close do produto rende: Brio Matuto 2.431 views (3,5× a média)', 'Site próprio e maionese da casa: margem sem taxa de app'])}</div>
      <div class="sw s2"><h4>Fraquezas</h4>${ul(['Perfil parado e posts de dia da semana (“Terçou”: 214 a 854)', 'Sem preço, cardápio e site cadastrados no sistema'])}</div>
      <div class="sw s3"><h4>Oportunidades</h4>${ul(['Ninguém na região prova que chega quente nem mostra preço por pessoa', '13º (28/11 e 20/12) e amigo secreto: dinheiro no bolso da galera'])}</div>
      <div class="sw s4"><h4>Ameaças</h4>${ul(['Sanduba Secreto anunciando “São Lourenço – Camaragibe” desde 12/11', 'Smash a R$ 17,90 (Duda, Camaragibe) puxando a briga de preço'])}</div>
    </div>
  </div>`, { cls: 'dense' })
}

function diag2(d) {
  const rows = ADS.slice(0, 10)
  const max = 252
  d.page('pf', 'Diagnóstico 2 de 3 · Mercado, concorrentes e anúncios', 'Todos anunciam preço. Ninguém prova que chega quente', `
  <div class="an2">
    <div>
      <h3 class="h3">Anúncios de hambúrguer ativos na região (há quantos dias)</h3>
      <div class="fun">${rows.map((r) => `<div class="fr"><span class="fl2"><a href="${AD(r[7])}" target="_blank" style="color:inherit;text-decoration:none">${r[0]}</a></span><div class="fb"><i style="width:${Math.max(2, Math.round((r[2] / max) * 100))}%"></i></div><b>${r[2]} d</b></div>`).join('')}</div>
      <p class="cap2">Biblioteca de Anúncios, ativos, 13/11. <b>Só 1 de 10 passa de 45 dias</b>: a maioria impulsiona e para. O Brio nunca anunciou.</p>
    </div>
    <div>
      <table class="comp"><thead><tr><th>Concorrente</th><th>O que faz / vende</th><th>Preço</th></tr></thead><tbody>${[
        ['Jurito', 'São Lourenço · 20,8 mil seg.', 'Açaí + linha de hambúrguer “Estação Sonho”; humor (“croquetão”: 24 mil views) e evento da Rua do Amendoim (19 mil)', '[sem preço público]'],
        ['Sanduba Secreto', 'São Lourenço–Camaragibe', 'Artesanal 120 g; anúncio novo com a cidade no título (12/11)', 'R$ 36,90 a R$ 44'],
        ['Duda Burgers', 'Camaragibe', 'Anúncio “Smash Burguer R$ 17,90”, cardápio Brendi', 'R$ 17,90'],
        ['Bora Burguer', 'Boa Viagem · 12,9 mil seg.', 'Criadores provando: 239 mil views; “a partir de R$ 14,90”', 'R$ 14,90'],
      ].map((r) => `<tr><td><b>${r[0]}</b><span>${r[1]}</span></td><td>${r[2]}</td><td style="font-weight:800">${r[3]}</td></tr>`).join('')}</tbody></table>
      <div class="gapbox"><b>O espaço vazio (só o Brio ocupa):</b> prova de que <b>chega quente</b> · <b>preço por pessoa</b> do artesanal · humor de amigo com <b>sotaque de São Lourenço</b>.</div>
      <p class="cap" style="margin-top:8px">Mercado: WhatsApp já é <b>26%</b> do faturamento do delivery e <b>39%</b> dos negócios investem em site próprio (Abrasel, 2.176 empresários).</p>
    </div>
  </div>`, { cls: 'dense' })
}

function diag3(d) {
  const br = [['O close do Brio Matuto fez 2.431; bastidor e rua, menos de 330.', 'Todo vídeo mostra <b>o lanche em até 3 s</b>; bastidor só com gancho e prova.'], ['A dor do delivery é chegar frio, e ninguém da região fala disso.', '<b>Garantia Chegou Quente</b> + termômetro na porta como série.'], ['Combo “serve 4: R$ 27,50 pra cada” viralizou (168 mil).', '<b>Combo da Galera</b> com o preço por pessoa na arte e no vídeo.'], ['Dezembro é amigo secreto (2,8 mi views no tema).', '<b>Vale-Brio</b>: presente que cabe no limite e já vende janeiro.']]
  d.page('pf', 'Diagnóstico 3 de 3 · Tendência, público e o que fazemos', 'Vimos isso, então vamos fazer aquilo', `
  <div class="an2b">
    <div>
      <div class="persona card"><h3>A galera (persona)</h3>
        <p><b>Lucas, 24 anos, Tiúma.</b> Junta 3 ou 4 amigos no fim de semana, racha a conta no Pix, decide pelo Instagram e pelo amigo que indica. Quer lanche que valha o dinheiro e chegue inteiro.</p>
        <div class="pz"><span><b>Desistiu porque:</b> já pediu e chegou frio; achou caro “só pra mim”; demorou.</span><span><b>Compra quando:</b> vê o lanche real, sabe quanto dá por pessoa, alguém marca ele.</span></div></div>
      <h3 class="h3" style="margin-top:12px">O que viraliza no nicho (TikTok, 13/11)</h3>
      <div class="viral">${TRENDS.slice(0, 4).map((r) => `<div class="vr"><b>${String(r[1]).replace('.', ',')} mi</b><div><span style="font-weight:800;color:var(--dk)">${r[0]}</span><span>${r[2]}</span></div></div>`).join('')}</div>
    </div>
    <div class="bridges">${br.map((r) => `<div class="br"><div class="saw"><em>vimos</em>${r[0]}</div><div class="arr">→</div><div class="do"><em>vamos fazer</em>${r[1]}</div></div>`).join('')}</div>
  </div>`, { cls: 'dense' })
}

// ---------------- Tese e narrativa ----------------
function narrPage(d) {
  d.page('pf', `${BR} · Tese e narrativa do período`, 'Uma frase, uma história, três atos', `
  <div class="thesis big"><span>A tese em uma frase</span><p><b>“A caixa é a vitrine.”</b> O Brio prova que chega quente e mostra quanto sai por pessoa, porque é isso que a galera não confia e ninguém mostra.</p></div>
  <div class="chain6">${[['Herói', 'A galera de São Lourenço que se junta em casa'], ['Problema', 'Pedir pra turma sai caro e chega frio'], ['Vilão', 'O marketing <b>no automático</b>: “Sextou”, foto que não dá fome, perfil que some'], ['Virada', 'O Brio mostra de dentro: chapa, caixa, termômetro e a conta'], ['Prova', '2.431 views no close · [°C] na porta · teste cego na rua'], ['Convite', 'Combo da Galera e Vale-Brio, pelo site']].map((c, i) => `<div class="c6 ${i === 2 ? 'vil' : ''}"><b>${c[0]}</b><span>${c[1]}</span></div>`).join('')}</div>
  <div class="acts3">${[['Ato 1 · 18 a 26/11', 'Voltamos com fome', 'Perfil vivo, teaser do Combo, diária Ellcazo'], ['Ato 2 · 27/11 a 13/12', 'A caixa é a vitrine', 'Black Friday, termômetro, teste cego, Vale-Brio'], ['Ato 3 · 14 a 31/12', 'A galera volta', '13º, indicação, “ceia de ontem, Brio de hoje”']].map((a) => `<div class="a3"><small>${a[0]}</small><b>${a[1]}</b><span>${a[2]}</span></div>`).join('')}</div>
  <div class="provas"><b>Provas que temos e as que vamos criar:</b> close do Brio Matuto (2.431 views) · <b>termômetro na porta</b> (criar em 26/11) · teste cego na rua (03/12) · avaliações no Google [quantas hoje?] · prints de clientes <b>[autorização do cliente]</b>.</div>`, { cls: 'dense' })
}

// ---------------- Ofertas ----------------
const x = {
  offerTitle: 'Quatro ofertas com data: entrada, principal, presente e volta',
  offers: [
    { main: true, name: 'Combo da Galera + Garantia Chegou Quente', what: '4 Brios + 2 fritas grandes + refri 2 L [composição a confirmar]. Chegou frio, a gente refaz.', cond: '<b>[R$ x por pessoa]</b> na arte. Black Friday <b>27 a 29/11</b> com maionese em dobro; depois, quinta a domingo.', who: 'Turma de 4 em casa, 18 a 35 anos.', why: '1ª parcela do 13º (até 30/11) e o formato que mais viraliza no nicho.' },
    { name: 'Vale-Brio do Amigo Secreto', what: 'Vale de [R$ 40] ou [R$ 70] com o nome de quem ganha.', cond: 'Venda <b>01 a 23/12</b> pelo site ou Pix; usa até <b>31/01</b>.', who: 'Quem tirou alguém no amigo secreto da firma, sala ou família.', why: 'Dezembro vira janeiro: o vale traz pedido nas férias.' },
    { name: '1º pedido pelo site (entrada)', what: 'Maionese da casa em dobro no 1º pedido.', cond: 'Cupom no site <b>[se o site aceitar]</b>; de 18/11 a 31/12.', who: 'Quem nunca pediu ou pedia por app.', why: 'Cria o hábito do canal próprio, sem taxa de app.' },
    { name: 'Bilhete da volta (recompra)', what: 'Bilhete na caixa com código e QR: volta em 7 dias e ganha [mimo].', cond: 'Em todo pedido de 27/11 a 31/12.', who: 'Quem já pediu uma vez.', why: 'O 2º pedido é o mais barato de conseguir.' },
  ],
  offerNote: '<b>Sem briga de preço:</b> nada de “a partir de R$ 14,90”. O argumento é <b>chegar quente e render pra galera</b>, com o preço por pessoa à mostra. Nenhum preço vai ao ar sem o Brio confirmar.',
}

// ---------------- Metas e caminho de venda ----------------
function vendaPage(d) {
  d.page('pf', `${BR} · Caminho de venda e metas`, 'Do vídeo ao pedido no site, em 4 passos e 5 minutos', `
  <div class="now"><b>Hoje:</b> nenhum pedido é contado por origem. A partir de 18/11, o Brio anota por semana os <b>pedidos do site</b> e quantos disseram “vi no Instagram” (campo no site ou pergunta no WhatsApp).</div>
  <div class="g2t">
    <div>
      <h3 class="h3">O caminho da venda</h3>
      <div class="camps">${[
        ['1', 'Reel ou post com o lanche e o preço por pessoa', 'Toda peça termina em “Pede pelo site”; link na bio com o Combo no topo.'],
        ['2', 'Pedido sozinho no site', 'Sem conversa. Dúvida vai para o WhatsApp com mensagem pronta.'],
        ['3', 'WhatsApp responde em até 5 min', '[Quem atende no Brio]: roteiro da página seguinte; todo atendimento termina com o link.'],
        ['4', 'A caixa chega com o bilhete', 'QR do site, código da volta e “marca a gente”. D+1: obrigado e pedido de avaliação no Google.'],
      ].map((c) => `<div class="camp"><div class="cp"><b>${c[0]}</b></div><div><h4>${c[1]}</h4><p>${c[2]}</p></div></div>`).join('')}</div>
    </div>
    <div>
      <h3 class="h3">Metas até 31/12 (aposta inicial, revista em 30/11)</h3>
      ${ul(['<b>40 Combos da Galera</b> (20 na Black Friday, 10 no 13º, 10 no resto)', '<b>30 Vale-Brio</b> vendidos até 23/12', '<b>Pedidos do site +30%</b> na semana de 07/12 contra a de 23/11 (ponto de partida: [o Brio informa])', 'Reels de <b>685 para 1.500 views</b> de média; 1 Reel acima de <b>10 mil</b>', '<b>15 indicações</b> e <b>+20 avaliações</b> no Google'])}
      <h3 class="h3" style="margin-top:14px">Janeiro já pensado</h3>
      ${ul(['Vale-Brio resgatado até 31/01: pedido garantido nas férias', '05/01: balanço; teste do <b>Clube da Galera</b> (pedido fixo quinzenal) [a desenhar]'])}
    </div>
  </div>`, { cls: 'dense' })
}

// ---------------- Venda ----------------
function salesPage1(d) {
  const S = [
    ['Primeira resposta', 'Oi! Aqui é do Brio 🍔 Tá pedindo pra quantas pessoas? Se for galera, já te mando o combo certo. O cardápio todo tá no site: [link]'],
    ['Qualificar', '[nome], é pra hoje? Qual o bairro? (pra eu te dizer o tempo certinho: [x] min pra São Lourenço)'],
    ['Oferta', 'Pra 4 o Combo da Galera resolve: 4 Brios, 2 fritas grandes e refri 2 L. Dá [R$ x] pra cada. E se chegar frio, a gente refaz. Pede aqui: [link]'],
    ['Fechar', 'Fechou! Faz pelo site que já entra na chapa. Qualquer coisa me chama aqui. Bom apetite pra galera! 🔥'],
  ]
  d.page('pf', `${BR} · Venda 1 de 2 · Roteiro do WhatsApp`, 'Quatro mensagens: perguntar, sugerir, garantir e mandar o link', `
  <div class="wa">${S.map((s, i) => `<div class="wm"><div class="wh"><span>${i + 1}</span>${s[0]}</div><div class="bub">${s[1]}</div></div>`).join('')}</div>
  <div class="g2t" style="margin-top:16px">
    <div class="card"><h3>Regras do atendimento</h3>${ul(['Resposta em <b>até 5 min</b> no horário de entrega; pico de sexta a domingo, das 18h às 22h', 'Sempre perguntar <b>quantas pessoas</b> antes de oferecer', 'Todo atendimento termina com o <b>link do site</b>', 'Anotar a origem: “vi no Instagram”, “indicação”, “Vale-Brio”'])}</div>
    <div class="card"><h3>Mensagens prontas de data</h3>${ul(['<b>Black Friday:</b> “Até domingo o Combo da Galera vem com a maionese em dobro. Quer que eu te mande o link?”', '<b>Amigo secreto:</b> “Tem Vale-Brio de [R$ 40] e [R$ 70], vale até 31/01. Pra quem é? Eu coloco o nome.”', '<b>13º:</b> “Semana do 13º: combo com extra da casa até domingo.”'])}</div>
  </div>`, { cls: 'dense' })
}

function salesPage2(d) {
  const O = [
    ['“Tá caro.”', 'Faz sentido olhar. No Combo da Galera dá [R$ x] por pessoa, com carne artesanal e maionese da casa. Sai mais em conta que pedir um por um.'],
    ['“Chega frio?”', 'A gente mede: o último chegou a [XX] °C na porta (tem o vídeo). E se chegar frio, a gente refaz.'],
    ['“Demora muito?”', 'Pra [bairro] leva uns [x] min. Te aviso quando sair da chapa.'],
    ['“Entrega no meu bairro?”', 'Entregamos em [lista de bairros de São Lourenço e Camaragibe]. Qual é o teu?'],
    ['“Prefiro pedir pelo app.”', 'Pelo site sai direto com a gente, e o 1º pedido vem com maionese em dobro. Leva 1 minuto: [link]'],
  ]
  d.page('pf', `${BR} · Venda 2 de 2 · Objeções, recompra e indicação`, 'As 5 dúvidas de quem pede, e como trazer de volta', `
  <div class="g2t">
    <div>
      <h3 class="h3">As 5 objeções (respostas prontas)</h3>
      <div class="objs">${O.map((o) => `<div class="ob"><b>${o[0]}</b><span>${o[1]}</span></div>`).join('')}</div>
      <p class="cap" style="margin-top:8px">Objeções comuns do delivery de hambúrguer; o Brio ainda não tem conversas no sistema. <b>[Conferir com as 10 últimas conversas do WhatsApp do Brio]</b>.</p>
    </div>
    <div>
      <div class="card msg"><h3>Recompra (D+7 do pedido)</h3><q>Oi, [nome]! Faz uma semana do Combo da Galera. Teu código [BRIO-XXX] ainda vale até domingo: [mimo] no próximo pedido. Bora? [link]</q></div>
      <div class="card msg"><h3>Reativação (30 dias sem pedir)</h3><q>[nome], sumiu, hein? 😅 Voltamos com o Brio que chega quente (a gente mede!). Se pedir até sexta, [mimo] por nossa conta: [link]</q></div>
      <div class="card msg"><h3>Indicação</h3><q>Tem alguém que te deve um Brio? Manda esse link pra ele: no 1º pedido ele ganha [mimo] e tu ganha [mimo] no teu próximo. [link de indicação]</q></div>
      <p class="cap" style="margin-top:6px">Mensagens enviadas <b>por uma pessoa do Brio</b>, uma a uma. Nada automático.</p>
    </div>
  </div>`, { cls: 'dense' })
}

// ---------------- Calendário mestre ----------------
const CAL = [
  ['13/11 (sex)', 'Decisões desta estratégia', 'Italo e o Brio escolhem as 4 decisões'],
  ['até 17/11', 'Preparação', 'Preços, site (aceita cupom?), horários, termômetro, bilhete da caixa'],
  ['18/11 (qua)', 'Volta do perfil', 'Carrossel “Sumimos. Voltamos com fome.”; stories todo dia'],
  ['20/11 (sex)', 'Feriado (Consciência Negra)', '“Feriado? Junta a galera.”: teaser do Combo'],
  ['22 e 25/11', 'Aquecimento', '“Quantos Brios a tua galera precisa?” e stories da Black Friday'],
  ['26/11 (qui)', '<b>Diária Ellcazo</b> (15h–21h)', '8 vídeos gravados num dia'],
  ['27 a 29/11', '<b>Black Friday + 1ª parcela do 13º</b>', 'Combo da Galera com maionese em dobro e Garantia Chegou Quente'],
  ['01 a 23/12', 'Amigo secreto', 'Vale-Brio à venda; teste cego (04/12)'],
  ['11 a 13/12', 'Indicação', '“Quem te deve um Brio?”'],
  ['18 a 20/12', '<b>2ª parcela do 13º</b>', 'Combo com extra da casa'],
  ['24, 25 e 31/12', 'Natal e Réveillon', 'Horários especiais [confirmar]; stories'],
  ['26/12 (sáb)', 'Dia seguinte do Natal', '“Ceia de ontem, Brio de hoje”'],
  ['05/01', 'Janeiro', 'Balanço; Vale-Brio resgatado até 31/01; Clube da Galera'],
]
function calPage(d, who) {
  d.page('pf', `${BR} · Calendário ${who ? 'do período' : 'mestre'}`, 'As datas que viram post, vídeo e venda, de 12/11 a 31/12', `
  <table class="cal cal1">
    <thead><tr><th>Quando</th><th>O que acontece</th><th>O que o Brio publica e vende</th></tr></thead>
    <tbody>${CAL.map((r) => `<tr class="${/Black Friday|2ª parcela|Diária/.test(r[1]) ? 'hot' : ''}"><td class="d">${r[0]}</td><td class="e">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
  </table>`, { cls: 'calpg' })
}

// ---------------- Quando ligar o tráfego (padrão trafego-oferta.md) ----------------
function trafPage(d) {
  d.page('pf', `${BR} · Quando ligar o tráfego`, 'Pronto na gaveta: oferta, público e quanto pode custar um pedido', `
  <div class="now"><b>Agora não há tráfego para o Brio.</b> Liga quando as 3 condições existirem: <b>3 semanas</b> de 3 posts por semana · <b>pedidos do site contados</b> por origem · <b>1 Reel</b> acima de 1.400 views (2× a média).</div>
  <div class="tg">
    <div class="card"><h3>Ficha da oferta</h3>
      ${[['O quê', 'Combo da Galera (principal) e Vale-Brio (dezembro)'], ['Para quem', '18 a 35 anos, raio de [6] km do Brio (São Lourenço e Camaragibe)'], ['Condição', '[R$ x por pessoa] + Garantia Chegou Quente'], ['Por que agora', '13º e amigo secreto (Vale-Brio até 23/12)'], ['Prova', 'Termômetro na porta, teste cego, close de 2.431 views'], ['Próximo passo', 'Clique vai direto ao site com o Combo no topo']].map((k) => `<div class="kv"><span>${k[0]}</span>${k[1]}</div>`).join('')}</div>
    <div>
      <table class="temp"><thead><tr><th>Temperatura</th><th>Mensagem</th><th>Criativo (do audiovisual)</th></tr></thead><tbody>
        ${[['Frio', 'desejo + oferta de entrada', 'B3 a mordida · B2 POV'], ['Morno', 'prova e objeção (viu 50% de um vídeo em 30 dias)', 'B1 termômetro · B5 teste cego'], ['Quente', 'oferta com prazo (visitou o site, conversou)', 'B4 “quanto deu pra cada” · B7 Vale-Brio']].map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
      <div class="teto"><h3>Teto por pedido (a conta)</h3>
        <p>Teto = ticket do combo [R$ T] × margem [M%] × [0,5] (metade do lucro do 1º pedido, porque ele volta pelo bilhete).<br>Ex.: se T = R$ 100 e M = 30%, o teto é <b>R$ 15 por pedido</b>; com 1 pedido a cada 15 cliques no site, o clique pode custar até <b>R$ 1,00</b>.</p>
        <p class="ref">Régua do sistema (gastronomia): VOVINA <b>R$ 0,13</b> por clique no cardápio; Fornario <b>R$ 0,19</b> por visita ao perfil.</p></div>
      <div class="rules"><b>Regras:</b> objetivo Vendas no site (ou Mensagens, se o site não medir) · 3 a 5 criativos por temperatura · pausar criativo que gastar 2× o teto sem pedido · escalar o vencedor +20% a cada 48 h · trocar o ângulo antes do público · verba em 3 opções [R$ 10 / 15 / 25 por dia], decidida na hora de ligar.</div>
    </div>
  </div>`, { cls: 'dense' })
}

// ---------------- Decisões e próximos passos ----------------
const decs = [
  ['Quando o Brio volta?', [['A', '18/11 já, com conteúdo de celular', 'diária em 26/11 e Black Friday no ar', 1], ['B', '03/12, com tudo gravado', 'perde a Black Friday e a 1ª parcela do 13º']]],
  ['Garantia Chegou Quente', [['A', '“Chegou frio? A gente refaz.”', 'a prova que ninguém na região dá', 1], ['B', 'Sem garantia', 'só o termômetro como prova']]],
  ['Vale-Brio do Amigo Secreto', [['A', 'Vales de [R$ 40] e [R$ 70]', 'venda até 23/12, uso até 31/01', 1], ['B', 'Sem vale', 'dezembro só com o Combo']]],
  ['Mimo do 1º pedido, da volta e da indicação', [['A', 'Maionese da casa em dobro', 'barato para o Brio, desejado pelo cliente', 1], ['B', 'Fritas extra ou nada', '[custo a confirmar]']]],
]
function decPage(d) {
  d.page('pf', `${BR} · Decisões`, 'Quatro escolhas para o plano ir ao ar', `
  <div class="decs">${decs.map((dd, i) => `<div class="card dec"><h3><span class="num">${i + 1}</span>${dd[0]}</h3>
    ${dd[1].map((o) => `<div class="dopt ${o[3] ? 'rec' : ''}"><b>${o[0]}</b><div><strong>${o[1]}</strong><span>${o[2]}</span></div>${o[3] ? '<em>sugerida</em>' : ''}</div>`).join('')}
  </div>`).join('')}
  <div class="card syn1 span2"><h3>O que muda na rotina do Brio</h3>${ul(['Uma pessoa responde o WhatsApp em até 5 min no horário de entrega', 'Bilhete em toda caixa a partir de 27/11', 'Toda segunda: pedidos do site da semana e quantos vieram do Instagram', 'Nenhum preço vai ao ar sem o Brio confirmar'])}</div></div>`, { cls: 'dense' })
}

function nextPage(d) {
  const need = ['<b>Endereço do site</b> e se ele aceita cupom (não está no sistema)', '<b>Cardápio e preços</b> atuais, composição e preço do Combo da Galera e da Sessão Brio', '<b>Bairros e tempo</b> de entrega; horários de 24, 25, 26 e 31/12', '<b>Quem atende</b> o WhatsApp e os nomes de quem aparece nos vídeos (chapeiro, motoboy)', '<b>Autorização de imagem</b> da galera e dos clientes; 10 últimas conversas do WhatsApp']
  const steps = [['13/11', 'Decisões desta estratégia'], ['até 17/11', 'Preços, site, horários, termômetro e bilhete'], ['18/11', 'Volta do perfil'], ['26/11', 'Diária Ellcazo'], ['27 a 29/11', 'Black Friday: Combo da Galera'], ['01/12', 'Vale-Brio à venda'], ['03/12', 'Teste cego na rua'], ['18 a 20/12', 'Semana do 13º'], ['23/12', 'Último dia do Vale-Brio'], ['05/01', 'Balanço e janeiro']]
  d.page('pf', `${BR} · O que precisamos e próximos passos`, 'Com isto até 17/11, o plano roda sozinho', `
  <div class="g2n">
    <div class="card need"><h3>O que precisamos de vocês</h3>${ul(need)}</div>
    <div class="steps">${steps.map((s) => `<div class="st"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
  </div>`, { cls: 'dense' })
}

// ---------------- Conferência (interna; fica fora do PDF) ----------------
const NOTAS = [
  ['Verdade', 4, 'Números do sistema (views, seguidores, datas), Biblioteca e TikTok com link; preços do Brio entre colchetes.'],
  ['Foco', 5, 'Uma tese: “a caixa é a vitrine”; nasce do perfil parado e da dor “chega frio”.'],
  ['Oferta irresistível', 4, 'Ficha completa; melhor que o concorrente na garantia e no preço por pessoa; urgência real (13º, 23/12). Falta o preço.'],
  ['Caminho até o dinheiro', 4, 'Site → WhatsApp em 5 min → bilhete → D+7; metas das peças somam as da estratégia.'],
  ['Espaço vazio', 5, 'Ninguém na região prova que chega quente, mostra preço por pessoa ou vende presente.'],
  ['Gancho', 4, 'Número na porta, pergunta da conta, POV com relógio, teste cego; nenhum “oi, gente”.'],
  ['Ideia, não formato', 4, 'Termômetro, Vale-Brio, “quem te deve um Brio” e fecho-assinatura da tampa são do Brio.'],
  ['Variedade', 5, '10 estilos (E2, E8, E16, E17, E18, E19, E22, E28, E29, E32) e 10 modelos; 3 atrair, 2 provar, 2 objeção, 3 converter.'],
  ['Referência forte', 4, '20 referências reais com capa, link e views (até 69,5 mi); anúncios sem imagem (Biblioteca não abre na nuvem).'],
  ['Executável', 4, '1 diária + 2 capturas de celular; storyboard, quem fala e legenda prontos.'],
  ['Tráfego = oferta', 4, 'Não contratado agora; página “Quando ligar” com oferta, temperatura, teto e regras.'],
  ['Depois do clique', 3, 'Roteiro e 5 objeções prontos, mas sem conversas reais do Brio no sistema.'],
]
function confPage(d) {
  const avg = (NOTAS.reduce((s, n) => s + n[1], 0) / NOTAS.length).toFixed(2).replace('.', ',')
  d.page('pf', 'Conferência interna · fica fora do PDF', `Rubrica: média ${avg}, nenhum item abaixo de 3`, `
  <table class="cal cal1 rb"><thead><tr><th>Item</th><th>Nota</th><th>Por quê</th></tr></thead>
  <tbody>${NOTAS.map((n) => `<tr><td class="d">${n[0]}</td><td class="e"><b>${'●'.repeat(n[1])}${'○'.repeat(5 - n[1])}</b> ${n[1]}</td><td>${n[2]}</td></tr>`).join('')}</tbody></table>
  <p class="cap" style="margin-top:10px"><b>3 ideias mais fortes:</b> Garantia Chegou Quente com termômetro na porta · Vale-Brio do Amigo Secreto (dezembro vende janeiro) · preço por pessoa dito pela galera (“quanto deu pra cada?”). <b>Se só uma coisa for feita:</b> o Combo da Galera na Black Friday, em destaque na página 2.</p>`, { cls: 'calpg conf' })
}

// ---------------- Social media ----------------
const S = {
  pillars: [['Desejo (o lanche)', 30, 'close, mordida, maionese, POV da chapa'], ['Oferta', 25, 'Combo da Galera, Vale-Brio, 13º'], ['Prova', 20, 'termômetro, teste cego, quanto deu pra cada'], ['A galera (humor)', 15, 'amigo secreto, quem te deve um Brio'], ['Relacionamento', 10, 'stories, enquetes, bastidor']],
  week: [['Qua', 'Prova ou desejo (Reels)'], ['Sex', 'Oferta (carrossel ou Reels; dia de maior pedido)'], ['Dom', 'Galera e humor (Reels ou post)'], ['Todo dia', 'Stories: pedido saindo, caixa abrindo, enquete']],
  design: ['Laranja Brio (#E55126) e Pão (#FFF1DF) de fundo; Azul Brio (#3F4A99) só nos contornos dos títulos', 'Lilita One nos títulos, Nunito no apoio; título grande, texto branco pequeno sobre laranja nunca', 'Foto e vídeo reais, lo-fi; nada de banco de imagem ou IA', 'O número (preço por pessoa, °C, placar) é sempre o maior elemento', 'Selo fixo “Pede pelo site” e a tampa fechando no fim dos vídeos'],
}
const ARTS = [
  ['tt_7672796894627745032', '@bettasiilva · 2,2 mi', TT('bettasiilva', '7672796894627745032'), 'Composição', 'caixa aberta de cima ocupando a tela: o combo é o herói'],
  ['tt_7612744885656931598', '@keilapacheco · 49,8 mi', TT('keilapacheco', '7612744885656931598'), 'Foto', 'mão segurando o lanche perto da lente, luz natural'],
  ['tt_7647723939598290183', '@casaldocombo · 114 mil', TT('casaldocombo', '7647723939598290183'), 'Cor', 'molhos coloridos sobre fundo neutro; aqui, laranja e azul Brio'],
  ['old_125ef49c', '@embarcarnacomida · 125 mil', TT('embarcarnacomida', '7118521539242298630'), 'Tipografia', 'título em tarja curta sobre o lanche, 2 linhas no topo'],
  ['tt_7609366915827404052', '@expresscombos_ · 168 mil', TT('expresscombos_', '7609366915827404052'), 'Número', '“R$ 27,50 pra cada” sobre o combo: o preço por pessoa é a arte'],
  ['old_6f6f33e9', '@sandyyburguer · 77 mil', TT('sandyyburguer', '7699280823480028437'), 'Gente', 'rosto da casa + sotaque no título: “tu é de Recife e não conhece?”'],
]
function socialPages(d) {
  d.page('pf', `${BR} · Pilares, ritmo e design`, 'O lanche de verdade, a conta na tela e a galera rindo junto', `
  <div class="g2s">
    <div>
      <h3 class="h3">Pilares do conteúdo</h3>
      <div class="bars">${S.pillars.map((p) => `<div class="bar"><div class="bl"><b>${p[0]}</b><span>${p[2]}</span></div><div class="bt"><i style="width:${p[1] * 3}%"></i><em>${p[1]}%</em></div></div>`).join('')}</div>
      <p class="cap" style="margin-top:14px">3 posts por semana a partir de 18/11 (cerca de 20 até 31/12): as 10 postagens desta pasta + os 10 vídeos do audiovisual. Tudo aponta para uma oferta ou para a tese.</p>
    </div>
    <div>
      <h3 class="h3">Ritmo da semana</h3>
      <div class="week">${S.week.map((w) => `<div class="wd"><b>${w[0]}</b><span>${w[1]}</span></div>`).join('')}</div>
      <h3 class="h3" style="margin-top:18px">Design: as regras do período</h3>
      ${ul(S.design)}
    </div>
  </div>`, { cls: 'dense' })
  calPage(d, true)
  d.page('pf', `${BR} · Design · Referências de arte`, 'O que pegar de cada referência (composição, foto, cor, tipografia)', `
  <div class="arts">${ARTS.map((a) => `<a class="art1" href="${a[2]}" target="_blank"><img src="${img(a[0])}" alt=""><div><em>${a[3]}</em><b>${a[1]}</b><span>${a[4]}</span></div></a>`).join('')}</div>`, { cls: 'dense' })
  const sm = require('./sm.js')
  sm.P[BR] = require('./brio_posts.js')
  sm.pages(d, BR)
}

// ---------------- montar ----------------
const extra = `<style>
.chart .col{flex:1}.chart{height:250px;margin-bottom:62px}.col .lab{font-size:10.5px;line-height:1.15}
.gapbox{margin-top:12px;background:var(--dk);color:#fff;border-radius:12px;padding:10px 14px;font-size:14px;line-height:1.35}.gapbox b{color:var(--cy)}
.gapbox b:first-child{color:#fff}
.persona{padding:13px 16px}.persona h3{font-size:17px;margin-bottom:6px}.persona p{font-size:14.2px;line-height:1.38}
.pz{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}.pz span{font-size:13px;line-height:1.32;background:#E3F7FA;border-radius:8px;padding:7px 9px}
.thesis.big{margin-bottom:16px}.thesis.big p{font-size:21px;line-height:1.4}
.chain6{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px}
.c6{background:#fff;border:2px solid var(--dk);border-radius:12px;padding:10px 12px;box-shadow:4px 4px 0 var(--dk);font-size:14px;line-height:1.32}
.c6 b{display:block;font:800 11.5px Inter;text-transform:uppercase;letter-spacing:.07em;color:var(--pe);margin-bottom:5px}
.c6.vil{background:var(--dk);color:#fff}.c6.vil b{color:var(--cy)}
.acts3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}
.a3{background:#E3F7FA;border:2px solid var(--dk);border-radius:12px;padding:10px 14px}.a3 small{font:800 11.5px Inter;color:var(--pe);text-transform:uppercase;letter-spacing:.06em}.a3 b{display:block;font:800 18px Inter;margin:3px 0}.a3 span{font-size:14px}
.provas{font-size:14.5px;line-height:1.4;background:#fff;border-left:8px solid var(--cy);border-radius:10px;padding:10px 14px}
.wa{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.wm{background:#E3F7FA;border:2px solid var(--dk);border-radius:14px;padding:10px 12px;box-shadow:4px 4px 0 var(--dk)}
.wh{font:800 13px Inter;color:var(--pe);margin-bottom:8px;display:flex;gap:8px;align-items:center}.wh span{background:var(--dk);color:#fff;border-radius:6px;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center}
.bub{background:#fff;border-radius:12px 12px 12px 2px;padding:9px 11px;font-size:14.2px;line-height:1.38}
.objs{display:flex;flex-direction:column;gap:8px}.ob{display:grid;grid-template-columns:170px 1fr;gap:10px;background:#fff;border:2px solid var(--dk);border-radius:10px;padding:8px 11px;font-size:13.8px;line-height:1.33}.ob b{font-weight:800}
.msg{padding:10px 14px;margin-bottom:9px}.msg h3{font-size:15px;margin-bottom:5px}.msg q{display:block;font-size:13.6px;line-height:1.36;quotes:'“' '”';font-style:italic}
.tg{display:grid;grid-template-columns:.85fr 1.15fr;gap:22px}.tg .card{padding:14px 16px}.tg .kv{font-size:14px;margin-bottom:9px}
.temp{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:2px solid var(--dk);border-radius:12px;overflow:hidden;font-size:13.6px;margin-bottom:10px}
.temp th{background:var(--dk);color:#fff;text-align:left;padding:6px 9px;font:800 11px Inter;text-transform:uppercase}.temp td{padding:6px 9px;border-top:1px solid #d5e8eb}
.teto{background:#E3F7FA;border:2px solid var(--dk);border-radius:12px;padding:9px 13px;margin-bottom:10px}.teto h3{font-size:15px;margin-bottom:4px}.teto p{font-size:13.6px;line-height:1.36}.teto .ref{margin-top:4px;color:var(--pe)}
.rules{font-size:13.3px;line-height:1.36}
.arts{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.art1{display:flex;flex-direction:column;text-decoration:none;color:var(--dk);background:#fff;border:2px solid var(--dk);border-radius:14px;overflow:hidden;box-shadow:5px 5px 0 var(--dk)}
.art1 img{width:100%;height:330px;object-fit:cover;display:block}.art1 div{padding:9px 11px;display:flex;flex-direction:column;gap:3px}
.art1 em{font:800 11px Inter;font-style:normal;text-transform:uppercase;letter-spacing:.07em;color:var(--pe)}.art1 b{font-size:12.5px}.art1 span{font-size:13.2px;line-height:1.3}
.rb td.d{width:200px}.rb td.e{width:130px}.rb{font-size:13.6px}.calpg .rb td{padding:5px 12px}
@media print{.pg.conf{display:none!important}}
</style>`
const fixCover = (h) => h.replace(/Para Brio Burguer e equipe Peformake · 12\/11\/2026/g, 'Para Brio Burguer e equipe Peformake · 13/11/2026')

const e = Doc(BR, 'Estratégia')
cover(e, BR, 'Estratégia do mês · com o diagnóstico', 'Estratégia de 12/11 a 31/12', 'O que vimos em números, a tese, as ofertas com data, o caminho de venda, o roteiro do WhatsApp, o calendário, o tráfego para quando ligar, as decisões e janeiro já pensado.')
tesePage(e, BR, b)
diag1(e); diag2(e); diag3(e)
narrPage(e)
offerPage(e, BR, x)
vendaPage(e)
salesPage1(e); salesPage2(e)
calPage(e)
trafPage(e)
decPage(e)
nextPage(e)
confPage(e)
fs.writeFileSync(path.join(OUT, 'estrategia.html'), fixCover(html(`Estratégia ${BR}`, e.pages)).replace('</head>', extra + '</head>'))

const s = Doc(BR, 'Social media')
cover(s, BR, 'Planejamento de social media', 'Artes e posts de 12/11 a 31/12', 'Pilares, ritmo, calendário, referências de arte e as 10 postagens com referência real, copy da arte e legenda pronta.')
socialPages(s)
fs.writeFileSync(path.join(OUT, 'social-media.html'), fixCover(html(`Social media ${BR}`, s.pages)).replace('</head>', extra + '</head>'))
console.log(BR, e.pages.length, s.pages.length)
