// Upload de arquivos feitos pelo agente do Claude (estratégias, relatórios) para a pasta do cliente.
// Autorização: token de uso curto criado no banco (agent_upload_tokens) por quem tem acesso ao SQL; nunca uma chave fixa.
import { createClient } from 'npm:@supabase/supabase-js@2'

const FOLDERS = ['estrategia', 'relatorios', 'design', 'trafego', 'audiovisual', 'social', 'contratos', 'outros']
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const b = await req.json().catch(() => null) as { token?: string; client_id?: string; folder?: string; name?: string; file?: string; mime?: string; replace?: boolean } | null
  if (!b?.token || !b.client_id || !b.name || !b.file) return json({ error: 'Faltam campos' }, 400)
  const { data: t } = await db.from('agent_upload_tokens').select('token, expires_at, uses').eq('token', b.token).maybeSingle()
  if (!t || new Date(t.expires_at) < new Date() || t.uses >= 50) return json({ error: 'Token inválido' }, 401)
  const folder = FOLDERS.includes(String(b.folder)) ? String(b.folder) : 'outros'
  const { data: c } = await db.from('clients').select('id').eq('id', b.client_id).maybeSingle()
  if (!c) return json({ error: 'Cliente não encontrado' }, 404)
  const bytes = Uint8Array.from(atob(b.file), (ch) => ch.charCodeAt(0))
  if (bytes.length > 50 * 1024 * 1024) return json({ error: 'Arquivo grande demais' }, 413)
  const mime = b.mime || 'application/pdf'
  const safe = b.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120)
  const path = `${b.client_id}/${folder}/${safe}`
  const up = await db.storage.from('client-assets').upload(path, bytes, { contentType: mime, upsert: true })
  if (up.error) return json({ error: up.error.message }, 500)
  await db.from('agent_upload_tokens').update({ uses: t.uses + 1 }).eq('token', b.token)
  const { data: row, error } = await db.from('client_assets').upsert({ client_id: b.client_id, folder, name: b.name.slice(0, 200), bucket: 'client-assets', path, mime, size_bytes: bytes.length, source: 'agente' }, { onConflict: 'bucket,path' }).select('id').single()
  if (error) return json({ error: error.message }, 500)
  return json({ ok: true, id: row.id, path })
})
