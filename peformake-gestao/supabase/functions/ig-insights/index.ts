// Social Media → cliente → Desempenho (pedido do Italo, 24/11/2026). Busca na Meta os números do Instagram do cliente:
// conta nos últimos 30 dias e nos 30 anteriores (para a variação %), alcance e seguidores novos por dia e os posts
// recentes com alcance, visualizações, salvamentos e compartilhamentos. Guarda a cópia em ig_insights (a tela lê de lá).
// Quem chama precisa estar logado e poder planejar conteúdo. O token fica no cofre e nunca vai para o navegador.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const GRAPH = 'https://graph.facebook.com/v27.0'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })
const TOTALS = ['reach', 'views', 'accounts_engaged', 'total_interactions', 'likes', 'comments', 'shares', 'saves', 'profile_links_taps']
const DAY = 86400

async function graph(token: string, path: string, params: Record<string, string> = {}) {
  const res = await fetch(`${GRAPH}/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.error) throw Object.assign(new Error(String(data?.error?.message ?? `HTTP ${res.status}`)), { code: Number(data?.error?.code) })
  return data
}

async function totals(token: string, ig: string, since: number, until: number) {
  const r = await graph(token, `${ig}/insights`, { metric: TOTALS.join(','), period: 'day', metric_type: 'total_value', since: String(since), until: String(until) })
  const out: Record<string, number> = {}
  for (const m of r.data ?? []) out[m.name] = Number(m.total_value?.value ?? 0)
  return out
}

interface Media { id: string; media_type: string; media_product_type?: string; timestamp: string; permalink?: string; thumbnail_url?: string; media_url?: string; like_count?: number; comments_count?: number; caption?: string }

async function mediaStats(token: string, m: Media) {
  const tries = [['reach', 'views', 'saved', 'shares', 'total_interactions'], ['reach', 'saved', 'shares', 'total_interactions'], ['reach']]
  for (const metric of tries) {
    try {
      const r = await graph(token, `${m.id}/insights`, { metric: metric.join(',') })
      const out: Record<string, number> = {}
      for (const x of r.data ?? []) out[x.name] = Number(x.values?.[0]?.value ?? x.total_value?.value ?? 0)
      return out
    } catch { /* métrica que esse tipo de post não tem: tenta com menos */ }
  }
  return {}
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } })
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  // Rotina interna (pg_cron, testes): segredo das rotinas. Pessoa: logada e com permissão de planejar conteúdo.
  const cron = request.headers.get('x-cron-secret')
  const allowed = cron ? (await db.rpc('traffic_cron_secret_ok', { _secret: cron })).data === true : (await user.rpc('can_plan_content')).data === true
  if (!allowed) return json({ error: 'Sem permissão' }, 403)

  const { client_id: clientId } = await request.json().catch(() => ({}))
  if (typeof clientId !== 'string') return json({ error: 'Cliente inválido' }, 400)
  const { data: rows } = await db.rpc('ig_insights_account', { _client: clientId })
  const acc = (rows ?? [])[0] as { account_id: string; ig_id: string; username: string; token: string } | undefined
  if (!acc) return json({ error: 'Este cliente não tem Instagram conectado. Conecte em Agendar.' }, 404)

  try {
    const now = Math.floor(Date.now() / 1000)
    const [profile, cur, prev, series, list] = await Promise.all([
      graph(acc.token, acc.ig_id, { fields: 'username,followers_count,media_count,profile_picture_url' }),
      totals(acc.token, acc.ig_id, now - 30 * DAY + 60, now),
      totals(acc.token, acc.ig_id, now - 60 * DAY + 60, now - 30 * DAY),
      graph(acc.token, `${acc.ig_id}/insights`, { metric: 'reach,follower_count', period: 'day', since: String(now - 29 * DAY), until: String(now) }),
      graph(acc.token, `${acc.ig_id}/media`, { fields: 'id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count', limit: '24' }),
    ])
    const days = new Map<string, { d: string; reach: number; followers: number }>()
    for (const m of series.data ?? []) {
      for (const v of m.values ?? []) {
        // end_time é o fim do dia no fuso da Meta: o dia medido é o anterior.
        const d = new Date(new Date(v.end_time).getTime() - DAY * 1000).toISOString().slice(0, 10)
        const row = days.get(d) ?? { d, reach: 0, followers: 0 }
        if (m.name === 'reach') row.reach = Number(v.value ?? 0); else row.followers = Number(v.value ?? 0)
        days.set(d, row)
      }
    }
    const daily = [...days.values()].sort((a, b) => a.d.localeCompare(b.d))
    cur.new_followers = daily.reduce((s, r) => s + r.followers, 0)
    const media = await Promise.all(((list.data ?? []) as Media[]).map(async (m) => ({
      id: m.id, type: m.media_product_type === 'REELS' ? 'reels' : m.media_type === 'CAROUSEL_ALBUM' ? 'carrossel' : m.media_type === 'VIDEO' ? 'video' : 'foto',
      at: m.timestamp, permalink: m.permalink ?? null, thumb: m.thumbnail_url ?? (m.media_type === 'VIDEO' ? null : m.media_url ?? null),
      caption: (m.caption ?? '').slice(0, 140), likes: m.like_count ?? 0, comments: m.comments_count ?? 0, ...(await mediaStats(acc.token, m)),
    })))
    const data = {
      username: profile.username ?? acc.username, followers: profile.followers_count ?? null, posts: profile.media_count ?? null,
      picture: profile.profile_picture_url ?? null, cur, prev, daily, media,
    }
    await db.rpc('ig_insights_save', { _account: acc.account_id, _data: data })
    return json({ ok: true })
  } catch (e) {
    const err = e as Error & { code?: number }
    const message = err.code === 190 ? 'O Instagram desconectou. Conecte a conta de novo em Agendar.'
      : err.code === 10 || /permission/i.test(err.message) ? 'Falta a permissão de insights. Conecte a conta de novo em Agendar.'
      : `A Meta não respondeu: ${err.message}`.slice(0, 240)
    return json({ error: message }, 502)
  }
})
