import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function normalizePhone(raw: string): string {
  let p = String(raw || '').replace(/\D/g, '');
  if (!p) return '';
  if (!p.startsWith('55')) p = '55' + p;
  return '+' + p;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { campaign_id, client_id } = await req.json();
    if (!campaign_id || !client_id) {
      return new Response(JSON.stringify({ error: 'campaign_id and client_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Get campaign
    const { data: campaign, error: campErr } = await supabase.from('crm_campaigns').select('*').eq('id', campaign_id).single();
    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get WhatsApp connection — não filtrar por status para evitar falsos negativos
    const { data: conn } = await supabase
      .from('crm_whatsapp_connections')
      .select('session_api_key, status')
      .eq('client_id', client_id)
      .maybeSingle();

    if (!conn?.session_api_key) {
      await supabase.from('crm_campaigns').update({ status: 'failed' }).eq('id', campaign_id);
      return new Response(JSON.stringify({ error: 'WhatsApp não conectado para este cliente' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get filtered leads
    let query = supabase.from('crm_leads').select('id, phone, name').eq('client_id', client_id);
    const filters = (campaign.filter_criteria as Record<string, any>) || {};
    if (filters.status) query = query.eq('status', filters.status);
    const { data: leads } = await query;

    if (!leads || leads.length === 0) {
      await supabase.from('crm_campaigns').update({ status: 'completed', total_count: 0, completed_at: new Date().toISOString() }).eq('id', campaign_id);
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update campaign status
    await supabase.from('crm_campaigns').update({ status: 'sending', total_count: leads.length, started_at: new Date().toISOString() }).eq('id', campaign_id);

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      try {
        const to = normalizePhone(lead.phone);
        if (!to) { failedCount++; continue; }

        // Personalize
        const personalizedMsg = String(campaign.message || '')
          .replace(/\{\{nome\}\}/gi, lead.name || 'Cliente')
          .replace(/\{\{name\}\}/gi, lead.name || 'Cliente');

        // Build body
        const body: Record<string, any> = { to, text: personalizedMsg };
        if (campaign.media_url) {
          const type = campaign.media_type || 'image';
          if (type === 'image') body.imageUrl = campaign.media_url;
          else if (type === 'video') body.videoUrl = campaign.media_url;
          else if (type === 'audio') { body.audioUrl = campaign.media_url; delete body.text; }
          else if (type === 'document') body.documentUrl = campaign.media_url;
        }

        const resp = await fetch('https://www.wasenderapi.com/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${conn.session_api_key}` },
          body: JSON.stringify(body),
        });

        const respData = await resp.json().catch(() => ({}));

        if (resp.ok) {
          sentCount++;
          const wasenderId = respData?.data?.key?.id || respData?.data?.id || null;
          await supabase.from('crm_messages').insert({
            lead_id: lead.id,
            client_id,
            direction: 'outbound',
            message_type: campaign.media_url ? (campaign.media_type || 'image') : 'text',
            content: personalizedMsg,
            media_url: campaign.media_url || null,
            wasender_message_id: wasenderId,
            status: 'sent',
          });
        } else {
          failedCount++;
          const errMsg = respData?.message || respData?.error || `HTTP ${resp.status}`;
          if (errors.length < 5) errors.push(`${lead.name || lead.phone}: ${errMsg}`);
          console.error('[campaign-sender] Send failed:', lead.phone, errMsg);
        }

        // Throttle: progress every 3 sends to reduce DB load
        if ((sentCount + failedCount) % 3 === 0) {
          await supabase.from('crm_campaigns').update({ sent_count: sentCount, failed_count: failedCount }).eq('id', campaign_id);
        }

        // 1.2s between messages — anti-spam
        await new Promise(r => setTimeout(r, 1200));
      } catch (e: any) {
        failedCount++;
        if (errors.length < 5) errors.push(`${lead.name || lead.phone}: ${e.message || 'erro'}`);
        console.error('[campaign-sender] Exception:', e);
      }
    }

    await supabase.from('crm_campaigns').update({
      status: 'completed',
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    }).eq('id', campaign_id);

    return new Response(JSON.stringify({ sent: sentCount, failed: failedCount, errors }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[campaign-sender] Fatal:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
