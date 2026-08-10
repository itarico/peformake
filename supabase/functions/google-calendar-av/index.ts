import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-staff-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const GOOGLE_CALENDAR_API_KEY = Deno.env.get('GOOGLE_CALENDAR_API_KEY')!;

const GATEWAY = 'https://connector-gateway.lovable.dev/google_calendar/calendar/v3';
const TIMEZONE = 'America/Sao_Paulo';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function authenticate(req: Request, supabase: any) {
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  if (token && token !== SUPABASE_ANON_KEY) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) return { ok: true };
  }
  const staffId = req.headers.get('x-staff-id');
  if (!staffId) return { ok: false, error: 'Sessão não encontrada.' };
  const { data, error } = await supabase.rpc('verify_staff_session', { p_staff_id: staffId });
  if (error || !data || !(data as any).valid) return { ok: false, error: 'Sessão inválida.' };
  return { ok: true };
}

async function gateway(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_CALENDAR_API_KEY,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[google-calendar-av] gateway ${res.status}: ${text}`);
    throw new Error(`[${res.status}] ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function buildEvent(p: any) {
  const date = String(p.shoot_date).slice(0, 10);
  const start = p.shoot_time || '09:00';
  const end = p.shoot_end_time || `${String(Number(start.slice(0, 2)) + 2).padStart(2, '0')}${start.slice(2, 5)}`;
  return {
    summary: p.summary || 'Captação',
    description: p.description || '',
    location: p.location || '',
    start: { dateTime: `${date}T${start}:00`, timeZone: TIMEZONE },
    end: { dateTime: `${date}T${end}:00`, timeZone: TIMEZONE },
    reminders: { useDefault: true },
    ...(p.attendees?.length ? { attendees: p.attendees.map((email: string) => ({ email })) } : {}),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const auth = await authenticate(req, supabase);
    if (!auth.ok) return json({ error: auth.error }, 401);

    if (!LOVABLE_API_KEY || !GOOGLE_CALENDAR_API_KEY) {
      return json({ error: 'Conexão com o Google Agenda não configurada.' }, 500);
    }

    const body = await req.json();
    const action = body.action as string;
    const calendarId = body.calendarId || 'primary';

    if (action === 'list_calendars') {
      const data = await gateway('/users/me/calendarList');
      return json({ calendars: data.items || [] });
    }

    if (action === 'list_events') {
      const params = new URLSearchParams({
        timeMin: body.timeMin,
        timeMax: body.timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });
      const data = await gateway(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
      return json({ events: data.items || [] });
    }

    if (action === 'upsert_event') {
      const projectId = body.projectId as string;
      if (!projectId || !body.shoot_date) return json({ error: 'Dados incompletos.' }, 400);

      const { data: project } = await supabase
        .from('audiovisual_projects')
        .select('id, google_event_id')
        .eq('id', projectId)
        .maybeSingle();

      const event = buildEvent(body);
      let saved: any;
      if (project?.google_event_id) {
        try {
          saved = await gateway(
            `/calendars/${encodeURIComponent(calendarId)}/events/${project.google_event_id}`,
            { method: 'PATCH', body: JSON.stringify(event) },
          );
        } catch (_) {
          saved = await gateway(`/calendars/${encodeURIComponent(calendarId)}/events`, {
            method: 'POST',
            body: JSON.stringify(event),
          });
        }
      } else {
        saved = await gateway(`/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: 'POST',
          body: JSON.stringify(event),
        });
      }

      const { error: upErr } = await supabase
        .from('audiovisual_projects')
        .update({
          shoot_date: String(body.shoot_date).slice(0, 10),
          shoot_time: body.shoot_time || null,
          shoot_end_time: body.shoot_end_time || null,
          location_address: body.location || null,
          shoot_notes: body.notes || null,
          google_event_id: saved.id,
          google_event_link: saved.htmlLink,
          status: 'awaiting_capture',
        })
        .eq('id', projectId);
      if (upErr) throw upErr;

      return json({ event: saved });
    }

    if (action === 'delete_event') {
      const projectId = body.projectId as string;
      const { data: project } = await supabase
        .from('audiovisual_projects')
        .select('id, google_event_id')
        .eq('id', projectId)
        .maybeSingle();
      if (project?.google_event_id) {
        try {
          await gateway(`/calendars/${encodeURIComponent(calendarId)}/events/${project.google_event_id}`, {
            method: 'DELETE',
          });
        } catch (e) {
          console.error('[google-calendar-av] delete failed', e);
        }
      }
      await supabase
        .from('audiovisual_projects')
        .update({ google_event_id: null, google_event_link: null, shoot_date: null, shoot_time: null, shoot_end_time: null })
        .eq('id', projectId);
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (e: any) {
    console.error('[google-calendar-av] error', e);
    return json({ error: e.message || 'Erro inesperado.' }, 500);
  }
});
