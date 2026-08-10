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

type DesignDetailMode = 'standard' | 'expanded';

const DESIGN_ART_STYLE_GUIDES: Record<string, string> = {
  post_estatico: `POST ESTÁTICO:
- Foque em uma mensagem principal com alto impacto de leitura em 1-2 segundos
- Entregue headline principal + 3 variações alternativas
- Traga subtítulo persuasivo com benefício concreto e contexto de oferta
- Entregue CTA principal + 2 variações com ângulos psicológicos diferentes`,
  carrossel: `CARROSSEL:
- O briefing DEVE conter estrutura completa para no mínimo 5 slides
- Para cada slide: objetivo, headline, texto de apoio (2-3 frases) e direção visual
- Slide 1 precisa ser capa com gancho forte
- Slide final deve ter fechamento com CTA direto e ação clara`,
  stories: `STORIES:
- Estruture sequência de 3 a 5 stories conectados
- Para cada story: texto curto (leitura em até 3 segundos), elemento visual e sticker interativo
- Traga CTA de continuidade no último story`,
  ads: `ADS:
- Foco total em conversão/venda, sem linguagem genérica
- Entregue 3 ângulos de anúncio (A/B/C): dor, benefício e prova/autoridade
- Traga headline principal + variações de teste e CTA orientado à ação
- Inclua proposta de oferta, urgência e elementos de prova social`,
  banner: `BANNER:
- Priorização de hierarquia visual: headline > oferta > CTA
- Entregue variações para 2 formatos com ajustes de composição
- Reforce legibilidade e contraste para leitura rápida`,
  thumbnail: `THUMBNAIL:
- Foque em impacto visual imediato e legibilidade em tamanho reduzido
- Entregue texto curto de alto contraste com 3 opções
- Direcione expressão visual para clique e curiosidade`,
};

function getDesignStyleGuide(artStyle?: string): string {
  if (!artStyle) return DESIGN_ART_STYLE_GUIDES.post_estatico;
  const key = artStyle.toLowerCase().trim();
  return DESIGN_ART_STYLE_GUIDES[key] || DESIGN_ART_STYLE_GUIDES.post_estatico;
}

function getDesignDetailGuide(detailMode?: DesignDetailMode): string {
  if (detailMode === 'expanded') {
    return `MODO MAIS INFORMAÇÕES (OBRIGATÓRIO):
- Expanda headline, subtítulo e CTA com racional estratégico
- Traga variações: mínimo 3 headlines e 3 CTAs
- Descreva composição visual completa, hierarquia e aplicação prática
- Nunca responder com conteúdo curto`; 
  }

  return `MODO PADRÃO:
- Ainda assim, evite respostas curtas
- Entregue conteúdo completo e pronto para execução`;
}

