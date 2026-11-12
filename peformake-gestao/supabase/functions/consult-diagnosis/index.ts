// Estratégia → Consultoria: gera o diagnóstico + plano de ação de quem tem o serviço Consultoria ativo.
// Quem chama: o cron a cada 2 min e o encadeamento entre etapas (x-cron-secret), ou admin/head logado (botão "Gerar agora").
// Cada chamada faz UMA etapa de UM cliente (cabe no limite de 150 s do plano grátis do Supabase); pedidos à IA em paralelo dentro da etapa:
//   research: dados internos (anúncios, conversas, relatórios) + pesquisa em 2 rodadas
//             (1: redes, site/identidade, Google/reputação, portais do nicho · 2: concorrentes e anúncios, mercado e números de referência)
//             + coleta do Instagram (Firecrawl, com teto de créditos; sem crédito segue com aviso)
//   diagnostico: 1º o cruzamento (inteligência: descobertas, comparativos, oportunidades, hipóteses, decisões, perguntas), depois negócio + mercado
//   comunicacao → plano → resumo (+ sugestões para a ficha).  redo: reescreve só uma seção.
// As sub-etapas ficam marcadas dentro de research (jsonb): nada de estado novo no banco.
// Nada é enviado ao cliente. Cada chamada da IA fica em ai_usage_log (US$ estimado); o teto do mês é conferido em consult_claim.
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4'
import { PART_USES, RECIPE_SLUGS, RESEARCH_ROUNDS, RESEARCH_SYSTEM, researchTask, SCHEMAS, STAGE_TASK, writerSystem, type FrameworkDef, type ResearchPart, type WriteStage } from './prompts.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

// O modelo mais capaz (pensa sempre; profundidade pelo effort). Recusa de segurança cai num modelo reserva no próprio pedido (fallbacks).
const MODEL = 'claude-fable-5-2'
const FN = 'consult-diagnosis'
// O Supabase grátis corta a chamada em 150 s: cada pedido à IA termina até 128 s depois do início da etapa, para dar tempo de gravar.
const STAGE_BUDGET_MS = 128_000
type Section = 'resumo' | 'diagnostico' | 'comunicacao' | 'plano' | 'riscos' | 'do_cliente'
type Effort = 'low' | 'medium' | 'high' | 'xhigh'
type Source = { url: string; title: string }

interface Job {
  human_edits?: Record<string, unknown> | null
  id: string; client_id: string; status: string; stage: string; redo_section: Section | null; attempts: number
  receita: Record<string, unknown> | null; research: Research | null; doc: Record<string, unknown>; cost_usd: number
  t0?: number
}
interface Part { notes?: string; sources?: Source[]; pending?: unknown[]; cont?: number; done?: boolean; failed?: boolean }
interface Research {
  round?: number; parts?: Partial<Record<ResearchPart, Part>>; interno?: Record<string, unknown>
  notes?: string; sources?: Source[]; intel?: boolean; done_at?: string; coleta?: Coleta
  partial?: Record<string, Record<string, unknown>>
}
interface Coleta { instagram?: Record<string, unknown>[]; creditos: number; aviso?: string | null }

// Preço por milhão de tokens (US$). Busca na web: US$ 10 a cada mil.
function price(model: string) {
  if (model.includes('fable-5-2') || model.includes('mythos-5-2')) return { i: 8, o: 40, r: 0.20, w: 10 }
  if (model.includes('fable') || model.includes('mythos')) return { i: 10, o: 50, r: 1, w: 12.5 }
  if (model.includes('haiku')) return { i: 0.10, o: 0.50, r: 0.01, w: 0.125 }
  if (model.includes('sonnet')) return { i: 2, o: 10, r: 0.10, w: 2.5 }
  if (model.includes('opus-5-5')) return { i: 4, o: 20, r: 0.20, w: 5 }
  return { i: 5, o: 25, r: 0.50, w: 6.25 }
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
  job.t0 = Date.now()
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
      : err.message === 'refusal' ? 'A IA recusou o pedido.' : permanent ? `A IA recusou o pedido (${err.status}).` : 'Falha temporária; tentando de novo.'
    console.error('consult error', job.id, job.stage, err.status ?? '', String(err.message ?? e).slice(0, 300))
    await db.from('consult_docs').update(permanent ? { status: 'erro', error: msg, busy_until: null } : { error: msg, busy_until: null }).eq('id', job.id).eq('stage', job.stage)
    next = !permanent
  }
  if (next) await db.rpc('consult_kick')
}

