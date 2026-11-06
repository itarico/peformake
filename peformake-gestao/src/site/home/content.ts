// Textos e dados do site. Peformake é ASSESSORIA (nunca "agência").
export const WHATSAPP = '5581985672212'
export const wa = (text: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`
export const WA_DIAG = wa('Olá! Vim pelo site e quero meu diagnóstico gratuito.')
export const INSTAGRAM = 'https://instagram.com/peformake'

export const PROBLEMS = [
  { n: '01', title: 'O post bonito que não vende.', text: 'Arte caprichada, curtida da família e nenhum cliente novo no balcão.' },
  { n: '02', title: 'O anúncio no automático.', text: 'Impulsionar sem estratégia e sem criativo bom queima dinheiro. Bem feito, o anúncio é o que acelera o negócio.' },
  { n: '03', title: 'Ninguém responde pelo resultado.', text: 'O designer culpa o anúncio, o anúncio culpa o vídeo, e você fica no meio pagando três pessoas.' },
]

export const CYCLE = [
  { n: '01', title: 'Diagnóstico e estratégia do mês', text: 'Entendemos o negócio, o público e os concorrentes. Todo mês sai um plano com ofertas, conteúdo e campanhas.', tag: 'Planejar' },
  { n: '02', title: 'Produção que vende', text: 'Artes, roteiros e vídeos gravados pela Ellcazo, a produtora da casa. Você aprova tudo no portal antes de ir ao ar.', tag: 'Criar' },
  { n: '03', title: 'Anúncio e ajuste diário', text: 'Campanhas no Meta, no Google e no TikTok acompanhadas todo dia. O dinheiro vai para o que traz cliente.', tag: 'Acelerar' },
  { n: '04', title: 'Atendimento e relatório', text: 'Medimos as conversas que chegam no WhatsApp e mandamos o relatório toda segunda, em linguagem de dono.', tag: 'Medir' },
]

export const SERVICES = [
  { title: 'Tráfego pago', text: 'Meta, Google e TikTok com acompanhamento diário e relatório toda semana.', tag: 'Anúncios' },
  { title: 'Social media e design', text: 'Planejamento do mês, artes e legendas com a cara do seu negócio.', tag: 'Conteúdo' },
  { title: 'Vídeo com a Ellcazo', text: 'Roteiro, gravação e edição de Reels e anúncios, com produtora própria.', tag: 'Audiovisual' },
  { title: 'Estratégia e consultoria', text: 'Reunião mensal, plano de ação e o olhar de quem acompanha o seu número.', tag: 'Direção' },
  { title: 'Comercial no WhatsApp', text: 'Atendimento organizado, etiquetas, tempo de resposta e vendas medidas.', tag: 'Vendas' },
  { title: 'Sites e páginas de venda', text: 'Páginas rápidas, feitas para converter quem chega do anúncio.', tag: 'Conversão' },
]

export const STEPS = [
  { n: '1', title: 'Diagnóstico gratuito', text: '30 minutos olhando seu Instagram, seus anúncios e seus concorrentes.' },
  { n: '2', title: 'Plano com preço claro', text: 'O que vamos fazer, quanto investir e em quanto tempo esperar retorno.' },
  { n: '3', title: 'Começamos em 7 dias', text: 'Reunião de início, acesso às contas e as primeiras peças para aprovar.' },
]

export const FAQ = [
  { q: 'Em quanto tempo vejo resultado?', a: 'As primeiras conversas costumam chegar já no primeiro mês de anúncio. O ritmo estável, com custo por cliente mais baixo, vem entre o segundo e o terceiro mês, depois que testamos ofertas e criativos.' },
  { q: 'A Peformake é uma agência?', a: 'Não. Somos uma assessoria: entramos no seu negócio como o time de marketing que você teria em casa, com estratégia, produção, anúncio e atendimento sob a mesma responsabilidade.' },
  { q: 'Quanto preciso investir em anúncio?', a: 'Depende do seu objetivo e da sua cidade. No diagnóstico mostramos o valor que faz sentido para o seu caso, separado do valor da assessoria.' },
  { q: 'Preciso ter fotos e vídeos prontos?', a: 'Não. A Ellcazo, nossa produtora, grava no seu negócio. Se você já tem material, a gente aproveita.' },
  { q: 'Quem aprova o que vai ao ar?', a: 'Você. Toda arte, roteiro e vídeo passa pelo seu portal, e só publicamos o que você aprovar.' },
  { q: 'Atendem fora de Recife?', a: 'Sim. Atendemos presencialmente o Grande Recife e, a distância, negócios de todo o Brasil.' },
]
