// Planejamento de social media: 10 postagens por marca, cada uma com referência real, copy e legenda prontas.
const fs = require('fs')
const path = require('path')
const IDX = JSON.parse(fs.readFileSync(path.join(__dirname, 'thumbs', 'index.json'), 'utf8'))
const byId = {}
for (const [u, v] of Object.entries(IDX)) if (v.file) byId[path.basename(v.file).slice(0, 10)] = { ...v, url: v.url || u }
const IG = 'https://www.instagram.com/p/'
const igKey = (code) => { const v = IDX[IG + code + '/']; return path.basename(v.file).slice(0, 10) }
const fmtViews = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' mi' : n >= 1e4 ? (n / 1e3).toFixed(1).replace('.', ',').replace(',0', '') + ' mil' : n.toLocaleString('pt-BR')

// r: referência. {id} = miniatura do banco coletado (gen/thumbs/index.json) ou {file, at, url, net, views}
function ref(r) {
  let file, at, url, net, views
  if (r.id || r.ig) {
    const id = r.id || igKey(r.ig)
    const v = byId[id]
    file = path.join(__dirname, 'sm_thumbs', id + '.jpg')
    at = '@' + v.author; url = v.url; net = v.src === 'ig' ? 'Instagram' : 'TikTok'; views = v.views
  } else { file = path.join(__dirname, r.file); at = r.at; url = r.url; net = r.net; views = r.views }
  const src = 'data:image/jpeg;base64,' + fs.readFileSync(file).toString('base64')
  return { src, at, url, net, views: typeof views === 'number' ? fmtViews(views) + ' views' : views, what: r.what, why: r.why, inner: !!r.inner }
}

const T = (s) => s.trim().replace(/\n[ \t]+/g, '\n')

