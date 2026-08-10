
-- Create whatsapp message templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL UNIQUE,
  title text NOT NULL,
  message_template text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage templates" ON public.whatsapp_message_templates
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can read templates" ON public.whatsapp_message_templates
  FOR SELECT USING (true);

-- Insert default templates
INSERT INTO public.whatsapp_message_templates (event_type, title, message_template, description) VALUES
('art_awaiting_approval_client', '🎨 Arte para Aprovação (Cliente)', '🎨 *{client_name}*\n\nA arte "{art_title}" está pronta para sua aprovação!\n\n📋 Aprove no portal:\n{portal_link}', 'Enviada ao cliente quando uma arte fica pronta para aprovação'),
('art_awaiting_approval_team', '🎨 Aguardando Aprovação (Equipe)', '🎨 *Aguardando aprovação*\n{client_name} - "{art_title}"', 'Enviada à equipe quando arte aguarda aprovação do cliente'),
('briefing_completed', '📋 Briefing Pronto', '📋 *Briefing pronto*\n{client_name} - "{art_title}"\nPronto para produção.', 'Enviada ao designer quando briefing é preenchido'),
('revision_requested_designer', '🔄 Alteração Solicitada (Designer)', '🔄 *Alteração solicitada*\n{client_name} - "{art_title}"\n{revision_comment}', 'Enviada ao designer quando cliente pede alteração'),
('revision_requested_team', '🔄 Alteração Solicitada (Equipe)', '🔄 *Cliente solicitou alteração*\n{client_name} - "{art_title}"\n{revision_comment}', 'Enviada à equipe quando cliente pede alteração'),
('art_approved', '✅ Arte Aprovada', '✅ *Arte aprovada!*\n{client_name} - "{art_title}"', 'Enviada à equipe quando cliente aprova arte'),
('planning_ready', '📅 Planejamento Disponível', '📅 O planejamento do mês está pronto! Acesse: {portal_link}', 'Enviada ao cliente quando planejamento mensal fica pronto')
ON CONFLICT (event_type) DO NOTHING;

-- Enable WhatsApp notifications since session key exists
UPDATE public.notification_email_settings 
SET whatsapp_notifications_enabled = true 
WHERE id = '00000000-0000-0000-0000-000000000001' 
  AND agency_whatsapp_api_key IS NOT NULL;