// ───────── Contexto do cliente (o mesmo para todas as etapas: fica em cache) ─────────
async function clientContext(db: SupabaseClient, job: Job): Promise<string> {
  const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
  const from = new Date(Date.parse(today) - 30 * 86400_000).toISOString().slice(0, 10)
  const yesterday = new Date(Date.parse(today) - 86400_000).toISOString().slice(0, 10)
  const [{ data: c }, { data: services }, { data: brief }, { data: social }, { data: direction }, traffic, answers, { data: links }] = await Promise.all([
    db.from('clients').select('name, legal_name, segment, niche, client_type, description, target_audience, competitors, value_proposition, acquisition_channel, address, company_size, instagram, website, brand_style, document').eq('id', job.client_id).maybeSingle(),
    db.from('client_services').select('services(name, area)').eq('client_id', job.client_id).eq('is_active', true),
    db.from('client_briefs').select('data').eq('client_id', job.client_id).maybeSingle(),
    db.from('social_accounts').select('network, handle').eq('client_id', job.client_id),
    db.rpc('client_direction_context', { _client: job.client_id, _area: 'consultoria' }),
    db.rpc('agent_context_client', { _client_id: job.client_id, _from: from, _to: yesterday }).then((r) => r.data, () => null),
    db.rpc('client_answers_context', { _client: job.client_id, _area: 'consultoria' }).then((r) => r.data, () => null),
    db.from('client_links').select('name, url').eq('client_id', job.client_id).order('created_at', { ascending: false }).limit(12),
  ])
  const collected = await collectedOf(db, job.client_id)
  const cli = (c ?? {}) as Record<string, unknown>
  const doc = String(cli.document ?? '').replace(/\D/g, '')
  delete cli.document
  const t = (traffic ?? {}) as Record<string, unknown>
  const ctx = {
    hoje: today,
    direcionamento_da_equipe: direction ?? null,
    respostas_do_cliente: Array.isArray(answers) && answers.length ? answers : 'nenhuma ainda',
    links_do_cliente: links?.length ? links : 'nenhum',
    cadastro: cli,
    tipo_documento: doc.length === 14 ? 'CNPJ' : doc.length === 11 ? 'CPF (pessoa física)' : 'sem documento',
    receita_federal: job.receita ?? null,
    servicos_contratados_com_a_peformake: (services ?? []).map((s) => (s as { services?: { name?: string } }).services?.name).filter(Boolean),
    base_do_cliente: (brief as { data?: unknown } | null)?.data ?? null,
    redes_cadastradas: social ?? [],
    trafego_ultimos_30_dias: t.accounts ? { contas: t.accounts, anuncios: t.ads, planos_do_mes: t.month_plans } : 'sem dados de anúncio nos últimos 30 dias',
    dados_internos: job.research?.interno ?? null,
    coleta_dos_conectores: collected.length ? collected : 'nada coletado pela rotina',
    instagram_lido_pela_coleta: job.research?.coleta ? (job.research.coleta.instagram?.length ? job.research.coleta.instagram : job.research.coleta.aviso ?? 'não lido') : 'ainda não coletado',
  }
  return JSON.stringify(ctx, null, 1).slice(0, 90_000)
}

