// Briefing em CONVERSA (Italo, 20/11): em vez de perguntas fixas, um chat estilo WhatsApp.
// A cada resposta a IA lê tudo do cliente (briefing, ficha, diagnóstico, histórico) + o que está acontecendo no nicho
// neste mês (pesquisa na web feita 1 vez por conversa) e devolve: um comentário curto, a PRÓXIMA pergunta (nascida da
// resposta anterior, nunca de uma lista fixa), até 5 opções para tocar e o que já dá para preencher no briefing.
// O que ela entende vai direto para o briefing fixo (client_briefs) e o do mês (client_brief_months); a conversa fica
// em client_brief_months.data.conversa. Só administrador e head de marketing (consult_can). Custo em ai_usage_log.
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })
type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const FN = 'brief-chat'
const MODEL = 'claude-sonnet-5-5'
const MAX_KEEP = 60
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const FIXED = ['publico', 'diferenciais', 'voz', 'proibidos', 'quem_aparece', 'quem_grava', 'capacidade'] as const
const MONTH = ['ofertas', 'meta', 'datas_travam'] as const
const LABEL: Record<string, string> = {
  publico: 'Público', diferenciais: 'Diferenciais', voz: 'Voz da marca', proibidos: 'Proibidos', quem_aparece: 'Quem aparece',
  quem_grava: 'Quem grava', capacidade: 'Capacidade de atendimento', ofertas: 'Ofertas e datas do mês', meta: 'Meta do mês', datas_travam: 'Datas que travam',
}

const s = { type: 'string' } as const
const OUT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['comentario', 'pergunta', 'opcoes', 'preencher', 'faltando', 'pronto'],
  properties: {
    comentario: s, pergunta: s,
    opcoes: { type: 'array', items: s },
    preencher: { type: 'object', additionalProperties: false, required: [...FIXED, ...MONTH], properties: Object.fromEntries([...FIXED, ...MONTH].map((k) => [k, s])) },
    faltando: { type: 'array', items: s },
    pronto: { type: 'boolean' },
  },
}

const SYSTEM = `Você é a Bete, a estrategista da Peformake (assessoria de marketing de Recife; nunca diga "agência").
Você conversa com a equipe (normalmente o Italo) pelo chat, como no WhatsApp, para montar o BRIEFING do mês de um cliente.
Não é um formulário: é uma conversa inteligente que extrai o que a estratégia precisa.

COMO CONDUZIR
- UMA pergunta por vez, curta (até 2 frases), em português do Brasil simples, tratando a pessoa pelo nome quando souber.
- A próxima pergunta nasce da ÚLTIMA resposta: aprofunde o que ela trouxe, puxe o fio, ou passe ao próximo ponto que falta.
  Nunca uma lista fixa; nada que já esteja nos dados ou já tenha sido respondido.
- Chegue com inteligência: cruze briefing, ficha, diagnóstico, histórico de meses e o MOMENTO DO MERCADO em <mercado>.
  Quando ajudar, proponha caminhos: "Este mês está acontecendo X. Para o {cliente}, qual destas faz sentido?".
- "opcoes": até 5 respostas prontas para tocar, ESPECÍFICAS deste cliente e deste mês (ofertas possíveis com o produto real,
  ações do momento, números de meta plausíveis...). Nada genérico como "Sim/Não" se der para ser concreto. Lista vazia quando
  a pergunta pede algo que só a pessoa sabe (um número, um nome).
- "comentario": 1 frase reagindo à resposta (o que você entendeu ou um dado que conecta). Vazio na primeira mensagem.
- Linguagem leve, sem jargão, sem emoji em excesso (no máximo 1).

O QUE A ESTRATÉGIA PRECISA (preencha em "preencher")
- Fixos do cliente: publico, diferenciais, voz (como a marca fala), proibidos, quem_aparece (nos vídeos), quem_grava, capacidade (de atendimento).
- Do mês: ofertas (o que vender e até quando, com preço real), meta (um número), datas_travam (dias sem gravação, férias, loja fechada).
- Além disso, colete o que enriquece a estratégia: o que está acontecendo no negócio, novidades, ações que o cliente topa
  (influenciador, parceria, evento, sorteio), objeções que ouve, o que deu certo antes. Isso entra no campo que mais combinar
  (ex.: ações e novidades em "ofertas"; objeções em "diferenciais" ou "publico").
- Em "preencher", cada campo é "" quando não muda. Quando muda, escreva o TEXTO COMPLETO e consolidado do campo
  (o que já existia + o novo, sem repetir), curto e direto. Nunca invente: só o que a pessoa disse ou confirmou.
- "faltando": os nomes (como em <campos>) do que ainda falta ou está fraco para uma boa estratégia.
- "pronto": true só quando os 10 campos estão bons. Aí a "pergunta" vira um fechamento: resuma em 1 frase e pergunte se
  pode gerar a estratégia (opções: "Pode gerar", "Quero ajustar algo").`

