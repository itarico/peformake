import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WASENDER_BASE = 'https://www.wasenderapi.com/api';
const PORTAL_BASE = 'https://peformake.com/portal';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type Recipient = { phone: string; type: 'client' | 'designer' | 'social_media' | 'admin' | 'staff' };

async function sendWA(key: string, phone: string, msg: string): Promise<{ ok: boolean; error?: string }> {
  const c = phone.replace(/\D/g, '');
  if (c.length < 10) return { ok: false, error: 'phone too short' };
  const e164 = c.startsWith('55') ? c : `55${c}`;

  try {
    const res = await fetch(`${WASENDER_BASE}/send-message`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: e164, type: 'text', text: msg }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('WA send error:', data);
      return { ok: false, error: JSON.stringify(data) };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function logNotification(params: {
  event_type: string;
  recipient_phone?: string;
  recipient_type?: string;
  client_id?: string;
  art_id?: string;
  message_preview?: string;
  status: string;
  error_message?: string;
  edge_function: string;
}) {
  try {
    await supabase.from('whatsapp_notification_log').insert({
      event_type: params.event_type,
      recipient_phone: params.recipient_phone,
      recipient_type: params.recipient_type || 'unknown',
      client_id: params.client_id,
      art_id: params.art_id,
      message_preview: params.message_preview?.substring(0, 200),
      status: params.status,
      error_message: params.error_message,
      edge_function: params.edge_function,
    });
  } catch (e) {
    console.error('Log insert error:', e);
  }
}

/**
 * Resolve the agency session API key - same logic as send-whatsapp-notification
 */
async function resolveAgencySessionKey(): Promise<string | null> {
  const { data: settings } = await supabase
    .from('notification_email_settings')
    .select('id, agency_whatsapp_api_key, agency_whatsapp_session, agency_whatsapp_session_id, whatsapp_notifications_enabled')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  if (!settings?.whatsapp_notifications_enabled) return null;

  // 1. Direct API key
  if (settings.agency_whatsapp_api_key) return settings.agency_whatsapp_api_key;
  
  // 2. Legacy session field
  if (settings.agency_whatsapp_session) return settings.agency_whatsapp_session;
  
  // 3. Resolve from session_id via Wasender API
  if (settings.agency_whatsapp_session_id) {
    const pat = Deno.env.get('WASENDER_API_TOKEN');
    if (!pat) return null;
    
    try {
      const res = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      const data = await res.json();
      const sessions = data.data || [];
      const matched = sessions.find((s: any) => String(s.id) === String(settings.agency_whatsapp_session_id));
      
      if (matched?.api_key) {
        await supabase.from('notification_email_settings')
          .update({ agency_whatsapp_api_key: matched.api_key })
          .eq('id', settings.id);
        return matched.api_key;
      }
    } catch (e) {
      console.error('Error resolving session key:', e);
    }
  }
  
  return null;
}

async function getStaffPhone(staffId?: string | null): Promise<string | null> {
  if (!staffId) return null;
  const { data } = await supabase.from('staff_members').select('phone').eq('id', staffId).single();
  return data?.phone || null;
}

async function getDesignerPhone(designerId?: string | null): Promise<string | null> {
  if (!designerId) return null;

  const { data: designer } = await supabase
    .from('designers')
    .select('phone, staff_member_id')
    .eq('id', designerId)
    .single();

  if (designer?.phone) return designer.phone;

  if (designer?.staff_member_id) {
    const { data: staff } = await supabase.from('staff_members').select('phone').eq('id', designer.staff_member_id).single();
    return staff?.phone || null;
  }

  return null;
}

function dedupeRecipients(recipients: Recipient[]): Recipient[] {
  const map = new Map<string, Recipient>();
  for (const recipient of recipients) {
    const normalized = recipient.phone.replace(/\D/g, '');
    if (!normalized) continue;
    if (!map.has(normalized)) map.set(normalized, { ...recipient, phone: recipient.phone });
  }
  return Array.from(map.values());
}

/**
 * Load message template from DB, fallback to default
 */
async function getTemplate(eventType: string, fallback: string): Promise<string> {
  const { data } = await supabase
    .from('whatsapp_message_templates')
    .select('message_template, is_active')
    .eq('event_type', eventType)
    .single();
  
  if (data && data.is_active) return data.message_template;
  return fallback;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value || '');
  }
  return result;
}