// Fontes internas, antes da internet: anúncios (90 dias, por campanha), relatórios, conversas com a equipe,
// WhatsApp do próprio cliente (dúvidas e objeções dos clientes dele), planos do mês e tempo de casa. Sem valores que o cliente paga.
const hidePhones = (t: string) => t.replace(/\+?\d[\d\s().-]{7,}\d/g, '[telefone]').replace(/\S+@\S+\.\S+/g, '[email]')
async function internalData(db: SupabaseClient, clientId: string): Promise<Record<string, unknown>> {
  const since = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10)
  const safe = <T,>(p: PromiseLike<{ data: T | null }>) => Promise.resolve(p).then((r) => r.data, () => null)
  const [ads, reports, contacts, waAccounts, plans, invoices, contract] = await Promise.all([
    safe(db.from('ad_accounts').select('id, name, business_name, enabled').eq('client_id', clientId)),
    safe(db.from('traffic_reports').select('kind, period_start, period_end, summary, metrics').eq('client_id', clientId).order('created_at', { ascending: false }).limit(4)),
    safe(db.from('wa_contacts').select('chat_jid, kind, is_group, ai_summary, ai_intent, ai_sentiment').eq('client_id', clientId).limit(10)),
    safe(db.from('whatsapp_accounts').select('id').eq('client_id', clientId)),
    safe(db.from('client_monthly_plans').select('month, objectives, priority_products, services_to_promote, planned_actions, important_dates, business_changes, new_offers, expectations, constraints, notes, direction').eq('client_id', clientId).order('month', { ascending: false }).limit(2)),
    safe(db.from('invoices').select('status, created_at').eq('client_id', clientId).order('created_at').limit(200)),
    safe(db.from('client_contracts').select('contract_type, start_date, months').eq('client_id', clientId).maybeSingle()),
  ])
  const style = (await safe(db.rpc('agent_client_style', { _client_id: clientId }))) as Record<string, unknown> | null
  const accIds = ((ads ?? []) as { id: string }[]).flatMap((a) => [a.id, a.id.startsWith('act_') ? a.id.slice(4) : `act_${a.id}`])
  let campanhas: unknown = 'sem campanhas lidas'
  if (accIds.length) {
    const ents = (await safe(db.from('traffic_entities').select('id, level, parent_id, name, effective_status, objective, daily_budget_cents, thumbnail_url').in('account_id', accIds).in('level', ['campaign', 'adset', 'ad']).limit(150)) ?? []) as Record<string, unknown>[]
    const camp = ents.filter((e) => e.level === 'campaign')
    if (camp.length) {
      const days = (await safe(db.from('traffic_entity_daily').select('entity_id, day, spend_cents, impressions, clicks, results, leads').in('entity_id', camp.map((e) => e.id as string)).gte('day', since).limit(5000)) ?? []) as Record<string, number | string>[]
      const sum = new Map<string, Record<string, number>>()
      for (const d of days) {
        const m = sum.get(d.entity_id as string) ?? { investido_reais: 0, impressoes: 0, cliques: 0, resultados: 0, contatos: 0, dias: 0 }
        m.investido_reais += Number(d.spend_cents ?? 0) / 100; m.impressoes += Number(d.impressions ?? 0); m.cliques += Number(d.clicks ?? 0)
        m.resultados += Number(d.results ?? 0); m.contatos += Number(d.leads ?? 0); m.dias += 1
        sum.set(d.entity_id as string, m)
      }
      campanhas = camp.slice(0, 15).map((c) => ({
        nome: c.name, status: c.effective_status, objetivo: c.objective, orcamento_dia_reais: c.daily_budget_cents ? Number(c.daily_budget_cents) / 100 : null,
        ultimos_90_dias: sum.get(c.id as string) ?? 'sem números',
        criativos: ents.filter((a) => a.level === 'ad').slice(0, 40).filter((a) => a.parent_id === c.id || ents.some((s) => s.level === 'adset' && s.id === a.parent_id && s.parent_id === c.id)).slice(0, 5).map((a) => ({ nome: a.name, status: a.effective_status, imagem: a.thumbnail_url ? 'tem miniatura' : null })),
      }))
    }
  }
  // Números da CONTA (dia a dia): existem mesmo quando a leitura por campanha ainda não rodou.
  const accOnly = ((ads ?? []) as { id: string }[]).map((a) => a.id)
  const dm = accOnly.length ? ((await safe(db.from('traffic_daily_metrics').select('account_id, day, spend_cents, impressions, clicks, leads, purchases, results, result_type').in('account_id', accOnly).gte('day', since).order('day').limit(2000))) ?? []) as Record<string, number | string>[] : []
  const byMonth = new Map<string, Record<string, number>>()
  for (const d of dm) {
    const k = String(d.day).slice(0, 7)
    const m = byMonth.get(k) ?? { investido_reais: 0, impressoes: 0, cliques: 0, contatos: 0, compras: 0, resultados: 0, dias_com_anuncio: 0 }
    m.investido_reais = Math.round((m.investido_reais + Number(d.spend_cents ?? 0) / 100) * 100) / 100
    m.impressoes += Number(d.impressions ?? 0); m.cliques += Number(d.clicks ?? 0); m.contatos += Number(d.leads ?? 0)
    m.compras += Number(d.purchases ?? 0); m.resultados += Number(d.results ?? 0); if (Number(d.spend_cents ?? 0) > 0) m.dias_com_anuncio += 1
    byMonth.set(k, m)
  }
  const lastDay = dm.length ? String(dm[dm.length - 1]!.day) : null
  const resultType = [...new Set(dm.map((d) => d.result_type).filter(Boolean))].slice(0, 3)
  // Estratégias de tráfego já feitas (e o que foi aprovado/recusado nelas): o diagnóstico continua daí, não recomeça.
  const strat = ((await safe(db.from('traffic_strategies').select('id, kind, month, period_start, period_end, status, summary, sent_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(3))) ?? []) as Record<string, unknown>[]
  const items = strat.length ? ((await safe(db.from('traffic_strategy_items').select('strategy_id, module, title, status, destination').in('strategy_id', strat.map((x) => x.id as string)).limit(80))) ?? []) as Record<string, unknown>[] : []
  const jids = ((contacts ?? []) as { chat_jid: string }[]).map((c) => c.chat_jid)
  const team = jids.length ? ((await safe(db.from('whatsapp_messages').select('from_me, body, sent_at').in('chat_jid', jids).not('body', 'is', null).order('sent_at', { ascending: false }).limit(120))) ?? []) as { from_me: boolean; body: string; sent_at: string }[] : []
  const accs = ((waAccounts ?? []) as { id: string }[]).map((a) => a.id)
  const leads = accs.length ? ((await safe(db.from('whatsapp_messages').select('body').in('account_id', accs).eq('from_me', false).eq('is_group', false).not('body', 'is', null).order('sent_at', { ascending: false }).limit(150))) ?? []) as { body: string }[] : []
  const inv = (invoices ?? []) as { status: string; created_at: string }[]
  const first = inv[0]?.created_at
  return {
    contas_de_anuncio: ((ads ?? []) as Record<string, unknown>[]).map((a) => ({ nome: a.name, empresa: a.business_name, ligada: a.enabled })),
    contas_de_anuncio_situacao: ((ads ?? []) as Record<string, unknown>[]).map((a) => ({ conta: a.name, ligada_no_sistema: a.enabled, leitura: a.enabled ? (dm.some((d) => d.account_id === a.id) ? `lida até ${lastDay}` : 'ligada mas sem números lidos (PROBLEMA INTERNO: conferir acesso da Peformake à conta)') : 'desligada no sistema (PROBLEMA INTERNO: liberar acesso ou ligar a leitura)' })),
    trafego_por_mes_da_conta: byMonth.size ? Object.fromEntries(byMonth) : 'sem números da conta nos últimos 90 dias',
    trafego_tipo_de_resultado: resultType.length ? resultType : null,
    campanhas_90_dias: campanhas,
    estrategias_de_trafego_feitas: strat.length ? strat.map((x) => ({ tipo: x.kind, mes: x.month ?? x.period_start, situacao: x.status, enviada_ao_cliente: !!x.sent_at, resumo: String(x.summary ?? '').slice(0, 700),
      itens: items.filter((i) => i.strategy_id === x.id).slice(0, 15).map((i) => ({ item: i.title, area: i.destination ?? i.module, decisao: i.status })) })) : 'nenhuma estratégia de tráfego feita ainda',
    relatorios_de_trafego: ((reports ?? []) as Record<string, unknown>[]).map((r) => {
      const m = (r.metrics ?? {}) as Record<string, unknown>
      return { tipo: r.kind, periodo: `${r.period_start} a ${r.period_end}`, resumo: String(r.summary ?? '').slice(0, 600), investido_centavos: m.spend, cliques: m.clicks, resultados: m.results, impressoes: m.impressions, semana_anterior: m.previous }
    }),
    conversas_com_a_equipe_resumo: ((contacts ?? []) as Record<string, unknown>[]).filter((c) => c.ai_summary).map((c) => ({ grupo: c.is_group, resumo: hidePhones(String(c.ai_summary)), intencao: c.ai_intent, humor: c.ai_sentiment })),
    conversas_com_a_equipe_ultimas: team.reverse().map((m) => `${m.sent_at?.slice(0, 10)} ${m.from_me ? 'Peformake' : 'Cliente'}: ${hidePhones(String(m.body)).slice(0, 220)}`),
    whatsapp_do_cliente_mensagens_dos_clientes_dele: leads.length ? leads.map((m) => hidePhones(String(m.body)).slice(0, 160)) : 'WhatsApp do cliente não está ligado ao sistema',
    planos_do_mes: plans ?? [],
    playbook_do_atendimento: style?.playbook ?? 'ainda não aprendido',
    relacao_com_a_peformake: { cliente_desde: first?.slice(0, 10) ?? null, meses_de_casa: first ? Math.max(1, Math.round((Date.now() - Date.parse(first)) / (30 * 86400_000))) : null, contrato: contract ?? null, cobrancas: inv.length, atrasadas: inv.filter((i) => i.status === 'atrasada' || i.status === 'overdue').length },
  }
}

// O que a rotina coletou com os conectores (Biblioteca de Anúncios, Instagram, Insights): vem antes da pesquisa na web.
async function collectedOf(db: SupabaseClient, clientId: string): Promise<Record<string, unknown>[]> {
  const { data } = await db.from('consult_collected').select('source, subject, url, data, collected_at').eq('client_id', clientId)
    .gte('collected_at', new Date(Date.now() - 20 * 86400_000).toISOString()).order('collected_at', { ascending: false }).limit(40)
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({ fonte: r.source, sobre: r.subject, link: r.url, em: String(r.collected_at).slice(0, 10), dados: JSON.stringify(r.data).slice(0, 5000) }))
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
      porte: d.porte, capital_social: d.capital_social, municipio: d.municipio, uf: d.uf, bairro: d.bairro, telefone: d.ddd_telefone_1,
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

// Pedido cortado pelo limite de tempo também custa: grava o que já foi gasto (etapa com ":cortado").
async function streamCall(ai: Anthropic, params: Omit<Anthropic.Beta.MessageCreateParamsStreaming, 'stream'>, cut?: { db: SupabaseClient; job: Job; stage: string }) {
  const controller = new AbortController()
  const left = cut?.job.t0 ? cut.job.t0 + STAGE_BUDGET_MS - Date.now() : STAGE_BUDGET_MS
  const timer = setTimeout(() => controller.abort(), Math.max(15_000, left))
  const stream = ai.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as Anthropic.Beta.MessageCreateParamsStreaming, { signal: controller.signal })
  try {
    return await stream.finalMessage()
  } catch (e) {
    const partial = stream.currentMessage
    if (cut && partial?.usage) await logUsage(cut.db, cut.job, `${cut.stage}:cortado`, partial).catch(() => {})
    throw e
  } finally { clearTimeout(timer) }
}

const textOf = (m: Anthropic.Beta.BetaMessage) => m.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim()

// ───────── Etapa 1: dados internos + pesquisa em 2 rodadas (partes em paralelo) ─────────
const PART_TITLE: Record<ResearchPart, string> = { redes: 'REDES SOCIAIS', site: 'SITE, BUSCA E IDENTIDADE', reputacao: 'GOOGLE E REPUTAÇÃO', nicho: 'PORTAIS DO NICHO E OFERTA', concorrentes: 'CONCORRÊNCIA E ANÚNCIOS', mercado: 'MERCADO E NÚMEROS DE REFERÊNCIA' }
const researchNotes = (r: Research | null, only?: ResearchPart[]) => Object.entries(r?.parts ?? {})
  .filter(([k, p]) => p?.notes && (!only || only.includes(k as ResearchPart)))
  .map(([k, p]) => `### ${PART_TITLE[k as ResearchPart]}\n${p!.notes}`).join('\n\n')

async function stageResearch(db: SupabaseClient, ai: Anthropic, job: Job) {
  await receitaOf(db, job)
  const research: Research = { ...(job.research ?? {}) }
  if (!research.interno) research.interno = await internalData(db, job.client_id)
  job.research = research
  const round = research.round ?? 0
  if (round >= RESEARCH_ROUNDS.length) return finishResearch(db, job, research)
  const parts = RESEARCH_ROUNDS[round] ?? []
  research.parts = { ...(research.parts ?? {}) }
  const todo = parts.filter((p) => !research.parts![p]?.done)
  const { data: cli } = await db.from('clients').select('niche, segment').eq('id', job.client_id).maybeSingle()
  const niche = `${cli?.niche ?? ''} ${cli?.segment ?? ''} ${(job.receita?.atividade as string) ?? ''}`
  const ctx = await clientContext(db, job)
  const earlier = round > 0 ? `\n\nO QUE A RODADA 1 JÁ ACHOU (não repita estas buscas):\n${researchNotes(research, RESEARCH_ROUNDS[0])}` : ''
  // Na 2ª tentativa a parte que ainda falha é dada como "não concluída" para não travar o resto.
  const giveUp = job.attempts >= 2
  // Cada parte é gravada assim que termina (se a chamada for cortada, o que já veio não se perde).
  let chain: Promise<unknown> = Promise.resolve()
  const persist = () => { chain = chain.then(() => db.from('consult_docs').update({ research }).eq('id', job.id).eq('stage', job.stage)); return chain }
  const results = await Promise.allSettled(todo.map((p) => runPart(db, ai, job, p, research.parts![p] ?? {}, `${ctx}${earlier}`, niche).then(async (v) => { research.parts![p] = v; await persist(); return v })))
  await chain
  let progress = false
  results.forEach((r, i) => {
    const key = todo[i]!
    if (r.status === 'fulfilled') { progress = true } else {
      console.error('consult research part', job.id, key, String((r.reason as Error)?.message ?? r.reason).slice(0, 200))
      if (giveUp) research.parts![key] = { done: true, failed: true, notes: 'Esta parte da pesquisa não terminou a tempo.' }
    }
  })
  const roundDone = parts.every((p) => research.parts![p]?.done)
  if (roundDone) research.round = round + 1
  if (roundDone && research.round! >= RESEARCH_ROUNDS.length) {
    // A coleta do Instagram (Firecrawl) vai na próxima chamada, para caber no tempo.
    await db.from('consult_docs').update({ research, busy_until: null, error: null, attempts: 0 }).eq('id', job.id).eq('stage', job.stage)
    return
  }
  if (!progress && !roundDone) throw new Error('nenhuma parte da pesquisa terminou')
  await db.from('consult_docs').update({ research, busy_until: null, error: null, ...(roundDone || progress ? { attempts: 0 } : {}) }).eq('id', job.id).eq('stage', job.stage)
}

const COLLECT_WAIT_MS = 30 * 60_000
async function finishResearch(db: SupabaseClient, job: Job, research: Research) {
  // Espera a rotina de coleta (conectores) terminar, até 30 min desde o pedido; depois segue com o que tiver.
  const { data: cs } = await db.from('consult_docs').select('collect_status, collect_requested_at').eq('id', job.id).maybeSingle()
  if (cs && ['pendente', 'coletando'].includes(String(cs.collect_status))) {
    if (Date.now() - Date.parse(String(cs.collect_requested_at)) < COLLECT_WAIT_MS) {
      await db.from('consult_docs').update({ research, attempts: 0, error: null, busy_until: new Date(Date.now() + 120_000).toISOString() }).eq('id', job.id).eq('stage', job.stage)
      return
    }
    await db.from('consult_docs').update({ collect_status: 'expirado' }).eq('id', job.id)
  }
  if (!research.coleta) research.coleta = await collectInstagram(db, job, research)
  const all = mergeSources(...Object.values(research.parts ?? {}).map((p) => p?.sources))
  research.notes = researchNotes(research).slice(0, 80_000)
  research.sources = all
  research.done_at = new Date().toISOString()
  const avisos = research.coleta.aviso ? [research.coleta.aviso] : []
  await db.from('consult_docs').update({ research, stage: 'diagnostico', attempts: 0, busy_until: null, error: null, doc: { ...(job.doc ?? {}), fontes: all, avisos } }).eq('id', job.id).eq('stage', job.stage)
}

// Redes sociais pedem login: abrir a página trava a pesquisa até o limite de tempo (era o que derrubava "concorrentes").
const BLOCKED_FETCH = ['facebook.com', 'instagram.com', 'tiktok.com', 'threads.net']
async function runPart(db: SupabaseClient, ai: Anthropic, job: Job, part: ResearchPart, state: Part, ctx: string, niche: string): Promise<Part> {
  const retry = job.attempts >= 2
  const prompt = `DADOS INTERNOS DO CLIENTE (cadastro, Receita Federal, direcionamento, links, anúncios e conversas):\n${ctx}\n\n${researchTask(part, niche)}`
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: prompt }]
  if (state.pending?.length) messages.push({ role: 'assistant', content: state.pending as Anthropic.Beta.BetaContentBlockParam[] })
  const msg = await streamCall(ai, {
    model: MODEL, max_tokens: 16000,
    system: [{ type: 'text', text: RESEARCH_SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: [
      // Versões básicas (sem filtro por código): bem mais rápidas, e a pesquisa precisa caber em ~2 minutos.
      { type: 'web_search_20250305', name: 'web_search', max_uses: retry ? 3 : PART_USES[part][0], user_location: { type: 'approximate', country: 'BR', timezone: 'America/Sao_Paulo' } },
      ...(PART_USES[part][1] > 0 && !retry ? [{ type: 'web_fetch_20250910' as const, name: 'web_fetch' as const, max_uses: PART_USES[part][1], max_content_tokens: 5000, blocked_domains: BLOCKED_FETCH }] : []),
    ],
    // Pesquisa é coleta: esforço baixo (rápido, cabe no tempo). A análise funda é no cruzamento.
    output_config: { effort: 'low' },
    messages,
  }, { db, job, stage: `research:${part}` })
  await logUsage(db, job, `research:${part}`, msg)
  if (msg.stop_reason === 'refusal') return { done: true, failed: true, notes: 'A IA não fez esta parte da pesquisa.' }
  const sources = collectSources(msg)
  if (msg.stop_reason === 'pause_turn' && (state.cont ?? 0) < 2) {
    // Pausa do servidor (muitas buscas): guarda e continua na próxima chamada.
    return { ...state, pending: [...(state.pending ?? []), ...msg.content] as unknown[], cont: (state.cont ?? 0) + 1, sources: mergeSources(state.sources, sources) }
  }
  const before = ((state.pending ?? []) as { type: string; text?: string }[]).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n')
  const notes = `${before}\n${textOf(msg)}`.trim()
  return { done: true, notes: notes.slice(0, 20_000), sources: mergeSources(state.sources, sources, urlsIn(notes)) }
}

function collectSources(m: Anthropic.Beta.BetaMessage): Source[] {
  const out: Source[] = []
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
function mergeSources(...lists: (Source[] | undefined)[]) {
  const m = new Map<string, Source>()
  for (const l of lists) for (const s of l ?? []) { const k = s.url.replace(/\/$/, ''); const prev = m.get(k); if (!prev || (!prev.title && s.title)) m.set(k, { url: s.url, title: s.title || prev?.title || '' }) }
  return [...m.values()].slice(0, 60)
}

// ───────── Coleta do Instagram (Firecrawl → ScrapeCreators), antes da análise ─────────
// Barata (~2 créditos por chamada) e com teto por cliente (ai_settings.firecrawl_credits_per_client, padrão 100).
// Sem chave, sem crédito ou com erro: segue sem quebrar, com o aviso no documento; a análise usa a pesquisa na web.
type FcResult = { data?: Record<string, unknown>; credits: number; error?: 'sem_chave' | 'sem_creditos' | 'erro' }
async function firecrawl(capability: string, options: Record<string, unknown>): Promise<FcResult> {
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) return { credits: 0, error: 'sem_chave' }
  try {
    const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST', signal: AbortSignal.timeout(25_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'x-request-id': crypto.randomUUID() },
      body: JSON.stringify({ alexandria: { provider: 'scrapecreators', capability, options } }),
    })
    const j = await r.json().catch(() => ({})) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    const msg = JSON.stringify(j).slice(0, 400)
    if (r.status === 402 || /insufficient|credit/i.test(String(j.error ?? ''))) return { credits: 0, error: 'sem_creditos' }
    if (!r.ok) { console.error('firecrawl', capability, r.status, msg); return { credits: 0, error: 'erro' } }
    const a = (j.data?.alexandria ?? [])[0] ?? {}
    if (a.error) { console.error('firecrawl cap', capability, msg); return { credits: Number(j.creditsUsed ?? 0), error: /credit/i.test(JSON.stringify(a.error)) ? 'sem_creditos' : 'erro' } }
    return { data: (a.data ?? a) as Record<string, unknown>, credits: Number(j.creditsUsed ?? j.data?.metadata?.creditsUsed ?? 2) }
  } catch (e) { console.error('firecrawl fetch', capability, String(e).slice(0, 200)); return { credits: 0, error: 'erro' } }
}

