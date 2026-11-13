// Raph Modas (brechó chique): só o Planejamento de audiovisual, no design aprovado (build3.js / sn.js).
const fs = require('fs')
const path = require('path')
const GEN = __dirname
const src = fs.readFileSync(path.join(GEN, 'build3.js'), 'utf8')
const partA = src.slice(0, src.indexOf('// ---------------- conteúdo por marca'))
const partB = src.slice(src.indexOf('// ---------------- páginas'), src.indexOf('D.Fornario.pieces[3][3]'))
const K = new Function('require', '__dirname', partA + partB + '\nreturn { Doc, card, ul, cover, tesePage, offerPage, avCover, studyPage, html, ell, logo, PER }')(require, GEN)
const { Doc, ul, avCover, studyPage, html } = K

const BR = 'Raph Modas'
const OUT = path.resolve(GEN, '..', 'raph')
fs.mkdirSync(OUT, { recursive: true })
const img = (k) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(GEN, 'raph_thumbs', k + '.jpg')).toString('base64')
const YT = (id) => 'https://www.youtube.com/shorts/' + id

const AVX = {
  avTitle: 'O achado conta a história: a marca, o caimento e o look pronto',
  avLead: 'Brechó chique: trends, moda sustentável e curadoria. 10 vídeos com 3 ideias cada, todos ligados à tese do período: <b>o look de festa garimpado</b>, da Black Friday consciente ao Réveillon. Duas diárias sugeridas, uma em novembro e outra em dezembro.',
}
const bv = {
  voice: ['Fala de curadora: segura, leve e sofisticada.', 'Fala de marca, tecido e caimento como loja de grife. O preço aparece como surpresa boa, nunca como “baratinho”. Sustentabilidade é charme, não sermão.'],
  saw: ['A Raph ainda não tem Instagram nem site no cadastro: o @ da loja precisa ser confirmado com a Rejane', 'No nicho, “brechó não é roupa barata” passou de <b>1,3 milhão</b> de views e “montando looks com o que garimpei” chegou a <b>375 mil</b>', 'No Recife, brechós como o Le Griffe já gravam tour pela loja e “por que todo mundo quer ir lá”'],
  ask: ['Peça <b>na mão e no corpo</b>: etiqueta, tecido e caimento em close', 'Gancho de achado no 1º segundo: “olha o que chegou”', 'Preço como surpresa: <b>valor de loja × valor Raph</b>', 'Look pronto para uma ocasião: festa, Natal, Réveillon', 'Fecha com <b>“Reserva no direct”</b>: peça única não espera'],
}
const COM = {
  title: 'Como a Raph fala nos vídeos',
  tone: [
    ['Curadora', 'Escolhe por você: fala de marca, tecido e caimento.', 'Essa eu separei pensando na sua festa.'],
    ['Chique sem pose', 'Elegante e próxima, como a amiga que entende de moda.', 'É de marca, e ninguém vai ter igual.'],
    ['Peça única', 'Cada achado é um só: urgência de verdade, sem gritar.', 'Tem uma. Quando sair, saiu.'],
    ['Consciente com charme', 'A sustentabilidade aparece no detalhe, nunca como sermão.', 'Estilo que já tinha história.'],
  ],
  avoid: ['“Usado” e “baratinho”', 'Roupa amassada ou no chão', 'Arara bagunçada ao fundo', 'Sermão sobre o planeta', 'Preço gritado em vermelho', 'Marca sem confirmar'],
  rule: 'Se parece loja de grife e o preço surpreende, é Raph.',
  lang: [['Câmera na mão', 'Vertical 9:16, seguindo a peça da arara ao provador.'], ['Close de etiqueta', 'Marca, tecido e acabamento: a prova de qualidade.'], ['Corpo inteiro', 'Look vestido no espelho ou na rua; nunca só no cabide.'], ['Luz', 'Luz de janela ou ring light; fundo limpo, arara organizada.'], ['Ritmo', '15 a 35 s; corte a cada troca de peça, áudio em alta.']],
}

