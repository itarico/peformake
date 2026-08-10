import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const WASENDER_TOKEN = Deno.env.get('WASENDER_API_TOKEN');
    const now = new Date().toISOString();

    // Get pending scheduled messages that are due
    const { data: messages } = await supabase
      .from('crm_scheduled_messages')
      .select('*, crm_leads(phone, name, client_id)')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(20);

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let processed = 0;

    for (const msg of messages) {
      const lead = msg.crm_leads;
      if (!lead) {
        await supabase.from('crm_scheduled_messages').update({ status: 'failed', error_message: 'Lead not found' }).eq('id', msg.id);
        continue;
      }

      // Get connection
      const { data: conn } = await supabase.from('crm_whatsapp_connections').select('session_id')
        .eq('client_id', msg.client_id).eq('status', 'connected').maybeSingle();
      if (!conn?.session_id) {
        await supabase.from('crm_scheduled_messages').update({ status: 'failed', error_message: 'WhatsApp disconnected' }).eq('id', msg.id);
        continue;
      }

      try {
        // Send message
        const body: Record<string, any> = { to: lead.phone, text: msg.content };
        if (msg.media_url) {
          const t = msg.media_type || 'image';
          if (t === 'image') body.imageUrl = msg.media_url;
          else if (t === 'video') body.videoUrl = msg.media_url;
          else if (t === 'audio') body.audioUrl = msg.media_url;
          else if (t === 'document') body.documentUrl = msg.media_url;
        }

        const resp = await fetch(`https://app.wasender.net/api/v1/instance/${conn.session_id}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WASENDER_TOKEN}` },
          body: JSON.stringify(body),
        });

        if (resp.ok) {
          await supabase.from('crm_scheduled_messages').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', msg.id);
          // Save as crm_message
          await supabase.from('crm_messages').insert({
            lead_id: msg.lead_id, client_id: msg.client_id, direction: 'outbound',
            message_type: msg.media_url ? (msg.media_type || 'image') : 'text',
            content: msg.content, media_url: msg.media_url || null, status: 'sent',
          });
          // Log activity
          await supabase.from('crm_lead_activities').insert({
            client_id: msg.client_id, lead_id: msg.lead_id,
            activity_type: 'scheduled', description: 'Mensagem agendada enviada',
          });
          processed++;
        } else {
          const errText = await resp.text().catch(() => 'Unknown error');
          await supabase.from('crm_scheduled_messages').update({ status: 'failed', error_message: errText.slice(0, 200) }).eq('id', msg.id);
        }

        // Throttle
        await new Promise(r => setTimeout(r, 800));
      } catch (e: any) {
        await supabase.from('crm_scheduled_messages').update({ status: 'failed', error_message: e.message?.slice(0, 200) }).eq('id', msg.id);
      }
    }

    return new Response(JSON.stringify({ processed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
