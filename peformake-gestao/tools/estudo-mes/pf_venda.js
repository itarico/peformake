// Peformake · Plano de vendas (13/11/2026): o que acontece depois do clique. Etapa 3.4 da skill peformake-estudo-mes.
const fs = require('fs')
const path = require('path')
const { K, OUT, CSS, fixCover, ul } = require('./pfk.js')
const { Doc, cover, html } = K
const BR = 'Peformake'
const msg = (who, t, me) => `<div class="xmsg ${me ? 'me' : ''}"><small>${who}</small>${t}</div>`

function entradaPage(d) {
  const L = [
    ['Raio-X (anúncio e conteúdo)', 'Quero o Raio-X do meu marketing', 'Thyfany', '1 h'],
    ['Black Friday (27 a 30/11)', 'RAIO-X', 'Thyfany; Ingrid atualiza as vagas', '30 min'],
    ['Case (remarketing)', 'Quero ver como foi o case', 'Thyfany', '1 h'],
    ['Comece 2027', '2027', 'Italo', '1 h'],
    ['Diária Ellcazo', 'Quero uma diária de gravação', 'Ellcazo (Aleffer) com cópia para a Thyfany', '2 h com datas'],
    ['Indicação', '[cliente] me passou seu número', 'Italo', 'mesmo dia'],
  ]
  d.page('pf', 'Plano de vendas · 1 · A porta', 'Cada anúncio chega com mensagem pronta e a origem', `
  <table class="xtab"><thead><tr><th>Origem</th><th>Mensagem pronta que chega</th><th>Quem responde</th><th>Em quanto tempo</th></tr></thead><tbody>
  ${L.map((r) => `<tr><td><b>${r[0]}</b></td><td>“${r[1]}”</td><td>${r[2]}</td><td><b>${r[3]}</b></td></tr>`).join('')}</tbody></table>
  <div class="xg3" style="margin-top:14px">
    <div class="xbox xdk"><h3>Regra 1: resposta em até 1 hora</h3><p>Das 8h às 19h, de segunda a sábado. Fora do horário, a mensagem automática do WhatsApp Business diz quando volta (sem robô fingindo ser gente).</p></div>
    <div class="xbox"><h3>Regra 2: todo lead no Comercial</h3><p>Na hora, com nome, empresa, nicho, cidade e <b>origem</b>. A mensagem pronta já diz a origem; indicação: perguntar quem indicou.</p></div>
    <div class="xbox"><h3>Regra 3: um dono por lead</h3><p>Thyfany até marcar e preparar a ficha; Italo e Aleffer no Raio-X; Italo até o contrato. Ninguém fica sem próximo passo com data.</p></div>
  </div>`, { cls: 'dense big' })
}

function zapPage(d) {
  d.page('pf', 'Plano de vendas · 2 · Roteiro do WhatsApp', 'Da primeira mensagem ao Raio-X marcado, em 4 trocas', `
  <div class="xg2" style="grid-template-columns:1fr 1fr 1fr;gap:18px">
    <div class="xbox"><span class="xl">1 · Primeira resposta</span>
      ${msg('Lead', 'Quero o Raio-X do meu marketing')}
      ${msg('Thyfany', 'Oi, [nome]! Aqui é a Thyfany, da Peformake. O Raio-X com câmera é de graça: o Italo e a Ellcazo vão até o teu negócio, olham Instagram, anúncio e WhatsApp, e tu sai com 3 vazamentos por escrito e 1 vídeo de 15 s pronto pra anunciar. Posso te fazer 3 perguntas rápidas?', 1)}
      <p style="margin-top:6px"><b>Nunca:</b> mandar preço, PDF ou áudio longo na primeira resposta.</p></div>
    <div class="xbox"><span class="xl">2 · Qualificação (3 perguntas)</span>
      ${msg('Thyfany', '1) Qual é o seu negócio e em que cidade?<br>2) Hoje, de onde vem a maioria dos seus clientes?<br>3) Já tentou anúncio, agência ou alguém cuidando do Instagram? Como foi?', 1)}
      <p style="margin-top:6px"><b>Qualificado:</b> dono ou sócio, Grande Recife (ou online), faturamento entre R$ 30 e 150 mil por mês [perguntar só se surgir], vende serviço ou produto local.</p>
      <p style="margin-top:4px"><b>Fora do perfil:</b> agradece e manda 1 conteúdo útil (P2, “Raio-X em 30 s”).</p></div>
    <div class="xbox"><span class="xl">3 · Marcar e confirmar</span>
      ${msg('Thyfany', 'Perfeito. O Italo e o Aleffer podem ir aí [terça 9h] ou [quinta 14h], fora do horário de movimento. Qual fica melhor?', 1)}
      ${msg('Thyfany', '(no dia, 2 h antes) Tudo certo pro Raio-X às [16h]? Me manda o @ do Instagram e, se tiver, um print do seu último anúncio.', 1)}
      <p style="margin-top:6px"><b>BF:</b> 12 vagas, 3 por dia. Contador nos stories só depois de 7 preenchidas, e só o número real.</p></div>
  </div>`, { cls: 'dense big' })
}

