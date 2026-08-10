import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-staff-id, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function authenticateRequest(req: Request, supabase: any, action: string): Promise<{ authenticated: boolean; error?: string }> {
  // sync_all can be called by cron — validate with a shared secret header
  if (action === 'sync_all') {
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      return { authenticated: true }
    }
    // Also allow authenticated staff/admin users to trigger sync_all
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing authorization header.' }
  }

  const token = authHeader.replace('Bearer ', '')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (token === anonKey) {
    // Frontend call with anon key — verify staff session
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
  const { data: hasRole } = await supabase.rpc('is_staff', { _user_id: userId })
  if (!hasRole) {
    return { authenticated: false, error: 'Staff access required.' }
  }

  return { authenticated: true }
}

function extractActionValue(actions: any[] | undefined, types: string[]): number {
  if (!actions) return 0
  let total = 0
  for (const action of actions) {
    if (types.some(t => action.action_type === t || action.action_type?.startsWith(t))) {
      total += parseInt(action.value || '0')
    }
  }
  return total
}

function extractActionFloat(actionValues: any[] | undefined, types: string[]): number {
  if (!actionValues) return 0
  let total = 0
  for (const av of actionValues) {
    if (types.some(t => av.action_type === t || av.action_type?.startsWith(t))) {
      total += parseFloat(av.value || '0')
    }
  }
  return total
}

