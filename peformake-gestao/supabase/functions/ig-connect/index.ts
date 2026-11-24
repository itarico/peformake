// Social Media → Agendar: volta do login da Meta ("login unificado" do app PEFORMAKE-SERVIDOR).
// A Meta chama este endereço com ?code=...&state=... depois que o dono da conta autoriza.
// Troca o código pelo token (que não vence), descobre as contas do Instagram liberadas e guarda cada uma com o token no cofre.
// Segredo necessário: META_APP_SECRET (chave secreta do app, em Configurações do app → Básico). O ID do app é público.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const GRAPH = 'https://graph.facebook.com/v27.0'
const APP_ID = '1577712680824916'
const SITE_FALLBACK = 'https://peformake-gestao.vercel.app'

Deno.serve(async (request) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: base } = await db.rpc('app_base_url')
  const site = (typeof base === 'string' && base.startsWith('http') ? base : SITE_FALLBACK).replace(/\/$/, '')
  const back = (result: string, detail = '') => Response.redirect(`${site}/conteudo/agendar?instagram=${result}${detail ? `&motivo=${encodeURIComponent(detail)}` : ''}`, 302)

  const url = new URL(request.url)
  const state = url.searchParams.get('state') ?? ''
  const code = (url.searchParams.get('code') ?? '').replace(/#_$/, '')
  if (url.searchParams.get('error')) return back('recusado')
  if (!/^[0-9a-f]{64}$/.test(state) || !code) return back('erro', 'link')

  const { data: pending } = await db.rpc('ig_connect_take', { _state: state })
  if (!pending) return back('erro', 'expirou')
  const secret = Deno.env.get('META_APP_SECRET')
  if (!secret) return back('erro', 'segredo')

  try {
    const tokenRes = await fetch(`${GRAPH}/oauth/access_token?client_id=${APP_ID}&client_secret=${encodeURIComponent(secret)}&code=${encodeURIComponent(code)}`)
    const tokenData = await tokenRes.json().catch(() => ({}))
    const token = tokenData?.access_token as string | undefined
    if (!tokenRes.ok || !token) return back('erro', 'token')

    const accRes = await fetch(`${GRAPH}/me/assigned_instagram_accounts?fields=id,username&limit=50`, { headers: { Authorization: `Bearer ${token}` } })
    const accData = await accRes.json().catch(() => ({}))
    const accounts = (Array.isArray(accData?.data) ? accData.data : []) as { id: string; username: string }[]
    if (!accRes.ok || accounts.length === 0) return back('erro', 'sem-conta')

    for (const a of accounts) {
      await db.rpc('ig_account_store', { _client: pending.client_id, _by: pending.by, _ig_id: String(a.id), _username: String(a.username ?? ''), _token: token })
    }
    return back('ok')
  } catch {
    return back('erro', 'meta')
  }
})