const igHandle = (v: unknown) => { const m = String(v ?? '').match(/(?:instagram\.com\/|@)([A-Za-z0-9_.]{2,30})/) ?? String(v ?? '').trim().match(/^([A-Za-z0-9_.]{2,30})$/); const h = m?.[1]?.replace(/\.$/, '').toLowerCase(); return h && !['p', 'reel', 'reels', 'explore', 'stories', 'accounts'].includes(h) ? h : null }
function handlesIn(text: string): string[] { return [...new Set([...text.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})/g)].map((m) => igHandle(`@${m[1]}`)).filter(Boolean) as string[])] }

/** Resume os posts do perfil: ritmo, médias, o que mais engaja e trechos de legenda. */
function summarizePosts(handle: string, d: Record<string, any>) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const items = (Array.isArray(d.items) ? d.items : Array.isArray(d.records) ? d.records : []) as Record<string, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any
  const u = (d.user ?? items[0]?.user ?? items[0]?.owner ?? {}) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  const posts = items.slice(0, 12).map((p) => ({
    data: p.taken_at ? new Date(Number(p.taken_at) * 1000).toISOString().slice(0, 10) : null,
    tipo: p.product_type === 'clips' ? 'reel' : p.media_type === 8 ? 'carrossel' : p.media_type === 2 ? 'vídeo' : 'foto',
    curtidas: p.like_count ?? null, comentarios: p.comment_count ?? null, plays: p.play_count ?? p.ig_play_count ?? null,
    legenda: String(p.caption?.text ?? p.caption ?? '').slice(0, 140), link: p.code ? `https://www.instagram.com/p/${p.code}/` : p.url ?? null, code: p.code ?? null,
  }))
  const days = posts.map((p) => p.data).filter(Boolean).sort() as string[]
  const span = days.length > 1 ? Math.max(1, (Date.parse(days[days.length - 1]!) - Date.parse(days[0]!)) / 86400_000) : null
  const avg = (k: 'curtidas' | 'comentarios' | 'plays') => { const v = posts.map((p) => Number(p[k])).filter((n) => Number.isFinite(n) && n >= 0); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null }
  const best = [...posts].sort((a, b) => (Number(b.curtidas) || 0) + 3 * (Number(b.comentarios) || 0) - ((Number(a.curtidas) || 0) + 3 * (Number(a.comentarios) || 0)))[0]
  return {
    perfil: `@${handle}`, seguidores: u.follower_count ?? u.edge_followed_by?.count ?? null, posts_total: u.media_count ?? null,
    posts_lidos: posts.length, ultimo_post: days[days.length - 1] ?? null, posts_por_semana: span && posts.length > 1 ? Number(((posts.length - 1) / span * 7).toFixed(1)) : null,
    media_curtidas: avg('curtidas'), media_comentarios: avg('comentarios'), media_plays_reels: avg('plays'),
    tipos: posts.reduce((m, p) => ({ ...m, [p.tipo]: (m[p.tipo] ?? 0) + 1 }), {} as Record<string, number>),
    post_que_mais_engajou: best ?? null, posts: posts.map(({ code: _c, ...p }) => p),
  }
}

