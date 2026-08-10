import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { niche, location, requirements } = await req.json();

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!firecrawlKey || !openRouterKey) {
      throw new Error('API Keys not configured');
    }

    // Step 1: Search for real companies using Firecrawl
    const searchQuery = `empresas de ${niche} em ${location} instagram linkedin site`;
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 8,
        lang: 'pt'
      }),
    });

    const searchData = await searchResponse.json();
    
    if (!searchData.success) {
      throw new Error('Erro na busca Firecrawl: ' + JSON.stringify(searchData));
    }

    // Step 2: Use GPT-4o to extract and format the data
    const prompt = `Com base nos seguintes resultados de busca real, extraia dados de 5 empresas REAIS no nicho "${niche}" em "${location}".
    
    Resultados da busca:
    ${JSON.stringify(searchData.data)}

    Para cada empresa, identifique:
    - Nome, Localização exata (se possível), Telefone, Instagram (@user), E-mail, Nome do provável Decisor/CEO e Website.
    - Classifique em TIER A (Premium/Grande), B (Médio) ou C (Pequeno) com base nos sinais (ex: site profissional, localização, descrição).
    - Atribua um Score de 0 a 10.
    
    Requisitos:
    - Instagram: ${requirements.has_instagram ? 'Obrigatório' : 'Desejável'}
    - Decisor: ${requirements.has_ceo ? 'Obrigatório' : 'Desejável'}

    Retorne APENAS um JSON no seguinte formato:
    [
      {
        "company_name": "string",
        "niche": "${niche}",
        "location": "string",
        "ceo_name": "string",
        "company_instagram": "string",
        "phone": "string",
        "email": "string",
        "address": "string",
        "website": "string",
        "qualification_score": number,
        "revenue_estimate": "string",
        "tier": "A" | "B" | "C",
        "is_verified": true
      }
    ]`;

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: 'Você é um especialista em extração de leads reais via web search.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Low temperature for better JSON extraction
      }),
    });

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    const leads = JSON.parse(content.replace(/```json|```/g, '').trim());

    return new Response(JSON.stringify(leads), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Lead Prospector Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
