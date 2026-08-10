const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ResearchRequest {
  instance_id: string;
  sites_to_search: string[];
  competitors: string[];
  keywords: string[];
  content_types: string[];
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
      sites_to_search,
      competitors,
      keywords,
      content_types,
      client_context,
    }: ResearchRequest = await req.json();

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

    console.log('Starting niche research for instance:', instance_id);
    console.log('Sites to search:', sites_to_search);
    console.log('Keywords:', keywords);

    const allScrapedContent: string[] = [];
    const allSearchResults: string[] = [];

    // 1. Scrape provided sites
    for (const siteUrl of sites_to_search.slice(0, 5)) {
      if (!siteUrl.trim()) continue;
      
      try {
        let formattedUrl = siteUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = `https://${formattedUrl}`;
        }

        console.log('Scraping site:', formattedUrl);
        
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          // Handle v1 response format: data might be nested
          const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
          if (markdown) {
            allScrapedContent.push(`--- Conteúdo de ${formattedUrl} ---\n${markdown.substring(0, 3000)}`);
            console.log('Successfully scraped:', formattedUrl, 'content length:', markdown.length);
          } else {
            console.log('No markdown content from:', formattedUrl, 'response:', JSON.stringify(scrapeData).substring(0, 200));
          }
        } else {
          const errorText = await scrapeResponse.text();
          console.error('Scrape failed for:', formattedUrl, 'status:', scrapeResponse.status, 'error:', errorText);
        }
      } catch (error) {
        console.error('Error scraping site:', siteUrl, error);
      }
    }

    // 2. Search for keywords + niche + trends
    const searchQueries = [
      ...keywords.slice(0, 3).map(keyword => 
        `${keyword} ${client_context.business_segment || ''} tendências ${new Date().getFullYear()}`
      ),
      `tendências do momento ${client_context.business_segment || ''} ${new Date().getFullYear()}`,
      `viral ${client_context.business_segment || ''} redes sociais`,
    ];

    for (const query of searchQueries) {
      try {
        console.log('Searching for:', query);
        
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
            tbs: 'qdr:m', // Last month for fresh trends
            scrapeOptions: {
              formats: ['markdown'],
            },
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const results = searchData?.data || [];
          console.log('Search results count:', results.length, 'for query:', query);
          
          for (const result of results.slice(0, 3)) {
            const content = result.markdown || result.description || '';
            if (content) {
              allSearchResults.push(`--- ${result.title || 'Resultado'} (${result.url}) ---\n${content.substring(0, 2000)}`);
            }
          }
        } else {
          const errorText = await searchResponse.text();
          console.error('Search failed for:', query, 'status:', searchResponse.status, 'error:', errorText);
        }
      } catch (error) {
        console.error('Error searching:', query, error);
      }
    }

    console.log('Total scraped sites:', allScrapedContent.length);
    console.log('Total search results:', allSearchResults.length);

    // 3. Analyze with AI using tool calling for structured output
    const combinedContent = [
      '=== CONTEÚDO DOS SITES ANALISADOS ===',
      ...allScrapedContent,
      '\n=== RESULTADOS DE PESQUISA ===',
      ...allSearchResults,
    ].join('\n\n');

    const systemPrompt = `Você é um especialista em análise de mercado e planejamento de conteúdo digital.

REGRAS:
- Seja específico para o segmento do cliente
- NÃO use asteriscos ou hashtags para formatação
- Informações devem ser acionáveis e prontas para execução

CONTEXTO DO CLIENTE:
- Segmento: ${client_context.business_segment || 'Não especificado'}
- Descrição: ${client_context.business_description || 'Não especificado'}
- Público-alvo: ${client_context.target_audience || 'Não especificado'}
- Concorrentes: ${client_context.main_competitors || competitors.join(', ') || 'Não especificado'}
- Proposta de valor: ${client_context.value_proposition || 'Não especificado'}

TIPOS DE CONTEÚDO PRIORITÁRIOS: ${content_types.join(', ') || 'Todos'}`;

    const userPrompt = `Analise o conteúdo coletado e extraia insights para o cliente:

PALAVRAS-CHAVE PESQUISADAS: ${keywords.join(', ')}

${combinedContent.substring(0, 18000)}`;

    console.log('Sending to AI for analysis...');

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
              name: 'niche_research_report',
              description: 'Gera um relatório estruturado de pesquisa de nicho.',
              parameters: {
                type: 'object',
                properties: {
                  tendencias: { type: 'string', description: 'Tendências identificadas no nicho (texto detalhado)' },
                  formatos_populares: { type: 'string', description: 'Formatos de conteúdo mais usados no mercado' },
                  ideias_conteudo: { type: 'string', description: 'Lista de 10-15 ideias de conteúdo específicas' },
                  temas_sazonais: { type: 'string', description: 'Temas e oportunidades sazonais' },
                  hashtags_keywords: { type: 'string', description: 'Hashtags e palavras-chave recomendadas' },
                  resumo_estrategico: { type: 'string', description: 'Resumo executivo com principais insights' },
                },
                required: ['tendencias', 'formatos_populares', 'ideias_conteudo', 'temas_sazonais', 'hashtags_keywords', 'resumo_estrategico'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'niche_research_report' } },
        temperature: 0.5,
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
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();

    let analysisResults: any;
    try {
      const toolArgs = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      analysisResults = toolArgs ? JSON.parse(toolArgs) : null;
      if (!analysisResults) throw new Error('No tool output');
      console.log('Successfully parsed AI tool output');
    } catch (parseError) {
      console.error('Error parsing AI tool output:', parseError);
      const fallbackText = aiData?.choices?.[0]?.message?.content || '';
      analysisResults = {
        tendencias: fallbackText,
        formatos_populares: '',
        ideias_conteudo: '',
        temas_sazonais: '',
        hashtags_keywords: '',
        resumo_estrategico: '',
      };
    }

    console.log('Research completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResults,
        scraped_sites: allScrapedContent.length,
        search_results: allSearchResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in niche research:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro na pesquisa de nicho' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
