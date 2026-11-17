// Texto de uma página (cardápio, catálogo, site) para o briefing ler a lista de produtos SEM IA (Italo, 17/11).
// POST { url } com login da equipe → { lines: string[] }. Páginas montadas por JavaScript (iFood etc.): usa o Firecrawl
// se houver o segredo FIRECRAWL_API_KEY. Nada é guardado.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const PRICE = /R\$\s*\d|\d+,\d{2}/

function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`)
    const h = u.hostname.toLowerCase()
    if (!/^https?:$/.test(u.protocol) || !h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^[\d.]+$/.test(h) || h.includes(':')) return null
    return u
  } catch { return null }
}

/** HTML → linhas de texto (cada bloco vira uma linha; preço colado no nome fica na mesma linha). */
function htmlLines(html: string): string[] {
  const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d|\/section|\/article|\/a)\b[^>]*>/gi, '\n').replace(/<\/t[dh]>/gi, '  ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#36;|&dollar;/g, '$').replace(/&[a-z]+;|&#\d+;/gi, ' ')
  return t.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 1 && l.length < 300)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { authorization: req.headers.get('authorization') ?? '' } }, auth: { persistSession: false } })
  const { data: u } = await sb.auth.getUser()
  if (!u?.user) return json({ error: 'Entre no sistema.' }, 401)
  const body = await req.json().catch(() => ({})) as { url?: string }
  const url = safeUrl(String(body.url ?? ''))
  if (!url) return json({ error: 'Link inválido.' }, 400)
  let lines: string[] = []
  const r = await fetch(url.toString(), { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(15000) }).catch(() => null)
  if (r?.ok && (r.headers.get('content-type') ?? '').includes('html')) lines = htmlLines((await r.text()).slice(0, 3_000_000))
  // Pouco preço no HTML puro (página montada por JavaScript): tenta o Firecrawl.
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (key && lines.filter((l) => PRICE.test(l)).length < 3) {
    const f = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ url: url.toString(), formats: ['markdown'], onlyMainContent: true, waitFor: 2500 }), signal: AbortSignal.timeout(60000),
    }).catch(() => null)
    const j = f?.ok ? await f.json().catch(() => null) as { data?: { markdown?: string } } | null : null
    const md = j?.data?.markdown
    if (md) lines = md.split('\n').map((l) => l.replace(/!\[[^\]]*\]\([^)]*\)|\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^[#>*\-\s|]+|[*_`|]+/g, ' ').replace(/\s+/g, ' ').trim()).filter((l) => l.length > 1 && l.length < 300)
  }
  if (!lines.length) return json({ error: 'Não consegui ler esta página. Tente o PDF ou cole a lista.' }, 422)
  return json({ lines: lines.slice(0, 4000) })
})