const now = () => new Date().toISOString()
const cut = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const textOf = (m: Anthropic.Beta.BetaMessage) => m.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim()
function price(model: string) {
  if (model.includes('haiku')) return { i: 0.10, o: 0.50, r: 0.01, w: 0.125 }
  if (model.includes('sonnet')) return { i: 2, o: 10, r: 0.10, w: 2.5 }
  return { i: 4, o: 20, r: 0.20, w: 5 }
}
async function call(db: SupabaseClient, ai: Anthropic, clientId: string, stage: string, params: Row): Promise<{ msg: Anthropic.Beta.BetaMessage; usd: number }> {
  const msg = await ai.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as Anthropic.Beta.MessageCreateParamsStreaming).finalMessage()
  const u = msg.usage; const p = price(msg.model)
  const searches = u.server_tool_use?.web_search_requests ?? 0
  const usd = ((u.input_tokens ?? 0) * p.i + (u.output_tokens ?? 0) * p.o + (u.cache_read_input_tokens ?? 0) * p.r + (u.cache_creation_input_tokens ?? 0) * p.w) / 1_000_000 + searches * 0.01
  await db.from('ai_usage_log').insert({
    function: FN, stage, client_id: clientId, model: msg.model, input_tokens: u.input_tokens ?? 0, output_tokens: u.output_tokens ?? 0,
    cache_read_tokens: u.cache_read_input_tokens ?? 0, cache_write_tokens: u.cache_creation_input_tokens ?? 0, web_searches: searches, usd: Number(usd.toFixed(5)),
  })
  return { msg, usd }
}

