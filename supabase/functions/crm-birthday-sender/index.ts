import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const WASENDER_BASE = 'https://app.wasender.net/api/v1/instance';
const DELAY_MS = 1500;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    console.log('[crm-birthday-sender] Starting birthday check...');

    // Get all active birthday notifications
    const { data: notifications } = await supabase
      .from('crm_auto_notifications')
      .select('*, clients(name, phone)')
      .eq('is_active', true)
      .eq('trigger_event', 'birthday');

    if (!notifications || notifications.length === 0) {
      return jsonResp({ message: 'No active birthday notifications', processed: 0 });
    }

    const today = new Date();
    let totalSent = 0;

    for (const notif of notifications) {
      try {
        // delay_minutes for birthday = days before (UI label says "Dias antes")
        // But some records may have been saved as actual minutes (e.g., 1440 = 1 day)
        // Normalize: if value > 30, assume it's minutes and convert to days
        const rawOffset = notif.delay_minutes || 0;
        const offsetDays = rawOffset > 30 ? Math.round(rawOffset / 1440) : rawOffset;
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + offsetDays);
        
        const targetMonth = targetDate.getMonth() + 1;
        const targetDay = targetDate.getDate();

        // Find leads whose birthday month/day match
        const { data: leads } = await supabase
          .from('crm_leads')
          .select('id, name, phone, email, birthday, sale_value, interested_products')
          .eq('client_id', notif.client_id)
          .not('birthday', 'is', null)
          .not('phone', 'is', null);

        if (!leads || leads.length === 0) continue;

        // Filter by matching month/day
        const matchingLeads = leads.filter((lead: any) => {
          if (!lead.birthday) return false;
          const bday = new Date(lead.birthday + 'T00:00:00');
          return bday.getMonth() + 1 === targetMonth && bday.getDate() === targetDay;
        });

        for (const lead of matchingLeads) {
          // Check send window
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          if (currentTime < (notif.send_window_start || '08:00') || currentTime > (notif.send_window_end || '20:00')) continue;

          // Check max sends
          const { count } = await supabase
            .from('crm_auto_notification_logs')
            .select('id', { count: 'exact', head: true })
            .eq('notification_id', notif.id)
            .eq('lead_id', lead.id);

          if ((count || 0) >= (notif.max_sends_per_lead || 1)) continue;

          // Build message
          const message = notif.message_template
            .replace(/\{lead_name\}/g, lead.name || 'Cliente')
            .replace(/\{lead_phone\}/g, lead.phone || '')
            .replace(/\{company_name\}/g, (notif as any).clients?.name || '');

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
          await sleep(DELAY_MS);
        }
      } catch (err) {
        console.error(`[crm-birthday-sender] Error processing notif ${notif.id}:`, err);
      }
    }

    console.log(`[crm-birthday-sender] Done. Sent: ${totalSent}`);
    return jsonResp({ message: 'Processed', sent: totalSent });
  } catch (error) {
    console.error('[crm-birthday-sender] Error:', error);
    return jsonResp({ error: (error as Error).message }, 500);
  }
});

async function sendWhatsApp(clientId: string, phone: string, message: string, mediaUrl?: string | null, mediaType?: string | null) {
  try {
    const WASENDER_TOKEN = Deno.env.get('WASENDER_API_TOKEN');
    if (!WASENDER_TOKEN) return { success: false, error: 'No API token' };

    // Get connection
    const { data: conn } = await supabase
      .from('crm_whatsapp_connections')
      .select('session_id')
      .eq('client_id', clientId)
      .eq('status', 'connected')
      .maybeSingle();

    if (!conn?.session_id) return { success: false, error: 'WhatsApp disconnected' };

    const body: Record<string, any> = {
      to: phone.replace(/\D/g, ''),
      text: message,
    };

    if (mediaUrl && mediaType) {
      if (mediaType === 'image') body.imageUrl = mediaUrl;
      else if (mediaType === 'video') body.videoUrl = mediaUrl;
      else if (mediaType === 'document') body.documentUrl = mediaUrl;
    }

    const resp = await fetch(`${WASENDER_BASE}/${conn.session_id}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WASENDER_TOKEN}` },
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
