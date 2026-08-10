import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-staff-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function authenticateRequest(req: Request, supabase: any): Promise<{ authenticated: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing authorization header.' }
  }

  const token = authHeader.replace('Bearer ', '')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  // Allow anon key calls only if they include a valid staff session
  // For now, verify via getClaims for Supabase Auth users
  if (token === anonKey) {
    // Anon key used — this is a frontend call, allowed since staff auth is validated client-side
    // We still need to ensure it's not a random external caller
    // Check for a custom header with staff session ID
    const staffId = req.headers.get('x-staff-id')
    if (!staffId) {
      return { authenticated: false, error: 'Staff session required.' }
    }

    const { data, error } = await supabase.rpc('verify_staff_session', { p_staff_id: staffId })
    if (error || !data || !(data as any).valid) {
      return { authenticated: false, error: 'Invalid staff session.' }
    }

    const staffRole = (data as any).staff?.role
    if (staffRole !== 'admin') {
      return { authenticated: false, error: 'Admin access required.' }
    }

    return { authenticated: true }
  }

  // Try Supabase Auth JWT
  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token)
  if (claimsError || !claimsData?.claims) {
    return { authenticated: false, error: 'Invalid authentication token.' }
  }

  const userId = claimsData.claims.sub
  // Verify user has admin or social_media role
  const { data: hasRole } = await supabase.rpc('is_staff', { _user_id: userId })
  if (!hasRole) {
    return { authenticated: false, error: 'Staff access required.' }
  }

  return { authenticated: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Clone request to read body after auth check
    const clonedReq = req.clone()

    // Authenticate all requests
    const auth = await authenticateRequest(req, supabase)
    if (!auth.authenticated) {
      return jsonResponse({ error: auth.error || 'Unauthorized' }, 401)
    }

    const body = await clonedReq.json()
    const action = body.action

    const appId = Deno.env.get('META_APP_ID')
    const appSecret = Deno.env.get('META_APP_SECRET')

    if (!appId || !appSecret) {
      return jsonResponse({ error: 'META_APP_ID ou META_APP_SECRET não configurados.' }, 500)
    }

    // ── GET AUTH URL ──
    if (action === 'get_auth_url') {
      const { redirect_uri, client_id, include_instagram_publish } = body
      if (!redirect_uri) return jsonResponse({ error: 'redirect_uri obrigatório.' }, 400)

      const state = client_id || ''
      // POLICY-COMPLIANT SCOPES:
      // Only request scopes that are approved in Meta App Review.
      // DO NOT request messaging/DM scopes (instagram_manage_messages, pages_messaging)
      // unless formally approved via App Review — this can cause account blocks.
      const scopes = [
        'ads_read',                    // Read ad account data
        'ads_management',              // Manage campaigns
        'pages_show_list',             // List pages user manages
        'pages_read_engagement',       // Read page engagement data
        'instagram_basic',             // Basic Instagram account info
        'instagram_manage_insights',   // Instagram insights/metrics
        // Only include publishing scope if the user needs Instagram scheduling
        ...(include_instagram_publish !== false ? ['instagram_content_publish'] : []),
      ].join(',')
      const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`

      return jsonResponse({ url })
    }

    // ── EXCHANGE TOKEN ──
    if (action === 'exchange_token') {
      const { code, redirect_uri } = body
      if (!code || !redirect_uri) return jsonResponse({ error: 'code e redirect_uri obrigatórios.' }, 400)

      console.log('[meta-ads-oauth] Exchanging code for token...')

      // 1. Exchange code for short-lived token
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${appSecret}&code=${code}`
      const tokenRes = await fetch(tokenUrl)
      const tokenData = await tokenRes.json()

      if (tokenData.error) {
        console.error('[meta-ads-oauth] Token exchange error:', tokenData.error)
        return jsonResponse({ error: `Erro ao trocar código: ${tokenData.error.message}` }, 400)
      }

      const shortLivedToken = tokenData.access_token

      // 2. Exchange for long-lived token
      const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
      const longLivedRes = await fetch(longLivedUrl)
      const longLivedData = await longLivedRes.json()

      if (longLivedData.error) {
        console.error('[meta-ads-oauth] Long-lived token error:', longLivedData.error)
        return jsonResponse({ error: `Erro ao gerar token de longa duração: ${longLivedData.error.message}` }, 400)
      }

      const accessToken = longLivedData.access_token
      const expiresIn = longLivedData.expires_in || 5184000 // ~60 days

      // 3. Get user info
      const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}`)
      const meData = await meRes.json()

      // 4. List ad accounts
      const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}&limit=50`)
      const accountsData = await accountsRes.json()

      if (accountsData.error) {
        console.error('[meta-ads-oauth] Ad accounts error:', accountsData.error)
        return jsonResponse({ error: `Erro ao listar contas: ${accountsData.error.message}` }, 400)
      }

      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

      console.log(`[meta-ads-oauth] Token obtained. User: ${meData.name}, Accounts: ${accountsData.data?.length || 0}`)

      return jsonResponse({
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        meta_user_id: meData.id,
        meta_user_name: meData.name,
        ad_accounts: (accountsData.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          status: a.account_status,
          currency: a.currency,
        })),
      })
    }

    // ── SAVE CONNECTION ──
    if (action === 'save_connection') {
      const { client_id, ad_account_id, ad_account_name, access_token, token_expires_at, meta_user_id, meta_user_name } = body

      if (!client_id || !access_token) {
        return jsonResponse({ error: 'client_id e access_token obrigatórios.' }, 400)
      }

      const normalizedAdAccountId = ad_account_id || null
      const normalizedAdAccountName = ad_account_name || null

      const { error } = await supabase
        .from('traffic_meta_connections')
        .upsert({
          client_id,
          ad_account_id: normalizedAdAccountId,
          ad_account_name: normalizedAdAccountName,
          access_token,
          token_expires_at: token_expires_at || null,
          meta_user_id: meta_user_id || null,
          meta_user_name: meta_user_name || null,
          status: 'active',
          sync_error: null,
        }, { onConflict: 'client_id' })

      if (error) {
        console.error('[meta-ads-oauth] Save error:', error)
        return jsonResponse({ error: `Erro ao salvar conexão: ${error.message}` }, 500)
      }

      console.log(`[meta-ads-oauth] Connection saved for client ${client_id}`)
      return jsonResponse({ success: true })
    }

    // ── DISCONNECT ──
    if (action === 'disconnect') {
      const { client_id } = body
      if (!client_id) return jsonResponse({ error: 'client_id obrigatório.' }, 400)

      const { error } = await supabase
        .from('traffic_meta_connections')
        .delete()
        .eq('client_id', client_id)

      if (error) {
        console.error('[meta-ads-oauth] Disconnect error:', error)
        return jsonResponse({ error: error.message }, 500)
      }

      return jsonResponse({ success: true })
    }

    // ── LIST CONNECTIONS ──
    if (action === 'list_connections') {
      const { data, error } = await supabase
        .from('traffic_meta_connections')
        .select('id, client_id, ad_account_id, ad_account_name, meta_user_name, status, token_expires_at, last_synced_at, sync_error, created_at')
        .order('created_at', { ascending: false })

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ connections: data })
    }

    return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400)

  } catch (error: any) {
    console.error('[meta-ads-oauth] Unexpected error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})
