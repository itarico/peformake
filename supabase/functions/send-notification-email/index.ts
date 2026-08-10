import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface NotificationPayload {
  notification_id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  client_id?: string | null;
  user_id?: string | null;
  client_name?: string | null;
}

const TYPE_MAP: Record<string, { emoji: string; label: string; color: string; settingKey: string }> = {
  approval:          { emoji: '✅', label: 'Arte Aprovada',           color: '#16a34a', settingKey: 'notify_art_approved' },
  revision:          { emoji: '🔄', label: 'Alteração Solicitada',    color: '#d97706', settingKey: 'notify_art_revision' },
  new_art:           { emoji: '🎨', label: 'Nova Arte Pronta',         color: '#6366f1', settingKey: 'notify_art_ready' },
  briefing:          { emoji: '📋', label: 'Briefing Preenchido',      color: '#0ea5e9', settingKey: 'notify_briefing_completed' },
  crm_new_lead:      { emoji: '👤', label: 'Novo Lead CRM',            color: '#8b5cf6', settingKey: 'notify_crm_new_lead' },
  crm_new_message:   { emoji: '💬', label: 'Nova Mensagem WhatsApp',   color: '#10b981', settingKey: 'notify_crm_new_message' },
  planning_complete: { emoji: '📅', label: 'Planejamento Completo',    color: '#f59e0b', settingKey: 'notify_planning_complete' },
  default:           { emoji: '🔔', label: 'Notificação',              color: '#6366f1', settingKey: '' },
};

function buildEmailHtml(title: string, message: string, type: string, link?: string | null, clientName?: string | null): string {
  const info = TYPE_MAP[type] || TYPE_MAP.default;
  const appUrl = 'https://peformake.com';
  const actionUrl = link ? `${appUrl}${link}` : appUrl;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header gradient -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;">PEFORMAKE</div>
            <div style="color:#c7d2fe;font-size:12px;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Sistema de Notificações</div>
          </td>
        </tr>
        <!-- Type badge -->
        <tr>
          <td style="padding:32px 40px 0;">
            <div style="display:inline-block;background:${info.color}18;border:1px solid ${info.color}40;border-radius:999px;padding:6px 16px;font-size:13px;font-weight:600;color:${info.color};">
              ${info.emoji} ${info.label}
            </div>
            ${clientName ? `<div style="margin-top:12px;font-size:13px;color:#64748b;">Cliente: <strong style="color:#1e293b;">${clientName}</strong></div>` : ''}
          </td>
        </tr>
        <!-- Title -->
        <tr>
          <td style="padding:20px 40px 0;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">${title.replace(/^[^\w\s]+\s/, '')}</h1>
          </td>
        </tr>
        <!-- Message -->
        <tr>
          <td style="padding:12px 40px 0;">
            <p style="margin:0;font-size:15px;color:#475569;line-height:1.6;">${message}</p>
          </td>
        </tr>
        <!-- Divider -->
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="height:1px;background:linear-gradient(to right,#e2e8f0,transparent);"></div>
          </td>
        </tr>
        <!-- CTA Button -->
        <tr>
          <td style="padding:24px 40px 32px;">
            <a href="${actionUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
              Ver no Sistema →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Peformake · Sistema de Gestão de Marketing<br />
              <a href="${appUrl}/notifications" style="color:#6366f1;text-decoration:none;">Gerenciar notificações</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string, notificationId: string): Promise<void> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Peformake <notificacoes@peformake.com.br>',
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    await supabase.from('notification_email_log').insert({
      notification_id: notificationId,
      recipient_email: to,
      subject,
      status: res.ok ? 'sent' : 'failed',
      resend_id: data?.id || null,
      error_message: !res.ok ? JSON.stringify(data) : null,
    });
  } catch (err) {
    await supabase.from('notification_email_log').insert({
      notification_id: notificationId,
      recipient_email: to,
      subject,
      status: 'error',
      error_message: String(err),
    });
  }
}