async function collectInstagram(db: SupabaseClient, job: Job, research: Research): Promise<Coleta> {
  const { count } = await db.from('consult_collected').select('id', { count: 'exact', head: true }).eq('client_id', job.client_id).in('source', ['instagram_posts', 'instagram_profile'])
    .gte('collected_at', new Date(Date.now() - 20 * 86400_000).toISOString())
  if ((count ?? 0) > 0) return { instagram: [], creditos: 0, aviso: null } // a rotina já leu o Instagram com os conectores
  const { data: set } = await db.from('ai_settings').select('*').maybeSingle()
  const cap = Number((set as Record<string, unknown> | null)?.firecrawl_credits_per_client ?? 100)
  const { data: c } = await db.from('clients').select('instagram').eq('id', job.client_id).maybeSingle()
  const { data: soc } = await db.from('social_accounts').select('network, handle').eq('client_id', job.client_id)
  const { data: links } = await db.from('client_links').select('url').eq('client_id', job.client_id)
  const mine = igHandle(c?.instagram) ?? ((soc ?? []) as { network: string; handle: string }[]).filter((s) => /insta/i.test(s.network)).map((s) => igHandle(s.handle)).find(Boolean)
    ?? ((links ?? []) as { url: string }[]).map((l) => (/instagram\.com/.test(l.url) ? igHandle(l.url) : null)).find(Boolean) ?? handlesIn(research.parts?.redes?.notes ?? '')[0] ?? null
  const rivals = handlesIn(research.parts?.concorrentes?.notes ?? '').filter((h) => h !== mine).slice(0, 3)
  const out: Coleta = { instagram: [], creditos: 0, aviso: null }
  if (!mine && !rivals.length) { out.aviso = 'Instagram não lido: perfil não encontrado.'; return out }
  const stop = (e: FcResult['error']) => { out.aviso = e === 'sem_creditos' ? 'Instagram não lido: créditos do Firecrawl esgotados.' : e === 'sem_chave' ? 'Instagram não lido: falta a chave do Firecrawl.' : 'Instagram não lido: o Firecrawl deu erro.' }
  const targets = [...(mine ? [{ h: mine, me: true }] : []), ...rivals.map((h) => ({ h, me: false }))]
  for (const t of targets) {
    if (out.creditos + 2 > cap) { out.aviso = out.aviso ?? `Coleta parou no teto de ${cap} créditos.`; break }
    const r = await firecrawl('instagram/user-posts', { handle: t.h, trim: true })
    out.creditos += r.credits
    if (r.error) { if (r.error !== 'erro') { stop(r.error); break } if (t.me) stop(r.error); continue }
    const sum = summarizePosts(t.h, r.data ?? {}) as Record<string, unknown>
    sum.de = t.me ? 'cliente' : 'concorrente'
    // Voz do cliente: comentários dos 2 posts que mais engajaram (só o texto, sem nome).
    if (t.me && out.creditos + 4 <= cap) {
      const top = ((sum.posts as { link: string | null; curtidas: number | null; comentarios: number | null }[]) ?? []).filter((p) => p.link && (p.comentarios ?? 0) > 0).sort((a, b) => (b.comentarios ?? 0) - (a.comentarios ?? 0)).slice(0, 2)
      const comments: string[] = []
      for (const p of top) {
        const cr = await firecrawl('instagram/post-comments', { url: p.link })
        out.creditos += cr.credits
        if (cr.error) break
        const rows = (Array.isArray(cr.data?.comments) ? cr.data!.comments : Array.isArray(cr.data?.items) ? cr.data!.items : Array.isArray(cr.data?.records) ? cr.data!.records : []) as Record<string, unknown>[]
        comments.push(...rows.slice(0, 25).map((x) => hidePhones(String(x.text ?? '')).slice(0, 160)).filter(Boolean))
      }
      sum.comentarios_dos_seguidores = comments
    }
    out.instagram!.push(sum)
  }
  if (out.creditos > 0) {
    const row = { function: FN, stage: 'coleta:firecrawl', client_id: job.client_id, model: 'firecrawl', input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, web_searches: 0, usd: 0 }
    const { error } = await db.from('ai_usage_log').insert({ ...row, credits: out.creditos })
    if (error) await db.from('ai_usage_log').insert(row)
  }
  return out
}

