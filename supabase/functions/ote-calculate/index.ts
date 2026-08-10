import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2.49.4/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { staff_member_id, year, month, criteria_values } = body;

    if (!staff_member_id || !year || !month) {
      return new Response(JSON.stringify({ error: "staff_member_id, year, month são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get staff member and their OTE role config
    const { data: staff } = await supabase
      .from("staff_members")
      .select("id, full_name, ote_role_config_id")
      .eq("id", staff_member_id)
      .single();

    if (!staff?.ote_role_config_id) {
      return new Response(JSON.stringify({ error: "Membro não possui cargo OTE configurado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get role config
    const { data: roleConfig } = await supabase
      .from("ote_role_configs")
      .select("*")
      .eq("id", staff.ote_role_config_id)
      .single();

    if (!roleConfig) {
      return new Response(JSON.stringify({ error: "Configuração OTE do cargo não encontrada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active criteria for this role
    const { data: criteria } = await supabase
      .from("ote_criteria")
      .select("*")
      .eq("role_config_id", roleConfig.id)
      .eq("is_active", true)
      .order("criteria_order");

    if (!criteria || criteria.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum critério ativo para este cargo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate OTE
    const fixedPercent = roleConfig.split_fixed / 100;
    const variablePercent = (100 - roleConfig.split_fixed) / 100;
    const fixedAmount = roleConfig.ote_target * fixedPercent;
    const variableBase = roleConfig.ote_target * variablePercent;

    // Calculate each criteria score
    const criteriaScores = criteria.map((c: any) => {
      const providedValue = criteria_values?.[c.id];
      const currentValue = providedValue !== undefined ? Number(providedValue) : 0;

      let achievementPercent = 0;
      if (c.measurement_type === "boolean") {
        achievementPercent = currentValue >= 1 ? 100 : 0;
      } else if (c.target_value > 0) {
        achievementPercent = Math.min((currentValue / c.target_value) * 100, 200); // cap at 200%
      }

      const isMet = achievementPercent >= 100;
      const weightedScore = (achievementPercent / 100) * c.weight_percent;

      return {
        criteria_id: c.id,
        current_value: currentValue,
        target_value: c.target_value,
        achievement_percent: Math.round(achievementPercent * 100) / 100,
        is_met: isMet,
        weight_percent: c.weight_percent,
        weighted_score: Math.round(weightedScore * 100) / 100,
      };
    });

    // Total weighted achievement (sum of weighted scores, max base = 100 from weights)
    const totalWeightedScore = criteriaScores.reduce((s: number, cs: any) => s + cs.weighted_score, 0);
    const totalWeights = criteriaScores.reduce((s: number, cs: any) => s + cs.weight_percent, 0);
    const achievementPercent = totalWeights > 0 ? (totalWeightedScore / totalWeights) * 100 : 0;

    // Calculate variable amount with linear accelerator
    let variableAmount = variableBase * (achievementPercent / 100);
    let acceleratorBonus = 0;

    if (achievementPercent > 100 && roleConfig.accelerator_type !== "none") {
      const excessPercent = achievementPercent - 100;
      const multiplier = roleConfig.accelerator_type === "accelerated"
        ? (roleConfig.accelerator_multiplier || 1.5)
        : 1.0; // linear = 1:1

      // For linear: each 1% above 100% = 1% more of variable base
      // For accelerated: each 1% above 100% = multiplier% more of variable base
      acceleratorBonus = variableBase * (excessPercent / 100) * multiplier;
      variableAmount = variableBase + acceleratorBonus;
    }

    const totalAmount = fixedAmount + variableAmount;

    // Upsert monthly score
    const { data: monthlyScore, error: upsertError } = await supabase
      .from("ote_monthly_scores")
      .upsert({
        staff_member_id,
        role_config_id: roleConfig.id,
        year,
        month,
        achievement_percent: Math.round(achievementPercent * 100) / 100,
        fixed_amount: Math.round(fixedAmount * 100) / 100,
        variable_amount: Math.round(variableAmount * 100) / 100,
        accelerator_bonus: Math.round(acceleratorBonus * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        status: "calculated",
        calculated_at: new Date().toISOString(),
      }, { onConflict: "staff_member_id,year,month" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    // Upsert criteria scores
    for (const cs of criteriaScores) {
      await supabase.from("ote_criteria_scores").upsert({
        monthly_score_id: monthlyScore.id,
        criteria_id: cs.criteria_id,
        current_value: cs.current_value,
        target_value: cs.target_value,
        achievement_percent: cs.achievement_percent,
        is_met: cs.is_met,
        weight_percent: cs.weight_percent,
        weighted_score: cs.weighted_score,
      }, { onConflict: "monthly_score_id,criteria_id" });
    }

    return new Response(JSON.stringify({
      success: true,
      staff_name: staff.full_name,
      role: roleConfig.role_name,
      year, month,
      achievement_percent: Math.round(achievementPercent * 100) / 100,
      fixed_amount: Math.round(fixedAmount * 100) / 100,
      variable_amount: Math.round(variableAmount * 100) / 100,
      accelerator_bonus: Math.round(acceleratorBonus * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      criteria_scores: criteriaScores,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
