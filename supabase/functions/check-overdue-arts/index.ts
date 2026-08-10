import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WASENDER_BASE = 'https://www.wasenderapi.com/api';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function countBusinessHours(from: Date, to: Date): number {
  let hours = 0;
  const cursor = new Date(from);
  while (cursor < to && hours < 100) {
    if (cursor.getDay() !== 0) hours++; // Exclude Sundays
    cursor.setHours(cursor.getHours() + 1);
  }
  return hours;
}

async function resolveAgencySessionKey(): Promise<string | null> {
  const { data: settings } = await supabase
    .from('notification_email_settings')
    .select('id, agency_whatsapp_api_key, agency_whatsapp_session, agency_whatsapp_session_id, whatsapp_notifications_enabled')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  if (!settings?.whatsapp_notifications_enabled) return null;
  if (settings.agency_whatsapp_api_key) return settings.agency_whatsapp_api_key;
  if (settings.agency_whatsapp_session) return settings.agency_whatsapp_session;

  if (settings.agency_whatsapp_session_id) {
    const pat = Deno.env.get('WASENDER_API_TOKEN');
    if (!pat) return null;
    try {
      const res = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      const data = await res.json();
      const matched = (data.data || []).find((s: any) => String(s.id) === String(settings.agency_whatsapp_session_id));
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

async function sendWA(key: string, phone: string, msg: string): Promise<boolean> {
  const c = phone.replace(/\D/g, '');
  if (c.length < 10) return false;
  const e164 = c.startsWith('55') ? c : `55${c}`;
  try {
    const res = await fetch(`${WASENDER_BASE}/send-message`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: e164, type: 'text', text: msg }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const now = new Date();

    // Find arts in production (in_production or ready_for_production) with briefing > 48h úteis ago
    const { data: arts } = await supabase
      .from('arts')
      .select('id, art_number, title, briefing_completed_at, status, work_month_id, work_months!inner(client_id, clients!inner(id, name, phone, portal_token, designer_id, social_media_staff_id, admin_staff_id))')
      .in('status', ['ready_for_production', 'in_production'])
      .not('briefing_completed_at', 'is', null);

    if (!arts?.length) {
      return new Response(JSON.stringify({ checked: 0, overdue: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const overdueArts: any[] = [];
    for (const art of arts) {
      const briefingDate = new Date(art.briefing_completed_at!);
      const hours = countBusinessHours(briefingDate, now);
      if (hours > 48) {
        overdueArts.push({ ...art, overdueHours: hours });
      }
    }

    if (!overdueArts.length) {
      return new Response(JSON.stringify({ checked: arts.length, overdue: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create system notifications for overdue arts
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'social_media']);

    for (const art of overdueArts) {
      const cl = (art as any).work_months.clients;
      const clientId = (art as any).work_months.client_id;
      const artTitle = art.title || `Arte #${art.art_number}`;

      // Check if we already notified about this art today (avoid spam)
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'overdue_art')
        .eq('client_id', clientId)
        .like('message', `%${artTitle}%`)
        .gte('created_at', todayStart.toISOString())
        .limit(1);

      if (existingNotif?.length) continue; // Already notified today

      // System notification
      for (const u of (adminUsers || [])) {
        await supabase.from('notifications').insert({
          user_id: u.user_id,
          client_id: clientId,
          title: '⏰ Arte Atrasada',
          message: `"${artTitle}" de ${cl.name} está há ${art.overdueHours}h sem entrega (prazo: 48h úteis)`,
          type: 'overdue_art',
          link: `/planning/${art.work_month_id}`,
        });
      }
    }

    // Send WhatsApp notifications
    const waKey = await resolveAgencySessionKey();
    let waSent = 0;

    if (waKey) {
      // Group overdue arts by designer
      const designerArts = new Map<string, any[]>();
      for (const art of overdueArts) {
        const cl = (art as any).work_months.clients;
        const designerId = cl.designer_id;
        if (!designerId) continue;
        if (!designerArts.has(designerId)) designerArts.set(designerId, []);
        designerArts.get(designerId)!.push(art);
      }

      for (const [designerId, dArts] of designerArts) {
        // Get designer phone
        const { data: designer } = await supabase.from('designers').select('phone, staff_member_id').eq('id', designerId).single();
        let phone = designer?.phone;
        if (!phone && designer?.staff_member_id) {
          const { data: staff } = await supabase.from('staff_members').select('phone').eq('id', designer.staff_member_id).single();
          phone = staff?.phone;
        }
        if (!phone) continue;

        const artList = dArts.map(a => {
          const cl = (a as any).work_months.clients;
          return `• ${cl.name} - "${a.title || `Arte #${a.art_number}`}" (${a.overdueHours}h)`;
        }).join('\n');

        const msg = `⏰ *Artes atrasadas (prazo 48h úteis)*\n\nVocê tem ${dArts.length} arte(s) pendente(s):\n\n${artList}\n\nPor favor, priorize a entrega!`;

        if (await sendWA(waKey, phone, msg)) waSent++;

        await supabase.from('whatsapp_notification_log').insert({
          event_type: 'overdue_art',
          recipient_phone: phone,
          recipient_type: 'designer',
          status: 'sent',
          edge_function: 'check-overdue-arts',
          message_preview: msg.substring(0, 200),
        });
      }

      // Also notify admin staff about all overdue arts
      const allAdminPhones = new Set<string>();
      for (const art of overdueArts) {
        const cl = (art as any).work_months.clients;
        if (cl.admin_staff_id) {
          const { data: staff } = await supabase.from('staff_members').select('phone').eq('id', cl.admin_staff_id).single();
          if (staff?.phone) allAdminPhones.add(staff.phone);
        }
      }

      if (allAdminPhones.size > 0) {
        const summary = `⏰ *${overdueArts.length} arte(s) atrasadas hoje*\n\n${overdueArts.map(a => {
          const cl = (a as any).work_months.clients;
          return `• ${cl.name} - "${a.title || `Arte #${a.art_number}`}" (${a.overdueHours}h)`;
        }).join('\n')}`;

        for (const phone of allAdminPhones) {
          if (await sendWA(waKey, phone, summary)) waSent++;
        }
      }
    }

    return new Response(JSON.stringify({ checked: arts.length, overdue: overdueArts.length, waSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[check-overdue-arts] Error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
