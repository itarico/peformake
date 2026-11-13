// Estratégia de tráfego · 12/11 a 31/12/2026 (Fornario e VOVINA), mesmo design dos outros documentos
const fs = require('fs')
const path = require('path')
const { Doc, cover, html, card, ul } = require('./_base.js')
const OUT = path.resolve(__dirname, '..')

const opt3 = (v, unit = '/dia') => `<div class="bo">${['A', 'B', 'C'].map((k, i) => `<div class="${i === 1 ? 'rec' : ''}"><b>${k}</b><strong>R$ ${v[i]}${unit}</strong>${i === 1 ? '<em>sugerida</em>' : ''}</div>`).join('')}</div>`

const T = {
  Fornario: {
    slug: 'fornario',
    start: {
      title: 'O anúncio ficou parado em outubro e hoje compra visita, não reserva',
      tiles: [['R$ 0', 'em anúncio em outubro (parado de meados de setembro a 02/11)'], ['R$ 92,44', 'investidos de 03 a 11/11, num único anúncio'], ['478', 'visitas ao perfil a R$ 0,19 (ago–set: R$ 0,15)'], ['0', 'conversas ou reservas medidas', 'red'], ['3,26%', 'de cliques (CTR): o anúncio chama atenção'], ['R$ 0,11', 'por visita na arte “Bom de Garfo”, a melhor da conta'], ['32 posts', 'no orgânico (antes 8) e 2.305 curtidas e comentários'], ['30/11', 'fim programado da campanha atual', 'red']],
      chartT: 'Investimento e visitas ao perfil por período',
      bars: [['19/08 a 30/09', 702.84, 'R$ 702,84', '4.847 visitas'], ['Outubro', 0, 'R$ 0', 'nenhum anúncio'], ['03 a 11/11', 92.44, 'R$ 92,44', '478 visitas']],
      so: ['A atenção existe (CTR 3,3%), mas para no perfil: <b>visita não enche mesa</b>.', 'O período troca o objetivo para <b>conversa de reserva no WhatsApp</b>.', 'E nada de buraco: a campanha atual termina em 30/11.'],
    },
    obj: {
      title: 'Comprar conversa de reserva, e contar cada mesa que ela traz',
      lead: 'Objetivo do período: <b>conversas de reserva no WhatsApp</b> para confraternização (até 19/12), feriados e encomenda de Natal. A 1ª semana mostra o custo real por conversa; as metas abaixo são a aposta inicial e são revistas em 23/11.',
      metas: [
        ['Resultado', '120', 'conversas de reserva no WhatsApp até 31/12', ['<b>10 reservas de grupo</b> até 19/12', '15 encomendas de Natal, se aprovada']],
        ['Custo por resultado', 'até R$ 5', 'por conversa iniciada', ['Alerta: acima de R$ 8 por 3 dias, troca o criativo', 'Vídeos: até R$ 0,05 por visualização de 15 s']],
        ['Verba do período', 'R$ 900', 'opção B: R$ 18/dia em média', ['A: R$ 12/dia (≈ R$ 600)', 'C: R$ 25/dia (≈ R$ 1.250)']],
        ['O que vira dinheiro', 'Mesa', 'reserva confirmada na lista', ['Lista toda segunda: data, nome, pessoas, origem', 'Custo por reserva a partir de 30/11']],
      ],
      flow: [['R$ 636', 'na campanha de Reserva (opção B)'], ['≈ 125 conversas', 'a R$ 5 cada'], ['10 reservas de grupo', 'até 19/12, mais as mesas de família'], ['Custo por reserva', 'medido na lista toda segunda']],
    },
    camps: [
      { share: '70%', name: 'Reserva de fim de ano', obj: 'Engajamento → <b>conversas no WhatsApp</b>, mensagem pronta “Quero reservar uma mesa”', pub: '25 a 55 anos, raio de 8 km da Praça do Canhão (São Lourenço e Camaragibe), público aberto', pos: 'Reels, Stories e Feed do Instagram e Facebook; ter a dom, 11h às 23h', when: '13/11 a 23/12 e 26 a 30/12. Em dobro em 27‑30/11 e 18‑20/12', cr: 'confraternização, feriado, nota 4,8, último dia 19/12', b: ['8', '12', '17'] },
      { share: '20%', name: 'Vídeos de prova (alcance)', obj: 'Reconhecimento → <b>visualização de vídeo</b> (ThruPlay)', pub: '18 a 60 anos, raio de 10 km, aberto. Quem assiste vira público de remarketing', pos: 'Reels e Stories (vídeo vertical 9:16)', when: '13/11 a 17/12 (Reel da Praça do Canhão até os vídeos da diária ficarem prontos)', cr: 'Praça do Canhão, massa de 48 h, Marguerita de R$ 60', b: ['3', '5', '7'] },
      { share: '10%', name: 'Encomenda de Natal (remarketing)', obj: 'Engajamento → <b>conversas no WhatsApp</b>, mensagem “Quero encomendar a Deep Dish”', pub: 'Quem viu 50% dos vídeos, interagiu com @ofornario ou conversou nos últimos 60 dias', pos: 'Reels, Stories e Feed', when: '15 a 23/12, só se a encomenda for aprovada', cr: 'Deep Dish: o corte, “A ceia ganha o prato do centro”', b: ['7', '10', '14'] },
    ],
    campNote: 'O anúncio atual (Perfil IG · Foie Gras) é pausado em 13/11, quando a Reserva sobe. Nenhuma campanha nova tem data de fim antes de 31/12.',
    crs: [
      ['Arte “Bom de Garfo” (volta, com selo de reserva)', 'Reserva', 'Título “Bom de Garfo” (R$ 0,11 por visita)', 'Reserve pelo WhatsApp', '13/11'],
      ['Reel da Praça do Canhão (já publicado)', 'Vídeos', '“Você sabia que na Praça do Canhão tem…”', 'Reserve pelo WhatsApp', '13/11'],
      ['Sua confraternização perto de casa · carrossel', 'Reserva', '“O grupo já escolheu a data?”', 'Mande o dia e quantas pessoas no WhatsApp', '19/11'],
      ['Feriado em família · post', 'Reserva', '“É feriado. A mesa é de vocês.”', 'Reserve pelo WhatsApp', '19/11 e 07/12'],
      ['F1 · A sua pizza começou anteontem · Reel', 'Vídeos', '“Poucas pessoas sabem: a sua pizza começou anteontem.”', 'Reserve pelo WhatsApp', '27/11'],
      ['F3 · Por que essa Marguerita custa R$ 60 · Reel', 'Vídeos', '“Por que essa Marguerita custa R$ 60?”', 'Vem provar: reserve pelo WhatsApp', '01/12'],
      ['Nota 4,8 no Google · anúncio', 'Reserva', '“Quem foi deu 4,8.”', 'Sua mesa de dezembro está aqui', '11/12'],
      ['F8 · A mesa do grupo · Reel do salão', 'Reserva', '“Foi assim a confraternização deles.”', 'O seu grupo já tem mesa? Último dia: 19/12', '15/12'],
      ['F2 · Deep Dish: o corte + “A ceia ganha o prato do centro”', 'Encomenda', '“1 kg de mussarela. Olha o corte.”', 'Encomende pelo WhatsApp. Vagas por dia', '15/12'],
      ['F5 · Chegar na Praça do Canhão (versão da diária)', 'Reserva', '“A mesa da sua ocasião.”', 'Mesa de família nas férias: reserve', '26/12'],
    ],
    crNote: 'Os vídeos F1, F2, F3, F5 e F8 saem da diária de 24/11 e da confraternização gravada até 05/12. Todo anúncio é vertical, com o gancho no 1º segundo e a chamada escrita na tela.',
    ab: [
      ['A nota do Google vende?', 'Carrossel da confraternização com “4,8 no Google” no título × sem a nota', '19 a 26/11', 'Custo por conversa', 'Ganha quem custar 20% menos com pelo menos 20 conversas em cada; o vencedor vira padrão nas artes de dezembro.'],
      ['Vídeo ou arte?', 'Reel da Praça do Canhão × carrossel da confraternização, mesma campanha e mesmo público', '27/11 a 03/12', 'Custo por conversa e reservas', 'O vencedor fica com 70% da verba da Reserva até 19/12.'],
      ['Qual mensagem pronta?', '“Quero reservar uma mesa” × “Quero o menu da confraternização”', '04 a 10/12', 'Conversas que viram reserva', 'Conta na lista de reservas; fica a que fecha mais mesas, não a que gera mais conversa.'],
    ],
    abRule: 'Um teste por vez, com o Teste A/B da própria Meta (verba dividida meio a meio). Nada muda no meio do teste.',
    cal: [
      ['13/11 (sex)', 'Começo', 'Sobem Reserva e Vídeos. Pausa o anúncio Perfil IG · Foie Gras', 'R$ 17', 'up'],
      ['19 e 20/11', 'Consciência Negra', 'Entram o carrossel da confraternização e o post do feriado', 'R$ 17', ''],
      ['24/11 (ter)', 'Diária de gravação', 'Nada muda no ar; os vídeos são editados até 26/11', 'R$ 17', ''],
      ['27 a 30/11', 'Black Friday e 1ª parcela do 13º', 'Reserva em dobro. Entra o F1 (massa de 48 h)', 'R$ 29', 'hot'],
      ['30/11 (seg)', 'Não deixar parar', 'A campanha antiga acabava aqui. As novas seguem sem data de fim; saldo conferido em 25/11', 'R$ 29', 'warn'],
      ['01 a 14/12', 'Confraternizações', 'Entram F3 (Marguerita), post do feriado de 08/12 e nota 4,8 (11/12)', 'R$ 17', ''],
      ['15 a 17/12', 'Encomenda de Natal', 'Sobe a Encomenda (se aprovada) e o F8 “último dia”. Vídeos de prova param em 17/12', 'R$ 27', ''],
      ['18 a 20/12', '2ª parcela do 13º', 'Maior verba. 19/12: último dia de confraternização', 'R$ 34', 'hot'],
      ['21 a 23/12', 'Véspera do Natal', 'Reserva vira “mesa de família”; Encomenda até 23/12', 'R$ 22', ''],
      ['24 e 25/12', 'Natal', 'Tudo pausado (volta sozinho em 26/12)', 'R$ 0', 'off'],
      ['26 a 30/12', 'Férias', 'Reserva com o F5: mesa de família nas férias', 'R$ 12', ''],
      ['31/12', 'Réveillon', 'Pausado; só story de horário. Plano de janeiro em 05/01', 'R$ 0', 'off'],
    ],
    calTotal: '≈ R$ 900 no período (opção B). Na A, tudo × 0,67; na C, × 1,4.',
    measure: {
      flow: [['Anúncio', 'botão do WhatsApp'], ['Conversa', 'mensagem pronta mostra que veio do anúncio'], ['Etiqueta', '“Anúncio” no WhatsApp Business'], ['Reserva', 'na lista: data, nome, pessoas, origem']],
      rep: [['Investido', 'na semana e no período'], ['Conversas', 'iniciadas pelo anúncio'], ['Custo', 'por conversa'], ['Reservas', 'e custo por reserva']],
      how: ['A Meta conta as <b>conversas iniciadas</b>; quem atende marca a etiqueta <b>“Anúncio”</b> e anota a reserva na lista.', 'Link da bio e do cardápio com marcação: <code>?utm_source=instagram&amp;utm_medium=anuncio&amp;utm_campaign=fim-de-ano</code>.', 'Reserva que chega por ligação ou balcão: perguntar “Como conheceu?” e anotar.'],
    },
    routine: [['Todo dia', '5 minutos: anúncios no ar, saldo da conta e conversas respondidas em até 15 min'], ['Segunda', 'Relatório e lista de reservas da semana: custo por conversa e por reserva'], ['Terça', 'Troca de criativo se a frequência passar de 3 ou o custo subir 30%'], ['Quinta', 'Ajuste de verba para o fim de semana (picos já programados)'], ['Regra', 'Custo abaixo de R$ 4 com reservas: sobe 20% a verba. Acima de R$ 8 por 3 dias: troca o criativo']],
    decs: [
      ['Verba de anúncio', [['A', 'R$ 12/dia', '≈ R$ 600 no período'], ['B', 'R$ 18/dia', '≈ R$ 900, dobrando nos picos do 13º', 1], ['C', 'R$ 25/dia', '≈ R$ 1.250, mais alcance no Natal']]],
      ['Quem responde o WhatsApp', [['A', 'Um responsável por turno', 'resposta em até 15 minutos, 11h às 23h', 1], ['B', 'Só no horário da casa', 'anúncio roda só das 17h às 23h']]],
      ['Saldo para não parar em 30/11', [['A', 'Cartão na conta de anúncio', 'cobrança automática, sem pausa', 1], ['B', 'Pix antecipado', 'R$ 450 até 25/11 e R$ 450 até 10/12']]],
      ['Encomenda de Natal', [['A', 'Sobe de 15 a 23/12', 'R$ 10/dia na opção B, vagas por dia', 1], ['B', 'Não sobe', 'a verba vai para a Reserva']]],
      ['Dias de pausa', [['A', 'Pausa 24, 25 e 31/12', 'se a casa fechar ou estiver lotada', 1], ['?', 'Horários de 20/11, 08/12 e 01/01', 'para avisar no anúncio']]],
      ['Preço da confraternização', [['A', 'Menu por pessoa', 'preço, mínimo de pessoas e sinal até 18/11', 1], ['B', 'Mesa + cortesia', 'cardápio normal e sobremesa para grupos']]],
    ],
  },
  VOVINA: {
    slug: 'vovina',
    start: {
      title: 'O anúncio já leva gente ao cardápio barato; falta contar os pedidos',
      tiles: [['R$ 0', 'em anúncio em setembro e outubro (estreia em 03/11)'], ['R$ 113,35', 'investidos de 03 a 11/11'], ['893', 'cliques no link do delivery a R$ 0,13'], ['5,68%', 'de cliques (CTR), alto para delivery'], ['17.013', 'pessoas alcançadas em 9 dias'], ['85%', 'dos cliques vieram do vídeo do Combo'], ['0', 'pedidos contados: ninguém sabe quantos viraram venda', 'red'], ['30/11', 'fim programado da campanha atual', 'red']],
      chartT: 'Cliques no cardápio por anúncio (03 a 11/11)',
      bars: [['Combo Mussarela e Calabresa', 761, '761', 'R$ 0,12 cada'], ['Calabresa e Entrega', 82, '82', 'R$ 0,16 cada'], ['Mussarela Derretida', 50, '50', 'R$ 0,11 cada']],
      so: ['O formato <b>vídeo do combo com preço</b> é o que funciona: vira o modelo dos novos.', 'O período mantém o clique barato e passa a <b>contar o pedido</b>.', 'E nada de buraco: a campanha atual termina em 30/11.'],
    },
    obj: {
      title: 'Manter o clique barato e transformar clique em pedido contado',
      lead: 'Objetivo do período: <b>cliques no cardápio digital que viram pedido</b>, com o Combo Família da Vó na Black Friday, os feriados, o 13º e o 26/12. A 1ª semana com o link marcado mostra o custo real por pedido; as metas são revistas em 23/11.',
      metas: [
        ['Resultado', '4.000', 'cliques no cardápio digital até 31/12', ['<b>120 pedidos contados</b> (link marcado + “Vi no Instagram”)', '60 conversas no WhatsApp pelo remarketing']],
        ['Custo por resultado', 'até R$ 0,15', 'por clique no cardápio (hoje R$ 0,13)', ['Pedido: até R$ 7,50 (meta inicial)', 'Alerta: clique acima de R$ 0,20 por 3 dias, troca o vídeo']],
        ['Verba do período', 'R$ 900', 'opção B: R$ 18/dia em média', ['A: R$ 12/dia (≈ R$ 600)', 'C: R$ 25/dia (≈ R$ 1.250)']],
        ['O que vira dinheiro', 'Pedido', 'contado no cardápio e no WhatsApp', ['Planilha semanal: pedidos “Vi no Instagram”', 'Custo por pedido a partir de 23/11']],
      ],
      flow: [['R$ 636', 'na campanha Combo e datas (opção B)'], ['≈ 4.000 cliques', 'no cardápio a até R$ 0,15'], ['≈ 120 pedidos', '3 em cada 100 cliques (aposta inicial)'], ['≈ R$ 7,50 por pedido', 'medido toda segunda']],
    },
    camps: [
      { share: '70%', name: 'Combo e datas (cardápio)', obj: 'Tráfego → <b>cliques no link</b> do cardápio digital (visitas à página)', pub: '20 a 55 anos, raio de 5 km do Centro; reforço de sexta a domingo', pos: 'Reels, Stories e Feed do Instagram e Facebook; todos os dias, 16h às 22h', when: '13/11 a 30/12. Em dobro em 27–30/11, 18–20/12 e 26/12', cr: 'vídeo do Combo atual, depois 2 ou 3 novos no mesmo formato', b: ['7', '11', '15'] },
      { share: '18%', name: 'Vídeo da família (alcance)', obj: 'Reconhecimento → <b>visualização de vídeo</b> (ThruPlay)', pub: '18 a 60 anos, raio de 8 km, aberto. Quem assiste vira público de remarketing', pos: 'Reels e Stories (vídeo vertical 9:16)', when: '27/11 a 23/12, com os vídeos da diária de 25/11', cr: 'A pizza que alimenta a família, borda escura, queijo puxando', b: ['4', '6', '8'] },
      { share: '12%', name: 'Remarketing (WhatsApp)', obj: 'Engajamento → <b>conversas no WhatsApp</b>, mensagem “Quero o Combo Família”', pub: 'Quem viu 50% dos vídeos, clicou no cardápio ou interagiu nos últimos 30 dias', pos: 'Stories e Feed', when: '01 a 30/12', cr: 'Combo Família, 13º, Pizza de Natal da Vó, 26/12', b: ['3', '4', '5'] },
    ],
    campNote: 'A campanha atual (Delivery São Lourenço) segue como a “Combo e datas”: só ganha data de fim em 31/12, o link marcado e os vídeos novos. Até 26/11 ela roda a R$ 14/dia (opção B).',
    crs: [
      ['Vídeo do Combo Mussarela e Calabresa (atual)', 'Combo', '“2 pizzas por R$ 69,90”', 'Peça pelo cardápio digital', 'no ar'],
      ['Recado da Vó: amanhã é feriado · post', 'Combo', '“Já sabe quem vai cuidar do jantar.”', 'Peça pelo link', '19/11 e 07/12'],
      ['Dezembro é mesa cheia · anúncio + V1', 'Combo + Família', '“A família reuniu? A pizza é da Vó.”', 'Monte o seu combo pelo link', '27/11'],
      ['V4 · O queijo puxando · Reel curto', 'Combo', 'Queijo puxando no 1º segundo', 'Pizza de vó, feita sem pressa: peça pelo link', '27/11'],
      ['V2 · O meio a meio da família · Reel', 'Combo', '“Escolhe as duas metades e pronto.”', 'Monte o seu pelo link da bio', '01/12'],
      ['V3 · Borda escura é queimada? · Reel', 'Família', '“Borda escura é queimada?”', 'É a massa sem pressa: peça a sua', '08/12'],
      ['Depois da vaquejada, pizza da Vó · anúncio', 'Combo', '“Saiu da Arena?”', 'O jantar está resolvido: peça pelo link', '11 a 13/12'],
      ['V8 · A pizza de Natal da Vó · Reel', 'Remarketing', '“Pizza de Natal da Vó. Só em dezembro.”', 'Encomende pelo WhatsApp', '15/12 (se aprovada)'],
      ['13º caiu: o meio a meio é com a Vó · anúncio', 'Combo', '“13º caiu.”', 'Sábado de família pede pizza da Vó', '18 a 20/12'],
      ['Chega de peru. Sábado é pizza. · anúncio', 'Combo + Remarketing', '“Sobrou ceia?”', 'Hoje a cozinha descansa: peça pelo link', '26/12'],
    ],
    crNote: 'V1, V2, V3 e V4 saem da diária de 25/11. Todos seguem o formato que já vende: comida em close no 1º segundo, preço ou combo na tela e o caminho do pedido no fim.',
    ab: [
      ['Vídeo novo ou o atual?', 'Vídeo do Combo atual × V4 “O queijo puxando”', '27/11 a 03/12', 'Custo por clique e pedidos marcados', 'Ganha quem custar menos por pedido; o perdedor sai e entra o próximo vídeo novo.'],
      ['Cardápio ou WhatsApp?', 'Anúncio levando ao cardápio digital × ao WhatsApp, mesmo vídeo', '04 a 10/12', 'Custo por pedido', 'Pedidos contados nos dois caminhos; o vencedor fica com a verba das festas.'],
      ['Pergunta ou afirmação?', '“Borda escura é queimada?” × “Borda escura não é queimada”', '08 a 14/12', 'Quem assiste até o fim', 'No perfil a pergunta rendeu 2,5×; aqui confirmamos no anúncio.'],
    ],
    abRule: 'Um teste por vez, com o Teste A/B da própria Meta (verba dividida meio a meio). Nada muda no meio do teste.',
    cal: [
      ['13/11 (sex)', 'Começo', 'Campanha atual ganha link marcado e data de fim em 31/12', 'R$ 14', 'up'],
      ['19 e 20/11', 'Consciência Negra', 'Entra o “Recado da Vó: amanhã é feriado”', 'R$ 14', ''],
      ['25/11 (qua)', 'Diária de gravação', 'Nada muda no ar; os vídeos são editados até 26/11', 'R$ 14', ''],
      ['27 a 30/11', 'Black Friday e 1ª parcela do 13º', 'Lança o Combo Família. Combo em dobro; sobe o Vídeo da família', 'R$ 28', 'hot'],
      ['30/11 (seg)', 'Não deixar parar', 'A campanha acabava aqui. Fim trocado para 31/12; saldo conferido em 25/11', 'R$ 28', 'warn'],
      ['01 a 14/12', 'Feriado 08/12 e vaquejada', 'Sobe o Remarketing. Entram V2, V3, feriado (07/12) e vaquejada (11 a 13/12)', 'R$ 21', ''],
      ['15 a 17/12', 'Natal da Vó', 'Pizza de Natal da Vó no Remarketing, se aprovada', 'R$ 21', ''],
      ['18 a 20/12', '2ª parcela do 13º', 'Maior verba: “13º caiu” em dobro', 'R$ 32', 'hot'],
      ['21 a 23/12', 'Férias começam', 'Combo e família seguem; Vídeo da família para em 23/12', 'R$ 21', ''],
      ['24 e 25/12', 'Natal', 'Pausado se a casa fechar (decisão 4)', 'R$ 0', 'off'],
      ['26/12 (sáb)', 'Dia seguinte do Natal', '“Chega de peru. Sábado é pizza.” em dobro', 'R$ 26', 'hot'],
      ['27 a 31/12', 'Férias e Réveillon', 'Combo e Remarketing até 30/12; 31/12 pausado (só horário). Plano de janeiro em 05/01', 'R$ 15', ''],
    ],
    calTotal: '≈ R$ 900 no período (opção B). Na A, tudo × 0,67; na C, × 1,4.',
    measure: {
      flow: [['Anúncio', 'botão para o cardápio'], ['Link marcado', 'mostra quantos cliques vieram do anúncio'], ['Pedido', 'no cardápio ou no WhatsApp'], ['Contagem', '“Vi no Instagram” e etiqueta “Anúncio”']],
      rep: [['Investido', 'na semana e no período'], ['Cliques', 'no cardápio digital'], ['Pedidos', 'contados do anúncio'], ['Custo', 'por clique e por pedido']],
      how: ['Link do cardápio com marcação por campanha: <code>?utm_source=meta&amp;utm_medium=anuncio&amp;utm_campaign=combo-familia&amp;utm_content=video-combo</code>.', 'Se o cardápio digital mostra a origem do pedido, usamos o relatório dele; se não, quem fecha o pedido pergunta <b>“Viu no Instagram?”</b> e anota.', 'Pedido pelo WhatsApp que veio do anúncio: etiqueta <b>“Anúncio”</b> no WhatsApp Business.'],
    },
    routine: [['Todo dia', '5 minutos: anúncios no ar, saldo da conta e mensagens respondidas'], ['Segunda', 'Relatório com pedidos do anúncio: custo por clique e por pedido'], ['Terça', 'Troca de vídeo se a frequência passar de 3 ou o clique subir 30%'], ['Quinta', 'Reforço de sexta a domingo (já programado nos picos)'], ['Regra', 'Pedido abaixo de R$ 5: sobe 20% a verba. Clique acima de R$ 0,20 por 3 dias: troca o vídeo']],
    decs: [
      ['Verba de anúncio', [['A', 'R$ 12/dia', '≈ R$ 600 no período'], ['B', 'R$ 18/dia', '≈ R$ 900, dobrando nos picos e no 26/12', 1], ['C', 'R$ 25/dia', '≈ R$ 1.250, mais alcance nas férias']]],
      ['Combo Família da Vó', [['A', 'Preço e itens até 25/11', 'para o anúncio de 27/11 sair pronto', 1], ['?', 'Pizza grande meio a meio + refri 1 L?', 'itens a confirmar']]],
      ['Saldo para não parar em 30/11', [['A', 'Cartão na conta de anúncio', 'cobrança automática, sem pausa', 1], ['B', 'Pix antecipado', 'R$ 450 até 25/11 e R$ 450 até 10/12']]],
      ['Dias de pausa', [['A', 'Pausa 24, 25 e 31/12', 'se a casa fechar', 1], ['B', 'Roda nos dias abertos', 'com o horário no anúncio']]],
      ['Pizza de Natal da Vó', [['A', 'Sobe no Remarketing em 15/12', 'edição limitada, venda extra', 1], ['B', 'Não sobe', 'foco só no Combo Família']]],
      ['Quem conta os pedidos', [['A', 'Quem fecha o pedido', 'pergunta “Viu no Instagram?” e anota', 1], ['B', 'Só o relatório do cardápio', 'se ele mostrar a origem']]],
    ],
  },
}

