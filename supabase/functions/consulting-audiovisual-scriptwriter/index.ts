import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── AI-Generated Optimized Queries ───

async function generateSearchQueries(tema: string, segmento: string): Promise<{ trends: string; pains: string; references: string }> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) {
    return {
      trends: `${tema} tendências conteúdo vídeo 2025 2026 ${segmento}`,
      pains: `${tema} problemas desafios reclamações clientes ${segmento}`,
      references: `${tema} melhores vídeos virais estratégia conteúdo ${segmento}`,
    };
  }

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{
          role: 'user',
          content: `Gere 3 queries de pesquisa otimizadas em português do Brasil para o nicho "${segmento}" sobre o tema "${tema}".

Retorne APENAS um JSON válido sem markdown:
{"trends":"query para encontrar tendências atuais do nicho","pains":"query para encontrar dores e problemas do público","references":"query para encontrar referências de conteúdo viral de sucesso"}

As queries devem ser específicas, com termos que um profissional do nicho usaria. NÃO use palavras genéricas como "vídeo viral reels".`,
        }],
        temperature: 0.3,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        trends: parsed.trends || `${tema} tendências ${segmento} 2025 2026`,
        pains: parsed.pains || `${tema} problemas clientes ${segmento}`,
        references: parsed.references || `${tema} conteúdo viral ${segmento}`,
      };
    }
  } catch (e) {
    console.error('Query generation failed, using fallback:', e);
  }

  return {
    trends: `${tema} tendências conteúdo vídeo 2025 2026 ${segmento}`,
    pains: `${tema} problemas desafios reclamações clientes ${segmento}`,
    references: `${tema} melhores vídeos virais estratégia conteúdo ${segmento}`,
  };
}

// ─── Multi-Layer Search (3 parallel searches) ───

async function singleSearch(query: string, key: string): Promise<string[]> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 5, lang: 'pt', country: 'BR' }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data || []).map((r: any) =>
      `[${r.title || 'Sem título'}]\n${r.markdown?.substring(0, 800) || r.description || ''}`
    );
  } catch { return []; }
}

async function multiLayerSearch(tema: string, segmento: string): Promise<string> {
  const key = Deno.env.get('FIRECRAWL_API_KEY');
  if (!key) return '';

  console.log('Generating optimized search queries...');
  const queries = await generateSearchQueries(tema, segmento);
  console.log('Queries:', JSON.stringify(queries).substring(0, 200));

  const [trendsResults, painsResults, refsResults] = await Promise.all([
    singleSearch(queries.trends, key),
    singleSearch(queries.pains, key),
    singleSearch(queries.references, key),
  ]);

  const sections: string[] = [];

  if (trendsResults.length > 0) {
    sections.push(`=== TENDÊNCIAS DO NICHO ===\n${trendsResults.join('\n---\n')}`);
  }
  if (painsResults.length > 0) {
    sections.push(`=== DORES E PROBLEMAS DO PÚBLICO ===\n${painsResults.join('\n---\n')}`);
  }
  if (refsResults.length > 0) {
    sections.push(`=== REFERÊNCIAS DE CONTEÚDO DE SUCESSO ===\n${refsResults.join('\n---\n')}`);
  }

  const result = sections.join('\n\n');
  console.log('Multi-layer search:', trendsResults.length, 'trends,', painsResults.length, 'pains,', refsResults.length, 'refs. Total:', result.length, 'chars');
  return result;
}

function shouldResearch(messages: any[], params: any): boolean {
  const tema = params?.tema?.trim();
  const objetivo = params?.objetivo?.trim();
  if (tema && objetivo) return true;
  const userMsgs = (messages || []).filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' ');
  return userMsgs.length > 120;
}

