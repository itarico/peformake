// Playbook Journey Scheduler — cron diário
// Marca etapas como overdue, garante reuniões mensais e cria notificações
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const summary: any = { overdue_marked: 0, monthly_created: 0, quarterly_created: 0, notifications: 0 };

  try {
    // 1) Marcar etapas atrasadas (scheduled_at < now e ainda pending/in_progress)
    const { data: pendingStages } = await supabase
      .from('client_journey_stages')
      .select('id')
      .in('status', ['pending', 'in_progress'])
      .lt('scheduled_at', now.toISOString());

    if (pendingStages?.length) {
      await supabase.from('client_journey_stages')
        .update({ status: 'overdue' })
        .in('id', pendingStages.map(s => s.id));
      summary.overdue_marked = pendingStages.length;
    }

    // 2) Garantir Reunião Mensal do mês corrente para cada cliente ativo
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: activeClients } = await supabase
      .from('clients').select('id').eq('is_active', true);

    for (const c of activeClients || []) {
      const { data: existingMonthly } = await supabase
        .from('client_journey_meetings')
        .select('id')
        .eq('client_id', c.id)
        .eq('meeting_type', 'monthly')
        .gte('scheduled_at', monthStart)
        .maybeSingle();

      if (!existingMonthly) {
        // não cria automaticamente — apenas re-agenda a etapa pendente
        await supabase.from('client_journey_stages')
          .update({ status: 'pending', scheduled_at: now.toISOString() })
          .eq('client_id', c.id)
          .eq('stage_key', 'monthly_meeting')
          .neq('status', 'completed');
      }
    }

    // 3) Notificar admins sobre etapas atrasadas críticas
    if (summary.overdue_marked > 0) {
      const { data: admins } = await supabase
        .from('user_roles').select('user_id').eq('role', 'admin');
      for (const a of admins || []) {
        await supabase.from('notifications').insert({
          user_id: a.user_id,
          title: '⚠️ Playbook: etapas atrasadas',
          message: `${summary.overdue_marked} etapas da jornada estão atrasadas. Acesse /playbook.`,
          type: 'overdue_alert',
          link: '/playbook',
        });
        summary.notifications++;
      }
    }

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
