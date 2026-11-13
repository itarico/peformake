// Páginas de gravação (Ellcazo): uma página por vídeo + a diária
const fs = require('fs')
const path = require('path')
const R = require('./roteiros.js')
const refs = JSON.parse(fs.readFileSync(path.join(__dirname, 'refs.json'), 'utf8'))
const thumb = (k) => {
  const f = path.join(__dirname, 'thumbs', k + '.jpg')
  return fs.existsSync(f) ? 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64') : null
}

// [código, selo, título, direção, [ideias: [nome, direção]], [quem grava], roteiro de apoio, rótulo da referência]
const V = {
  Fornario: {
    intro: '10 vídeos, 30 ideias. 5 entram no contrato do mês; o resto vira estoque para janeiro e para anúncio.',
    list: [
      ['F1', 'Diária 24/11 · Prova · Reel', 'A sua pizza começou anteontem', 'A massa de 48 horas contada em imagens: quase sem fala, close e luz quente.',
        [['A história da massa', 'Conte em uma frase por que a massa daqui descansa 48 horas.'], ['O processo', 'Mostre a massa crescendo e as mãos dobrando. Fale só: “começou anteontem”.'], ['A prova na mão', 'Abra a borda na frente da câmera e diga o que a pessoa vai sentir.']],
        ['Timelapse da massa (celular fixo por 2 h)', 'Macro nas mãos e na borda abrindo', 'Som do forno, cortes de 1 a 2 s, final na pizza inteira'],
        'Gancho: “Poucas pessoas sabem que a sua pizza começou anteontem.” Fecha com “Reserve pelo WhatsApp”.', 'Pizza napolitana de longa fermentação · 1,08 mi views'],
      ['F2', 'Diária 24/11 · Desejo · Reel', 'Deep Dish: o corte', 'Um corte e um queijo que não acaba. Ninguém fala até o fim.',
        [['A apresentação', 'Mostre a Deep Dish chegando à mesa e o primeiro corte. Só a reação.'], ['Os bastidores', 'Mostre a mussarela caindo na forma. Fale só o número: “1 quilo”.'], ['A família provando', 'Mostre a família tirando as fatias; alguém diz em uma palavra o que achou.']],
        ['Câmera lenta (60 fps) no corte e no puxa-queijo', 'Plano de cima da forma inteira', 'Som da faca e da crosta; texto só no fim'],
        'Texto na tela: “1 kg de mussarela. Olha o corte.” Fecha com a encomenda de Natal.', 'Deep dish com queijo puxando · 2,28 mi views'],
      ['F3', 'Diária 24/11 · Prova · Reel', 'Por que essa Marguerita custa R$ 60', 'Mostrar que o preço tem motivo, sem tom de defesa.',
        [['Insumo por insumo', 'Conte cada ingrediente enquanto ele cai na massa: o que é e por que esse.'], ['A conta na tela', 'Mostre a pizza cortada em 8. Fale: “R$ 60, oito fatias, para dividir”.'], ['Vale o preço?', 'Convide um cliente a provar e dizer, sincero, se vale.']],
        ['Ingredientes em close sobre a bancada escura', 'Pizzaiolo de meio corpo, luz lateral quente', '1 s por ingrediente; final lento na fatia'],
        'Gancho: “Por que essa Marguerita custa R$ 60?”', '“O CLT banca?”: criador testa pizza cara · 214 mil views'],
      ['F4', 'Diária 24/11 · Desejo · Reel de 15 s', 'Forno a lenha, só som', 'O forno é o personagem: fogo, pá e borda estalando.',
        [['Só o som', 'Não fale. Deixe a lenha e a borda contarem.'], ['O ritual', 'Mostre a pá entrando e saindo. Fale só a temperatura do forno.'], ['A escolha', 'Fale um pouco sobre por que o Fornario usa forno a lenha.']],
        ['Microfone perto da boca do forno', 'Contraluz da chama no rosto do pizzaiolo', 'Loop: começa e termina na pá saindo'],
        'Legenda curta: “Pressa não entra na receita.”', 'Pizzaria com forno a lenha, novo sabor · 2,4 mi views'],
      ['F5', 'Diária 24/11 · Lugar · Reel', 'Chegar na Praça do Canhão', 'O endereço é o gancho: da praça até a mesa posta.',
        [['A descoberta', 'Pergunte para a câmera: “Você sabia que na Praça do Canhão tem…?” e caminhe até a mesa.'], ['O casal', 'Mostre um casal chegando e sentando. Fale só o convite para reservar.'], ['A noite chegando', 'Mostre a fachada no fim de tarde e as luzes acendendo.']],
        ['Plano-sequência da praça à mesa (estabilizador)', 'Hora dourada: 17h30 às 18h', 'Fachada, mesa posta, primeiro brinde'],
        'Fecha com “Reserve pelo WhatsApp”.', 'O melhor Reel do próprio Fornario · 5.936 views'],
      ['F6', 'Diária 24/11 · Gente · Reel', 'Quem faz a sua pizza', 'Rostos e nomes da casa; uma frase de cada um.',
        [['A história', 'Fale um pouco sobre como você chegou ao Fornario.'], ['O preferido', 'Diga qual pizza você pediria para a sua família e por quê.'], ['Antes de abrir', 'Mostre o que você faz antes de a casa abrir.']],
        ['Retrato de meio corpo com o forno ao fundo', 'Cada pessoa: 1 frase, 3 a 5 s', 'Final com a equipe junta'],
        'Abre com: “Quem está por trás da sua pizza?”', 'Equipe do Fornario · 2.834 views'],
      ['F7', 'Diária 24/11 · Desejo · Reel', 'Camarão grande, de verdade', 'Cor, brilho e tamanho do camarão em close. Pouca fala.',
        [['A produção', 'Mostre o camarão caindo na pizza, um a um. Fale só: “camarão grande, de verdade”.'], ['Saindo do forno', 'Mostre vapor e brilho na saída do forno, sem fala.'], ['A primeira garfada', 'Garfo levantando um camarão inteiro e a reação de quem prova.']],
        ['Macro no camarão', 'Luz quente lateral, fundo escuro', 'Câmera lenta no garfo'],
        'Texto: “Camarão 16/20. Só tem aqui.”', 'Pizza de camarão no Recife · 570 mil views'],
      ['F8', 'Confraternização real, até 05/12 · Venda · Reel', 'A mesa do grupo', 'Uma confraternização de verdade, gravada no salão.',
        [['Antes e depois', 'Mostre a mesa vazia posta e depois cheia, com o grupo brindando.'], ['Quem organizou', 'Peça a quem organizou contar em uma frase por que escolheu o Fornario.'], ['A chegada das pizzas', 'Mostre as pizzas chegando e todas as mãos indo à mesa.']],
        ['Plano aberto de cima da mesa', 'Brinde em câmera lenta', 'Som ambiente de conversa e risada'],
        'Texto: “O seu grupo já tem mesa? Último dia: 19/12.”', 'Confraternização de empresa em pizzaria · 14 mil views'],
      ['F9', 'Confraternização real · Prova · Reel e stories', 'Quem foi conta', 'Clientes reais, uma frase cada, e a nota 4,8 no Google.',
        [['Na saída', 'Pergunte: “Em uma palavra, como foi?”'], ['A avaliação', 'Mostre o print de uma avaliação 4,8 sobre a pizza.'], ['O prato de novo', 'Peça ao cliente para apontar o prato que pediria de novo.']],
        ['Na porta, com a luz da fachada', 'Celular em pé, microfone de lapela', '3 clientes, 3 frases'],
        'Fecha com “Nota 4,8 no Google”.', 'Depoimento de cliente do Fornario · 1.829 views'],
      ['F10', 'Celular, 23 ou 24/12 · Gente · Reel', 'Véspera de Natal na cozinha', 'Bastidor sem filtro do dia mais corrido do ano.',
        [['O dia na cozinha', 'Narre em primeira pessoa o que está acontecendo agora.'], ['As encomendas saindo', 'Mostre as Deep Dish de Natal sendo embaladas e entregues.'], ['O recado da equipe', 'Cada um deseja boas festas em 3 palavras.']],
        ['Celular apoiado, cenas de 2 a 3 s', 'Som ambiente real', 'Final com a equipe junta'],
        'Pergunta no fim: “Qual pizza vai para a sua mesa no Natal?”', 'Pizza natalina de pizzaria · 504 mil views'],
    ],
    day: { title: 'Diária Fornario · terça 24/11', sub: '13h às 19h, casa fechada ou vazia (sugestão; data a decidir).', slots: [['13h', 'Massa, forno e borda: F1 e F4'], ['14h30', 'Pratos: Deep Dish, Marguerita e camarão (F2, F3 e F7)'], ['16h30', 'Equipe e pizzaiolo: F6. Mesa posta vazia (F8, “antes”)'], ['18h', 'Praça e fachada na luz do fim de tarde: F5']], out: ['Saem 7 dos 10 vídeos, cada um em 3 versões', 'Fotos para as 2 artes de anúncio', 'F8 e F9 numa confraternização marcada, até 05/12; F10 no celular, 23/12'] },
  },
  VOVINA: {
    intro: '9 vídeos, 27 ideias. 1 entra no contrato do mês; os cortes viram anúncio e stories.',
    list: [
      ['V1', 'Diária 25/11 · Família · Reel', 'A pizza que alimenta a família', 'A caixa abre e a família avança: desejo e bagunça boa.',
        [['A chegada', 'Mostre a caixa chegando e abrindo na mesa. Ninguém fala, todo mundo pega.'], ['Quantos comem?', 'Pergunte: “Quantas pessoas essa pizza alimenta?” e mostre a família.'], ['A disputa da borda', 'Mostre duas pessoas disputando a última fatia.']],
        ['Plano de cima, mãos entrando no quadro', 'Pizza sumindo, acelerada 2x', 'Som real de conversa'],
        'Texto: “Dezembro é mesa cheia. E a pizza é da Vó.”', '“Deu pra mais de 15”: pizza para a família · 283 mil views'],
      ['V2', 'Diária 25/11 · Como pedir · Reel', 'O meio a meio da família', 'Cada metade de um jeito, montada em close.',
        [['As duas metades', 'Mostre cada metade sendo montada. Fale só os sabores.'], ['Quem escolhe', 'Pai escolhe uma metade, filho a outra: “E a sua?”'], ['Em 3 toques', 'Grave a tela do celular montando o meio a meio no cardápio digital.']],
        ['Plano de cima da bancada', 'Tela dividida na edição', 'Gravação de tela do cardápio'],
        'Fecha com “Monte o seu pelo link da bio”.', 'Meio a meio de delivery · 161 mil views'],
      ['V3', 'Diária 25/11 · Qualidade · Reel', 'Borda escura é queimada?', 'O gancho é a pergunta; a resposta vem em imagem.',
        [['A resposta do pizzaiolo', 'Responda em uma frase por que a borda doura assim.'], ['O som da borda', 'Mostre a borda estalando na mão, sem fala.'], ['Feita sem pressa', 'Mostre a massa descansando e diga há quanto tempo ela espera.']],
        ['Macro na borda saindo do forno', 'Microfone perto da borda quebrando', 'Pergunta escrita no 1º segundo'],
        'Gancho em pergunta (rendeu 2,5× a afirmação no perfil).', '“Poucas pessoas sabem disso…” · 1,12 mi views'],
      ['V4', 'Diária 25/11 · Desejo · Reel curto', 'O queijo puxando', 'Fatia levantada, queijo que não acaba, o sabor da casa.',
        [['O sabor da Vó', 'Fale qual sabor é a cara da Vó Vina.'], ['Só o puxa-queijo', 'Sem fala: a fatia subindo em câmera lenta.'], ['Saindo do forno', 'Mostre a calabresa chiando ao sair do forno.']],
        ['Câmera lenta (60 fps)', 'Luz quente de frente', '7 a 15 s'],
        'Texto: “Pizza de vó, feita sem pressa.”', 'Concorrente no Centro (Marinho’s) · 45,7 mil views'],
      ['V5', 'Diária 25/11 · Lugar · Reel', 'Na Joaquim Nabuco tem…', 'Descoberta local: o endereço que o Centro reconhece.',
        [['Você sabia?', 'Pergunte: “Você sabia que na Joaquim Nabuco tem…?” e entre na loja.'], ['O motoboy', 'Mostre a caixa saindo e a moto passando pelo Centro.'], ['O balcão', 'Mostre a pizza no balcão e diga como pedir.']],
        ['Fachada com a placa visível', 'Moto em movimento (tripé na calçada)', 'Final no balcão'],
        'Fecha com o link do cardápio.', 'Pizzaria de São Lourenço com criador · 20,8 mil views'],
      ['V6', 'Diária 25/11 · Gente · Reel', 'Quem faz a sua pizza', 'O pizzaiolo pelo nome, com as mãos em ação.',
        [['A história', 'Conte há quanto tempo faz pizza e onde aprendeu.'], ['As mãos', 'Mostre só as mãos abrindo e montando, sem fala.'], ['O preferido', 'Diga o sabor que você pediria para a sua família.']],
        ['Close nas mãos', 'Rosto com o forno ao fundo', 'Cenas de 3 s'],
        'Abre com: “Conheça quem abre a massa da sua pizza toda noite.”', 'Pizzaiolo montando borda recheada · 4,7 mi views'],
      ['V7', 'Diária 25/11 · Prova · Reel e stories', 'Quem provou, voltou', 'Cliente de verdade, uma frase sobre a pizza.',
        [['Na retirada', 'Pergunte ao cliente: “O que você sempre pede?”'], ['Os prints', 'Mostre mensagens reais de clientes sobre a borda (autorizadas).'], ['Às cegas', 'Cliente prova duas metades e diz qual prefere.']],
        ['No balcão, na retirada', 'Microfone de lapela', 'Frases curtas, 3 clientes'],
        'Fecha com “Comente o seu sabor de sempre”.', 'Review comparando pizzas de casa · 601 mil views'],
      ['V8', 'Dezembro, se aprovada · Natal · Reel', 'A pizza de Natal da Vó', 'Noite em família com a pizza de Natal, edição limitada.',
        [['A revelação', 'Mostre a pizza (árvore ou doce) saindo do forno. Diga só: “edição limitada”.'], ['A noite do pijama', 'Mostre a família de pijama em volta da pizza, com luz de Natal.'], ['A última fatia', 'Nos stories: “Esgotou hoje”.']],
        ['Luz de Natal desfocada ao fundo', 'Mesa da família, plano médio', 'Som real, sem música da moda'],
        'Texto: “Pizza de Natal da Vó. Só em dezembro.”', 'Noite do pijama com pizza de Natal · 161 mil views'],
      ['V9', 'Com o criador, se aprovado · Alcance · Reel', 'A dica da cidade', 'Um criador de São Lourenço prova e indica.',
        [['A nota', 'Peça ao criador uma nota de 0 a 10 na primeira mordida.'], ['Vale ir buscar?', 'O criador mostra o caminho até o Centro.'], ['O desafio', 'O criador escolhe o meio a meio às cegas.']],
        ['Câmera do criador + nossa câmera de apoio', 'Reação na primeira mordida', 'Chamada para o cardápio no fim'],
        'Combinar a postagem em parceria (collab).', '@saolourencoordinario, dica da cidade · 46,9 mil views'],
    ],
    day: { title: 'Diária VOVINA · quarta 25/11', sub: '15h às 18h, antes de abrir (sugestão; data a decidir).', slots: [['15h', 'Forno, borda e queijo: V3 e V4'], ['16h', 'Meio a meio e pizzaiolo: V2 e V6'], ['17h', 'Família recebendo a caixa: V1'], ['17h40', 'Fachada e motoboy no Centro: V5']], out: ['Saem 6 dos 9 vídeos, cada um em 3 versões', 'Fotos da arte do Combo Família', 'V7 na retirada, num sábado; V8 se a pizza de Natal for aprovada; V9 com o criador'] },
  },
  'Brio Burguer': {
    intro: '8 vídeos, 24 ideias. 1 entra no contrato do mês; os cortes viram stories agora e anúncio quando o tráfego entrar.',
    list: [
      ['B1', 'Diária 26/11 · Desejo · Reel curto', 'A mordida', 'Mordida em até 3 segundos, queijo escorrendo.',
        [['Só a mordida', 'Sem fala: a mão aperta, a mordida, o molho cai.'], ['O Brio aberto', 'Mostre o lanche cortado ao meio, camada por camada.'], ['A reação', 'Quem morde diz uma palavra só.']],
        ['Câmera lenta', 'Fundo escuro, luz quente', '7 a 10 s'],
        'Texto: “Chega quente. Pede pelo site.”', 'Hambúrguer artesanal na parrilla · 175 mil views'],
      ['B2', 'Diária 26/11, na rua · Cidade · Reel', 'Tu é de São Lourenço e não conhece?', 'Gancho no 1º segundo, sotaque e prova na hora.',
        [['A pergunta na rua', '“Tu é de São Lourenço e não conhece o Brio?” e entregue o lanche.'], ['A nota', 'Peça uma nota de 0 a 10 depois da mordida.'], ['O desafio do molho', 'A pessoa tenta adivinhar o que vai na maionese.']],
        ['Lapela no entrevistador', 'A mordida sempre na tela', 'Cortes rápidos, 20 a 30 s'],
        'Fecha com “Oxe, tá vivendo errado, visse?! Pede pelo site.”', 'Gancho regional da Sandy Burguer · 77 mil views'],
      ['B3', 'Diária 26/11 · Venda · Reel', 'Combo da Galera na mesa', 'Combo aberto, mãos de todos: “marca quem divide”.',
        [['A chegada', 'Mostre o combo abrindo e as mãos atacando.'], ['A divisão', 'A galera rachando a conta (humor, sem roteiro).'], ['O preço por pessoa', 'Mostre na tela quanto sai por pessoa.']],
        ['Plano de cima da mesa', 'Acelerado nas mãos', 'Texto “Marca quem divide contigo”'],
        'Fecha com “Combo da Galera, só pelo site”.', 'Combo família “marca alguém” · 282 mil views'],
      ['B4', 'Diária 26/11 · Desejo · Reel', 'O corte do Brio', 'A faca desce e mostra a carne suculenta.',
        [['O corte', 'Sem fala: a faca descendo devagar.'], ['O contraste', 'Mostre o Brio ao lado de uma “folha de carne”.'], ['O ponto', 'Close do ponto da carne; diga só o peso.']],
        ['Macro em câmera lenta', 'Fundo neutro', 'Som da faca'],
        'Texto: “Chega de folha de carne.”', '“Chega de folha de carne” · 165 mil views'],
      ['B5', 'Diária 26/11 · Gente · Reel', 'Bastidor com humor', 'Humor real da cozinha, com a Ingrid.',
        [['O expediente', '“Aqui o expediente é assim”: mostre a correria do pedido.'], ['O pedido em 30 s', 'O pedido saindo do início ao fim, acelerado.'], ['A situação do dia', 'Mostre algo engraçado que aconteceu de verdade.']],
        ['Celular apoiado, sem encenar', 'Cenas reais de 2 a 4 s', 'Áudio original'],
        'Fecha com “Pede pelo site”.', 'Concorrente vizinho (Jurito), humor · 20,4 mil views'],
      ['B6', 'Se aprovado · Alcance · Reel', 'Criador local prova', 'Um criador do Recife ou de São Lourenço avalia o combo.',
        [['A avaliação', 'O criador prova e dá uma nota.'], ['Marca quem precisa conhecer', 'O criador chama o público para marcar alguém.'], ['O pedido pelo site', 'O criador faz o pedido pelo site na câmera.']],
        ['Câmera do criador + nossa de apoio', 'Mordida na tela', 'Post em parceria (collab)'],
        'Combinar o formato com o criador antes.', 'Criador do Recife avaliando hamburgueria · 103 mil views'],
      ['B7', 'Diária 26/11 · Prova · Reel', 'A maionese caseira', 'A maionese da casa em close: o que o cliente não vê.',
        [['O preparo', 'Mostre a maionese sendo feita. Diga só: “feita aqui”.'], ['A batata mergulhando', 'Sem fala: batata entrando no pote.'], ['A pergunta', '“Tu sabe o que vai na maionese do Brio?” (sem entregar a receita).']],
        ['Macro na textura', 'Bisnaga caindo no lanche', 'Som da batata crocante'],
        'Fecha com “Pede pelo site e prova”.', 'Maionese da casa de hamburgueria · 1,5 mi views'],
      ['B8', 'Diária 26/11, à noite · Prova · Reel', 'Chega quente', 'Da chapa à porta, sem esfriar.',
        [['O caminho', 'Chapa, caixa e moto em 15 s.'], ['A porta', 'A caixa abrindo com vapor na porta do cliente.'], ['O motoboy', 'Humor com o motoboy saindo e voltando.']],
        ['Chapa em close', 'Moto saindo à noite (tripé na calçada)', 'Vapor na abertura da caixa'],
        'Texto: “Chega quente em São Lourenço.”', 'Humor com os motoboys da hamburgueria · 256 mil views'],
    ],
    day: { title: 'Diária Brio · quinta 26/11', sub: '15h às 20h (sugestão; depende da data de entrada, decisão nº 1).', slots: [['15h', 'Produto: B1, B4 e B7'], ['16h30', 'Combo da Galera com amigos: B3 e fotos dos combos'], ['18h', 'Na rua em São Lourenço: B2'], ['19h30', 'Cozinha aberta: B5 e B8']], out: ['Saem 7 dos 8 vídeos, cada um em 3 versões', 'Fotos reais dos combos', 'B6 só com o criador aprovado'] },
  },
}

