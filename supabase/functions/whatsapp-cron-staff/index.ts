import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const WASENDER_BASE = 'https://www.wasenderapi.com/api';
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
      recipient_type: params.recipient_type || 'staff',
      client_id: params.client_id || null,
      message_preview: params.message?.substring(0, 200),
      status: params.status || 'sent',
      error_message: params.error,
      edge_function: 'whatsapp-cron-staff',
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

async function dailyOverdue(key: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data: arts } = await supabase.from('arts')
    .select('art_number, title, deadline_date, status, work_months!inner(clients!inner(name, designer_id, social_media_staff_id))')
    .lt('deadline_date', today).not('status', 'in', '("approved","pending_briefing")');
  if (!arts?.length) return;

  const byDesigner: Record<string, any[]> = {};
  const bySM: Record<string, any[]> = {};
  for (const a of arts) {
    const cl = (a as any).work_months.clients;
    if (cl.designer_id) { byDesigner[cl.designer_id] = byDesigner[cl.designer_id] || []; byDesigner[cl.designer_id].push(a); }
    if (cl.social_media_staff_id) { bySM[cl.social_media_staff_id] = bySM[cl.social_media_staff_id] || []; bySM[cl.social_media_staff_id].push(a); }
  }
  
  let count = 0;
  for (const [id, list] of Object.entries(byDesigner)) {
    if (count > 0) await sleep(DELAY_MS);
    const { data: d } = await supabase.from('designers').select('phone').eq('id', id).single();
    if (!d?.phone) continue;
    const lines = list.slice(0, 8).map((a: any) => `• ${a.work_months.clients.name} - "${a.title || `Arte #${a.art_number}`}" (prazo: ${a.deadline_date})`);
    await sendAndLog(key, d.phone, `⚠️ *${list.length} arte(s) atrasada(s)*\n\n${lines.join('\n')}`, { event_type: 'daily_overdue', recipient_type: 'designer' });
    count++;
  }
  for (const [id, list] of Object.entries(bySM)) {
    if (count > 0) await sleep(DELAY_MS);
    const { data: s } = await supabase.from('staff_members').select('phone').eq('id', id).single();
    if (!s?.phone) continue;
    const lines = list.slice(0, 8).map((a: any) => `• ${a.work_months.clients.name} - "${a.title || `Arte #${a.art_number}`}"`);
    await sendAndLog(key, s.phone, `⚠️ *${list.length} arte(s) atrasada(s) nos seus clientes*\n\n${lines.join('\n')}`, { event_type: 'daily_overdue', recipient_type: 'social_media' });
    count++;
  }
}

async function day15Social(key: string) {
  const now = new Date();
  let nextM = now.getMonth() + 2, nextY = now.getFullYear();
  if (nextM > 12) { nextM -= 12; nextY++; }
  const mn = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const { data: clients } = await supabase.from('clients')
    .select('name, social_media_staff_id, arts_per_month').eq('is_active', true).eq('has_design_service', true).not('social_media_staff_id', 'is', null);
  const bySM: Record<string, any[]> = {};
  for (const cl of clients || []) {
    if (!cl.social_media_staff_id) continue;
    bySM[cl.social_media_staff_id] = bySM[cl.social_media_staff_id] || [];
    bySM[cl.social_media_staff_id].push(cl);
  }
  let count = 0;
  for (const [smId, cls] of Object.entries(bySM)) {
    if (count > 0) await sleep(DELAY_MS);
    const { data: sm } = await supabase.from('staff_members').select('phone, name').eq('id', smId).single();
    if (!sm?.phone) continue;
    const lines = cls.map((c: any) => `• ${c.name} (${c.arts_per_month} artes)`);
    await sendAndLog(key, sm.phone, `📅 *Planejamento ${mn[nextM - 1]}/${nextY}*\n\nClientes que precisam de planejamento e briefing:\n\n${lines.join('\n')}\n\nElabore o plano e os briefings.`, { event_type: 'day15_social', recipient_type: 'social_media' });
    count++;
  }
}

async function monthEndDesigner(key: string) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const { data: designers } = await supabase.from('designers').select('id, name, phone, cost_per_art').eq('is_active', true);
  let count = 0;
  for (const d of designers || []) {
    if (!d.phone) continue;
    if (count > 0) await sleep(DELAY_MS);
    const { data: myClients } = await supabase.from('clients').select('id').eq('designer_id', d.id).eq('is_active', true);
    if (!myClients?.length) continue;
    const cids = myClients.map((c: any) => c.id);
    const { data: wms } = await supabase.from('work_months').select('id').eq('year', y).eq('month', m).in('client_id', cids);
    if (!wms?.length) continue;
    const wmIds = wms.map((w: any) => w.id);
    const { count: total } = await supabase.from('arts').select('id', { count: 'exact', head: true }).eq('status', 'approved').in('work_month_id', wmIds);
    const value = (total || 0) * (d.cost_per_art || 0);
    await sendAndLog(key, d.phone, `💰 *Resumo do Mês*\n\n✅ Artes aprovadas: ${total || 0}\n💵 Valor: R$ ${value.toFixed(2)}\n\nObrigado pelo trabalho! 🎨`, { event_type: 'month_end_designer', recipient_type: 'designer' });
    count++;
  }
}

