// SN Distribuidora: 3 documentos (estratégia, social media, audiovisual) no mesmo design do build3.js.
// Reaproveita os componentes do build3.js sem rodar o laço das outras marcas.
const fs = require('fs')
const path = require('path')
const GEN = __dirname
const src = fs.readFileSync(path.join(GEN, 'build3.js'), 'utf8')
const partA = src.slice(0, src.indexOf('// ---------------- conteúdo por marca'))
const partB = src.slice(src.indexOf('// ---------------- páginas'), src.indexOf('D.Fornario.pieces[3][3]'))
const K = new Function('require', '__dirname', partA + partB + '\nreturn { Doc, card, ul, cover, tesePage, offerPage, avCover, studyPage, html, ell, logo, PER }')(require, GEN)
const { Doc, card, ul, cover, tesePage, offerPage, avCover, studyPage, html } = K

const BR = 'SN Distribuidora'
const OUT = path.resolve(GEN, '..', 'sn')
fs.mkdirSync(OUT, { recursive: true })
const img = (k) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(GEN, 'sn_thumbs', k + '.jpg')).toString('base64')
const ref = (u, l) => `<a href="${u}" target="_blank">${l}</a>`
const IG = 'https://www.instagram.com/p/'
const AD = 'https://www.facebook.com/ads/library/?id='
const TT = {
  hoff: 'https://www.tiktok.com/@hoffmannmtc/video/7205592258215873798',
  ipg: 'https://www.tiktok.com/@ipgeletricaehidra/video/7444324480333188407',
  adr: 'https://www.tiktok.com/@engciviladrianovanjura/video/7256503025370615045',
  deci: 'https://www.tiktok.com/@decifrandoaengenharia/video/7219635124852313350',
  pipek: 'https://www.tiktok.com/@eng.pipek/video/7444668470383430967',
  cris: 'https://www.tiktok.com/@eucristianorecomenda/video/7664681861007887637',
  terra: 'https://www.tiktok.com/@terrahydro/video/7667941432996449556',
  bart: 'https://www.tiktok.com/@bartofildistribuidora/video/7364364364628905221',
}

const b = {
  role: 'material hidráulico para quem constrói',
  card: `<p class="lead">Distribuidora de material hidráulico na Av. Recife (Estância). Vende <b>para quem constrói</b>: construtora, engenheiro, mestre de obras e encanador, em todo o estado e em Noronha.</p>
      <div class="kv"><span>Público</span>Profissionais e empresas da construção, 25 a 55 anos</div>
      <div class="kv"><span>Canal</span>WhatsApp (81) 98818-8000, telefone e cotação no site</div>
      <div class="goal"><span class="gl">Objetivo no período</span><b>20 listas de obra</b> recebidas no WhatsApp até 31/12 (aposta inicial), cada uma contada, e um vídeo da Sandra por semana.</div>`,
  teseTitle: 'Manda a lista da obra: a SN confere antes de faltar',
  tese: 'Nos anúncios da região, quase todo mundo vende preço de tijolo e telha. A SN vende <b>tempo de obra</b>: o profissional manda a lista da próxima etapa, a SN confere o que tem, o que falta e o prazo, e entrega. Em dezembro, isso vira o <b>pedido programado</b> para a volta das férias coletivas.',
  moves: [['A Sandra é a cara da SN', 'Os vídeos com ela já rendem mais que as artes. Toda semana, uma pergunta de balcão respondida por ela.'], ['Uma oferta só: a lista', 'Toda peça fecha em “Manda a lista no WhatsApp”. Na Black Friday, sem desconto: a Semana da Lista.'], ['Dezembro vende janeiro', 'Antes das férias coletivas, o material da volta fica fechado e com entrega agendada.']],
}

const x = {
  offerTitle: 'Vender tempo de obra, não peça avulsa',
  offers: [
    { main: true, name: 'Manda a lista da obra', what: 'O profissional manda a lista da próxima etapa; a SN confere disponibilidade, aponta o que costuma faltar e devolve o orçamento com prazo.', cond: 'Pelo WhatsApp, sem custo. Prazo de resposta: <b>[até X horas]</b>, a combinar.', who: 'Engenheiro, mestre de obras, encanador e comprador de construtora.', why: 'De novembro a fevereiro é seca no Recife: a obra acelera e ninguém quer rodar três lojas.' },
    { name: 'Semana da Lista (27 a 30/11)', what: 'Black Friday sem desconto: a lista enviada nesses dias sai na frente na separação e na entrega.', cond: 'Listas recebidas de 27 a 30/11. Mimo opcional: [brinde] (a decidir).', who: 'Quem fecha etapa antes de dezembro.', why: 'Cai junto com a 1ª parcela do 13º e não ensina o cliente a esperar desconto.' },
    { name: 'Pedido programado de janeiro', what: 'O material da volta fechado em dezembro, com entrega agendada para a semana de [05/01].', cond: 'Pedido até [19/12]; preço garantido até [data] (decisão 3).', who: 'Construtoras e empreiteiros que param nas férias coletivas.', why: 'A obra volta sem esperar material e a SN começa janeiro com pedido fechado.' },
    { name: 'Kits por etapa', what: 'Kit caixa d’água, kit banheiro e biodigestor, montados pela Sandra com as peças certas.', cond: 'Preço [sob consulta ou na arte]; marcas Tigre e Fortlev.', who: 'Encanador e quem reforma pela mão do profissional.', why: 'Responde “o que eu compro?” e aumenta o tamanho do pedido.' },
  ],
  offerNote: '<b>Sem briga de preço:</b> a SN não entra no “menor preço do tijolo”. O argumento é <b>prazo certinho</b>, a marca que o engenheiro especifica e a lista conferida antes de faltar.',
}

