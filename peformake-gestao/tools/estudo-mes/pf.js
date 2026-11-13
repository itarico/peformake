// Peformake (marca própria): estratégia, social media e audiovisual no mesmo design do build3.js/sn.js.
// Não altera nada das outras marcas: só lê build3.js e sm.js e escreve em ../peformake.
const fs = require('fs')
const path = require('path')
const GEN = __dirname
const src = fs.readFileSync(path.join(GEN, 'build3.js'), 'utf8')
const partA = src.slice(0, src.indexOf('// ---------------- conteúdo por marca'))
const partB = src.slice(src.indexOf('// ---------------- páginas'), src.indexOf('D.Fornario.pieces[3][3]'))
const K = new Function('require', '__dirname', partA + partB + '\nreturn { Doc, card, ul, cover, tesePage, offerPage, avCover, studyPage, html, ell, logo, PER }')(require, GEN)
const { Doc, card, ul, cover, tesePage, offerPage, avCover, studyPage, html } = K

const BR = 'Peformake'
const OUT = path.resolve(GEN, '..', 'peformake')
fs.mkdirSync(OUT, { recursive: true })
const img = (k) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(GEN, 'pf_thumbs', k + '.jpg')).toString('base64')
const YT = (id) => 'https://www.youtube.com/shorts/' + id
const YTW = (id) => 'https://www.youtube.com/watch?v=' + id
const AD = 'https://www.facebook.com/ads/library/?id='
const fixCover = (h) => h.replace(/Para Peformake e equipe Peformake/g, 'Para a equipe Peformake')

const b = {
  role: 'assessoria de marketing, Recife',
  card: `<p class="lead">Assessoria de marketing de São Lourenço da Mata para o Grande Recife. Estratégia, social media, design, tráfego e, com a <b>Ellcazo</b>, o audiovisual. 32 clientes ativos, 7 deles de gastronomia.</p>
      <div class="kv"><span>Público</span>Donos de pequenos e médios negócios do Grande Recife que já tentaram marketing e não viram virar venda</div>
      <div class="kv"><span>Canal</span>WhatsApp (81) 98567-2212, site com diagnóstico gratuito e @peformake</div>
      <div class="goal"><span class="gl">Objetivo no período</span><b>80 conversas de donos de negócio, 25 Raio-X e 6 contratos novos</b> para começar em janeiro, todos contados no Comercial do sistema.</div>`,
  teseTitle: 'O case é o anúncio: a equipe trabalhando dentro do cliente',
  tese: '11 de 13 clientes chegaram por indicação: quem conhece fica, mas <b>quase ninguém conhece</b>. Até 31/12 a Peformake <b>mostra o que só ela tem</b>: a equipe gravando dentro dos negócios de Recife, com o número do cliente na tela. O vilão é o marketing <b>no automático</b>.',
  moves: [['A equipe vira conteúdo', 'Italo é o rosto; Thyfany e Ingrid mostram o dia a dia; Higor e os editores, o “como se faz”.'], ['Uma porta de entrada só', 'Toda peça leva ao Raio-X (30 min, grátis) no WhatsApp; todo lead entra no Comercial.'], ['Dezembro vende janeiro', '“Comece 2027 com o plano pronto”: fechou até 19/12, começa janeiro com plano e diária.']],
}

const x = {
  offerTitle: 'Uma porta de graça, um plano para o ano e a diária da Ellcazo',
  offers: [
    { main: true, name: 'Comece 2027 com o plano pronto', what: 'Assessoria completa com a Ellcazo e o plano de janeiro entregue antes da virada.', cond: '6 meses, fechado até <b>19/12</b>; diária na 1ª semana de janeiro. Condição: <b>[a decidir]</b>.', who: 'Negócios do Grande Recife de R$ 30 a 150 mil por mês.', why: 'Quem decide em dezembro ganha 3 semanas de janeiro.' },
    { name: 'Raio-X do marketing (entrada)', what: '30 min com o Italo: os 3 lugares onde o marketing perde venda.', cond: 'Grátis. Black Friday (27 a 30/11): <b>20 vagas</b>, sem desconto.', who: 'Todo lead: anúncio, conteúdo ou indicação.', why: 'A porta do site ganha nome, prazo e vagas.' },
    { name: 'Diária Ellcazo de fim de ano', what: '6 a 10 vídeos num dia para Natal, Réveillon e janeiro.', cond: 'Diária câmera ou mobile do catálogo. Até <b>18/12</b>.', who: 'Restaurantes e lojas, clientes ou não.', why: 'Dezembro é o mês de maior movimento.' },
    { name: 'Da gravação ao cliente (base)', what: 'O vídeo já gravado vira anúncio, com relatório toda segunda.', cond: 'Upgrade a partir de janeiro. Condição: <b>[a decidir]</b>.', who: '13 clientes só com audiovisual.', why: 'É a venda mais barata da Peformake.' },
  ],
  offerNote: '<b>Sem briga de preço:</b> nada de anúncio grátis ou “dobrar o faturamento”. O argumento é <b>estrutura e gente de verdade</b>, medidos toda semana.',
}

