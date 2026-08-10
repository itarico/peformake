import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simplified intelligence engine: classify intent + trigger agent
// NO kanban moves, NO tag changes, NO sale registration — all delegated to crm-ai-analyze cron (every 2h)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const { lead_id, client_id, message_id, direction, content, message_type, media_url } = body;

    if (!lead_id || !client_id) {
      return new Response(JSON.stringify({ error: "lead_id and client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead } = await supabase
      .from("crm_leads")
      .select("id, name, phone, status, bot_paused, human_active_until")
      .eq("id", lead_id)
      .single();

    if (!lead) return new Response(JSON.stringify({ ok: true, skip: "lead not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Quick intent classification with minimal context
    const { data: recentMsgs } = await supabase
      .from("crm_messages")
      .select("direction, content, message_type")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(5);

    const recentConvo = (recentMsgs || []).reverse().map(m => {
      const label = m.direction === "inbound" ? "LEAD" : "EMPRESA";
      return `[${label}] ${m.content || `(${m.message_type})`}`;
    }).join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Classifique a intenção da última mensagem de uma conversa comercial no WhatsApp. Também identifique a origem provável do contato (anúncio, orgânico, indicação, etc). Retorne apenas a classificação." },
          { role: "user", content: `Contexto recente:\n${recentConvo}\n\nMensagem atual (${direction}): "${content || '(mídia)'}"` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_intent",
            parameters: {
              type: "object",
              properties: {
                intent: {
                  type: "string",
                  enum: ["greeting", "question", "price_request", "purchase_intent", "objection", "complaint", "support", "sale_confirmed", "scheduling", "follow_up", "unknown"],
                },
                urgency: { type: "string", enum: ["low", "medium", "high"] },
                lead_source: {
                  type: "string",
                  enum: ["ads", "organic", "referral", "whatsapp", "website", "instagram", "facebook", "google", "other", "unknown"],
                  description: "Origem provável do lead baseado no contexto da conversa. 'ads' se mencionar anúncio/propaganda/vi no Facebook/Instagram. 'referral' se indicação. 'organic' se procurou sozinho. 'instagram' se veio pelo Instagram. 'facebook' se veio pelo Facebook. 'google' se veio pelo Google. 'whatsapp' se veio direto pelo WhatsApp.",
                },
              },
              required: ["intent", "urgency"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_intent" } },
        max_tokens: 200,
      }),
    });

    let intent = "unknown";
    let urgency = "low";
    let leadSource = "unknown";

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          intent = parsed.intent;
          urgency = parsed.urgency;
          leadSource = parsed.lead_source || "unknown";
        } catch {}
      }
    }

    // Update lead source if detected and lead has no source yet
    if (leadSource !== "unknown" && direction === "inbound") {
      const { data: currentLead } = await supabase
        .from("crm_leads")
        .select("source")
        .eq("id", lead_id)
        .single();
      if (currentLead && !currentLead.source) {
        await supabase.from("crm_leads").update({ source: leadSource }).eq("id", lead_id);
      }
    }

    // Save classification
    if (message_id) {
      await supabase.from("crm_message_classifications").insert({
        message_id, lead_id,
        classifications: [intent],
        primary_intent: intent,
        sentiment: "neutral",
        urgency,
        confidence: 0.8,
      });
    }

    // ── OUTBOUND MESSAGE: Set human_active_until if sent by human (not bot) ──
    if (direction === "outbound") {
      // Check if this outbound message was sent by the bot (agent_responded event within 60s)
      const sixtySecsAgo = new Date(Date.now() - 60000).toISOString();
      const { data: recentBotEvents } = await supabase
        .from("crm_intelligence_events")
        .select("id")
        .eq("lead_id", lead_id)
        .eq("event_type", "agent_responded")
        .gte("created_at", sixtySecsAgo)
        .limit(1);

      const isBotMessage = recentBotEvents && recentBotEvents.length > 0;

      if (!isBotMessage) {
        // Human sent this message → set human_active_until
        const { data: botCfg } = await supabase
          .from("crm_bot_configs")
          .select("human_takeover_minutes")
          .eq("client_id", client_id)
          .maybeSingle();

        // Also check agent-level human_takeover_minutes
        const agentType = lead.status === "sale_completed" ? "support" :
                          lead.status === "negotiating" ? "sales" :
                          lead.status === "sale_lost" ? "recovery" : "sdr";

        const { data: agentCfg } = await supabase
          .from("crm_agent_configs")
          .select("human_takeover_minutes")
          .eq("client_id", client_id)
          .eq("agent_type", agentType)
          .maybeSingle();

        const takeoverMinutes = agentCfg?.human_takeover_minutes ?? botCfg?.human_takeover_minutes ?? 30;
        const activeUntil = new Date(Date.now() + takeoverMinutes * 60 * 1000).toISOString();

        await supabase.from("crm_leads")
          .update({ human_active_until: activeUntil })
          .eq("id", lead_id);

        console.log(`[intelligence-engine] Human takeover set for ${takeoverMinutes}min on lead ${lead_id}`);
      }

      return new Response(JSON.stringify({ ok: true, intent, urgency, human_takeover: !isBotMessage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for active flow sessions or trigger-matched flows FIRST
    if (direction === "inbound" && ["text", "audio", "image", "video", "document"].includes(message_type || "text")) {
      const inboundPayload = content || (message_type === "audio"
        ? "[lead enviou um áudio]"
        : message_type === "image"
          ? "[lead enviou uma imagem]"
          : message_type === "video"
            ? "[lead enviou um vídeo]"
            : message_type === "document"
              ? "[lead enviou um documento]"
              : "[lead enviou uma mensagem]");

      // Check if lead has an active flow session
      const { data: activeSession } = await supabase
        .from("crm_flow_sessions")
        .select("id, flow_id")
        .eq("lead_id", lead_id)
        .eq("client_id", client_id)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession) {
        // Send response to flow engine
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-flow-engine`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "process_response",
            session_id: activeSession.id,
            client_id,
            response: inboundPayload,
          }),
        }).catch(e => console.error("[intelligence-engine] Flow engine error:", e));

        return new Response(JSON.stringify({ ok: true, intent, urgency, routed_to: "flow_engine" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for trigger-matched flows (new conversation)
      const normalizedInbound = inboundPayload.trim().toLowerCase();
      const { data: keywordFlows } = await supabase
        .from("crm_flows")
        .select("id, trigger_value")
        .eq("client_id", client_id)
        .eq("is_active", true)
        .eq("trigger_type", "keyword");

      const matchedKeywordFlow = (keywordFlows || []).find((flow: any) => {
        const triggerValue = String(flow.trigger_value || "").toLowerCase().trim();
        if (!triggerValue) return false;
        return normalizedInbound.includes(triggerValue);
      });

      const { data: messageFlow } = await supabase
        .from("crm_flows")
        .select("id")
        .eq("client_id", client_id)
        .eq("is_active", true)
        .eq("trigger_type", "message")
        .limit(1)
        .maybeSingle();

      const triggerFlow = matchedKeywordFlow || messageFlow;

      if (triggerFlow) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-flow-engine`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "start_flow",
            flow_id: triggerFlow.id,
            lead_id,
            client_id,
          }),
        }).catch(e => console.error("[intelligence-engine] Flow start error:", e));

        return new Response(JSON.stringify({ ok: true, intent, urgency, routed_to: "flow_engine_start" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if bot is enabled for this client (crm_bot_configs)
      const { data: botConfig } = await supabase
        .from("crm_bot_configs")
        .select("is_enabled, auto_respond_on_new")
        .eq("client_id", client_id)
        .maybeSingle();

      const botEnabled = botConfig?.is_enabled ?? false;

      // ── Check human_active_until ────────────────────────────────────────
      const humanActiveUntil = lead.human_active_until ? new Date(lead.human_active_until) : null;
      const humanIsActive = humanActiveUntil && humanActiveUntil > new Date();

      if (humanIsActive) {
        console.log(`[intelligence-engine] Human is active until ${humanActiveUntil?.toISOString()} — bot skipped`);
        return new Response(JSON.stringify({ ok: true, intent, urgency, skipped: "human_active" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (lead.bot_paused) {
        console.log(`[intelligence-engine] Bot paused for lead ${lead_id}`);
        return new Response(JSON.stringify({ ok: true, intent, urgency, skipped: "bot_paused" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!botEnabled) {
        console.log("[intelligence-engine] Bot disabled for client", client_id);
        return new Response(JSON.stringify({ ok: true, intent, urgency, skipped: "bot_disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Check agent activation mode ─────────────────────────────────────
      const agentType = lead.status === "sale_completed" ? "support" :
                        lead.status === "negotiating" ? "sales" :
                        lead.status === "sale_lost" ? "recovery" : "sdr";

      const { data: agentConfig } = await supabase
        .from("crm_agent_configs")
        .select("activation_mode, activation_keywords, is_enabled")
        .eq("client_id", client_id)
        .eq("agent_type", agentType)
        .maybeSingle();

      const activationMode = agentConfig?.activation_mode || "always_on";
      const agentEnabled = agentConfig?.is_enabled ?? true;

      if (!agentEnabled) {
        console.log(`[intelligence-engine] Agent ${agentType} disabled`);
        return new Response(JSON.stringify({ ok: true, intent, urgency, skipped: "agent_disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // manual_only: bot only responds when explicitly triggered (not from webhook)
      if (activationMode === "manual_only") {
        console.log(`[intelligence-engine] Agent ${agentType} is manual_only — skipping auto-response`);
        return new Response(JSON.stringify({ ok: true, intent, urgency, skipped: "manual_only" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // keyword_trigger: bot only responds if message contains a trigger keyword
      if (activationMode === "keyword_trigger") {
        const keywords = (agentConfig?.activation_keywords || "")
          .split(",")
          .map((k: string) => k.trim().toLowerCase())
          .filter(Boolean);

        const msgLower = (content || "").toLowerCase();
        const keywordMatched = keywords.length > 0 && keywords.some((kw: string) => msgLower.includes(kw));

        if (!keywordMatched) {
          console.log(`[intelligence-engine] Agent ${agentType} keyword_trigger — no keyword match`);
          return new Response(JSON.stringify({ ok: true, intent, urgency, skipped: "no_keyword_match" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // For new leads, also check auto_respond_on_new
      const isNewLead = lead.status === "new";
      const shouldRespond = !isNewLead || (botConfig?.auto_respond_on_new ?? true);

      if (shouldRespond) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-agent-dispatcher`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lead_id, client_id, current_stage: lead.status,
            inbound_message: inboundPayload, intent,
            media_url: media_url || null,
            message_type: message_type || "text",
          }),
        }).catch(e => console.error("[intelligence-engine] Agent dispatch error:", e));
      } else {
        console.log("[intelligence-engine] Bot skipped for new lead (auto_respond_on_new=false)");
      }
    }

    return new Response(JSON.stringify({ ok: true, intent, urgency }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[intelligence-engine] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