const P = {}
// [data, formato, objetivo, título, ligação com a estratégia, referência, copy {t, x, telas?}, legenda, hashtags, direção de arte]
P.Fornario = [
  { date: 'Qui 19/11', fmt: 'Carrossel · 5 telas', obj: 'Venda', title: 'Sua confraternização no Fornario', est: 'Confraternização até 19/12: abre a temporada de reservas de grupo.',
    ref: { ig: 'DTWUSxdEYw4', what: 'Concorrente da cidade: passo a passo da encomenda', why: 'o passo a passo numa arte só; aqui ele vira “como reservar a confraternização”.' },
    t: 'Confraternização? A mesa é no Fornario.', x: 'Mande a data e quantas pessoas. A gente reserva.',
    telas: ['Confraternização? A mesa é no Fornario.', 'Mesa reservada para o grupo, no salão da Praça do Canhão.', 'Pizza de massa de 48 horas, pratos e petiscos para dividir.', 'Como reservar: mande no WhatsApp a data e o número de pessoas.', 'Datas até 19/12. Reserve pelo WhatsApp.'],
    leg: T(`O fim de ano chegou e o grupo já está perguntando: onde vai ser a confraternização? 🍕
    No Fornario, a mesa fica reservada para vocês, no salão da Praça do Canhão, com pizza de massa de 48 horas e pratos para dividir.
    É simples: mande no WhatsApp a data e quantas pessoas vêm. A gente responde com a mesa confirmada.
    📅 Confraternizações até 19/12.
    👉 Toque no link da bio e reserve pelo WhatsApp.`),
    tags: '#confraternização #saolourencodamata #pracadocanhao #fornario #camaragibe',
    art: 'Mesa de grupo em luz quente, arco vermelho do logo como moldura, títulos em Fraunces e selo “Reserve pelo WhatsApp” em toda tela.' },
  { date: 'Qui 19/11', fmt: 'Post', obj: 'Venda', title: 'É feriado. A mesa é de vocês.', est: 'Feriado de 20/11: a mesa do feriadão em família.',
    ref: { ig: 'DfSrRU0hYnx', what: 'Concorrente da cidade: “experiência para todos os momentos”', why: 'ela vende o momento, não o prato; nós damos o momento com data: o feriado.' },
    t: 'É feriado. A mesa é de vocês.', x: 'Sexta, 20/11. Reserve a mesa da família.',
    leg: T(`Sexta-feira, 20/11, é feriado. Ninguém precisa cozinhar e a família inteira está em casa. 🙌
    Troque a cozinha pela mesa do Fornario: pizza de massa de 48 horas, pratos para dividir e o salão da Praça do Canhão esperando vocês.
    👉 Reserve sua mesa pelo WhatsApp (link na bio).
    Feriado: aberto das [horário].`),
    tags: '#feriado #saolourencodamata #pracadocanhao #fornario',
    art: 'Prato em destaque, mesa de família desfocada ao fundo, “20/11” grande em Fraunces.' },
  { date: 'Ter 24/11', fmt: 'Reels (capa)', obj: 'Autoridade', title: 'A sua pizza começou anteontem', est: 'Prova de qualidade: a massa de 48 horas, gravada na diária de 24/11.',
    ref: { id: 'fb296c9f82', what: 'Pizzaria napolitana: “o forno é o segredo”', why: 'o forno aceso em close prende o olhar no 1º segundo.' },
    t: 'A sua pizza começou anteontem.', x: '48 horas de descanso. Por isso a borda é leve.',
    leg: T(`Poucas pessoas sabem: a pizza que chega na sua mesa começou a ser feita dois dias antes. ⏳
    A massa do Fornario descansa 48 horas. É isso que deixa a borda leve, aerada e fácil de digerir.
    Vem provar a diferença na Praça do Canhão.
    👉 Reserve pelo WhatsApp (link na bio).`),
    tags: '#pizzaartesanal #saolourencodamata #pracadocanhao #fornario',
    art: 'Capa: close da massa crescendo com o forno aceso ao fundo, “anteontem” em Fraunces; vídeo com som do forno, sem música.' },
  { date: 'Sex 27/11', fmt: 'Carrossel · 4 telas', obj: 'Venda', title: 'Black Friday sem preço riscado', est: 'Black Friday e 1ª parcela do 13º: vantagem para quem fecha a confraternização até 30/11.',
    ref: { ig: 'DcygjFtRS1z', what: 'Concorrente da cidade: “faça sua reserva”', why: 'o dono pede a reserva olhando para a câmera; nós pedimos com prazo, sem desconto.' },
    t: 'Black Friday aqui não é preço riscado.', x: 'É escolher a melhor data de dezembro antes de todo mundo.',
    telas: ['Black Friday aqui não é preço riscado.', 'É escolher a melhor data de dezembro antes de todo mundo.', 'Reservou a confraternização até 30/11? Ganha [vantagem a decidir].', 'Mande a data e o número de pessoas. Reserve pelo WhatsApp.'],
    leg: T(`Black Friday no Fornario não tem preço riscado. Tem coisa melhor: escolher a data da confraternização antes que dezembro lote. 🗓️
    Quem reservar a confraternização do grupo até 30/11 garante a data e ganha [vantagem a decidir].
    👉 Mande no WhatsApp (link na bio) o dia e quantas pessoas. A gente confirma a mesa.`),
    tags: '#blackfriday #confraternização #saolourencodamata #fornario',
    art: 'Fundo Azul Noite, “30/11” enorme em Fraunces, calendário de dezembro com datas sendo marcadas.' },
  { date: 'Ter 01/12', fmt: 'Reels (capa)', obj: 'Engajamento', title: 'Deep Dish: espera o corte', est: 'Desejo pelo prato “só tem aqui”, que puxa a mesa de grupo e a encomenda de Natal.',
    ref: { id: '9ba1dd6ef4', what: 'Deep dish com queijo puxando', why: 'o “espera…” e o queijo puxando seguram até o fim do vídeo.' },
    t: 'Espera o corte.', x: 'Deep Dish Fornario: 1 kg de mussarela.',
    leg: T(`Espera… 🧀
    A Deep Dish do Fornario leva 1 kg de mussarela, e o corte mostra tudo. Feita para dividir na mesa com quem você gosta.
    Marca aqui quem vai dividir essa com você 👇
    👉 Reserve sua mesa pelo WhatsApp (link na bio).`),
    tags: '#deepdish #pizza #saolourencodamata #fornario',
    art: 'Plano de cima, corte em câmera lenta; “1 kg” no centro só no fim; capa com a fatia saindo da forma.' },
  { date: 'Qui 03/12', fmt: 'Carrossel · 5 telas', obj: 'Autoridade', title: 'Por que essa Marguerita custa R$ 60', est: 'O preço premium explicado, sem tom de defesa: sustenta a mesa e a confraternização.',
    ref: { id: '2198d249a0', what: 'Criador pergunta “qual a sua pizza mais cara?”', why: 'preço alto com explicação vira curiosidade, não objeção.' },
    t: 'Por que essa Marguerita custa R$ 60?', x: 'Abre e veja o que tem dentro.',
    telas: ['Por que essa Marguerita custa R$ 60?', 'Massa: 48 horas de descanso.', 'Molho de tomate pomodoro, mussarela e manjericão fresco.', 'Forno a lenha, assada na hora.', 'O preço tem motivo. Vem provar: reserve pelo WhatsApp.'],
    leg: T(`Sim, essa Marguerita custa R$ 60. E a gente explica por quê. 👇
    A massa descansa 48 horas. O molho é de tomate pomodoro, a mussarela é de verdade e o manjericão é fresco. Tudo assado no forno a lenha, na hora.
    Vale cada fatia? Vem provar e conta pra gente.
    👉 Reserve pelo WhatsApp (link na bio).`),
    tags: '#pizzanapolitana #saolourencodamata #pracadocanhao #fornario',
    art: 'Fundo Azul Noite, um ingrediente por tela com legenda curta; o preço grande só na capa e no fim.' },
  { date: 'Ter 08/12', fmt: 'Post', obj: 'Venda', title: 'Vem a turma toda', est: 'Confraternização até 19/12 e feriado municipal de 08/12.',
    ref: { id: '4a73b9831a', what: 'Pizzaria convida o aniversariante e os amigos', why: 'convite direto ao grupo, com regra clara; nós dizemos a data limite.' },
    t: 'Vem a turma toda.', x: 'Mesa para grupos até 19/12. Reserve pelo WhatsApp.',
    leg: T(`Firma, família, amigos da faculdade, turma do futebol: todo grupo merece uma mesa de fim de ano. 🎉
    No Fornario a gente monta a mesa do tamanho do seu grupo, com pizza de massa de 48 horas e petiscos para dividir.
    Ainda temos datas até 19/12.
    👉 Mande no WhatsApp (link na bio) o dia e quantas pessoas.`),
    tags: '#confraternização #saolourencodamata #fornario #camaragibe',
    art: 'Foto real de mesa de grupo vista de cima, “Vem a turma toda” em Fraunces, “até 19/12” no canto.' },
  { date: 'Sex 11/12', fmt: 'Post + anúncio', obj: 'Autoridade', title: 'Quem foi deu 4,8', est: 'Prova social para a reta final de dezembro (anúncio do contrato até 11/12).',
    ref: { id: '6b997f361d', what: 'Rodízio mostra o selo de qualidade antes do prato', why: 'o selo vem primeiro; o nosso selo é a nota 4,8 no Google.' },
    t: 'Quem foi deu 4,8.', x: 'Sua mesa de dezembro está aqui.',
    leg: T(`4,8 estrelas no Google. ⭐ Quem diz não somos nós: são os clientes que já sentaram na nossa mesa.
    As melhores datas de dezembro vão embora rápido. Garanta a mesa da família ou do grupo.
    👉 Reserve pelo WhatsApp (link na bio).
    Já veio? Deixa sua avaliação no Google, ajuda muito a gente 💙`),
    tags: '#saolourencodamata #pracadocanhao #fornario #camaragibe',
    art: 'Nota “4,8” e estrelas grandes sobre a foto do salão cheio; selo “Reserve pelo WhatsApp”.' },
  { date: 'Ter 15/12', fmt: 'Carrossel · 4 telas', obj: 'Venda', title: 'A ceia ganha o prato do centro', est: 'Deep Dish de Natal por encomenda (se aprovada), de 15 a 23/12.',
    ref: { id: '8ea151e0d6', what: 'Pizzaria lança a pizza natalina', why: 'Natal só nos detalhes (luz, mãos) e a pizza no centro.' },
    t: 'A ceia ganha o prato do centro.', x: 'Deep Dish de Natal por encomenda. Vagas por dia.',
    telas: ['A ceia ganha o prato do centro.', 'Deep Dish Família: serve [X] pessoas.', 'Encomende até [data] e retire no dia 24.', 'Vagas por dia. Peça pelo WhatsApp.'],
    leg: T(`Este ano, a ceia ganha um prato novo no centro da mesa. 🎄
    A Deep Dish de Natal do Fornario é feita por encomenda: massa alta, muito queijo e pronta para dividir com a família.
    As vagas são limitadas por dia.
    👉 Encomende pelo WhatsApp (link na bio) até [data].`),
    tags: '#natal #ceiadenatal #saolourencodamata #fornario',
    art: 'Deep Dish no centro da mesa; Natal só em detalhe (vela, luz desfocada); selo “Vagas por dia”.' },
  { date: '17 a 19/12', fmt: 'Reels + 3 stories', obj: 'Venda', title: 'Último dia: 19/12', est: 'Fecha a temporada: maior verba (2ª parcela do 13º) e último dia de confraternização.',
    ref: { file: 'thumbs/F8.jpg', at: '@karolynlopes', url: 'https://www.tiktok.com/@karolynlopes/video/7453001945293327621', net: 'TikTok', views: '14 mil views', what: 'Confraternização de empresa em pizzaria', why: 'a mesa cheia de gente real vende melhor que qualquer arte.' },
    t: 'Último dia: 19/12.', x: 'Ainda dá tempo de reservar a mesa do grupo.',
    telas: ['Story 1: vídeo do salão cheio + “Foi assim a confraternização deles.”', 'Story 2: enquete “Seu grupo já marcou? Sim / Ainda não”.', 'Story 3: “Último dia: 19/12. Reserve pelo WhatsApp” + link.'],
    leg: T(`Foi assim a confraternização deles. 🍕🥂
    E a do seu grupo? O último dia para confraternização no Fornario é sábado, 19/12.
    👉 Ainda dá tempo: reserve pelo WhatsApp (link na bio).`),
    tags: '#confraternização #saolourencodamata #pracadocanhao #fornario',
    art: 'Vídeo do salão cheio com “19/12” fixo no canto o tempo todo; stories com enquete e link.' },
]