async function syncClient(supabase: any, connection: any, year: number, month: number) {
  const { client_id, ad_account_id, access_token } = connection

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  console.log(`[meta-ads-sync] Syncing ${ad_account_id} for ${startDate} to ${endDate}`)

  // Fetch campaigns with budget info
  const campaignsRes = await fetch(
    `https://graph.facebook.com/v21.0/${ad_account_id}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget&access_token=${access_token}&limit=100`
  )
  const campaignsData = await campaignsRes.json()

  if (campaignsData.error) {
    const errMsg = campaignsData.error.message
    await supabase.from('traffic_meta_connections').update({ sync_error: errMsg, status: campaignsData.error.code === 190 ? 'token_expired' : 'error' }).eq('client_id', client_id)
    throw new Error(errMsg)
  }

  const campaigns = campaignsData.data || []

  // Fetch insights with ALL available fields
  const timeRange = JSON.stringify({ since: startDate, until: endDate })
  const fields = [
    'campaign_id', 'campaign_name',
    'spend', 'impressions', 'clicks', 'reach', 'frequency',
    'unique_clicks',
    'cpp', 'cpc', 'cpm', 'ctr',
    'actions', 'action_values',
    'outbound_clicks', 'cost_per_outbound_click',
    'video_thruplay_watched_actions', 'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions',
    'cost_per_thruplay',
    'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
  ].join(',')

  const insightsRes = await fetch(
    `https://graph.facebook.com/v21.0/${ad_account_id}/insights?fields=${fields}&time_range=${timeRange}&level=campaign&limit=500&access_token=${access_token}`
  )
  const insightsData = await insightsRes.json()

  if (insightsData.error) {
    const errMsg = insightsData.error.message
    await supabase.from('traffic_meta_connections').update({ sync_error: errMsg }).eq('client_id', client_id)
    throw new Error(errMsg)
  }

  const insights = insightsData.data || []
  const campaignMap = new Map(campaigns.map((c: any) => [c.id, c]))

  const upsertData = insights.map((insight: any) => {
    const campaign = campaignMap.get(insight.campaign_id) || {} as any
    const spend = parseFloat(insight.spend || '0')
    const impressions = parseInt(insight.impressions || '0')
    const clicks = parseInt(insight.clicks || '0')
    const reach = parseInt(insight.reach || '0')
    const frequency = parseFloat(insight.frequency || '0')
    const uniqueClicks = parseInt(insight.unique_clicks || '0')
    const cpp = parseFloat(insight.cpp || '0')

    // Actions extraction
    const leads = extractActionValue(insight.actions, ['lead', 'complete_registration', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'])
    const conversions = extractActionValue(insight.actions, ['offsite_conversion', 'lead', 'purchase', 'complete_registration'])
    const messagesStarted = extractActionValue(insight.actions, ['onsite_conversion.messaging_conversation_started_7d'])
    const landingPageViews = extractActionValue(insight.actions, ['landing_page_view'])
    const linkClicks = extractActionValue(insight.actions, ['link_click'])
    const videoViews = extractActionValue(insight.actions, ['video_view'])
    const purchases = extractActionValue(insight.actions, ['purchase', 'omni_purchase'])
    const addToCart = extractActionValue(insight.actions, ['add_to_cart', 'omni_add_to_cart'])
    const postEngagement = extractActionValue(insight.actions, ['post_engagement', 'page_engagement'])
    const postReactions = extractActionValue(insight.actions, ['post_reaction', 'like'])
    const postComments = extractActionValue(insight.actions, ['comment'])
    const postShares = extractActionValue(insight.actions, ['post', 'share'])
    const postSaves = extractActionValue(insight.actions, ['onsite_conversion.post_save'])

    // Outbound clicks
    const outboundClicks = insight.outbound_clicks ? parseInt(insight.outbound_clicks[0]?.value || '0') : 0
    const costPerOutboundClick = insight.cost_per_outbound_click ? parseFloat(insight.cost_per_outbound_click[0]?.value || '0') : 0

    // Video metrics
    const videoThruplay = insight.video_thruplay_watched_actions ? parseInt(insight.video_thruplay_watched_actions[0]?.value || '0') : 0
    const videoP25 = insight.video_p25_watched_actions ? parseInt(insight.video_p25_watched_actions[0]?.value || '0') : 0
    const videoP50 = insight.video_p50_watched_actions ? parseInt(insight.video_p50_watched_actions[0]?.value || '0') : 0
    const videoP75 = insight.video_p75_watched_actions ? parseInt(insight.video_p75_watched_actions[0]?.value || '0') : 0
    const videoP100 = insight.video_p100_watched_actions ? parseInt(insight.video_p100_watched_actions[0]?.value || '0') : 0
    const costPerThruplay = insight.cost_per_thruplay ? parseFloat(insight.cost_per_thruplay[0]?.value || '0') : 0

    // Revenue from action values
    const revenue = extractActionFloat(insight.action_values, ['offsite_conversion', 'purchase', 'omni_purchase'])
    const purchaseValue = extractActionFloat(insight.action_values, ['purchase', 'omni_purchase'])

    const cpc = clicks > 0 ? spend / clicks : 0
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const costPerConversion = conversions > 0 ? spend / conversions : 0
    const costPerLead = leads > 0 ? spend / leads : 0
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0
    const roas = spend > 0 ? revenue / spend : 0

    return {
      client_id, year, month,
      platform: 'meta_ads',
      campaign_id_external: insight.campaign_id,
      campaign_name: insight.campaign_name || campaign.name || 'Sem nome',
      objective: campaign.objective || null,
      status: (campaign.status || 'UNKNOWN').toLowerCase(),
      investment: spend, impressions, clicks, conversions,
      revenue_generated: revenue, reach, frequency,
      cpc, cpm, ctr, cost_per_conversion: costPerConversion, roas,
      leads, messages_started: messagesStarted,
      landing_page_views: landingPageViews,
      link_clicks: linkClicks,
      video_views: videoViews,
      cost_per_lead: costPerLead,
      conversion_rate: conversionRate,
      // New expanded fields
      unique_clicks: uniqueClicks,
      unique_impressions: 0,
      cpp,
      purchases,
      purchase_value: purchaseValue,
      add_to_cart: addToCart,
      post_engagement: postEngagement,
      post_reactions: postReactions,
      post_comments: postComments,
      post_shares: postShares,
      post_saves: postSaves,
      video_thruplay: videoThruplay,
      video_p25: videoP25,
      video_p50: videoP50,
      video_p75: videoP75,
      video_p100: videoP100,
      quality_ranking: insight.quality_ranking || null,
      engagement_rate_ranking: insight.engagement_rate_ranking || null,
      conversion_rate_ranking: insight.conversion_rate_ranking || null,
      cost_per_thruplay: costPerThruplay,
      outbound_clicks: outboundClicks,
      cost_per_outbound_click: costPerOutboundClick,
      daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
      lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
      synced_at: new Date().toISOString(),
    }
  })

  if (upsertData.length > 0) {
    const { error: upsertError } = await supabase
      .from('traffic_campaigns')
      .upsert(upsertData, { onConflict: 'client_id,campaign_id_external,year,month' })

    if (upsertError) throw new Error(upsertError.message)
  }

  await supabase.from('traffic_meta_connections').update({
    last_synced_at: new Date().toISOString(),
    sync_error: null,
    status: 'active',
  }).eq('client_id', client_id)

  return upsertData.length
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clonedReq = req.clone()
    const body = await clonedReq.json()
    const action = body.action || 'sync_client'

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Authenticate all requests
    const auth = await authenticateRequest(req, supabase, action)
    if (!auth.authenticated) {
      return jsonResponse({ error: auth.error || 'Unauthorized' }, 401)
    }

    // ── ACCOUNT INFO (balance/spend) ──
    if (action === 'account_info') {
      const { client_id } = body
      if (!client_id) return jsonResponse({ error: 'client_id obrigatório.' }, 400)

      const { data: connection, error: connError } = await supabase
        .from('traffic_meta_connections')
        .select('*')
        .eq('client_id', client_id)
        .single()

      if (connError || !connection) {
        return jsonResponse({ error: 'Cliente não possui conta Meta conectada.' }, 400)
      }

      const fields = 'name,account_status,amount_spent,spend_cap,balance,currency,funding_source_details{display_string,type}'
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${connection.ad_account_id}?fields=${fields}&access_token=${connection.access_token}`
      )
      const data = await res.json()

      if (data.error) {
        return jsonResponse({ error: data.error.message }, 400)
      }

      return jsonResponse({
        account_name: data.name,
        account_status: data.account_status,
        amount_spent: parseFloat(data.amount_spent || '0') / 100,
        spend_cap: parseFloat(data.spend_cap || '0') / 100,
        balance: parseFloat(data.balance || '0') / 100,
        currency: data.currency,
        funding_source: data.funding_source_details || null,
      })
    }

    // ── PAUSE CAMPAIGN ──
    if (action === 'pause_campaign') {
      const { client_id, campaign_id_external } = body
      if (!client_id || !campaign_id_external) return jsonResponse({ error: 'client_id e campaign_id_external obrigatórios.' }, 400)

      const { data: connection } = await supabase
        .from('traffic_meta_connections')
        .select('*')
        .eq('client_id', client_id)
        .single()

      if (!connection) return jsonResponse({ error: 'Cliente não possui conta Meta conectada.' }, 400)

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${campaign_id_external}?access_token=${connection.access_token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAUSED' }),
        }
      )
      const data = await res.json()
      if (data.error) return jsonResponse({ error: data.error.message }, 400)

      await supabase
        .from('traffic_campaigns')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('campaign_id_external', campaign_id_external)
        .eq('client_id', client_id)

      return jsonResponse({ success: true, message: 'Campanha pausada com sucesso.' })
    }

    // ── ACTIVATE CAMPAIGN ──
    if (action === 'activate_campaign') {
      const { client_id, campaign_id_external } = body
      if (!client_id || !campaign_id_external) return jsonResponse({ error: 'client_id e campaign_id_external obrigatórios.' }, 400)

      const { data: connection } = await supabase
        .from('traffic_meta_connections')
        .select('*')
        .eq('client_id', client_id)
        .single()

      if (!connection) return jsonResponse({ error: 'Cliente não possui conta Meta conectada.' }, 400)

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${campaign_id_external}?access_token=${connection.access_token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        }
      )
      const data = await res.json()
      if (data.error) return jsonResponse({ error: data.error.message }, 400)

      await supabase
        .from('traffic_campaigns')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('campaign_id_external', campaign_id_external)
        .eq('client_id', client_id)

      return jsonResponse({ success: true, message: 'Campanha ativada com sucesso.' })
    }

    // ── UPDATE CAMPAIGN BUDGET ──
    if (action === 'update_campaign_budget') {
      const { client_id, campaign_id_external, daily_budget } = body
      if (!client_id || !campaign_id_external || daily_budget === undefined) {
        return jsonResponse({ error: 'client_id, campaign_id_external e daily_budget obrigatórios.' }, 400)
      }

      const { data: connection } = await supabase
        .from('traffic_meta_connections')
        .select('*')
        .eq('client_id', client_id)
        .single()

      if (!connection) return jsonResponse({ error: 'Cliente não possui conta Meta conectada.' }, 400)

      const budgetCents = Math.round(daily_budget * 100)

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${campaign_id_external}?access_token=${connection.access_token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ daily_budget: budgetCents }),
        }
      )
      const data = await res.json()
      if (data.error) return jsonResponse({ error: data.error.message }, 400)

      return jsonResponse({ success: true, message: `Orçamento atualizado para R$ ${daily_budget.toFixed(2)}/dia.` })
    }

    if (action === 'sync_client') {
      const { client_id, year, month } = body
      if (!client_id || !year || !month) {
        return jsonResponse({ error: 'client_id, year e month obrigatórios.' }, 400)
      }

      const { data: connection, error: connError } = await supabase
        .from('traffic_meta_connections')
        .select('*')
        .eq('client_id', client_id)
        .single()

      if (connError || !connection) {
        return jsonResponse({ error: 'Cliente não possui conta Meta conectada.' }, 400)
      }

      if (connection.status === 'token_expired') {
        return jsonResponse({ error: 'Token expirado. Reconecte a conta Meta.' }, 400)
      }

      const count = await syncClient(supabase, connection, year, month)
      return jsonResponse({ success: true, campaigns_synced: count, period: `${month}/${year}` })
    }

    if (action === 'sync_all') {
      const { data: connections, error } = await supabase
        .from('traffic_meta_connections')
        .select('*')
        .eq('status', 'active')

      if (error) return jsonResponse({ error: error.message }, 500)

      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      const results = []
      for (const conn of connections || []) {
        try {
          const count = await syncClient(supabase, conn, year, month)
          results.push({ client_id: conn.client_id, success: true, campaigns: count })
        } catch (e: any) {
          results.push({ client_id: conn.client_id, success: false, error: e.message })
        }
      }

      return jsonResponse({ success: true, results })
    }

    // ── BREAKDOWN (age, gender, region, placement) ──
    if (action === 'breakdown') {
      const { client_id, year, month, breakdown_type } = body
      if (!client_id || !year || !month || !breakdown_type) {
        return jsonResponse({ error: 'client_id, year, month e breakdown_type obrigatórios.' }, 400)
      }

      const { data: connection } = await supabase
        .from('traffic_meta_connections')
        .select('*')
        .eq('client_id', client_id)
        .single()

      if (!connection) return jsonResponse({ error: 'Cliente não possui conta Meta conectada.' }, 400)

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
      const timeRange = JSON.stringify({ since: startDate, until: endDate })

      const breakdownMap: Record<string, string> = {
        age: 'age',
        gender: 'gender',
        region: 'region',
        placement: 'publisher_platform',
        age_gender: 'age,gender',
      }
      const metaBreakdown = breakdownMap[breakdown_type] || breakdown_type

      const bdFields = 'campaign_name,spend,impressions,clicks,reach,actions,unique_clicks,cpp'
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${connection.ad_account_id}/insights?fields=${bdFields}&time_range=${timeRange}&breakdowns=${metaBreakdown}&level=account&limit=500&access_token=${connection.access_token}`
      )
      const data = await res.json()
      if (data.error) return jsonResponse({ error: data.error.message }, 400)

      const rows = (data.data || []).map((row: any) => {
        const spend = parseFloat(row.spend || '0')
        const impressions = parseInt(row.impressions || '0')
        const clicks = parseInt(row.clicks || '0')
        const reach = parseInt(row.reach || '0')
        const uniqueClicks = parseInt(row.unique_clicks || '0')
        const cpp = parseFloat(row.cpp || '0')
        const leads = extractActionValue(row.actions, ['lead', 'complete_registration'])
        const messages = extractActionValue(row.actions, ['onsite_conversion.messaging_conversation_started_7d'])
        const purchases = extractActionValue(row.actions, ['purchase', 'omni_purchase'])
        return {
          age: row.age || null,
          gender: row.gender || null,
          region: row.region || null,
          publisher_platform: row.publisher_platform || null,
          spend, impressions, clicks, reach, unique_clicks: uniqueClicks, cpp,
          leads, messages, purchases,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpl: leads > 0 ? spend / leads : (messages > 0 ? spend / messages : 0),
        }
      })

      return jsonResponse({ success: true, breakdown: rows, breakdown_type })
    }

    return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400)

  } catch (error: any) {
    console.error('[meta-ads-sync] Error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})
