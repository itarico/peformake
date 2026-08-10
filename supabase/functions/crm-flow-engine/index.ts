import { createClient } from "npm:@supabase/supabase-js@2";

const WASENDER_BASE = "https://www.wasenderapi.com/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const { action, lead_id, client_id, flow_id, session_id, response } = body;

    if (!action || !client_id) {
      return new Response(JSON.stringify({ error: "action and client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── START FLOW ───
    if (action === "start_flow") {
      if (!flow_id || !lead_id) {
        return new Response(JSON.stringify({ error: "flow_id and lead_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get first node
      const { data: nodes } = await supabase
        .from("crm_flow_nodes")
        .select("*")
        .eq("flow_id", flow_id)
        .order("node_order", { ascending: true })
        .limit(1);

      if (!nodes?.length) {
        return new Response(JSON.stringify({ error: "Flow has no nodes" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const firstNode = nodes[0];

      // Create session
      const { data: session, error: sessErr } = await supabase
        .from("crm_flow_sessions")
        .insert({
          flow_id, lead_id, client_id,
          current_node_id: firstNode.id,
          status: "active",
          variables: {},
        })
        .select()
        .single();

      if (sessErr) throw sessErr;

      // Process the first node
      const result = await processNode(supabase, session, firstNode, client_id);
      return new Response(JSON.stringify({ ok: true, session_id: session.id, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PROCESS RESPONSE ───
    if (action === "process_response") {
      if (!session_id) {
        return new Response(JSON.stringify({ error: "session_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: session } = await supabase
        .from("crm_flow_sessions")
        .select("*")
        .eq("id", session_id)
        .single();

      if (!session || session.status !== "active") {
        return new Response(JSON.stringify({ error: "Session not active" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get current node
      const { data: currentNode } = await supabase
        .from("crm_flow_nodes")
        .select("*")
        .eq("id", session.current_node_id)
        .single();

      if (!currentNode) {
        return new Response(JSON.stringify({ error: "Current node not found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save response variable
      const config = currentNode.config || {};
      let variables = session.variables || {};
      if (config.variable_name && response !== undefined) {
        variables[config.variable_name] = response;
      }

      // Determine next node
      let nextNodeId: string | null = null;

      if (currentNode.node_type === "question" && config.response_type === "options" && config.options) {
        // Try matching by value, label, or numeric index (e.g. user types "1" for first option)
        const normalizedResponse = normalizeResponse(response);
        let selectedOption = config.options.find((o: any) => {
          const value = normalizeResponse(o.value);
          const label = normalizeResponse(o.label);
          return value === normalizedResponse || label === normalizedResponse || normalizedResponse.includes(value) || normalizedResponse.includes(label);
        });
        if (!selectedOption) {
          const numIdx = parseInt(String(response).match(/\d+/)?.[0] || "", 10);
          if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= config.options.length) {
            selectedOption = config.options[numIdx - 1];
          }
        }
        nextNodeId = selectedOption?.next_node_id || currentNode.next_node_id;
      } else if (currentNode.node_type === "wait_response") {
        nextNodeId = currentNode.next_node_id;
      } else {
        nextNodeId = currentNode.next_node_id;
      }

      // Update session variables
      await supabase
        .from("crm_flow_sessions")
        .update({ variables, current_node_id: nextNodeId })
        .eq("id", session_id);

      if (!nextNodeId) {
        // Flow completed
        await supabase
          .from("crm_flow_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", session_id);

        // Fire end-of-flow webhooks
        await fireWebhooks(supabase, client_id, variables);

        return new Response(JSON.stringify({ ok: true, completed: true, variables }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get and process next node
      const { data: nextNode } = await supabase
        .from("crm_flow_nodes")
        .select("*")
        .eq("id", nextNodeId)
        .single();

      if (!nextNode) {
        await supabase
          .from("crm_flow_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", session_id);
        return new Response(JSON.stringify({ ok: true, completed: true, variables }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updatedSession = { ...session, variables, current_node_id: nextNodeId };
      const result = await processNode(supabase, updatedSession, nextNode, client_id);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET SESSION ───
    if (action === "get_session") {
      if (!session_id) {
        return new Response(JSON.stringify({ error: "session_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: session } = await supabase
        .from("crm_flow_sessions")
        .select("*, crm_flow_nodes(*)")
        .eq("id", session_id)
        .single();

      return new Response(JSON.stringify({ ok: true, session }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CHECK TRIGGER ───
    if (action === "check_trigger") {
      const { trigger_type, trigger_value } = body;
      const { data: flow } = await supabase
        .from("crm_flows")
        .select("id, name")
        .eq("client_id", client_id)
        .eq("trigger_type", trigger_type || "message")
        .eq("is_active", true)
        .maybeSingle();

      return new Response(JSON.stringify({ ok: true, flow }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[crm-flow-engine] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function normalizeResponse(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function processNode(supabase: any, session: any, node: any, clientId: string): Promise<any> {
  const config = node.config || {};
  const variables = session.variables || {};

  switch (node.node_type) {
    case "message": {
      const message = {
        type: config.media_type || "text",
        content: replaceVars(config.text || "", variables),
        media_url: config.media_url ? replaceVars(config.media_url, variables) : null,
        file_name: config.media_name ? replaceVars(config.media_name, variables) : null,
      };
      const messages = message.content || message.media_url ? [message] : [];

      if (messages.length > 0) {
        await dispatchFlowMessages(supabase, session, clientId, messages);
      }

      if (node.next_node_id) {
        const { data: nextNode } = await supabase
          .from("crm_flow_nodes").select("*").eq("id", node.next_node_id).single();

        await supabase
          .from("crm_flow_sessions")
          .update({ current_node_id: node.next_node_id })
          .eq("id", session.id);

        if (nextNode) {
          const nextResult = await processNode(
            supabase,
            { ...session, current_node_id: node.next_node_id },
            nextNode,
            clientId,
          );
          return {
            ...nextResult,
            messages: [...messages, ...(nextResult.messages || [])],
          };
        }
      }

      return { messages, waiting: false };
    }

    case "question": {
      const questionText = buildQuestionText(config, variables);
      await dispatchFlowMessages(supabase, session, clientId, [{ type: "text", content: questionText, media_url: null, file_name: null }]);
      return {
        messages: [{ type: "text", content: questionText }],
        waiting: true,
        question: {
          response_type: config.response_type || "open",
          options: config.options || [],
          variable_name: config.variable_name,
        },
      };
    }

    case "condition": {
      const varValue = variables[config.variable] ?? "";
      const condValue = config.value ?? "";
      let result = false;

      switch (config.operator) {
        case "equals": result = String(varValue).toLowerCase() === String(condValue).toLowerCase(); break;
        case "not_equals": result = String(varValue).toLowerCase() !== String(condValue).toLowerCase(); break;
        case "contains": result = String(varValue).toLowerCase().includes(String(condValue).toLowerCase()); break;
        case "greater_than": result = Number(varValue) > Number(condValue); break;
        case "less_than": result = Number(varValue) < Number(condValue); break;
        default: result = String(varValue) === String(condValue);
      }

      const nextId = result ? config.true_node_id : config.false_node_id;

      if (!nextId) {
        await supabase
          .from("crm_flow_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", session.id);
        return { messages: [], completed: true, variables };
      }

      const { data: nextNode } = await supabase
        .from("crm_flow_nodes").select("*").eq("id", nextId).single();

      await supabase
        .from("crm_flow_sessions")
        .update({ current_node_id: nextId })
        .eq("id", session.id);

      if (nextNode) {
        return processNode(supabase, { ...session, current_node_id: nextId }, nextNode, clientId);
      }

      return { messages: [], completed: true };
    }

    case "wait_response": {
      // Send the prompt message if configured
      const waitText = replaceVars(config.text || "", variables);
      const messages: any[] = [];
      if (waitText) {
        await dispatchFlowMessages(supabase, session, clientId, [{ type: "text", content: waitText, media_url: null, file_name: null }]);
        messages.push({ type: "text", content: waitText });
      }

      // Update session to wait at this node
      await supabase
        .from("crm_flow_sessions")
        .update({ current_node_id: node.id })
        .eq("id", session.id);

      return {
        messages,
        waiting: true,
        question: {
          response_type: "open",
          variable_name: config.variable_name,
        },
      };
    }

    case "action": {
      const actionType = config.action_type;

      if (actionType === "tag" && config.tag_value) {
        // Add tag to lead
        const { data: lead } = await supabase
          .from("crm_leads").select("tags").eq("id", session.lead_id).single();

        const currentTags = lead?.tags || [];
        const tagVal = replaceVars(config.tag_value, variables);
        if (!currentTags.includes(tagVal)) {
          await supabase
            .from("crm_leads")
            .update({ tags: [...currentTags, tagVal] })
            .eq("id", session.lead_id);
        }
      }

      if (actionType === "webhook" && config.webhook_id) {
        const { data: webhook } = await supabase
          .from("crm_flow_webhooks").select("*").eq("id", config.webhook_id).single();

        if (webhook && webhook.is_active) {
          const payload = buildPayload(webhook.payload_template, variables);
          fetch(webhook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(webhook.headers || {}) },
            body: JSON.stringify(payload),
          }).catch(e => console.error("[flow-engine] Webhook error:", e));
        }
      }

      if (actionType === "api_call" && config.api_url) {
        try {
          const apiRes = await fetch(replaceVars(config.api_url, variables), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(variables),
          });
          const apiData = await apiRes.json().catch(() => ({}));
          variables._api_response = apiData;
          await supabase
            .from("crm_flow_sessions")
            .update({ variables })
            .eq("id", session.id);
        } catch (e) {
          console.error("[flow-engine] API call error:", e);
        }
      }

      // Auto-advance
      if (node.next_node_id) {
        const { data: nextNode } = await supabase
          .from("crm_flow_nodes").select("*").eq("id", node.next_node_id).single();

        await supabase
          .from("crm_flow_sessions")
          .update({ current_node_id: node.next_node_id })
          .eq("id", session.id);

        if (nextNode) {
          return processNode(supabase, { ...session, current_node_id: node.next_node_id, variables }, nextNode, clientId);
        }
      }

      return { messages: [], waiting: false };
    }

    default:
      return { messages: [], waiting: false };
  }
}

function replaceVars(text: string, variables: Record<string, any>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

function buildQuestionText(config: any, variables: Record<string, any>) {
  const baseText = replaceVars(config.text || "", variables);
  if (config.response_type !== "options" || !Array.isArray(config.options) || config.options.length === 0) {
    return baseText;
  }

  const menuText = config.options
    .map((option: any, index: number) => `${index + 1}. ${replaceVars(option.label || `Opção ${index + 1}`, variables)}`)
    .join("\n");

  return `${baseText}\n\n${menuText}`.trim();
}

function buildPayload(template: any, variables: Record<string, any>): any {
  if (!template || typeof template !== "object") return variables;
  const result: any = {};
  for (const [key, val] of Object.entries(template)) {
    if (typeof val === "string") {
      result[key] = replaceVars(val, variables);
    } else {
      result[key] = val;
    }
  }
  return result;
}

function normalizePhone(rawPhone: string) {
  let phone = String(rawPhone || "").replace(/\D/g, "");
  if (!phone.startsWith("55")) phone = `55${phone}`;
  return `+${phone}`;
}

async function dispatchFlowMessages(supabase: any, session: any, clientId: string, messages: Array<{ type: string; content: string; media_url: string | null; file_name?: string | null }>) {
  if (!messages.length) return;

  const [{ data: lead }, { data: connection }] = await Promise.all([
    supabase.from("crm_leads").select("phone").eq("id", session.lead_id).single(),
    supabase.from("crm_whatsapp_connections").select("session_api_key").eq("client_id", clientId).maybeSingle(),
  ]);

  if (!lead?.phone) throw new Error("Lead sem telefone para receber o fluxo");
  if (!connection?.session_api_key) throw new Error("WhatsApp não conectado para executar o fluxo");

  const to = normalizePhone(lead.phone);

  for (const message of messages) {
    const type = message.type || "text";
    const body: Record<string, unknown> = { to };

    if (type === "image") {
      body.imageUrl = message.media_url;
      body.text = message.content || "";
    } else if (type === "video") {
      body.videoUrl = message.media_url;
      body.text = message.content || "";
    } else if (type === "audio") {
      body.audioUrl = message.media_url;
    } else if (type === "document") {
      body.documentUrl = message.media_url;
      body.text = message.file_name || message.content || "arquivo";
    } else {
      body.text = message.content || "";
    }

    const sendRes = await fetch(`${WASENDER_BASE}/send-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.session_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const sendData = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      throw new Error(sendData?.message || sendData?.error || `Falha ao enviar bloco do fluxo (${sendRes.status})`);
    }

    const wasenderId = sendData?.data?.key?.id || sendData?.data?.id || sendData?.id || null;

    await supabase.from("crm_messages").insert({
      lead_id: session.lead_id,
      client_id: clientId,
      direction: "outbound",
      message_type: type,
      content: type === "document" ? message.file_name || message.content || "arquivo" : message.content || null,
      media_url: message.media_url,
      wasender_message_id: wasenderId,
      status: "sent",
    });

    try {
      await supabase.from("crm_intelligence_events").insert({
        lead_id: session.lead_id,
        client_id: clientId,
        event_type: "agent_responded",
        agent_type: "flow",
        description: "Mensagem enviada por fluxo conversacional",
        metadata: { flow_id: session.flow_id, node_id: session.current_node_id, wasender_message_id: wasenderId },
      });
    } catch {
      // Non-blocking: flow delivery must not fail if event logging is unavailable.
    }
  }
}

async function fireWebhooks(supabase: any, clientId: string, variables: Record<string, any>) {
  const { data: webhooks } = await supabase
    .from("crm_flow_webhooks")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true);

  for (const wh of webhooks || []) {
    const payload = buildPayload(wh.payload_template, variables);
    fetch(wh.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(wh.headers || {}) },
      body: JSON.stringify(payload),
    }).catch(e => console.error("[flow-engine] End webhook error:", e));
  }
}