function raioxPage(d) {
  const S = [
    ['Antes · Thyfany, 20 min', 'A ficha', 'Perfil, Biblioteca de Anúncios e teste do WhatsApp (manda mensagem e cronometra). O Italo chega sabendo.'],
    ['0–10 min', 'O negócio', 'O que mais vende, o ticket e o que o dono quer em janeiro. Anota no Comercial.'],
    ['10–25 min', 'Os 3 vazamentos', 'O perfil (teste de 2 segundos), o anúncio (tem oferta com nome, preço e cidade?) e o WhatsApp (o tempo da ficha).'],
    ['25–45 min', 'Os 15 s · Aleffer', 'Grava 1 vídeo do produto ou serviço com a regra da casa: luz de lado, movimento lento, som real. Autorização do dono.'],
    ['45–60 min', 'O próximo passo', 'Vazamentos por escrito até o fim do dia; o vídeo editado pelo Lucas em 24 h; “Quer que eu monte o plano de janeiro?”'],
  ]
  d.page('pf', 'Plano de vendas · 3 · O Raio-X com câmera', 'Uma hora no negócio: 3 vazamentos e 1 vídeo pronto', `
  <div class="xg2" style="grid-template-columns:1.35fr 1fr">
    <div>${S.map((s, i) => `<div class="xstep"><b>${i + 1}</b><div><h4>${s[0]} · ${s[1]}</h4><p>${s[2]}</p></div></div>`).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="xbox xdk"><h3>O que o dono leva</h3>${ul(['Os 3 vazamentos por escrito (1 página, no WhatsApp, até o fim do dia)', '1 vídeo de 15 s pronto para anunciar, em 24 h', 'Se fizer sentido: a proposta “Comece 2027” em até 48 h'])}</div>
      <div class="xbox"><h3>O que o Italo não faz</h3>${ul(['Falar de preço antes de mostrar o vazamento', 'Criticar quem cuidava antes (o vilão é o automático, não a pessoa)', 'Prometer número: mostra o case e diz “vamos medir”', 'Analisar em vídeo o perfil de quem não pediu e não autorizou'])}</div>
    </div>
  </div>`, { cls: 'dense big' })
}

function propostaPage(d) {
  d.page('pf', 'Plano de vendas · 4 · Proposta em 48 horas', 'Uma página, preço claro e o “por que agora” com data', `
  <div class="xg2" style="grid-template-columns:1.1fr 1fr">
    <div class="xbox"><h3>A proposta (1 página, identidade Peformake)</h3>
      ${ul(['<b>O que vimos no Raio-X:</b> os 3 vazamentos, com print', '<b>O plano de janeiro:</b> tese, oferta do cliente e 1 meta medida no Comercial dele', '<b>Quem faz:</b> foto da equipe que vai atender (Thyfany, Higor, Aleffer…)', '<b>O que entra:</b> áreas, diária de gravação entre 05 e 16/01, relatório toda segunda', '<b>Investimento:</b> preço claro por área [tabela na versão admin]; 6 meses', '<b>Por que agora:</b> fechando até 19/12, a diária de janeiro vai inclusa [decisão 1]', '<b>Próximo passo:</b> “Responde OK que eu mando o contrato pelo sistema”'])}</div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="xbox"><span class="xl">Mensagem de envio (Italo)</span>
        ${msg('Italo', '[Nome], como combinamos: aqui está o plano de janeiro do [negócio]. Coloquei os 3 pontos que vimos e o que a gente faz em cada um. Se fechar até 19/12, a gravação de janeiro já fica marcada. Posso te ligar amanhã às [hora] para tirar dúvidas?', 1)}</div>
      <div class="xbox xdk"><h3>Contrato</h3><p>Assinatura no sistema (Assinafy, 10 por mês grátis). O PDF fica salvo na pasta do cliente; a diária é marcada no mesmo dia.</p></div>
    </div>
  </div>`, { cls: 'dense big' })
}

