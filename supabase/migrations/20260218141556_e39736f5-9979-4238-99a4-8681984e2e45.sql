
-- Tabela de configurações de notificação por e-mail
CREATE TABLE public.notification_email_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Destinatários globais (JSON array de emails)
  global_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Preferências por tipo de evento
  notify_art_approved boolean NOT NULL DEFAULT true,
  notify_art_revision boolean NOT NULL DEFAULT true,
  notify_art_ready boolean NOT NULL DEFAULT true,
  notify_briefing_completed boolean NOT NULL DEFAULT true,
  notify_crm_new_lead boolean NOT NULL DEFAULT true,
  notify_crm_new_message boolean NOT NULL DEFAULT true,
  notify_planning_complete boolean NOT NULL DEFAULT true,
  -- Email do admin principal (sempre notificado)
  admin_email text,
  -- Frequência de digest (realtime | hourly | daily)
  digest_mode text NOT NULL DEFAULT 'realtime',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Garantir apenas 1 linha de configuração global
INSERT INTO public.notification_email_settings (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.notification_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage notification settings"
  ON public.notification_email_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view notification settings"
  ON public.notification_email_settings
  FOR SELECT
  USING (is_staff(auth.uid()));

-- Log de emails enviados para auditoria
CREATE TABLE public.notification_email_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  resend_id text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view email log"
  ON public.notification_email_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert email log"
  ON public.notification_email_log
  FOR INSERT
  WITH CHECK (true);

-- Trigger para updated_at na tabela de settings
CREATE TRIGGER update_notification_email_settings_updated_at
  BEFORE UPDATE ON public.notification_email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
