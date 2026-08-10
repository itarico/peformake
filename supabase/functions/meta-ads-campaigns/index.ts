import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getConnection(supabase: any, clientId: string) {
  const { data, error } = await supabase
    .from('traffic_meta_connections')
    .select('*')
    .eq('client_id', clientId)
    .single()
  if (error || !data) throw new Error('Cliente não possui conta Meta conectada.')
  if (data.status === 'token_expired') throw new Error('Token expirado. Reconecte a conta Meta.')
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action } = body

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // ── UPLOAD CREATIVE IMAGE ──
    if (action === 'upload_image') {
      const { client_id, image_url } = body
      if (!client_id || !image_url) return jsonResponse({ error: 'client_id e image_url obrigatórios.' }, 400)

      const conn = await getConnection(supabase, client_id)

      // Download the image from storage URL
      const imgRes = await fetch(image_url)
      if (!imgRes.ok) return jsonResponse({ error: 'Falha ao baixar imagem do storage.' }, 400)
      const imgBlob = await imgRes.blob()

      // Upload to Meta via multipart form
      const formData = new FormData()
      formData.append('access_token', conn.access_token)
      formData.append('filename', 'creative.jpg')
      formData.append('file', imgBlob, 'creative.jpg')

      const uploadRes = await fetch(
        `https://graph.facebook.com/v21.0/${conn.ad_account_id}/adimages`,
        { method: 'POST', body: formData }
      )
      const uploadData = await uploadRes.json()
      if (uploadData.error) return jsonResponse({ error: uploadData.error.message }, 400)

      // Extract hash from response
      const images = uploadData.images || {}
      const firstKey = Object.keys(images)[0]
      const imageHash = firstKey ? images[firstKey].hash : null

      if (!imageHash) return jsonResponse({ error: 'Não foi possível obter o hash da imagem.' }, 400)

      return jsonResponse({ success: true, image_hash: imageHash })
    }

    // ── CREATE FULL CAMPAIGN ──
    if (action === 'create_campaign') {
      const { client_id, campaign_name, objective, daily_budget, optimization_goal, page_id, image_hash, primary_text, headline, description, link_url, call_to_action, targeting } = body

      if (!client_id || !campaign_name || !daily_budget) {
        return jsonResponse({ error: 'Campos obrigatórios: client_id, campaign_name, daily_budget.' }, 400)
      }

      const conn = await getConnection(supabase, client_id)
      const token = conn.access_token
      const accountId = conn.ad_account_id

      // 1. Create Campaign
      const campaignObj: any = {
        name: campaign_name,
        objective: objective || 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: [],
        access_token: token,
      }

      const campRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignObj),
      })
      const campData = await campRes.json()
      if (campData.error) return jsonResponse({ error: `Campanha: ${campData.error.message}` }, 400)
      const campaignId = campData.id

      // 2. Create Ad Set
      const budgetCents = Math.round(daily_budget * 100)
      const adSetObj: any = {
        name: `${campaign_name} - Conjunto`,
        campaign_id: campaignId,
        daily_budget: budgetCents,
        billing_event: 'IMPRESSIONS',
        optimization_goal: optimization_goal || 'LINK_CLICKS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        status: 'PAUSED',
        targeting: targeting || { geo_locations: { countries: ['BR'] }, age_min: 18, age_max: 65 },
        access_token: token,
      }

      const adSetRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/adsets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adSetObj),
      })
      const adSetData = await adSetRes.json()
      if (adSetData.error) return jsonResponse({ error: `Conjunto: ${adSetData.error.message}`, campaign_id: campaignId }, 400)
      const adSetId = adSetData.id

      // 3. Create Ad Creative + Ad (only if image_hash provided)
      let creativeId = null
      let adId = null

      if (image_hash) {
        const creativeObj: any = {
          name: `${campaign_name} - Criativo`,
          object_story_spec: {
            page_id: page_id || undefined,
            link_data: {
              image_hash: image_hash,
              link: link_url || 'https://example.com',
              message: primary_text || '',
              name: headline || '',
              description: description || '',
              call_to_action: call_to_action ? { type: call_to_action } : { type: 'LEARN_MORE' },
            },
          },
          access_token: token,
        }

        const creativeRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/adcreatives`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creativeObj),
        })
        const creativeData = await creativeRes.json()
        if (creativeData.error) return jsonResponse({ error: `Criativo: ${creativeData.error.message}`, campaign_id: campaignId, ad_set_id: adSetId }, 400)
        creativeId = creativeData.id

        // 4. Create Ad
        const adObj: any = {
          name: `${campaign_name} - Anúncio`,
          adset_id: adSetId,
          creative: { creative_id: creativeId },
          status: 'PAUSED',
          access_token: token,
        }

        const adRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/ads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adObj),
        })
        const adData = await adRes.json()
        if (adData.error) return jsonResponse({ error: `Anúncio: ${adData.error.message}`, campaign_id: campaignId, ad_set_id: adSetId, creative_id: creativeId }, 400)
        adId = adData.id
      }

      const msg = image_hash
        ? 'Campanha completa criada com sucesso! Status: PAUSADA.'
        : 'Campanha e Conjunto criados (PAUSADOS). Adicione o criativo depois para ativar.'

      return jsonResponse({
        success: true,
        campaign_id: campaignId,
        ad_set_id: adSetId,
        creative_id: creativeId,
        ad_id: adId,
        needs_creative: !image_hash,
        message: msg,
      })
    }

    // ── LIST PAGES ──
    if (action === 'list_pages') {
      const { client_id } = body
      if (!client_id) return jsonResponse({ error: 'client_id obrigatório.' }, 400)

      const conn = await getConnection(supabase, client_id)
      const res = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${conn.access_token}`
      )
      const data = await res.json()
      if (data.error) return jsonResponse({ error: data.error.message }, 400)

      return jsonResponse({ pages: (data.data || []).map((p: any) => ({ id: p.id, name: p.name })) })
    }

    return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400)
  } catch (error: any) {
    console.error('[meta-ads-campaigns] Error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})
