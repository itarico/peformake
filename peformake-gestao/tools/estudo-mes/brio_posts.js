// Brio Burguer · 10 postagens (formato do sm.js). Cada uma aponta para a tese, uma oferta ou uma meta da estratégia.
const TH = (f) => '../../brio2/th/' + f + '.jpg'
const TT = (u, id) => `https://www.tiktok.com/@${u}/video/${id}`
const T = (s) => s.trim().replace(/\n[ \t]+/g, '\n')
const SITE = '👉 Pede pelo site: link na bio.'

const L = [
  { date: 'Qua 18/11 (volta)', fmt: 'Carrossel · 5 telas', obj: 'Relacionamento', title: 'Sumimos. Voltamos com fome.',
    est: '<b>Tese</b>: o perfil volta a existir antes de qualquer anúncio (parado desde 29/10). Papel: atrair. Meta: 1.500 views de média até 31/12.',
    ref: { file: TH('old_f1cbfd78'), at: '@jurito.br', url: 'https://www.instagram.com/p/DfLFFqpvg9q/', net: 'Instagram', views: '5.958 views', what: 'Concorrente de São Lourenço anuncia a chegada', why: 'a volta vira acontecimento, com gente da casa. No Brio vira humor honesto: assumir o sumiço e voltar com uma promessa que se prova.' },
    t: 'Sumimos. Voltamos com fome.', x: 'E agora o Brio chega quente. A gente prova.',
    telas: ['“Sumimos.” Foto real da chapa ligando, sem texto extra', '“20 dias sem postar. A chapa não parou.” [confirmar com o Brio]', '“Agora a gente prova que chega quente.” Termômetro na tampa da caixa', '“Pra galera: Combo da Galera, dia 27.”', '“Ativa o sininho. Pede pelo site.”'],
    leg: T(`Oxe, sumimos mesmo. 😅
    Mas a chapa não parou, visse? Voltamos com o Brio de sempre e uma promessa nova: chega quente na tua casa, e a gente vai provar.
    Dia 27 tem novidade pra galera. Ativa o sininho. 🔔
    ${SITE}`),
    tags: '#brioburger #saolourencodamata #hamburgueriaartesanal #camaragibe',
    art: 'Fundo Pão (#FFF1DF), título em Lilita One laranja com contorno azul; foto real lo-fi em toda tela; termômetro aparece só na 3ª.' },

  { date: 'Sex 20/11 (feriado)', fmt: 'Reels (capa) · vídeo de celular', obj: 'Engajamento', title: 'Feriado? Junta a galera.',
    est: '<b>Oferta principal</b> em teaser: Combo da Galera chega dia 27. Papel: atrair. Meta: 2 mil views e 15 marcações.',
    ref: { file: TH('tt_7640649396593478933'), at: '@gabrieldozedopastel', url: TT('gabrieldozedopastel', '7640649396593478933'), net: 'TikTok', views: '2,4 mi views · 76 mil compartilhamentos', what: 'Combo exagerado aberto em cima da mesa', why: 'o combo ocupa a tela inteira e os itens entram um a um; o exagero dá vontade de marcar alguém. Pegamos o “abre a caixa de cima”, sem o exagero de preço.' },
    t: 'Feriado? Junta a galera.', x: 'Combo da Galera chega dia 27. Marca quem vai.',
    leg: T(`Feriado é dia de juntar a galera. 🍔🍟
    E dia 27 chega o Combo da Galera: Brio pra todo mundo, sem briga pelo último pedaço.
    Marca aqui quem vai rachar contigo 👇
    ${SITE}`),
    tags: '#feriado #saolourencodamata #brioburger #combo',
    art: 'Capa: caixa aberta vista de cima ocupando 70% da tela; “Junta a galera” em Lilita One branca com contorno azul; selo laranja “dia 27”.' },

  { date: 'Dom 22/11', fmt: 'Post (arte única)', obj: 'Educar → venda', title: 'Quantos Brios a tua galera precisa?',
    est: '<b>Oferta principal</b>: mostra o preço <b>por pessoa</b> antes do lançamento. Papel: quebrar a objeção “é caro”. Meta: 40 salvamentos.',
    ref: { file: TH('tt_7667962574771703057'), at: '@joaododelivery', url: TT('joaododelivery', '7667962574771703057'), net: 'TikTok', views: '53,8 mil views', what: '“3 combos que toda hamburgueria deveria ter”', why: 'organiza o cardápio por tamanho de grupo, não por produto: quem lê se acha na lista. Pegamos a tabela por número de pessoas.' },
    t: 'Quantos Brios a tua galera precisa?', x: '2, 4 ou 6 pessoas: a conta já vem feita.',
    telas: ['1 pessoa → 1 Brio + frita · [R$ x]', '4 pessoas → Combo da Galera · R$ [x/4] por pessoa', '5 ou 6 pessoas → Combo da Galera + 1 ou 2 Brios + frita · [R$ x por pessoa]'],
    leg: T(`Pra ninguém ficar com fome e ninguém pagar demais: 🧮
    Sozinho: 1 Brio + frita
    4 pessoas: Combo da Galera
    6 pessoas: os dois juntos
    O preço por pessoa tá na arte. Salva pra hora da fome. 📌
    ${SITE}`),
    tags: '#hamburgueriaartesanal #saolourencodamata #brioburger #galera',
    art: 'Tabela de 3 linhas em fundo laranja; o número “por pessoa” é o maior elemento da linha; foto do combo recortada à direita.' },

  { date: 'Qua 25/11', fmt: 'Stories · sequência de 5', obj: 'Relacionamento', title: 'Black Friday do Brio: vem aí',
    est: '<b>Calendário</b>: aquece a Black Friday (27 a 29/11). Papel: atrair. Meta: 150 respostas na enquete e 40 lembretes ativados.',
    ref: { file: TH('tt_7699651942640815380'), at: '@sandyyburguer', url: TT('sandyyburguer', '7699651942640815380'), net: 'TikTok', views: '81,5 mil views', what: '“Calma! Ainda não é lançamento” (Recife)', why: 'o teaser cria espera com humor e sotaque, sem mostrar tudo. Pegamos o “ainda não”: mostra a caixa fechada e segura a revelação.' },
    t: 'Black Friday do Brio: sem baixar o preço do combo. O 5º é por R$ 1.', x: 'Sexta, 27. Ativa o lembrete.',
    telas: ['Caixa fechada: “Sexta tem coisa nova aqui dentro”', 'Enquete: “Qual Brio a tua galera pede?” (Matuto × Costela)', 'Caixinha: “Quantas pessoas na tua galera?”', 'Contagem regressiva “Black Friday do Brio · 27/11”', '“Sem desconto. Com extra.” + link do site'],
    leg: T(`Stories, sem legenda de feed. Texto na tela:
    “Sexta tem coisa nova aqui dentro.”
    “Black Friday do Brio: sem baixar o preço do combo. O 5º é por R$ 1.”
    Lembrete ativado = aviso na hora que abrir.`),
    tags: 'Sticker de local: São Lourenço da Mata',
    art: 'Fundo laranja Brio; caixa fechada real em close; contagem regressiva com contorno azul grosso.' },

  { date: 'Sex 27/11 (Black Friday)', fmt: 'Carrossel · 4 telas', obj: 'Venda', title: 'Black Friday: sem baixar o preço do combo, o 5º é por R$ 1',
    est: '<b>Oferta principal</b>: Combo da Galera, o 5º Brio por R$ 1 e a garantia da hora (decisões 1 e 2). Papel: converter. Meta: junto com o B4, 20 Combos da Galera na Black Friday.',
    ref: { file: TH('tt_7694032968486063378'), at: '@hamburgueriaexprescombos', url: TT('hamburgueriaexprescombos', '7694032968486063378'), net: 'TikTok', views: '1,1 mi views · 14 mil compartilhamentos', what: '“Atenção! Novo combo no cardápio”', why: 'o combo inteiro já na 1ª imagem e a urgência dita em uma linha. Pegamos a 1ª tela “tudo que vem”, com o preço por pessoa no lugar do preço cheio.' },
    t: 'R$ [x/4] pra cada.', x: 'E o 5º Brio sai por R$ 1, pro amigo atrasado.',
    telas: ['O Combo da Galera aberto: 4 Brios + 2 fritas + refri 2 L', '“R$ [x] ÷ 4 = R$ [x/4] pra cada” enorme + “o atendente manda o Pix já dividido”', '“Só na Black Friday: o 5º Brio por R$ 1, pro amigo que chegou atrasado”', '“Saiu da chapa às [hora no bilhete]. Passou de [45] min, a próxima batata é nossa.”'],
    leg: T(`Black Friday do Brio: a conta já vem feita. 🔥
    Combo da Galera: 4 Brios + 2 fritas + refri 2 L por R$ [x]. Dá R$ [x/4] pra cada, e a gente manda o Pix já dividido.
    Só de 27 a 29/11: o 5º Brio sai por R$ 1, pro amigo que chegou atrasado.
    A hora que saiu da chapa vem no bilhete. Passou de [45] min, a próxima batata é nossa.
    ${SITE}`),
    tags: '#blackfriday #saolourencodamata #brioburger #comboparadividir',
    art: 'Tela 1 de cima, combo inteiro; a conta “÷ 4” é o maior elemento da tela 2; Vermelho Ketchup só no selo “27 a 29/11”.' },

  { date: 'Dom 29/11', fmt: 'Capa de Reels (vídeo B1)', obj: 'Prova', title: 'A hora vem no bilhete',
    est: '<b>Tese</b> “a caixa é a vitrine”: garantia da hora. Papel: quebrar a objeção “chega frio?”. Publica só depois de 5 medições reais. Meta: 3 mil views e 10 comentários com bairro.',
    ref: { file: TH('tt_7398299320572710150'), at: '@teffa_vitoria', url: TT('teffa_vitoria', '7398299320572710150'), net: 'TikTok', views: '3,6 mi views', what: '“A cliente pediu 10 lanches duplos”', why: 'um número na tela vira o assunto e todo mundo comenta. No Brio o número é a hora que saiu da chapa, escrita no bilhete.' },
    t: 'Saiu da chapa às [19h41].', x: 'Passou de [45] min, a próxima batata é nossa.',
    leg: T(`A hora que teu Brio saiu da chapa vem escrita no bilhete. ⏱️
    Passou de [45] min até a tua porta? A próxima batata é nossa.
    Medimos a caixa 5 vezes antes de prometer. Comenta teu bairro 👇
    ${SITE}`),
    tags: '#delivery #saolourencodamata #brioburger #chegaquente',
    art: 'Capa com o bilhete em close e a hora gigante em Lilita One; caixa fechada com o termômetro infravermelho apontado para a tampa (nunca para o lanche).' },

  { date: 'Qua 02/12', fmt: 'Carrossel · 5 telas', obj: 'Venda', title: 'Vale-Brio: o amigo secreto que ninguém devolve',
    est: '<b>Oferta sazonal</b>: Vale-Brio do Amigo Secreto (venda de 01 a 23/12; vale 90 dias). Papel: converter e já vender janeiro. Meta: 10 vales por este post.',
    ref: { file: TH('tt_7452855699224251654'), at: '@babi.estrela', url: TT('babi.estrela', '7452855699224251654'), net: 'TikTok', views: '2,8 mi views · 84 mil compartilhamentos', what: '“O melhor amigo secreto de todos”', why: 'amigo secreto é o assunto de dezembro que todo mundo compartilha. Pegamos o tema e entramos com um presente que cabe no limite de valor da brincadeira.' },
    t: 'Tirou alguém difícil?', x: 'Vale-Brio: o presente que ninguém devolve.',
    telas: ['“Tirou alguém difícil no amigo secreto?”', '“Vale-Brio: [R$ 40] ou [R$ 70]” (dentro do limite da brincadeira)', '“Compra no site ou no Pix; o vale chega com o nome de quem ganha”', '“Vale 90 dias; usou em janeiro, ganha [batata extra]”', '“Garante até 23/12.”'],
    leg: T(`Amigo secreto da firma, da sala ou da família? 🎁
    O Vale-Brio resolve: [R$ 40] ou [R$ 70], chega com o nome de quem ganha e vale 90 dias. Usou em janeiro? Ganha [batata extra].
    Ninguém devolve hambúrguer. 😅
    Garante até 23/12: chama no WhatsApp ou pede pelo site.`),
    tags: '#amigosecreto #saolourencodamata #brioburger #presente',
    art: 'Vale desenhado como um ingresso laranja com contorno azul; laço de presente só como detalhe; nada de Papai Noel.' },

  { date: 'Sáb 21/11', fmt: 'Capa de Reels (vídeo B5)', obj: 'Engajamento', title: 'Matuto × Costela às cegas',
    est: '<b>Black Friday</b>: a galera escolhe às cegas qual é o Brio da Black Friday. Papel: atrair. Meta: 4 mil views e 40 comentários com palpite.',
    ref: { file: TH('tt_7123618797570772229'), at: '@guiadohamburguer', url: TT('guiadohamburguer', '7123618797570772229'), net: 'TikTok', views: '822 mil views', what: '“Teste cego: dá pra diferenciar?”', why: 'a comparação às cegas faz o público decidir junto e comentar o palpite. Pegamos a escolha às cegas, entre dois Brios, sem resultado combinado.' },
    t: 'Matuto ou Costela?', x: 'A galera escolhe o Brio da Black Friday.',
    leg: T(`Matuto ou Costela? Às cegas, na rua de São Lourenço. 🙈🍔
    O que a galera escolher vira o Brio da Black Friday.
    E tu, qual é o teu? Comenta antes de ver o final 👇
    ${SITE}`),
    tags: '#asCegas #saolourencodamata #brioburger #blackfriday',
    art: 'Capa dividida A | B com os dois Brios sem embalagem; venda nos olhos de quem prova; “Matuto ou Costela?” em Lilita One.' },

  { date: 'Sex 11/12', fmt: 'Post + stories', obj: 'Indicação', title: 'Quem te deve um Brio?',
    est: '<b>Indicação</b>: marca quem te deve e passa o código BRIO-XXX do bilhete; pedido no site com o código = [mimo] para os dois (decisão 4). Papel: atrair. Meta: 15 indicações com código.',
    ref: { file: TH('tt_7703684315669990677'), at: '@vivinarua', url: TT('vivinarua', '7703684315669990677'), net: 'TikTok', views: '46 mil views (02/11)', what: 'Criadora do Recife: “marca aqui quem…”', why: 'o pedido de marcação com um motivo concreto multiplica o alcance de graça. Pegamos o “marca” e damos o motivo: a dívida.' },
    t: 'Quem te deve um Brio?', x: 'Marca. A dívida vence no fim de semana.',
    leg: T(`Todo mundo tem um amigo que tá devendo um lanche. 👀
    Marca ele aqui e passa o teu código BRIO-XXX (tá no bilhete da tua caixa). Ele digita no pedido do site e os dois ganham [mimo].
    A dívida vence no domingo. 😅
    ${SITE}`),
    tags: '#brioburger #saolourencodamata #marcaoamigo #hamburgueriaartesanal',
    art: 'Arte de “nota promissória” divertida: “Eu, ___, devo um Brio a ___”; Brio aberto no canto; azul Brio nas linhas.' },

  { date: 'Sex 18/12', fmt: 'Post (arte única)', obj: 'Venda', title: 'O 13º caiu. A galera também.',
    est: '<b>Semana do 13º</b> (18 a 20/12, 2ª parcela até 20/12): Combo da Galera com extra da casa. Papel: converter. Meta: 10 combos no fim de semana.',
    ref: { file: TH('tt_7660631615290363143'), at: '@hamburgueriadiskfomebr', url: TT('hamburgueriadiskfomebr', '7660631615290363143'), net: 'TikTok', views: '569 mil views', what: '“Tudo por apenas R$ 54,90”', why: 'o preço fechado em destaque com o combo inteiro na foto. Pegamos a composição; o destaque é o extra que vem junto, sem baixar o preço.' },
    t: 'O 13º caiu. A galera também.', x: 'Combo da Galera com extra da casa, só até domingo.',
    leg: T(`O 13º caiu e a galera apareceu. 💸🍔
    Combo da Galera com extra da casa, de 18 a 20/12. A hora da chapa vem no bilhete.
    ${SITE}`),
    tags: '#13salario #saolourencodamata #brioburger #combo',
    art: 'Foto do combo de cima com moedas/cédulas de brinquedo saindo da caixa; “13º” enorme em Lilita One com contorno azul.' },
]

module.exports = [0, 1, 7, 2, 3, 4, 5, 6, 8, 9].map((i) => L[i])
