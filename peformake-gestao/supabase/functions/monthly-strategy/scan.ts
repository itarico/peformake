// Varredura de tendências do nicho (TikTok, Reels, hashtags, perfis, Biblioteca de Anúncios) pelo Firecrawl (Alexandria).
// Cada busca fica guardada por mês em trend_cache: clientes do mesmo nicho/praça reaproveitam (sem pagar de novo).
// Sem chave, sem crédito ou com erro: segue sem quebrar, com aviso; a pesquisa na web completa.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4'

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type FcError = 'sem_chave' | 'sem_creditos' | 'erro'
type FcResult = { data?: Row; credits: number; error?: FcError }

async function firecrawl(provider: string, capability: string, options: Record<string, unknown>): Promise<FcResult> {
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) return { credits: 0, error: 'sem_chave' }
  try {
    const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST', signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'x-request-id': crypto.randomUUID() },
      body: JSON.stringify({ alexandria: { provider, capability, options } }),
    })
    const j = await r.json().catch(() => ({})) as Row
    if (r.status === 402 || /insufficient|credit/i.test(String(j.error ?? ''))) { console.error('firecrawl sem credito', capability, r.status, JSON.stringify(j).slice(0, 300)); return { credits: 0, error: 'sem_creditos' } }
    if (!r.ok) { console.error('firecrawl', capability, r.status, JSON.stringify(j).slice(0, 300)); return { credits: 0, error: 'erro' } }
    const a = (j.data?.alexandria ?? [])[0] ?? {}
    const credits = Number(j.data?.creditsCost ?? j.creditsUsed ?? 2)
    if (a.error) { console.error('firecrawl cap', capability, JSON.stringify(a.error).slice(0, 300)); return { credits, error: /credit/i.test(JSON.stringify(a.error)) ? 'sem_creditos' : 'erro' } }
    return { data: (a.data ?? a) as Row, credits }
  } catch (e) { console.error('firecrawl fetch', capability, String(e).slice(0, 200)); return { credits: 0, error: 'erro' } }
}

const cut = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const day = (v: unknown) => { const t = typeof v === 'number' ? v * 1000 : Date.parse(String(v ?? '')); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null }
const tagsIn = (t: string) => [...new Set((t.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((x) => x.toLowerCase()))].slice(0, 8)

function sumTikTok(d: Row) {
  const list = (Array.isArray(d.search_item_list) ? d.search_item_list : []) as Row[]
  return list.map((v) => ({
    link: v.url ?? null, autor: v.author?.unique_id ? `@${v.author.unique_id}` : null, seguidores_autor: v.author?.follower_count ?? null,
    data: day(v.create_time ?? v.create_time_utc), views: v.statistics?.play_count ?? null, curtidas: v.statistics?.digg_count ?? null,
    comentarios: v.statistics?.comment_count ?? null, compartilhamentos: v.statistics?.share_count ?? null, salvos: v.statistics?.collect_count ?? null,
    audio: v.music?.title ? `${cut(v.music.title, 60)} (${cut(v.music.author ?? v.music.owner_nickname, 40)})` : v.added_sound_music_info?.title ? cut(v.added_sound_music_info.title, 60) : null,
    duracao_s: v.video?.duration ? Math.round(Number(v.video.duration) / (Number(v.video.duration) > 1000 ? 1000 : 1)) : null,
    anuncio: !!v.is_ad, texto: cut(v.desc, 220), hashtags: tagsIn(String(v.desc ?? '')),
  })).sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0)).slice(0, 12)
}
function sumInsta(list: Row[]) {
  return list.map((p) => ({
    link: p.url ?? (p.shortcode ? `https://www.instagram.com/reel/${p.shortcode}/` : null), autor: p.owner?.username ? `@${p.owner.username}` : null,
    data: day(p.taken_at), views: p.video_view_count ?? p.video_play_count ?? p.play_count ?? null, curtidas: p.like_count ?? null, comentarios: p.comment_count ?? null,
    audio: p.clips_music_attribution_info?.song_name ? `${cut(p.clips_music_attribution_info.song_name, 60)}${p.clips_music_attribution_info.uses_original_audio ? ' (áudio original)' : ` (${cut(p.clips_music_attribution_info.artist_name, 40)})`}` : null,
    duracao_s: p.video_duration ? Math.round(Number(p.video_duration)) : null, publi: !!p.is_paid_partnership,
    texto: cut(p.caption, 220), hashtags: tagsIn(String(p.caption ?? '')),
  })).sort((a, b) => (Number(b.views) || Number(b.curtidas) || 0) - (Number(a.views) || Number(a.curtidas) || 0)).slice(0, 10)
}
function sumProfile(handle: string, d: Row) {
  const items = (Array.isArray(d.items) ? d.items : Array.isArray(d.records) ? d.records : []) as Row[]
  const u = (d.user ?? items[0]?.user ?? items[0]?.owner ?? {}) as Row
  const posts = items.slice(0, 12).map((p) => ({
    data: p.taken_at ? day(Number(p.taken_at)) : null,
    tipo: p.product_type === 'clips' ? 'reel' : p.media_type === 8 ? 'carrossel' : p.media_type === 2 ? 'vídeo' : 'foto',
    curtidas: p.like_count ?? null, comentarios: p.comment_count ?? null, views: p.play_count ?? p.ig_play_count ?? null,
    texto: cut(p.caption?.text ?? p.caption, 160), link: p.code ? `https://www.instagram.com/p/${p.code}/` : p.url ?? null,
  }))
  return { perfil: `@${handle}`, seguidores: u.follower_count ?? u.edge_followed_by?.count ?? null, posts }
}
function sumAds(d: Row) {
  const res = (Array.isArray(d.results) ? d.results : []) as unknown[]
  const flat = res.flatMap((x) => (Array.isArray(x) ? x : [x])) as Row[]
  const now = Date.now()
  return flat.slice(0, 25).map((a) => {
    const start = Number(a.start_date ?? a.startDate ?? 0) * (Number(a.start_date ?? 0) > 1e11 ? 1 : 1000)
    return {
      pagina: a.page_name ?? a.snapshot?.page_name ?? null, ativo: a.is_active ?? null,
      dias_no_ar: start ? Math.max(0, Math.round((now - start) / 86400_000)) : null,
      texto: cut(a.snapshot?.body?.text ?? a.snapshot?.body ?? a.snapshot?.caption, 220), titulo: cut(a.snapshot?.title, 80), cta: a.snapshot?.cta_text ?? null,
      link: a.ad_archive_id ? `https://www.facebook.com/ads/library/?id=${a.ad_archive_id}` : null,
    }
  })
}

