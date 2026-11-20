// Motor das perguntas do mês (SEM IA) — Italo, 17/11: "estudando o nicho do cliente, cruzando dados, sempre perguntas diferentes;
// um bar não recebe as mesmas perguntas de um órgão sem fins lucrativos".
// Entra: cadastro (segmento, descrição), briefing (produtos, concorrentes…), mês, perguntas já feitas e o diagnóstico.
// Sai: 8 perguntas abertas, com exemplo ("Ex.: …" aparece para o cliente) e opções para tocar.
// Determinístico: o mesmo cliente no mesmo mês recebe as mesmas perguntas; o que já foi perguntado em outro mês não volta.

export type Family = 'bar' | 'comida' | 'saude' | 'beleza' | 'varejo' | 'automotivo' | 'b2b' | 'servicos' | 'educacao' | 'terceiro_setor'
export type Area = 'consultoria' | 'vendas' | 'social' | 'audiovisual'
/** cond: só pergunta se a resposta da pergunta `q` tiver uma das palavras de `has` (vazio = basta ter respondido).
 * `short`: só se a resposta veio curta (menos caracteres que isso): o puxa-fio das histórias. */
export interface Cond { q: string; has: string[]; short?: number }
export interface EngineQuestion { area: Area; question: string; why: string; options: string[]; cond?: Cond }
export interface EngineInput {
  clientId: string; name: string; segment?: string | null; description?: string | null
  /** Tipo de negócio escolhido pela equipe no briefing: manda sobre o que o sistema deduz. */
  family?: Family | null
  month: string // AAAA-MM-01
  products?: { nome: string; preco?: string }[]; competitors?: { nome: string }[]; noCompetitors?: boolean
  publico?: string; meta?: string
  asked: string[] // perguntas já feitas ao cliente em outros meses (enviadas ou respondidas)
  diagQuestions?: { pergunta: string; por_que?: string }[]
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** Tipos de negócio, como a equipe escolhe no briefing (Italo, 20/11: "uma APM não é uma loja"). */
export const FAMILY_LABEL: Record<Family, string> = {
  terceiro_setor: 'Instituição sem fins lucrativos (associação, ONG, igreja)', educacao: 'Escola ou curso', saude: 'Saúde (clínica, consultório)',
  beleza: 'Beleza e estética', comida: 'Comida (restaurante, delivery, doceria)', bar: 'Bar ou casa noturna', varejo: 'Loja (varejo, ótica, moda)',
  automotivo: 'Automotivo (motos, carros, peças)', b2b: 'Vende para empresas (indústria, distribuidora)', servicos: 'Prestador de serviço',
}
export const FAMILIES = Object.keys(FAMILY_LABEL) as Family[]
export const isFamily = (v: unknown): v is Family => typeof v === 'string' && v in FAMILY_LABEL

/** Tipo de negócio pela Receita: natureza jurídica (associação, igreja, fundação) e a atividade principal (CNAE). */
export function familyFromReceita(nature?: string | null, cnae?: string | null): Family | null {
  const n = norm(nature ?? '')
  if (/associacao|organizacao religiosa|fundacao|partido|entidade sindical|servico social/.test(n)) return 'terceiro_setor'
  const c = String(cnae ?? '').replace(/\D/g, '')
  if (!c) return null
  const d2 = c.slice(0, 2), d4 = c.slice(0, 4)
  if (d2 === '85') return 'educacao'
  if (d2 === '86' || d2 === '87' || d4 === '4771') return 'saude'
  if (d4 === '9602' || d4 === '9313') return 'beleza'
  if (d4 === '5611' || d4 === '5612' || d4 === '5620' || d4 === '1091' || d4 === '4721') return c === '5611204' || c === '5611205' ? 'bar' : 'comida'
  if (d2 === '45') return 'automotivo'
  if (d2 === '47') return 'varejo'
  if (['10', '11', '13', '14', '15', '16', '17', '20', '22', '23', '24', '25', '28', '41', '42', '43', '46'].includes(d2)) return 'b2b'
  return 'servicos'
}

/** O nicho pela descrição e pelo segmento (sem fins lucrativos e educação primeiro: são os mais diferentes). */
export function familyOf(segment?: string | null, description?: string | null, name?: string | null): Family {
  const t = norm(`${segment ?? ''} ${name ?? ''} ${(description ?? '').slice(0, 600)}`)
  const seg = norm(segment ?? '')
  // O segmento manda (Italo, 20/11: a Peformake é assessoria de marketing "forte em gastronomia" e recebia pergunta de prato).
  if (/assessoria|marketing|agencia|publicidade|comunicacao|consultoria|contabil|advoc|juridic|imobiliar|software|tecnologia/.test(seg)) return 'servicos'
  if (/sem fins lucrativos|associacao de|ong\b|instituto|igreja|fundacao|projeto social|filantrop/.test(t)) return 'terceiro_setor'
  if (/educa|escola|colegio|curso|faculdade/.test(seg) || /escola|colegio|cursinho/.test(t)) return 'educacao'
  if (/\bbar\b|petiscaria|boteco|choperia|pub\b|happy hour|drinks/.test(t)) return 'bar'
  if (/gastro|restaur|aliment|pizz|hamb|burger|acai|cafe|confeit|doce|padaria|lanch|delivery de comida|comida/.test(t)) return 'comida'
  if (/estetica|beleza|barbe|salao|unha|cabelo|harmoniza|sobrancelha/.test(t)) return 'beleza'
  if (/saude|clinica|medic|odonto|nutri|fisio|psicolog|dra\b|dr\b/.test(t)) return 'saude'
  if (/automotiv|moto|carro|veicul|autopec|oficina|equipadora/.test(t)) return 'automotivo'
  if (/b2b|industria|distribuidora|atacad|para industrias|construtoras/.test(t)) return 'b2b'
  if (/moda|otica|loja|varejo|calcad|roupa|acessorio|pet shop|presente/.test(t)) return 'varejo'
  return 'servicos'
}

// ───────── Calendário do mês (Italo, 20/11): nacionais, Recife e Pernambuco, e as do nicho ─────────
// Só datas confirmadas. Páscoa, Carnaval e Corpus Christi saem da conta da Páscoa; Dia das Mães, dos Pais e Black Friday,
// do dia da semana. `fam`: só para esses tipos de negócio. Sem dia: o mês inteiro (Outubro Rosa, férias).
const pad = (n: number) => String(n).padStart(2, '0')
function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(y, month - 1, day))
}
const plus = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)
/** n-ésimo dia da semana (0 = domingo) do mês. */
const nth = (y: number, m: number, wd: number, n: number) => { const first = new Date(Date.UTC(y, m - 1, 1)); return new Date(Date.UTC(y, m - 1, 1 + ((wd - first.getUTCDay() + 7) % 7) + (n - 1) * 7)) }
type CalDate = { name: string; at: (y: number) => Date | null; month?: number; fam?: Family[] }
const fixed = (m: number, d: number) => (y: number) => new Date(Date.UTC(y, m - 1, d))
const CALENDAR: CalDate[] = [
  { name: 'Férias de janeiro', at: () => null, month: 1 },
  { name: 'Volta às aulas', at: () => null, month: 1 }, { name: 'Volta às aulas', at: () => null, month: 2 },
  { name: 'Galo da Madrugada', at: (y) => plus(easter(y), -50) },
  { name: 'Carnaval', at: (y) => plus(easter(y), -47) },
  { name: 'Data Magna de Pernambuco', at: fixed(3, 6) },
  { name: 'Dia da Mulher', at: fixed(3, 8) },
  { name: 'Aniversário do Recife e de Olinda', at: fixed(3, 12) },
  { name: 'Dia do Consumidor', at: fixed(3, 15) },
  { name: 'Páscoa', at: (y) => easter(y) },
  { name: 'Dia do Trabalho', at: fixed(5, 1) },
  { name: 'Dia das Mães', at: (y) => nth(y, 5, 0, 2) },
  { name: 'Dia da Indústria', at: fixed(5, 25), fam: ['b2b'] },
  { name: 'Dia do Hambúrguer', at: fixed(5, 28), fam: ['comida', 'bar'] },
  { name: 'Corpus Christi', at: (y) => plus(easter(y), 60) },
  { name: 'Dia dos Namorados', at: fixed(6, 12) },
  { name: 'São João', at: fixed(6, 24) },
  { name: 'Férias de julho', at: () => null, month: 7 },
  { name: 'Dia da Pizza', at: fixed(7, 10), fam: ['comida'] },
  { name: 'Dia do Amigo', at: fixed(7, 20), fam: ['comida', 'bar'] },
  { name: 'Dia do Motorista', at: fixed(7, 25), fam: ['automotivo'] },
  { name: 'Dia dos Avós', at: fixed(7, 26) },
  { name: 'Dia do Motociclista', at: fixed(7, 27), fam: ['automotivo'] },
  { name: 'Dia Internacional da Cerveja', at: (y) => nth(y, 8, 5, 1), fam: ['bar'] },
  { name: 'Dia do Estudante', at: fixed(8, 11), fam: ['educacao'] },
  { name: 'Dia dos Pais', at: (y) => nth(y, 8, 0, 2) },
  { name: 'Dia do Psicólogo', at: fixed(8, 27), fam: ['saude'] },
  { name: 'Dia do Voluntário', at: fixed(8, 28), fam: ['terceiro_setor'] },
  { name: 'Setembro Amarelo', at: () => null, month: 9, fam: ['saude', 'terceiro_setor'] },
  { name: 'Independência', at: fixed(9, 7) },
  { name: 'Dia da Beleza', at: fixed(9, 9), fam: ['beleza'] },
  { name: 'Dia do Cliente', at: fixed(9, 15) },
  { name: 'Outubro Rosa', at: () => null, month: 10, fam: ['saude', 'beleza', 'terceiro_setor'] },
  { name: 'Dia dos Animais', at: fixed(10, 4), fam: ['varejo'] },
  { name: 'Dia das Crianças', at: fixed(10, 12) },
  { name: 'Dia do Professor', at: fixed(10, 15), fam: ['educacao'] },
  { name: 'Dia do Médico', at: fixed(10, 18), fam: ['saude'] },
  { name: 'Dia do Dentista', at: fixed(10, 25), fam: ['saude'] },
  { name: 'Novembro Azul', at: () => null, month: 11, fam: ['saude', 'beleza'] },
  { name: 'Proclamação da República', at: fixed(11, 15) },
  { name: 'Dia da Consciência Negra', at: fixed(11, 20) },
  { name: 'Black Friday', at: (y) => plus(nth(y, 11, 4, 4), 1) },
  { name: 'Dia de Doar', at: (y) => plus(nth(y, 11, 4, 4), 5), fam: ['terceiro_setor'] },
  { name: 'Natal', at: fixed(12, 25) },
  { name: 'Réveillon', at: fixed(12, 31) },
]
export interface MonthDate { name: string; label: string }
/** Datas do mês para este tipo de negócio, na ordem do calendário (as do mês inteiro primeiro). */
export function monthDates(month: string, fam?: Family | null): MonthDate[] {
  const y = Number(month.slice(0, 4)), mi = Number(month.slice(5, 7))
  const out: { name: string; label: string; day: number }[] = []
  for (const c of CALENDAR) {
    if (c.fam && (!fam || !c.fam.includes(fam))) continue
    const d = c.at(y)
    if (d ? d.getUTCMonth() + 1 !== mi : c.month !== mi) continue
    if (out.some((x) => x.name === c.name)) continue
    out.push({ name: c.name, label: d ? `${c.name} (${pad(d.getUTCDate())}/${pad(mi)})` : c.name, day: d ? d.getUTCDate() : 0 })
  }
  return out.sort((a, b) => a.day - b.day).map(({ name, label }) => ({ name, label }))
}
/** O que fazer na data (o cliente marca e pode responder falando). */
export const DATE_ACTIONS = ['Oferta especial', 'Produto da data', 'Evento', 'Só conteúdo']