function tesePage(d) {
  const F = [
    ['12 a 26/11', 'Apresentar a Raph', 'Quem é, o que tem e por que é diferente: achados da semana, curadoria e desapego.', 'R1 · R2 · R5 · R8'],
    ['24 a 30/11', 'Black Friday consciente', 'Peça de marca pelo preço de uma básica. Sem liquidação gritada: a arara Black e a etiqueta × preço Raph.', 'R6 · R3'],
    ['01 a 31/12', 'Look de festa garimpado', 'Confraternização, Natal e Réveillon com peça única; o presente que ninguém vai ter igual.', 'R4 · R7 · R9 · R10'],
  ]
  d.page('av', `${BR} · A tese do período`, 'Fim de ano com peça única: o look de festa garimpado', `
  <p class="avlead2">Em dezembro todo mundo procura roupa de festa e quase todo mundo compra o mesmo vestido. A Raph vende o contrário: <b>a peça de marca que ninguém mais vai ter</b>, escolhida por uma curadora, pelo preço de uma peça comum. Cada vídeo leva a uma reserva no direct ou no WhatsApp.</p>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:8px">${F.map((f) => `
    <div class="tc" style="padding:20px 22px;min-height:330px"><small style="font:800 13px Inter;letter-spacing:.08em;text-transform:uppercase">${f[0]}</small><h3 style="font-size:28px;margin:8px 0 12px">${f[1]}</h3><p style="font-size:19px;line-height:1.45">${f[2]}</p><q style="quotes:none;font-style:normal;font-weight:800">Vídeos ${f[3]}</q></div>`).join('')}
  </div>
  <p style="font-size:15.5px;line-height:1.4;margin-top:22px;max-width:1100px"><b>Objetivo do período:</b> [X] reservas por semana vindas dos vídeos (meta a combinar com a Rejane) e um vídeo novo no ar toda semana.</p>`, { cls: 'avl compg' })
}

function comPage(d) {
  d.page('av', `${BR} · Comunicação nos vídeos`, COM.title, `
  <div class="tone">${COM.tone.map((t) => `<div class="tc"><h3>${t[0]}</h3><p>${t[1]}</p><q>${t[2]}</q></div>`).join('')}</div>
  <div class="avoid"><b>Evitamos:</b>${COM.avoid.map((a) => `<span>${a}</span>`).join('')}</div>
  <div class="lang"><div class="lrule"><small>Linguagem de vídeo</small>${COM.rule}</div>
    <div class="lrows">${COM.lang.map((l) => `<div class="lr"><b>${l[0]}</b><span>${l[1]}</span></div>`).join('')}</div></div>`, { cls: 'avl compg' })
}

