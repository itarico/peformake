import { createClient } from "npm:@supabase/supabase-js@2";

const WASENDER_BASE = "https://www.wasenderapi.com/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Phone normalization helpers ─────────────────────────────────────────────
function stripPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Generate phone variations for flexible matching */
function phoneVariations(phone: string): string[] {
  const digits = stripPhone(phone);
  if (!digits) return [];
  const variants = new Set<string>();
  variants.add(digits);
  // With 55 prefix
  if (!digits.startsWith("55")) variants.add("55" + digits);
  // Without 55 prefix
  if (digits.startsWith("55") && digits.length > 4) variants.add(digits.slice(2));
  return Array.from(variants);
}

/** Find a lead by trying multiple phone variations, then by whatsapp_lid */
async function findLeadByPhone(supabase: any, clientId: string, phone: string): Promise<any> {
  const variants = phoneVariations(phone);
  for (const v of variants) {
    const { data } = await supabase
      .from("crm_leads")
      .select("id, name, status, phone, whatsapp_lid")
      .eq("client_id", clientId)
      .eq("phone", v)
      .order("created_at", { ascending: true })
      .limit(1);
    if (data && data.length > 0) return data[0];
  }
  return null;
}

/** Find a lead by whatsapp_lid */
async function findLeadByLid(supabase: any, clientId: string, lid: string): Promise<any> {
  const { data } = await supabase
    .from("crm_leads")
    .select("id, name, status, phone, whatsapp_lid")
    .eq("client_id", clientId)
    .eq("whatsapp_lid", lid)
    .limit(1);
  if (data && data.length > 0) return data[0];
  return null;
}

/** Check if a string looks like a real phone (not a LID) */
function isRealPhone(phone: string): boolean {
  const digits = stripPhone(phone);
  // Brazilian phones: 10-13 digits (with or without country code 55)
  // LIDs are typically 15+ digits
  return digits.length >= 8 && digits.length <= 13;
}

function inferExtension(messageType: string, fileName: string | null, contentType: string, rawUrl: string | null): string {
  const byType: Record<string, string> = {
    image: "jpg",
    audio: "ogg",
    video: "mp4",
    document: "pdf",
  };

  // Try from file name first
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5 && fromName !== "enc") return fromName;

  // Try from content type (skip octet-stream)
  if (contentType && contentType !== "application/octet-stream") {
    const fromContentType = contentType.split("/")[1]?.split(";")[0]?.toLowerCase();
    if (fromContentType && fromContentType !== "octet-stream") return fromContentType;
  }

  // Try from URL (skip .enc files)
  const fromUrl = rawUrl?.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (fromUrl && fromUrl.length <= 5 && fromUrl !== "enc") return fromUrl;

  return byType[messageType] || "bin";
}

