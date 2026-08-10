import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[crm-auto-notifications] Starting notification check...');

    // Get all active auto notifications
    const { data: notifications, error: notifError } = await supabase
      .from('crm_auto_notifications')
      .select('*, clients(name, phone)')
      .eq('is_active', true);

    if (notifError) throw notifError;
    if (!notifications || notifications.length === 0) {
      return jsonResp({ message: 'No active notifications', processed: 0 });
    }

    let totalSent = 0;

    for (const notif of notifications) {
      try {
        const eligibleLeads = await getEligibleLeads(notif);
        
        for (const lead of eligibleLeads) {
          // Check send window
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          if (currentTime < notif.send_window_start || currentTime > notif.send_window_end) continue;

          // Check max sends per lead
          const { count } = await supabase
            .from('crm_auto_notification_logs')
            .select('id', { count: 'exact', head: true })
            .eq('notification_id', notif.id)
            .eq('lead_id', lead.id);

          if ((count || 0) >= notif.max_sends_per_lead) continue;

          // Build message
          const message = buildMessage(notif.message_template, lead, notif.clients);

          // Send via Wasender
          const sendResult = await sendWhatsApp(notif.client_id, lead.phone, message, notif.media_url, notif.media_type);

          // Log
          await supabase.from('crm_auto_notification_logs').insert({
            notification_id: notif.id,
            lead_id: lead.id,
            client_id: notif.client_id,
            status: sendResult.success ? 'sent' : 'failed',
            wasender_response: sendResult.response,
            error_message: sendResult.error,
          });

          if (sendResult.success) totalSent++;

          // Small delay between sends
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err) {
        console.error(`[crm-auto-notifications] Error processing notif ${notif.id}:`, err);
      }
    }

    console.log(`[crm-auto-notifications] Done. Sent: ${totalSent}`);
    return jsonResp({ message: 'Processed', sent: totalSent });
  } catch (error) {
    console.error('[crm-auto-notifications] Error:', error);
    return jsonResp({ error: (error as Error).message }, 500);
  }
});

async function getEligibleLeads(notif: any) {
  const now = new Date();
  let query = supabase.from('crm_leads').select('id, name, phone, status, last_message_at, sale_value, interested_products')
    .eq('client_id', notif.client_id);

  switch (notif.trigger_event) {
    case 'inactivity': {
      const cutoff = new Date(now.getTime() - notif.delay_minutes * 60000).toISOString();
      query = query.lt('last_message_at', cutoff).not('status', 'in', '("sale_completed","sale_lost")');
      break;
    }
    case 'sale_confirmed': {
      query = query.eq('status', 'sale_completed');
      break;
    }
    case 'sale_lost': {
      query = query.eq('status', 'sale_lost');
      break;
    }
    case 'status_change': {
      if (notif.trigger_status) {
        query = query.eq('status', notif.trigger_status);
      }
      break;
    }
    case 'new_lead': {
      const cutoff = new Date(now.getTime() - notif.delay_minutes * 60000).toISOString();
      query = query.gte('created_at', cutoff).eq('status', 'new');
      break;
    }
    default:
      return [];
  }

  const { data } = await query;
  return (data || []).filter((l: any) => l.phone);
}

function buildMessage(template: string, lead: any, client: any) {
  return template
    .replace(/\{lead_name\}/g, lead.name || 'Cliente')
    .replace(/\{lead_phone\}/g, lead.phone || '')
    .replace(/\{product_name\}/g, (lead.interested_products || [])[0] || '')
    .replace(/\{sale_value\}/g, lead.sale_value ? `R$ ${Number(lead.sale_value).toLocaleString('pt-BR')}` : '')
    .replace(/\{company_name\}/g, client?.name || '');
}

async function sendWhatsApp(clientId: string, phone: string, message: string, mediaUrl?: string, mediaType?: string) {
  try {
    // Get Wasender config
    const { data: config } = await supabase
      .from('crm_bot_configs')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    const WASENDER_API_TOKEN = Deno.env.get('WASENDER_API_TOKEN');
    if (!WASENDER_API_TOKEN) return { success: false, error: 'No API token' };

    // Get session ID from client
    const { data: client } = await supabase.from('clients').select('meta_ad_account_id').eq('id', clientId).single();
    
    // Use the crm-wasender function
    const endpoint = mediaUrl && mediaType
      ? 'https://api.wasender.dev/v1/send-message'
      : 'https://api.wasender.dev/v1/send-message';

    const body: any = {
      sessionId: (client as any)?.meta_ad_account_id, // Using this field as wasender session
      to: phone.replace(/\D/g, ''),
      text: message,
    };

    if (mediaUrl && mediaType) {
      body.mediaUrl = mediaUrl;
      body.mediaType = mediaType;
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WASENDER_API_TOKEN}` },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    return { success: resp.ok, response: data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

function jsonResp(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