const css = `
/*trafego*/
.stop{display:flex;gap:12px;align-items:stretch;margin-top:14px;background:#FDECEA;border:2px solid #C0392B;border-radius:12px;padding:10px 14px}
.stop>b{font:800 15px Inter;color:#C0392B;display:flex;align-items:center;min-width:170px}.stop span b{color:#C0392B}.stop span{flex:1;font-size:14px;line-height:1.35;background:#fff;border-radius:8px;padding:7px 10px}
.fl2 .fs{padding:12px 14px}.fl2 .fs b{font:800 22px 'Inter Display',Inter}.fl2 .fs span{font-size:14px}
.rep{margin-top:16px;padding:14px 16px}.rep h3{font-size:17px;margin-bottom:10px}
.rn{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.rn div{background:#E3F7FA;border-radius:10px;padding:8px 10px}.rn b{display:block;font:800 16px Inter;color:var(--dk)}.rn span{font-size:12.8px;line-height:1.25;display:block;color:#3e6268}
.pt{display:grid;grid-template-columns:1.35fr 1fr;gap:28px}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.tl{background:var(--dk);color:#fff;border-radius:12px;padding:11px 12px;min-height:108px}
.tl b{display:block;font:800 26px/1.05 'Inter Display',Inter;color:var(--cy);margin-bottom:5px}
.tl span{font-size:13.2px;line-height:1.3;display:block;color:#d6eef1}
.tl.red{background:#fff;border:2px solid #C0392B;color:var(--dk)}.tl.red b{color:#C0392B}.tl.red span{color:#3e6268}
.hb{background:#fff;border:2px solid var(--dk);border-radius:14px;box-shadow:5px 5px 0 var(--dk);padding:14px 16px}
.hbr{margin-bottom:12px}.hbr .hl{display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px}.hbr .hl b{font-weight:800}
.hbr .ht{height:22px;background:#E3F7FA;border-radius:6px;overflow:hidden}.hbr .ht i{display:block;height:100%;background:var(--pe);border-radius:6px}
.hbr.zero .hl b{color:#C0392B}
.so{margin-top:16px}.so li{font-size:15.5px}
.objl{background:#fff;border:2px solid var(--dk);border-left:12px solid var(--cy);border-radius:14px;padding:14px 18px;font-size:17px;line-height:1.42;margin-bottom:22px}
.metas{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.mt{padding:18px 18px 16px}.mt .ml{font:800 11.5px Inter;text-transform:uppercase;letter-spacing:.08em;color:var(--pe);margin-bottom:8px}
.mt .mb{font:800 40px/1 'Inter Display',Inter;color:var(--dk);letter-spacing:-.02em}.mt .ms{font-size:14.5px;line-height:1.3;margin:6px 0 14px;color:#3e6268;min-height:38px}
.mt ul li{font-size:14.5px;margin-bottom:8px}
.mt.k{background:var(--dk);color:#fff}.mt.k .mb{color:var(--cy)}.mt.k .ml{color:var(--cy)}.mt.k .ms{color:#d6eef1}.mt.k ul li:before{background:var(--cy);border-color:#fff}
.cmps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.cmp{padding:14px 16px;display:flex;flex-direction:column}
.cmp .ch{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.cmp .ch .sh{min-width:54px;height:54px;border-radius:50%;background:var(--cy);border:2px solid var(--dk);display:flex;align-items:center;justify-content:center;font:800 16px Inter}
.cmp .ch h3{margin:0;font-size:19px}
.cmp .kv{font-size:13.6px;margin-bottom:7px}
.cmp .kv.crv{color:var(--pe);font-weight:600}
.bo{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:auto;padding-top:8px}
.bo div{border:2px solid var(--dk);border-radius:10px;padding:6px 8px;position:relative;background:#fff}
.bo b{font:800 11px Inter;color:var(--pe);display:block}.bo strong{font:800 16px 'Inter Display',Inter;white-space:nowrap}
.bo .rec{background:var(--dk);color:#fff}.bo .rec b{color:var(--cy)}
.bo em{position:absolute;top:-9px;right:4px;background:var(--cy);color:var(--dk);font:800 9px Inter;text-transform:uppercase;padding:1px 6px;border-radius:999px;font-style:normal;border:1.5px solid var(--dk)}
.bol{font:800 11px Inter;text-transform:uppercase;letter-spacing:.07em;color:var(--pe);margin-top:auto;padding-top:6px}
.cnote{margin-top:16px;font-size:14.5px;line-height:1.4;background:#fff;border-left:6px solid var(--cy);padding:9px 14px;border-radius:8px}
.crt{font-size:13.6px}.crt td{padding:6px 10px;vertical-align:middle}.crt td.p{font-weight:700;width:370px}.crt td.c{width:120px}
.crt td.c span{display:inline-block;font:800 11px Inter;background:#E3F7FA;border:1.5px solid var(--pe);color:var(--pe);border-radius:999px;padding:2px 8px;white-space:nowrap}
.crt td.g{font-style:italic}.crt td.w{font-weight:800;white-space:nowrap;color:var(--pe);width:118px}
.abs{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.ab{padding:16px 18px;display:flex;flex-direction:column}
.ab .vs{display:flex;flex-direction:column;gap:6px;margin:4px 0 12px}
.ab .vs div{display:flex;gap:8px;align-items:flex-start;font-size:15px;line-height:1.3;background:#E3F7FA;border-radius:9px;padding:7px 10px}
.ab .vs div b{font:800 13px Inter;background:var(--dk);color:#fff;border-radius:6px;min-width:22px;height:22px;display:flex;align-items:center;justify-content:center}
.ab .vs i{font:800 11px Inter;text-transform:uppercase;letter-spacing:.08em;color:var(--pe);font-style:normal;text-align:center}
.ab .kv{font-size:14.5px;margin-bottom:9px}
.ab .win{margin-top:auto;background:var(--dk);color:#fff;border-radius:10px;padding:10px 12px;font-size:14px;line-height:1.35}.ab .win span{display:block;font:800 10.5px Inter;letter-spacing:.08em;text-transform:uppercase;color:var(--cy);margin-bottom:3px}
.calt{font-size:13.6px}.calt td{padding:5px 11px;vertical-align:middle}.calt td.d{width:108px}.calt td.e{width:230px}.calt td.v{font-weight:800;white-space:nowrap;width:130px;text-align:right}.calt th:last-child{white-space:nowrap}
.calt tr.off td{color:#7a9195}.calt tr.warn td{background:#FDECEA}.calt tr.warn td.e{color:#C0392B}
.calt tr.up td.e{color:var(--pe)}
.ctot{margin-top:10px;font-size:13.5px;color:#3e6268}
.ms2{display:grid;grid-template-columns:1.25fr 1fr;gap:28px}
.flow{display:flex;gap:8px;margin-bottom:16px}
.fs{flex:1;background:#fff;border:2px solid var(--dk);border-radius:12px;padding:10px 11px;position:relative;box-shadow:3px 3px 0 var(--dk)}
.fs b{display:block;font:800 15px Inter;margin-bottom:3px}.fs span{font-size:12.8px;line-height:1.3;display:block;color:#3e6268}
.fs:not(:last-child):after{content:"›";position:absolute;right:-10px;top:50%;transform:translateY(-50%);font:800 22px Inter;color:var(--pe);z-index:2}
.fs:last-child{background:var(--dk);color:#fff}.fs:last-child span{color:#d6eef1}
.ms2 ul li{font-size:15px;margin-bottom:11px}
code{font:600 12.5px ui-monospace,Menlo,monospace;background:#E3F7FA;border-radius:5px;padding:1px 5px;word-break:break-all}
.rot2{display:flex;flex-direction:column;gap:9px}
.rr{display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:center;background:#fff;border:2px solid var(--dk);border-radius:12px;padding:10px 13px;font-size:14.5px;line-height:1.32}
.rr b{font:800 14.5px Inter;color:var(--pe)}.rr.k{background:var(--dk);color:#fff}.rr.k b{color:var(--cy)}
.decs.d6{grid-template-columns:repeat(3,1fr);grid-auto-rows:minmax(0,1fr)}
`