// ───────── Histórias e assuntos (Italo, 20/11): uma por mês, em rodízio; todas também no briefing ─────────
export const HISTORIAS: string[] = [
  'Me conta como é um dia normal aí, do abrir ao fechar: o que acontece, quem chega, o que dá mais trabalho e o que você mais gosta de fazer.',
  'Me conta sobre os seus clientes: as dúvidas que eles mais trazem, o que eles costumam errar antes de chegar até você, e algum atendimento que te marcou, seja engraçado, difícil ou emocionante.',
  'Imagina que você vai ensinar alguém a escolher bem um produto ou serviço como o seu. O que você diria? O que diferencia um bom de um ruim, e o que as pessoas acreditam no seu ramo que não é verdade?',
  'Conta a história de vocês desde o começo: por que começou, o momento mais difícil, a virada, e do que vocês têm mais orgulho hoje.',
  'O que acontece aí dentro que o cliente não vê e ia achar interessante? Como é feito, quem faz, algum cuidado ou detalhe que ninguém imagina.',
  'Se você fosse dar um conselho para alguém começando no seu ramo, o que diria? E qual a maior lição que o seu negócio te ensinou?',
]
export const HISTORIA_FIO = 'Me conta um caso real disso?'
/** Resposta com menos que isso (caracteres) puxa o fio, uma vez. */
export const HISTORIA_CURTA = 240

type T = { area: Area; q: string; why: string; options?: string[] }
type Bank = Record<'oferta' | 'meta' | 'objecao' | 'operacao' | 'prova' | 'publico' | 'novidade' | 'limite' | 'passado' | 'proximo' | 'concorrencia' | 'ideias' | 'prioridade', T[]>

