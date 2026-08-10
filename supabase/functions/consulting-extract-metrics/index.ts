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
    const { file_url, file_type, instance_id, questions, file_path } = await req.json();

    if (!file_url && !file_path) {
      throw new Error('file_url or file_path is required');
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let fileDataUrl = file_url;
    let isPdf = file_type === 'pdf' || file_url?.toLowerCase().includes('.pdf');

    // If file_path is provided, download the file and convert to base64 data URL
    if (file_path && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // First get the file extension to determine MIME type
      const extension = file_path.toLowerCase().split('.').pop();
      isPdf = extension === 'pdf';
      
      // Download the file directly
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('consulting-files')
        .download(file_path);

      if (downloadError) {
        console.error('Error downloading file:', downloadError);
        throw new Error('Failed to download file from storage');
      }

      // Convert to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Content = btoa(binary);

      // Determine MIME type
      let mimeType = 'image/png';
      if (isPdf) {
        mimeType = 'application/pdf';
      } else if (extension === 'jpg' || extension === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (extension === 'webp') {
        mimeType = 'image/webp';
      } else if (extension === 'gif') {
        mimeType = 'image/gif';
      }

      fileDataUrl = `data:${mimeType};base64,${base64Content}`;
      console.log('Converted file to base64 data URL, MIME type:', mimeType);
    }

    // Build the extraction prompt
    const questionsContext = questions?.map((q: { id: string; question_text: string }) => 
      `- ${q.question_text} (ID: ${q.id})`
    ).join('\n') || '';

    const systemPrompt = `Você é um especialista em extração de dados de relatórios de marketing digital.
Sua tarefa é analisar ${isPdf ? 'documentos PDF' : 'imagens/screenshots'} de relatórios do Meta Business Suite, Instagram Insights, ou relatórios de ads e extrair métricas específicas.

MÉTRICAS COMUNS A EXTRAIR:
- Alcance (Reach)
- Impressões
- Engajamento (curtidas, comentários, compartilhamentos, salvos)
- Taxa de Engajamento (%)
- Crescimento de Seguidores
- Cliques no Link
- Visitas ao Perfil
- Investimento em Ads (R$)
- CPC (Custo por Clique)
- CPM (Custo por Mil Impressões)
- CPA (Custo por Aquisição)
- CTR (Taxa de Cliques)
- ROAS (Retorno sobre Investimento em Ads)
- Leads Gerados
- Conversões

REGRAS:
1. Se um valor não estiver visível ${isPdf ? 'no documento' : 'na imagem'}, retorne null
2. Mantenha os valores numéricos sem formatação (ex: 15000, não "15.000")
3. Para valores monetários, use apenas números (ex: 1500.50)
4. Para porcentagens, use o valor decimal (ex: 3.5 para 3,5%)
5. Analise todas as páginas/seções do ${isPdf ? 'PDF' : 'relatório'} para encontrar os dados`;

    const userPrompt = `Analise ${isPdf ? 'este documento PDF' : 'esta imagem'} de relatório de marketing e extraia os dados para preencher as seguintes perguntas:

${questionsContext}

Retorne EXATAMENTE no formato JSON:
{
  "extracted_data": {
    "question_id_aqui": "valor extraído",
    ...
  },
  "confidence": "high|medium|low",
  "notes": "Observações sobre a extração"
}

Se não conseguir identificar um valor para alguma pergunta, não inclua no JSON.`;

    console.log('Calling Lovable AI Gateway for metrics extraction...');
    console.log('File type:', isPdf ? 'PDF' : 'Image');

    // Use multimodal model with image/PDF
    // Note: Gemini 2.5 Flash supports both images and PDFs via URL
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
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: fileDataUrl } }
            ]
          },
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
    let extractedData: Record<string, string> = {};
    let confidence = 'medium';
    let notes = '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        extractedData = parsed.extracted_data || {};
        confidence = parsed.confidence || 'medium';
        notes = parsed.notes || '';
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify({
      success: true,
      extracted_data: extractedData,
      confidence,
      notes,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in consulting-extract-metrics:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
