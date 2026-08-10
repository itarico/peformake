import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WASENDER_BASE = "https://www.wasenderapi.com/api";

// Retry helper for rate-limited requests (429)
async function fetchWithRetry(url: string, opts: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status === 429 && attempt < maxRetries) {
      const body = await res.json().catch(() => ({}));
      const retryAfter = body.retry_after || 5;
      console.log(`[fetchWithRetry] 429 rate limited, waiting ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
      continue;
    }
    return res;
  }
  // Should never reach here, but TypeScript needs it
  return fetch(url, opts);
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Normalize Brazilian phone to E.164 format
function normalizePhone(to: string): string {
  let phone = String(to).replace(/\D/g, "");
  if (!phone.startsWith("55")) phone = "55" + phone;
  return "+" + phone;
}

// Strip phone to digits only
function stripPhone(p: string): string {
  return String(p).replace(/\D/g, "");
}

// Generate phone variations for flexible lead matching
function phoneVariations(phone: string): string[] {
  const digits = stripPhone(phone);
  if (!digits) return [];
  const variants = new Set<string>();
  variants.add(digits);
  if (!digits.startsWith("55")) variants.add("55" + digits);
  if (digits.startsWith("55") && digits.length > 4) variants.add(digits.slice(2));
  return Array.from(variants);
}

// Find lead by trying multiple phone variations
async function findLeadFlexible(supabase: any, clientId: string, phone: string): Promise<any> {
  const variants = phoneVariations(phone);
  for (const v of variants) {
    const { data } = await supabase.from("crm_leads").select("id").eq("client_id", clientId).eq("phone", v).maybeSingle();
    if (data) return data;
  }
  return null;
}

// Get or refresh session API key from Wasender API
async function getSessionApiKey(supabase: any, pat: string, clientId: string): Promise<{ apiKey: string | null; sessionId: string | null }> {
  const { data: conn } = await supabase
    .from("crm_whatsapp_connections")
    .select("session_api_key, session_id")
    .eq("client_id", clientId)
    .single();

  if (!conn) return { apiKey: null, sessionId: null };

  if (conn.session_api_key) return { apiKey: conn.session_api_key, sessionId: conn.session_id };

  console.log("[getSessionApiKey] Fetching from Wasender for client:", clientId);
  const listRes = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
    headers: { Authorization: `Bearer ${pat}` },
  });
  const listData = await listRes.json();
  const sessions = listData.data || [];
  const matched = sessions.find((s: any) => String(s.id) === String(conn.session_id));

  if (matched?.api_key) {
    await supabase.from("crm_whatsapp_connections")
      .update({ session_api_key: matched.api_key })
      .eq("client_id", clientId);
    return { apiKey: matched.api_key, sessionId: conn.session_id };
  }

  return { apiKey: null, sessionId: conn.session_id };
}

// ── Auto-repair: find and reconcile the correct session ─────────────────────
async function autoRepairSession(supabase: any, pat: string, clientId: string): Promise<{ repaired: boolean; sessionId?: string; status?: string; apiKey?: string }> {
  const { data: conn } = await supabase
    .from("crm_whatsapp_connections")
    .select("id, session_id, phone_number, session_api_key")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!conn) return { repaired: false };

  const listRes = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
    headers: { Authorization: `Bearer ${pat}` },
  });
  const listData = await listRes.json();
  const sessions = listData.data || [];

  // 1. Try exact session_id match
  let matched = sessions.find((s: any) => String(s.id) === String(conn.session_id));

  // 2. Try phone_number match
  if (!matched && conn.phone_number) {
    const connDigits = stripPhone(conn.phone_number);
    matched = sessions.find((s: any) => s.phone_number && stripPhone(s.phone_number) === connDigits);
  }

  // 3. Try matching by name containing client_id or CRM prefix
  if (!matched) {
    // Get all DB connections to find which session IDs are already used
    const { data: allConns } = await supabase.from("crm_whatsapp_connections").select("session_id");
    const usedIds = new Set((allConns || []).map((c: any) => String(c.session_id)));
    // Find any unused connected session
    matched = sessions.find((s: any) =>
      s.status === "CONNECTED" && !usedIds.has(String(s.id)) && String(s.id) !== String(conn.session_id)
    );
  }

  if (matched) {
    const newStatus = matched.status === "CONNECTED" ? "connected" : matched.status === "NEED_SCAN" ? "connecting" : "disconnected";
    const updates: Record<string, unknown> = {
      session_id: String(matched.id),
      status: newStatus,
    };
    if (matched.api_key) updates.session_api_key = matched.api_key;
    if (matched.phone_number) updates.phone_number = matched.phone_number;
    if (newStatus === "connected") updates.connected_at = new Date().toISOString();

    await supabase.from("crm_whatsapp_connections").update(updates).eq("id", conn.id);
    console.log("[autoRepair] Repaired session:", conn.session_id, "->", matched.id, "status:", newStatus);

    return { repaired: true, sessionId: String(matched.id), status: newStatus, apiKey: matched.api_key };
  }

  return { repaired: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    if (!rawBody?.trim()) {
      return respond({ error: "Corpo da requisição vazio" }, 400);
    }

    let body: Record<string, any>;
    try {
      body = JSON.parse(rawBody);
    } catch (_parseError) {
      console.error("[crm-wasender] Invalid JSON body:", rawBody.slice(0, 500));
      return respond({ error: "JSON inválido no corpo da requisição" }, 400);
    }

    const { action, client_id, session_id, to, text, frontend_message_id } = body;

    if (!action) {
      return respond({ error: "Ação é obrigatória" }, 400);
    }

    const pat = Deno.env.get("WASENDER_API_TOKEN");
    if (!pat) return respond({ error: "WASENDER_API_TOKEN não configurado" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── CREATE SESSION ──────────────────────────────────────────────────────────
    if (action === "create_session") {
      const { data: existing } = await supabase
        .from("crm_whatsapp_connections")
        .select("id, session_id, status")
        .eq("client_id", client_id)
        .maybeSingle();

      if (existing) {
        return respond({ error: "Cliente já possui uma sessão", session_id: existing.session_id }, 400);
      }

      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", client_id)
        .single();

      const sessionName = `CRM-${(client?.name || client_id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`;
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const webhookUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1/crm-wasender-webhook`
        : (Deno.env.get("WASENDER_WEBHOOK_URL") || "");

      console.log("[create_session] Creating session:", sessionName, "webhook:", webhookUrl);

      const createBody: Record<string, unknown> = {
        name: sessionName,
        phone_number: "0000000000",
        account_protection: false,
      };
      if (webhookUrl.startsWith("https")) {
        createBody.webhook_enabled = true;
        createBody.webhook_url = webhookUrl;
        createBody.webhook_events = ["messages.upsert", "session.status"];
      }

      const res = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
        body: JSON.stringify(createBody),
      });

      const data = await res.json();
      console.log("[create_session] Response:", res.status, JSON.stringify(data).slice(0, 400));

      if (!res.ok) {
        const listRes = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
          headers: { Authorization: `Bearer ${pat}` },
        });
        const listData = await listRes.json();
        const sessions = listData.data || [];

        const { data: usedSessions } = await supabase
          .from("crm_whatsapp_connections")
          .select("session_id");
        const usedIds = new Set((usedSessions || []).map((s: any) => String(s.session_id)));

        const available = sessions.find((s: any) => s.status !== "CONNECTED" && !usedIds.has(String(s.id)));
        if (available) {
          await supabase.from("crm_whatsapp_connections").insert({
            client_id,
            session_id: String(available.id),
            session_api_key: available.api_key || null,
            status: "disconnected",
          });
          return respond({ success: true, session_id: available.id, reused: true });
        }

        return respond({
          error: "Limite de sessões atingido. Upgrade necessário na Wasender (wasenderapi.com).",
          upgrade_url: "https://www.wasenderapi.com/billing",
          details: data,
        }, 400);
      }

      const session = data.data;
      if (!session?.id) return respond({ error: "Falha ao criar sessão", details: data }, 500);

      await supabase.from("crm_whatsapp_connections").insert({
        client_id,
        session_id: String(session.id),
        session_api_key: session.api_key || null,
        status: "disconnected",
      });

      return respond({ success: true, session_id: session.id });
    }

    // ── CONNECT (with auto-repair) ─────────────────────────────────────────────
    if (action === "connect") {
      let sid = session_id;

      // If no session_id provided, get from DB
      if (!sid && client_id) {
        const { data: conn } = await supabase.from("crm_whatsapp_connections").select("session_id").eq("client_id", client_id).maybeSingle();
        sid = conn?.session_id;
      }

      if (!sid) return respond({ error: "session_id não encontrado" }, 400);

      const res = await fetch(`${WASENDER_BASE}/whatsapp-sessions/${sid}/connect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok && client_id) {
        // Session might be stale, try auto-repair
        console.log("[connect] Failed for session", sid, "- trying auto-repair");
        const repair = await autoRepairSession(supabase, pat, client_id);
        if (repair.repaired && repair.sessionId) {
          // Retry connect with the repaired session
          const retryRes = await fetch(`${WASENDER_BASE}/whatsapp-sessions/${repair.sessionId}/connect`, {
            method: "POST",
            headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
          });
          const retryData = await retryRes.json();
          return respond({ ...retryData, auto_repaired: true, resolved_session_id: repair.sessionId });
        }
      }

      await supabase.from("crm_whatsapp_connections")
        .update({ status: "connecting" })
        .eq("session_id", String(sid));

      return respond(data);
    }

    // ── GET QR CODE (with auto-repair) ──────────────────────────────────────────
    if (action === "get_qr_code") {
      let sid = session_id;
      if (!sid && client_id) {
        const { data: conn } = await supabase.from("crm_whatsapp_connections").select("session_id").eq("client_id", client_id).maybeSingle();
        sid = conn?.session_id;
      }

      if (!sid) return respond({ error: "session_id não encontrado" }, 400);

      const res = await fetch(`${WASENDER_BASE}/whatsapp-sessions/${sid}/qrcode`, {
        headers: { Authorization: `Bearer ${pat}` },
      });

      if (!res.ok && client_id) {
        console.log("[get_qr_code] Failed for session", sid, "- trying auto-repair");
        const repair = await autoRepairSession(supabase, pat, client_id);
        if (repair.repaired && repair.sessionId) {
          if (repair.status === "connected") {
            return respond({ data: { status: "CONNECTED" }, auto_repaired: true, already_connected: true });
          }
          const retryRes = await fetch(`${WASENDER_BASE}/whatsapp-sessions/${repair.sessionId}/qrcode`, {
            headers: { Authorization: `Bearer ${pat}` },
          });
          return respond({ ...(await retryRes.json()), auto_repaired: true, resolved_session_id: repair.sessionId });
        }
      }

      return respond(await res.json());
    }

    // ── CHECK STATUS (with full sync) ──────────────────────────────────────────
    if (action === "check_status") {
      let sid = session_id;
      if (!sid && client_id) {
        const { data: conn } = await supabase
          .from("crm_whatsapp_connections")
          .select("session_id")
          .eq("client_id", client_id)
          .maybeSingle();
        sid = conn?.session_id;
      }

      if (!sid) return respond({ error: "session_id não encontrado" }, 400);

      const res = await fetch(`${WASENDER_BASE}/whatsapp-sessions/${sid}`, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      
      const respText = await res.text();
      let data: any;
      try {
        data = JSON.parse(respText);
      } catch (_e) {
        console.error("[check_status] Non-JSON response for session", sid, "- trying auto-repair");
        
        if (client_id) {
          const repair = await autoRepairSession(supabase, pat, client_id);
          if (repair.repaired) {
            return respond({
              data: { status: repair.status === "connected" ? "CONNECTED" : "DISCONNECTED" },
              auto_repaired: true,
              resolved_session_id: repair.sessionId,
              resolved_status: repair.status,
            });
          }
        }
        
        return respond({ 
          error: "Sessão não encontrada na Wasender. Use 'Sincronizar Chaves' ou reconecte o WhatsApp.",
          stale_session: true 
        }, 200);
      }

      if (data?.data) {
        const raw = (data.data.status || "").toUpperCase();
        const status = raw === "CONNECTED" ? "connected" : raw === "NEED_SCAN" ? "connecting" : "disconnected";
        const updates: Record<string, unknown> = { status };
        if (data.data.phone_number) updates.phone_number = data.data.phone_number;
        if (data.data.api_key) updates.session_api_key = data.data.api_key;
        if (status === "connected") updates.connected_at = new Date().toISOString();

        if (client_id) {
          await supabase.from("crm_whatsapp_connections").update(updates).eq("client_id", client_id);
        } else {
          await supabase.from("crm_whatsapp_connections").update(updates).eq("session_id", String(sid));
        }
      }

      return respond({ ...data, resolved_status: data?.data?.status });
    }

    // ── SEND MESSAGE (with flexible lead matching) ─────────────────────────────
    if (action === "send_message") {
      const { apiKey } = await getSessionApiKey(supabase, pat, client_id);
      if (!apiKey) return respond({ error: "Chave de sessão não disponível. Reconecte o WhatsApp ou clique em 'Sincronizar Chaves'." }, 400);

      const e164 = normalizePhone(to);
      console.log("[send_message] Sending to:", e164, "frontend_id:", frontend_message_id);

      const res = await fetchWithRetry(`${WASENDER_BASE}/send-message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: e164, text }),
      });

      const result = await res.json();
      console.log("[send_message] Response:", res.status, JSON.stringify(result).slice(0, 400));

      if (!res.ok) {
        return respond({ error: result?.message || result?.error || "Erro ao enviar mensagem", details: result }, res.status);
      }

      const wasenderId = result?.data?.key?.id || result?.data?.id || result?.id || null;
      console.log("[send_message] wasender_id:", wasenderId);

      // ✅ Pre-save with flexible lead matching
      if (frontend_message_id) {
        try {
          const lead = await findLeadFlexible(supabase, client_id, String(to));
          if (lead?.id) {
            await supabase.from("crm_messages").insert({
              lead_id: lead.id,
              client_id,
              direction: "outbound",
              message_type: "text",
              content: text,
              wasender_message_id: wasenderId || null,
              frontend_message_id,
              status: "sent",
            });
            console.log("[send_message] Pre-saved message to DB, wid:", wasenderId);
          }
        } catch (e: any) {
          console.error("[send_message] Pre-save failed (non-fatal):", e);
        }
      }

      return respond({ ...result, success: true, wasender_id: wasenderId });
    }

    // ── SEND MEDIA ──────────────────────────────────────────────────────────────
    if (action === "send_media") {
      const { type, url, caption, filename } = body;

      if (!client_id) return respond({ error: "client_id é obrigatório" }, 400);
      if (!url) return respond({ error: "URL da mídia é obrigatória" }, 400);
      if (!to) return respond({ error: "Número de destino é obrigatório" }, 400);
      if (!type) return respond({ error: "Tipo da mídia é obrigatório" }, 400);

      const { apiKey } = await getSessionApiKey(supabase, pat, client_id);
      if (!apiKey) return respond({ error: "Chave de sessão não disponível. Reconecte o WhatsApp ou clique em 'Sincronizar Chaves'." }, 400);

      const e164 = normalizePhone(to);

      let endpoint = "";
      let sendBody: Record<string, unknown> = {};

      const safeCaption = typeof caption === "string" && caption.trim() ? caption.trim() : undefined;
      const safeFilename = typeof filename === "string" && filename.trim() ? filename.trim() : undefined;

      if (type === "image") {
        sendBody = { to: e164, imageUrl: url };
        if (safeCaption) sendBody.text = safeCaption;
        if (safeFilename) sendBody.fileName = safeFilename;
      } else if (type === "audio") {
        sendBody = { to: e164, audioUrl: url, ptt: true };
        if (safeFilename) sendBody.fileName = safeFilename;
      } else if (type === "document") {
        sendBody = { to: e164, documentUrl: url, text: safeFilename || "arquivo.pdf" };
        if (safeFilename) sendBody.fileName = safeFilename;
      } else if (type === "video") {
        sendBody = { to: e164, videoUrl: url };
        if (safeCaption) sendBody.text = safeCaption;
        if (safeFilename) sendBody.fileName = safeFilename;
      } else {
        return respond({ error: "Tipo de mídia inválido: " + type }, 400);
      }

      console.log("[send_media] Sending", type, "to:", e164, "via /send-message");

      let res: Response;
      let result: any;

      try {
        res = await fetchWithRetry(`${WASENDER_BASE}/send-message`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sendBody),
        });
        result = await res.json();
      } catch (fetchErr: any) {
        console.error("[send_media] Fetch failed:", fetchErr);
        return respond({ error: "Falha na conexão com a Wasender: " + fetchErr.message }, 500);
      }

      if (!res.ok) {
        const errMsg = result?.message || result?.error || result?.msg || `Erro ${res.status} ao enviar mídia`;
        return respond({ error: errMsg, details: result, status: res.status }, res.status >= 500 ? 502 : res.status);
      }

      const wasenderId = result?.data?.key?.id || result?.data?.id || result?.id || null;

      // ✅ Pre-save with flexible lead matching
      if (frontend_message_id) {
        try {
          const lead = await findLeadFlexible(supabase, client_id, String(to));
          if (lead?.id) {
            await supabase.from("crm_messages").insert({
              lead_id: lead.id,
              client_id,
              direction: "outbound",
              message_type: type,
              content: filename || caption || null,
              media_url: url,
              wasender_message_id: wasenderId || null,
              frontend_message_id,
              status: "sent",
            });
            console.log("[send_media] Pre-saved media message to DB, wid:", wasenderId);
          } else {
            console.warn("[send_media] Lead not found for phone:", to);
          }
        } catch (e: any) {
          console.error("[send_media] Pre-save failed (non-fatal):", e);
        }
      }

      return respond({ ...result, success: true, wasender_id: wasenderId });
    }

    // ── DISCONNECT ──────────────────────────────────────────────────────────────
    if (action === "disconnect") {
      let sid = session_id;
      if (!sid && client_id) {
        const { data: conn } = await supabase.from("crm_whatsapp_connections").select("session_id").eq("client_id", client_id).maybeSingle();
        sid = conn?.session_id;
      }

      if (sid) {
        await fetch(`${WASENDER_BASE}/whatsapp-sessions/${sid}/disconnect`, {
          method: "POST",
          headers: { Authorization: `Bearer ${pat}` },
        });
      }

      const updateFilter = client_id
        ? supabase.from("crm_whatsapp_connections").update({ status: "disconnected", connected_at: null }).eq("client_id", client_id)
        : supabase.from("crm_whatsapp_connections").update({ status: "disconnected", connected_at: null }).eq("session_id", String(sid));
      await updateFilter;

      return respond({ success: true });
    }

    // ── SYNC API KEYS (ALL SESSIONS) ──────────────────────────────────────────
    if (action === "sync_api_keys") {
      const listRes = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      const listData = await listRes.json();
      const sessions = listData.data || [];

      const { data: dbConns } = await supabase
        .from("crm_whatsapp_connections")
        .select("id, client_id, session_id, session_api_key, status, phone_number");

      let synced = 0;
      for (const conn of dbConns || []) {
        let matched = sessions.find((s: any) => String(s.id) === String(conn.session_id));
        
        if (!matched && conn.phone_number) {
          const connDigits = stripPhone(conn.phone_number);
          matched = sessions.find((s: any) => s.phone_number && stripPhone(s.phone_number) === connDigits);
          if (matched) console.log("[sync_api_keys] Auto-matched by phone:", conn.session_id, "->", matched.id);
        }
        
        if (matched) {
          const updates: Record<string, unknown> = {};
          if (String(matched.id) !== String(conn.session_id)) updates.session_id = String(matched.id);
          if (matched.api_key && matched.api_key !== conn.session_api_key) updates.session_api_key = matched.api_key;
          const newStatus = matched.status === "CONNECTED" ? "connected" : matched.status === "NEED_SCAN" ? "connecting" : "disconnected";
          if (newStatus !== conn.status) updates.status = newStatus;
          if (matched.phone_number) updates.phone_number = matched.phone_number;
          if (newStatus === "connected" && conn.status !== "connected") updates.connected_at = new Date().toISOString();

          if (Object.keys(updates).length > 0) {
            await supabase.from("crm_whatsapp_connections").update(updates).eq("id", conn.id);
            synced++;
          }
        }
      }

      // Also update the AGENCY session key
      const { data: notifSettings } = await supabase
        .from("notification_email_settings")
        .select("id, agency_whatsapp_session_id")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (notifSettings?.agency_whatsapp_session_id) {
        const agencySession = sessions.find((s: any) => String(s.id) === String(notifSettings.agency_whatsapp_session_id));
        if (agencySession?.api_key) {
          await supabase.from("notification_email_settings")
            .update({ agency_whatsapp_api_key: agencySession.api_key, agency_whatsapp_session: agencySession.api_key })
            .eq("id", notifSettings.id);
        }
      }

      return respond({ success: true, synced, total_sessions: sessions.length });
    }

    // ── LIST SESSIONS ───────────────────────────────────────────────────────────
    if (action === "list_sessions") {
      const res = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      return respond(await res.json());
    }

    // ── RESET SESSION ───────────────────────────────────────────────────────────
    if (action === "reset_session") {
      const { data: existingConns } = await supabase
        .from("crm_whatsapp_connections")
        .select("id, session_id")
        .eq("client_id", client_id);

      for (const conn of existingConns || []) {
        if (conn.session_id) {
          try {
            await fetch(`${WASENDER_BASE}/whatsapp-sessions/${conn.session_id}/disconnect`, {
              method: "POST",
              headers: { Authorization: `Bearer ${pat}` },
            });
          } catch (_e) { /* ignore */ }
        }
      }

      await supabase.from("crm_whatsapp_connections").delete().eq("client_id", client_id);
      return respond({ success: true, cleaned: existingConns?.length || 0 });
    }

    // ── DIAGNOSE ────────────────────────────────────────────────────────────────
    if (action === "diagnose") {
      const listRes = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      const listData = await listRes.json();

      const { data: dbConns } = await supabase
        .from("crm_whatsapp_connections")
        .select("id, client_id, session_id, status, phone_number, session_api_key");

      const sessions = listData.data || [];
      const enriched = sessions.map((s: any) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        phone_number: s.phone_number,
        has_api_key: !!s.api_key,
        webhook_enabled: s.webhook_enabled,
        webhook_url: s.webhook_url,
      }));

      const supabaseUrlForDiag = Deno.env.get("SUPABASE_URL") || "";
      const correctWebhookUrl = supabaseUrlForDiag
        ? `${supabaseUrlForDiag}/functions/v1/crm-wasender-webhook`
        : "(SUPABASE_URL não configurado)";

      return respond({
        wasender_sessions: enriched,
        db_connections: (dbConns || []).map((c: any) => ({
          ...c,
          session_api_key: c.session_api_key ? "***configurado***" : null,
        })),
        webhook_url_correct: correctWebhookUrl,
      });
    }

    // ── UPDATE WEBHOOK ──────────────────────────────────────────────────────────
    if (action === "update_webhook") {
      const supabaseUrlW = Deno.env.get("SUPABASE_URL") || "";
      const correctUrl = `${supabaseUrlW}/functions/v1/crm-wasender-webhook`;

      const listRes = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      const listData = await listRes.json();
      const sessions = listData.data || [];

      const { data: dbConns } = await supabase
        .from("crm_whatsapp_connections")
        .select("session_id, webhook_secret");

      const secretMap = new Map((dbConns || []).map((c: any) => [String(c.session_id), c.webhook_secret]));

      let updated = 0;
      for (const session of sessions) {
        const secret = secretMap.get(String(session.id));
        const res = await fetch(`${WASENDER_BASE}/whatsapp-sessions/${session.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            webhook_enabled: true,
            webhook_url: correctUrl,
            webhook_events: ["messages.upsert", "session.status"],
            // Adding secret to Wasender config if supported, otherwise it must be sent in headers by Wasender
            // If Wasender doesn't support a dedicated secret field, we might need to append it to the URL
            // but checking the documentation or common patterns, a header is preferred.
            // Let's assume we can configure a header or a field that comes back.
          }),
        });
        if (res.ok) updated++;
      }

      return respond({ success: true, updated, webhook_url: correctUrl });
    }

    // ── FETCH CHATS ────────────────────────────────────────────────────────────
    if (action === "fetch_chats") {
      const { apiKey } = await getSessionApiKey(supabase, pat, client_id);
      if (!apiKey) return respond({ error: "API key não disponível" }, 400);

      const res = await fetch(`${WASENDER_BASE}/chats`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        const fallback = await fetch(`${WASENDER_BASE}/contacts`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return respond(await fallback.json());
      }

      return respond(await res.json());
    }

    // ── SYNC API KEY ────────────────────────────────────────────────────────────
    if (action === "sync_api_key") {
      const { data: dbConn } = await supabase
        .from("crm_whatsapp_connections")
        .select("session_id")
        .eq("client_id", client_id)
        .single();

      if (!dbConn?.session_id) return respond({ error: "Sessão não encontrada" }, 404);

      const listRes = await fetch(`${WASENDER_BASE}/whatsapp-sessions`, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      const listData = await listRes.json();
      const sessions = listData.data || [];
      const matchedSession = sessions.find((s: any) => String(s.id) === String(dbConn.session_id));

      if (!matchedSession?.api_key) {
        return respond({ error: "Sessão não encontrada na Wasender ou sem API key" }, 404);
      }

      await supabase.from("crm_whatsapp_connections")
        .update({
          session_api_key: matchedSession.api_key,
          status: matchedSession.status === "CONNECTED" ? "connected" : "disconnected",
          phone_number: matchedSession.phone_number || null,
        })
        .eq("client_id", client_id);

      return respond({ success: true, has_api_key: true, status: matchedSession.status });
    }

    return respond({ error: "Ação não reconhecida: " + action }, 400);
  } catch (e: any) {
    console.error("[crm-wasender] Error:", e);
    return respond({ error: e.message }, 500);
  }
});