interface Msg { from: 'ia' | 'eu'; text: string; options?: string[]; at: string }
interface Conv { messages: Msg[]; mercado?: string; faltando?: string[]; pronto?: boolean; cost_usd?: number }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } }, auth: { persistSession: false } })
  const { data: me } = await asUser.auth.getUser()
  if (!me?.user) return json({ error: 'Entre de novo no sistema.' }, 401)
  const { data: ok } = await asUser.rpc('consult_can')
  if (ok !== true) return json({ error: 'Só administrador ou head de marketing.' }, 403)
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'Falta a chave da IA no Supabase.' }, 500)

  const body = await request.json().catch(() => ({})) as { client_id?: string; month?: string; text?: string; reset?: boolean }
  const clientId = String(body.client_id ?? ''); const month = String(body.month ?? '').slice(0, 10)
  if (!/^[0-9a-f-]{36}$/.test(clientId) || !/^\d{4}-\d{2}-01$/.test(month)) return json({ error: 'Cliente ou mês inválido.' }, 400)
  const text = cut(body.text, 2000)

  try {
    const [{ data: spent }, { data: cap }] = await Promise.all([db.rpc('ai_month_spend'), db.from('ai_settings').select('monthly_cap_usd').eq('id', true).maybeSingle()])
    if (Number(spent ?? 0) >= Number((cap as Row | null)?.monthly_cap_usd ?? 90)) return json({ error: 'O limite do mês com IA foi atingido. Ajuste em Configurações → Automações.' }, 409)

    const [{ data: cli }, { data: ctx }, { data: fb }, { data: mb }, { data: who }] = await Promise.all([
      db.from('clients').select('name, segment').eq('id', clientId).maybeSingle(),
      db.rpc('strategy_brief_context', { _client: clientId, _month: month }),
      db.from('client_briefs').select('data').eq('client_id', clientId).maybeSingle(),
      db.from('client_brief_months').select('data').eq('client_id', clientId).eq('month', month).maybeSingle(),
      db.from('profiles').select('full_name').eq('id', me.user.id).maybeSingle(),
    ])
    if (!cli) return json({ error: 'Cliente não encontrado.' }, 404)
    const fixed = ((fb as Row | null)?.data ?? {}) as Row
    const monthData = ((mb as Row | null)?.data ?? {}) as Row
    let conv: Conv = body.reset ? { messages: [] } : ((monthData.conversa ?? { messages: [] }) as Conv)
    conv.messages = Array.isArray(conv.messages) ? conv.messages : []
    if (text) conv.messages.push({ from: 'eu', text, at: now() })
    if (!text && conv.messages.length && !body.reset) return json({ conversa: conv })

    const ai = new Anthropic()
    const mesNome = `${MESES[Number(month.slice(5, 7)) - 1]} de ${month.slice(0, 4)}`
    const name = String((cli as Row).name ?? 'o cliente')
    let cost = Number(conv.cost_usd ?? 0)

    // 1 vez por conversa: o que está acontecendo no nicho neste mês (para as opções do momento).
    if (!conv.mercado) {
      try {
        const r = await call(db, ai, clientId, 'mercado', {
          model: MODEL, max_tokens: 2500,
          system: 'Você pesquisa o momento do mercado para uma assessoria de marketing de Recife. Responda em português, em tópicos curtos, com a fonte entre parênteses.',
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3, user_location: { type: 'approximate', country: 'BR', region: 'Pernambuco', timezone: 'America/Recife' } }],
          messages: [{ role: 'user', content: `Negócio: ${name} (${cut((cli as Row).segment, 80) || 'segmento não informado'}), em Recife. Mês: ${mesNome}.\nListe até 6 coisas que estão acontecendo AGORA (datas, tendências, notícias, comportamento do consumidor, o que concorrentes do nicho estão fazendo) que este negócio pode aproveitar no mês. Uma linha cada.` }],
        })
        cost += r.usd
        conv.mercado = cut(textOf(r.msg), 3000) || 'Sem pesquisa.'
      } catch { conv.mercado = 'Sem pesquisa.' }
    }

    const filledNow = Object.fromEntries([...FIXED.map((k) => [k, cut(fixed[k], 600)]), ...MONTH.map((k) => [k, cut(monthData[k], 600)])])
    const transcript = conv.messages.slice(-MAX_KEEP).map((m) => `${m.from === 'ia' ? 'Bete' : 'Equipe'}: ${m.text}`).join('\n')
    const userName = cut((who as Row | null)?.full_name, 40).split(' ')[0] || ''
    const r = await call(db, ai, clientId, 'conversa', {
      model: MODEL, max_tokens: 3000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUT_SCHEMA } },
      messages: [{ role: 'user', content: [
        { type: 'text', text: `<cliente>${name}</cliente>\n<mes>${mesNome}</mes>\n<quem_responde>${userName}</quem_responde>\n<dados>\n${JSON.stringify(ctx ?? {}).slice(0, 24_000)}\n</dados>\n<mercado>\n${conv.mercado}\n</mercado>`, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `<campos>\n${Object.entries(filledNow).map(([k, v]) => `${k} (${LABEL[k]}): ${v || '(vazio)'}`).join('\n')}\n</campos>\n<conversa>\n${transcript || '(ainda não começou: abra a conversa com a primeira pergunta, já trazendo o momento do mercado se fizer sentido)'}\n</conversa>\n\nResponda com o próximo passo da conversa.` },
      ] }],
    })
    cost += r.usd
    if (r.msg.stop_reason === 'refusal') throw new Error('A IA não respondeu. Tente reformular.')
    const out = JSON.parse(textOf(r.msg)) as Row

    // Grava o que ela entendeu: fixos no briefing do cliente, do mês no briefing do mês.
    const fill = (out.preencher ?? {}) as Row
    const fixedPatch = Object.fromEntries(FIXED.filter((k) => cut(fill[k], 2000)).map((k) => [k, String(fill[k]).trim()]))
    const monthPatch = Object.fromEntries(MONTH.filter((k) => cut(fill[k], 2000)).map((k) => [k, String(fill[k]).trim()]))
    if (Object.keys(fixedPatch).length) {
      const { error } = await db.from('client_briefs').upsert({ client_id: clientId, data: { ...fixed, ...fixedPatch }, updated_at: now() })
      if (error) throw new Error('Não consegui salvar no briefing.')
    }
    const ask = [cut(out.comentario, 400), cut(out.pergunta, 600)].filter(Boolean).join('\n\n')
    conv.messages.push({ from: 'ia', text: ask || 'Me conta mais?', options: ((out.opcoes ?? []) as string[]).map((o) => cut(o, 140)).filter(Boolean).slice(0, 5), at: now() })
    conv.messages = conv.messages.slice(-120)
    conv.faltando = ((out.faltando ?? []) as string[]).map((x) => cut(x, 40)).slice(0, 10)
    conv.pronto = !!out.pronto
    conv.cost_usd = Number(cost.toFixed(4))
    const { error: e2 } = await db.from('client_brief_months').upsert({ client_id: clientId, month, data: { ...monthData, ...monthPatch, conversa: conv }, updated_at: now() })
    if (e2) throw new Error('Não consegui salvar a conversa.')
    return json({ conversa: conv, preenchidos: [...Object.keys(fixedPatch), ...Object.keys(monthPatch)].map((k) => LABEL[k]) })
  } catch (e) {
    const m = String((e as Error).message ?? '')
    return json({ error: /credit balance/i.test(m) ? 'Sem crédito na conta da IA (Anthropic).' : m.length > 160 || m.startsWith('{') ? 'Não foi possível responder agora. Tente de novo.' : m }, 409)
  }
})
