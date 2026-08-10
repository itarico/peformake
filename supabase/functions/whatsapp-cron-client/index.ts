import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const WASENDER_BASE = 'https://www.wasenderapi.com/api';
const PORTAL_BASE = 'https://peformake.com/portal';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const DELAY_MS = 85_000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function sendWA(key: string, phone: string, msg: string): Promise<{ ok: boolean; error?: string }> {
  const c = phone.replace(/\D/g, '');
  if (c.length < 10) return { ok: false, error: 'phone too short' };
  try {
    const res = await fetch(`${WASENDER_BASE}/send-message`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: c.startsWith('55') ? c : `55${c}`, type: 'text', text: msg }),
    });
    const data = await res.json();
    if (!res.ok) { console.error('WA error:', data); return { ok: false, error: JSON.stringify(data) }; }
    return { ok: true };
  } catch (err) { return { ok: false, error: String(err) }; }
}

async function logNotification(params: Record<string, any>) {
  try {
    await supabase.from('whatsapp_notification_log').insert({
      event_type: params.event_type,
      recipient_phone: params.phone,
      recipient_type: 'client',
      client_id: params.client_id || null,
      message_preview: params.message?.substring(0, 200),
      status: params.status || 'sent',
      error_message: params.error,
      edge_function: 'whatsapp-cron-client',
    });
  } catch (e) { console.error('Log error:', e); }
}

async function sendAndLog(key: string, phone: string, msg: string, meta: Record<string, any>) {
  const result = await sendWA(key, phone, msg);
  await logNotification({ ...meta, phone, message: msg, status: result.ok ? 'sent' : 'failed', error: result.error });
  return result;
}

async function getSession() {
  const { data } = await supabase.from('notification_email_settings')
    .select('agency_whatsapp_session, whatsapp_notifications_enabled')
    .eq('id', '00000000-0000-0000-0000-000000000001').single();
  return data?.whatsapp_notifications_enabled ? data.agency_whatsapp_session : null;
}

async function fridayTraffic(key: string) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;

  const { data: cs } = await supabase.from('client_services')
    .select('client_id, clients!inner(name, phone, portal_token, is_active), services!inner(slug)')
    .eq('is_active', true).eq('services.slug', 'trafego');

  let count = 0;
  for (const row of (cs || []).filter((x: any) => x.clients?.is_active && x.clients?.phone)) {
    if (count > 0) await sleep(DELAY_MS);
    const cl = (row as any).clients;
    const { data: camps } = await supabase.from('traffic_campaigns')
      .select('investment, impressions, clicks, reach, leads')
      .eq('client_id', row.client_id).eq('year', y).eq('month', m);
    if (!camps?.length) continue;

    const t = camps.reduce((a: any, r: any) => ({
      inv: a.inv + Number(r.investment || 0),
      imp: a.imp + Number(r.impressions || 0),
      clk: a.clk + Number(r.clicks || 0),
      rch: a.rch + Number(r.reach || 0),
      lds: a.lds + Number(r.leads || 0),
    }), { inv: 0, imp: 0, clk: 0, rch: 0, lds: 0 });

    const msg = `📊 *Resumo Semanal - Tráfego*\n*${cl.name}*\n\n💰 Investido: R$ ${t.inv.toFixed(2)}\n👁️ Impressões: ${t.imp.toLocaleString('pt-BR')}\n🖱️ Cliques: ${t.clk.toLocaleString('pt-BR')}\n📍 Alcance: ${t.rch.toLocaleString('pt-BR')}\n📋 Leads: ${t.lds}\n\n🔗 Veja detalhes no portal:\n${PORTAL_BASE}/${cl.portal_token}`;
    await sendAndLog(key, cl.phone, msg, { event_type: 'friday_traffic', client_id: row.client_id });
    count++;
  }
}

async function day15Client(key: string) {
  const now = new Date();
  let nextMonth = now.getMonth() + 2, nextYear = now.getFullYear();
  if (nextMonth > 12) { nextMonth -= 12; nextYear++; }
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const { data: clients } = await supabase.from('clients')
    .select('id, name, phone, portal_token').eq('is_active', true).not('phone', 'is', null);

  let count = 0;
  for (const cl of clients || []) {
    if (!cl.phone) continue;
    if (count > 0) await sleep(DELAY_MS);
    const msg = `📅 *Planejamento ${monthNames[nextMonth - 1]}*\n\nOlá! Precisamos definir juntos o conteúdo do próximo mês.\n\n📝 Acesse o portal e nos diga o que gostaria de abordar:\n${PORTAL_BASE}/${cl.portal_token}\n\nContamos com você! 🚀`;
    await sendAndLog(key, cl.phone, msg, { event_type: 'day15_client', client_id: cl.id });
    count++;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type || 'friday_traffic';
    const key = await getSession();
    if (!key) return new Response(JSON.stringify({ skipped: true, reason: 'wa disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    console.log(`Cron client started: type=${type}`);
    if (type === 'friday_traffic') await fridayTraffic(key);
    else if (type === 'day15_client') await day15Client(key);
    console.log(`Cron client completed: type=${type}`);

    return new Response(JSON.stringify({ ok: true, type }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Cron client error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
