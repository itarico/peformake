// Gera estrategia-nov-dez.html (apresentação 16:9) — Fornario · VOVINA · Brio Burguer
const fs = require('fs')
const path = require('path')
const OUT = path.resolve(__dirname, '..')
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'logo.b64'), 'utf8').trim()
const ellD = ['M2 2H466V157H190V236H466V391H190V462H470V617H2Z', 'M543 2H731V617H543Z', 'M822 1H1010V616H822Z', 'M6 693H469V848H193V1154H469V1308H6Z',
  'M542 693H1005V1308H818V848H730V1308H542Z', 'M4 1385H468V1504L440 1540L230 1845H468V2000H0V1846L215 1539H4Z', 'M544 1385H1011V2000H544ZM733 1539V1845H822V1539Z']
const ell = (color = '#B5E61D', h = 34) => `<svg viewBox="0 0 1011 2000" height="${h}" role="img" aria-label="Ellcazo" fill="${color}" fill-rule="evenodd">${ellD.map((x) => `<path d="${x}"/>`).join('')}</svg>`

const esc = (s) => String(s)
const pages = []
let n = 0
function page(kind, tag, title, body, opts = {}) {
  n++
  const av = kind === 'av'
  const foot = av
    ? `<div class="foot"><span class="fl">${ell('#0A0A0A', 26)}<b>Ellcazo</b> · gravação</span><span>${opts.brand ? opts.brand + ' · ' : ''}Plano 12/11 a 31/12</span><span class="pn">${n}</span></div>`
    : `<div class="foot"><span class="fl"><img src="${logo}" alt="Peformake"><b>Peformake</b> assessoria</span><span>${opts.brand ? opts.brand + ' · ' : ''}Plano 12/11 a 31/12</span><span class="pn">${n}</span></div>`
  pages.push(`<section class="pg ${av ? 'av' : ''} ${opts.cls || ''}" id="p${n}">
  ${av ? `<div class="elogo">${ell('#0A0A0A', 56)}</div>` : ''}
  ${tag ? `<div class="tag">${tag}</div>` : ''}
  ${title ? `<h1>${title}</h1>` : ''}
  <div class="body">${body}</div>
  ${opts.nofoot ? '' : foot}
</section>`)
}
const card = (h, b, cls = '') => `<div class="card ${cls}">${h ? `<h3>${h}</h3>` : ''}${b}</div>`
const ul = (arr) => `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`
const ref = (url, label) => `<a href="${url}" target="_blank">${label}</a>`

// ---------- 1. CAPA ----------
n++
pages.push(`<section class="pg cover" id="p${n}">
  <div class="cv-top"><img src="${logo}" alt="Peformake"><span>Peformake · assessoria de marketing</span></div>
  <div class="cv-main">
    <div class="cv-kicker">Planejamento do grupo · para decidir junto</div>
    <div class="cv-brands">Fornario <i>·</i> VOVINA <i>·</i> Brio Burguer</div>
    <div class="cv-title">Plano de 12/11 a 31/12</div>
    <div class="cv-sub">Ofertas e vendas, social media, design, gravação e tráfego, num só plano para as três marcas.</div>
  </div>
  <div class="cv-foot"><span>Apresentado ao Paulo · 12/11/2026</span><span>Gravação: <b>Ellcazo</b></span></div>
</section>`)

// ---------- 2. O GRUPO EM UMA PÁGINA ----------
page('pf', 'O grupo em uma página', 'Três marcas, três papéis: ninguém disputa o mesmo pedido', `
<div class="g3">
  ${card('Fornario <span class="pill">a mesa da ocasião</span>', `
    <p class="lead">Salão premium na Praça do Canhão. Vende <b>mesa reservada</b>: confraternização, casal e Natal em família.</p>
    <div class="kv"><span>Público</span>25 a 55 anos, grupos e famílias</div>
    <div class="kv"><span>Canal</span>Reserva pelo WhatsApp</div>
    <div class="goal"><span class="gl">Objetivo no período</span>Conversas de reserva medidas (hoje: 0) e <b>10 reservas de grupo até 19/12</b> (aposta inicial). Reels de ~2.360 para 3.000 views de média.</div>`)}
  ${card('VOVINA <span class="pill">a pizza da família em casa</span>', `
    <p class="lead">Pizza de delivery e retirada no Centro. Vende o <b>pedido de casa</b>: meio a meio, combo da família, feriado e férias.</p>
    <div class="kv"><span>Público</span>Famílias e pais, pedido de quinta a sábado</div>
    <div class="kv"><span>Canal</span>Cardápio digital e WhatsApp</div>
    <div class="goal"><span class="gl">Objetivo no período</span>Do clique ao <b>pedido medido</b>: hoje o anúncio leva 893 cliques ao cardápio a R$ 0,13, mas ninguém conta os pedidos. Feed de ~390 para <b>600 views</b>.</div>`)}
  ${card('Brio Burguer <span class="pill">o lanche da galera</span>', `
    <p class="lead">Hambúrguer artesanal só delivery. <b>Entra agora</b>: lançamento com combo para dividir, pedido pelo site.</p>
    <div class="kv"><span>Público</span>18 a 35 anos, São Lourenço e arredores</div>
    <div class="kv"><span>Canal</span>Site próprio de pedidos</div>
    <div class="goal"><span class="gl">Objetivo no período</span>Entrar com o perfil vivo de novo (parado desde 29/10), ritmo de 3 posts por semana e Reels de 438 para <b>1.500 views</b>. Tráfego só depois da entrada.</div>`)}
</div>
<div class="moves">
  <div class="mv"><b>1</b><div><h4>O fim de ano começa agora</h4><p>Reserva de confraternização abre em novembro, não em 01/12. O anúncio do Fornario passa a comprar conversa no WhatsApp esta semana.</p></div></div>
  <div class="mv"><b>2</b><div><h4>Peso nos dois 13º</h4><p>27 a 30/11 (Black Friday e 1ª parcela) e 18 a 20/12 (2ª parcela) recebem a maior verba e as ofertas mais fortes.</p></div></div>
  <div class="mv"><b>3</b><div><h4>Uma semana de gravação</h4><p>Três diárias seguidas da Ellcazo, uma por marca, geram os vídeos de todo o período de uma vez.</p></div></div>
</div>`, { cls: 'dense' })

