import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-staff-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function authenticateStaff(req: Request) {
  const staffId = req.headers.get('x-staff-id');

  if (!staffId) {
    return null;
  }

  const { data, error } = await supabase.rpc('verify_staff_session', { p_staff_id: staffId });

  if (error || !data || !(data as any).valid) {
    return null;
  }

  return (data as any).staff as { id: string; role: 'admin' | 'social_media' | 'designer' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const staff = await authenticateStaff(req);

    if (!staff) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'get';

    if (action === 'get') {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, full_name, email, phone, avatar_url, pix_key')
        .eq('id', staff.id)
        .single();

      if (error) throw error;

      return jsonResponse({ profile: data });
    }

    if (action === 'update') {
      const profile = body?.profile || {};
      const updates: Record<string, string | null> = {};

      if ('full_name' in profile) {
        updates.full_name = typeof profile.full_name === 'string' ? profile.full_name.trim() || null : null;
      }

      if ('email' in profile) {
        updates.email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() || null : null;
      }

      if ('phone' in profile) {
        updates.phone = typeof profile.phone === 'string' ? profile.phone.trim() || null : null;
      }

      if ('avatar_url' in profile) {
        updates.avatar_url = typeof profile.avatar_url === 'string' ? profile.avatar_url.trim() || null : null;
      }

      if ('pix_key' in profile) {
        updates.pix_key = typeof profile.pix_key === 'string' ? profile.pix_key.trim() || null : null;
      }

      if (typeof profile.password === 'string' && profile.password.trim()) {
        updates.login_password = profile.password.trim();
      }

      if (Object.keys(updates).length === 0) {
        const { data, error } = await supabase
          .from('staff_members')
          .select('id, full_name, email, phone, avatar_url, pix_key')
          .eq('id', staff.id)
          .single();

        if (error) throw error;

        return jsonResponse({ success: true, profile: data });
      }

      const { data, error } = await supabase
        .from('staff_members')
        .update(updates)
        .eq('id', staff.id)
        .select('id, full_name, email, phone, avatar_url, pix_key')
        .single();

      if (error) throw error;

      return jsonResponse({ success: true, profile: data });
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400);
  } catch (error) {
    console.error('[staff-profile] unexpected error:', error);

    return jsonResponse({
      error: error instanceof Error ? error.message : 'Erro interno ao carregar o perfil.',
    }, 500);
  }
});