// ───────── Etapas de escrita (saída em JSON) ─────────
let recipeCache: string | null = null
async function writerPrompt(db: SupabaseClient): Promise<string> {
  if (recipeCache) return recipeCache
  const { data } = await db.from('strategy_frameworks').select('slug, name, objective, when_to_use, questions').in('slug', RECIPE_SLUGS)
  const defs = ((data ?? []) as FrameworkDef[]).sort((a, b) => RECIPE_SLUGS.indexOf(a.slug) - RECIPE_SLUGS.indexOf(b.slug))
  recipeCache = writerSystem(defs)
  return recipeCache
}

// Base de conhecimento (system) e o contexto do cliente (1º bloco) ficam em cache: as etapas seguintes leem a US$ 0,20/milhão.
async function write(db: SupabaseClient, ai: Anthropic, job: Job, stage: WriteStage, extra: string, effort: Effort = 'high'): Promise<Record<string, unknown>> {
  const system = await writerPrompt(db)
  const context = `DADOS DO CLIENTE E FONTES INTERNAS\n${await clientContext(db, job)}\n\nPESQUISA PÚBLICA (com fontes)\n${job.research?.notes ?? researchNotes(job.research) ?? 'sem pesquisa'}`
  const msg = await streamCall(ai, {
    model: MODEL, max_tokens: 32000,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: job.attempts >= 2 ? 'medium' : effort, format: { type: 'json_schema', schema: SCHEMAS[stage] as Record<string, unknown> } },
    messages: [{ role: 'user', content: [
      { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `${STAGE_TASK[stage]}${extra ? `\n\n${extra}` : ''}` },
    ] }],
  }, { db, job, stage })
  await logUsage(db, job, stage, msg)
  if (msg.stop_reason === 'refusal') throw new Error('refusal')
  if (msg.stop_reason === 'max_tokens') throw new Error('max_tokens')
  return JSON.parse(textOf(msg)) as Record<string, unknown>
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

