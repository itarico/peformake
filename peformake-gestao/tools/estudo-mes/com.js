// Como deve ser a comunicação de cada marca nos vídeos (tom de voz + evitamos + linguagem de vídeo)
const fs = require('fs'), path = require('path')
const C = {
  Fornario: {
    title: 'Como o Fornario fala nos vídeos',
    tone: [
      ['Premium sem pose', 'Fala pouco e com calma. O produto é o centro.', 'Começou anteontem.'],
      ['Curioso', 'Abre com o que pouca gente sabe.', 'Poucas pessoas sabem que a sua pizza começou anteontem.'],
      ['Seguro do preço', 'Explica o motivo, sem se defender.', 'R$ 60, oito fatias, para dividir.'],
      ['Da casa', 'Quem fala é quem faz, uma frase só.', 'Hoje sou eu que faço a sua pizza.'],
    ],
    avoid: ['Música da moda', 'Salão vazio', 'Papai Noel', 'Defender o preço', 'Gritar promoção', 'Texto longo na tela'],
    rule: 'Se o vídeo precisa explicar demais, não é Fornario.',
    lang: [['Câmera parada', 'Tripé ou celular apoiado; quem se mexe é a pá e a comida.'], ['Close', 'Macro na borda, no queijo e no camarão.'], ['Luz quente', 'Lateral, fundo escuro; a praça no fim de tarde.'], ['Som original', 'Forno, faca e crosta. Sem música da moda.'], ['Ritmo', 'Cortes de 1 a 2 s; o final lento, na fatia.']],
  },
  VOVINA: {
    title: 'Como a VOVINA fala nos vídeos',
    tone: [
      ['Casa de vó', 'Simples e carinhosa, conversa de família.', 'Pizza de vó, feita sem pressa.'],
      ['Pergunta primeiro', 'Abre com uma pergunta ou curiosidade.', 'Borda escura é queimada?'],
      ['Família junta', 'Mesa cheia, meio a meio, todo mundo pega.', 'Quantas pessoas essa pizza alimenta?'],
      ['Fácil de pedir', 'Sempre mostra o caminho do pedido.', 'Monte o seu pelo link da bio.'],
    ],
    avoid: ['“Sextou” e post de dia da semana', 'Afirmação sem gancho', 'Foto de banco', 'Promoção gritada', 'Cena sem gente'],
    rule: 'Se o vídeo não dá fome em 3 segundos, não é VOVINA.',
    lang: [['Abertura', 'Borda ou queijo puxando no 1º segundo.'], ['Câmera de cima', 'Da mesa, com as mãos entrando no quadro.'], ['Luz de casa', 'Quente e de frente, sem cara de estúdio.'], ['Som real', 'Conversa da família e a borda estalando.'], ['Ritmo', '7 a 15 s; acelera quando a pizza some.']],
  },
  'Brio Burguer': {
    title: 'Como o Brio fala nos vídeos',
    tone: [
      ['Amigo', 'Humor de amigo, sem forçar a piada.', 'Oxe, tá vivendo errado, visse?!'],
      ['Da cidade', 'Sotaque e gíria de São Lourenço.', 'Tu é de São Lourenço e não conhece o Brio?'],
      ['Direto', 'Uma frase vale mais que um texto.', 'Chega de folha de carne.'],
      ['Real', 'Lanche de verdade, aberto e enorme.', 'Chega quente. Pede pelo site.'],
    ],
    avoid: ['Foto de banco ou IA', 'Lanche fechado e pequeno', 'Texto longo', 'Piada forçada', 'Preço sem o lanche na tela'],
    rule: 'Se a mordida não aparece em 3 segundos, não é Brio.',
    lang: [['Gancho', 'Mordida ou pergunta com sotaque no 1º segundo.'], ['Câmera na mão', 'Lo-fi, perto do lanche, sem cara de anúncio.'], ['Close', 'Macro no queijo, na carne e na maionese.'], ['Som', 'Chapa, crocante e áudio original.'], ['Ritmo', 'Cortes rápidos, 7 a 15 s, pronto para stories.']],
  },
}
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fotos.json'), 'utf8'))

function comPage(d, brand) {
  const c = C[brand]
  d.page('av', `${brand} · Comunicação nos vídeos`, c.title, `
  <div class="tone">${c.tone.map((t) => `<div class="tc"><h3>${t[0]}</h3><p>${t[1]}</p><q>${t[2]}</q></div>`).join('')}</div>
  <div class="avoid"><b>Evitamos:</b>${c.avoid.map((a) => `<span>${a}</span>`).join('')}</div>
  <div class="lang"><div class="lrule"><small>Linguagem de vídeo</small>${c.rule}</div>
    <div class="lrows">${c.lang.map((l) => `<div class="lr"><b>${l[0]}</b><span>${l[1]}</span></div>`).join('')}</div></div>`, { cls: 'avl compg' })
}

function photoPage(d, brand) {
  d.page('av', `${brand} · Gravação · Referências de foto`, 'O que fotografar no dia da gravação', `
  <div class="fotos">${F[brand].map(([g, L]) => `<div class="fg"><h3>${g}</h3><div class="fr3">${L.map((x) => `<a class="ft" href="${x.url}" target="_blank"><img src="${x.img}" alt=""><span>${x.cap}</span><small>${x.who}</small></a>`).join('')}</div></div>`).join('')}</div>`, { cls: 'avw fotopg' })
}
module.exports = { comPage, photoPage }