P.VOVINA = [
  { date: 'Qua 18/11', fmt: 'Carrossel · 5 telas', obj: 'Venda', title: 'Pizza da Vó em 3 passos', est: 'Cardápio digital: o pedido medido pelo link marcado.',
    ref: { ig: 'DTQWtW7EWqT', what: 'Concorrente da cidade: “Como pedir?”', why: 'um “como pedir” claro foi dos posts mais vistos da cidade.' },
    t: 'Pedir a pizza da Vó em 3 passos.', x: 'Sem ligação, sem espera. Pelo cardápio digital.',
    telas: ['Pedir pizza da Vó ficou fácil.', '1. Toque no link da bio e abra o cardápio.', '2. Escolha o sabor ou monte o meio a meio.', '3. Finalize o pedido. Pronto!', 'Salva este post para a próxima fome.'],
    leg: T(`Bateu a fome? Pedir a pizza da Vó Vina ficou bem mais fácil. 🍕
    1️⃣ Toque no link da bio
    2️⃣ Escolha o sabor (ou monte o meio a meio)
    3️⃣ Finalize o pedido e pronto
    Sem ligação, sem esperar alguém atender.
    Salva este post para a próxima fome 😉`),
    tags: '#pizzadelivery #saolourencodamata #vovina #camaragibe',
    art: 'Telas do cardápio no celular, um passo por tela, número grande; selo “Peça pelo cardápio digital”.' },
  { date: 'Qui 19/11', fmt: 'Post', obj: 'Venda', title: 'Recado da Vó: amanhã é feriado', est: 'Feriado de 20/11: “feriado em casa pede pizza da Vó”.',
    ref: { id: 'a90cae8b7d', what: '“Regra da pizza” em família', why: 'regra de família com humor gera marcação; o recado da Vó usa o mesmo tom de casa.' },
    t: 'Recado da Vó:', x: 'Amanhã é feriado. O jantar já está resolvido.',
    leg: T(`📝 Recado da Vó: amanhã (20/11) é feriado.
    Ninguém precisa ir pra cozinha. A pizza da família já está resolvida: é só escolher os sabores e pedir.
    👉 Peça pelo cardápio digital (link na bio).
    Marca aqui quem sempre esquece de pedir a pizza 😂`),
    tags: '#feriado #saolourencodamata #vovina #pizzadelivery',
    art: 'Bilhete escrito à mão, como recado na geladeira, sobre a foto da pizza; até 8 palavras.' },
  { date: 'Ter 24/11', fmt: 'Carrossel · 5 telas', obj: 'Autoridade', title: 'Essa borda passou do ponto?', est: 'Qualidade com gancho em pergunta (a borda com pergunta rendeu 2,5× mais no perfil).',
    ref: { id: 'ad7aacb8a8', what: 'Delivery: o queijo esticando na fatia', why: 'o queijo puxando no 1º segundo é o que segura o post de delivery.' },
    t: 'Essa borda passou do ponto?', x: 'Não. É massa feita sem pressa, dourando no forno.',
    telas: ['Essa borda passou do ponto?', 'Não! Esse dourado é a massa que descansou sem pressa.', 'Por isso ela fica leve e crocante por fora.', 'E por dentro… queijo puxando. 🧀', 'Peça a sua pelo cardápio digital.'],
    leg: T(`Essa borda mais douradinha passou do ponto? 👀
    Nada disso! Esse dourado é o sinal de uma massa feita sem pressa, que fica leve e crocante por fora e macia por dentro.
    E o queijo? Olha esse puxa-puxa 🧀
    👉 Peça a sua pelo cardápio digital (link na bio).`),
    tags: '#pizza #saolourencodamata #vovina #pizzadelivery',
    art: 'Capa com a pergunta grande e close da borda dourada; resposta na 2ª tela; queijo puxando na 4ª.' },
  { date: 'Sex 27/11', fmt: 'Post + anúncio', obj: 'Venda', title: 'Chegou o Combo Família da Vó', est: 'Lançamento do Combo Família na Black Friday, sem preço riscado.',
    ref: { ig: 'De4nZ2kBGsT', what: 'Concorrente do Centro: “2 pizzas grandes”', why: 'oferta grande e simples, que se entende em 1 segundo.' },
    t: 'Chegou o Combo Família da Vó.', x: '[Itens do combo] por R$ [preço]. Pelo cardápio digital.',
    leg: T(`Chegou o Combo Família da Vó! 🍕🍕
    Pensado para reunir todo mundo em casa: [itens do combo], por R$ [preço].
    Sem preço riscado, sem pegadinha: é o combo do mês, para a família inteira comer bem.
    👉 Peça pelo cardápio digital (link na bio).`),
    tags: '#combofamilia #saolourencodamata #vovina #pizzadelivery #camaragibe',
    art: 'Mesa de família vista de cima com o combo no centro; até 8 palavras; selo “Peça pelo cardápio digital”.' },
  { date: 'Qui 03/12', fmt: 'Reels (capa)', obj: 'Engajamento', title: 'Metade sua, metade minha', est: 'O meio a meio da família, o pedido de quinta a sábado.',
    ref: { id: '79862cad7e', what: 'Delivery: “metade mussarela, metade portuguesa”', why: 'a caixa aberta com as duas metades e a pergunta “quem dividiria?” gera comentário.' },
    t: 'Metade sua, metade minha.', x: 'O meio a meio que acaba a briga da família.',
    leg: T(`Em casa ninguém concorda com o sabor? Resolvido: meio a meio! 🍕
    Metade do sabor do pai, metade do sabor das crianças. Ou do jeito que a sua família quiser.
    Comenta aqui: qual seria o seu meio a meio? 👇
    👉 Monte o seu pelo cardápio digital (link na bio).`),
    tags: '#meioameio #saolourencodamata #vovina #pizzadelivery',
    art: 'Caixa aberta de cima com a linha do meio bem marcada; o nome de cada metade escrito à mão.' },
  { date: 'Ter 08/12', fmt: 'Reels (capa)', obj: 'Autoridade', title: 'Quem faz a sua pizza', est: 'Rosto da equipe toda semana: confiança para pedir.',
    ref: { id: '36406e1dc8', what: 'Pizzaiolo montando a borda', why: 'as mãos do pizzaiolo trabalhando a borda prendem por segundos.' },
    t: 'Quem abre a massa da sua pizza?', x: '[Nome do pizzaiolo], toda noite na VOVINA.',
    leg: T(`Você já pediu tantas vezes… mas sabe quem faz a sua pizza? 👨‍🍳
    Esse é o [nome], que abre a massa, capricha na borda e monta cada pedido da Vó Vina.
    Deixa um 🍕 aqui pra ele!
    👉 Peça pelo cardápio digital (link na bio).`),
    tags: '#pizzaiolo #saolourencodamata #vovina #pizzadelivery',
    art: 'Retrato do pizzaiolo com as mãos na massa; o nome dele em destaque na capa.' },
  { date: '12 e 13/12', fmt: 'Post + anúncio', obj: 'Venda', title: 'Saiu da vaquejada? Pizza da Vó', est: 'Final da vaquejada na Arena (a confirmar): o jantar depois do evento.',
    ref: { ig: 'Dffe4xahF61', what: 'Concorrente do Centro: “pós Enem é aqui”', why: 'aproveita o assunto da cidade no dia; o nosso é a vaquejada.' },
    t: 'Saiu da Arena?', x: 'O jantar está resolvido. Pizza da Vó.',
    leg: T(`Saiu da vaquejada com fome? 🤠🍕
    Nem precisa pensar no jantar: a pizza da Vó chega em casa ou fica pronta para retirar no Centro.
    👉 Peça pelo cardápio digital (link na bio).
    Bom fim de semana de vaquejada, São Lourenço!`),
    tags: '#vaquejada #saolourencodamata #vovina #pizzadelivery',
    art: 'Caixa aberta em close com um chapéu de vaqueiro ao lado; “Saiu da Arena?” curto; selo do cardápio.' },
  { date: 'Sex 18/12', fmt: 'Post + stories', obj: 'Venda', title: '13º caiu: o sábado é da família', est: '2ª parcela do 13º (18 a 20/12): maior verba no Combo Família.',
    ref: { ig: 'DdV8hKVxAE4', what: 'Concorrente da cidade: pizza grande, dois sabores', why: 'a pizza grande com as duas metades bem visíveis vende o tamanho.' },
    t: '13º caiu.', x: 'Sábado de família pede Combo Família da Vó.',
    leg: T(`O 13º caiu e o sábado é da família! 💸🍕
    Comemora em casa com o Combo Família da Vó: meio a meio do jeito de cada um e todo mundo reunido na mesa.
    👉 Peça pelo cardápio digital (link na bio).`),
    tags: '#13salario #saolourencodamata #vovina #combofamilia',
    art: 'Meio a meio em destaque e “13º” grande; selo do cardápio.' },
  { date: 'Ter 15/12', fmt: 'Carrossel · 4 telas', obj: 'Venda', title: 'A pizza de Natal da Vó', est: 'Pizza de Natal da Vó, edição limitada (a decidir).',
    ref: { id: '75da89f532', what: 'Pizza em forma de árvore de Natal', why: 'a pizza árvore é o formato de Natal que mais roda agora.' },
    t: 'A Vó fez uma pizza de Natal.', x: 'Edição limitada, só em dezembro.',
    telas: ['A Vó fez uma pizza de Natal.', '[Formato árvore ou sabor especial], só em dezembro.', 'Serve [X] pessoas: perfeita para a noite em família.', 'Edição limitada: peça até [data] pelo cardápio digital.'],
    leg: T(`A Vó entrou no clima de Natal 🎄🍕
    Fizemos uma pizza especial de Natal, em edição limitada: [descrição]. Perfeita para a noite em família, antes ou depois da ceia.
    Só até [data] ou enquanto durar.
    👉 Peça pelo cardápio digital (link na bio).`),
    tags: '#natal #saolourencodamata #vovina #pizzadelivery',
    art: 'Pizza árvore vista de cima na mesa da família; Natal só em detalhe (luzinhas desfocadas); selo “Edição limitada”.' },
  { date: 'Sáb 26/12', fmt: 'Post + anúncio', obj: 'Engajamento', title: 'Chega de peru. Sábado é pizza.', est: 'O dia seguinte do Natal: “hoje a cozinha descansa”.',
    ref: { ig: 'DcOPiIcOwbF', what: 'Concorrente do Centro: humor da dieta', why: 'humor do dia a dia com a pizza na mão gera comentário e compartilhamento.' },
    t: 'Chega de peru.', x: 'Sobrou ceia? Hoje a cozinha descansa.',
    leg: T(`Três dias comendo peru, farofa e salpicão… 🦃
    Hoje a cozinha descansa! Sábado é dia de pizza da Vó, quentinha, com a família ainda reunida.
    Marca aqui quem ainda está comendo resto da ceia 😂
    👉 Peça pelo cardápio digital (link na bio).`),
    tags: '#posnatal #saolourencodamata #vovina #pizzadelivery',
    art: 'Contraste: travessa da ceia × pizza chegando; título de 5 palavras.' },
]

