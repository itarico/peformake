import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(str: string): Promise<string> {
  if (!str) return "";
  const data = new TextEncoder().encode(str.toLowerCase().trim());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("55")) digits = "55" + digits;
  return digits;
}

// Map CRM status to Meta standard event names + custom data
function getEventConfig(status: string, saleValue?: number) {
  switch (status) {
    case "new":
      return { event_name: "Lead", custom_event: "NewLead", value: 0 };
    case "negotiating":
      return { event_name: "Lead", custom_event: "NegotiatingLead", value: 0 };
    case "qualified":
      return { event_name: "Lead", custom_event: "QualifiedLead", value: 0 };
    case "unqualified":
      return { event_name: "Lead", custom_event: "UnqualifiedLead", value: 0 };
    case "sale_completed":
      return { event_name: "Purchase", custom_event: "SaleCompleted", value: saleValue || 0 };
    case "sale_lost":
      return { event_name: "Lead", custom_event: "SaleLost", value: 0 };
    default:
      return { event_name: "Lead", custom_event: status, value: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { lead_id, client_id, status, sale_value } = body;

    if (!lead_id || !client_id || !status) {
      return new Response(JSON.stringify({ error: "Missing lead_id, client_id or status" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get client's Meta pixel/dataset ID
    const { data: client } = await supabase
      .from("clients")
      .select("meta_pixel_id, meta_ad_account_id, name")
      .eq("id", client_id)
      .single();

    if (!client?.meta_pixel_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "No meta_pixel_id configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Meta access token from traffic_meta_connections
    const { data: metaConn } = await supabase
      .from("traffic_meta_connections")
      .select("access_token")
      .eq("client_id", client_id)
      .eq("status", "active")
      .maybeSingle();

    if (!metaConn?.access_token) {
      return new Response(JSON.stringify({ skipped: true, reason: "No active Meta connection" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get lead data for user_data hashing
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("phone, name, sale_value")
      .eq("id", lead_id)
      .single();

    const phone = normalizePhone(lead?.phone || "");
    const effectiveSaleValue = sale_value || lead?.sale_value || 0;

    // Hash PII for Meta privacy compliance — ONLY valid Meta fields
    const hashedPhone = phone ? await sha256(phone) : "";

    const { event_name, custom_event, value } = getEventConfig(status, effectiveSaleValue);

    const eventTime = Math.floor(Date.now() / 1000);

    const eventPayload = {
      data: [
        {
          event_name,
          event_time: eventTime,
          action_source: "system_generated",
          event_id: `${lead_id}_${status}_${eventTime}`,
          // LGPD/Brazil data processing compliance
          data_processing_options: ["LDU"],
          data_processing_options_country: 0,
          data_processing_options_state: 0,
          user_data: {
            // Only valid Meta user_data fields with proper SHA-256 hashing
            ...(hashedPhone ? { ph: [hashedPhone] } : {}),
            // DO NOT include lead_id, name, or any non-standard fields here
          },
          custom_data: {
            currency: "BRL",
            value: value,
            content_category: custom_event,
            // For Purchase events, include revenue
            ...(status === "sale_completed" && effectiveSaleValue > 0 ? {
              content_name: "CRM Sale",
            } : {}),
          },
        },
      ],
    };

    console.log(`[meta-capi] Sending ${event_name} (${custom_event}) for pixel:${client.meta_pixel_id} lead:${lead_id} value:${value}`);

    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${client.meta_pixel_id}/events?access_token=${metaConn.access_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      }
    );

    const metaData = await metaRes.json();
    console.log(`[meta-capi] Response:`, JSON.stringify(metaData));

    if (!metaRes.ok) {
      console.error(`[meta-capi] Error from Meta:`, JSON.stringify(metaData));
    }

    // Log the conversion event in our DB for audit
    try {
      await supabase.from("crm_conversion_events").insert({
        lead_id,
        client_id,
        status,
        event_name,
        custom_event,
        sale_value: effectiveSaleValue || null,
        meta_response: metaData,
        success: metaRes.ok,
      });
    } catch {
      // Table may not exist yet, non-blocking
    }

    return new Response(JSON.stringify({ success: metaRes.ok, meta_response: metaData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[crm-meta-conversion-events] Error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
