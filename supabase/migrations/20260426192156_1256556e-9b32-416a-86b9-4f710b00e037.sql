
-- 1. Adiciona campos para mostrar onde a IA detectou a venda
ALTER TABLE public.crm_sales
  ADD COLUMN IF NOT EXISTS detected_message_id uuid REFERENCES public.crm_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS detected_excerpt text,
  ADD COLUMN IF NOT EXISTS confidence_score integer,
  ADD COLUMN IF NOT EXISTS detected_by text DEFAULT 'manual';

-- Default de is_confirmed para false (vendas detectadas pela IA precisam ser confirmadas)
ALTER TABLE public.crm_sales ALTER COLUMN is_confirmed SET DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_crm_sales_is_confirmed ON public.crm_sales(is_confirmed);
CREATE INDEX IF NOT EXISTS idx_crm_sales_detected_message_id ON public.crm_sales(detected_message_id);

-- 2. Função para resetar todos os dados do CRM de um cliente
CREATE OR REPLACE FUNCTION public.reset_crm_data(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leads_count integer;
  v_messages_count integer;
  v_sales_count integer;
BEGIN
  SELECT COUNT(*) INTO v_leads_count FROM public.crm_leads WHERE client_id = p_client_id;
  SELECT COUNT(*) INTO v_messages_count FROM public.crm_messages WHERE client_id = p_client_id;
  SELECT COUNT(*) INTO v_sales_count FROM public.crm_sales WHERE client_id = p_client_id;

  -- Apaga leads (cascade limpa messages, sales, summaries, activities, scores, tags, classifications, etc.)
  DELETE FROM public.crm_leads WHERE client_id = p_client_id;

  -- Limpa configurações opcionais
  DELETE FROM public.crm_lead_tags WHERE client_id = p_client_id;
  DELETE FROM public.crm_team_members WHERE client_id = p_client_id;
  DELETE FROM public.crm_campaigns WHERE client_id = p_client_id;
  DELETE FROM public.crm_products WHERE client_id = p_client_id;
  DELETE FROM public.crm_flows WHERE client_id = p_client_id;
  DELETE FROM public.crm_webhooks WHERE client_id = p_client_id;
  DELETE FROM public.crm_auto_notifications WHERE client_id = p_client_id;
  DELETE FROM public.crm_quotes WHERE client_id = p_client_id;

  RETURN jsonb_build_object(
    'success', true,
    'leads_removed', v_leads_count,
    'messages_removed', v_messages_count,
    'sales_removed', v_sales_count
  );
END;
$$;
