import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Get current month name in Portuguese
const getMonthName = (month: number): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1] || 'Mês atual';
};

// Category-specific prompts with structured output
const CATEGORY_PROMPTS: Record<string, (month: string, year: number) => string> = {
  video: (month, year) => `ROTEIROS DE VÍDEO - ${month} ${year}

Você é um roteirista profissional de conteúdo para redes sociais.

GERE ROTEIROS COMPLETOS E PRONTOS PARA GRAVAÇÃO baseados nos dados do cliente.

ESTRUTURA OBRIGATÓRIA:

ROTEIRO 1: [TEMA ESPECÍFICO DO NICHO]
Formato: [Reels/TikTok/Shorts/YouTube]
Duração: [segundos]
Objetivo: [awareness/engajamento/conversão]

Gancho (0-3s):
[Texto exato do que falar para prender atenção]

Desenvolvimento (3-30s):
[Texto completo do conteúdo principal, passo a passo do que falar]

CTA Final (últimos 5s):
[Chamada para ação específica]

Legenda sugerida:
[Legenda pronta para copiar]

Hashtags:
[5-10 hashtags relevantes]

---

ROTEIRO 2: [próximo tema]
[mesma estrutura]

(Gere no mínimo 8 roteiros diferentes, variando formatos e objetivos)

CALENDÁRIO DE PUBLICAÇÃO PARA ${month}:
Semana 1: [quais roteiros publicar]
Semana 2: [quais roteiros publicar]
Semana 3: [quais roteiros publicar]
Semana 4: [quais roteiros publicar]

DICAS DE GRAVAÇÃO:
- Iluminação recomendada
- Enquadramento
- Tom de voz
- Elementos visuais`,

  design: (month, year) => `ESTRUTURA DE ARTES - ${month} ${year}

Você é um diretor de arte especializado em redes sociais e marketing digital.

GERE A ESTRUTURA COMPLETA PARA CRIAÇÃO DAS ARTES baseado nos dados do cliente.
USE os produtos, preços e diferenciais do catálogo para criar artes ESPECÍFICAS e vendedoras.

FOCO PRINCIPAL: Headline, Subtítulo, CTA e descrição para o designer executar.

ESTRUTURA OBRIGATÓRIA PARA CADA ARTE:

ARTE 1: [TÍTULO DO POST - relacionado a um produto/serviço real do cliente]
Formato: [Carrossel X slides / Post único / Story / Banner]
Objetivo: [educativo/promocional/engajamento/conversão]
Plataforma: [Instagram/Facebook/LinkedIn]

HEADLINE: [Frase impactante de no máximo 6 palavras - use benefício real do produto]
SUBTÍTULO: [Texto de apoio que complementa a headline - pode incluir preço ou diferencial]
CTA: [Chamada visual clara - "Peça agora", "Saiba mais", preço, desconto, etc]

Legenda:
[Legenda completa pronta para usar - inclua emojis estratégicos]

Descrição para o designer:
[Orientações visuais detalhadas: cores, estilo, elementos, fotos necessárias, composição]

Referências de estilo:
[Descreva o mood visual: clean/bold/luxo/moderno/rústico/etc]

---

ARTE 2: [próxima - varie entre produtos/serviços diferentes]
[mesma estrutura]

(Gere no mínimo 10 estruturas de artes diferentes, priorizando:
- Artes de produtos/serviços com preços reais
- Artes institucionais com proposta de valor
- Artes de engajamento com perguntas ao público
- Artes de prova social/resultados
- Artes de datas sazonais do mês)

CALENDÁRIO DE POSTAGENS ${month}:
[Distribuição das artes por semana com datas específicas]

IDENTIDADE VISUAL RECOMENDADA:
- Paleta de cores principal
- Fontes sugeridas (headline e corpo)
- Estilo visual (clean/vibrante/minimalista/etc)
- Elementos gráficos recorrentes`,

  social_media: (month, year) => `CALENDÁRIO EDITORIAL - ${month} ${year}

Você é um estrategista de social media.

GERE O CALENDÁRIO EDITORIAL COMPLETO COM PLANEJAMENTO DIÁRIO.

ESTRUTURA OBRIGATÓRIA:

VISÃO GERAL DO MÊS:
- Datas comemorativas relevantes para o nicho em ${month}
- Oportunidades sazonais
- Eventos do setor
- Tendências do momento

CALENDÁRIO SEMANA A SEMANA:

SEMANA 1 (dias 1-7):

Segunda-feira:
- Plataforma: [Instagram/TikTok/etc]
- Formato: [Reels/Carrossel/Story/Post]
- Tema: [assunto específico]
- Horário: [melhor horário]
- Objetivo: [meta do post]
- Legenda resumida: [ideia da legenda]

Terça-feira:
[mesma estrutura]

[todos os dias da semana]

SEMANA 2 (dias 8-14):
[mesma estrutura completa]

SEMANA 3 (dias 15-21):
[mesma estrutura completa]

SEMANA 4 (dias 22-28/30/31):
[mesma estrutura completa]

PILARES DE CONTEÚDO:
- Pilar 1: [nome] - [%] - [descrição]
- Pilar 2: [nome] - [%] - [descrição]
- Pilar 3: [nome] - [%] - [descrição]
- Pilar 4: [nome] - [%] - [descrição]

ESTRATÉGIA DE ENGAJAMENTO:
- Horários de resposta
- Táticas de interação
- Stories interativos
- Lives programadas

HASHTAGS DO MÊS:
- Principais: [5 hashtags]
- Secundárias: [10 hashtags]
- De nicho: [5 hashtags]`,

  campaign: (month, year) => `ESTRATÉGIA DE CAMPANHA - ${month} ${year}

Você é um especialista em tráfego pago e estratégia de anúncios.

GERE A ESTRATÉGIA COMPLETA DE CAMPANHA baseada nos dados do cliente.

ESTRUTURA OBRIGATÓRIA:

OBJETIVO DA CAMPANHA:
[Definição clara do objetivo principal]

PÚBLICO-ALVO DETALHADO:

Público 1 - [Nome do público]:
- Faixa etária: [X-X anos]
- Gênero: [se relevante]
- Localização: [cidades/estados]
- Interesses: [lista detalhada]
- Comportamentos: [comportamentos de compra]
- Lookalike: [origem do lookalike]

Público 2 - [Nome do público]:
[mesma estrutura]

Público 3 - Remarketing:
- Visitantes do site: [últimos X dias]
- Engajadores: [última interação]
- Carrinho abandonado: [se aplicável]

ESTRUTURA DE CAMPANHA:

FASE 1 - TOPO DE FUNIL (Awareness):
- Objetivo: [Alcance/Visualização de vídeo]
- Orçamento: [% do total]
- Duração: [dias]
- Criativos: [tipos de anúncio]
- Copy principal: [texto do anúncio]

FASE 2 - MEIO DE FUNIL (Consideração):
- Objetivo: [Tráfego/Engajamento/Leads]
- Orçamento: [% do total]
- Duração: [dias]
- Criativos: [tipos de anúncio]
- Copy principal: [texto do anúncio]

FASE 3 - FUNDO DE FUNIL (Conversão):
- Objetivo: [Conversões/Vendas]
- Orçamento: [% do total]
- Duração: [dias]
- Criativos: [tipos de anúncio]
- Copy principal: [texto do anúncio]

CRIATIVOS SUGERIDOS:

Criativo 1:
- Formato: [Imagem/Vídeo/Carrossel]
- Headline: [texto exato]
- Descrição: [texto do anúncio]
- CTA: [botão]
- Descrição visual: [o que deve conter]

[mais criativos...]

MÉTRICAS E KPIs:
- CPM esperado: R$ [X]
- CPC esperado: R$ [X]
- CTR meta: [X]%
- CPA meta: R$ [X]
- ROAS meta: [X]x

CRONOGRAMA:
Semana 1: [ações]
Semana 2: [ações]
Semana 3: [ações]
Semana 4: [ações]

OTIMIZAÇÕES PREVISTAS:
- Dia [X]: [análise/ajuste]
- Dia [X]: [escalar/pausar]

ORÇAMENTO DETALHADO:
- Total: R$ [X]
- Topo: R$ [X] ([%])
- Meio: R$ [X] ([%])
- Fundo: R$ [X] ([%])`,

  trends_diy: (month, year) => `TENDÊNCIAS E CONTEÚDO DIY - ${month} ${year}

Você é um especialista em trends virais e conteúdo orgânico para redes sociais.

GERE IDEIAS DE CONTEÚDO QUE O PRÓPRIO CLIENTE PODE GRAVAR/CRIAR sem equipe profissional.

ESTRUTURA OBRIGATÓRIA:

TRENDS DO MOMENTO:
(Baseado nas tendências atuais de ${month} ${year})

TREND 1: [Nome da Trend]
- Plataforma original: [TikTok/Instagram/YouTube]
- Como adaptar para o nicho: [explicação]
- Áudio sugerido: [descrição do áudio popular]
- Roteiro simples:
  [Passo a passo do que fazer]
- Dica de gravação: [como gravar com celular]

TREND 2: [próxima]
[mesma estrutura]

(Gere no mínimo 5 trends atuais)

---

VÍDEOS SIMPLES QUE O CLIENTE PODE GRAVAR:

VÍDEO DIY 1: [Tipo do vídeo]
- Formato: [duração e estilo]
- O que mostrar: [descrição simples]
- Roteiro falado: [o que dizer, palavra por palavra]
- Legenda pronta: [texto para copiar]

VÍDEO DIY 2: [próximo]
[mesma estrutura]

(Gere no mínimo 8 ideias de vídeos simples)

---

IDEIAS DE STORIES INTERATIVOS:

STORY 1: [Tipo]
- Formato: [Enquete/Quiz/Pergunta/Slider]
- Texto: [o que escrever]
- Objetivo: [engajamento/pesquisa/vendas]

STORY 2: [próximo]
[mesma estrutura]

(Gere no mínimo 10 ideias de stories)

---

LIVES SUGERIDAS:

LIVE 1: [Tema]
- Duração: [minutos]
- Pauta:
  1. [Tópico de abertura]
  2. [Desenvolvimento]
  3. [Interação com público]
  4. [Fechamento + CTA]
- Melhor horário: [dia e hora]
- Dica de engajamento: [como manter público]

---

BASTIDORES E CONTEÚDO AUTÊNTICO:
- O que mostrar do dia a dia
- Momentos que humanizam a marca
- Erros e bloopers que engajam
- Behind the scenes sugeridos

CALENDÁRIO SEMANAL DE CONTEÚDO DIY:
Segunda: [tipo de conteúdo]
Terça: [tipo de conteúdo]
Quarta: [tipo de conteúdo]
Quinta: [tipo de conteúdo]
Sexta: [tipo de conteúdo]
Sábado: [tipo de conteúdo]
Domingo: [tipo de conteúdo]`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instance_id, consulting_month_id, content_category, client_context } = await req.json();

    if (!content_category) {
      throw new Error('content_category is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get month and client data
    let monthData: any = null;
    let clientData: any = null;

    if (consulting_month_id) {
      const { data: month } = await supabase
        .from('consulting_months')
        .select(`
          id, year, month,
          client:clients(id, name, business_description, business_segment, target_audience, main_competitors, value_proposition)
        `)
        .eq('id', consulting_month_id)
        .single();

      monthData = month;
      clientData = Array.isArray(month?.client) ? month.client[0] : month?.client;
    } else if (instance_id) {
      const { data: instance } = await supabase
        .from('framework_instances')
        .select(`
          consulting_month:consulting_months(
            id, year, month,
            client:clients(id, name, business_description, business_segment, target_audience, main_competitors, value_proposition)
          )
        `)
        .eq('id', instance_id)
        .single();

      const consultingMonth = Array.isArray(instance?.consulting_month) 
        ? instance.consulting_month[0] 
        : instance?.consulting_month;
      
      monthData = consultingMonth;
      clientData = Array.isArray(consultingMonth?.client) ? consultingMonth.client[0] : consultingMonth?.client;
    }

    // Get current month if not available
    const currentDate = new Date();
    const currentMonth = monthData?.month || (currentDate.getMonth() + 1);
    const currentYear = monthData?.year || currentDate.getFullYear();
    const monthName = getMonthName(currentMonth);

    // Get ALL framework data from the month for cross-reference (not just completed)
    let frameworkContext = '';
    if (monthData?.id) {
      const { data: instances } = await supabase
        .from('framework_instances')
        .select(`
          id, status,
          framework:frameworks(name, slug, objective),
          answers:framework_answers(
            question:framework_questions(question_text),
            answer_text
          )
        `)
        .eq('consulting_month_id', monthData.id);

      if (instances && instances.length > 0) {
        const frameworksWithData = instances.filter((inst: any) => {
          const answers = inst.answers as any[];
          return answers && answers.some((a: any) => a.answer_text?.trim());
        });

        if (frameworksWithData.length > 0) {
          frameworkContext = '\n\nDADOS CRUZADOS DE TODOS OS FRAMEWORKS DO MÊS:\n\n';
          
          for (const inst of frameworksWithData) {
            const framework = Array.isArray(inst.framework) ? inst.framework[0] : inst.framework;
            frameworkContext += `=== ${framework?.name?.toUpperCase()} ===\n`;
            if (framework?.objective) {
              frameworkContext += `Objetivo: ${framework.objective}\n`;
            }
            
            const answers = inst.answers as any[];
            for (const ans of answers || []) {
              if (ans.answer_text?.trim()) {
                const question = Array.isArray(ans.question) ? ans.question[0] : ans.question;
                frameworkContext += `- ${question?.question_text}: ${ans.answer_text}\n`;
              }
            }
            frameworkContext += '\n';
          }

          frameworkContext += `\n⚠️ INSTRUÇÃO CRÍTICA: Utilize TODOS os dados acima para gerar conteúdo personalizado. Cruze informações de diferentes frameworks para criar uma análise mais rica e alinhada com a estratégia do cliente.\n`;
        }
      }
    }

    // Get client products (4Ps - Product catalog with prices)
    let productsContext = '';
    const clientIdForProducts = clientData?.id;
    if (clientIdForProducts) {
      const { data: products } = await supabase
        .from('client_products')
        .select('name, description, category, price, cost, features')
        .eq('client_id', clientIdForProducts)
        .eq('is_active', true);

      if (products && products.length > 0) {
        productsContext = '\n\nCATÁLOGO DE PRODUTOS/SERVIÇOS DO CLIENTE (4Ps - Produto e Preço):\n\n';
        for (const p of products) {
          productsContext += `• ${p.name}`;
          if (p.category) productsContext += ` [${p.category}]`;
          if (p.price) productsContext += ` - R$ ${Number(p.price).toFixed(2)}`;
          productsContext += '\n';
          if (p.description) productsContext += `  Descrição: ${p.description}\n`;
          if (p.features) productsContext += `  Diferenciais: ${p.features}\n`;
        }
        productsContext += '\n⚠️ USE os produtos, preços e diferenciais acima para criar headlines, CTAs e descrições de artes ESPECÍFICAS. Mencione preços reais e benefícios concretos nas artes.\n';
      }

      // Get strategic data  
      const { data: strategicData } = await supabase
        .from('client_strategic_data')
        .select('data_key, data_value, source_framework')
        .eq('client_id', clientIdForProducts)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (strategicData && strategicData.length > 0) {
        productsContext += '\n\nDADOS ESTRATÉGICOS CONSOLIDADOS:\n';
        for (const d of strategicData) {
          productsContext += `- ${d.data_key}: ${d.data_value.substring(0, 500)}\n`;
        }
      }
    }

    // Get monthly focus
    let monthlyFocusContext = '';
    if (monthData?.id) {
      const { data: monthDetails } = await supabase
        .from('consulting_months')
        .select('monthly_focus, notes')
        .eq('id', monthData.id)
        .single();
      
      if (monthDetails?.monthly_focus || monthDetails?.notes) {
        monthlyFocusContext = '\n\nFOCO E PRIORIDADES DO MÊS:\n';
        if (monthDetails.monthly_focus) monthlyFocusContext += `Foco: ${monthDetails.monthly_focus}\n`;
        if (monthDetails.notes) monthlyFocusContext += `Notas: ${monthDetails.notes}\n`;
      }
    }

    // Get seasonality dates
    let seasonalityContext = '';
    if (monthData?.id) {
      const { data: dates } = await supabase
        .from('seasonality_dates')
        .select('title, date, category, importance, notes')
        .eq('consulting_month_id', monthData.id)
        .order('date');
      
      if (dates && dates.length > 0) {
        seasonalityContext = '\n\nDATAS SAZONAIS E COMEMORATIVAS DO MÊS:\n';
        for (const d of dates) {
          seasonalityContext += `- ${d.date}: ${d.title} (${d.importance || 'normal'})${d.notes ? ' - ' + d.notes : ''}\n`;
        }
      }
    }

    // Build the prompt
    const categoryPromptFn = CATEGORY_PROMPTS[content_category];
    const categoryPrompt = categoryPromptFn ? categoryPromptFn(monthName, currentYear) : CATEGORY_PROMPTS.social_media(monthName, currentYear);

    const systemPrompt = `Você é um consultor de marketing digital especializado.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
1. TÍTULOS de seções devem estar em MAIÚSCULAS
2. Seja DIRETO e OBJETIVO - sem enrolação
3. Use frases curtas e acionáveis
4. Use TODOS os dados dos frameworks para personalizar
5. CRUZE informações de diferentes frameworks
6. NÃO use sugestões genéricas
7. Considere o mês ${monthName} ${currentYear} para sazonalidade
8. NÃO use asteriscos (*) ou hashtags (#) para formatação
9. Use MAIÚSCULAS para títulos
10. Cada item deve ter no máximo 2-3 linhas
11. Priorize LISTAS e TÓPICOS ao invés de parágrafos longos
12. Seja PRÁTICO - conteúdo pronto para execução imediata`;

    const userPrompt = `CONTEXTO DO CLIENTE:

Nome: ${clientData?.name || client_context?.name || '[Não informado]'}
Negócio: ${clientData?.business_description || client_context?.business_description || '[Não informado]'}
Segmento: ${clientData?.business_segment || client_context?.business_segment || '[Não informado]'}
Público-alvo: ${clientData?.target_audience || client_context?.target_audience || '[Não informado]'}
Concorrentes: ${clientData?.main_competitors || client_context?.main_competitors || '[Não informado]'}
Proposta de valor: ${clientData?.value_proposition || client_context?.value_proposition || '[Não informado]'}

Mês de referência: ${monthName} ${currentYear}
${frameworkContext}
${productsContext}
${monthlyFocusContext}
${seasonalityContext}

---

${categoryPrompt}

---

Gere o conteúdo COMPLETO, ESPECÍFICO e PRONTO PARA USO. Seja detalhado e acionável.`;

    console.log('Generating content analysis for category:', content_category, 'month:', monthName, currentYear);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }), {
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

    console.log('Content analysis generated successfully for', content_category);
    
    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from('ai_analyses')
      .insert({
        instance_id: (await supabase.from('framework_instances').select('id').eq('consulting_month_id', monthData.id).limit(1).single()).data?.id,
        analysis_type: content_category,
        analysis_scope: 'month',
        content: content,
        prompt_version: '3.0',
        model_used: 'openai/gpt-5-mini'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: saved || content,
      category: content_category,
      month: monthName,
      year: currentYear,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in content analysis:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro na análise de conteúdo',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