async function authenticateRequest(req: Request): Promise<boolean> {
  // Accept service-role key (used by DB triggers via net.http_post)
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  // If the token matches the service role key, allow
  if (token === SUPABASE_SERVICE_ROLE_KEY) {
    return true;
  }

  // If the token matches the anon key, check if caller is authenticated via Supabase Auth
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (token === anonKey || token) {
    try {
      const authSupabase = createClient(SUPABASE_URL, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await authSupabase.auth.getUser();
      if (!error && data?.user) return true;
    } catch {
      // fall through
    }
  }

  // Check staff session header
  const staffId = req.headers.get('x-staff-id');
  if (staffId) {
    const { data } = await supabase.rpc('verify_staff_session', { p_staff_id: staffId });
    if (data && (data as any).valid) return true;
  }

  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate the request
    const isAuthed = await authenticateRequest(req);
    if (!isAuthed) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const { notification_id, title, message, type, link, client_name } = payload;

    // If no Resend API key, log and return early
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured — skipping email send');
      return new Response(JSON.stringify({ skipped: true, reason: 'no_api_key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar configurações globais
    const { data: settings } = await supabase
      .from('notification_email_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (!settings) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no settings' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se este tipo de notificação está habilitado
    const info = TYPE_MAP[type] || TYPE_MAP.default;
    if (info.settingKey && !settings[info.settingKey]) {
      return new Response(JSON.stringify({ skipped: true, reason: 'type disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Coletar destinatários únicos
    const recipients = new Set<string>();
    const globalEmails: string[] = Array.isArray(settings.global_emails) ? settings.global_emails : [];
    globalEmails.forEach((e: string) => e && recipients.add(e.trim().toLowerCase()));
    if (settings.admin_email) recipients.add(settings.admin_email.trim().toLowerCase());

    // Buscar e-mails de usuários admin/social_media via profiles
    const { data: staffRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'social_media']);

    if (staffRoles && staffRoles.length > 0) {
      const userIds = staffRoles.map((r: { user_id: string }) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .in('user_id', userIds);
      profiles?.forEach((p: { email: string }) => p.email && recipients.add(p.email.trim().toLowerCase()));
    }

    // Buscar e-mails de notificação dos membros da equipe
    const { data: staffEmails } = await supabase
      .from('staff_members')
      .select('email, notification_email')
      .eq('is_active', true);
    staffEmails?.forEach((s: any) => {
      if (s.notification_email) recipients.add(s.notification_email.trim().toLowerCase());
      else if (s.email) recipients.add(s.email.trim().toLowerCase());
    });

    // Buscar e-mails de notificação dos clientes (se relevante)
    if (payload.client_id) {
      const { data: clientEmail } = await supabase
        .from('clients')
        .select('email, notification_email')
        .eq('id', payload.client_id)
        .single();
      if (clientEmail?.notification_email) recipients.add(clientEmail.notification_email.trim().toLowerCase());
      else if (clientEmail?.email) recipients.add(clientEmail.email.trim().toLowerCase());
    }

    // Override recipients for test emails
    if (payload._override_recipients) {
      recipients.clear();
      payload._override_recipients.forEach((e: string) => recipients.add(e.trim().toLowerCase()));
    }

    if (recipients.size === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = buildEmailHtml(title, message, type, link, client_name);
    const subject = `${title} | Peformake`;

    // Enviar e-mails
    await Promise.all(Array.from(recipients).map(email => sendEmail(email, subject, html, notification_id)));

    // Enviar WhatsApp se habilitado
    try {
      const waTypeMap: Record<string, string> = {
        briefing: 'notify_whatsapp_briefing_completed',
        approval: 'notify_whatsapp_art_approved',
        new_art: 'notify_whatsapp_art_ready',
        crm_new_lead: 'notify_crm_new_lead',
      };
      const waKey = waTypeMap[type];
      const hasAgencyWhatsApp = !!(settings.agency_whatsapp_session || settings.agency_whatsapp_api_key || settings.agency_whatsapp_session_id);
      const shouldSendWhatsApp = type === 'crm_new_lead'
        ? (settings.whatsapp_notifications_enabled !== false) && hasAgencyWhatsApp && !!settings.notify_crm_new_lead
        : (settings.whatsapp_notifications_enabled !== false) && hasAgencyWhatsApp && !!waKey && !!settings[waKey];

      if (shouldSendWhatsApp) {
        const waUrl = `${SUPABASE_URL}/functions/v1/send-whatsapp-notification`;
        await fetch(waUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({
            type, title, message: message.substring(0, 180),
            client_id: payload.client_id,
            target: type === 'approval' ? 'staff' : type === 'crm_new_lead' ? 'staff' : 'both',
          }),
        });
      }
    } catch (waErr) {
      console.error('WhatsApp notification error:', waErr);
    }

    // Never leak recipient list — only return count
    return new Response(JSON.stringify({ sent: recipients.size }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
