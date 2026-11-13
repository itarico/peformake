// Gera 3 documentos por marca (estratégia, social media, audiovisual) a partir do plano do grupo aprovado
const fs = require('fs')
const path = require('path')
const { D, cal } = require('./data.js')
const COM = require('./com.js')
const OUT = path.resolve(__dirname, '..')
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'logo.b64'), 'utf8').trim()
const ellD = ['M2 2H466V157H190V236H466V391H190V462H470V617H2Z', 'M543 2H731V617H543Z', 'M822 1H1010V616H822Z', 'M6 693H469V848H193V1154H469V1308H6Z',
  'M542 693H1005V1308H818V848H730V1308H542Z', 'M4 1385H468V1504L440 1540L230 1845H468V2000H0V1846L215 1539H4Z', 'M544 1385H1011V2000H544ZM733 1539V1845H822V1539Z']
const ell = (color = '#B5E61D', h = 34) => `<svg viewBox="0 0 1011 2000" height="${h}" role="img" aria-label="Ellcazo" fill="${color}" fill-rule="evenodd">${ellD.map((x) => `<path d="${x}"/>`).join('')}</svg>`
const card = (h, b, cls = '') => `<div class="card ${cls}">${h ? `<h3>${h}</h3>` : ''}${b}</div>`
const ul = (arr) => `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`
const PER = '12/11 a 31/12/2026'

function Doc(brand, docName) {
  const pages = []
  let n = 0
  function page(kind, tag, title, body, opts = {}) {
    n++
    const av = kind === 'av'
    const mid = `${brand} · ${docName} · ${PER}`
    const foot = av
      ? `<div class="foot"><span class="fl">${ell('#0A0A0A', 26)}<b>Ellcazo</b> · audiovisual</span><span>${mid}</span><span class="pn">${n}</span></div>`
      : `<div class="foot"><span class="fl"><img src="${logo}" alt="Peformake"><b>Peformake</b> assessoria</span><span>${mid}</span><span class="pn">${n}</span></div>`
    pages.push(`<section class="pg ${av ? 'av' : ''} ${opts.cls || ''}" id="p${n}">
  ${av ? `<div class="elogo">${ell('#0A0A0A', 56)}</div>` : ''}
  ${tag ? `<div class="tag">${tag}</div>` : ''}
  ${title ? `<h1>${title}</h1>` : ''}
  <div class="body">${body}</div>
  ${opts.nofoot ? '' : foot}
</section>`)
  }
  function raw(html) { n++; pages.push(html.replace('%ID%', 'p' + n)) }
  return { page, raw, pages }
}

