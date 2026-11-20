// Regras da aba Consultoria (Estratégia): situação de cada cliente, a ação de 1 toque e os avisos da Bete/Início.

export type ConsultStatus = 'falta_dados' | 'na_fila' | 'gerando' | 'pronto' | 'aprovado' | 'enviado' | 'erro' | 'limite'
export type ConsultSection = 'resumo' | 'diagnostico' | 'comunicacao' | 'plano' | 'riscos' | 'do_cliente'

export interface ConsultRow {
  client_id: string; name: string; logo_path: string | null; segment: string | null
  document: string | null; instagram: string | null; website: string | null
  status: ConsultStatus; stage: string | null; redo_section: ConsultSection | null; error: string | null
  updated_at: string | null; finished_at: string | null; suggestions: number; can_generate: boolean; direction: string | null
  questions_open?: number; questions_answered?: number; answers_new?: number; answers_last?: string | null
  /** Estratégia do mês mais recente (Consultoria → Estratégia). */
  monthly?: { month: string; status: string; finished_at: string | null; pending: number; suggestions: number } | null
  /** Contratou Consultoria (diagnóstico)? Sem ela, o cliente entra pela área (tráfego, social, audiovisual) e não tem diagnóstico. */
  consultoria?: boolean
  /** Áreas com serviço ativo (mesma regra do banco: client_in_area). */
  areas?: { trafego: boolean; social: boolean; audiovisual: boolean }
}

export const CONSULT_PATH = '/estrategia/consultoria'
/** Quem abre a Consultoria: os líderes veem tudo; tráfego, social e design veem os seus clientes e a sua parte. */
export const CONSULT_ROLES = ['admin', 'head_marketing', 'traffic_manager', 'social_media', 'designer'] as const
export const consultLink = (clientId: string) => `${CONSULT_PATH}?cliente=${clientId}`

export const SECTIONS: { id: ConsultSection; label: string }[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'comunicacao', label: 'Comunicação' },
  { id: 'plano', label: 'Plano' },
  { id: 'riscos', label: 'Riscos' },
  { id: 'do_cliente', label: 'Do cliente' },
]

const STAGE_LABEL: Record<string, string> = {
  research: 'pesquisando o negócio', diagnostico: 'escrevendo o diagnóstico', comunicacao: 'escrevendo tom e experiência',
  plano: 'montando o plano de ação', resumo: 'fechando o resumo', redo: 'refazendo uma parte',
}

/** Etiqueta da situação: texto curto, cor e se pede ação da equipe. */
export function statusChip(r: Pick<ConsultRow, 'status' | 'document' | 'stage'>): { label: string; tone: 'warn' | 'info' | 'ok' | 'muted' | 'bad'; sub?: string } {
  switch (r.status) {
    case 'falta_dados': return { label: (r.document ?? '').replace(/\D/g, '').length === 11 ? 'Falta CPF' : 'Falta CNPJ', tone: 'warn' }
    case 'na_fila': return { label: 'Na fila', tone: 'muted' }
    case 'gerando': return { label: 'Gerando', tone: 'info', sub: STAGE_LABEL[r.stage ?? ''] }
    case 'pronto': return { label: 'Pronto para revisar', tone: 'info' }
    case 'aprovado': return { label: 'Aprovado', tone: 'ok' }
    case 'enviado': return { label: 'Enviado', tone: 'ok' }
    case 'limite': return { label: 'Limite do mês atingido', tone: 'bad' }
    default: return { label: 'Não deu certo', tone: 'bad' }
  }
}

/** A única ação da linha (o que fazer agora). */
export function rowAction(r: Pick<ConsultRow, 'status' | 'can_generate'>): { kind: 'dados' | 'abrir' | 'gerar' | 'aguardar'; label: string } {
  if (r.status === 'falta_dados') return { kind: 'dados', label: 'Informar CNPJ' }
  if (r.status === 'pronto') return { kind: 'abrir', label: 'Revisar' }
  if (r.status === 'aprovado' || r.status === 'enviado') return { kind: 'abrir', label: 'Abrir' }
  // Sem limite por dia: o que segura o gasto é o teto do mês (ai_settings.monthly_cap_usd).
  if (r.status === 'erro') return { kind: 'gerar', label: 'Tentar de novo' }
  if (r.status === 'na_fila') return { kind: 'gerar', label: 'Gerar agora' }
  return { kind: 'aguardar', label: r.status === 'limite' ? 'Limite' : 'Gerando' }
}