// A inteligência vira também as perguntas do cliente (máx. 7, estratégicas) e a lista curta "confirmar".
function intelDoc(i: Record<string, unknown>): Record<string, unknown> {
  const qs = (Array.isArray(i.perguntas) ? i.perguntas : []) as { pergunta?: string; por_que?: string; muda_o_que?: string }[]
  return {
    inteligencia: i,
    do_cliente: qs.slice(0, 7).map((q) => ({ pergunta: q.pergunta, por_que: q.por_que, muda_o_que: q.muda_o_que })),
    confirmar: Array.isArray(i.confirmar) ? (i.confirmar as unknown[]).slice(0, 6) : [],
  }
}

// O cruzamento vai em 2 pedidos ao mesmo tempo (um só ficaria grande demais e lento): achados e decisões/perguntas.
// Se só um dos dois pedidos estourar o tempo, o que terminou fica guardado (research.partial) e a nova tentativa refaz só o que faltou.
async function pair(db: SupabaseClient, ai: Anthropic, job: Job, stages: [WriteStage, WriteStage], extra: string): Promise<Record<string, unknown>> {
  const key = (st: WriteStage) => `${job.stage}:${st}`
  const saved = (job.research?.partial ?? {}) as Record<string, Record<string, unknown>>
  const res = await Promise.allSettled(stages.map((st) => saved[key(st)] ? Promise.resolve(saved[key(st)]!) : write(db, ai, job, st, extra)))
  const failed = res.find((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (failed) {
    const partial = { ...saved }
    res.forEach((r, i) => { if (r.status === 'fulfilled') partial[key(stages[i]!)] = r.value })
    await db.from('consult_docs').update({ research: { ...(job.research ?? {}), partial } }).eq('id', job.id).eq('stage', job.stage)
    throw failed.reason
  }
  return Object.assign({}, ...res.map((r) => (r as PromiseFulfilledResult<Record<string, unknown>>).value))
}
const clearPartial = (job: Job) => ({ ...(job.research ?? {}), partial: {} })

async function writeIntel(db: SupabaseClient, ai: Anthropic, job: Job, extra: string): Promise<Record<string, unknown>> {
  return pair(db, ai, job, ['inteligencia', 'decisoes'], extra)
}

async function writeDiag(db: SupabaseClient, ai: Anthropic, job: Job, extra: string): Promise<Record<string, unknown>> {
  const ctx = `${prev(job, ['inteligencia'])}${extra ? `\n\n${extra}` : ''}`
  return pair(db, ai, job, ['diagnostico', 'mercado'], ctx)
}

async function stageWrite(db: SupabaseClient, ai: Anthropic, job: Job, stage: 'diagnostico' | 'comunicacao' | 'plano' | 'resumo') {
  const ok = { attempts: 0, busy_until: null, error: null }
  if (stage === 'diagnostico' && !job.research?.intel) {
    const i = await writeIntel(db, ai, job, '')
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, ...intelDoc(i) }), research: { ...clearPartial(job), intel: true }, ...ok }).eq('id', job.id).eq('stage', job.stage)
  } else if (stage === 'diagnostico') {
    const d = await writeDiag(db, ai, job, '')
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, diagnostico: d }), research: clearPartial(job), stage: 'comunicacao', ...ok }).eq('id', job.id).eq('stage', job.stage)
  } else if (stage === 'comunicacao') {
    const c = await write(db, ai, job, 'comunicacao', prev(job, ['inteligencia', 'diagnostico']))
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, comunicacao: c.comunicacao, experiencia: c.experiencia }), stage: 'plano', ...ok }).eq('id', job.id).eq('stage', job.stage)
  } else if (stage === 'plano') {
    const p = await write(db, ai, job, 'plano', prev(job, ['inteligencia', 'diagnostico', 'comunicacao', 'experiencia']))
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, plano: p }), stage: 'resumo', ...ok }).eq('id', job.id).eq('stage', job.stage)
  } else {
    const r = await write(db, ai, job, 'resumo', prev(job, ['inteligencia', 'diagnostico', 'comunicacao', 'plano']), 'medium')
    await saveResumo(db, job, r, null)
  }
}

