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
}

export const CONSULT_PATH = '/estrategia/consultoria'
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
export const monthlyLink = (clientId: string, month?: string | null) => `${consultLink(clientId)}${month ? `&mes=${month.slice(0, 7)}` : ''}`

/**
 * Bete e Início: estratégia do mês pronta com ações para aprovar, ou troca sugerida no ajuste de segunda (sem alarde).
 * O id muda quando a estratégia é refeita, para o aviso voltar.
 */
export function monthlyNotices(rows: ConsultRow[] | undefined): { id: string; clientId: string; title: string; to: string }[] {
  return (rows ?? []).flatMap((r) => {
    const m = r.monthly
    if (!m || !['pronto', 'aprovado'].includes(m.status)) return []
    const mes = new Date(`${m.month.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
    if (m.pending > 0) return [{ id: `monthly:${r.client_id}:${m.finished_at ?? ''}`, clientId: r.client_id, title: `Plano de ${mes} de ${r.name.trim()}: ${m.pending} ações para aprovar`, to: monthlyLink(r.client_id, m.month) }]
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

export type PartState = 'pronto' | 'revisar' | 'falta' | 'andando'
export interface Part { state: PartState; label: string }

const mesOf = (month: string) => new Date(`${month.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })

/** As 3 partes do cliente (diagnóstico, plano do mês, perguntas) em pronto / revisar / falta, com um texto de 1 a 3 palavras. */
export function clientParts(r: Pick<ConsultRow, 'status' | 'document' | 'stage' | 'monthly' | 'questions_open' | 'answers_new'>): { diag: Part; plan: Part; questions: Part } {
  const diag: Part = r.status === 'pronto' ? { state: 'revisar', label: 'revisar' }
    : r.status === 'aprovado' ? { state: 'pronto', label: 'aprovado' }
    : r.status === 'enviado' ? { state: 'pronto', label: 'enviado' }
    : r.status === 'gerando' || r.status === 'na_fila' ? { state: 'andando', label: r.status === 'gerando' ? 'gerando' : 'na fila' }
    : r.status === 'falta_dados' ? { state: 'falta', label: statusChip(r).label.replace(/^F/, 'f') }
    : { state: 'falta', label: r.status === 'limite' ? 'limite' : 'deu erro' }
  const m = r.monthly
  const plan: Part = !m || m.status === 'erro' || m.status === 'limite' ? { state: 'falta', label: m?.status === 'erro' ? 'deu erro' : 'falta' }
    : m.status === 'gerando' || m.status === 'na_fila' ? { state: 'andando', label: 'gerando' }
    : m.pending > 0 ? { state: 'revisar', label: `${m.pending} a aprovar` }
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
export function nextStep(r: Pick<ConsultRow, 'client_id' | 'status' | 'document' | 'stage' | 'monthly' | 'questions_open' | 'answers_new' | 'can_generate'>): NextStep {
  if (r.status === 'falta_dados') return { kind: 'dados', label: 'Informar CNPJ' }
  if (r.status === 'erro') return { kind: 'gerar', label: 'Tentar de novo' }
  if (r.status === 'na_fila') return { kind: 'gerar', label: 'Gerar diagnóstico' }
  if (r.status === 'pronto') return { kind: 'link', label: 'Revisar diagnóstico', href: diagReviewPath(r.client_id) }
  if ((r.answers_new ?? 0) > 0) return { kind: 'aba', label: 'Ver respostas', tab: 'perguntas' }
  const m = r.monthly
  if (m && ['pronto', 'aprovado'].includes(m.status) && m.pending > 0) return { kind: 'link', label: `Revisar plano de ${mesOf(m.month)}`, href: planReviewPath(r.client_id, m.month) }
  if (r.status === 'aprovado') return { kind: 'enviar', label: 'Enviar diagnóstico' }
  if ((r.questions_open ?? 0) > 0) return { kind: 'perguntas', label: 'Mandar perguntas' }
  if (r.status === 'gerando' || r.status === 'limite') return { kind: 'aguardar', label: r.status === 'limite' ? 'Limite do mês' : 'Gerando' }
  return { kind: 'aba', label: 'Abrir', tab: 'diagnostico' }
}

/** Ordem da lista pelo que pede ação: primeiro o que trava (dado, revisão), por último o que está em dia. */
export function sortByNext(rows: ConsultRow[]): ConsultRow[] {
  const rank = (r: ConsultRow) => { const n = nextStep(r); return n.kind === 'dados' ? 1 : n.kind === 'link' ? 0 : n.kind === 'aba' && n.tab === 'perguntas' ? 2 : n.kind === 'enviar' ? 3 : n.kind === 'perguntas' ? 4 : n.kind === 'gerar' ? 5 : n.kind === 'aguardar' ? 6 : 7 }
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'))
}
