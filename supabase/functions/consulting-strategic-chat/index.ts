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
    const { messages, client_id } = await req.json();

    if (!messages || !client_id) {
      throw new Error('messages and client_id are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all client data in parallel
    const [
      clientRes,
      productsRes,
      strategicRes,
      consultingMonthsRes,
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', client_id).single(),
      supabase.from('client_products').select('name, description, category, price, features').eq('client_id', client_id).eq('is_active', true),
      supabase.from('client_strategic_data').select('data_key, data_value, source_framework').eq('client_id', client_id).order('updated_at', { ascending: false }).limit(30),
      supabase.from('consulting_months').select('id, year, month, monthly_focus, notes, is_complete').eq('client_id', client_id).order('year', { ascending: false }).order('month', { ascending: false }).limit(6),
    ]);

    const client = clientRes.data;
    if (!client) throw new Error('Client not found');

    // Fetch framework data from recent consulting months
    const monthIds = consultingMonthsRes.data?.map((m: any) => m.id) || [];
    let frameworkContext = '';
    let contentAnalysesContext = '';
    let researchContext = '';
    let seasonalityContext = '';

    if (monthIds.length > 0) {
      const [instancesRes, contentRes, researchRes, seasonRes] = await Promise.all([
        supabase.from('framework_instances')
          .select('id, status, framework:frameworks(name, slug)')
          .in('consulting_month_id', monthIds),
        supabase.from('content_analyses')
          .select('category, content')
          .in('consulting_month_id', monthIds)
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase.from('firecrawl_research_data')
          .select('title, content, source_type')
          .in('consulting_month_id', monthIds)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('seasonality_dates')
          .select('title, date, category, importance')
          .in('consulting_month_id', monthIds)
          .order('date'),
      ]);

      // Fetch answers for all instances
      const instanceIds = instancesRes.data?.map((i: any) => i.id) || [];
      if (instanceIds.length > 0) {
        const { data: answers } = await supabase
          .from('framework_answers')
          .select('instance_id, question:framework_questions(question_text), answer_text')
          .in('instance_id', instanceIds)
          .not('answer_text', 'is', null);

        if (answers?.length) {
          const grouped: Record<string, string[]> = {};
          for (const a of answers) {
            const inst = instancesRes.data?.find((i: any) => i.id === a.instance_id);
            const fwName = (inst?.framework as any)?.name || 'Framework';
            if (!grouped[fwName]) grouped[fwName] = [];
            const qText = (a.question as any)?.question_text || '';
            if (a.answer_text?.trim()) {
              grouped[fwName].push(`${qText}: ${a.answer_text.substring(0, 400)}`);
            }
          }
          frameworkContext = Object.entries(grouped)
            .map(([name, items]) => `[${name}]\n${items.join('\n')}`)
            .join('\n\n');
        }
      }

      if (contentRes.data?.length) {
        contentAnalysesContext = contentRes.data
          .map((d: any) => `[${d.category.toUpperCase()}]\n${d.content.substring(0, 600)}`)
          .join('\n\n');
      }

      if (researchRes.data?.length) {
        researchContext = researchRes.data
          .map((d: any) => `[${d.source_type}] ${d.title || ''}: ${d.content.substring(0, 400)}`)
          .join('\n\n');
      }

      if (seasonRes.data?.length) {
        seasonalityContext = seasonRes.data
          .map((d: any) => `${d.date} - ${d.title} (${d.category || 'geral'})`)
          .join('\n');
      }
    }

    // Build products context
    const productsContext = productsRes.data?.length
      ? productsRes.data.map((p: any) => `${p.name}${p.category ? ` (${p.category})` : ''}: ${p.description || 'Sem descrição'}${p.price ? ` - R$${p.price}` : ''}`).join('\n')
      : '';

    // Build strategic data context
    const strategicContext = strategicRes.data?.length
      ? strategicRes.data.map((d: any) => `${d.data_key}: ${d.data_value.substring(0, 300)}`).join('\n')
      : '';

    // Monthly focus
    const monthlyFocusContext = consultingMonthsRes.data?.length
      ? consultingMonthsRes.data
          .filter((m: any) => m.monthly_focus || m.notes)
          .map((m: any) => `${m.month}/${m.year}: ${m.monthly_focus || ''} ${m.notes || ''}`.trim())
          .join('\n')
      : '';

    const systemPrompt = `Você é o ESTRATEGISTA-CHEFE de uma agência de marketing digital. Você pensa como o dono da agência — com visão 360° do negócio do cliente.

## SEU PAPEL
- Você é um consultor sênior que conhece PROFUNDAMENTE este cliente
- Você cruza TODAS as informações disponíveis para dar respostas inteligentes
- Você age proativamente: sugere, questiona, provoca reflexão
- Você pensa em resultados MENSURÁVEIS e ações CONCRETAS
- Você tem visão de negócio, não apenas de marketing

## COMO VOCÊ RESPONDE
- Seja direto, prático e estratégico
- Use linguagem profissional mas acessível
- Sempre que possível, conecte suas respostas aos dados do cliente
- Sugira ações concretas com prazos e responsáveis quando fizer sentido
- Questione premissas quando necessário
- Proponha testes e experimentos
- Pense em funil completo: atração, conversão, retenção

## DADOS DO CLIENTE: ${client.name}
- Segmento: ${client.business_segment || 'Não informado'}
- Descrição: ${client.business_description || 'Não informado'}
- Público-alvo: ${client.target_audience || 'Não informado'}
- Concorrentes: ${client.main_competitors || 'Não informado'}
- Proposta de Valor: ${client.value_proposition || 'Não informado'}

${productsContext ? `## PRODUTOS/SERVIÇOS\n${productsContext}` : ''}

${strategicContext ? `## DADOS ESTRATÉGICOS\n${strategicContext}` : ''}

${frameworkContext ? `## FRAMEWORKS E ANÁLISES REALIZADAS\n${frameworkContext}` : ''}

${contentAnalysesContext ? `## ANÁLISES DE CONTEÚDO\n${contentAnalysesContext}` : ''}

${researchContext ? `## PESQUISAS E TENDÊNCIAS\n${researchContext}` : ''}

${seasonalityContext ? `## DATAS SAZONAIS\n${seasonalityContext}` : ''}

${monthlyFocusContext ? `## FOCOS MENSAIS\n${monthlyFocusContext}` : ''}

## REGRAS IMPORTANTES
1. NUNCA invente dados que não foram fornecidos
2. Se faltar informação, PERGUNTE ao usuário
3. Sempre conecte suas sugestões ao contexto real do cliente
4. Seja proativo: se perceber uma oportunidade, sugira mesmo sem ser perguntado
5. Use formatação markdown para organizar suas respostas
6. Responda em português brasileiro`;

    console.log(`Strategic chat for client ${client.name}, context size: ~${systemPrompt.length} chars`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit atingido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'Erro no gateway de IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Strategic chat error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
