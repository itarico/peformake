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
    const { question_id, question_text, framework_name, client_context } = await req.json();

    if (!question_text || !client_context) {
      throw new Error('question_text and client_context are required');
    }

    // Build client context section
    const clientContextSection = client_context ? `
## CONTEXTO DO CLIENTE
- Nome: ${client_context.name || 'Não informado'}
- Descrição do Negócio: ${client_context.business_description || 'Não informado'}
- Segmento: ${client_context.business_segment || 'Não informado'}
- Público-alvo: ${client_context.target_audience || 'Não informado'}
` : '';

    const systemPrompt = `Você é um assistente de marketing estratégico. Sua tarefa é ajudar clientes a responderem perguntas de frameworks de consultoria de forma clara e estratégica.

Com base nas informações do cliente, gere uma sugestão de resposta que seja:
1. Específica para o negócio do cliente
2. Estratégica e acionável
3. Clara e objetiva (2-5 frases)
4. Profissional mas acessível

REGRAS:
- Não invente dados específicos que você não conhece
- Foque em insights estratégicos relevantes para o tipo de negócio
- Use linguagem simples e direta
- Seja útil e construtivo`;

    const userPrompt = `${clientContextSection}

## FRAMEWORK: ${framework_name || 'Análise Estratégica'}

## PERGUNTA A RESPONDER
${question_text}

---

Com base no contexto do cliente acima, gere uma sugestão de resposta clara e estratégica para a pergunta.

Retorne APENAS o texto da resposta, sem formatação ou explicações adicionais.`;

    console.log('Calling AI for portal suggestion...');

    const requestBody = {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    const { data, provider } = await callAIWithFallback(requestBody);
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI');
    }

    console.log('Portal AI response received, provider:', provider);

    return new Response(JSON.stringify({
      success: true,
      suggestion: content.trim(),
      aiProvider: provider,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in consulting-portal-ai:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
