const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SeasonalityRequest {
  instance_id: string;
  month_period: string;
  business_segment: string;
  location: string;
  ai_only?: boolean;
  client_context: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
    main_competitors?: string;
    value_proposition?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      instance_id,
      month_period,
      business_segment,
      location,
      ai_only,
      client_context,
    }: SeasonalityRequest = await req.json();

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting seasonality research for:', month_period);
    console.log('Business segment:', business_segment);
    console.log('Location:', location);

    const searchResults: string[] = [];
    const segment = business_segment || client_context.business_segment || 'varejo';
    const loc = location || 'Brasil';
    let firecrawlWorked = false;

    // Skip Firecrawl if ai_only flag is set
    if (!ai_only && firecrawlApiKey) {
      // Search queries for seasonality
      const yearHint = (() => {
        const match = month_period?.match(/(\d{4})/);
        return match ? match[1] : String(new Date().getFullYear());
      })();

      const searchQueries = [
        `${month_period} datas comemorativas ${segment} ${loc}`,
        `${month_period} tendências consumo ${segment}`,
        `calendário sazonal ${segment} ${yearHint} ${loc}`,
      ];

      // Execute searches with timeout and retry
      for (const query of searchQueries) {
        try {
          console.log('Searching for:', query);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              limit: 3,
              lang: 'pt',
              country: 'BR',
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const results = searchData?.data || [];
            
            for (const result of results.slice(0, 2)) {
              const content = result.markdown || result.description || '';
              if (content) {
                searchResults.push(`--- ${result.title || 'Resultado'} ---\n${content.substring(0, 1500)}`);
                firecrawlWorked = true;
              }
            }
          }
        } catch (error) {
          console.error('Error searching:', query, error);
          // Continue to next query or fallback to AI
        }
      }
    }

    console.log('Firecrawl worked:', firecrawlWorked, 'Results:', searchResults.length);

    // Analyze with AI - use knowledge even if Firecrawl failed
    const combinedContent = searchResults.length > 0 
      ? searchResults.join('\n\n')
      : 'Sem fontes externas - use seu conhecimento sobre o período.';

    const systemPrompt = `Você é um especialista em planejamento de marketing sazonal e comportamento do consumidor brasileiro.

REGRAS:
- Seja específico para o segmento e o mês solicitado
- Use linguagem objetiva e pronta para execução
- NÃO use asteriscos ou hashtags para formatação
- Liste as principais DATAS COMEMORATIVAS do mês com dia exato
- Se não tiver certeza de uma data específica, use "aproximadamente" ou "verificar"
- SEMPRE inclua datas fixas conhecidas (Dia das Mães, Natal, etc.)

CONTEXTO DO CLIENTE:
- Período analisado: ${month_period}
- Segmento: ${segment}
- Localização: ${loc}
- Descrição do negócio: ${client_context.business_description || 'Não especificado'}
- Público-alvo: ${client_context.target_audience || 'Não especificado'}
- Proposta de valor: ${client_context.value_proposition || 'Não especificado'}`;

    const userPrompt = firecrawlWorked 
      ? `Com base nas fontes abaixo e seu conhecimento, gere a análise de sazonalidade para ${month_period}.

FONTES (trechos):
${combinedContent.substring(0, 15000)}`
      : `Use seu conhecimento sobre o calendário brasileiro para gerar a análise de sazonalidade para ${month_period}.

Inclua:
1. Todas as datas comemorativas importantes do mês (com dia exato quando possível)
2. Tendências de consumo típicas do período
3. Oportunidades de campanha para o segmento ${segment}
4. Comportamentos de compra esperados`;

    console.log('Sending to AI for seasonality analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'seasonality_report',
              description: 'Gera um relatório estruturado de sazonalidade para o mês/periodo.',
              parameters: {
                type: 'object',
                properties: {
                  datas_comemorativas: { type: 'string' },
                  comportamento_compra: { type: 'string' },
                  tendencias_sazonais: { type: 'string' },
                  oportunidades_conteudo: { type: 'string' },
                  eventos_mercado: { type: 'string' },
                  recomendacoes_campanhas: { type: 'string' },
                  palavras_chave_sazonais: { type: 'string' },
                  resumo_executivo: { type: 'string' },
                },
                required: [
                  'datas_comemorativas',
                  'comportamento_compra',
                  'tendencias_sazonais',
                  'oportunidades_conteudo',
                  'eventos_mercado',
                  'recomendacoes_campanhas',
                  'palavras_chave_sazonais',
                  'resumo_executivo',
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'seasonality_report' } },
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Créditos insuficientes. Adicione créditos ao workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();

    let analysisResults: any;
    try {
      const toolArgs = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      analysisResults = toolArgs ? JSON.parse(toolArgs) : null;
      if (!analysisResults) throw new Error('No tool output');
    } catch (parseError) {
      console.error('Error parsing AI tool output:', parseError);
      const fallbackText = aiData?.choices?.[0]?.message?.content || '';
      analysisResults = {
        datas_comemorativas: fallbackText,
        comportamento_compra: '',
        tendencias_sazonais: '',
        oportunidades_conteudo: '',
        eventos_mercado: '',
        recomendacoes_campanhas: '',
        palavras_chave_sazonais: '',
        resumo_executivo: '',
      };
    }

    console.log('Seasonality research completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResults,
        search_results: searchResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in seasonality research:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro na análise de sazonalidade' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
