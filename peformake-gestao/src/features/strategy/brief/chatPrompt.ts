// Pedir a estratégia pelo chat do Claude (acréscimo do Italo, 16/11). As regras ficam em agent_instructions('estrategia-interativa'):
// o agente da fila e qualquer chat usam o MESMO texto. Com o conector do Supabase o chat lê e grava sozinho;
// sem conector, o pedido completo leva tudo e a tela importa o JSON colado ("Colar resultado").
import type { StrategyCard } from './cardRules'

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
const PROJ = 'wkkzcjnxyylrqoolmmhi'
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const mesNome = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1] ?? ''} de ${m.slice(0, 4)}`
const m01 = (m: string) => `${m.slice(0, 7)}-01`

/** Pedido curto: para um chat com o conector do Supabase. */
export function shortPrompt(name: string, clientId: string, month: string): string {
  return `Gere a estratégia de ${mesNome(month)} do cliente ${name} (client_id=${clientId}). Use o execute_sql do Supabase, projeto ${PROJ}: rode select public.agent_instructions('estrategia-interativa') e siga à risca. Leia o briefing com select public.strategy_brief_context('${clientId}', '${m01(month)}') e grave os cards com strategy_chat_submit. Nada vai ao cliente.`
}

/** Pedido completo: para um chat SEM conector (leva as regras, o briefing e o formato; volta só o JSON). */
export function fullPrompt(name: string, month: string, rules: string, context: unknown): string {
  return [
    `Gere a estratégia de ${mesNome(month)} do cliente ${name} seguindo as regras abaixo.`,
    `Você NÃO tem acesso ao banco: devolva SÓ o JSON {"cards": [...], "novos": {...}} num bloco de código, para eu colar no sistema.`,
    '', '<regras>', rules.trim(), '</regras>', '',
    '<briefing>', JSON.stringify(context, null, 1), '</briefing>',
  ].join('\n')
}

/** O card no formato do agente (aba, tipo, titulo, funil...). */
export function cardAsAgent(c: StrategyCard): Record<string, unknown> {
  return { aba: c.tab, tipo: c.kind, titulo: c.title, funil: c.funnel ?? '', serve: c.serves ?? '', meta: c.goal ?? '', inspirado: c.inspired ?? { link: '', numero: '' }, suposicao: c.assumed ?? '', ...c.data }
}

/** Pedido de um card só (refazer). */
export function cardPrompt(c: StrategyCard, name: string, clientId: string, month: string, pedido: string, rules?: string): string {
  const card = JSON.stringify(cardAsAgent(c), null, 1)
  if (!rules) {
    return `Refaça este card da estratégia de ${mesNome(month)} do cliente ${name} (client_id=${clientId}, card_id=${c.id})${pedido ? `. Pedido: "${pedido}"` : ''}. Use o execute_sql do Supabase, projeto ${PROJ}: siga select public.agent_instructions('estrategia-interativa'), leia o briefing com select public.strategy_brief_context('${clientId}', '${m01(month)}') e grave com select public.strategy_import_card('${c.id}', '<card>'::jsonb).\n\n<card>\n${card}\n</card>`
  }
  return [`Refaça SÓ este card da estratégia de ${mesNome(month)} do cliente ${name}${pedido ? `. Pedido: "${pedido}"` : ''}.`,
    'Você NÃO tem acesso ao banco: devolva SÓ o card em JSON (mesmo formato) num bloco de código.', '', '<regras>', rules.trim(), '</regras>', '', '<card>', card, '</card>'].join('\n')
}

const ABAS = ['resumo', 'audiovisual', 'social', 'trafego', 'atendimento']
/** Tira o JSON de um texto colado (aceita bloco ```json ... ``` e texto em volta). */
export function extractJson(text: string): unknown {
  const block = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  const raw = (block ? block[1]! : text).trim()
  const start = raw.search(/[[{]/)
  if (start < 0) throw new Error('Não achei JSON no texto colado.')
  const open = raw[start]!; const close = open === '{' ? '}' : ']'
  const end = raw.lastIndexOf(close)
  try { return JSON.parse(raw.slice(start, end + 1)) } catch { throw new Error('O JSON colado está quebrado. Copie de novo o bloco inteiro.') }
}

function checkCard(x: Any, i: number): string | null {
  if (!x || typeof x !== 'object') return `Card ${i + 1}: não é um objeto.`
  if (!ABAS.includes(x.aba)) return `Card ${i + 1}: aba "${x.aba ?? ''}" inválida (use resumo, audiovisual, social, trafego ou atendimento).`
  if (!String(x.titulo ?? '').trim()) return `Card ${i + 1}: sem título.`
  if (!String(x.tipo ?? '').trim()) return `Card ${i + 1}: sem tipo.`
  return null
}

/** Valida o resultado colado: {cards, novos} (ou só a lista de cards). */
export function parseResult(text: string): { cards: Any[]; novos: Any; errors: string[] } {
  const v = extractJson(text) as Any
  const cards = Array.isArray(v) ? v : Array.isArray(v?.cards) ? v.cards : null
  if (!cards) return { cards: [], novos: {}, errors: ['O JSON precisa ter a lista "cards".'] }
  const errors = cards.map(checkCard).filter(Boolean) as string[]
  if (!cards.length) errors.push('A lista de cards está vazia.')
  return { cards, novos: !Array.isArray(v) && v?.novos && typeof v.novos === 'object' ? v.novos : {}, errors }
}

/** Valida um card refeito colado (mantém a aba e o tipo do card original se vierem vazios). */
export function parseCard(text: string, original: StrategyCard): { card: Any; error: string | null } {
  let v = extractJson(text) as Any
  if (Array.isArray(v)) v = v[0]
  if (v?.cards?.[0]) v = v.cards[0]
  const card = { aba: original.tab, tipo: original.kind, ...v }
  return { card, error: checkCard(card, 0) }
}
