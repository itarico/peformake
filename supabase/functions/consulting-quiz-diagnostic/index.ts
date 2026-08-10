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
    const { answers, name, instagram_handle, score, level, business_name } = await req.json();

    if (!answers || !name) {
      return new Response(JSON.stringify({ error: 'answers and name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const answersText = Object.entries(answers)
      .map(([idx, ans]) => `Pergunta ${Number(idx) + 1}: ${ans}`)
      .join('\n');

    const systemPrompt = `Você é um consultor sênior de marketing digital da PEFORMAKE, uma agência especializada em performance e marketing estratégico.

Sua tarefa é gerar um diagnóstico RESUMIDO e DIRETO do marketing digital do cliente baseado nas respostas do quiz.

REGRAS IMPORTANTES:
- Seja direto, objetivo e construtivo — máximo 600 palavras
- Use dados das respostas para personalizar cada ponto
- Nunca invente métricas numéricas que você não conhece
- Recomende serviços PEFORMAKE quando aplicável
- Use emojis moderadamente
- Formate em markdown com seções claras e curtas

ESTRUTURA OBRIGATÓRIA:

## 🎯 Visão Geral
(2 frases resumindo a situação)

## ✅ Pontos Fortes
(2-3 bullets curtos)

## ⚠️ Gaps Críticos
(3 bullets curtos e diretos)

## 🚀 Próximos Passos
(3 ações prioritárias com serviço PEFORMAKE recomendado)

## 💡 Conclusão
(1 parágrafo motivacional curto)`;

    const userPrompt = `DADOS DO CLIENTE:
- Nome: ${name}
- Negócio: ${business_name || 'Não informado'}
- Instagram: ${instagram_handle || 'Não informado'}
- Score do Quiz: ${score}/33 (Nível: ${level})

RESPOSTAS DO QUIZ:
${answersText}

Gere o diagnóstico completo seguindo a estrutura obrigatória.`;

    // Generate diagnostic
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const diagnostic = data.choices?.[0]?.message?.content;

    if (!diagnostic) {
      throw new Error('Empty AI response');
    }

    // Generate qualification summary for admin
    const qualificationPrompt = `Baseado nas respostas do quiz, gere um RESUMO DE QUALIFICAÇÃO ultra-objetivo para a equipe comercial da agência.

DADOS:
- Nome: ${name}
- Negócio: ${business_name || 'Não informado'}
- Score: ${score}/33 (${level})
- Respostas: ${answersText}

FORMATO OBRIGATÓRIO (máximo 100 palavras):
**Qualificação:** [QUALIFICADO / PARCIALMENTE QUALIFICADO / NÃO QUALIFICADO]
**Potencial:** [ALTO / MÉDIO / BAIXO]
**Serviços recomendados:** [lista curta dos serviços mais adequados]
**Resumo:** [2 frases objetivas sobre o perfil do lead e por que é ou não qualificado]
**Prioridade de contato:** [URGENTE / NORMAL / BAIXA]`;

    let qualification = '';
    try {
      const qualResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: 'Você é um analista comercial. Responda APENAS no formato solicitado, sem introdução.' },
            { role: 'user', content: qualificationPrompt },
          ],
        }),
      });
      if (qualResponse.ok) {
        const qualData = await qualResponse.json();
        qualification = qualData.choices?.[0]?.message?.content || '';
      }
    } catch (e) {
      console.error('Qualification generation error:', e);
    }

    return new Response(JSON.stringify({ success: true, diagnostic, qualification }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in consulting-quiz-diagnostic:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
