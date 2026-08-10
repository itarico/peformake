import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * staff-goals-tracker
 * Reads all assigned goals for the current month and computes current_value
 * from real data sources, then upserts back into staff_assigned_goals.
 *
 * Uses template.name as the stable switch key (set during the catalog reset migration).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const year: number = body.year ?? now.getFullYear();
    const month: number = body.month ?? now.getMonth() + 1;

    const monthStart = new Date(year, month - 1, 1).toISOString();
    const monthEnd = new Date(year, month, 1).toISOString();

    // Load goals + template
    const { data: goals, error: goalsErr } = await supabase
      .from("staff_assigned_goals")
      .select("id, staff_id, current_value, status, custom_target_value, template:staff_goal_templates(id,name,target_value,min_threshold,improvement_direction,tracking_method)")
      .eq("year", year)
      .eq("month", month);

    if (goalsErr) throw goalsErr;
    if (!goals?.length) {
      return new Response(JSON.stringify({ message: "Nenhuma meta atribuída neste mês.", year, month }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const g of goals) {
      const tpl: any = g.template;
      if (!tpl) continue;
      if (tpl.tracking_method !== "automatic") continue; // skip manual goals

      let value: number | null = null;
      let note = "";

      try {
        switch (tpl.name) {
          // === DESIGNER ===
          case "Volume de Artes": {
            // Conta artes que foram ENTREGUES (status awaiting_approval, approved) no mês
            // e que pertencem a este designer (via designer_id direto na arte ou via cliente)
            const { count } = await supabase
              .from("arts").select("id, work_months!inner(client_id, clients!inner(designer_id))", { count: "exact", head: true })
              .or(`designer_id.eq.${g.staff_id},work_months.clients.designer_id.eq.${g.staff_id}`)
              .in("status", ["awaiting_approval", "approved"])
              .is("deleted_at", null)
              .gte("updated_at", monthStart).lt("updated_at", monthEnd);
            value = count ?? 0;
            break;
          }
          case "Tempo de Entrega":
          case "SLA de Entrega": {
            // Calcula a média de tempo entre briefing_completed_at e a PRIMEIRA entrega (awaiting_approval)
            // filtrando apenas artes onde este designer é o responsável
            const { data } = await supabase
              .from("arts")
              .select(`
                id, 
                briefing_completed_at, 
                designer_id,
                work_months!inner(client_id, clients!inner(designer_id)),
                art_status_history (
                  created_at,
                  status
                )
              `)
              .or(`designer_id.eq.${g.staff_id},work_months.clients.designer_id.eq.${g.staff_id}`)
              .is("deleted_at", null)
              .not("briefing_completed_at", "is", null);

            const hours = (data ?? []).map((a: any) => {
              const histories = a.art_status_history || [];
              // Pega o primeiro momento que a arte foi enviada para aprovação
              const firstAwaitingApproval = histories
                .filter((h: any) => h.status === "awaiting_approval")
                .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

              if (!firstAwaitingApproval) return null;

              const briefingDate = new Date(a.briefing_completed_at);
              const deliveryDate = new Date(firstAwaitingApproval.created_at);
              
              // Considera apenas entregas feitas no mês de referência
              if (deliveryDate < new Date(monthStart) || deliveryDate >= new Date(monthEnd)) {
                return null;
              }

              const diff = (deliveryDate.getTime() - briefingDate.getTime()) / 36e5;
              return Math.max(0, diff);
            }).filter((h: any) => h !== null) as number[];

            value = hours.length ? hours.reduce((s, h) => s + h, 0) / hours.length : 0;
            break;
          }
          case "Taxa de Aprovação": {
            const { data: arts } = await supabase
              .from("arts").select("id, status, briefing_completed_at")
              .eq("designer_id", g.staff_id)
              .is("deleted_at", null)
              .in("status", ["awaiting_approval", "approved", "revision_requested"])
              // Filter by arts that reached a reviewable status in this month
              .gte("updated_at", monthStart).lt("updated_at", monthEnd);
            const total = arts?.length ?? 0;
            const approved = arts?.filter((a: any) => a.status === "approved").length ?? 0;
            value = total > 0 ? (approved / total) * 100 : 0;
            break;
          }
          case "Revisões por Arte": {
            const { data: arts } = await supabase
              .from("arts").select("id")
              .eq("designer_id", g.staff_id)
              .is("deleted_at", null)
              .gte("updated_at", monthStart).lt("updated_at", monthEnd);
            const ids = (arts ?? []).map((a: any) => a.id);
            if (ids.length) {
              const { count } = await supabase
                .from("art_comments").select("id", { count: "exact", head: true })
                .in("art_id", ids).eq("action", "request_revision");
              value = (count ?? 0) / ids.length;
            } else value = 0;
            break;
          }

          // === SOCIAL MEDIA ===
          case "Briefings Preenchidos": {
            const { data: arts } = await supabase
              .from("arts").select("id, briefing_completed_at, work_months!inner(year, month, clients!inner(social_media_staff_id))")
              .eq("work_months.clients.social_media_staff_id", g.staff_id)
              .eq("work_months.year", year).eq("work_months.month", month);
            const total = arts?.length ?? 0;
            const filled = arts?.filter((a: any) => a.briefing_completed_at).length ?? 0;
            value = total > 0 ? (filled / total) * 100 : 0;
            break;
          }
          case "Posts no Feed": {
            const { count } = await supabase
              .from("arts").select("id, work_months!inner(year, month, clients!inner(social_media_staff_id))", { count: "exact", head: true })
              .eq("work_months.clients.social_media_staff_id", g.staff_id)
              .eq("status", "approved")
              .in("art_type", ["post_instagram", "carrossel"])
              .eq("work_months.year", year).eq("work_months.month", month);
            value = count ?? 0;
            break;
          }
          case "Stories por Cliente": {
            // Note: The user mentioned stories are manual now, 
            // but for "Stories por Cliente" (Average) we might still want to track via approved arts
            // If the user wants it manual, they should change tracking_method to manual.
            // For now, keeping the logic but ensuring it's clear.
            const { data: clients } = await supabase
              .from("clients")
              .select("id")
              .eq("social_media_staff_id", g.staff_id)
              .eq("is_active", true);
            
            const clientIds = clients?.map(c => c.id) || [];
            if (clientIds.length > 0) {
              const { count } = await supabase
                .from("arts")
                .select("id", { count: "exact", head: true })
                .eq("art_type", "story")
                .eq("status", "approved")
                .in("work_months.client_id", clientIds)
                .eq("work_months.year", year)
                .eq("work_months.month", month);
              
              value = (count ?? 0) / clientIds.length;
            } else {
              value = 0;
            }
            break;
          }
          case "Planejamento Mensal Concluído": {
            const { data } = await supabase
              .from("work_months").select("is_planning_complete, clients!inner(social_media_staff_id)")
              .eq("clients.social_media_staff_id", g.staff_id)
              .eq("year", year).eq("month", month);
            const total = data?.length ?? 0;
            const done = data?.filter((w: any) => w.is_planning_complete).length ?? 0;
            value = total > 0 ? (done / total) * 100 : 0;
            break;
          }

          // === SDR (filter by staff_id) ===
          case "Leads Captados": {
            const { count } = await supabase
              .from("sdr_leads").select("id", { count: "exact", head: true })
              .eq("sdr_staff_id", g.staff_id)
              .gte("created_at", monthStart).lt("created_at", monthEnd);
            value = count ?? 0;
            break;
          }
          case "Reuniões Agendadas": {
            const { count } = await supabase
              .from("sdr_leads").select("id", { count: "exact", head: true })
              .eq("sdr_staff_id", g.staff_id)
              .in("status", ["meeting_scheduled", "meeting_done", "won"])
              .gte("updated_at", monthStart).lt("updated_at", monthEnd);
            value = count ?? 0;
            break;
          }
          case "Taxa de Conversão Lead→Reunião": {
            const { data } = await supabase
              .from("sdr_leads").select("status")
              .eq("sdr_staff_id", g.staff_id)
              .gte("created_at", monthStart).lt("created_at", monthEnd);
            const total = data?.length ?? 0;
            const meetings = data?.filter((l: any) => ["meeting_scheduled", "meeting_done", "won"].includes(l.status)).length ?? 0;
            value = total > 0 ? (meetings / total) * 100 : 0;
            break;
          }

          // === CLOSER ===
          case "Vendas Fechadas": {
            const { count } = await supabase
              .from("clients").select("id", { count: "exact", head: true })
              .eq("closer_id", g.staff_id)
              .gte("created_at", monthStart).lt("created_at", monthEnd);
            value = count ?? 0;
            break;
          }
          case "Faturamento Gerado": {
            const { data } = await supabase
              .from("sdr_leads").select("won_value, clients!inner(closer_id)")
              .eq("status", "won")
              .eq("clients.closer_id", g.staff_id)
              .gte("updated_at", monthStart).lt("updated_at", monthEnd);
            value = (data ?? []).reduce((s: number, r: any) => s + (Number(r.won_value) || 0), 0);
            break;
          }

          // === VIDEOMAKER ===
          case "Captações Realizadas": {
            const { count } = await supabase
              .from("audiovisual_projects").select("id", { count: "exact", head: true })
              .eq("videographer_id", g.staff_id)
              .not("raw_video_added_at", "is", null)
              .gte("raw_video_added_at", monthStart).lt("raw_video_added_at", monthEnd);
            value = count ?? 0;
            break;
          }

          // === EDITOR ===
          case "Vídeos Finalizados": {
            const { data } = await supabase
              .from("audiovisual_projects").select("video_count")
              .eq("editor_id", g.staff_id)
              .in("status", ["approved", "published"])
              .gte("completed_at", monthStart).lt("completed_at", monthEnd);
            value = (data ?? []).reduce((s: number, r: any) => s + (Number(r.video_count) || 1), 0);
            break;
          }
          case "Clientes Ativos (Editor)": {
            // Conta quantos clientes tiveram pelo menos um projeto audiovisual finalizado pelo editor no mês
            const { data: projects } = await supabase
              .from("audiovisual_projects")
              .select("client_id")
              .eq("editor_id", g.staff_id)
              .in("status", ["approved", "published"])
              .gte("completed_at", monthStart).lt("completed_at", monthEnd);
            
            const uniqueClients = new Set((projects ?? []).map(p => p.client_id));
            value = uniqueClients.size;
            break;
          }
          case "Tempo Médio de Edição": {
            const { data } = await supabase
              .from("audiovisual_projects").select("editing_started_at, editing_completed_at")
              .eq("editor_id", g.staff_id)
              .not("editing_completed_at", "is", null)
              .gte("editing_completed_at", monthStart).lt("editing_completed_at", monthEnd);
            const hrs = (data ?? [])
              .filter((r: any) => r.editing_started_at)
              .map((r: any) => (new Date(r.editing_completed_at).getTime() - new Date(r.editing_started_at).getTime()) / 36e5);
            value = hrs.length ? hrs.reduce((s, h) => s + h, 0) / hrs.length : 0;
            break;
          }
          case "Qualidade da Edição": {
            const { data } = await supabase
              .from("audiovisual_projects").select("revisions")
              .eq("editor_id", g.staff_id)
              .in("status", ["approved", "published"])
              .gte("completed_at", monthStart).lt("completed_at", monthEnd);
            const total = data?.length ?? 0;
            const clean = data?.filter((r: any) => (Number(r.revisions) || 0) === 0).length ?? 0;
            value = total > 0 ? (clean / total) * 100 : 0;
            break;
          }

          // === ADMIN / LEADER ===
          case "Reuniões com Clientes": {
            const { count } = await supabase
              .from("client_management_actions").select("id", { count: "exact", head: true })
              .eq("staff_id", g.staff_id).eq("action_type", "meeting")
              .gte("created_at", monthStart).lt("created_at", monthEnd);
            value = count ?? 0;
            break;
          }
          case "Retenção de Clientes": {
            const { count: total } = await supabase
              .from("clients").select("id", { count: "exact", head: true })
              .eq("admin_staff_id", g.staff_id)
              .eq("is_active", true);
            const { count: churned } = await supabase
              .from("client_events").select("id, clients!inner(admin_staff_id)", { count: "exact", head: true })
              .eq("clients.admin_staff_id", g.staff_id)
              .eq("event_type", "churned")
              .gte("event_date", monthStart.slice(0, 10)).lt("event_date", monthEnd.slice(0, 10));
            const t = total ?? 0;
            value = t > 0 ? ((t - (churned ?? 0)) / t) * 100 : 100;
            break;
          }

          // === TRAFFIC MANAGER ===
          case "ROAS Médio": {
            const { data } = await supabase
              .from("traffic_campaigns").select("roas, clients!inner(traffic_manager_id)")
              .eq("clients.traffic_manager_id", g.staff_id)
              .eq("year", year).eq("month", month);
            const arr = (data ?? []).map((r: any) => Number(r.roas) || 0).filter(v => v > 0);
            value = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
            break;
          }
          case "CPL Médio": {
            const { data } = await supabase
              .from("traffic_campaigns").select("cost_per_conversion, clients!inner(traffic_manager_id)")
              .eq("clients.traffic_manager_id", g.staff_id)
              .eq("year", year).eq("month", month);
            const arr = (data ?? []).map((r: any) => Number(r.cost_per_conversion) || 0).filter(v => v > 0);
            value = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
            break;
          }
          case "Investimento Mensal": {
            const { data } = await supabase
              .from("traffic_campaigns").select("investment, clients!inner(traffic_manager_id)")
              .eq("clients.traffic_manager_id", g.staff_id)
              .eq("year", year).eq("month", month);
            value = (data ?? []).reduce((s: number, r: any) => s + (Number(r.investment) || 0), 0);
            break;
          }

          default:
            note = "tracker não implementado para este template";
        }
      } catch (err: any) {
        note = `erro: ${err.message}`;
      }

      if (value === null) {
        await supabase.from("staff_assigned_goals").update({
          last_tracking_at: new Date().toISOString(),
          last_tracking_error: note || "sem fonte",
        }).eq("id", g.id);
        results.push({ goal: tpl.name, staff: g.staff_id, skipped: note });
        continue;
      }

      // Decide achievement based on improvement_direction + min_threshold
      const target = Number(g.custom_target_value || tpl.target_value) || 0;
      const threshold = Number(tpl.min_threshold ?? target);
      const direction = tpl.improvement_direction || "up";
      let achieved = false;
      if (direction === "up") achieved = value >= threshold;
      else achieved = value <= threshold;

      const newStatus = achieved ? "achieved" : "pending";

      const { error: updErr } = await supabase
        .from("staff_assigned_goals")
        .update({
          current_value: Number(value.toFixed(2)),
          status: newStatus,
          last_tracking_at: new Date().toISOString(),
          last_tracking_error: null,
        })
        .eq("id", g.id);

      results.push({
        goal: tpl.name,
        staff: g.staff_id,
        value: Number(value.toFixed(2)),
        target,
        achieved,
        error: updErr?.message,
      });
    }

    return new Response(JSON.stringify({ success: true, year, month, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[staff-goals-tracker] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
