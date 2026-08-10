import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WASENDER_BASE = "https://www.wasenderapi.com/api";

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
    const { lead_id, client_id, inbound_message } = body;

    if (!lead_id || !client_id) {
      return new Response(JSON.stringify({ error: "lead_id and client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Check bot config ───────────────────────────────────────────────────
    const { data: botConfig } = await supabase
      .from("crm_bot_configs")
      .select("*")
      .eq("client_id", client_id)
      .maybeSingle();

    if (!botConfig?.is_enabled) {
      console.log("[crm-bot-ai] Bot disabled for client:", client_id);
      return new Response(JSON.stringify({ skipped: true, reason: "bot_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Check business hours ───────────────────────────────────────────────
    if (botConfig.business_hours_only && botConfig.business_hours_start && botConfig.business_hours_end) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      if (timeStr < botConfig.business_hours_start || timeStr > botConfig.business_hours_end) {
        console.log("[crm-bot-ai] Outside business hours:", timeStr);
        return new Response(JSON.stringify({ skipped: true, reason: "outside_hours" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── 3. Get lead info ──────────────────────────────────────────────────────
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("name, phone, status, tags, notes, bot_paused, human_active_until")
      .eq("id", lead_id)
      .single();

    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3a. Check if bot is paused for this lead or human is active ──────────
    if (lead.bot_paused) {
      return new Response(JSON.stringify({ skipped: true, reason: "bot_paused_for_lead" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lead.human_active_until && new Date(lead.human_active_until) > new Date()) {
      console.log("[crm-bot-ai] Human active until:", lead.human_active_until);
      return new Response(JSON.stringify({ skipped: true, reason: "human_active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3b. Frequency control: check last bot message time ───────────────────
    const { data: lastBotMsg } = await supabase
      .from("crm_messages")
      .select("created_at, direction")
      .eq("lead_id", lead_id)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastBotMsg) {
      const lastBotTime = new Date(lastBotMsg.created_at).getTime();
      const elapsed = Date.now() - lastBotTime;
      // Don't respond if last outbound was less than 60 seconds ago (anti-spam)
      if (elapsed < 60000) {
        console.log("[crm-bot-ai] Rate limited: last outbound was", Math.round(elapsed / 1000), "s ago");
        return new Response(JSON.stringify({ skipped: true, reason: "rate_limited" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── 3c. Anti-loop: don't respond if last message was from bot ────────────
    const { data: lastMsg } = await supabase
      .from("crm_messages")
      .select("direction")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastMsg?.direction === "outbound" && !inbound_message) {
      console.log("[crm-bot-ai] Anti-loop: last message was outbound");
      return new Response(JSON.stringify({ skipped: true, reason: "anti_loop" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Get client info ────────────────────────────────────────────────────
    const { data: client } = await supabase
      .from("clients")
      .select("name, business_description, business_segment, target_audience, value_proposition")
      .eq("id", client_id)
      .single();

    // ── 5. Get products ───────────────────────────────────────────────────────
    const { data: products } = await supabase
      .from("client_products")
      .select("name, price, description, features")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .limit(8);

    const productList = products?.length
      ? products.map((p: any) =>
          `• ${p.name}${p.price ? ` - R$${p.price}` : ""}${p.description ? `: ${p.description.slice(0, 100)}` : ""}`
        ).join("\n")
      : "Nenhum produto cadastrado";

    // ── 5a. Get consulting/strategic data for context ────────────────────────
    let consultingContext = "";
    const { data: strategicData } = await supabase
      .from("client_strategic_data")
      .select("data_key, data_value")
      .eq("client_id", client_id)
      .limit(10);

    if (strategicData?.length) {
      consultingContext = "\n## CONTEXTO ESTRATÉGICO (da Consultoria)\n" +
        strategicData.map((d: any) => `- ${d.data_key}: ${d.data_value.slice(0, 200)}`).join("\n");
    }

    // Also get agent knowledge base
    const { data: knowledge } = await supabase
      .from("crm_agent_knowledge")
      .select("question, answer")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .limit(15);

    let knowledgeContext = "";
    if (knowledge?.length) {
      knowledgeContext = "\n## BASE DE CONHECIMENTO\n" +
        knowledge.map((k: any) => `P: ${k.question}\nR: ${k.answer}`).join("\n\n");
    }

    // ── 6. Get recent conversation history (last 25 messages) ─────────────────
    const { data: recentMsgs } = await supabase
      .from("crm_messages")
      .select("direction, content, message_type, created_at")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(25);

    const conversationHistory = (recentMsgs || []).reverse().map((m: any) => {
      const role = m.direction === "inbound" ? "user" : "assistant";
      const content = m.content || `(${m.message_type})`;
      return { role, content };
    });

    // ── 7. Build system prompt ─────────────────────────────────────────────────
    const persona = botConfig.persona || "Assistente de Vendas Profissional";
    const extraInstructions = botConfig.instructions || "";

    const systemPrompt = `Você é ${persona} da empresa "${client?.name || "nossa empresa"}".

## INFORMAÇÕES DA EMPRESA
- Negócio: ${client?.business_description || "Não informado"}
- Segmento: ${client?.business_segment || "Não informado"}
- Público-alvo: ${client?.target_audience || "Não informado"}
- Proposta de valor: ${client?.value_proposition || "Não informado"}

## PRODUTOS/SERVIÇOS
${productList}
${consultingContext}
${knowledgeContext}

## INFORMAÇÕES DO LEAD
- Nome: ${lead.name || "Não identificado"}
- Status no funil: ${lead.status}
${lead.notes ? `- Observações: ${lead.notes}` : ""}

## INSTRUÇÕES ESPECIAIS
${extraInstructions || "Seja educado, profissional e foque em identificar a necessidade do cliente e apresentar soluções relevantes."}

## REGRAS OBRIGATÓRIAS
1. Responda APENAS em português brasileiro
2. Seja conciso - respostas curtas de 1 a 3 frases no máximo
3. Nunca revele que é uma IA, mantenha o personagem "${persona}"
4. Se o cliente perguntar preços, informe os valores dos produtos cadastrados
5. Se o cliente demonstrar interesse em comprar, pergunte como prefere pagar e quando quer receber
6. Nunca prometa algo que não esteja nos produtos cadastrados
7. Se não souber responder, diga "Vou verificar com nossa equipe e retorno em breve"
8. NÃO envie múltiplas mensagens seguidas. Responda apenas UMA vez por mensagem recebida
9. Se o lead não respondeu sua última mensagem, NÃO envie outra. Aguarde`;

    // ── 8. Build messages array ───────────────────────────────────────────────
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-18), // last 18 exchanges for better context
    ];

    // Add the inbound message if not already in history
    if (inbound_message && (conversationHistory.length === 0 ||
        conversationHistory[conversationHistory.length - 1]?.content !== inbound_message)) {
      messages.push({ role: "user", content: inbound_message });
    }

    console.log("[crm-bot-ai] Calling Gemini for lead:", lead_id, "msgs:", messages.length);

    // ── 8a. Add a small delay to seem more human (3-5s) ─────────────────────
    const delay = 3000 + Math.random() * 2000;
    await new Promise((r) => setTimeout(r, delay));

    // ── 9. Call Gemini AI ─────────────────────────────────────────────────────
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[crm-bot-ai] AI error:", aiRes.status, errText);
      throw new Error(`AI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const replyText = aiData.choices?.[0]?.message?.content?.trim();

    if (!replyText) {
      throw new Error("Empty AI response");
    }

    console.log("[crm-bot-ai] AI reply:", replyText.slice(0, 200));

    // ── 10. Send reply via Wasender ────────────────────────────────────────────
    const pat = Deno.env.get("WASENDER_API_TOKEN");
    if (!pat) throw new Error("WASENDER_API_TOKEN not configured");

    // Get session API key
    const { data: conn } = await supabase
      .from("crm_whatsapp_connections")
      .select("session_api_key, session_id")
      .eq("client_id", client_id)
      .maybeSingle();

    if (!conn?.session_api_key) {
      console.error("[crm-bot-ai] No session API key for client:", client_id);
      throw new Error("WhatsApp session not available");
    }

    // Normalize phone
    let phone = String(lead.phone).replace(/\D/g, "");
    if (!phone.startsWith("55")) phone = "55" + phone;
    const e164 = "+" + phone;

    const sendRes = await fetch(`${WASENDER_BASE}/send-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.session_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: e164, text: replyText }),
    });

    const sendData = await sendRes.json();
    console.log("[crm-bot-ai] Send result:", sendRes.status, JSON.stringify(sendData).slice(0, 200));

    if (!sendRes.ok) {
      throw new Error(`Failed to send reply: ${sendData?.message || sendRes.status}`);
    }

    // Save bot message to DB
    const wasenderId = sendData?.data?.key?.id || sendData?.data?.id || null;
    await supabase.from("crm_messages").insert({
      lead_id,
      client_id,
      direction: "outbound",
      message_type: "text",
      content: replyText,
      wasender_message_id: wasenderId,
      status: "sent",
    });

    return new Response(JSON.stringify({ success: true, reply: replyText, wasender_id: wasenderId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[crm-bot-ai] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
