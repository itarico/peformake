// Peformake · Estratégia v2 (13/11/2026), refeita pela skill peformake-estudo-mes (etapas 1 e 2 completas).
const fs = require('fs')
const path = require('path')
const { K, OUT, img, AD, ADS, CSS, fixCover, ul } = require('./pfk.js')
const { Doc, card, cover, tesePage, html } = K
const BR = 'Peformake'

// ---------------- 1. A tese em uma página ----------------
const b = {
  role: 'assessoria de marketing, Recife',
  card: `<p class="lead">Assessoria de marketing de São Lourenço da Mata para o Grande Recife, com a <b>Ellcazo</b> no audiovisual. 32 clientes ativos; 29 têm audiovisual, 15 têm tráfego.</p>
      <div class="kv"><span>Público</span>Donos de negócio do Grande Recife (R$ 30 a 150 mil por mês) que já tentaram marketing e não viram virar venda. Prioridade: clínicas, restaurantes e lojas</div>
      <div class="goal"><span class="gl">Objetivo até 31/12</span><b>80 conversas de donos de negócio → 25 Raio-X → 6 contratos</b> para começar em janeiro, + 3 diárias Ellcazo e 3 upgrades na base. Tudo contado no Comercial.</div>`,
  teseTitle: 'O case é o anúncio: a equipe trabalhando dentro do cliente',
  tese: '11 de 13 clientes com origem registrada chegaram por indicação: quem conhece fica, mas <b>quase ninguém conhece</b>. Até 31/12 a Peformake faz o anúncio que ninguém em Recife faz: <b>a equipe gravando dentro do cliente, com o número dele na tela</b>. O vilão é o marketing <b>no automático</b>, nunca o anúncio.',
  moves: [
    ['Se só uma coisa for feita: o anúncio do Raio-X', 'Case da Ótica MD (192 conversas) + botão do WhatsApp + resposta em 1 hora. Sobe em 19/11. É o que mais traz contrato por real.'],
    ['Uma porta só, com nome, prazo e vagas', 'Toda peça leva ao Raio-X (30 min com o Italo). Na Black Friday, 20 vagas e zero desconto.'],
    ['Dezembro vende janeiro', '“Comece 2027”: fechou até 19/12, começa janeiro com o plano pronto e a diária marcada.'],
  ],
}

