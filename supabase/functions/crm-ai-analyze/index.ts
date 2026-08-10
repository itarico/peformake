import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Consolidated AI analysis — runs every 2h via cron
// Handles: stage changes, tag cleanup, note replacement, lead profile extraction, sale detection
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
    const targetClientId = body.client_id;
    const targetLeadId = body.lead_id;
    const hoursBack: number = body.hours_back || 2;

    let leadsQuery = supabase.from("crm_leads").select("*");
    if (targetLeadId) {
      leadsQuery = leadsQuery.eq("id", targetLeadId);
    } else if (targetClientId) {
      leadsQuery = leadsQuery.eq("client_id", targetClientId);
    }

    if (hoursBack > 0 && !targetLeadId) {
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
      leadsQuery = leadsQuery.gte("last_message_at", since);
    }

    const { data: leads } = await leadsQuery;
    if (!leads?.length) {
      return new Response(JSON.stringify({ message: "Nenhum lead para analisar" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const lead of leads) {
      const [{ data: msgs }, { data: products }] = await Promise.all([
        supabase.from("crm_messages")
          .select("id, direction, content, created_at, message_type")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: true })
          .limit(150),
        supabase.from("client_products")
          .select("name, price, description")
          .eq("client_id", lead.client_id)
          .eq("is_active", true)
          .limit(10),
      ]);

      if (!msgs?.length) continue;

      const productList = products?.length
        ? products.map((p: any) => `${p.name}${p.price ? ` (R$${p.price})` : ""}`).join(", ")
        : "Não cadastrado";

      const conversation = msgs.map((m: any, idx: number) => {
        const label = m.direction === "inbound" ? "LEAD" : "EMPRESA";
        return `#${idx} [${label}] ${m.content || `(${m.message_type})`}`;
      }).join("\n");

      const isSaleCompleted = lead.status === "sale_completed";

      const prompt = `Analise TODA esta conversa de WhatsApp de CRM e extraia informações.

CONVERSA COMPLETA (${msgs.length} mensagens):
${conversation}

LEAD ATUAL:
- Nome: ${lead.name || "Desconhecido"} | Telefone: ${lead.phone}
- Status: ${lead.status} | Venda registrada: ${lead.sale_value ? `R$${lead.sale_value}` : "Nenhuma"}
- Produtos disponíveis: ${productList}

REGRAS RIGOROSAS PARA DETECÇÃO DE VENDA:
1. Se status = "sale_completed", NUNCA mude o estágio
2. TAGS: máximo 3, apenas produto/serviço (ex: "Botox", "Consultoria"). SEM tags de intent
3. NOTAS: resumo curto (2 frases) + próximo passo. SUBSTITUI nota anterior
4. Extraia dados do lead da conversa: nome completo, email, cidade, empresa

CRITÉRIOS DE VENDA - SOMENTE marque has_new_sale=true se TODOS os critérios forem atendidos:
- O LEAD (não a empresa) confirmou EXPLICITAMENTE o pagamento com frases como: "paguei", "fiz o pix", "transferi", "já depositei", "pagamento feito"
- OU o LEAD confirmou EXPLICITAMENTE o pedido com frases como: "fechado", "pode enviar", "confirmo", "quero comprar", "vou levar"
- NÃO considere como venda: menções de preço, negociação, orçamento, consultas, envio de dados bancários pela EMPRESA, perguntas sobre valor
- Se houver dúvida se é venda real ou negociação, marque has_new_sale=false e reduza confidence_score
- Analise o CONTEXTO COMPLETO: uma mensagem isolada sobre valor NÃO é venda
- Quando detectar venda, retorne o ÍNDICE (#) da mensagem específica que confirmou a venda em sale_message_index e um trecho curto (max 120 chars) em sale_excerpt`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Analista de CRM rigoroso. Extraia dados estruturados. Seja EXTREMAMENTE criterioso na detecção de vendas — melhor não detectar uma venda real do que marcar uma falsa." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "analyze_lead",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Resumo curto: interesse + próximo passo (max 200 chars)" },
                  detected_stage: { type: "string", enum: ["new", "negotiating", "qualified", "unqualified", "sale_completed", "sale_lost"] },
                  product_tags: { type: "array", items: { type: "string" }, description: "Max 3 tags de produto/serviço" },
                  has_new_sale: { type: "boolean", description: "SOMENTE true se houver confirmação EXPLÍCITA de pagamento ou pedido pelo LEAD" },
                  sale_value: { type: "number", description: "Valor da venda confirmada ou null" },
                  sale_product: { type: "string", description: "Produto vendido ou null" },
                  confidence_score: { type: "number", description: "Confiança na detecção (0-100). Vendas devem ter score >= 80" },
                  lead_full_name: { type: "string", description: "Nome completo extraído ou null" },
                  lead_email: { type: "string", description: "Email extraído ou null" },
                  lead_city: { type: "string", description: "Cidade extraída ou null" },
                  lead_company: { type: "string", description: "Empresa extraída ou null" },
                  interested_products: { type: "array", items: { type: "string" }, description: "Produtos de interesse" },
                  sale_message_index: { type: "number", description: "Índice (#) da mensagem que confirmou a venda. null se sem venda." },
                  sale_excerpt: { type: "string", description: "Trecho curto da mensagem que confirmou a venda (max 120 chars). null se sem venda." },
                },
                required: ["summary", "detected_stage", "product_tags", "has_new_sale", "confidence_score"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "analyze_lead" } },
          max_tokens: 600,
        }),
      });

      if (!aiRes.ok) { console.error(`AI error for lead ${lead.id}:`, aiRes.status); continue; }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) continue;

      let a: any;
      try { a = JSON.parse(toolCall.function.arguments); } catch { continue; }

      const confidenceScore = a.confidence_score || 0;

      // Save summary (replace old ones)
      await supabase.from("crm_lead_summaries")
        .delete()
        .eq("lead_id", lead.id);

      await supabase.from("crm_lead_summaries").insert({
        lead_id: lead.id, client_id: lead.client_id,
        summary: a.summary, detected_stage: a.detected_stage,
        detected_sale_value: a.sale_value || null,
      });

      // Build lead updates
      const updates: Record<string, unknown> = {};

      // Stage — never downgrade from sale_completed
      if (!isSaleCompleted && a.detected_stage && a.detected_stage !== lead.status) {
        updates.status = a.detected_stage;
      }

      // Tags — max 3, product only, REPLACE
      const tags = (a.product_tags || []).slice(0, 3);
      updates.tags = tags;

      // Notes — REPLACE (not accumulate)
      if (a.summary) updates.notes = a.summary;

      // Lead profile data
      if (a.lead_full_name) updates.full_name = a.lead_full_name;
      if (a.lead_email) updates.email = a.lead_email;
      if (a.lead_city) updates.city = a.lead_city;
      if (a.lead_company) updates.company = a.lead_company;
      if (a.interested_products?.length) updates.interested_products = a.interested_products;

      // Sale detection — IA cria como PENDENTE; usuário precisa confirmar manualmente no chat antes de contabilizar.
      if (a.has_new_sale && a.sale_value && a.sale_value > 0 && !isSaleCompleted && confidenceScore >= 80) {
        // Identifica a mensagem-chave que confirmou a venda
        let detectedMsgId: string | null = null;
        let detectedExcerpt: string | null = a.sale_excerpt || null;
        if (typeof a.sale_message_index === "number" && msgs[a.sale_message_index]) {
          detectedMsgId = msgs[a.sale_message_index].id;
          if (!detectedExcerpt) {
            detectedExcerpt = (msgs[a.sale_message_index].content || "").slice(0, 120);
          }
        }

        // Evita duplicar: só insere se NÃO existir uma venda pendente recente para o mesmo lead/valor
        const { data: existingPending } = await supabase
          .from("crm_sales")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("is_confirmed", false)
          .eq("value", a.sale_value)
          .limit(1);

        if (!existingPending?.length) {
          await supabase.from("crm_sales").insert({
            lead_id: lead.id,
            client_id: lead.client_id,
            value: a.sale_value,
            product_name: a.sale_product || null,
            sale_date: new Date().toISOString(),
            is_confirmed: false,
            detected_message_id: detectedMsgId,
            detected_excerpt: detectedExcerpt,
            confidence_score: confidenceScore,
            detected_by: "ai",
          });
        }
        // NÃO atualizamos status nem sale_value do lead aqui — só após confirmação manual.
      } else if (a.has_new_sale && confidenceScore < 80) {
        console.log(`[crm-ai-analyze] Sale detected but low confidence (${confidenceScore}) for lead ${lead.id} — skipping auto-mark`);
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("crm_leads").update(updates).eq("id", lead.id);
      }

      results.push({
        lead_id: lead.id, name: lead.name, stage: a.detected_stage,
        has_sale: a.has_new_sale, sale_value: a.sale_value,
        confidence: confidenceScore,
      });
    }

    return new Response(JSON.stringify({ success: true, analyzed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[crm-ai-analyze] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