async function monthStartCheck(key: string) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const { data: wms } = await supabase.from('work_months')
    .select('client_id, is_planning_complete, clients!inner(name, social_media_staff_id)')
    .eq('year', y).eq('month', m).eq('is_planning_complete', false);
  const bySM: Record<string, string[]> = {};
  for (const wm of wms || []) {
    const smId = (wm as any).clients.social_media_staff_id;
    if (!smId) continue;
    bySM[smId] = bySM[smId] || [];
    bySM[smId].push((wm as any).clients.name);
  }
  let count = 0;
  for (const [smId, names] of Object.entries(bySM)) {
    if (count > 0) await sleep(DELAY_MS);
    const { data: sm } = await supabase.from('staff_members').select('phone').eq('id', smId).single();
    if (!sm?.phone) continue;
    await sendAndLog(key, sm.phone, `🚨 *Planejamento atrasado!*\n\nClientes sem planejamento pronto este mês:\n\n${names.map(n => `• ${n}`).join('\n')}\n\nPriorize a finalização.`, { event_type: 'month_start_check', recipient_type: 'social_media' });
    count++;
  }
}

async function weeklySeasonality(key: string) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7);
  const todayS = now.toISOString().split('T')[0];
  const endS = endOfWeek.toISOString().split('T')[0];

  const { data: cms } = await supabase.from('consulting_months').select('id, client_id, clients!inner(name)').eq('year', y).eq('month', m);
  if (!cms?.length) return;

  const cmIds = cms.map((c: any) => c.id);
  const { data: dates } = await supabase.from('seasonality_dates')
    .select('title, date, consulting_month_id')
    .in('consulting_month_id', cmIds)
    .gte('date', todayS)
    .lte('date', endS)
    .order('date');

  if (!dates?.length) return;

  const cmMap: Record<string, string> = {};
  cms.forEach((c: any) => { cmMap[c.id] = c.clients.name; });

  const lines = dates.map((d: any) => `📅 ${d.date.split('-').reverse().join('/')} - ${d.title} (${cmMap[d.consulting_month_id] || ''})`);
  const msg = `📆 *Datas comemorativas da semana:*\n\n${lines.join('\n')}\n\nAproveite para criar conteúdo relevante! 🎯\n\n_Peformake_ 🚀`;

  const { data: smStaff } = await supabase.from('staff_members').select('phone').eq('is_active', true).eq('role', 'social_media').not('phone', 'is', null);
  const { data: adminStaff } = await supabase.from('staff_members').select('phone').eq('is_active', true).eq('role', 'admin').not('phone', 'is', null);
  const allStaff = [...(smStaff || []), ...(adminStaff || [])];
  
  let count = 0;
  for (const s of allStaff) {
    if (!s.phone) continue;
    if (count > 0) await sleep(DELAY_MS);
    await sendAndLog(key, s.phone, msg, { event_type: 'weekly_seasonality', recipient_type: 'staff' });
    count++;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type || 'daily_overdue';
    const key = await getSession();
    if (!key) return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    console.log(`Cron staff started: type=${type}`);
    if (type === 'daily_overdue') await dailyOverdue(key);
    else if (type === 'day15_social') await day15Social(key);
    else if (type === 'month_end_designer') await monthEndDesigner(key);
    else if (type === 'month_start_check') await monthStartCheck(key);
    else if (type === 'weekly_seasonality') await weeklySeasonality(key);
    console.log(`Cron staff completed: type=${type}`);

    return new Response(JSON.stringify({ ok: true, type }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Cron staff error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
