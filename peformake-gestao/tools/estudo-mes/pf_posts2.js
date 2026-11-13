// 10 postagens da Peformake (12/11 a 31/12/2026). Referências reais: YouTube e Biblioteca de Anúncios da Meta.
const T = (s) => s.trim().replace(/\n[ \t]+/g, '\n')
const YT = (id) => 'https://www.youtube.com/shorts/' + id
const YTW = (id) => 'https://www.youtube.com/watch?v=' + id
const AD = 'https://www.facebook.com/ads/library/?id='
const R = (file, at, url, net, views, what, why) => ({ file: 'pf_thumbs/' + file + '.jpg', at, url, net, views, what, why })
const WPP = '📲 Raio-X grátis no WhatsApp: (81) 98567-2212 (link na bio)'
const TAG = '#marketingrecife #recife #pequenosnegocios #empreendedorismorecife #peformake'

module.exports = [
  { date: 'Ter 17/11', fmt: 'Carrossel · 8 telas', obj: 'Relação', title: 'Quem faz o quê na Peformake', est: 'A equipe é o conteúdo: cada pessoa com foto, nome e o que o cliente ganha com o trabalho dela.',
    ref: R('yt_hC-I-JoXxho', '@sociosdomarketing', YTW('hC-I-JoXxho'), 'YouTube', '793 views', 'Agência mostra a sala e cada pessoa da equipe', 'a equipe trabalhando de verdade; aqui vira um carrossel com foto real e uma frase de cada um.'),
    t: 'Quem faz o marketing do seu negócio?', x: 'Sete pessoas e uma produtora. Prazer.',
    telas: ['Quem faz o marketing do seu negócio? Prazer, Peformake.', 'Italo: estratégia, tráfego e o Raio-X do seu marketing.', 'Thyfany: lidera a equipe e cuida do seu calendário.', 'Ingrid: social media, stories e as respostas do dia a dia.', 'Higor: as artes que vendem, não só as que enfeitam.', 'Aleffer: grava dentro do seu negócio.', 'Almeida e Lucas: transformam 40 minutos de gravação em 30 segundos que vendem.', 'E a Ellcazo, nossa produtora parceira. Raio-X grátis no WhatsApp.'],
    leg: T(`Muita gente pergunta: “quem vai cuidar do meu marketing?” 👀
    Aqui não é uma pessoa fazendo tudo no automático. É uma equipe, cada um no que faz melhor, todo mês, olhando o seu número.
    Arrasta para conhecer quem faz o marketing de 32 negócios do Grande Recife.
    ${WPP}`),
    tags: TAG + ' #bastidores',
    art: 'Fundo branco, foto real de cada pessoa trabalhando (recorte com sombra ciano), nome em azul-escuro e a função em uma linha. Última tela em azul-escuro com o selo do Raio-X.' },

  { date: 'Qui 19/11', fmt: 'Carrossel · 6 telas', obj: 'Prova', title: 'Estudo de caso #1: a ótica que virou conversa', est: 'Case nº 1 do anúncio do Raio-X. [confirmar satisfação e autorização da ótica até 19/11; plano B: F5, carro com preço no vídeo, R$ 4,08 por conversa]',
    ref: R('ad_alavant_0', 'Alavantcompany', AD + '1659169755173117', 'Biblioteca de Anúncios', 'anúncio ativo desde 28/07/2026', 'Assessoria nacional: “Destravamos as vendas dessa confeitaria”', 'o case com rosto do cliente rodando há mais de 100 dias (anúncio lucrativo); aqui com o número real e sem promessa.'),
    t: '192 conversas no WhatsApp.', x: 'Uma ótica, um anúncio com botão de conversa e uma equipe acompanhando todo dia.',
    telas: ['192 conversas no WhatsApp. Estudo de caso #1.', 'O problema: a ótica postava, mas a conversa não chegava.', 'O que fizemos: anúncio com botão do WhatsApp e mensagem pronta.', 'O que acompanhamos: custo por conversa, todo dia.', 'O resultado (out–nov): 192 conversas, R$ 6,53 cada.', 'Quer ver os números do seu negócio? Raio-X grátis.'],
    leg: T(`Estudo de caso #1 📊
    A [Ótica MD Prime] tinha vitrine bonita e Instagram ativo. O que faltava era conversa.
    A gente trocou o “impulsionar” por um anúncio com botão do WhatsApp e mensagem pronta, e passou a olhar o custo de cada conversa todo dia.
    De 06/10 a 12/11: 192 conversas, a R$ 6,53 cada. Dados do nosso sistema (Meta).
    Anúncio não é o vilão. O vilão é o anúncio no automático.
    ${WPP}`),
    tags: TAG + ' #estudodecaso #otica',
    art: 'Capa azul-escuro com “192” enorme em ciano e “conversas no WhatsApp” embaixo; foto real da ótica [com autorização]; tela 5 com print do gráfico do sistema (sem valores de contrato).' },

  { date: 'Seg 23/11', fmt: 'Carrossel · 5 telas', obj: 'Educação', title: 'Post que vende × post que enfeita', est: 'Educação para o dono: a diferença entre conteúdo bonito e conteúdo que traz cliente.',
    ref: R('ad_dezemhum_1', 'Dezemhum Marketing Gastronômico', AD + '4167174020249377', 'Biblioteca de Anúncios', 'anúncio ativo em 12/11/2026', '“Seu marketing está trazendo clientes ou apenas fazendo posts?”', 'a pergunta direta para o dono; aqui ela vira um teste de 4 itens que ele faz no próprio perfil.'),
    t: 'Seu post vende ou enfeita?', x: 'Faz o teste com o último post do seu perfil.',
    telas: ['Seu post vende ou enfeita? Faz o teste com o último.', '1. Dá para saber o que você vende em 2 segundos?', '2. Tem preço, ou pelo menos “a partir de”?', '3. Diz o que fazer agora (WhatsApp, reserva, link)?', 'Errou 2? É decoração cara. A gente arruma no Raio-X.'],
    leg: T(`Post bonito sem estratégia é decoração cara. 🖼️
    Pega o último post do seu perfil e responde:
    1. Dá para saber o que você vende em 2 segundos?
    2. Tem preço, ou pelo menos “a partir de”?
    3. Diz o que a pessoa faz agora?
    Errou duas? Não é falta de esforço. É marketing no automático.
    ${WPP}`),
    tags: TAG + ' #dicasdemarketing',
    art: 'Duas colunas em todas as telas: à esquerda o post “enfeite” (cinza, riscado), à direita o post que vende (ciano). Título em Inter 800, nada de imagem de banco.' },

  { date: 'Qua 25/11', fmt: 'Reels (capa)', obj: 'Marca pessoal', title: 'Eu tinha problema de dicção', est: 'O Italo como rosto: a história real dele vira prova de que qualquer dono pode aparecer. Também no @italosantosdigital.',
    ref: R('yt_oVWYuLgfLA4', '@TiagoFonsecaoficial', YTW('oVWYuLgfLA4'), 'YouTube', '149 mil views', 'Criador ensina a perder o medo de gravar', 'o tema que o dono de negócio procura; aqui contado por quem viveu, sem coach de palco.'),
    t: 'Eu tinha problema de dicção.', x: 'Hoje eu gravo todo dia. Você também consegue.',
    leg: T(`Eu tinha problema de dicção. Sério. 🎙️
    Passei 10 anos no YouTube sendo obrigado a falar, errando e gravando de novo.
    Hoje eu gravo dentro dos negócios dos nossos clientes, todo dia.
    Se eu apareço, você aparece também. Seu cliente quer ver você, não um banco de imagem.
    Conta aqui: o que te trava na hora de gravar?`),
    tags: '#italosantosdigital #recife #comunicacao #empreendedorismo #marketingrecife',
    art: 'Capa: o Italo em close no meio de uma frase, gravando num cliente; texto “Eu tinha problema de dicção” em duas linhas brancas sobre faixa azul-escuro. Vídeo P7.' },

  { date: 'Sex 27/11', fmt: 'Post + stories', obj: 'Venda', title: 'Black Friday: 12 Raio-X com câmera', est: 'Black Friday sem desconto: 12 Raio-X com câmera (3 por dia) de 27 a 30/11, junto da 1ª parcela do 13º.',
    ref: R('ad_provex_2', 'Provex Assessoria de Marketing', AD + '987902910570937', 'Biblioteca de Anúncios', 'anúncio ativo em 12/11/2026', 'Black Friday: “15 dias de anúncios grátis”', 'a data com número e prazo; aqui sem dar anúncio de graça: o que é grátis é o diagnóstico.'),
    t: 'Black Friday aqui não é desconto.', x: '12 Raio-X com câmera, 3 por dia, até 30/11.',
    leg: T(`Black Friday aqui não é desconto. É clareza. 🔎
    De 27 a 30/11, o Italo e a Ellcazo vão até 12 negócios (3 por dia) fazer o Raio-X com câmera.
    Tu sai com os 3 lugares onde o teu marketing perde venda, por escrito, e 1 vídeo de 15 s gravado ali, pronto pra anunciar.
    De graça. Sem compromisso.
    👉 Manda “RAIO-X” no WhatsApp (link na bio).`),
    tags: TAG + ' #blackfriday',
    art: 'Fundo azul-escuro, “12 vagas” grande em ciano; foto do Italo e do Aleffer com a câmera na porta de um negócio. Contador nos stories só depois de 7 vagas preenchidas.' },

  { date: 'Ter 01/12', fmt: 'Carrossel · 5 telas', obj: 'Educação', title: 'O teste do celular', est: 'Educação que vira lead: o dono testa o próprio anúncio e chama a Peformake quando trava. Versão em vídeo: P8.',
    ref: R('ad_baruk_0', 'Agência Baruk', AD + '1095856403078936', 'Biblioteca de Anúncios', 'anúncio ativo desde 06/11/2026', '“Pare de pôr dinheiro em tráfego pago antes de fazer este teste”', 'ensinar em vez de prometer; aqui o teste ganha o jeito de falar do Recife e o Raio-X no fim.'),
    t: 'Antes de pôr mais dinheiro em anúncio, faz esse teste.', x: 'Abre seu anúncio no celular e tenta comprar de você mesmo.',
    telas: ['Antes de pôr mais dinheiro em anúncio, faz esse teste.', 'Abre seu anúncio no celular e tenta comprar de você mesmo.', 'Achou a oferta de cara? O botão funcionou?', 'Deu para pedir sem caçar informação?', 'Travou? Seu cliente também. Raio-X grátis no WhatsApp.'],
    leg: T(`Faz esse teste hoje, leva 2 minutos. 📱
    Abre seu anúncio no celular e tenta comprar de você mesmo.
    Achou a oferta de cara? O botão funcionou? Deu para pedir sem caçar informação?
    Se você travou, imagina quem acabou de te conhecer.
    O anúncio é acelerador. No automático, acelera para o lugar errado.
    ${WPP}`),
    tags: TAG + ' #trafegopago',
    art: 'Mão real segurando o celular com um anúncio genérico (sem marca de cliente); cronômetro na capa; check e X em ciano e cinza.' },

  { date: 'Qui 03/12', fmt: 'Carrossel · 6 telas', obj: 'Prova', title: 'Estudo de caso #2: o delivery da VOVINA', est: 'Série de casos: vídeo de verdade + anúncio no delivery próprio. Prova de caixa: pedidos [confirmar com a VOVINA]. [autorização do cliente]',
    ref: R('ad_alavant_1', 'Alavantcompany', AD + '1633848741490201', 'Biblioteca de Anúncios', 'anúncio ativo desde 12/09/2026', '“Recorde de vendas em plena segunda-feira”', 'o print do resultado como prova; aqui com o número do sistema e o vídeo que gerou o clique.'),
    t: '893 cliques no delivery próprio.', x: 'A R$ 0,13 cada. E 85% vieram de um vídeo só.',
    telas: ['893 cliques no delivery próprio. Estudo de caso #2.', 'A VOVINA queria pedido sem depender de aplicativo.', 'A Ellcazo gravou o vídeo do Combo dentro da pizzaria.', 'O anúncio levou direto ao link do delivery.', '9 dias: 893 cliques a R$ 0,13 e [x] pedidos; 85% do vídeo do Combo.', 'Vídeo de verdade deixa o clique barato. Raio-X grátis.'],
    leg: T(`Estudo de caso #2 🍕
    A [VOVINA] queria vender no delivery próprio, sem pagar taxa de aplicativo.
    A Ellcazo gravou o Combo dentro da pizzaria e o anúncio levou direto para o link de pedido.
    Em 9 dias: 893 cliques a R$ 0,13, e [x] pedidos no delivery próprio. 85% vieram de um vídeo só.
    Vídeo de verdade, do seu negócio, deixa o clique barato.
    ${WPP}`),
    tags: TAG + ' #delivery #estudodecaso',
    art: 'Capa com frame real do vídeo do Combo e “893” em ciano; tela 5 com o gráfico do sistema; selo pequeno “gravado pela Ellcazo” em verde-limão.' },

  { date: 'Sex 04/12', fmt: 'Reels (capa)', obj: 'Atrair', title: 'O marketing veio gravar no restaurante', est: 'Tese “o case é o anúncio” (vídeo P1, diária 01/12 no Fornario): a equipe trabalhando dentro do cliente, em humor. Leva ao Raio-X.',
    ref: { file: '../../avs/th/tt_7662771396958850322.jpg', at: '@italianapizzariaofc2020', url: 'https://www.tiktok.com/@italianapizzariaofc2020/video/7662771396958850322', net: 'TikTok', views: '1,4 mi views', what: 'Pizzaria posta a equipe de marketing gravando no salão', why: 'o dono se reconhece e marca o amigo; aqui a piada é do take 7 e o fim mostra o número real.' },
    t: 'O marketing veio gravar no Fornario.', x: 'Take 7. A pizza esfriou. Valeu a pena.',
    leg: T(`O marketing veio gravar no [Fornario] 🍕🎥
    Take 1: a luz. Take 4: o garçom entrou no quadro. Take 7: perfeito (e a pizza fria).
    É assim que a gente faz: de dentro do seu negócio, com a sua equipe, até ficar com cara de quem dá fome.
    E o número de um vídeo antigo do Fornario: o prato novo levou 479 pessoas ao perfil (anúncio de novembro). [autorização do cliente]
    ${WPP}`),
    tags: TAG + ' #bastidores #pizzaria',
    art: 'Capa: frame real do Aleffer de costas filmando a pizza saindo do forno; contador “TAKE 7” em ciano no canto; título curto em branco sobre faixa azul-escuro.' },

  { date: 'Sex 11/12', fmt: 'Carrossel · 5 telas', obj: 'Venda (Ellcazo)', title: '3 erros do vídeo de restaurante que não dá fome', est: 'Oferta Diária Ellcazo (até 18/12), papel converter; mesma ideia do vídeo P9. Peça com a marca Ellcazo.',
    ref: R('yt_YExjJVL3kGU', '@NathanAbritta', YT('YExjJVL3kGU'), 'YouTube', '11 mil views', 'Tutorial: “a melhor forma de fazer um vídeo em restaurante”', 'o “take 3” acompanhando o prato; aqui vira 3 regras e a diária da Ellcazo no fim.'),
    t: '3 erros que fazem o vídeo do seu restaurante não dar fome.', x: 'E a diária da Ellcazo para gravar o seu antes do Natal.',
    telas: ['3 erros que fazem o vídeo do seu restaurante não dar fome.', 'Erro 1: luz de cima. Vire o prato para a janela.', 'Erro 2: prato parado. Chegue devagar, com a câmera.', 'Erro 3: sem som. Fogo, faca, queijo puxando.', 'Diária Ellcazo: até 6 vídeos em 3 h. Datas até 18/12.'],
    leg: T(`Vídeo de restaurante não é foto que mexe. 🎬
    3 regras que a Ellcazo usa em toda diária:
    1. Luz da janela, nunca a luz de cima.
    2. O prato chegando, não parado na mesa.
    3. O som: fogo, faca, queijo puxando.
    Quer o seu gravado antes do Natal? A diária da Ellcazo grava até 6 vídeos em 3 horas, fora do teu horário de movimento. Datas até 18/12.
    📲 Chama no WhatsApp (link na bio).`),
    tags: '#ellcazo #restaurantesrecife #gastronomiarecife #recife #videoparamarcas',
    art: 'Identidade Ellcazo: fundo verde-limão ou branco, preto só no texto e no logo; frames reais de clientes de gastronomia [com autorização].' },

  { date: 'Ter 15/12', fmt: 'Post + stories', obj: 'Venda', title: 'Comece 2027 com o plano pronto', est: 'Oferta principal: contrato fechado até 19/12 começa janeiro com o plano do mês entregue e a diária marcada.',
    ref: R('ad_growing_2', 'Growing Performance', AD + '1668191108180477', 'Biblioteca de Anúncios', 'anúncio ativo desde 05/11/2026', '“Querem dobrar esse faturamento em 2027”', 'a virada do ano como gancho; aqui sem promessa de dobrar: a promessa é começar janeiro com o plano pronto.'),
    t: 'Janeiro começa com plano ou com pressa?', x: 'Feche até 19/12 e comece 2027 com o plano pronto.',
    leg: T(`Todo janeiro é igual: “esse ano eu organizo o marketing”. E fevereiro chega. 📅
    Quem fecha com a Peformake até 19/12 começa janeiro com:
    ✅ a estratégia do mês entregue antes da virada
    ✅ a diária de gravação marcada entre 05 e 16/01
    ✅ anúncio, conteúdo e relatório toda segunda
    Comece 2027 com o plano pronto, não com pressa.
    👉 Manda “2027” no WhatsApp (link na bio).`),
    tags: TAG + ' #planejamento2027',
    art: 'Calendário de janeiro com 05 a 16/01 marcado em ciano (“diária”, “plano”, “relatório”); foto do Italo com a equipe; prazo “até 19/12” no canto.' },
]
