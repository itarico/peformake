// Capa das referências SÓ para o PDF (Italo, 17/11): na hora de gerar, busca a imagem de cada link e devolve
// a imagem embutida (data URI). Nada fica guardado à parte. Nas telas o post toca direto na moldura (embedOf).
// ATENÇÃO: este arquivo é copiado igual para supabase/functions/ref-thumb/refThumbs.ts (teste confere). Sem imports aqui.

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<Response>

const FB_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
const MAX_IMG = 2_500_000
export const MAX_LINKS = 24

/** Só http(s) público: nada de localhost, IP ou rede interna. */
export function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`)
    if (!/^https?:$/.test(u.protocol)) return null
    const h = u.hostname.toLowerCase()
    if (!h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^[\d.]+$/.test(h) || h.includes(':')) return null
    return u
  } catch { return null }
}

/** A imagem que o próprio link "diz" ser a capa (og:image / twitter:image). */
export function ogImage(html: string, base: string): string | null {
  const m = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["']/i.exec(html)
    ?? /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i.exec(html)
  if (!m?.[1]) return null
  const v = m[1].replace(/&amp;/g, '&')
  try { return new URL(v, base).toString() } catch { return null }
}

const timeout = (ms: number) => AbortSignal.timeout(ms)

async function oembed(f: FetchLike, endpoint: string): Promise<string | null> {
  const r = await f(endpoint, { signal: timeout(8000) }).catch(() => null)
  if (!r?.ok) return null
  const j = await r.json().catch(() => null) as { thumbnail_url?: string } | null
  return j?.thumbnail_url ?? null
}

/** Endereço da capa de um link (sem baixar). YouTube, TikTok, Vimeo, Pinterest, depois og:image; por último, print (Firecrawl). */
export async function thumbUrlOf(link: string, f: FetchLike, firecrawlKey?: string | null): Promise<string | null> {
  const u = safeUrl(link)
  if (!u) return null
  const s = u.toString()
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(s)?.[1]
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`
  const e = encodeURIComponent(s)
  if (/tiktok\.com/i.test(u.hostname)) { const t = await oembed(f, `https://www.tiktok.com/oembed?url=${e}`); if (t) return t }
  if (/vimeo\.com/i.test(u.hostname)) { const t = await oembed(f, `https://vimeo.com/api/oembed.json?url=${e}`); if (t) return t }
  if (/pinterest\.|pin\.it/i.test(u.hostname)) {
    // Pin com nome antes do número ("pizza--2244…") vira só o número; a capa vem pequena (236x) e pedimos a grande (736x).
    const id = /\/pin\/(?:[\w-]*--)?(\d+)/.exec(u.pathname)?.[1]
    const t = await oembed(f, `https://www.pinterest.com/oembed.json?url=${id ? encodeURIComponent(`https://www.pinterest.com/pin/${id}/`) : e}`)
    if (t) return t.replace(/\/(?:236x|474x|170x)\//, '/736x/')
  }
  const page = await f(s, { headers: { 'user-agent': FB_UA, accept: 'text/html' }, signal: timeout(10000) }).catch(() => null)
  if (page?.ok && (page.headers.get('content-type') ?? '').includes('html')) {
    const og = ogImage((await page.text().catch(() => '')).slice(0, 400_000), s)
    if (og) return og
  }
  if (firecrawlKey) {
    const r = await f('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST', headers: { authorization: `Bearer ${firecrawlKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ url: s, formats: ['screenshot'], onlyMainContent: true }), signal: timeout(45000),
    }).catch(() => null)
    const j = r?.ok ? await r.json().catch(() => null) as { data?: { screenshot?: string } } | null : null
    if (j?.data?.screenshot) return j.data.screenshot
  }
  return null
}

function b64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Baixa a imagem e devolve embutida (data URI). Só imagem, até 2,5 MB. */
export async function imageData(src: string, f: FetchLike): Promise<string | null> {
  if (src.startsWith('data:image/')) return src
  if (!safeUrl(src)) return null
  const r = await f(src, { headers: { 'user-agent': FB_UA }, signal: timeout(12000) }).catch(() => null)
  const type = (r?.headers.get('content-type') ?? '').split(';')[0]!.trim()
  if (!r?.ok || !type.startsWith('image/')) return null
  const buf = new Uint8Array(await r.arrayBuffer())
  if (!buf.length || buf.length > MAX_IMG) return null
  return `data:${type};base64,${b64(buf)}`
}

/** Várias referências de uma vez (4 em paralelo). Devolve { link: imagem } só das que deram certo. */
export async function fetchThumbs(links: string[], f: FetchLike, firecrawlKey?: string | null): Promise<Record<string, string>> {
  const todo = [...new Set(links.map((l) => l.trim()).filter(Boolean))].slice(0, MAX_LINKS)
  const out: Record<string, string> = {}
  let i = 0
  const worker = async () => {
    while (i < todo.length) {
      const link = todo[i++]!
      const src = await thumbUrlOf(link, f, firecrawlKey).catch(() => null)
      const data = src ? await imageData(src, f).catch(() => null) : null
      if (data) out[link] = data
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return out
}
