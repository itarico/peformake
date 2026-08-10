import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { client_id, year, month, generate_client_summary, full_analysis, auto_analysis } = body

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // AUTO ANALYSIS MODE: process all active clients
    if (auto_analysis) {
      const { data: clients } = await supabase
        .from('clients').select('id, name, business_segment').eq('is_active', true)
      
      const now = new Date()
      const y = year || now.getFullYear()
      const m = month || (now.getMonth() + 1)
      let processed = 0

      for (const cl of (clients || [])) {
        // Fetch actual campaign metrics
        const { data: campaigns } = await supabase
          .from('traffic_campaigns').select('*')
          .eq('client_id', cl.id).eq('year', y).eq('month', m)
        
        if (!campaigns || campaigns.length === 0) continue

        const totalInv = campaigns.reduce((s, c) => s + (c.investment || 0), 0)
        const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0)
        const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0)
        const totalImpr = campaigns.reduce((s, c) => s + (c.impressions || 0), 0)
        const totalMsgs = campaigns.reduce((s, c) => s + (c.messages_started || 0), 0)
        const totalRev = campaigns.reduce((s, c) => s + (c.revenue_generated || 0), 0)
        const cpl = totalLeads > 0 ? totalInv / totalLeads : (totalMsgs > 0 ? totalInv / totalMsgs : 0)
        const ctr = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0
        const roas = totalInv > 0 ? totalRev / totalInv : 0

        const campaignDetails = campaigns.map(c =>
          `- ${c.campaign_name} (${c.objective || 'N/A'}, ${c.status}): Invest R$${(c.investment||0).toFixed(2)}, Leads ${c.leads||0}, CPL R$${(c.cost_per_lead||0).toFixed(2)}, CTR ${(c.ctr||0).toFixed(2)}%, ROAS ${(c.roas||0).toFixed(2)}x, Msgs ${c.messages_started||0}`
        ).join('\n')

        const metricsStr = `Invest total: R$${totalInv.toFixed(2)} | Leads: ${totalLeads} | CPL: R$${cpl.toFixed(2)} | CTR: ${ctr.toFixed(2)}% | ROAS: ${roas.toFixed(2)}x | Conversas: ${totalMsgs}`

        // Generate analysis with action extraction via tool calling
        const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: `Você é um estrategista de tráfego pago. Analise as métricas reais e:
1. Gere um diagnóstico objetivo (máx 500 palavras) com ações concretas.
2. Extraia ações urgentes que o gestor precisa executar.

Português do Brasil.` },
              { role: 'user', content: `Cliente: ${cl.name} (${cl.business_segment || 'N/A'})\nMês: ${m}/${y}\n\nMétricas consolidadas: ${metricsStr}\n\nCampanhas:\n${campaignDetails}` },
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'report_actions',
                description: 'Report urgent actions the traffic manager should take',
                parameters: {
                  type: 'object',
                  properties: {
                    analysis: { type: 'string', description: 'Full analysis text in markdown' },
                    actions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          action_type: { type: 'string', enum: ['budget_low', 'high_cpa', 'low_ctr', 'scale_opportunity', 'creative_fatigue', 'pause_campaign', 'custom'] },
                          severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
                          title: { type: 'string', description: 'Short action title, max 60 chars' },
                          description: { type: 'string', description: 'Action description with context, max 200 chars' },
                        },
                        required: ['action_type', 'severity', 'title', 'description'],
                        additionalProperties: false,
                      }
                    }
                  },
                  required: ['analysis', 'actions'],
                  additionalProperties: false,
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'report_actions' } },
          }),
        })

        if (!res.ok) { console.error(`Auto analysis failed for ${cl.name}:`, await res.text()); continue }
        const aiData = await res.json()
        
        let content = ''
        let actions: any[] = []
        
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0]
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments)
            content = parsed.analysis || ''
            actions = parsed.actions || []
          } catch { content = aiData.choices?.[0]?.message?.content || '' }
        } else {
          content = aiData.choices?.[0]?.message?.content || ''
        }
        
        if (content.length > 50) {
          await supabase.from('traffic_ai_analyses').insert({
            client_id: cl.id, year: y, month: m,
            analysis_type: 'auto', content,
          })

          // Clear old unresolved actions for this month and insert new ones
          await supabase.from('traffic_ai_actions')
            .delete()
            .eq('client_id', cl.id).eq('year', y).eq('month', m).eq('is_resolved', false)

          if (actions.length > 0) {
            await supabase.from('traffic_ai_actions').insert(
              actions.map((a: any) => ({
                client_id: cl.id, year: y, month: m,
                action_type: a.action_type,
                severity: a.severity,
                title: a.title,
                description: a.description,
              }))
            )
          }

          processed++
        }
      }

      return new Response(JSON.stringify({ success: true, processed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Client summary generation (non-streaming)
    if (generate_client_summary && full_analysis) {
      const summaryRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é um especialista em tráfego pago. Resuma a análise abaixo em um texto CURTO e OBJETIVO (máx 200 palavras) para o CLIENTE final. Use linguagem simples, sem jargões técnicos. Foque nos resultados positivos, pontos de melhoria e próximos passos. NÃO use markdown.' },
            { role: 'user', content: full_analysis },
          ],
        }),
      })
      if (!summaryRes.ok) throw new Error('Erro ao gerar resumo')
      const summaryData = await summaryRes.json()
      const summary = summaryData.choices?.[0]?.message?.content || ''
      return new Response(JSON.stringify({ client_summary: summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const targetYear = year || now.getFullYear()
    const targetMonth = month || (now.getMonth() + 1)

    // Fetch client info
    const { data: client } = await supabase
      .from('clients')
      .select('name, business_segment, business_description, target_audience, value_proposition, main_competitors')
      .eq('id', client_id)
      .single()

    // Fetch campaigns (current month + last 5 months)
    const { data: campaigns } = await supabase
      .from('traffic_campaigns')
      .select('*')
      .eq('client_id', client_id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(200)

    // Fetch campaign strategy framework data
    const { data: consultingMonths } = await supabase
      .from('consulting_months')
      .select('id')
      .eq('client_id', client_id)

    let frameworkData = ''
    if (consultingMonths?.length) {
      const cmIds = consultingMonths.map(cm => cm.id)
      const { data: instances } = await supabase
        .from('framework_instances')
        .select('id, framework_id, frameworks(name, slug)')
        .in('consulting_month_id', cmIds)

      const campaignInstances = (instances || []).filter(
        (i: any) => i.frameworks?.slug === 'campaign-strategy'
      )

      if (campaignInstances.length > 0) {
        const instIds = campaignInstances.map(i => i.id)
        const { data: answers } = await supabase
          .from('framework_answers')
          .select('answer_text, question_id, framework_questions(question_text)')
          .in('instance_id', instIds)

        if (answers?.length) {
          frameworkData = answers
            .filter((a: any) => a.answer_text)
            .map((a: any) => `**${a.framework_questions?.question_text}:** ${a.answer_text}`)
            .join('\n')
        }
      }
    }

    // Build metrics summary
    const currentCampaigns = (campaigns || []).filter(
      (c: any) => c.year === targetYear && c.month === targetMonth
    )

    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

    const buildMonthSummary = (cList: any[], label: string) => {
      if (!cList.length) return `${label}: Sem dados`
      const inv = cList.reduce((s: number, c: any) => s + (c.investment || 0), 0)
      const clicks = cList.reduce((s: number, c: any) => s + (c.clicks || 0), 0)
      const leads = cList.reduce((s: number, c: any) => s + (c.leads || 0), 0)
      const conv = cList.reduce((s: number, c: any) => s + (c.conversions || 0), 0)
      const msgs = cList.reduce((s: number, c: any) => s + (c.messages_started || 0), 0)
      const reach = cList.reduce((s: number, c: any) => s + (c.reach || 0), 0)
      const impr = cList.reduce((s: number, c: any) => s + (c.impressions || 0), 0)
      const rev = cList.reduce((s: number, c: any) => s + (c.revenue_generated || 0), 0)
      const linkClicks = cList.reduce((s: number, c: any) => s + (c.link_clicks || 0), 0)
      const cpl = leads > 0 ? inv / leads : 0
      const roas = inv > 0 ? rev / inv : 0
      const ctr = impr > 0 ? (clicks / impr) * 100 : 0
      const convRate = clicks > 0 ? (conv / clicks) * 100 : 0
      return `${label}: Invest R$${inv.toFixed(2)} | Alcance ${reach} | Impressões ${impr} | Cliques ${clicks} | Cliques no Link ${linkClicks} | CTR ${ctr.toFixed(2)}% | Leads ${leads} | Conversões ${conv} | Taxa Conv ${convRate.toFixed(2)}% | Mensagens Iniciadas ${msgs} | CPL R$${cpl.toFixed(2)} | Receita R$${rev.toFixed(2)} | ROAS ${roas.toFixed(2)}x | Campanhas: ${cList.length}`
    }

    // Last 6 months summary
    const historySummary = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(targetYear, targetMonth - 1 - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const mc = (campaigns || []).filter((c: any) => c.year === y && c.month === m)
      historySummary.push(buildMonthSummary(mc, `${monthNames[m - 1]} ${y}`))
    }

    // Campaign details for current month
    const campaignDetails = currentCampaigns.map((c: any) =>
      `- ${c.campaign_name} (${c.objective || 'N/A'}, ${c.status}): Invest R$${(c.investment || 0).toFixed(2)}, Leads ${c.leads || 0}, Conv ${c.conversions || 0}, CPL R$${(c.cost_per_lead || 0).toFixed(2)}, ROAS ${(c.roas || 0).toFixed(2)}x, Msgs ${c.messages_started || 0}`
    ).join('\n')

    const systemPrompt = `Você é um estrategista sênior de tráfego pago especializado em Meta Ads (Facebook/Instagram). Analise os dados reais de performance e forneça um diagnóstico estratégico completo.

FORMATO DE RESPOSTA (use markdown):

## 🎯 Diagnóstico Geral
Avaliação geral da performance com nota de 1 a 10.

## 📊 Análise de Métricas
- Compare CPL, CTR, ROAS com benchmarks do segmento
- Identifique tendências (melhoria ou piora mês a mês)
- Destaque métricas críticas que precisam atenção

## 🔴 Pontos de Atenção
Liste problemas identificados com dados concretos.

## 🟢 O Que Está Funcionando
Destaque campanhas e métricas com boa performance.

## 💡 Recomendações Estratégicas
1. Ações imediatas (próximos 7 dias)
2. Ajustes de médio prazo (próximas 2-4 semanas)
3. Estratégia de longo prazo

## 🎯 Plano de Otimização
- Sugestões de público-alvo
- Recomendações de criativos
- Ajustes de orçamento por campanha
- Estratégia de funil (topo, meio, fundo)

Seja direto, use dados concretos, e dê recomendações acionáveis. Fale em português do Brasil.`

    const userPrompt = `## Cliente: ${client?.name || 'N/A'}
**Segmento:** ${client?.business_segment || 'N/A'}
**Descrição:** ${client?.business_description || 'N/A'}
**Público-alvo:** ${client?.target_audience || 'N/A'}
**Proposta de valor:** ${client?.value_proposition || 'N/A'}
**Concorrentes:** ${client?.main_competitors || 'N/A'}

## Histórico de Performance (últimos 6 meses)
${historySummary.join('\n')}

## Campanhas Ativas — ${monthNames[targetMonth - 1]} ${targetYear}
${campaignDetails || 'Nenhuma campanha neste mês.'}

${frameworkData ? `## Planejamento de Campanha (Framework)\n${frameworkData}` : ''}`

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit. Tente novamente em instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const t = await response.text()
      console.error('AI gateway error:', response.status, t)
      throw new Error('Erro no gateway de IA')
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    })

  } catch (e) {
    console.error('consulting-traffic-ai error:', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
