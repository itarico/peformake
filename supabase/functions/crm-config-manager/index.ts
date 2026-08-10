import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-staff-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const BOT_CONFIG_KEYS = new Set([
  'is_enabled',
  'auto_respond_on_new',
  'business_hours_only',
  'business_hours_start',
  'business_hours_end',
  'persona',
  'instructions',
]);

const AGENT_CONFIG_KEYS = new Set([
  'agent_name',
  'allow_ai_identification',
  'allow_discount',
  'allow_links',
  'allow_media',
  'authority_level',
  'crisis_keywords',
  'curiosity_level',
  'custom_instructions',
  'escalate_on_crisis',
  'focus_products',
  'formality_level',
  'ideal_client_profile',
  'ideal_company_type',
  'insistence_level',
  'is_enabled',
  'max_attempts',
  'max_chars',
  'max_discount_percent',
  'max_score_unqualified',
  'min_budget',
  'min_confidence_sale',
  'min_score_qualified',
  'min_ticket',
  'pressure_level',
  'reactivation_days',
  'reactivation_minutes',
  'reactivation_strategy',
  'required_problem',
  'response_structure',
  'sales_intensity',
  'sales_model',
  'target_region',
  'tone',
  'use_anchoring',
  'use_emojis',
  'use_urgency',
]);

