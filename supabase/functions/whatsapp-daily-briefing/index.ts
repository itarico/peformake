import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const WA = 'https://www.wasenderapi.com/api';
const PORTAL = 'https://peformake.com/portal';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
const todayStr = () => new Date().toISOString().split('T')[0];
const ym = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1 }; };
const dayOfWeek = () => new Date().getDay();

const DELAY_MS = 85_000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function send(key: string, phone: string, msg: string): Promise<{ ok: boolean; error?: string }> {
  const c = phone.replace(/\D/g, '');
  if (c.length < 10) return { ok: false, error: 'phone too short' };
  try {
    const res = await fetch(`${WA}/send-message`, {
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
    await sb.from('whatsapp_notification_log').insert({
      event_type: params.event_type || 'daily_briefing',
      recipient_phone: params.phone,
      recipient_type: params.recipient_type || 'unknown',
      client_id: params.client_id || null,
      message_preview: params.message?.substring(0, 200),
      status: params.status || 'sent',
      error_message: params.error,
      edge_function: 'whatsapp-daily-briefing',
    });
  } catch (e) { console.error('Log error:', e); }
}

async function sendWithLog(key: string, phone: string, msg: string, meta: Record<string, any>) {
  const result = await send(key, phone, msg);
  await logNotification({ ...meta, phone, message: msg, status: result.ok ? 'sent' : 'failed', error: result.error });
  return result;
}

async function getKey() {
  const { data } = await sb.from('notification_email_settings')
    .select('agency_whatsapp_session, whatsapp_notifications_enabled')
    .eq('id', '00000000-0000-0000-0000-000000000001').single();
  return data?.whatsapp_notifications_enabled ? data.agency_whatsapp_session : null;
}

const SM = ["🌅 Bom dia! Hora de brilhar nas redes!", "☀️ Novo dia, novas postagens! Bora!", "🚀 Bom dia! Vamos engajar o público!", "💡 Bom dia! Conteúdo fresquinho esperando!", "🎯 Foco total nas redes hoje!", "⭐ Mais um dia para criar conteúdo incrível!", "🔥 As redes não param e nós também não!"];
const DS = ["🎨 Bom dia! Hora de criar arte!", "✨ Vamos transformar ideias em design!", "🖌️ Pincel na mão e foco total!", "💎 Dia de entregar qualidade!", "🌟 Criatividade ativada!", "🎯 Vamos fazer designs incríveis!", "🔥 Bom dia! A criação não para!"];
const AD = ["📋 Bom dia! Vamos organizar o dia!", "🏢 Estratégia e execução, vamos lá!", "💼 Liderança em ação!", "🎯 Foco nos resultados!", "⚡ Dia de fazer acontecer!", "🚀 Gestão ativa hoje!", "🧠 Bom dia! Mente estratégica ativada!"];
const TIPS = ["📞 Agende reuniões semanais com seus clientes para extrair insights", "📊 Revise as métricas de tráfego e ajuste as campanhas", "💬 Verifique os grupos de WhatsApp e dê suporte ativo", "📋 Confirme que todos os briefings estão sendo preenchidos", "🎯 Alinhe a estratégia do mês com toda a equipe", "🧠 Analise os resultados da semana e planeje melhorias", "📈 Revise o funil de vendas dos clientes no CRM"];

async function getWeekSeasonality(): Promise<string[]> {
  const { y, m } = ym();
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);
  const { data: cms } = await sb.from('consulting_months').select('id').eq('year', y).eq('month', m);
  if (!cms?.length) return [];
  const { data: dates } = await sb.from('seasonality_dates')
    .select('title, date, category')
    .in('consulting_month_id', cms.map((c: any) => c.id))
    .gte('date', todayStr())
    .lte('date', endOfWeek.toISOString().split('T')[0])
    .order('date');
  return (dates || []).map((d: any) => `📅 ${d.date.split('-').reverse().join('/')} - ${d.title}`);
}

async function briefSocialMedia(key: string) {
  const { y, m } = ym();
  const seasonality = await getWeekSeasonality();
  const { data: staff } = await sb.from('staff_members').select('id, name, phone').eq('is_active', true).eq('role', 'social_media');
  let count = 0;
  for (const s of staff || []) {
    if (!s.phone) continue;
    if (count > 0) await sleep(DELAY_MS);
    const { data: clients } = await sb.from('clients').select('id, name, portal_token').eq('social_media_staff_id', s.id).eq('is_active', true);
    if (!clients?.length) continue;
    const lines: string[] = [];
    for (const cl of clients) {
      const { data: wms } = await sb.from('work_months').select('id').eq('client_id', cl.id).eq('year', y).eq('month', m);
      const ids = (wms || []).map((w: any) => w.id);
      let line = `📌 *${cl.name}*`;
      if (ids.length) {
        const { data: todayArts } = await sb.from('arts').select('title, art_type').in('work_month_id', ids).eq('deadline_date', todayStr());
        const { count: pending } = await sb.from('arts').select('id', { count: 'exact', head: true }).in('work_month_id', ids).eq('status', 'pending_briefing');
        if (todayArts?.length) { line += '\n  📅 *Hoje:*'; todayArts.forEach((a: any) => { line += `\n  • ${a.title || 'Sem título'}${a.art_type ? ` (${a.art_type})` : ''}`; }); }
        if (pending) line += `\n  ⏳ ${pending} briefing(s) pendente(s)`;
      }
      const { data: cm } = await sb.from('consulting_months').select('monthly_focus').eq('client_id', cl.id).eq('year', y).eq('month', m).maybeSingle();
      if (cm?.monthly_focus) line += `\n  🎯 Foco: ${cm.monthly_focus}`;
      lines.push(line);
    }
    let msg = `${pick(SM)}\n\n*Seus clientes hoje:*\n\n${lines.join('\n\n')}\n\n💬 Lembre-se de dar suporte nos WhatsApps!`;
    if (seasonality.length > 0) msg += `\n\n📆 *Datas da semana:*\n${seasonality.join('\n')}`;
    msg += `\n\n_Peformake_ 🚀`;
    await sendWithLog(key, s.phone, msg, { event_type: 'daily_briefing', recipient_type: 'social_media' });
    count++;
  }
}

async function briefDesigner(key: string) {
  const { y, m } = ym();
  const { data: designers } = await sb.from('designers').select('id, name, phone').eq('is_active', true);
  let count = 0;
  for (const d of designers || []) {
    if (!d.phone) continue;
    if (count > 0) await sleep(DELAY_MS);
    const { data: clients } = await sb.from('clients').select('id, name').eq('designer_id', d.id).eq('is_active', true);
    if (!clients?.length) continue;
    let tA = 0, tP = 0, tO = 0;
    const cls: string[] = [];
    for (const cl of clients) {
      const { data: wms } = await sb.from('work_months').select('id').eq('client_id', cl.id).eq('year', y).eq('month', m);
      const ids = (wms || []).map((w: any) => w.id);
      if (!ids.length) continue;
      const { count: approved } = await sb.from('arts').select('id', { count: 'exact', head: true }).in('work_month_id', ids).eq('status', 'approved');
      const { count: prod } = await sb.from('arts').select('id', { count: 'exact', head: true }).in('work_month_id', ids).in('status', ['ready_for_production', 'in_production', 'revision_requested']);
      const { data: overdue } = await sb.from('arts').select('id').in('work_month_id', ids).not('status', 'in', '("approved","pending_briefing")').lt('deadline_date', todayStr());
      tA += approved || 0; tP += prod || 0; tO += overdue?.length || 0;
      cls.push(`• ${cl.name}: ✅${approved || 0} | 🔨${prod || 0}${overdue?.length ? ` | ⚠️${overdue.length} atrasadas` : ''}`);
    }
    await sendWithLog(key, d.phone, `${pick(DS)}\n\n*📊 Resumo do mês:*\n✅ Aprovadas: ${tA}\n🔨 Em produção: ${tP}${tO > 0 ? `\n⚠️ Atrasadas: ${tO}` : ''}\n\n*Clientes:*\n${cls.join('\n')}\n\n_Peformake_ 🎨`, { event_type: 'daily_briefing', recipient_type: 'designer' });
    count++;
  }
}

async function briefAdmin(key: string) {
  const { y, m } = ym();
  const seasonality = await getWeekSeasonality();
  const { data: staff } = await sb.from('staff_members').select('id, name, phone').eq('is_active', true).eq('role', 'admin');
  const { count: pendBrief } = await sb.from('arts').select('id', { count: 'exact', head: true }).eq('status', 'pending_briefing');
  const { count: awaitAppr } = await sb.from('arts').select('id', { count: 'exact', head: true }).eq('status', 'awaiting_approval');
  const { data: noPlan } = await sb.from('work_months').select('id').eq('year', y).eq('month', m).eq('is_planning_complete', false);
  let count = 0;
  for (const s of staff || []) {
    if (!s.phone) continue;
    if (count > 0) await sleep(DELAY_MS);
    let stats = '*📊 Painel rápido:*';
    if (pendBrief) stats += `\n📝 ${pendBrief} briefings pendentes`;
    if (awaitAppr) stats += `\n🎨 ${awaitAppr} artes aguardando aprovação`;
    if (noPlan?.length) stats += `\n⚠️ ${noPlan.length} clientes sem planejamento`;
    let msg = `${pick(AD)}\n\n${stats}\n\n*💡 Dica do dia:*\n${pick(TIPS)}\n\n💬 Suporte ativo nos WhatsApps!`;
    if (seasonality.length > 0) msg += `\n\n📆 *Datas comemorativas da semana:*\n${seasonality.join('\n')}`;
    msg += `\n\n_Peformake_ 💼`;
    await sendWithLog(key, s.phone, msg, { event_type: 'daily_briefing', recipient_type: 'admin' });
    count++;
  }
}

// ============ CLIENT BRIEFING — NOW USES daily_briefing_configs ============
async function briefClients(key: string) {
  const dow = dayOfWeek(); // 0=Sun ... 6=Sat
  const isMonday = dow === 1;

  // Get all active clients with phone
  const { data: clients } = await sb.from('clients')
    .select('id, name, phone, portal_token')
    .eq('is_active', true)
    .not('phone', 'is', null);

  if (!clients?.length) return;

  // Get per-client configs
  const { data: configs } = await sb.from('daily_briefing_configs').select('*');
  const configMap = new Map<string, any>();
  for (const c of configs || []) configMap.set(c.client_id, c);

  // Also check excluded_client_ids from notification_email_settings
  const { data: settings } = await sb.from('notification_email_settings')
    .select('excluded_client_ids')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();
  const excludedIds: string[] = (settings as any)?.excluded_client_ids || [];

  let count = 0;
  for (const cl of clients) {
    if (!cl.phone) continue;

    // Check excluded
    if (excludedIds.includes(cl.id)) {
      console.log(`[briefClients] ${cl.name} excluded via settings`);
      continue;
    }

    const cfg = configMap.get(cl.id);

    // Check if disabled
    if (cfg && cfg.is_enabled === false) {
      console.log(`[briefClients] ${cl.name} disabled via config`);
      continue;
    }

    // Check frequency
    const frequency = cfg?.frequency || 'weekdays';
    const customDays: number[] = cfg?.custom_days || [1, 2, 3, 4, 5];

    let shouldSend = false;
    switch (frequency) {
      case 'daily':
        shouldSend = true;
        break;
      case 'weekdays':
        shouldSend = dow >= 1 && dow <= 5;
        break;
      case 'monday_only':
        shouldSend = dow === 1;
        break;
      case 'custom':
        shouldSend = customDays.includes(dow);
        break;
      case 'disabled':
        shouldSend = false;
        break;
      default:
        shouldSend = dow >= 1 && dow <= 5;
    }

    if (!shouldSend) {
      console.log(`[briefClients] ${cl.name} skipped (frequency=${frequency}, dow=${dow})`);
      continue;
    }

    if (count > 0) await sleep(DELAY_MS);

    // Build message from config or defaults
    let msg: string;
    const portalLink = `${PORTAL}/${cl.portal_token}`;

    if (isMonday && cfg?.monday_message_template) {
      msg = cfg.monday_message_template
        .replace(/\{portal_link\}/g, portalLink)
        .replace(/\{client_name\}/g, cl.name);
    } else if (cfg?.message_template) {
      msg = cfg.message_template
        .replace(/\{portal_link\}/g, portalLink)
        .replace(/\{client_name\}/g, cl.name);
    } else {
      // Legacy default
      if (isMonday) {
        msg = `☀️ Bom dia e boa semana! Acesse seu portal para acompanhar tudo:\n\n📱 ${portalLink}\n\nPara dúvidas ou solicitações, a equipe está sempre à disposição no grupo do WhatsApp! 💬\n\n_Peformake_ 💜`;
      } else {
        msg = `☀️ Bom dia! A equipe Peformake está a postos!\n\nPara qualquer dúvida ou solicitação, chame no grupo do WhatsApp que a equipe responde rapidinho! 💬\n\n_Peformake_ 💜`;
      }
    }

    // Add signature if not already present
    if (!msg.includes('Peformake')) msg += '\n\n_Peformake_ 💜';

    await sendWithLog(key, cl.phone, msg, { event_type: 'daily_briefing', recipient_type: 'client', client_id: cl.id });
    count++;
  }

  console.log(`[briefClients] Sent to ${count} clients`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const key = await getKey();
    if (!key) return new Response(JSON.stringify({ skipped: true, reason: 'wa disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const body = await req.json().catch(() => ({}));
    const type = body.type || 'all';
    
    console.log(`Daily briefing started: type=${type}`);
    
    if (type === 'all' || type === 'social_media') await briefSocialMedia(key);
    if (type === 'all' || type === 'designer') await briefDesigner(key);
    if (type === 'all' || type === 'admin') await briefAdmin(key);
    if (type === 'all' || type === 'client') await briefClients(key);
    
    console.log(`Daily briefing completed: type=${type}`);
    
    return new Response(JSON.stringify({ ok: true, type }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Daily briefing error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
