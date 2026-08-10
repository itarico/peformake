import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-staff-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const allowedUpdateKeys = new Set([
  'art_type',
  'title',
  'description',
  'headline',
  'subtitle',
  'cta',
  'caption',
  'observations',
  'audio_observation_url',
  'asset_urls',
  'reference_image_url',
  'reference_image_urls',
  'reference_link',
  'carousel_slides',
  'final_art_url',
  'final_art_urls',
  'status',
  'revision_comment',
  'briefing_completed_at',
  'deadline_date',
  'designer_id',
  'work_month_id',
  'art_number',
  'is_extra',
  'deleted_at',
]);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSafeUpdates(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => allowedUpdateKeys.has(key))
  );
}

async function authenticateRequest(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (token === SUPABASE_ANON_KEY) {
    const staffId = req.headers.get('x-staff-id');
    if (!staffId) {
      return { authenticated: false, error: 'Sessão da equipe não encontrada.' };
    }

    const { data, error } = await supabase.rpc('verify_staff_session', { p_staff_id: staffId });
    if (error || !data || !(data as any).valid) {
      return { authenticated: false, error: 'Sessão da equipe inválida.' };
    }

    const staffRole = (data as any).staff?.role;
    if (!['admin', 'social_media', 'designer'].includes(staffRole)) {
      return { authenticated: false, error: 'Acesso permitido apenas para Designer, Social Media e Admin.' };
    }

    return { authenticated: true };
  }

  if (!token) {
    return { authenticated: false, error: 'Token de autenticação ausente.' };
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return { authenticated: false, error: 'Token de autenticação inválido.' };
  }

  const { data: hasRole, error: roleError } = await supabase.rpc('is_staff', {
    _user_id: claimsData.claims.sub,
  });

  if (roleError || !hasRole) {
    return { authenticated: false, error: 'Acesso de equipe necessário.' };
  }

  return { authenticated: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const auth = await authenticateRequest(req, supabase);
    if (!auth.authenticated) {
      return jsonResponse({ error: auth.error || 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const { action, artId, updates, art } = body ?? {};

    if (action === 'create_art') {
      if (!art || typeof art !== 'object') {
        return jsonResponse({ error: 'Dados da arte (art) são obrigatórios.' }, 400);
      }
      
      const safeArt = getSafeUpdates(art as Record<string, unknown>);
      const { data, error } = await supabase
        .from('arts')
        .insert(safeArt)
        .select()
        .single();

      if (error) {
        console.error('[staff-art-manager] create_art error:', error);
        return jsonResponse({ error: error.message }, 400);
      }
      return jsonResponse({ success: true, data });
    }

    if (action === 'update_art') {
      if (!artId || typeof artId !== 'string') {
        return jsonResponse({ error: 'artId é obrigatório.' }, 400);
      }

      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return jsonResponse({ error: 'updates deve ser um objeto válido.' }, 400);
      }

      const safeUpdates = getSafeUpdates(updates as Record<string, unknown>);
      if (Object.keys(safeUpdates).length === 0) {
        return jsonResponse({ error: 'Nenhum campo permitido foi enviado para atualização.' }, 400);
      }

      const { error } = await supabase
        .from('arts')
        .update(safeUpdates)
        .eq('id', artId);

      if (error) {
        console.error('[staff-art-manager] update_art error:', error);
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400);
  } catch (error) {
    console.error('[staff-art-manager] unexpected error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Erro interno ao salvar a arte.',
    }, 500);
  }
});