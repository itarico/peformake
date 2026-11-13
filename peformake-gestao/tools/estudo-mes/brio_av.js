// Brio Burguer: Planejamento de audiovisual (13/11/2026). Nasce da Estratégia do mês (tese, ofertas, metas, calendário).
// Estilos do catálogo do Italo (video-tools/estilos/catalogo_estilos.md, E1–E40) e modelos de roteiro (M1–M49).
// Mesmo design aprovado (Ellcazo: verde-limão/branco, preto só nos detalhes). Reaproveita Doc/avCover/html do build3.js.
const fs = require('fs')
const path = require('path')
const GEN = __dirname
const src = fs.readFileSync(path.join(GEN, 'build3.js'), 'utf8')
const partA = src.slice(0, src.indexOf('// ---------------- conteúdo por marca'))
const partB = src.slice(src.indexOf('// ---------------- páginas'), src.indexOf('D.Fornario.pieces[3][3]'))
const K = new Function('require', '__dirname', partA + partB + '\nreturn { Doc, avCover, html, ell }')(require, GEN)
const { Doc, avCover, html } = K
const { TT, AD, ADS, TRENDS } = require('./brio_data.js')
const BR = 'Brio Burguer'
const OUT = path.resolve(GEN, '..', 'brio')
const TH = path.resolve(GEN, '..', '..', 'brio2', 'th')
const img = (k) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(TH, k + '.jpg')).toString('base64')
const ul = (a) => `<ul>${a.map((x) => `<li>${x}</li>`).join('')}</ul>`

