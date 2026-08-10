import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Running CRM automation check...');

    // 1. Get stages for Follow Up and Aquecimento
    const { data: stages } = await supabaseClient
      .from('sdr_pipeline_stages')
      .select('id, name');
    
    const followUpStage = stages?.find(s => s.name === 'Follow Up');
    const aquecimentoStage = stages?.find(s => s.name === 'Aquecimento');

    if (!followUpStage || !aquecimentoStage) {
      throw new Error('Stages for Follow Up or Aquecimento not found');
    }

    // 2. Identify leads to move to Follow Up (Lost for > 7 days)
    const { data: lostLeads } = await supabaseClient
      .from('sdr_leads')
      .select('id, contact_name')
      .eq('status', 'lost')
      .lt('lost_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .not('stage_id', 'eq', followUpStage.id);

    console.log(`Found ${lostLeads?.length || 0} lost leads to move to Follow Up`);

    for (const lead of (lostLeads || [])) {
      await supabaseClient
        .from('sdr_leads')
        .update({ 
          stage_id: followUpStage.id, 
          status: 'open',
          updated_at: new Date().toISOString() 
        })
        .eq('id', lead.id);
      console.log(`Moved lead ${lead.contact_name} to Follow Up`);
    }

    // 3. Identify leads to move to Aquecimento (Desqualificado for > 7 days)
    const { data: disqualifiedLeads } = await supabaseClient
      .from('sdr_leads')
      .select('id, contact_name')
      .eq('lead_tier', 'Desqualificado')
      .lt('disqualified_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .not('stage_id', 'eq', aquecimentoStage.id);

    console.log(`Found ${disqualifiedLeads?.length || 0} disqualified leads to move to Aquecimento`);

    for (const lead of (disqualifiedLeads || [])) {
      await supabaseClient
        .from('sdr_leads')
        .update({ 
          stage_id: aquecimentoStage.id, 
          status: 'open',
          updated_at: new Date().toISOString() 
        })
        .eq('id', lead.id);
      console.log(`Moved lead ${lead.contact_name} to Aquecimento`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in CRM automation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