const G = 'Aleffer (Ellcazo)'
// [código, selo, título, direção, ideias, url, rótulo, [a referência, na Raph], roteiros, [quem fala, quem grava, uso]]
const V = [
  ['R1', 'Diária 19/11 · Achado · Série semanal', 'Chegou na Raph', 'Os achados da semana, um por corte: a peça na mão, a etiqueta em close e “pra onde eu usaria”. Vira série fixa.',
    [['Achados da semana', 'Cinco peças, uma por corte: marca, tecido e a ocasião em uma frase.'], ['Abrindo o lote', 'A Rejane abre a sacola da curadoria e reage a cada peça que sai.'], ['Só tem uma', 'Uma peça de marca mostrada de perto: “quando sair, saiu”.']],
    YT('Q617Ad1WpdI'), '@vieiraelisa · “Prada, Dior, Gucci… meus achados de brechó da semana” · 20 mil views', ['A criadora mostra, peça por peça, os achados de marca da semana, em ritmo rápido', 'a Rejane mostra o que chegou, com a etiqueta em close e a ocasião de uso'],
    ['“Chegou na Raph essa semana:” | [Marca] em linho, vestido de festa, [bolsa]: uma frase cada. | “Peça única. Reserva no direct.”', '“Vem abrir o lote comigo.” | Reação a cada peça: “essa é [marca]!” | “Qual você levava? Comenta.”', '“Só tem uma dessa.” | Close na etiqueta e no tecido. | “Quando sair, saiu. Chama no WhatsApp.”'],
    ['Rejane ou a vendedora', G + ', na loja', 'Orgânico semanal; o melhor vira anúncio']],
  ['R2', 'Diária 19/11 · Posicionamento · Reel fixado', 'Brechó não é roupa barata', 'O vídeo que explica a Raph: curadoria, marca e peça única. Quebra o “brechó é usado e barato” com elegância e fica fixado no perfil.',
    [['Mito × verdade', 'Três frases que as pessoas dizem sobre brechó; a Rejane responde com a peça na mão.'], ['O que passa na curadoria', 'O que entra e o que não entra na Raph: marca, estado, tecido e caimento.'], ['Peça com história', 'Uma peça de marca: de onde veio e por que merece uma segunda vida.']],
    YT('4o8opxRzqmI'), '@gabimfelix · “Brechó não é sinônimo de roupa barata!” · 1,3 mi views', ['A criadora fala para a câmera, de look montado, e desmonta o preconceito com brechó', 'a Rejane, no provador, apresenta o brechó chique e explica o que é curadoria'],
    ['“Brechó é coisa usada?” | “É peça escolhida a dedo: marca, tecido e estado impecável.” | “Vem ver de perto. Raph, [bairro].”', '“Nem tudo entra na Raph.” | Mostra uma peça aprovada e o porquê. | “Curadoria é isso: você só vê o melhor.”', '“Essa [marca] já tinha história.” | “Agora ela vai pra sua festa.” | “Moda que circula. Reserva no direct.”'],
    ['Rejane, para a câmera', G + ', na loja', 'Orgânico fixado + anúncio de apresentação']],
  ['R3', 'Diária 19/11 · Look · Reel', 'Uma peça, três looks', 'Uma peça garimpada vira três looks: dia, trabalho e festa. Mostra o valor da peça sem falar de preço.',
    [['Do dia à festa', 'A mesma peça com três combinações; corte seco a cada troca.'], ['Você escolhe', 'Mostra os três looks e pede o voto nos comentários.'], ['O look tendência', 'Um look da tendência do verão [ex.: linho, metalizado] só com peças da Raph.']],
    YT('kkubC6N8OLk'), '@th444yna · “Montando looks com as peças que eu garimpei no brechó” · 375 mil views', ['A criadora mostra a pilha de peças garimpadas e monta looks, um por corte', 'uma cliente ou modelo veste uma peça da Raph de três jeitos, no provador'],
    ['“Uma peça, três looks.” | Dia (tênis) → trabalho (blazer) → festa (salto). | “Qual é o seu? A peça está na Raph.”', '“1, 2 ou 3?” | Os três looks em sequência. | “Vota aqui: o mais votado vai pra vitrine.”', '“A tendência do verão, garimpada.” | Peça a peça, com a marca na tela. | “Look completo por [R$ X].”'],
    ['Modelo ou cliente; a Rejane narra', G + ', no provador', 'Orgânico + anúncio na Black']],
  ['R4', 'Diária 09/12 · Festa · Reel', 'Arrume-se comigo: Réveillon garimpado', 'O look da virada inteiro da Raph, montado na frente da câmera: vestido, acessório e sapato. É o vídeo-chave de dezembro.',
    [['Arrume-se comigo', 'Da roupa de casa ao look de Réveillon, peça por peça.'], ['Branco que não é básico', 'Três brancos diferentes para a virada: renda, linho e brilho.'], ['Festa da firma', 'O look da confraternização: elegante sem exagero.']],
    YT('676OjsRPnlk'), '@donataty95 · “Arrume-se comigo para o Réveillon, look todo de bazar” · 5,4 mil views', ['A criadora se arruma para o Réveillon com um look todo de bazar, peça por peça', 'a Raph monta o look da virada na frente da câmera, com peças únicas'],
    ['“Arruma comigo pro Réveillon?” | Vestido [marca] → brinco → sandália. | “Look completo da Raph. Ninguém vai estar igual.”', '“Branco na virada, mas nada básico.” | Renda, linho, brilho: um corte cada. | “Qual é o seu? Reserva no direct.”', '“Festa da firma e não sabe o que vestir?” | Look elegante em três peças. | “Passa na Raph até [20/12].”'],
    ['Modelo ou cliente real', G + ', provador e rua', 'Anúncio de dezembro + orgânico']],
  ['R5', 'Diária 19/11 · Bastidor · Reel', 'Por trás de cada peça', 'O cuidado que ninguém vê: a peça chega, é avaliada, higienizada, passada e vai para a arara. Prova qualidade sem dizer “qualidade”.',
    [['Do lote à arara', 'Timelapse: a peça chega, passa a vapor, ganha etiqueta e vai para a arara.'], ['O olho da curadora', 'A Rejane mostra o que confere: costura, botão, tecido, mancha.'], ['Aprovada ou não', 'Duas peças na mão: uma entra na Raph, a outra não, e por quê.']],
    YT('AkupKUhs8B4'), '@BoraTrocar · “O processo por trás de uma peça de brechó: o cuidado é manual” · 1,2 mil views', ['O brechó mostra para a câmera o trabalho manual por trás de cada peça', 'a Raph mostra o caminho real da peça, da sacola de desapego até a arara'],
    ['Sem fala: a peça chega amassada. | Vapor, etiqueta, cabide. | Texto: “Toda peça passa por aqui antes de chegar em você.”', '“O que eu olho antes de aceitar uma peça?” | Costura, botão, tecido (close em cada um). | “Só entra o que eu usaria.”', '“Essa entra, essa não.” | O motivo em uma frase. | “Por isso a arara da Raph é diferente.”'],
    ['Rejane, a curadora', G + ', nos bastidores', 'Orgânico (confiança)']],
  ['R6', 'Diária 19/11 · Venda · Reel + stories', 'Black Friday consciente', 'A Black da Raph não é liquidação de fast fashion: é peça de marca pelo preço de uma básica. No ar de 24 a 30/11.',
    [['Etiqueta × preço Raph', 'A peça com o preço de loja na tela e, ao lado, o preço da Raph.'], ['Arara Black', 'Uma arara só para a Black, mostrada de ponta a ponta.'], ['Compra que dura', '“Uma peça de marca que dura no lugar de cinco que não duram.”']],
    YT('SaLqbqSxpA8'), '@closetfashion.modacircular · “Semana Black, Closet Fashion Brechó” · 2 mil views', ['O brechó de moda circular anuncia a Semana Black com a loja ao fundo e a condição na tela', 'a Raph mostra a arara da Black, a peça de marca e o preço como surpresa'],
    ['“Essa [marca] custa [R$ X] na loja.” | “Na Raph, [R$ Y].” | “Black Friday de verdade: 27 a 30/11.”', '“Separei uma arara só pra Black.” | Passeio pela arara, peça a peça. | “Começa [27/11]. Peça única: chega cedo.”', '“Black Friday consciente:” | “uma peça de marca no lugar de cinco que não duram.” | “Reserva no direct.”'],
    ['Rejane', G + ', na loja', 'Anúncio 24 a 30/11 + stories']],
  ['R7', 'Diária 09/12 · Natal · Reel', 'Presente de brechó, sim', 'O presente que ninguém vai ter igual: peça de marca embrulhada pela Raph, com cartão. Vende o presente e o vale-presente.',
    [['A reação', 'Alguém abre um presente da Raph e reage; depois mostra de onde veio.'], ['Presente por perfil', 'Para a amiga clássica, para a mãe, para quem ama festa: uma peça para cada.'], ['Vale-presente', 'Quando não sabe o tamanho: o vale da Raph num envelope bonito.']],
    YT('Rb5kn6iySYQ'), '@TuttisCatBrecho · “Presente de brechó SIM!” · 183 views', ['O brechó mostra, com humor, a reação de quem ganha presente de brechó', 'a Raph grava a reação real de uma cliente e mostra o embrulho da loja'],
    ['“Minha reação quando ganho presente da Raph:” | Abre: bolsa [marca]. | “Presente que ninguém tem igual.”', '“Um presente pra cada uma:” | Clássica, mãe, festeira (uma peça cada). | “A gente embrulha. Reserva no direct.”', '“Não sabe o tamanho?” | Vale-presente no envelope da Raph. | “Ela escolhe; você acerta.”'],
    ['Cliente ou amiga; a Rejane fecha', G + ', na loja', 'Orgânico + anúncio 10 a 23/12']],
  ['R8', 'Diária 19/11 · Desapego · Reel', 'Desapega na Raph', 'Como deixar peças de marca na Raph: o que a loja aceita e como funciona. Traz peça boa para a curadoria e gente nova para a loja.',
    [['Como funciona', 'Três passos na tela: separa, traz, a Raph avalia [consignação ou compra].'], ['O que a gente aceita', 'Peças que entram × peças que não entram, mostradas na mão.'], ['Armário de dezembro', '“Antes de comprar o look da festa, abre espaço no armário.”']],
    YT('UrZb9gi14QA'), '@dazroupaz · “Não somos consignado: receba no mesmo dia” · 34 mil views', ['A loja explica, ao lado da arara, como recebe as peças e responde a dúvida mais comum', 'a Rejane explica como a Raph recebe desapego e qual é a condição [a confirmar]'],
    ['“Tem peça de marca parada no armário?” | “Traz na Raph: a gente avalia [e paga na hora / deixa em consignação].” | “Agenda no WhatsApp.”', '“Isso entra, isso não.” | Marca, estado e tecido na mão. | “Na dúvida, manda foto no direct.”', '“Dezembro chegou.” | “Desapega do que não usa e garimpa o look da festa.” | “Raph, [bairro].”'],
    ['Rejane', G + ', na loja', 'Orgânico + anúncio local']],
  ['R9', 'Diária 09/12 · Prova · Reel', 'A sacolinha da cliente', 'Uma cliente real e a sacola dela: o que levou e o look que vai montar. Prova social com cara de amiga.',
    [['O que ela levou', 'A cliente tira peça por peça da sacola e conta o porquê.'], ['Embalando o pedido', 'A Rejane embala uma compra do direct: papel, laço, cartão.'], ['Sacolinha de [R$ X]', 'Um look completo que cabe numa sacola e num valor.']],
    YT('z0GjHPGR5mM'), '@brelovebrecho · “Garimpos da Rafa: sacolinha” · 14 mil views', ['A cliente mostra os garimpos da sacolinha, peça por peça, para a câmera', 'uma cliente da Raph mostra a sacola dela na porta da loja'],
    ['“Mostra o que você levou?” | Peça por peça: “essa é [marca]!” | Texto: “A sacolinha da [nome]. A sua é a próxima.”', 'Sem fala: papel de seda, laço, cartão escrito à mão. | “Pedido saindo pra [bairro].” | “Compra pelo direct também.”', '“O que cabe numa sacola de [R$ X]?” | Look completo, peça por peça. | “Vem montar a sua.”'],
    ['Cliente real (com autorização)', G + ', na porta da loja', 'Orgânico + anúncio (prova social)']],
  ['R10', 'Diária 09/12 · Natal · Reel', 'Do pijama ao look de Natal', 'A transição que o público adora: um pulo e o look de festa da Raph aparece. Rápido, bonito e fácil de compartilhar.',
    [['O pulo', 'Roupa de casa → pulo → look de Natal completo.'], ['Três pulos', 'Ceia, amigo secreto e Réveillon, um look a cada pulo.'], ['A peça girando', 'O vestido gira no cabide e, no corte, já está vestido.']],
    YT('oTHGYsgGJnU'), '@bazarebrechodacleide · “Transição de Natal com look do brechó” · 1,3 mil views', ['A loja faz a transição de roupa de casa para o look de Natal, com um pulo', 'a modelo da Raph faz a mesma transição com o look de festa garimpado'],
    ['Texto: “Quando a ceia é às 21h.” | Pulo → look [marca]. | “Look da Raph. Peça única.”', '“Ceia.” (pulo) | “Amigo secreto.” (pulo) | “Réveillon.” (pulo) “Tudo da Raph.”', 'O vestido girando no cabide. | Corte: o vestido no corpo. | “Garimpa o seu até [23/12].”'],
    ['Modelo ou cliente; sem fala', G + ', no provador', 'Orgânico (alcance) + anúncio']],
]

