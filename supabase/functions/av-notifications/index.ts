import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { event_type, project_id, data: extraData = {} } = await req.json();

    if (!event_type || !project_id) {
      return new Response(JSON.stringify({ error: 'Missing event_type or project_id' }), { 
        status: 400, headers: corsHeaders 
      });
    }

    // 1. Fetch project and related data
    const { data: project, error: pError } = await supabase
      .from('audiovisual_projects')
      .select('*, client:clients(id, name, phone), editor:staff_members!editor_id(id, full_name, phone), videographer:staff_members!videographer_id(id, full_name, phone)')
      .eq('id', project_id)
      .single();

    if (pError || !project) throw new Error('Project not found');

    // 2. Fetch template
    const { data: template, error: tError } = await supabase
      .from('whatsapp_message_templates')
      .select('*')
      .eq('event_type', event_type)
      .eq('is_active', true)
      .single();

    if (tError || !template) {
      console.log(`[av-notifications] No active template for ${event_type}, skipping.`);
      return new Response(JSON.stringify({ skipped: true }), { headers: corsHeaders });
    }

    // 3. Build variables
    const lastUpdate = project.last_assets_update ? new Date(project.last_assets_update) : new Date();
    const formattedDate = lastUpdate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const variables: Record<string, string> = {
      '{client_name}': project.client?.name || 'Cliente',
      '{portal_link}': 'https://peformake.com.br/portal', 
      '{video_link}': project.raw_video_url || extraData.video_link || '',
      '{video_link_final}': project.finished_assets_url || extraData.video_link_final || '',
      '{photos_link}': project.photos_url || extraData.photos_link || '',
      '{editor_name}': project.editor?.full_name || 'Editor',
      '{videomaker_name}': project.videographer?.full_name || 'Videomaker',
      '{deadline}': extraData.deadline || 'A definir',
      '{version}': String(project.version || 1),
      '{update_date}': formattedDate,
      ...extraData
    };

    let message = template.message_template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replaceAll(key, value || '');
    }

    // 4. Determine recipients based on event_type
    const recipients: { phone: string; type: string }[] = [];

    if (event_type === 'av_raw_added_editor' && project.editor?.phone) {
      recipients.push({ phone: project.editor.phone, type: 'editor' });
    } else if (event_type === 'av_raw_added_leader') {
      // Get admins or leaders
      const { data: admins } = await supabase.from('staff_members').select('phone').in('role', ['admin', 'leader']).eq('is_active', true);
      admins?.forEach(a => { if (a.phone) recipients.push({ phone: a.phone, type: 'leader' }); });
    } else if (event_type === 'av_edition_started_client' && project.client?.phone) {
      recipients.push({ phone: project.client.phone, type: 'client' });
    } else if (event_type === 'av_edition_ready_client' && project.client?.phone) {
      recipients.push({ phone: project.client.phone, type: 'client' });
    } else if (event_type === 'av_edition_ready_staff') {
      // Editor, Leader, Social Media
      if (project.editor?.phone) recipients.push({ phone: project.editor.phone, type: 'editor' });
      if (project.videographer?.phone) recipients.push({ phone: project.videographer.phone, type: 'videomaker' });
      
      const { data: sm } = await supabase.from('staff_members').select('phone').eq('id', project.client?.social_media_staff_id).single();
      if (sm?.phone) recipients.push({ phone: sm.phone, type: 'social_media' });
      
      const { data: admins } = await supabase.from('staff_members').select('phone').in('role', ['admin', 'leader']).eq('is_active', true);
      admins?.forEach(a => { if (a.phone) recipients.push({ phone: a.phone, type: 'leader' }); });
    } else if (event_type === 'av_photos_ready_sm') {
      const { data: sm } = await supabase.from('staff_members').select('phone').eq('id', project.client?.social_media_staff_id).single();
      if (sm?.phone) recipients.push({ phone: sm.phone, type: 'social_media' });
    }

    // 5. Send notifications and log pendencies
    const sentResults = [];
    for (const recipient of recipients) {
      try {
        const response = await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            type: event_type,
            title: template.title,
            message: message,
            client_id: project.client_id,
            target: recipient.type === 'client' ? 'client' : 'staff',
            [recipient.type === 'client' ? 'client_phone' : 'staff_phones']: [recipient.phone]
          }
        });

        // Log pendency status
        await supabase.from('notification_pendencies').insert({
          client_id: project.client_id,
          project_id: project_id,
          event_type: event_type,
          status: response.error ? 'failed' : 'resolved',
          metadata: { recipient_phone: recipient.phone, recipient_type: recipient.type },
          resolved_at: response.error ? null : new Date().toISOString()
        });

        sentResults.push({ recipient: recipient.phone, success: !response.error });
      } catch (err) {
        console.error(`Error sending to ${recipient.phone}:`, err);
        
        // Log as failed pendency
        await supabase.from('notification_pendencies').insert({
          client_id: project.client_id,
          project_id: project_id,
          event_type: event_type,
          status: 'failed',
          metadata: { recipient_phone: recipient.phone, recipient_type: recipient.type, error: err.message }
        });

        sentResults.push({ recipient: recipient.phone, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results: sentResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