const OBJ = [
  ['“Quanto custa?”', 'Medo de pagar caro antes de entender o que leva. 3 clientes saíram por preço.', 'Depende do que a gente achar no Raio-X; a proposta vem com preço claro em 48 horas. Antes do preço, deixa a gente ir aí e te mostrar onde está perdendo venda. É de graça e tu fica com um vídeo pronto.', 'Proposta de 1 página com preço'],
  ['“Já paguei agência e não deu em nada”', 'Já foi enganado pelo automático. 3 clientes saíram por resultado.', 'Faz sentido desconfiar. Quase sempre faltou alguém olhando o número toda semana. Aqui você recebe toda segunda o relatório com conversas e pedidos, e a gente muda o que não funcionou.', 'Relatório de segunda (exemplo sem valores); P7'],
  ['“Eu mesmo impulsiono”', 'Acha que anúncio é botão (tema frequente nas conversas).', 'Impulsionar acelera o que já está lá. Se a oferta não tem nome e o WhatsApp demora, acelera para o lugar errado. Na nossa base, o anúncio com oferta, preço e cidade sai de R$ 3,41 a 4,14 por conversa.', 'Banco de ofertas da base'],
  ['“Depois do fim de ano eu vejo”', 'Dezembro corrido; quer começar “do zero” em janeiro.', 'Quem decide em janeiro assina dia 5, tem plano dia 20 e vídeo em fevereiro. Fechando até 19/12, o plano chega antes da virada e a gravação já está marcada entre 05 e 16/01.', 'Calendário 05/01 → 20/01 → fevereiro; P10'],
  ['“Não tenho tempo nem jeito para gravar”', 'Vergonha de câmera e falta de tempo (tema frequente).', 'Você não grava sozinho: a Ellcazo vai até você, o Italo dirige e em 1 manhã sai o mês. E se não quiser aparecer, mostramos o produto e a equipe.', 'P3 “Eu tinha problema de dicção”; diária'],
]
function objPage(d) {
  d.page('pf', 'Plano de vendas · 5 · As 5 objeções reais', 'O que o dono diz, o que está por trás e a resposta pronta', `
  <table class="xtab"><thead><tr><th>Objeção</th><th>O que está por trás (fonte)</th><th>Resposta (falada, sem decorar)</th><th>Prova</th></tr></thead><tbody>
  ${OBJ.map((r) => `<tr><td style="width:150px"><b>${r[0]}</b></td><td style="width:230px">${r[1]}</td><td>${r[2]}</td><td style="width:170px">${r[3]}</td></tr>`).join('')}</tbody></table>
  <p class="cap" style="margin-top:8px">Fontes: motivos de perda dos 13 clientes (sistema) e mensagens recebidas no WhatsApp. Depois de responder, sempre devolva uma pergunta: “Faz sentido para você?”</p>`, { cls: 'dense big' })
}