function videoPages(d) {
  V.forEach((v, k) => {
    const [code, selo, title, dir, ideas, url, rlabel, rf, rot, who] = v
    const cls = k % 2 === 0 ? 'avw' : 'avl'
    d.page('av', '', '', `
    <div class="vp">
      <a class="phone" href="${url}" target="_blank"><img src="${img(code)}" alt=""><span class="play">▶ Assistir no YouTube</span></a>
      <div class="vmain">
        <div class="bname">${BR} · gravação ${k + 1}/${V.length}</div>
        <div class="vtop"><span class="code">${code}</span><span class="selo">${selo}</span><span style="font:700 13px Inter">Uso: ${who[2]}</span></div>
        <h2>${title}</h2>
        <p class="vdir">${dir}</p>
        <div class="who"><span><b>Quem fala</b>${who[0]}</span><span><b>Quem grava</b>${who[1]}</span></div>
        <p class="adapt"><b>A referência</b> ${rf[0]} <span>→</span> <b>Na Raph</b> ${rf[1]}. <a class="src" href="${url}" target="_blank">${rlabel}</a></p>
        <div class="ideas">${ideas.map((x, i) => `<div class="idea"><b>Ideia ${'ABC'[i]}</b><h4>${x[0]}</h4><p>${x[1]}</p><div class="rot"><span>Roteiro de apoio</span>${rot[i].split(' | ').map((l) => `<i>${l}</i>`).join('')}</div></div>`).join('')}</div>
      </div>
    </div>`, { cls: cls + ' vpg' })
  })
}