// ---------------- 2. Diagnóstico ----------------
function diagBase(d) {
  const sv = [['Audiovisual', 29], ['Design', 15], ['Tráfego', 15], ['Social media', 11], ['Consultoria', 9]]
  const ni = [['Gastronomia', 7], ['Construção', 4], ['Ótica', 2], ['Automotivo', 2], ['Tecnologia', 2], ['Saúde e estética', 2], ['Outros (moda, indústria, educação)', 4], ['Sem nicho no cadastro', 9]]
  d.page('pf', 'Diagnóstico 1 de 5 · A base (sistema, 13/11)', 'Uma base boa, presa no audiovisual e no boca a boca', `
  <div class="xg2" style="grid-template-columns:1fr 1fr 1.05fr">
    <div class="xbox"><h3>Clientes por serviço</h3>${sv.map((s) => `<div class="xbar"><span>${s[0]}</span><i style="width:${s[1] * 4.6}px"></i><b>${s[1]}</b></div>`).join('')}
      <p class="cap" style="margin-top:8px">32 ativos. <b>13 só com audiovisual</b>: a venda mais barata é o upgrade.</p></div>
    <div class="xbox"><h3>Clientes por nicho</h3>${ni.map((s) => `<div class="xbar"><span>${s[0]}</span><i style="width:${s[1] * 13}px"></i><b>${s[1]}</b></div>`).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="xbox xdk"><h3>Ticket da base (faixa)</h3><p><b style="font:800 26px 'Inter Display';color:var(--cy)">R$ 600 a 1.600</b> por mês na metade do meio (mediana ≈ R$ 1.150; com 3 ou mais áreas ≈ R$ 1.500). Sem valor de cliente individual.</p></div>
      <div class="xbox"><h3>Maturidade do marketing da própria Peformake: 5/10</h3>${ul(['Tem: site com diagnóstico, sistema próprio, relatório, cases com número', 'Falta: anúncio próprio, Instagram com ritmo, lead medido no Comercial'])}</div>
    </div>
  </div>
  <div class="xg3" style="margin-top:14px;grid-template-columns:repeat(4,1fr)">
    ${[['Forças', 'Ellcazo e 7 pessoas na mesma casa; 653 conversas por anúncio nos clientes em out–nov'], ['Fraquezas', '11 de 13 por indicação, 0 por anúncio; 19 clientes sem origem no cadastro'], ['Oportunidades', 'Janeiro: o dono quer “começar certo”; ninguém em Recife mostra a equipe no cliente'], ['Ameaças', 'Nacionais com “anúncio grátis” e “dobrar”; 6 perdas por preço ou resultado']].map((s, i) => `<div class="xbox ${i === 2 ? 'xdk' : ''}"><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join('')}
  </div>`, { cls: 'dense' })
}

function diagCom(d) {
  const lost = [['Fim de contrato', 5], ['Preço', 3], ['Resultado', 3], ['Trocou de agência', 1], ['Outro', 1]]
  d.page('pf', 'Diagnóstico 2 de 5 · Comercial e perdas (CRM)', 'O comercial vive de indicação, e nada é medido', `
  <div class="xk">${[['11 de 13', 'clientes com origem registrada vieram por indicação (2 orgânico)'], ['0', 'leads do site registrados; 1 negócio aberto no Comercial'], ['4', 'vendas avulsas confirmadas no sistema (2 recusadas)'], ['13', 'clientes perdidos no histórico']].map((k) => `<div><b>${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
  <div class="xg2" style="grid-template-columns:1fr 1.15fr">
    <div class="xbox"><h3>Por que os 13 saíram</h3>${lost.map((s) => `<div class="xbar"><span>${s[0]}</span><i style="width:${s[1] * 44}px;${s[0] === 'Preço' || s[0] === 'Resultado' ? 'background:#f2b8ad' : ''}"></i><b>${s[1]}</b></div>`).join('')}
      <p class="cap" style="margin-top:8px"><b>6 saíram por preço ou resultado</b>: os dois se resolvem com prova visível (relatório de segunda) e com quem fala do número antes do preço. Só 1 trocou de agência: quem fica, gosta.</p></div>
    <div class="xbox"><h3>O que o dono escreve no WhatsApp (mensagens reais)</h3>
      <span class="xq">Vou postar um vídeo hoje, consegue colocar esse vídeo pra anunciar?</span>
      <span class="xq">Vê se tu consegue colocar ele pra rodar, porque se não conseguir eu impulsiono</span>
      <span class="xq">Italo, tráfego da ótica não tá funcionando.</span>
      <span class="xq">Pq vaga em janeiro é difícil</span>
      <span class="xq">Quem me deu teu número foi [cliente]… como é o procedimento?</span>
      <p class="cap" style="margin-top:6px">986 mensagens curtas recebidas. O dono pensa em <b>prazo</b> (32 menções), <b>valor</b> (9) e <b>gravar/aparecer</b> (5); quase nunca em “seguidor”. A indicação chega pronta para comprar.</p></div>
  </div>
  <div class="xg3" style="margin-top:14px">${[['Então: todo lead no Comercial', 'Com a origem (anúncio, conteúdo, indicação) no mesmo dia. Sem isso não sabemos o que vende.'], ['Então: prova toda segunda', 'O relatório de segunda vira a resposta para “preço” e “resultado”, antes do cliente perguntar.'], ['Então: indicação de propósito', 'Pedir 1 indicação por cliente, com o vídeo do case pronto para encaminhar.']].map((x, i) => `<div class="xbox ${i === 0 ? 'xdk' : ''}"><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('')}</div>`, { cls: 'dense' })
}

function diagTraf(d) {
  const rows = [
    ['Ótica (2 clientes)', 'Ótica MD: “Só a lente” por cidade (Carpina, Limoeiro)', '241 conversas', 'R$ 3,76 a 6,53', 'hi'],
    ['Estética e pilates', 'Clínica: aula de pilates × “resultado”', '165 conversas', 'R$ 3,41 (pilates) · 9,46 (resultado)', 'hi'],
    ['Automotivo', 'F5: carro com preço no vídeo (Fox R$ 36.990, Creta)', '216 conversas', 'R$ 4,08 (vídeo) a 15,95 (card)', ''],
    ['Construção', 'MF Máquinas: visita ao perfil · Fuctura: conversa', '711 visitas · 15 conversas', 'R$ 0,49 visita · 7,38 conversa', ''],
    ['Gastronomia', 'Fornario: prato novo (foie gras) · VOVINA: vídeo do Combo', '479 visitas · 893 cliques', 'R$ 0,19 · R$ 0,13', 'hi'],
    ['Genérico', 'Ótica: “Converse conosco WhatsApp, detalhado”', '1 conversa', 'R$ 58,88', 'lo'],
  ]
  d.page('pf', 'Diagnóstico 3 de 5 · O tráfego dos clientes (out–nov)', 'O que vende nos clientes: oferta com nome, preço e cidade', `
  <table class="xtab"><thead><tr><th>Nicho</th><th>Anúncio (oferta e ângulo)</th><th>Resultado</th><th>Custo por resultado</th></tr></thead><tbody>
  ${rows.map((r) => `<tr class="${r[4]}"><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td><b>${r[3]}</b></td></tr>`).join('')}</tbody></table>
  <div class="xg3" style="margin-top:14px">
    <div class="xbox xdk"><h3>A lição (vale para a Peformake)</h3><p>O anúncio que diz <b>o quê, quanto e onde</b> custa <b>10 a 15 vezes menos</b> que o genérico (“Só a lente” em Carpina R$ 3,76 × “Converse conosco” R$ 58,88).</p></div>
    <div class="xbox"><h3>Então o Raio-X tem nome</h3><p>“Raio-X do marketing: 30 min com o Italo, 20 vagas, Recife.” Nunca “fale com um especialista”.</p></div>
    <div class="xbox"><h3>E o vídeo vence o card</h3><p>F5: vídeo do carro R$ 4,08 × card R$ 8,78. Pilates (aula) R$ 3,41 × resultado R$ 9,46. <b>Mostrar o serviço acontecendo</b> vende.</p></div>
  </div>
  <p class="cap" style="margin-top:8px">Fonte: traffic_daily_metrics e traffic_entity_daily do sistema (Meta), 01/10 a 12/11. Detalhe por anúncio no documento de tráfego (“Banco de ofertas”).</p>`, { cls: 'dense big' })
}

function diagMercado(d) {
  const L = ['alldaya', 'bindes2', 'brunoluis', 'talisma', 'growthodonto', 'alavant']
  d.page('pf', 'Diagnóstico 4 de 5 · Mercado e anúncios (Biblioteca da Meta)', 'Todos prometem “vender mais”; ninguém mostra a equipe', `
  <div class="xg2" style="grid-template-columns:1.25fr 1fr">
    <table class="xtab"><thead><tr><th></th><th>Anúncio de marketing no ar há mais tempo</th><th>No ar</th></tr></thead><tbody>
    ${L.map((k) => { const a = ADS[k]; return `<tr><td style="width:46px"><a href="${AD(a.id)}" target="_blank"><img src="${img(a.im)}" style="width:36px;height:46px;object-fit:cover;border-radius:6px;border:1.5px solid var(--dk)"></a></td><td><b>${a.page}</b><small>${a.what}</small></td><td><b>${a.d} dias</b></td></tr>` }).join('')}
    </tbody></table>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="xk" style="grid-template-columns:1fr 1fr;margin:0">${[['4.805', 'anúncios com “assessoria de marketing”'], ['2.058', 'com “diagnóstico gratuito” (13/11)'], ['203', 'com “marketing Recife”'], ['0 de 10', 'mostram a equipe trabalhando no cliente']].map((k) => `<div><b>${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
      <div class="xbox"><h3>O que todos dizem</h3>${ul(['“Vender mais”, “dobrar em 2027”, “a maior assessoria”', 'Black Friday com <b>15 dias de anúncio grátis</b> e 50% OFF', '“Diagnóstico gratuito” sem nome, sem prazo, sem quem faz'])}</div>
      <div class="xbox xdk"><h3>O espaço vazio (só a Peformake pode)</h3>${ul(['A <b>equipe gravando dentro do negócio</b>, com o número do cliente na tela', 'Assessoria + produtora na mesma casa: <b>o vídeo já gravado vira anúncio</b>', 'O dono da assessoria que <b>travava para falar</b> e hoje ensina dono a aparecer'])}</div>
    </div>
  </div>`, { cls: 'dense' })
}

function diagTend(d) {
  const tr = [['Teste social com comerciantes + “update”', 7.44], ['A conta na tela (o número decide)', 5.81], ['Análise de perfil ao vivo (“comenta EU QUERO”)', 5.58], ['Bastidor da captação no cliente', 2.92], ['Videomaker: “3 erros que te fazem perder venda”', 1.89], ['Palavras que sabotam a venda (sem desconto)', 1.41]]
  d.page('pf', 'Diagnóstico 5 de 5 · Tendência, datas e público', 'O que viraliza é prova feita na rua; o dono decide por prazo', `
  <div class="xk">${[['7,44 mi', 'views do formato “teste social com comerciantes”'], ['727', 'views do melhor “bastidor de agência” sem cliente'], ['32', 'mensagens de donos falando de prazo (“quando?”)'], ['19/12', 'último dia para quem quer janeiro rodando']].map((k) => `<div><b>${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
  <div class="xg2" style="grid-template-columns:1.1fr 1fr">
    <div class="xbox"><h3>Formatos com mais views de quem vende serviço (milhões, TikTok/Instagram)</h3>
      ${tr.map((t) => `<div class="xbar"><span style="width:260px">${t[0]}</span><i style="width:${Math.round(t[1] * 30)}px"></i><b>${String(t[1]).replace('.', ',')} mi</b></div>`).join('')}
      <p class="cap" style="margin-top:6px"><b>Já cansou:</b> “bastidores da agência” sem cliente (melhor: 727 views), dica de tráfego de gestor, dancinha da equipe.</p></div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="xbox xdk"><h3>Datas que vendem no período</h3>${ul(['<b>20/11</b> feriado (Consciência Negra): story de horário', '<b>27–30/11</b> Black Friday + 1ª parcela do 13º', '<b>08/12</b> feriado no Recife', '<b>15–19/12</b> 2ª parcela do 13º; último dia do “Comece 2027”', '<b>28–31/12</b> “janeiro começa segunda”: agenda de Raio-X'])}</div>
      <div class="xbox"><h3>Persona: Carlos, 42, dono de clínica ou restaurante</h3><p>Trabalha 12 h, já pagou “agência” ou sobrinho, impulsiona quando aperta. Quer <b>o WhatsApp tocando</b> e alguém que olhe o número. Decide rápido quando confia em quem indicou; adia para “depois do fim de ano” quando não.</p></div>
    </div>
  </div>`, { cls: 'dense big' })
}

// ---------------- 3. Narrativa ----------------
function narrPage(d) {
  d.page('pf', `${BR} · A narrativa do período`, 'Uma história em três atos, contada pelos clientes de verdade', `
  <div class="xch">${[['Herói', 'O dono do Grande Recife que trabalha 12 horas e não vê o marketing virar venda.'], ['Problema', 'Posta, impulsiona, contrata, e o WhatsApp não toca. Ninguém olha o número.'], ['Vilão', 'O marketing <b>no automático</b>: o sobrinho, o “impulsionar” sem olhar, quem entrega a parte e some.', 'v'], ['Virada', 'Uma equipe que <b>entra no negócio</b>, grava de dentro e olha o número toda segunda.'], ['Prova', 'Ótica MD 192 conversas · VOVINA 893 cliques · Fornario 8 → 32 posts.']].map((c) => `<div class="${c[2] || ''}"><b class="lb">${c[0]}</b>${c[1]}</div>`).join('')}</div>
  <div class="xg3">
    ${[['Ato 1 · 16 a 26/11', 'O problema e a porta', 'Equipe no escritório (diária 17/11), case da Ótica MD, “Raio-X em 30 s”, a história da dicção do Italo.<br><b>Vídeos:</b> P2, P3, P4 · <b>Oferta:</b> Raio-X', 'Meta: 30 conversas'], ['Ato 2 · 27/11 a 06/12', 'Black Friday sem desconto', '20 vagas de Raio-X, a objeção “já paguei agência”, o “update” da VOVINA.<br><b>Vídeos:</b> P5, P7, P8 · <b>Oferta:</b> Raio-X BF', 'Meta: 30 conversas · 12 Raio-X'], ['Ato 3 · 07 a 19/12', 'Dezembro vende janeiro', 'Equipe dentro do Fornario (diária 01/12), 3 erros do vídeo de restaurante, “Comece 2027”.<br><b>Vídeos:</b> P1, P6, P9, P10 · <b>Ofertas:</b> Diária e Comece 2027', 'Meta: 6 contratos · 3 diárias']].map((a, i) => `<div class="xbox ${i === 1 ? 'xdk' : ''}"><span class="xl" ${i === 1 ? 'style="color:var(--cy)"' : ''}>${a[0]}</span><h3>${a[1]}</h3><p>${a[2]}</p><p style="margin-top:6px"><b>${a[3]}</b></p></div>`).join('')}
  </div>
  <div class="xnote"><b>A frase da marca no período:</b> “A gente grava de dentro.” Serve para qualquer peça e <b>nenhum concorrente pode dizer</b> sem ter a Ellcazo na mesma casa.</div>`, { cls: 'dense big' })
}

// ---------------- 4. Ofertas (ficha completa) ----------------
const OF = [
  { main: true, n: 'Comece 2027 com o plano pronto', tag: 'principal · gera a receita',
    r: [['O quê', 'Assessoria completa (estratégia, social, design, tráfego) + Ellcazo. Plano de janeiro entregue até 23/12, diária de gravação na 1ª semana de janeiro, 1º relatório na 1ª segunda.'], ['Para quem', 'Quem fez o Raio-X: negócios de R$ 30 a 150 mil por mês no Grande Recife.'], ['Condição', '6 meses, fechado até <b>19/12</b>. Em vez de desconto, <b>a diária de janeiro vai inclusa</b> [a decidir]. Faixa da base: R$ 600 a 1.600/mês por área; preço do pacote: [a decidir].'], ['Por que agora', 'Quem assina em 05/01 tem plano em 20/01 e vídeo em fevereiro: perde janeiro. Diárias da 1ª semana: <b>[4] vagas</b>.'], ['Prova', 'Fornario: 8 → 32 posts. VOVINA: 893 cliques a R$ 0,13. Relatório de segunda (exemplo sem valores).'], ['Próximo passo', 'Proposta em até 48 h depois do Raio-X; assinatura no sistema (Assinafy).']],
    win: '<b>Melhor que o concorrente:</b> eles prometem “dobrar em 2027”; aqui o dono recebe o plano antes da virada e a gravação já marcada.' },
  { n: 'Raio-X do marketing', tag: 'entrada · porta única',
    r: [['O quê', '30 min com o Italo (online ou em Recife): abre perfil, anúncio e WhatsApp do negócio e escreve <b>os 3 vazamentos e 1 conserto para 7 dias</b>.'], ['Para quem', 'Todo lead: anúncio, conteúdo ou indicação. Qualificação: nicho, cidade, faturamento.'], ['Condição', 'Grátis. Black Friday 27 a 30/11: <b>20 vagas (5 por dia), zero desconto</b>. Sugestão: “se não sair com 1 conserto, o café é por minha conta” [a decidir].'], ['Por que agora', 'Vagas contadas nos stories; antes do 13º e do fim de ano.'], ['Prova', 'Ótica MD: 192 conversas a R$ 6,53 depois de consertar o anúncio.'], ['Próximo passo', 'Botão do WhatsApp com “Quero o Raio-X”; Thyfany responde em 1 h e marca.']],
    win: '<b>Melhor que o concorrente:</b> 2.058 anúncios oferecem “diagnóstico gratuito” sem rosto; aqui é o dono da assessoria, com vagas e 1 conserto por escrito.' },
  { n: 'Diária Ellcazo de fim de ano', tag: 'venda rápida · dezembro',
    r: [['O quê', '6 a 10 vídeos num dia para Natal, Réveillon e janeiro, + 1 corte de 15 s pronto para anúncio.'], ['Para quem', 'Restaurantes e lojas do Grande Recife, clientes ou não.'], ['Condição', 'Diária câmera ou mobile do catálogo da Ellcazo [valor do catálogo]. Agenda até <b>18/12</b>.'], ['Por que agora', 'Dezembro é o pico de movimento; vídeo gravado em janeiro chega tarde. Diárias livres: [6].'], ['Prova', 'Brio: 2.431 views no close do produto (3,6 vezes a média). VOVINA: vídeo do Combo virou 85% dos cliques.'], ['Próximo passo', 'WhatsApp “Quero uma diária”; orçamento e datas livres em até 2 h.']],
    win: '<b>Melhor que o concorrente:</b> produtora sozinha entrega o arquivo; aqui o vídeo já sai com a versão de anúncio.' },
  { n: 'Da gravação ao cliente', tag: 'upgrade · base',
    r: [['O quê', 'O vídeo que a Ellcazo já gravou vira anúncio com botão do WhatsApp, com relatório toda segunda.'], ['Para quem', 'Os 13 clientes só com audiovisual.'], ['Condição', 'Começa em janeiro; 30 dias de teste com verba do cliente [condição a decidir].'], ['Por que agora', 'Os vídeos de fim de ano estão sendo gravados agora e ficam parados no celular.'], ['Prova', 'VOVINA: 1 vídeo, 893 cliques no delivery próprio a R$ 0,13.'], ['Próximo passo', 'O Italo manda a cada um (humano) o vídeo deles + a simulação de quanto rende. Até 11/12.']],
    win: '<b>Melhor que o concorrente:</b> ninguém mais tem o vídeo do cliente pronto; o custo de produção já foi pago.' },
]
function offerFicha(d, i0) {
  const L = OF.slice(i0, i0 + 2)
  d.page('pf', `${BR} · Ofertas · ficha ${i0 / 2 + 1} de 2`, i0 === 0 ? 'A oferta principal e a porta de entrada' : 'Duas vendas rápidas que pagam o mês', `
  <div class="xof">${L.map((o) => `<div class="xofc ${o.main ? 'main' : ''}">
    <span class="badge">${o.tag}</span><h3 style="margin-top:6px">${o.n}</h3>
    ${o.r.map((r) => `<div class="r"><span class="xl">${r[0]}</span><span>${r[1]}</span></div>`).join('')}
    <div class="win">${o.win}</div></div>`).join('')}</div>`, { cls: 'dense big' })
}
function offerResumo(d) {
  d.page('pf', `${BR} · A escada de ofertas`, 'Nenhuma oferta nova: quatro embalagens do que já entregamos', `
  <div class="xfl" style="margin-bottom:16px">${[['Entrada', 'Raio-X do marketing', 'grátis · 20 vagas na BF', '80 conversas → 25 Raio-X'], ['Principal', 'Comece 2027', '6 meses · até 19/12', '6 contratos'], ['Venda rápida', 'Diária Ellcazo', 'até 18/12', '3 diárias'], ['Recorrência', 'Da gravação ao cliente', 'base · janeiro', '3 upgrades'], ['Indicação', 'Indicação com vídeo pronto', 'até 18/12', '12 pedidas · 3 leads']].map((s, i) => `<div style="${i === 1 ? 'background:var(--dk);color:#fff' : ''}"><span class="xl" ${i === 1 ? 'style="color:var(--cy)"' : ''}>${s[0]}</span><h4>${s[1]}</h4>${s[2]}<span class="m">${s[3]}</span></div>`).join('')}</div>
  <div class="xg3">
    <div class="xbox"><h3>Por que não criar oferta nova</h3><p>O produto e os cases já são bons; o gargalo é <b>ninguém saber que a Peformake existe</b>. Toda energia do mês vai para ser vista e medir.</p></div>
    <div class="xbox xdk"><h3>Sem briga de preço</h3><p>Nada de anúncio grátis, 50% OFF ou “dobrar”. O argumento é <b>gente de verdade e o número toda segunda</b>. O bônus é trabalho (diária, conserto), nunca desconto.</p></div>
    <div class="xbox"><h3>A ideia nova: indicação com vídeo pronto</h3><p>11 de 13 vieram por indicação. Em vez de “me indica?”, o Italo entrega ao cliente <b>o vídeo de 30 s do case dele</b> para encaminhar a um amigo dono de negócio.</p></div>
  </div>
  <div class="xnote"><b>Cada oferta vira uma campanha:</b> Raio-X → campanha 1 (captação, 60% da verba) · Comece 2027 → campanha 2 (remarketing de quem conversou, 25%) · Diária Ellcazo → campanha 3 (restaurantes e lojas, 15%) · Upgrade e indicação → sem anúncio, mensagem de um humano.</div>`, { cls: 'dense big' })
}

// ---------------- 5. Metas e caminho de venda ----------------
function caminhoPage(d) {
  d.page('pf', `${BR} · Metas e caminho de venda`, 'Do vídeo ao contrato, etapa por etapa, com dono e meta', `
  <div class="xfl">${[['1 · Anúncio e conteúdo', 'Pedem o Raio-X; botão do WhatsApp com mensagem pronta.', '80 conversas', '50 anúncio · 20 conteúdo · 10 indicação'], ['2 · Primeira resposta', 'Thyfany, das 8h às 19h, com a origem marcada no Comercial.', 'até 1 hora', '100% registradas'], ['3 · Qualificação', 'Nicho, cidade, faturamento, o que já tentou.', '50 qualificados', '≈ 60% das conversas'], ['4 · Raio-X', '30 min com o Italo; 3 horários fixos por semana (+ BF).', '25 Raio-X', '1 em 2 qualificados'], ['5 · Proposta', 'Preço claro e a oferta “Comece 2027”.', 'em até 48 h', '15 propostas'], ['6 · Contrato', 'Assinafy no sistema; diária marcada.', '6 contratos', '≈ 1 em 4 Raio-X']].map((s, i) => `<div style="${i === 5 ? 'background:var(--dk);color:#fff' : ''}"><h4>${s[0]}</h4>${s[1]}<span class="m">${s[2]}</span><span class="w" ${i === 5 ? 'style="color:#bfe9ef"' : ''}>${s[3]}</span></div>`).join('')}</div>
  <div class="xg2" style="margin-top:16px;grid-template-columns:1.2fr 1fr">
    <table class="xtab"><thead><tr><th>Meta até 31/12</th><th>De onde vem</th><th>Onde se mede</th></tr></thead><tbody>
      ${[['80 conversas', 'tráfego 50 · vídeos 20 · indicação 10', 'Comercial (origem)'], ['25 Raio-X', 'BF 8 · resto do período 17', 'agenda do Italo'], ['6 contratos novos', 'Comece 2027 (começam em janeiro)', 'Comercial + Assinafy'], ['3 diárias Ellcazo', 'campanha de restaurantes e lojas', 'vendas avulsas'], ['3 upgrades', '13 clientes só com audiovisual', 'serviços do cliente'], ['12 indicações pedidas', '1 por cliente com pacote ou tráfego', 'origem “Indicação”']].map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
    </tbody></table>
    <div class="xbox"><h3>Janeiro já pensado</h3>${ul(['<b>05/01</b> balanço: custo por Raio-X e por contrato; o anúncio vencedor ganha a verba', 'Os 6 contratos começam com plano e diária na 1ª semana', 'Meta de janeiro: <b>[6 a 8 contratos]</b>, decidida em 05/01 com o custo real', 'Série de casos continua (Sn e clínica) e a campanha de clínicas sobe se o teste de dezembro vencer'])}</div>
  </div>`, { cls: 'dense' })
}

// ---------------- 6. Calendário mestre ----------------
function calPage(d) {
  const cal = [
    ['13 a 16/11', 'Preparação', 'Decisões; conta de anúncio; mensagens prontas; Comercial com origem; autorizações dos cases', ''],
    ['17/11 (ter)', 'Diária 1 · escritório', 'Grava P2, P3, P4 (Ótica MD à tarde), P7, P8, P10', ''],
    ['19/11 (qui)', 'Sobe a captação', 'Case #1 Ótica MD (post + P4) e anúncio do Raio-X', 'hot'],
    ['20/11 (sex)', 'Consciência Negra', 'Story de horário; anúncio segue', ''],
    ['23 a 26/11', 'Raio-X em 30 s · dicção', 'Série semanal estreia (23/11); P3 no @italosantosdigital (25/11)', ''],
    ['27 a 30/11', 'Black Friday + 1ª parcela do 13º', '<b>20 vagas de Raio-X, zero desconto</b>; P8 e P7; verba dobrada', 'hot'],
    ['01/12 (ter)', 'Diária 2 · no cliente', 'Fornario [autorização]: P1, P6, P9; captura dupla', ''],
    ['03 a 06/12', 'Prova', 'P5 VOVINA “update”; sobe a Diária Ellcazo (04/12); mensagens do upgrade', ''],
    ['08/12 (ter)', 'Feriado no Recife', 'Story de horário', ''],
    ['10 a 14/12', 'Equipe no cliente', 'P6 Fornario 8 → 32; P9 3 erros; pedido de indicação com vídeo', ''],
    ['15 a 19/12', '“Comece 2027” · 2ª parcela do 13º', 'P10 “Dezembro vende janeiro”; <b>último dia 19/12</b>', 'hot'],
    ['24 a 27/12', 'Natal', 'Anúncio pausado; post de obrigado com a equipe e os clientes', ''],
    ['28 a 31/12', '“Janeiro começa segunda”', 'Captação leve para encher a agenda de Raio-X de janeiro', ''],
    ['05/01', 'Balanço e plano de janeiro', 'O vencedor ganha a verba; os 6 contratos começam', ''],
  ]
  d.page('pf', `${BR} · Calendário mestre`, 'Datas comerciais, diárias e subidas de campanha, de 13/11 a 05/01', `
  <table class="cal cal1"><thead><tr><th>Quando</th><th>O que acontece</th><th>Conteúdo, campanha e venda</th></tr></thead>
  <tbody>${cal.map((r) => `<tr class="${r[3]}"><td class="d">${r[0]}</td><td class="e">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>`, { cls: 'calpg' })
}

// ---------------- 7. Equipe, cases, venda ----------------
function equipePage(d) {
  const rows = [
    ['Italo', 'Estratégia, tráfego. <b>O rosto da marca.</b>', 'Faz os Raio-X (3 horários/semana + BF); fala em 7 vídeos; sobe e olha os anúncios todo dia.'],
    ['Thyfany Rayane', 'Líder de equipe e social media', 'Responde os leads em até 1 h e registra no Comercial; dona do calendário e da série de casos.'],
    ['Ingrid Rayane', 'Social media', 'Stories diários e o contador de vagas da BF; aparece no salão do Fornario (P1, P6).'],
    ['Higor Horácio', 'Design', 'Carrosséis de case, telas do sistema (sem valores) e capas; as 10 postagens.'],
    ['Aleffer', 'Audiovisual e captação', 'Grava as 2 diárias e a captura dupla; fala no P9 (3 erros do vídeo de restaurante).'],
    ['Almeida', 'Edição', 'Edita o orgânico em até 48 h depois de cada diária.'],
    ['Lucas', 'Edição e videomaker', 'Cortes de 15 s para anúncio (3 ganchos por vídeo); celular nas diárias.'],
    ['Ellcazo', 'Produtora parceira', 'Diárias dos clientes; vende a Diária de fim de ano; vídeos da prova (VOVINA, Brio).'],
  ]
  d.page('pf', `${BR} · A equipe é o conteúdo`, 'Quem faz o quê no plano, e o que cada um entrega', `
  <table class="cal cal1 eq"><thead><tr><th>Quem</th><th>Papel</th><th>No plano até 31/12</th></tr></thead>
  <tbody>${rows.map((r) => `<tr><td class="d">${r[0]}</td><td class="e">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
  <p class="cap" style="margin-top:10px">Ninguém aparece contra a vontade: quem não quiser falar aparece trabalhando, sem fala.</p>`, { cls: 'calpg big' })
}

function casesPage(d) {
  const cs = [['Ótica MD Prime', 'Conversas pelo anúncio', '192 conversas a R$ 6,53; “Só a lente” por cidade a R$ 3,76', '19/11'], ['VOVINA', 'Delivery próprio', '893 cliques a R$ 0,13; 85% vieram do vídeo do Combo', '03/12'], ['Fornario', 'Constância', '8 → 32 posts no período; 2.305 curtidas e comentários', '10/12'], ['Brio Burguer', 'Produto em close', '2.431 views no “Brio Matuto”, 3,6 vezes a média', '11/12'], ['Clínica (estética)', 'Aula que vende', 'Pilates: 98 conversas a R$ 3,41', 'janeiro'], ['F5 Multimarcas', 'Preço no vídeo', 'Fox 2013 com preço: R$ 4,08 por conversa', 'janeiro']]
  d.page('pf', `${BR} · Cases e indicação`, 'Um case por semana, e a indicação com vídeo pronto', `
  <div class="xg2" style="grid-template-columns:1.25fr 1fr">
    <table class="xtab"><thead><tr><th>Cliente</th><th>O case mostra</th><th>No ar</th></tr></thead><tbody>${cs.map((r) => `<tr><td><b>${r[0]}</b><small>[autorização do cliente]</small></td><td><b>${r[1]}:</b> ${r[2]}</td><td><b>${r[3]}</b></td></tr>`).join('')}</tbody></table>
    <div class="xbox xdk"><h3>Indicação com vídeo pronto</h3>${ul(['<b>Quem pede:</b> o Italo, na reunião do mês ou com o relatório de segunda', '<b>Para quem:</b> os 12 clientes com pacote ou tráfego', '<b>Como:</b> manda o vídeo de 30 s do case do próprio cliente: “Encaminha para um amigo dono de negócio que trabalha muito e não vê o marketing virar venda”', '<b>Quem indica ganha:</b> [uma diária extra ou 1 mês de social, quando o indicado fechar]', '<b>Até 18/12</b>; origem “Indicação” no Comercial'])}</div>
  </div>
  <p class="cap" style="margin-top:8px">Números do sistema e da Meta. Nenhum valor de contrato aparece em case.</p>`, { cls: 'dense big' })
}

function vendaResumo(d) {
  d.page('pf', `${BR} · Venda (resumo do Plano de vendas)`, 'As 5 objeções reais e a resposta de cada uma', `
  <table class="xtab"><thead><tr><th>Objeção (de onde veio)</th><th>Resposta em 1 frase</th><th>Prova que acompanha</th></tr></thead><tbody>
  ${[['“Quanto custa?” (3 perdas por preço; 1ª pergunta no WhatsApp)', 'Depende do que o Raio-X achar; a faixa vai antes de você gastar 1 minuto.', 'Faixa por área e a oferta de 6 meses'], ['“Já paguei agência e não deu em nada” (3 perdas por resultado)', 'Faltou alguém olhando o número toda segunda. Aqui você recebe.', 'Relatório de segunda (sem valores)'], ['“Eu mesmo impulsiono” (mensagem real)', 'Impulsionar acelera o que já está lá; a gente arruma antes de acelerar.', '“Só a lente” R$ 3,76 × genérico R$ 58,88'], ['“Depois do fim de ano eu vejo” (“vaga em janeiro é difícil”)', 'Quem decide em janeiro começa em fevereiro. Fechando até 19/12, janeiro já roda.', 'Calendário 05/01 → 20/01 → fevereiro'], ['“Não tenho tempo nem jeito para gravar”', 'Você não grava sozinho: a Ellcazo vai até você e o Italo dirige.', 'P3: “eu tinha problema de dicção”']].map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
  </tbody></table>
  <div class="xg3" style="margin-top:12px">
    <div class="xbox"><h3>Regra de ouro do atendimento</h3><p>Resposta em <b>até 1 hora</b> (8h às 19h). Lead sem resposta é verba jogada fora.</p></div>
    <div class="xbox"><h3>Follow-up</h3><p>Dia 1, 3 e 7 depois do Raio-X; depois só com novidade (case novo). Nunca “e aí, pensou?”.</p></div>
    <div class="xbox xdk"><h3>Documento completo</h3><p>“Plano de vendas”, na mesma pasta: roteiro do WhatsApp, Raio-X em 30 min, proposta, objeções, follow-up e indicação.</p></div>
  </div>`, { cls: 'dense big' })
}

const decs = [
  ['Bônus do “Comece 2027”', [['A', 'Diária de janeiro inclusa', 'trabalho, não desconto', 1], ['B', 'Desconto no 1º mês', 'abre briga de preço']]],
  ['Black Friday da Peformake', [['A', '20 vagas de Raio-X, zero desconto', '27 a 30/11, contador nos stories', 1], ['B', 'Desconto no 1º mês', 'igual aos nacionais']]],
  ['Quem indica ganha', [['A', 'Diária extra ou 1 mês de social', 'só quando o indicado fechar', 1], ['B', 'Só agradecimento', 'sem custo; pede menos']]],
  ['Verba de anúncio da Peformake', [['A', 'R$ 25/dia', '≈ R$ 1.150 no período'], ['B', 'R$ 37/dia', '≈ R$ 1.750, dobrando nos picos', 1], ['C', 'R$ 57/dia', '≈ R$ 2.700 no período']]],
  ['Garantia do Raio-X', [['A', '“Sem 1 conserto, o café é meu”', 'leve, vira assunto', 1], ['B', 'Sem garantia', 'mais simples']]],
  ['Cliente da diária 2 (01/12)', [['A', 'Fornario', 'case de constância pronto', 1], ['B', 'Brio Burguer', 'case do produto em close']]],
]
function decPage(d) {
  d.page('pf', `${BR} · Decisões`, 'Seis escolhas para o plano ir ao ar (a sugerida está marcada)', `
  <div class="decs">${decs.map((x, i) => `<div class="card dec"><h3><span class="num">${i + 1}</span>${x[0]}</h3>
    ${x[1].map((o) => `<div class="dopt ${o[3] ? 'rec' : ''}"><b>${o[0]}</b><div><strong>${o[1]}</strong><span>${o[2]}</span></div>${o[3] ? '<em>sugerida</em>' : ''}</div>`).join('')}</div>`).join('')}</div>`, { cls: 'dense' })
}

function nextPage(d) {
  const need = ['<b>Conta de anúncio da Peformake</b> (BM Peformake CA 1), @peformake e @italosantosdigital ligados', '<b>Autorização por escrito</b> dos cases (Ótica MD, VOVINA, Fornario, Brio, clínica, F5)', '<b>Preço do pacote</b> do “Comece 2027” e as decisões 1, 3 e 5', '<b>Agenda do Italo</b>: 3 horários fixos de Raio-X por semana + 20 na BF', '<b>Comercial com origem</b> (anúncio, conteúdo, indicação) e preencher a origem dos 19 clientes sem ela']
  const steps = [['13/11', 'Decisões desta estratégia'], ['até 16/11', 'Conta de anúncio, mensagens prontas, Comercial com origem'], ['17/11', 'Diária 1 no escritório'], ['19/11', 'Case #1 no ar e anúncio do Raio-X'], ['27 a 30/11', 'Black Friday: 20 vagas'], ['01/12', 'Diária 2 no Fornario'], ['04/12', 'Sobe a Diária Ellcazo'], ['até 11/12', 'Upgrade: mensagem aos 13 só com audiovisual'], ['19/12', 'Último dia do “Comece 2027”'], ['05/01', 'Balanço e plano de janeiro']]
  d.page('pf', `${BR} · O que precisamos e próximos passos`, 'Com isto até 16/11, o plano roda sozinho', `
  <div class="g2n">
    <div class="card need"><h3>O que precisamos decidir e reunir</h3>${ul(need)}</div>
    <div class="steps">${steps.map((s) => `<div class="st"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
  </div>`, { cls: 'dense' })
}

// ---------------- Conferência (rubrica) ----------------
const NOTAS = [['Verdade', 5], ['Foco', 5], ['Oferta irresistível', 4], ['Caminho até o dinheiro', 5], ['Espaço vazio', 5], ['Gancho', 4], ['Ideia, não formato', 4], ['Variedade', 5], ['Referência forte', 4], ['Executável', 5], ['Tráfego = oferta', 5], ['Depois do clique', 5]]
function conferencia(d) {
  const m = (NOTAS.reduce((a, n) => a + n[1], 0) / NOTAS.length).toFixed(1).replace('.', ',')
  d.page('pf', 'Interno · Conferência (rubrica do estudo)', `Nota média ${m} de 5: nenhum item abaixo de 4`, `
  <div class="xsc">${NOTAS.map((n) => `<div class="${n[1] >= 5 ? 'ok' : 'mid'}"><b>${n[1]}</b><span>${n[0]}</span></div>`).join('')}</div>
  <div class="xg3" style="margin-top:16px">
    <div class="xbox xdk"><h3>As 3 ideias mais fortes</h3>${ul(['<b>Black Friday 0% de desconto:</b> 20 vagas de Raio-X, contador real nos stories, enquanto os nacionais dão anúncio grátis', '<b>Indicação com vídeo pronto:</b> o cliente encaminha o vídeo do próprio case', '<b>Banco de ofertas da base:</b> oferta com nome, preço e cidade custa 10 a 15 vezes menos; o Raio-X nasce com nome e vagas'])}</div>
    <div class="xbox"><h3>Teste final</h3>${ul(['Um concorrente não usa este plano trocando o nome: ele não tem a Ellcazo na casa nem os números da base', 'Se só uma coisa for feita: o anúncio do Raio-X com o case da Ótica MD (está na página 2)', 'Hipóteses com prazo: custo por conversa e taxa de fechamento revistos em 30/11'])}</div>
    <div class="xbox"><h3>O que ainda pesa (4 e não 5)</h3>${ul(['Oferta: preço do pacote e bônus dependem do Italo', 'Gancho e ideia: 1 dos 10 vídeos (3 erros) é formato conhecido; a execução da equipe é que diferencia', 'Referências locais de Recife rodam há menos de 30 dias'])}</div>
  </div>`, { cls: 'dense' })
}

// ---------------- montar ----------------
const extra = `<style>.eq td.d{width:150px;font-weight:800}.eq td.e{width:300px}.eq{font-size:14px}</style>`
const e = Doc(BR, 'Estratégia')
cover(e, BR, 'Estratégia do mês · com o diagnóstico', 'Estratégia de 12/11 a 31/12', 'O que vimos em números, a narrativa, as ofertas em ficha, o caminho da venda, o calendário, a equipe, os cases e as decisões. Com janeiro já pensado.')
tesePage(e, BR, b)
diagBase(e); diagCom(e); diagTraf(e); diagMercado(e); diagTend(e)
narrPage(e)
offerResumo(e); offerFicha(e, 0); offerFicha(e, 2)
caminhoPage(e)
calPage(e)
equipePage(e)
casesPage(e)
vendaResumo(e)
decPage(e)
nextPage(e)
conferencia(e)
fs.writeFileSync(path.join(OUT, 'estrategia.html'), fixCover(html(`Estratégia ${BR}`, e.pages)).replace('</head>', CSS + extra + '</head>'))
console.log('estratégia', e.pages.length)
module.exports = { NOTAS }
