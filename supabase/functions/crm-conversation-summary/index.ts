import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate AI summary of all CRM conversations for a client
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
    const { client_id, period } = body; // period: "week" or "month"

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate date range
    const now = new Date();
    let since: string;
    if (period === "week") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    // Get leads with recent activity
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, name, phone, status, sale_value, tags, notes, interested_products")
      .eq("client_id", client_id)
      .gte("last_message_at", since);

    if (!leads?.length) {
      return new Response(JSON.stringify({
        summary: "Nenhuma atividade no período selecionado.",
        stats: { total_leads: 0, total_messages: 0, total_sales: 0, sales_value: 0 },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get messages in period
    const { data: messages } = await supabase
      .from("crm_messages")
      .select("lead_id, direction, content, message_type, created_at")
      .eq("client_id", client_id)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(500);

    // Get sales in period
    const { data: sales } = await supabase
      .from("crm_sales")
      .select("value, product_name, sale_date")
      .eq("client_id", client_id)
      .gte("sale_date", since);

    // Build conversation summaries per lead
    const leadSummaries = leads.map(lead => {
      const leadMsgs = (messages || []).filter(m => m.lead_id === lead.id);
      const lastMsgs = leadMsgs.slice(-5).map(m => {
        const label = m.direction === "inbound" ? "Lead" : "Empresa";
        return `${label}: ${m.content || `(${m.message_type})`}`;
      }).join("\n");

      return `Lead: ${lead.name || lead.phone} | Status: ${lead.status} | Msgs: ${leadMsgs.length}${lead.sale_value ? ` | Venda: R$${lead.sale_value}` : ""}${lead.tags?.length ? ` | Tags: ${lead.tags.join(", ")}` : ""}\nÚltimas msgs:\n${lastMsgs || "(sem mensagens)"}`;
    }).join("\n\n---\n\n");

    const totalMessages = (messages || []).length;
    const inboundCount = (messages || []).filter(m => m.direction === "inbound").length;
    const outboundCount = totalMessages - inboundCount;
    const totalSalesValue = (sales || []).reduce((sum, s) => sum + Number(s.value || 0), 0);

    const periodLabel = period === "week" ? "última semana" : "mês atual";

    // Generate AI summary
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um analista de CRM. Gere um resumo executivo completo e profissional das conversas do WhatsApp comercial.

O resumo deve incluir:
1. **Visão Geral**: Total de leads ativos, mensagens trocadas, vendas realizadas
2. **Destaques**: Principais oportunidades, leads quentes, objeções recorrentes
3. **Análise de Vendas**: Vendas realizadas, valor total, produtos mais vendidos
4. **Leads Prioritários**: Os 3-5 leads que precisam de mais atenção e por quê
5. **Recomendações**: 3 ações práticas para melhorar os resultados

Seja direto, use bullets e emojis para facilitar a leitura. Escreva em português.`,
          },
          {
            role: "user",
            content: `Gere o resumo da ${periodLabel} do CRM.

ESTATÍSTICAS:
- Leads ativos: ${leads.length}
- Total de mensagens: ${totalMessages} (${inboundCount} recebidas, ${outboundCount} enviadas)
- Vendas no período: ${(sales || []).length} (R$ ${totalSalesValue.toFixed(2)})

CONVERSAS POR LEAD:
${leadSummaries}`,
          },
        ],
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const summary = aiData.choices?.[0]?.message?.content?.trim() || "Erro ao gerar resumo.";

    return new Response(JSON.stringify({
      summary,
      stats: {
        total_leads: leads.length,
        total_messages: totalMessages,
        inbound_messages: inboundCount,
        outbound_messages: outboundCount,
        total_sales: (sales || []).length,
        sales_value: totalSalesValue,
      },
      period: periodLabel,
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[crm-conversation-summary] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
