// Regras dos cards da Estratégia interativa: tipos, rótulos, contadores e paginação (pop-up nunca rola).

export type CardTab = 'resumo' | 'audiovisual' | 'social' | 'trafego' | 'atendimento' | 'referencias'
export type Funnel = 'atrair' | 'provar' | 'objecao' | 'converter'
export type CardStatus = 'proposta' | 'aprovado' | 'recusado'
type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any

export interface StrategyCard {
  id: string; board_id: string; tab: CardTab; kind: string; position: number; title: string; data: Record<string, Any>
  funnel: Funnel | null; serves: string | null; goal: string | null; inspired: { link?: string; numero?: string } | null; assumed: string | null
  status: CardStatus; reject_reason: string | null; in_pdf: boolean; regen_count: number; is_new: boolean; updated_at: string
  redo_pedido?: string | null; redo_requested_at?: string | null
}
export type BoardStatus = 'na_fila' | 'gerando' | 'pronto' | 'aprovado' | 'erro' | 'limite'
export interface StrategyBoardData {
  id: string; client_id: string; month: string; status: BoardStatus; step: string; stage: string | null; error: string | null
  cost_usd: number; missing: string[]; engine?: 'agente' | 'api'; finished_at: string | null; approved_at: string | null; pdf_asset_id: string | null; cards: StrategyCard[]
}

export const FUNNEL: Record<Funnel, { label: string; cls: string }> = {
  atrair: { label: 'Atrair', cls: 'bg-[#1f77b4]/12 text-[#1f5f94] dark:text-[#8cc4f0]' },
  provar: { label: 'Provar', cls: 'bg-[#7048e8]/12 text-[#5a37c4] dark:text-[#b9a6ff]' },
  objecao: { label: 'Objeção', cls: 'bg-[#e8590c]/12 text-[#b4470b] dark:text-[#ffb27f]' },
  converter: { label: 'Converter', cls: 'bg-[#2b8a3e]/12 text-[#21702f] dark:text-[#8fe3a0]' },
}
export const KIND_LABEL: Record<string, string> = {
  tese: 'Tese do mês', objetivo: 'Objetivo', oferta: 'Oferta', data: 'Data', decisao: 'Decisão',
  video: 'Vídeo', peca: 'Peça', campanha: 'Campanha', roteiro: 'Atendimento',
  concorrente: 'Concorrente', referencia: 'Referência', anuncio: 'Anúncio', outro_nicho: 'Outro nicho',
}

/** "6/10 aprovados" de uma aba (recusados não contam). */
export function tabCount(cards: StrategyCard[], tab: CardTab): { approved: number; total: number; label: string } {
  const live = cards.filter((c) => c.tab === tab && c.status !== 'recusado')
  const approved = live.filter((c) => c.status === 'aprovado').length
  return { approved, total: live.length, label: live.length ? `${approved}/${live.length}` : '' }
}
export function boardCount(cards: StrategyCard[]): { approved: number; pending: number; inPdf: number; total: number } {
  const live = cards.filter((c) => c.status !== 'recusado')
  return { approved: live.filter((c) => c.status === 'aprovado').length, pending: live.filter((c) => c.status === 'proposta').length, inPdf: live.filter((c) => c.status === 'aprovado' && c.in_pdf).length, total: live.length }
}

/** Uma linha do card na lista (resumido). */
export function cardLine(c: StrategyCard): string {
  const d = c.data ?? {}
  const pick = d.formato && c.tab !== 'resumo' ? `${d.formato}` : ''
  const body = String(d.texto ?? d.numero ?? d.condicao ?? d.uso ?? d.porque ?? d.ideia ?? d.objetivo ?? d.oferta ?? (Array.isArray(d.ganchos) ? d.ganchos[0] : '') ?? '').trim()
  return [pick, body].filter(Boolean).join(' · ')
}

/**
 * Divide uma lista em páginas pelo tamanho do texto (máx. de caracteres por página), para o pop-up não rolar.
 * Nunca deixa uma página vazia; item maior que o limite vai sozinho.
 */
