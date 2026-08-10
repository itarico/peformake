import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WASENDER_BASE = 'https://www.wasenderapi.com/api';
const PORTAL_BASE = 'https://peformake.com';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function getISOWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

async function sendWA(key: string, phone: string, msg: string) {
  const c = phone.replace(/\D/g, '');
  if (c.length < 10) return { ok: false, error: 'phone too short' };
  try {
    const res = await fetch(`${WASENDER_BASE}/send-message`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: c.startsWith('55') ? c : `55${c}`, type: 'text', text: msg }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: JSON.stringify(data) };
    return { ok: true };
  } catch (err) { return { ok: false, error: String(err) }; }
}

async function getSession() {
  const { data } = await supabase.from('notification_email_settings')
    .select('agency_whatsapp_session, whatsapp_notifications_enabled')
    .eq('id', '00000000-0000-0000-0000-000000000001').single();
  return data?.whatsapp_notifications_enabled ? data.agency_whatsapp_session : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const period: 'weekly' | 'monthly' = body.period || 'weekly';

    const key = await getSession();
    if (!key) {
      return new Response(JSON.stringify({ skipped: true, reason: 'wa disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const now = new Date();
    const year = now.getFullYear();
    const week = getISOWeek(now);
    const month = now.getMonth() + 1;

    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('is_active', true)
      .not('phone', 'is', null);

    let sent = 0, skipped = 0, failed = 0;
    for (const cl of clients || []) {
      if (!cl.phone) { skipped++; continue; }

      // Check if already exists for this period
      const filter = period === 'weekly'
        ? { client_id: cl.id, year, week, period: 'weekly' }
        : { client_id: cl.id, year, month, period: 'monthly' };
      let existsQ = supabase.from('client_satisfaction_surveys')
        .select('id, public_token, responded_at').eq('client_id', cl.id).eq('year', year).eq('period', period);
      if (period === 'weekly') existsQ = existsQ.eq('week', week);
      else existsQ = existsQ.eq('month', month);
      const { data: existing } = await existsQ.maybeSingle();

      let token: string;
      if (existing) {
        if (existing.responded_at) { skipped++; continue; }
        token = existing.public_token;
      } else {
        const { data: created, error } = await supabase
          .from('client_satisfaction_surveys')
          .insert({
            client_id: cl.id,
            year,
            week: period === 'weekly' ? week : 1,
            month: period === 'monthly' ? month : null,
            period,
            source: 'whatsapp_auto',
          })
          .select('public_token')
          .single();
        if (error || !created) { failed++; continue; }
        token = created.public_token;
      }

      const url = `${PORTAL_BASE}/nps/${token}`;
      const msg = period === 'weekly'
        ? `Olá ${cl.name}! 👋\n\nÉ a Performake. Toda segunda-feira fazemos um check-in rápido com você para garantir que tudo está fluindo bem.\n\n📝 Leva menos de 1 minuto:\n${url}\n\nSua opinião nos ajuda a entregar mais. Obrigado!`
        : `Olá ${cl.name}! ✨\n\nFechamos mais um mês juntos! Que tal nos contar como foi a sua experiência geral?\n\n📊 Pesquisa mensal (1 minuto):\n${url}\n\nSua avaliação é o nosso termômetro. Obrigado por confiar na Performake!`;

      const r = await sendWA(key, cl.phone, msg);
      await supabase.from('whatsapp_notification_log').insert({
        event_type: period === 'weekly' ? 'satisfaction_weekly' : 'satisfaction_monthly',
        client_id: cl.id,
        recipient_phone: cl.phone,
        recipient_type: 'client',
        message_preview: msg.substring(0, 200),
        status: r.ok ? 'sent' : 'failed',
        error_message: r.error,
        edge_function: 'satisfaction-auto-sender',
      });
      if (r.ok) sent++; else failed++;
      await sleep(85_000);
    }

    return new Response(JSON.stringify({ ok: true, period, sent, skipped, failed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
