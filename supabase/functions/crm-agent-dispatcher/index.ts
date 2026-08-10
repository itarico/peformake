import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WASENDER_BASE = "https://www.wasenderapi.com/api";

const STAGE_TO_AGENT: Record<string, string> = {
  new: "sdr",
  qualified: "sdr",
  negotiating: "sales",
  unqualified: "sdr",
  sale_completed: "support",
  sale_lost: "recovery",
};

const AGENT_LABELS: Record<string, string> = {
  sdr: "SDR - Qualificador",
  sales: "Vendas - Negociação",
  recovery: "Recuperador",
  support: "Suporte",
};

async function fetchWithRetry(url: string, opts: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status !== 429 || attempt === retries) return res;
    const delay = Math.min(3000 * Math.pow(2, attempt), 30000);
    console.log(`[fetchWithRetry] 429, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
    await new Promise(r => setTimeout(r, delay));
  }
  return fetch(url, opts); // final attempt
}

// AI call with automatic fallback to OpenRouter
async function callAIWithFallback(
  messages: any[],
  tools: any[],
  temperature: number,
  maxTokens: number,
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

  // Try Lovable AI first
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, tools, max_tokens: maxTokens, temperature }),
    });
    if (res.ok) return await res.json();
    if (res.status !== 402 && res.status !== 429) {
      const errText = await res.text();
      throw new Error(`Lovable AI error ${res.status}: ${errText}`);
    }
    console.warn("[callAIWithFallback] Lovable AI limit hit:", res.status, "→ falling back to OpenRouter");
  } catch (e: any) {
    if (!OPENROUTER_API_KEY) throw e;
    console.warn("[callAIWithFallback] Lovable AI failed:", e.message, "→ trying OpenRouter");
  }

  // Fallback to OpenRouter
  if (!OPENROUTER_API_KEY) throw new Error("AI unavailable and no fallback configured");

  const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, tools, max_tokens: maxTokens, temperature }),
  });

  if (!orRes.ok) {
    const errText = await orRes.text();
    throw new Error(`OpenRouter error ${orRes.status}: ${errText}`);
  }
  return await orRes.json();
}

// Smart context trimming — keep newest entries, summarize structure
function trimContext(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  // Split by entries (each starts with [date])
  const entries = text.split(/(?=\[\d{4}-)/);
  // Keep most recent entries that fit
  let result = "";
  for (let i = entries.length - 1; i >= 0; i--) {
    const candidate = entries[i] + result;
    if (candidate.length > maxLen) break;
    result = entries[i] + result;
  }
  return result.trim() || text.slice(-maxLen);
}

// Split text into WhatsApp-like small message blocks
// Each block should be under maxBlockChars and NEVER cut mid-sentence
function splitIntoBlocks(text: string, maxBlockChars: number): string[] {
  // First split by explicit separator
  const rawBlocks = text.split('---').map(b => b.trim()).filter(Boolean);
  const finalBlocks: string[] = [];

  for (const block of rawBlocks) {
    if (block.length <= maxBlockChars) {
      finalBlocks.push(block);
      continue;
    }
    // Block too long — split by sentences
    const sentences = block.match(/[^.!?\n]+[.!?\n]*/g) || [block];
    let current = "";
    for (const sentence of sentences) {
      const trimSentence = sentence.trim();
      if (!trimSentence) continue;
      if (current.length + trimSentence.length + 1 <= maxBlockChars) {
        current = current ? current + " " + trimSentence : trimSentence;
      } else {
        if (current) finalBlocks.push(current.trim());
        // If single sentence exceeds limit, find last space
        if (trimSentence.length > maxBlockChars) {
          let remaining = trimSentence;
          while (remaining.length > maxBlockChars) {
            const cutAt = remaining.lastIndexOf(' ', maxBlockChars);
            const splitPos = cutAt > maxBlockChars * 0.3 ? cutAt : maxBlockChars;
            let piece = remaining.slice(0, splitPos).trim();
            if (!/[.!?]$/.test(piece)) piece += "...";
            finalBlocks.push(piece);
            remaining = remaining.slice(splitPos).trim();
          }
          current = remaining;
        } else {
          current = trimSentence;
        }
      }
    }
    if (current.trim()) finalBlocks.push(current.trim());
  }

  return finalBlocks.filter(b => b.length > 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any = {};
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    body = await req.json().catch(() => ({}));
    const { lead_id, client_id, current_stage, inbound_message, intent, media_url, message_type } = body;

    if (!lead_id || !client_id) {
      return new Response(JSON.stringify({ error: "lead_id and client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentType = STAGE_TO_AGENT[current_stage] || "sdr";

    // ── 1. Get agent config ───────────────────────────────────────────────────
    const { data: agentConfig } = await supabase
      .from("crm_agent_configs")
      .select("*")
      .eq("client_id", client_id)
      .eq("agent_type", agentType)
      .maybeSingle();

    const config = {
      is_enabled: agentConfig?.is_enabled ?? true,
      max_chars: agentConfig?.max_chars ?? 500,
      allow_media: agentConfig?.allow_media ?? false,
      allow_links: agentConfig?.allow_links ?? false,
      allow_discount: agentConfig?.allow_discount ?? false,
      sales_intensity: agentConfig?.sales_intensity ?? "moderate",
      max_attempts: agentConfig?.max_attempts ?? 3,
      use_emojis: agentConfig?.use_emojis ?? true,
      allow_ai_identification: agentConfig?.allow_ai_identification ?? false,
      tone: agentConfig?.tone ?? "professional",
      custom_instructions: agentConfig?.custom_instructions ?? "",
      agent_name: agentConfig?.agent_name ?? "",
      response_structure: agentConfig?.response_structure ?? "natural",
      sales_model: agentConfig?.sales_model ?? "consultiva",
      formality_level: agentConfig?.formality_level ?? 5,
      authority_level: agentConfig?.authority_level ?? 5,
      curiosity_level: agentConfig?.curiosity_level ?? 5,
      insistence_level: agentConfig?.insistence_level ?? 5,
      pressure_level: agentConfig?.pressure_level ?? 5,
      use_anchoring: agentConfig?.use_anchoring ?? false,
      use_urgency: agentConfig?.use_urgency ?? false,
      max_discount_percent: agentConfig?.max_discount_percent ?? 0,
      min_score_qualified: agentConfig?.min_score_qualified ?? 70,
      max_score_unqualified: agentConfig?.max_score_unqualified ?? 30,
      min_confidence_sale: agentConfig?.min_confidence_sale ?? 80,
      reactivation_days: agentConfig?.reactivation_days ?? 3,
      reactivation_minutes: agentConfig?.reactivation_minutes ?? 120,
      reactivation_strategy: agentConfig?.reactivation_strategy ?? "pergunta_aberta",
      focus_products: agentConfig?.focus_products ?? "",
      ideal_client_profile: agentConfig?.ideal_client_profile ?? "",
      ideal_company_type: agentConfig?.ideal_company_type ?? "",
      min_budget: agentConfig?.min_budget ?? null,
      min_ticket: agentConfig?.min_ticket ?? null,
      required_problem: agentConfig?.required_problem ?? "",
      target_region: agentConfig?.target_region ?? "",
      crisis_keywords: agentConfig?.crisis_keywords ?? "",
      escalate_on_crisis: agentConfig?.escalate_on_crisis ?? true,
      success_criteria: agentConfig?.success_criteria ?? "",
      auto_advance_to: agentConfig?.auto_advance_to ?? "",
      pix_key: agentConfig?.pix_key ?? "",
      useful_links: agentConfig?.useful_links ?? "",
      send_product_images: agentConfig?.send_product_images ?? false,
      activation_mode: agentConfig?.activation_mode ?? "always_on",
      activation_keywords: agentConfig?.activation_keywords ?? "",
      human_takeover_minutes: agentConfig?.human_takeover_minutes ?? 30,
    };

    if (!config.is_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "agent_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1b. Governance: activation mode check ─────────────────────────────────
    if (config.activation_mode === "manual_only") {
      return new Response(JSON.stringify({ skipped: true, reason: "manual_only_mode" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (config.activation_mode === "keyword_trigger" && inbound_message) {
      const keywords = (config.activation_keywords || "").split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean);
      const msgLower = inbound_message.toLowerCase();
      const hasKeyword = keywords.some((kw: string) => msgLower.includes(kw));
      if (!hasKeyword) {
        return new Response(JSON.stringify({ skipped: true, reason: "no_keyword_match" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── 2. Get global bot config ──────────────────────────────────────────────
    const { data: botConfig } = await supabase
      .from("crm_bot_configs")
      .select("*")
      .eq("client_id", client_id)
      .maybeSingle();

    if (!botConfig?.is_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "bot_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const globalInstructions = botConfig.instructions?.trim() || "";

    if (botConfig.business_hours_only && botConfig.business_hours_start && botConfig.business_hours_end) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      if (timeStr < botConfig.business_hours_start || timeStr > botConfig.business_hours_end) {
        return new Response(JSON.stringify({ skipped: true, reason: "outside_hours" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── 3. Get full context ───────────────────────────────────────────────────
    const [{ data: lead }, { data: client }, { data: products }, { data: recentMsgs }, { data: agentFiles }, { data: agentKb }, { data: agentQuestions }] = await Promise.all([
      supabase.from("crm_leads").select("name, phone, status, tags, notes, recovery_attempts, sale_value, context_summary").eq("id", lead_id).single(),
      supabase.from("clients").select("name, business_description, business_segment, target_audience, value_proposition").eq("id", client_id).single(),
      supabase.from("client_products").select("name, price, description, features, image_url").eq("client_id", client_id).eq("is_active", true).limit(10),
      supabase.from("crm_messages").select("direction, content, message_type, media_url, created_at").eq("lead_id", lead_id).order("created_at", { ascending: false }).limit(40),
      supabase.from("crm_agent_files").select("file_name, parsed_content").eq("client_id", client_id).eq("agent_type", agentType).limit(5),
      supabase.from("crm_agent_knowledge").select("question, answer, category").eq("client_id", client_id).eq("agent_type", agentType).eq("is_active", true).limit(20),
      supabase.from("crm_agent_questions").select("question_text, is_required, score_weight, condition_field, condition_value, is_conditional, question_order").eq("client_id", client_id).eq("agent_type", agentType).order("question_order"),
    ]);

    if (!lead) return new Response(JSON.stringify({ skip: "lead not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    if (agentType === "recovery" && (lead.recovery_attempts || 0) >= config.max_attempts) {
      return new Response(JSON.stringify({ skipped: true, reason: "max_recovery_attempts_reached" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inboundCount = (recentMsgs || []).filter((m: any) => m.direction === "inbound").length;
    if (!botConfig.auto_respond_on_new && current_stage === "new" && inboundCount <= 1) {
      return new Response(JSON.stringify({ skipped: true, reason: "auto_respond_on_new_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build product catalog ─────────────────────────────────────────────────
    const productList = products?.length
      ? products.map((p: any) =>
          `• ${p.name}${p.price ? ` - R$${p.price}` : ""}${p.description ? `: ${p.description.slice(0, 80)}` : ""}${p.image_url ? " [TEM IMAGEM]" : ""}`
        ).join("\n")
      : "Nenhum produto cadastrado";
    const hasProducts = products && products.length > 0;

    // ── Build conversation history ────────────────────────────────────────────
    const conversationHistory = (recentMsgs || []).reverse().map((m: any) => {
      const role = m.direction === "inbound" ? "user" : "assistant";
      let content = m.content || `(${m.message_type})`;
      if (m.message_type === "image" && (!m.content || m.content === "📷 Imagem")) content = "(Lead enviou uma imagem)";
      else if (m.message_type === "audio" && (!m.content || m.content === "🎤 Áudio")) content = "(Lead enviou um áudio)";
      else if (m.message_type === "video") content = "(Lead enviou um vídeo)";
      else if (m.message_type === "document") content = "(Lead enviou um documento)";
      return { role, content };
    });

    const filesContext = agentFiles?.length
      ? `\nARQUIVOS DE REFERÊNCIA:\n${agentFiles.map((f: any) => f.parsed_content ? `[${f.file_name}]: ${f.parsed_content.slice(0, 1500)}` : "").filter(Boolean).join("\n")}`
      : "";
    const kbContext = agentKb?.length
      ? `\nBASE DE CONHECIMENTO:\n${agentKb.map((k: any) => `P: ${k.question}\nR: ${k.answer}`).join("\n\n")}`
      : "";
    const questionsContext = agentQuestions?.length
      ? `\nPERGUNTAS DE QUALIFICAÇÃO:\n${agentQuestions.map((q: any) => {
          const cond = q.is_conditional ? ` (condicional: ${q.condition_field}=${q.condition_value})` : "";
          return `- ${q.question_text} | obrigatória: ${q.is_required ? "sim" : "não"} | peso: ${q.score_weight || 0}${cond}`;
        }).join("\n")}`
      : "";

    const contextBlock = lead.context_summary
      ? `\nCONTEXTO ACUMULADO DO LEAD (dados já coletados — NÃO repita perguntas):\n${lead.context_summary}`
      : "";

    const tagsBlock = lead.tags?.length
      ? `\nETIQUETAS DO LEAD: ${(lead.tags as string[]).join(", ")}`
      : "";

    const persona = botConfig?.persona || "Assistente";

    // ── SYSTEM PROMPT — shared rules ──────────────────────────────────────────
    const sharedRules = `Você é ${config.agent_name || persona} da empresa "${client?.name || "empresa"}".

EMPRESA: ${client?.business_description || "N/A"} | Segmento: ${client?.business_segment || "N/A"} | Público: ${client?.target_audience || "N/A"} | Proposta: ${client?.value_proposition || "N/A"}

PRODUTOS:\n${productList}

LEAD: ${lead.name || "Visitante"} | Estágio: ${current_stage}${lead.notes ? ` | Notas: ${lead.notes.slice(0, 200)}` : ""}
${contextBlock}${tagsBlock}

${globalInstructions ? `INSTRUÇÕES GLOBAIS: ${globalInstructions}` : ""}

COMPORTAMENTO:
- Tom: ${config.tone} | Formalidade: ${config.formality_level}/10
- Emojis: ${config.use_emojis ? "sim" : "não"}
- Links: ${config.allow_links ? "sim" : "não"} | Desconto: ${config.allow_discount ? `até ${config.max_discount_percent}%` : "não"}
- ${config.allow_ai_identification ? "Pode revelar que é IA" : "NUNCA revele que é IA — aja como humano"}

${config.pix_key ? `PIX: ${config.pix_key}` : ""}
${config.useful_links ? `Links úteis:\n${config.useful_links}` : ""}

═══ REGRAS DE FORMATO (OBRIGATÓRIO) ═══

1. PORTUGUÊS BRASILEIRO apenas.
2. Cada mensagem DEVE ser curta e natural como WhatsApp humano.
3. Separe cada bloco com "---" numa linha isolada.
4. CADA BLOCO deve ter NO MÁXIMO 100 caracteres. Se precisar dizer mais, crie outro bloco.
5. NUNCA corte uma frase no meio. Cada bloco é uma mensagem COMPLETA.
6. O TOTAL de todos os blocos somados não pode ultrapassar ${config.max_chars} caracteres.
7. Use no máximo 3-5 blocos por resposta.

EXEMPLO CORRETO:
Oi! Tudo bem? 😊
---
Vi que você tem interesse nos nossos serviços
---
Como posso te ajudar?

EXEMPLO ERRADO (NÃO FAÇA ISSO):
Oi tudo bem, eu vi que você tem interesse nos nossos serviços de marketing digital e gostaria de saber mais sobre como podemos te ajudar com estratégias personalizadas...

═══ REGRAS DE COMPORTAMENTO ═══

8. SEMPRE use a ferramenta "update_lead_context" para salvar QUALQUER informação nova (nome, cidade, empresa, interesse, orçamento, etc). NUNCA perca dados.
9. Use "add_lead_tag" para etiquetar o lead quando identificar algo importante (ex: "interessado", "tem_orçamento", "quente", "frio", "agendou_reunião").
10. NÃO repita perguntas já respondidas (veja CONTEXTO ACUMULADO).
11. Se não souber: "Vou verificar com a equipe e retorno!"
12. Nunca invente preços ou informações.
13. Seja OBJETIVO — avance a conversa, não fique preso em loop.
14. Se o lead quer comprar, CONDUZA ao fechamento imediatamente.
${filesContext}${kbContext}${questionsContext}`;

    // ── Agent-specific objectives ─────────────────────────────────────────────
    const defaultObjectives: Record<string, string> = {
      sdr: "Entender a dor/necessidade do lead. Identificar se está qualificado. Agendar uma reunião ou avançar para vendas.",
      sales: "Apresentar os serviços/produtos adequados. Tratar objeções. Fechar a venda ou agendar apresentação.",
      recovery: "Reengajar leads que não responderam ou desistiram. Entender o motivo. Reconquistar o interesse e requalificar.",
      support: "Resolver dúvidas e problemas de clientes existentes. Garantir satisfação. Se detectar interesse em novo produto, avançar para vendas.",
    };

    const agentObjective = config.success_criteria || defaultObjectives[agentType] || defaultObjectives.sdr;

    const agentPrompts: Record<string, string> = {
      sdr: `${sharedRules}

═══ SEU PAPEL: SDR — Qualificador ═══
OBJETIVO CENTRAL: ${agentObjective}

COMO AGIR:
- Identifique a dor/necessidade do lead rapidamente
- Colete informações essenciais: nome, empresa, necessidade principal
- Faça NO MÁXIMO 2-3 perguntas por interação
- Se tem dados suficientes no CONTEXTO ACUMULADO → AVANCE (use advance_lead_stage para "qualified" ou "negotiating")
- Se o lead quer comprar → NÃO bloqueie → avance para negociação
- Se o lead não tem perfil → marque como "unqualified" com motivo
- SEMPRE salve dados com update_lead_context e etiquete com add_lead_tag
${config.custom_instructions ? `\nINSTRUÇÕES EXTRAS: ${config.custom_instructions}` : ""}`,

      sales: `${sharedRules}

═══ SEU PAPEL: VENDAS — Fechador ═══
OBJETIVO CENTRAL: ${agentObjective}

COMO AGIR:
- Apresente a SOLUÇÃO para a dor do lead (use o contexto acumulado)
- Seja direto: benefício → preço → chamada para ação
- ${config.allow_discount ? `Pode oferecer desconto até ${config.max_discount_percent}%` : "NÃO ofereça desconto"}
- Se o cliente quer pagar → envie PIX e instruções
- Trate objeções com empatia mas firmeza
- Quando fechar → use advance_lead_stage para "sale_completed"
- NUNCA enrole — cada mensagem deve levar ao fechamento
${config.custom_instructions ? `\nINSTRUÇÕES EXTRAS: ${config.custom_instructions}` : ""}`,

      recovery: `${sharedRules}

═══ SEU PAPEL: RECUPERADOR ═══
OBJETIVO CENTRAL: ${agentObjective}
TENTATIVA: ${(lead.recovery_attempts || 0) + 1} de ${config.max_attempts}

COMO AGIR:
- Aborde com ângulo DIFERENTE das tentativas anteriores
- Estratégia: ${config.reactivation_strategy}
- Entenda POR QUE desistiu ou parou de responder
- Se demonstrar interesse → requalifique e avance
- Se recusar claramente → respeite e marque como "sale_lost"
- NÃO seja insistente demais — seja empático
${config.custom_instructions ? `\nINSTRUÇÕES EXTRAS: ${config.custom_instructions}` : ""}`,

      support: `${sharedRules}

═══ SEU PAPEL: SUPORTE ═══
OBJETIVO CENTRAL: ${agentObjective}

COMO AGIR:
- Resolva o problema/dúvida do cliente rapidamente
- Seja empático e atencioso
- Se detectar interesse em compra nova → avance para vendas (advance_lead_stage para "negotiating")
- Se detectar insatisfação → etiquete como "insatisfeito" e escale
- Registre TUDO no contexto para futuras interações
${config.custom_instructions ? `\nINSTRUÇÕES EXTRAS: ${config.custom_instructions}` : ""}`,
    };

    const systemPrompt = agentPrompts[agentType] || agentPrompts.sdr;

    // ── 5. Build messages array ───────────────────────────────────────────────
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-25),
    ];

    // Handle inbound message with multimodal support
    if (inbound_message && (conversationHistory.length === 0 ||
        conversationHistory[conversationHistory.length - 1]?.content !== inbound_message)) {

      if (media_url && message_type === "image") {
        const parts: any[] = [];
        try {
          const imgRes = await fetch(media_url, { signal: AbortSignal.timeout(15000) });
          if (imgRes.ok) {
            const imgBuffer = await imgRes.arrayBuffer();
            const contentType = imgRes.headers.get("content-type") || "image/jpeg";
            const base64Img = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
            parts.push({ type: "text", text: inbound_message && inbound_message !== "📷 Imagem" ? inbound_message + "\n\n(O lead enviou esta imagem. Analise e responda.)" : "(O lead enviou esta imagem. Analise e responda.)" });
            parts.push({ type: "image_url", image_url: { url: `data:${contentType};base64,${base64Img}` } });
          } else {
            parts.push({ type: "text", text: "(Lead enviou uma imagem que não pôde ser carregada.)" });
          }
        } catch {
          parts.push({ type: "text", text: "(Lead enviou uma imagem que não pôde ser processada.)" });
        }
        messages.push({ role: "user", content: parts });

      } else if (media_url && message_type === "audio") {
        const parts: any[] = [];
        try {
          const audioRes = await fetch(media_url, { signal: AbortSignal.timeout(20000) });
          if (audioRes.ok) {
            const audioBuffer = await audioRes.arrayBuffer();
            const contentType = audioRes.headers.get("content-type") || "audio/ogg";
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
            parts.push({ type: "text", text: "(O lead enviou um ÁUDIO. Ouça e responda NATURALMENTE. NÃO peça para digitar.)" });
            parts.push({ type: "input_audio", input_audio: { data: base64Audio, format: contentType.includes("ogg") ? "ogg" : contentType.includes("mp3") ? "mp3" : "ogg" } });
          } else {
            parts.push({ type: "text", text: "(Lead enviou áudio que não pôde ser carregado. Peça para repetir por texto.)" });
          }
        } catch {
          parts.push({ type: "text", text: "(Lead enviou áudio que não pôde ser processado. Peça para repetir.)" });
        }
        messages.push({ role: "user", content: parts });

      } else {
        messages.push({ role: "user", content: inbound_message });
      }
    }

    // ── 6. Define tools ───────────────────────────────────────────────────────
    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "update_lead_context",
          description: "OBRIGATÓRIO: Salvar QUALQUER informação nova do lead (nome, cidade, empresa, necessidade, orçamento, e-mail, etc). Use SEMPRE que o lead fornecer dados. NUNCA apague — apenas acrescente.",
          parameters: {
            type: "object",
            properties: {
              new_info: { type: "string", description: "Resumo das novas informações. Ex: 'Nome: João, Empresa: ABC, Interesse: marketing digital'" },
            },
            required: ["new_info"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "advance_lead_stage",
          description: "Avançar o lead no funil quando o objetivo do agente foi cumprido.",
          parameters: {
            type: "object",
            properties: {
              new_stage: { type: "string", enum: ["qualified", "negotiating", "sale_completed", "sale_lost", "unqualified"], description: "Nova etapa" },
              reason: { type: "string", description: "Motivo da mudança" },
            },
            required: ["new_stage", "reason"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "add_lead_tag",
          description: "Etiquetar o lead para identificação rápida. Use para marcar: interessado, quente, frio, tem_orçamento, agendou_reunião, insatisfeito, vip, etc.",
          parameters: {
            type: "object",
            properties: {
              tag: { type: "string", description: "Nome da etiqueta (sem espaços, use underline)" },
            },
            required: ["tag"],
          },
        },
      },
    ];

    if (config.send_product_images && hasProducts) {
      tools.push({
        type: "function",
        function: {
          name: "send_product_image",
          description: "Enviar imagem de um produto do catálogo para o lead.",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string", description: "Nome exato do produto" },
            },
            required: ["product_name"],
          },
        },
      });
    }

    // Quote generation tool — available for sales and sdr agents
    if (agentType === "sales" || agentType === "sdr") {
      tools.push({
        type: "function",
        function: {
          name: "generate_quote_link",
          description: "Gerar um link de orçamento/proposta comercial personalizada para o lead. Use quando o lead demonstrar interesse em preço, valores ou quiser uma proposta formal. O link será enviado automaticamente.",
          parameters: {
            type: "object",
            properties: {
              product_names: { type: "string", description: "Nomes dos produtos/serviços separados por vírgula" },
              discount_percent: { type: "number", description: "Desconto em percentual (0-100). Use 0 se sem desconto." },
            },
            required: ["product_names"],
          },
        },
      });
    }

    console.log("[agent-dispatcher] Agent:", agentType, "Lead:", lead_id, "Stage:", current_stage);

    // ── 7. Call AI with fallback ─────────────────────────────────────────────
    const aiTemp = agentType === "sdr" ? 0.6 : agentType === "sales" ? 0.7 : 0.75;
    const aiData = await callAIWithFallback(messages, tools, aiTemp, 2048);
    const choice = aiData.choices?.[0]?.message;
    let replyText = choice?.content?.trim() || "";
    const toolCalls = choice?.tool_calls || [];

    // ── 8. Process tool calls ─────────────────────────────────────────────────
    let stageAdvanced = false;
    const actions: string[] = [];

    for (const tc of toolCalls) {
      try {
        const args = JSON.parse(tc.function.arguments);
        const fnName = tc.function.name;

        if (fnName === "update_lead_context") {
          const existing = lead.context_summary || "";
          const newEntry = `[${new Date().toISOString().slice(0, 16)}] ${args.new_info}`;
          const updated = existing ? `${existing}\n${newEntry}` : newEntry;
          const trimmedContext = trimContext(updated, 3000);
          await supabase.from("crm_leads").update({ context_summary: trimmedContext }).eq("id", lead_id);
          actions.push(`context_updated: ${args.new_info.slice(0, 100)}`);
          console.log("[agent-dispatcher] Context updated for lead:", lead_id);
        }

        if (fnName === "advance_lead_stage") {
          const targetStage = config.auto_advance_to || args.new_stage;
          await supabase.from("crm_leads").update({ status: targetStage }).eq("id", lead_id);
          await supabase.from("crm_intelligence_events").insert({
            lead_id, client_id,
            event_type: "stage_change",
            from_stage: current_stage,
            to_stage: targetStage,
            agent_type: agentType,
            trigger_text: args.reason?.slice(0, 200),
            metadata: { auto: true, agent: agentType },
          });
          stageAdvanced = true;
          actions.push(`stage_advanced: ${current_stage} → ${targetStage}`);
        }

        if (fnName === "add_lead_tag") {
          const tag = args.tag.toLowerCase().replace(/\s+/g, '_');
          const currentTags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
          if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            await supabase.from("crm_leads").update({ tags: currentTags }).eq("id", lead_id);
            actions.push(`tag_added: ${tag}`);
            console.log("[agent-dispatcher] Tag added:", tag);
          }
        }

        if (fnName === "send_product_image") {
          const product = products?.find((p: any) =>
            p.name.toLowerCase().includes(args.product_name.toLowerCase()) ||
            args.product_name.toLowerCase().includes(p.name.toLowerCase())
          );
          if (product?.image_url) {
            const { data: conn } = await supabase
              .from("crm_whatsapp_connections")
              .select("session_api_key")
              .eq("client_id", client_id)
              .maybeSingle();

            if (conn?.session_api_key) {
              let phone = String(lead.phone).replace(/\D/g, "");
              if (!phone.startsWith("55")) phone = "55" + phone;
              const caption = `*${product.name}*${product.price ? ` — R$${product.price}` : ""}`;

              await fetchWithRetry(`${WASENDER_BASE}/send-message`, {
                method: "POST",
                headers: { Authorization: `Bearer ${conn.session_api_key}`, "Content-Type": "application/json" },
                body: JSON.stringify({ to: "+" + phone, imageUrl: product.image_url, text: caption }),
              });

              await supabase.from("crm_messages").insert({
                lead_id, client_id, direction: "outbound", message_type: "image",
                content: caption, media_url: product.image_url, status: "sent",
              });
              actions.push(`product_image_sent: ${product.name}`);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }

        if (fnName === "generate_quote_link") {
          try {
            const productNames = (args.product_names || "").split(",").map((n: string) => n.trim()).filter(Boolean);
            const discountPct = Math.min(Math.max(args.discount_percent || 0, 0), config.max_discount_percent || 0);

            // Match products from catalog
            const quoteItems: any[] = [];
            for (const pName of productNames) {
              const matched = products?.find((p: any) =>
                p.name.toLowerCase().includes(pName.toLowerCase()) ||
                pName.toLowerCase().includes(p.name.toLowerCase())
              );
              if (matched) {
                quoteItems.push({
                  name: matched.name,
                  description: matched.description || "",
                  price: matched.price || 0,
                  quantity: 1,
                  image_url: matched.image_url || null,
                });
              } else {
                quoteItems.push({ name: pName, description: "", price: 0, quantity: 1 });
              }
            }

            if (quoteItems.length > 0) {
              // Generate quote code
              const { data: codeData } = await supabase.rpc("generate_quote_code");
              const code = codeData || `PFMK-${Date.now().toString(36).toUpperCase()}`;

              const totalValue = quoteItems.reduce((s: number, i: any) => s + (i.price * (i.quantity || 1)), 0);
              const discountValue = totalValue * (discountPct / 100);
              const finalValue = totalValue - discountValue;

              const validUntil = new Date();
              validUntil.setDate(validUntil.getDate() + 10);

              await supabase.from("crm_quotes").insert({
                code,
                client_id,
                lead_id,
                lead_name: lead.name || "Visitante",
                lead_phone: String(lead.phone),
                title: "Proposta Comercial",
                items: quoteItems,
                total_value: totalValue,
                discount_percent: discountPct,
                discount_value: discountValue,
                final_value: finalValue,
                valid_until: validUntil.toISOString().split("T")[0],
                status: "sent",
              });

              const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
              // Build public quote URL
              const quoteUrl = `https://peformake.com/orcamento/${code}`;

              // Send quote link via WhatsApp
              const { data: connQ } = await supabase
                .from("crm_whatsapp_connections")
                .select("session_api_key")
                .eq("client_id", client_id)
                .maybeSingle();

              if (connQ?.session_api_key) {
                let qPhone = String(lead.phone).replace(/\D/g, "");
                if (!qPhone.startsWith("55")) qPhone = "55" + qPhone;

                const quoteMsg = `📋 Preparei uma proposta exclusiva pra você!\n\n🔗 ${quoteUrl}\n\nDá uma olhada e me diz o que achou 😊`;

                await fetchWithRetry(`${WASENDER_BASE}/send-message`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${connQ.session_api_key}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ to: "+" + qPhone, text: quoteMsg }),
                });

                await supabase.from("crm_messages").insert({
                  lead_id, client_id, direction: "outbound", message_type: "text",
                  content: quoteMsg, status: "sent",
                });

                actions.push(`quote_generated: ${code} (${quoteItems.length} items, ${discountPct}% off)`);
                console.log("[agent-dispatcher] Quote generated:", code);
                await new Promise(r => setTimeout(r, 2000));
              }
            }
          } catch (quoteErr: any) {
            console.error("[agent-dispatcher] Quote generation error:", quoteErr?.message);
            actions.push(`quote_error: ${quoteErr?.message}`);
          }
        }
      } catch (tcErr: any) {
        console.error("[agent-dispatcher] Tool call error:", tcErr?.message);
      }
    }

    // If AI returned no text (only tool calls), generate follow-up
    if (!replyText && toolCalls.length > 0) {
      const followUpMessages = [...messages];
      followUpMessages.push({
        role: "assistant",
        content: null,
        tool_calls: toolCalls.map((tc: any) => ({ id: tc.id, type: "function", function: { name: tc.function.name, arguments: tc.function.arguments } })),
      });
      for (const tc of toolCalls) {
        followUpMessages.push({ role: "tool", tool_call_id: tc.id, content: "OK — ação executada com sucesso." });
      }

      try {
        const followUpData = await callAIWithFallback(followUpMessages, [], 0.7, 1024);
        replyText = followUpData.choices?.[0]?.message?.content?.trim() || "";
      } catch (fuErr: any) {
        console.error("[agent-dispatcher] Follow-up AI error:", fuErr.message);
      }
    }

    if (!replyText) {
      console.warn("[agent-dispatcher] No reply text generated");
      return new Response(JSON.stringify({ success: true, actions, no_reply: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 9. Split into blocks and enforce limits ───────────────────────────────
    // Enforce total char limit first — find last complete sentence within limit
    if (replyText.length > config.max_chars) {
      let cut = replyText.slice(0, config.max_chars);
      // Find the last complete sentence boundary
      const boundaries = [
        cut.lastIndexOf('---'),
        cut.lastIndexOf('. '),
        cut.lastIndexOf('.\n'),
        cut.lastIndexOf('!\n'),
        cut.lastIndexOf('! '),
        cut.lastIndexOf('?\n'),
        cut.lastIndexOf('? '),
      ];
      const bestBreak = Math.max(...boundaries);
      if (bestBreak > config.max_chars * 0.3) {
        cut = cut.slice(0, bestBreak + 1).trim();
      } else {
        // Find last space and add period
        const lastSpace = cut.lastIndexOf(' ');
        if (lastSpace > config.max_chars * 0.3) {
          cut = cut.slice(0, lastSpace).trim();
        }
      }
      // Clean trailing separator
      while (cut.endsWith('---') || cut.endsWith('--')) {
        cut = cut.replace(/---?\s*$/, '').trim();
      }
      replyText = cut;
    }

    // Split into small blocks (max 100 chars each)
    const messageChunks = splitIntoBlocks(replyText, 100);

    if (messageChunks.length === 0) messageChunks.push(replyText.slice(0, 100));

    // ── 10. Send via WhatsApp ─────────────────────────────────────────────────
    const { data: conn } = await supabase
      .from("crm_whatsapp_connections")
      .select("session_api_key")
      .eq("client_id", client_id)
      .maybeSingle();

    if (!conn?.session_api_key) throw new Error("WhatsApp session not available");

    let phone = String(lead.phone).replace(/\D/g, "");
    if (!phone.startsWith("55")) phone = "55" + phone;
    const e164 = "+" + phone;

    const allWasenderIds: string[] = [];
    for (let i = 0; i < messageChunks.length; i++) {
      const chunk = messageChunks[i];

      // Human-like typing delay between chunks
      if (i > 0) {
        const typingDelay = Math.min(3500, Math.max(1500, chunk.length * 25));
        await new Promise(r => setTimeout(r, typingDelay));
      }

      const sendRes = await fetchWithRetry(`${WASENDER_BASE}/send-message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${conn.session_api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: e164, text: chunk }),
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok) {
        console.error(`[agent-dispatcher] Failed chunk ${i}:`, sendData);
        continue;
      }

      const wasenderId = sendData?.data?.key?.id || sendData?.data?.id || null;
      if (wasenderId) allWasenderIds.push(wasenderId);

      await supabase.from("crm_messages").insert({
        lead_id, client_id, direction: "outbound", message_type: "text",
        content: chunk, wasender_message_id: wasenderId, status: "sent",
      });
    }

    // Update recovery attempts
    if (agentType === "recovery") {
      await supabase.from("crm_leads").update({ recovery_attempts: (lead.recovery_attempts || 0) + 1 }).eq("id", lead_id);
    }

    // Log agent action
    await supabase.from("crm_intelligence_events").insert({
      lead_id, client_id,
      event_type: "agent_responded",
      from_stage: current_stage,
      to_stage: stageAdvanced ? (config.auto_advance_to || current_stage) : current_stage,
      intent,
      agent_type: agentType,
      trigger_text: inbound_message?.slice(0, 200),
      metadata: {
        reply: replyText.slice(0, 300),
        chunks: messageChunks.length,
        agent_label: AGENT_LABELS[agentType],
        actions,
        stage_advanced: stageAdvanced,
      },
    });

    return new Response(JSON.stringify({
      success: true, agent: agentType, chunks: messageChunks.length,
      reply: replyText, actions, stage_advanced: stageAdvanced,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[agent-dispatcher] Error:", e);

    // ── Fallback: send friendly error message to lead ────────────────────────
    try {
      const supabaseFb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: leadFb } = await supabaseFb.from("crm_leads").select("phone").eq("id", body?.lead_id).maybeSingle();
      const { data: connFb } = await supabaseFb.from("crm_whatsapp_connections").select("session_api_key").eq("client_id", body?.client_id).maybeSingle();
      if (leadFb?.phone && connFb?.session_api_key) {
        let ph = String(leadFb.phone).replace(/\D/g, "");
        if (!ph.startsWith("55")) ph = "55" + ph;
        const fallbackMsg = "Só um momento, já te respondo! 😊";
        await fetch(`${WASENDER_BASE}/send-message`, {
          method: "POST",
          headers: { Authorization: `Bearer ${connFb.session_api_key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ to: "+" + ph, text: fallbackMsg }),
        });
        await supabaseFb.from("crm_messages").insert({
          lead_id: body?.lead_id, client_id: body?.client_id, direction: "outbound",
          message_type: "text", content: fallbackMsg, status: "sent",
        });
        console.log("[agent-dispatcher] Fallback message sent to lead");
      }
    } catch (fbErr: any) {
      console.error("[agent-dispatcher] Fallback message failed:", fbErr.message);
    }

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
