
-- 1. Tags personalizáveis com cores
CREATE TABLE public.crm_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_crm_tags_client_name ON public.crm_tags (client_id, name);
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_tags_all" ON public.crm_tags FOR ALL USING (true) WITH CHECK (true);

-- 2. Associação lead <-> tag
CREATE TABLE public.crm_lead_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id, tag_id)
);
ALTER TABLE public.crm_lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_lead_tags_all" ON public.crm_lead_tags FOR ALL USING (true) WITH CHECK (true);

-- 3. Mensagens agendadas
CREATE TABLE public.crm_scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_scheduled_pending ON public.crm_scheduled_messages (status, scheduled_at) WHERE status = 'pending';
ALTER TABLE public.crm_scheduled_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_scheduled_all" ON public.crm_scheduled_messages FOR ALL USING (true) WITH CHECK (true);

-- 4. Histórico de atividades do lead
CREATE TABLE public.crm_lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_lead_activities_lead ON public.crm_lead_activities (lead_id, created_at DESC);
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_activities_all" ON public.crm_lead_activities FOR ALL USING (true) WITH CHECK (true);

-- 5. Campanhas em massa
CREATE TABLE public.crm_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  filter_criteria JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  total_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_campaigns_all" ON public.crm_campaigns FOR ALL USING (true) WITH CHECK (true);

-- 6. Adicionar image_url ao catálogo de produtos
ALTER TABLE public.client_products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 7. Adicionar mídia às respostas rápidas
ALTER TABLE public.crm_quick_replies ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.crm_quick_replies ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 8. Trigger para registrar atividades automaticamente quando lead muda de status
CREATE OR REPLACE FUNCTION public.log_crm_lead_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.crm_lead_activities (client_id, lead_id, activity_type, description, metadata)
    VALUES (NEW.client_id, NEW.id, 'status_change',
      'Status alterado de ' || COALESCE(OLD.status, 'novo') || ' para ' || NEW.status,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  IF OLD.sale_value IS DISTINCT FROM NEW.sale_value AND NEW.sale_value IS NOT NULL THEN
    INSERT INTO public.crm_lead_activities (client_id, lead_id, activity_type, description, metadata)
    VALUES (NEW.client_id, NEW.id, 'sale_registered',
      'Venda registrada: R$ ' || NEW.sale_value,
      jsonb_build_object('value', NEW.sale_value)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_lead_activity
AFTER UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.log_crm_lead_activity();

-- 9. Trigger updated_at para campaigns
CREATE TRIGGER update_crm_campaigns_updated_at
BEFORE UPDATE ON public.crm_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