P['Brio Burguer'] = [
  { date: 'Qui 03/12 (entrada)', fmt: 'Reels (capa) + post', obj: 'Venda', title: 'Chegou o Brio', est: 'Entrada do Brio (opção B, 03/12), com o Combo da Galera como porta de entrada.',
    ref: { ig: 'DfLFFqpvg9q', what: 'Vizinho de São Lourenço anuncia a chegada', why: 'chegada anunciada com energia e cara de gente da cidade.' },
    t: 'Chegou o Brio.', x: 'Artesanal, maionese da casa e chega quente. Pede pelo site.',
    leg: T(`Oxe, chegou! 🍔🔥
    O Brio voltou com tudo: hambúrguer artesanal, maionese da casa e entrega quentinha em São Lourenço.
    E pra estrear com a galera: Combo da Galera, pra ninguém brigar pelo último pedaço.
    👉 Pede pelo site (link na bio).`),
    tags: '#hamburguer #saolourencodamata #brioburger #camaragibe',
    art: 'Abre na mordida; cartela final laranja Brio com “Pede pelo site”; título em Lilita One.' },
  { date: 'Sex 04/12', fmt: 'Reels (capa)', obj: 'Engajamento', title: 'Olha o tamanho disso', est: 'Mordida em até 3 segundos: o lanche real, aberto e enorme.',
    ref: { id: '125ef49c0a', what: '“Hamburgueria massa em Recife”', why: 'o lanche enorme na mão, em close, aparece no 1º segundo.' },
    t: 'Olha o tamanho disso.', x: 'Brio artesanal. Pede pelo site.',
    leg: T(`Só olha… 🤤🍔
    Pão macio, carne suculenta e a maionese da casa escorrendo. Esse é o Brio de verdade, sem foto de banco.
    Qual tu pedia agora? Comenta aqui 👇
    👉 Pede pelo site (link na bio).`),
    tags: '#hamburgueria #saolourencodamata #brioburger #lanche',
    art: 'Mordida em até 3 s, em close; capa com o Brio aberto ocupando a tela e “Olha o tamanho” em Lilita One.' },
  { date: 'Sáb 05/12', fmt: 'Carrossel · 5 telas', obj: 'Autoridade', title: 'Por que o Brio chega quente', est: 'Prova da 1ª semana: só delivery, então a entrega é o produto.',
    ref: { id: 'ee5766a5b1', what: '“Tá chovendo? A gente vai até você”', why: 'liga o pedido a um momento real e mostra o caminho até a porta.' },
    t: 'Por que o Brio chega quente?', x: 'Da chapa à tua porta, sem esfriar.',
    telas: ['Por que o Brio chega quente?', 'Sai da chapa na hora do teu pedido.', 'Vai direto pra caixa fechada.', 'A moto sai na hora, sem esperar.', 'Na tua porta, quentinho. Pede pelo site.'],
    leg: T(`Lanche frio? Aqui não. 🔥
    O Brio sai da chapa na hora do teu pedido, vai pra caixa fechada e a moto sai na hora.
    Resultado: chega quentinho na tua porta, do jeito que tem que ser.
    👉 Pede pelo site (link na bio).`),
    tags: '#delivery #saolourencodamata #brioburger #hamburguer',
    art: 'Fotos reais: chapa → caixa → moto → porta; setas simples, fundo laranja.' },
  { date: 'Qui 10/12', fmt: 'Post + anúncio', obj: 'Venda', title: 'Combo da Galera', est: 'Combo da Galera pelo site, preço mostrado por pessoa (quinta a domingo).',
    ref: { id: 'c8e00a669f', what: '“Cuidado: esse combo vicia!”', why: 'humor curto na capa e o combo na sequência.' },
    t: 'Combo da Galera.', x: '4 Brios + 2 fritas + refri 2 L. Sai R$ [X] por pessoa.',
    leg: T(`Juntou a galera? Então é Combo da Galera! 🍔🍔🍔🍔
    4 Brios + 2 fritas + refri de 2 L. Dividindo, sai R$ [X] por pessoa.
    Marca aqui quem divide contigo (e quem sempre pega a última batata) 😂
    👉 Pede pelo site (link na bio).`),
    tags: '#combo #saolourencodamata #brioburger #hamburgueria',
    art: 'Combo aberto de cima ocupando metade da arte; preço por pessoa em Lilita One.' },
  { date: 'Ter 08/12', fmt: 'Reels (capa)', obj: 'Engajamento', title: 'Tu é de São Lourenço e não conhece o Brio?', est: 'Gancho da cidade, com sotaque: o Brio volta a existir para quem mora perto.',
    ref: { id: '767b30fc12', what: '“Hamburgueria escondida no Recife”', why: 'o gancho regional na capa faz o morador parar.' },
    t: 'Tu é de São Lourenço e não conhece o Brio?', x: 'Oxe, tá vivendo errado, visse?!',
    leg: T(`Tu é de São Lourenço e ainda não provou o Brio? 👀
    Oxe, tá vivendo errado, visse?! Hambúrguer artesanal, maionese da casa e entrega quentinha na tua rua.
    Marca aquele amigo de São Lourenço que precisa conhecer 👇
    👉 Pede pelo site (link na bio).`),
    tags: '#saolourencodamata #slm #brioburger #hamburgueria',
    art: 'Câmera na mão na rua, legenda grande com sotaque; a mordida sempre na tela.' },
  { date: 'Qua 09/12', fmt: 'Carrossel · 5 telas', obj: 'Venda', title: 'Quantos Brios pra tua galera?', est: 'Como pedir: o combo certo para cada tamanho de galera.',
    ref: { id: '2883e98619', what: '“3 hamburguerias em Recife”', why: 'lista numerada que dá vontade de salvar.' },
    t: 'Quantos Brios pra tua galera?', x: 'Salva e pede pelo site.',
    telas: ['Quantos Brios pra tua galera?', '2 pessoas: 2 Brios + 1 frita.', '4 pessoas: Combo da Galera.', '6 pessoas: Combo da Galera + 2 Brios.', 'Salva e pede pelo site.'],
    leg: T(`Vai juntar a galera e não sabe quanto pedir? A gente fez a conta 👇
    👥 2 pessoas: 2 Brios + 1 frita
    👥 4 pessoas: Combo da Galera
    👥 6 pessoas: Combo da Galera + 2 Brios
    Salva esse post pra próxima resenha!
    👉 Pede pelo site (link na bio).`),
    tags: '#resenha #saolourencodamata #brioburger #hamburgueria',
    art: 'Tabela simples 2, 4 e 6 pessoas → combo certo; fundo laranja; ícones de gente.' },
  { date: 'Sáb 12/12', fmt: 'Post', obj: 'Engajamento', title: 'Marca quem te deve um Brio', est: 'Conversa e alcance de graça no fim de semana da vaquejada.',
    ref: { id: 'f313078cfe', what: '“Marca aqui quem precisa ver essa dica”', why: 'o pedido de marcação multiplica o alcance sem anúncio.' },
    t: 'Marca quem te deve um Brio.', x: 'Tem gente te devendo desde janeiro.',
    leg: T(`Todo mundo tem aquele amigo que prometeu pagar um lanche e sumiu. 👀
    Chegou a hora de cobrar: marca aqui quem te deve um Brio!
    E se for tu que tá devendo… 👉 pede pelo site (link na bio) e quita a dívida 😂`),
    tags: '#saolourencodamata #brioburger #hamburgueria #resenha',
    art: 'Foto do Brio aberto + frase grande em Lilita One com contorno azul.' },
  { date: 'Ter 15/12', fmt: 'Reels (capa)', obj: 'Engajamento', title: 'E se a gente dobrasse o Brio?', est: 'Humor de bastidor com a equipe: gente real na cozinha aberta.',
    ref: { ig: 'DfQKUihPKIf', what: 'Vizinho de São Lourenço: “croquete virou croquetão”', why: 'humor de bastidor com a equipe e um exagero que vira comentário.' },
    t: 'E se a gente dobrasse o Brio?', x: 'A Ingrid testou. Deu nisso.',
    leg: T(`A Ingrid teve uma ideia na cozinha: e se a gente dobrasse tudo no Brio? 😂🍔
    Duas carnes, o dobro de queijo e a maionese da casa. Ficou grande demais… ou na medida?
    Comenta: tu encarava esse? 👇
    👉 Pede pelo site (link na bio).`),
    tags: '#bastidores #saolourencodamata #brioburger #hamburgueria',
    art: 'Vídeo lo-fi da cozinha com a Ingrid; capa com o lanche dobrado e a pergunta em Lilita One.' },
  { date: 'Qui 17/12', fmt: 'Post + stories', obj: 'Venda', title: '13º caiu? O extra é da casa', est: '2ª parcela do 13º (17 a 20/12): combo com extra da casa, só até domingo.',
    ref: { id: '9346f7e06b', what: '“Três maioneses”: a maionese como desejo', why: 'a maionese da casa vende sozinha; ela vira o extra do 13º.' },
    t: '13º caiu?', x: 'Combo da Galera com [extra da casa] até domingo.',
    leg: T(`O 13º caiu e a galera merece! 💸🍔
    Só até domingo (20/12): pediu o Combo da Galera pelo site, ganha [extra da casa].
    👉 Pede pelo site (link na bio).`),
    tags: '#13salario #saolourencodamata #brioburger #combo',
    art: 'Combo com o extra destacado; selo “só até domingo”.' },
  { date: '23 e 26/12', fmt: 'Carrossel · 4 telas', obj: 'Venda', title: 'Hoje ninguém cozinha', est: 'Férias e pós-Natal: Sessão Brio para a noite de filme.',
    ref: { id: 'd7a3744c7b', what: 'Meme do motoboy “mais rápido da cidade”', why: 'meme simples com texto grande, fácil de compartilhar.' },
    t: 'Hoje ninguém cozinha.', x: 'Férias + sofá + Sessão Brio.',
    telas: ['Hoje ninguém cozinha.', 'Férias + sofá + filme.', 'Sessão Brio: [itens e preço].', 'Pede pelo site e só levanta pra abrir a porta.'],
    leg: T(`Férias, sofá e filme. Cozinhar? Hoje não. 🛋️🍔
    Pede a Sessão Brio e só levanta pra abrir a porta.
    👉 Pede pelo site (link na bio).
    Qual filme vocês vão ver hoje? Conta aqui 👇`),
    tags: '#ferias #saolourencodamata #brioburger #delivery',
    art: 'Foto real à noite: sofá, filme e a Sessão Brio; texto curto.' },
]

