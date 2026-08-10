import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const DAY = 24 * 60 * 60 * 1000;

interface Pending {
  clientId: string;
  clientName: string;
  serviceType: string;
  label: string;
  dueDate: Date;
}

const LABELS: Record<string, string> = {
  design: 'Artes do mês',
  traffic_plan: 'Planejamento da campanha',
  traffic_report: 'Relatório de tráfego do mês anterior',
  av_script: 'Roteiro do audiovisual',
  av_shoot: 'Agendamento da captação',
  av_delivery: 'Entrega dos vídeos editados',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    // Período alvo: mês corrente (as cobranças começam no dia 15 do mês anterior)
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const nextPeriod = new Date(year, month, 1);
    const nextYear = nextPeriod.getFullYear();
    const nextMonth = nextPeriod.getMonth() + 1;

    const [{ data: clients }, { data: services }, { data: avProjects }, { data: rows }] = await Promise.all([
      supabase.from('clients').select('id, name, is_active, arts_per_month, has_audiovisual_service').eq('is_active', true),
      supabase.from('client_services').select('client_id, quantity, is_active, services(slug)'),
      supabase.from('audiovisual_projects').select('*').in('year', [year, nextYear]),
      supabase.from('operation_deliverables').select('*').in('year', [year, nextYear]),
    ]);

    const pending: Pending[] = [];

    for (const c of clients || []) {
      const svc = (services || []).filter((s: any) => s.client_id === c.id && s.is_active !== false);
      const slugs = svc.map((s: any) => s.services?.slug);
      const hasTraffic = slugs.includes('trafego');
      const hasAv = slugs.some((s: string) => ['producao_audiovisual', 'captacao', 'edicao'].includes(s)) || c.has_audiovisual_service;

      const rowFor = (type: string, y: number, m: number) =>
        (rows || []).find((r: any) => r.client_id === c.id && r.service_type === type && r.year === y && r.month === m);

      // Dia 15: cobrança das entregas do mês seguinte
      if (now.getDate() >= 15) {
        const due = new Date(year, month - 1, 15);
        if (hasTraffic && !rowFor('traffic_plan', nextYear, nextMonth)?.asset_url) {
          pending.push({ clientId: c.id, clientName: c.name, serviceType: 'traffic_plan', label: LABELS.traffic_plan, dueDate: due });
        }
        if (hasAv) {
          const proj = (avProjects || []).filter((p: any) => p.year === nextYear && p.month === nextMonth && p.client_id === c.id);
          if (proj.length === 0 || proj.some((p: any) => !p.shoot_date)) {
            pending.push({ clientId: c.id, clientName: c.name, serviceType: 'av_shoot', label: LABELS.av_shoot, dueDate: due });
          }
          if (proj.some((p: any) => !p.script)) {
            pending.push({ clientId: c.id, clientName: c.name, serviceType: 'av_script', label: LABELS.av_script, dueDate: due });
          }
        }
      }

      // Dia 1 a 5: relatório de tráfego do mês anterior
      if (hasTraffic && now.getDate() <= 5 && !rowFor('traffic_report', year, month)?.asset_url) {
        pending.push({ clientId: c.id, clientName: c.name, serviceType: 'traffic_report', label: LABELS.traffic_report, dueDate: new Date(year, month - 1, 1) });
      }

      // Após a captação: cobrar os vídeos editados
      if (hasAv) {
        const shot = (avProjects || []).filter(
          (p: any) => p.client_id === c.id && p.shoot_date && new Date(p.shoot_date).getTime() < now.getTime() && !p.finished_assets_url
        );
        for (const p of shot) {
          pending.push({
            clientId: c.id,
            clientName: c.name,
            serviceType: 'av_delivery',
            label: LABELS.av_delivery,
            dueDate: new Date(new Date(p.shoot_date).getTime() + 5 * DAY),
          });
        }
      }
    }

    // Notificações internas (sino), evitando duplicidade no mesmo dia
    const todayStart = new Date(year, now.getMonth(), now.getDate()).toISOString();
    const { data: existing } = await supabase
      .from('notifications')
      .select('id, title, client_id')
      .gte('created_at', todayStart)
      .eq('type', 'operation_deliverable');

    const inserts = pending
      .filter(p => !(existing || []).some((e: any) => e.client_id === p.clientId && e.title === p.label))
      .map(p => ({
        client_id: null,
        title: p.label,
        message: `${p.clientName}: ${p.label} pendente (prazo ${p.dueDate.toLocaleDateString('pt-BR')}).`,
        type: 'operation_deliverable',
        link: '/operation?tab=general&sub=progress',
        is_read: false,
      }));

    if (inserts.length > 0) {
      const { error } = await supabase.from('notifications').insert(inserts);
      if (error) console.error('Erro ao inserir notificações:', error.message);
    }

    return new Response(
      JSON.stringify({ ok: true, pending: pending.length, notified: inserts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('operation-deliverables-cron error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