function buildDesignResultText(parsed: any): string {
  const explanation = parsed?.explanation?.trim() || '';
  const briefings = Array.isArray(parsed?.briefings) ? parsed.briefings : [];

  const detailedBlocks = briefings.map((briefing: any, index: number) => {
    const headlineVariations = Array.isArray(briefing?.headline_variacoes)
      ? briefing.headline_variacoes.filter(Boolean).join(' | ')
      : '';
    const ctaVariations = Array.isArray(briefing?.cta_variacoes)
      ? briefing.cta_variacoes.filter(Boolean).join(' | ')
      : '';

    return [
      `${index + 1}. ${briefing?.titulo || 'Briefing'}`,
      `Tipo: ${briefing?.tipo || 'post_instagram'}`,
      `Destino: ${briefing?.destino || 'Instagram Feed'}`,
      briefing?.headline ? `Headline: ${briefing.headline}` : '',
      headlineVariations ? `Variações de Headline: ${headlineVariations}` : '',
      briefing?.subtitle ? `Subtítulo: ${briefing.subtitle}` : '',
      briefing?.cta ? `CTA: ${briefing.cta}` : '',
      ctaVariations ? `Variações de CTA: ${ctaVariations}` : '',
      briefing?.descricao ? `Descrição: ${briefing.descricao}` : '',
      briefing?.observacoes ? `Observações: ${briefing.observacoes}` : '',
      briefing?.detalhamento ? `Detalhamento: ${briefing.detalhamento}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [explanation, ...detailedBlocks].filter(Boolean).join('\n\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, context, conversationHistory, userMessage, type, destination, artStyle, detailMode, prompt } = await req.json();

    let systemPrompt = '';
    let userPrompt = '';
    let useToolCalling = false;

    if (action === 'chat') {
      systemPrompt = `Você é uma especialista em Social Media criativa e estratégica.
Seu papel é ajudar a criar ideias de conteúdo, legendas, estratégias de engajamento e planejamentos para redes sociais.

CONTEXTO DO CLIENTE:
${context}

REGRAS IMPORTANTES:
- Seja criativa, prática e direta
- NÃO use formatação markdown (asteriscos, hashtags para títulos, bullet points com -)
- Use números para listas quando necessário (1. 2. 3.)
- Separe seções por linhas em branco
- Gere conteúdo pronto para uso
- Considere as tendências atuais de redes sociais
- Foque no que gera engajamento real
- Personalize todas as sugestões para o nicho do cliente
- Inclua chamadas para ação quando apropriado
- Considere o foco do mês ao sugerir conteúdos

HISTÓRICO DA CONVERSA:
${conversationHistory || 'Início da conversa'}`;

      userPrompt = userMessage;
    } else if (action === 'design_briefing') {
      useToolCalling = true;
      const styleGuide = getDesignStyleGuide(artStyle);
      const detailGuide = getDesignDetailGuide(detailMode as DesignDetailMode | undefined);
      
      systemPrompt = `Você é uma especialista sênior em Design Gráfico e Direção de Arte para marketing digital.
Seu papel é criar briefings profundos, específicos e prontos para execução.

CONTEXTO DO CLIENTE:
${context}

DESTINO DA ARTE: ${destination || 'Instagram Feed'}
ESTILO DE ARTE SELECIONADO: ${artStyle || 'post_estatico'}

REGRA CRÍTICA DE QUALIDADE:
- NUNCA responda com apenas Headline/Subtítulo/CTA curtos
- NUNCA entregue texto genérico que serve para qualquer negócio
- Use dados reais do contexto do cliente para definir a mensagem
- O conteúdo deve ser detalhado e acionável

GUIA OBRIGATÓRIO POR ESTILO:
${styleGuide}

NÍVEL DE DETALHE:
${detailGuide}

REGRAS DE EXECUÇÃO:
- Headline principal: forte e objetiva
- Subtítulo: benefício e contexto claro
- CTA: orientado à ação
- Descrição: conceito visual completo (layout, hierarquia, elementos, leitura)
- Observações: recomendações técnicas (cores, tipografia, composição)
- Detalhamento: desenvolvimento estratégico para o texto da peça (inclusive variações)

HISTÓRICO DA CONVERSA:
${conversationHistory || 'Início da conversa'}`;

      userPrompt = `${userMessage}

IMPORTANTE: Gere briefing(s) completo(s) no formato estruturado, incluindo explicação estratégica detalhada e variações de headline/CTA quando aplicável.`;
    } else if (action === 'stories') {
      const isWeekly = type === 'semana';
      
      systemPrompt = `Você é uma especialista em Stories do Instagram.
Seu papel é criar planejamentos detalhados de stories que engajam e convertem.

CONTEXTO DO CLIENTE:
${context}

REGRAS IMPORTANTES:
- NÃO use formatação markdown (asteriscos, hashtags, bullet points com -)
- Use números para listas quando necessário
- Separe seções claramente por linha em branco
- Seja específica no conteúdo (diga O QUE postar, não apenas "poste algo sobre X")
- Inclua ideias de texto, enquetes, caixas de perguntas quando apropriado
- Considere a jornada do seguidor ao longo do dia
- Varie os formatos (foto, vídeo, enquete, quiz, caixa de perguntas)
- Personalize para o nicho do cliente`;

      if (isWeekly) {
        userPrompt = `Crie um planejamento SEMANAL de stories (segunda a domingo).

Para cada dia, organize assim:

[DIA DA SEMANA]

MANHÃ
Tipo: [foto/vídeo/enquete/quiz/caixa de perguntas]
Conteúdo: [descrição detalhada do que postar, incluindo texto sugerido se aplicável]
Objetivo: [engajamento/conexão/vendas/autoridade]

TARDE
Tipo: [foto/vídeo/enquete/quiz/caixa de perguntas]
Conteúdo: [descrição detalhada do que postar]
Objetivo: [engajamento/conexão/vendas/autoridade]

NOITE
Tipo: [foto/vídeo/enquete/quiz/caixa de perguntas]
Conteúdo: [descrição detalhada do que postar]
Objetivo: [engajamento/conexão/vendas/autoridade]

Considere o foco do mês e crie uma sequência que faça sentido ao longo da semana, construindo relacionamento e autoridade.`;
      } else {
        userPrompt = `Crie um planejamento DIÁRIO de stories para HOJE.

Organize assim:

MANHÃ (7h-12h)
Tipo: [foto/vídeo/enquete/quiz/caixa de perguntas]
Conteúdo: [descrição detalhada do que postar, incluindo texto sugerido]
Objetivo: [por que este story funciona neste horário]

TARDE (12h-18h)
Tipo: [foto/vídeo/enquete/quiz/caixa de perguntas]
Conteúdo: [descrição detalhada do que postar, incluindo texto sugerido]
Objetivo: [por que este story funciona neste horário]

NOITE (18h-22h)
Tipo: [foto/vídeo/enquete/quiz/caixa de perguntas]
Conteúdo: [descrição detalhada do que postar, incluindo texto sugerido]
Objetivo: [por que este story funciona neste horário]

Seja específica e criativa. O conteúdo deve estar pronto para ser executado.`;
      }
    } else if (action === 'generate_planning') {
      systemPrompt = `Você é uma estrategista de social media com mais de 10 anos de experiência.
Gere planejamentos de conteúdo completos, detalhados e prontos para execução.
Use o formato exato: "DIA X: [Título]" seguido de "Legenda: [texto]" para cada dia.
Inclua sempre: CTA, hashtags relevantes e tipo de formato (carrossel, reels, stories, post).
Nunca pule dias. Gere TODOS os dias solicitados.`;
      userPrompt = prompt || userMessage;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling AI for social media:', action, 'useToolCalling:', useToolCalling);

    const requestBody: any = {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.65,
      max_tokens: 12000,
    };

    // Add tool calling for design briefing
    if (useToolCalling) {
      requestBody.tools = [
        {
          type: 'function',
          function: {
            name: 'generate_design_briefings',
            description: 'Gera briefings estruturados para design gráfico',
            parameters: {
              type: 'object',
              properties: {
                briefings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      titulo: { type: 'string', description: 'Título da arte' },
                      tipo: { type: 'string', enum: ['post_instagram', 'story', 'carrossel'], description: 'Tipo de arte' },
                      destino: { type: 'string', description: 'Destino da arte (ex: Instagram Feed, Banner Site)' },
                      headline: { type: 'string', description: 'Headline principal (máx 6 palavras)' },
                      headline_variacoes: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Variações de headline para teste e refinamento',
                      },
                      subtitle: { type: 'string', description: 'Subtítulo persuasivo com benefício concreto' },
                      cta: { type: 'string', description: 'CTA principal direto e acionável' },
                      cta_variacoes: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Variações de CTA com ângulos diferentes',
                      },
                      descricao: { type: 'string', description: 'Descrição detalhada do conceito visual' },
                      observacoes: { type: 'string', description: 'Observações técnicas: cores, estilo, elementos visuais, composição' },
                      detalhamento: { type: 'string', description: 'Desenvolvimento estratégico completo do texto da peça, incluindo aplicação prática do conteúdo' },
                    },
                    required: ['titulo', 'tipo', 'destino', 'headline', 'subtitle', 'cta', 'descricao', 'observacoes', 'detalhamento'],
                    additionalProperties: false,
                  },
                },
                explanation: { type: 'string', description: 'Explicação estratégica detalhada dos briefings gerados' },
              },
              required: ['briefings', 'explanation'],
              additionalProperties: false,
            },
          },
        },
      ];
      requestBody.tool_choice = { type: 'function', function: { name: 'generate_design_briefings' } };
    }

    // Try streaming for chat action
    if (action === 'chat') {
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (lovableKey) {
        try {
          const streamRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...requestBody, stream: true }),
          });
          if (streamRes.ok && streamRes.body) {
            console.log('Chat streaming via Lovable AI');
            return new Response(streamRes.body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
          }
          if (streamRes.status === 429 || streamRes.status === 402) {
            return new Response(JSON.stringify({ error: `Erro: ${streamRes.status}` }), {
              status: streamRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (e) { console.error('Chat streaming failed:', e); }
      }
    }

    // Non-streaming fallback (all actions or when streaming fails)
    const { data, provider } = await callAIWithFallback(requestBody);
    
    // Handle tool calling response for design briefing
    if (useToolCalling) {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          console.log('Design briefings generated:', parsed.briefings?.length || 0);
          const resultText = buildDesignResultText(parsed);
          return new Response(
            JSON.stringify({ 
              result: resultText || 'Briefings gerados com sucesso!',
              briefings: parsed.briefings || [],
              aiProvider: provider,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (parseError) {
          console.error('Error parsing tool call:', parseError);
        }
      }
    }

    const result = data.choices?.[0]?.message?.content || '';
    console.log('AI response received, length:', result.length, 'provider:', provider);

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
