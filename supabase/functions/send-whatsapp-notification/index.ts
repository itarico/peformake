import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WASENDER_BASE = 'https://www.wasenderapi.com/api';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DELAY_MS = 85_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RecipientType = 'staff' | 'client' | 'both';
type StaffRecipientType = 'staff' | 'social_media' | 'admin' | 'designer';

interface WaPayload {
  type?: string;
  event_type?: string;
  title?: string;
  message?: string;
  data?: any;
  client_id?: string;
  target: RecipientType;
  staff_phones?: string[];
  client_phone?: string;
  document_url?: string;
  document_filename?: string;
}

interface Recipient {
  phone: string;
  recipientType: StaffRecipientType | 'client';
}

async function sendWhatsApp(sessionApiKey: string, phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) return { ok: false, error: 'phone too short' };
  const e164 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  try {
    const res = await fetch(`${WASENDER_BASE}/send-message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: e164, type: 'text', text: message }),
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

async function sendDocument(
  sessionApiKey: string,
  phone: string,
  url: string,
  filename: string,
  caption?: string,
): Promise<{ ok: boolean; error?: string }> {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) return { ok: false, error: 'phone too short' };
  const e164 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  try {
    const res = await fetch(`${WASENDER_BASE}/send-message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: e164,
        type: 'document',
        media_url: url,
        filename,
        caption: caption || '',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('WA doc send error:', data);
      return { ok: false, error: JSON.stringify(data) };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function logNotification(params: Record<string, any>) {
  try {
    await supabase.from('whatsapp_notification_log').insert({
      event_type: params.event_type || 'notification',
      recipient_phone: params.phone,
      recipient_type: params.recipient_type || 'unknown',
      client_id: params.client_id || null,
      message_preview: params.message?.substring(0, 200),
      status: params.status || 'sent',
      error_message: params.error,
      edge_function: 'send-whatsapp-notification',
    });
  } catch (e) {
    console.error('Log error:', e);
  }
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
    .select('phone,staff_member_id')
    .eq('id', designerId)
    .single();

  if (designer?.phone) return designer.phone;

  if (designer?.staff_member_id) {
    const { data: staff } = await supabase
      .from('staff_members')
      .select('phone')
      .eq('id', designer.staff_member_id)
      .single();

    return staff?.phone || null;
  }

  return null;
}

function dedupeRecipients(recipients: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  const out: Recipient[] = [];

  for (const recipient of recipients) {
    const normalized = recipient.phone.replace(/\D/g, '');
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(recipient);
  }

  return out;
}

async function getAssignedStaffRecipients(clientId: string): Promise<Recipient[]> {
  const { data: client } = await supabase
    .from('clients')
    .select('social_media_staff_id, admin_staff_id, designer_id')
    .eq('id', clientId)
    .single();

  if (!client) return [];

  const [socialPhone, adminPhone, designerPhone] = await Promise.all([
    getStaffPhone((client as any).social_media_staff_id),
    getStaffPhone((client as any).admin_staff_id),
    getDesignerPhone((client as any).designer_id),
  ]);

  return dedupeRecipients([
    ...(socialPhone ? [{ phone: socialPhone, recipientType: 'social_media' as const }] : []),
    ...(adminPhone ? [{ phone: adminPhone, recipientType: 'admin' as const }] : []),
    ...(designerPhone ? [{ phone: designerPhone, recipientType: 'designer' as const }] : []),
  ]);
}

/**
 * Resolve the AGENCY session API key for sending notifications.
 * This is ALWAYS the agency's own WhatsApp session, never a CRM client session.
 * Priority: agency_whatsapp_api_key > agency_whatsapp_session > fetch from Wasender by session_id
 */
async function resolveAgencySessionKey(settings: any): Promise<string | null> {
  // 1. Direct API key field
  if (settings.agency_whatsapp_api_key) return settings.agency_whatsapp_api_key;
  
  // 2. Legacy session field  
  if (settings.agency_whatsapp_session) return settings.agency_whatsapp_session;
  
  // 3. Resolve from session_id via Wasender API
  if (settings.agency_whatsapp_session_id) {
    const pat = Deno.env.get('WASENDER_API_TOKEN');
    if (!pat) {
      console.error('[notification] No WASENDER_API_TOKEN to resolve session key');
      return null;
    }
    
    try {
      const res = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      const data = await res.json();
      const sessions = data.data || [];
      const matched = sessions.find((s: any) => String(s.id) === String(settings.agency_whatsapp_session_id));
      
      if (matched?.api_key) {
        console.log('[notification] Resolved agency session key from Wasender, saving...');
        // Cache the key for future use
        await supabase.from('notification_email_settings')
          .update({ agency_whatsapp_api_key: matched.api_key })
          .eq('id', settings.id);
        return matched.api_key;
      }
      
      console.error('[notification] Session', settings.agency_whatsapp_session_id, 'not found or no api_key');
    } catch (e) {
      console.error('[notification] Error resolving session key:', e);
    }
  }
  
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const payload: WaPayload = await req.json();
    const {
      type,
      event_type,
      title: pTitle,
      message: pMessage,
      data,
      client_id,
      target,
      staff_phones,
      client_phone,
      document_url,
      document_filename,
    } = payload;

    const eventType = type || event_type;
    const title = pTitle || (eventType === 'service_request' ? 'Nova Solicitação de Serviço' : 'Notificação Performake');
    let message = pMessage;

    if (!message && data) {
      message = `👤 *Nome:* ${data.name}\n📱 *WhatsApp:* ${data.whatsapp}\n🎯 *Serviço:* ${data.service_name || 'N/A'}\n💬 *Mensagem:* ${data.message || 'Sem mensagem'}`;
    }

    if (!message) message = 'Nova notificação recebida';

    const { data: settings } = await supabase
      .from('notification_email_settings')
      .select('id, agency_whatsapp_session, agency_whatsapp_session_id, agency_whatsapp_api_key, whatsapp_notifications_enabled')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    const hasStoredAgencySession = !!(settings?.agency_whatsapp_api_key || settings?.agency_whatsapp_session || settings?.agency_whatsapp_session_id);

    if (!settings?.whatsapp_notifications_enabled && !hasStoredAgencySession) {
      await logNotification({ event_type: eventType, status: 'skipped', message: 'WhatsApp disabled', client_id });
      return new Response(JSON.stringify({ skipped: true, reason: 'whatsapp disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // IMPORTANT: Always use the AGENCY session, never a CRM client session
    const sessionKey = await resolveAgencySessionKey(settings);
    
    if (!sessionKey) {
      console.error('[notification] No agency session key available');
      await logNotification({ event_type: eventType, status: 'skipped', message: 'No agency session key', client_id });
      return new Response(JSON.stringify({ skipped: true, reason: 'no agency session key - sync keys in CRM Admin' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sent: string[] = [];
    const shortMsg = `📋 *${title}*\n${message}`;

    const deliver = async (recipient: Recipient) => {
      const result = document_url
        ? await sendDocument(sessionKey, recipient.phone, document_url, document_filename || 'documento.pdf', shortMsg)
        : await sendWhatsApp(sessionKey, recipient.phone, shortMsg);

      await logNotification({
        event_type: eventType,
        phone: recipient.phone,
        recipient_type: recipient.recipientType,
        client_id,
        message: shortMsg,
        status: result.ok ? 'sent' : 'failed',
        error: result.error,
      });

      if (result.ok) sent.push(recipient.phone);
    };

    if (target === 'staff' || target === 'both') {
      let recipients: Recipient[] = [];

      if ((staff_phones || []).length > 0) {
        recipients = staff_phones!.map((phone) => ({ phone, recipientType: 'staff' as const }));
      } else if (client_id) {
        recipients = await getAssignedStaffRecipients(client_id);
      } else {
        const leadTypes = ['sdr_new_lead', 'new_quiz_lead', 'service_request', 'new_lead'];
        const isLead = eventType && leadTypes.includes(eventType);

        let query = supabase
          .from('staff_members')
          .select('phone')
          .eq('is_active', true)
          .not('phone', 'is', null);

        if (isLead) {
          console.log(`[notification] Lead detected (${eventType}), filtering for SDR or Closer roles`);
          // Use .or() to filter for either 'sdr' OR 'closer' roles
          // Postgrest syntax for array contains: roles.cs.{sdr} or roles.cs.{closer}
          query = query.or('roles.cs.{"sdr"},roles.cs.{"closer"}');
        }

        const { data: staff } = await query;

        recipients = (staff || [])
          .map((s: any) => ({ phone: s.phone, recipientType: 'staff' as const }))
          .filter((s) => Boolean(s.phone));
      }

      const uniqueRecipients = dedupeRecipients(recipients);
      let count = 0;
      for (const recipient of uniqueRecipients) {
        if (count > 0) await sleep(DELAY_MS);
        await deliver(recipient);
        count += 1;
      }
    }

    if ((target === 'client' || target === 'both') && (client_phone || client_id)) {
      let phone = client_phone;

      if (!phone && client_id) {
        const { data: client } = await supabase.from('clients').select('phone').eq('id', client_id).single();
        phone = client?.phone;
      }

      if (phone) {
        if (sent.length > 0) await sleep(DELAY_MS);
        await deliver({ phone, recipientType: 'client' });
      }
    }

    return new Response(JSON.stringify({ sent: sent.length, phones: sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    await logNotification({ event_type: 'unknown', status: 'error', message: String(err) });
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