module.exports = function avPages(brand, page, who = {}, photoPage) {
  const d = V[brand]
  let k = 0
  d.list.forEach((v) => {
    const [code, selo, title, dir, ideas, grava, apoio, rlabel] = v
    const url = refs[code]; const img = thumb(code)
    const net = url.includes('tiktok') ? 'TikTok' : 'Instagram'
    const handle = url.includes('tiktok') ? '@' + url.split('/@')[1].split('/')[0] : ''
    const cls = (k++ % 2 === 0) ? 'avw' : 'avl'
    page('av', '', '', `
    <div class="vp">
      <a class="phone" href="${url}" target="_blank">
        ${img ? `<img src="${img}" alt="">` : `<div class="noimg">Abrir a referência</div>`}
        <span class="play">▶ Assistir no ${net}</span>
      </a>
      <div class="vmain">
        <div class="bname">${brand} · gravação ${k}/${d.list.length}</div>
        <div class="vtop"><span class="code">${code}</span><span class="selo">${selo}</span></div>
        <h2>${title}</h2>
        <p class="vdir">${dir}</p>
        ${who[code] ? `<div class="who"><span><b>Quem fala</b>${who[code][0]}</span><span><b>Quem grava</b>${who[code][1]}</span></div>` : ''}
        <p class="adapt"><b>A referência</b> ${R[code].ref[0]} <span>→</span> <b>No ${brand}</b> ${R[code].ref[1]}. <a class="src" href="${url}" target="_blank">${handle ? handle + ' · ' : ''}${rlabel}</a></p>
        <div class="ideas">${ideas.map((x, i) => `<div class="idea"><b>Ideia ${'ABC'[i]}</b><h4>${x[0]}</h4><p>${x[1]}</p><div class="rot"><span>Roteiro de apoio</span>${R[code].r[i].split(' | ').map((l) => `<i>${l}</i>`).join('')}</div></div>`).join('')}</div>
      </div>
    </div>`, { brand, cls: cls + ' vpg' })
  })
  if (photoPage) photoPage()
  // diária
  page('av', `${brand} · Gravação · A diária`, d.day.title, `
    <div class="dayp">
      <div class="card slotsc"><p class="dsub">${d.day.sub}</p>
        ${d.day.slots.map((s) => `<div class="slot"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
      <div class="card outc"><h3>O que sai da diária</h3><ul>${d.day.out.map((o) => `<li>${o}</li>`).join('')}</ul>
        <p class="dnote">${d.intro}</p></div>
    </div>`, { brand, cls: 'avl dense' })
}
