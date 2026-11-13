// Brio Burguer · dados do estudo do mês (13/11/2026). Fonte única para estratégia, social e audiovisual.
// Números: Supabase (client_scan 12/11, clients, client_team), Biblioteca de Anúncios (ADS, 13/11), Firecrawl/ScrapeCreators (13/11).
const TT = (u, id) => `https://www.tiktok.com/@${u}/video/${id}`
const AD = (id) => 'https://www.facebook.com/ads/library/?id=' + id
const IG = (c) => 'https://www.instagram.com/p/' + c + '/'

// Últimos 10 posts do @brioburger_br (coleta da rotina, 12/11)
const POSTS = [
  ['30/08', 'Domingou (Pepperoni)', 474], ['01/09', 'Terçou', 854], ['04/09', 'Brio Matuto em close', 2431], ['29/09', 'Toda terça', 214],
  ['10/10', 'Costela', 1081], ['21/10', 'Ingrid monta', 324], ['23/10', 'O segredo', 279], ['27/10', 'Bastidor', 231], ['29/10', 'Na rua', 273],
]

// Anúncios de hambúrguer ativos na região (Biblioteca de Anúncios, BR, ativos, 13/11/2026)
const ADS = [
  ['brasa_burgeer', 'Grande Recife', 252, 'Hambúrguer na brasa', '—', '—', 'Instagram', '1845852056117541'],
  ['Lanche Burguer', 'Camaragibe', 41, 'Pedido da noite', '—', '—', 'Instagram', '2332579310609090'],
  ['232 Burguer', 'Recife', 32, 'Perfil da casa', '—', '—', 'Instagram', '29536579762609852'],
  ['Pimentas Hamburgueria', 'Recife', 28, 'Peça agora', '—', '—', '<b>WhatsApp</b>', '2055787275103036'],
  ['Carlos Burger', 'Camaragibe', 18, 'Pedido da noite', '—', '—', 'Instagram', '2195162631343729'],
  ['Bora Burguer', 'Boa Viagem', 14, 'Hambúrguer na brasa', '“a partir de R$ 14,90”', 'Criadores', 'Reserva', '1474890267897913'],
  ['John Lira Burger', 'Recife', 13, 'Combo Canarinho', '—', '—', 'Instagram', '1487336249965297'],
  ['Arapuca Burguer', 'Recife', 12, 'Hambúrguer', '—', 'Criador @vivinarua', 'Instagram', '1810109150231507'],
  ['Duda Burgers (Bravus)', 'Camaragibe', 1, '<b>Smash por R$ 17,90</b>', 'preço no título', '—', 'Cardápio Brendi', '1714293563747943'],
  ['Sanduba Secreto', '<b>São Lourenço–Camaragibe</b>', 1, '<b>“São Lourenço – Camaragibe”</b>', 'a cidade no título', '—', 'Instagram', '2379652072869812'],
]

// Formatos que mais viralizaram no nicho (Firecrawl/ScrapeCreators, TikTok, coleta 13/11)
const TRENDS = [
  ['ASMR da mordida, sem fala', 69.5, '@carmelitaevilim', TT('carmelitaevilim', '7504074126970096951')],
  ['POV do chapeiro: “o primeiro pedido da noite”', 19.7, '@jordanburguers', TT('jordanburguers', '7553437494302248204')],
  ['POV operação: “sozinho na cozinha, daria conta?”', 12.3, '@povhamburgueiro', TT('povhamburgueiro', '7566864589409848577')],
  ['Humor de amigo secreto na firma', 2.75, '@gatoironico', TT('gatoironico', '7572309580026268936')],
  ['Combo exagerado aberto na mesa', 2.42, '@gabrieldozedopastel', TT('gabrieldozedopastel', '7640649396593478933')],
  ['Maionese da casa em close', 1.50, '@braseiroburguerposse', TT('braseiroburguerposse', '7681116129909083413')],
  ['Teste cego de hambúrguer', 0.82, '@guiadohamburguer', TT('guiadohamburguer', '7123618797570772229')],
  ['“Serve 4: R$ 27,50 pra cada”', 0.17, '@expresscombos_', TT('expresscombos_', '7609366915827404052')],
]

module.exports = { TT, AD, IG, POSTS, ADS, TRENDS }
