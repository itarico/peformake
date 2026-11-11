// Estratégia → Consultoria: gera o diagnóstico + plano de ação de quem tem o serviço Consultoria ativo.
// Quem chama: o cron a cada 2 min e o encadeamento entre etapas (x-cron-secret), ou admin/head logado (botão "Gerar agora").
// Cada chamada faz UMA etapa de UM cliente (cabe no limite de 150 s do plano grátis do Supabase):
//   research (pesquisa pública com web_search/web_fetch) → diagnostico → comunicacao (tom e experiência do cliente) → plano → resumo (+ sugestões para a ficha).
//   redo: reescreve só uma seção com a pesquisa já feita.
// Nada é enviado ao cliente. Cada chamada da IA fica em ai_usage_log (US$ estimado); o teto do mês é conferido em consult_claim.
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4'
import { RECIPE_SLUGS, RESEARCH_SYSTEM, SCHEMAS, STAGE_TASK, writerSystem, type FrameworkDef } from './prompts.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const MODEL = 'claude-opus-5-5'
const FN = 'consult-diagnosis'
const STREAM_LIMIT_MS = 138_000
type Section = 'resumo' | 'diagnostico' | 'comunicacao' | 'plano' | 'riscos' | 'do_cliente'
type WriteStage = 'diagnostico' | 'mercado' | 'comunicacao' | 'plano' | 'resumo'

interface Job {
  human_edits?: Record<string, unknown> | null
  id: string; client_id: string; status: string; stage: string; redo_section: Section | null; attempts: number
  receita: Record<string, unknown> | null; research: Research | null; doc: Record<string, unknown>; cost_usd: number
}
interface Research { notes?: string; sources?: { url: string; title: string }[]; prompt?: string; pending?: unknown[]; continuations?: number }

// Preço por milhão de tokens (US$). Busca na web: US$ 10 a cada mil.
function price(model: string) {
  if (model.includes('haiku')) return { i: 0.10, o: 0.50, r: 0.01, w: 0.125 }
  if (model.includes('sonnet')) return { i: 2, o: 10, r: 0.10, w: 2.5 }
  if (model.includes('opus-4') || model.includes('opus-5-')) return model.includes('opus-5-5') ? { i: 4, o: 20, r: 0.20, w: 5 } : { i: 5, o: 25, r: 0.50, w: 6.25 }
  return { i: 4, o: 20, r: 0.20, w: 5 }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const secret = request.headers.get('x-cron-secret')
  if (secret) {
    const { data } = await db.rpc('traffic_cron_secret_ok', { _secret: secret })
    if (data !== true) return json({ error: 'Sem permissão' }, 401)
  } else {
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } }, auth: { persistSession: false } })
    const { data: me } = await asUser.auth.getUser()
    if (!me?.user) return json({ error: 'Entre de novo no sistema.' }, 401)
    const { data: roles } = await db.from('user_roles').select('role').eq('user_id', me.user.id).in('role', ['admin', 'head_marketing'])
    const { data: prof } = await db.from('profiles').select('is_active').eq('id', me.user.id).maybeSingle()
    if (!roles?.length || !prof?.is_active) return json({ error: 'Só administrador ou head de marketing.' }, 403)
  }
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'Falta a chave da IA no Supabase.' }, 500)

  const { data: claimed, error } = await db.rpc('consult_claim')
  const job = (Array.isArray(claimed) ? claimed[0] : claimed) as Job | null
  if (error) return json({ error: 'Não foi possível pegar a fila.' }, 500)
  if (!job?.id) return json({ ok: true, idle: true })

  EdgeRuntime.waitUntil(runStage(db, job).catch((e) => console.error('consult stage', job.id, String(e))))
  return json({ ok: true, job: job.id, stage: job.stage }, 202)
})

async function runStage(db: SupabaseClient, job: Job) {
  const ai = new Anthropic()
  let next = true
  try {
    if (job.stage === 'research') await stageResearch(db, ai, job)
    else if (job.stage === 'redo') await stageRedo(db, ai, job)
    else if (job.stage === 'diagnostico' || job.stage === 'comunicacao' || job.stage === 'plano' || job.stage === 'resumo') await stageWrite(db, ai, job, job.stage)
    else await db.from('consult_docs').update({ status: 'pronto', stage: 'done', busy_until: null }).eq('id', job.id)
  } catch (e) {
    const err = e as { status?: number; message?: string; name?: string }
    const permanent = e instanceof Anthropic.APIError && typeof err.status === 'number' && err.status >= 400 && err.status < 500 && err.status !== 429 && err.status !== 408
    const msg = e instanceof Anthropic.APIUserAbortError || err.name === 'AbortError'
      ? 'Demorou mais que o limite; tentando de novo mais curto.'
      : permanent ? `A IA recusou o pedido (${err.status}).` : 'Falha temporária; tentando de novo.'
    console.error('consult error', job.id, job.stage, err.status ?? '', String(err.message ?? e).slice(0, 300))
    await db.from('consult_docs').update(permanent ? { status: 'erro', error: msg, busy_until: null } : { error: msg, busy_until: null }).eq('id', job.id)
    next = !permanent
  }
  if (next) await db.rpc('consult_kick')
}