async function saveResumo(db: SupabaseClient, job: Job, r: Record<string, unknown>, only: Section | null) {
  const doc = { ...job.doc }
  if (!only || only === 'resumo') doc.resumo = r.resumo
  if (!only || only === 'riscos') doc.riscos = r.riscos
  if (!only) doc.frameworks = r.frameworks
  doc.gerado_em = new Date().toISOString()
  await db.from('consult_docs').update({ doc: keepEdits(job, doc), stage: 'done', status: 'pronto', attempts: 0, busy_until: null, error: null, redo_section: null, finished_at: new Date().toISOString() }).eq('id', job.id).eq('stage', job.stage)
  if (!only) await saveSuggestions(db, job.client_id, (r.crm ?? {}) as Record<string, string>)
}

async function stageRedo(db: SupabaseClient, ai: Anthropic, job: Job) {
  const section = job.redo_section ?? 'resumo'
  const done = { stage: 'done', status: 'pronto', attempts: 0, busy_until: null, error: null, redo_section: null }
  const note = 'Reescreva esta parte com outro olhar: mais específica, com mais cruzamento de dados e números que a versão anterior (abaixo).'
  const at = new Date().toISOString()
  if (section === 'diagnostico') {
    const d = await writeDiag(db, ai, job, `${note}\n\n${prev(job, ['diagnostico'])}`)
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, diagnostico: d, gerado_em: at }), research: clearPartial(job), ...done }).eq('id', job.id).eq('stage', job.stage)
  } else if (section === 'do_cliente') {
    const i = await writeIntel(db, ai, job, `${note}\n\n${prev(job, ['inteligencia'])}`)
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, ...intelDoc(i), gerado_em: at }), research: clearPartial(job), ...done }).eq('id', job.id).eq('stage', job.stage)
  } else if (section === 'comunicacao') {
    const c = await write(db, ai, job, 'comunicacao', `${note}\n\n${prev(job, ['inteligencia', 'diagnostico', 'comunicacao', 'experiencia'])}`)
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, comunicacao: c.comunicacao, experiencia: c.experiencia, gerado_em: at }), ...done }).eq('id', job.id).eq('stage', job.stage)
  } else if (section === 'plano') {
    const p = await write(db, ai, job, 'plano', `${note}\n\n${prev(job, ['inteligencia', 'diagnostico', 'comunicacao', 'plano'])}`)
    await db.from('consult_docs').update({ doc: keepEdits(job, { ...job.doc, plano: p, gerado_em: at }), ...done }).eq('id', job.id).eq('stage', job.stage)
  } else {
    const r = await write(db, ai, job, 'resumo', `${note} Foque na parte "${section}"; o resto pode repetir.\n\n${prev(job, ['inteligencia', 'diagnostico', 'plano', section])}`, 'medium')
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