async function sendAndLog(key: string, recipient: Recipient, msg: string, params: {
  event_type: string;
  client_id?: string;
  art_id?: string;
}) {
  const result = await sendWA(key, recipient.phone, msg);

  await logNotification({
    ...params,
    recipient_phone: recipient.phone,
    recipient_type: recipient.type,
    message_preview: msg,
    status: result.ok ? 'sent' : 'failed',
    error_message: result.error,
    edge_function: 'whatsapp-art-events',
  });

  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { art_id, old_status, new_status } = await req.json();
    const key = await resolveAgencySessionKey();

    if (!key) {
      await logNotification({
        event_type: 'art_status_change',
        art_id,
        status: 'skipped',
        error_message: 'WhatsApp disabled or no session key',
        edge_function: 'whatsapp-art-events',
      });
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: art } = await supabase
      .from('arts')
      .select('art_number, title, revision_comment, work_months!inner(client_id, year, month, clients!inner(id, name, phone, portal_token, designer_id, social_media_staff_id, admin_staff_id))')
      .eq('id', art_id)
      .single();

    if (!art) {
      await logNotification({
        event_type: 'art_status_change',
        art_id,
        status: 'error',
        error_message: 'Art not found',
        edge_function: 'whatsapp-art-events',
      });
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cl = (art as any).work_months.clients;
    const clientId = (art as any).work_months.client_id as string;
    const title = art.title || `Arte #${art.art_number}`;
    const portalLink = `${PORTAL_BASE}/${cl.portal_token}`;

    const vars = {
      client_name: cl.name,
      art_title: title,
      portal_link: portalLink,
      revision_comment: art.revision_comment || 'Verifique os detalhes no sistema.',
    };

    const designerPhone = await getDesignerPhone(cl.designer_id);
    const socialPhone = await getStaffPhone(cl.social_media_staff_id);
    const adminPhone = await getStaffPhone(cl.admin_staff_id);

    const teamRecipients = dedupeRecipients([
      ...(socialPhone ? [{ phone: socialPhone, type: 'social_media' as const }] : []),
      ...(adminPhone ? [{ phone: adminPhone, type: 'admin' as const }] : []),
      ...(designerPhone ? [{ phone: designerPhone, type: 'designer' as const }] : []),
    ]);

    const sent: string[] = [];

    if (new_status === 'awaiting_approval') {
      if (cl.phone) {
        const tpl = await getTemplate('art_awaiting_approval_client', '🎨 *{client_name}*\n\nA arte "{art_title}" está pronta para sua aprovação!\n📋 Aprove no portal: {portal_link}');
        const msg = applyTemplate(tpl, vars);
        const clientRecipient: Recipient = { phone: cl.phone, type: 'client' };
        const res = await sendAndLog(key, clientRecipient, msg, {
          event_type: 'art_awaiting_approval',
          client_id: clientId,
          art_id,
        });
        if (res.ok) sent.push('client');
      }

      const tplTeam = await getTemplate('art_awaiting_approval_team', '🎨 *Aguardando aprovação*\n{client_name} - "{art_title}"');
      const msgTeam = applyTemplate(tplTeam, vars);
      const teamWithoutDesigner = teamRecipients.filter((r) => r.type === 'social_media' || r.type === 'admin');
      for (const recipient of teamWithoutDesigner) {
        const res = await sendAndLog(key, recipient, msgTeam, {
          event_type: 'art_awaiting_approval',
          client_id: clientId,
          art_id,
        });
        if (res.ok) sent.push(recipient.type);
      }
    }

    if (new_status === 'ready_for_production' && old_status === 'pending_briefing') {
      const tpl = await getTemplate('briefing_completed', '📋 *Briefing pronto*\n{client_name} - "{art_title}"\nPronto para produção.');
      const msg = applyTemplate(tpl, vars);
      const onlyDesigner = teamRecipients.filter((r) => r.type === 'designer');
      for (const recipient of onlyDesigner) {
        const res = await sendAndLog(key, recipient, msg, {
          event_type: 'briefing_completed',
          client_id: clientId,
          art_id,
        });
        if (res.ok) sent.push('designer');
      }
    }

    if (new_status === 'in_production' && old_status === 'ready_for_production') {
      const tpl = await getTemplate('art_in_production', '🚀 *Em produção*\n{client_name} - "{art_title}"\nO designer iniciou a produção desta arte.');
      const msg = applyTemplate(tpl, vars);
      const teamWithoutDesigner = teamRecipients.filter((r) => r.type === 'social_media' || r.type === 'admin');
      for (const recipient of teamWithoutDesigner) {
        const res = await sendAndLog(key, recipient, msg, {
          event_type: 'art_in_production',
          client_id: clientId,
          art_id,
        });
        if (res.ok) sent.push(recipient.type);
      }
    }

    if (new_status === 'revision_requested') {
      for (const recipient of teamRecipients) {
        const tplKey = recipient.type === 'designer' ? 'revision_requested_designer' : 'revision_requested_team';
        const fallback = recipient.type === 'designer'
          ? '🔄 *Alteração solicitada*\n{client_name} - "{art_title}"\n{revision_comment}'
          : '🔄 *Cliente solicitou alteração*\n{client_name} - "{art_title}"\n{revision_comment}';
        const tpl = await getTemplate(tplKey, fallback);
        const msg = applyTemplate(tpl, vars);
        const res = await sendAndLog(key, recipient, msg, {
          event_type: 'revision_requested',
          client_id: clientId,
          art_id,
        });
        if (res.ok) sent.push(recipient.type);
      }
    }

    if (new_status === 'approved') {
      const tpl = await getTemplate('art_approved', '✅ *Arte aprovada!*\n{client_name} - "{art_title}"');
      const msg = applyTemplate(tpl, vars);
      for (const recipient of teamRecipients) {
        const res = await sendAndLog(key, recipient, msg, {
          event_type: 'art_approved',
          client_id: clientId,
          art_id,
        });
        if (res.ok) sent.push(recipient.type);
      }
    }

    console.log(`Art ${art_id}: ${old_status} -> ${new_status}, sent to: ${sent.join(', ') || 'nobody'}`);

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('WhatsApp art events error:', err);
    await logNotification({
      event_type: 'art_status_change',
      status: 'error',
      error_message: String(err),
      edge_function: 'whatsapp-art-events',
    });

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