const SNT = (k) => 'sn_thumbs/' + k + '.jpg'
const WPP = '📲 Manda a lista no WhatsApp: (81) 98818-8000'
P['SN Distribuidora'] = [
  { date: 'Qua 18/11', fmt: 'Carrossel · 5 telas', obj: 'Venda', title: 'Manda a lista da obra', est: 'A oferta única do período: “Manda a lista da obra”.',
    ref: { file: SNT('S1'), at: '@hoffmannmtc', url: 'https://www.tiktok.com/@hoffmannmtc/video/7205592258215873798', net: 'TikTok', views: '23,3 mil views', what: 'Loja mostra as peças hidráulicas do estoque', why: 'estoque cheio e organizado passa confiança antes de qualquer pedido.' },
    t: 'Manda a lista da obra.', x: 'A gente confere o que tem, o que falta e devolve com o prazo.',
    telas: ['Manda a lista da obra.', 'Foto do papel ou mensagem da próxima etapa, no WhatsApp.', 'A Sandra confere o que tem e aponta o que costuma faltar.', 'Volta com orçamento e prazo certinho.', 'WhatsApp (81) 98818-8000.'],
    leg: T(`Obra parada por falta de peça custa caro. Então faz assim: manda a lista da obra pra gente. 📋
    Pode ser foto do papel ou mensagem. A Sandra confere o que tem no estoque, avisa o que costuma faltar naquela etapa e devolve o orçamento com prazo certinho.
    ${WPP}
    📍 Av. Recife, Estância`),
    tags: '#materialhidraulico #obrarecife #recife #construcaocivil #encanador',
    art: 'Capa amarela com uma lista de obra amassada (foto real) e título em Azul Profundo; selo do WhatsApp.' },
  { date: 'Ter 24/11', fmt: 'Reels (capa) fixado', obj: 'Autoridade', title: 'Oi, eu sou a Sandra', est: 'A Sandra é a cara da SN: vídeo gravado na diária de 17/11, fixado no perfil.',
    ref: { file: SNT('S7'), at: 'Loja Merc', url: 'https://www.instagram.com/p/DbdXtLGgOhL/', net: 'Instagram', views: '1.131 views', what: 'Vendedor de loja de hidráulica dá a dica', why: 'o vendedor falando para a câmera é o vídeo que mais roda em loja do nicho.' },
    t: 'Oi, eu sou a Sandra.', x: 'Pergunta de obra? Manda que eu respondo.',
    leg: T(`Oi, eu sou a Sandra, da SN Distribuidora! 👋
    A gente vende material hidráulico para quem constrói: construtora, engenheiro, mestre de obras e encanador, no Recife, em todo o estado e até em Noronha.
    Tem dúvida de peça, tubo ou conexão? Deixa nos comentários que eu respondo em vídeo.
    ${WPP}`),
    tags: '#sndistribuidora #recife #materialhidraulico #obrarecife',
    art: 'A Sandra no corredor de tubos olhando para a câmera; capa amarela com “Oi, eu sou a Sandra” em Sora.' },
  { date: 'Qui 26/11', fmt: 'Carrossel · 5 telas', obj: 'Engajamento', title: 'O nome certo da peça', est: 'Ensinar para salvar (o tema que mais roda no nicho) e fechar pedindo a lista.',
    ref: { file: SNT('S2'), at: '@ipgeletricaehidra', url: 'https://www.tiktok.com/@ipgeletricaehidra/video/7444324480333188407', net: 'TikTok', views: '130 mil views', what: 'Nomes estranhos que os clientes pedem', why: 'humor de balcão com a peça na mão: engraçado e útil.' },
    t: 'O nome certo da peça.', x: 'Cotovelo é joelho. Salva pra não errar no balcão.',
    telas: ['O nome certo da peça.', '“Cotovelo” → joelho.', '“Torneirinha da parede” → registro.', '“Cano grosso do esgoto” → tubo de esgoto 100 mm.', 'Salva pra não errar. Ou manda a lista que a gente traduz.'],
    leg: T(`Todo dia chega pedido assim no balcão: “me vê um cotovelo”, “a torneirinha da parede”… 😅
    No carrossel, o apelido e o nome certo de cada peça. Salva pra não errar na hora de comprar!
    Não sabe o nome? Sem problema: manda a foto ou a lista que a gente identifica.
    ${WPP}`),
    tags: '#encanador #materialhidraulico #obrarecife #recife',
    art: 'Duas colunas: o apelido entre aspas e a peça real recortada com o nome certo; a gota azul marca cada item.' },
  { date: 'Ter 01/12', fmt: 'Post (arte para salvar)', obj: 'Autoridade', title: 'As conexões numa arte só', est: 'Ensinar: conteúdo técnico simples, que o profissional salva e manda para a equipe.',
    ref: { file: SNT('S3'), at: '@engciviladrianovanjura', url: 'https://www.tiktok.com/@engciviladrianovanjura/video/7256503025370615045', net: 'TikTok', views: '112 mil views', what: 'Tipos de conexões hidráulicas numa arte', why: 'uma arte só com todas as peças, feita para salvar (532 salvamentos).' },
    t: 'Conexões: cada uma serve pra quê?', x: 'Joelho, luva, tê, união e cap. Salva essa.',
    leg: T(`Salva essa arte! 📌
    🔹 Joelho 90°: faz a curva
    🔹 Luva: emenda dois tubos
    🔹 Tê: divide o caminho em dois
    🔹 União: permite desmontar sem cortar
    🔹 Cap: fecha a ponta do tubo
    Precisa de alguma delas pra obra? Manda a lista que a gente confere.
    ${WPP}`),
    tags: '#conexoes #materialhidraulico #obrarecife #recife #encanador',
    art: 'Peças Tigre reais recortadas em grade sobre fundo amarelo, com o nome e a função curta embaixo de cada uma.' },
  { date: '27 a 30/11', fmt: 'Post + 4 stories', obj: 'Venda', title: 'Semana da Lista', est: 'Black Friday sem desconto: a lista enviada de 27 a 30/11 sai na frente.',
    ref: { file: SNT('P_bart'), at: '@bartofildistribuidora', url: 'https://www.tiktok.com/@bartofildistribuidora/video/7364364364628905221', net: 'TikTok', views: 'vídeo de distribuidora', what: 'Vendedor de distribuidora fala com o profissional', why: 'gente da casa, de uniforme, chamando para o pedido.' },
    t: 'Black Friday na obra não é desconto. É não parar.', x: 'Lista enviada de 27 a 30/11 sai na frente.',
    telas: ['Story 1: “Semana da Lista: 27 a 30/11”.', 'Story 2: “Manda a lista da próxima etapa”.', 'Story 3: “Ela sai na frente na separação e na entrega”.', 'Story 4: botão do WhatsApp.'],
    leg: T(`Black Friday na obra não é desconto. É a obra não parar. 🚧
    De 27 a 30/11 é a Semana da Lista na SN: mandou a lista da próxima etapa nesses dias, ela sai na frente na separação e na entrega.
    ${WPP}`),
    tags: '#blackfriday #obrarecife #materialhidraulico #recife',
    art: 'Fundo Azul Profundo, “Semana da Lista” grande em amarelo, datas 27–30/11; caminhão da SN carregado ao fundo.' },
  { date: 'Qui 03/12', fmt: 'Reels (capa) + arte', obj: 'Autoridade', title: 'A peça de R$ 8 que parou a obra', est: 'O argumento da SN: tempo de obra, não preço de peça.',
    ref: { file: SNT('S9'), at: '@terrahydro', url: 'https://www.tiktok.com/@terrahydro/video/7667941432996449556', net: 'TikTok', views: '6,8 mil views', what: '“A peça certa: não arrisque”', why: 'mostra o custo da peça errada; nós mostramos o custo da peça que falta.' },
    t: 'A peça de R$ 8 que parou a obra.', x: 'Não é o preço da peça. É o dia parado da equipe.',
    leg: T(`Uma conexão de R$ 8 faltou. Resultado: equipe inteira parada, dia perdido e obra atrasada. 😬
    Por isso, antes de começar a etapa, manda a lista pra SN. A gente confere tudo e avisa o que costuma faltar, antes de faltar.
    ${WPP}`),
    tags: '#obrarecife #engenhariacivil #materialhidraulico #recife',
    art: 'Conexão pequena na palma da mão em close; “R$ 8” ao lado de “1 dia parado”; fundo areia.' },
  { date: 'Ter 08/12', fmt: 'Carrossel · 5 telas', obj: 'Venda', title: 'Qual caixa d’água para quantas pessoas?', est: 'Verão: laje e caixa d’água. Kits por etapa com Fortlev.',
    ref: { file: SNT('P_caixa'), at: '@sndistribuidorape', url: 'https://www.instagram.com/p/DPjNtVDDrcA/', net: 'Instagram', views: 'post da própria SN', what: 'Referência interna: caixas d’água com gente ao lado', why: 'a pessoa ao lado da caixa dá a escala; repetimos com a tabela.', inner: true },
    t: 'Qual caixa d’água para quantas pessoas?', x: 'Moram [X] pessoas? A caixa certa é de [Y] litros.',
    telas: ['Qual caixa d’água para quantas pessoas?', 'Até 3 pessoas: [___ L].', '4 a 5 pessoas: [___ L].', '6 ou mais: [___ L].', 'Na dúvida? Manda no zap que a Sandra indica.'],
    leg: T(`Caixa d’água pequena demais, falta água. Grande demais, é dinheiro parado. 💧
    No carrossel, a conta rápida: quantas pessoas moram na casa e qual caixa vai bem. Temos caixas Fortlev de vários tamanhos.
    Ficou na dúvida? Manda no WhatsApp quantas pessoas moram e a Sandra indica a caixa certa.
    📲 (81) 98818-8000`),
    tags: '#caixadagua #obrarecife #recife #materialhidraulico',
    art: 'Tabela pessoas → litros com ícones de gente; caixas Fortlev reais recortadas em tamanhos diferentes (litragens validadas pela SN).' },
  { date: 'Qui 10/12', fmt: 'Carrossel · 5 telas', obj: 'Autoridade', title: 'Obra sem rede de esgoto? Biodigestor.', est: 'Ensinar + venda: loteamento, sítio e Noronha.',
    ref: { file: SNT('S5'), at: '@eng.pipek', url: 'https://www.tiktok.com/@eng.pipek/video/7444668470383430967', net: 'TikTok', views: '1,2 mil views', what: '“Pra que serve essa peça?”', why: 'pergunta direta e resposta curta, em formato de série.' },
    t: 'Obra sem rede de esgoto? Biodigestor.', x: '3 erros de instalação que a gente vê.',
    telas: ['Obra sem rede de esgoto? Biodigestor.', 'Erro 1: base sem nivelar e sem compactar.', 'Erro 2: água de chuva ligada no sistema.', 'Erro 3: esquecer o respiro.', 'Vai instalar? Manda a lista que a gente monta o kit.'],
    leg: T(`Loteamento, sítio, casa de praia ou Noronha: onde não tem rede de esgoto, o biodigestor resolve. ♻️
    No carrossel, os 3 erros de instalação que a gente mais vê:
    1. base sem nivelar e compactar
    2. água de chuva ligada no sistema
    3. falta do respiro
    Vai instalar? Manda a lista que a gente monta o kit.
    📲 (81) 98818-8000`),
    tags: '#biodigestor #saneamento #obrarecife #recife',
    art: 'Corte do biodigestor em ilustração limpa; erros com X vermelho e o certo com a gota azul (texto conferido pelo técnico).' },
  { date: 'Ter 15/12', fmt: 'Reels (capa)', obj: 'Autoridade', title: 'Quem compra conta', est: 'Prova: um profissional real diz por que volta.',
    ref: { file: SNT('S8'), at: 'Loja Merc', url: 'https://www.instagram.com/p/DbbLQmTh40L/', net: 'Instagram', views: '1.044 views', what: 'Cliente encanador recomenda no balcão', why: 'a palavra de quem compra vale mais que a da loja.' },
    t: 'Por que ele compra na SN?', x: '[Nome], [profissão], responde.',
    leg: T(`A gente pode falar muito da SN… mas é melhor ouvir quem compra. 🔧
    O [nome], [profissão], compra com a gente há [tempo] e conta por que volta.
    Também é cliente SN? Comenta aqui e conta sua experiência 👇
    ${WPP}`),
    tags: '#encanador #obrarecife #recife #sndistribuidora',
    art: 'Profissional no balcão ou na obra, de colete; nome e profissão na capa; selo do WhatsApp.' },
  { date: '14 a 23/12', fmt: 'Post + stories', obj: 'Venda', title: 'Pedido programado de janeiro', est: 'Antes das férias coletivas: fecha em dezembro, recebe na volta.',
    ref: { file: SNT('S10'), at: '@sndistribuidorape', url: 'https://www.instagram.com/p/DeMGGjyx19c/', net: 'Instagram', views: 'post mais curtido da SN', what: 'Referência interna: a Sandra com o carrinho no corredor', why: 'o pedido sendo montado mostra o serviço; usamos para o pedido de janeiro.', inner: true },
    t: 'Fecha agora, recebe na volta.', x: 'Pedido até [19/12], entrega na semana de [05/01].',
    telas: ['Story 1: “Férias coletivas chegando.”', 'Story 2: “O material da volta já está separado?”', 'Story 3: “Pedido até [19/12], entrega agendada para [05/01].”', 'Story 4: botão do WhatsApp.'],
    leg: T(`As férias coletivas estão chegando. E o material da volta, já está garantido? 📅
    Com o pedido programado da SN, você fecha agora e recebe na obra na semana de [05/01], sem correr atrás de peça em janeiro.
    Pedidos até [19/12].
    Obrigado a cada obra que confiou na SN em 2026! 💛💙
    ${WPP}`),
    tags: '#obrarecife #construcaocivil #materialhidraulico #recife',
    art: 'Calendário de dezembro com as férias em amarelo e o pedido “agendado” em azul; foto real da equipe no fim.' },
]