const FOTOS = [
  ['Peças e achados', [['P_luxo', 'Peças de marca de cima, em fundo neutro', '@karolmeiras', YT('-gbh89RAzCc')], ['P_arara', 'A peça na arara, com a etiqueta à mostra', '@donnafifibrecho', YT('VpP8RH5Ibzc')], ['P_bolsa', 'A bolsa na mão, em close no detalhe', '@cristianetiepomodacircular', YT('G8hbg66bn4U')]]],
  ['A loja (Recife)', [['P_legr', 'Dentro da loja: a peça na mão, araras ao fundo', 'Le Griffe Brechó, Recife', YT('yg--6iF9C4k')], ['P_vitr', 'Manequins na vitrine com looks prontos', 'Vintage Brechó, Boa Viagem', YT('2hnhbD2cNck')], ['P_sacola', 'A sacola da loja, personalizada à mão', '@grazimoretofrg', YT('W8wPnjDCLOI')]]],
  ['Pessoas e looks', [['P_duas', 'Duas clientes andando, de look completo', 'Brechó Doce Jiló', YT('CjQEXRD7oUE')], ['P_look', 'Corpo inteiro, de frente, look montado', '@DianeTheodoro', YT('JOOYTnArQYQ')], ['P_branco', 'Vestido branco em detalhe, para o Réveillon', 'Santa Grife Brechó', YT('Ddsi1Ryr2u4')]]],
]
function photoPage(d) {
  d.page('av', `${BR} · Gravação · Referências de foto`, 'O que fotografar nas diárias', `
  <div class="fotos">${FOTOS.map(([g, L]) => `<div class="fg"><h3>${g}</h3><div class="fr3">${L.map((f) => `<a class="ft" href="${f[3]}" target="_blank"><img src="${img(f[0])}" alt=""><span>${f[1]}</span><small>${f[2]}</small></a>`).join('')}</div></div>`).join('')}</div>`, { cls: 'avw fotopg' })
}