// {mes} {produto} {data} {nome} viram dados do cliente. Cada categoria tem variações: o motor escolhe uma que ainda não foi feita.
const BASE: Bank = {
  oferta: [
    { area: 'vendas', q: 'Se você pudesse escolher uma coisa para todo mundo comprar em {mes}, qual seria? Quanto custa?', why: 'Ex.: "{produto}, R$ 59,90". É o centro do mês.' },
    { area: 'vendas', q: 'Qual produto ou serviço dá a melhor margem e você quer empurrar em {mes}?', why: 'Ex.: "{produto}: custa pouco para fazer e vende bem".' },
    { area: 'vendas', q: 'Tem combo, kit ou condição especial que dá para lançar em {mes}?', why: 'Ex.: "leve 2, pague 1 na terça"; "parcelamento em 10x".', options: ['Combo', 'Kit', 'Parcelamento', 'Brinde', 'Ainda não'] },
  ],
  meta: [
    { area: 'consultoria', q: 'Qual número faria {mes} ser um mês bom para você?', why: 'Ex.: 300 pedidos, R$ 60 mil, 40 clientes novos. Um número só.', options: ['Vender mais', 'Clientes novos', 'Ticket maior', 'Mais seguidores'] },
    { area: 'consultoria', q: 'Comparando com o mês passado, quanto você quer crescer em {mes}?', why: 'Ex.: "10% a mais de vendas"; "o dobro de orçamentos".', options: ['Manter', '10% a mais', '20% a mais', 'O dobro'] },
  ],
  objecao: [
    { area: 'vendas', q: 'Qual pergunta ou reclamação você mais ouve antes de alguém comprar?', why: 'Ex.: "tá caro", "demora?", "tem garantia?". Vira conteúdo que responde antes.', options: ['Preço', 'Prazo', 'Confiança', 'Entrega', 'Garantia'] },
    { area: 'vendas', q: 'Por que alguém desiste de comprar de você?', why: 'Ex.: "achou mais barato no concorrente"; "não respondemos rápido".', options: ['Preço', 'Demora para responder', 'Escolheu outro', 'Vai pensar'] },
  ],
  operacao: [
    { area: 'vendas', q: 'Qual dia ou horário fica mais fraco? O que faria a pessoa vir nesse momento?', why: 'Ex.: "terça à tarde; um desconto só nesse horário puxaria".', options: ['Segunda', 'Terça', 'Quarta', 'Manhã', 'Tarde'] },
    { area: 'consultoria', q: 'Quanto você consegue atender a mais em {mes} sem perder a qualidade?', why: 'Ex.: "mais 50 pedidos por semana"; "agenda cheia, só 5 horários".', options: ['Bem mais', 'Um pouco mais', 'Estamos no limite'] },
  ],
  prova: [
    { area: 'audiovisual', q: 'Tem um cliente ou um trabalho recente que dá orgulho de mostrar?', why: 'Ex.: "a festa de 50 pessoas no sábado"; "o antes e depois da reforma".', options: ['Sim, com autorização', 'Sim, sem autorização ainda', 'Não'] },
    { area: 'audiovisual', q: 'Qual história do negócio quase ninguém conhece e vale contar?', why: 'Ex.: "como começou na garagem"; "a receita da avó".' },
  ],
  publico: [
    { area: 'social', q: 'Quem comprou de você na última semana? Descreva uma pessoa real.', why: 'Ex.: "mulher, uns 35 anos, do bairro, veio pelo Instagram".' },
    { area: 'social', q: 'Que tipo de cliente você quer MAIS e qual quer menos?', why: 'Ex.: "mais famílias no almoço; menos quem só pede desconto".' },
  ],
  novidade: [
    { area: 'consultoria', q: 'O que muda em {mes}? Produto, preço, horário, equipe, espaço?', why: 'Novidade é assunto pronto.', options: ['Nada novo', 'Produto novo', 'Preço novo', 'Horário novo', 'Equipe nova'] },
    { area: 'consultoria', q: 'Tem algo que você quer testar em {mes} e ainda não teve coragem?', why: 'Ex.: "abrir no domingo"; "vender pelo WhatsApp com entrega".' },
  ],
  limite: [
    { area: 'consultoria', q: 'Em {mes}, tem algo que a gente NÃO deve falar ou mostrar?', why: 'Evita retrabalho e erro com o público.', options: ['Nada', 'Preços', 'Rosto da equipe', 'Concorrentes'] },
  ],
  // Perguntas novas do mês (Italo, 20/11): valem para qualquer tipo de negócio.
  passado: [
    { area: 'vendas', q: 'O que mais vendeu no mês passado e o que encalhou?', why: 'Ex.: "o combo família voou; a sobremesa nova parou".' },
    { area: 'social', q: 'Algum cliente elogiou ou reclamou de algo novo no mês passado?', why: 'Elogio vira prova; reclamação vira ajuste antes de virar problema.', options: ['Elogiou', 'Reclamou', 'Nada de novo'] },
    { area: 'consultoria', q: 'O que aconteceu de diferente no mês passado (equipe, fornecedor, preço)?', why: 'Explica o resultado e muda o plano.', options: ['Nada', 'Equipe', 'Fornecedor', 'Preço', 'Espaço'] },
    { area: 'consultoria', q: 'Bateram a meta do mês passado?', why: 'Para acertar a meta deste mês.', options: ['Passou', 'Bateu', 'Faltou um pouco', 'Faltou muito', 'Não tinha meta'] },
  ],
  proximo: [
    { area: 'vendas', q: 'Tem produto, serviço ou novidade chegando em {mes}?', why: 'Ex.: "sabor novo dia 10"; "horário de domingo".', options: ['Sim', 'Não'] },
    { area: 'vendas', q: 'Algum produto vai faltar ou subir de preço em {mes}?', why: 'Para não anunciar o que vai acabar.', options: ['Vai faltar', 'Vai subir', 'Nada muda'] },
    { area: 'social', q: 'Tem evento, feira ou ação na região em {mes} de que dá para participar?', why: 'Ex.: "feira do bairro dia 14"; "corrida no domingo".' },
    { area: 'consultoria', q: 'Algum dia de {mes} fecha ou muda de horário?', why: 'Evita anúncio rodando com a porta fechada.', options: ['Fecha', 'Muda o horário', 'Tudo normal'] },
    { area: 'consultoria', q: 'Alguém da equipe sai de férias ou entra em {mes}?', why: 'Muda quem grava, quem atende e quanto dá para vender.', options: ['Férias', 'Gente nova', 'Nada muda'] },
  ],
  concorrencia: [
    { area: 'social', q: 'Viu algum concorrente fazendo promoção ou ação nova?', why: 'Ex.: "a pizzaria da esquina lançou rodízio na terça".', options: ['Sim', 'Não reparei'] },
    { area: 'social', q: 'Apareceu concorrente novo perto?', why: 'Diga o nome ou o @, se souber.', options: ['Sim', 'Não'] },
  ],
  ideias: [
    { area: 'social', q: 'Tem ideia de post ou vídeo que você quer ver em {mes}?', why: 'Pode mandar um exemplo que viu e gostou.' },
    { area: 'social', q: 'O que os clientes mais perguntaram neste mês?', why: 'Pergunta repetida vira conteúdo que responde antes.' },
    { area: 'audiovisual', q: 'Tem bastidor ou acontecimento bom para mostrar?', why: 'Ex.: "chegou o forno novo"; "a equipe fez 1 ano".' },
  ],
  prioridade: [
    { area: 'consultoria', q: 'Se só pudesse ter um resultado em {mes}, qual seria?', why: 'Uma coisa só: o plano gira em torno dela.', options: ['Vender mais', 'Clientes novos', 'Fortalecer a marca', 'Encher a agenda', 'Fidelizar'] },
    { area: 'consultoria', q: 'O que mais te preocupa para {mes}?', why: 'Ex.: "o movimento cair depois do feriado".' },
  ],
}

