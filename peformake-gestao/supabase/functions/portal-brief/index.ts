// Portal do cliente → Briefing e Perguntas do mês (Italo, 20/11).
// Quem chama:
// - o cliente pelo portal (sem login, com o código do link): anexar documento do briefing, anexar arquivo/áudio à resposta, transcrever fala;
// - o cron do dia 10 (x-cron-secret): refaz as perguntas do mês seguinte pelo motor (sem IA) e deixa o aviso pronto (brief_monthly_notify).
// Nada vai ao cliente sem a chave em Configurações → Automações (consult_settings.brief_portal_whatsapp, nasce desligada).
// questionEngine.ts é cópia igual de src/features/strategy/brief/questionEngine.ts (o teste confere).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4'
import { isFamily, monthQuestions } from './questionEngine.ts'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })
const MAX_FILE = 25_000_000
const PROVIDERS: Record<string, { url: string; model: string }> = {
  groq: { url: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3-turbo' },
  openai: { url: 'https://api.openai.com/v1/audio/transcriptions', model: 'gpt-4o-mini-transcribe' },
}
const safeName = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-120)

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const secret = request.headers.get('x-cron-secret')
  if (secret) {
    const { data: ok } = await db.rpc('traffic_cron_secret_ok', { _secret: secret })
    if (!ok) return json({ error: 'Não autorizado' }, 401)
    return json(await monthly(db))
  }

  const form = await request.formData().catch(() => null)
  if (!form) return json({ error: 'Envie o formulário' }, 400)
  const token = String(form.get('token') ?? '')
  const { data: clientId, error: tokErr } = await db.rpc('portal_resolve', { _token: token })
  if (tokErr || !clientId) return json({ error: 'Este link não está ativo.' }, 401)
  const action = String(form.get('action') ?? '')
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return json({ error: 'Envie o arquivo' }, 400)

  if (action === 'transcribe') {
    const provider = PROVIDERS[Deno.env.get('TRANSCRIBE_PROVIDER') ?? 'groq']
    const key = Deno.env.get('TRANSCRIBE_API_KEY')
    if (!provider || !key) return json({ error: 'A transcrição ainda não está ligada. Escreva a resposta.' }, 409)
    if (file.size > 20_000_000) return json({ error: 'Áudio muito longo (até uns 10 minutos).' }, 413)
    const out = new FormData()
    out.append('file', file, file.name || 'audio.webm')
    out.append('model', provider.model)
    out.append('language', 'pt')
    out.append('response_format', 'json')
    const res = await fetch(provider.url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: out })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return json({ error: `Não foi possível transcrever agora (${res.status}).` }, 502)
    return json({ text: String(body.text ?? '').trim() })
  }

  if (file.size > MAX_FILE) return json({ error: 'Arquivo grande demais (até 25 MB).' }, 413)
  const type = file.type || 'application/octet-stream'
  // Limite de envios por dia neste cliente (o link não tem login).
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await db.from('client_assets').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('source', 'portal').gte('created_at', since)
  if ((count ?? 0) >= 60) return json({ error: 'Limite de arquivos de hoje atingido. Tente amanhã.' }, 429)

  if (action === 'doc') {
    const path = `${clientId}/briefing/${crypto.randomUUID()}-${safeName(file.name || 'arquivo')}`
    const up = await db.storage.from('client-assets').upload(path, file, { contentType: type, upsert: false })
    if (up.error) return json({ error: 'Não foi possível guardar o arquivo. Tente de novo.' }, 500)
    const { error } = await db.from('client_assets').insert({ client_id: clientId, folder: 'briefing', name: (file.name || 'Arquivo').slice(0, 160), bucket: 'client-assets', path, mime: type, size_bytes: file.size, source: 'portal' })
    if (error) return json({ error: 'Não foi possível registrar o arquivo.' }, 500)
    return json({ ok: true, name: file.name })
  }

  if (action === 'answer') {
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || (type.includes('mp4') ? 'm4a' : 'webm')
    const path = `cliente/${clientId}/${crypto.randomUUID()}.${ext}`
    const up = await db.storage.from('client-chat').upload(path, file, { contentType: type, upsert: false })
    if (up.error) return json({ error: 'Não foi possível guardar o arquivo. Tente de novo.' }, 500)
    return json({ path, name: (file.name || `arquivo.${ext}`).slice(0, 120), type })
  }
  return json({ error: 'Ação desconhecida' }, 400)
})

const pad = (n: number) => String(n).padStart(2, '0')

/** Dia 10: perguntas do mês seguinte de cada cliente da Consultoria (ou com área ativa), pelo motor, e o aviso pronto. */
async function monthly(db: SupabaseClient) {
  const now = new Date(Date.now() - 3 * 3_600_000)
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const month = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01`
  const focus = month.slice(0, 7)
  const { data: list } = await db.rpc('brief_monthly_clients')
  const out: Record<string, string> = {}
  for (const c of (list ?? []) as { id: string; name: string; segment: string | null; description: string | null }[]) {
    try {
      const [br, bm, hist, dg] = await Promise.all([
        db.from('client_briefs').select('data').eq('client_id', c.id).maybeSingle(),
        db.from('client_brief_months').select('data').eq('client_id', c.id).eq('month', month).maybeSingle(),
        db.from('client_questions').select('question, status, focus, pack').eq('client_id', c.id).in('status', ['enviada', 'respondida']),
        db.from('consult_docs').select('do_cliente:doc->do_cliente').eq('client_id', c.id).maybeSingle(),
      ])
      const f = (br.data?.data ?? {}) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
      const qs = monthQuestions({
        clientId: c.id, name: c.name ?? '', segment: c.segment, description: c.description, month,
        family: isFamily(f.tipo) ? f.tipo : null,
        products: f.produtos, competitors: f.concorrentes, noCompetitors: f.sem_concorrentes, publico: f.publico, meta: (bm.data?.data as { meta?: string } | undefined)?.meta,
        asked: ((hist.data ?? []) as { question: string; focus: string | null; pack: string | null }[]).filter((x) => !(x.pack === 'briefing_mes' && x.focus === focus)).map((x) => x.question),
        diagQuestions: Array.isArray((dg.data as { do_cliente?: unknown } | null)?.do_cliente) ? (dg.data as { do_cliente: unknown[] }).do_cliente as never : [],
      })
      // Perguntas escritas pelo agente do Claude (rotina do dia 8, source 'agente'): o motor é só reserva e não troca o pacote.
      const ag = await db.from('client_questions').select('id').eq('client_id', c.id).eq('pack', 'briefing_mes').eq('focus', focus).eq('source', 'agente').neq('status', 'descartada').limit(1)
      if (!(ag.data ?? []).length) {
        const put = await db.rpc('brief_questions_put', { _client: c.id, _month: month, _qs: qs })
        if (put.error) { out[c.id] = `erro: ${put.error.message}`; continue }
      }
      const n = await db.rpc('brief_monthly_notify', { _client: c.id, _month: month })
      out[c.id] = String(n.data ?? n.error?.message ?? '')
    } catch (e) { out[c.id] = `erro: ${(e as Error).message}` }
  }
  return { month, clients: Object.keys(out).length, result: out }
}