const ord = (a, o) => o.map((i) => a[i])
P.VOVINA = ord(P.VOVINA, [0, 1, 2, 3, 4, 5, 6, 8, 7, 9])
P['Brio Burguer'] = ord(P['Brio Burguer'], [0, 1, 2, 4, 5, 3, 6, 7, 8, 9])
P['SN Distribuidora'] = ord(P['SN Distribuidora'], [0, 1, 2, 4, 3, 5, 6, 7, 8, 9])

const CSS = `<style>
.pg.post{padding-top:34px}
.pg.post h1{font-size:31px;margin-bottom:14px;max-width:1220px}
.sp{display:grid;grid-template-columns:300px 1fr;gap:26px;height:100%}
.sp .rf{background:#fff;border:2px solid var(--dk);border-radius:16px;box-shadow:6px 6px 0 var(--dk);padding:10px;display:flex;flex-direction:column;min-height:0}
.sp .rf a.im{position:relative;display:block;flex:1;min-height:0;border-radius:10px;overflow:hidden;background:#0B3C44}
.sp .rf img{width:100%;height:100%;object-fit:cover;display:block}
.sp .rf .rt{position:absolute;left:8px;top:8px;background:var(--cy);color:var(--dk);font:800 10.5px Inter;letter-spacing:.07em;text-transform:uppercase;padding:4px 8px;border-radius:999px;border:1.5px solid var(--dk)}
.sp .rf .rt.in{background:#fff}
.sp .rf .pl{position:absolute;right:8px;bottom:8px;background:rgba(11,60,68,.88);color:#fff;font:700 11.5px Inter;padding:5px 9px;border-radius:999px}
.sp .rf .ra{font:800 15px Inter;margin-top:9px;word-break:break-all}
.sp .rf .rw{font-size:12.5px;line-height:1.3;color:#24525a;margin-top:2px}
.sp .rf .rv{font:700 12px Inter;color:var(--pe);margin-top:3px}
.sp .arts{margin-top:8px;border-top:1.5px dashed #b9d6db;padding-top:7px}.sp .arts .lb{margin-bottom:4px}
.sp .ar{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;text-decoration:none;color:var(--dk)}.sp .ar img{width:52px;height:68px;object-fit:cover;border-radius:6px;border:1.5px solid var(--dk);flex:0 0 auto}
.sp .ar span{font-size:11.6px;line-height:1.25}.sp .ar b{display:block;font-size:12px}.sp .ar em{display:block;font-style:normal;font-weight:800;color:var(--pe);font-size:11px;margin-top:1px}
.sp .rgt{display:flex;flex-direction:column;min-height:0}
.sp .chips{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:9px}
.sp .chips span{font:800 12px Inter;padding:5px 11px;border-radius:999px;border:1.5px solid var(--dk)}
.sp .c-f{background:#E3F7FA;color:var(--pe)}.sp .c-o{background:var(--dk);color:#fff}.sp .c-d{background:var(--cy);color:var(--dk)}
.sp .est{font-size:14px;line-height:1.35;background:#fff;border-left:6px solid var(--cy);border-radius:8px;padding:7px 12px;margin-bottom:12px}
.sp .est b{color:var(--pe)}
.sp .two{display:grid;grid-template-columns:1fr 1.08fr;gap:18px;flex:1;min-height:0}
.sp .bx{background:#fff;border:2px solid var(--dk);border-radius:14px;box-shadow:4px 4px 0 var(--dk);padding:13px 15px;min-height:0}
.sp .lb{display:block;font:800 11px Inter;text-transform:uppercase;letter-spacing:.07em;color:var(--pe);margin-bottom:5px}
.sp .ct{font:800 21px/1.15 'Inter Display',Inter;margin-bottom:5px}
.sp .cx{font-size:15px;line-height:1.35;color:#24525a}
.sp ol{margin:9px 0 0 0;padding:0;list-style:none;counter-reset:t}
.sp ol li{counter-increment:t;position:relative;padding-left:27px;font-size:13.3px;line-height:1.3;margin-bottom:5px}
.sp ol li:before{content:counter(t);position:absolute;left:0;top:0;width:19px;height:19px;border-radius:6px;background:var(--dk);color:#fff;font:800 11px/19px Inter;text-align:center}
.sp .left{display:flex;flex-direction:column;gap:12px;min-height:0}
.sp .art{font-size:13.5px;line-height:1.35}
.sp .why{font-size:13.5px;line-height:1.35;background:#E3F7FA;border-radius:10px;padding:9px 12px}
.sp .why b{color:var(--pe)}
.sp .leg p{font-size:14.5px;line-height:1.38;margin-bottom:7px}.sp .leg p.li{margin-bottom:1px}
.sp .hs{margin-top:8px;font:700 13.5px Inter;color:var(--pe)}
.smt{width:100%;border-collapse:separate;border-spacing:0;font-size:14.2px;line-height:1.25;background:#fff;border:2px solid var(--dk);border-radius:14px;overflow:hidden;box-shadow:6px 6px 0 var(--dk)}
.smt th{background:var(--dk);color:#fff;text-align:left;padding:8px 10px;font:800 12px Inter;text-transform:uppercase;letter-spacing:.05em}
.smt td{padding:7px 10px;border-top:1px solid #d5e7ea;vertical-align:middle}
.smt td.n{font-weight:800;width:40px}.smt td.d{font-weight:800;white-space:nowrap;width:150px}.smt td.f{color:var(--pe);font-weight:600;width:200px}.smt td.r{color:#4b6d73;width:230px}
.smt .ob{display:inline-block;font:800 11px Inter;padding:3px 8px;border-radius:999px;background:#E3F7FA;color:var(--pe);border:1.5px solid var(--pe)}
.smt .ob.v{background:var(--dk);color:#fff;border-color:var(--dk)}
</style>`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function pages(d, brand) {
  const L = P[brand]
  const R = L.map((p) => ref(p.ref))
  const nReal = R.filter((r) => !r.inner).length
  if (!L.noOverview) d.page('pf', `${brand} · As 10 postagens do período`, '10 postagens prontas: referência real, copy e legenda', `${CSS}
  <table class="smt"><thead><tr><th>Nº</th><th>Quando</th><th>Formato</th><th>Postagem</th><th>Objetivo</th><th>Referência</th></tr></thead>
  <tbody>${L.map((p, i) => `<tr><td class="n">${String(i + 1).padStart(2, '0')}</td><td class="d">${p.date}</td><td class="f">${p.fmt}</td><td><b>${p.title}</b></td><td><span class="ob ${p.obj === 'Venda' ? 'v' : ''}">${p.obj}</span></td><td class="r">${R[i].at}${R[i].inner ? ' (interna)' : ''}</td></tr>`).join('')}</tbody></table>
  <p class="cap" style="margin-top:12px;font-size:13.5px;color:#4b6d73">${nReal} referências reais do nicho${nReal < 10 ? ` e ${10 - nReal} interna${10 - nReal > 1 ? 's' : ''} (post da própria marca)` : ''}. Toque na miniatura de cada página para abrir o post original. Itens entre [colchetes] dependem das decisões da estratégia.</p>`, { cls: 'dense' })
  L.forEach((p, i) => {
    const r = R[i]
    d.page('pf', `${brand} · Postagem ${String(i + 1).padStart(2, '0')} de 10`, p.title, `${i === 0 && L.noOverview ? CSS : ''}
  <div class="sp">
    <div class="rf">
      <a class="im" href="${r.url}" target="_blank"><img src="${r.src}" alt="Referência ${r.at}"><span class="rt ${r.inner ? 'in' : ''}">${r.inner ? 'Referência interna' : 'Referência real'}</span><span class="pl">▶ Abrir no ${r.net}</span></a>
      <div class="ra">${r.at}</div>
      <div class="rw">${r.what}</div>
      <div class="rv">${r.views} · ${r.net}</div>
      ${p.arts ? `<div class="arts"><span class="lb">Referências de arte</span>${p.arts.map((a) => `<a class="ar" href="${a.url}" target="_blank"><img src="${a.src}" alt=""><span><b>${a.at}</b>${a.take}<em>${a.d}</em></span></a>`).join('')}</div>` : ''}
    </div>
    <div class="rgt">
      <div class="chips"><span class="c-d">${p.date}</span><span class="c-f">${p.fmt}</span><span class="c-o">Objetivo: ${p.obj}</span></div>
      <div class="est"><b>Na estratégia:</b> ${p.est}</div>
      <div class="two">
        <div class="left">
          <div class="bx"><span class="lb">Copy da arte</span><div class="ct">${p.t}</div><div class="cx">${p.x}</div>
            ${p.telas ? `<ol>${p.telas.map((t) => `<li>${t}</li>`).join('')}</ol>` : ''}</div>
          <div class="why"><b>Da referência, pegamos:</b> ${r.why}</div>
          <div class="art"><span class="lb">Direção de arte</span>${p.art}</div>
        </div>
        <div class="bx"><span class="lb">Legenda pronta para postar</span><div class="leg">${p.leg.split('\n').map((l) => `<p class="${/^(\d️⃣|🔹|👥|\d\. )/u.test(l) ? 'li' : ''}">${esc(l)}</p>`).join('')}</div><div class="hs">${p.tags}</div></div>
      </div>
    </div>
  </div>`, { cls: 'post' })
  })
  return { nReal }
}

module.exports = { pages, P }