// ---------------- Estratégia ----------------
function diag1(d) {
  const f = [['Produção audiovisual', '25', 100], ['Tráfego', '14', 56], ['Design', '14', 56], ['Social media', '10', 40], ['Consultoria', '7', 28], ['Pacote completo (5 áreas)', '7', 28]]
  d.page('pf', 'Diagnóstico 1 de 3 · A base de clientes', 'Uma base boa, presa no audiovisual e no boca a boca', `
  <div class="dg">
    <div>
      <h3 class="h3">Clientes ativos por serviço (12/11)</h3>
      <div class="fun">${f.map((r) => `<div class="fr"><span class="fl2">${r[0]}</span><div class="fb"><i style="width:${Math.max(r[2], 2)}%"></i></div><b>${r[1]}</b></div>`).join('')}</div>
      <p class="cap2">32 ativos (24 recorrentes). <b>Gastronomia 7</b>, construção 4, óticas 2. <b>13 só com audiovisual.</b></p>
      <div class="mat"><b>5<small>/10</small></b><span>Maturidade do marketing da própria Peformake. Site com diagnóstico e sistema próprio; falta anúncio próprio, Instagram com ritmo e funil medido.</span></div>
    </div>
    <div class="swot">
      <div class="sw s1"><h4>Forças</h4>${ul(['Ellcazo e equipe de 7 pessoas na mesma casa', '653 conversas geradas por anúncio nos clientes (out–nov)'])}</div>
      <div class="sw s2"><h4>Fraquezas</h4>${ul(['11 de 13 vieram por indicação; nenhum por anúncio', 'Metade da base paga até ≈ R$ 1,2 mil por mês'])}</div>
      <div class="sw s3"><h4>Oportunidades</h4>${ul(['Janeiro: o dono quer “começar o ano certo”', 'Ninguém em Recife mostra a equipe gravando no cliente'])}</div>
      <div class="sw s4"><h4>Ameaças</h4>${ul(['Nacionais anunciando “anúncio grátis” e “dobrar”', '6 perdas por preço ou resultado: falta prova'])}</div>
    </div>
  </div>
  <h3 class="h3" style="margin-top:22px">Riscos e como evitar</h3>
  <div class="risks">${[['Lead chega e ninguém responde', 'Resposta em até 1 hora e lead no Comercial na hora.'], ['Expor cliente sem permissão', 'Case só com autorização por escrito.'], ['A equipe parar de produzir para os clientes', '2 diárias e a captura dupla; nada além.']].map((r) => `<div class="rk"><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div>`, { cls: 'dense' })
}

function diag2(d) {
  const lost = [['Fim de contrato', 5], ['Preço', 3], ['Insatisfação com o resultado', 3], ['Trocou de agência', 1], ['Outro', 1]]
  const max = 5
  const chart = `<div class="chart">${lost.map((p) => `<div class="col ${p[1] === 5 ? 'best' : ''}"><span class="val">${p[1]}</span><i style="height:${Math.round((p[1] / max) * 100)}%"></i><span class="lab"><b>${p[0]}</b></span></div>`).join('')}</div>`
  const stat = (arr) => `<div class="stats">${arr.map((s) => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>`
  const rows = [
    ['Focus Digital', 'Boa Viagem, Recife', 'Aceleradora de clínicas; anuncia vaga de gestor de tráfego.', `<a href="${AD}29112683908395608" target="_blank">ativo desde 11/11</a>`],
    ['Maracatu Digital', 'Recife', '“Conteúdo, vídeos e tráfego”, rosto da equipe no vídeo e “solicite uma proposta”.', `<a href="${AD}1739064560503450" target="_blank">ativo em 12/11</a>`],
    ['Okbox Assessoria', 'regional', '11 anúncios no ar em 12/11 com o nome “Assessoria de Marketing”.', `<a href="${AD}1097052383168879" target="_blank">11 anúncios</a>`],
    ['Alavant, Growing, Provex, Baruk', 'nacionais, gastronomia', 'Case de cliente, aula ao vivo “dobre em 2027”, “15 dias de anúncio grátis”, dica no anúncio.', `<a href="${AD}1659169755173117" target="_blank">case no ar desde 28/07</a>`],
  ]
  d.page('pf', 'Diagnóstico 2 de 3 · Funil e concorrentes', 'O comercial vive de indicação e não é medido', `
  <div class="an2">
    <div>
      ${stat([['11 de 13', 'clientes com origem registrada vieram por indicação'], ['0', 'leads do site registrados no sistema'], ['1', 'negócio aberto no Comercial (qualificação)'], ['13', 'clientes perdidos no histórico']])}
      ${chart}
      <p class="cap">Motivo dos 13 clientes perdidos (cadastro do sistema). 6 saíram por preço ou resultado: os dois se resolvem com prova e relatório.</p>
    </div>
    <div>
      <h3 class="h3">Quem anuncia para o mesmo dono de negócio</h3>
      <table class="comp"><thead><tr><th>Concorrente</th><th>O que posta / vende</th><th>Anúncio</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r[0]}</b><span>${r[1]}</span></td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>
      <p class="cap" style="margin-top:18px">Biblioteca de Anúncios da Meta, 12/11: 210 anúncios ativos para “marketing Recife” e 919 para “marketing para restaurantes”. Quase todos prometem número; poucos mostram a equipe e o cliente de verdade.</p>
    </div>
  </div>`, { cls: 'dense' })
}

function diag3(d) {
  const viral = [['192', 'Ótica MD Prime: conversas no WhatsApp', 'R$ 6,53 por conversa, out–nov', ''], ['893', 'VOVINA: cliques no link do delivery', 'R$ 0,13 cada; 5,68% de cliques em 9 dias', ''], ['32', 'Fornario: posts no período (antes 8)', '2.305 curtidas e comentários', ''], ['2.431', 'Brio Burguer: views do produto em close', '3,6 vezes a média do perfil', '']]
  const br = [['Os clientes que chegam por indicação ficam: só 1 saiu por trocar de agência.', 'Pedir indicação de forma organizada: <b>1 pedido por cliente</b> até 18/12, com um motivo.'], ['Os números dos clientes são bons e ninguém vê.', 'Série <b>“Estudo de caso em 60 s”</b>: um cliente por semana, com autorização.'], ['A concorrência promete “dobrar o faturamento”.', 'A Peformake mostra <b>a equipe trabalhando</b> e o número real, sem promessa.'], ['13 clientes têm só audiovisual.', 'Oferta <b>“Da gravação ao cliente”</b>: o vídeo já gravado vira anúncio.']]
  d.page('pf', 'Diagnóstico 3 de 3 · Cases e o que fazemos', 'Vimos isso, então vamos fazer aquilo', `
  <div class="an2b">
    <div>
      <h3 class="h3">Números reais dos clientes (sistema e Meta)</h3>
      <div class="viral">${viral.map((r) => `<div class="vr"><b>${r[0]}</b><div><span style="font-weight:800;color:var(--dk)">${r[1]}</span><span>${r[2]}</span></div></div>`).join('')}</div>
      <p class="cap">Todos os cases só vão ao ar com <b>[autorização do cliente]</b>. Valores de contrato nunca aparecem.</p>
    </div>
    <div class="bridges">${br.map((r) => `<div class="br"><div class="saw"><em>vimos</em>${r[0]}</div><div class="arr">→</div><div class="do"><em>vamos fazer</em>${r[1]}</div></div>`).join('')}</div>
  </div>`, { cls: 'dense' })
}

function vendaPage(d) {
  d.page('pf', `${BR} · Funil comercial e metas`, 'Do vídeo ao Raio-X, do Raio-X ao contrato', `
  <div class="now"><b>Hoje:</b> o cliente chega por indicação, a conversa fica no WhatsApp do Italo e nada entra no Comercial. A partir de 16/11, <b>todo lead entra no sistema</b> com a origem (anúncio, conteúdo, indicação).</div>
  <div class="g2t">
    <div>
      <h3 class="h3">O caminho da venda</h3>
      <div class="camps">${[
        ['1', 'Conteúdo e anúncio pedem o Raio-X', 'Mensagem pronta no WhatsApp: “Quero o Raio-X do meu marketing”. Origem marcada na hora.'],
        ['2', 'Qualificação em 1 hora', 'Thyfany pergunta nicho, cidade e faturamento (R$ 30 a 150 mil por mês) e marca o Raio-X com o Italo.'],
        ['3', 'Raio-X de 30 minutos', 'O Italo mostra os 3 vazamentos; proposta com preço claro em até 48 horas.'],
        ['4', 'Contrato e começo em 7 dias', 'Assinatura no sistema (Assinafy); diária de gravação marcada para janeiro.'],
      ].map((c) => `<div class="camp"><div class="cp"><b>${c[0]}</b></div><div><h4>${c[1]}</h4><p>${c[2]}</p></div></div>`).join('')}</div>
    </div>
    <div>
      <h3 class="h3">Metas até 31/12 (aposta inicial, revista em 30/11)</h3>
      ${ul(['<b>80 conversas</b> de donos de negócio: 50 do anúncio e 30 de conteúdo e indicação', '<b>25 Raio-X</b> feitos (cerca de 1 em cada 3 conversas)', '<b>6 contratos recorrentes novos</b> começando em janeiro, <b>3 diárias Ellcazo</b> e <b>3 upgrades</b> na base', '<b>12 indicações</b> pedidas aos clientes atuais (1 por cliente com pacote ou tráfego)'])}
      <h3 class="h3" style="margin-top:16px">Janeiro já pensado</h3>
      ${ul(['05/01: balanço e plano de janeiro; o anúncio vencedor ganha mais verba', 'Meta de janeiro: <b>[6 a 8 contratos]</b>, decidida em 05/01 com o custo real por Raio-X'])}
    </div>
  </div>`, { cls: 'dense' })
}

function equipePage(d) {
  const rows = [
    ['Italo', 'Head de marketing, estratégia e tráfego. <b>O rosto da marca.</b>', 'Faz os Raio-X; grava 2 vídeos por semana (casos, “teste do celular”, a história da dicção); sobe e acompanha os anúncios.'],
    ['Thyfany Rayane', 'Líder de equipe e social media', 'Dona do calendário e da série de casos; qualifica os leads; aparece no “POV: social media” e no “Um dia na Peformake”.'],
    ['Ingrid Rayane', 'Social media', 'Stories todo dia (“bastidor do dia”), legendas e respostas; aparece no POV e grava os bastidores nas diárias dos clientes.'],
    ['Higor Horácio', 'Design gráfico', 'Carrosséis de caso e de equipe; vídeo “Da conversa à arte”; atua na esquete “Eu não preciso de assessoria”.'],
    ['Aleffer', 'Audiovisual e captação', 'Grava as 2 diárias da Peformake e a captura dupla nos clientes; fala no vídeo da Ellcazo “3 takes de celular”.'],
    ['Almeida', 'Edição', 'Edita a série de casos e o “Um dia na Peformake”; aparece no “Do bruto ao Reels”.'],
    ['Lucas', 'Edição e videomaker', 'Cortes curtos e versões de anúncio (9:16, 15 s); aparece no “Do bruto ao Reels”.'],
    ['Ellcazo', 'Produtora parceira', 'Diárias de gravação dos clientes; os vídeos de venda da Ellcazo saem dessas diárias.'],
  ]
  d.page('pf', `${BR} · A equipe é o conteúdo`, 'Quem faz o quê, e o papel de cada um no calendário', `
  <table class="cal cal1 eq">
    <thead><tr><th>Quem</th><th>Papel na Peformake</th><th>No calendário até 31/12</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td class="d">${r[0]}</td><td class="e">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
  </table>
  <p class="cap" style="margin-top:12px">Regra: ninguém aparece contra a vontade. Quem não quiser falar aparece trabalhando, sem fala.</p>`, { cls: 'calpg' })
}

function casesPage(d) {
  const cs = [
    ['Ótica MD Prime', 'Conversas no WhatsApp pelo anúncio', '192 conversas a R$ 6,53 cada (out–nov)', '19/11'],
    ['VOVINA', 'Clique no delivery próprio', '893 cliques a R$ 0,13; 85% vieram do vídeo do Combo', '03/12'],
    ['Fornario', 'Constância no orgânico', '32 posts no período (antes 8) e 2.305 curtidas e comentários', '10/12'],
    ['Brio Burguer', 'Produto em close vende', '2.431 views no “Brio Matuto”, 3,6 vezes a média', '17/12'],
    ['Sn Distribuidora', 'Gente da empresa na câmera', 'Vídeos com a Sandra rendem mais que arte (28 × 12 curtidas)', 'janeiro'],
    ['Clínica (estética)', 'Conversas para avaliação', '165 conversas a R$ 6,21 cada (out–nov)', 'janeiro'],
  ]
  d.page('pf', `${BR} · Cases e indicação`, 'Um case por semana, e uma indicação pedida por cliente', `
  <div class="g2n">
    <div>
      <table class="comp"><thead><tr><th>Cliente</th><th>O que o case mostra</th><th>Vai ao ar</th></tr></thead><tbody>${cs.map((r) => `<tr><td><b>${r[0]}</b><span>[autorização do cliente]</span></td><td><b>${r[1]}:</b> ${r[2]}</td><td style="white-space:nowrap;font-weight:800">${r[3]}</td></tr>`).join('')}</tbody></table>
      <p class="cap" style="margin-top:10px">Números do sistema (tráfego e conteúdo) e da Meta. Nenhum valor de contrato.</p>
    </div>
    <div class="card need"><h3>Indicação organizada</h3>${ul(['<b>Quem pede:</b> o Italo, na reunião do mês ou no relatório de segunda', '<b>Para quem:</b> os 12 clientes com pacote completo ou tráfego', '<b>Como:</b> “Você conhece um dono de negócio que trabalha muito e não vê o marketing virar venda?”', '<b>O que ganha quem indica:</b> [benefício a decidir: mês de social, diária extra ou nada]', '<b>Até 18/12</b>, e cada indicação entra no Comercial com a origem “Indicação”'])}</div>
  </div>`, { cls: 'dense' })
}

const decs = [
  ['Oferta principal de dezembro', [['A', '“Comece 2027 com o plano pronto”', 'contrato de 6 meses fechado até 19/12', 1], ['B', 'Sem oferta de data', 'vende o ano todo do mesmo jeito']]],
  ['Black Friday da Peformake', [['A', '20 vagas de Raio-X, sem desconto', '27 a 30/11, marcadas pelo WhatsApp', 1], ['B', 'Desconto no 1º mês', '[%] a definir; abre briga de preço']]],
  ['Benefício para quem indica', [['A', 'Um mês de social media ou uma diária', 'quando o indicado fechar', 1], ['B', 'Só agradecimento', 'sem custo; pede menos']]],
  ['Verba de anúncio da Peformake', [['A', 'R$ 25/dia', '≈ R$ 1.150 no período'], ['B', 'R$ 37/dia', '≈ R$ 1.750 no período', 1], ['C', 'R$ 57/dia', '≈ R$ 2.700 no período']]],
]
function decPage(d) {
  d.page('pf', `${BR} · Decisões`, 'Quatro escolhas para o plano ir ao ar', `
  <div class="decs">${decs.map((x, i) => `<div class="card dec"><h3><span class="num">${i + 1}</span>${x[0]}</h3>
    ${x[1].map((o) => `<div class="dopt ${o[3] ? 'rec' : ''}"><b>${o[0]}</b><div><strong>${o[1]}</strong><span>${o[2]}</span></div>${o[3] ? '<em>sugerida</em>' : ''}</div>`).join('')}
  </div>`).join('')}
  <div class="card syn1 span2"><h3>O que muda na rotina da Peformake</h3>${ul(['Todo lead entra no Comercial com a origem, no mesmo dia', 'Resposta em até 1 hora (Italo ou Thyfany), das 8h às 19h', 'Autorização por escrito antes de qualquer case ir ao ar', 'Relatório da própria Peformake toda segunda: conversas, Raio-X e contratos'])}</div></div>`, { cls: 'dense' })
}

function nextPage(d) {
  const need = ['<b>Conta de anúncio da Peformake</b> e acesso ao @peformake e ao @italosantosdigital pela Meta', '<b>Autorização dos clientes</b> para os cases (Ótica MD, VOVINA, Fornario, Brio, Sn, clínica)', '<b>Condição de fechamento antecipado</b> do “Comece 2027” e o benefício da indicação', '<b>Quem atende o WhatsApp</b> dos leads (sugestão: Thyfany qualifica, Italo faz o Raio-X)', '<b>Agenda do Italo</b>: 3 horários fixos de Raio-X por semana']
  const steps = [['13/11', 'Decisões desta estratégia'], ['até 16/11', 'Conta de anúncio, mensagem pronta e Comercial com origem'], ['17/11', 'Diária 1: a equipe no escritório (Aleffer grava)'], ['19/11', '1º case no ar (Ótica MD) e o anúncio de captação'], ['20/11', 'Feriado: story de horário'], ['27 a 30/11', 'Black Friday: 20 vagas de Raio-X'], ['01/12', 'Diária 2: captura dupla num cliente'], ['08/12', 'Feriado no Recife: sem post de data'], ['15 a 19/12', '“Comece 2027”: último dia 19/12'], ['05/01', 'Balanço e plano de janeiro']]
  d.page('pf', `${BR} · O que precisamos e próximos passos`, 'Com isto até 16/11, o plano roda sozinho', `
  <div class="g2n">
    <div class="card need"><h3>O que precisamos decidir e reunir</h3>${ul(need)}</div>
    <div class="steps">${steps.map((s) => `<div class="st"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
  </div>`, { cls: 'dense' })
}

// ---------------- Social media ----------------
const S = {
  socialTitle: 'Gente de verdade, número de verdade e um convite: o Raio-X',
  pillars: [['Cases e bastidores', 30, 'estudo de caso, diária de gravação, antes e depois'], ['Educação para o dono', 25, 'post que vende × post que enfeita, teste do celular'], ['A equipe', 15, 'quem faz o quê, um dia na Peformake, POV'], ['Italo (marca pessoal)', 15, 'a dicção, o automático, de dentro da operação'], ['Oferta', 15, 'Raio-X, Comece 2027, diária Ellcazo']],
  week: [['Seg', 'Educação para o dono (Thyfany escreve, Higor desenha)'], ['Qua', 'Case ou bastidor da equipe (Reels editado pelo Almeida)'], ['Sex', 'Italo na câmera ou oferta (Reels; corte de anúncio pelo Lucas)'], ['Todo dia', 'Stories “bastidor do dia” (Ingrid)']],
  design: ['Fundo branco ou azul-escuro (#0B3C44), ciano (#1FC8DB) só para o número que importa', 'Foto real da equipe e do cliente; nunca imagem de banco', 'Número do case grande na capa, com a fonte (“dados do sistema”)', 'Selo fixo “Raio-X grátis no WhatsApp”', 'Peça de audiovisual com a marca Ellcazo (verde-limão), não Peformake'],
  cal: [
    ['13 a 16/11', 'Agora', 'Decisões, conta de anúncio, Comercial com origem, autorizações dos cases.'],
    ['17/11 (ter)', 'Diária 1: equipe no escritório', '“Quem faz o quê na Peformake” no ar.'],
    ['19/11 (qui)', 'Estudo de caso #1', 'Ótica MD: 192 conversas. Anúncio de captação sobe.'],
    ['20/11 (sex)', 'Consciência Negra: feriado', 'Story de horário. Sem post de data.'],
    ['23 a 26/11', 'Educação + Italo', '“Post que vende × post que enfeita” e “Eu tinha problema de dicção”.'],
    ['27 a 30/11', 'Black Friday + 1ª parcela do 13º', '<b>20 vagas de Raio-X</b>, sem desconto.'],
    ['01 a 05/12', 'Diária 2 (captura dupla) + case #2', '“Teste do celular” e VOVINA: 893 cliques.'],
    ['08/12 (ter)', 'N. Sra. da Conceição: feriado no Recife', 'Story de horário.'],
    ['09 a 12/12', 'Bastidor + Ellcazo', '“Um dia na Peformake” e “Vídeo de restaurante que dá fome”.'],
    ['15 a 19/12', '2ª parcela do 13º · fim de ano', '<b>“Comece 2027 com o plano pronto”</b>: último dia 19/12.'],
    ['24, 25 e 31/12', 'Natal e Réveillon', 'Obrigado 2026 com a equipe e os clientes (fotos reais).'],
    ['05/01', 'Janeiro', 'Balanço; série de casos continua (Sn e clínica).'],
  ],
}

function socialPages(d) {
  d.page('pf', `${BR} · Pilares, ritmo e design`, S.socialTitle, `
  <div class="g2s">
    <div>
      <h3 class="h3">Pilares do conteúdo</h3>
      <div class="bars">${S.pillars.map((p) => `<div class="bar"><div class="bl"><b>${p[0]}</b><span>${p[2]}</span></div><div class="bt"><i style="width:${p[1] * 2.5}%"></i><em>${p[1]}%</em></div></div>`).join('')}</div>
      <p class="cap" style="margin-top:14px">3 posts por semana no @peformake e stories todo dia. O Italo posta a versão pessoal no @italosantosdigital (mesma gravação, outra tese). Nunca repost puro.</p>
    </div>
    <div>
      <h3 class="h3">Ritmo da semana</h3>
      <div class="week">${S.week.map((w) => `<div class="wd"><b>${w[0]}</b><span>${w[1]}</span></div>`).join('')}</div>
      <h3 class="h3" style="margin-top:18px">Design: as regras do período</h3>
      ${ul(S.design)}
    </div>
  </div>`, { cls: 'dense' })

  d.page('pf', `${BR} · Calendário do período`, 'As datas que viram post e venda, de 12/11 a 31/12', `
  <table class="cal cal1">
    <thead><tr><th>Quando</th><th>O que acontece</th><th>O que a Peformake publica e vende</th></tr></thead>
    <tbody>${S.cal.map((r) => `<tr class="${/Black Friday|2ª parcela/.test(r[1]) ? 'hot' : ''}"><td class="d">${r[0]}</td><td class="e">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
  </table>`, { cls: 'calpg' })

  const sm = require('./sm.js')
  sm.P[BR] = require('./pf_posts.js')
  sm.pages(d, BR)
}

// ---------------- Audiovisual ----------------
const AVX = {
  avTitle: 'De dentro da operação: a equipe trabalhando e o cliente de verdade',
  avLead: '10 vídeos com 3 ideias cada, gravados em 2 diárias (17/11 no escritório e 01/12 num cliente) e na captura dupla das diárias da Ellcazo. 3 deles vendem a própria Ellcazo.',
}
const bv = {
  voice: ['Fala direta, com humor seco: quem faz, mostrando como faz.', 'O Italo abre em cena, sem “oi, pessoal”. A equipe aparece trabalhando de verdade, e o número do cliente fecha o vídeo.'],
  saw: ['Na base, os vídeos de gente da empresa rendem mais que arte (Sn: 28 × 12 curtidas)', 'No nicho, “um dia na agência” e “POV: social media” passam de 30 mil e 60 mil views', 'Os concorrentes prometem número; quase ninguém mostra a equipe gravando no cliente'],
  ask: ['Abertura <b>dentro da cena</b> nos 2 primeiros segundos', 'Rosto da equipe com <b>nome na tela</b>', 'O número real do cliente, com autorização', 'Fecha com <b>“Raio-X grátis no WhatsApp”</b>', 'Nada de pedestal: gravado no escritório, na rua e no cliente'],
}
const COM = {
  title: 'Como a Peformake fala nos vídeos',
  tone: [
    ['Direto', 'Uma ideia por vídeo, dita como se fala com um amigo.', 'Post bonito sem estratégia é decoração cara.'],
    ['De dentro', 'Gravado dentro da operação, nunca de fundo neutro.', 'Tô aqui no Fornario às 7h da manhã.'],
    ['Humor seco', 'Ri dos próprios furos, nunca do cliente.', 'Eu tinha problema de dicção. Virei comunicador.'],
    ['Prova', 'O número real fecha o argumento.', '192 conversas. Dados do sistema.'],
  ],
  avoid: ['“Agência”', 'Vilão no tráfego pago', 'Promessa de dobrar', 'Coach de palco', 'Dancinha vazia', 'Expor cliente sem autorização'],
  rule: 'Se servisse para qualquer agência do Brasil, não é Peformake.',
  lang: [['Câmera na mão', 'Seguindo quem trabalha, vertical 9:16.'], ['Nome na tela', 'Cada pessoa da equipe com nome e função.'], ['Lapela', 'Escritório e cozinha têm eco: microfone sempre.'], ['Tela do sistema', 'O número aparece na tela real (sem valor de contrato).'], ['Ritmo', '30 a 60 s; corte a cada 2 a 3 s.']],
}
function comPage(d) {
  d.page('av', `${BR} · Comunicação nos vídeos`, COM.title, `
  <div class="tone">${COM.tone.map((t) => `<div class="tc"><h3>${t[0]}</h3><p>${t[1]}</p><q>${t[2]}</q></div>`).join('')}</div>
  <div class="avoid"><b>Evitamos:</b>${COM.avoid.map((a) => `<span>${a}</span>`).join('')}</div>
  <div class="lang"><div class="lrule"><small>Linguagem de vídeo</small>${COM.rule}</div>
    <div class="lrows">${COM.lang.map((l) => `<div class="lr"><b>${l[0]}</b><span>${l[1]}</span></div>`).join('')}</div></div>`, { cls: 'avl compg' })
}

// [código, selo, título, direção, ideias, url, rede, @, rótulo, [a referência, na Peformake], roteiros, [quem fala, quem grava], img]
const V = [
  ['P1', 'Diária 17/11 · Bastidor · Orgânico + remarketing', 'Um dia na Peformake', 'Das 8h às 18h em 60 s: a reunião de pauta, o Higor na arte, o Aleffer saindo para a diária, o Italo olhando o anúncio. Cada pessoa com nome na tela.',
    [['O relógio', 'Um relógio na tela a cada corte: 8h pauta, 10h arte, 13h diária no cliente, 17h relatório.'], ['Quem faz o quê', 'Cada pessoa diz em uma frase o que faz e o que o cliente ganha com isso.'], ['O caminho de um post', 'Segue uma peça do Fornario da reunião até o portal do cliente aprovar.']],
    YTW('G4STG05rPUM'), 'YouTube', '@avilahenrique1', 'Um dia na minha agência de marketing · 31,5 mil views', ['O dono mostra o dia inteiro da agência em vlog, com a equipe trabalhando', 'a versão de 60 s, com a equipe da Peformake e o cliente real'],
    ['Italo: “8h. A pauta do dia.” | Cortes: Higor na arte, Aleffer carregando a câmera, Ingrid nos stories. | “É isso que acontece quando você contrata a gente. Raio-X grátis no WhatsApp.”', 'Thyfany: “Eu cuido do calendário de 20 clientes.” | Higor: “Eu transformo a ideia em arte.” | Aleffer: “Eu gravo dentro do seu negócio.”', 'Texto: “Como nasce um post.” | Reunião → arte → aprovação no portal → no ar. | “Você aprova tudo antes. Chama no WhatsApp.”'],
    ['Italo abre; a equipe toda fala uma frase', 'Aleffer (câmera) e Lucas (celular)'], 'yt_G4STG05rPUM'],
  ['P2', 'Diária 17/11 · Humor · Orgânico', 'POV: você é social media de restaurante', 'A Thyfany e a Ingrid encenam o dia a dia real: o dono manda áudio de 4 minutos às 23h, a foto do prato chega tremida, o prato some antes da foto.',
    [['O áudio das 23h', 'A Thyfany ouve um áudio enorme; a Ingrid traduz em uma linha o que o dono quer.'], ['A foto do prato', 'A foto chega escura e tremida; corte para a Ingrid ensinando a foto certa em 3 passos.'], ['A aprovação', '“Pode postar?” “Pode.” Dez minutos depois: “Muda tudo.” Fecha com o portal resolvendo.']],
    YT('TKpqFGZwVCQ'), 'YouTube', '@vislamarim', 'pov: você é social media · 60 mil views', ['O criador encena a rotina do social media com humor seco e câmera parada', 'a rotina real da Thyfany e da Ingrid com clientes de restaurante (sem citar nome)'],
    ['Texto: “POV: você é social media de restaurante.” | Áudio de 4 min tocando; Thyfany com a mão no rosto. | Ingrid: “Ele quer… foto da pizza.”', '“A foto que chega.” (tremida) | Ingrid: “Luz da janela, de cima, sem flash.” | “A foto que vende.”', '“Pode postar?” “Pode!” | 10 min depois: “Muda tudo.” | Texto: “Por isso tudo passa pelo portal.”'],
    ['Thyfany e Ingrid', 'Aleffer'], 'yt_TKpqFGZwVCQ'],
  ['P3', 'Diária 17/11 · Humor · Orgânico + teste de anúncio', 'Eu não preciso de assessoria', 'Esquete: o Higor faz o dono que “não precisa de marketing” e faz tudo sozinho no automático; o Italo só observa e no fim mostra a conta.',
    [['O sobrinho', '“Meu sobrinho faz as artes.” Corte para o sobrinho de férias e o perfil parado há 14 dias.'], ['O impulsionar', 'O dono aperta “impulsionar” em tudo; o Italo mostra o que foi para ninguém.'], ['A virada', 'O dono cansado pergunta “e agora?”; o Italo responde com o Raio-X.']],
    YT('vSDjmhMNZNc'), 'YouTube', '@CapivaraVoadoraYoutube', 'Eu não preciso de agência de marketing · 3,5 mil views', ['O esquete do dono que acha que não precisa de marketing', 'o Higor como o dono no automático; o vilão é o automático, nunca o anúncio'],
    ['Higor (dono): “Eu não preciso de assessoria. Meu sobrinho faz.” | Perfil parado há 14 dias. | Italo: “Cadê o sobrinho?” “De férias.”', 'Higor impulsiona tudo sem olhar. | Italo: “Anúncio é acelerador. No automático, acelera para o lugar errado.” | “Raio-X grátis no WhatsApp.”', 'Higor: “Tá, e agora?” | Italo: “Agora a gente olha seus números. 30 minutos.” | Texto: “Raio-X do marketing.”'],
    ['Higor (o dono) e Italo', 'Aleffer'], 'yt_vSDjmhMNZNc'],
  ['P4', 'Diária 17/11 + tela · Prova · Série (anúncio principal)', 'Estudo de caso em 60 segundos', 'Um cliente por semana: o problema, o que a equipe fez e o número real na tela.',
    [['Ótica MD: as conversas', 'O problema (vitrine sem conversa), o anúncio com botão do WhatsApp e as 192 conversas.'], ['VOVINA: o delivery próprio', 'O vídeo do Combo, 893 cliques a R$ 0,13 e o que mudou no pedido.'], ['Fornario: a constância', 'De 8 para 32 posts e 2.305 interações: a equipe que posta por eles.']],
    YT('fTo6fuYAo9A'), 'YouTube', '@patrickserrano7', 'Marketing para restaurantes: viraliza × vende · 1 mil views', ['O especialista compara o vídeo que viraliza com o que vende, com a tela dividida', 'o Italo com o número real do cliente na tela e a equipe que fez'],
    ['“Essa ótica tinha vitrine e não tinha conversa.” | Tela: 192 conversas no WhatsApp, R$ 6,53 cada. | “Quer ver o seu? Raio-X grátis.”', '“A VOVINA queria pedido no delivery próprio.” | Vídeo do Combo → 893 cliques a R$ 0,13. | “Com vídeo de verdade, o clique é barato.”', '“O Fornario postava 8 vezes por mês.” | Thyfany e Ingrid no calendário: 32 posts. | “Constância é time, não força de vontade.”'],
    ['Italo; a pessoa da equipe que fez o trabalho', 'Aleffer; telas do sistema montadas pelo Higor'], 'yt_fTo6fuYAo9A'],
  ['P5', 'Diária 17/11 · Equipe · Orgânico', 'Da conversa à arte', 'O Higor mostra uma peça nascendo: o pedido do cliente, a referência, três tentativas e a arte aprovada no portal.',
    [['Time-lapse da arte', 'Tela do Higor acelerada, da folha branca à arte final, com o pedido escrito no topo.'], ['As 3 versões', 'Três versões lado a lado; o Higor explica por que a terceira vende.'], ['O pedido estranho', '“Quero algo clean mas chamativo”: o Higor mostra como traduz.']],
    YTW('Fr1rD3iXAnA'), 'YouTube', '@aporgeeducation', 'Um dia na vida de um designer gráfico · 16 mil views', ['O designer mostra o dia e o processo de criação no computador', 'o processo do Higor numa peça real de cliente (com autorização)'],
    ['Texto: “O pedido: ‘uma arte do combo’.” | Time-lapse da tela do Higor. | “Aprovada no portal em 1 toque.”', 'Higor: “Versão 1: bonita. Versão 2: legível. Versão 3: vende.” | Aponta o preço e o botão. | “A gente desenha para vender.”', '“Clean, mas chamativo.” (cliente) | Higor ri e mostra a solução. | “Traduzir pedido também é trabalho.”'],
    ['Higor', 'Aleffer'], 'yt_Fr1rD3iXAnA'],
  ['P6', 'Escritório (no celular) · Equipe · Orgânico', 'Do bruto ao Reels', 'O Almeida e o Lucas mostram 40 minutos de gravação virando 30 segundos: o corte, o som, a legenda e a versão de anúncio.',
    [['Antes e depois', 'Tela dividida: o bruto tremido à esquerda, o Reels pronto à direita.'], ['3 cortes que mudam tudo', 'O gancho no 1º segundo, o som do produto e a legenda grande.'], ['Dois editores, um vídeo', 'O Almeida faz o orgânico; o Lucas faz o corte de 15 s para anúncio.']],
    YTW('tiYsjsxZb2Q'), 'YouTube', '@MarvinEstúdio', 'Minha rotina de editor de vídeo · 222 mil views', ['O editor mostra a rotina e a timeline, com humor', 'o Almeida e o Lucas editando um vídeo real de cliente da Peformake'],
    ['Texto: “40 minutos de gravação.” | Timeline acelerada. | “30 segundos que vendem.”', 'Almeida: “1: o gancho primeiro.” | Lucas: “2: o som do produto.” “3: legenda grande.” | “Quer vídeo assim? Raio-X grátis.”', 'Almeida: “Esse é o orgânico.” | Lucas: “Esse é o de anúncio, 15 s.” | “Mesmo vídeo, dois trabalhos.”'],
    ['Almeida e Lucas', 'Lucas (celular, gravação de tela)'], 'yt_tiYsjsxZb2Q'],
  ['P7', 'Diária 17/11 · Marca pessoal · @italosantosdigital', 'Eu tinha problema de dicção', 'O Italo conta, de dentro da operação, como o menino com problema de dicção virou comunicador no YouTube e hoje ensina dono de negócio a aparecer.',
    [['A cicatriz', 'Abre com uma frase que ele errava; corta para ele hoje gravando um cliente.'], ['O dono com vergonha', 'Conversa com um dono que não quer aparecer; o Italo conta a própria história.'], ['3 dicas de quem travava', 'Três coisas que destravaram a fala dele, em 30 s.']],
    YTW('oVWYuLgfLA4'), 'YouTube', '@TiagoFonsecaoficial', 'Como perder o medo de gravar vídeos · 149 mil views', ['O criador ensina a perder o medo de gravar', 'a história real do Italo, sem coach de palco: ferida cicatrizada, com propósito'],
    ['“Eu tinha problema de dicção.” | “Fui obrigado a falar no YouTube por 10 anos.” | “Se eu apareço, você aparece também.”', 'Dono: “Eu não gosto de aparecer.” | Italo: “Eu também não gostava.” | “Seu cliente quer ver você, não o banco de imagem.”', '“1: grave falando com uma pessoa só.” | “2: comece no meio da frase.” | “3: o erro fica. É real.”'],
    ['Italo', 'Aleffer'], 'yt_oVWYuLgfLA4'],
  ['P8', 'Diária 17/11 · Educação · Anúncio de captação', 'O teste do celular', 'Antes de pôr mais dinheiro em anúncio, o dono abre o próprio anúncio no celular e tenta comprar de si mesmo. O Italo faz o teste ao vivo.',
    [['Compre de você mesmo', 'O Italo pega o celular de um dono e tenta pedir pelo anúncio dele, cronometrando.'], ['As 3 perguntas', 'A oferta está clara? O botão funciona? Dá para pedir sem caçar?'], ['O conserto', 'Antes e depois do mesmo anúncio, com a mensagem pronta no WhatsApp.']],
    AD + '1095856403078936', 'Biblioteca de Anúncios', 'Agência Baruk', 'anúncio ativo desde 06/11/2026', ['Anúncio de assessoria que ensina um teste em vez de prometer número', 'o Italo faz o teste ao vivo com o celular de um dono de Recife'],
    ['“Antes de pôr mais dinheiro em anúncio, faz um teste.” | Abre o anúncio e tenta pedir: 2 min e nada. | “Se você travou, seu cliente também. Raio-X grátis.”', '“Três perguntas.” | Oferta clara? Botão? Mensagem pronta? | “Faltou uma? O anúncio não é o problema.”', 'Antes: link para o perfil. | Depois: botão do WhatsApp com mensagem pronta. | “É isso que a gente arruma.”'],
    ['Italo', 'Aleffer (versão de anúncio cortada pelo Lucas)'], 'ad_baruk_0'],
  ['P9', 'Diária no cliente 01/12 · Ellcazo · Orgânico + anúncio', '3 takes de celular que dão fome', 'O Aleffer ensina, num restaurante cliente, os 3 movimentos que dão fome. Vende a diária Ellcazo.',
    [['Os 3 movimentos', 'De cima, chegando devagar; de lado, puxando; e o “take 3” acompanhando o garçom.'], ['Celular × câmera', 'O mesmo prato no celular e na câmera da Ellcazo, lado a lado.'], ['O erro mais comum', 'Luz de cima e mão tremendo; o Aleffer corrige em 10 s.']],
    YT('kQZXCpBONNM'), 'YouTube', '@osmo_global', '3 movimentos de celular para vídeo de restaurante · 911 mil views', ['A marca de estabilizador ensina 3 movimentos de celular num restaurante', 'o Aleffer ensina os mesmos 3 movimentos num restaurante cliente da Ellcazo'],
    ['Aleffer: “Três movimentos.” | Take 1, take 2, take 3 no prato. | “Quer o seu feito por quem faz todo dia? Diária Ellcazo.”', '“Celular ou câmera?” | Tela dividida. | “Os dois vendem quando o movimento é certo.”', '“Esse é o erro.” (luz de cima) | Vira o prato para a janela. | “10 segundos. Chama a Ellcazo.”'],
    ['Aleffer', 'Lucas (celular) e Ingrid nos bastidores'], 'yt_kQZXCpBONNM'],
  ['P10', 'Diária no cliente 01/12 · Ellcazo · Venda', 'Antes e depois: o vídeo do seu restaurante', 'O bastidor de uma diária da Ellcazo num restaurante cliente e o resultado: do celular tremido ao vídeo que dá fome.',
    [['O bastidor', 'Equipe montando luz e câmera às 7h; o cozinheiro preparando; o primeiro take.'], ['Antes × depois', 'O vídeo antigo do perfil e o novo, lado a lado, 5 s cada.'], ['O som da cozinha', 'Sem fala: só fogo, faca e prato; no fim, a marca Ellcazo.']],
    YT('yHLmBWh2tOI'), 'YouTube', '@k_bugaj', 'Restaurant cinematic video · 38 mil views', ['O videomaker mostra o vídeo de restaurante com luz e movimento de cinema', 'a diária real da Ellcazo num cliente (com autorização) e o antes e depois'],
    ['Texto: “7h da manhã, cozinha do [cliente].” | Luz, câmera, primeiro take. | “Diária Ellcazo: 6 a 10 vídeos num dia.”', '“Antes.” (vídeo antigo) | “Depois.” (vídeo novo) | “Fim de ano chegando. Agenda até 18/12.”', 'Sem fala: fogo, faca, prato servido. | Logo Ellcazo. | Texto: “Chama no WhatsApp.”'],
    ['Ninguém (som da cozinha); o Italo assina no fim', 'Ellcazo, com Aleffer'], 'yt_yHLmBWh2tOI'],
]

function videoPages(d) {
  V.forEach((v, k) => {
    const [code, selo, title, dir, ideas, url, net, at, rlabel, rf, rot, who, im] = v
    const cls = k % 2 === 0 ? 'avw' : 'avl'
    d.page('av', '', '', `
    <div class="vp">
      <a class="phone" href="${url}" target="_blank"><img src="${img(im)}" alt=""><span class="play">▶ Assistir ${net === 'YouTube' ? 'no YouTube' : 'na Biblioteca'}</span></a>
      <div class="vmain">
        <div class="bname">${BR} · gravação ${k + 1}/${V.length}</div>
        <div class="vtop"><span class="code">${code}</span><span class="selo">${selo}</span></div>
        <h2>${title}</h2>
        <p class="vdir">${dir}</p>
        <div class="who"><span><b>Quem fala</b>${who[0]}</span><span><b>Quem grava</b>${who[1]}</span></div>
        <p class="adapt"><b>A referência</b> ${rf[0]} <span>→</span> <b>Na Peformake</b> ${rf[1]}. <a class="src" href="${url}" target="_blank">${at} · ${rlabel}</a></p>
        <div class="ideas">${ideas.map((x, i) => `<div class="idea"><b>Ideia ${'ABC'[i]}</b><h4>${x[0]}</h4><p>${x[1]}</p><div class="rot"><span>Roteiro de apoio</span>${rot[i].split(' | ').map((l) => `<i>${l}</i>`).join('')}</div></div>`).join('')}</div>
      </div>
    </div>`, { cls: cls + ' vpg' })
  })
}

const FOTOS = [
  ['A equipe', [['yt_hC-I-JoXxho', 'Equipe nas mesas, luz natural, de lado', '@sociosdomarketing', YTW('hC-I-JoXxho')], ['yt_sqXqxUWfbsA', 'Reunião de pauta de verdade, telas ligadas', '@Bearhunterbsb', YTW('sqXqxUWfbsA')], ['ad_maracatu_1', 'Uma pessoa da equipe falando de pé, olhando a câmera', 'Maracatu Digital', AD + '1739064560503450']]],
  ['Gravação no cliente', [['yt_HWawJmbg5Qw', 'Bastidor com tripé e luz no cenário do cliente', '@francismeirefranco', YTW('HWawJmbg5Qw')], ['yt_I3eNG472Rhk', 'Captação na porta da loja, câmera na mão', '@profitpromkt', YTW('I3eNG472Rhk')], ['yt_FQOegVPzjiQ', 'Prato servido com a equipe ao fundo', '@grupos2digitalmkt', YTW('FQOegVPzjiQ')]]],
  ['Resultado', [['yt_J43ORnWZT3Y', 'Bastidor × resultado final, lado a lado', '@castworkpodcastdamarketize1132', YTW('J43ORnWZT3Y')], ['yt_xnl-VMYu_rw', 'Gravando o cliente provando o produto', '@amandonafps', YT('xnl-VMYu_rw')], ['yt_YExjJVL3kGU', 'Celular gravando o prato, mão em quadro', '@NathanAbritta', YT('YExjJVL3kGU')]]],
]
function photoPage(d) {
  d.page('av', `${BR} · Gravação · Referências de foto`, 'O que fotografar nas diárias', `
  <div class="fotos">${FOTOS.map(([g, L]) => `<div class="fg"><h3>${g}</h3><div class="fr3">${L.map((f) => `<a class="ft" href="${f[3]}" target="_blank"><img src="${img(f[0])}" alt=""><span>${f[1]}</span><small>${f[2]}</small></a>`).join('')}</div></div>`).join('')}</div>`, { cls: 'avw fotopg' })
}

function dayPage(d) {
  d.page('av', `${BR} · Gravação · As diárias`, 'Duas diárias e a captura dupla', `
    <div class="dayp">
      <div class="card slotsc"><p class="dsub">Diária 1 · terça 17/11 · escritório da Peformake (sugestão; ver decisões).</p>
        ${[['8h', 'Pauta real e a equipe chegando: P1 (Aleffer grava, Lucas no celular)'], ['10h', 'Thyfany e Ingrid: P2; Higor: P5'], ['13h', 'Esquete com Higor e Italo: P3'], ['15h', 'Italo: P4 (abertura dos casos), P7 e P8']].map((s) => `<div class="slot"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}
        <p class="dsub" style="margin-top:14px">Diária 2 · terça 01/12 · num restaurante cliente [qual, com autorização]: P9 e P10.</p></div>
      <div class="card outc"><h3>O que sai das diárias</h3><ul>${['10 vídeos gravados; editados por Almeida (orgânico) e Lucas (anúncio) até 2 dias depois', 'Fotos reais da equipe para as 10 postagens e para o site', 'P6 é gravado no celular, no escritório, sem diária', 'Captura dupla: em toda diária de cliente, 1 bastidor para a Peformake e 1 para o @italosantosdigital'].map((o) => `<li>${o}</li>`).join('')}</ul>
        <p class="dnote">Leve lapela, 2 celulares, o notebook com o sistema aberto (sem valores) e a autorização dos clientes dos casos. Ninguém grava contra a vontade.</p></div>
    </div>`, { cls: 'avl dense' })
}

// ---------------- montar ----------------
const extra = `<style>.eq td.d{width:150px;font-weight:800}.eq td.e{width:330px}.eq{font-size:14.5px}</style>`
const e = Doc(BR, 'Estratégia')
cover(e, BR, 'Estratégia do mês · com o diagnóstico', 'Estratégia de 12/11 a 31/12', 'O que vimos em números, a tese, as ofertas, o funil, a equipe, os cases, as decisões e os próximos passos. Com janeiro já pensado.')
tesePage(e, BR, b)
diag1(e); diag2(e); diag3(e)
offerPage(e, BR, x)
vendaPage(e)
equipePage(e)
casesPage(e)
decPage(e)
nextPage(e)
fs.writeFileSync(path.join(OUT, 'estrategia.html'), fixCover(html(`Estratégia ${BR}`, e.pages)).replace('</head>', extra + '</head>'))

const s = Doc(BR, 'Social media')
cover(s, BR, 'Planejamento de social media', 'Artes e posts de 12/11 a 31/12', 'Pilares, ritmo, calendário e as 10 postagens com referência real, copy da arte e legenda pronta.')
socialPages(s)
fs.writeFileSync(path.join(OUT, 'social-media.html'), fixCover(html(`Social media ${BR}`, s.pages)))

const a = Doc(BR, 'Audiovisual')
avCover(a, BR, b)
studyPage(a, BR, bv, AVX)
comPage(a)
videoPages(a)
photoPage(a)
dayPage(a)
fs.writeFileSync(path.join(OUT, 'audiovisual.html'), fixCover(html(`Audiovisual ${BR}`, a.pages)).replace('Como Peformake fala', 'Como a Peformake fala'))
console.log(BR, e.pages.length, s.pages.length, a.pages.length)
