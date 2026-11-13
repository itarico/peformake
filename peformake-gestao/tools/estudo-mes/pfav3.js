// Peformake: Planejamento de audiovisual v2 (13/11/2026). Nasce da estratégia aprovada (tese, ofertas, metas, cases).
// Reaproveita Doc/avCover/html do build3.js (mesmo design Ellcazo) e escreve só ../peformake/audiovisual.html
const fs = require('fs')
const path = require('path')
const GEN = __dirname
const src = fs.readFileSync(path.join(GEN, 'pf_kit3.js'), 'utf8')
const partA = src.slice(0, src.indexOf('// ---------------- conteúdo por marca'))
const partB = src.slice(src.indexOf('// ---------------- páginas'), src.indexOf('D.Fornario.pieces[3][3]'))
const K = new Function('require', '__dirname', partA + partB + '\nreturn { Doc, avCover, html, ell }')(require, GEN)
const { Doc, avCover, html } = K
const BR = 'Peformake'
const OUT = path.resolve(GEN, '..', 'peformake')
const TH = path.resolve(GEN, '..', '..', 'avs', 'th')
const img = (k) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(TH, k + '.jpg')).toString('base64')
const TT = (u, id) => `https://www.tiktok.com/@${u}/video/${id}`
const AD = (id) => 'https://www.facebook.com/ads/library/?id=' + id
const ul = (a) => `<ul>${a.map((x) => `<li>${x}</li>`).join('')}</ul>`