async function downloadAndRehostMedia(supabase: any, conn: any, msgData: any, rawMediaUrl: string | null, messageType: string, fileName: string | null, contentTypeHint: string | null) {
  const candidates = new Set<string>();

  // Try decrypt-media first (gets decrypted direct URL)
  if (conn?.session_api_key) {
    try {
      const decryptRes = await fetch(`${WASENDER_BASE}/decrypt-media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.session_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: msgData }),
        signal: AbortSignal.timeout(30000),
      });

      if (decryptRes.ok) {
        const decryptData = await decryptRes.json();
        const decryptedUrl = decryptData?.data?.url || decryptData?.url;
        if (decryptedUrl) candidates.add(decryptedUrl);
      } else {
        console.warn("[webhook] decrypt-media failed:", decryptRes.status);
      }
    } catch (error: any) {
      console.warn("[webhook] decrypt-media error:", error?.message);
    }
  }

  if (rawMediaUrl) candidates.add(rawMediaUrl);

  // Try directPath fallback if available
  const directPath = msgData.message?.imageMessage?.directPath ||
    msgData.message?.videoMessage?.directPath ||
    msgData.message?.audioMessage?.directPath ||
    msgData.message?.pttMessage?.directPath ||
    msgData.message?.documentMessage?.directPath ||
    msgData.message?.documentWithCaptionMessage?.message?.documentMessage?.directPath;
  if (directPath && candidates.size === 0) {
    const directUrl = `https://mmg.whatsapp.net${directPath}`;
    candidates.add(directUrl);
    console.log("[webhook] Using directPath fallback:", directUrl.slice(0, 80));
  }

  if (candidates.size === 0) {
    console.warn("[webhook] No media candidates available for", messageType);
    return null;
  }

  // Fallback mime types when server returns application/octet-stream
  const fallbackMimes: Record<string, string> = {
    image: "image/jpeg",
    audio: "audio/ogg",
    video: "video/mp4",
    document: "application/pdf",
  };

  for (const candidate of candidates) {
    try {
      const mediaRes = await fetch(candidate, {
        headers: conn?.session_api_key ? { Authorization: `Bearer ${conn.session_api_key}` } : undefined,
        signal: AbortSignal.timeout(20000),
      });

      if (!mediaRes.ok) {
        console.warn("[webhook] media download failed:", mediaRes.status, candidate.slice(0, 80));
        continue;
      }

      let contentType = mediaRes.headers.get("content-type") || contentTypeHint || "application/octet-stream";
      
      // Fix: If content type is generic octet-stream, use the hint or fallback based on message type
      if (contentType === "application/octet-stream" || contentType.startsWith("application/octet-stream")) {
        if (contentTypeHint && contentTypeHint !== "application/octet-stream") {
          contentType = contentTypeHint;
        } else {
          contentType = fallbackMimes[messageType] || "application/octet-stream";
        }
        console.log("[webhook] Overrode content-type to:", contentType, "for", messageType);
      }

      const buffer = await mediaRes.arrayBuffer();
      
      // Skip if buffer is too small (likely an error page, not actual media)
      if (buffer.byteLength < 100) {
        console.warn("[webhook] media too small:", buffer.byteLength, "bytes, skipping");
        continue;
      }

      const ext = inferExtension(messageType, fileName, contentType, candidate);
      const storagePath = `whatsapp/${messageType}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from("crm-media")
        .upload(storagePath, buffer, { contentType, upsert: false });

      if (uploadErr || !uploaded) {
        console.warn("[webhook] media upload failed:", uploadErr?.message);
        continue;
      }

      const { data: publicData } = supabase.storage.from("crm-media").getPublicUrl(storagePath);
      console.log("[webhook] Media re-hosted successfully:", messageType, storagePath);
      return publicData.publicUrl;
    } catch (error: any) {
      console.warn("[webhook] media rehost candidate failed:", error?.message);
    }
  }

  // Don't return encrypted WhatsApp URLs as fallback - they won't work in browser
  if (rawMediaUrl && (rawMediaUrl.includes("mmg.whatsapp.net") || rawMediaUrl.includes(".enc"))) {
    console.warn("[webhook] Skipping encrypted WhatsApp URL as fallback");
    return null;
  }

  return rawMediaUrl;
}

/** Extract the real contact phone from a webhook message payload.
 *  Priority:
 *  1. senderPn / cleanedSenderPn (for inbound @lid)
 *  2. remoteJid if @s.whatsapp.net
 *  3. For outbound @lid: look at senderPn of the OTHER participant
 */
function extractContactPhone(msgData: any, fromMe: boolean): string {
  const remoteJid: string = msgData.key?.remoteJid || "";
  const isLid = remoteJid.endsWith("@lid");

  if (!fromMe) {
    // INBOUND: the sender IS the contact
    const cleanedSender = msgData.key?.cleanedSenderPn || "";
    if (cleanedSender) return stripPhone(cleanedSender);
    const senderPn = (msgData.key?.senderPn || "").replace("@s.whatsapp.net", "");
    if (senderPn) return stripPhone(senderPn);
  } else {
    // OUTBOUND (fromMe): the contact is the REMOTE party
    if (isLid) {
      // For @lid, the cleanedSenderPn is actually OUR number, not the contact's.
      // We need to look at the participant or other fields.
      // In Wasender, for outbound @lid, the remote participant info is often absent.
      // Best strategy: DON'T create a new lead from outbound @lid — find existing lead instead.
      // Return empty to signal "use existing lead lookup"
      return "";
    }
  }

  // Fallback: extract from remoteJid if @s.whatsapp.net
  if (remoteJid.endsWith("@s.whatsapp.net")) {
    return stripPhone(remoteJid.replace("@s.whatsapp.net", ""));
  }

  // Last resort for @lid: extract digits (not reliable for phone matching)
  if (isLid) return "";

  return stripPhone(remoteJid);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const payload = await req.json();
    const event = payload.event || payload.type;

    console.log("[webhook] Event:", event, JSON.stringify(payload).slice(0, 800));

    // ── SESSION STATUS ──────────────────────────────────────────────────────────
    if (event === "session.status" || event === "status") {
      const sessionId = String(payload.session_id || payload.sessionId || "");
      const rawStatus = payload.data?.status || payload.status || "";
      const status =
        rawStatus.toUpperCase() === "CONNECTED" ? "connected" :
        rawStatus.toUpperCase() === "NEED_SCAN" ? "connecting" : "disconnected";

      const updates: Record<string, unknown> = { status };
      if (status === "connected") updates.connected_at = new Date().toISOString();

      const { data: updated } = await supabase
        .from("crm_whatsapp_connections")
        .update(updates)
        .eq("session_api_key", sessionId)
        .select("id");

      if (!updated?.length) {
        await supabase
          .from("crm_whatsapp_connections")
          .update(updates)
          .eq("session_id", sessionId);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "qrcode.updated") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INCOMING/OUTGOING MESSAGE ────────────────────────────────────────────────
    if (event === "messages.upsert" || event === "message") {
      const msgData = payload.data?.messages || payload.data || payload;
      const sessionId = String(payload.session_id || payload.sessionId || "");

      const remoteJid: string = msgData.key?.remoteJid || "";
      const fromMe: boolean = msgData.key?.fromMe === true;

      // Skip group messages, status broadcasts, and newsletters
      if (
        remoteJid.endsWith("@g.us") ||
        remoteJid === "status@broadcast" ||
        remoteJid.endsWith("@newsletter") ||
        remoteJid.endsWith("@broadcast") ||
        !remoteJid
      ) {
        console.log("[webhook] Skipping:", remoteJid || "no JID");
        return new Response(JSON.stringify({ ok: true, skip: "group/status/newsletter" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Extract contact phone using improved logic ───────────────────────────
      const rawPhone = extractContactPhone(msgData, fromMe);

      // Find connection by session_api_key (primary) or session_id (fallback)
      let conn: any = null;
      const { data: connByApiKey } = await supabase
        .from("crm_whatsapp_connections")
        .select("client_id, session_api_key, webhook_secret")
        .eq("session_api_key", sessionId)
        .maybeSingle();

      if (connByApiKey) {
        conn = connByApiKey;
      } else {
        const { data: connBySid } = await supabase
          .from("crm_whatsapp_connections")
          .select("client_id, session_api_key, webhook_secret")
          .eq("session_id", sessionId)
          .maybeSingle();
        conn = connBySid;
      }

      if (!conn) {
        console.log("[webhook] No connection found for sessionId:", sessionId);
        return new Response(JSON.stringify({ ok: true, skip: "no connection" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Verify Webhook Secret ──────────────────────────────────────────────
      // Wasender sends the secret in the body or header depending on config
      // Our update_webhook logic (in crm-wasender) will set it as a query param or header if possible.
      // Usually, it's better to check for X-Wasender-Secret header or a field in the body.
      const incomingSecret = req.headers.get("X-Wasender-Secret") || payload.webhook_secret || payload.secret;
      
      if (conn.webhook_secret && incomingSecret !== conn.webhook_secret) {
        console.error("[webhook] Secret mismatch for session:", sessionId);
        return new Response(JSON.stringify({ error: "Unauthorized: Secret mismatch" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const clientId = conn.client_id;

      // ── Find lead (LID-first deduplication) ────────────────────────────────────
      let lead: any = null;
      const isLidJid = remoteJid.endsWith("@lid");
      const lidDigits = isLidJid ? stripPhone(remoteJid.replace("@lid", "")) : "";

      // Step 1: Try LID-based lookup first (prevents duplicates)
      if (lidDigits) {
        lead = await findLeadByLid(supabase, clientId, lidDigits);
        if (lead) {
          console.log("[webhook] Found lead by LID:", lidDigits, "→", lead.id);
          // If we now have a real phone and the lead doesn't, update it
          if (rawPhone && isRealPhone(rawPhone) && (!lead.phone || !isRealPhone(lead.phone))) {
            await supabase.from("crm_leads").update({ phone: rawPhone }).eq("id", lead.id);
            console.log("[webhook] Updated lead phone from LID to real:", rawPhone);
          }
          // Update name if missing
          if (!lead.name && msgData.pushName) {
            await supabase.from("crm_leads").update({ name: msgData.pushName }).eq("id", lead.id);
          }
        }
      }

      // Step 2: Try phone-based lookup
      if (!lead && rawPhone) {
        lead = await findLeadByPhone(supabase, clientId, rawPhone);
        // If found by phone but has no LID, set the LID for future dedup
        if (lead && lidDigits && !lead.whatsapp_lid) {
          await supabase.from("crm_leads").update({ whatsapp_lid: lidDigits }).eq("id", lead.id);
          console.log("[webhook] Set LID on existing lead:", lead.id, "→", lidDigits);
        }
      }

      // Step 3: For @lid without phone, also try the LID digits as phone (legacy data)
      if (!lead && lidDigits) {
        lead = await findLeadByPhone(supabase, clientId, lidDigits);
        if (lead) {
          // Migrate: set whatsapp_lid and fix phone if we have a real one
          const updates: Record<string, unknown> = { whatsapp_lid: lidDigits };
          if (rawPhone && isRealPhone(rawPhone)) updates.phone = rawPhone;
          await supabase.from("crm_leads").update(updates).eq("id", lead.id);
          console.log("[webhook] Migrated LID-as-phone lead:", lead.id);
        }
      }

      // Step 4: For outbound @lid where we still have no lead
      if (!lead && fromMe && isLidJid) {
        const cleanedSender = msgData.key?.cleanedSenderPn || "";
        if (cleanedSender) {
          lead = await findLeadByPhone(supabase, clientId, cleanedSender);
        }
        if (!lead) {
          const { data: recentMsg } = await supabase
            .from("crm_messages")
            .select("lead_id")
            .eq("client_id", clientId)
            .eq("direction", "outbound")
            .gte("created_at", new Date(Date.now() - 120000).toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (recentMsg?.lead_id) {
            const { data: foundLead } = await supabase
              .from("crm_leads")
              .select("id, name, status, phone, whatsapp_lid")
              .eq("id", recentMsg.lead_id)
              .single();
            if (foundLead) lead = foundLead;
          }
        }
        if (!lead) {
          console.log("[webhook] Outbound @lid: no lead found, skipping");
          return new Response(JSON.stringify({ ok: true, skip: "outbound_lid_no_lead" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // For inbound messages: create lead if not found
      if (!lead && !fromMe && rawPhone) {
        lead = await findLeadByPhone(supabase, clientId, rawPhone);
      }
      if (!lead && !fromMe) {
        const pushName = msgData.pushName || msgData.verifiedBizName || null;
        const phoneToSave = rawPhone && isRealPhone(rawPhone) ? rawPhone : (lidDigits || rawPhone || "unknown");
        const insertData: Record<string, unknown> = {
          client_id: clientId,
          phone: phoneToSave,
          name: pushName,
          status: "new",
        };
        // Store LID for future dedup
        if (lidDigits) insertData.whatsapp_lid = lidDigits;

        const { data: newLead, error: insertErr } = await supabase
          .from("crm_leads")
          .insert(insertData)
          .select("id, name, status, phone, whatsapp_lid")
          .single();
        if (insertErr) {
          // Race condition or unique constraint — find existing
          lead = lidDigits ? await findLeadByLid(supabase, clientId, lidDigits) : await findLeadByPhone(supabase, clientId, rawPhone);
          console.log("[webhook] Insert failed, found existing lead:", lead?.id, insertErr.message);
        } else {
          lead = newLead;
          console.log("[webhook] New lead created:", phoneToSave, lidDigits ? `(LID:${lidDigits})` : "", "for client:", clientId);
        }

        // Fire Meta CAPI "Lead" event for new inbound leads
        if (newLead) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-meta-conversion-events`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ lead_id: newLead.id, client_id: clientId, status: "new" }),
            });
          } catch (e) { console.error("[webhook] Meta CAPI new lead failed:", e); }
        }
      } else if (!fromMe && rawPhone && msgData.pushName && lead && !lead.name) {
        await supabase.from("crm_leads").update({ name: msgData.pushName }).eq("id", lead.id);
      }

      // If we still don't have a lead, skip
      if (!lead) {
        if (!rawPhone) {
          console.log("[webhook] No phone extracted, skipping");
          return new Response(JSON.stringify({ ok: true, skip: "no_phone" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, skip: "lead creation failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract message text from various Wasender message formats
      const content =
        msgData.body ||
        msgData.text ||
        msgData.message?.conversation ||
        msgData.message?.extendedTextMessage?.text ||
        msgData.message?.imageMessage?.caption ||
        msgData.message?.videoMessage?.caption ||
        msgData.message?.documentMessage?.caption ||
        msgData.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
        msgData.message?.documentWithCaptionMessage?.message?.documentMessage?.fileName ||
        msgData.message?.documentMessage?.fileName ||
        "";

      // Detect message type
      const rawType = msgData.type || msgData.messageType ||
        (msgData.message?.imageMessage ? "image" :
         msgData.message?.videoMessage ? "video" :
         msgData.message?.audioMessage ? "audio" :
         msgData.message?.pttMessage ? "audio" :
         msgData.message?.documentMessage ? "document" :
         msgData.message?.documentWithCaptionMessage?.message?.documentMessage ? "document" :
         msgData.message?.conversation || msgData.message?.extendedTextMessage ? "text" : "text");

      const messageType =
        rawType === "chat" || rawType === "text" || rawType === "conversation" ? "text" :
        rawType === "image" || rawType === "IMAGE" ? "image" :
        rawType === "video" || rawType === "VIDEO" ? "video" :
        rawType === "audio" || rawType === "ptt" || rawType === "AUDIO" || rawType === "PTT" ? "audio" :
        rawType === "document" || rawType === "DOCUMENT" ? "document" : "text";

      // Extract media URL
      let rawMediaUrl: string | null =
        msgData.mediaUrl ||
        msgData.media_url ||
        msgData.url ||
        msgData.message?.imageMessage?.url ||
        msgData.message?.videoMessage?.url ||
        msgData.message?.audioMessage?.url ||
        msgData.message?.pttMessage?.url ||
        msgData.message?.documentMessage?.url ||
        msgData.message?.documentWithCaptionMessage?.message?.documentMessage?.url ||
        msgData.message?.stickerMessage?.url ||
        null;

      const fileName =
        msgData.message?.documentMessage?.fileName ||
        msgData.message?.documentWithCaptionMessage?.message?.documentMessage?.fileName ||
        msgData.message?.documentMessage?.title ||
        null;

      const contentTypeHint =
        msgData.mimetype ||
        msgData.mimeType ||
        msgData.message?.imageMessage?.mimetype ||
        msgData.message?.videoMessage?.mimetype ||
        msgData.message?.audioMessage?.mimetype ||
        msgData.message?.pttMessage?.mimetype ||
        msgData.message?.documentMessage?.mimetype ||
        msgData.message?.documentWithCaptionMessage?.message?.documentMessage?.mimetype ||
        null;

      // Wasender message ID — used for deduplication
      const wasenderMessageId = msgData.key?.id || msgData.id || null;

      // ✅ DEDUPLICATION: Check by wasender_message_id first
      if (wasenderMessageId) {
        const { data: existing } = await supabase
          .from("crm_messages")
          .select("id")
          .eq("wasender_message_id", wasenderMessageId)
          .maybeSingle();
        if (existing) {
          console.log("[webhook] Duplicate message skipped by wasender_id:", wasenderMessageId);
          return new Response(JSON.stringify({ ok: true, skip: "duplicate_wid" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // ✅ For fromMe messages, check if edge function pre-saved it by frontend_message_id or wasender_message_id.
      if (fromMe && lead?.id) {
        const recentWindow = new Date(Date.now() - 30000).toISOString();
        
        // Only match if wasender_message_id is null (pre-saved but not yet linked)
        // AND content matches to avoid matching different messages of the same type
        const { data: recentOutbound } = await supabase
          .from("crm_messages")
          .select("id, content, media_url")
          .eq("lead_id", lead.id)
          .eq("direction", "outbound")
          .eq("message_type", messageType)
          .is("wasender_message_id", null)
          .gte("created_at", recentWindow)
          .limit(1)
          .maybeSingle();

        if (recentOutbound) {
          // Extra check: content or media_url should match to avoid linking wrong messages
          const contentMatch = messageType === "text" 
            ? (recentOutbound.content === content)
            : (recentOutbound.media_url != null);

          if (contentMatch) {
            console.log("[webhook] fromMe message already saved by edge function, updating wasender_id");
            if (wasenderMessageId) {
              await supabase.from("crm_messages")
                .update({ wasender_message_id: wasenderMessageId, status: "delivered" })
                .eq("id", recentOutbound.id);
            }
            return new Response(JSON.stringify({ ok: true, skip: "outbound_pre_saved" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Skip if no content and no media
      if (!content && !rawMediaUrl && messageType === "text") {
        return new Response(JSON.stringify({ ok: true, skip: "no content" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Re-host received media to our own storage ────────────────────────────
      let finalMediaUrl = rawMediaUrl;

      if (rawMediaUrl && (messageType === "image" || messageType === "audio" || messageType === "video" || messageType === "document")) {
        try {
          finalMediaUrl = await downloadAndRehostMedia(supabase, conn, msgData, rawMediaUrl, messageType, fileName, contentTypeHint);
        } catch (mediaErr: any) {
          console.warn("[webhook] Media re-host error (non-fatal):", mediaErr?.message);
          finalMediaUrl = rawMediaUrl;
        }
      } else if (!rawMediaUrl && (messageType === "image" || messageType === "audio" || messageType === "video" || messageType === "document")) {
        try {
          finalMediaUrl = await downloadAndRehostMedia(supabase, conn, msgData, null, messageType, fileName, contentTypeHint);
        } catch (mediaErr: any) {
          console.warn("[webhook] Media decrypt-only re-host error (non-fatal):", mediaErr?.message);
          finalMediaUrl = null;
        }
      }

      const direction = fromMe ? "outbound" : "inbound";

      await supabase.from("crm_messages").insert({
        lead_id: lead.id,
        client_id: clientId,
        direction,
        message_type: messageType,
        content: content || fileName || (messageType === "audio" ? "🎤 Áudio" : messageType === "image" ? "📷 Imagem" : messageType === "video" ? "🎬 Vídeo" : messageType === "document" ? "📄 Documento" : "(mídia)"),
        media_url: finalMediaUrl,
        wasender_message_id: wasenderMessageId,
        status: "delivered",
      });

      // Update lead last_message_at
      await supabase
        .from("crm_leads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", lead.id);

      console.log("[webhook] Message saved:", direction, messageType, "lead:", lead.id, "wid:", wasenderMessageId, "media:", finalMediaUrl ? "yes" : "no");

      // ── If outbound from human (not bot-pre-saved), mark human active ───────
      // IMPORTANT: Only set human_active_until for REAL human messages, not bot-sent ones.
      // Check if this outbound was pre-saved by the agent-dispatcher (bot).
      // Bot messages are saved with status='sent' and have no frontend_message_id.
      // We use a wider window (60s) and also check intelligence_events for recent agent activity.
      if (fromMe) {
        let isBotMessage = false;

        // Strategy 1: Check if we just matched and updated a pre-saved bot message (status was 'sent')
        // The dedup above already processed this - check if wasender_message_id was just linked
        if (wasenderMessageId) {
          const { data: justLinked } = await supabase
            .from("crm_messages")
            .select("id")
            .eq("wasender_message_id", wasenderMessageId)
            .eq("lead_id", lead.id)
            .eq("direction", "outbound")
            .maybeSingle();
          // If the message existed before this webhook call, it was pre-saved by the bot
          if (justLinked) isBotMessage = true;
        }

        // Strategy 2: Check for recent agent activity (bot responded in last 60s)
        if (!isBotMessage) {
          const agentWindow = new Date(Date.now() - 60000).toISOString();
          const { data: recentAgent } = await supabase
            .from("crm_intelligence_events")
            .select("id")
            .eq("lead_id", lead.id)
            .eq("event_type", "agent_responded")
            .gte("created_at", agentWindow)
            .limit(1)
            .maybeSingle();
          if (recentAgent) isBotMessage = true;
        }

        // Only mark human active if this is genuinely from a human
        if (!isBotMessage) {
          const humanActiveUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          await supabase.from("crm_leads")
            .update({ human_active_until: humanActiveUntil })
            .eq("id", lead.id);
        } else {
          console.log("[webhook] Bot message detected, NOT setting human_active_until");
        }
      }

      // ── Trigger Intelligence Engine for ALL messages (inbound + outbound) ────
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-intelligence-engine`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: lead.id,
          client_id: clientId,
          direction,
          content: content || null,
          message_type: messageType,
          media_url: finalMediaUrl || null,
        }),
      }).then(r => r.json()).then(d => {
        if (d.moved) console.log("[webhook] Intelligence: stage moved to", d.stage);
        if (d.sale_detected) console.log("[webhook] Intelligence: sale detected!");
      }).catch(e => console.error("[webhook] Intelligence Engine trigger failed:", e));

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, event: "unhandled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[webhook] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
