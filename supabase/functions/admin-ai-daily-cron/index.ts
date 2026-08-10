import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // 1. Fetch active clients
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, business_segment, business_description, target_audience, main_competitors")
      .eq("is_active", true);

    const allInsights: any[] = [];

    // 2. For each client, search trends
    for (const client of (clients || []).slice(0, 10)) {
      const segment = client.business_segment || client.business_description || client.name;
      const searchQueries = [
        `tendências marketing digital ${segment} 2026`,
        `estratégias vendas ${segment} instagram`,
        `novidades ${segment} mercado brasileiro`,
      ];

      for (const query of searchQueries.slice(0, 2)) {
        try {
          // Use Firecrawl search if available
          if (FIRECRAWL_API_KEY) {
            const fcResp = await fetch("https://api.firecrawl.dev/v1/search", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query, limit: 3, lang: "pt", country: "BR" }),
            });

            if (fcResp.ok) {
              const fcData = await fcResp.json();
              const results = fcData.data || [];

              for (const result of results) {
                allInsights.push({
                  target_type: "client",
                  target_id: client.id,
                  category: "trend",
                  title: result.title || query,
                  content: result.description || result.markdown?.slice(0, 500) || "Conteúdo relevante encontrado",
                  source_url: result.url,
                  media_type: "article",
                  tags: [segment, "auto-research"],
                });
              }
            }
          }
        } catch (e) {
          console.error(`Search error for ${client.name}:`, e);
        }
      }

      // Small delay between clients
      await new Promise(r => setTimeout(r, 500));
    }

    // 3. Company-level research
    const companyQueries = [
      "tendências agências de marketing digital 2026 Brasil",
      "ferramentas automação marketing 2026 novidades",
      "estratégias retenção clientes agência",
    ];

    for (const query of companyQueries) {
      try {
        if (FIRECRAWL_API_KEY) {
          const fcResp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, limit: 3, lang: "pt", country: "BR" }),
          });

          if (fcResp.ok) {
            const fcData = await fcResp.json();
            for (const result of (fcData.data || [])) {
              allInsights.push({
                target_type: "company",
                target_id: null,
                category: "strategy",
                title: result.title || query,
                content: result.description || result.markdown?.slice(0, 500) || "Insight encontrado",
                source_url: result.url,
                media_type: "article",
                tags: ["peformake", "auto-research"],
              });
            }
          }
        }
      } catch (e) {
        console.error("Company search error:", e);
      }
    }

    // 4. Use AI to generate strategic summary
    if (allInsights.length > 0 && LOVABLE_API_KEY) {
      const insightsSummary = allInsights.slice(0, 15).map(i => `[${i.category}] ${i.title}`).join("\n");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "Você é um analista de marketing digital. Gere um resumo executivo dos insights encontrados, destacando as 3 ações mais importantes para implementar hoje. Responda em português, formato markdown curto." },
            { role: "user", content: `Insights encontrados hoje:\n${insightsSummary}` },
          ],
        }),
      });

      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const summary = aiData.choices?.[0]?.message?.content;
        if (summary) {
          allInsights.unshift({
            target_type: "company",
            target_id: null,
            category: "daily_summary",
            title: `📊 Resumo Diário - ${new Date().toLocaleDateString("pt-BR")}`,
            content: summary,
            source_url: null,
            media_type: null,
            tags: ["resumo-diario", "auto-generated"],
          });
        }
      }
    }

    // 5. Save insights
    if (allInsights.length > 0) {
      const { error } = await supabase.from("ai_daily_insights").insert(allInsights);
      if (error) console.error("Insert insights error:", error);
    }

    // 6. Check and trigger OKR auto-generation
    const today = new Date().getDate();
    try {
      const { data: okrResult, error: okrError } = await supabase.rpc('check_okr_auto_generation_trigger', {
        current_day: today
      });
      if (okrError) console.error("OKR auto-gen trigger error:", okrError);
      else console.log("OKR auto-gen check:", okrResult);
    } catch (e) {
      console.error("OKR auto-gen check catch error:", e);
    }

    console.log(`Daily cron complete: ${allInsights.length} insights generated`);

    return new Response(JSON.stringify({ success: true, count: allInsights.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-ai-daily-cron error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