// Por nicho: troca o que precisa ser diferente (o resto vem da BASE).
const BY_FAMILY: Partial<Record<Family, Partial<Bank>>> = {
  bar: {
    oferta: [
      { area: 'vendas', q: 'Qual drink, petisco ou rodízio você quer que todo mundo peça em {mes}? Quanto custa?', why: 'Ex.: "rodízio de petiscos R$ 49,90"; "balde com 5 long necks".' },
      { area: 'vendas', q: 'Qual noite precisa encher em {mes} e o que faria a galera vir nela?', why: 'Ex.: "quinta; samba ao vivo + chopp em dobro até 21h".', options: ['Terça', 'Quarta', 'Quinta', 'Domingo'] },
    ],
    operacao: [
      { area: 'audiovisual', q: 'Quais atrações (música ao vivo, jogos, festa) estão marcadas para {mes}?', why: 'Ex.: "sábado 14: pagode com o Grupo X".' },
      { area: 'vendas', q: 'Como funciona reserva e aniversário em grupo hoje? Tem vantagem para quem traz a turma?', why: 'Ex.: "10+ pessoas: aniversariante não paga o couvert".' },
    ],
  },
  comida: {
    oferta: [
      { area: 'vendas', q: 'Se você pudesse escolher um prato ou combo para todo mundo pedir em {mes}, qual seria? Quanto custa?', why: 'Ex.: "{produto}, R$ 59,90". É o centro do mês.' },
      { area: 'vendas', q: 'Delivery ou salão: onde você quer mais movimento em {mes}?', why: 'Para colocar a força onde dá resultado.', options: ['Delivery', 'Salão', 'Os dois', 'Encomendas'] },
    ],
    prova: [
      { area: 'audiovisual', q: 'Qual prato tem a melhor história (receita da família, ingrediente especial, jeito de fazer)?', why: 'História vira vídeo que ninguém mais pode copiar.' },
    ],
  },
  saude: {
    oferta: [{ area: 'vendas', q: 'Qual consulta ou procedimento você mais quer encher a agenda em {mes}? Qual o valor ou a condição?', why: 'Ex.: "avaliação + retorno, R$ 350 em 2x".' }],
    objecao: [{ area: 'vendas', q: 'Qual dúvida ou medo o paciente mais traz antes de marcar?', why: 'Ex.: "dói?", "quanto tempo dura?", "plano cobre?".', options: ['Dor', 'Preço', 'Resultado', 'Plano de saúde', 'Tempo'] }],
    prova: [{ area: 'audiovisual', q: 'Tem um caso que mostra bem o seu cuidado? O paciente autorizou mostrar?', why: 'Só usamos com autorização por escrito.', options: ['Sim, com autorização', 'Sim, sem autorização ainda', 'Não'] }],
    limite: [{ area: 'consultoria', q: 'O que o conselho da sua profissão (ou você) não deixa falar ou mostrar?', why: 'Ex.: preço no post, promessa de resultado, rosto de paciente.', options: ['Preço', 'Promessa de resultado', 'Rosto de paciente', 'Antes e depois'] }],
  },
  beleza: {
    oferta: [{ area: 'vendas', q: 'Qual serviço você quer lotar a agenda em {mes}? Qual o valor?', why: 'Ex.: "harmonização, R$ 1.200 em 3x"; "corte + barba R$ 65".' }],
    prova: [{ area: 'audiovisual', q: 'Qual transformação recente você mostraria (com autorização)?', why: 'Antes e depois real convence mais que qualquer texto.', options: ['Tenho com autorização', 'Preciso pedir', 'Não tenho'] }],
  },
  automotivo: {
    oferta: [{ area: 'vendas', q: 'Qual modelo, peça ou serviço você quer girar em {mes}? Tem estoque parado?', why: 'Ex.: "CG 160 0 km, 6 unidades"; "kit LED com instalação".' }],
    objecao: [{ area: 'vendas', q: 'O cliente pede o preço à vista, a parcela ou a entrada primeiro?', why: 'Define como o anúncio e o atendimento falam.', options: ['À vista', 'Parcela', 'Entrada', 'Troca'] }],
  },
  varejo: {
    oferta: [{ area: 'vendas', q: 'Qual produto você quer vender mais em {mes}? Tem estoque parado que precisa girar?', why: 'Ex.: "óculos de sol, 40 peças paradas".' }],
    operacao: [{ area: 'vendas', q: 'Vende mais na loja, no WhatsApp ou online? Onde quer crescer?', why: 'Para colocar a força onde dá resultado.', options: ['Loja física', 'WhatsApp', 'Site', 'Marketplace'] }],
  },
  b2b: {
    oferta: [{ area: 'vendas', q: 'Que tipo de empresa você mais quer atrair em {mes} (ramo, porte, região)?', why: 'Ex.: "hotéis com mais de 50 quartos no litoral sul".' }],
    objecao: [{ area: 'vendas', q: 'Quem decide a compra do lado do cliente e o que faz ele adiar?', why: 'Ex.: "comprador; adia sem ver o custo da parada".', options: ['Dono', 'Comprador', 'Engenheiro', 'Preço', 'Prazo'] }],
    prova: [{ area: 'audiovisual', q: 'Qual problema caro o cliente evita com vocês? Tem um número real?', why: 'Ex.: "máquina parada custa R$ 30 mil por dia".' }],
    publico: [{ area: 'social', q: 'Qual cliente atual você gostaria de ter mais 10 iguais? Por quê?', why: 'Ex.: "a construtora X: paga em dia e compra todo mês".' }],
  },
  educacao: {
    oferta: [{ area: 'vendas', q: 'O que precisa ser mais procurado em {mes}: matrícula, curso, evento ou contribuição?', why: 'Ex.: "matrículas para 2027 até 15/12".', options: ['Matrícula', 'Curso', 'Evento', 'Contribuição'] }],
    publico: [{ area: 'social', q: 'Quem decide: os pais, o aluno ou os dois? O que eles mais valorizam aqui?', why: 'Ex.: "pais; disciplina e aprovação no vestibular".' }],
    operacao: [{ area: 'consultoria', q: 'Quais eventos, provas ou datas da escola acontecem em {mes}?', why: 'Ex.: "formatura 12/12"; "rematrícula até 20/12".' }],
    objecao: [{ area: 'vendas', q: 'O que faz uma família escolher outra escola ou curso?', why: 'Ex.: "mensalidade"; "distância"; "não conhecem a proposta".', options: ['Preço', 'Distância', 'Não conhecem', 'Resultados'] }],
    prova: [{ area: 'audiovisual', q: 'Qual conquista recente de aluno ou da escola dá para mostrar?', why: 'Ex.: "3 aprovados em medicina"; "medalha na olimpíada".' }],
  },
  terceiro_setor: {
    oferta: [{ area: 'consultoria', q: 'O que a instituição mais precisa em {mes}: associados, doações, voluntários ou presença em evento?', why: 'Ex.: "200 famílias contribuindo"; "voluntários para o mutirão".', options: ['Associados', 'Doações', 'Voluntários', 'Evento'] }],
    meta: [{ area: 'consultoria', q: 'Qual número mostraria que {mes} foi bom para a instituição?', why: 'Ex.: "50 novos associados"; "R$ 10 mil arrecadados".' }],
    objecao: [{ area: 'vendas', q: 'Por que as pessoas não contribuem ou não participam hoje?', why: 'Ex.: "não sabem para onde vai o dinheiro"; "acham que é obrigatório".', options: ['Não conhecem', 'Desconfiança', 'Falta de tempo', 'Acham caro'] }],
    prova: [{ area: 'audiovisual', q: 'O que a instituição fez este ano que pouca gente sabe? Tem número?', why: 'Ex.: "mantivemos 6 professores"; "reformamos a quadra".' }],
    publico: [{ area: 'social', q: 'Quem mais participa e quem você queria trazer?', why: 'Ex.: "pais do 6º ano participam; queremos os do ensino médio".' }],
    operacao: [{ area: 'consultoria', q: 'Quem da instituição pode aparecer, gravar ou responder mensagens em {mes}?', why: 'Ex.: "a presidente grava; a secretária responde o WhatsApp".' }],
    novidade: [{ area: 'consultoria', q: 'O que a instituição vai fazer ou decidir em {mes} que a comunidade precisa saber?', why: 'Ex.: "assembleia dia 10"; "prestação de contas do ano".' }],
    limite: [{ area: 'consultoria', q: 'Tem regra, estatuto ou tema que a comunicação não pode tocar?', why: 'Ex.: política, valores de contribuição, nomes de alunos.', options: ['Política', 'Valores', 'Nomes', 'Nada'] }],
  },
}

