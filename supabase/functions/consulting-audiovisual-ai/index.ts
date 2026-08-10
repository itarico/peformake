import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type AIProvider = 'lovable' | 'openrouter';
interface AICallResult { data: any; provider: AIProvider; }

async function callAIWithFallback(requestBody: any): Promise<AICallResult> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

  if (lovableApiKey) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (response.ok) return { data: await response.json(), provider: 'lovable' };
      if (response.status === 402 || response.status === 429) {
        console.log(`Lovable AI ${response.status}, falling back...`);
      } else {
        throw new Error(`Lovable AI error: ${response.status}`);
      }
    } catch (error) { console.error('Lovable AI failed:', error); }
  }

  if (!openRouterApiKey) throw new Error('No AI provider available.');

  const modelMapping: Record<string, string> = {
    'google/gemini-3-flash-preview': 'google/gemini-2.0-flash-001',
    'google/gemini-2.5-flash': 'google/gemini-2.0-flash-001',
    'google/gemini-2.5-pro': 'google/gemini-2.0-flash-thinking-exp:free',
  };
  const originalModel = requestBody.model || 'google/gemini-3-flash-preview';
  const openRouterModel = modelMapping[originalModel] || 'google/gemini-2.0-flash-001';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://peformake.lovable.app',
      'X-Title': 'Peformake',
    },
    body: JSON.stringify({ ...requestBody, model: openRouterModel }),
  });

  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  return { data: await response.json(), provider: 'openrouter' };
}

// ─── Multi-Layer Search for Quick Script ───

async function multiLayerSearchForQuickScript(tema: string, segmento: string): Promise<string> {
  const key = Deno.env.get('FIRECRAWL_API_KEY');
  if (!key || !tema) return '';

  const queries = [
    `${tema} tendências conteúdo vídeo 2025 2026 ${segmento}`.trim(),
    `${tema} problemas desafios dores público ${segmento}`.trim(),
    `${tema} melhores vídeos virais referências ${segmento}`.trim(),
  ];

  try {
    const results = await Promise.all(queries.map(async (query, idx) => {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, limit: 5, lang: 'pt', country: 'BR' }),
        });
        if (!res.ok) return '';
        const data = await res.json();
        const items = (data?.data || []).map((r: any) =>
          `[${r.title || 'Sem título'}]\n${r.markdown?.substring(0, 800) || r.description || ''}`
        ).join('\n---\n');
        const labels = ['TENDÊNCIAS', 'DORES DO PÚBLICO', 'REFERÊNCIAS DE SUCESSO'];
        return items ? `=== ${labels[idx]} ===\n${items}` : '';
      } catch { return ''; }
    }));

    return results.filter(Boolean).join('\n\n');
  } catch { return ''; }
}

// ─── Dynamic Funnel Reasoning ───

function getFunnelStrategy(estagioFunil: string): string {
  const estagio = (estagioFunil || '').toLowerCase().trim();

  if (estagio.includes('topo')) {
    return `ESTRATÉGIA DE TOPO DE FUNIL:
- Priorize CURIOSIDADE e dados surpreendentes
- O gancho DEVE ser uma pergunta provocativa ou estatística chocante
- NÃO mencione preço, oferta ou CTA de compra
- Foque em awareness: fazer a pessoa parar e prestar atenção
- Tom: educativo, surpreendente, "você sabia que..."
- CTA: engajamento (comentar, salvar, seguir para mais)`;
  }

  if (estagio.includes('meio')) {
    return `ESTRATÉGIA DE MEIO DE FUNIL:
- Priorize AUTORIDADE e prova social
- Use comparações, demonstrações práticas e depoimentos
- Mostre que você entende o problema melhor que ninguém
- Tom: confiante, demonstrativo, "deixa eu te mostrar..."
- CTA: engajamento profundo (compartilhar, mandar para amigo, salvar)`;
  }

  if (estagio.includes('fundo')) {
    return `ESTRATÉGIA DE FUNDO DE FUNIL:
- Priorize URGÊNCIA e benefício direto
- Apresente a oferta clara com escassez real
- Quebre objeções finais (preço, timing, medo)
- Tom: direto, urgente, "última chance", "vagas limitadas"
- CTA: conversão direta (link na bio, DM, site, comprar agora)`;
  }

  return `ESTRATÉGIA EQUILIBRADA:
- Misture elementos de curiosidade, autoridade e benefício
- Gancho que gera interesse imediato
- Desenvolvimento que demonstra valor
- CTA natural que convida à ação sem pressão excessiva`;
}

