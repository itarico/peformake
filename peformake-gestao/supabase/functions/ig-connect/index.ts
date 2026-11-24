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

  // Motivo do erro guardado no pedido (texto da Meta, nunca o token), para saber por que a conexão falhou.
  const note = async (why: string) => { await db.from('ig_connect_states').update({ error: why.slice(0, 900) }).eq('state', state) }
  const meta = (d: any) => String(d?.error?.message ?? JSON.stringify(d ?? {})).slice(0, 600)
  const { data: pending } = await db.rpc('ig_connect_take', { _state: state })
  if (!pending) return back('erro', 'expirou')
  const secret = Deno.env.get('META_APP_SECRET')
  if (!secret) return back('erro', 'segredo')

  try {
    // A Meta exige o mesmo redirect_uri do login (igLoginUrl em scheduleRules.ts), senão recusa o código.
    const redirect = `${Deno.env.get('SUPABASE_URL')!.replace(/\/$/, '')}/functions/v1/ig-connect`
    const tokenRes = await fetch(`${GRAPH}/oauth/access_token?client_id=${APP_ID}&client_secret=${encodeURIComponent(secret)}&redirect_uri=${encodeURIComponent(redirect)}&code=${encodeURIComponent(code)}`)
    const tokenData = await tokenRes.json().catch(() => ({}))
    const token = tokenData?.access_token as string | undefined
    if (!tokenRes.ok || !token) { await note('token: ' + meta(tokenData)); return back('erro', 'token') }

    const accRes = await fetch(`${GRAPH}/me/assigned_instagram_accounts?fields=id,username&limit=50`, { headers: { Authorization: `Bearer ${token}` } })
    const accData = await accRes.json().catch(() => ({}))
    let accounts = (Array.isArray(accData?.data) ? accData.data : []) as { id: string; username: string }[]
    let why = accRes.ok ? 'nenhuma conta liberada' : meta(accData)
    if (accounts.length === 0) {
      // Login com páginas (Facebook Login for Business sem contas atribuídas): o Instagram vem pela página do Facebook.
      const pgRes = await fetch(`${GRAPH}/me/accounts?fields=instagram_business_account{id,username}&limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      const pgData = await pgRes.json().catch(() => ({}))
      accounts = (Array.isArray(pgData?.data) ? pgData.data : [])
        .map((p: any) => p?.instagram_business_account).filter((a: any) => a?.id)
        .map((a: any) => ({ id: String(a.id), username: String(a.username ?? '') }))
      if (accounts.length === 0) why += ' | paginas: ' + (pgRes.ok ? 'nenhuma pagina com Instagram' : meta(pgData))
    }
    if (accounts.length === 0) { await note('sem-conta: ' + why); return back('erro', 'sem-conta') }

    for (const a of accounts) {
      const { error: storeError } = await db.rpc('ig_account_store', { _client: pending.client_id, _by: pending.by, _ig_id: String(a.id), _username: String(a.username ?? ''), _token: token })
      if (storeError) { await note('gravar: ' + storeError.message); return back('erro', 'meta') }
    }
    return back('ok')
  } catch (e) {
    await note('meta: ' + String((e as Error)?.message ?? e))
    return back('erro', 'meta')
  }
})
