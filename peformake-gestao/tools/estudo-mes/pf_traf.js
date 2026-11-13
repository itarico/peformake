// Estratégia de tráfego da Peformake: reaproveita as páginas do trafego.js com os dados da própria Peformake.
const fs = require('fs')
const path = require('path')
const GEN = __dirname
const src = fs.readFileSync(path.join(GEN, 'trafego.js'), 'utf8')
const head = src.slice(0, src.indexOf('const T = {'))
const tail = src.slice(src.indexOf('const css = `'))

const T = {
  Peformake: {
    slug: 'peformake',
    start: {
      title: 'A Peformake faz anúncio que funciona para os outros, e nenhum para si',
      tiles: [['0', 'anúncios da própria Peformake no ar (sem conta própria cadastrada)', 'red'], ['11 de 13', 'clientes com origem registrada vieram por indicação'], ['653', 'conversas no WhatsApp geradas por anúncio nos clientes (out–nov)'], ['R$ 5 a 10', 'por conversa nos clientes (óticas, estética, multimarcas)'], ['0', 'leads do site registrados no sistema', 'red'], ['1', 'negócio aberto no Comercial'], ['210', 'anúncios ativos de “marketing Recife” na Meta (12/11)'], ['16/11', 'data para a conta e o Comercial ficarem prontos', 'red']],
      chartT: 'Conversas geradas por anúncio nos clientes (out–nov)',
      bars: [['Multimarcas (automotivo)', 216, '216 conversas', 'R$ 10,17 cada'], ['Ótica MD Prime', 192, '192 conversas', 'R$ 6,53 cada'], ['Clínica de estética', 165, '165 conversas', 'R$ 6,21 cada'], ['Ótica CM Prime', 49, '49 conversas', 'R$ 5,22 cada']],
      so: ['O método funciona: <b>conversa barata</b> com botão do WhatsApp e acompanhamento diário.', 'Agora a Peformake aplica o mesmo método <b>nela mesma</b>, para falar com donos de negócio.', 'Lead de dono de negócio custa mais que lead de ótica: a aposta inicial é <b>até R$ 35 por conversa</b>.'],
    },
    obj: {
      title: 'Comprar conversa de dono de negócio, e contar cada Raio-X',
      lead: 'Objetivo do período: <b>conversas no WhatsApp de donos de negócio do Grande Recife</b> pedindo o Raio-X do marketing. A 1ª semana mostra o custo real; as metas são a aposta inicial e são revistas em 30/11.',
      metas: [
        ['Resultado', '50', 'conversas de donos de negócio pelo anúncio até 31/12', ['<b>15 Raio-X</b> marcados vindos do anúncio', '4 contratos para começar em janeiro']],
        ['Custo por resultado', 'até R$ 35', 'por conversa iniciada', ['Alerta: acima de R$ 60 por 3 dias, troca o criativo', 'Vídeos: até R$ 0,08 por visualização de 15 s']],
        ['Verba do período', 'R$ 1.750', 'opção B: R$ 37/dia nos dias no ar', ['A: R$ 25/dia (≈ R$ 1.150)', 'C: R$ 57/dia (≈ R$ 2.700)']],
        ['O que vira dinheiro', 'Contrato', 'assinado no sistema', ['Custo por Raio-X e por contrato, toda segunda', 'Origem “Anúncio” em todo lead do Comercial']],
      ],
      flow: [['R$ 1.750', 'no período (opção B)'], ['≈ 50 conversas', 'a R$ 35 cada'], ['15 Raio-X', '30% das conversas'], ['4 contratos', 'para começar em janeiro']],
    },
    camps: [
      { share: '60%', name: 'Raio-X do marketing (captação)', obj: 'Engajamento → <b>conversas no WhatsApp</b>, mensagem pronta “Quero o Raio-X do meu marketing”', pub: 'Donos de negócio, 28 a 55 anos, Recife e Região Metropolitana (raio de 25 km). Teste: público aberto × interesses de pequenas empresas', pos: 'Reels, Stories e Feed do Instagram e Facebook; seg a sáb, 8h às 20h', when: '17/11 a 23/12 e 28 a 31/12. Pico em 27‑30/11 e 15‑19/12', cr: 'P8 teste do celular, P4 casos, P3 esquete, post da Black Friday', b: ['15', '22', '34'] },
      { share: '25%', name: 'Cases (remarketing)', obj: 'Engajamento → <b>conversas no WhatsApp</b>, mensagem “Quero ver como foi o case”', pub: 'Quem viu 50% dos vídeos, visitou @peformake ou @italosantosdigital, ou conversou nos últimos 60 dias', pos: 'Reels, Stories e Feed', when: '23/11 a 23/12 e 28 a 31/12', cr: 'P4 estudo de caso, P1 um dia na Peformake, P2 POV social media, “Comece 2027”', b: ['6', '9', '14'] },
      { share: '15%', name: 'Diária Ellcazo (restaurantes)', obj: 'Engajamento → <b>conversas no WhatsApp</b>, mensagem “Quero uma diária de gravação”', pub: 'Donos e gerentes de restaurante, bar e loja, Grande Recife; quem segue perfis de gastronomia local', pos: 'Reels e Stories (vídeo 9:16)', when: '01 a 18/12 (agenda de diárias até 18/12)', cr: 'P9 3 takes de celular, P10 antes e depois, carrossel “vídeo que dá fome”', b: ['4', '6', '9'] },
    ],
    campNote: 'Antes de subir: conta de anúncio própria da Peformake (dentro da BM “Peformake CA 1”), página e @peformake ligados, e o Comercial com a origem “Anúncio”. Nenhuma campanha com data de fim antes de 31/12.',
    crs: [
      ['Carrossel “Estudo de caso #1: a ótica que virou conversa”', 'Raio-X', '“192 conversas no WhatsApp.”', 'Quer ver os seus números? Raio-X grátis', '19/11'],
      ['P8 · O teste do celular · Reel', 'Raio-X', '“Antes de pôr mais dinheiro em anúncio, faz esse teste.”', 'Travou? Raio-X grátis no WhatsApp', '20/11'],
      ['P3 · Eu não preciso de assessoria · esquete', 'Raio-X', '“Meu sobrinho faz as artes.”', 'Raio-X do marketing em 30 minutos', '23/11'],
      ['P4 · Estudo de caso em 60 s (ótica)', 'Cases', '“Essa ótica tinha vitrine e não tinha conversa.”', 'Quer ver o seu? Raio-X grátis', '23/11'],
      ['Black Friday: 20 vagas de Raio-X · post e stories', 'Raio-X', '“Black Friday aqui não é desconto.”', 'Manda RAIO-X no WhatsApp', '27/11'],
      ['P9 · 3 takes de celular (Ellcazo)', 'Ellcazo', '“Três movimentos que dão fome.”', 'Diária Ellcazo até 18/12', '03/12'],
      ['P4 · Estudo de caso em 60 s (VOVINA)', 'Cases', '“893 cliques no delivery próprio.”', 'Raio-X grátis no WhatsApp', '04/12'],
      ['P1 · Um dia na Peformake · Reel', 'Cases', '“8h. A pauta do dia.”', 'É isso que acontece quando você contrata', '09/12'],
      ['P10 · Antes e depois do vídeo do restaurante', 'Ellcazo', '“7h da manhã, cozinha do cliente.”', 'Agenda até 18/12', '10/12'],
      ['“Comece 2027 com o plano pronto” · post e P7', 'Raio-X', '“Janeiro começa com plano ou com pressa?”', 'Feche até 19/12. Manda 2027', '15/12'],
    ],
    crNote: 'Os vídeos P1 a P8 saem da diária de 17/11 (editados até 19/11); P9 e P10 da diária de 01/12. Todo anúncio é vertical, com o gancho no 1º segundo, o nome da pessoa da equipe na tela e a chamada escrita.',
    ab: [
      ['Rosto ou número?', 'P8, Italo falando para a câmera × P4, o case com o número na tela', '23 a 29/11', 'Custo por conversa qualificada', 'Ganha quem custar 20% menos com pelo menos 15 conversas em cada; o vencedor fica com 60% da captação.'],
      ['Qual mensagem pronta?', '“Quero o Raio-X do meu marketing” × “Quero ver como foi o case”', '01 a 07/12', 'Raio-X marcados', 'Conta no Comercial; fica a mensagem que vira mais Raio-X, não a que gera mais conversa.'],
      ['Qual público?', 'Público aberto (a Meta escolhe) × interesses de donos de pequenas empresas', '08 a 14/12', 'Custo por Raio-X', 'O vencedor segue em janeiro com a verba nova.'],
    ],
    abRule: 'Um teste por vez, com o Teste A/B da própria Meta (verba dividida meio a meio). Nada muda no meio do teste.',
    cal: [
      ['13 a 16/11', 'Preparação', 'Conta de anúncio, página, mensagens prontas, Comercial com origem', 'R$ 0', 'up'],
      ['17 a 22/11', 'Começo', 'Sobe a captação com o case da ótica (19/11) e o P8 (20/11)', 'R$ 22', ''],
      ['23 a 26/11', 'Teste 1 · cases', 'Sobe o remarketing; começa o teste rosto × número', 'R$ 31', ''],
      ['27 a 30/11', 'Black Friday e 1ª parcela do 13º', '20 vagas de Raio-X; captação em dobro', 'R$ 50', 'hot'],
      ['01 a 07/12', 'Teste 2 · Ellcazo', 'Sobe a diária Ellcazo; teste de mensagem pronta', 'R$ 37', ''],
      ['08 a 14/12', 'Teste 3', 'Teste de público. 08/12 é feriado no Recife', 'R$ 37', ''],
      ['15 a 19/12', '“Comece 2027” · 2ª parcela do 13º', 'Maior verba; último dia 19/12', 'R$ 50', 'hot'],
      ['20 a 23/12', 'Véspera do Natal', 'Só remarketing e captação leve', 'R$ 20', ''],
      ['24 a 27/12', 'Natal', 'Tudo pausado (o dono não está olhando)', 'R$ 0', 'off'],
      ['28 a 31/12', '“Janeiro começa segunda”', 'Captação volta para encher a agenda de Raio-X de janeiro', 'R$ 30', ''],
      ['05/01', 'Balanço', 'Custo por Raio-X e por contrato; o vencedor ganha a verba de janeiro', '—', 'warn'],
    ],
    calTotal: '≈ R$ 1.750 no período (opção B). Na A, tudo × 0,67; na C, × 1,55.',
    measure: {
      flow: [['Anúncio', 'botão do WhatsApp'], ['Conversa', 'mensagem pronta diz de onde veio'], ['Comercial', 'lead com origem “Anúncio”'], ['Raio-X', 'e contrato no sistema']],
      rep: [['Investido', 'na semana e no período'], ['Conversas', 'iniciadas pelo anúncio'], ['Raio-X', 'marcados e feitos'], ['Contratos', 'e custo por contrato']],
      how: ['A Meta conta as <b>conversas iniciadas</b>; a Thyfany registra o lead no <b>Comercial</b> com a origem e a etapa.', 'Link da bio e do site com marcação: <code>?utm_source=instagram&amp;utm_medium=anuncio&amp;utm_campaign=raio-x</code>.', 'Lead por indicação ou ligação: perguntar “Como conheceu a Peformake?” e anotar.'],
    },
    routine: [['Todo dia', '5 minutos: anúncios no ar, saldo e conversas respondidas em até 1 hora (Italo)'], ['Segunda', 'Relatório da própria Peformake: conversas, Raio-X e contratos da semana'], ['Terça', 'Troca de criativo se a frequência passar de 3 ou o custo subir 30%'], ['Quinta', 'Ajuste de verba para os picos (já programados)'], ['Regra', 'Abaixo de R$ 25 por conversa com Raio-X marcado: sobe 20% a verba. Acima de R$ 60 por 3 dias: troca o criativo']],
    decs: [
      ['Verba de anúncio', [['A', 'R$ 25/dia', '≈ R$ 1.150 no período'], ['B', 'R$ 37/dia', '≈ R$ 1.750, dobrando nos picos', 1], ['C', 'R$ 57/dia', '≈ R$ 2.700, mais alcance']]],
      ['Conta de anúncio', [['A', 'Conta própria na BM Peformake CA 1', 'separa o gasto da Peformake dos clientes', 1], ['B', 'Usar uma conta de cliente', 'nunca: mistura gasto e relatório']]],
      ['Quem responde o WhatsApp', [['A', 'Thyfany qualifica, Italo faz o Raio-X', 'resposta em até 1 hora', 1], ['B', 'Só o Italo', 'mais simples; risco de demora']]],
      ['Página do anúncio', [['A', 'Direto no WhatsApp', 'mensagem pronta, menos atrito', 1], ['B', 'Formulário do site', 'mais dados; menos conversas']]],
      ['Rosto dos anúncios', [['A', 'Italo + equipe com nome', 'o case e a equipe vendem', 1], ['B', 'Só arte e número', 'sem gravar; perde o diferencial']]],
      ['Diária Ellcazo no anúncio', [['A', 'Sobe de 01 a 18/12', 'R$ 6/dia na opção B', 1], ['B', 'Não sobe', 'a verba vai para a captação']]],
    ],
  },
}

let code = head + 'const T = ' + JSON.stringify(T) + '\n' + tail
code = code.replace("'Todas as campanhas com data de fim em <b>31/12</b> (conferido em 13/11)', 'Cartão ou saldo da conta conferido até <b>25/11</b> (decisão 3)', 'Checagem em <b>28/11</b> e <b>01/12</b>: anúncios entregando'", "'Conta e cartão prontos até <b>16/11</b> (decisão 2)', 'Saldo conferido em <b>25/11</b> e <b>14/12</b>, antes dos picos', 'Checagem em <b>28/11</b> e <b>16/12</b>: anúncios entregando'")
code = code.replace('Para não parar em 30/11', 'Para não parar nos picos')
code = code.replace("path.join(OUT, t.slug, 'trafego-nov-dez.html')", "path.join(OUT, t.slug, 'trafego.html')")
if (!code.includes('Para não parar nos picos') || !code.includes("'trafego.html'")) throw new Error('replace falhou')
new Function('require', '__dirname', code)(require, GEN)