function buildSystemPrompt(context: string, parameters: any): string {
  return `Você é um especialista em criação de conteúdo audiovisual para redes sociais.
CONTEXTO DO CLIENTE:
${context || 'Não disponível'}

PARÂMETROS ATUAIS:
${JSON.stringify(parameters || {}, null, 2)}

REGRAS:
- Seja específico, direto e acionável
- Use o contexto do cliente para personalizar
- NÃO use formatação markdown
- Retorne respostas práticas e prontas para uso
- Considere tendências atuais de redes sociais`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { action, field, prompt, context, parameters, scriptHistory, originalScript } = await req.json();
    const systemPrompt = buildSystemPrompt(context, parameters);
    let userPrompt = prompt || '';

    if (action === 'auto_decide') {
      userPrompt = `Baseado no contexto e parâmetros, decida o melhor valor para "${field}".\n${prompt}\nRetorne APENAS o valor decidido.`;
    }

    if (action === 'batch_params') {
      userPrompt = `Baseado no contexto do cliente e no tema "${parameters?.tema || ''}", defina os melhores valores para TODOS os parâmetros de um roteiro audiovisual.

Retorne APENAS um JSON válido com estas chaves:
{
  "objetivo": "objetivo estratégico do vídeo",
  "publicoAlvo": "descrição do público-alvo",
  "estagioFunil": "topo|meio|fundo",
  "canal": "plataforma(s) de publicação",
  "duracao": "duração sugerida",
  "tomEmocional": "tom(ns) emocional(is)",
  "estrategiasPersuasivas": "estratégia(s) persuasiva(s)",
  "estruturaNarrativa": "estrutura narrativa ideal",
  "cta": "chamada para ação sugerida"
}

Não inclua explicações, apenas o JSON.`;
    }

    if (action === 'suggest_themes') {
      userPrompt = `Baseado no contexto completo do cliente (produtos, sazonalidade, nicho, histórico), sugira 6 temas criativos para vídeos.

${scriptHistory ? `ROTEIROS JÁ CRIADOS (evite repetir):\n${scriptHistory}\n` : ''}

Retorne APENAS um JSON array:
[{"titulo": "título curto", "descricao": "1 frase explicando o ângulo"}]

Foque em lacunas não exploradas e oportunidades sazonais.`;
    }

    if (action === 'quick_script') {
      // Multi-layer research for quick scripts too
      let quickResearch = '';
      const tema = parameters?.tema || '';
      const segmento = context?.substring(0, 200) || '';
      if (tema) {
        console.log('Quick script: running multi-layer search for', tema.substring(0, 50));
        quickResearch = await multiLayerSearchForQuickScript(tema, segmento);
        if (quickResearch) console.log('Quick script research:', quickResearch.length, 'chars');
      }

      // Build explicit parameter block for quick script
      const paramLabels: Record<string, string> = {
        tema: 'Tema', objetivo: 'Objetivo Estratégico', publicoAlvo: 'Público-Alvo',
        estagioFunil: 'Estágio do Funil', canal: 'Canal/Plataforma', duracao: 'Duração',
        tomEmocional: 'Tom Emocional', estrategiasPersuasivas: 'Estratégias Persuasivas',
        estruturaNarrativa: 'Estrutura Narrativa', cta: 'CTA',
      };
      const definedParams = Object.entries(paramLabels)
        .map(([key, label]) => {
          const val = parameters?.[key];
          return val && val.trim() ? `• ${label}: ${val}` : null;
        })
        .filter(Boolean)
        .join('\n');

      const funnelStrategy = getFunnelStrategy(parameters?.estagioFunil || '');

      userPrompt = `Gere um roteiro COMPLETO e PRONTO para gravação.

=== PARÂMETROS OBRIGATÓRIOS (respeite TODOS) ===
${definedParams || '• Nenhum definido - use os padrões mais adequados ao contexto'}

${funnelStrategy}

REGRAS DE APLICAÇÃO DOS PARÂMETROS:
- TOM EMOCIONAL: deve permear CADA frase (gancho, desenvolvimento, CTA)
- ESTRATÉGIA PERSUASIVA: deve ser a espinha dorsal da argumentação
- ESTRUTURA NARRATIVA: deve ser seguida LITERALMENTE na ordem das seções
- DURAÇÃO: deve ditar a quantidade de texto (15s≈30 palavras, 30s≈60, 60s≈150, 5min≈700)
- CANAL/PLATAFORMA: deve influenciar formato, linguagem e ritmo
- PÚBLICO-ALVO: deve ditar linguagem, referências culturais e exemplos
- CTA: deve ser usado literalmente ou adaptado mantendo a mesma intenção

${quickResearch ? `=== PESQUISA DE MERCADO 360° (dados reais) ===\n${quickResearch}\n\nUSE estes dados para fundamentar o roteiro com informações reais, estatísticas e tendências atuais.\n` : ''}

Use EXATAMENTE este formato:
===ROTEIRO===
[TITULO]: título criativo e chamativo
[GANCHO]: gancho de abertura (primeiros 3 segundos) - DEVE seguir a estratégia de funil e o tom emocional definidos
[DESENVOLVIMENTO]: corpo principal do roteiro com falas detalhadas e direções de performance - DEVE usar a estrutura narrativa e estratégia persuasiva definidas
[CTA]: chamada para ação final - DEVE seguir o CTA definido nos parâmetros
[LEGENDA]: legenda sugerida para publicação com hashtags do nicho
[DICAS]: dicas práticas de gravação (cenário, figurino, iluminação, enquadramento)
[OBSERVACOES]: observações estratégicas e por que este roteiro funciona
[ESTRUTURA]: nome da estrutura narrativa usada (DEVE ser a definida nos parâmetros se houver)
===FIM_ROTEIRO===

Tema: ${tema || 'não definido'}
Seja criativo, específico e pronto para gravar. Use linguagem FALADA natural.`;
    }

    if (action === 'generate_variation') {
      userPrompt = `Crie uma VARIAÇÃO ALTERNATIVA deste roteiro seguindo a REGRA DE INVERSÃO DE ÂNGULO:

REGRA OBRIGATÓRIA - Escolha o ângulo OPOSTO ao original:
- Se o original usa DADOS/LÓGICA → use EMOÇÃO/HISTÓRIA pessoal
- Se o original foca no PROBLEMA → foque na TRANSFORMAÇÃO/RESULTADO
- Se o original é EDUCACIONAL → seja PROVOCATIVO/CONTROVERSO
- Se o original fala na 3ª PESSOA → fale na 1ª PESSOA (experiência própria)
- Se o original começa com PERGUNTA → comece com AFIRMAÇÃO CHOCANTE
- NUNCA repita o mesmo tipo de gancho do original

ROTEIRO ORIGINAL (analise o ângulo usado para inverter):
${originalScript}

Use EXATAMENTE este formato:
===ROTEIRO===
[TITULO]: título da variação (ângulo diferente do original)
[GANCHO]: gancho com abordagem OPOSTA ao original
[DESENVOLVIMENTO]: desenvolvimento com nova perspectiva invertida
[CTA]: CTA alternativo
[LEGENDA]: legenda sugerida
[DICAS]: dicas de gravação adaptadas ao novo tom
[OBSERVACOES]: explique qual ângulo foi invertido e por quê esta variação complementa o original
[ESTRUTURA]: estrutura narrativa usada (diferente do original se possível)
===FIM_ROTEIRO===`;
    }

    if (action === 'analyze_history') {
      userPrompt = `Analise estes roteiros já criados para o cliente e gere um RESUMO ESTRATÉGICO:

${scriptHistory}

Identifique:
1. ESTRUTURAS NARRATIVAS mais usadas
2. TIPOS DE GANCHO preferidos
3. TEMAS já abordados
4. O que AINDA NÃO foi explorado (lacunas)
5. RECOMENDAÇÕES de próximos temas

Seja direto e acionável. Máximo 500 palavras.`;
    }

    const { data, provider } = await callAIWithFallback({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const result = data.choices?.[0]?.message?.content || '';
    return new Response(
      JSON.stringify({ result, aiProvider: provider }),
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
