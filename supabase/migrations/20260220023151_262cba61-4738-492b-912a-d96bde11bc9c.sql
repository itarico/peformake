
-- 1. Criar tabela crm_sales para histórico independente de vendas
CREATE TABLE public.crm_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL DEFAULT 0,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  product_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage crm sales" ON public.crm_sales FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can view crm sales" ON public.crm_sales FOR SELECT USING (true);
CREATE POLICY "Service can insert crm sales" ON public.crm_sales FOR INSERT WITH CHECK (true);

-- 2. Adicionar campos de perfil inteligente ao crm_leads
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS interested_products TEXT[] DEFAULT '{}'::text[];

-- 3. Adicionar campos de WhatsApp na notification_email_settings
ALTER TABLE public.notification_email_settings
  ADD COLUMN IF NOT EXISTS agency_whatsapp_session TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_whatsapp_briefing_completed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_whatsapp_art_approved BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_whatsapp_art_ready BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_whatsapp_deadline_near BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_whatsapp_client_approval BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_whatsapp_traffic_low BOOLEAN DEFAULT true;

-- 4. Index para performance
CREATE INDEX idx_crm_sales_client_id ON public.crm_sales(client_id);
CREATE INDEX idx_crm_sales_lead_id ON public.crm_sales(lead_id);
CREATE INDEX idx_crm_sales_sale_date ON public.crm_sales(sale_date);
CREATE INDEX idx_crm_leads_interested_products ON public.crm_leads USING GIN(interested_products);
