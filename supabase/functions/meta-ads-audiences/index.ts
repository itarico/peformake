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

async function sha256Hash(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function normalizePhone(phone: string): string {
  // Remove everything except digits
  let digits = phone.replace(/\D/g, '')
  // Add Brazil country code if missing
  if (!digits.startsWith('55')) digits = '55' + digits
  return digits
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

    // ── GET CONNECTION helper ──
    async function getConnection(clientId: string) {
      const { data, error } = await supabase
        .from('traffic_meta_connections')
        .select('*')
        .eq('client_id', clientId)
        .single()
      if (error || !data) throw new Error('Cliente não possui conta Meta conectada.')
      if (data.status === 'token_expired') throw new Error('Token expirado. Reconecte a conta Meta.')
      return data
    }

    // ── CREATE CUSTOM AUDIENCE FROM CRM LEADS ──
    if (action === 'create_from_crm') {
      const { client_id, name, description, lead_statuses } = body
      if (!client_id || !name) return jsonResponse({ error: 'client_id e name obrigatórios.' }, 400)

      const conn = await getConnection(client_id)

      // Fetch leads
      let query = supabase.from('crm_leads').select('phone').eq('client_id', client_id)
      if (lead_statuses && lead_statuses.length > 0) {
        query = query.in('status', lead_statuses)
      }
      const { data: leads, error: leadsErr } = await query
      if (leadsErr) throw new Error(leadsErr.message)
      if (!leads || leads.length === 0) return jsonResponse({ error: 'Nenhum lead encontrado com os filtros selecionados.' }, 400)

      // Hash phone numbers for Meta
      const hashedPhones = await Promise.all(leads.map(l => sha256Hash(normalizePhone(l.phone))))

      // Create Custom Audience on Meta
      const createRes = await fetch(
        `https://graph.facebook.com/v21.0/${conn.ad_account_id}/customaudiences`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: description || `CRM leads - ${leads.length} contatos`,
            subtype: 'CUSTOM',
            customer_file_source: 'USER_PROVIDED_ONLY',
            access_token: conn.access_token,
          }),
        }
      )
      const createData = await createRes.json()
      if (createData.error) return jsonResponse({ error: createData.error.message }, 400)

      const audienceId = createData.id

      // Upload users to the audience with LGPD data processing options
      const uploadRes = await fetch(
        `https://graph.facebook.com/v21.0/${audienceId}/users`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: {
              schema: ['PHONE'],
              data: hashedPhones.map(h => [h]),
              data_processing_options: ["LDU"],
              data_processing_options_country: 0,
              data_processing_options_state: 0,
            },
            access_token: conn.access_token,
          }),
        }
      )
      const uploadData = await uploadRes.json()
      if (uploadData.error) {
        console.error('[meta-ads-audiences] Upload error:', uploadData.error)
      }

      // Save to DB
      const { error: dbErr } = await supabase.from('traffic_custom_audiences').insert({
        client_id,
        audience_id_external: audienceId,
        name,
        description: description || null,
        audience_type: 'custom',
        lead_count: leads.length,
        status: 'active',
      })
      if (dbErr) console.error('[meta-ads-audiences] DB save error:', dbErr)

      return jsonResponse({
        success: true,
        audience_id: audienceId,
        leads_uploaded: leads.length,
        matched: uploadData.audience_size || uploadData.num_received || leads.length,
      })
    }

    // ── CREATE LOOKALIKE AUDIENCE ──
    if (action === 'create_lookalike') {
      const { client_id, source_audience_db_id, name, country, ratio } = body
      if (!client_id || !source_audience_db_id || !name) {
        return jsonResponse({ error: 'client_id, source_audience_db_id e name obrigatórios.' }, 400)
      }

      const conn = await getConnection(client_id)

      // Get source audience
      const { data: srcAudience } = await supabase
        .from('traffic_custom_audiences')
        .select('*')
        .eq('id', source_audience_db_id)
        .single()
      if (!srcAudience) return jsonResponse({ error: 'Público de origem não encontrado.' }, 400)

      const lookalikeSpec = {
        type: 'custom_ratio',
        ratio: ratio || 0.01,
        country: country || 'BR',
      }

      const createRes = await fetch(
        `https://graph.facebook.com/v21.0/${conn.ad_account_id}/customaudiences`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            subtype: 'LOOKALIKE',
            origin_audience_id: srcAudience.audience_id_external,
            lookalike_spec: JSON.stringify(lookalikeSpec),
            access_token: conn.access_token,
          }),
        }
      )
      const createData = await createRes.json()
      if (createData.error) return jsonResponse({ error: createData.error.message }, 400)

      // Save to DB
      await supabase.from('traffic_custom_audiences').insert({
        client_id,
        audience_id_external: createData.id,
        name,
        audience_type: 'lookalike',
        source_audience_id: source_audience_db_id,
        lookalike_country: country || 'BR',
        lookalike_ratio: ratio || 0.01,
        status: 'active',
      })

      return jsonResponse({ success: true, audience_id: createData.id })
    }

    // ── LIST AUDIENCES ──
    if (action === 'list') {
      const { client_id } = body
      if (!client_id) return jsonResponse({ error: 'client_id obrigatório.' }, 400)

      const { data, error } = await supabase
        .from('traffic_custom_audiences')
        .select('*')
        .eq('client_id', client_id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return jsonResponse({ audiences: data || [] })
    }

    // ── DELETE AUDIENCE ──
    if (action === 'delete') {
      const { client_id, audience_db_id } = body
      if (!client_id || !audience_db_id) return jsonResponse({ error: 'client_id e audience_db_id obrigatórios.' }, 400)

      const conn = await getConnection(client_id)

      const { data: audience } = await supabase
        .from('traffic_custom_audiences')
        .select('*')
        .eq('id', audience_db_id)
        .single()
      if (!audience) return jsonResponse({ error: 'Público não encontrado.' }, 400)

      // Delete from Meta
      const delRes = await fetch(
        `https://graph.facebook.com/v21.0/${audience.audience_id_external}?access_token=${conn.access_token}`,
        { method: 'DELETE' }
      )
      const delData = await delRes.json()
      if (delData.error) console.error('[meta-ads-audiences] Meta delete error:', delData.error)

      // Delete from DB
      await supabase.from('traffic_custom_audiences').delete().eq('id', audience_db_id)

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400)
  } catch (error: any) {
    console.error('[meta-ads-audiences] Error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})