function dayPage(d) {
  const D1 = [['9h', 'Arara, etiquetas e bastidor da curadoria (R5, R1)'], ['10h', 'Rejane para a câmera: posicionamento e desapego (R2, R8)'], ['11h', 'Provador: uma peça, três looks (R3)'], ['12h', 'Arara Black e preço como surpresa (R6)']]
  const D2 = [['9h', 'Looks de festa no provador e na rua (R4)'], ['10h', 'Transições de Natal (R10)'], ['11h', 'Presente, embrulho e vale-presente (R7)'], ['12h', 'Cliente real com a sacolinha (R9)']]
  const card = (t, sub, s) => `<div class="card slotsc"><h3 style="font-size:23px;margin-bottom:4px">${t}</h3><p class="dsub">${sub}</p>${s.map((x) => `<div class="slot"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>`
  d.page('av', `${BR} · Gravação · As diárias`, 'Duas diárias: Black Friday em novembro, festas em dezembro', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:26px">
      ${card('Diária 1 · quinta 19/11', '[9h às 13h], loja arrumada antes de abrir (sugestão).', D1)}
      ${card('Diária 2 · quarta 09/12', '[9h às 13h], com uma modelo ou cliente para os looks de festa.', D2)}
    </div>
    <p style="font-size:15.5px;line-height:1.42;margin-top:18px;max-width:1180px"><b>Levar:</b> vaporizador, cabides iguais, lapela para a Rejane, ring light e 3 looks de festa separados antes. <b>Fotos:</b> as 9 referências da página anterior saem nas mesmas diárias. Datas e horários a confirmar com a Rejane.</p>`, { cls: 'avl dense' })
}

const a = Doc(BR, 'Audiovisual')
avCover(a, BR, {})
tesePage(a)
studyPage(a, BR, bv, AVX)
comPage(a)
videoPages(a)
photoPage(a)
dayPage(a)
fs.writeFileSync(path.join(OUT, 'audiovisual-nov-dez.html'), html(`Audiovisual ${BR}`, a.pages))
console.log(BR, a.pages.length)
