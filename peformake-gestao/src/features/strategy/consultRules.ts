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

/** Bete e Início: "X respondeu as perguntas" (sem alarde), abrindo a aba Perguntas do cliente. O id muda a cada resposta nova. */
export function answeredNotices(rows: ConsultRow[] | undefined): { id: string; clientId: string; title: string; to: string }[] {
  return (rows ?? []).filter((r) => (r.answers_new ?? 0) > 0).map((r) => ({
    id: `answers:${r.client_id}:${r.answers_last ?? ''}`, clientId: r.client_id,
    title: `${r.name.trim()} respondeu as perguntas`, to: `${consultLink(r.client_id)}&aba=perguntas`,
  }))
}

/** Link da estratégia do mês de um cliente (aba Estratégia, no mês certo). */
export const monthlyLink = (clientId: string, month?: string | null) => `${consultLink(clientId)}&aba=estrategia${month ? `&mes=${month.slice(0, 7)}` : ''}`

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