function followPage(d) {
  const F = [
    ['D+0 (fim do dia)', 'Os 3 vazamentos por escrito', 'Como prometido, os 3 pontos do [negócio] e o conserto da semana: [lista]. Qualquer dúvida, me chama.'],
    ['D+2', 'A proposta', 'Mensagem de envio da proposta (página 4).'],
    ['D+4', 'Um case parecido', 'Lembrei de você: olha o que aconteceu com uma [ótica/clínica/restaurante] parecida. [vídeo de 30 s do case]'],
    ['D+7', 'A pergunta direta', 'Conseguiu fazer o conserto do Raio-X? Se quiser que a gente faça junto, a gravação de janeiro ainda tem [x] vagas.'],
    ['18/12', 'Último aviso real', 'Amanhã é o último dia do “Comece 2027” com a diária inclusa. Depois disso continua de pé, só sem a diária.'],
    ['D+30', 'Sem venda: porta aberta', 'Registrar o motivo da perda no Comercial; entra na lista de janeiro com 1 conteúdo útil por mês.'],
  ]
  d.page('pf', 'Plano de vendas · 6 · Follow-up', 'Insistir com novidade, nunca com “e aí, pensou?”', `
  <div class="xg2" style="grid-template-columns:1.5fr 1fr">
    <table class="xtab"><thead><tr><th>Quando</th><th>O quê</th><th>Mensagem pronta (Italo)</th></tr></thead><tbody>
    ${F.map((r) => `<tr><td style="width:120px"><b>${r[0]}</b></td><td style="width:150px">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="xbox xdk"><h3>Regras</h3>${ul(['No máximo 4 mensagens depois do Raio-X', 'Cada mensagem leva algo novo: texto, case ou prazo real', 'Respondeu “não agora”: agradece, registra o motivo e volta em janeiro', 'Tudo enviado por uma pessoa; nenhuma automação manda mensagem a lead'])}</div>
      <div class="xbox"><h3>Registro</h3><p>Cada mensagem vira um evento no Comercial (crm_events). Segunda: quem está parado há mais de 5 dias aparece na lista do Italo.</p></div>
    </div>
  </div>`, { cls: 'dense big' })
}

function basePage(d) {
  d.page('pf', 'Plano de vendas · 7 · Indicação, upgrade e volta', 'A venda mais barata é para quem já confia na Peformake', `
  <div class="xk">${[['12', 'clientes com pacote ou tráfego: pedir 1 indicação cada (meta: 3 leads)'], ['13', 'clientes só com audiovisual: o vídeo deles vira anúncio (meta: 3 upgrades)'], ['5', 'ex-clientes que saíram por fim de contrato (meta: 1 volta)'], ['12', 'cartões “Raio-X de presente” nas reuniões de dezembro (meta: 3 Raio-X de indicados)']].map((k) => `<div><b>${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
  <div class="xg3">
    <div class="xbox"><span class="xl">Indicação com vídeo pronto · 12 clientes · até 18/12</span>
      ${msg('Italo', '[Nome], fiz um vídeo de 30 s mostrando o que a gente fez juntos no [negócio]. Você conhece um dono de negócio que trabalha muito e não vê o marketing virar venda? Se puder, encaminha para ele. Se ele fechar, [benefício a decidir] é seu.', 1)}
      <p style="margin-top:6px">Só depois de um mês bom (relatório positivo). Origem “Indicação”.</p></div>
    <div class="xbox"><span class="xl">Da gravação ao cliente · 13 só com audiovisual · até 11/12</span>
      ${msg('Italo', '[Nome], aquele vídeo que a Ellcazo gravou de vocês tem cara de anúncio. Na VOVINA, um vídeo assim trouxe 893 cliques no delivery a R$ 0,13. Quer que eu te mostre quanto o seu renderia, em janeiro?', 1)}
      <p style="margin-top:6px">Junto vai o próprio vídeo do cliente. Meta: 3 upgrades.</p></div>
    <div class="xbox"><span class="xl">Volta de ex-clientes · 5 saíram por fim de contrato</span>
      ${msg('Italo', '[Nome], tô montando os planos de janeiro e lembrei do [negócio]. Tenho 3 horários de Raio-X de graça esta semana; quer ver como está seu marketing hoje?', 1)}
      <p style="margin-top:6px">Não procurar quem saiu por insatisfação sem antes o Italo decidir. Nada sai sem um humano enviar.</p></div>
  </div>`, { cls: 'dense big' })
}

function diariaPage(d) {
  d.page('pf', 'Plano de vendas · 8 · Diária Ellcazo e o Comercial', 'Venda rápida de dezembro e como medir tudo', `
  <div class="xg2" style="grid-template-columns:1fr 1.1fr">
    <div class="xbox"><span class="xl">Diária Ellcazo · resposta em até 2 h</span>
      ${msg('Lead', 'Quero uma diária de gravação')}
      ${msg('Ellcazo', 'Oi, [nome]! Numa diária de 3 h, fora do horário de movimento, a gente grava até 6 vídeos do [restaurante/loja] para Natal, Réveillon e janeiro, e você já recebe 1 corte de 15 s pronto para anunciar. Datas livres até 18/12: [datas]. Câmera ou celular profissional: [valores do catálogo]. Qual data fica melhor?', 1)}
      <p style="margin-top:6px">Fechou: venda avulsa no sistema e o Italo oferece o Raio-X depois da entrega (porta para o “Comece 2027”).</p></div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <table class="xtab"><thead><tr><th>Etapa no Comercial</th><th>Meta até 31/12</th></tr></thead><tbody>
      ${[['Conversa (com origem)', '70'], ['Qualificado', '40'], ['Raio-X com câmera', '20'], ['Proposta enviada', '12'], ['Contrato (Comece 2027)', '5'], ['Diária vendida / upgrade', '2 / 3']].map((r) => `<tr><td>${r[0]}</td><td><b>${r[1]}</b></td></tr>`).join('')}</tbody></table>
      <div class="xbox xdk"><h3>Toda segunda (relatório da Peformake)</h3><p>Conversas por origem, Raio-X, propostas, contratos, custo por conversa e por Raio-X (do tráfego). O que travou e quem está parado.</p></div>
    </div>
  </div>`, { cls: 'dense big' })
}

const v = Doc(BR, 'Plano de vendas')
cover(v, BR, 'Plano de vendas · depois do clique', 'Vendas de 12/11 a 31/12', 'A porta, o roteiro do WhatsApp, o Raio-X em 30 minutos, a proposta, as 5 objeções reais, o follow-up e a venda para a base.')
entradaPage(v); zapPage(v); raioxPage(v); propostaPage(v); objPage(v); followPage(v); basePage(v); diariaPage(v)
fs.writeFileSync(path.join(OUT, 'plano-vendas.html'), fixCover(html(`Plano de vendas ${BR}`, v.pages)).replace('</head>', CSS + '</head>'))
console.log('vendas', v.pages.length)