/** Ordem da lista: o que pede ação primeiro (falta dado, pronto para revisar), depois o resto por nome. */
export function sortRows(rows: ConsultRow[]): ConsultRow[] {
  const rank: Record<ConsultStatus, number> = { pronto: 0, falta_dados: 1, erro: 2, limite: 3, gerando: 4, na_fila: 5, aprovado: 6, enviado: 7 }
  return [...rows].sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name, 'pt-BR'))
}

/** Bete e Início: um item sem alarde por diagnóstico pronto para revisar, abrindo o cliente certo. */
export function readyNotices(rows: ConsultRow[] | undefined): { id: string; clientId: string; title: string; to: string }[] {
  return (rows ?? []).filter((r) => r.status === 'pronto').map((r) => ({
    id: `consult:${r.client_id}:${r.finished_at ?? ''}`, clientId: r.client_id,
    title: `Diagnóstico de ${r.name.trim()} pronto para revisar`, to: consultLink(r.client_id),
  }))
}

/** Bete e Início: "X respondeu as perguntas" (sem alarde), abrindo as Perguntas do cliente (?ver=perguntas). O id muda a cada resposta nova. */
export function answeredNotices(rows: ConsultRow[] | undefined): { id: string; clientId: string; title: string; to: string }[] {
  return (rows ?? []).filter((r) => (r.answers_new ?? 0) > 0).map((r) => ({
    id: `answers:${r.client_id}:${r.answers_last ?? ''}`, clientId: r.client_id,
    title: `${r.name.trim()} respondeu as perguntas`, to: `${consultLink(r.client_id)}&ver=perguntas`,
  }))
}

/** Link da estratégia do mês de um cliente (Planejamento, no mês certo: o cartão Estratégia mensal). */
export const monthlyLink = (clientId: string, month?: string | null) => `${consultLink(clientId)}&ver=estrategia${month ? `&mes=${month.slice(0, 7)}` : ''}`

/**
 * Bete e Início: estratégia do mês pronta com ações para aprovar, ou troca sugerida no ajuste de segunda (sem alarde).
 * O id muda quando a estratégia é refeita, para o aviso voltar.
 */
