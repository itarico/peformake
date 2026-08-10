
-- CRM Team Members (funcionários do cliente)
CREATE TABLE public.crm_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role_label TEXT NOT NULL DEFAULT 'vendedor',
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_active_leads INTEGER DEFAULT 50,
  login_password TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage CRM team members" ON public.crm_team_members
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_crm_team_members_updated_at
  BEFORE UPDATE ON public.crm_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CRM Auto Notifications config
CREATE TABLE public.crm_auto_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'custom',
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_status TEXT,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  message_template TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  max_sends_per_lead INTEGER DEFAULT 1,
  send_window_start TEXT DEFAULT '08:00',
  send_window_end TEXT DEFAULT '20:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_auto_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage CRM auto notifications" ON public.crm_auto_notifications
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_crm_auto_notifications_updated_at
  BEFORE UPDATE ON public.crm_auto_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CRM Auto Notification Logs
CREATE TABLE public.crm_auto_notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.crm_auto_notifications(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  wasender_response JSONB,
  error_message TEXT
);

ALTER TABLE public.crm_auto_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view notification logs" ON public.crm_auto_notification_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Add assigned_member_id to crm_leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS assigned_member_id UUID REFERENCES public.crm_team_members(id) ON DELETE SET NULL;

-- Add assignment_mode to clients for CRM config
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS crm_assignment_mode TEXT DEFAULT 'manual';