// ───────── Contexto do cliente (o mesmo para todas as etapas: fica em cache) ─────────
async function clientContext(db: SupabaseClient, job: Job): Promise<string> {
  const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
  const from = new Date(Date.parse(today) - 30 * 86400_000).toISOString().slice(0, 10)
  const yesterday = new Date(Date.parse(today) - 86400_000).toISOString().slice(0, 10)
  const [{ data: c }, { data: services }, { data: brief }, { data: social }, { data: direction }, traffic] = await Promise.all([
    db.from('clients').select('name, legal_name, segment, niche, client_type, description, target_audience, competitors, value_proposition, acquisition_channel, address, company_size, instagram, website, brand_style, document').eq('id', job.client_id).maybeSingle(),
    db.from('client_services').select('services(name, area)').eq('client_id', job.client_id).eq('is_active', true),
    db.from('client_briefs').select('data').eq('client_id', job.client_id).maybeSingle(),
    db.from('social_accounts').select('network, handle').eq('client_id', job.client_id),
    db.rpc('client_direction_context', { _client: job.client_id, _area: 'consultoria' }),
    db.rpc('agent_context_client', { _client_id: job.client_id, _from: from, _to: yesterday }).then((r) => r.data, () => null),
  ])
  const answers = await db.rpc('client_answers_context', { _client: job.client_id, _area: 'consultoria' }).then((r) => r.data, () => null)
  const { data: links } = await db.from('client_links').select('name, url').eq('client_id', job.client_id).order('created_at', { ascending: false }).limit(12)
  const cli = (c ?? {}) as Record<string, unknown>
  const doc = String(cli.document ?? '').replace(/\D/g, '')
  delete cli.document
  const t = (traffic ?? {}) as Record<string, unknown>
  const ctx = {
    direcionamento_da_equipe: direction ?? null,
    respostas_do_cliente: Array.isArray(answers) && answers.length ? answers : 'nenhuma ainda',
    links_do_cliente: links?.length ? links : 'nenhum',
    cadastro: cli,
    tipo_documento: doc.length === 14 ? 'CNPJ' : doc.length === 11 ? 'CPF (pessoa física)' : 'sem documento',
    receita_federal: job.receita ?? null,
    servicos_contratados_com_a_peformake: (services ?? []).map((s) => (s as { services?: { name?: string } }).services?.name).filter(Boolean),
    base_do_cliente: (brief as { data?: unknown } | null)?.data ?? null,
    redes_cadastradas: social ?? [],
    trafego_ultimos_30_dias: t.accounts ? { contas: t.accounts, anuncios: t.ads, planos_do_mes: t.month_plans } : 'sem conta de anúncio ligada',
  }
  return JSON.stringify(ctx, null, 1).slice(0, 60_000)
}