// ---------------- conteúdo por marca ----------------
const B = {
  Fornario: {
    slug: 'fornario', col: 2,
    role: 'a mesa da ocasião',
    card: `<p class="lead">Salão premium na Praça do Canhão. Vende <b>mesa reservada</b>: confraternização, casal e Natal em família.</p>
      <div class="kv"><span>Público</span>25 a 55 anos, grupos e famílias de São Lourenço e Camaragibe</div>
      <div class="kv"><span>Canal</span>Reserva pelo WhatsApp</div>
      <div class="goal"><span class="gl">Objetivo no período</span>Conversas de reserva medidas (hoje: 0) e <b>10 reservas de grupo até 19/12</b> (aposta inicial). Reels de ~2.360 para 3.000 views de média.</div>`,
    teseTitle: 'Vender mesa reservada no fim de ano, e contar cada reserva',
    tese: 'O Fornario tem a maior audiência da cidade e nota 4,8, mas a atenção para no perfil. Neste período o anúncio passa a comprar <b>conversa no WhatsApp</b> e toda peça pede a reserva: confraternização até 19/12, feriados e encomenda de Natal.',
    moves: [['O fim de ano começa agora', 'Reserva de confraternização abre em novembro, não em 01/12. O anúncio passa a comprar conversa no WhatsApp esta semana.'], ['Peso nos dois 13º', '27 a 30/11 (Black Friday e 1ª parcela) e 18 a 20/12 (2ª parcela) recebem a maior verba e as ofertas mais fortes.'], ['Uma diária de gravação', 'Terça 24/11 com a Ellcazo: os vídeos do período ficam prontos antes da Black Friday.']],
    decs: [
      ['Verba de anúncio', [['A', 'R$ 12/dia', 'ritmo de novembro (≈ R$ 600 no período)'], ['B', 'R$ 18/dia', 'dobrando nos picos do 13º (≈ R$ 900)', 1], ['C', 'R$ 25/dia', 'mais alcance no Natal (≈ R$ 1.250)']]],
      ['Confraternização Fornario', [['A', 'Menu fechado por pessoa', 'preço por pessoa, mínimo de pessoas e sinal', 1], ['B', 'Mesa reservada + cortesia', 'cardápio normal; sobremesa de cortesia para grupos a partir de X pessoas'], ['?', 'Até quando aceita grupos?', 'o plano supõe 19/12']]],
      ['Quem fala de “48 horas”?', [['A', 'Só o Fornario', 'a VOVINA fala de família e meio a meio', 1], ['B', 'As duas marcas', 'risco de uma marca roubar pedido da outra'], ['?', 'A massa é a mesma nas duas casas?', 'muda o que podemos dizer']]],
      ['Encomenda de Natal', [['A', 'Deep Dish Família por encomenda', 'venda extra em dezembro, vagas por dia', 1], ['B', 'Sem encomenda', 'foco só em mesa e confraternização']]],
      ['Data de gravação', [['A', 'Terça 24/11', 'vídeos prontos para a Black Friday', 1], ['B', 'Terça 01/12', 'perde a Black Friday e a 1ª parcela']]],
    ],
    decMap: {},
    syn: ['<b>Gravação junto com as outras marcas</b> (24, 25 e 26/11): mesma equipe da Ellcazo, menos custo', 'Cartão com QR na caixa da VOVINA e do Brio: <b>“Confraternização? Fornario”</b>', 'Anúncio separado do da VOVINA por idade e intenção, para não disputarem o mesmo público', 'Mesma planilha de atendimento e <b>relatório único toda segunda</b>'],
    need: ['<b>Preço da confraternização</b> (por pessoa, mínimo e sinal) e da Deep Dish de Natal', '<b>Cardápio atualizado</b> e se a experiência para casal segue em dezembro', '<b>Horários</b> em 20/11, 08/12, 24, 25, 26 e 31/12 e 01/01', '<b>Quem responde o WhatsApp</b> em cada turno e a lista semanal de reservas', '<b>Aprovação</b> de prints de clientes e de quem aparece nos vídeos'],
    steps: [['12/11', 'Decisões desta estratégia'], ['até 14/11', 'Anúncio passa a gerar conversa no WhatsApp'], ['até 18/11', 'Oferta da confraternização, preços e horários fechados'], ['19/11', 'Artes da confraternização e do feriado de 20/11 no ar'], ['24/11', 'Diária de gravação Ellcazo'], ['27 a 30/11', 'Black Friday e 1ª parcela: reservas de grupo'], ['até 05/12', 'Gravar uma confraternização real (mesa e depoimentos)'], ['15 a 23/12', 'Encomenda de Natal, se aprovada'], ['18 a 20/12', 'Maior verba. Último dia de confraternização: 19/12'], ['Toda segunda', 'Relatório e lista de reservas'], ['05/01', 'Balanço do período e plano de janeiro']],
    art: ['Mesa de grupo posta em luz quente, arco vermelho do logo como moldura. Slides: menu, como reservar, selo “Reserve pelo WhatsApp”.', 'Abre no close da massa crescendo; título em Fraunces só no 1º segundo; termina na pizza inteira.', 'Fundo Azul Noite, um ingrediente por cena com legenda curta; o preço aparece grande só no fim.', 'Prato em destaque, mesa de família desfocada ao fundo; a data grande em Fraunces.', 'Nota “4,8” e estrelas grandes sobre a foto do salão; selo “Reserve pelo WhatsApp”.', 'Plano de cima, corte em câmera lenta; texto “1 kg” no centro da tela.', 'Vídeo do salão cheio; “19/12” fixo no canto durante todo o Reel.', 'Deep Dish no centro da mesa; Natal só em detalhe (vela, luz desfocada); selo “Vagas por dia”.'],
    voice: ['Premium sem pose: pouca fala, muito desejo.', 'O forno, o queijo e a gente da casa contam a história; o preço tem motivo e é dito sem tom de defesa.'],
    saw: ['Praça do Canhão (5.936 views) e equipe (2.834) rendem até 14× o salão vazio (429)', 'Reels quase diários, mas cada um chega a ~4% dos 60 mil seguidores', 'No nicho, “Poucas pessoas sabem…” fez 1,12 mi e “vale o preço?” 214 mil, com som original'],
    ask: ['Todo vídeo com <b>lugar ou pessoa</b>; nada de salão vazio', '<b>Som original</b>: forno, faca, crosta. Sem música da moda', 'Gancho de curiosidade no 1º segundo', 'Fecha com <b>“Reserve pelo WhatsApp”</b>', 'Natal só em detalhe, sem Papai Noel'],
    who: { F1: ['Pizzaiolo, uma frase', 'Ellcazo, na diária'], F2: ['Ninguém: só imagem e som', 'Ellcazo, na diária'], F3: ['Pizzaiolo; cliente convidado na ideia C', 'Ellcazo, na diária'], F4: ['Ninguém (ideia C: pizzaiolo)', 'Ellcazo, na diária'], F5: ['Alguém da casa ou o casal', 'Ellcazo, na diária'], F6: ['Pizzaiolo e equipe, uma frase cada', 'Ellcazo, na diária'], F7: ['Ninguém; quem prova na ideia C', 'Ellcazo, na diária'], F8: ['Quem organizou a confraternização', 'Ellcazo, na confraternização'], F9: ['Clientes na saída', 'Ellcazo, na confraternização'], F10: ['Equipe da cozinha', 'Equipe, no celular'] },
  },
  VOVINA: {
    slug: 'vovina', col: 3,
    role: 'a pizza da família em casa',
    card: `<p class="lead">Pizza de delivery e retirada no Centro. Vende o <b>pedido de casa</b>: meio a meio, combo da família, feriado e férias.</p>
      <div class="kv"><span>Público</span>Famílias e pais, pedido de quinta a sábado</div>
      <div class="kv"><span>Canal</span>Cardápio digital e WhatsApp</div>
      <div class="goal"><span class="gl">Objetivo no período</span>Do clique ao <b>pedido medido</b>: hoje o anúncio leva 893 cliques ao cardápio a R$ 0,13, mas ninguém conta os pedidos. Feed de ~390 para <b>600 views</b>.</div>`,
    teseTitle: 'Do clique no cardápio ao pedido contado',
    tese: 'O anúncio da VOVINA já funciona: <b>893 cliques no cardápio a R$ 0,13</b>. Falta saber quantos viraram pedido e dar ao feed um motivo para pedir. O período troca o “Sextou” por ganchos concretos e lança o <b>Combo Família da Vó</b> na Black Friday.',
    moves: [['Contar pedidos', 'Link do cardápio marcado e “Vi no Instagram” anotado: custo por pedido a partir da próxima semana.'], ['Peso nos dois 13º', '27 a 30/11 (lançamento do Combo Família) e 18 a 20/12 recebem a maior verba.'], ['Uma diária de gravação', 'Quarta 25/11, antes de abrir: Reel principal, 4 cortes para anúncio e as fotos do combo.']],
    decs: [
      ['Verba de anúncio', [['A', 'R$ 12/dia', 'ritmo de novembro (≈ R$ 600 no período)'], ['B', 'R$ 18/dia', 'dobrando nos picos do 13º e no 26/12 (≈ R$ 900)', 1], ['C', 'R$ 25/dia', 'mais alcance nas férias (≈ R$ 1.250)']]],
      ['Quem fala de “48 horas”?', [['A', 'Só o Fornario', 'a VOVINA fala de família e meio a meio', 1], ['B', 'As duas marcas', 'risco de uma marca roubar pedido da outra'], ['?', 'A massa é a mesma nas duas casas?', 'muda o que podemos dizer']]],
      ['Pizza de Natal da Vó', [['A', 'Edição limitada em dezembro', 'formato de árvore ou sabor doce; venda extra', 1], ['B', 'Sem edição de Natal', 'foco no Combo Família']]],
      ['Data de gravação', [['A', 'Quarta 25/11', 'vídeos prontos para a Black Friday', 1], ['B', 'Quarta 02/12', 'perde a Black Friday e a 1ª parcela']]],
    ],
    decMap: { 4: 2, 5: 3 },
    syn: ['<b>Gravação junto com as outras marcas</b> (24, 25 e 26/11): mesma equipe da Ellcazo', 'Cada marca, uma ocasião: <b>pedir para a família = VOVINA</b>; sair para comemorar = Fornario', 'Cartão com QR na caixa: “Confraternização? Fornario”', 'Anúncio separado do Fornario por idade e intenção; mesma planilha e <b>relatório único toda segunda</b>'],
    need: ['<b>Preço e itens do Combo Família</b> da Vó', '<b>Cardápio atualizado</b> e horários em 20/11, 08/12, 24, 25, 26 e 31/12 e 01/01', '<b>Pedidos “Vi no Instagram”</b> por semana', '<b>Logo e cores</b> da VOVINA, para fechar o padrão visual', '<b>Quem responde o WhatsApp</b> e aprovação de prints, do criador local e de quem aparece nos vídeos'],
    steps: [['12/11', 'Decisões desta estratégia'], ['até 18/11', 'Link do cardápio marcado, preço do combo, horários'], ['19/11', 'Recado do feriado de 20/11 no ar'], ['25/11', 'Diária de gravação Ellcazo'], ['27/11', 'Lança o Combo Família da Vó (Black Friday)'], ['07/12', 'Recado da Vó: feriado de 08/12'], ['11 a 13/12', 'Depois da vaquejada, pizza da Vó'], ['18 a 20/12', 'Maior verba: 13º caiu'], ['26/12', 'Chega de peru: sábado é pizza'], ['Toda segunda', 'Relatório com pedidos do anúncio'], ['05/01', 'Balanço do período e plano de janeiro']],
    art: ['Mesa de família vista de cima, meio a meio no centro; até 8 palavras; selo “Peça pelo cardápio digital”.', 'Telas do cardápio no celular, um passo por slide, número grande em cada um.', 'Bilhete escrito à mão, como recado na geladeira, sobre a foto da pizza.', 'Retrato do pizzaiolo com as mãos na massa; o nome dele em destaque.', 'Caixa aberta em close, texto curto “Saiu da Arena?”; selo do cardápio.', 'Capa com a pergunta grande e close da borda dourada; a resposta no 2º slide.', 'Meio a meio em destaque e “13º” grande; selo do cardápio.', 'Contraste: travessa da ceia × pizza chegando; título de 5 palavras.'],
    voice: ['Casa de vó: família, meio a meio, conversa simples.', 'Gancho em pergunta, a borda e o queijo na tela, e sempre o caminho do pedido.'],
    saw: ['A borda com pergunta (444 views) fez 2,5× a mesma ideia dita como afirmação (179)', 'O vídeo do combo puxou 85% dos cliques do anúncio; “Sextou/Terçou” ficam em ~170', 'No nicho, pizza de Natal em família (161 mil) e pizza árvore (580 mil) crescem agora'],
    ask: ['<b>Borda ou queijo puxando</b> no 1º segundo', 'Gancho sempre em <b>pergunta ou curiosidade</b>', 'Rosto da equipe ou de cliente toda semana', 'Fecha com o <b>link do cardápio</b>', 'Nada de post de dia da semana'],
    who: { V1: ['Ninguém: a família reage', 'Ellcazo, na diária (família da casa)'], V2: ['Pizzaiolo diz os sabores; pai e filho na ideia B', 'Ellcazo, na diária'], V3: ['Pizzaiolo, uma frase', 'Ellcazo, na diária'], V4: ['Pizzaiolo ou ninguém', 'Ellcazo, na diária'], V5: ['Alguém da casa', 'Ellcazo, na diária'], V6: ['Pizzaiolo', 'Ellcazo, na diária'], V7: ['Clientes na retirada', 'Ellcazo, num sábado'], V8: ['Ninguém: a família em cena', 'Ellcazo, se aprovada'], V9: ['Criador local', 'Criador + Ellcazo de apoio'] },
  },
  'Brio Burguer': {
    slug: 'brio', col: 4,
    role: 'o lanche da galera',
    card: `<p class="lead">Hambúrguer artesanal só delivery. <b>Entra agora</b>: lançamento com combo para dividir, pedido pelo site.</p>
      <div class="kv"><span>Público</span>18 a 35 anos, São Lourenço e arredores</div>
      <div class="kv"><span>Canal</span>Site próprio de pedidos</div>
      <div class="goal"><span class="gl">Objetivo no período</span>Entrar com o perfil vivo de novo (parado desde 29/10), ritmo de 3 posts por semana e Reels de 438 para <b>1.500 views</b>. Tráfego só depois da entrada.</div>`,
    teseTitle: 'Entrar no mercado com o combo para dividir, pedido pelo site',
    tese: 'O Brio está parado desde 29/10. Antes de anunciar, ele precisa voltar a existir: <b>perfil vivo com 3 posts por semana</b>, o lanche real e enorme, humor de amigo e o <b>Combo da Galera</b> como porta de entrada. O tráfego entra depois da estreia.',
    moves: [['Escolher a data de entrada', 'Sugestão: 03/12, com os vídeos já gravados, pegando dezembro inteiro.'], ['Gravar antes de entrar', 'Quinta 26/11: mordida, combo, rua em São Lourenço e cozinha aberta.'], ['Não brigar em preço', 'Preço por pessoa no combo contra o artesanal avulso da praça (R$ 36,90 a R$ 44).']],
    decs: [
      ['Quando o Brio começa?', [['A', '27/11', 'entra na Black Friday e na 1ª parcela do 13º, com pouco tempo de preparo'], ['B', '03/12', 'entra com os vídeos gravados e pega dezembro inteiro', 1], ['C', 'Janeiro', 'entra nas férias, com mais tempo de preparo']]],
      ['Combo da Galera', [['A', '4 Brios + 2 fritas + refri 2 L', 'composição proposta, preço mostrado “por pessoa”', 1], ['?', 'Preço final', 'a decidir com vocês']]],
      ['Primeiro pedido pelo site', [['A', 'Mimo no 1º pedido', 'cria o hábito do canal próprio; só se o site aceitar cupom', 1], ['B', 'Sem mimo', 'a entrada se apoia só no Combo da Galera']]],
      ['Data de gravação', [['A', 'Quinta 26/11', 'vídeos prontos antes da entrada', 1], ['B', 'Quinta 03/12', 'só se a entrada for em janeiro']]],
    ],
    decMap: { 1: 1 },
    syn: ['<b>Gravação junto com as outras marcas</b> (24, 25 e 26/11): mesma equipe da Ellcazo', 'Cada marca, uma ocasião: <b>juntar a galera = Brio</b>; família em casa = VOVINA', 'Cartão com QR na caixa do Brio: “Confraternização? Fornario”', 'Um só criador local para o grupo, em dias diferentes; <b>relatório único toda segunda</b>'],
    need: ['<b>Data de entrada</b> (decisão 1)', '<b>Site do Brio:</b> endereço e se aceita cupom', '<b>Preços e composição</b> do Combo da Galera e da Sessão Brio', '<b>Horários</b> em 24, 25, 26 e 31/12 e 01/01', '<b>Quem responde</b> os pedidos e aprovação do criador local e de quem aparece nos vídeos'],
    steps: [['12/11', 'Decisões desta estratégia'], ['até 18/11', 'Site, preços e combos confirmados'], ['26/11', 'Diária de gravação Ellcazo'], ['03/12', 'Entrada (opção B): “Chegou o Brio” e 3 posts por semana'], ['1ª semana', 'Por que o Brio chega quente; Combo da Galera'], ['2ª semana', '“Tu é de São Lourenço…?” e quantos Brios pra tua galera'], ['12 e 13/12', 'Marca quem te deve um Brio'], ['17 a 20/12', '13º caiu: combo com extra da casa'], ['23 e 26/12', 'Hoje ninguém cozinha: Sessão Brio'], ['Toda segunda', 'Relatório único das marcas'], ['05/01', 'Balanço da entrada e plano de janeiro']],
    art: ['Abre na mordida; cartela final laranja Brio com “Pede pelo site”.', 'Fotos reais: chapa → caixa → moto → porta; setas simples, fundo laranja.', 'Combo aberto de cima ocupando metade da arte; preço por pessoa em Lilita One.', 'Câmera na mão na rua, legenda grande com sotaque; a mordida sempre na tela.', 'Tabela simples: 2, 4 e 6 pessoas → combo certo; fundo laranja.', 'Foto do Brio aberto + frase grande em Lilita One com contorno azul.', 'Combo com o extra destacado; selo “só até domingo”.', 'Foto real à noite: sofá, filme e Sessão Brio; texto curto.'],
    voice: ['Humor de amigo, gíria leve e sotaque de São Lourenço (“Oxe, tá vivendo errado, visse?!”).', 'O lanche real, aberto e enorme. Nada de foto de banco ou IA.'],
    saw: ['O melhor post foi o Brio Matuto em close (2.431 views); a abordagem na rua fez 273', 'Perfil parado desde 29/10: a entrada recomeça do zero', 'No nicho, mordida em 7 s (1,19 mi), combo “marca quem divide” (282 mil) e humor de bastidor (361 mil)'],
    ask: ['<b>Mordida em até 3 segundos</b>', 'Gancho no 1º segundo, com sotaque', 'Vídeo e foto reais, lo-fi', 'Fecha com <b>“Pede pelo site”</b>', 'Cortes de 7 a 15 s para stories e, depois, anúncio'],
    who: { B1: ['Ninguém; quem morde diz uma palavra', 'Ellcazo, na diária'], B2: ['Entrevistador da casa e gente na rua', 'Ellcazo, na rua'], B3: ['A galera (amigos da casa)', 'Ellcazo, na diária'], B4: ['Ninguém', 'Ellcazo, na diária'], B5: ['Ingrid e equipe', 'Ellcazo, na cozinha aberta'], B6: ['Criador local', 'Criador + Ellcazo de apoio'], B7: ['Quem faz a maionese, uma frase', 'Ellcazo, na diária'], B8: ['Motoboy (humor)', 'Ellcazo, à noite'] },
  },
}