// ---------------- Estratégia ----------------
function diag1(d) {
  const f = [['Nomes que o cliente pede', '130 mil', 100], ['Conexões explicadas', '112 mil', 86], ['Tubos e conexões da obra', '57,7 mil', 44], ['Peças da loja (sem fala)', '23,3 mil', 18], ['Produto testado na mão', '17,2 mil', 13], ['Vendedor de distribuidora', '5,6 mil', 4]]
  d.page('pf', 'Diagnóstico 1 de 3 · O que vimos em números', 'O nicho assiste a quem explica a peça; a SN ainda posta vitrine', `
  <div class="dg">
    <div>
      <h3 class="h3">O que o nicho assiste (views no TikTok)</h3>
      <div class="fun">${f.map((r) => `<div class="fr"><span class="fl2">${r[0]}</span><div class="fb"><i style="width:${Math.max(r[2], 2)}%"></i></div><b>${r[1]}</b></div>`).join('')}</div>
      <p class="cap2">Vídeos de lojas e engenheiros de hidráulica, coletados em 12/11. <b>Na SN:</b> 12 a 28 curtidas por post para 5.480 seguidores; os vídeos com a Sandra rendem mais que as artes.</p>
      <div class="mat"><b>4<small>/10</small></b><span>Maturidade digital. Site com endereço e cotação, Instagram ativo e a Sandra no vídeo; falta contar os pedidos que vêm das redes e dar ritmo.</span></div>
    </div>
    <div class="swot">
      <div class="sw s1"><h4>Forças</h4>${ul(['Distribuidora Tigre (carro-chefe), Fortlev e Amanco Wavin, desde 2012', 'Atende todo o estado e Noronha; a Sandra já é o rosto nos vídeos'])}</div>
      <div class="sw s2"><h4>Fraquezas</h4>${ul(['12 a 28 curtidas por post; arte de produto rende metade do vídeo', 'Ninguém conta quantos pedidos vêm do Instagram; artes paradas esperando aprovação'])}</div>
      <div class="sw s3"><h4>Oportunidades</h4>${ul(['Nenhuma loja da região anuncia “manda a lista da obra”', 'Novembro a fevereiro é seca: obra acelerando e compra antes das férias coletivas'])}</div>
      <div class="sw s4"><h4>Ameaças</h4>${ul(['Home centers (Ferreira Costa, Leroy Merlin) dominam a busca de quem reforma', 'Depósitos que anunciam preço e “pague na entrega”'])}</div>
    </div>
  </div>
  <h3 class="h3" style="margin-top:22px">Riscos e como evitar</h3>
  <div class="risks">${[['Lista chega e ninguém responde', 'Um responsável e um prazo de resposta combinados antes de divulgar.'], ['Prometer o que o estoque não tem', 'Nunca “pronta-entrega”: dizer “prazo certinho” e confirmar antes.'], ['Sandra sem tempo para gravar', 'Uma manhã de gravação rende o período; o resto é celular de 30 s.']].map((r) => `<div class="rk"><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div>`, { cls: 'dense' })
}

function diag2(d) {
  const posts = [['Vídeo', 28, 'Sandra no carrinho', 'DeMGGjyx19c'], ['Vídeo', 21, 'Tubos e conexões', 'DBd7IzGoSme'], ['Foto', 18, 'Fachada e quem somos', 'DN1iXAXXPQz'], ['Arte', 12, 'Planeje sua obra', 'DTS9VXXjrFq'], ['Arte', 12, 'Chuvas de outubro', 'DPjNtVDDrcA']]
  const max = 28
  const chart = `<div class="chart">${posts.map((p) => `<a class="col ${p[1] === 28 ? 'best' : ''} ${p[1] === 12 ? 'worst' : ''}" href="${IG}${p[3]}/" target="_blank"><span class="val">${p[1]}</span><i style="height:${Math.round((p[1] / max) * 100)}%"></i><span class="lab"><b>${p[0]}</b>${p[2]}</span></a>`).join('')}</div>`
  const stat = (arr) => `<div class="stats">${arr.map((s) => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>`
  const rows = [
    ['Ferreira Costa', 'home center, Recife', 'Varejo para quem reforma; forte na busca e na loja física.', '—'],
    ['Leroy Merlin', 'home center, Recife', 'Mix enorme e site; fala com o consumidor final.', '—'],
    ['Tijolo de Fábrica PE', 'depósito, Recife', 'Preço no título: “R$ 715 o milheiro, de 9 a 10 milheiros”.', ref(AD + '1620800943127981', '6 anúncios ativos')],
    ['R&R Distribuidora e Top Material', 'depósitos', '“Converse conosco” e preço; nenhum fala de hidráulica ou de lista de obra.', ref(AD + '906526219122223', 'ativo desde 11/11')],
  ]
  d.page('pf', 'Diagnóstico 2 de 3 · Instagram e concorrentes', 'Vídeo com gente rende mais que arte; a região anuncia preço', `
  <div class="an2">
    <div>
      ${stat([['5.480', 'seguidores (@sndistribuidorape)'], ['337', 'posts no perfil'], ['12 a 28', 'curtidas por post: 0,2% a 0,5% da base'], ['8h às 18h', 'sem fechar no almoço: o recado mais curtido']])}
      ${chart}
      <p class="cap">Curtidas de 5 posts recentes (dados públicos, 12/11). Os dois vídeos com a Sandra lideram; as artes ficam embaixo.</p>
    </div>
    <div>
      <h3 class="h3">Concorrência na região</h3>
      <table class="comp"><thead><tr><th>Concorrente</th><th>O que posta / vende</th><th>Anúncio ativo</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r[0]}</b><span>${r[1]}</span></td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>
      <p class="cap" style="margin-top:18px">Biblioteca de Anúncios da Meta, 12/11: 16 anúncios ativos de material de construção com entrega em Recife; só 2 falam de hidráulica.</p>
    </div>
  </div>`, { cls: 'dense' })
}

function diag3(d) {
  const viral = [['130 mil', '“Nomes estranhos que os clientes pedem”', 'humor de balcão com a peça na mão', TT.ipg], ['112 mil', '“Peças de conexões hidráulicas”', 'glossário visual, 532 salvamentos', TT.adr], ['57,7 mil', '“Você sabe identificar os tubos da obra?”', 'série técnica explicada simples', TT.deci], ['23,3 mil', '“Mostrando as peças da loja”', 'passeio pela prateleira, sem fala', TT.hoff]]
  const br = [['Vídeo com a Sandra (28 e 21) rende mais que arte de produto (12).', 'Sandra em <b>todo vídeo</b>; arte só para o que se salva (tabela, glossário).'], ['Glossário e “nome certo da peça” passam de 100 mil views no nicho.', 'Série <b>“O nome certo”</b> e “conexões em 30 s” com o estoque da SN.'], ['Os anúncios da região vendem preço de tijolo e telha.', 'A SN vende <b>tempo de obra</b>: “manda a lista, a gente confere antes de faltar”.'], ['O perfil diz “exclusivo para construtoras e profissionais”.', 'Falar com quem compra: <b>engenheiro, mestre, encanador</b> e comprador.']]
  d.page('pf', 'Diagnóstico 3 de 3 · O que viraliza e o que fazemos', 'Vimos isso, então vamos fazer aquilo', `
  <div class="an2b">
    <div>
      <h3 class="h3">Viralizando no nicho</h3>
      <div class="viral">${viral.map((r) => `<div class="vr"><b>${r[0]}</b><div><a href="${r[3]}" target="_blank">${r[1]}</a><span>${r[2]}</span></div></div>`).join('')}</div>
      <p class="cap">Todos com <b>a peça na mão e alguém explicando</b>, em menos de 40 segundos.</p>
    </div>
    <div class="bridges">${br.map((r) => `<div class="br"><div class="saw"><em>vimos</em>${r[0]}</div><div class="arr">→</div><div class="do"><em>vamos fazer</em>${r[1]}</div></div>`).join('')}</div>
  </div>`, { cls: 'dense' })
}

function vendaPage(d) {
  d.page('pf', `${BR} · Como a venda acontece`, 'Do vídeo à lista no WhatsApp, e da lista à obra', `
  <div class="now"><b>Hoje:</b> o pedido chega por telefone, WhatsApp, cotação no site e balcão, e ninguém sabe quais vieram do Instagram. Não há anúncio no ar (tráfego não está no contrato).</div>
  <div class="g2t">
    <div>
      <h3 class="h3">O caminho da venda</h3>
      <div class="camps">${[
        ['1', 'O conteúdo pede a lista', 'Toda peça e todo vídeo fecham em “Manda a lista no WhatsApp (81) 98818-8000”.'],
        ['2', 'Resposta no mesmo dia', 'A SN confere disponibilidade, aponta o que costuma faltar e devolve o orçamento com prazo.'],
        ['3', 'Entrega e próxima etapa', 'Pedido entregue na obra; na entrega, a pergunta: “qual é a próxima etapa?”.'],
      ].map((c) => `<div class="camp"><div class="cp"><b>${c[0]}</b></div><div><h4>${c[1]}</h4><p>${c[2]}</p></div></div>`).join('')}</div>
    </div>
    <div>
      <h3 class="h3">Para quem falamos</h3>
      ${ul(['<b>Construtora e engenheiro:</b> compram por etapa e cronograma', '<b>Mestre, empreiteiro e encanador:</b> escolhem a marca e indicam a loja', '<b>Quem reforma:</b> entra pela mão do profissional (decisão 1)'])}
      <h3 class="h3" style="margin-top:16px">Metas e o que medir</h3>
      ${ul(['<b>20 listas</b> recebidas até 31/12, com a etiqueta “Instagram” no WhatsApp Business', 'Curtidas de 12–28 para <b>50+</b> por post; vídeo da série com 1.000 views', 'Para janeiro, se fizer sentido: anúncio de conversa no WhatsApp com o vídeo da série, só depois de medir as listas'])}
    </div>
  </div>`, { cls: 'dense' })
}

const decs = [
  ['Para quem a SN fala?', [['A', 'Só profissional', 'construtora, engenheiro, mestre e encanador, como diz o perfil', 1], ['B', 'Profissional + quem reforma', 'abre o varejo para o consumidor final'], ['?', 'Atende pedido pequeno de reforma?', 'muda o tom e as ofertas']]],
  ['Black Friday da SN', [['A', 'Semana da Lista, sem desconto', 'lista enviada de 27 a 30/11 sai na frente', 1], ['B', 'Desconto em itens de giro', '[itens e %] a definir; abre briga de preço']]],
  ['Pedido programado de janeiro', [['A', 'Fecha em dezembro, entrega na volta', 'preço garantido até [data] e entrega agendada', 1], ['B', 'Só agendamento', 'sem garantir o preço']]],
  ['Gravação', [['A', 'Terça 17/11, 8h às 12h', 'loja aberta; vídeos prontos para a Semana da Lista', 1], ['B', 'Usar o material de 23/09', 'se o bruto existir: editar e gravar só o que falta']]],
]
function decPage(d) {
  d.page('pf', `${BR} · Decisões`, 'Quatro escolhas para o plano ir ao ar', `
  <div class="decs">${decs.map((x, i) => `<div class="card dec"><h3><span class="num">${i + 1}</span>${x[0]}</h3>
    ${x[1].map((o) => `<div class="dopt ${o[3] ? 'rec' : ''}"><b>${o[0]}</b><div><strong>${o[1]}</strong><span>${o[2]}</span></div>${o[3] ? '<em>sugerida</em>' : ''}</div>`).join('')}
  </div>`).join('')}
  <div class="card syn1 span2"><h3>O que muda na rotina da SN</h3>${ul(['Um responsável responde as listas, com prazo combinado', 'Etiqueta “Instagram” em toda conversa que vier do perfil', 'A Sandra grava uma manhã no período; o resto é celular de 30 s', 'Aprovação das artes em até 2 dias'])}</div></div>`, { cls: 'dense' })
}

function nextPage(d) {
  const need = ['<b>Responsável e prazo</b> para responder as listas, área de entrega e pedido mínimo', '<b>Os 5 itens que mais faltam</b> nas obras e 5 apelidos de peça ouvidos no balcão', '<b>Preços e condições</b> que podemos mostrar (kits, caixa d’água, biodigestor) ou “sob consulta”', '<b>Datas de férias coletivas</b> dos clientes e horários de 20/11, 08/12, 24, 25 e 31/12', '<b>O bruto da gravação de 23/09</b>, se existir, e a aprovação das artes que estão paradas']
  const steps = [['12/11', 'Decisões desta estratégia'], ['até 14/11', 'Responsável das listas e etiqueta “Instagram” no WhatsApp'], ['17/11', 'Diária de gravação com a Sandra (Ellcazo)'], ['18/11', 'Arte “Manda a lista da obra” no ar'], ['20/11', 'Feriado: story de horário'], ['27 a 30/11', 'Semana da Lista (Black Friday sem desconto)'], ['01 a 18/12', 'Fechar a etapa antes das férias coletivas'], ['14 a 23/12', 'Pedido programado de janeiro'], ['Toda segunda', 'Listas recebidas e pedidos da semana'], ['05/01', 'Balanço do período e plano de janeiro']]
  d.page('pf', `${BR} · O que precisamos e próximos passos`, 'Com isto em mãos até 14/11, o plano roda sozinho', `
  <div class="g2n">
    <div class="card need"><h3>O que precisamos de vocês</h3>${ul(need)}</div>
    <div class="steps">${steps.map((s) => `<div class="st"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
  </div>`, { cls: 'dense' })
}

// ---------------- Social media ----------------
const S = {
  socialTitle: 'Toda peça ensina uma coisa e pede a lista',
  pillars: [['Vender', 35, 'lista da obra, Semana da Lista, pedido de janeiro'], ['Ensinar', 30, 'nome certo da peça, conexões, caixa d’água, biodigestor'], ['Provar', 20, 'estoque, entrega na obra, marcas, cliente profissional'], ['Gente da SN', 15, 'Sandra, equipe, humor de balcão']],
  week: [['Ter', 'Reel da Sandra (série de balcão)'], ['Qui', 'Arte ou carrossel técnico, para salvar'], ['Sex', 'Story “saiu pra obra hoje” e horário'], ['Seg a sex', 'Stories com a pergunta da semana']],
  design: ['Amarelo SN (#FEB039) de fundo, títulos em Azul Profundo (#12324A), a gota azul como marcador', 'Produto real recortado; nada de imagem de banco', 'Título de até 6 palavras em Sora; apoio em Manrope', 'Selo fixo “Manda a lista no WhatsApp (81) 98818-8000”', 'Nunca texto branco fino sobre amarelo; nunca “pronta-entrega”'],
  cal: [
    ['12 a 19/11', 'Agora', 'Decisões, responsável das listas e “Manda a lista da obra” (18/11).'],
    ['17/11 (ter)', 'Diária de gravação', 'A Sandra grava a série de balcão e os vídeos do período.'],
    ['20/11 (sex)', 'Consciência Negra: feriado', 'Story de horário. Sem post de data.'],
    ['23 a 26/11', 'Semana técnica', 'Carrossel “O nome certo da peça”.'],
    ['27 a 30/11', 'Black Friday + 1ª parcela do 13º', '<b>Semana da Lista:</b> sem desconto, a lista sai na frente.'],
    ['01 a 05/12', 'Seca no Recife: obra acelerando', '“A peça de R$ 8 que parou a obra”.'],
    ['07 a 11/12', 'Verão: laje, caixa d’água e fossa', 'Carrosséis da caixa d’água e do biodigestor.'],
    ['08/12 (ter)', 'N. Sra. da Conceição: feriado no Recife', 'Story de horário.'],
    ['14 a 18/12', '2ª parcela do 13º (até 20/12)', '“Fecha a etapa antes das férias coletivas”.'],
    ['14 a 23/12', 'Antes das férias coletivas', '<b>Pedido programado de janeiro.</b>'],
    ['24, 25 e 31/12', 'Natal e Réveillon', 'Obrigado 2026 e horários de fim de ano.'],
  ],
  piecesTitle: '8 peças que puxam a lista',
  pieces: [
    ['Manda a lista da obra', 'carrossel', 'vender', 'Manda a lista da próxima etapa no WhatsApp. A gente confere o que tem, o que falta e devolve hoje com o prazo.', '18/11'],
    ['O nome certo da peça', 'carrossel', 'ensinar', 'Cotovelo é joelho. Torneirinha da parede é registro. Salva pra não errar no balcão.', 'Semana de 23/11'],
    ['Semana da Lista', 'post + stories', 'vender', 'Black Friday na obra não é desconto. É não parar. Lista enviada até 30/11 sai na frente.', '27 a 30/11'],
    ['A peça de R$ 8 que parou a obra', 'Reel + arte', 'prova', 'Não é o preço da peça. É o dia parado da equipe inteira.', 'Semana de 01/12'],
    ['Qual caixa d’água para quantas pessoas?', 'carrossel', 'ensinar', 'Moram [X] pessoas? A caixa certa é de [Y] litros. Manda no zap que a Sandra indica.', 'Semana de 07/12'],
    ['Obra sem rede de esgoto? Biodigestor.', 'carrossel', 'ensinar + venda', 'Loteamento, sítio ou Noronha: o biodigestor trata o esgoto da casa. Três erros de instalação que a gente vê.', 'Semana de 07/12'],
    ['Fecha a etapa antes das férias', 'post + stories', 'vender', 'As férias coletivas estão chegando. O material da volta já está separado?', '14 a 18/12'],
    ['Pedido programado de janeiro', 'post + stories', 'vender + relação', 'Fecha agora, recebe na volta. Obrigado a cada obra que confiou na SN em 2026.', '21 a 23/12'],
  ],
  art: [
    'Capa amarela com uma lista de obra amassada (foto real) e o título em Azul Profundo; slides: manda, a gente confere, prazo; selo do WhatsApp.',
    'Duas colunas: à esquerda o apelido entre aspas, à direita a peça real recortada com o nome certo; a gota azul marca cada item.',
    'Fundo Azul Profundo, “Semana da Lista” grande em amarelo, datas 27–30/11; caminhão da SN carregado ao fundo.',
    'Conexão pequena na palma da mão em close; “R$ 8” ao lado de “1 dia parado”; fundo areia.',
    'Tabela simples pessoas → litros com ícones de gente; caixas Fortlev reais recortadas em tamanhos diferentes.',
    'Corte do biodigestor em ilustração limpa; erros com X vermelho, o certo marcado com a gota azul.',
    'Calendário de dezembro com as férias marcadas em amarelo e o pedido “agendado” em azul.',
    'Foto real da equipe na frente da loja; “Até 2027” em Sora; horários de fim de ano no último slide.',
  ],
}

function socialPages(d) {
  d.page('pf', `${BR} · Pilares, ritmo e design`, S.socialTitle, `
  <div class="g2s">
    <div>
      <h3 class="h3">Pilares do conteúdo</h3>
      <div class="bars">${S.pillars.map((p) => `<div class="bar"><div class="bl"><b>${p[0]}</b><span>${p[2]}</span></div><div class="bt"><i style="width:${p[1]}%"></i><em>${p[1]}%</em></div></div>`).join('')}</div>
      <p class="cap" style="margin-top:14px">Contrato: 4 artes por mês (8 no período) e 1 produção audiovisual por mês. Os vídeos da diária alimentam os Reels de terça.</p>
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
    <thead><tr><th>Quando</th><th>O que acontece</th><th>O que a SN publica e vende</th></tr></thead>
    <tbody>${S.cal.map((r) => `<tr class="${/Black Friday|2ª parcela/.test(r[1]) ? 'hot' : ''}"><td class="d">${r[0]}</td><td class="e">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
  </table>`, { cls: 'calpg' })

  require('./sm.js').pages(d, BR)
}

// ---------------- Audiovisual ----------------
const AVX = {
  avTitle: 'Explica e mostra: a peça na mão e a Sandra no corredor',
  avLead: '10 vídeos com 3 ideias cada. A diária grava tudo; entram no contrato 2 edições (1 por mês) e o resto fica pronto para janeiro e para anúncio, se a SN decidir anunciar.',
}
const bv = {
  voice: ['Fala média: explica e mostra, direto e confiável.', 'Técnico para o engenheiro, simples para o pedreiro. Fala de prazo, especificação e economia, com a Sandra como rosto.'],
  saw: ['No perfil (5.480 seguidores), os vídeos com a Sandra (28 e 21 curtidas) rendem mais que as artes (12)', 'No nicho, “nome certo da peça” e conexões explicadas passam de 100 mil views (130 mil e 112 mil)', 'Em loja de hidráulica, o vendedor falando para a câmera é o vídeo que mais roda (Loja Merc)'],
  ask: ['Rosto da SN (Sandra ou equipe) em <b>todo vídeo</b>', 'Peça <b>na mão</b>, nome certo na tela', 'Gancho de pergunta no 1º segundo', 'Fecha com <b>“Manda a lista no WhatsApp”</b>', 'Nunca “pronta-entrega”: dizer “prazo certinho”'],
}
const COM = {
  title: 'Como a SN fala nos vídeos',
  tone: [
    ['Técnico simples', 'Explica a peça em uma frase que o pedreiro entende.', 'Joelho 90 vira a esquina; o 45 faz a curva.'],
    ['Confiável', 'Promete só o que cumpre. Prazo é palavra dada.', 'Prazo certinho. Combinou, chegou.'],
    ['Do balcão', 'Fala como quem atende obra todo dia.', 'Me manda a lista que eu confiro.'],
    ['Parceira da obra', 'O foco é a obra não parar, não a peça.', 'Antes de faltar, não depois.'],
  ],
  avoid: ['“Pronta-entrega”', 'Imagem de banco', 'Promoção gritada', 'Jargão sem explicar', 'Preço sem confirmar', 'Texto longo na tela'],
  rule: 'Se o pedreiro não entende em 10 segundos, não é SN.',
  lang: [['Câmera na mão', 'Seguindo a Sandra pelo corredor, vertical 9:16.'], ['Close na peça', 'A peça na mão e o nome certo na tela.'], ['Lapela', 'A loja tem eco: microfone na Sandra sempre.'], ['Luz do galpão', 'Porta aberta e luz do dia; o estoque cheio ao fundo.'], ['Ritmo', '20 a 40 s; explica rápido e mostra o caminho do pedido.']],
}
function comPage(d) {
  d.page('av', `${BR} · Comunicação nos vídeos`, COM.title, `
  <div class="tone">${COM.tone.map((t) => `<div class="tc"><h3>${t[0]}</h3><p>${t[1]}</p><q>${t[2]}</q></div>`).join('')}</div>
  <div class="avoid"><b>Evitamos:</b>${COM.avoid.map((a) => `<span>${a}</span>`).join('')}</div>
  <div class="lang"><div class="lrule"><small>Linguagem de vídeo</small>${COM.rule}</div>
    <div class="lrows">${COM.lang.map((l) => `<div class="lr"><b>${l[0]}</b><span>${l[1]}</span></div>`).join('')}</div></div>`, { cls: 'avl compg' })
}

// [código, selo, título, direção, ideias, url, rótulo, [a referência, na SN], roteiros, [quem fala, quem grava]]
const V = [
  ['S1', 'Diária 17/11 · Prova · Série', 'Sandra, vocês têm…?', 'Uma pergunta de fora do quadro; a Sandra responde andando pelo estoque. O bordão “Próximo!” fecha cada episódio.',
    [['O passeio', 'Pergunta de caixa d’água; a Sandra mostra, anda e responde “tem” a cada corredor.'], ['A pecinha sem nome', 'O cliente gesticula a peça; a Sandra some e volta em 3 s com ela na mão.'], ['Entrega na obra', 'Pergunta “vocês entregam?”; corte para o caminhão saindo carregado.']],
    TT.hoff, 'Peças hidráulicas da loja · 23,3 mil views', ['A loja mostra a prateleira de peças, cheia e organizada, num passeio sem fala', 'a Sandra faz o mesmo passeio respondendo uma pergunta real de cliente'],
    ['VOZ: “Sandra, vocês têm caixa d’água?” | “Tem! E biodigestor, registro, tubo…” (andando) | “Manda a lista no WhatsApp. Próximo!”', 'VOZ: “Tem aquela pecinha… assim?” | A Sandra volta com a peça: “É essa, né?” | Texto: “Manda a lista. A gente acha.”', 'VOZ: “Vocês entregam na obra?” | “Entrega, no prazo que a gente combinar.” | Caminhão saindo. Texto: “Prazo certinho.”'],
    ['Sandra; a pergunta vem de fora do quadro', 'Ellcazo, na diária']],
  ['S2', 'Diária 17/11 · Humor · Reel', 'O nome certo da peça', 'O apelido que o cliente fala no balcão × o nome certo, com a peça na mão. Engraçado e útil: dá para salvar.',
    [['O dicionário do balcão', 'Três apelidos reais, um por corte: apelido na tela, peça na mão, nome certo.'], ['Ache em 10 segundos', 'A equipe fala o apelido e a Sandra acha a peça antes do cronômetro acabar.'], ['O áudio do pedreiro', 'Toca um áudio encenado, “aquela coisa redonda”; a Sandra traduz e mostra.']],
    TT.ipg, 'Nomes estranhos que os clientes pedem · 130 mil views', ['A loja junta os nomes estranhos que os clientes pedem, com humor e a peça na mão', 'os apelidos reais que a Sandra ouve no balcão da SN'],
    ['“Cotovelo?” É joelho. | “Torneirinha da parede?” É registro. | “Salva pra não errar. E manda a lista que a gente traduz.”', 'Texto: “Ache em 10 segundos.” | Apelido → a Sandra corre e volta com a peça. | “Próxima? Manda nos comentários.”', 'Áudio: “Quero aquela coisa redonda…” | Sandra: “É uma luva.” (peça na mão) | “Manda áudio, foto ou lista: a gente entende.”'],
    ['Sandra e alguém da equipe', 'Ellcazo, na diária']],
  ['S3', 'Diária 17/11 · Ensinar · Reel', 'Conexões em 30 segundos', 'Joelho, luva, tê, união e cap: cada peça na mão, com o nome na tela e para que serve em uma frase.',
    [['Uma por segundo', 'Peça na bancada, nome grande na tela, uma frase de uso; ritmo rápido.'], ['45 ou 90?', 'Compara joelho de 45 e de 90 na mão: quando usar cada um.'], ['O kit da caixa d’água', 'Monta na bancada as conexões de uma caixa d’água, peça por peça.']],
    TT.adr, 'Peças de conexões hidráulicas · 112 mil views', ['O engenheiro mostra a arte com os tipos de conexão e explica cada uma', 'a mesma aula com as peças Tigre reais do estoque da SN'],
    ['“Cinco peças que toda obra usa.” | Joelho, luva, tê, união, cap (uma frase cada). | “Faltou alguma? Manda a lista.”', '“Joelho 45 ou 90?” | “O 90 vira a esquina; o 45 faz a curva suave.” | “Na dúvida, pergunta pra SN.”', '“O que vai numa caixa d’água?” | Peça por peça na bancada. | “Kit montado pela Sandra: chama no zap.”'],
    ['Sandra ou o vendedor técnico', 'Ellcazo, no balcão']],
  ['S4', 'Diária 17/11 · Ensinar · Reel', 'Qual tubo vai em cada parte da obra', 'Água fria, esgoto, soldável e rosca: o tubo certo em cada lugar, mostrado no corredor.',
    [['Mapa da casa', 'Desenho simples de uma casa; cada tubo aparece no lugar certo.'], ['Marrom ou branco?', 'Na mão, o tubo de água (marrom) e o de esgoto (branco): por que não trocar.'], ['O erro mais comum', 'Mostra o tubo errado no lugar certo e o que acontece depois.']],
    TT.deci, 'Tipos de tubos e conexões da obra · 57,7 mil views', ['O perfil de engenharia ensina a identificar tubos e conexões em série', 'o vendedor técnico da SN ensina no corredor, com o estoque atrás'],
    ['“Cada tubo no seu lugar.” | Água fria, esgoto, ventilação (um corte cada). | “Manda a planta que a gente monta a lista.”', '“Marrom ou branco?” | “Marrom é água; branco é esgoto. Não troca.” | “Dúvida? Pergunta no zap.”', '“Esse erro custa caro.” | Tubo errado → vazamento depois. | “Confere a lista com a SN antes.”'],
    ['Vendedor técnico', 'Ellcazo, no corredor']],
  ['S5', 'Diária 17/11 · Ensinar · Série curta', 'Pra que serve essa peça?', 'Uma peça por vídeo: uma pergunta e a resposta em 15 s. Vira série fixa e responde comentário.',
    [['Válvula de pé', 'Mostra a válvula de pé com crivo e diz em uma frase para que serve.'], ['A boia da caixa', 'A boia na mão: o que acontece quando ela falha.'], ['Responde o comentário', 'Pega uma pergunta real dos comentários e responde com a peça.']],
    TT.pipek, 'Pra que serve a válvula de pé com crivo? · 1,2 mil views', ['O engenheiro pergunta para que serve uma peça e responde em segundos', 'a Sandra responde uma peça por semana, com a dúvida que chega ao balcão'],
    ['“Pra que serve essa peça?” | “Segura a água no cano da bomba. Sem ela, a bomba puxa ar.” | “Tem na SN.”', '“Sua caixa transborda?” | “É a boia.” (mostra) | “Troca hoje: manda no zap.”', 'Print do comentário na tela. | A Sandra responde com a peça na mão. | “Pergunta a próxima!”'],
    ['Sandra, uma pergunta por vídeo', 'Ellcazo; depois, no celular']],
  ['S6', 'Diária 17/11 · Prova · Reel', 'Testei na mão', 'Um produto demonstrado de verdade no balcão: veda rosca, cola, registro Tigre. Mostra a diferença.',
    [['Veda rosca do jeito certo', 'Mostra quantas voltas e o sentido certo da fita na rosca.'], ['Cola que segura', 'Cola dois tubos, espera e puxa na frente da câmera.'], ['Registro bom × fraco', 'Abre e fecha dois registros: o som e o peso dizem qual dura.']],
    TT.cris, 'Veda rosca de silicone na mão · 17,2 mil views', ['O vendedor testa o veda rosca na mão e explica o uso', 'a SN testa no balcão os produtos Tigre que o engenheiro especifica'],
    ['“Você passa veda rosca do lado certo?” | Mostra o sentido e as voltas. | “Tem na SN. Manda a lista.”', '“Cola e puxa.” (não solta) | “Esse é o padrão Tigre.” | “Prazo certinho na sua obra.”', '“Escuta a diferença.” | Registro bom × registro fraco. | “Peça boa evita obra refeita.”'],
    ['Quem vende, com a peça na mão', 'Ellcazo, no balcão']],
  ['S7', 'Diária 17/11 · Gente · Reel fixado', 'Oi, eu sou a Sandra', 'Apresentação para a câmera: quem é a SN, para quem vende e o convite para perguntar. Fica fixado no perfil.',
    [['A apresentação', 'Quem é a Sandra, desde quando a SN existe e para quem vende.'], ['A dica do balcão', 'Uma dica rápida de quem atende obra todo dia.'], ['Pergunta que eu respondo', 'Convida a mandar perguntas; cada uma vira vídeo.']],
    IG + 'DbdXtLGgOhL/', 'Loja Merc: o vendedor dá a dica · 1.131 views', ['O vendedor da loja abre com “Fala, pessoal!” e dá uma dica de produto', 'a Sandra apresenta a SN e convida o profissional a perguntar'],
    ['“Oi, eu sou a Sandra, da SN.” | “Desde 2012 abastecendo obra em Pernambuco.” | “Manda a lista que eu confiro.”', '“Uma dica de quem atende obra todo dia:” | (uma frase técnica) | “Mais dúvidas? Comenta aqui.”', '“Pergunta o que quiser aqui embaixo.” | “Eu respondo em vídeo.” | “E a lista? No WhatsApp.”'],
    ['Sandra', 'Ellcazo, na diária']],
  ['S8', 'Diária 17/11 · Prova · Reel', 'Quem compra conta', 'Um profissional que compra na SN diz, com as palavras dele, por que volta.',
    [['O encanador', 'Um encanador no balcão: por que compra aqui, em uma frase.'], ['O engenheiro', 'Um engenheiro fala de prazo e da marca especificada.'], ['Na obra', 'A entrega numa obra real e o mestre dizendo “chegou certinho”.']],
    IG + 'DbbLQmTh40L/', 'Loja Merc: cliente encanador recomenda · 1.044 views', ['O cliente encanador recomenda os produtos no balcão da loja', 'um profissional real da SN, no balcão ou na obra, dizendo por que volta'],
    ['“Por que você compra na SN?” | (resposta do cliente, com as palavras dele) | Texto: “Manda a lista. Prazo certinho.”', '“O que mais importa na obra?” | “Prazo e a marca certa.” | Texto: “Tigre, Fortlev, Amanco: tem na SN.”', 'Caminhão chega; descarga. | Mestre: “Chegou certinho.” | Texto: “Manda a lista da próxima etapa.”'],
    ['Cliente profissional (encanador ou engenheiro)', 'Ellcazo, no balcão ou na obra']],
  ['S9', 'Diária 17/11 · Venda · Reel', 'A peça de R$ 8 que parou a obra', 'O argumento da SN em 30 s: o problema não é o preço da peça, é o dia parado.',
    [['A conta', 'Peça pequena na mão: “R$ 8” × “1 dia de equipe parada”.'], ['A história', 'Uma obra real que parou por falta de uma peça, sem citar nome.'], ['A lista conferida', 'Mostra a SN conferindo uma lista e marcando o que ia faltar.']],
    TT.terra, '“A peça certa: não arrisque” · 6,8 mil views', ['A loja de peças avisa que a peça errada custa caro', 'a Sandra com uma conexão de R$ 8 na mão, contando o custo do dia parado'],
    ['“Essa peça custa [R$ 8].” | “Um dia de obra parada custa muito mais.” | “Manda a lista que a gente confere antes.”', '“Já vi obra parar por isso aqui.” | (a história em duas frases) | “Antes de faltar, não depois.”', 'Lista na mesa; a caneta marca o que falta. | “Essa ia faltar.” | “Manda a sua no WhatsApp.”'],
    ['Sandra', 'Ellcazo, na diária']],
  ['S10', 'Diária 17/11 · Venda · Reel de dezembro', 'Montando o pedido da obra', 'Do papel ao caminhão: a lista chega, o carrinho anda pelo estoque, o pedido sai. Fecha no pedido programado de janeiro.',
    [['Do papel ao caminhão', 'Timelapse: lista na mão, carrinho enchendo, caminhão saindo.'], ['O som do estoque', 'Sem fala: tubo batendo, caixa empilhando, fita, porta do caminhão.'], ['O pedido de janeiro', 'A Sandra separa e etiqueta “entrega [05/01]”.']],
    IG + 'DeMGGjyx19c/', 'o post mais curtido da própria SN · 28 curtidas', ['A própria SN: a Sandra com o carrinho no corredor, avisando o horário', 'o mesmo carrinho montando um pedido real, do começo ao caminhão'],
    ['Lista amassada na mão: “Separa aí.” | Timelapse do carrinho enchendo. | “Pedido saindo. Manda a sua lista.”', 'Sem fala: só o som do estoque. | No fim, a Sandra: “Tem aqui. E o prazo é certinho.” | Texto: “WhatsApp (81) 98818-8000.”', '“Férias coletivas chegando?” | Etiqueta: “entrega [05/01]”. | “Fecha agora, recebe na volta.”'],
    ['Ninguém até o fim; a Sandra fecha', 'Ellcazo, no estoque e no caminhão']],
]

function videoPages(d) {
  V.forEach((v, k) => {
    const [code, selo, title, dir, ideas, url, rlabel, rf, rot, who] = v
    const net = url.includes('tiktok') ? 'TikTok' : 'Instagram'
    const handle = url.includes('tiktok') ? '@' + url.split('/@')[1].split('/')[0] + ' · ' : ''
    const cls = k % 2 === 0 ? 'avw' : 'avl'
    d.page('av', '', '', `
    <div class="vp">
      <a class="phone" href="${url}" target="_blank"><img src="${img(code)}" alt=""><span class="play">▶ Assistir no ${net}</span></a>
      <div class="vmain">
        <div class="bname">${BR} · gravação ${k + 1}/${V.length}</div>
        <div class="vtop"><span class="code">${code}</span><span class="selo">${selo}</span></div>
        <h2>${title}</h2>
        <p class="vdir">${dir}</p>
        <div class="who"><span><b>Quem fala</b>${who[0]}</span><span><b>Quem grava</b>${who[1]}</span></div>
        <p class="adapt"><b>A referência</b> ${rf[0]} <span>→</span> <b>Na SN</b> ${rf[1]}. <a class="src" href="${url}" target="_blank">${handle}${rlabel}</a></p>
        <div class="ideas">${ideas.map((x, i) => `<div class="idea"><b>Ideia ${'ABC'[i]}</b><h4>${x[0]}</h4><p>${x[1]}</p><div class="rot"><span>Roteiro de apoio</span>${rot[i].split(' | ').map((l) => `<i>${l}</i>`).join('')}</div></div>`).join('')}</div>
      </div>
    </div>`, { cls: cls + ' vpg' })
  })
}

const FOTOS = [
  ['Estoque e produto', [['P_hoff', 'Prateleira cheia, peças por cor, de frente', '@hoffmannmtc', TT.hoff], ['P_deci', 'Peças soltas sobre fundo claro, de cima', '@decifrandoaengenharia', TT.deci], ['P_sand', 'A Sandra no corredor de tubos, estoque ao fundo', '@sndistribuidorape', IG + 'DBd7IzGoSme/']]],
  ['Loja e entrega', [['P_fach', 'Fachada do alto, com a avenida', '@sndistribuidorape', IG + 'DN1iXAXXPQz/'], ['P_caixa', 'Caixas d’água com gente ao lado, para escala', '@sndistribuidorape', IG + 'DPjNtVDDrcA/'], ['P_carr', 'Carrinho no corredor: o pedido sendo montado', '@sndistribuidorape', IG + 'DeMGGjyx19c/']]],
  ['Pessoas', [['P_capac', 'De colete e capacete, olhando para a câmera', '@sndistribuidorape', IG + 'DTS9VXXjrFq/'], ['P_bart', 'Vendedor no corredor, uniforme e sorriso', '@bartofildistribuidora', TT.bart], ['P_cris', 'Peça na mão, em close, rosto ao fundo', '@eucristianorecomenda', TT.cris]]],
]
function photoPage(d) {
  d.page('av', `${BR} · Gravação · Referências de foto`, 'O que fotografar no dia da gravação', `
  <div class="fotos">${FOTOS.map(([g, L]) => `<div class="fg"><h3>${g}</h3><div class="fr3">${L.map((f) => `<a class="ft" href="${f[3]}" target="_blank"><img src="${img(f[0])}" alt=""><span>${f[1]}</span><small>${f[2]}</small></a>`).join('')}</div></div>`).join('')}</div>`, { cls: 'avw fotopg' })
}

function dayPage(d) {
  const day = { title: 'Diária SN · terça 17/11', sub: '8h às 12h, loja aberta, com movimento real (sugestão; ver decisão 4).', slots: [['8h', 'Estoque, fachada e caminhão carregando: S1 e S10'], ['9h', 'Sandra: apresentação e série “vocês têm…?” (S7 e S1)'], ['10h', 'Balcão: nome certo, conexões, pra que serve e testei na mão (S2, S3, S5, S6)'], ['11h', 'Corredor e cliente: tubos (S4), peça de R$ 8 (S9) e depoimento (S8)']], out: ['Os 10 vídeos gravados; entram no contrato 2 edições: S1 (novembro) e S10 (dezembro)', 'Fotos reais para as 8 artes do período', 'S5 vira série no celular: uma peça por semana, 15 s'] }
  d.page('av', `${BR} · Gravação · A diária`, day.title, `
    <div class="dayp">
      <div class="card slotsc"><p class="dsub">${day.sub}</p>
        ${day.slots.map((s) => `<div class="slot"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
      <div class="card outc"><h3>O que sai da diária</h3><ul>${day.out.map((o) => `<li>${o}</li>`).join('')}</ul>
        <p class="dnote">10 vídeos, 30 ideias. 2 edições no contrato; o resto fica gravado para janeiro. Leve lapela (a loja tem eco), boné, capacete, prancheta e uma lista de papel.</p></div>
    </div>`, { cls: 'avl dense' })
}

// ---------------- montar ----------------
const e = Doc(BR, 'Estratégia')
cover(e, BR, 'Estratégia do mês · com o diagnóstico', 'Estratégia de 12/11 a 31/12', 'O que vimos em números, a tese, as ofertas, como a venda acontece, as decisões e os próximos passos.')
tesePage(e, BR, b)
diag1(e); diag2(e); diag3(e)
offerPage(e, BR, x)
vendaPage(e)
decPage(e)
nextPage(e)
fs.writeFileSync(path.join(OUT, 'estrategia-nov-dez.html'), html(`Estratégia ${BR}`, e.pages))

const s = Doc(BR, 'Social media')
cover(s, BR, 'Planejamento de social media', 'Artes e posts de 12/11 a 31/12', 'Pilares, ritmo, calendário e as 10 postagens com referência real, copy da arte e legenda pronta.')
socialPages(s)
fs.writeFileSync(path.join(OUT, 'social-media-nov-dez.html'), html(`Social media ${BR}`, s.pages))

const a = Doc(BR, 'Audiovisual')
avCover(a, BR, b)
studyPage(a, BR, bv, AVX)
comPage(a)
videoPages(a)
photoPage(a)
dayPage(a)
fs.writeFileSync(path.join(OUT, 'audiovisual-nov-dez.html'), html(`Audiovisual ${BR}`, a.pages))
console.log(BR, e.pages.length, s.pages.length, a.pages.length)
