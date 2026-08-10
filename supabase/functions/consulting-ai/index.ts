import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_PROMPT = `Você é um consultor sênior de gestão estratégica para agências de marketing. 
Sua missão é transformar KPIs financeiros e operacionais em relatórios executivos focados em TOMADA DE DECISÃO.
Analise os dados com rigor, identifique gargalos e sugira ações práticas para aumentar o lucro e a retenção.`;

async function buildContext(supabase: any, monthId: string) {
  const context: any = { client: null, month: null, allFrameworksData: [], strategicData: [] };

  const { data: cm } = await supabase
    .from('consulting_months')
    .select('id, year, month, notes, client:clients(id, name, business_description, business_segment, target_audience)')
    .eq('id', monthId)
    .single();

  if (!cm) throw new Error('Month not found');
  
  context.month = { id: cm.id, year: cm.year, month: cm.month, notes: cm.notes };
  context.client = cm.client;

  const { data: instances } = await supabase
    .from('framework_instances')
    .select('id, status, framework:frameworks(id, slug, name, objective)')
    .eq('consulting_month_id', monthId);

  for (const inst of instances || []) {
    const { data: questions } = await supabase
      .from('framework_questions')
      .select('id, question_text')
      .eq('framework_id', inst.framework?.id);

    const { data: answers } = await supabase
      .from('framework_answers')
      .select('question_id, answer_text')
      .eq('instance_id', inst.id);

    const qaPairs = (questions || []).map((q: any) => ({
      question: q.question_text,
      answer: answers?.find((a: any) => a.question_id === q.id)?.answer_text || '',
    }));

    const answeredCount = qaPairs.filter((qa: any) => qa.answer).length;
    
    context.allFrameworksData.push({
      instanceId: inst.id,
      frameworkName: inst.framework?.name,
      objective: inst.framework?.objective,
      hasData: answeredCount > 0,
      qaPairs: qaPairs.filter((qa: any) => qa.answer),
    });
  }

  if (context.client?.id) {
    const { data: sd } = await supabase
      .from('client_strategic_data')
      .select('data_key, data_value')
      .eq('client_id', context.client.id);
    context.strategicData = sd || [];
  }

  return context;
}

function buildPrompt(context: any, analysisType: string) {
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const monthName = monthNames[(context.month?.month || 1) - 1];
  const refMonth = `${monthName} ${context.month?.year}`;

  let prompt = `## CLIENTE: ${context.client?.name || 'N/A'}
Negócio: ${context.client?.business_description || 'N/A'}
Segmento: ${context.client?.business_segment || 'N/A'}
Público: ${context.client?.target_audience || 'N/A'}

## MÊS: ${refMonth}
${context.month?.notes || ''}

## FRAMEWORKS:\n`;

  for (const fw of context.allFrameworksData.filter((f: any) => f.hasData)) {
    prompt += `\n### ${fw.frameworkName}\nObjetivo: ${fw.objective}\n`;
    for (const qa of fw.qaPairs) {
      prompt += `**${qa.question}**: ${qa.answer}\n`;
    }
  }

  if (context.strategicData.length > 0) {
    prompt += `\n## DADOS ESTRATÉGICOS:\n`;
    context.strategicData.forEach((sd: any) => { prompt += `- ${sd.data_key}: ${sd.data_value}\n`; });
  }

  const tasks: Record<string, string> = {
    diagnostico: `TAREFA: Diagnóstico consolidado - Forças, Gargalos, Oportunidades, Contradições, Prioridades para ${monthName}`,
    direcionamento: `TAREFA: Direcionamento para ${refMonth} - Foco, Mensagem, Comportamento, Canais, Tom`,
    plano_acao: `TAREFA: Plano de ação ${refMonth} - Ações, Recursos, Cronograma, Métricas`,
    sintese_mensal: `TAREFA: Síntese ${refMonth} - Resumo, Descobertas, Perfil, Posicionamento`,
    campanha: `TAREFA: Estratégia de Campanha ${refMonth} - Objetivo, Público, Anúncios, Mensagens, Segmentação, Métricas`,
    audiovisual: `TAREFA: Planejamento Audiovisual ${refMonth} - Estratégia, Calendário, Roteiros detalhados, Ideias virais`,
    design_grafico: `TAREFA: Design Gráfico ${refMonth} - Direção de arte, Artes feed (8+), Stories, Headlines`,
    social_midia: `TAREFA: Social Media ${refMonth} - Pilares, Calendário semanal, Legendas, Hashtags, Datas`,
  };

  prompt += `\n\n## ${tasks[analysisType] || tasks.diagnostico}\nAnalise TODOS os frameworks de forma cruzada. Seja específico e acionável.`;
  return prompt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    const { framework_instance_id, consulting_month_id, analysis_type, analysis_scope = 'month' } = reqBody;

    const monthId = consulting_month_id;
    const instanceId = framework_instance_id;
    const isGestao = analysis_type === 'diagnostico_gestao';

    if (!isGestao && !monthId && !instanceId) throw new Error("consulting_month_id or framework_instance_id required");
    if (!analysis_type) throw new Error("analysis_type required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userPrompt = "";
    let context: any = null;

    if (isGestao) {
      userPrompt = reqBody.prompt;
    } else {
      let resolvedMonthId = monthId;
      if (!resolvedMonthId && instanceId) {
        const { data: inst } = await supabase.from('framework_instances').select('consulting_month_id').eq('id', instanceId).single();
        if (!inst) throw new Error("Instance not found");
        resolvedMonthId = inst.consulting_month_id;
      }

      context = await buildContext(supabase, resolvedMonthId);
      const frameworksWithData = context.allFrameworksData.filter((f: any) => f.hasData);
      
      if (frameworksWithData.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhum framework preenchido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      userPrompt = buildPrompt(context, analysis_type);
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${LOVABLE_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "user", content: `${AI_PROMPT}\n\n${userPrompt}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI error ${response.status}:`, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysisContent = aiResponse.choices?.[0]?.message?.content;
    if (!analysisContent) throw new Error("No AI content");

    if (!isGestao) {
      const frameworksWithDataList = context.allFrameworksData.filter((f: any) => f.hasData);
      const saveInstanceId = instanceId || frameworksWithDataList[0]?.instanceId;
      if (!saveInstanceId) throw new Error("Nenhum framework encontrado para salvar a análise");
      const { data: saved, error: saveError } = await supabase
        .from('ai_analyses')
        .insert({ instance_id: saveInstanceId, analysis_type, analysis_scope, content: analysisContent, prompt_version: '2.1', model_used: 'openai/gpt-5-mini' })
        .select()
        .single();

      if (saveError) throw new Error(`Save failed: ${saveError.message}`);
      return new Response(JSON.stringify({ success: true, analysis: saved, frameworksAnalyzed: frameworksWithDataList.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, content: analysisContent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