// ---------------- páginas ----------------
function cover(d, brand, kicker, title, sub) {
  d.raw(`<section class="pg cover" id="%ID%">
  <div class="cv-top"><img src="${logo}" alt="Peformake"><span>Peformake · assessoria de marketing</span></div>
  <div class="cv-main">
    <div class="cv-kicker">${kicker}</div>
    <div class="cv-brands">${brand}</div>
    <div class="cv-title">${title}</div>
    <div class="cv-sub">${sub}</div>
  </div>
  <div class="cv-foot"><span>Para ${brand} e equipe Peformake · 12/11/2026</span><span>Período: <b>${PER}</b></span></div>
</section>`)
}

function diagFornario(d) {
  const f = [['Investido', 'R$ 77,47', 100], ['Impressões', '11.808', 100], ['Cliques', '387', 62], ['Visitas ao perfil', '414', 64], ['Conversas no WhatsApp', '0', 0], ['Reservas ou pedidos', '0', 0]]
  d.page('pf', 'Diagnóstico 1 de 3 · O que vimos em números', 'Maior audiência da cidade, mas a atenção não vira reserva medida', `
  <div class="dg">
    <div>
      <h3 class="h3">O caminho do anúncio (03 a 10/11)</h3>
      <div class="fun">${f.map((x) => `<div class="fr ${x[2] === 0 ? 'zero' : ''}"><span class="fl2">${x[0]}</span><div class="fb"><i style="width:${Math.max(x[2], 2)}%"></i></div><b>${x[1]}</b></div>`).join('')}</div>
      <p class="cap2">R$ 0,19 por visita, CTR 3,3%, anúncio no ar em 5 dos 7 dias previstos. <b>O funil para no perfil:</b> nada registra conversa, reserva ou pedido.</p>
      <div class="mat"><b>5<small>/10</small></b><span>Maturidade digital. Instagram forte (60 mil seguidores, nota 4,8 no Google); site, medição e WhatsApp fracos.</span></div>
    </div>
    <div class="swot">
      <div class="sw s1"><h4>Forças</h4>${ul(['Maior audiência da cidade e nota 4,8 no Google', 'Único que fala de massa de 48 h e ingrediente importado'])}</div>
      <div class="sw s2"><h4>Fraquezas</h4>${ul(['0 conversas e 0 reservas medidas no anúncio', 'Cinco nomes diferentes nos canais; Calabresa de 8 fatias “serve 1” no iFood'])}</div>
      <div class="sw s3"><h4>Oportunidades</h4>${ul(['Nenhuma pizzaria da cidade anuncia reserva de mesa ou grupo', 'Sexta e sábado somam 33,4% das compras em pizzaria'])}</div>
      <div class="sw s4"><h4>Ameaças</h4>${ul(['Restaurant Guru mostra nota 0,9 a quem busca o nome', 'Marguerita a R$ 45 na concorrente × R$ 60 aqui, sem o motivo explicado'])}</div>
    </div>
  </div>
  <h3 class="h3" style="margin-top:22px">Riscos e como evitar</h3>
  <div class="risks">${[['WhatsApp sem resposta rápida no pico', 'Um responsável por turno e prazo de resposta antes de subir a campanha.'], ['Oferta de fim de ano não ficar pronta', 'Cardápio, preço por pessoa e data limite fechados até 18/11.'], ['Preço acima dos vizinhos sem motivo', 'Corrigir o “serve 1” no iFood e abrir as descrições com a massa de 48 horas.']].map((r) => `<div class="rk"><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div>`, { cls: 'dense' })
}

function tesePage(d, brand, b) {
  d.page('pf', `${brand} · A estratégia em uma página`, b.teseTitle, `
  <div class="tese">
    ${card(`${brand} <span class="pill">${b.role}</span>`, b.card, 'tcard')}
    <div class="tright">
      <div class="thesis"><span>A tese</span><p>${b.tese}</p></div>
      ${b.moves.map((m, i) => `<div class="mv"><b>${i + 1}</b><div><h4>${m[0]}</h4><p>${m[1]}</p></div></div>`).join('')}
    </div>
  </div>`, { cls: 'dense' })
}

function offerPage(d, brand, x) {
  d.page('pf', `${brand} · Ofertas e vendas`, x.offerTitle, `
  <div class="offers g${x.offers.length}">${x.offers.map((o) => `
    <div class="card offer ${o.main ? 'main' : ''}">
      ${o.main ? '<span class="badge">principal</span>' : ''}
      <h3>${o.name}</h3>
      <div class="kv"><span>O quê</span>${o.what}</div>
      <div class="kv"><span>Condição</span>${o.cond}</div>
      <div class="kv"><span>Para quem</span>${o.who}</div>
      <div class="kv"><span>Por que agora</span>${o.why}</div>
    </div>`).join('')}
  </div>
  ${x.offerNote ? `<p class="note">${x.offerNote}</p>` : ''}`, { cls: 'dense' })
}

function trafPage(d, brand, x) {
  d.page('pf', `${brand} · Tráfego em resumo`, x.trafTitle, `
  ${x.trafNow ? `<div class="now">${x.trafNow}</div>` : ''}
  <div class="g2t">
    <div>
      <h3 class="h3">Campanhas</h3>
      <div class="camps">${x.camps.map((c) => `<div class="camp"><div class="cp"><b>${c[1]}%</b></div><div><h4>${c[0]}</h4><p>${c[2]}</p><p class="cr">Criativos: ${c[3]}</p></div></div>`).join('')}</div>
    </div>
    <div>
      <h3 class="h3">Verba sugerida (para decidir)</h3>
      <div class="opts">${x.budget.map((o) => `<div class="opt ${o.rec ? 'rec' : ''}"><b>${o.k}</b><strong>${o.v}</strong><span>${o.d}</span>${o.rec ? '<em>recomendada</em>' : ''}</div>`).join('')}</div>
      <h3 class="h3" style="margin-top:16px">Metas e o que medir</h3>
      ${ul(x.goals)}
    </div>
  </div>`, { cls: 'dense' })
}

function entradaBrio(d) {
  d.page('pf', 'Brio Burguer · Entrada e tráfego em resumo', 'Primeiro entrar e ganhar ritmo; o anúncio vem depois', `
  <div class="now"><b>Hoje:</b> perfil parado desde 29/10, 5.076 seguidores, ≈ 680 views de média e <b>nenhum anúncio</b>. Anunciar um perfil parado é pagar para mostrar vitrine vazia: a entrada vem antes.</div>
  <div class="g2t">
    <div>
      <h3 class="h3">Plano de entrada</h3>
      <div class="camps">${[
        ['1', 'Perfil vivo de novo', 'A partir da entrada, 3 posts por semana (quarta, sexta e domingo) e stories todo dia com o pedido saindo.'],
        ['2', 'Estreia com o Combo da Galera', 'Reel “Chegou o Brio” no 1º dia e o combo para dividir de quinta a domingo, com “Pede pelo site” em toda peça.'],
        ['3', 'A cidade apresentando o Brio', 'Reel de rua “Tu é de São Lourenço e não conhece?” e, se aprovado, um criador local na entrada.'],
      ].map((c) => `<div class="camp"><div class="cp"><b>${c[0]}</b></div><div><h4>${c[1]}</h4><p>${c[2]}</p></div></div>`).join('')}</div>
    </div>
    <div>
      <h3 class="h3">Quando o tráfego entra</h3>
      ${ul(['Só <b>depois da entrada</b>, com o site recebendo pedidos e o perfil postando no ritmo', 'Começa com os <b>cortes curtos da diária</b> (mordida e combo), o mesmo formato que já leva cliques baratos na VOVINA', 'Objetivo e verba definidos com vocês na entrada; até lá, nenhum gasto com anúncio'])}
      <h3 class="h3" style="margin-top:16px">Metas da entrada</h3>
      ${ul(['3 posts por semana, sem buracos', 'Reels de 438 para <b>1.500 views</b> de média', 'Pedidos pelo site contados por semana, com “Vi no Instagram”'])}
    </div>
  </div>`, { cls: 'dense' })
}

function decPage(d, brand, b) {
  const nd = b.decs.length
  d.page('pf', `${brand} · Decisões`, `${nd === 5 ? 'Cinco' : 'Quatro'} escolhas para o plano ir ao ar`, `
  <div class="decs">${b.decs.map((x, i) => `<div class="card dec"><h3><span class="num">${i + 1}</span>${x[0]}</h3>
    ${x[1].map((o) => `<div class="dopt ${o[3] ? 'rec' : ''}"><b>${o[0]}</b><div><strong>${o[1]}</strong><span>${o[2]}</span></div>${o[3] ? '<em>sugerida</em>' : ''}</div>`).join('')}
  </div>`).join('')}
  <div class="card syn1 ${nd === 4 ? 'span2' : ''}"><h3>Junto com o grupo</h3>${ul(b.syn)}</div></div>`, { cls: 'dense' })
}

function nextPage(d, brand, b) {
  d.page('pf', `${brand} · O que precisamos e próximos passos`, 'Com isto em mãos até 18/11, o plano roda sozinho', `
  <div class="g2n">
    <div class="card need"><h3>O que precisamos de vocês</h3>${ul(b.need)}</div>
    <div class="steps">${b.steps.map((s) => `<div class="st"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
  </div>`, { cls: 'dense' })
}

// social
function socialPages(d, brand, b, x) {
  d.page('pf', `${brand} · Pilares, ritmo e design`, x.socialTitle, `
  <div class="g2s">
    <div>
      <h3 class="h3">Pilares do conteúdo</h3>
      <div class="bars">${x.pillars.map((p) => `<div class="bar"><div class="bl"><b>${p[0]}</b><span>${p[2]}</span></div><div class="bt"><i style="width:${p[1]}%"></i><em>${p[1]}%</em></div></div>`).join('')}</div>
    </div>
    <div>
      <h3 class="h3">Ritmo da semana</h3>
      <div class="week">${x.week.map((w) => `<div class="wd"><b>${w[0]}</b><span>${w[1]}</span></div>`).join('')}</div>
      <h3 class="h3" style="margin-top:18px">Design: as regras do período</h3>
      ${ul(x.design)}
    </div>
  </div>`, { cls: 'dense' })

  const rows = cal.filter((r) => r[b.col] && r[b.col] !== '—')
  d.page('pf', `${brand} · Calendário do período`, `As datas que viram post e venda, de 12/11 a 31/12`, `
  <table class="cal cal1">
    <thead><tr><th>Quando</th><th>O que acontece</th><th>O que ${brand} publica e vende</th></tr></thead>
    <tbody>${rows.map((r) => `<tr class="${/Black Friday|2ª parcela/.test(r[1]) ? 'hot' : ''}"><td class="d">${r[0]}</td><td class="e">${r[1]}</td><td>${r[b.col].replace(/^Diária (\d)$/, 'Diária de gravação Ellcazo')}</td></tr>`).join('')}</tbody>
  </table>`, { cls: 'calpg' })

  for (let h = 0; h < 2; h++) {
    const part = x.pieces.slice(h * 4, h * 4 + 4)
    d.page('pf', `${brand} · Peças do período · ${h + 1} de 2`, h === 0 ? x.piecesTitle : x.piecesTitle.replace(/^8 peças/, 'As peças') + ' (continuação)', `
    <div class="pieces p4">${part.map((p, j) => { const i = h * 4 + j; return `
      <div class="card pc"><div class="pch"><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="fmt">${p[1]}</span><span class="obj">objetivo: ${p[2]}</span><span class="wh">${p[4]}</span></div>
      <h3>${p[0]}</h3>
      <div class="kv"><span>Copy</span><p class="copy">“${p[3]}”</p></div>
      <div class="kv art"><span>Direção de arte</span>${b.art[i]}</div></div>` }).join('')}
    </div>`, { cls: 'dense' })
  }
}

// audiovisual
function avCover(d, brand, b) {
  d.raw(`<section class="pg avcover" id="%ID%">
  <div class="ac-top">${ell('#0A0A0A', 44)}</div>
  <div class="ac-main">
    <div class="ac-brand">${brand}</div>
    <div class="ac-kicker">Conteúdo de gravação</div>
    <div class="ac-title">Novembro<br>e Dezembro</div>
    <div class="ac-per">12/11 a 31/12/2026</div>
  </div>
</section>`)
}

function studyPage(d, brand, b, x) {
  d.page('av', `${brand} · Estudo da comunicação`, x.avTitle, `
  <p class="avlead2">${x.avLead}</p>
  <div class="study">
    <div class="card st1"><h3>Como ${brand} fala</h3><p class="voice">${b.voice[0]}</p><p class="voice2">${b.voice[1]}</p></div>
    <div class="card st2"><h3>O que já vimos</h3>${ul(b.saw)}</div>
    <div class="card st3"><h3>O que isso pede do vídeo</h3>${ul(b.ask)}</div>
  </div>`, { cls: 'avw' })
}

const extraCss = `
/*cover-v3*/
.avcover{padding:60px 80px!important}
.avcover .ac-top{position:absolute;left:80px;top:60px}
.avcover .ac-main{position:absolute;left:80px;bottom:84px;margin:0;max-width:1100px}
.avcover .ac-brand{font:700 30px Inter;letter-spacing:-.01em;margin-bottom:26px}
.avcover .ac-kicker{display:inline-block;background:transparent;color:#0A0A0A;border:2px solid #0A0A0A;font:800 15px Inter;letter-spacing:.12em;text-transform:uppercase;padding:8px 18px;border-radius:999px;margin-bottom:22px}
.avcover .ac-title{font:800 150px/.92 'Inter Display',Inter;letter-spacing:-.045em;margin:0}
.avcover .ac-per{font:600 24px Inter;margin-top:26px}
/*com*/
.compg .tone{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.tc{background:#fff;border:2px solid #0A0A0A;border-radius:16px;box-shadow:6px 6px 0 #0A0A0A;padding:16px 18px;display:flex;flex-direction:column}
.tc h3{font:800 22px 'Inter Display',Inter;margin-bottom:6px}.tc p{font-size:15.5px;line-height:1.35;margin-bottom:12px}
.tc q{display:block;margin-top:auto;background:#B5E61D;border:2px solid #0A0A0A;border-radius:10px;padding:9px 11px;font:italic 600 15px/1.35 Inter;quotes:'“' '”'}
.avoid{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:20px 0 18px}.avoid b{font:800 16px Inter;margin-right:4px}
.avoid span{background:#fff;border:2px solid #0A0A0A;border-radius:999px;padding:5px 13px;font:600 14px Inter}
.lang{display:grid;grid-template-columns:330px 1fr;gap:20px}
.lrule{background:#fff;border:2px solid #0A0A0A;border-radius:16px;box-shadow:6px 6px 0 #0A0A0A;padding:20px 22px;font:800 27px/1.18 'Inter Display',Inter;display:flex;flex-direction:column;justify-content:center}
.lrule small{font:800 12px Inter;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
.lrows{display:flex;flex-direction:column;gap:8px}
.lr{display:grid;grid-template-columns:170px 1fr;align-items:center;background:#fff;border:2px solid #0A0A0A;border-radius:10px;box-shadow:3px 3px 0 #0A0A0A;padding:8px 14px;font-size:15.5px}.lr b{font:800 15px Inter}
/*fotos*/
.fotos{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:6px}
.fg h3{font:800 14px Inter;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px}
.fr3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ft{display:flex;flex-direction:column;color:#0A0A0A;text-decoration:none}
.ft img{width:100%;height:372px;object-fit:cover;border:2px solid #0A0A0A;border-radius:12px;box-shadow:4px 4px 0 #B5E61D,4px 4px 0 2px #0A0A0A;display:block}
.ft span{font:700 15px/1.28 Inter;margin-top:12px}.ft small{font-size:11.5px;color:#555;margin-top:3px}
/*video v3*/
.idea{display:flex;flex-direction:column}.idea b{align-self:flex-start}
.adapt .src{font-size:12.5px;color:#444;font-weight:600;text-decoration:underline;text-decoration-color:#0A0A0A}
.lrule{font-size:31px!important}
.rot{margin-top:10px;padding-top:9px;border-top:2px dashed #0A0A0A}
.rot span{display:block;font:800 10.5px Inter;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}
.rot i{display:block;font-style:normal;font-size:14.5px;line-height:1.34;margin-bottom:3px}
.adapt{font-size:14.5px;line-height:1.38;border:2px solid #0A0A0A;border-radius:12px;padding:9px 13px;background:#fff;margin:-4px 0 16px}
.avl .adapt{background:#fff}.avw .adapt{background:#F3FBDA}
.adapt b{font:800 11px Inter;letter-spacing:.06em;text-transform:uppercase;margin-right:5px}.adapt span{font-weight:800;margin:0 6px}

.tese{display:grid;grid-template-columns:1fr 1.2fr;gap:28px;height:100%}
.tcard{padding:26px 28px}.tcard h3{font-size:25px;margin-bottom:16px}.tcard .lead{font-size:20px;margin-bottom:18px}.tcard .kv{font-size:18.5px;margin-bottom:16px}.tcard .kv span{font-size:12px}.tcard .goal{font-size:18.5px;margin-top:22px;padding:16px 18px}
.risks{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.rk{background:#fff;border:2px solid var(--dk);border-left:8px solid #C0392B;border-radius:12px;padding:10px 14px}.rk b{display:block;font:800 15px Inter;margin-bottom:3px}.rk span{font-size:14px;line-height:1.35;display:block}
.tright{display:flex;flex-direction:column;gap:12px}
.thesis{background:#fff;border:2px solid var(--dk);border-left:12px solid var(--cy);border-radius:14px;padding:14px 18px}
.thesis span{display:block;font:800 11.5px Inter;text-transform:uppercase;letter-spacing:.08em;color:var(--pe);margin-bottom:5px}
.thesis p{font-size:17.5px;line-height:1.42}
.dg{display:grid;grid-template-columns:1.05fr 1fr;gap:30px}
.fun{display:flex;flex-direction:column;gap:7px;background:#fff;border:2px solid var(--dk);border-radius:14px;padding:14px 16px;box-shadow:5px 5px 0 var(--dk)}
.fr{display:grid;grid-template-columns:170px 1fr 82px;align-items:center;gap:10px;font-size:14.5px}
.fr .fl2{font-weight:600}.fr b{font:800 17px Inter;text-align:right}
.fb{height:20px;background:#E3F7FA;border-radius:6px;overflow:hidden}.fb i{display:block;height:100%;background:var(--pe);border-radius:6px}
.fr.zero b{color:#C0392B}.fr.zero .fb i{background:#C0392B}
.cap2{font-size:14.5px;line-height:1.4;margin:14px 0 12px}
.mat{display:flex;gap:14px;align-items:center;background:var(--dk);color:#fff;border-radius:14px;padding:12px 16px}
.mat b{font:800 40px 'Inter Display';color:var(--cy);line-height:1}.mat small{font-size:18px;color:#bfe9ef}.mat span{font-size:14.5px;line-height:1.35;color:#d6eef1}
.swot{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:14px}
.sw{border:2px solid var(--dk);border-radius:14px;padding:14px 15px;background:#fff;box-shadow:4px 4px 0 var(--dk)}
.sw h4{font:800 16px Inter;margin-bottom:9px;text-transform:uppercase;letter-spacing:.05em;font-size:13px;color:var(--pe)}
.sw ul li{font-size:14.8px;margin-bottom:9px}
.sw.s1,.sw.s3{background:#E3F7FA}
.decs .syn1{padding:14px 16px;box-shadow:5px 5px 0 var(--dk);background:var(--dk);color:#fff}
.decs .syn1 h3{font-size:18px;color:var(--cy)}.decs .syn1 ul li{font-size:14.3px;margin-bottom:8px;line-height:1.3}
.decs .span2{grid-column:span 2}
.cal1 td.e{width:300px}.cal1{font-size:15px}.calpg .cal1 td{padding:7px 12px}
.pieces.p4{grid-template-columns:1fr 1fr;grid-auto-rows:minmax(0,1fr);gap:20px}
.p4 .pc{padding:15px 20px;display:flex;flex-direction:column}
.p4 .pc h3{font-size:23px;margin:6px 0 9px}
.p4 .pc .kv{margin-bottom:9px}.p4 .pc .copy{font-size:16.5px;line-height:1.36}.p4 .art{font-size:15.5px;line-height:1.38}
.pch .wh{margin-left:auto;font:700 13px Inter;color:var(--pe)}
.avcover{background:#B5E61D;color:#0A0A0A;padding:52px 72px}
.ac-logo{position:absolute;right:90px;top:50%;transform:translateY(-50%);opacity:.95}
.ac-top{display:flex;align-items:center;gap:14px;font:600 15px Inter;position:relative;z-index:2}
.ac-main{margin-top:auto;margin-bottom:auto;max-width:860px;position:relative;z-index:2}
.ac-kicker{display:inline-block;background:#0A0A0A;color:#B5E61D;font:800 14px Inter;letter-spacing:.08em;text-transform:uppercase;padding:7px 16px;border-radius:999px;margin-bottom:26px}
.ac-brand{font:800 66px/1.03 'Inter Display',Inter;letter-spacing:-.03em}
.ac-title{font:700 40px/1.1 'Inter Display',Inter;margin-top:10px}
.ac-sub{font:400 20px/1.42 Inter;margin-top:22px;max-width:680px}
.ac-foot{display:flex;gap:40px;font:600 15px Inter;position:relative;z-index:2}
.avlead2{font-size:17px;line-height:1.4;margin:-4px 0 18px;max-width:1080px}
.study{display:grid;grid-template-columns:1fr 1.15fr 1.1fr;gap:24px}
.study .card{padding:22px 24px;min-height:430px}.study .card h3{font-size:22px;margin-bottom:16px}
.study .st1{background:#B5E61D}.study .voice{font:800 30px/1.18 'Inter Display',Inter;margin-bottom:18px}.study .voice2{font-size:19px;line-height:1.45}
.study ul li{font-size:18px;margin-bottom:18px;line-height:1.38}.study ul li:before{background:#B5E61D;border-color:#0A0A0A}
.need{padding:24px 26px}.need h3{font-size:24px;margin-bottom:16px}.need ul li{font-size:18px;margin-bottom:18px;line-height:1.4}
.who{display:flex;gap:10px;margin:-6px 0 14px;flex-wrap:wrap}
.who span{font-size:14.5px;border:2px solid #0A0A0A;border-radius:10px;padding:5px 11px;background:#fff}
.who b{font:800 11px Inter;text-transform:uppercase;letter-spacing:.06em;margin-right:7px}
.avw .who span{background:#F3FBDA}
`

function html(title, pages) {
  const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8') + extraCss
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
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
}


module.exports={Doc,cover,html,card,ul,logo,PER}
