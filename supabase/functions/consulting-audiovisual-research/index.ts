import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// AI Provider types
type AIProvider = 'lovable' | 'openrouter';

interface AICallResult {
  data: any;
  provider: AIProvider;
}

// Unified AI call with automatic fallback
async function callAIWithFallback(requestBody: any): Promise<AICallResult> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

  // Try Lovable AI first
  if (lovableApiKey) {
    console.log('Trying Lovable AI...');
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Lovable AI success');
        return { data, provider: 'lovable' };
      }

      // Check for payment/rate limit errors - fallback to OpenRouter
      if (response.status === 402 || response.status === 429) {
        console.log(`Lovable AI returned ${response.status}, falling back to OpenRouter...`);
      } else {
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        throw new Error(`Lovable AI error: ${response.status}`);
      }
    } catch (error) {
      console.error('Lovable AI call failed:', error);
      // Continue to OpenRouter fallback
    }
  }

  // Fallback to OpenRouter
  if (!openRouterApiKey) {
    throw new Error('No AI provider available. Please configure OPENROUTER_API_KEY as fallback.');
  }

  console.log('Using OpenRouter fallback...');
  
  // Map model names for OpenRouter
  const modelMapping: Record<string, string> = {
    'google/gemini-3-flash-preview': 'google/gemini-2.0-flash-001',
    'google/gemini-2.5-flash': 'google/gemini-2.0-flash-001',
    'google/gemini-2.5-pro': 'google/gemini-2.0-flash-thinking-exp:free',
  };
  
  const originalModel = requestBody.model || 'google/gemini-3-flash-preview';
  const openRouterModel = modelMapping[originalModel] || 'google/gemini-2.0-flash-001';
  
  const openRouterBody = {
    ...requestBody,
    model: openRouterModel,
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://peformake.lovable.app',
      'X-Title': 'Peformake',
    },
    body: JSON.stringify(openRouterBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter error:', response.status, errorText);
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  console.log('OpenRouter success');
  return { data, provider: 'openrouter' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context } = await req.json();
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    let searchResults = '';

    // Try Firecrawl search
    if (firecrawlApiKey) {
      try {
        console.log('Searching with Firecrawl:', query);
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
          const data = await searchResponse.json();
          const results = data?.data || [];
          searchResults = results.map((r: any) => 
            `${r.title || ''}: ${r.markdown?.substring(0, 500) || r.description || ''}`
          ).join('\n\n');
          console.log('Firecrawl returned', results.length, 'results');
        }
      } catch (e) {
        console.error('Firecrawl error:', e);
      }
    }

    // Process with AI
    const aiPrompt = searchResults 
      ? `Analise os resultados de pesquisa e extraia insights relevantes para criação de conteúdo audiovisual.

RESULTADOS DA PESQUISA:
${searchResults}

Retorne insights práticos e acionáveis, sem formatação markdown. Foque em:
1. Tendências identificadas
2. Oportunidades de conteúdo
3. Estratégias que estão funcionando
4. Adaptações sugeridas para o nicho do cliente`
      : `Baseado no contexto do cliente, sugira tendências e oportunidades de conteúdo audiovisual relevantes.`;

    const requestBody = {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { 
          role: 'system', 
          content: `Você é um especialista em pesquisa de tendências de conteúdo audiovisual.
          
CONTEXTO DO CLIENTE:
${context}

Analise dados e retorne insights acionáveis para criação de vídeos.
NÃO use formatação markdown.` 
        },
        { role: 'user', content: aiPrompt },
      ],
    };

    console.log('Calling AI for research analysis...');
    const { data, provider } = await callAIWithFallback(requestBody);
    const result = data.choices?.[0]?.message?.content || searchResults || 'Sem resultados';

    console.log('Research AI response received, provider:', provider);

    return new Response(
      JSON.stringify({ result, aiProvider: provider }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