export function monthlyNotices(rows: ConsultRow[] | undefined): { id: string; clientId: string; title: string; to: string }[] {
  return (rows ?? []).flatMap((r) => {
    const m = r.monthly
    if (!m || !['pronto', 'aprovado'].includes(m.status)) return []
    const mes = new Date(`${m.month.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
    if (m.pending > 0) return [{ id: `monthly:${r.client_id}:${m.finished_at ?? ''}`, clientId: r.client_id, title: `Estratégia de ${mes} de ${r.name.trim()}: ${m.pending} ${m.pending === 1 ? 'card' : 'cards'} para revisar`, to: monthlyLink(r.client_id, m.month) }]
    if (m.suggestions > 0) return [{ id: `monthly-adj:${r.client_id}:${m.suggestions}`, clientId: r.client_id, title: `${r.name.trim()}: ajuste da semana sugerido`, to: monthlyLink(r.client_id, m.month) }]
    return []
  })
}

/** Mensagem pronta para o cliente (a pessoa revisa e envia pelo próprio WhatsApp; o sistema nunca envia sozinho). */
export function clientMessage(name: string, firstStep: string | null | undefined, link?: string | null): string {
  const who = name.trim()
  return [
    `Oi! Tudo bem? Aqui é da Peformake.`,
    `Terminamos o diagnóstico da ${who}: como o negócio está hoje, o que o mercado e os concorrentes estão fazendo e um plano de ação para os próximos 90 dias.`,
    firstStep ? `O primeiro passo que sugerimos: ${firstStep}` : '',
    link ? `A apresentação está aqui (abre no celular, um slide por vez):\n${link}` : `Vou te mandar o PDF por aqui.`,
    `Marcamos 30 minutos para passar juntos?`,
  ].filter(Boolean).join('\n\n')
}

/** wa.me só com números; telefone sem DDI ganha 55. */
export function waLink(phone: string | null | undefined, text: string): string | null {
  const d = (phone ?? '').replace(/\D/g, '')
  if (d.length < 10) return null
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}?text=${encodeURIComponent(text)}`
}

export const FIELD_LABEL: Record<string, string> = {
  segment: 'Segmento', description: 'O que a empresa faz', target_audience: 'Público-alvo', competitors: 'Concorrentes',
  value_proposition: 'Proposta de valor', acquisition_channel: 'Como chegou', instagram: 'Instagram', website: 'Site',
}

export interface NicheLink { name: string; placeholder: string }
const MAPS: NicheLink = { name: 'Google Maps', placeholder: 'Link do Perfil da Empresa no Google Maps' }

/**
 * Links extras que ajudam a IA, conforme o nicho (atividade da Receita, segmento da ficha ou nome). No máximo 2.
 * Não são perguntas: tudo opcional. Ficam em client_links com este nome e a pesquisa abre primeiro.
 */
export function nicheLinks(...hints: (string | null | undefined)[]): NicheLink[] {
  const t = hints.filter(Boolean).join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/gastronom|aliment|restaur|lanch|burg|pizz|cafe|coff|padar|\bbar\b|delivery|comida|doce|confeit|acai|sorvet|petisc/.test(t))
    return [{ name: 'iFood ou delivery', placeholder: 'ifood.com.br/delivery/…' }, { name: 'Cardápio', placeholder: 'Link do cardápio' }]
  if (/automo|moto|carro|veicul|auto ?pec|oficina|concession/.test(t))
    return [{ name: 'Estoque', placeholder: 'OLX, Webmotors ou Mercado Livre' }, MAPS]
  if (/saude|clinic|odonto|dent|estetic|beleza|medic|\bdra?\b|fisio|psic|nutri|salao|barbear/.test(t))
    return [{ name: 'Agenda online', placeholder: 'Doctoralia ou outro link de agendamento' }, MAPS]
  if (/imobili|imove|corretor|loteament/.test(t))
    return [{ name: 'Portal de imóveis', placeholder: 'Zap, VivaReal ou OLX' }, MAPS]
  if (/varejo|loja|otica|moda|roupa|calcad|distribu|comercio|material|construc|maquin|industr|atacad|presente|joia/.test(t))
    return [{ name: 'Loja online ou catálogo', placeholder: 'Site, Shopee, Mercado Livre ou catálogo do WhatsApp' }, MAPS]
  return [MAPS]
}

// ───────── Estratégia em uma linha por cliente ─────────
/** Guia de revisão em slides (aba nova). Plano: mes = AAAA-MM; area filtra a visão da área. */
export const diagReviewPath = (clientId: string) => `/revisao/diagnostico/${clientId}`
export const planReviewPath = (clientId: string, month: string, area?: string | null) => `/revisao/plano/${clientId}/${month.slice(0, 7)}${area ? `?area=${area}` : ''}`
/** A Estratégia interativa do cliente no mês (substituiu o plano do mês antigo em 16/11). */
export const strategyPath = (clientId: string, month: string) => `${CONSULT_PATH}?cliente=${clientId}&ver=estrategia&mes=${month.slice(0, 7)}`

export type PartState = 'pronto' | 'revisar' | 'falta' | 'andando' | 'fora'
export interface Part { state: PartState; label: string }

const mesOf = (month: string) => new Date(`${month.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })

/** As 3 partes do cliente (diagnóstico, plano do mês, perguntas) em pronto / revisar / falta, com um texto de 1 a 3 palavras. */
export function clientParts(r: Pick<ConsultRow, 'status' | 'document' | 'stage' | 'monthly' | 'questions_open' | 'answers_new' | 'consultoria'>): { diag: Part; plan: Part; questions: Part } {
  const diag: Part = r.consultoria === false ? { state: 'fora', label: 'não contratado' }
    : r.status === 'pronto' ? { state: 'revisar', label: 'revisar' }
    : r.status === 'aprovado' ? { state: 'pronto', label: 'aprovado' }
    : r.status === 'enviado' ? { state: 'pronto', label: 'enviado' }
    : r.status === 'gerando' || r.status === 'na_fila' ? { state: 'andando', label: r.status === 'gerando' ? 'gerando' : 'na fila' }
    : r.status === 'falta_dados' ? { state: 'falta', label: statusChip(r).label.replace(/^F/, 'f') }
    : { state: 'falta', label: r.status === 'limite' ? 'limite' : 'deu erro' }
  const m = r.monthly
  const plan: Part = !m || m.status === 'erro' || m.status === 'limite' ? { state: 'falta', label: m?.status === 'erro' ? 'deu erro' : 'falta' }
    : m.status === 'gerando' || m.status === 'na_fila' ? { state: 'andando', label: 'gerando' }
    : m.pending > 0 ? { state: 'revisar', label: `${m.pending} a revisar` }
    : { state: 'pronto', label: 'aprovado' }
  const open = r.questions_open ?? 0
  const questions: Part = (r.answers_new ?? 0) > 0 ? { state: 'revisar', label: `${r.answers_new} ${r.answers_new === 1 ? 'resposta' : 'respostas'}` }
    : open > 0 ? { state: 'falta', label: `${open} abertas` }
    : { state: 'pronto', label: 'em dia' }
  return { diag, plan, questions }
}

export type NextStep =
  | { kind: 'dados' | 'gerar' | 'enviar' | 'perguntas' | 'aguardar'; label: string }
  | { kind: 'link'; label: string; href: string }
  | { kind: 'aba'; label: string; tab: 'diagnostico' | 'estrategia' | 'perguntas' | 'relatorios' }

/** A próxima coisa a fazer com o cliente (UMA ação por linha), na ordem do que trava mais. */
export function nextStep(r: Pick<ConsultRow, 'client_id' | 'status' | 'document' | 'stage' | 'monthly' | 'questions_open' | 'answers_new' | 'can_generate' | 'consultoria'>): NextStep {
  // Sem Consultoria contratada: nada de diagnóstico; só o plano do mês e as respostas.
  if (r.consultoria === false) {
    const m = r.monthly
    if ((r.answers_new ?? 0) > 0) return { kind: 'aba', label: 'Ver respostas', tab: 'perguntas' }
    if (m && ['pronto', 'aprovado'].includes(m.status) && m.pending > 0) return { kind: 'aba', label: `Revisar estratégia de ${mesOf(m.month)}`, tab: 'estrategia' }
    return { kind: 'aba', label: 'Abrir', tab: 'diagnostico' }
  }
  if (r.status === 'falta_dados') return { kind: 'dados', label: 'Informar CNPJ' }
  if (r.status === 'erro') return { kind: 'gerar', label: 'Tentar de novo' }
  // Na fila do agente: não é ação de ninguém (antes dizia "Gerar diagnóstico" com o pedido já feito).
  if (r.status === 'na_fila' && r.stage !== 'agente') return { kind: 'gerar', label: 'Gerar diagnóstico' }
  if (r.status === 'pronto') return { kind: 'link', label: 'Revisar diagnóstico', href: diagReviewPath(r.client_id) }
  if ((r.answers_new ?? 0) > 0) return { kind: 'aba', label: 'Ver respostas', tab: 'perguntas' }
  const m = r.monthly
  if (m && ['pronto', 'aprovado'].includes(m.status) && m.pending > 0) return { kind: 'aba', label: `Revisar estratégia de ${mesOf(m.month)}`, tab: 'estrategia' }
  if (r.status === 'aprovado') return { kind: 'enviar', label: 'Enviar diagnóstico' }
  if ((r.questions_open ?? 0) > 0) return { kind: 'perguntas', label: 'Mandar perguntas' }
  if (r.status === 'gerando' || r.status === 'limite' || r.status === 'na_fila') return { kind: 'aguardar', label: r.status === 'limite' ? 'Limite do mês' : r.status === 'na_fila' ? 'Diagnóstico na fila' : 'Gerando' }
  return { kind: 'aba', label: 'Abrir', tab: 'diagnostico' }
}

/** Ordem da lista pelo que pede ação: primeiro o que trava (dado, revisão), por último o que está em dia. */
export function sortByNext(rows: ConsultRow[]): ConsultRow[] {
  const rank = (r: ConsultRow) => { const n = nextStep(r); return n.kind === 'dados' ? 1 : n.kind === 'link' ? 0 : n.kind === 'aba' && n.tab === 'perguntas' ? 2 : n.kind === 'enviar' ? 3 : n.kind === 'perguntas' ? 4 : n.kind === 'gerar' ? 5 : n.kind === 'aguardar' ? 6 : 7 }
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'))
}

// ───────── Lista mínima (17/11): uma linha por cliente com a situação da Estratégia e UMA ação ─────────
export type StrategyGo = 'briefing' | 'revisar' | 'abrir'
export interface StrategyStep { go: StrategyGo; label: string; sub: string; state: PartState; rank: number }

/** O passo da Estratégia do cliente: o que mostrar na linha e para onde o botão leva. */
export function strategyStep(r: Pick<ConsultRow, 'monthly' | 'answers_new'>): StrategyStep {
  const m = r.monthly
  const mes = m ? mesOf(m.month).slice(0, 3) + '.' : ''
  if (!m) return { go: 'briefing', label: 'Briefing', sub: 'Estratégia: fazer o briefing', state: 'falta', rank: 2 }
  if (m.status === 'na_fila' || m.status === 'gerando') return { go: 'abrir', label: 'Ver', sub: `Estratégia de ${mes}: o agente está montando`, state: 'andando', rank: 3 }
  if (m.status === 'erro' || m.status === 'limite') return { go: 'abrir', label: 'Gerar de novo', sub: `Estratégia de ${mes}: não deu certo`, state: 'falta', rank: 1 }
  if (m.status === 'pronto' && m.pending > 0) return { go: 'revisar', label: 'Revisar', sub: `Estratégia de ${mes}: pronta para ler e baixar o PDF`, state: 'revisar', rank: 0 }
  if (m.status === 'pronto') return { go: 'abrir', label: 'Gerar PDF', sub: `Estratégia de ${mes}: revisada, falta o PDF`, state: 'revisar', rank: 1 }
  return { go: 'abrir', label: 'Abrir', sub: `Estratégia de ${mes}: aprovada`, state: 'pronto', rank: 4 }
}

/** As 4 etapas da estratégia (Briefing · Gerar · Revisar · PDF): onde o cliente está (4 = tudo feito) e o resumo curto da linha. */
export const STRATEGY_STEPS = ['Briefing', 'Gerar', 'Revisar', 'PDF'] as const
export function strategyProgress(r: Pick<ConsultRow, 'monthly' | 'answers_new'>, brief?: { percent: number; missing: string[] } | null): { at: number; text: string } {
  const m = r.monthly
  const b = brief ? `Briefing ${brief.percent}%` : ''
  if (!m) {
    const ready = !!brief && brief.percent >= 60
    const falta = brief?.missing.length ? `falta ${brief.missing.slice(0, 2).join(', ').toLowerCase()}` : ''
    return { at: ready ? 1 : 0, text: [b, ready ? 'pronto para gerar' : falta || 'fazer o briefing'].filter(Boolean).join(' · ') }
  }
  const step = strategyStep(r)
  const sub = step.sub.replace(/^Estratégia de [^:]+: /, '')
  if (m.status === 'na_fila' || m.status === 'gerando' || m.status === 'erro' || m.status === 'limite') return { at: 1, text: [b, sub].filter(Boolean).join(' · ') }
  if (m.status === 'pronto' && m.pending > 0) return { at: 2, text: sub }
  if (m.status === 'pronto') return { at: 3, text: sub }
  return { at: 4, text: sub }
}

// ───────── Lista da Consultoria (20/11): o mesmo passo a passo da ficha, numa linha ─────────
/** Os 4 passos da ficha do cliente (o 4 abre a estratégia e as partes). */
export const LIST_STEPS = ['Briefing', 'Perguntas', 'Diagnóstico', 'Estratégia'] as const
export type ListGo = 'briefing' | 'enviar-perguntas' | 'ver-perguntas' | 'cnpj' | 'criar-diag' | 'revisar-diag' | 'ver-cliente' | 'estrategia'
export interface ListStep { n: 1 | 2 | 3 | 4; go: ListGo; label: string; line: string; disabled?: boolean }

/**
 * Onde o cliente está e a ação certa, com a MESMA regra da ficha (stepCur em ConsultoriaPage):
 * briefing pronto quando o fixo chega a 80%; perguntas prontas sem pendente nem esperando; diagnóstico pronto quando aprovado.
 */
export function listStep(r: Pick<ConsultRow, 'status' | 'stage' | 'document' | 'answers_new'>, b: { fixedPercent: number; fixedMissing: string[]; toAsk: number; waiting: number } | null | undefined): ListStep {
  const fixed = b?.fixedPercent ?? 0
  if (fixed < 80) {
    const falta = b?.fixedMissing.length ? ` · falta ${b.fixedMissing.slice(0, 2).join(', ').toLowerCase()}` : ''
    return { n: 1, go: 'briefing', label: 'Preencher briefing', line: `Briefing ${fixed}%${falta}` }
  }
  const toAsk = b?.toAsk ?? 0, waiting = b?.waiting ?? 0, answers = r.answers_new ?? 0
  if (toAsk > 0 || waiting > 0) {
    const line = 'Perguntas: ' + [toAsk ? `${toAsk} ${toAsk === 1 ? 'pergunta para enviar' : 'perguntas para enviar'}` : null, waiting ? `${waiting} esperando o cliente` : null].filter(Boolean).join(' · ')
    if (toAsk > 0) return { n: 2, go: 'enviar-perguntas', label: 'Enviar perguntas', line }
    return { n: 2, go: 'ver-perguntas', label: answers > 0 ? 'Ver respostas' : 'Ver perguntas', line }
  }
  if (r.status !== 'aprovado' && r.status !== 'enviado') {
    const agent = r.stage === 'agente'
    if (r.status === 'falta_dados') return { n: 3, go: 'cnpj', label: (r.document ?? '').replace(/\D/g, '').length === 11 ? 'Informar CPF' : 'Informar CNPJ', line: 'Diagnóstico: falta o documento' }
    if (r.status === 'pronto') return { n: 3, go: 'revisar-diag', label: 'Revisar diagnóstico', line: 'Diagnóstico pronto para revisar' }
    if (r.status === 'gerando' || (r.status === 'na_fila' && agent)) return { n: 3, go: 'ver-cliente', label: 'Ver', line: r.status === 'gerando' ? 'Diagnóstico sendo feito' : 'Diagnóstico na fila do agente' }
    if (r.status === 'limite') return { n: 3, go: 'ver-cliente', label: 'Ver', line: 'Diagnóstico: limite do mês atingido' }
    return { n: 3, go: 'criar-diag', label: 'Criar diagnóstico', line: r.status === 'erro' ? 'Diagnóstico parou no meio' : 'Diagnóstico ainda não feito' }
  }
  return { n: 4, go: 'estrategia', label: 'Abrir estratégia', line: answers > 0 ? `Diagnóstico aprovado · ${answers} ${answers === 1 ? 'resposta nova' : 'respostas novas'}` : 'Diagnóstico aprovado · estratégia e partes' }
}

/** Ordem da lista: quem tem resposta nova primeiro, depois pelo passo (o mais atrasado em cima), depois por nome. */
export function sortByListStep<T extends ConsultRow>(rows: T[], stepOf: (r: T) => ListStep): T[] {
  return [...rows].sort((a, b) => Number((b.answers_new ?? 0) > 0) - Number((a.answers_new ?? 0) > 0) || stepOf(a).n - stepOf(b).n || a.name.localeCompare(b.name, 'pt-BR'))
}

/** Cliente só de audiovisual: a estratégia dele é o roteiro dos vídeos (mesmo prazo, dia 15). Italo, 17/11. */
export const onlyVideo = (r: Pick<ConsultRow, 'areas' | 'consultoria'>) => !!r.areas?.audiovisual && !r.areas.trafego && !r.areas.social && !r.consultoria
/** O mês que está sendo preparado: o seguinte ao de hoje (a estratégia de dezembro fica pronta até 15/11). */
export const targetMonth = (today: Date = new Date()) => { const d = new Date(today.getFullYear(), today.getMonth() + 1, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
/** Ordem da lista mínima: primeiro o que pede você (revisar, respostas novas), depois briefing, por último o que está em dia. */
export function sortByStrategy(rows: ConsultRow[]): ConsultRow[] {
  const rank = (r: ConsultRow) => Math.min(strategyStep(r).rank, (r.answers_new ?? 0) > 0 ? 1 : 9)
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'))
}
