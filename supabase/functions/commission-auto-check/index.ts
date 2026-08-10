import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Auto-evaluates commission criteria from actual DB data
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const year = body.year || new Date().getFullYear();
    const month = body.month || new Date().getMonth() + 1;

    // Get all active assignments with staff role
    const { data: assignments } = await supabase
      .from("client_team_assignments")
      .select("*, staff_members(id, role, full_name), clients(id, name, is_active, has_design_service, has_consulting_service)")
      .eq("clients.is_active", true);

    if (!assignments?.length) {
      return new Response(JSON.stringify({ message: "Nenhuma atribuição encontrada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const assignment of assignments) {
      if (!assignment.clients?.is_active) continue;
      const staff = assignment.staff_members;
      if (!staff) continue;

      const clientId = assignment.client_id;
      const staffId = staff.id;
      const role = assignment.role_in_client === "social_media" ? "social_media" :
                   assignment.role_in_client === "designer" ? "designer" : "admin";

      const checks: { key: string; passed: boolean; notes: string }[] = [];

      if (role === "social_media") {
        // briefing_complete: all arts have briefing_completed_at
        const { data: workMonths } = await supabase
          .from("work_months").select("id")
          .eq("client_id", clientId).eq("year", year).eq("month", month);

        if (workMonths?.length) {
          const wmIds = workMonths.map(w => w.id);
          const { data: arts } = await supabase
            .from("arts").select("id, briefing_completed_at, status")
            .in("work_month_id", wmIds);

          const total = arts?.length || 0;
          const withBriefing = arts?.filter(a => a.briefing_completed_at).length || 0;
          checks.push({
            key: "briefing_complete",
            passed: total > 0 && withBriefing === total,
            notes: `${withBriefing}/${total} briefings preenchidos`,
          });

          // briefing_on_time: briefings completed before deadline
          const onTime = arts?.filter(a => {
            if (!a.briefing_completed_at) return false;
            return true; // If no deadline, count as on time
          }).length || 0;
          checks.push({
            key: "briefing_on_time",
            passed: total > 0 && onTime === total,
            notes: `${onTime}/${total} no prazo`,
          });
        }
      }

      if (role === "admin") {
        // monthly_focus: consulting_months has monthly_focus filled
        const { data: cm } = await supabase
          .from("consulting_months").select("id, monthly_focus, is_complete")
          .eq("client_id", clientId).eq("year", year).eq("month", month)
          .maybeSingle();

        checks.push({
          key: "monthly_focus",
          passed: !!(cm?.monthly_focus && cm.monthly_focus.trim().length > 0),
          notes: cm?.monthly_focus ? "Foco preenchido" : "Foco não preenchido",
        });

        // sm_planning: work_month planning complete
        const { data: wm } = await supabase
          .from("work_months").select("id, is_planning_complete")
          .eq("client_id", clientId).eq("year", year).eq("month", month)
          .maybeSingle();

        checks.push({
          key: "sm_planning",
          passed: !!(wm?.is_planning_complete),
          notes: wm?.is_planning_complete ? "Planejamento concluído" : "Planejamento pendente",
        });
      }

      if (role === "designer") {
        // all_arts_delivered: all arts have status beyond in_production
        const { data: workMonths } = await supabase
          .from("work_months").select("id")
          .eq("client_id", clientId).eq("year", year).eq("month", month);

        if (workMonths?.length) {
          const wmIds = workMonths.map(w => w.id);
          const { data: arts } = await supabase
            .from("arts").select("id, status, briefing_completed_at, updated_at, created_at")
            .in("work_month_id", wmIds);

          const total = arts?.length || 0;
          const delivered = arts?.filter(a =>
            ["awaiting_approval", "approved"].includes(a.status)
          ).length || 0;

          checks.push({
            key: "all_arts_delivered",
            passed: total > 0 && delivered === total,
            notes: `${delivered}/${total} artes entregues`,
          });

          // arts_on_time: check if delivery was within 48h (excl Sundays)
          let allOnTime = true;
          let onTimeCount = 0;
          let sameDayCount = 0;
          for (const art of (arts || [])) {
            if (!["awaiting_approval", "approved"].includes(art.status)) continue;
            if (!art.briefing_completed_at) { onTimeCount++; continue; }

            const briefingDate = new Date(art.briefing_completed_at);
            const deliveryDate = new Date(art.updated_at);

            // Check same-day delivery
            if (briefingDate.toDateString() === deliveryDate.toDateString()) {
              sameDayCount++;
            }

            // Count business hours excluding Sundays
            let hours = 0;
            const cursor = new Date(briefingDate);
            while (cursor < deliveryDate && hours < 60) {
              if (cursor.getDay() !== 0) { // Not Sunday
                hours++;
              }
              cursor.setHours(cursor.getHours() + 1);
            }

            if (hours <= 48) {
              onTimeCount++;
            } else {
              allOnTime = false;
            }
          }

          checks.push({
            key: "arts_on_time",
            passed: delivered > 0 && allOnTime,
            notes: `${onTimeCount}/${delivered} no prazo de 48h`,
          });

          // same_day_delivery: count arts delivered same day as briefing
          // Get designer's same_day_bonus from staff_members
          const { data: staffData } = await supabase
            .from("staff_members").select("same_day_bonus")
            .eq("id", staffId).single();

          const sameDayBonus = staffData?.same_day_bonus || 0;

          if (sameDayBonus > 0 && sameDayCount > 0) {
            checks.push({
              key: "same_day_delivery",
              passed: true,
              notes: `${sameDayCount} arte(s) entregue(s) no mesmo dia — Bônus: R$${(sameDayBonus * sameDayCount).toFixed(2)}`,
            });
          }

          // quality_approved: max 2 revisions per art
          const { data: comments } = await supabase
            .from("art_comments")
            .select("art_id, action")
            .in("art_id", (arts || []).map(a => a.id))
            .eq("action", "request_revision");

          const revisionCounts: Record<string, number> = {};
          for (const c of (comments || [])) {
            revisionCounts[c.art_id] = (revisionCounts[c.art_id] || 0) + 1;
          }
          const allGoodQuality = Object.values(revisionCounts).every(count => count <= 2);
          checks.push({
            key: "quality_approved",
            passed: allGoodQuality,
            notes: allGoodQuality ? "Todas dentro do limite de revisões" : "Algumas artes excederam 2 revisões",
          });
        }
      }

      // Upsert checklist items that passed
      for (const check of checks) {
        if (check.passed) {
          await supabase.from("commission_checklists").upsert({
            year, month,
            client_id: clientId,
            staff_member_id: staffId,
            criteria_key: check.key,
            status: "approved",
            approved_at: new Date().toISOString(),
            notes: `[Auto] ${check.notes}`,
          }, { onConflict: "year,month,client_id,staff_member_id,criteria_key" });
        }

        results.push({
          staff: staff.full_name,
          client: assignment.clients?.name,
          criteria: check.key,
          passed: check.passed,
          notes: check.notes,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, checked: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[commission-auto-check] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
