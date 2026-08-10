import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { framework_instance_id, target_question_id, assistant_answers, client_context, content_category } = await req.json();

    if (!framework_instance_id || !assistant_answers) {
      throw new Error('framework_instance_id and assistant_answers are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch framework instance with framework details
    const { data: instance, error: instanceError } = await supabase
      .from('framework_instances')
      .select(`
        id,
        framework:frameworks(id, name, slug, objective),
        consulting_month:consulting_months(
          id, year, month,
          client:clients(id, name, business_description, business_segment, target_audience)
        )
      `)
      .eq('id', framework_instance_id)
      .single();

    if (instanceError || !instance) {
      throw new Error('Framework instance not found');
    }

    // Extract nested data
    const framework = Array.isArray(instance.framework) ? instance.framework[0] : instance.framework;
    const consultingMonth = Array.isArray(instance.consulting_month) ? instance.consulting_month[0] : instance.consulting_month;
    const clientData = consultingMonth?.client 
      ? (Array.isArray(consultingMonth.client) ? consultingMonth.client[0] : consultingMonth.client)
      : null;

    if (!framework) {
      throw new Error('Framework not found');
    }

    // MODE 1: Generate answer for a SINGLE question (target_question_id provided)
    if (target_question_id) {
      // Fetch the specific guided question
      const { data: targetQuestion, error: targetQuestionError } = await supabase
        .from('framework_questions')
        .select('id, question_text, field_type, placeholder')
        .eq('id', target_question_id)
        .single();

      if (targetQuestionError || !targetQuestion) {
        throw new Error('Target question not found');
      }

      // Fetch assistant questions for this specific guided question
      const { data: assistantQuestions } = await supabase
        .from('framework_assistant_questions')
        .select('id, question_text, question_type, options')
        .eq('framework_id', framework.id)
        .eq('target_question_id', target_question_id)
        .order('question_order');

      // Build context from assistant answers
      const assistantContext = assistantQuestions?.map(q => {
        const answer = assistant_answers[q.id];
        return `- ${q.question_text}: ${Array.isArray(answer) ? answer.join(', ') : answer || 'Não respondido'}`;
      }).join('\n') || '';

      const clientContextSection = clientData ? `
## CONTEXTO DO CLIENTE
- Nome: ${clientData.name}
- Descrição do Negócio: ${clientData.business_description || client_context?.business_description || 'Não informado'}
- Segmento: ${clientData.business_segment || client_context?.business_segment || 'Não informado'}
- Público-alvo: ${clientData.target_audience || client_context?.target_audience || 'Não informado'}
` : '';

      // Build content category specific instructions
      const categoryInstructions: Record<string, string> = {
        video: `
FOCO: CONTEÚDO EM VÍDEO
- Gere ideias para: Reels, TikToks, YouTube Shorts, Lives, Vídeos longos
- Inclua sugestões de formato, duração e estilo visual
- Pense em ganchos iniciais e CTAs`,
        artes: `
FOCO: CONTEÚDO DE ARTES ESTÁTICAS
- Gere ideias para: Carrosséis, posts únicos, stories estáticos, banners, infográficos
- Inclua sugestões de elementos visuais e cores
- Pense na hierarquia de informação e legibilidade`,
        social_media: `
FOCO: MIX DE CONTEÚDO PARA REDES SOCIAIS
- Gere ideias para: Instagram, TikTok, LinkedIn, Facebook, X/Twitter
- Inclua sugestões de formato ideal para cada rede
- Pense em adaptações e crossposting`,
        trafego: `
FOCO: CRIATIVOS E COPIES PARA TRÁFEGO PAGO
- Gere ideias para: Meta Ads, Google Ads, YouTube Ads
- Inclua sugestões de headlines, copies e CTAs
- Pense em público-alvo e segmentação`,
        todos: `
FOCO: TODOS OS FORMATOS DE CONTEÚDO
- Inclua ideias para vídeos, artes, social media e tráfego pago
- Diversifique formatos e plataformas
- Adapte cada ideia ao formato mais adequado`,
      };

      const categorySection = content_category && categoryInstructions[content_category] 
        ? `\n${categoryInstructions[content_category]}\n` 
        : '';

      const systemPrompt = `Você é um consultor de marketing estratégico especializado. Sua tarefa é gerar uma resposta detalhada e profissional para uma pergunta específica de um framework de consultoria.

Com base nas informações fornecidas pelo usuário, crie um texto elaborado, estratégico e acionável.
${categorySection}
REGRAS:
1. A resposta deve ter entre 3-6 frases, ser específica e estratégica
2. Use linguagem profissional de consultoria
3. Baseie-se nas informações fornecidas, mas expanda com insights estratégicos
4. Não invente dados numéricos específicos, mas pode fazer projeções qualitativas
5. Adapte o tom ao segmento e porte da empresa
6. Seja direto e objetivo, sem rodeios
${content_category ? '7. IMPORTANTE: Foque exclusivamente no tipo de conteúdo solicitado acima' : ''}`;

      const userPrompt = `${clientContextSection}

## FRAMEWORK: ${framework.name}
Objetivo: ${framework.objective || 'Análise estratégica'}
${content_category ? `\n## TIPO DE CONTEÚDO: ${content_category.toUpperCase()}` : ''}

## PERGUNTA A RESPONDER
${targetQuestion.question_text}

## INFORMAÇÕES COLETADAS DO USUÁRIO SOBRE ESTA PERGUNTA
${assistantContext}

---

Com base nas informações acima, gere uma resposta detalhada e estratégica para a pergunta "${targetQuestion.question_text}".
${content_category ? `\nFOQUE EXCLUSIVAMENTE em ideias de ${content_category === 'video' ? 'VÍDEO' : content_category === 'artes' ? 'ARTES ESTÁTICAS' : content_category === 'social_media' ? 'SOCIAL MEDIA' : content_category === 'trafego' ? 'TRÁFEGO PAGO' : 'TODOS OS FORMATOS'}.` : ''}

A resposta deve ser um texto corrido e profissional, pronto para ser usado em um documento de consultoria.

Retorne APENAS o texto da resposta, sem formatação JSON ou explicações adicionais.`;

      console.log('Calling Lovable AI Gateway for single question...');

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

      console.log('AI Response for single question:', content);

      return new Response(JSON.stringify({
        success: true,
        generated_answer: content.trim(),
        framework_name: framework.name,
        question_text: targetQuestion.question_text,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MODE 2: Generate answers for ALL questions (no target_question_id)
    // Fetch the guided questions for this framework
    const { data: guidedQuestions, error: questionsError } = await supabase
      .from('framework_questions')
      .select('id, question_text, field_type, placeholder')
      .eq('framework_id', framework.id)
      .order('question_order');

    if (questionsError) {
      throw new Error('Failed to fetch guided questions');
    }

    // Fetch all assistant questions for context
    const { data: assistantQuestions } = await supabase
      .from('framework_assistant_questions')
      .select('id, question_text, question_type, options')
      .eq('framework_id', framework.id)
      .order('question_order');

    // Build context from assistant answers
    const assistantContext = assistantQuestions?.map(q => {
      const answer = assistant_answers[q.id];
      return `- ${q.question_text}: ${Array.isArray(answer) ? answer.join(', ') : answer || 'Não respondido'}`;
    }).join('\n') || '';

    const clientContextSection = clientData ? `
## CONTEXTO DO CLIENTE
- Nome: ${clientData.name}
- Descrição do Negócio: ${clientData.business_description || client_context?.business_description || 'Não informado'}
- Segmento: ${clientData.business_segment || client_context?.business_segment || 'Não informado'}
- Público-alvo: ${clientData.target_audience || client_context?.target_audience || 'Não informado'}
` : '';

    const guidedQuestionsSection = guidedQuestions?.map((q, i) => 
      `${i + 1}. ${q.question_text}${q.placeholder ? ` (Ex: ${q.placeholder})` : ''}`
    ).join('\n') || '';

    const systemPrompt = `Você é um consultor de marketing estratégico especializado. Sua tarefa é gerar respostas detalhadas e profissionais para perguntas guiadas de frameworks de consultoria.

Com base nas informações simplificadas fornecidas pelo usuário, você deve criar textos elaborados, estratégicos e acionáveis para cada pergunta guiada.

REGRAS:
1. Cada resposta deve ter entre 2-5 frases, ser específica e estratégica
2. Use linguagem profissional de consultoria
3. Baseie-se nas informações fornecidas, mas expanda com insights estratégicos
4. Não invente dados numéricos específicos, mas pode fazer projeções qualitativas
5. Mantenha coerência entre todas as respostas
6. Adapte o tom ao segmento e porte da empresa`;

    const userPrompt = `${clientContextSection}

## FRAMEWORK: ${framework.name}
Objetivo: ${framework.objective || 'Análise estratégica'}

## INFORMAÇÕES COLETADAS DO USUÁRIO
${assistantContext}

## PERGUNTAS GUIADAS QUE PRECISAM DE RESPOSTA
${guidedQuestionsSection}

---

Com base nas informações acima, gere uma resposta detalhada e estratégica para CADA pergunta guiada.

Retorne EXATAMENTE no formato JSON:
{
  "answers": {
    "${guidedQuestions?.[0]?.id || 'question_id'}": "Resposta elaborada para a primeira pergunta...",
    ...
  }
}

Gere respostas para todas as ${guidedQuestions?.length || 0} perguntas listadas acima.`;

    console.log('Calling Lovable AI Gateway for all questions...');

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
    let generatedAnswers: Record<string, string> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        generatedAnswers = parsed.answers || parsed;
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify({
      success: true,
      generated_answers: generatedAnswers,
      framework_name: framework.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in consulting-ai-assistant:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
