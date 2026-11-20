// Motor das perguntas do mês (SEM IA) — Italo, 17/11: "estudando o nicho do cliente, cruzando dados, sempre perguntas diferentes;
// um bar não recebe as mesmas perguntas de um órgão sem fins lucrativos".
// Entra: cadastro (segmento, descrição), briefing (produtos, concorrentes…), mês, perguntas já feitas e o diagnóstico.
// Sai: 8 perguntas abertas, com exemplo ("Ex.: …" aparece para o cliente) e opções para tocar.
// Determinístico: o mesmo cliente no mesmo mês recebe as mesmas perguntas; o que já foi perguntado em outro mês não volta.

export type Family = 'bar' | 'comida' | 'saude' | 'beleza' | 'varejo' | 'automotivo' | 'b2b' | 'servicos' | 'educacao' | 'terceiro_setor'
export type Area = 'consultoria' | 'vendas' | 'social' | 'audiovisual'
export interface EngineQuestion { area: Area; question: string; why: string; options: string[] }
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

/** O nicho pela descrição e pelo segmento (sem fins lucrativos e educação primeiro: são os mais diferentes). */
export function familyOf(segment?: string | null, description?: string | null, name?: string | null): Family {
  const t = norm(`${segment ?? ''} ${name ?? ''} ${(description ?? '').slice(0, 600)}`)
  const seg = norm(segment ?? '')
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

/** Datas que mexem com o mês (Recife). */
const DATES: Record<number, string[]> = {
  1: ['as férias de janeiro', 'a volta às aulas'], 2: ['o Carnaval', 'a volta às aulas'], 3: ['o Dia do Consumidor (15/03)', 'o Dia da Mulher (08/03)'],
  4: ['a Páscoa'], 5: ['o Dia das Mães'], 6: ['o São João', 'o Dia dos Namorados (12/06)'], 7: ['as férias de julho'],
  8: ['o Dia dos Pais'], 9: ['o Dia do Cliente (15/09)'], 10: ['o Dia das Crianças (12/10)'], 11: ['a Black Friday'], 12: ['o Natal', 'o Réveillon'],
}

type T = { area: Area; q: string; why: string; options?: string[] }
type Bank = Record<'oferta' | 'meta' | 'objecao' | 'operacao' | 'prova' | 'publico' | 'novidade' | 'limite', T[]>

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

/** Número estável a partir de um texto (mesmo cliente + mês = mesma escolha). */
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

const ORDER: (keyof Bank)[] = ['oferta', 'meta', 'objecao', 'operacao', 'prova', 'publico', 'novidade', 'limite']

/** As 8 perguntas do mês para este cliente. */
export function monthQuestions(inp: EngineInput): EngineQuestion[] {
  const fam = inp.family ?? familyOf(inp.segment, inp.description, inp.name)
  const mi = Number(inp.month.slice(5, 7))
  const mes = MESES[mi - 1] ?? ''
  const prod = (inp.products ?? []).find((p) => p.nome?.trim())?.nome?.trim() ?? 'seu carro-chefe'
  const dates = DATES[mi] ?? []
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
  if (dates.length) { const d = dates[hash(inp.clientId + inp.month) % dates.length]!; push({ area: 'consultoria', q: `Como você quer aproveitar ${d}?`, why: 'Planejamos antes para não perder a data.', options: ['Oferta especial', 'Produto da data', 'Evento', 'Não vamos usar'] }) }

  // 2) Perguntas do diagnóstico que ficaram em aberto (até 2): são as mais deste cliente.
  for (const d of (inp.diagQuestions ?? []).slice(0, 6)) {
    if (out.length >= 5) break
    if (out.filter((x) => x.why.startsWith('Do diagnóstico')).length >= 2) break
    if (d.pergunta?.trim()) push({ area: 'consultoria', q: d.pergunta.trim(), why: `Do diagnóstico: ${d.por_que?.trim() || 'ficou em aberto'}`.slice(0, 200) })
  }

  // 3) Banco do nicho (com a base): uma por categoria, a variação que ainda não foi feita.
  for (const cat of ORDER) {
    if (out.length >= 8) break
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
  // 4) Completa até 8 com o que sobrou do banco do nicho e, se couber no nicho, da base (nunca repetindo).
  for (const cat of ORDER) {
    if (out.length >= 8) break
    const own = BY_FAMILY[fam]?.[cat] ?? []
    for (const t of [...own, ...(GENERIC_OK.has(fam) || !own.length ? BASE[cat] : [])]) { if (out.length >= 8) break; push(t) }
  }
  return out.slice(0, 8)
}