async function receitaOf(db: SupabaseClient, job: Job): Promise<Record<string, unknown> | null> {
  if (job.receita) return job.receita
  const { data: c } = await db.from('clients').select('document').eq('id', job.client_id).maybeSingle()
  const doc = String(c?.document ?? '').replace(/\D/g, '')
  if (doc.length !== 14) return null
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${doc}`, { signal: AbortSignal.timeout(10_000) })
    if (!r.ok) return null
    const d = await r.json() as Record<string, unknown>
    const out = {
      razao_social: d.razao_social, nome_fantasia: d.nome_fantasia, situacao: d.descricao_situacao_cadastral, abertura: d.data_inicio_atividade,
      atividade: d.cnae_fiscal_descricao, atividades_secundarias: Array.isArray(d.cnaes_secundarios) ? (d.cnaes_secundarios as { descricao?: string }[]).slice(0, 6).map((x) => x.descricao) : [],
      porte: d.porte, capital_social: d.capital_social, municipio: d.municipio, uf: d.uf, bairro: d.bairro,
      socios: Array.isArray(d.qsa) ? (d.qsa as { nome_socio?: string; qualificacao_socio?: string }[]).slice(0, 4).map((s) => `${s.nome_socio} (${s.qualificacao_socio})`) : [],
    }
    await db.from('consult_docs').update({ receita: out }).eq('id', job.id)
    job.receita = out
    return out
  } catch { return null }
}

// ───────── Registro de custo ─────────
async function logUsage(db: SupabaseClient, job: Job, stage: string, msg: Anthropic.Beta.BetaMessage): Promise<number> {
  const u = msg.usage
  const p = price(msg.model)
  const searches = u.server_tool_use?.web_search_requests ?? 0
  const usd = ((u.input_tokens ?? 0) * p.i + (u.output_tokens ?? 0) * p.o + (u.cache_read_input_tokens ?? 0) * p.r + (u.cache_creation_input_tokens ?? 0) * p.w) / 1_000_000 + searches * 0.01
  await db.from('ai_usage_log').insert({
    function: FN, stage, client_id: job.client_id, model: msg.model,
    input_tokens: u.input_tokens ?? 0, output_tokens: u.output_tokens ?? 0,
    cache_read_tokens: u.cache_read_input_tokens ?? 0, cache_write_tokens: u.cache_creation_input_tokens ?? 0,
    web_searches: searches, usd: Number(usd.toFixed(4)),
  })
  job.cost_usd = Number(job.cost_usd ?? 0) + usd
  await db.from('consult_docs').update({ cost_usd: Number(job.cost_usd.toFixed(4)) }).eq('id', job.id)
  return usd
}

async function streamCall(ai: Anthropic, params: Anthropic.Beta.MessageCreateParamsStreaming | Omit<Anthropic.Beta.MessageCreateParamsStreaming, 'stream'>) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STREAM_LIMIT_MS)
  try {
    const stream = ai.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as Anthropic.Beta.MessageCreateParamsStreaming, { signal: controller.signal })
    return await stream.finalMessage()
  } finally { clearTimeout(timer) }
}

const textOf = (m: Anthropic.Beta.BetaMessage) => m.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim()

// ───────── Etapa 1: pesquisa pública ─────────
async function stageResearch(db: SupabaseClient, ai: Anthropic, job: Job) {
  await receitaOf(db, job)
  const research: Research = job.research ?? {}
  const prompt = research.prompt ?? `Dados internos da empresa (cadastro, Receita Federal, direcionamento da equipe e números):\n${await clientContext(db, job)}\n\nPesquise agora os fatos públicos desta empresa e do mercado dela, seguindo as regras.`
  // Tentativas seguintes ficam mais curtas para caber no tempo.
  const short = job.attempts >= 2
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: prompt }]
  if (research.pending?.length) messages.push({ role: 'assistant', content: research.pending as Anthropic.Beta.BetaContentBlockParam[] })
  const msg = await streamCall(ai, {
    model: MODEL, max_tokens: 16000,
    system: [{ type: 'text', text: RESEARCH_SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: [
      { type: 'web_search_20260209', name: 'web_search', max_uses: short ? 3 : 6, user_location: { type: 'approximate', country: 'BR', timezone: 'America/Sao_Paulo' } },
      { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: short ? 3 : 5, max_content_tokens: 6000 },
    ],
    output_config: { effort: short ? 'medium' : 'high' },
    messages,
  })
  await logUsage(db, job, 'research', msg)
  if (msg.stop_reason === 'refusal') throw Object.assign(new Error('refusal'), { status: 400 })
  const sources = collectSources(msg)
  if (msg.stop_reason === 'pause_turn' && (research.continuations ?? 0) < 2) {
    // Pausa do servidor (muitas buscas): guarda e continua na próxima chamada, sem mensagem nova.
    const pending = [...(research.pending ?? []), ...msg.content] as unknown[]
    await db.from('consult_docs').update({ research: { ...research, prompt, pending, continuations: (research.continuations ?? 0) + 1, sources: mergeSources(research.sources, sources) }, busy_until: null, attempts: 0 }).eq('id', job.id)
    return
  }
  const before = ((research.pending ?? []) as { type: string; text?: string }[]).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n')
  const notes = `${before}\n${textOf(msg)}`.trim()
  const all = mergeSources(research.sources, sources, urlsIn(notes))
  await db.from('consult_docs').update({
    research: { notes: notes.slice(0, 40_000), sources: all, done_at: new Date().toISOString() },
    stage: 'diagnostico', attempts: 0, busy_until: null, error: null,
    doc: { ...(job.doc ?? {}), fontes: all },
  }).eq('id', job.id)
}

function collectSources(m: Anthropic.Beta.BetaMessage): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = []
  for (const b of m.content as unknown as { type: string; content?: unknown; citations?: { url?: string; title?: string }[] }[]) {
    if (b.type === 'web_fetch_tool_result') {
      const c = b.content as { url?: string; content?: { title?: string } } | undefined
      if (c?.url) out.push({ url: c.url, title: c.content?.title ?? c.url })
    }
    if (b.type === 'text' && Array.isArray(b.citations)) for (const ci of b.citations) if (ci.url) out.push({ url: ci.url, title: ci.title ?? ci.url })
  }
  return out
}
const urlsIn = (t: string) => [...new Set(t.match(/https?:\/\/[^\s)<>"\]]+/g) ?? [])].map((u) => ({ url: u.replace(/[.,;]+$/, ''), title: '' }))
function mergeSources(...lists: ({ url: string; title: string }[] | undefined)[]) {
  const m = new Map<string, { url: string; title: string }>()
  for (const l of lists) for (const s of l ?? []) { const k = s.url.replace(/\/$/, ''); const prev = m.get(k); if (!prev || (!prev.title && s.title)) m.set(k, { url: s.url, title: s.title || prev?.title || '' }) }
  return [...m.values()].slice(0, 40)
}

// ───────── Etapas 2 a 4: escrever (saída em JSON) ─────────
let recipeCache: string | null = null
async function writerPrompt(db: SupabaseClient): Promise<string> {
  if (recipeCache) return recipeCache
  const { data } = await db.from('strategy_frameworks').select('slug, name, objective, when_to_use, questions').in('slug', RECIPE_SLUGS)
  const defs = ((data ?? []) as FrameworkDef[]).sort((a, b) => RECIPE_SLUGS.indexOf(a.slug) - RECIPE_SLUGS.indexOf(b.slug))
  recipeCache = writerSystem(defs)
  return recipeCache
}

async function write(db: SupabaseClient, ai: Anthropic, job: Job, stage: WriteStage, extra: string): Promise<Record<string, unknown>> {
  const system = await writerPrompt(db)
  const context = `DADOS DO CLIENTE\n${await clientContext(db, job)}\n\nPESQUISA PÚBLICA (com fontes)\n${job.research?.notes ?? 'sem pesquisa'}`
  const msg = await streamCall(ai, {
    model: MODEL, max_tokens: 24000,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: job.attempts >= 2 ? 'medium' : 'high', format: { type: 'json_schema', schema: SCHEMAS[stage] as unknown as Record<string, unknown> } },
    messages: [{ role: 'user', content: [
      { type: 'text', text: context },
      { type: 'text', text: `${STAGE_TASK[stage]}${extra ? `\n\n${extra}` : ''}` },
    ] }],
  })
  await logUsage(db, job, stage, msg)
  if (msg.stop_reason === 'refusal') throw Object.assign(new Error('refusal'), { status: 400 })
  if (msg.stop_reason === 'max_tokens') throw new Error('max_tokens')
  return JSON.parse(textOf(msg)) as Record<string, unknown>
}

// O diagnóstico vai em 2 pedidos ao mesmo tempo (um só ficaria grande demais para a saída em JSON): o negócio e o mercado.
async function writeDiag(db: SupabaseClient, ai: Anthropic, job: Job, extra: string): Promise<Record<string, unknown>> {
  const [a, b] = await Promise.all([write(db, ai, job, 'diagnostico', extra), write(db, ai, job, 'mercado', extra)])
  return { ...a, ...b }
}

// Edição humana (consult_edit) vale mais que a IA: ao gravar uma parte nova, os blocos editados à mão continuam como estavam.
function keepEdits(job: Job, doc: Record<string, unknown>): Record<string, unknown> {
  const out = structuredClone(doc)
  for (const path of Object.keys(job.human_edits ?? {})) {
    const keys = path.split('.')
    let src: unknown = job.doc
    for (const k of keys) src = (src as Record<string, unknown> | undefined)?.[k]
    if (src === undefined) continue
    let dst = out as Record<string, unknown>
    for (const k of keys.slice(0, -1)) { if (typeof dst[k] !== 'object' || dst[k] === null) dst[k] = {}; dst = dst[k] as Record<string, unknown> }
    dst[keys[keys.length - 1]!] = structuredClone(src)
  }
  return out
}

const prev = (job: Job, keys: string[]) => keys.filter((k) => job.doc?.[k]).map((k) => `${k.toUpperCase()} JÁ ESCRITO:\n${JSON.stringify(job.doc[k])}`).join('\n\n')

async function stageWrite(db: SupabaseClient, ai: Anthropic, job: Job, stage: WriteStage) {
  if (stage === 'diagnostico') {
    const d = await writeDiag(db, ai, job, '')
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, diagnostico: d }), stage: 'comunicacao', attempts: 0, busy_until: null, error: null }).eq('id', job.id)
  } else if (stage === 'comunicacao') {
    const c = await write(db, ai, job, 'comunicacao', prev(job, ['diagnostico']))
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, comunicacao: c.comunicacao, experiencia: c.experiencia }), stage: 'plano', attempts: 0, busy_until: null, error: null }).eq('id', job.id)
  } else if (stage === 'plano') {
    const p = await write(db, ai, job, 'plano', prev(job, ['diagnostico', 'comunicacao', 'experiencia']))
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, plano: p }), stage: 'resumo', attempts: 0, busy_until: null, error: null }).eq('id', job.id)
  } else {
    const r = await write(db, ai, job, 'resumo', prev(job, ['diagnostico', 'comunicacao', 'plano']))
    await saveResumo(db, job, r, null)
  }
}

async function saveResumo(db: SupabaseClient, job: Job, r: Record<string, unknown>, only: Section | null) {
  const doc = { ...job.doc }
  if (!only || only === 'resumo') doc.resumo = r.resumo
  if (!only || only === 'riscos') doc.riscos = r.riscos
  if (!only || only === 'do_cliente') doc.do_cliente = r.do_cliente
  if (!only) doc.frameworks = r.frameworks
  doc.gerado_em = new Date().toISOString()
  await db.from('consult_docs').update({ doc: keepEdits(job, doc), stage: 'done', status: 'pronto', attempts: 0, busy_until: null, error: null, redo_section: null, finished_at: new Date().toISOString() }).eq('id', job.id)
  if (!only) await saveSuggestions(db, job.client_id, (r.crm ?? {}) as Record<string, string>)
}

async function stageRedo(db: SupabaseClient, ai: Anthropic, job: Job) {
  const section = job.redo_section ?? 'resumo'
  const done = { stage: 'done', status: 'pronto', attempts: 0, busy_until: null, error: null, redo_section: null }
  const note = 'Reescreva esta parte com outro olhar: mais específica e prática que a versão anterior (abaixo).'
  if (section === 'diagnostico') {
    const d = await writeDiag(db, ai, job, `${note}\n\n${prev(job, ['diagnostico'])}`)
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, diagnostico: d, gerado_em: new Date().toISOString() }), ...done }).eq('id', job.id)
  } else if (section === 'comunicacao') {
    const c = await write(db, ai, job, 'comunicacao', `${note}\n\n${prev(job, ['diagnostico', 'comunicacao', 'experiencia'])}`)
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, comunicacao: c.comunicacao, experiencia: c.experiencia, gerado_em: new Date().toISOString() }), ...done }).eq('id', job.id)
  } else if (section === 'plano') {
    const p = await write(db, ai, job, 'plano', `${note}\n\n${prev(job, ['diagnostico', 'comunicacao', 'plano'])}`)
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, plano: p, gerado_em: new Date().toISOString() }), ...done }).eq('id', job.id)
  } else {
    const r = await write(db, ai, job, 'resumo', `${note} Foque na parte "${section}"; o resto pode repetir.\n\n${prev(job, ['diagnostico', 'plano', section])}`)
    await saveResumo(db, job, r, section)
  }
}

// Sugestões para a ficha: só para campo vazio (nunca troca o que a equipe escreveu). Aceitar/descartar é com 1 toque na ficha.
const FIELD: Record<string, string> = {
  segmento: 'segment', descricao: 'description', publico_alvo: 'target_audience', concorrentes: 'competitors',
  proposta_valor: 'value_proposition', canal_aquisicao: 'acquisition_channel', instagram: 'instagram', site: 'website',
}
async function saveSuggestions(db: SupabaseClient, clientId: string, crm: Record<string, string>) {
  const { data: c } = await db.from('clients').select('segment, description, target_audience, competitors, value_proposition, acquisition_channel, instagram, website').eq('id', clientId).maybeSingle()
  const cur = (c ?? {}) as Record<string, string | null>
  const rows = Object.entries(FIELD).flatMap(([k, field]) => {
    const value = String(crm[k] ?? '').trim()
    if (!value || (cur[field] ?? '').trim()) return []
    if ((field === 'instagram' || field === 'website') && !/[a-z0-9]/i.test(value)) return []
    return [{ client_id: clientId, field, value: value.slice(0, 4000), current_value: null, source: 'consultoria' }]
  })
  await db.from('client_ai_suggestions').delete().eq('client_id', clientId).eq('source', 'consultoria').eq('status', 'pendente')
  if (rows.length) await db.from('client_ai_suggestions').insert(rows)
}