// ---------- ANÁLISE ----------
require('./analise.js')({ page, card, ul, ref })

// ---------- 3. CALENDÁRIO ----------
const cal = [
  ['12 a 19/11', 'Agora', 'Fechar a oferta de confraternização. Anúncio vira conversa no WhatsApp.', 'Marcar o link do cardápio para contar pedidos. Definir o Combo Família.', 'Decidir a data de entrada. Site, preços e combos.'],
  ['20/11 (sex)', 'Consciência Negra: feriado', 'Mesa do feriadão em família.', '"Feriado em casa pede pizza da Vó."', '—'],
  ['24 a 26/11', 'Semana de gravação', 'Diária 1', 'Diária 2', 'Diária 3'],
  ['27 a 30/11', 'Black Friday + 1ª parcela do 13º', 'Sem desconto. Vantagem para quem fecha a confraternização até 30/11 (a decidir).', 'Lança o Combo Família da Vó: o combo do mês, sem preço riscado.', 'Entrada, se for a opção A.'],
  ['01 a 19/12', 'Temporada de confraternizações', '<b>Carro-chefe:</b> Confraternização Fornario, até 19/12.', 'Prova de qualidade e meio a meio da família.', 'Combo da Galera: "confraternização em casa".'],
  ['Dezembro', 'Natal Mágico na cidade (datas 2026 a confirmar)', 'Mesa antes ou depois do passeio.', '"Voltou do Natal Mágico? O jantar é da Vó."', 'Galera saindo do evento.'],
  ['08/12 (ter)', 'Feriado municipal', 'Mesa do feriado em família.', 'Recado da Vó: "amanhã é feriado".', 'Sessão Brio.'],
  ['12 e 13/12', 'Final da vaquejada na Arena (a confirmar)', '"Antes ou depois da vaquejada, a mesa está pronta."', '"Depois da vaquejada, pizza da Vó."', 'Combo da Galera.'],
  ['18 a 20/12', '2ª parcela do 13º', '<b>Maior verba.</b> Último dia de confraternização: 19/12.', '<b>Maior verba.</b> Combo Família.', '"13º caiu": extra por conta da casa.'],
  ['15 a 24/12', 'Encomendas de Natal', 'Deep Dish Família por encomenda (a decidir).', 'Pizza de Natal da Vó, edição limitada (a decidir).', 'Só aviso de horário.'],
  ['23/12 em diante', 'Férias escolares', 'Mesa de família à noite.', 'Pizza das férias, criançada em casa.', 'Sessão Brio: "hoje ninguém cozinha".'],
  ['26/12 (sáb)', 'Dia seguinte do Natal', 'Horário das festas.', '"Chega de peru. Sábado é pizza."', '"Hoje ninguém cozinha."'],
  ['31/12', 'Réveillon', 'Horário. Encomenda de Réveillon só se houver.', 'Recado da Vó e horário.', 'Story de horário.'],
]
page('pf', 'Calendário do período', 'As datas que viram venda, de 12/11 a 31/12', `
<table class="cal">
  <thead><tr><th>Quando</th><th>O que acontece</th><th>Fornario</th><th>VOVINA</th><th>Brio Burguer</th></tr></thead>
  <tbody>${cal.map((r, i) => `<tr class="${[3, 8].includes(i) ? 'hot' : ''}"><td class="d">${r[0]}</td><td class="e">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</tbody>
</table>`, { cls: 'calpg' })

// ---------- BLOCOS POR MARCA ----------
function brandBlock(b) {
  const N = b.camps ? 6 : 5
  // OFERTA
  page('pf', `${b.name} · Oferta e venda`, b.offerTitle, `
  <div class="offers g${b.offers.length}">${b.offers.map((o) => `
    <div class="card offer ${o.main ? 'main' : ''}">
      ${o.main ? '<span class="badge">principal</span>' : ''}
      <h3>${o.name}</h3>
      <div class="kv"><span>O quê</span>${o.what}</div>
      <div class="kv"><span>Condição</span>${o.cond}</div>
      <div class="kv"><span>Para quem</span>${o.who}</div>
      <div class="kv"><span>Por que agora</span>${o.why}</div>
    </div>`).join('')}
  </div>
  ${b.offerNote ? `<p class="note">${b.offerNote}</p>` : ''}`, { brand: b.name, cls: 'dense' })

  // SOCIAL + DESIGN
  page('pf', `${b.name} · Social media e design`, b.socialTitle, `
  <div class="g2s">
    <div>
      <h3 class="h3">Pilares do conteúdo</h3>
      <div class="bars">${b.pillars.map((p) => `<div class="bar"><div class="bl"><b>${p[0]}</b><span>${p[2]}</span></div><div class="bt"><i style="width:${p[1]}%"></i><em>${p[1]}%</em></div></div>`).join('')}</div>
    </div>
    <div>
      <h3 class="h3">Ritmo da semana</h3>
      <div class="week">${b.week.map((w) => `<div class="wd"><b>${w[0]}</b><span>${w[1]}</span></div>`).join('')}</div>
      <h3 class="h3" style="margin-top:18px">Design: as regras do mês</h3>
      ${ul(b.design)}
    </div>
  </div>`, { brand: b.name, cls: 'dense' })

  // PEÇAS
  page('pf', `${b.name} · As peças mais fortes`, b.piecesTitle, `
  <div class="pieces">${b.pieces.map((p, i) => `
    <div class="card pc"><div class="pch"><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="fmt">${p[1]}</span><span class="obj">${p[2]}</span></div>
    <h3>${p[0]}</h3><p class="copy">“${p[3]}”</p><p class="when">${p[4]}</p></div>`).join('')}
  </div>`, { brand: b.name, cls: 'dense' })

  // GRAVAÇÃO (Ellcazo): uma página por vídeo
  require('./av.js')(b.name, page)

  // TRÁFEGO
  if (b.camps) page('pf', `${b.name} · Tráfego`, b.trafTitle, `
  ${b.trafNow ? `<div class="now">${b.trafNow}</div>` : ''}
  <div class="g2t">
    <div>
      <h3 class="h3">Campanhas</h3>
      <div class="camps">${b.camps.map((c) => `<div class="camp"><div class="cp"><b>${c[1]}%</b></div><div><h4>${c[0]}</h4><p>${c[2]}</p><p class="cr">Criativos: ${c[3]}</p></div></div>`).join('')}</div>
    </div>
    <div>
      <h3 class="h3">Verba sugerida (para decidir)</h3>
      <div class="opts">${b.budget.map((o) => `<div class="opt ${o.rec ? 'rec' : ''}"><b>${o.k}</b><strong>${o.v}</strong><span>${o.d}</span>${o.rec ? '<em>recomendada</em>' : ''}</div>`).join('')}</div>
      <h3 class="h3" style="margin-top:16px">Metas e o que medir</h3>
      ${ul(b.goals)}
    </div>
  </div>`, { brand: b.name, cls: 'dense' })
}

const T = {
  casa: ['https://www.tiktok.com/@casadohomempizza/video/7701496038028315924', 'Casa do Homem Pizza · 1.124.679 views'],
  nestor: ['https://www.tiktok.com/@nestorpizzariagastro/video/7698836627824676104', 'Nestor Pizzaria · 512.475 views'],
  brenner: ['https://www.tiktok.com/@obrennera/video/7706692284976319796', '“Vale o preço?” · 214.404 views'],
  canhao: ['https://www.instagram.com/p/DfXyS3RJd0s/', 'Fornario, Praça do Canhão · 5.936 views'],
  equipe: ['https://www.instagram.com/p/DfablqDJfJT/', 'Fornario, equipe · 2.834 views'],
  feedback: ['https://www.instagram.com/p/DfkEcJQO1mQ/', 'Fornario, cliente real · 1.829 views'],
  slm: ['https://www.tiktok.com/@saolourencoordinario/video/7687299531179871508', '@saolourencoordinario · 46.888 views'],
  asmr: ['https://www.shopify.com/br/blog/trends-do-tiktok', 'tendência ASMR de forno e crosta'],
  real: ['https://www.meioemensagem.com.br/midia/tiktok-elege-curiosidade-e-realidade-como-tendencias-de-2026', 'tendência “bastidor sem filtro” 2026'],
  mordida: ['https://www.tiktok.com/@otavarex1/video/7696629520446606599', 'mordida em 7 s · 1.198.254 views'],
  combo: ['https://www.tiktok.com/@hamburgueriaexprescombos/video/7699602273290161415', 'combo “marca quem divide” · 282.457 views'],
  sandy: ['https://www.tiktok.com/@sandyyburguer/video/7699280823480028437', 'Sandy Burguer, gancho regional · 77.257 views'],
  qq: ['https://www.tiktok.com/@qualquercoisahamburguer/video/7702622962939120917', 'humor de bastidor · 361.073 views'],
  bora: ['https://www.instagram.com/p/DeNWBsmOd_6/', 'criador local + Bora Burguer · 239.634 views'],
  moot: ['https://www.tiktok.com/@mootburger.smash/video/7702920758082751750', 'corte da carne · 164.914 views'],
  lipe: ['https://www.tiktok.com/@lipe25f_oficial/video/7679473392529018130', 'Reels narrado #saolourencodamata'],
  arvore: ['https://www.tiktok.com/@abiagalvao/video/7705548560103656722', 'pizza de Natal em família · 161 mil views'],
  nativa: ['https://pizzarianativa.com.br/', 'Pizzaria Nativa, “Valeu, Natalina!” esgotada'],
}
const V = (t, v, r) => ({ t, v, u: T[r][0], r: T[r][1] })

// ---------- FORNARIO ----------
brandBlock({
  name: 'Fornario',
  offerTitle: 'Vender mesa reservada, não visita ao perfil',
  offers: [
    { main: true, name: 'Confraternização Fornario', what: 'Mesa reservada para o grupo, com menu para compartilhar (entrada, pizzas, sobremesa, bebidas).', cond: 'Reserva antecipada pelo WhatsApp, terça a domingo, até 19/12. Preço, mínimo de pessoas e sinal: <b>a decidir hoje</b>.', who: 'Empresas, turmas e famílias da cidade e de Camaragibe.', why: 'Os grupos escolhem a data em novembro, e nenhuma pizzaria da cidade anuncia confraternização.' },
    { name: 'Encomenda de Natal: Deep Dish Família', what: 'Deep Dish com 1 kg de mussarela, por encomenda, para retirar ou receber.', cond: 'Pedido antecipado pelo WhatsApp, vagas por dia pelo forno. Preço e prazo a decidir.', who: 'Famílias que recebem em casa no dia 24.', why: 'Só tem aqui. Escassez real, sem cara de promoção.' },
    { name: 'Experiência para casal', what: 'Entrada, prato e sobremesa para dividir, com bebida.', cond: 'Terça a sexta, com reserva. Confirmar se segue em dezembro.', who: 'Casais, noites fora do pico.', why: 'Enche os dias fracos sem baixar preço.' },
    { name: 'Romeu e Julieta para fechar a mesa', what: 'Pizza doce oferecida na hora de fechar o pedido.', cond: 'Na compra de pizza salgada, pelo atendente e no WhatsApp. Sem peça de preço no feed.', who: 'Toda mesa e todo pedido.', why: 'Sobe o valor do pedido sem desconto.' },
  ],
  offerNote: '<b>Black Friday:</b> sem desconto no Fornario. Sugestão: quem fechar a confraternização até 30/11 ganha a Romeu e Julieta na mesa (a decidir).',
  socialTitle: 'Toda peça mostra um prato, uma ocasião e o caminho da reserva',
  pillars: [['Vender', 40, 'confraternização, feriado, 13º, encomenda'], ['Ocasião', 25, 'grupo, casal, família, “só tem aqui”'], ['Prova', 25, 'massa de 48 horas, nota 4,8 no Google, cliente real'], ['Gente da casa', 10, 'pizzaiolo, véspera na cozinha']],
  week: [['Ter', 'Reel de prova (massa, forno, preço explicado)'], ['Qui', 'Carrossel ou anúncio de oferta com reserva'], ['Sáb', 'Prato “só tem aqui” ou ocasião'], ['Seg a sex', 'Stories “datas livres de dezembro”']],
  design: ['Arco vermelho do logo como moldura, fundo Azul Noite, títulos em Fraunces', 'Um prato por peça, título de até 6 palavras', 'Selo fixo “Reserve pelo WhatsApp” e “Praça do Canhão, Centro”', 'Natal só em detalhe (vela, luz desfocada). Sem Papai Noel nem preço riscado', '2 artes de anúncio no mês (contrato): confraternização até 19/11 e “4,8 no Google” até 11/12'],
  piecesTitle: '8 peças que puxam a reserva',
  pieces: [
    ['Sua confraternização perto de casa', 'carrossel + anúncio', 'vender', 'O grupo já escolheu a data? Mande o dia e quantas pessoas no WhatsApp.', 'Sobe em 19/11, roda até 19/12'],
    ['A sua pizza começou anteontem', 'Reel', 'prova', 'Poucas pessoas sabem: a massa descansa 48 horas antes do forno.', 'Semana de 01/12'],
    ['Por que essa Marguerita custa R$ 60', 'Reel', 'prova', 'Pomodoro, mussarela, manjericão, forno a lenha. O preço tem motivo.', 'Semana de 08/12'],
    ['Feriado em família', 'post + anúncio', 'vender', 'Terça é feriado. A mesa é de vocês.', '20/11 e 08/12'],
    ['Nota 4,8 no Google', 'anúncio', 'prova + venda', 'Quem foi deu 4,8. Sua mesa de dezembro está aqui.', '11 a 20/12'],
    ['Deep Dish Família: o corte', 'Reel', 'desejo', '1 kg de mussarela. Olha o corte.', 'Semana de 15/12'],
    ['Último dia: 19/12', 'Reel do salão', 'vender', 'Foi assim a confraternização deles. O seu grupo já tem mesa?', '17 a 19/12'],
    ['A ceia ganha o prato do centro', 'post + anúncio', 'vender', 'Deep Dish de Natal por encomenda. Vagas por dia.', '15 a 23/12 (se aprovada)'],
  ],
  avTitle: 'Pouca fala, muito desejo: forno, queijo e gente da casa',
  avLead: '5 vídeos no contrato do mês. A pauta tem 10 ideias para escolher; cada uma com 3 versões curtas para não repetir e para virar anúncio.',
  avTitle2: 'Mais ideias e a diária que cobre quase tudo',
  videos: [
    V('A sua pizza começou anteontem', ['Timelapse da massa crescendo, legenda “anteontem”', 'Mãos do pizzaiolo abrindo a massa, sem fala', 'Corte de 7 s: borda estalando ao sair do forno'], 'casa'),
    V('Deep Dish: o corte', ['Corte em câmera lenta, queijo puxando até o fim', 'De cima: a família tirando as fatias', 'Só som: faca, crosta e queijo'], 'nestor'),
    V('Marguerita de R$ 60, insumo por insumo', ['Pizzaiolo aponta cada ingrediente, texto na tela', 'Ingredientes caindo na massa, um por um', '“R$ 60 ÷ 8 fatias” escrito na tela, pizza inteira'], 'brenner'),
    V('Forno a lenha, só som', ['15 s de lenha, chama e borda quebrando', 'A pá entrando e saindo do forno', 'Luz do forno no rosto do pizzaiolo'], 'asmr'),
    V('Chegar na Praça do Canhão', ['Caminhada da praça até a mesa posta', 'Fachada no fim de tarde com luz de Natal', 'Casal chegando e sentando'], 'canhao'),
    V('Quem faz a sua pizza', ['O pizzaiolo pelo nome, 1 frase só', 'A equipe montando o salão antes de abrir', '“O sabor preferido de quem faz”'], 'equipe'),
    V('Camarão grande, de verdade', ['Camarão caindo na pizza em close', 'Pizza saindo do forno, vapor e brilho', 'Garfo levantando um camarão inteiro'], 'nestor'),
    V('A mesa do grupo', ['Brinde de uma confraternização real', 'Pizzas chegando à mesa, mãos de todos', 'Mesa vazia posta → mesa cheia (antes e depois)'], 'canhao'),
    V('Quem foi conta', ['Uma frase de cliente na saída', 'Print da avaliação 4,8 sobre a pizza', 'Três clientes, três palavras'], 'feedback'),
    V('Véspera de Natal na cozinha', ['Bastidor no celular, no dia 23 ou 24', 'Encomendas da Deep Dish saindo', 'Equipe desejando boas festas'], 'real'),
  ],
  day: { title: 'Diária Fornario · terça 24/11', sub: '13h às 19h, casa fechada ou vazia. Sugestão; data a decidir.', slots: [['13h', 'Massa, forno e borda (ideias 1 e 4)'], ['14h30', 'Pratos: Deep Dish, camarão, Marguerita (2, 3, 7)'], ['16h30', 'Equipe e pizzaiolo (6), mesa posta (8, versão antes)'], ['18h', 'Praça e fachada com a luz do fim de tarde (5)']], out: 'Saem 7 das 10 ideias + fotos para as 2 artes. A mesa real de grupo e o depoimento (8 e 9) se gravam numa confraternização marcada, até 05/12.' },
  trafTitle: 'O anúncio passa a comprar conversa de reserva',
  trafNow: '<b>Outubro: R$ 0 em anúncio</b> (buraco de meados de setembro a 02/11). <b>Novembro:</b> R$ 92,44 e 478 visitas ao perfil (R$ 0,19 cada; em ago–set era R$ 0,15), mas <b>0 conversas medidas</b>. Visita não enche mesa: a verba passa a comprar conversa no WhatsApp esta semana.',
  camps: [
    ['Reserva de fim de ano (WhatsApp)', 60, 'Grupos e família, raio de 8 km, 25 a 55 anos, terça a domingo das 17h às 23h. Mensagem pronta “Quero reservar uma mesa”.', 'confraternização, feriado, 4,8 no Google, último dia 19/12'],
    ['Vídeos de prova (alcance)', 20, 'Gente nova no raio de 10 km assiste ao porquê do preço e entra no público de remarketing.', 'massa de 48 h, Marguerita de R$ 60, Deep Dish'],
    ['Encomenda de Natal (remarketing)', 20, 'De 15 a 23/12, quem viu os vídeos ou interagiu. Só sobe se a encomenda for aprovada.', 'Deep Dish na mesa de Natal'],
  ],
  budget: [
    { k: 'A', v: 'R$ 12/dia', d: '≈ R$ 600 no período. Perto do ritmo de novembro.' },
    { k: 'B', v: 'R$ 18/dia', d: '≈ R$ 900. O ritmo de ago–set (R$ 703 em 6 semanas), dobrando nos picos.', rec: true },
    { k: 'C', v: 'R$ 25/dia', d: '≈ R$ 1.250. Mais alcance para a encomenda de Natal.' },
  ],
  goals: ['1ª semana: custo real por conversa (base para todo o resto)', '10 reservas de grupo até 19/12, contadas na lista de reservas', 'Lista de reservas toda segunda: data, nome, pessoas, se veio do anúncio', 'Teste: título com “4,8 no Google” × sem a nota'],
})

// ---------- VOVINA ----------
brandBlock({
  name: 'VOVINA',
  offerTitle: 'O pedido de casa da família, fácil pelo cardápio digital',
  offers: [
    { main: true, name: 'Combo Família da Vó', what: 'Evolução do Combo Mussarela e Calabresa, que já vende no anúncio: pizza grande meio a meio + refri 1 L (itens a confirmar).', cond: 'Pelo cardápio digital ou WhatsApp, o período todo. Preço a decidir.', who: 'Famílias do Centro e arredores, de quinta a sábado.', why: 'Lança na Black Friday e na 1ª parcela do 13º, sem preço riscado: “o combo do mês”.' },
    { name: 'Feriadão com pizza', what: 'Destaque do combo com aviso de horário.', cond: 'Vésperas e feriados de 20/11 e 08/12, se a casa abrir.', who: 'Família em casa no feriado.', why: 'Feriado em casa é dia de pedir.' },
    { name: 'Pizza de Natal da Vó', what: 'Edição limitada só em dezembro: pizza em formato de árvore ou sabor doce de Natal.', cond: 'Só se vocês aprovarem. Formato, sabor e preço a definir.', who: 'Família na noite de Natal e nas férias.', why: 'Pizza de Natal em família está crescendo agora (161 mil views em 07/11); “esgotou” vende sozinho.' },
    { name: 'Chega de peru: sábado é pizza', what: 'Combo Família em destaque no dia seguinte do Natal.', cond: 'Sábado 26/12.', who: 'Quem não quer cozinhar depois da ceia.', why: 'Sábado concentra mais de 21% dos pedidos de pizza da semana.' },
  ],
  offerNote: '<b>Para não brigar com o Fornario:</b> a VOVINA fala de casa, família e meio a meio. O argumento da massa de 48 horas fica como apoio, e o Fornario fica com ele como título (decisão nº 4).',
  socialTitle: 'Fim do “Sextou”: todo post tem um gancho concreto e o link do cardápio',
  pillars: [['Vender', 35, 'combo, feriado, vaquejada, 13º, 26/12'], ['Qualidade', 25, 'borda dourada, feita sem pressa'], ['Família', 15, 'a pizza dos encontros de dezembro'], ['Gente e cliente', 15, 'quem faz, quem provou e voltou'], ['Como pedir', 10, 'cardápio em 3 passos, meio a meio']],
  week: [['Ter', 'Gente da casa ou prova de cliente'], ['Qui', 'Oferta da semana com link do cardápio'], ['Sáb', 'Data (feriado, vaquejada, 13º, 26/12)'], ['Seg a sex', 'Stories com o link do cardápio']],
  design: ['Sem guia de marca cadastrado: precisamos do logo e das cores para fechar o padrão', 'Primeiro segundo do vídeo mostra borda ou queijo puxando', 'Até 8 palavras na capa; selo “Peça pelo cardápio digital”', 'Rosto da equipe ou de cliente em pelo menos 1 peça por semana', '1 arte de anúncio no mês (contrato): Combo Família até 26/11'],
  piecesTitle: '8 peças que levam ao cardápio',
  pieces: [
    ['Dezembro é mesa cheia', 'anúncio + post', 'vender', 'A família reuniu? A pizza é da Vó. Monte o seu combo pelo link.', 'Lança 27/11'],
    ['Meio a meio em 3 passos', 'carrossel', 'como pedir', 'Sem ligação, sem espera: escolhe as duas metades e pronto.', 'Semana de 01/12'],
    ['Recado da Vó: amanhã é feriado', 'post + anúncio', 'vender', 'Já sabe quem vai cuidar do jantar.', '19/11 e 07/12'],
    ['Quem faz a sua pizza', 'carrossel ou Reel', 'gente', 'Conheça quem abre a massa da sua pizza toda noite.', 'Semana de 08/12'],
    ['Depois da vaquejada, pizza da Vó', 'anúncio', 'vender', 'Saiu da Arena? O jantar está resolvido.', '11 a 13/12'],
    ['Borda escura é queimada? Não.', 'carrossel', 'qualidade', 'É a massa feita sem pressa dourando no forno.', 'Semana de 15/12'],
    ['13º caiu: o meio a meio é com a Vó', 'anúncio + post', 'vender', 'Sábado de família pede pizza da Vó.', '18 a 20/12'],
    ['Chega de peru. Sábado é pizza.', 'anúncio + post', 'vender', 'Sobrou ceia? Hoje a cozinha descansa.', '26/12'],
  ],
  avTitle: 'A pizza chegando em casa e a família avançando',
  avLead: '1 vídeo no contrato do mês. A pauta tem 9 ideias para escolher o principal e tirar cortes curtos para anúncio e stories.',
  avTitle2: 'Mais ideias e uma diária curta',
  videos: [
    V('A caixa abriu, a família avançou', ['Caixa abrindo na mesa, mãos de todos em 3 s', 'Criança pegando a primeira fatia', 'Vista de cima: a pizza some em 10 s (acelerado)'], 'mordida'),
    V('O meio a meio da família', ['Cada metade de um jeito, montada em close', 'Pai escolhe uma metade, filho a outra', 'Tela dividida: as duas metades saindo do forno'], 'lipe'),
    V('Borda escura é queimada? Não.', ['Gancho em texto, borda estalando na mão', 'Close da borda dourada saindo do forno', 'Pizzaiolo responde em 1 frase'], 'casa'),
    V('Queijo puxando', ['Fatia levantada em câmera lenta', 'Calabresa chiando ao sair do forno', 'Só som: corte da pizza inteira'], 'nestor'),
    V('Na Joaquim Nabuco tem…', ['Chegada à fachada, pizza no balcão', 'Motoboy saindo com a caixa pelo Centro', '“Você sabia que no Centro…” em texto'], 'canhao'),
    V('Quem faz a sua pizza', ['Pizzaiolo pelo nome, abrindo a massa', 'Um dia na cozinha em dezembro', 'O sabor preferido de quem faz'], 'equipe'),
    V('Quem provou, voltou', ['Print de cliente sobre a borda', 'Cliente na retirada, uma frase', 'Foto de mesa de família marcando o perfil'], 'feedback'),
    V('A pizza de Natal da Vó', ['Pizza em formato de árvore saindo do forno', 'Noite do pijama em família com a pizza de Natal', '“Edição limitada” e “esgotou hoje” nos stories'], 'arvore'),
    V('Dica da cidade', ['Criador local prova e dá nota', 'Reação na primeira mordida', '“Vale ir buscar?” no Centro'], 'slm'),
  ],
  day: { title: 'Diária VOVINA · quarta 25/11', sub: '15h às 18h, antes de abrir. Sugestão; data a decidir.', slots: [['15h', 'Forno, borda e queijo (ideias 3 e 4)'], ['16h', 'Meio a meio e pizzaiolo (2 e 6)'], ['17h', 'Família recebendo a caixa em casa (1)'], ['17h40', 'Fachada e motoboy no Centro (5)']], out: 'Saem o Reel principal, 4 cortes para anúncio e as fotos da arte do Combo Família. A família da ideia 1 pode ser gente da casa (sem custo).' },
  trafTitle: 'O anúncio já leva gente ao cardápio: agora, contar pedidos',
  trafNow: '<b>Desde 03/11 (antes, R$ 0):</b> R$ 113,35, 17.013 pessoas e <b>893 cliques no cardápio a R$ 0,13</b> (CTR 5,7%). O vídeo do Combo Mussarela e Calabresa puxou 85% dos cliques. Falta saber quantos viraram pedido.',
  camps: [
    ['Combo e datas (cliques no cardápio)', 60, 'Continua a campanha que já funciona. Raio de 5 km do Centro; reforço de sexta a domingo, 27–30/11, 18–20/12 e 26/12.', 'vídeo do combo (atual) + 2 ou 3 novos no mesmo formato, revezando a cada 2–3 semanas'],
    ['Vídeo da família (alcance)', 25, 'Raio de 8 km, aberto. Apresenta a VOVINA e cria público para remarketing.', 'Reel principal e cortes'],
    ['Remarketing (WhatsApp)', 15, 'Quem viu 50% do vídeo ou interagiu nos últimos 30 dias.', 'Combo Família, 13º, 26/12'],
  ],
  budget: [
    { k: 'A', v: 'R$ 12/dia', d: '≈ R$ 600 no período. Ritmo de novembro.' },
    { k: 'B', v: 'R$ 18/dia', d: '≈ R$ 900. Dobra nos picos do 13º e no 26/12.', rec: true },
    { k: 'C', v: 'R$ 25/dia', d: '≈ R$ 1.250. Mais alcance nas férias.' },
  ],
  goals: ['Link do cardápio marcado: <b>custo por pedido</b> a partir da próxima semana', 'Manter o clique no cardápio perto de R$ 0,13 com mais verba', 'Posts do feed com média acima de 600 views (hoje ~300)', 'Teste: anúncio levando ao cardápio × ao WhatsApp'],
})

// ---------- BRIO ----------
brandBlock({
  name: 'Brio Burguer',
  offerTitle: 'Entrada no mercado: o combo para dividir, pedido pelo site',
  offers: [
    { main: true, name: 'Combo da Galera', what: '4 Brios clássicos + 2 fritas grandes + refri de 2 L (composição a confirmar).', cond: 'Só pelo site, de quinta a domingo. Preço a decidir, mostrado como “por pessoa”.', who: 'Turma de 18 a 35 anos, confraternização em casa.', why: 'Combo para dividir é o formato que mais compartilha no nicho, e dezembro é mês de juntar a galera.' },
    { name: 'Sessão Brio', what: '2 Brios + 1 frita + 2 refris lata (a confirmar).', cond: 'Só pelo site, todos os dias de funcionamento.', who: 'Casal ou dupla, noite de filme nas férias.', why: 'Férias e dia seguinte do Natal pedem pedido pequeno em casa.' },
    { name: 'Semana do 13º: extra da casa', what: 'Um adicional (maionese caseira ou upgrade da frita) nos combos.', cond: 'Pedidos pelo site de 17 a 20/12 (a confirmar).', who: 'Quem recebeu a 2ª parcela.', why: 'Urgência real de 4 dias.' },
    { name: 'Primeiro pedido pelo site', what: 'Um mimo no primeiro pedido para criar o hábito do canal próprio.', cond: 'Só se o site aceitar cupom; a definir na entrada.', who: 'Quem nunca pediu o Brio.', why: 'É lançamento: o primeiro pedido é o que mais custa.' },
  ],
  offerNote: '<b>Posição:</b> o Brio não briga com preço de entrada (há combo de R$ 19,90 na região). Ancora no preço por pessoa contra o artesanal avulso da praça (R$ 36,90 a R$ 44).',
  socialTitle: 'O lanche real, aberto e enorme: humor de amigo, gíria leve',
  pillars: [['Vender', 40, 'combo da galera, sessão, 13º'], ['Chega quente', 20, 'maionese caseira, montagem, embalagem'], ['São Lourenço', 20, 'gente da cidade provando'], ['Conversa', 15, 'marca o amigo, horários'], ['Como pedir', 5, 'quantos Brios para a sua galera']],
  week: [['Qua', 'Bastidor “chega quente”'], ['Sex', 'Oferta com “Pede pelo site”'], ['Dom', 'Marca o amigo / gente da cidade'], ['Todo dia', 'Stories do pedido saindo']],
  design: ['Laranja Brio no fundo das ofertas, títulos em Lilita One com contorno azul', 'Lanche ocupando metade da arte, no máximo 12 palavras na capa', '“Pede pelo site” visível em toda peça de oferta', 'Foto real e lo-fi. Nada de IA, neve ou Papai Noel', '1 arte extra no mês (contrato): a do 13º, pronta até 16/12'],
  piecesTitle: '8 peças para a entrada do Brio',
  pieces: [
    ['Chegou o Brio', 'Reel de entrada', 'lançamento', 'Artesanal, maionese caseira, chega quente. Pede pelo site.', '1º dia da entrada'],
    ['Por que o Brio chega quente', 'carrossel', 'prova', 'Da chapa à tua porta, sem esfriar.', '1ª semana'],
    ['Combo da Galera', 'post + Reel curto', 'vender', 'Marca quem divide contigo. Ninguém briga.', 'Toda quinta a domingo'],
    ['Tu é de São Lourenço e não conhece o Brio?', 'Reel de rua', 'cidade', 'Oxe, tá vivendo errado, visse?!', '2ª semana'],
    ['Quantos Brios pra tua galera?', 'carrossel', 'como pedir', 'Salva e pede pelo site.', '2ª semana'],
    ['Marca quem te deve um Brio', 'post', 'conversa', 'Tem gente te devendo um Brio desde janeiro.', '12 e 13/12'],
    ['13º caiu? O Brio é por tua conta', 'post + stories', 'vender', 'Só até domingo: combo com extra.', '17 a 20/12'],
    ['Hoje ninguém cozinha', 'carrossel', 'vender', 'Férias + sofá + Sessão Brio.', '23 e 26/12'],
  ],
  avTitle: 'Mordida em 3 segundos e a galera da cidade',
  avLead: '1 vídeo no contrato do mês. Na entrada, a pauta rende o Reel de rua e cortes curtos que, mais tarde, viram os primeiros anúncios.',
  avTitle2: 'Mais ideias e a diária de estreia',
  videos: [
    V('A mordida', ['Mordida em até 3 s, queijo escorrendo', 'Mão apertando o pão, molho caindo', 'Versão de 7 s, só som'], 'mordida'),
    V('Tu é de São Lourenço e não conhece?', ['Pergunta na rua, prova na hora', 'Reação de quem prova pela 1ª vez', '“Dá uma nota de 0 a 10”'], 'sandy'),
    V('Combo da Galera na mesa', ['Combo aberto, mãos de todos', '“Marca quem divide” em texto', 'Galera rachando a conta no Pix (humor)'], 'combo'),
    V('O corte do Brio', ['Faca descendo no burger, carne suculenta', 'Brio × “folha de carne” do fast food', 'Close do ponto da carne'], 'moot'),
    V('Bastidor com humor', ['“Aqui o expediente é assim”', 'O pedido saindo em 30 s (acelerado)', 'Quem come o lanche que caiu?'], 'qq'),
    V('Criador local prova', ['Criador avalia o combo', 'Nota e reação na 1ª mordida', '“Pede pelo site” no fim'], 'bora'),
    V('A maionese caseira', ['Maionese sendo feita em close', 'Batata mergulhando no pote', '“Tu sabe o que vai na maionese?”'], 'moot'),
    V('Chega quente', ['Da chapa ao motoboy em 15 s', 'Caixa abrindo com vapor na porta', 'Entrega em São Lourenço, de noite'], 'mordida'),
  ],
  day: { title: 'Diária Brio · quinta 26/11', sub: '15h às 20h. Sugestão; depende da data de entrada (decisão nº 1).', slots: [['15h', 'Produto: mordida, corte, maionese (1, 4, 7)'], ['16h30', 'Combo da Galera com amigos (3) e fotos do combo'], ['18h', 'Rua em São Lourenço: “Tu é de São Lourenço…” (2)'], ['19h30', 'Cozinha aberta: chega quente e bastidor (5, 8)']], out: 'Saem o Reel de rua, 4 cortes curtos (stories agora, anúncio quando o tráfego entrar) e as fotos reais dos combos. Criador local (6) só com aprovação.' },
})

// ---------- SINERGIAS ----------
page('pf', 'Sinergias do grupo', 'O que fazemos juntos para gastar menos e vender mais', `
<div class="g3 syn">
  ${card('Gravar junto', ul(['<b>Uma semana, três diárias</b> seguidas (24, 25 e 26/11): mesma equipe da Ellcazo, mesmo equipamento, tudo na mesma cidade', 'Os vídeos do período inteiro ficam prontos antes da Black Friday', 'Um só criador local (@saolourencoordinario), um vídeo por marca, em dias diferentes']))}
  ${card('Vender junto, sem competir', ul(['<b>Cada marca, uma ocasião:</b> sair para comemorar = Fornario; pedir para a família = VOVINA; juntar a galera = Brio', 'Cartão com QR na caixa da VOVINA e do Brio: “Confraternização? Fornario”', 'Anúncios do Fornario e da VOVINA separados por idade e intenção, para não disputarem o mesmo público no mesmo raio']))}
  ${card('Medir junto', ul(['O mesmo roteiro de atendimento e a mesma planilha (data, nome, pedido, “Vi no Instagram”) nas três', '<b>Um relatório só, toda segunda</b>, com as três marcas lado a lado', 'Picos de verba do Fornario e da VOVINA nos mesmos dias (27–30/11 e 18–20/12)']))}
</div>`, { cls: 'dense' })

// ---------- DECISÕES ----------
const dec = [
  ['Quando a Brio começa?', [['A', '27/11', 'entra na Black Friday e na 1ª parcela do 13º, com pouco tempo de preparo'], ['B', '03/12', 'entra com os vídeos gravados e pega dezembro inteiro', 1], ['C', 'Janeiro', 'foco em Fornario e VOVINA agora; Brio entra nas férias']]],
  ['Verba de anúncio (Fornario e VOVINA)', [['A', 'R$ 12/dia cada', 'ritmo de novembro (≈ R$ 600 cada no período)'], ['B', 'R$ 18/dia cada', 'dobrando nos picos do 13º (≈ R$ 900 cada)', 1], ['C', 'R$ 25/dia cada', 'mais alcance no Natal (≈ R$ 1.250 cada)']]],
  ['Confraternização Fornario', [['A', 'Menu fechado por pessoa', 'preço por pessoa, mínimo de pessoas e sinal', 1], ['B', 'Mesa reservada + cortesia', 'cardápio normal; sobremesa de cortesia para grupos a partir de X pessoas'], ['?', 'Até quando aceita grupos?', 'o plano supõe 19/12']]],
  ['Quem fala de “48 horas”?', [['A', 'Só o Fornario', 'VOVINA fala de família e meio a meio', 1], ['B', 'As duas', 'risco de uma marca roubar pedido da outra'], ['?', 'A massa é a mesma nas duas casas?', 'muda o que podemos dizer']]],
  ['Encomendas de Natal', [['A', 'Deep Dish (Fornario) + Pizza de Natal da Vó', 'duas vendas extras em dezembro', 1], ['B', 'Só a Deep Dish', 'menos trabalho na cozinha'], ['C', 'Nenhuma', 'foco em mesa e combo']]],
  ['Datas de gravação', [['A', '24, 25 e 26/11', 'vídeos prontos para a Black Friday', 1], ['B', '01, 02 e 03/12', 'perde a Black Friday e a 1ª parcela']]],
]
page('pf', 'Decisões para hoje', 'Seis escolhas para sairmos da reunião com o plano no ar', `
<div class="decs">${dec.map((d, i) => `<div class="card dec"><h3><span class="num">${i + 1}</span>${d[0]}</h3>
  ${d[1].map((o) => `<div class="dopt ${o[3] ? 'rec' : ''}"><b>${o[0]}</b><div><strong>${o[1]}</strong><span>${o[2]}</span></div>${o[3] ? '<em>sugerida</em>' : ''}</div>`).join('')}
</div>`).join('')}</div>`, { cls: 'dense' })

// ---------- O QUE PRECISAMOS + PRÓXIMOS PASSOS ----------
page('pf', 'O que precisamos e próximos passos', 'Com isto em mãos até 18/11, o plano roda sozinho', `
<div class="g2n">
  <div class="card need"><h3>O que precisamos de vocês</h3>
    ${ul(['<b>Preços</b> dos combos e da confraternização; cardápios atualizados das três', '<b>Horários</b> em 20/11, 08/12, 24, 25, 26 e 31/12 e 01/01', '<b>Pedidos do anúncio:</b> quantos pedidos “Vi no Instagram” por semana, na VOVINA', '<b>Site do Brio:</b> endereço e se aceita cupom', '<b>Logo e cores</b> da VOVINA', '<b>Quem responde o WhatsApp</b> de cada casa e a lista semanal de reservas e pedidos', '<b>Aprovação</b> de prints de clientes, do criador local e de quem aparece nos vídeos'])}
  </div>
  <div class="steps">${[
    ['12/11', 'Hoje: as 6 decisões'],
    ['até 14/11', 'Anúncio do Fornario passa a gerar conversa no WhatsApp'],
    ['até 18/11', 'Oferta da confraternização, preços, horários; link do cardápio marcado'],
    ['19/11', 'Artes da confraternização e do feriado de 20/11 no ar'],
    ['24 a 26/11', 'Semana de gravação Ellcazo (três diárias)'],
    ['27 a 30/11', 'Black Friday e 1ª parcela: combo VOVINA, reservas Fornario'],
    ['03/12', 'Entrada do Brio (se for a opção B). Tráfego da Brio entra quando ela estiver ativa'],
    ['18 a 20/12', 'Maior verba do período (Fornario e VOVINA)'],
    ['Toda segunda', 'Relatório único das marcas'],
    ['05/01', 'Balanço do período e plano de janeiro'],
  ].map((s) => `<div class="st"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
</div>`, { cls: 'dense' })

// ---------- HTML ----------
const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8')
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plano do Grupo Nov–Dez</title>
<style>${css}</style></head>
<body>
${pages.join('\n')}
<div class="nav"><button onclick="go(-1)" aria-label="Anterior">‹</button><span id="pc"></span><button onclick="go(1)" aria-label="Próxima">›</button></div>
<script>
const S=[...document.querySelectorAll('.pg')];let cur=0;
function fit(){const s=Math.min(innerWidth/1333,innerHeight/750);document.documentElement.style.setProperty('--s',s)}
function show(i){cur=Math.max(0,Math.min(S.length-1,i));S.forEach((x,k)=>x.classList.toggle('on',k===cur));document.getElementById('pc').textContent=(cur+1)+' / '+S.length;history.replaceState(null,'','#p'+(cur+1))}
function go(d){show(cur+d)}
addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();go(1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();go(-1)}});
addEventListener('resize',fit);fit();show((parseInt((location.hash||'#p1').slice(2))||1)-1);
</script>
</body></html>`
fs.writeFileSync(path.join(OUT, 'estrategia-nov-dez.html'), html)
console.log('pages', pages.length)
