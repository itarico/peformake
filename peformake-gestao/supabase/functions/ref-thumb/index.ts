// Capas das referências para o PDF da estratégia (Italo, 17/11: "capa só no PDF").
// POST { links: string[] } com login da equipe → { thumbs: { link: data URI } }. Nada é guardado.
// Fontes: YouTube, TikTok, Vimeo, Pinterest (oEmbed), og:image (Instagram e sites); sem nada, print do Firecrawl (se houver a chave).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { fetchThumbs, MAX_LINKS } from './refThumbs.ts'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const auth = req.headers.get('authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { authorization: auth } }, auth: { persistSession: false } })
  const { data: u } = await sb.auth.getUser()
  if (!u?.user) return json({ error: 'Entre no sistema.' }, 401)
  const body = await req.json().catch(() => ({})) as { links?: unknown }
  const links = (Array.isArray(body.links) ? body.links : []).map(String).filter((l) => l.length < 600).slice(0, MAX_LINKS)
  if (!links.length) return json({ thumbs: {} })
  try {
    const thumbs = await fetchThumbs(links, fetch, Deno.env.get('FIRECRAWL_API_KEY'))
    return json({ thumbs })
  } catch (e) {
    console.error('ref-thumb', String((e as Error)?.message ?? e).slice(0, 200))
    return json({ thumbs: {} })
  }
})
