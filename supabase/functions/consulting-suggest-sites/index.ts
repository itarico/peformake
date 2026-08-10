import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SuggestSitesRequest {
  client_context: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
    main_competitors?: string;
    value_proposition?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_context }: SuggestSitesRequest = await req.json();

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API de IA não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const segment = client_context.business_segment || client_context.business_description || 'negócio';
    const audience = client_context.target_audience || '';

    // Search queries to find relevant sites
    const searchQueries = [
      `${segment} melhores blogs sites referência`,
      `${segment} influenciadores digitais ${audience}`,
      `${segment} portais notícias mercado`,
    ];

    console.log('Searching for sites with queries:', searchQueries);

    const allResults: string[] = [];

    // Perform searches using Firecrawl
    for (const query of searchQueries) {
      try {
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: 5,
            lang: 'pt',
            country: 'BR',
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && Array.isArray(searchData.data)) {
            for (const result of searchData.data) {
              if (result.url) {
                allResults.push(`${result.url} - ${result.title || ''}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in search query:', query, error);
      }
    }

    console.log(`Found ${allResults.length} results from Firecrawl`);

    // Use AI to filter and rank the most relevant sites
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em marketing digital e pesquisa de nicho.
Sua tarefa é analisar uma lista de sites e selecionar os 5-8 mais relevantes para análise de nicho.

CRITÉRIOS DE SELEÇÃO:
- Blogs e portais com conteúdo educativo do nicho
- Sites de influenciadores ou referências do mercado
- Concorrentes diretos e indiretos
- Portais de notícias do setor
- Evitar sites genéricos (Wikipedia, redes sociais principais, etc.)

FORMATO DE RESPOSTA:
Retorne APENAS as URLs, uma por linha, sem explicações.
Máximo 8 sites.`
          },
          {
            role: 'user',
            content: `CONTEXTO DO CLIENTE:
Segmento: ${segment}
Público-alvo: ${audience}
Descrição: ${client_context.business_description || 'Não informado'}
Concorrentes conhecidos: ${client_context.main_competitors || 'Não informados'}

SITES ENCONTRADOS:
${allResults.join('\n')}

Selecione os sites mais relevantes para análise de nicho:`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições atingido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Fallback: return raw results
      const uniqueUrls = [...new Set(allResults.map(r => r.split(' - ')[0]))].slice(0, 8);
      return new Response(
        JSON.stringify({ 
          success: true, 
          suggested_sites: uniqueUrls,
          source: 'firecrawl_raw'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Extract URLs from AI response
    const urlRegex = /https?:\/\/[^\s]+/g;
    const suggestedUrls = aiContent.match(urlRegex) || [];
    
    // Clean URLs (remove trailing punctuation)
    const cleanedUrls = suggestedUrls.map((url: string) => 
      url.replace(/[,.:;!?)\]}>]+$/, '')
    );

    console.log('AI suggested sites:', cleanedUrls);

    return new Response(
      JSON.stringify({
        success: true,
        suggested_sites: cleanedUrls.slice(0, 8),
        total_found: allResults.length,
        source: 'ai_filtered'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in consulting-suggest-sites:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao sugerir sites' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