// ---------------- 1. Mercado e anúncios ----------------
function marketPage(d) {
  const max = 252
  d.page('av', 'Estudo do audiovisual · 1 de 6 · Mercado e anúncios', 'Na região, anúncio de hambúrguer nasce e morre em 2 semanas', `
  <div class="mk">
    <div class="mkl">
      <div class="mkh">Os 10 anúncios de hambúrguer no ar há mais tempo na região <small>(Biblioteca de Anúncios da Meta, ativos, 13/11)</small></div>
      <table class="adt"><thead><tr><th>Anunciante</th><th>No ar há</th><th>Promessa (título)</th><th>Oferta</th><th>Prova</th><th>Chamada</th></tr></thead><tbody>
      ${ADS.map((a) => `<tr><td><b><a href="${AD(a[7])}" target="_blank" style="color:inherit">${a[0]}</a></b><small>${a[1].replace(/<[^>]+>/g, '')}</small></td><td class="dd"><span class="bar" style="width:${Math.max(3, Math.round((a[2] / max) * 64))}px"></span>${a[2]} ${a[2] === 1 ? 'dia' : 'dias'}</td><td>${a[3]}</td><td>${a[4]}</td><td>${a[5]}</td><td>${a[6]}</td></tr>`).join('')}
      </tbody></table>
      <p class="src">“—” = o criativo não abre na Biblioteca vista da nuvem; só o título e a chamada aparecem. Conferir no celular antes de gravar.</p>
    </div>
    <div class="mkr">
      <div class="kpis">${[['94', 'anúncios ativos com “hamburgueria Recife”'], ['15', 'com “burguer Camaragibe”'], ['0', 'do Brio (nunca anunciou)']].map((k) => `<div class="kp"><b>${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
      <div class="say"><h4>O que todos dizem</h4>${ul(['Preço de entrada no título: <b>“Smash R$ 17,90”</b>, “a partir de R$ 14,90”', 'A cidade no título: o <b>Sanduba Secreto</b> começou a anunciar <b>“São Lourenço – Camaragibe”</b> em 12/11', 'Prova = criador provando (Bora, Arapuca); <b>só 1 de 10</b> passa de 45 dias no ar'])}</div>
      <div class="gap"><h4>O espaço vazio (é do Brio)</h4>${ul(['<b>Ninguém prova que chega quente</b>: é a dor nº 1 do delivery e ninguém mostra', 'Ninguém mostra o <b>preço por pessoa</b> de um combo artesanal', 'Ninguém fala com a galera de São Lourenço com <b>sotaque e humor de amigo</b>'])}</div>
    </div>
  </div>`, { cls: 'avw dense' })
}

// ---------------- 2. Tendência e momento ----------------
function trendPage(d) {
  const mx = TRENDS[0][1]
  const sc = (v) => Math.max(4, Math.round((Math.log10(v * 1000) / Math.log10(mx * 1000)) * 100))
  d.page('av', 'Estudo do audiovisual · 2 de 6 · Tendência e momento', 'O que viraliza é o hambúrguer visto de dentro: a mordida, a chapa e a conta', `
  <div class="tr">
    <div class="card trc"><h3>Formatos com mais views no nicho <small>(milhões de views, escala logarítmica)</small></h3>
      ${TRENDS.map((t) => `<div class="tb"><span class="tl">${t[0]}<small>${t[2]} · TikTok</small></span><span class="tv"><i style="width:${sc(t[1])}%"></i><b>${String(t[1]).replace('.', ',')} mi</b></span></div>`).join('')}
      <p class="src">Firecrawl/ScrapeCreators (TikTok), 13/11, ordenado por views. Escolhidos pelo que mostram (vimos as capas), não pelo título.</p></div>
    <div class="trr">
      <div class="card"><h3>Já cansou</h3>${ul(['“Sextou / Terçou / Domingou”: no Brio fizeram <b>214 a 854 views</b>', '“Fomos às ruas abordar”: <b>273 views</b> no Brio', 'Foto de lanche de banco ou feita por IA (proibido no guia da marca)'])}</div>
      <div class="card"><h3>O momento</h3>
        <div class="mo">${[['20/11', 'Feriado: a galera em casa'], ['27–29/11', 'Black Friday + 1ª parcela do 13º (até 30/11)'], ['01–23/12', 'Amigo secreto e confraternizações'], ['18–20/12', '2ª parcela do 13º'], ['26/12', 'Ninguém aguenta mais a ceia']].map((m) => `<div><b>${m[0]}</b><span>${m[1]}</span></div>`).join('')}</div></div>
    </div>
  </div>`, { cls: 'avl dense' })
}

// ---------------- 3. Comunicação ----------------
const VIEWS = [['Brio Matuto em close', 2431], ['Costela', 1081], ['Terçou', 854], ['Domingou', 474], ['Ingrid monta', 324], ['O segredo', 279], ['Na rua', 273], ['Bastidor', 231], ['Toda terça', 214]]
function comPage(d) {
  d.page('av', 'Estudo do audiovisual · 3 de 6 · Comunicação', 'Quando o lanche aparece de verdade, o Brio é visto 3,5 vezes mais', `
  <div class="cm">
    <div class="card cm1"><h3>Como o Brio fala (guia da marca)</h3>
      <q>Oxe, tá vivendo errado, visse?!</q>
      <q>Chega quente e com sabor de feito na hora.</q>
      <p>Jovem, humor de amigo, gíria leve e sotaque de São Lourenço. Lanche real aberto, queijo escorrendo, lo-fi de celular. Laranja Brio e Lilita One.</p></div>
    <div class="card cm2"><h3>O que o público viu <small>(views dos últimos 9 Reels, @brioburger_br)</small></h3>
      ${VIEWS.map((w) => `<div class="wb"><span>${w[0]}</span><i style="width:${Math.round((w[1] / 2431) * 230)}px"></i><b>${w[1].toLocaleString('pt-BR')}</b></div>`).join('')}
      <div class="qs"><q>Comentários: 0 a 1 por post. O público ainda não conversa com o Brio. [Pedir ao Brio as 5 perguntas mais comuns do WhatsApp]</q></div></div>
    <div class="card cm3"><h3>Então, no vídeo</h3>${ul(['<b>Lanche na tela em até 3 s</b>; nada de abrir com fachada ou logo', 'Falar <b>pedido, galera, chega quente, pede pelo site</b>; nunca “app de entrega”', 'Pouca fala, muito desejo; quem fala é gente da casa, com sotaque', '<b>Fecho-assinatura igual em todo vídeo</b>: a tampa fecha + “Brio. Chega quente.”'])}
      <div class="avd"><b>Evitar:</b> <span>Sextou</span><span>foto de banco/IA</span><span>falar mal de concorrente</span><span>iFood</span><span>preço inventado</span></div></div>
  </div>`, { cls: 'avw dense' })
}

// ---------------- 4 e 5. Narrativa e estrutura ----------------
const FUN = [
  ['Atrair', 4, 'B2 · B3 · B5 · B8', '22 mil views · 15 indicações'],
  ['Provar', 1, 'B6', '2 mil views · pedidos da noite contados'],
  ['Quebrar objeção', 2, 'B1 · B9', '5 mil views · 10 comentários com bairro'],
  ['Converter', 3, 'B4 · B7 · B10', '20 Combos (com post 06) · 15 Vale-Brio · 10 pedidos 26/12'],
]
function narrPage(d) {
  d.page('av', 'Estudo do audiovisual · 4 e 5 de 6 · Narrativa e estrutura', 'Uma história em três atos: a galera, a caixa e a prova', `
  <div class="nr">
    <div class="chain">${[['Herói', 'A galera de 18 a 35 de São Lourenço que se junta em casa e quer um lanche que valha o dinheiro'], ['Problema', 'Pedir pra turma sai caro e chega frio, murcho, “na foto era maior”'], ['Vilão', 'O marketing <b>no automático</b>: “Sextou”, foto que não dá fome, perfil que some 15 dias'], ['Virada', 'O Brio mostra <b>de dentro</b>: a chapa, a hora no bilhete e a conta por pessoa'], ['Prova', '2.431 views no close (3,5× a média) · 5 medições reais na caixa · escolha às cegas'], ['Convite', 'Combo da Galera pelo site; Vale-Brio no amigo secreto']].map((c, i) => `<div class="ch ch${i}"><b>${c[0]}</b><span>${c[1]}</span></div>`).join('')}</div>
    <div class="acts">${[['Ato 1 · 18 a 26/11', 'Voltamos com fome', 'Perfil vivo de novo, teaser e a diária'], ['Ato 2 · 27/11 a 13/12', 'A caixa é a vitrine', 'Matuto × Costela, Black Friday, a hora no bilhete, amigo secreto'], ['Ato 3 · 14 a 31/12', 'A galera volta', '13º, indicação, “ceia de ontem, Brio de hoje”']].map((a) => `<div class="act"><small>${a[0]}</small><b>${a[1]}</b><span>${a[2]}</span></div>`).join('')}</div>
    <div class="fun">${FUN.map((f, i) => `<div class="fu fu${i}" style="width:${100 - i * 9}%"><b>${f[0]}</b><span class="fn">${f[1]} vídeo${f[1] > 1 ? "s" : ""}</span><span class="fv">${f[2]}</span><span class="fm">${f[3]}</span></div>`).join('')}</div>
    <p class="nnote">Soma das metas = metas da Estratégia: os números da tabela única de metas (Estratégia): <b>20 Combos na Black Friday, 30 Vale-Brio, 15 indicações, 1 Reel acima de 10 mil</b>. 10 estilos diferentes do catálogo, 10 modelos de roteiro diferentes.</p>
  </div>`, { cls: 'avl dense' })
}

// ---------------- vídeos ----------------
const V = [
  { c: 'B1', t: 'A hora vem no bilhete', role: 'Quebrar objeção', fmt: 'Reels · 25 s · série “Chega quente”', offer: 'Garantia da hora: saiu da chapa às [hora no bilhete]; passou de [45] min, a próxima batata é nossa', when: 'Captura de celular em entregas reais de 19 a 28/11 · publica dom 29/11, só depois de 5 medições reais', meta: '3 mil views · 10 comentários com bairro', canal: 'Orgânico; corte de 12 s guardado para quando o tráfego ligar', fala: 'Motoboy do Brio [nome], uma frase', grava: 'Celular na moto e na mão do motoboy (sem equipe na cozinha no pico); Aleffer edita',
    est: 'E28 Bastidor → contagem → resultado', mod: 'M39 Bastidor → “3·2·1” → resultado', por: 'a objeção “chega frio?” só cai com um critério medível: a hora escrita no bilhete e o tempo até a porta.',
    ref: { img: 'old_f8bb9076', url: TT('paradise_burguer_', '7521770403077934341'), net: 'TikTok', at: '@paradise_burguer_', n: '256 mil views', why: 'O motoboy vira personagem e a piada é escrita num cartaz na cena. Gente da casa + texto que pertence à cena prende mais que locução.', take: 'O texto que pertence à cena é o bilhete com a hora da chapa; o termômetro infravermelho aponta para a caixa, nunca para o lanche.' },
    narr: 'Bastidor → contagem → resultado (série com título fixo “Chega quente”)',
    st: ['O bilhete em close: “Saiu da chapa às 19h41”', 'Chapa → caixa fechada → moto, com a hora na tela', '“3·2·1”: a porta abre às [hora]; termômetro na tampa da caixa', '“Passou de [45] min, a próxima batata é nossa. Pede pelo site.”'],
    sb: [['0–3 s', 'Mão escreve a hora no bilhete e cola na caixa', 'Macro, câmera na mão', '“Saiu da chapa agora.”', 'Saiu da chapa às [19h41]'], ['3–9 s', 'Caixa fechada entra na bag da moto', 'Close', '(som da bag)', 'a caixa vai fechada'], ['9–15 s', 'Moto na rua de São Lourenço', 'Celular preso na moto', '(som da rua)', '[19h52] · na rota'], ['15–21 s', '“3·2·1”: porta abre; termômetro infravermelho apontado para a tampa da caixa', 'Close da tela do termômetro', 'Motoboy: “[XX] minutos.”', 'Chegou às [hora] · caixa a [XX] °C'], ['21–25 s', 'Tampa fecha devagar', 'Close, luz quente', '(som da tampa)', 'Passou de [45] min? A próxima batata é nossa']],
    ideas: [['Bairro da vez', 'Cada episódio num bairro citado nos comentários.'], ['O pior trajeto', 'A entrega mais longa da cidade, com o relógio na tela.'], ['Só o bilhete', 'Versão de 8 s: a hora escrita e a hora da porta.']],
    ad: ['Curiosidade: “A hora do teu Brio vem escrita”', 'Dor: “Cansou de lanche que chega frio?”', 'Prova: “Passou de [45] min? A batata é nossa.”'] },
  { c: 'B2', t: 'POV: o primeiro pedido da noite', role: 'Atrair', fmt: 'Reels/TikTok · 35 s · POV', offer: 'Tese + Combo da Galera (pedido que abre a noite)', when: 'Captura entre 02 e 04/12, 17h30, na abertura (antes do pico; o Combo da Galera já existe) · publica dom 06/12', meta: '<b>10 mil views</b> (o Reel do período) · 60 salvamentos', canal: 'Orgânico; candidato nº 1 a anúncio de frio', fala: 'Chapeiro do Brio [nome], pensando alto', grava: 'Aleffer; celular no peito do chapeiro (grande-angular)',
    est: 'E17 POV câmera viva + fecho de pôster', mod: 'M11 Cena com relógio', por: 'o ponto de vista do chapeiro mostra o que o cliente nunca vê; o relógio dá urgência e torna a cozinha uma história.',
    ref: { img: 'tt_7553437494302248204', url: TT('jordanburguers', '7553437494302248204'), net: 'TikTok', at: '@jordanburguers', n: '19,7 mi views · 16,8 mil compartilhamentos', why: 'POV do primeiro pedido da semana: a câmera é o olho de quem monta, e cada passo tem som. O público fica até o pedido sair.', take: 'Hora real na tela, sotaque no pensamento alto e o fecho-assinatura do Brio (P&B + laranja + “Pede pelo site”).' },
    narr: 'POV com relógio: “São 18h02 e entrou o primeiro pedido”',
    st: ['“18h02. Entrou o primeiro pedido: Combo da Galera, Tiúma.”', 'Pão na chapa, a carne estala, falta a maionese da casa', 'A caixa fecha com 4 Brios e o bilhete escrito à mão', 'Fecho P&B: “Pede pelo site” e a cartela laranja'],
    sb: [['0–3 s', 'Celular toca com o pedido na tela [site]', 'POV, mãos do chapeiro', '“18h02. Primeiro pedido.”', 'POV: o primeiro pedido da noite'], ['3–12 s', 'Quatro carnes na chapa, prensa, estalo', 'POV de cima', '“4 Brios. É galera.”', 'Combo da Galera'], ['12–20 s', 'Queijo derretendo, maionese caindo da bisnaga', 'Macro', '(som)', 'maionese da casa'], ['20–29 s', 'Caixa montada, bilhete “Bom apetite, [bairro]”', 'POV', '“Vai quente, visse?”', '18h11 · saiu'], ['29–35 s', 'Fecho: imagem vira P&B, só o laranja fica', 'Plano parado', '(som da tampa)', 'Brio. Chega quente. · Pede pelo site']],
    ideas: [['O pedido mais estranho', 'O POV do pedido mais curioso da semana (com autorização do cliente).'], ['Contra o relógio', 'Cronômetro na tela do pedido à porta.'], ['O último pedido', 'O fim da noite, chapa limpa, o chapeiro come o dele.']],
    ad: ['Curiosidade: “Você nunca viu teu pedido daqui”', 'Dor: “Pediu e veio montado de qualquer jeito?”', 'Prova: “[x] minutos da chapa à caixa.”'] },
  { c: 'B3', t: 'A mordida', role: 'Atrair', fmt: 'Reels · 12 s · sem fala', offer: 'Tese (desejo) → Combo da Galera', when: 'Diária 26/11, 13h · publica ter 01/12', meta: '5 mil views · taxa de quem assiste até o fim > 40%', canal: 'Orgânico + stories em loop; corte de 6 s para o tráfego', fala: 'Ninguém; só o som', grava: 'Ellcazo (câmera, lente macro, 120 fps)',
    est: 'E19 Curta cinematográfico (realismo contido)', mod: 'M17 Tese em palavras sem fala', por: 'gastronomia vende por desejo: pouca fala, som de mordida e slow motion fazem a pessoa sentir antes de pensar.',
    ref: { img: 'tt_7504074126970096951', url: TT('carmelitaevilim', '7504074126970096951'), net: 'TikTok', at: '@carmelitaevilim', n: '69,5 mi views · 1 mi compartilhamentos', why: 'Só a mordida e o som, sem explicação: o cérebro “sente” o lanche (neurônio-espelho). É o formato mais visto do nicho no ano.', take: 'Sem rosto de influenciadora: só mão, Brio Matuto (o post que mais rendeu, 2.431) e som de cinema; 3 palavras na tela.' },
    narr: 'Tese sem fala: pergunta → “mas” → solução → marca',
    st: ['Brio Matuto em pé, queijo escorrendo em câmera lenta', '“Fome de quê?” em 2 palavras na tela', 'A mordida em 120 fps com o estalo do pão', '“Brio. Chega quente.” + fecho-assinatura'],
    sb: [['0–2 s', 'Brio Matuto aberto, queijo escorrendo', 'Macro, slow motion', '(som grave)', '—'], ['2–5 s', 'Mão pega o lanche', 'Close lateral', '(estalo do pão)', 'Fome de quê?'], ['5–8 s', 'A mordida, o molho cai', 'Close, 120 fps', '(mordida, sem música)', '—'], ['8–10 s', 'O lanche mordido, vapor', 'Macro', '(respiro)', 'Isso.'], ['10–12 s', 'Tampa fecha', 'Plano parado', '(tampa)', 'Brio. Chega quente.']],
    ideas: [['Uma mordida por Brio', 'Série: Matuto, Costela, Pepperoni; um por semana.'], ['Ao contrário', 'O vídeo em reverso: o lanche se refaz.'], ['A mordida da galera', '4 mãos, 4 mordidas, no mesmo segundo.']],
    ad: ['Curiosidade: “12 segundos. Aguenta?”', 'Dor: “Tá com fome agora?”', 'Prova: “O Brio que mais pedem.”'] },
  { c: 'B4', t: 'Quanto deu pra cada?', role: 'Converter', fmt: 'Reels · 25 s · UGC da galera', offer: '<b>Combo da Galera</b>: R$ [x/4] pra cada, Pix dividido, 5º Brio por R$ 1 (27 a 29/11)', when: 'Diária 26/11, 14h · publica sex 27/11, 11h', meta: '3 mil views · junto com o post 06: <b>20 Combos</b> na Black Friday', canal: 'Orgânico + stories com link; é o anúncio principal quando o tráfego ligar', fala: 'A galera (4 amigos, [autorização])', grava: 'Um amigo no celular (estilo UGC); Ellcazo dirige',
    est: 'E22 Nativo de feed (UGC)', mod: 'M48 Tendência com preço', por: 'o preço por pessoa dito por quem racha a conta quebra o “é caro” na mesma cena; o Pix dividido e o 5º Brio por R$ 1 são a oferta dentro da piada.',
    ref: { img: 'tt_7609366915827404052', url: TT('expresscombos_', '7609366915827404052'), net: 'TikTok', at: '@expresscombos_', n: '168 mil views', why: '“O combo serve 4 pessoas: R$ 27,50 pra cada” escrito sobre o combo aberto. O preço por pessoa é o gancho e a prova.', take: 'O atendente manda um QR de Pix por amigo; o 5º amigo chega atrasado e paga R$ 1. Preço real só depois da decisão 1.' },
    narr: 'UGC: a pergunta da conta abre, o combo responde',
    st: ['Alguém pergunta: “Quanto deu pra cada?”', 'A caixa abre: 4 Brios, 2 fritas, refri', 'Chegam 4 QRs de Pix, um por amigo: R$ [x/4]; o atrasado chega e paga R$ 1 pelo 5º Brio', '“Só na Black Friday. Pede pelo site.” + fecho-assinatura'],
    sb: [['0–3 s', 'Sofá, 4 amigos, um com o celular da conta', 'Selfie, plano aberto', '“Quanto deu pra cada?”', 'Quanto deu pra cada?'], ['3–9 s', 'A caixa do Combo abre na mesa', 'De cima, celular', '“Oxe, vem tudo isso?”', '4 Brios · 2 fritas · refri 2 L'], ['9–16 s', 'Mãos atacando; risada', 'Câmera na mão', '(risada, som ambiente)', '—'], ['16–21 s', '4 QRs de Pix no celular; o 5º amigo entra pela porta', 'Celular filmado', '“R$ [x/4] pra cada. E tu, R$ 1.”', 'o 5º Brio por R$ 1'], ['21–25 s', 'Tampa fecha', 'Plano parado', '(tampa)', 'Combo da Galera · 27 a 29/11 · Pede pelo site']],
    ideas: [['O atrasado', 'Só o 5º amigo chegando, R$ 1 na mão.'], ['2, 4 ou 6', 'Três galeras de tamanhos diferentes, o mesmo cálculo.'], ['O amigo que não come', 'Humor: um só bebe refri e quer pagar menos.']],
    ad: ['Curiosidade: “Quanto custa juntar a galera?”', 'Dor: “Pedido pra 4 saiu caro de novo?”', 'Prova: “R$ [x/4] pra cada. O 5º, R$ 1.”'] },
  { c: 'B5', t: 'Matuto × Costela às cegas', role: 'Atrair', fmt: 'Reels · 35 s · rua', offer: 'Black Friday: a galera escolhe o Brio da Black Friday', when: 'Captura de celular qui 19/11, 16h, na rua · publica sáb 21/11', meta: '4 mil views · 40 comentários com palpite', canal: 'Orgânico', fala: 'Ingrid (Peformake) pergunta; gente na rua [autorização]', grava: 'Aleffer (celular, microfone de lapela)',
    est: 'E2 Documental mínimo', mod: 'M13 Explicador em perguntas encadeadas, fechando em A ou B', por: 'escolher às cegas entre dois Brios dá voz à galera e decide o lanche da Black Friday; ninguém sabe o resultado antes.',
    ref: { img: 'tt_7667768910652951826', url: TT('luck_dias', '7667768910652951826'), net: 'TikTok', at: '@luck_dias', n: '252 mil views', why: 'Na comparação às cegas o público palpita nos comentários antes do resultado.', take: 'Sem rival e sem resultado combinado: Matuto × Costela, placar real; se empatar, os dois entram na Black Friday.' },
    narr: 'Escolha às cegas com placar e revelação no fim',
    st: ['“A ou B?” na rua, venda nos olhos', 'Pessoas provam os dois, reações reais', 'Placar real na tela', '“O escolhido é o Brio da Black Friday.” + fecho-assinatura'],
    sb: [['0–3 s', 'Pessoa de olhos vendados com dois Brios sem embalagem', 'Plano médio, rua', 'Ingrid: “A ou B?”', 'Matuto ou Costela?'], ['3–15 s', 'Provas e reações', 'Close nas caras', '(reações reais)', 'placar: A [x] · B [y]'], ['15–24 s', 'Quem escolheu explica com as próprias palavras', 'Plano médio', '[fala real, sem roteiro]', '—'], ['24–31 s', 'Tira a venda; mostra qual era qual', 'Close', '(reação)', 'O escolhido: [resultado real]'], ['31–35 s', 'Tampa fecha', 'Plano parado', '(tampa)', 'Brio da Black Friday · 27/11']],
    ideas: [['Só o placar', 'Versão de 15 s com as reações e o placar.'], ['A galera vota', 'Enquete nos stories decide o desempate.'], ['Pai e filho', 'Duas gerações escolhem; humor de família.']],
    ad: ['Curiosidade: “Matuto ou Costela? Às cegas”', 'Dor: “Não sabe qual pedir?”', 'Prova: “A galera escolheu o [resultado].”'] },
  { c: 'B6', t: 'Daria conta? Black Friday na chapa', role: 'Provar', fmt: 'Reels · 30 s · no beat', offer: 'Combo da Galera (Black Friday) + prova de operação', when: 'Grava sex 27/11 à noite (celular) · publica sáb 28/11', meta: '2 mil views · contar os pedidos da noite (sem meta escrita)', canal: 'Orgânico + stories ao vivo durante a noite', fala: 'Ninguém; contador na tela', grava: 'Celular fixo na parede, ligado antes do serviço; ninguém da equipe na cozinha no pico',
    est: 'E29 Edit de rolê no beat', mod: 'M44 Diário (da noite)', por: 'mostrar a cozinha aguentando o pico prova capacidade e cria urgência (“a galera tá pedindo”) sem dizer “compre”.',
    ref: { img: 'tt_7566864589409848577', url: TT('povhamburgueiro', '7566864589409848577'), net: 'TikTok', at: '@povhamburgueiro', n: '12,3 mi views', why: '“Sozinho na cozinha, você daria conta?” é um desafio: o público torce e conta os pedidos junto.', take: 'Contador de pedidos real na tela, cortes no beat e o pico da Black Friday como “fase final do jogo”.' },
    narr: 'Diário da noite com contador: 18h → 23h',
    st: ['“Black Friday. Daria conta?” e o contador em 0', 'Chapa cheia, cortes no beat, contador subindo', 'Pico às 21h: [x] pedidos', '“Amanhã tem mais. Só até domingo.” + fecho'],
    sb: [['0–3 s', 'Chapa vazia, contador “0”', 'Fixo na parede', '(beat começa)', 'Black Friday. Daria conta?'], ['3–12 s', 'Carnes, queijo, caixas, mãos', 'Fixo + closes no beat', '(beat)', 'pedidos: 12 → 47'], ['12–20 s', 'Motos saindo, fila de caixas', 'Câmera na mão', '(beat sobe)', '21h · [x] pedidos'], ['20–26 s', 'Chapa sendo limpa, equipe comemora', 'Plano aberto', '(respiro)', '[total] pedidos'], ['26–30 s', 'Tampa fecha', 'Parado', '(tampa)', 'Até domingo · Pede pelo site']],
    ideas: [['Contador ao vivo', 'Stories a cada hora com o número.'], ['Quem cansa primeiro', 'A equipe aposta quem aguenta mais.'], ['O pedido 100', 'O centésimo pedido ganha um bilhete especial.']],
    ad: ['Curiosidade: “Quantos pedidos cabem numa noite?”', 'Dor: “Medo de demorar na Black Friday?”', 'Prova: “[x] pedidos, todos quentes.”'] },
  { c: 'B7', t: 'O amigo secreto da firma', role: 'Converter', fmt: 'Reels · 35 s · esquete', offer: '<b>Vale-Brio do Amigo Secreto</b> (venda 01 a 23/12; vale 90 dias)', when: 'Diária 26/11, 14h40 · publica qui 03/12', meta: '3 mil views · <b>15 Vale-Brio</b>', canal: 'Orgânico + envio no WhatsApp para a lista de clientes (por um humano)', fala: 'Equipe do Brio ou amigos da casa (3 pessoas) [autorização]', grava: 'Ellcazo',
    est: 'E18 Esquete encenado', mod: 'M21 Dor no exagero', por: 'todo mundo já ganhou um presente ruim; a cena exagerada é compartilhável e o Vale-Brio entra como a salvação, sem parecer anúncio.',
    ref: { img: 'tt_7572309580026268936', url: TT('gatoironico', '7572309580026268936'), net: 'TikTok', at: '@gatoironico', n: '2,75 mi views · 55,7 mil compartilhamentos', why: '“Amigo secreto na empresa”: a cena que todo mundo vive em dezembro, contada em humor. É mandado pro grupo da firma.', take: 'A virada é o Vale-Brio: o único presente que ninguém devolve. Fecho em dois tempos: oferta curta e volta à piada.' },
    narr: 'Dor no exagero → solução na linguagem da cena → volta à piada',
    st: ['“Meu amigo secreto é…” e a sala congela', 'Presentes ruins em sequência: meia, caneca, chaveiro', 'O último abre o Vale-Brio; a sala comemora', '“Vale-Brio. Até 23/12.” e a volta: alguém tenta trocar a meia pelo vale'],
    sb: [['0–3 s', 'Roda de amigo secreto; alguém com papel na mão', 'Plano aberto fixo', '“Meu amigo secreto é…”', 'Amigo secreto da firma'], ['3–14 s', 'Meia, caneca, chaveiro; caras de decepção', 'Cortes secos', '“Ah… obrigado.” (x3)', 'R$ 30 jogados fora'], ['14–22 s', 'Envelope laranja: Vale-Brio; todos levantam', 'Close no vale', '“É Brio?!”', 'Vale-Brio'], ['22–29 s', 'Locução curta sobre o vale na mesa', 'Close', '“[R$ 40] ou [R$ 70]. Vale 90 dias.”', 'Garante até 23/12'], ['29–35 s', 'Alguém tenta trocar a meia pelo vale', 'Plano aberto', '“Troca comigo?” “Nem a pau.”', 'Brio. Chega quente.']],
    ideas: [['O amigo que já sabe', 'Todo ano dá caneca; este ano surpreende.'], ['Família × firma', 'Duas rodas de amigo secreto, o mesmo vale.'], ['O vale escondido', 'O vale dentro de uma caixa enorme.']],
    ad: ['Curiosidade: “O presente que ninguém devolve”', 'Dor: “Tirou alguém difícil?”', 'Prova: “[x] vales já entregues.”'] },
  { c: 'B8', t: 'Quem te deve um Brio?', role: 'Atrair', fmt: 'Reels · 30 s · rosto + cartaz', offer: '<b>Indicação</b> com código BRIO-XXX do bilhete: os dois ganham [mimo] no pedido pelo site', when: 'Diária 26/11, 15h20 · publica sex 11/12', meta: '3 mil views · <b>15 indicações</b> (marcações que viram pedido)', canal: 'Orgânico; repost nos stories com caixinha de marcação', fala: '[Dono(a) do Brio] ou Ingrid, com sotaque', grava: 'Ellcazo',
    est: 'E16 Rosto ↔ cartaz', mod: 'M7 Lista com progresso visível', por: 'uma lista de 3 “tipos de devedor” é identificação pura; cada cartaz é uma pausa de humor e o fim pede a marcação com motivo.',
    ref: { img: 'old_f313078c', url: TT('vivinarua', '7675868329680178450'), net: 'TikTok', at: '@vivinarua', n: '103 mil views · 1,9 mil compartilhamentos', why: 'Criadora do Recife fecha com “marca aqui quem precisa ver”: o pedido de marcação com motivo multiplica o alcance.', take: 'O motivo é a “dívida”: cada tipo de devedor vira um cartaz laranja; a marcação vira pedido com mimo para os dois.' },
    narr: 'Lista 01/03 → 03/03 com cartazes de humor e marcação no fim',
    st: ['“Todo mundo tem alguém que te deve um Brio.”', '01 “Depois eu te pago” · 02 “O que sumiu” · 03 “O que só come”', '“Marca ele e passa teu código BRIO-XXX do bilhete. Pediu pelo site com o código, os dois ganham.”', 'Fecho: nota promissória carimbada “PAGO”'],
    sb: [['0–3 s', 'Rosto, Brio na mão', 'Primeiro plano', '“Tu tem alguém que te deve um Brio.”', 'Quem te deve um Brio?'], ['3–10 s', 'Cartaz laranja 01', 'Cartela cheia', '“O ‘depois eu te pago’.”', '01/03'], ['10–17 s', 'Cartaz 02 e 03, voltando ao rosto entre eles', 'Cartela + rosto', '“O que sumiu. E o que só come.”', '02/03 · 03/03'], ['17–25 s', 'Rosto, aponta para baixo', 'Primeiro plano', '“Passa o BRIO-XXX do teu bilhete. Pediu com o código, os dois ganham.”', 'Marca o devedor'], ['25–30 s', 'Carimbo “PAGO” na nota; tampa fecha', 'Close', '(carimbo, tampa)', 'Brio. Chega quente.']],
    ideas: [['A cobrança', 'Liga para o devedor no viva-voz [autorização].'], ['O código no bilhete', 'Close no bilhete com o BRIO-XXX: “passa esse código pro devedor”.'], ['A nota promissória', 'Arte da nota para imprimir e mandar.']],
    ad: ['Curiosidade: “Quem te deve um Brio?”', 'Dor: “Aquele amigo que nunca paga”', 'Prova: “[x] dívidas pagas essa semana.”'] },
  { c: 'B9', t: 'A maionese que ninguém vê', role: 'Quebrar objeção', fmt: 'Reels · 20 s · só mãos', offer: 'Tese (artesanal justifica o preço) → mimo do 1º pedido', when: 'Diária 26/11, 13h30 · publica qua 09/12', meta: '2 mil views · 30 salvamentos', canal: 'Orgânico; corte de 8 s para stories', fala: 'Quem faz a maionese, uma frase', grava: 'Ellcazo (parede laranja, luz dura)',
    est: 'E32 Unboxing de luz dura', mod: 'M30 Doc de campo “o tesouro que ninguém vê”', por: 'o cliente nunca vê a maionese sendo feita; só mãos e luz dura dão cara de produto premium sem entregar a receita.',
    ref: { img: 'old_348acb7f', url: TT('braseiroburguerposse', '7681116129909083413'), net: 'TikTok', at: '@braseiroburguerposse', n: '1,5 mi views', why: 'A bisnaga verde caindo no lanche com a promessa “a melhor da sua vida” transforma um detalhe em motivo de pedido.', take: 'Parede Laranja Brio e sombra de persiana; o segredo fica guardado (“o resto é nosso”).' },
    narr: 'O tesouro escondido: o detalhe que justifica o preço',
    st: ['“Tu nunca viu isso.” Pote fechado sob luz dura', 'Mãos batendo, textura, cor', '“O resto da receita é nosso.” A bisnaga no lanche', 'Fecho-assinatura + “1º pedido pelo site: vai em dobro”'],
    sb: [['0–3 s', 'Pote fechado na bancada laranja', 'Plano fixo, luz dura', '“Tu nunca viu isso.”', 'A maionese que ninguém vê'], ['3–9 s', 'Mãos batendo; textura', 'Close lateral', '(som do batedor)', 'feita aqui, todo dia'], ['9–14 s', 'Colher levanta, ponto firme', 'Macro', '“O resto da receita é nosso.”', '—'], ['14–17 s', 'Bisnaga cai no Brio', 'De cima', '(som)', '1º pedido pelo site: maionese em dobro'], ['17–20 s', 'Tampa fecha', 'Parado', '(tampa)', 'Brio. Chega quente.']],
    ideas: [['A batata mergulha', 'Sem fala: a batata entra no pote, som crocante.'], ['Adivinha o ingrediente', 'Comentários chutam; ninguém confirma.'], ['Maionese × de pote', 'Antes e depois na mesma colher.']],
    ad: ['Curiosidade: “O que vai na maionese do Brio?”', 'Dor: “Maionese de saquinho de novo?”', 'Prova: “Feita aqui, todo dia.”'] },
  { c: 'B10', t: 'Ceia de ontem, Brio de hoje', role: 'Converter', fmt: 'Reels · 20 s · antes e depois', offer: 'Pedido de 26/12 + resgate do Vale-Brio', when: 'Diária 26/11, 15h45 (inserts) · publica sáb 26/12, 11h', meta: '2 mil views · 10 pedidos em 26/12 com “vi no Instagram”', canal: 'Orgânico + stories o dia todo', fala: 'Ninguém; legenda de 1 linha', grava: 'Ellcazo (inserts) e montagem do Aleffer',
    est: 'E8 Antes e depois', mod: 'M37 Falso começo', por: 'começa como vídeo emocionante de Natal e quebra com o humor da sobra de peru; o contraste vende o pedido do dia seguinte.',
    ref: { img: 'tt_7588667186932174100', url: TT('mootburger.smash', '7588667186932174100'), net: 'TikTok', at: '@mootburger.smash', n: '319 mil views', why: '“Trabalhamos igual gente grande no Natal”: a hamburgueria entra no assunto da data com humor e mostra a operação.', take: 'O “antes” é a travessa de sobra da ceia; o “depois” é a caixa do Brio, mesmo enquadramento, match cut.' },
    narr: 'Falso começo (clima de Natal) → quebra → antes × depois',
    st: ['Música de Natal, mesa posta: parece comercial emocionante', 'Corte seco: 26/12, a mesma travessa, peru frio de novo', 'Match cut: no lugar da travessa, a caixa do Brio abrindo', '“26/12: hoje ninguém cozinha. Pede pelo site.”'],
    sb: [['0–4 s', 'Mesa de Natal, luz quente', 'Plano lento', '(música de Natal)', '24/12'], ['4–8 s', 'A mesma travessa, peru frio, garfo cutucando', 'Mesmo enquadramento', '(a música para)', '26/12'], ['8–13 s', 'Match cut: caixa do Brio abre no lugar', 'Mesmo enquadramento', '(tampa abrindo)', 'antes | depois'], ['13–17 s', 'Mordida', 'Close', '(mordida)', 'Hoje ninguém cozinha'], ['17–20 s', 'Tampa fecha', 'Parado', '(tampa)', 'Pede pelo site · Vale-Brio vale até 31/01']],
    ideas: [['Sobras × Brio', 'Três sobras de ceia, uma caixa do Brio.'], ['A família discute', 'Quem esquenta a sobra × quem pede Brio.'], ['Réveillon', 'Mesma ideia em 01/01: “ressaca pede Brio”.']],
    ad: ['Curiosidade: “O que comer no dia 26?”', 'Dor: “Peru de novo?”', 'Prova: “A hora da chapa vem no bilhete.”'] },
]
const RC = { Atrair: 'r0', Provar: 'r1', 'Quebrar objeção': 'r2', Converter: 'r3' }

function mapPage(d) {
  d.page('av', `${BR} · Os 10 vídeos e o calendário`, 'Cada vídeo serve a uma oferta, tem estilo, data e meta', `
  <table class="mp"><thead><tr><th></th><th>Vídeo</th><th>Papel</th><th>Estilo · modelo</th><th>Oferta</th><th>Publica</th><th>Meta</th></tr></thead><tbody>
  ${V.map((v) => `<tr><td><span class="code">${v.c}</span></td><td><b>${v.t}</b></td><td><span class="rl ${RC[v.role]}">${v.role}</span></td><td class="em">${v.est.split(' ')[0]} · ${v.mod.split(' ')[0]}</td><td>${v.offer}</td><td>${v.when.split('·').pop().replace('publica', '').trim()}</td><td>${v.meta}</td></tr>`).join('')}
  </tbody></table>`, { cls: 'avw dense mppg' })
}

function scopePage(d) {
  d.page('av', 'Estudo do audiovisual · 6 de 6 · Escopo', 'Uma diária de 3 h antes do serviço e quatro capturas de celular', `
  <div class="sc">
    <div class="card"><h3>Diária Ellcazo · qui 26/11 · 13h às 16h</h3>
      <p class="dsub">Antes do serviço (o pico do Brio é à noite). 6 vídeos, no máximo.</p>
      ${[['13h', 'B3 a mordida'], ['13h30', 'B9 a maionese (parede laranja, luz dura)'], ['14h', 'B4 com a galera + fotos do Combo'], ['14h40', 'B7 esquete do amigo secreto'], ['15h20', 'B8 rosto + cartazes'], ['15h45', 'B10 inserts da ceia']].map((s) => `<div class="slot"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
    <div class="card"><h3>Capturas de celular</h3>
      <p class="dsub">Sem diária; o Aleffer edita em até 24 h. Nenhuma equipe dentro da cozinha no pico.</p>
      ${[['Qui 19/11', 'B5: Matuto × Costela às cegas, na rua, 16h'], ['19 a 28/11', 'B1: 5 medições reais na caixa, celular do motoboy'], ['02 a 04/12', 'B2: POV na abertura, 17h30'], ['Sex 27/11', 'B6: celular fixo na parede, ligado antes do serviço']].map((s) => `<div class="slot"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}
      <p class="dnote">Antes: termômetro infravermelho (mede a caixa, nunca o lanche), bilhetes com campo de hora, autorização de imagem de todos.</p></div>
    <div class="card"><h3>Quem faz</h3>
      <div class="ppl">${[['Vinícius', 'Ellcazo: dirige e grava a diária'], ['Aleffer', 'capturas de celular e edição em 24 h'], ['Ingrid', 'pergunta no B5; stories'], ['Higor', 'cartazes do B8 e capas'], ['Brio', 'chapeiro, motoboy e quem faz a maionese [nomes]'], ['Galera', '4 ou 5 amigos da casa no B4 e B7 [autorização]']].map((p) => `<div><b>${p[0]}</b><span>${p[1]}</span></div>`).join('')}</div>
      <p class="dnote">Cabe: 10 vídeos (6 na diária + 4 no celular) e cortes de 6 a 12 s para stories. Não cabe: vlog diário.</p></div>
  </div>`, { cls: 'avl dense' })
}

const FOTOS = [
  ['O lanche (desejo)', [['tt_7612744885656931598', 'Close na mão, luz natural, queijo à mostra', '@keilapacheco · 49,8 mi', TT('keilapacheco', '7612744885656931598')], ['tt_7668538632562724103', 'Molho escorrendo, a pessoa reage', '@clarinhaqrz · 994 mil', TT('clarinhaqrz', '7668538632562724103')], ['old_fbda04b5', 'Corte mostrando a carne por dentro', '@cadeacomida · 34,9 mil', TT('cadeacomida', '7668389871442005266')]]],
  ['O combo (venda)', [['tt_7672796894627745032', 'Caixa aberta de cima, montagem ao vivo', '@bettasiilva · 2,2 mi', TT('bettasiilva', '7672796894627745032')], ['tt_7647723939598290183', 'Caixa com 6 lanches e os molhos', '@casaldocombo · 114 mil', TT('casaldocombo', '7647723939598290183')], ['tt_7525223608789044486', 'Combo triplo, batata espalhada, cor quente', '@bg.burger · 394 mil', TT('bg.burger', '7525223608789044486')]]],
  ['A casa (gente)', [['old_74fefddc', 'Chapa e chapeiro em ação, à noite', '@agarage.burguer', TT('agarage.burguer', '7424257005956746502')], ['old_a648a160', 'Motoboy saindo à noite', '@mono.hamburgueria', TT('mono.hamburgueria', '7571199131159498005')], ['old_f2b80fa9', 'Galera dividindo na mesa', '@teshinohara · 53 mil', TT('teshinohara', '7694408968919076102')]]],
]
function photoPage(d) {
  d.page('av', `${BR} · Gravação · Referências de foto`, 'O que fotografar e enquadrar na diária', `
  <div class="fotos">${FOTOS.map(([g, L]) => `<div class="fg"><h3>${g}</h3><div class="fr3">${L.map((f) => `<a class="ft" href="${f[3]}" target="_blank"><img src="${img(f[0])}" alt=""><span>${f[1]}</span><small>${f[2]}</small></a>`).join('')}</div></div>`).join('')}</div>`, { cls: 'avw fotopg' })
}

function videoPages(d) {
  V.forEach((v, k) => {
    const cls = k % 2 === 0 ? 'avw' : 'avl'
    d.page('av', '', '', `
    <div class="vp">
      <a class="phone" href="${v.ref.url}" target="_blank"><img src="${img(v.ref.img)}" alt=""><span class="play">▶ Assistir no ${v.ref.net}</span></a>
      <div class="vmain">
        <div class="bname">${BR} · vídeo ${k + 1} de ${V.length} · 1/2</div>
        <div class="vtop"><span class="code">${v.c}</span><span class="rl ${RC[v.role]}">${v.role}</span><span class="selo">${v.fmt}</span></div>
        <h1 class="vh">${v.t}</h1>
        <div class="why"><b>Por que a referência funciona</b> <a class="src" href="${v.ref.url}" target="_blank">${v.ref.at} · ${v.ref.n}</a><p>${v.ref.why}</p><p class="tk"><b>No Brio →</b> ${v.ref.take}</p></div>
        <div class="emrow"><b>${v.est}</b><span>+</span><b>${v.mod}</b><em>${v.por}</em></div>
        <div class="facts">${[['Oferta', v.offer], ['Quando', v.when], ['Meta', v.meta], ['Onde roda', v.canal], ['Quem fala', v.fala], ['Quem grava', v.grava]].map((f) => `<div><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div>
        <div class="story"><div class="sh">Storytelling · ${v.narr}</div>${['Gancho', 'Conflito', 'Virada', 'Chamada'].map((s, i) => `<div class="sr"><b>${s}</b><span>${v.st[i]}</span></div>`).join('')}</div>
      </div>
    </div>`, { cls: cls + ' vpg vpa' })
    d.page('av', `${v.c} · ${v.t} · 2/2`, 'Storyboard cena a cena', `
    <div class="sbw">${v.sb.map((s, i) => `<div class="fr"><div class="fh"><span>${i + 1}</span><b>${s[0]}</b></div><div class="scr"><small>${s[2]}</small><em>${s[4]}</em></div><div class="fx"><small>Aparece</small>${s[1]}</div><div class="fx fl2"><small>Fala / som</small>${s[3]}</div></div>`).join('')}</div>
    <div class="vb">
      <div class="ideas">${v.ideas.map((x, i) => `<div class="idea"><b>Ideia ${'ABC'[i]}</b><h4>${x[0]}</h4><p>${x[1]}</p></div>`).join('')}</div>
      <div class="adv"><b>Versão anúncio · 3 ganchos para testar</b>${v.ad.map((a) => `<span>${a}</span>`).join('')}</div>
    </div>`, { cls: (k % 2 === 0 ? 'avl' : 'avw') + ' dense sbpg' })
  })
}

const CSS = fs.readFileSync(path.join(GEN, 'brio_av.css'), 'utf8').replace('</style>', `
.emrow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:-2px 0 10px;font-size:12.6px;line-height:1.3}
.emrow b{background:#B5E61D;border:1.5px solid #0A0A0A;border-radius:999px;padding:3px 10px;font:800 12px Inter}
.avl .emrow b{background:#fff}.emrow em{font-style:normal;flex-basis:100%;opacity:.85}
.mp td.em{font:800 12px Inter;white-space:nowrap}
.vpa .why{margin-bottom:8px;font-size:14px}.vpa .facts{margin-bottom:9px}.vpa .facts>div{font-size:13.2px;padding:6px 9px}.vpa .sr{font-size:13.8px}
.vpa .vmain h1.vh{font-size:29px}
.gap{background:#fff!important;color:#0A0A0A!important;border-left:10px solid #B5E61D!important}.gap h4{color:#0A0A0A!important}
.act{background:#fff!important;color:#0A0A0A!important;border:2px solid #0A0A0A}.act small{color:#0A0A0A!important}.act span{opacity:.85}
.fu3{background:#B5E61D!important;color:#0A0A0A!important}
.ch2{background:#B5E61D!important;color:#0A0A0A!important}.ch2 b{color:#0A0A0A!important}
.story{background:#fff!important;color:#0A0A0A!important}.avl .story{background:#F3FBDA!important}.sh{color:#0A0A0A!important}.sr b{color:#0A0A0A!important}
.fh{background:#B5E61D!important;color:#0A0A0A!important;border-bottom:2px solid #0A0A0A}.fh b{color:#0A0A0A!important}
.scr{background:#F3FBDA!important;border:2px dashed #0A0A0A!important}.scr em{color:#0A0A0A!important;background:#fff!important;border:1.5px solid #0A0A0A}
.dnote,.sc .dnote{background:#fff!important;color:#0A0A0A!important;border:2px dashed #0A0A0A!important}
.r3{background:#fff!important;color:#0A0A0A!important;border-width:2px!important}
.mp th{background:#B5E61D!important;color:#0A0A0A!important}.adt th{background:#B5E61D!important;color:#0A0A0A!important}
</style>`)

const a = Doc(BR, 'Audiovisual')
avCover(a, BR, {})
a.pages[0] = a.pages[0].replace('Conteúdo de gravação', 'Planejamento de audiovisual').replace('Novembro<br>e Dezembro', 'A caixa é<br>a vitrine').replace('12/11 a 31/12/2026</div>', '12/11 a 31/12/2026 · 10 vídeos · 1 diária</div>')
marketPage(a)
trendPage(a)
comPage(a)
narrPage(a)
scopePage(a)
mapPage(a)
photoPage(a)
videoPages(a)
fs.writeFileSync(path.join(OUT, 'audiovisual.html'), html(`Planejamento de audiovisual ${BR}`, a.pages).replace('</head>', CSS + '</head>'))
console.log('audiovisual', a.pages.length)
module.exports = { V }