/** Busca com cache do mês (chave: capacidade + texto da busca). */
async function cached(db: SupabaseClient, provider: string, cap: string, query: string, month: string, options: Record<string, unknown>, budget: { left: number; used: number; aviso: string | null }) {
  const q = query.trim().toLowerCase()
  const { data: hit } = await db.from('trend_cache').select('data').eq('capability', cap).eq('query', q).eq('month', month).maybeSingle()
  if (hit) return { data: hit.data as Row, cached: true }
  if (budget.left <= 0) { budget.aviso = budget.aviso ?? 'Varredura parou no teto de créditos do Firecrawl.'; return null }
  const r = await firecrawl(provider, cap, options)
  budget.used += r.credits; budget.left -= Math.max(2, r.credits)
  if (r.error) {
    budget.aviso = r.error === 'sem_creditos' ? 'Varredura incompleta: créditos do Firecrawl esgotados.' : r.error === 'sem_chave' ? 'Varredura não feita: falta a chave do Firecrawl.' : budget.aviso ?? 'Parte da varredura deu erro no Firecrawl.'
    if (r.error !== 'erro') budget.left = 0
    return null
  }
  await db.from('trend_cache').upsert({ capability: cap, query: q, month, data: r.data ?? {}, credits: r.credits }, { onConflict: 'capability,query,month' })
  return { data: r.data ?? {}, cached: false }
}

export interface Scan { tiktok: Row[]; reels: Row[]; hashtags: Row[]; perfis: Row[]; anuncios: Row[]; creditos: number; aviso: string | null }

export async function trendScan(db: SupabaseClient, month: string, q: { tiktok: string[]; reels: string[]; hashtags: string[]; anuncios: string[] }, handles: string[], adsCollected: boolean, cap: number): Promise<Scan> {
  const budget = { left: cap, used: 0, aviso: null as string | null }
  const out: Scan = { tiktok: [], reels: [], hashtags: [], perfis: [], anuncios: [], creditos: 0, aviso: null }
  // Raw (não "trim") no TikTok: o áudio só vem na resposta completa.
  const jobs: Promise<void>[] = [
    ...q.tiktok.slice(0, 2).map(async (t) => { const r = await cached(db, 'scrapecreators', 'tiktok/search-videos', t, month, { query: t, date_posted: 'this-month', region: 'BR' }, budget); if (r) out.tiktok.push({ busca: t, videos: sumTikTok(r.data) }) }),
    ...q.reels.slice(0, 2).map(async (t) => { const r = await cached(db, 'scrapecreators', 'instagram/search-reels', t, month, { query: t, date_posted: 'last-month' }, budget); if (r) out.reels.push({ busca: t, reels: sumInsta((r.data.reels ?? []) as Row[]) }) }),
    ...q.hashtags.slice(0, 2).map(async (t) => { const h = t.replace(/^#/, ''); const r = await cached(db, 'scrapecreators', 'instagram/hashtag-posts', h, month, { hashtag: h, date_posted: 'last-month' }, budget); if (r) out.hashtags.push({ hashtag: `#${h}`, posts: sumInsta((r.data.posts ?? []) as Row[]) }) }),
    ...handles.slice(0, 4).map(async (h) => { const r = await cached(db, 'scrapecreators', 'instagram/user-posts', h, month, { handle: h, trim: true }, budget); if (r) out.perfis.push(sumProfile(h, r.data)) }),
    ...(adsCollected ? [] : q.anuncios.slice(0, 1).map(async (t) => { const r = await cached(db, 'adyntel', 'meta-ads/library/search', t, month, { keyword: t, country_code: 'BR' }, budget); if (r) out.anuncios.push({ busca: t, anuncios: sumAds(r.data) }) })),
  ]
  await Promise.allSettled(jobs)
  out.creditos = budget.used
  out.aviso = budget.aviso
  return out
}

export const igHandle = (v: unknown) => { const m = String(v ?? '').match(/(?:instagram\.com\/|@)([A-Za-z0-9_.]{2,30})/) ?? String(v ?? '').trim().match(/^([A-Za-z0-9_.]{2,30})$/); const h = m?.[1]?.replace(/\.$/, '').toLowerCase(); return h && !['p', 'reel', 'reels', 'explore', 'stories', 'accounts'].includes(h) ? h : null }
export function handlesIn(text: string): string[] { return [...new Set([...text.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})/g), ...text.matchAll(/(?:^|\s)@([A-Za-z0-9_.]{3,30})/g)].map((m) => igHandle(`@${m[1]}`)).filter(Boolean) as string[])] }
