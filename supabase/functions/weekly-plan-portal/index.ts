import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceKey);

// Sign urls in image_urls / image_url
async function signAll(items: any[], field = 'image_urls'): Promise<any[]> {
  return await Promise.all(
    items.map(async (it) => {
      const urls: string[] = it[field] || [];
      const signed: string[] = [];
      for (const u of urls) {
        if (!u) continue;
        if (u.startsWith('http')) { signed.push(u); continue; }
        const { data } = await admin.storage.from('weekly-plan-media').createSignedUrl(u, 60 * 60 * 24);
        if (data?.signedUrl) signed.push(data.signedUrl);
      }
      return { ...it, [field]: signed };
    })
  );
}

async function signOne(item: any, field = 'image_url'): Promise<any> {
  const u = item[field];
  if (!u) return item;
  if (u.startsWith('http')) return item;
  const { data } = await admin.storage.from('weekly-plan-media').createSignedUrl(u, 60 * 60 * 24);
  return { ...item, [field]: data?.signedUrl || null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, token } = body;
    if (!token) throw new Error('Token obrigatório');

    // Validate token → client
    const { data: client, error: cErr } = await admin
      .from('clients')
      .select('id, name')
      .eq('portal_token', token)
      .maybeSingle();
    if (cErr || !client) throw new Error('Cliente não encontrado');

    if (action === 'list_plans') {
      const { data: plans } = await admin
        .from('weekly_plans')
        .select('*')
        .eq('client_id', client.id)
        .in('status', ['pending_approval', 'approved', 'changes_requested'])
        .order('week_start_date', { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ plans: plans || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_plan') {
      const { plan_id } = body;
      const { data: plan } = await admin
        .from('weekly_plans')
        .select('*')
        .eq('id', plan_id)
        .eq('client_id', client.id)
        .maybeSingle();
      if (!plan) throw new Error('Plano não encontrado');

      const { data: postsRaw } = await admin
        .from('weekly_plan_posts')
        .select('*')
        .eq('plan_id', plan_id)
        .order('position');
      const { data: storiesRaw } = await admin
        .from('weekly_plan_stories')
        .select('*')
        .eq('plan_id', plan_id)
        .order('day_of_week')
        .order('position');

      const posts = await signAll(postsRaw || [], 'image_urls');
      const stories = await Promise.all((storiesRaw || []).map((s) => signOne(s, 'image_url')));

      return new Response(JSON.stringify({ plan, posts, stories }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'approve_item' || action === 'request_changes_item') {
      const { item_type, item_id, comment } = body;
      const table = item_type === 'post' ? 'weekly_plan_posts' : 'weekly_plan_stories';
      const newStatus = action === 'approve_item' ? 'approved' : 'changes_requested';

      // Ensure item belongs to this client
      const { data: item } = await admin
        .from(table)
        .select('id, plan_id, weekly_plans!inner(client_id)')
        .eq('id', item_id)
        .maybeSingle();
      if (!item || (item as any).weekly_plans.client_id !== client.id)
        throw new Error('Item inválido');

      await admin
        .from(table)
        .update({
          status: newStatus,
          client_comment: comment || null,
          approved_at: newStatus === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', item_id);

      await admin.from('weekly_plan_comments').insert({
        plan_id: (item as any).plan_id,
        [item_type === 'post' ? 'post_id' : 'story_id']: item_id,
        author_type: 'client',
        author_name: client.name,
        action: newStatus === 'approved' ? 'approve' : 'request_changes',
        message: comment || null,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'approve_all') {
      const { plan_id } = body;
      const { data: plan } = await admin
        .from('weekly_plans')
        .select('id')
        .eq('id', plan_id)
        .eq('client_id', client.id)
        .maybeSingle();
      if (!plan) throw new Error('Plano inválido');

      await admin
        .from('weekly_plan_posts')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('plan_id', plan_id)
        .neq('status', 'approved');
      await admin
        .from('weekly_plan_stories')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('plan_id', plan_id)
        .neq('status', 'approved');
      await admin
        .from('weekly_plans')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', plan_id);

      await admin.from('weekly_plan_comments').insert({
        plan_id,
        author_type: 'client',
        author_name: client.name,
        action: 'approve_all',
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Ação desconhecida');
  } catch (e: any) {
    console.error('weekly-plan-portal error', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
