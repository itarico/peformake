import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchResult {
  title?: string;
  description?: string;
  markdown?: string;
  url?: string;
}

const SERVICE_QUERIES: Record<string, (segment: string, name: string) => string[]> = {
  traffic: (segment, name) => [
    `estratégias tráfego pago Meta Ads ${segment} 2026`,
    `Google Ads ${segment} melhores campanhas criativos`,
    `copy anúncios alta conversão ${segment}`,
    `roteiro vídeo anúncio ${segment} vendas`,
    `tendências paid media ${segment} Brasil`,
  ],
  design: (segment, name) => [
    `referências design gráfico ${segment} instagram 2026`,
    `criativos para redes sociais ${segment} tendências`,
    `paleta de cores design ${segment} inspiração`,
    `design feed instagram ${segment} exemplos`,
  ],
  audiovisual: (segment, name) => [
    `ideias vídeos virais ${segment} reels tiktok 2026`,
    `roteiro vídeo curto ${segment} viral`,
    `tendências vídeo marketing ${segment} Brasil`,
    `formatos de vídeo ${segment} engajamento`,
  ],
};

async function searchFirecrawl(apiKey: string, query: string, limit = 3): Promise<SearchResult[]> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit, lang: "pt", country: "BR" }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.data || [];
  } catch (e) {
    console.error("Firecrawl search error:", e);
    return [];
  }
}

