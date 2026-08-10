import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { token, url, type } = body; // token is webhook_token, url is the new asset link, type is 'video' or 'photos'

    if (!token || !url) {
      return new Response(JSON.stringify({ error: 'Missing token or url' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Find the project
    const { data: project, error: fetchError } = await supabase
      .from('audiovisual_projects')
      .select('id, version')
      .eq('webhook_token', token)
      .single();

    if (fetchError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Prepare updates
    const updates: any = {
      last_assets_update: new Date().toISOString(),
      version: (project.version || 1) + 1
    };

    let notificationEvent = '';
    if (type === 'photos') {
      updates.photos_url = url;
      notificationEvent = 'av_photos_ready_sm';
    } else {
      updates.finished_assets_url = url;
      notificationEvent = 'av_edition_ready_staff';
    }

    // 3. Update project
    const { error: updateError } = await supabase
      .from('audiovisual_projects')
      .update(updates)
      .eq('id', project.id);

    if (updateError) throw updateError;

    // 4. Trigger notification
    await fetch(`${SUPABASE_URL}/functions/v1/av-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        projectId: project.id,
        eventType: notificationEvent
      })
    });

    return new Response(JSON.stringify({ success: true, message: 'Project updated and notified' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[av-webhook] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
