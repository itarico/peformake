// Peformake · Estratégia de tráfego v2 (13/11/2026) pelo padrão .claude/skills/peformake-estudo-mes/trafego-oferta.md:
// oferta antes do anúncio, temperatura × mensagem, matriz oferta × ângulo com referência da Biblioteca, teto por resultado,
// verba A/B/C, regras, depois do clique e o banco de ofertas da base.
const fs = require('fs')
const path = require('path')
const { K, OUT, img, AD, ADS, CSS, fixCover, ul } = require('./pfk.js')
const { Doc, cover, html } = K
const BR = 'Peformake'
const refMini = (k) => { const a = ADS[k]; return `<div class="xref"><a class="t" href="${AD(a.id)}" target="_blank"><img src="${img(a.im)}" alt=""></a><div class="ri"><b>${a.page}</b>${a.what}<br><em>${a.d} ${a.d === 1 ? 'dia' : 'dias'} no ar</em> · <a href="${AD(a.id)}" target="_blank">abrir</a></div></div>` }

function startPage(d) {
  d.page('pf', 'Tráfego · ponto de partida', 'O método já funciona nos clientes; agora, na Peformake', `
  <div class="xk">${[['0', 'anúncios da própria Peformake no ar (sem conta própria)'], ['653', 'conversas por anúncio nos clientes (out–nov)'], ['R$ 3,41 a 10,17', 'por conversa nos clientes (pilates a multimarcas)'], ['11 de 13', 'clientes vieram por indicação; 0 por anúncio']].map((k) => `<div><b>${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
  <div class="xg3">
    <div class="xbox xdk"><h3>O que a base ensina</h3>${ul(['Os vencedores dizem <b>o quê, quanto e onde</b>: R$ 3,41 a 4,14 por conversa', '<b>Vídeo do serviço acontecendo</b> vence o card (F5, pilates)', 'Botão do WhatsApp com mensagem pronta: é o que gera conversa barata'])}</div>
    <div class="xbox"><h3>Então, no anúncio da Peformake</h3>${ul(['O Raio-X com câmera diz quem vai, o que o dono leva e quantas vagas', 'Todo criativo é um vídeo ou case real da equipe no cliente', 'Toda campanha termina numa conversa com origem no Comercial'])}</div>
    <div class="xbox"><h3>O que é diferente aqui</h3>${ul(['Dono de negócio decide mais devagar que quem compra óculos: <b>a conversa custa mais</b>', 'Ticket de assessoria é recorrente: o teto se paga no 1º mês', 'Testamos só 2 coisas novas: rosto × número e o público'])}</div>
  </div>`, { cls: 'dense big' })
}

function tetoPage(d) {
  d.page('pf', 'Tráfego · os números que decidem', 'Quanto pode custar cada resultado sem dar prejuízo', `
  <table class="xtab"><thead><tr><th>Resultado</th><th>A conta</th><th>Teto</th><th>Meta</th></tr></thead><tbody>
    <tr class="hi"><td><b>Conversa (Raio-X, frio)</b></td><td>[ticket médio da base] × margem <b>[40%]</b> × conversa→contrato <b>[7%]</b> (5 de 70)</td><td><b>R$ 35</b><small>paga no 1º mês</small></td><td>até R$ 35</td></tr>
    <tr><td><b>Raio-X com câmera feito</b></td><td>[ticket] × [40%] × Raio-X→contrato <b>[25%]</b> (5 de 20)</td><td><b>R$ 115</b></td><td>até R$ 70</td></tr>
    <tr><td><b>Conversa (remarketing, morno/quente)</b></td><td>[ticket] × [40%] × fechamento de quem já viu o case <b>[15%]</b></td><td><b>R$ 69</b></td><td>até R$ 30</td></tr>
    <tr><td><b>Conversa (Diária Ellcazo)</b></td><td>[valor da diária] × [margem] × fechamento <b>[25%]</b> (2 de 8)</td><td><b>[R$ 30]</b></td><td>até R$ 28</td></tr>
  </tbody></table>
  <div class="xg3" style="margin-top:14px;grid-template-columns:repeat(4,1fr)">
    ${[['Gancho (3 s)', '≥ 25%', 'das impressões assistem 3 s'], ['CTR no link', '≥ 1%', 'clique no botão do WhatsApp'], ['Resposta', '≤ 1 hora', 'Thyfany, das 8h às 19h'], ['Frequência', '≤ 3', 'acima disso, troca o criativo']].map((k, i) => `<div class="xbox ${i === 0 ? 'xdk' : ''}"><span class="xl" ${i === 0 ? 'style="color:var(--cy)"' : ''}>${k[0]}</span><b style="font:800 26px 'Inter Display';color:${i === 0 ? 'var(--cy)' : 'var(--pe)'}">${k[1]}</b><p>${k[2]}</p></div>`).join('')}
  </div>
  <p class="cap" style="margin-top:8px">[Colchetes] = hipótese até termos dado: margem e taxas de fechamento são revistas em 30/11 com os números reais do Comercial. O ticket da base não aparece aqui: a conta completa fica na versão admin.</p>`, { cls: 'dense big' })
}

function estruturaPage(d) {
  const T = [
    ['Frio', 'Donos de negócio 28–55 anos, Grande Recife (25 km); aberto × interesses de pequenas empresas', 'Dor ou desejo + Raio-X com nome e vagas', 'P4 case, P2 Raio-X 30 s, P8 BF', 'C1 Raio-X'],
    ['Morno', 'Viu 50% de um vídeo, visitou @peformake ou @italosantosdigital, interagiu (7–30 dias)', 'Prova e objeção: case, “já paguei agência”', 'P5 VOVINA, P7 objeção, P6 Fornario', 'C2 Comece 2027'],
    ['Quente', 'Conversou no WhatsApp, fez Raio-X, cliente da Ellcazo (lista)', 'Oferta principal com prazo: até 19/12', 'P10 Dezembro vende janeiro', 'C2 Comece 2027'],
    ['Nicho', 'Donos e gerentes de restaurante, bar e loja, Grande Recife; seguidores de gastronomia local', 'Desejo: vídeo que dá fome + prazo 18/12', 'P9 3 erros, P1 o marketing veio gravar', 'C3 Diária'],
  ]
  d.page('pf', 'Tráfego · estrutura', 'Uma campanha por oferta, conjuntos por temperatura', `
  <div class="xfl" style="margin-bottom:14px">${[['C1 · Raio-X com câmera', 'Mensagens (WhatsApp) · “Quero o Raio-X do meu marketing”', '62% · R$ 1.085 na B'], ['C2 · Comece 2027', 'Mensagens · remarketing · “2027” · desde 23/11', '25% · R$ 440 na B'], ['C3 · Diária Ellcazo', 'Mensagens · “Quero uma diária de gravação”', '13% · R$ 15/dia, 04 a 18/12 (R$ 225)']].map((c, i) => `<div style="${i === 0 ? 'background:var(--dk);color:#fff' : ''}"><h4 ${i === 0 ? 'style="color:var(--cy)"' : ''}>${c[0]}</h4>${c[1]}<span class="m">${c[2]}</span></div>`).join('')}</div>
  <table class="xtab"><thead><tr><th>Temperatura</th><th>Quem</th><th>Mensagem</th><th>Criativos</th><th>Campanha</th></tr></thead><tbody>
  ${T.map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><b>${r[4]}</b></td></tr>`).join('')}</tbody></table>
  <p class="cap" style="margin-top:8px">3 a 5 criativos por conjunto. Reels, Stories e Feed (Instagram e Facebook), seg a sáb 8h–20h. Antes de subir: conta própria na BM “Peformake CA 1”, página e @peformake ligados, Comercial com origem “Anúncio”. Meta Ads: só leitura até o Italo aprovar.</p>`, { cls: 'dense big' })
}

// matriz: [ângulo, criativo/peça, gancho, temperatura, ref1, ref2]
const C = {
  c1: { name: 'C1 · Raio-X com câmera', offer: 'O Italo e a Ellcazo vão até o negócio: 3 vazamentos + 1 vídeo de 15 s · grátis · BF 12 vagas (3 por dia)', next: 'WhatsApp “Quero o Raio-X do meu marketing” → Thyfany em 1 h', meta: '31 conversas a até R$ 35 · teto R$ 35',
    rows: [
      ['Dor', 'P2 · Raio-X em 30 s', '“Eu olho 3 coisas no seu perfil e sei se ele vende.”', 'Frio', 'brunoluis', 'bindes', 'A dor dita na 1ª frase e o “te explico em 1 min”; trocar a promessa por 3 itens que o dono confere'],
      ['Desejo', 'P3 · Eu tinha problema de dicção (corte de 15 s)', '“Se eu apareço, você aparece.”', 'Frio', 'bindes2', 'laquila', 'Dono contando a própria história; aqui a cicatriz real, sem palco'],
      ['Prova', 'P4 · Case nº 1: Ótica MD [autorização até 19/11] ou F5 (plano B)', '“Essa ótica tinha vitrine. Não tinha conversa.”', 'Frio', 'alavant', 'alldaya', 'O case com rosto que roda há 108 dias; aqui com o número do sistema na tela'],
      ['Objeção', 'Post 06 · O teste do celular', '“Antes de pôr mais dinheiro em anúncio, faz esse teste.”', 'Frio', 'baruk', 'talisma', 'Ensinar um teste em vez de prometer; a objeção vira o gancho'],
      ['Urgência', 'P8 · Black Friday 0% de desconto + post 05', '“Black Friday aqui é zero por cento.” (rasga o cartaz)', 'Frio + morno', 'provex', 'fga', 'Contra-exemplo: eles dão grátis; nós damos vagas contadas. Do FGA, a garantia na 1ª linha'],
    ] },
  c2: { name: 'C2 · Comece 2027 (remarketing)', offer: '6 meses, fechado até 19/12; diária de janeiro inclusa [a decidir]', next: 'WhatsApp “2027” → Italo em 1 h; proposta em 48 h', meta: '14 conversas a até R$ 30 · 5 contratos · teto R$ 69',
    rows: [
      ['Prova', 'P5 · O vídeo que virou anúncio (VOVINA)', '“Esse vídeo foi gravado num dia.” (update)', 'Morno', 'alavant', 'laquila', 'Antes → o que fizemos → número; formato “update”'],
      ['Prova', 'P6 · Quem lembra de postar quando o salão enche? (Fornario)', '“[x] reservas em novembro.” [autorização]', 'Morno', 'alldaya', 'igor2biz', 'Nicho na 1ª frase (“dono de restaurante”); a equipe no lugar do especialista'],
      ['Objeção', 'P7 · “Já paguei agência e não deu em nada”', 'A pergunta do story na tela', 'Morno', 'growthodonto', 'talisma', 'A pergunta do seguidor na tela, respondida com o relatório de segunda'],
      ['Urgência', 'P10 · Dezembro vende janeiro + post 10', 'Caneta risca 3 semanas de janeiro', 'Quente', 'fga', 'growing', 'Prazo e plano de 3 meses; contra o “dobrar em 2027”, a conta do calendário'],
      ['Desejo', 'P1 · O marketing veio gravar no restaurante', '“O marketing veio gravar…” take 7', 'Morno', 'trivo', 'maracatu', 'Humor que faz lembrar a marca; o rosto local da equipe'],
    ] },
  c3: { name: 'C3 · Diária Ellcazo de fim de ano', offer: 'Até 6 vídeos numa diária de 3 h + corte de 15 s · agenda até 18/12', next: 'WhatsApp “Quero uma diária” → Ellcazo em 2 h com datas', meta: '8 conversas · 2 diárias · R$ 15/dia · teto [R$ 30]',
    rows: [
      ['Dor', 'P9 · 3 erros do vídeo de restaurante', '“Se o seu vídeo é assim, ele não dá fome.”', 'Nicho', 'bindes', 'dezemhum', 'Aula curta + pergunta direta ao dono; erro e correção na mesma cena'],
      ['Desejo', 'Carrossel 09 · antes e depois do prato', 'O mesmo prato: celular tremido × Ellcazo', 'Nicho', 'taghy', 'igor2biz', 'Comida grande, luz quente; lado a lado com o “antes”'],
      ['Prova', 'P1 · O marketing veio gravar (Fornario)', '“Esse prato novo levou 479 pessoas ao perfil.”', 'Nicho', 'alavant', 'bindes2', 'Número de uma peça antiga do cliente na tela, não promessa'],
      ['Urgência', 'Story/feed “agenda até 18/12”', '“Natal se grava agora.”', 'Nicho + quente', 'fga', 'provex', 'Prazo na faixa de cor; sem “grátis”: diária com agenda até 18/12'],
    ] },
}
function campPage(d, k) {
  const c = C[k]
  d.page('pf', `Tráfego · ${c.name}`, `Matriz oferta × ângulo: ${c.rows.length} criativos, cada um com referência`, `
  <div class="xch" style="margin-bottom:10px">${[['A oferta', c.offer, 'v'], ['Depois do clique', c.next], ['Meta e teto', c.meta]].map((x) => `<div class="${x[2] || ''}"><b class="lb">${x[0]}</b>${x[1]}</div>`).join('')}</div>
  <table class="xtab mx"><thead><tr><th>Ângulo · público</th><th>Criativo (peça do mês)</th><th>Gancho 0–3 s</th><th>Referência 1 (Biblioteca)</th><th>Referência 2</th><th>O que adaptar</th></tr></thead><tbody>
  ${c.rows.map((r) => `<tr><td><b>${r[0]}</b><small>${r[3]}</small></td><td>${r[1]}</td><td>${r[2]}</td><td>${refMini(r[4])}</td><td>${refMini(r[5])}</td><td>${r[6]}</td></tr>`).join('')}</tbody></table>`, { cls: 'dense mxpg' })
}

function verbaPage(d) {
  const cal = [['13–16/11', 'Preparação: conta, mensagens, Comercial', 'R$ 0', ''], ['17–22/11', 'C1 sobe (case nº 1 em 19/11) · 6 dias × R$ 30', 'R$ 180', ''], ['23–26/11', 'C2 sobe; teste rosto × número · 4 × R$ 40', 'R$ 160', ''], ['27–30/11', 'Black Friday: 12 Raio-X · 4 × R$ 60', 'R$ 240', 'hot'], ['01–07/12', 'C3 sobe em 04/12 (R$ 15/dia) · 7 × R$ 45', 'R$ 315', ''], ['08–14/12', 'Teste de público; troca de criativos · 7 × R$ 45', 'R$ 315', ''], ['15–19/12', 'Comece 2027 no máximo · 5 × R$ 60', 'R$ 300', 'hot'], ['20–23/12', 'Remarketing e C1 leve · 4 × R$ 30', 'R$ 120', ''], ['24–27/12', 'Natal: tudo pausado', 'R$ 0', 'lo'], ['28–31/12', 'C1: agenda de Raio-X de janeiro · 4 × R$ 30', 'R$ 120', ''], ['Total', '41 dias no ar', 'R$ 1.750', 'hot']]
  d.page('pf', 'Tráfego · verba e calendário', 'Três opções de verba e quando cada coisa sobe, troca e pausa', `
  <div class="xg2" style="grid-template-columns:1fr 1.25fr">
    <div style="display:flex;flex-direction:column;gap:10px">
      ${[['A', 'R$ 1.150', '≈ R$ 28/dia nos 41 dias · ≈ 30 conversas', ''], ['B · sugerida', 'R$ 1.750', '≈ R$ 43/dia nos 41 dias · 45 conversas de Raio-X + 8 de diária', 'xdk'], ['C', 'R$ 2.700', '≈ R$ 66/dia · ≈ 75 conversas; precisa de mais Raio-X na agenda', '']].map((o) => `<div class="xbox ${o[3]}"><span class="xl" ${o[3] ? 'style="color:var(--cy)"' : ''}>${o[0]}</span><b style="font:800 26px 'Inter Display';color:${o[3] ? 'var(--cy)' : 'var(--pe)'}">${o[1]}</b><p>${o[2]}</p></div>`).join('')}
      <div class="xbox"><h3>Divisão de referência</h3><p><b>62%</b> no que já vende (C1) · <b>25%</b> remarketing (C2) · <b>13%</b> nicho (C3, R$ 15/dia). Troca de criativo a cada 10 a 14 dias ou queda de CTR.</p></div>
    </div>
    <table class="xtab"><thead><tr><th>Quando</th><th>O que acontece</th><th>Período (B)</th></tr></thead><tbody>
    ${cal.map((r) => `<tr class="${r[3] === 'hot' ? 'hi' : r[3]}"><td><b>${r[0]}</b></td><td>${r[1]}</td><td><b>${r[2]}</b></td></tr>`).join('')}</tbody></table>
  </div>`, { cls: 'dense big' })
}

function regrasPage(d) {
  d.page('pf', 'Tráfego · testes e regras', 'Um teste por vez; pausa e escala com número, não com sensação', `
  <table class="xtab"><thead><tr><th>Teste A/B</th><th>A × B</th><th>Quando</th><th>Quem ganha</th></tr></thead><tbody>
  ${[['Rosto ou número?', 'P3 Italo falando × P4 case com o número na tela', '23 a 29/11', 'Custo por Raio-X 20% menor com 15+ conversas em cada'], ['Qual mensagem pronta?', '“Quero o Raio-X do meu marketing” × “Quero ver como foi o case”', '01 a 07/12', 'A que vira mais Raio-X (não a que gera mais conversa)'], ['Qual público?', 'Aberto (a Meta escolhe) × interesses de pequenas empresas', '08 a 14/12', 'Custo por Raio-X; o vencedor leva a verba de janeiro']].map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>
  <div class="xg3" style="margin-top:14px">
    <div class="xbox xdk"><h3>Pausar</h3>${ul(['Criativo que gastou <b>2× o teto</b> (R$ 70 no C1) sem conversa', 'Custo acima do teto por 3 dias seguidos', 'Fim da oferta: C2 em 19/12 · C3 em 18/12'])}</div>
    <div class="xbox"><h3>Escalar</h3>${ul(['Vencedor com custo ≤ R$ 25 e Raio-X marcado: <b>+20% a cada 48 h</b>', 'Nunca mais de 2 aumentos seguidos sem olhar o Comercial', 'Nos picos (BF, 15–19/12) a verba já vem programada'])}</div>
    <div class="xbox"><h3>Trocar</h3>${ul(['<b>Troca o ângulo antes de trocar o público</b>', 'Frequência acima de 3 ou CTR caiu 30%: novo gancho do mesmo vídeo (o Lucas corta 3 ganchos por vídeo)', 'Nada muda no meio de um teste'])}</div>
  </div>`, { cls: 'dense big' })
}

function cliquePage(d) {
  d.page('pf', 'Tráfego · depois do clique', 'O anúncio só termina quando vende', `
  <div class="xfl" style="margin-bottom:14px">${[['Anúncio', 'botão do WhatsApp, mensagem pronta por campanha'], ['Conversa', 'Thyfany responde em 1 h, registra a origem e prepara a ficha'], ['Qualificação', '3 perguntas: negócio e cidade, de onde vêm os clientes, o que já tentou'], ['Raio-X com câmera', 'Italo + Aleffer no negócio: 3 vazamentos + 1 vídeo de 15 s'], ['Proposta', 'em até 48 h; Comece 2027 até 19/12'], ['Contrato', 'Assinafy; diária marcada']].map((s, i) => `<div style="${i === 5 ? 'background:var(--dk);color:#fff' : ''}"><h4 ${i === 5 ? 'style="color:var(--cy)"' : ''}>${s[0]}</h4>${s[1]}</div>`).join('')}</div>
  <div class="xg2">
    <table class="xtab"><thead><tr><th>Objeção real</th><th>Resposta curta</th></tr></thead><tbody>
    ${[['“Quanto custa?”', 'Preço claro na proposta, em 48 h, depois do Raio-X'], ['“Já paguei agência…”', 'Faltou olhar o número toda segunda. Aqui você recebe.'], ['“Eu mesmo impulsiono”', 'Impulsionar acelera o que está lá; a gente arruma antes'], ['“Depois do fim de ano”', 'Quem decide em janeiro começa em fevereiro'], ['“Não tenho tempo de gravar”', 'A Ellcazo vai até você e o Italo dirige']].map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td></tr>`).join('')}</tbody></table>
    <div class="xbox xdk"><h3>Como medir anúncio → venda</h3>${ul(['A Meta conta as <b>conversas iniciadas</b>; o Comercial conta Raio-X e contrato', 'Mensagem pronta diferente por campanha = origem automática', 'Link da bio com <b>?utm_source=instagram&amp;utm_medium=anuncio&amp;utm_campaign=raio-x</b>', 'Segunda: custo por conversa, por Raio-X e por contrato'])}<p style="margin-top:6px">Roteiro completo no <b>Plano de vendas</b> (pasta Estratégia).</p></div>
  </div>`, { cls: 'dense big' })
}

// Banco de ofertas: dados do sistema (traffic_entity_daily + traffic_daily_metrics), 01/10 a 12/11/2026
const BANCO = [
  ['Ótica', 'Ótica MD · “Só a lente” · Carpina', 'Produto + preço + cidade', 'vídeo animado', 'R$ 3,76', '1,07%', 'hi'],
  ['Ótica', 'Ótica MD · “Só a lente” · Limoeiro', 'Produto + preço + cidade', 'vídeo', 'R$ 4,14', '1,55%', 'hi'],
  ['Ótica', 'Ótica CM · anúncio de engajamento (conversa)', 'Genérico com botão', 'imagem', 'R$ 2,45 a 7,47', '1,34–2,00%', ''],
  ['Estética', 'Clínica · Pilates (engajamento → conversa)', 'Aula/serviço acontecendo', 'vídeo', 'R$ 3,41', '2,84%', 'hi'],
  ['Estética', 'Clínica · “Resultado” (antes e depois)', 'Prova', 'vídeo', 'R$ 9,46', '1,91%', ''],
  ['Automotivo', 'F5 · Fox 2013 com preço no vídeo (R$ 36.990)', 'Produto + preço', 'vídeo', 'R$ 4,08', '3,51%', 'hi'],
  ['Automotivo', 'F5 · Creta 2020 · vídeo 1', 'Produto em vídeo', 'vídeo', 'R$ 4,11', '4,65%', 'hi'],
  ['Automotivo', 'F5 · Festival Peugeot (card)', 'Evento/condição', 'card', 'R$ 8,78', '2,97%', ''],
  ['Construção', 'Fuctura · conversa', 'Genérico com botão', 'imagem', 'R$ 8,11', '8,54%', ''],
  ['Construção', 'Fuctura · “20% OFF”', 'Desconto', 'imagem', 'R$ 9,87', '1,54%', ''],
  ['Gastronomia', 'Fornario · Foie gras, prato novo (visita ao perfil)', 'Novidade do cardápio', 'foto do prato', 'R$ 0,19 visita', '3,26%', 'hi'],
  ['Gastronomia', 'VOVINA · vídeo do Combo (clique no delivery)', 'Combo + delivery próprio', 'vídeo', 'R$ 0,13 clique', '5,68%', 'hi'],
]
function bancoPage(d) {
  d.page('pf', 'Tráfego · banco de ofertas (1 de 2)', 'O que vendeu nos nossos clientes, por nicho', `
  <table class="xtab bk"><thead><tr><th>Nicho</th><th>Anúncio</th><th>Oferta / ângulo</th><th>Formato</th><th>Custo por resultado</th><th>CTR</th></tr></thead><tbody>
  ${BANCO.map((r) => `<tr class="${r[6]}"><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><b>${r[4]}</b></td><td>${r[5]}</td></tr>`).join('')}</tbody></table>
  <p class="cap" style="margin-top:6px">Fonte: traffic_entity_daily e traffic_daily_metrics (Meta, lidos pelo sistema), 01/10 a 12/11/2026, anúncios com mais de R$ 40 gastos. Resultado = conversa no WhatsApp, salvo indicação. Em azul: o que mais vendeu. Só anúncios dos nossos clientes, sem expor resultado fraco.</p>`, { cls: 'dense bkpg' })
}
function bancoPage2(d) {
  d.page('pf', 'Tráfego · banco de ofertas (2 de 2)', 'O que aprendemos e o que a Peformake testa de novo', `
  <div class="xg3" style="grid-template-columns:repeat(4,1fr)">
    ${[['Ótica e saúde', 'Produto ou exame com nome + cidade no anúncio; conversa a R$ 3 a 7.'], ['Estética', 'Mostrar a aula/serviço acontecendo (pilates R$ 3,41) é o formato que mais vendeu.'], ['Automotivo', 'Carro com preço no vídeo: R$ 4. O vídeo do carro rodando vende mais que a foto.'], ['Gastronomia', 'Prato novo e combo em vídeo, levando ao delivery próprio: clique a R$ 0,13.']].map((x, i) => `<div class="xbox ${i % 2 ? '' : 'xdk'}"><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('')}
  </div>
  <div class="xg2" style="margin-top:14px">
    <div class="xbox"><h3>Regra que vale para todos (e para a Peformake)</h3>${ul(['<b>Nome da oferta + preço ou condição + cidade</b> na primeira linha', '<b>Vídeo do serviço acontecendo</b> antes de arte bonita', 'Botão do WhatsApp com mensagem pronta; nunca “saiba mais”', 'Desconto não aparece entre os vencedores da base'])}</div>
    <div class="xbox xdk"><h3>O que é novo neste mês (só 2 testes)</h3>${ul(['<b>Serviço B2B</b> (assessoria) ainda não tem histórico na base: o teto de R$ 35 é aposta, revista em 30/11', '<b>Rosto × número</b> no criativo e <b>público aberto × interesses</b>', 'Em 05/01: página “O que aprendemos no mês” com o custo real por Raio-X e por contrato'])}</div>
  </div>`, { cls: 'dense big' })
}

function decPage(d) {
  const decs = [
    ['Verba de anúncio', [['A', 'R$ 1.150', '≈ R$ 28/dia'], ['B', 'R$ 1.750', '≈ R$ 43/dia, mais nos picos', 1], ['C', 'R$ 2.700', '≈ R$ 66/dia']]],
    ['Conta de anúncio', [['A', 'Conta própria na BM Peformake CA 1', 'separa o gasto dos clientes', 1], ['B', 'Conta de um cliente', 'nunca: mistura gasto e relatório']]],
    ['Para onde o anúncio leva', [['A', 'Direto no WhatsApp', 'mensagem pronta, menos atrito', 1], ['B', 'Formulário do site', 'mais dados, menos conversa']]],
    ['Rosto dos anúncios', [['A', 'Italo + equipe com nome', 'o diferencial é a equipe', 1], ['B', 'Só arte e número', 'sem gravar; perde o diferencial']]],
    ['C3 Diária Ellcazo', [['A', 'Sobe de 04 a 18/12', 'R$ 15/dia (R$ 225)', 1], ['B', 'Não sobe', 'verba vai para o C1']]],
    ['Margem para o teto', [['A', '[40%]', 'teto R$ 35 por conversa', 1], ['B', '[25%]', 'teto R$ 22; mais rígido']]],
  ]
  d.page('pf', 'Tráfego · decisões e rotina', 'Seis escolhas e 5 minutos por dia', `
  <div class="decs">${decs.map((x, i) => `<div class="card dec"><h3><span class="num">${i + 1}</span>${x[0]}</h3>
    ${x[1].map((o) => `<div class="dopt ${o[3] ? 'rec' : ''}"><b>${o[0]}</b><div><strong>${o[1]}</strong><span>${o[2]}</span></div>${o[3] ? '<em>sugerida</em>' : ''}</div>`).join('')}</div>`).join('')}</div>
  <div class="xnote"><b>Rotina:</b> todo dia 5 min (anúncios no ar, saldo, conversas respondidas em 1 h) · segunda: relatório da Peformake · terça: troca de criativo se precisar · quinta: verba dos picos · 05/01: balanço.</div>`, { cls: 'dense' })
}

const extra = `<style>.mx{font-size:12.4px}.mx td{padding:4px 7px;vertical-align:middle}.mx td:nth-child(3){width:170px}.mx th{padding:6px 7px}.mx .xref img{width:40px;height:54px}.mx .xref .ri{font-size:10.8px;line-height:1.2}.mx .xref .ri b{font-size:11.2px}.mx td:nth-child(4),.mx td:nth-child(5){width:190px}.mx td:nth-child(1){width:78px}.mx td:nth-child(6){width:190px;font-size:11.6px}
.mxpg .xch>div{font-size:13px;padding:6px 11px}.mxpg .xch{margin-bottom:8px!important}.bk{font-size:13px}.bk td{padding:5px 9px}</style>`
const t = Doc(BR, 'Estratégia de tráfego')
cover(t, BR, 'Estratégia de tráfego · oferta e venda no anúncio', 'Tráfego de 12/11 a 31/12', 'Uma campanha por oferta, públicos por temperatura, a matriz de criativos com referências da Biblioteca, o teto por resultado, a verba, as regras, o que acontece depois do clique e o banco de ofertas da base.')
startPage(t); tetoPage(t); estruturaPage(t)
campPage(t, 'c1'); campPage(t, 'c2'); campPage(t, 'c3')
verbaPage(t); regrasPage(t); cliquePage(t); bancoPage(t); bancoPage2(t); decPage(t)
fs.writeFileSync(path.join(OUT, 'trafego.html'), fixCover(html(`Tráfego ${BR}`, t.pages)).replace('</head>', CSS + extra + '</head>'))
console.log('tráfego', t.pages.length)