// Nichos em que a base genérica (comprar, combo, dia fraco) cabe quando o banco próprio acaba.
const GENERIC_OK = new Set<Family>(['comida', 'bar', 'varejo', 'automotivo', 'beleza', 'servicos'])

/**
 * TRILHAS em profundidade (Italo, 20/11: "ir até o fundo para saber exatamente tudo"). Cada tipo tem uma pergunta-mãe
 * com opções e subperguntas que só aparecem conforme a resposta (ex.: automotivo → motos → novas ou usadas → marcas → a
 * que mais vende). `if` = palavras que, na resposta da mãe, liberam a subpergunta; sem `if` = sempre depois da mãe.
 */
type Node = { area: Area; q: string; why: string; options?: string[]; if?: string[]; kids?: Node[] }
const TRAIL: Partial<Record<Family, Node[]>> = {
  automotivo: [{ area: 'vendas', q: 'O que vocês vendem ou fazem?', why: 'Pode marcar mais de um.', options: ['Motos', 'Carros', 'Peças e acessórios', 'Oficina ou serviço', 'Consórcio ou financiamento'], kids: [
    { area: 'vendas', q: 'As motos são novas, seminovas ou as duas?', why: 'Muda o público e o anúncio.', options: ['Novas (0 km)', 'Seminovas', 'As duas'], if: ['moto'], kids: [
      { area: 'vendas', q: 'Quais marcas de moto vocês trabalham?', why: 'Ex.: Honda, Yamaha, Shineray.', options: ['Honda', 'Yamaha', 'Shineray', 'Suzuki', 'Outras'] },
      { area: 'vendas', q: 'Qual moto mais vende hoje e quanto custa (à vista e na parcela)?', why: 'Ex.: "CG 160, R$ 18.900 ou 48x de R$ 590".' },
      { area: 'vendas', q: 'Tem moto parada no estoque que precisa girar? Quais e quantas?', why: 'Vira oferta do mês.' },
    ] },
    { area: 'vendas', q: 'Os carros são novos, seminovos ou as duas?', why: 'Muda o público e o anúncio.', options: ['Novos', 'Seminovos', 'As duas'], if: ['carro'], kids: [
      { area: 'vendas', q: 'Qual a faixa de preço dos carros que mais saem?', why: 'Ex.: "de R$ 40 a 70 mil".', options: ['Até R$ 40 mil', 'R$ 40 a 80 mil', 'R$ 80 a 150 mil', 'Acima de R$ 150 mil'] },
      { area: 'vendas', q: 'Aceitam troca? Financiam pela loja ou por banco?', why: 'Entra na copy do anúncio.', options: ['Aceita troca', 'Financiamento próprio', 'Financia por banco', 'Só à vista'] },
    ] },
    { area: 'vendas', q: 'Quais serviços da oficina mais saem e quanto custam?', why: 'Ex.: "revisão R$ 180; troca de óleo R$ 90".', if: ['oficina', 'servico'] },
    { area: 'vendas', q: 'Quais peças ou acessórios vendem mais? Tem instalação?', why: 'Ex.: "capacete, baú, kit LED com instalação".', if: ['peca', 'acessorio'] },
    { area: 'vendas', q: 'Quem mais compra: quem usa para trabalhar, para passear ou primeiro veículo?', why: 'Define o tom do conteúdo.', options: ['Trabalho (entrega, app)', 'Lazer', 'Primeiro veículo', 'Empresas e frotas'] },
  ] }],
  comida: [{ area: 'vendas', q: 'Como o cliente mais compra de vocês?', why: 'Pode marcar mais de um.', options: ['Salão', 'Delivery próprio', 'iFood ou app', 'Retirada', 'Encomenda'], kids: [
    { area: 'vendas', q: 'Quantos pedidos de delivery saem num dia bom e num dia fraco?', why: 'Ex.: "80 no sábado, 20 na terça".', if: ['delivery', 'ifood', 'app'] },
    { area: 'vendas', q: 'Qual o ticket médio do pedido e o prato mais pedido?', why: 'Ex.: "R$ 62; pizza calabresa".' },
    { area: 'vendas', q: 'Quantas mesas, e quais dias e horários enchem ou ficam vazios?', why: 'Ex.: "20 mesas; lota sexta à noite, vazio na terça".', if: ['salao'] },
    { area: 'vendas', q: 'Encomendas: com quanta antecedência e qual o pedido mínimo?', why: 'Ex.: "48h; mínimo 50 salgados".', if: ['encomenda'] },
  ] }],
  saude: [{ area: 'vendas', q: 'Quais especialidades ou procedimentos vocês fazem?', why: 'Pode marcar mais de um.', options: ['Consulta', 'Exame', 'Procedimento estético', 'Tratamento contínuo', 'Cirurgia'], kids: [
    { area: 'vendas', q: 'Atendem plano de saúde, particular ou os dois? Quais planos?', why: 'Muda totalmente a comunicação.', options: ['Só particular', 'Só plano', 'Os dois'] },
    { area: 'vendas', q: 'Qual procedimento dá mais retorno e quanto custa?', why: 'Ex.: "clareamento, R$ 1.200 em 3x".' },
    { area: 'vendas', q: 'Quantos horários vagos na agenda por semana, e em quais dias?', why: 'Para o anúncio encher o que está vazio.' },
  ] }],
  beleza: [{ area: 'vendas', q: 'Quais serviços vocês fazem?', why: 'Pode marcar mais de um.', options: ['Cabelo', 'Unhas', 'Estética facial', 'Estética corporal', 'Barba', 'Sobrancelha e cílios'], kids: [
    { area: 'vendas', q: 'Qual serviço tem mais procura e qual você quer lotar? Valores?', why: 'Ex.: "progressiva R$ 250 lota; quero lotar limpeza de pele R$ 150".' },
    { area: 'vendas', q: 'Tem pacote, plano mensal ou clube de assinatura?', why: 'Recorrência segura o caixa.', options: ['Pacote', 'Plano mensal', 'Clube', 'Não tem'] },
    { area: 'vendas', q: 'Quantos profissionais atendem e quantos horários livres por semana?', why: 'Define quanto dá para vender.' },
  ] }],
  varejo: [{ area: 'vendas', q: 'Onde vocês vendem?', why: 'Pode marcar mais de um.', options: ['Loja física', 'WhatsApp', 'Instagram', 'Site', 'Marketplace'], kids: [
    { area: 'vendas', q: 'Quais as 3 categorias que mais vendem e o preço médio de cada?', why: 'Ex.: "óculos de sol R$ 180; armação R$ 350".' },
    { area: 'vendas', q: 'Entregam? Em quais bairros e com qual prazo e taxa?', why: 'Entra no anúncio.', if: ['whatsapp', 'instagram', 'site'] },
    { area: 'vendas', q: 'Qual marketplace e quanto ele representa nas vendas?', why: 'Ex.: "Mercado Livre, 30%".', if: ['marketplace'] },
  ] }],
  b2b: [{ area: 'vendas', q: 'Para que tipo de empresa vocês vendem?', why: 'Pode marcar mais de um.', options: ['Indústria', 'Comércio', 'Construtoras', 'Órgão público', 'Hotéis e restaurantes'], kids: [
    { area: 'vendas', q: 'Qual o ticket médio de um contrato e quanto tempo leva para fechar?', why: 'Ex.: "R$ 25 mil; 45 dias".' },
    { area: 'vendas', q: 'Quem decide a compra do lado do cliente?', why: 'O anúncio fala com essa pessoa.', options: ['Dono', 'Comprador', 'Engenheiro ou técnico', 'Diretoria'] },
    { area: 'vendas', q: 'Vendem para o governo por licitação? Quais órgãos?', why: 'É outro jeito de vender.', if: ['publico'] },
  ] }],
  educacao: [{ area: 'vendas', q: 'O que vocês oferecem?', why: 'Pode marcar mais de um.', options: ['Educação infantil', 'Fundamental', 'Médio', 'Cursos livres', 'Graduação', 'Pré-vestibular'], kids: [
    { area: 'vendas', q: 'Quantas vagas abertas para 2027 e até quando vai a matrícula?', why: 'Ex.: "40 vagas no 6º ano até 15/12".' },
    { area: 'vendas', q: 'Qual a mensalidade e tem desconto (irmão, à vista, pontualidade)?', why: 'Só valor real entra.' },
    { area: 'vendas', q: 'Qual resultado de aluno dá para mostrar (aprovados, medalhas)?', why: 'Prova vende mais que promessa.' },
  ] }],
  terceiro_setor: [{ area: 'consultoria', q: 'Quem a instituição atende ou representa?', why: 'Ex.: famílias da escola, comunidade, fiéis.', options: ['Famílias', 'Alunos', 'Comunidade do bairro', 'Fiéis', 'Associados'], kids: [
    { area: 'consultoria', q: 'Quantas pessoas contribuem hoje e quantas poderiam contribuir?', why: 'Ex.: "300 de 1.200 famílias".' },
    { area: 'consultoria', q: 'Para onde vai o dinheiro? Dá para mostrar com números?', why: 'Transparência aumenta contribuição.' },
    { area: 'consultoria', q: 'Quais eventos ou ações a instituição faz no ano?', why: 'Ex.: festa junina, bazar, formatura.' },
  ] }],
  servicos: [{ area: 'vendas', q: 'Como o cliente contrata vocês?', why: 'Pode marcar mais de um.', options: ['Orçamento', 'Pacote fechado', 'Por hora', 'Contrato mensal'], kids: [
    { area: 'vendas', q: 'Qual serviço mais vende e quanto custa (ou a partir de quanto)?', why: 'Só valor real entra.' },
    { area: 'vendas', q: 'Quanto tempo do primeiro contato até fechar? Onde o cliente some?', why: 'Mostra onde o atendimento perde venda.' },
    { area: 'vendas', q: 'Quantos clientes novos por mês vocês conseguem atender?', why: 'Para não vender mais do que entrega.' },
  ] }],
  bar: [{ area: 'vendas', q: 'O que mais movimenta a casa?', why: 'Pode marcar mais de um.', options: ['Música ao vivo', 'Futebol', 'Happy hour', 'Petiscos', 'Drinks'], kids: [
    { area: 'vendas', q: 'Quais dias enchem e quais ficam vazios?', why: 'O conteúdo trabalha os dias fracos.' },
    { area: 'vendas', q: 'Qual o consumo médio por pessoa e o carro-chefe?', why: 'Ex.: "R$ 70; balde de cerveja".' },
  ] }],
}