async function processWithAI(apiKey: string, serviceType: string, clientName: string, segment: string, rawResults: SearchResult[]): Promise<any[]> {
  if (rawResults.length === 0) return [];

  const resultsText = rawResults.map((r, i) => `${i + 1}. ${r.title || "Sem título"}\nURL: ${r.url || "N/A"}\nDescrição: ${r.description || r.markdown?.slice(0, 300) || "N/A"}`).join("\n\n");

  const prompts: Record<string, string> = {
    traffic: `Analise os resultados de pesquisa abaixo sobre tráfego pago para o nicho "${segment}" do cliente "${clientName}". Para cada resultado relevante, extraia:
- Estratégia de campanha aplicável (Meta Ads ou Google Ads)
- Sugestão de copy/headline
- Tipo de criativo recomendado
- Público-alvo sugerido
- Orçamento estimado se mencionado
Formate em markdown estruturado. Seja específico e acionável.`,
    design: `Analise os resultados sobre design para o nicho "${segment}" do cliente "${clientName}". Para cada resultado:
- Descreva a referência visual encontrada
- Sugira como adaptar para o cliente
- Indique paleta de cores/estilo se visível
- Destaque URLs de imagens/referências
Formate em markdown. Foque em referências práticas.`,
    audiovisual: `Analise os resultados sobre vídeo/audiovisual para o nicho "${segment}" do cliente "${clientName}". Para cada resultado:
- Descreva a ideia viral encontrada
- Sugira roteiro adaptado para o cliente (máx 60s)
- Formato recomendado (Reels, Stories, TikTok)
- Gancho/hook sugerido
Formate em markdown. Seja criativo e prático.`,
  };

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um especialista em marketing digital. Analise dados de pesquisa e gere insights acionáveis em português brasileiro." },
          { role: "user", content: `${prompts[serviceType]}\n\nRESULTADOS:\n${resultsText}` },
        ],
      }),
    });

    if (!resp.ok) return rawResults.map(r => ({ raw: true, result: r }));
    const data = await resp.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    return [{
      processed: true,
      content: aiContent,
      sources: rawResults.map(r => ({ title: r.title, url: r.url })),
    }];
  } catch {
    return rawResults.map(r => ({ raw: true, result: r }));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Parse request body for optional filters
    let serviceFilter: string | null = null;
    let clientFilter: string | null = null;
    let forceRun = false;
    try {
      const body = await req.json();
      serviceFilter = body.serviceType || null;
      clientFilter = body.clientId || null;
      forceRun = body.force === true;
    } catch { /* no body = run all */ }

    // Check last run time to avoid duplicate runs
    const servicesToRun = serviceFilter ? [serviceFilter] : ["traffic", "design", "audiovisual"];

    // Determine frequency: traffic every 2 days, design/audiovisual daily
    const now = new Date();
    const filteredServices: string[] = [];

    for (const svc of servicesToRun) {
      if (forceRun) {
        filteredServices.push(svc);
        continue;
      }
      const hoursThreshold = svc === "traffic" ? 48 : 24;
      const cutoff = new Date(now.getTime() - hoursThreshold * 60 * 60 * 1000).toISOString();

      const { count } = await supabase
        .from("ai_daily_insights")
        .select("id", { count: "exact", head: true })
        .eq("service_type", svc)
        .eq("auto_generated", true)
        .gte("created_at", cutoff);

      if (!count || count === 0) {
        filteredServices.push(svc);
      }
    }

    if (filteredServices.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No services need updating", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch clients
    let clientQuery = supabase
      .from("clients")
      .select("id, name, business_segment, business_description, target_audience, main_competitors, has_design_service, has_consulting_service")
      .eq("is_active", true);

    if (clientFilter) {
      clientQuery = clientQuery.eq("id", clientFilter);
    }

    const { data: clients } = await clientQuery;
    const allInsights: any[] = [];

    for (const client of (clients || []).slice(0, 10)) {
      const segment = client.business_segment || client.business_description || client.name;

      for (const serviceType of filteredServices) {
        const queries = SERVICE_QUERIES[serviceType](segment, client.name);

        // Run 2-3 queries per service per client
        const searchPromises = queries.slice(0, 3).map(q => searchFirecrawl(FIRECRAWL_API_KEY, q, 3));
        const searchResults = await Promise.all(searchPromises);
        const allResults = searchResults.flat();

        if (allResults.length === 0) continue;

        // Process with AI
        const processed = await processWithAI(LOVABLE_API_KEY, serviceType, client.name, segment, allResults);

        for (const item of processed) {
          if (item.processed) {
            // AI-processed insight
            const categoryMap: Record<string, string> = {
              traffic: "strategy",
              design: "reference",
              audiovisual: "viral_idea",
            };
            const titleMap: Record<string, string> = {
              traffic: `🎯 Estratégias de Tráfego - ${client.name}`,
              design: `🎨 Referências de Design - ${client.name}`,
              audiovisual: `🎬 Ideias Audiovisuais - ${client.name}`,
            };

            allInsights.push({
              target_type: "client",
              target_id: client.id,
              category: categoryMap[serviceType],
              service_type: serviceType,
              title: titleMap[serviceType],
              content: item.content,
              source_url: item.sources?.[0]?.url || null,
              media_type: "article",
              insight_format: "strategy",
              auto_generated: true,
              tags: [segment, serviceType, "auto-research"],
            });

            // Also save individual source links
            for (const src of (item.sources || [])) {
              if (src.url) {
                allInsights.push({
                  target_type: "client",
                  target_id: client.id,
                  category: "source_link",
                  service_type: serviceType,
                  title: src.title || "Referência",
                  content: src.title || "Link de referência",
                  source_url: src.url,
                  media_type: "link",
                  insight_format: "link",
                  auto_generated: true,
                  tags: [segment, serviceType, "source"],
                });
              }
            }
          } else if (item.raw) {
            // Raw result (AI failed)
            allInsights.push({
              target_type: "client",
              target_id: client.id,
              category: "raw_research",
              service_type: serviceType,
              title: item.result.title || "Pesquisa",
              content: item.result.description || item.result.markdown?.slice(0, 500) || "Conteúdo encontrado",
              source_url: item.result.url,
              media_type: "article",
              insight_format: "article",
              auto_generated: true,
              tags: [segment, serviceType, "raw"],
            });
          }
        }

        // Small delay between services
        await new Promise(r => setTimeout(r, 300));
      }

      // Delay between clients
      await new Promise(r => setTimeout(r, 500));
    }

    // Save all insights
    if (allInsights.length > 0) {
      const { error } = await supabase.from("ai_daily_insights").insert(allInsights);
      if (error) console.error("Insert error:", error);
    }

    console.log(`Service cron complete: ${allInsights.length} insights for ${filteredServices.join(", ")}`);

    return new Response(JSON.stringify({ success: true, count: allInsights.length, services: filteredServices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-ai-service-cron error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
