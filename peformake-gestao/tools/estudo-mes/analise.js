// Páginas de análise de Instagram e mercado (2 por marca)
module.exports = function ({ page, ref }) {
  const IG = 'https://www.instagram.com/p/'
  const AD = 'https://www.facebook.com/ads/library/?id='
  const bars = (posts) => {
    const max = Math.max(...posts.map((p) => p[1]))
    const best = max, worst = Math.min(...posts.map((p) => p[1]))
    return `<div class="chart">${posts.map((p) => `<a class="col ${p[1] === best ? 'best' : ''} ${p[1] === worst ? 'worst' : ''}" href="${IG}${p[3]}/" target="_blank">
      <span class="val">${p[1].toLocaleString('pt-BR')}</span><i style="height:${Math.max(3, Math.round((p[1] / max) * 100))}%"></i>
      <span class="lab"><b>${p[0]}</b>${p[2]}</span></a>`).join('')}</div>`
  }
  const stat = (arr) => `<div class="stats">${arr.map((x) => `<div class="stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>`
  const comp = (rows) => `<table class="comp"><thead><tr><th>Concorrente</th><th>O que posta / vende</th><th>Anúncio ativo</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r[0]}</b><span>${r[1]}</span></td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`
  const viral = (rows) => `<div class="viral">${rows.map((r) => `<div class="vr"><b>${r[0]}</b><div><a href="${r[3]}" target="_blank">${r[1]}</a><span>${r[2]}</span></div></div>`).join('')}</div>`
  const bridge = (rows) => `<div class="bridges">${rows.map((r) => `<div class="br"><div class="saw"><em>vimos</em>${r[0]}</div><div class="arr">→</div><div class="do"><em>vamos fazer</em>${r[1]}</div></div>`).join('')}</div>`

  // ---------------- FORNARIO ----------------
  page('pf', 'Fornario · Análise 1 de 2 · Instagram e concorrentes', 'Base enorme, alcance baixo: lugar e gente vencem ambiente vazio', `
  <div class="an2">
    <div>
      ${stat([['60.242', 'seguidores (@ofornario)'], ['10 Reels', 'em 13 dias (quase diário)'], ['≈ 2.360', 'views de média: só ~4% da base'], ['0', 'conversas medidas no anúncio']])}
      ${bars([['29/10', 2131, 'Foie Gras', 'DfFZJeTh3c1'], ['30/10', 1522, 'Varal de petiscos', 'DfIX5fwFe51'], ['31/10', 1659, 'Lasanha', 'DfKpMdBDteG'], ['01/11', 1975, 'Novidades', 'DfNU5B0iVPS'], ['04/11', 1158, 'Detalhes', 'DfU8c0HHEqA'], ['05/11', 5936, 'Praça do Canhão', 'DfXyS3RJd0s'], ['06/11', 2834, 'Quem faz', 'DfablqDJfJT'], ['10/11', 1829, 'Cliente', 'DfkEcJQO1mQ'], ['10/11', 429, 'Ambiente', 'DfkgHXSjxjd']])}
      <p class="cap">Views dos últimos Reels. Formato: quase só Reels de prato com legenda longa; poucos comentários (0 a 12).</p>
    </div>
    <div>
      <h3 class="h3">Concorrentes na cidade</h3>
      ${comp([
        ['@cavalcantis_pizzaria', '11.976 seg.', 'Restaurante com rodízio às quintas e pratos de camarão. “Encomende para sua festa” fez 17,5 mil views.', ref(AD + '1650342052700532', '2 anúncios (39 e 135 dias)')],
        ['@marinhospizzariaa', '4.834 seg.', 'Sabores regionais e humor; “2 pizzas grandes por R$ 58,90”.', ref(AD + '1397761735458184', '“Vem para Marinhos!” (14 dias)')],
        ['Tajo Lanches e Pizzas', 'São Lourenço', 'Pizza de R$ 290 mostrada por criador local: 20,8 mil views e gente perguntando “qual o @?”.', '—'],
        ['Gracia’s Pizzaria', '4.460 seg.', 'Pizzaria de bairro, perfil pequeno.', '—'],
        ['Changretta Forneria', 'Recife (referência)', 'Nota do Google no título do anúncio: “(4,9)”.', ref(AD + '2228190071450441', 'ativo há 7 dias')],
      ])}
    </div>
  </div>`, { brand: 'Fornario', cls: 'dense' })

  page('pf', 'Fornario · Análise 2 de 2 · O que viraliza e o que fazemos', 'Vimos isso, então vamos fazer aquilo', `
  <div class="an2b">
    <div>
      <h3 class="h3">Viralizando agora no nicho</h3>
      ${viral([
        ['1,12 mi', 'Casa do Homem Pizza: “Poucas pessoas sabem disso…”', 'gancho de curiosidade + tradição, 29 s, som original', 'https://www.tiktok.com/@casadohomempizza/video/7701496038028315924'],
        ['512 mil', 'Nestor: “passou dos limites”', 'exagero e sabor inusitado, 10 mil compartilhamentos', 'https://www.tiktok.com/@nestorpizzariagastro/video/7698836627824676104'],
        ['214 mil', 'Brenner: “O CLT banca?”', 'criador testa se a pizza cara vale o preço', 'https://www.tiktok.com/@obrennera/video/7706692284976319796'],
        ['20,8 mil', 'Pizza de R$ 290 em São Lourenço', 'exagero premium local, via criador', 'https://www.instagram.com/reel/DfQVMLrhw-Q/'],
      ])}
      <p class="cap">Quase todos com <b>som original</b> (narração ou som do forno), não música da moda.</p>
    </div>
    ${bridge([
      ['Praça do Canhão (5.936) e equipe (2.834) rendem até 14× o ambiente vazio (429).', 'Todo Reel com <b>lugar ou pessoa</b>. Nenhum vídeo de salão vazio.'],
      ['60 mil seguidores, mas cada Reel chega a ~4% deles.', 'Anúncio de vídeo para reacender a base e <b>toda peça pedindo a reserva</b>.'],
      ['Cavalcanti’s vende rodízio e “encomenda para festa”.', 'Não entrar em rodízio. Vender <b>mesa de ocasião</b> e encomenda que só tem aqui (Deep Dish).'],
      ['Nenhum anúncio da cidade fala de confraternização; a Changretta põe a nota no título.', 'Anúncio de confraternização com <b>“4,8 no Google”</b>.'],
      ['“Poucas pessoas sabem…” (1,12 mi) e “vale o preço?” (214 mil).', 'Reels <b>“começou anteontem”</b> e <b>“por que custa R$ 60”</b>.'],
    ])}
  </div>`, { brand: 'Fornario', cls: 'dense' })

  // ---------------- VOVINA ----------------
  page('pf', 'VOVINA · Análise 1 de 2 · Instagram e concorrentes', 'Post de dia da semana não vende; pergunta e cardápio sim', `
  <div class="an2">
    <div>
      ${stat([['1.955', 'seguidores (@vovinapizza)'], ['893', 'cliques no cardápio pelo anúncio (R$ 0,13)'], ['≈ 390', 'views de média; 0 a 11 curtidas'], ['804', 'melhor post: o cardápio digital']])}
      ${bars([['15/10', 260, 'Quintou', 'Deh4aAnPAHX'], ['19/10', 526, 'Como é feita', 'DesOHVWvDNf'], ['22/10', 596, 'Antes da mesa', 'Dezzn6hPvNZ'], ['27/10', 344, 'Ingredientes', 'DfAzJl0vQO7'], ['31/10', 804, 'Cardápio digital', 'DfLHHFBvKmX'], ['04/11', 179, 'Fermentação (afirmação)', 'DfU8sQRB1nv'], ['06/11', 173, 'Sextou', 'DfaedhYhRvQ'], ['08/11', 444, 'Borda? (pergunta)', 'DffflrmOomR'], ['10/11', 171, 'Terçou', 'DfkpcugPbEw']])}
      <p class="cap">Mesmo assunto, resultado diferente: a borda com pergunta (444) fez 2,5× a fermentação dita como afirmação (179).</p>
    </div>
    <div>
      <h3 class="h3">Concorrentes no Centro e na cidade</h3>
      ${comp([
        ['@marinhospizzariaa', '4.834 seg.', 'Delivery no mesmo Centro. Viraliza com sabor regional (carne de sol + coalho: 42 mil; Matuta: 45,7 mil) e humor. “2 grandes por R$ 58,90”.', ref(AD + '2332902560778402', '2 anúncios (14 dias)')],
        ['@cavalcantis_pizzaria', '11.976 seg.', 'Meio a meio, rodízio às quintas e encomenda para festa.', ref(AD + '1502808261654488', '2 anúncios (39 e 135 dias)')],
        ['La Pizza, Lourenço, Jack', 'cardápios online', 'Pizza grande de R$ 31 a R$ 55: a briga de preço da cidade.', '—'],
        ['News Degust (Recife)', 'referência', 'Anúncio de preço: “Clone de pizza por R$ 53,99”.', ref(AD + '2937154026650409', 'ativo há 5 dias')],
      ])}
    </div>
  </div>`, { brand: 'VOVINA', cls: 'dense' })

  page('pf', 'VOVINA · Análise 2 de 2 · O que viraliza e o que fazemos', 'Vimos isso, então vamos fazer aquilo', `
  <div class="an2b">
    <div>
      <h3 class="h3">Viralizando agora no nicho</h3>
      ${viral([
        ['161 mil', 'Noite do pijama em família com pizza de Natal', 'publicado em 07/11/2026, Brasil, som original', 'https://www.tiktok.com/@abiagalvao/video/7705548560103656722'],
        ['580 mil', 'Pizza em formato de árvore de Natal', 'formato que volta todo dezembro', 'https://www.tiktok.com/@lericettedigessica/video/7585228905829764374'],
        ['45,7 mil', 'Marinho’s: Matuta com cream cheese', 'sabor regional em close, na própria cidade', 'https://www.instagram.com/p/DdWgo-suUBy/'],
        ['601 mil', '“Pizza de favela × bairro rico”', 'comparação e review de quem pede em casa', 'https://www.tiktok.com/@marceloeremita/video/7702850285139430663'],
      ])}
      <p class="cap">O que mais cresce na pizza de casa: <b>família reunida, sabor diferente e Natal</b>.</p>
    </div>
    ${bridge([
      ['O vídeo do Combo Mussarela e Calabresa puxou 85% dos cliques do anúncio; “Sextou/Terçou” ficam em ~170 views.', '<b>Fim</b> do post de dia da semana. Gravar <b>2 ou 3 vídeos novos de combo</b> e revezar.'],
      ['Cardápio digital (804) e “como é feita” (526–596) foram os melhores.', 'Mostrar <b>como pedir em 3 passos</b> e o processo, com link do cardápio.'],
      ['Pergunta no gancho rende 2,5× a afirmação.', 'Gancho sempre em <b>pergunta ou curiosidade</b>.'],
      ['Marinho’s, no mesmo Centro, ganha com sabor regional e preço baixo.', 'Não brigar no preço: <b>sabor de vó</b> e meio a meio da família.'],
      ['Pizza de Natal em família e pizza árvore crescem em novembro.', '<b>Pizza de Natal da Vó</b>, edição limitada, para a noite em família (decisão nº 5).'],
    ])}
  </div>`, { brand: 'VOVINA', cls: 'dense' })

  // ---------------- BRIO ----------------
  page('pf', 'Brio Burguer · Análise 1 de 2 · Instagram e concorrentes', 'Perfil parado desde 29/10: a entrada recomeça do zero', `
  <div class="an2">
    <div>
      ${stat([['5.076', 'seguidores (@brioburger_br)'], ['14 dias', 'sem post (último em 29/10)'], ['≈ 680', 'views de média; 3 a 21 curtidas'], ['2.431', 'melhor: “Brio Matuto” em close']])}
      ${bars([['30/08', 474, 'Domingou', 'DcrWVOVpTAy'], ['01/09', 854, 'Terçou', 'DcwqFpGJQFl'], ['04/09', 2431, 'Brio Matuto', 'Dc4aTAeJCkG'], ['29/09', 214, 'Terça', 'Dd4wZwzwSRc'], ['10/10', 1081, 'Costela', 'DeU_fHGph5D'], ['21/10', 324, 'Ingrid monta', 'DexShqrJsC0'], ['23/10', 279, 'O segredo', 'De2ZKxipafh'], ['27/10', 231, 'Bastidor', 'DfA0fvCJFAU'], ['29/10', 273, 'Na rua', 'DfFsSiIpDhu']])}
      <p class="cap">Produto em close venceu tudo. Bastidor e abordagem na rua, do jeito que foram feitos, ficaram abaixo de 330.</p>
    </div>
    <div>
      <h3 class="h3">Concorrentes</h3>
      ${comp([
        ['@jurito.br', '20.826 seg. · São Lourenço', 'Hambúrguer e açaí. Humor e exagero (“croquetão”: 20,4 mil), lançamentos em carrossel.', '—'],
        ['@boraburguer_pe', '12.921 seg. · Boa Viagem', '“A partir de R$ 14,90” e criadores avaliando: de 26 mil a 240 mil views.', '—'],
        ['Sanduba Secreto', 'São Lourenço', 'Artesanal de R$ 36,90 a R$ 44 no cardápio online.', '—'],
        ['Burguer do Nô', 'Recife', 'Combo individual de R$ 19,90.', '—'],
        ['Pimentas Hamburgueria', 'Recife', 'Anúncio com botão de WhatsApp.', ref(AD + '1663885325131887', 'ativo há 10 dias')],
      ])}
    </div>
  </div>`, { brand: 'Brio Burguer', cls: 'dense' })

  page('pf', 'Brio Burguer · Análise 2 de 2 · O que viraliza e o que fazemos', 'Vimos isso, então vamos fazer aquilo', `
  <div class="an2b">
    <div>
      <h3 class="h3">Viralizando agora no nicho</h3>
      ${viral([
        ['1,19 mi', 'Mordida em 7 segundos', 'close, sem fala, som original', 'https://www.tiktok.com/@otavarex1/video/7696629520446606599'],
        ['282 mil', 'Combo família: “marca alguém pra dividir”', '4.109 compartilhamentos', 'https://www.tiktok.com/@hamburgueriaexprescombos/video/7699602273290161415'],
        ['361 mil', 'Humor de bastidor: “aqui o expediente é assim”', 'perfil com só 3.265 seguidores', 'https://www.tiktok.com/@qualquercoisahamburguer/video/7702622962939120917'],
        ['110 mil', 'Criador do Recife: “marca quem precisa conhecer”', '@vivinarua levando a Bora Burguer', 'https://www.tiktok.com/@vivinarua/video/7694044933480647956'],
        ['77 mil', '“Tu é de Recife e não conhece…?”', 'sotaque e orgulho local', 'https://www.tiktok.com/@sandyyburguer/video/7699280823480028437'],
      ])}
    </div>
    ${bridge([
      ['O melhor post foi produto em close (2.431); o perfil parou em 29/10.', 'Entrar com <b>3 posts por semana</b>, sempre o lanche aberto e enorme.'],
      ['A abordagem na rua do Brio fez 273; a da Sandy, 77 mil.', 'Refazer com <b>gancho no 1º segundo</b>, sotaque e a mordida na tela.'],
      ['Mordida curta (1,19 mi) e combo “marca alguém” (282 mil).', 'Combo da Galera em <b>vídeo de 7 a 15 s</b> com “marca quem divide”.'],
      ['Bora (R$ 14,90) e Nô (R$ 19,90) brigam em preço; o Jurito, vizinho, ganha com humor.', 'Não brigar em preço: <b>preço por pessoa</b> no combo e humor de bastidor com a Ingrid.'],
      ['Criadores do Recife levam hamburgueria a 100 mil+.', 'Um <b>criador local na entrada</b>, se aprovado.'],
    ])}
  </div>`, { brand: 'Brio Burguer', cls: 'dense' })
}