export function chunkBy<T>(items: T[], size: (x: T) => number, max: number, maxItems = 6): T[][] {
  const out: T[][] = []
  let cur: T[] = []; let n = 0
  for (const x of items) {
    const s = size(x)
    if (cur.length && (n + s > max || cur.length >= maxItems)) { out.push(cur); cur = []; n = 0 }
    cur.push(x); n += s
  }
  if (cur.length) out.push(cur)
  return out
}

/** Conteúdo do card (abas do pop-up) conforme o tipo. */
export function cardSections(c: Pick<StrategyCard, 'kind' | 'tab'>): { id: string; label: string }[] {
  switch (c.kind) {
    case 'video': return [{ id: 'ganchos', label: 'Ganchos' }, { id: 'roteiro', label: 'Roteiro' }, { id: 'ideias', label: 'Ideias' }, { id: 'filmar', label: 'Filmar' }, { id: 'detalhes', label: 'Mais' }]
    case 'peca': return [{ id: 'texto', label: 'Texto' }, { id: 'slides', label: 'Slides' }, { id: 'legenda', label: 'Legenda' }, { id: 'imagem', label: 'Imagem' }, { id: 'detalhes', label: 'Mais' }]
    case 'campanha': return [{ id: 'campanha', label: 'Campanha' }, { id: 'verba', label: 'Verba' }, { id: 'ab', label: 'Teste A/B' }, { id: 'detalhes', label: 'Mais' }]
    case 'roteiro': return [{ id: 'whatsapp', label: 'WhatsApp' }, { id: 'objecoes', label: 'Objeções' }, { id: 'followup', label: 'Follow-up' }, { id: 'detalhes', label: 'Mais' }]
    case 'concorrente': case 'referencia': case 'anuncio': case 'outro_nicho': return [{ id: 'ref', label: 'Referência' }]
    default: return [{ id: 'conteudo', label: 'Conteúdo' }, { id: 'detalhes', label: 'Mais' }]
  }
}

/** Campos de texto do conteúdo principal dos cards do Resumo. */
export const RESUMO_FIELDS: Record<string, [string, string][]> = {
  tese: [['texto', 'Por quê']],
  objetivo: [['numero', 'Número'], ['como_medir', 'Como medir']],
  oferta: [['condicao', 'Condição'], ['quando', 'Quando'], ['porque', 'Por quê']],
  data: [['dia', 'Dia'], ['uso', 'Como usamos']],
  decisao: [['porque', 'Por quê']],
}

/** Status da geração em palavras simples (sem erro técnico). */
export function boardState(b: Pick<StrategyBoardData, 'status' | 'stage' | 'error'> | null | undefined): { label: string; tone: 'muted' | 'info' | 'ok' | 'warn' | 'bad'; busy: boolean } {
  switch (b?.status) {
    case 'na_fila': return { label: 'Na fila do agente (pronto em até 1 hora)', tone: 'info', busy: true }
    case 'gerando': return { label: b.stage || 'Gerando', tone: 'info', busy: true }
    case 'pronto': return { label: 'Pronta para revisar', tone: 'warn', busy: false }
    case 'aprovado': return { label: 'Aprovada', tone: 'ok', busy: false }
    case 'limite': return { label: 'Limite do mês com IA atingido', tone: 'bad', busy: false }
    case 'erro': return { label: 'Não deu certo. Tente gerar de novo.', tone: 'bad', busy: false }
    default: return { label: 'Ainda não gerada', tone: 'muted', busy: false }
  }
}

/** Atalhos do "Refazer este card". */
export const REDO_HINTS: Record<string, string[]> = {
  video: ['Mais curto', 'Outro gancho', 'Mais engraçado', 'Outro formato'],
  peca: ['Mais curto', 'Mais vendedor', 'Outro formato', 'Mais leve'],
  campanha: ['Verba menor', 'Outro público', 'Outro criativo'],
  roteiro: ['Mais curto', 'Mais direto', 'Mais acolhedor'],
  default: ['Mais curto', 'Mais ousado', 'Mais simples'],
}