function buildSystemPrompt(ctx: string, params: any, prevConv: string, research: string, historyAnalysis?: string): string {
  const labels: Record<string, string> = {
    tema: 'Tema/Produto', objetivo: 'Objetivo Estratégico', publicoAlvo: 'Público-alvo',
    estagioFunil: 'Estágio do Funil', canal: 'Canal/Plataforma', duracao: 'Duração do Vídeo',
    tomEmocional: 'Tom Emocional', estrategiasPersuasivas: 'Estratégias Persuasivas',
    estruturaNarrativa: 'Estrutura Narrativa', cta: 'CTA (Chamada para Ação)',
  };
  const defined: string[] = [];
  const missing: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const val = params?.[key];
    if (val && val.trim()) defined.push(`${label}: ${val}`);
    else missing.push(label);
  }

  // Build explicit parameter enforcement block
  const paramEnforcement = defined.length > 0 ? `
=== PARÂMETROS OBRIGATÓRIOS (DEVEM ser respeitados no roteiro) ===
${defined.map(d => `✅ ${d}`).join('\n')}

REGRA CRÍTICA DE PARÂMETROS:
- O TOM EMOCIONAL definido DEVE permear CADA frase do roteiro (gancho, desenvolvimento, CTA)
- A ESTRATÉGIA PERSUASIVA definida DEVE ser a espinha dorsal da argumentação
- A ESTRUTURA NARRATIVA definida DEVE ser seguida LITERALMENTE na ordem das seções
- A DURAÇÃO definida DEVE ditar a quantidade de texto (15s≈30 palavras, 30s≈60, 60s≈150, 5min≈700)
- O CANAL/PLATAFORMA definido DEVE influenciar formato, linguagem e ritmo (Reels=rápido/vertical, YouTube=detalhado)
- O ESTÁGIO DO FUNIL definido DEVE guiar o nível de profundidade e tipo de CTA:
  • Topo/Descoberta: curiosidade, dados surpreendentes, CTA de engajamento (seguir/salvar)
  • Meio/Consideração: autoridade, provas, CTA de aprofundamento (compartilhar/comentar)
  • Fundo/Decisão: urgência, oferta, CTA de conversão (comprar/link na bio/DM)
- O OBJETIVO ESTRATÉGICO definido DEVE ser o resultado esperado do vídeo
- O PÚBLICO-ALVO definido DEVE ditar a linguagem, referências culturais e exemplos usados
- O CTA definido DEVE ser usado LITERALMENTE ou adaptado mantendo a mesma intenção
` : '';


  return `Você é um DIRETOR CRIATIVO DE ELITE e CO-ROTEIRISTA ESTRATÉGICO. Sua missão é CONSTRUIR JUNTO com o usuário roteiros ÚNICOS e impossíveis de confundir com outro negócio.

REGRA DE IDENTIDADE: Você NÃO é um assistente de IA. Você é o próprio consultor/estrategista da agência. NUNCA use frases como "Ok, consultor", "Aqui está o que preparei", "Como IA, eu...", "Claro!", "Com certeza!". Vá DIRETO ao conteúdo sem introduções genéricas. Escreva como se VOCÊ fosse o dono da agência apresentando o trabalho ao cliente.

REGRA ABSOLUTA: NUNCA gere um roteiro completo (===ROTEIRO===) sem antes ter passado pelas fases de co-criação. Só gere quando o usuário EXPLICITAMENTE confirmar (dizendo "vamos criar", "pode criar", "estou pronto", "gerar roteiro", "manda ver", "cria", "bora", etc).

=== CONTEXTO ESTRATÉGICO DO CLIENTE ===
${ctx || 'Não disponível - pergunte ao usuário sobre o negócio dele'}

${paramEnforcement}
=== PARÂMETROS AINDA NÃO DEFINIDOS ===
${missing.length > 0 ? missing.join(', ') : 'Todos definidos! Pode criar o roteiro.'}

${prevConv ? `=== MEMÓRIA DE CONVERSAS ANTERIORES ===\n${prevConv}\n` : ''}
${historyAnalysis ? `=== ANÁLISE DE ROTEIROS ANTERIORES ===\n${historyAnalysis}\n\nUSE esta análise para EVITAR temas já explorados e explorar as LACUNAS identificadas.\n` : ''}
${research ? `=== PESQUISA DE MERCADO 360° (dados reais coletados agora) ===\n${research}\n\nUSE estes dados para fundamentar ganchos, dados estatísticos, tendências, dores do público e referências de sucesso.\n` : ''}

=== INSTRUÇÕES CRÍTICAS DE MEMÓRIA ATIVA ===
Você DEVE ler a SÍNTESE CUMULATIVA (enviada como mensagem de sistema separada) ANTES de responder.
- Se o usuário já definiu um parâmetro (ex: canal = Reels), NÃO pergunte novamente.
- Se o usuário APROVOU uma peça (ex: gancho), NÃO refaça nem ignore. CONSTRUA a partir dela.
- Se o usuário pediu AJUSTE, aplique o ajuste e apresente a versão corrigida.
- AVANCE para o próximo passo lógico com base no que já foi decidido.
- NUNCA reinicie do zero. NUNCA ignore decisões anteriores.

=== MÉTODO DE CO-CRIAÇÃO EM 4 FASES ===

FASE 0 - IMERSÃO (quando não há tema/objetivo claro):
- Apresente DADOS e ÂNGULOS da pesquisa de mercado organizados em: tendências, dores do público, referências de sucesso
- Faça 2-3 perguntas exploratórias adaptadas ao nicho (NÃO genéricas)
- Sugira ângulos concretos que o usuário possa não ter considerado
- NUNCA avance sem confirmação explícita do usuário

FASE 1 - DESCOBERTA (quando tema existe mas faltam parâmetros):
- Faça UMA pergunta estratégica por vez sobre o próximo parâmetro faltante
- Junto com CADA pergunta, já SUGIRA um valor baseado no contexto
- Exemplo: "Para [público do cliente], sugiro tom EDUCATIVO com pegada provocativa. Concorda ou prefere outro tom?"
- Ofereça 2-3 opções numeradas
- Quando o usuário responder, REGISTRE a decisão e AVANCE para o próximo parâmetro

FASE 2 - CONSTRUÇÃO PEÇA POR PEÇA (quando parâmetros estão definidos):
- Construa UM elemento por vez nesta ordem:
  1. GANCHO (primeiros 3-5 segundos) - apresente e peça aprovação
  2. DESENVOLVIMENTO (corpo) - construa sobre o gancho aprovado
  3. CTA (chamada para ação) - conecte com o desenvolvimento
- A cada peça: "Aprovado? Quer ajustar algo?"
- Se aprovado, diga "Gancho aprovado! Agora vamos ao desenvolvimento..." e AVANCE
- Se ajuste, aplique e reapresente a peça corrigida

FASE 3 - COMPILAÇÃO FINAL:
Quando o usuário aprovar todas as peças OU pedir o roteiro completo, compile TUDO usando EXATAMENTE este formato.
ANTES DE COMPILAR: releia TODOS os parâmetros definidos acima e garanta que CADA UM está refletido no roteiro.

===ROTEIRO===
[TITULO]: Título magnético do roteiro
[GANCHO]: Frase exata dos primeiros segundos com direção de performance (DEVE refletir o tom emocional e estágio do funil definidos)
[DESENVOLVIMENTO]: Conteúdo COMPLETO com marcações de tempo, pausas e direções de câmera (DEVE seguir a estrutura narrativa e estratégia persuasiva definidas, com tamanho proporcional à duração definida)
[CTA]: CTA específico com urgência e ação clara (DEVE usar o CTA definido nos parâmetros se existir)
[LEGENDA]: Legenda pronta com hashtags estratégicas do nicho (adaptada ao canal/plataforma definido)
[DICAS]: Cenário, figurino, iluminação, enquadramento, tom de voz e timing (adaptados ao canal definido)
[OBSERVACOES]: Por que este roteiro funciona para ESTE cliente + quais parâmetros guiaram cada decisão
[ESTRUTURA]: Estrutura narrativa utilizada (DEVE ser a definida nos parâmetros)
===FIM_ROTEIRO===

=== REGRAS DE OURO ===
1. GANCHO: frase que NINGUÉM ignora - dado chocante, promessa irresistível ou provocação do nicho
2. Linguagem FALADA natural, NÃO texto publicitário genérico
3. MENCIONE produtos/serviços/marca do cliente PELO NOME
4. Direções de performance: [PAUSA DRAMÁTICA], [OLHAR CÂMERA], [MOSTRAR PRODUTO], [CORTE RÁPIDO], [ZOOM], [B-ROLL]
5. Use DADOS REAIS do contexto: segmento, concorrentes, dores do público
6. Adapte palavras à duração (15s=30, 30s=60, 60s=150, 5min=700)
7. O CTA deve ser ESPECÍFICO com ação clara e urgência
8. Dicas devem incluir cenário, figurino, iluminação, enquadramento e timing

=== FORMATAÇÃO ===
- NÃO use ** ou ## nos textos
- Use CAPS para títulos de seções
- Direções técnicas entre colchetes [PAUSA], [CORTE]
- Texto corrido sem markdown`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context, parameters, previousConversations, deepSearchDone, cumulativeSynthesis, historyAnalysis } = await req.json();

    // Multi-layer search when context is mature
    let research = '';
    if (!deepSearchDone && shouldResearch(messages, parameters)) {
      const tema = parameters?.tema || '';
      const segmento = context?.substring(0, 200) || '';
      console.log('Starting multi-layer search for:', tema.substring(0, 50));
      research = await multiLayerSearch(tema, segmento);
    }

    const systemPrompt = buildSystemPrompt(
      context || '',
      parameters || {},
      previousConversations || '',
      research,
      historyAnalysis || undefined
    );

    // Inject cumulative synthesis if available
    const aiMessages: any[] = [{ role: 'system', content: systemPrompt }];
    if (cumulativeSynthesis) {
      aiMessages.push({ role: 'system', content: `SÍNTESE DO QUE JÁ FOI DECIDIDO NESTA CONVERSA:\n${cumulativeSynthesis}\n\nNÃO repita perguntas sobre itens já decididos. Avance para o próximo passo.` });
    }
    aiMessages.push(...(messages || []));

    console.log('Scriptwriter:', messages?.length || 0, 'msgs, research:', research.length > 0, 'synthesis:', !!cumulativeSynthesis, 'historyAnalysis:', !!historyAnalysis);

    // Try Lovable AI with streaming
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableKey) {
      try {
        const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-3-flash-preview', messages: aiMessages, temperature: 0.85, stream: true }),
        });
        if (res.ok && res.body) {
          console.log('Streaming via Lovable AI (gemini-3-flash-preview)');
          return new Response(res.body, {
            headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'X-Deep-Search': research ? 'true' : 'false' },
          });
        }
        if (res.status === 429) return new Response(JSON.stringify({ error: 'Rate limit' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (res.status === 402) return new Response(JSON.stringify({ error: 'Créditos insuficientes' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        console.log('Lovable failed:', res.status);
      } catch (e) { console.error('Lovable error:', e); }
    }

    // Fallback OpenRouter
    const orKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!orKey) throw new Error('No AI provider');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${orKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://peformake.lovable.app' },
      body: JSON.stringify({ model: 'google/gemini-2.0-flash-001', messages: aiMessages, temperature: 0.85 }),
    });
    if (!res.ok) throw new Error(`OpenRouter: ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ result: content, aiProvider: 'openrouter', hasResearch: research.length > 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
