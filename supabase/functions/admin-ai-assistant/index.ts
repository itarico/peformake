import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-staff-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { messages, chatType, sessionId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build context based on chat type
    let systemPrompt = "";
    let contextData = "";

    if (chatType === "clients") {
      // Fetch all clients with their data
      const [{ data: clients }, { data: insights }, { data: strategicData }] = await Promise.all([
        supabase.from("clients").select("id, name, business_segment, business_description, target_audience, value_proposition, main_competitors, is_active, contract_type, arts_per_month, has_consulting_service, has_crm_service, has_design_service").eq("is_active", true),
        supabase.from("ai_daily_insights").select("*").eq("target_type", "client").order("created_at", { ascending: false }).limit(50),
        supabase.from("client_strategic_data").select("*").limit(200),
      ]);

      const clientSummary = (clients || []).map(c => 
        `• ${c.name}: ${c.business_segment || "N/A"} | ${c.business_description || ""} | Público: ${c.target_audience || "N/A"} | Serviços: ${[c.has_design_service && "Design", c.has_consulting_service && "Consultoria", c.has_crm_service && "CRM"].filter(Boolean).join(", ")}`
      ).join("\n");

      const recentInsights = (insights || []).slice(0, 20).map(i =>
        `[${i.category}] ${i.title}: ${i.content?.slice(0, 200)}${i.source_url ? ` (${i.source_url})` : ""}`
      ).join("\n");

      contextData = `CLIENTES ATIVOS:\n${clientSummary}\n\nINSIGHTS RECENTES:\n${recentInsights}`;

      systemPrompt = `Você é o Assistente de Inteligência da Peformake, uma agência de marketing. Seu papel é ser um consultor estratégico sobre TODOS os clientes da agência.

CAPACIDADES:
- Analisar tendências de mercado para cada cliente
- Sugerir estratégias de marketing, conteúdo e vendas personalizadas
- Cruzar dados entre clientes para identificar padrões
- Recomendar ações baseadas em pesquisas recentes
- Apontar oportunidades de upsell e cross-sell entre serviços

DADOS DO SISTEMA:
${contextData}

REGRAS:
- Sempre responda em português brasileiro
- Seja direto, estratégico e acionável
- Use dados concretos quando disponíveis
- Sugira links, vídeos e artigos quando relevante
- Aprenda com cada conversa para melhorar recomendações futuras
- Responda com no mínimo 10-15 linhas para análises estratégicas`;

    } else {
      // Company mode
      const [{ data: clients }, { data: insights }, { data: expenses }] = await Promise.all([
        supabase.from("clients").select("id, name, is_active, contract_type, contract_start_date, contract_end_date").limit(100),
        supabase.from("ai_daily_insights").select("*").eq("target_type", "company").order("created_at", { ascending: false }).limit(30),
        supabase.from("agency_expenses").select("*").order("created_at", { ascending: false }).limit(50),
      ]);

      const activeCount = (clients || []).filter(c => c.is_active).length;
      const totalCount = (clients || []).length;

      const recentInsights = (insights || []).slice(0, 15).map(i =>
        `[${i.category}] ${i.title}: ${i.content?.slice(0, 200)}${i.source_url ? ` (${i.source_url})` : ""}`
      ).join("\n");

      contextData = `EMPRESA: Peformake - Agência de Marketing Digital\nCLIENTES: ${activeCount} ativos de ${totalCount} total\n\nINSIGHTS RECENTES:\n${recentInsights}`;

      systemPrompt = `Você é o Consultor Estratégico e Secretário Executivo da Peformake, uma agência de marketing digital.

PAPEL:
- Guiar a empresa durante o ano com visão estratégica
- Sugerir melhorias operacionais, de vendas e de gestão
- Trazer novidades do mercado de marketing digital
- Propor estratégias de crescimento e retenção
- Ajudar com planejamento financeiro e metas
- Ser proativo com sugestões de implementação

DADOS DA EMPRESA:
${contextData}

REGRAS:
- Sempre responda em português brasileiro
- Aja como um sócio estratégico, não apenas um assistente
- Proponha OKRs, metas e prazos quando relevante
- Sugira ferramentas, tendências e inovações do mercado
- Seja detalhado e acionável nas respostas (mínimo 10-15 linhas)
- Aprenda sobre a Peformake a cada conversa`;
    }

    // Save user message
    if (sessionId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        await supabase.from("ai_chat_messages").insert({
          session_id: sessionId,
          role: "user",
          content: lastMsg.content,
        });
      }
    }

    // Call AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("admin-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
