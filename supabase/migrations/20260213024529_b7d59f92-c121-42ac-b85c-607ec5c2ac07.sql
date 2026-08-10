
-- CRM WhatsApp Connections
CREATE TABLE public.crm_whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_id text,
  session_api_key text,
  phone_number text,
  status text NOT NULL DEFAULT 'disconnected',
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.crm_whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage crm connections" ON public.crm_whatsapp_connections
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can view own crm connection" ON public.crm_whatsapp_connections
  FOR SELECT USING (true);

CREATE TRIGGER update_crm_connections_updated_at
  BEFORE UPDATE ON public.crm_whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CRM Leads
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'new',
  sale_value numeric,
  sale_date timestamptz,
  tags text[] DEFAULT '{}',
  notes text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage crm leads" ON public.crm_leads
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can view crm leads" ON public.crm_leads
  FOR SELECT USING (true);

CREATE POLICY "Anon can update crm leads" ON public.crm_leads
  FOR UPDATE USING (true);

CREATE POLICY "Anon can insert crm leads" ON public.crm_leads
  FOR INSERT WITH CHECK (true);

CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CRM Messages
CREATE TABLE public.crm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'outbound',
  message_type text NOT NULL DEFAULT 'text',
  content text,
  media_url text,
  wasender_message_id text,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage crm messages" ON public.crm_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can view crm messages" ON public.crm_messages
  FOR SELECT USING (true);

CREATE POLICY "Anon can insert crm messages" ON public.crm_messages
  FOR INSERT WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_whatsapp_connections;