/** Passo do guia (mesmo formato do QuizStep do briefing). */
export interface GuideStep { q: string; opts: string[]; multi?: boolean; when?: { q: string; has: string[] }; open?: boolean }

const OFFER_KIND: Record<Family, string[]> = {
  comida: ['Combo', 'Prato do dia', 'Promoção no dia fraco', 'Frete grátis', 'Produto da data', 'Cupom de volta'],
  bar: ['Happy hour', 'Balde ou rodada', 'Evento com música', 'Aniversariante', 'Jogo no telão'],
  saude: ['Avaliação com desconto', 'Pacote de sessões', 'Check-up', 'Condição no cartão', 'Retorno incluso'],
  beleza: ['Pacote de sessões', 'Primeira vez com desconto', 'Combo de serviços', 'Plano mensal', 'Indique e ganhe'],
  varejo: ['Queima de estoque', 'Compre 2 leve 3', 'Frete grátis', 'Brinde', 'Parcelamento sem juros', 'Lançamento'],
  automotivo: ['Taxa zero', 'Entrada facilitada', 'Brinde (capacete, acessório)', 'Revisão grátis', 'Bônus na troca', 'Seminovo com garantia'],
  b2b: ['Visita técnica grátis', 'Teste ou amostra', 'Condição para contrato anual', 'Prazo de pagamento', 'Diagnóstico grátis'],
  educacao: ['Matrícula com desconto', 'Desconto para irmãos', 'Aula experimental', 'Material grátis', 'Pagamento à vista'],
  terceiro_setor: ['Campanha de contribuição', 'Evento beneficente', 'Rifa ou bazar', 'Associação com benefício', 'Mutirão'],
  servicos: ['Orçamento grátis', 'Pacote fechado', 'Primeira consulta grátis', 'Desconto à vista', 'Garantia estendida'],
}
const GOAL_UNIT: Record<Family, string[]> = {
  comida: ['Pedidos por dia', 'Faturamento do mês', 'Ticket médio', 'Mesas cheias'],
  bar: ['Público por noite', 'Faturamento do mês', 'Reservas'],
  saude: ['Consultas no mês', 'Agenda cheia (%)', 'Pacientes novos', 'Procedimentos'],
  beleza: ['Atendimentos no mês', 'Clientes novos', 'Pacotes vendidos', 'Agenda cheia (%)'],
  varejo: ['Vendas no mês', 'Faturamento', 'Ticket médio', 'Pedidos online'],
  automotivo: ['Veículos vendidos', 'Serviços na oficina', 'Leads no WhatsApp', 'Faturamento'],
  b2b: ['Contratos fechados', 'Orçamentos enviados', 'Reuniões marcadas', 'Faturamento'],
  educacao: ['Matrículas', 'Rematrículas', 'Visitas na escola', 'Inscrições'],
  terceiro_setor: ['Associados novos', 'Contribuição arrecadada', 'Participantes no evento', 'Voluntários'],
  servicos: ['Clientes novos', 'Orçamentos', 'Contratos fechados', 'Faturamento'],
}

