import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_name, answers } = await req.json();

    if (!client_name || !answers) {
      throw new Error('client_name and answers are required');
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Format answers for the prompt
    const answersText = Object.entries(answers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const systemPrompt = `Você é um estrategista de marketing digital especializado em criar descrições de negócios para uso em ferramentas de IA.

Sua tarefa é gerar um contexto de negócio estruturado baseado nas respostas do usuário sobre a empresa.

IMPORTANTE:
- Seja conciso mas informativo
- Foque em informações estratégicas úteis para marketing
- Use linguagem profissional
- Não invente informações que não foram fornecidas`;

    const userPrompt = `Com base nas seguintes informações sobre o cliente "${client_name}", gere um contexto de negócio estruturado:

${answersText}

Retorne EXATAMENTE no formato JSON:
{
  "business_description": "Descrição detalhada do negócio em 2-3 frases, incluindo o que faz, como opera e principais diferenciais",
  "business_segment": "Segmento/nicho específico do mercado (ex: Moda feminina plus size, Odontologia estética, SaaS B2B)",
  "target_audience": "Descrição do público-alvo principal (ex: Mulheres 25-40 anos, classes A/B, que buscam autoestima)",
  "main_competitors": "Principais concorrentes identificados com base no tipo de negócio e segmento",
  "value_proposition": "Proposta de valor única que diferencia este negócio dos concorrentes"
}`;

    console.log('Calling Lovable AI Gateway for context generation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error('AI Gateway error');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI');
    }

    console.log('AI Response:', content);

    // Parse the JSON response
    let generatedContext = {
      business_description: '',
      business_segment: '',
      target_audience: '',
      main_competitors: '',
      value_proposition: '',
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        generatedContext = {
          business_description: parsed.business_description || '',
          business_segment: parsed.business_segment || '',
          target_audience: parsed.target_audience || '',
          main_competitors: parsed.main_competitors || '',
          value_proposition: parsed.value_proposition || '',
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify({
      success: true,
      ...generatedContext,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in consulting-generate-context:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