const fmtMoney = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

for (const brand of Object.keys(T)) {
  const t = T[brand]
  const d = Doc(brand, 'Estratégia de tráfego')
  cover(d, brand, 'Estratégia de tráfego · para aplicar', 'Anúncios de 12/11 a 31/12', 'Ponto de partida, metas, campanhas, criativos, testes, calendário de subida e pausa, como medir e as decisões.')

  // 2. ponto de partida
  const s = t.start, mx = Math.max(...s.bars.map((b) => b[1]))
  d.page('pf', `${brand} · O ponto de partida`, s.title, `
  <div class="pt">
    <div class="tiles">${s.tiles.map((x) => `<div class="tl ${x[2] || ''}"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>
    <div>
      <h3 class="h3">${s.chartT}</h3>
      <div class="hb">${s.bars.map((b) => `<div class="hbr ${b[1] === 0 ? 'zero' : ''}"><div class="hl"><span>${b[0]}</span><b>${b[2]} · ${b[3]}</b></div><div class="ht"><i style="width:${Math.max(b[1] / mx * 100, 1)}%"></i></div></div>`).join('')}</div>
      <div class="so">${ul(s.so)}</div>
    </div>
  </div>`, { cls: 'dense' })

  // 3. objetivo e metas
  d.page('pf', `${brand} · Objetivo e metas do período`, t.obj.title, `
  <div class="objl">${t.obj.lead}</div>
  <div class="metas">${t.obj.metas.map((m, i) => `<div class="card mt ${i === 0 ? 'k' : ''}"><div class="ml">${m[0]}</div><div class="mb">${m[1]}</div><div class="ms">${m[2]}</div>${ul(m[3])}</div>`).join('')}</div>
  <h3 class="h3" style="margin-top:26px">A conta da meta</h3>
  <div class="flow fl2">${t.obj.flow.map((f) => `<div class="fs"><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div>`, { cls: 'dense' })

  // 4. campanhas
  d.page('pf', `${brand} · Estrutura de campanhas`, 'Três campanhas, cada uma com um trabalho', `
  <div class="cmps">${t.camps.map((c) => `<div class="card cmp">
    <div class="ch"><div class="sh">${c.share}</div><h3>${c.name}</h3></div>
    <div class="kv"><span>Objetivo</span>${c.obj}</div>
    <div class="kv"><span>Público</span>${c.pub}</div>
    <div class="kv"><span>Posicionamento</span>${c.pos}</div>
    <div class="kv"><span>Quando</span>${c.when}</div>
    <div class="kv crv"><span>Criativos</span>${c.cr}</div>
    <div class="bol">Orçamento diário</div>${opt3(c.b)}
  </div>`).join('')}</div>
  <div class="cnote">${t.campNote}</div>`, { cls: 'dense' })

  // 5. criativos
  d.page('pf', `${brand} · Criativos`, 'As peças e os vídeos do mês que viram anúncio', `
  <table class="cal crt">
    <thead><tr><th>Peça ou vídeo</th><th>Campanha</th><th>Gancho</th><th>Chamada</th><th>Sobe em</th></tr></thead>
    <tbody>${t.crs.map((r) => `<tr><td class="p">${r[0]}</td><td class="c"><span>${r[1]}</span></td><td class="g">${r[2]}</td><td>${r[3]}</td><td class="w">${r[4]}</td></tr>`).join('')}</tbody>
  </table>
  <div class="cnote">${t.crNote}</div>`, { cls: 'dense' })

  // 6. testes A/B
  d.page('pf', `${brand} · Testes A/B`, 'Três testes, um de cada vez, para saber o que vende', `
  <div class="abs">${t.ab.map((a, i) => `<div class="card ab"><h3><span class="num">${i + 1}</span>${a[0]}</h3>
    <div class="vs">${a[1].split(' × ').map((v, k) => `${k ? '<i>contra</i>' : ''}<div><b>${'AB'[k]}</b>${v}</div>`).join('')}</div>
    <div class="kv"><span>Quando</span>${a[2]}</div>
    <div class="kv"><span>O que decide</span>${a[3]}</div>
    <div class="win"><span>Depois do teste</span>${a[4]}</div>
  </div>`).join('')}</div>
  <div class="cnote">${t.abRule}</div>`, { cls: 'dense' })

  // 7. calendário
  d.page('pf', `${brand} · Calendário de subida e pausa`, 'O que sobe, o que pausa e quanto por dia, até 31/12', `
  <table class="cal calt">
    <thead><tr><th>Quando</th><th>Momento</th><th>No ar</th><th style="text-align:right">Verba/dia (B)</th></tr></thead>
    <tbody>${t.cal.map((r) => `<tr class="${r[4]}"><td class="d">${r[0]}</td><td class="e">${r[1]}</td><td>${r[2]}</td><td class="v">${r[3]}</td></tr>`).join('')}</tbody>
  </table>
  <div class="ctot">${t.calTotal}</div>
  <div class="stop"><b>Para não parar em 30/11</b>${['Todas as campanhas com data de fim em <b>31/12</b> (conferido em 13/11)', 'Cartão ou saldo da conta conferido até <b>25/11</b> (decisão 3)', 'Checagem em <b>28/11</b> e <b>01/12</b>: anúncios entregando'].map((x) => `<span>${x}</span>`).join('')}</div>`, { cls: 'calpg' })

  // 8. como medir
  d.page('pf', `${brand} · Como medir`, 'Do anúncio ao dinheiro no caixa, contado toda semana', `
  <div class="ms2">
    <div>
      <h3 class="h3">O caminho que vamos contar</h3>
      <div class="flow">${t.measure.flow.map((f) => `<div class="fs"><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div>
      ${ul(t.measure.how)}
      <div class="card rep"><h3>O relatório de segunda, em 4 números</h3><div class="rn">${t.measure.rep.map((r) => `<div><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div></div>
    </div>
    <div>
      <h3 class="h3">Rotina da semana</h3>
      <div class="rot2">${t.routine.map((r) => `<div class="rr ${r[0] === 'Regra' ? 'k' : ''}"><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div>
    </div>
  </div>`, { cls: 'dense' })

  // 9. decisões
  d.page('pf', `${brand} · Decisões`, 'Seis escolhas para o tráfego ir ao ar', `
  <div class="decs d6">${t.decs.map((x, i) => `<div class="card dec"><h3><span class="num">${i + 1}</span>${x[0]}</h3>
    ${x[1].map((o) => `<div class="dopt ${o[3] ? 'rec' : ''}"><b>${o[0]}</b><div><strong>${o[1]}</strong><span>${o[2]}</span></div>${o[3] ? '<em>sugerida</em>' : ''}</div>`).join('')}
  </div>`).join('')}</div>`, { cls: 'dense' })

  const out = html(`Estratégia de tráfego ${brand}`, d.pages).replace('</style>', css + '</style>')
  fs.writeFileSync(path.join(OUT, t.slug, 'trafego-nov-dez.html'), out)
  console.log(brand, d.pages.length)
}