/**
 * Guias do mês (Ofertas, Meta, Datas) já do jeito do cliente (Italo, 20/11: "bem precisas, entendendo o negócio"):
 * as opções vêm dos produtos dele, do tipo de negócio e das datas daquele mês.
 */
export function monthGuide(key: 'ofertas' | 'meta' | 'datas_travam', fam: Family, products: { nome: string; preco?: string }[], month: string): GuideStep[] {
  const mi = Number(month.slice(5, 7))
  const mes = MESES[mi - 1] ?? 'o mês'
  const prods = products.map((p) => p.nome?.trim()).filter((x): x is string => !!x).slice(0, 8)
  const cal = monthDates(month, fam)
  const pick = `Quais datas de ${mes} vão ter algo especial?`
  // Para cada data marcada, o que fazer (só aparece a da data escolhida).
  const perDate: GuideStep[] = cal.length ? [
    { q: pick, opts: [...cal.map((d) => d.label), 'Nenhuma'], multi: true },
    ...cal.map((d) => ({ q: `Para ${d.label}, o que vocês vão fazer?`, opts: DATE_ACTIONS, multi: true, when: { q: pick, has: [d.name] } })),
  ] : []
  if (key === 'ofertas') return [
    { q: `O que precisa vender mais em ${mes}?`, opts: prods.length ? prods : ['O carro-chefe', 'Um lançamento', 'O de maior margem', 'Estoque parado'], multi: true },
    { q: 'Que tipo de oferta faz sentido?', opts: OFFER_KIND[fam], multi: true },
    { q: 'Qual o preço ou a condição real da oferta?', opts: [], open: true },
    { q: 'Até quando vale e tem limite (estoque, vagas)?', opts: ['Até o fim do mês', 'Só um fim de semana', 'Até acabar o estoque', 'Vagas limitadas'], multi: true },
    ...perDate,
    { q: 'Alguma ação junto da oferta?', opts: ['Influenciador', 'Parceria com outro negócio', 'Sorteio', 'Evento', 'Indique e ganhe', 'Nenhuma'], multi: true },
  ]
  if (key === 'meta') return [
    { q: `O que conta como resultado em ${mes}?`, opts: GOAL_UNIT[fam] },
    { q: 'Quanto foi no mês passado?', opts: [], open: true },
    { q: 'Qual o número da meta deste mês?', opts: [], open: true },
    { q: 'Por que esse número?', opts: ['Pagar as contas', 'Crescer em relação ao mês passado', 'Data forte no mês', 'Encher a capacidade', 'Lançamento'], multi: true },
  ]
  return [
    ...(cal.length ? [{ q: `Alguma destas datas de ${mes} muda o funcionamento?`, opts: [...cal.map((d) => d.label), 'Nenhuma'], multi: true }] : []),
    { q: `Tem dia em ${mes} que não dá para gravar ou atender?`, opts: ['Feriado fechado', 'Férias da equipe', 'Reforma', 'Viagem do dono', 'Evento que lota', 'Nada trava'], multi: true },
    { q: 'Quais dias exatamente?', opts: [], open: true, when: { q: `Tem dia em ${mes} que não dá para gravar ou atender?`, has: ['feriado', 'ferias', 'reforma', 'viagem', 'evento'] } },
    { q: 'Mudança de horário no mês?', opts: ['Abre mais tarde', 'Fecha mais cedo', 'Abre domingo', 'Horário normal'], multi: true },
  ]
}

/** Número estável a partir de um texto (mesmo cliente + mês = mesma escolha). */
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

// O que mais importa sempre entra; o resto gira mês a mês (nada fica esquecido).
const CORE: (keyof Bank)[] = ['oferta', 'meta', 'prioridade', 'passado', 'proximo']
const REST: (keyof Bank)[] = ['objecao', 'operacao', 'prova', 'publico', 'ideias', 'concorrencia', 'novidade', 'limite']
/** Perguntas principais do mês (sem contar as subperguntas). */
export const MONTH_MAIN = 10