const QUESTION_KEYS = new Set([
  'question_text',
  'question_order',
  'is_required',
  'score_weight',
  'condition_field',
  'condition_value',
  'is_conditional',
]);

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
]);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function pickAllowed(input: Record<string, unknown>, allowedKeys: Set<string>) {
  return Object.fromEntries(Object.entries(input).filter(([key]) => allowedKeys.has(key)));
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function decodeBase64(base64Data: string) {
  const normalized = base64Data.replace(/\s/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function extractStoragePath(fileUrl: string) {
  const marker = '/storage/v1/object/public/crm-media/';
  const startIndex = fileUrl.indexOf(marker);

  if (startIndex === -1) {
    return null;
  }

  return decodeURIComponent(fileUrl.slice(startIndex + marker.length));
}

async function authenticateRequest(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return { authenticated: false, error: 'Token não fornecido.' };
  }

  // First try staff session via x-staff-id header
  const staffId = req.headers.get('x-staff-id');
  if (staffId) {
    const { data, error } = await supabase.rpc('verify_staff_session', { p_staff_id: staffId });
    if (!error && data && (data as any).valid) {
      const staff = (data as any).staff;
      const roles = Array.isArray(staff?.roles) && staff.roles.length > 0 ? staff.roles : [staff?.role];
      const canManageCrm = roles.some((role: string) => ['admin', 'social_media'].includes(role));
      if (canManageCrm) {
        return { authenticated: true, staff };
      }
      return { authenticated: false, error: 'Acesso permitido apenas para Admin ou Social Media.' };
    }
  }

  // Fallback: try Supabase Auth JWT (for admin users logged in via Auth)
  if (token !== SUPABASE_ANON_KEY) {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser();
    if (!claimsError && claimsData?.user) {
      // Authenticated admin user - allow access
      return { authenticated: true, staff: { id: claimsData.user.id, role: 'admin' } };
    }
  }

  if (!staffId) {
    return { authenticated: false, error: 'Sessão da equipe não encontrada.' };
  }

  return { authenticated: false, error: 'Sessão inválida.' };
}

async function saveBotConfig(supabase: ReturnType<typeof createClient>, clientId: string, config: Record<string, unknown>) {
  const safeConfig = pickAllowed(config, BOT_CONFIG_KEYS);
  const payload = {
    client_id: clientId,
    ...safeConfig,
    business_hours_start: safeConfig.business_hours_only ? safeConfig.business_hours_start ?? null : null,
    business_hours_end: safeConfig.business_hours_only ? safeConfig.business_hours_end ?? null : null,
  };

  const { data, error } = await supabase
    .from('crm_bot_configs')
    .upsert(payload, { onConflict: 'client_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function saveAgentConfig(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  agentType: string,
  config: Record<string, unknown>,
) {
  const safeConfig = pickAllowed(config, AGENT_CONFIG_KEYS);
  const payload = {
    client_id: clientId,
    agent_type: agentType,
    ...safeConfig,
  };

  const { data: existing, error: findError } = await supabase
    .from('crm_agent_configs')
    .select('id')
    .eq('client_id', clientId)
    .eq('agent_type', agentType)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  const query = existing?.id
    ? supabase.from('crm_agent_configs').update(payload).eq('id', existing.id)
    : supabase.from('crm_agent_configs').insert(payload);

  const { data, error } = await query.select('*').single();

  if (error) {
    throw error;
  }

  return data;
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

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'save_bot_config') {
      const clientId = String(body?.clientId || '');
      if (!clientId) return jsonResponse({ error: 'clientId é obrigatório.' }, 400);

      const config = typeof body?.config === 'object' && body.config ? body.config : {};
      const savedConfig = await saveBotConfig(supabase, clientId, config as Record<string, unknown>);
      return jsonResponse({ success: true, config: savedConfig });
    }

    if (action === 'save_agent_config') {
      const clientId = String(body?.clientId || '');
      const agentType = String(body?.agentType || '');
      if (!clientId || !agentType) return jsonResponse({ error: 'clientId e agentType são obrigatórios.' }, 400);

      const config = typeof body?.config === 'object' && body.config ? body.config : {};
      const savedConfig = await saveAgentConfig(supabase, clientId, agentType, config as Record<string, unknown>);
      return jsonResponse({ success: true, config: savedConfig });
    }

    if (action === 'add_agent_knowledge') {
      const clientId = String(body?.clientId || '');
      const agentType = String(body?.agentType || '');
      const item = typeof body?.item === 'object' && body.item ? body.item : {};

      const { data, error } = await supabase
        .from('crm_agent_knowledge')
        .insert({
          client_id: clientId,
          agent_type: agentType,
          question: String(item.question || '').trim(),
          answer: String(item.answer || '').trim(),
          category: String(item.category || 'geral').trim(),
          is_active: Boolean(item.is_active ?? true),
        })
        .select('*')
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, item: data });
    }

    if (action === 'delete_agent_knowledge') {
      const knowledgeId = String(body?.knowledgeId || '');
      if (!knowledgeId) return jsonResponse({ error: 'knowledgeId é obrigatório.' }, 400);

      const { error } = await supabase.from('crm_agent_knowledge').delete().eq('id', knowledgeId);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    if (action === 'add_agent_question') {
      const clientId = String(body?.clientId || '');
      const agentType = String(body?.agentType || '');
      const question = typeof body?.question === 'object' && body.question ? body.question : {};

      const payload = pickAllowed(question as Record<string, unknown>, QUESTION_KEYS);
      const { data, error } = await supabase
        .from('crm_agent_questions')
        .insert({
          client_id: clientId,
          agent_type: agentType,
          question_text: String(payload.question_text || '').trim(),
          question_order: Number(payload.question_order ?? 1),
          is_required: Boolean(payload.is_required ?? true),
          score_weight: Number(payload.score_weight ?? 10),
          condition_field: payload.condition_field ?? null,
          condition_value: payload.condition_value ?? null,
          is_conditional: Boolean(payload.is_conditional ?? false),
        })
        .select('*')
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, question: data });
    }

    if (action === 'update_agent_question') {
      const questionId = String(body?.questionId || '');
      if (!questionId) return jsonResponse({ error: 'questionId é obrigatório.' }, 400);

      const changes = typeof body?.changes === 'object' && body.changes ? body.changes : {};
      const payload = pickAllowed(changes as Record<string, unknown>, QUESTION_KEYS);
      const { data, error } = await supabase
        .from('crm_agent_questions')
        .update(payload)
        .eq('id', questionId)
        .select('*')
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, question: data });
    }

    if (action === 'delete_agent_question') {
      const questionId = String(body?.questionId || '');
      if (!questionId) return jsonResponse({ error: 'questionId é obrigatório.' }, 400);

      const { error } = await supabase.from('crm_agent_questions').delete().eq('id', questionId);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    if (action === 'upload_agent_file') {
      const clientId = String(body?.clientId || '');
      const agentType = String(body?.agentType || '');
      const fileName = String(body?.fileName || '').trim();
      const mimeType = String(body?.mimeType || '').trim();
      const base64Data = String(body?.base64Data || '');

      if (!clientId || !agentType || !fileName || !mimeType || !base64Data) {
        return jsonResponse({ error: 'Dados do arquivo incompletos.' }, 400);
      }

      if (!ALLOWED_FILE_TYPES.has(mimeType)) {
        return jsonResponse({ error: 'Formato não suportado.' }, 400);
      }

      const bytes = decodeBase64(base64Data);
      if (bytes.byteLength > 10 * 1024 * 1024) {
        return jsonResponse({ error: 'Arquivo muito grande. Máximo 10MB.' }, 400);
      }

      const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
      const storagePath = `${clientId}/${agentType}/${Date.now()}-${sanitizeFileName(fileName)}`;
      const { error: storageError } = await supabase.storage
        .from('crm-media')
        .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage.from('crm-media').getPublicUrl(storagePath);

      const { data, error } = await supabase
        .from('crm_agent_files')
        .insert({
          client_id: clientId,
          agent_type: agentType,
          file_name: fileName,
          file_type: ext,
          file_url: publicUrlData.publicUrl,
        })
        .select('*')
        .single();

      if (error) throw error;
      return jsonResponse({ success: true, file: data });
    }

    if (action === 'delete_agent_file') {
      const fileId = String(body?.fileId || '');
      if (!fileId) return jsonResponse({ error: 'fileId é obrigatório.' }, 400);

      const { data: existingFile, error: findError } = await supabase
        .from('crm_agent_files')
        .select('file_url')
        .eq('id', fileId)
        .single();

      if (findError) throw findError;

      const storagePath = extractStoragePath(existingFile.file_url);
      if (storagePath) {
        const { error: removeStorageError } = await supabase.storage.from('crm-media').remove([storagePath]);
        if (removeStorageError) {
          console.warn('[crm-config-manager] storage remove warning:', removeStorageError.message);
        }
      }

      const { error } = await supabase.from('crm_agent_files').delete().eq('id', fileId);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400);
  } catch (error) {
    console.error('[crm-config-manager] unexpected error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Erro interno ao salvar configuração do CRM.',
    }, 500);
  }
});