// ---------------- 1. Mercado e anúncios ----------------
const ADS = [
  ['Alldaya', 'uniformes · nacional', '13/09/2025', 425, 'Vender mais uniformes', '“Quer vender mais uniformes?”', 'Nenhuma (“time de especialistas”)', 'Formulário'],
  ['Fábio Bindes', 'restaurantes · nacional', '11/11/2025', 367, 'Lucro no restaurante', '“Prazer, eu sou Fábio Bindes”', 'Dono do Sushiloko, 17 anos', 'Seguir'],
  ['Bruno Luís', 'salões · nacional', '28/01/2026', 289, 'Agenda cheia', '“O Instagram está MATANDO os salões”', 'Clientes famosos', 'WhatsApp'],
  ['Talismã', 'advogados · nacional', '05/04/2026', 222, 'Parar de depender de indicação', '“Mas eu só consigo clientes por indicação”', 'Nenhuma', 'Seguir'],
  ['Trivo', 'marmorarias · nacional', '14/04/2026', 213, 'Acelerar vendas', 'Humor: a pedra que fala', '“A maior do Brasil”', 'Seguir'],
  ['Growth Odonto', 'dentistas · nacional', '10/06/2026', 156, 'Paciente na cadeira, não lead', 'A pergunta do story: “se são tão bons…”', 'O processo explicado', 'Cadastro'],
  ['Alavant', 'restaurantes · nacional', '28/07/2026', 108, 'Destravar as vendas', 'A dona: “depois de duas agências…”', '<b>Case com cliente real</b>', 'Conversa'],
  ['2biz', 'restaurantes · nacional', '28/07/2026', 108, 'Mais clientes no restaurante', 'Close do especialista falando', 'Nenhuma', 'Especialista'],
  ['Laquila', 'advogados · nacional', '27/08/2026', 78, 'Marketing de quem viveu a dor', '“Somos o nosso próprio case”', 'A própria história', 'Seguir'],
  ['Instituto FGA', 'empresas · nacional', '21/09/2026', 53, 'Plano de 3 meses', '“4 semanas: não gostou, devolvemos”', '<b>Número</b> (R$ 3 mi/mês)', 'Contato'],
]
function marketPage(d) {
  const max = 430
  d.page('av', 'Estudo do audiovisual · 1 de 6 · Mercado e anúncios', 'Todos prometem “vender mais”. Ninguém mostra a equipe no cliente', `
  <div class="mk">
    <div class="mkl">
      <div class="mkh">Os 10 anúncios de marketing no ar há mais tempo <small>(Biblioteca de Anúncios da Meta, Brasil, 13/11)</small></div>
      <table class="adt"><thead><tr><th>Anunciante</th><th>No ar há</th><th>Promessa</th><th>Gancho dos 3 s</th><th>Prova</th><th>Chamada</th></tr></thead><tbody>
      ${ADS.map((a) => `<tr><td><b>${a[0]}</b><small>${a[1]}</small></td><td class="dd"><span class="bar" style="width:${Math.round((a[3] / max) * 64)}px"></span>${a[3]} dias</td><td>${a[4]}</td><td>${a[5]}</td><td>${a[6]}</td><td>${a[7]}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="mkr">
      <div class="kpis">${[['4.805', 'anúncios ativos com “assessoria de marketing”'], ['916', 'com “marketing para restaurantes”'], ['203', 'com “marketing Recife”']].map((k) => `<div class="kp"><b>${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
      <div class="say"><h4>O que todos dizem</h4>${ul(['“Vender mais”, “dobrar”, “a maior assessoria de…”', 'Desconto e grátis na Black Friday: <b>15 dias de anúncio grátis</b>, gestão por R$ 997, 50% OFF', 'Prova com logo ou número solto; <b>0 de 10</b> mostram a equipe trabalhando no cliente'])}</div>
      <div class="gap"><h4>O espaço vazio (é nosso)</h4>${ul(['A <b>equipe gravando dentro do negócio</b>, com o número do cliente na tela', 'Recife com rosto: nos anúncios locais vistos, <b>nenhum roda há mais de 30 dias</b>', 'Assessoria + produtora na mesma casa: o vídeo já gravado vira anúncio'])}</div>
    </div>
  </div>`, { cls: 'avw dense' })
}

// ---------------- 2. Tendência e momento ----------------
const TR = [
  ['Teste social com comerciantes (e o “update” do resultado)', 7.44, '@eusouovander · TikTok'],
  ['A conta na tela (o número decide)', 5.81, '@marcelo_baccarini · TikTok'],
  ['Análise do perfil ao vivo (“comenta EU QUERO”)', 5.58, '@maurecymoura · TikTok'],
  ['Bastidor da captação no cliente', 2.92, '@wallacevideomaker · TikTok'],
  ['Videomaker: “3 erros que te fazem perder venda”', 1.89, '@rickthiagofilms · TikTok'],
  ['Humor: “a equipe de marketing sofre”', 1.53, '@clnica.hope.odont · TikTok'],
  ['Palavras que sabotam a venda (sem desconto)', 1.41, '@phfalci · TikTok'],
  ['O processo do vídeo do restaurante', 1.14, '@aveiacriativaa · TikTok'],
]
function trendPage(d) {
  d.page('av', 'Estudo do audiovisual · 2 de 6 · Tendência e momento', 'O que viraliza agora é prova feita na rua, não dica de escritório', `
  <div class="tr">
    <div class="card trc"><h3>Formatos com mais views de quem vende marketing <small>(milhões de views)</small></h3>
      ${TR.map((t) => `<div class="tb"><span class="tl">${t[0]}<small>${t[2]}</small></span><span class="tv"><i style="width:${Math.round((t[1] / 7.44) * 100)}%"></i><b>${String(t[1]).replace('.', ',')} mi</b></span></div>`).join('')}
      <p class="src">Firecrawl (TikTok e Instagram), 13/11, ordenado por views. Escolhidos por quem vende serviço, não pelo título.</p></div>
    <div class="trr">
      <div class="card"><h3>Já cansou</h3>${ul(['“Bastidores da agência” no Instagram: o melhor teve <b>727 views</b>', '“Dica de tráfego” de gestor: no máximo <b>29,6 mil</b>', 'Dancinha da equipe e “um dia na agência” sem cliente'])}</div>
      <div class="card"><h3>O momento</h3>
        <div class="mo">${[['27–30/11', 'Black Friday + 1ª parcela do 13º: concorrência dá desconto'], ['01–18/12', 'Restaurante e loja no pico: vídeo de fim de ano'], ['até 19/12', '“2027”: dobrar, recorde. Quem decide em dezembro ganha janeiro']].map((m) => `<div><b>${m[0]}</b><span>${m[1]}</span></div>`).join('')}</div></div>
    </div>
  </div>`, { cls: 'avl dense' })
}

// ---------------- 3. Comunicação ----------------
const WA = [['Valor e pagamento', 163], ['Prazo (“quando?”)', 104], ['Vídeo e gravação', 97], ['Vendas', 78], ['Post, arte, story', 70], ['Anúncio, impulsionar', 33], ['Seguidores, alcance', 6]]
function comPage(d) {
  d.page('av', 'Estudo do audiovisual · 3 de 6 · Comunicação', 'O dono fala de venda, vídeo e prazo. Quase nunca de seguidor', `
  <div class="cm">
    <div class="card cm1"><h3>Como a Peformake fala (site e estratégia)</h3>
      <q>Um faz o post, outro faz o vídeo, outro sobe o anúncio. Cada um entrega a sua parte e ninguém entrega o cliente.</q>
      <q>Um ciclo. Um time. Um responsável.</q>
      <p>Direta, de dentro, com humor seco. O vilão é o <b>automático</b>, nunca o anúncio. Nunca “agência”.</p></div>
    <div class="card cm2"><h3>Como o dono fala <small>(WhatsApp: assuntos em mensagens curtas recebidas)</small></h3>
      ${WA.map((w) => `<div class="wb"><span>${w[0]}</span><i style="width:${Math.round((w[1] / 163) * 230)}px"></i><b>${w[1]}</b></div>`).join('')}
      <div class="qs"><q>Pedem para pôr o vídeo do dia no anúncio</q><q>Perguntam se o vídeo já está rodando no tráfego</q></div></div>
    <div class="card cm3"><h3>Então, no vídeo</h3>${ul(['Falar <b>conversa, pedido, WhatsApp</b>; nunca “engajamento”', 'Objeções reais: <b>3 de 13</b> saíram por preço e <b>3</b> por resultado', '<b>11 de 13</b> vieram por indicação: o vídeo faz o papel do amigo que indica', 'Mostrar o prazo: “aprovado no portal, vai ao ar terça”'])}
      <div class="avd"><b>Evitar:</b> <span>agência</span><span>dobrar faturamento</span><span>desconto</span><span>tráfego como vilão</span><span>cliente sem autorização</span></div></div>
  </div>`, { cls: 'avw dense' })
}

// ---------------- 4 e 5. Narrativa e estrutura ----------------
const FUN = [
  ['Atrair', 3, 'P1 · P2 · P3', '50 mil views · 20 conversas'],
  ['Provar', 3, 'P4 · P5 · P6', '36 conversas · 6 Raio-X · 3 upgrades'],
  ['Quebrar objeção', 2, 'P7 · P8', '14 conversas · 10 Raio-X'],
  ['Converter', 2, 'P9 · P10', '2 diárias Ellcazo · 5 contratos'],
]
function narrPage(d) {
  d.page('av', 'Estudo do audiovisual · 4 e 5 de 6 · Narrativa e estrutura', 'Uma história em três atos: o dono, o automático e a equipe que entra', `
  <div class="nr">
    <div class="chain">${[['Herói', 'O dono do Grande Recife que trabalha 12 horas e não vê o marketing virar venda'], ['Problema', 'Posta, impulsiona, contrata, e o WhatsApp não toca. Ninguém olha o número'], ['Vilão', 'O marketing <b>no automático</b>: o sobrinho, o “impulsionar” sem olhar, quem entrega a parte e some'], ['Virada', 'Uma equipe que <b>entra no negócio</b>, grava de dentro e olha o número toda semana'], ['Prova', 'Ótica MD: 192 conversas (06/10–12/11) · VOVINA: pedidos [confirmar] · plano B: F5'], ['Convite', 'Raio-X com câmera grátis → “Comece 2027 com o plano pronto”']].map((c, i) => `<div class="ch ch${i}"><b>${c[0]}</b><span>${c[1]}</span></div>`).join('')}</div>
    <div class="acts">${[['Ato 1 · 16 a 26/11', 'O problema e a porta', 'Case Ótica MD, análise ao vivo, a história do Italo'], ['Ato 2 · 27/11 a 06/12', 'Black Friday sem desconto e a prova', '12 Raio-X com câmera, objeções, VOVINA'], ['Ato 3 · 07 a 19/12', 'Dezembro vende janeiro', 'Equipe no Fornario, diária Ellcazo, Comece 2027']].map((a) => `<div class="act"><small>${a[0]}</small><b>${a[1]}</b><span>${a[2]}</span></div>`).join('')}</div>
    <div class="fun">${FUN.map((f, i) => `<div class="fu fu${i}" style="width:${100 - i * 9}%"><b>${f[0]}</b><span class="fn">${f[1]} vídeos</span><span class="fv">${f[2]}</span><span class="fm">${f[3]}</span></div>`).join('')}</div>
    <p class="nnote">Soma das metas = tabela única da estratégia: <b>70 conversas, 20 Raio-X com câmera, 5 contratos, 2 diárias Ellcazo</b> (aposta inicial, revista em 30/11). A equipe aparece <b>dentro</b> desses papéis, trabalhando no cliente; nunca como tema.</p>
  </div>`, { cls: 'avl dense' })
}

// ---------------- vídeos ----------------
const V = [
  { c: 'P1', t: 'O marketing veio gravar no restaurante', role: 'Atrair', fmt: 'Reels/TikTok · 30 s · humor', offer: 'Tese “o case é o anúncio” → Raio-X', when: 'Grava 01/12 (diária no cliente) · publica sex 04/12', meta: '20 mil views · 6 conversas', canal: 'Orgânico (collab com o cliente) + corte de 15 s no remarketing', diaria: 'Diária 2 · 01/12 · [Fornario, com autorização]', fala: 'Ingrid e Italo (uma frase cada)', grava: 'Lucas no celular, enquanto o Aleffer grava o cliente (captura dupla)',
    ref: { img: 'tt_7662771396958850322', url: TT('italianapizzariaofc2020', '7662771396958850322'), net: 'TikTok', at: '@italianapizzariaofc2020', n: '1,4 mi views · 117 mil curtidas · 5,4 mil compartilhamentos', why: 'A pizzaria postou a equipe de marketing gravando no salão e “comendo a pizza”. O dono se reconhece e marca o amigo.', take: 'Invertemos a piada: a equipe só come depois que o vídeo sai certo, e o número fecha o vídeo.' },
    narr: 'Cotidiano → quebra → propaganda (abre no meio da cena)',
    st: ['“O marketing veio gravar no [Fornario]…” e a câmera já está em cima da pizza', 'Take 7: a luz, o garçom no quadro, a pizza esfriando. A Ingrid refaz', 'Corte para um vídeo antigo do Fornario: o prato novo levou 479 pessoas ao perfil (nov)', '“A gente grava de dentro. Raio-X grátis no WhatsApp.”'],
    sb: [['0–3 s', 'Cozinha aberta; Aleffer de costas com a câmera, Ingrid no celular', 'Plano aberto, câmera na mão', '(som da cozinha)', 'O marketing veio gravar…'], ['3–9 s', 'Pizza saindo do forno; garçom entra no quadro', 'Close, de cima', 'Ingrid: “De novo!”', 'take 7'], ['9–15 s', 'Thyfany aprova com o dono no portal; joinha', 'Plano médio', '(sem fala)', 'Aprovado no portal'], ['15–22 s', 'O vídeo final: fumaça, queijo puxando', 'Tela cheia 9:16', '(som do prato)', 'Vídeo antigo: 479 visitas ao perfil'], ['22–30 s', 'Italo no balcão pega a fatia', 'Plano médio, olho na câmera', 'Italo: “Agora pode comer.”', 'Raio-X grátis no WhatsApp']],
    ideas: [['Take 7', 'Contador de takes na tela até o perfeito.'], ['Expectativa × realidade', 'O vídeo que o dono imagina, o bastidor real e o resultado.'], ['Quem come primeiro', 'A equipe só come depois que o número aparece.']],
    ad: ['Curiosidade: “Quanto custa um vídeo de pizza que vende?”', 'Dor: “Seu vídeo de comida não dá fome?”', 'Prova: “Um vídeo do Fornario levou 479 pessoas ao perfil.”'] },
  { c: 'P2', t: 'Raio-X em 30 segundos', role: 'Atrair', fmt: 'Reels/TikTok · 35 s · série semanal', offer: 'Raio-X do marketing (porta única)', when: 'Grava 17/11 (tela + Italo) · estreia seg 23/11, 1 por semana até 18/12', meta: '40 comentários “RAIO-X” · 12 conversas · 4 Raio-X', canal: 'Orgânico; versão de anúncio “Quer o seu completo? 30 min grátis”', diaria: 'Diária 1 · 17/11 · escritório', fala: 'Italo', grava: 'Lucas (câmera e gravação de tela); Thyfany puxa os comentários para o WhatsApp em 1 hora',
    ref: { img: 'tt_7224511295108812038', url: TT('maurecymoura', '7224511295108812038'), net: 'TikTok', at: '@maurecymoura', n: '5,6 mi views · 163 mil curtidas', why: 'A análise de perfil ao vivo é uma amostra grátis do serviço e o comentário “EU QUERO” vira lead. Mesmo formato do @kianamirf (1,3 mi): “se eu cuidasse do seu restaurante…”.', take: 'Em vez de opinião, o Italo mostra 3 vazamentos num perfil real de Recife e cronometra a resposta no WhatsApp.' },
    narr: 'Perguntas que o dono responde “sim” por dentro + loop aberto (o 3º é o que mais custa)',
    st: ['“Eu olho 3 coisas no seu perfil e sei se ele vende.”', 'A bio não diz onde fica; o post não tem preço; o 3º fica em aberto', 'O Italo manda mensagem ao vivo: [x] minutos sem resposta', '“Comenta RAIO-X que o próximo é o seu.”'],
    sb: [['0–2 s', 'Italo na frente do perfil do dono (notebook)', 'Primeiro plano', '“Eu olho 3 coisas e sei se vende.”', 'Raio-X em 30 s'], ['2–10 s', 'A bio na tela, circulada', 'Gravação de tela', '“1: a bio diz o que e onde?”', '1. A bio'], ['10–18 s', 'O último post, riscado', 'Gravação de tela', '“2: tem preço e chamada?”', '2. O post'], ['18–27 s', 'Italo manda “quero pedir” no WhatsApp e cronometra', 'Celular na mão, close', '“3: quanto tempo pra responder?”', '3. A resposta: [x] min'], ['27–35 s', 'Italo volta para a câmera', 'Primeiro plano', '“Os três juntos? Marketing no automático.”', 'Comenta RAIO-X']],
    ideas: [['Respondendo comentário', 'Responde o @ de um dono que comentou no vídeo anterior.'], ['Perfil de Recife', 'Um negócio conhecido da cidade, com autorização, antes e depois.'], ['Só o cronômetro', 'O teste da resposta no WhatsApp, em 15 s.']],
    ad: ['Curiosidade: “3 coisas que eu olho no seu perfil”', 'Dor: “Você posta e o WhatsApp não toca?”', 'Prova: “Fiz isso com a Ótica MD: 192 conversas.”'] },
  { c: 'P3', t: 'Eu tinha problema de dicção', role: 'Atrair', fmt: 'Reels/TikTok · 40 s · marca pessoal', offer: 'Tese contra a fachada → Diária Ellcazo e Raio-X', when: 'Grava 17/11 · publica qua 25/11 no @italosantosdigital (collab @peformake)', meta: '15 mil views · 300 seguidores · 2 conversas', canal: 'Orgânico; só impulsiona se passar de 2× a média [hipótese]', diaria: 'Diária 1 · 17/11 · escritório', fala: 'Italo', grava: 'Aleffer',
    ref: { img: 'yt_oVWYuLgfLA4', url: 'https://www.youtube.com/watch?v=oVWYuLgfLA4', net: 'YouTube', at: '@TiagoFonsecaoficial', n: '149 mil views', why: 'Medo de câmera é o motivo nº 1 do dono não aparecer. Quem confessa a própria dificuldade ganha confiança na hora.', take: 'A cicatriz real do Italo (molde Cicatriz → Prova → Volta do Método De Dentro), sem palco de coach.' },
    narr: 'Cicatriz → prova → volta (o fim repete o começo, agora certo)',
    st: ['O Italo trava numa frase de verdade', '“Fui parar logo no YouTube. 10 anos falando com câmera.”', 'Hoje ele dirige um dono gravando; prova: vídeo com gente rende mais que arte', 'Repete a frase, certa: “Se eu apareço, você aparece.”'],
    sb: [['0–3 s', 'Rosto do Italo; ele trava numa frase', 'Close', '(a frase que ele errava)', 'Eu tinha problema de dicção'], ['3–12 s', 'Vídeo antigo do Italo [arquivo pessoal]', 'Tela cheia', '“Fui parar no YouTube. 10 anos.”', '10 anos de câmera'], ['12–22 s', 'Italo dirigindo um dono na diária', 'Plano médio, câmera na mão', '“Hoje eu ensino dono a aparecer.”', '(nome do cliente, com autorização)'], ['22–32 s', 'Post da Sn com a Sandra × arte', 'Tela dividida', '“Gente vende mais que arte.”', '28 × 12 curtidas'], ['32–40 s', 'Italo repete a frase do começo, certa', 'Close', '“Se eu apareço, você aparece.”', 'Raio-X grátis no WhatsApp']],
    ideas: [['A frase que eu errava', 'Abre e fecha com a mesma frase.'], ['O dono com vergonha', 'Conversa com um dono que não quer aparecer.'], ['3 truques de quem travava', 'Falar com uma pessoa só, começar no meio, deixar o erro.']],
    ad: ['Curiosidade: “Por que eu não deveria estar aqui”', 'Dor: “Você tem vergonha de gravar?”', 'Prova: “Gente na câmera: 28 × 12 curtidas.”'] },
  { c: 'P4', t: 'Estudo de caso #1: a ótica que virou conversa', role: 'Provar', fmt: 'Reels + anúncio principal · 32 s', offer: 'Raio-X (anúncio de captação 19/11 a 18/12)', when: 'Grava 17/11 à tarde na Ótica MD [confirmar] · publica qui 19/11', meta: '25 conversas de dono no anúncio a até R$ 35 · 6 Raio-X', canal: 'Anúncio principal + orgânico', diaria: 'Diária 1 · 17/11 · ida à ótica', fala: 'Italo e o dono [autorização do cliente]', grava: 'Aleffer; tela do sistema montada pelo Higor',
    ref: { img: 'tt_7670526718502866194', url: TT('othiagoryuji', '7670526718502866194'), net: 'TikTok', at: '@othiagoryuji', n: '1,1 mi views · 208 mil curtidas', why: 'O “resultado da divulgação” mostra o lugar real e o número na tela (143 → 70 mil seguidores). O case da Alavant com a dona da confeitaria roda há 108 dias: é anúncio que se paga.', take: 'A Peformake com o número do sistema (conversas e custo), sem promessa e sem valor de contrato.' },
    narr: 'Documentário → testemunho → oferta',
    st: ['“Essa ótica tinha vitrine. Não tinha conversa.”', 'O dono: “Postava e o WhatsApp não tocava.”', 'O anúncio com botão e mensagem pronta; 192 conversas a R$ 6,53', '“Anúncio não é vilão. Automático é. Quer ver o seu número?”'],
    sb: [['0–3 s', 'Italo na porta da Ótica MD', 'Plano médio, de fora para dentro', '“Tinha vitrine. Não tinha conversa.”', 'Estudo de caso #1'], ['3–10 s', 'O dono no balcão [autorização]', 'Plano médio', '“Postava e o WhatsApp não tocava.”', '(nome e cidade)'], ['10–18 s', 'O anúncio com o botão do WhatsApp', 'Tela do celular', 'Italo: “Botão e mensagem pronta.”', 'Anúncio → conversa'], ['18–25 s', 'Número enorme sobre a loja', 'Tela cheia', '(sem fala)', '192 conversas · R$ 6,53 cada'], ['25–32 s', 'Italo dentro da loja', 'Primeiro plano', '“Quer ver o seu número?”', 'Raio-X grátis no WhatsApp']],
    ideas: [['O celular do dono', 'O WhatsApp vazio antes e cheio depois.'], ['O dono conta', 'Depoimento de 20 s, só ele.'], ['Só a tela', 'Se o cliente não quiser aparecer: tela + voz do Italo.']],
    ad: ['Curiosidade: “O que mudou nessa ótica em 2 meses”', 'Dor: “Vitrine bonita e WhatsApp parado?”', 'Prova: “192 conversas a R$ 6,53.”'] },
  { c: 'P5', t: 'O vídeo que virou anúncio (VOVINA)', role: 'Provar', fmt: 'Reels · 32 s · Ellcazo + Peformake', offer: '“Da gravação ao cliente” (13 clientes só com audiovisual) + Raio-X', when: 'Sem diária: arquivo Ellcazo + tela · publica qui 03/12', meta: '3 upgrades na base · 6 conversas novas', canal: 'Orgânico + envio direto aos 13 clientes só de audiovisual (por um humano)', diaria: 'Nenhuma (material da Ellcazo já gravado)', fala: 'Italo (voz)', grava: 'Almeida monta com o arquivo da Ellcazo',
    ref: { img: 'tt_7683914313479752980', url: TT('eusouovander', '7683914313479752980'), net: 'TikTok', at: '@eusouovander', n: '1,3 mi views · 236 mil curtidas', why: 'O “UPDATE” fecha um loop aberto: o público volta para ver o resultado. A série de testes sociais dele passa de 7 mi views com comerciantes.', take: 'O update é do vídeo do Combo: gravado pela Ellcazo, virou anúncio e o número aparece.' },
    narr: 'Update (antes → o que fizemos → resultado em 9 dias)',
    st: ['“Esse vídeo foi gravado num dia.”', 'Ficaria parado no celular do cliente', 'Virou anúncio com link do delivery: 893 cliques a R$ 0,13', '“Da gravação ao cliente: o vídeo vira venda.”'],
    sb: [['0–3 s', 'O vídeo do Combo rodando no celular', 'Celular na mão', '(som do vídeo)', 'Esse vídeo foi gravado num dia'], ['3–10 s', 'Bastidor da gravação [arquivo Ellcazo]', 'Câmera na mão', 'Italo (voz): “Gravamos de manhã.”', 'A gravação · Ellcazo'], ['10–18 s', 'O mesmo vídeo como anúncio', 'Tela do celular', '“À tarde, virou anúncio.”', 'Virou anúncio'], ['18–25 s', 'Gráfico de cliques do sistema', 'Tela', '(sem fala)', '893 cliques · R$ 0,13 · 85% desse vídeo'], ['25–32 s', 'Pedido chegando no delivery', 'Close', '“Vídeo parado não vende.”', 'Da gravação ao cliente']],
    ideas: [['UPDATE', 'Antes e o resultado 9 dias depois.'], ['A pasta esquecida', 'Os vídeos que o cliente tem e nunca anunciou.'], ['1 vídeo, 2 trabalhos', 'O orgânico e o corte de anúncio, lado a lado.']],
    ad: ['Curiosidade: “O que aconteceu com esse vídeo”', 'Dor: “Seus vídeos estão parados no celular?”', 'Prova: “893 cliques a R$ 0,13.”'] },
  { c: 'P6', t: 'Quem lembra de postar quando o salão enche?', role: 'Provar', fmt: 'Reels · 30 s · equipe no cliente', offer: '“Comece 2027 com o plano pronto” + Raio-X', when: 'Grava 01/12 no Fornario e no escritório · publica qui 10/12', meta: '10 mil views · 5 conversas', canal: 'Orgânico (collab com o Fornario)', diaria: 'Diária 2 · 01/12 + 15 min no escritório', fala: 'Thyfany e Ingrid', grava: 'Lucas (celular) e Aleffer',
    ref: { img: 'tt_7637537663200857365', url: TT('aveiacriativaa', '7637537663200857365'), net: 'TikTok', at: '@aveiacriativaa', n: '1,1 mi views · 325 mil curtidas', why: 'Mostrar o processo do vídeo do restaurante tira o medo de comprar um serviço que não se vê. 28 curtidas a cada 100 views.', take: 'O processo real da Thyfany e da Ingrid dentro do Fornario, fechando com prova de caixa: [reservas de novembro, com autorização].' },
    narr: 'Processo em 4 etapas, com o número no fim',
    st: ['“Sexta, 20h, salão cheio. Quem lembra de postar?”', 'O dono está no forno; o story das 19h não sai', 'Thyfany no calendário, Ingrid no salão, Higor na arte, aprovado no portal', '“[x] reservas em novembro. Constância é time. Comece 2027.”'],
    sb: [['0–3 s', 'Salão cheio, pizzaiolo no forno', 'Plano aberto, câmera na mão', '(som do salão)', 'Sexta, 20h. Quem posta?'], ['3–10 s', 'Thyfany no calendário do sistema', 'Por cima do ombro', '“Quem lembra de postar? A gente.”', 'Thyfany · líder de social'], ['10–17 s', 'Ingrid gravando story com o pizzaiolo', 'Câmera na mão, no salão', 'Ingrid: “Hoje tem story às 19h.”', 'Ingrid · social media'], ['17–24 s', 'Higor fecha a arte; aprovada no portal', 'Tela + rosto', '(sem fala)', 'Aprovado em 1 toque'], ['24–30 s', 'Pizza servida; número na tela', 'Close', '“Constância é time.”', '[x] reservas em novembro']],
    ideas: [['Reserva por reserva', 'Cada reserva de novembro vira um post-it no painel [autorização].'], ['Do pedido ao ar', 'Um post seguido do pedido até a publicação.'], ['O dono que esquecia', 'O dono conta como era antes [autorização].']],
    ad: ['Curiosidade: “Quem posta pelo Fornario”', 'Dor: “Você esquece de postar quando enche?”', 'Prova: “[x] reservas em novembro.”'] },
  { c: 'P7', t: '“Já paguei agência e não deu em nada”', role: 'Quebrar objeção', fmt: 'Reels + anúncio · 32 s', offer: 'Raio-X com câmera (Black Friday: 12 vagas)', when: 'Grava 17/11 · publica dom 29/11', meta: '6 conversas · 4 Raio-X de quem já teve “agência”', canal: 'Anúncio para quem viu P4 + orgânico', diaria: 'Diária 1 · 17/11 · escritório', fala: 'Italo; Thyfany aparece na reunião', grava: 'Lucas',
    ref: { img: 'ad_growthodonto', url: AD('2055152195075870'), net: 'Biblioteca de Anúncios', at: 'Growth Odonto', n: 'no ar há 156 dias (desde 10/06/2026)', why: 'Responde no story a pergunta de verdade: “se vocês são tão bons, por que não entregam o paciente na cadeira?”. Nomear a objeção na tela prende quem pensa igual.', take: 'A objeção real da nossa base (3 de 13 saíram por resultado) e o relatório de segunda como resposta.' },
    narr: 'Objeção → resposta com prova → oferta sem risco',
    st: ['A pergunta na tela: “Já paguei agência e não deu em nada.”', '“Faz sentido. Geralmente faltou alguém olhando o número toda semana.”', 'O relatório de segunda e a reunião de 15 min', '“No Raio-X você sai sabendo, mesmo se não for com a gente.”'],
    sb: [['0–3 s', 'Caixinha de pergunta na tela; Italo lê', 'Primeiro plano + texto', '(lê a pergunta)', 'Já paguei agência e não deu em nada'], ['3–10 s', 'Italo responde sentado', 'Primeiro plano', '“Faltou alguém olhando o número.”', 'Faltou olhar o número'], ['10–18 s', 'Relatório de segunda (sem valores de contrato)', 'Tela', '“Toda segunda o cliente recebe isso.”', 'Conversas · custo · o que mudou'], ['18–25 s', 'Thyfany em reunião com o cliente', 'Plano médio', '(som ambiente)', 'Reunião de 15 min'], ['25–32 s', 'Italo volta', 'Primeiro plano', '“Você sai sabendo.”', 'Raio-X com câmera · 12 vagas']],
    ideas: [['A pergunta do story', 'Responde uma pergunta real de seguidor.'], ['O que ninguém te mostrou', 'Abre o relatório de segunda, item por item.'], ['3 sinais do automático', 'Ninguém liga, ninguém mede, ninguém muda.']],
    ad: ['Curiosidade: “Por que a agência não deu certo”', 'Dor: “Já pagou e ficou sem resultado?”', 'Prova: “Relatório toda segunda, 32 clientes.”'] },
  { c: 'P8', t: 'Black Friday da Peformake: 0% de desconto', role: 'Quebrar objeção', fmt: 'Reels + anúncio + stories · 30 s', offer: 'Raio-X com câmera: 12 vagas de 27 a 30/11 (3 por dia), sem desconto', when: 'Grava 17/11 · publica qui 26/11 · anúncio 27 a 30/11', meta: '8 conversas · 6 Raio-X (das 12 vagas)', canal: 'Anúncio + orgânico; contador nos stories só depois de 7 vagas (Ingrid)', diaria: 'Diária 1 · 17/11 · escritório', fala: 'Italo', grava: 'Aleffer',
    ref: { img: 'tt_7530048266998713605', url: TT('phfalci', '7530048266998713605'), net: 'TikTok', at: '@phfalci', n: '1,4 mi views · 25 mil compartilhamentos', why: '“Pare de usar palavras que sabotam seu marketing: desconto, barato, promoção.” Quem diz não ao desconto vira assunto.', take: 'Enquanto a concorrência dá 15 dias grátis e 50% OFF, a Peformake vai até o negócio com a câmera.' },
    narr: 'Quebra de padrão (rasga o cartaz) → conta → escassez real',
    st: ['O Italo rasga um cartaz de “50% OFF”', '“Desconto em marketing é barato no 1º mês e caro no 6º.”', 'Em vez de desconto: o Italo e a Ellcazo vão até 12 negócios, 3 por dia', '“Manda RAIO-X no WhatsApp. São 12 vagas.”'],
    sb: [['0–3 s', 'Italo rasga o cartaz “50% OFF”', 'Plano médio', '(som do papel)', 'Black Friday da Peformake: 0%'], ['3–10 s', 'Italo no quadro branco', 'Plano médio', '“Barato no 1º mês, caro no 6º.”', 'A conta do desconto'], ['10–18 s', 'Italo e Aleffer saindo com a câmera', 'Plano aberto', '“Em vez disso, a gente vai até você.”', '12 vagas · 3 por dia'], ['18–25 s', 'Italo olhando a câmera', 'Close', '“30 minutos no seu número. Grátis.”', 'Raio-X do marketing'], ['25–30 s', 'Contador de vagas', 'Gráfico', '(sem fala)', 'Restam [20] · manda RAIO-X']],
    ideas: [['Rasga o OFF', 'O gesto abre o vídeo e o assunto.'], ['A conta do desconto', '50% no 1º mês × 6 meses, no quadro.'], ['Vagas caindo', 'Stories diários com o contador real.']],
    ad: ['Curiosidade: “Por que a gente não dá desconto”', 'Dor: “Cansou de promoção que não vira cliente?”', 'Prova: “12 vagas, 3 por dia.”'] },
  { c: 'P9', t: '3 erros que fazem o vídeo do seu restaurante não dar fome', role: 'Converter', fmt: 'Reels + anúncio · 32 s · Ellcazo', offer: 'Diária Ellcazo de fim de ano (até 18/12, restaurantes e lojas)', when: 'Grava 01/12 no cliente · anúncio 04 a 18/12 · post sex 11/12', meta: '2 diárias vendidas · 8 conversas', canal: 'Anúncio (restaurantes e lojas do Grande Recife) + orgânico', diaria: 'Diária 2 · 01/12 · [Fornario]', fala: 'Aleffer', grava: 'Lucas; Ingrid no bastidor',
    ref: { img: 'tt_7524436529045851448', url: TT('rickthiagofilms', '7524436529045851448'), net: 'TikTok', at: '@rickthiagofilms', n: '1,9 mi views · 6,9 mil compartilhamentos', why: 'Um videomaker brasileiro vendendo o próprio serviço: “3 erros que te fazem perder venda todo dia”. Erro e correção na mesma cena. O @mario.prawira (1,3 mi) mostra o mesmo com celular.', take: 'O Aleffer corrige os 3 erros num prato real em 30 s e a diária da Ellcazo fecha o vídeo.' },
    narr: 'Erro → correção na hora (antes e depois a cada 7 s)',
    st: ['“Se o seu vídeo é assim, ele não dá fome.”', 'Erro 1 a luz, erro 2 o movimento, erro 3 o som', 'Antes e depois do mesmo prato, lado a lado', '“Fim de ano: até 6 vídeos em 3 horas, fora do seu pico. Agenda até 18/12.”'],
    sb: [['0–3 s', 'Celular gravando o prato com luz de cima, tremendo', 'Close, câmera na mão', 'Aleffer: “Assim não dá fome.”', 'Erro 1: a luz'], ['3–10 s', 'O prato virado para a janela', 'Tela dividida', '“Luz de lado. Pronto.”', 'antes | depois'], ['10–17 s', 'Celular parado × chegando devagar', 'Tela dividida', '“Movimento lento, chegando.”', 'Erro 2: o movimento'], ['17–24 s', 'Queijo puxando, fogo, faca', 'Macro', '(só o som do prato)', 'Erro 3: música alta'], ['24–32 s', 'Equipe Ellcazo na cozinha; logo', 'Plano aberto', '“Fim de ano: chama a Ellcazo.”', 'até 6 vídeos em 3 h · até 18/12']],
    ideas: [['3 erros', 'Erro e correção a cada 7 segundos.'], ['Celular × câmera', 'O mesmo prato no celular e na câmera da Ellcazo.'], ['O seu perfil antes e depois', 'Vídeo antigo do cliente e o novo [autorização].']],
    ad: ['Curiosidade: “O erro que todo vídeo de restaurante tem”', 'Dor: “Seu vídeo não dá fome?”', 'Prova: “O vídeo do Combo trouxe 85% dos cliques.”'] },
  { c: 'P10', t: 'Dezembro vende janeiro', role: 'Converter', fmt: 'Reels + anúncio de remarketing · 30 s', offer: '“Comece 2027 com o plano pronto” (6 meses, fechado até 19/12)', when: 'Grava 17/11 + cenas de 01/12 · publica ter 15/12 · anúncio 12 a 19/12', meta: '5 contratos (de quem fez o Raio-X)', canal: 'Remarketing para quem conversou ou fez Raio-X + orgânico', diaria: 'Diária 1 · 17/11 + inserts da 2', fala: 'Italo; a equipe aparece no planejamento', grava: 'Aleffer',
    ref: { img: 'tt_7676593066471640341', url: TT('marcelo_baccarini', '7676593066471640341'), net: 'TikTok', at: '@marcelo_baccarini', n: '5,8 mi views · 20 mil compartilhamentos', why: '“É a matemática que decide se o restaurante ganha ou perde dinheiro.” Dono confia em conta, não em promessa. Contraste: a Growing anuncia “dobrar em 2027”.', take: 'A conta do calendário: quem fecha em janeiro perde janeiro; quem fecha até 19/12 começa com o plano pronto.' },
    narr: 'A conta na tela → consequência → oferta com prazo real',
    st: ['“31/12, 23h47.” O dono sozinho, o calendário de janeiro vazio; o Italo risca 3 semanas', '“Contrato em 05/01, plano em 20/01, primeiro vídeo em fevereiro.”', 'Fechou até 19/12: plano antes da virada e diária até 16/01', '“Comece 2027 com o plano pronto. Até 19/12.”'],
    sb: [['0–3 s', 'Calendário de janeiro; caneta risca 3 semanas', 'De cima', '“Quem começa em janeiro perde janeiro.”', 'Janeiro: 3 semanas perdidas'], ['3–10 s', 'A conta no quadro', 'Plano médio', '“Contrato 05/01, plano 20/01…”', '05/01 → 20/01 → fevereiro'], ['10–18 s', 'Thyfany, Higor e Aleffer no planejamento', 'Plano aberto', '(som ambiente)', 'O plano de janeiro, pronto em dezembro'], ['18–25 s', 'O plano impresso na mesa do dono [autorização]', 'Close', '“Fechou até 19/12: diária até 16/01.”', 'Diária Ellcazo até 16/01'], ['25–30 s', 'Italo olhando a câmera', 'Primeiro plano', '“Comece 2027 com o plano pronto.”', 'Até 19/12 · WhatsApp']],
    ideas: [['A conta do calendário', 'Só o calendário e a caneta.'], ['O dono que começou em dezembro', 'Case de quem decidiu antes [autorização].'], ['A entrega do plano', 'O plano chega impresso antes do Natal.']],
    ad: ['Curiosidade: “O mês que todo dono perde”', 'Dor: “Vai começar 2027 do zero de novo?”', 'Prova: “Plano pronto antes da virada.”'] },
]

// Estilo (catálogo E1–E40) e modelo de roteiro (M1–M49) do estudo de vídeos do Italo (video-tools/estilos, roteiro-narrativa)
const EM = {
  P1: ['E28', 'Bastidor → contagem → resultado', 'M39', 'Bastidor → “3·2·1” → resultado', 'Peça de ofício sem fala traz alcance (@rabbits, @omarcosvianna): o take 7 é o bastidor, o “3·2·1” abre o vídeo pronto e o número fecha.'],
  P2: ['E3', 'Tela dividida explicativa (rosto + painel)', 'M1', 'Lista “Você sabe por quê?” com título fixo', 'Fórmula da @giubeckers (14 mi views): série com título fixo, conhecimento técnico aplicado a um caso real, nome técnico em cada item e o mesmo fecho toda semana. Regra: só analisa o perfil de quem comentou “RAIO-X” e autorizou.'],
  P3: ['E2', 'Documental mínimo', 'M25', 'Cicatriz → Prova → Volta (MDD)', 'A história real manda; corte de respiração e arquivo pessoal como pontuação. Intenção antes da técnica: nada de palco de coach.'],
  P4: ['E17', 'POV câmera viva + fecho de pôster', 'M2', 'Gancho de desejo + método', '“POV: um estrategista numa ótica”: o Italo anda, aponta a vitrine e o WhatsApp; o cenário real prova. Desejo = resultado + personagem (192 conversas, 06/10 a 12/11). Plano B se a ótica não autorizar até 19/11: F5, carro com preço no vídeo (R$ 4,08 por conversa).'],
  P5: ['E20', 'Breakdown com processo exposto', 'M43', 'Tutorial de negócio com o caso da casa', 'Resultado em cima, a “máquina” embaixo (gravação → corte → anúncio → cliques). É a série “3 criativos de uma diária” sugerida no estudo do @rabbits.'],
  P6: ['E21', 'Tela filmada / bastidor cru', 'M44', 'Diário do mês', 'Lista em mono “Novembro: [x] reservas / stories às 19h / 0 dias sem post” com a Thyfany no calendário: prova de caixa, sem número de vaidade.'],
  P7: ['E16', 'Rosto ↔ cartaz', 'M46', 'Opinião contra o próprio interesse', 'Ideia do estudo do @omarcosvianna para nós: “Contratar assessoria pode ser dinheiro jogado fora… se ninguém olhar o número”. O cartaz pontua cada objeção.'],
  P8: ['E40', 'Cinema escuro + tipografia + rabisco (favorito do Italo)', 'M34', 'Por que eu NÃO faço X', '“0%” gigante atrás do Italo, rabisco branco rasgando o “50% OFF”, vermelho único. Dizer o que não faz posiciona mais que prometer.'],
  P9: ['E8', 'Antes e depois', 'M49', 'Lista em capítulos (I, II, III)', 'Mesmo enquadramento nas duas versões e o som do “depois” manda; capítulos romanos organizam os 3 erros e dão ritmo.'],
  P10: ['E19', 'Curta cinematográfico (realismo contido)', 'M11', 'Cena com relógio', '“31/12, 23h47”: o dono sozinho com o calendário de janeiro vazio, letterbox e planos de detalhe; corta para quem fechou até 19/12. A conta vira cena.'],
}
const FECHO = 'Fecho-assinatura de todos os vídeos (lição da @giubeckers: todo vídeo termina igual): plano da equipe trabalhando + cartela “A gente grava de dentro.” + “Raio-X no WhatsApp”.'
const RC = { Atrair: 'r0', Provar: 'r1', 'Quebrar objeção': 'r2', Converter: 'r3' }

function mapPage(d) {
  d.page('av', `${BR} · Os 10 vídeos e o calendário`, 'Cada vídeo serve a uma oferta, tem uma data e uma meta', `
  <table class="mp"><thead><tr><th></th><th>Vídeo</th><th>Papel</th><th>Oferta</th><th>Estilo·roteiro</th><th>Grava · publica</th><th>Meta</th></tr></thead><tbody>
  ${V.map((v) => `<tr><td><span class="code">${v.c}</span></td><td><b>${v.t}</b></td><td><span class="rl ${RC[v.role]}">${v.role}</span></td><td>${v.offer}</td><td style="white-space:nowrap"><b>${EM[v.c][0]} · ${EM[v.c][2]}</b></td><td>${v.when}</td><td>${v.meta}</td></tr>`).join('')}
  </tbody></table>`, { cls: 'avw dense mppg' })
}

function scopePage(d) {
  d.page('av', 'Estudo do audiovisual · 6 de 6 · Escopo', 'Duas diárias e a captura dupla. Nada além do que a equipe aguenta', `
  <div class="sc">
    <div class="card"><h3>Diária 1 · ter 17/11 · escritório</h3>
      ${[['8h', 'P8 (rasga o OFF) e P10 (a conta)'], ['9h30', 'P2 (Raio-X em 30 s) e P7 (a objeção)'], ['11h', 'P3 (a dicção), com calma'], ['14h', 'P4 na Ótica MD [confirmar e autorizar]'], ['16h30', 'Falas do P5; Thyfany no calendário (P6)']].map((s) => `<div class="slot"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
    <div class="card"><h3>Diária 2 · ter 01/12 · no cliente</h3>
      <p class="dsub">[Fornario, com autorização]. A diária da Ellcazo do cliente segue normal; a Peformake grava junto.</p>
      ${[['7h', 'P9: o Aleffer e os 3 erros'], ['10h', 'P1: “o marketing veio gravar”'], ['11h', 'P6: Ingrid no salão, story com o pizzaiolo'], ['Sempre', 'Captura dupla: 1 bastidor para o @italosantosdigital']].map((s) => `<div class="slot"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
    <div class="card"><h3>Quem faz</h3>
      <div class="ppl">${[['Italo', 'fala em 7 vídeos'], ['Thyfany', 'P1, P6, P7; puxa os leads em 1 h'], ['Ingrid', 'P1, P6; stories das vagas'], ['Higor', 'telas do sistema e capas'], ['Aleffer', 'grava as diárias; fala no P9'], ['Lucas', 'celular, tela e cortes de 15 s'], ['Almeida', 'edita o orgânico em até 48 h']].map((p) => `<div><b>${p[0]}</b><span>${p[1]}</span></div>`).join('')}</div>
      <p class="dnote">Cabe: 10 vídeos, 5 cortes de anúncio e os stories. Sem autorização, o case vira “só a tela”. <b>10 estilos diferentes</b> (E2, E3, E8, E16, E17, E19, E20, E21, E28, E40) e o mesmo fecho em todos: “A gente grava de dentro.”</p></div>
  </div>`, { cls: 'avl dense' })
}

const FOTOS = [
  ['A equipe dentro do cliente', [['tt_7661241631391157511', 'Celular gravando o cliente, o bastidor aparece', '@wallacevideomaker · 2,9 mi', TT('wallacevideomaker', '7661241631391157511')], ['tt_7669127578451463432', 'Quem grava e quem é gravado no mesmo quadro', '@clnica.hope.odont · 1,5 mi', TT('clnica.hope.odont', '7669127578451463432')], ['tt_7525934032652209413', 'O filmmaker de costas, a pizza em primeiro plano', '@_arthurmov · 2,4 mi', TT('_arthurmov', '7525934032652209413')]]],
  ['O prato que dá fome (Ellcazo)', [['tt_7481672964467854622', 'Luz de lado e movimento lento', '@medicisocial · 1,9 mi', TT('medicisocial', '7481672964467854622')], ['tt_7536364425146600726', 'Tudo no celular, do começo ao fim', '@mario.prawira · 1,3 mi', TT('mario.prawira', '7536364425146600726')], ['tt_7144350978588937478', 'Macro no ingrediente, fundo escuro', '@chrisgarbin · 2,8 mi', TT('chrisgarbin', '7144350978588937478')]]],
  ['Rosto e lugar real', [['ad_talisma', 'De pé no escritório, a frase do cliente na tela', 'Talismã · anúncio há 222 dias', AD('944953507944691')], ['ad_laquila', 'Frase única em tela cheia: “somos o nosso próprio case”', 'Laquila · anúncio há 78 dias', AD('1376669714035197')], ['ad_bindes', 'Falando com a marca atrás, a pergunta na tela', 'Fábio Bindes · anúncio há 231 dias', AD('3461623043997383')]]],
]
function photoPage(d) {
  d.page('av', `${BR} · Gravação · Referências de foto`, 'O que fotografar e enquadrar nas diárias', `
  <div class="fotos">${FOTOS.map(([g, L]) => `<div class="fg"><h3>${g}</h3><div class="fr3">${L.map((f) => `<a class="ft" href="${f[3]}" target="_blank"><img src="${img(f[0])}" alt=""><span>${f[1]}</span><small>${f[2]}</small></a>`).join('')}</div></div>`).join('')}</div>`, { cls: 'avw fotopg' })
}

function videoPages(d) {
  V.forEach((v, k) => {
    const cls = k % 2 === 0 ? 'avw' : 'avl'
    d.page('av', '', '', `
    <div class="vp">
      <a class="phone" href="${v.ref.url}" target="_blank"><img src="${img(v.ref.img)}" alt=""><span class="play">▶ Assistir ${v.ref.net === 'Biblioteca de Anúncios' ? 'na Biblioteca' : 'no ' + v.ref.net}</span></a>
      <div class="vmain">
        <div class="bname">${BR} · vídeo ${k + 1} de ${V.length} · 1/2</div>
        <div class="vtop"><span class="code">${v.c}</span><span class="rl ${RC[v.role]}">${v.role}</span><span class="selo">${v.fmt}</span></div>
        <h1 class="vh">${v.t}</h1>
        <div class="emx"><span><b>${EM[v.c][0]}</b> ${EM[v.c][1]}</span><span><b>${EM[v.c][2]}</b> ${EM[v.c][3]}</span><p>${EM[v.c][4]}</p></div>
        <div class="why"><b>Por que a referência funciona</b> <a class="src" href="${v.ref.url}" target="_blank">${v.ref.at} · ${v.ref.n}</a><p>${v.ref.why}</p><p class="tk"><b>Na Peformake →</b> ${v.ref.take}</p></div>
        <div class="facts">${[['Oferta', v.offer], ['Quando', v.when], ['Meta', v.meta], ['Onde roda', v.canal], ['Quem fala', v.fala], ['Quem grava', v.grava]].map((f) => `<div><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div>
        <div class="story"><div class="sh">Storytelling · ${v.narr}</div>${['Gancho', 'Conflito', 'Virada', 'Chamada'].map((s, i) => `<div class="sr"><b>${s}</b><span>${v.st[i]}</span></div>`).join('')}</div>
      </div>
    </div>`, { cls: cls + ' vpg vpa' })
    d.page('av', `${v.c} · ${v.t} · 2/2`, 'Storyboard cena a cena', `
    <div class="sbw">${v.sb.map((s, i) => `<div class="fr"><div class="fh"><span>${i + 1}</span><b>${s[0]}</b></div><div class="scr"><small>${s[2]}</small><em>${s[4]}</em></div><div class="fx"><small>Aparece</small>${s[1]}</div><div class="fx fl2"><small>Fala</small>${s[3]}</div></div>`).join('')}</div>
    <div class="vb">
      <div class="ideas">${v.ideas.map((x, i) => `<div class="idea"><b>Ideia ${'ABC'[i]}</b><h4>${x[0]}</h4><p>${x[1]}</p></div>`).join('')}</div>
      <div class="adv"><b>Versão anúncio · 3 ganchos para testar</b>${v.ad.map((a) => `<span>${a}</span>`).join('')}</div>
    </div>`, { cls: (k % 2 === 0 ? 'avl' : 'avw') + ' dense sbpg' })
  })
}

const CSS = `<style>
.dense h1{font-size:34px;margin-bottom:14px}
.emx{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:9px}.emx span{background:#B5E61D;border:1.5px solid #0A0A0A;border-radius:999px;padding:3px 10px;font-size:12.5px}.emx span b{font-weight:800}.emx p{flex-basis:100%;font-size:13px;line-height:1.3}
.mppg .mp td{padding-top:4px!important;padding-bottom:4px!important;font-size:13px}.mppg .mp th{padding-top:5px!important;padding-bottom:5px!important}
.emnote{margin-top:8px;font-size:12.6px;line-height:1.35;background:#fff;border:2px solid #0A0A0A;border-radius:10px;padding:8px 12px}
.mk{display:grid;grid-template-columns:1fr 330px;gap:20px;height:100%}
.pg.av ul li:before{background:#B5E61D;border-color:#0A0A0A}.gap ul li:before{border-color:#B5E61D!important}
.mkh{font:800 15px Inter;margin-bottom:8px}.mkh small{font-weight:500;opacity:.7}
.adt{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:2px solid #0A0A0A;border-radius:14px;overflow:hidden;font-size:12px;line-height:1.2}
.adt th{background:#B5E61D;color:#0A0A0A;text-align:left;font:800 10.5px Inter;letter-spacing:.06em;text-transform:uppercase;padding:7px 8px}
.adt td{padding:4px 7px;border-top:1px solid #e3e3e3;vertical-align:middle}
.adt td small{display:block;font-size:10px;opacity:.65;white-space:nowrap}
.adt td.dd{white-space:nowrap;font-weight:700}.adt .bar{display:inline-block;height:9px;background:#B5E61D;border:1.5px solid #0A0A0A;border-radius:3px;margin-right:6px;vertical-align:middle}
.mkr{display:flex;flex-direction:column;gap:12px}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.kp{background:#B5E61D;border:2px solid #0A0A0A;border-radius:12px;padding:8px 9px;box-shadow:4px 4px 0 #0A0A0A}
.kp b{display:block;font:800 24px 'Inter Display',Inter}.kp span{font-size:11px;line-height:1.2;display:block}
.say,.gap{border:2px solid #0A0A0A;border-radius:14px;padding:11px 14px;background:#fff;box-shadow:5px 5px 0 #0A0A0A}
.gap{background:#fff;color:#0A0A0A;border:2px solid #0A0A0A}.gap h4{color:#B5E61D}
.say h4,.gap h4{font:800 16px Inter;margin-bottom:6px}
.say li,.gap li{font-size:13.6px;line-height:1.32;margin:0 0 5px 16px}
.tr{display:grid;grid-template-columns:1.45fr 1fr;gap:22px}
.trc .tb{display:grid;grid-template-columns:250px 1fr;gap:12px;align-items:center;margin-bottom:9px}
.tl{font:700 13.6px/1.2 Inter}.tl small{display:block;font:500 11px Inter;opacity:.65}
.tv{position:relative;height:24px;background:#F3FBDA;border:1.5px solid #0A0A0A;border-radius:6px}
.tv i{position:absolute;left:0;top:0;bottom:0;background:#B5E61D;border-right:1.5px solid #0A0A0A;border-radius:5px 0 0 5px}
.tv b{position:absolute;right:8px;top:3px;font:800 13px Inter}
.trc h3 small,.cm2 h3 small{font:500 12px Inter;opacity:.7}
.src{font-size:11.5px;opacity:.7;margin-top:6px}
.trr{display:flex;flex-direction:column;gap:18px}
.trr li,.cm3 li{font-size:14.2px;line-height:1.35;margin:0 0 7px 17px}
.mo>div{display:grid;grid-template-columns:86px 1fr;gap:8px;margin-bottom:8px;font-size:14px;line-height:1.3}
.mo b{background:#B5E61D;border:1.5px solid #0A0A0A;border-radius:8px;text-align:center;padding:3px 0;font:800 12.5px Inter;align-self:start}
.cm{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:20px}
.cm .card{padding:16px 18px}
.cm1 q{display:block;background:#B5E61D;border:2px solid #0A0A0A;border-radius:10px;padding:9px 11px;font:italic 600 14.5px/1.35 Inter;margin-bottom:10px;quotes:'“' '”'}
.cm1 p{font-size:14.5px;line-height:1.4}
.wb{display:grid;grid-template-columns:140px 1fr 34px;gap:8px;align-items:center;margin-bottom:6px;font-size:13px}
.wb i{display:block;height:15px;background:#B5E61D;border:1.5px solid #0A0A0A;border-radius:4px}.wb b{font-size:13px}
.qs q{display:block;font:italic 500 13.2px/1.35 Inter;border-left:4px solid #B5E61D;padding-left:9px;margin-top:8px;quotes:'“' '”'}
.avd{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:12.5px}.avd span{border:1.5px solid #0A0A0A;border-radius:999px;padding:2px 9px;background:#fff}
.nr{display:flex;flex-direction:column;gap:14px}
.chain{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.ch{background:#fff;border:2px solid #0A0A0A;border-radius:12px;padding:9px 10px;box-shadow:4px 4px 0 #0A0A0A;font-size:12.8px;line-height:1.3;position:relative}
.ch b{display:block;font:800 11.5px Inter;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px}
.ch2{background:#fff;color:#0A0A0A;border:2px solid #0A0A0A}.ch2 b{color:#B5E61D}
.acts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.act{background:#fff;color:#0A0A0A;border:2px solid #0A0A0A;border-radius:12px;padding:9px 13px}.act small{color:#B5E61D;font:800 11.5px Inter;text-transform:uppercase;letter-spacing:.06em;display:block}.act b{display:block;font:800 16px Inter;margin:2px 0}.act span{font-size:12.8px;opacity:.85}
.fun{display:flex;flex-direction:column;align-items:center;gap:6px}
.fu{display:grid;grid-template-columns:150px 80px 130px 1fr;align-items:center;gap:10px;background:#fff;border:2px solid #0A0A0A;border-radius:10px;padding:6px 14px;font-size:13.6px}
.fu b{font:800 15px Inter}.fn{font-weight:800}.fv{font-weight:700}
.fu0{background:#fff}.fu1{background:#F3FBDA}.fu2{background:#e2f5a6}.fu3{background:#B5E61D;color:#0A0A0A}
.nnote{font-size:13.6px;line-height:1.35}
.mp{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:2px solid #0A0A0A;border-radius:14px;overflow:hidden;font-size:13px;line-height:1.25}
.mp th{background:#B5E61D;color:#0A0A0A;text-align:left;font:800 11px Inter;letter-spacing:.06em;text-transform:uppercase;padding:7px 9px}
.mp td{padding:6.5px 9px;border-top:1px solid #e3e3e3;vertical-align:middle}.mp td b{font-size:13.6px}
.rl{display:inline-block;font:800 11px Inter;letter-spacing:.05em;text-transform:uppercase;border:1.5px solid #0A0A0A;border-radius:999px;padding:3px 9px;white-space:nowrap}
.r0{background:#fff}.r1{background:#B5E61D}.r2{background:#F7D774}.r3{background:#B5E61D;color:#0A0A0A}
.sc{display:grid;grid-template-columns:1fr 1fr 1.05fr;gap:20px}.sc .card{padding:16px 18px}
.sc .slot{display:grid;grid-template-columns:64px 1fr;gap:8px;margin-bottom:9px;font-size:14px;line-height:1.3}.sc .slot b{background:#B5E61D;border:1.5px solid #0A0A0A;border-radius:8px;text-align:center;font:800 13px Inter;padding:3px 0;align-self:start}
.sc .dsub{font-size:13.2px;line-height:1.35;margin-bottom:10px}
.ppl>div{display:grid;grid-template-columns:76px 1fr;gap:6px;font-size:13.4px;margin-bottom:5px}.ppl b{font-weight:800}
.sc .dnote{font-size:12.8px;line-height:1.35;margin-top:8px;border-top:2px dashed #0A0A0A;padding-top:8px}
.vpa .phone{flex:0 0 320px;height:569px}
.vpa .vp{gap:34px}
.vpa .vmain h1.vh{font:800 31px/1.08 "Inter Display",Inter;letter-spacing:-.02em;margin-bottom:8px;max-width:none}
.vpa .vtop{margin-bottom:9px}
.why{border:2px solid #0A0A0A;border-radius:12px;background:#fff;padding:10px 13px;margin-bottom:11px;font-size:14.6px;line-height:1.36}
.avl .why{background:#fff}.avw .why{background:#F3FBDA}
.why>b{font:800 11px Inter;text-transform:uppercase;letter-spacing:.06em;margin-right:6px}.why .src{font-size:13px;font-weight:700;opacity:1;color:#0A0A0A}
.why p{margin-top:3px}.why .tk b{font-weight:800}
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:11px}
.facts>div{border:2px solid #0A0A0A;border-radius:10px;padding:7px 10px;background:#fff;font-size:13.8px;line-height:1.3}
.facts b{display:block;font:800 10.5px Inter;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
.story{border:2px solid #0A0A0A;border-radius:12px;background:#fff;color:#0A0A0A;border:2px solid #0A0A0A;padding:10px 14px}
.sh{font:800 11px Inter;text-transform:uppercase;letter-spacing:.06em;color:#0A0A0A;background:#B5E61D;display:inline-block;padding:2px 8px;border-radius:6px;margin-bottom:5px}
.sr{display:grid;grid-template-columns:84px 1fr;gap:8px;font-size:14.4px;line-height:1.32;margin-bottom:4px}.sr b{color:#0A0A0A}
.sbw{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:14px}
.fr{background:#fff;border:2px solid #0A0A0A;border-radius:12px;box-shadow:5px 5px 0 #0A0A0A;overflow:hidden;display:flex;flex-direction:column}
.fh{display:flex;align-items:center;gap:8px;background:#B5E61D;color:#0A0A0A;padding:6px 10px}.fh span{font:800 18px Inter}.fh b{font:800 13px Inter;color:#0A0A0A}
.fx{padding:7px 11px;font-size:14px;line-height:1.32;border-top:1px solid #e6e6e6;text-align:left}.fx small{display:block;font:800 9.5px Inter;letter-spacing:.07em;text-transform:uppercase;opacity:.6;margin-bottom:1px}
.fl2{font-style:italic;flex:1}
.scr{position:relative;height:150px;margin:8px 10px 6px;border-radius:10px;background:repeating-linear-gradient(135deg,#f4f8e4 0 10px,#eaf1d2 10px 20px);border:2px solid #0A0A0A;display:flex;align-items:flex-end;justify-content:center;padding:8px}
.scr small{position:absolute;left:7px;top:7px;background:#B5E61D;color:#0A0A0A;font:800 10px Inter;text-transform:uppercase;letter-spacing:.04em;border-radius:5px;padding:2px 6px;max-width:88%}
.scr em{font:800 13.5px/1.25 Inter;font-style:normal;color:#0A0A0A;text-align:center;background:#fff;border:1.5px solid #0A0A0A;border-radius:6px;padding:4px 7px}
.vb .ideas{margin-bottom:10px}.vb .idea{padding:9px 13px}.vb .idea h4{font-size:15.5px}.vb .idea p{font-size:14px}
.adv{display:flex;flex-wrap:wrap;gap:7px;align-items:center;font-size:12.8px}.adv b{font:800 12px Inter;text-transform:uppercase;letter-spacing:.05em;margin-right:4px}
.adv span{background:#fff;border:1.5px solid #0A0A0A;border-radius:999px;padding:4px 11px}
.sbpg h1{font-size:30px;margin-bottom:12px}
.sbw .fr{align-items:stretch;text-align:left;justify-content:flex-start;gap:0}.sbw .fh{align-self:stretch;justify-content:flex-start}.sbw .scr{align-self:stretch}
</style>`

const a = Doc(BR, 'Audiovisual')
avCover(a, BR, {})
a.pages[0] = a.pages[0].replace('Conteúdo de gravação', 'Planejamento de audiovisual').replace('Novembro<br>e Dezembro', 'O case é<br>o anúncio').replace('12/11 a 31/12/2026</div>', '12/11 a 31/12/2026 · 10 vídeos · 2 diárias</div>')
marketPage(a)
trendPage(a)
comPage(a)
narrPage(a)
scopePage(a)
mapPage(a)
photoPage(a)
videoPages(a)
fs.writeFileSync(path.join(OUT, 'audiovisual.html'), html(`Planejamento de audiovisual ${BR}`, a.pages).replace('</head>', CSS + '</head>'))
console.log('páginas', a.pages.length)
