import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function callAI(body: any): Promise<{ data: any; provider: string }> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

  if (lovableKey) {
    try {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) return { data: await res.json(), provider: 'lovable' };
      if (res.status !== 402 && res.status !== 429) throw new Error(`AI: ${res.status}`);
    } catch (e) { console.error('Lovable failed:', e); }
  }

  if (!openRouterKey) throw new Error('No AI provider');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openRouterKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://peformake.lovable.app' },
    body: JSON.stringify({ ...body, model: 'google/gemini-2.0-flash-001' }),
  });
  if (!res.ok) throw new Error(`OpenRouter: ${res.status}`);
  return { data: await res.json(), provider: 'openrouter' };
}

const getDurationRules = (d: string): string => {
  if (!d) return '';
  const dl = d.toLowerCase();
  if (dl.includes('15s') || dl.includes('15 s')) return 'DURAÇÃO 15s: Máximo 4 frases. Gancho 0-3s + Conteúdo 3-12s + CTA 12-15s. 30 palavras no desenvolvimento.';
  if (dl.includes('30s')) return 'DURAÇÃO 30s: Gancho 0-5s + Desenvolvimento 5-25s + CTA 25-30s. 60 palavras no desenvolvimento.';
  if (dl.includes('60s') || dl.includes('1 min')) return 'DURAÇÃO 60s: Gancho 0-5s + Contexto 5-15s + Desenvolvimento 15-50s + CTA 50-60s. 100-150 palavras.';
  if (dl.includes('90s')) return 'DURAÇÃO 90s: Gancho 0-5s + Problema 5-20s + Solução 20-70s + CTA 70-90s. 150-200 palavras.';
  if (dl.includes('3') || dl.includes('5 min')) return 'DURAÇÃO 3-5min: Gancho 0-10s + Intro 10-30s + Desenvolvimento em 3-5 seções 30s-4min + CTA últimos 30-60s. 500-800 palavras.';
  if (dl.includes('10') || dl.includes('+10')) return 'DURAÇÃO +10min: Gancho 0-15s + Intro 15s-1min + Overview 1-2min + 5-7 módulos 2-8min + Recap 8-9min + CTA 9-10min. 1500-2500 palavras.';
  return '';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { num_scripts, parameters, context } = await req.json();
    const p = parameters || {};

    const systemPrompt = `Você é um ROTEIRISTA DE ELITE que cria conteúdo VIRAL e ÚNICO para cada negócio.

REGRA DE IDENTIDADE: NUNCA inclua textos introdutórios como "Ok, consultor", "Aqui está", "Preparei para você". Retorne APENAS o JSON solicitado, sem nenhum texto antes ou depois.

CONTEXTO ESTRATÉGICO COMPLETO:
${context || 'Não disponível'}

PARÂMETROS:
Tema: ${p.tema} | Objetivo: ${p.objetivo} | Público: ${p.publicoAlvo} | Canal: ${p.canal}
Duração: ${p.duracao} | Tom: ${p.tomEmocional} | Estratégias: ${p.estrategiasPersuasivas}
Estrutura: ${p.estruturaNarrativa} | Funil: ${p.estagioFunil}

${getDurationRules(p.duracao)}

REGRAS DE OURO PARA ROTEIROS ÚNICOS:
1. O GANCHO deve ser uma frase que NINGUÉM consegue ignorar: dado chocante, promessa irresistível, ou afirmação controversa ESPECÍFICA do nicho
2. Cada fala DEVE soar como linguagem falada natural, NÃO texto publicitário genérico
3. MENCIONE produtos/serviços/marca do cliente PELO NOME quando relevante
4. Inclua direções de performance: [PAUSA DRAMÁTICA], [OLHAR CÂMERA], [MOSTRAR PRODUTO], [CORTE RÁPIDO], [ZOOM], [TOM BAIXO], [ENFÁTICO]
5. Cada roteiro DEVE usar um ÂNGULO COMPLETAMENTE DIFERENTE dos outros
6. Use DADOS REAIS do contexto: segmento, concorrentes, dores do público, proposta de valor
7. SIGA EXATAMENTE a estrutura narrativa: ${p.estruturaNarrativa}
8. O CTA deve ser ESPECÍFICO e conter uma ação clara com urgência
9. As dicas de gravação devem incluir: cenário, figurino, iluminação, enquadramento, e timing
10. A legenda deve ser PRONTA PARA COPIAR com hashtags estratégicas do nicho`;

    const userPrompt = `Gere ${num_scripts} roteiros ÚNICOS e PROFUNDOS seguindo este JSON:
{
  "scripts": [
    {
      "titulo": "Título magnético",
      "gancho": "Frase exata dos primeiros segundos - IMPOSSÍVEL de ignorar. Com direção de performance.",
      "desenvolvimento": "Conteúdo COMPLETO escrito como falas naturais. Com marcações de tempo, pausas, direções de câmera. PROPORCIONAL à duração ${p.duracao}. Cada ponto numerado com transição.",
      "cta": "CTA específico com urgência e ação clara",
      "legendaSugerida": "Legenda pronta com hashtags estratégicas do nicho",
      "dicasGravacao": "Cenário, figurino, iluminação, enquadramento, tom de voz, timing, props necessários",
      "observacoesEstrategicas": "Por que este roteiro funciona para ESTE cliente específico",
      "justificativa": "Ângulo único escolhido e diferencial em relação aos outros roteiros",
      "estruturaUsada": "${p.estruturaNarrativa || 'Livre'}"
    }
  ]
}

CADA roteiro deve ter:
- Um ÂNGULO DIFERENTE (ex: educativo vs emocional vs provocativo)
- Referências ESPECÍFICAS ao negócio do cliente
- Desenvolvimento com CONTAGEM DE PALAVRAS proporcional à duração
- Direções de câmera e performance
Retorne APENAS o JSON válido.`;

    const { data, provider } = await callAI({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
    });

    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(content);

    return new Response(
      JSON.stringify({ ...parsed, aiProvider: provider }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', scripts: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
