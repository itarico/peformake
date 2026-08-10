import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-staff-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type StaffRole = 'admin' | 'social_media' | 'designer';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const staffId = req.headers.get('x-staff-id');

  if (staffId) {
    const { data, error } = await supabase.rpc('verify_staff_session', { p_staff_id: staffId });
    if (!error && data && (data as any).valid) {
      return {
        type: 'staff' as const,
        staff: (data as any).staff as { id: string; role: StaffRole },
      };
    }
  }

  if (!token) {
    return null;
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) {
    return null;
  }

  return { type: 'user' as const, userId: data.user.id };
}

async function getAccessibleClientIds(staffId: string, role: StaffRole): Promise<string[] | null> {
  if (role === 'admin') {
    return null;
  }

  if (role === 'social_media') {
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('social_media_staff_id', staffId)
      .eq('is_active', true);

    return (data || []).map((client: any) => client.id);
  }

  const { data: designers } = await supabase
    .from('designers')
    .select('id')
    .eq('staff_member_id', staffId);

  const designerIds = (designers || []).map((designer: any) => designer.id);
  if (designerIds.length === 0) {
    return [];
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .in('designer_id', designerIds)
    .eq('is_active', true);

  return (clients || []).map((client: any) => client.id);
}

async function listNotificationsForStaff(staffId: string, role: StaffRole) {
  if (role === 'admin') {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  const clientIds = await getAccessibleClientIds(staffId, role);
  if (!clientIds || clientIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

async function canAccessNotification(notificationId: string, staffId: string, role: StaffRole) {
  if (role === 'admin') {
    return true;
  }

  const clientIds = await getAccessibleClientIds(staffId, role);
  if (!clientIds || clientIds.length === 0) {
    return false;
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, client_id')
    .eq('id', notificationId)
    .single();

  if (error || !data) {
    return false;
  }

  return !!data.client_id && clientIds.includes(data.client_id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'list';

    if (auth.type === 'user') {
      if (action === 'count') {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.userId)
          .eq('is_read', false);

        if (error) throw error;
        return jsonResponse({ count: count || 0 });
      }

      if (action === 'list') {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', auth.userId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        return jsonResponse({ notifications: data || [] });
      }
    }

    if (auth.type === 'staff') {
      if (action === 'list') {
        const notifications = await listNotificationsForStaff(auth.staff.id, auth.staff.role);
        return jsonResponse({ notifications });
      }

      if (action === 'count') {
        const notifications = await listNotificationsForStaff(auth.staff.id, auth.staff.role);
        return jsonResponse({ count: notifications.filter((notification: any) => !notification.is_read).length });
      }

      if (action === 'mark-read') {
        const notificationId = body?.notificationId;
        if (!notificationId || typeof notificationId !== 'string') {
          return jsonResponse({ error: 'notificationId é obrigatório.' }, 400);
        }

        const allowed = await canAccessNotification(notificationId, auth.staff.id, auth.staff.role);
        if (!allowed) {
          return jsonResponse({ error: 'Acesso negado.' }, 403);
        }

        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      if (action === 'mark-all-read') {
        const notifications = await listNotificationsForStaff(auth.staff.id, auth.staff.role);
        const unreadIds = notifications.filter((notification: any) => !notification.is_read).map((notification: any) => notification.id);

        if (unreadIds.length === 0) {
          return jsonResponse({ success: true, updated: 0 });
        }

        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds);

        if (error) throw error;
        return jsonResponse({ success: true, updated: unreadIds.length });
      }
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400);
  } catch (error) {
    console.error('[staff-notifications] unexpected error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Erro interno ao processar notificações.',
    }, 500);
  }
});