/** As perguntas do mês para este cliente (10 principais + subperguntas). */
export function monthQuestions(inp: EngineInput): EngineQuestion[] {
  const fam = inp.family ?? familyOf(inp.segment, inp.description, inp.name)
  const mi = Number(inp.month.slice(5, 7))
  const mes = MESES[mi - 1] ?? ''
  const prod = (inp.products ?? []).find((p) => p.nome?.trim())?.nome?.trim() ?? 'seu carro-chefe'
  const N = MONTH_MAIN
  const ORDER = [...CORE, ...REST.map((_, i) => REST[(i + mi) % REST.length]!)]
  const asked = new Set(inp.asked.map(norm))
  const fill = (s: string, extra: Record<string, string> = {}) => Object.entries({ mes, produto: prod, nome: inp.name.trim(), ...extra }).reduce((t, [k, v]) => t.split(`{${k}}`).join(v), s)
  const out: EngineQuestion[] = []
  const used = new Set<string>()
  const push = (t: T, extra?: Record<string, string>) => {
    const q = fill(t.q, extra)
    if (asked.has(norm(q)) || used.has(norm(q))) return false
    used.add(norm(q)); out.push({ area: t.area, question: q, why: fill(t.why, extra), options: t.options ?? [] }); return true
  }

  // 1) Cruzamento de dados: o que falta no briefing vira pergunta (antes das genéricas).
  const noPrice = (inp.products ?? []).filter((p) => p.nome && !p.preco).slice(0, 1)[0]
  if (!(inp.products ?? []).length) push({ area: 'vendas', q: 'Quais são os 5 produtos ou serviços que mais vendem, com o preço de hoje?', why: 'Ex.: "Pizza grande R$ 59,90; Calzone R$ 42". Pode mandar foto do cardápio ou a tabela.' })
  else if (noPrice) push({ area: 'vendas', q: `Quanto custa hoje ${noPrice.nome}?`, why: 'Só preço real entra na estratégia.' })
  if (!(inp.competitors ?? []).length && !inp.noCompetitors) push({ area: 'social', q: 'Quem você vê como concorrente aqui perto? (nome ou @ do Instagram)', why: 'Ex.: "@pizzariadobairro e a Forno Bom". Se não tem, responda "não tenho".', options: ['Não tenho concorrente direto'] })
  else if ((inp.competitors ?? [])[0]) push({ area: 'social', q: `O que ${inp.competitors![0]!.nome} faz que você acha que funciona (ou que não funciona)?`, why: 'Ex.: "promoção de terça lota"; "atendimento demora".' })
  // Calendário: o cliente marca as datas do mês e, para cada uma, diz o que fazer (Italo, 20/11).
  const kids: EngineQuestion[] = []
  const cal = monthDates(inp.month, fam).slice(0, 8)
  if (cal.length) {
    const mother = `Quais datas de ${mes} você quer aproveitar?`
    used.add(norm(mother))
    out.push({ area: 'consultoria', question: mother, why: 'Marque quantas quiser. Para cada uma, a gente pergunta o que fazer.', options: [...cal.map((d) => d.label), 'Nenhuma'] })
    for (const d of cal) kids.push({ area: 'consultoria', question: `Para ${d.label}, o que vocês vão fazer?`, why: 'Pode marcar mais de uma ou responder falando.', options: DATE_ACTIONS, cond: { q: mother, has: [d.name] } })
  }
  // História do mês (rodízio): conversa longa para virar conteúdo; resposta curta puxa o fio uma vez.
  const hs = HISTORIAS.map((_, i) => HISTORIAS[(i + mi + (hash(inp.clientId) % HISTORIAS.length)) % HISTORIAS.length]!)
  const story = hs.find((h) => !asked.has(norm(h))) ?? hs[0]!
  used.add(norm(story))
  out.push({ area: 'audiovisual', question: story, why: 'Fale à vontade, de 1 a 3 minutos: vira vídeo, arte e texto.', options: [] })
  kids.push({ area: 'audiovisual', question: HISTORIA_FIO, why: 'Um caso real deixa o conteúdo verdadeiro.', options: [], cond: { q: story, has: [], short: HISTORIA_CURTA } })

  // 2) Perguntas do diagnóstico que ficaram em aberto (até 2): são as mais deste cliente.
  for (const d of (inp.diagQuestions ?? []).slice(0, 6)) {
    if (out.length >= 7) break
    if (out.filter((x) => x.why.startsWith('Do diagnóstico')).length >= 2) break
    if (d.pergunta?.trim()) push({ area: 'consultoria', q: d.pergunta.trim(), why: `Do diagnóstico: ${d.por_que?.trim() || 'ficou em aberto'}`.slice(0, 200) })
  }

  // 3) Banco do nicho (com a base): uma por categoria, a variação que ainda não foi feita.
  for (const cat of ORDER) {
    if (out.length >= N) break
    if (cat === 'meta' && inp.meta?.trim()) continue
    if (cat === 'publico' && (inp.publico ?? '').trim().length > 40) continue
    // O nicho primeiro; a base só entra se o nicho não tem esta categoria ou já perguntou tudo dela.
    const own = BY_FAMILY[fam]?.[cat] ?? []
    for (const pool of [own, own.length && !GENERIC_OK.has(fam) ? [] : BASE[cat]]) {
      if (!pool.length) continue
      const start = hash(`${inp.clientId}${inp.month}${cat}`) % pool.length
      let ok = false
      for (let i = 0; i < pool.length; i++) if (push(pool[(start + i) % pool.length]!)) { ok = true; break }
      if (ok) break
    }
  }
  // 4) Completa até N com o que sobrou do banco do nicho e, se couber no nicho, da base (nunca repetindo).
  for (const cat of ORDER) {
    if (out.length >= N) break
    const own = BY_FAMILY[fam]?.[cat] ?? []
    for (const t of [...own, ...(GENERIC_OK.has(fam) || !own.length ? BASE[cat] : [])]) { if (out.length >= N) break; push(t) }
  }
  // 5) Trilha em profundidade do tipo de negócio (subperguntas que aparecem conforme a resposta).
  const deep: EngineQuestion[] = []
  const walk = (nodes: Node[], parent: string | null) => {
    for (const n of nodes) {
      const q = fill(n.q)
      if (asked.has(norm(q)) || used.has(norm(q))) continue
      used.add(norm(q))
      deep.push({ area: n.area, question: q, why: fill(n.why), options: n.options ?? [], ...(parent ? { cond: { q: parent, has: n.if ?? [] } } : {}) })
      if (n.kids) walk(n.kids, q)
    }
  }
  walk(TRAIL[fam] ?? [], null)
  return [...out.slice(0, N), ...kids, ...deep.slice(0, 14)]
}
