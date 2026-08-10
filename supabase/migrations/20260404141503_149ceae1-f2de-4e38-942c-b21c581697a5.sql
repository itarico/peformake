
-- Fix client_products: allow public access (CRM portal uses token auth, not Supabase auth)
DROP POLICY IF EXISTS "Staff can view all client products" ON public.client_products;
DROP POLICY IF EXISTS "Staff can manage client products" ON public.client_products;

CREATE POLICY "Anyone can view client products" ON public.client_products FOR SELECT USING (true);
CREATE POLICY "Anyone can manage client products" ON public.client_products FOR ALL USING (true) WITH CHECK (true);

-- Daily briefing per-client config
CREATE TABLE IF NOT EXISTS public.daily_briefing_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'weekdays',
  custom_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  message_template TEXT NOT NULL DEFAULT 'Bom dia! A equipe está à disposição. Para qualquer dúvida, chame no grupo do WhatsApp! 💬',
  monday_message_template TEXT DEFAULT 'Bom dia e boa semana! Acesse seu portal para acompanhar tudo: {portal_link}',
  send_time TEXT DEFAULT '08:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.daily_briefing_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage daily briefing configs" ON public.daily_briefing_configs FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_daily_briefing_configs_updated_at
  BEFORE UPDATE ON public.daily_briefing_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
