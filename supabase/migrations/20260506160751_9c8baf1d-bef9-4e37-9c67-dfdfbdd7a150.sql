-- Add category column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_message_templates' AND column_name = 'category') THEN
        ALTER TABLE public.whatsapp_message_templates ADD COLUMN category TEXT DEFAULT 'general';
    END IF;
END $$;

-- Update existing templates category
UPDATE public.whatsapp_message_templates SET category = 'arts' WHERE event_type LIKE 'art_%' OR event_type LIKE 'revision_%' OR event_type LIKE 'briefing_%';
UPDATE public.whatsapp_message_templates SET category = 'planning' WHERE event_type LIKE 'planning_%';

-- Insert new Audiovisual templates
INSERT INTO public.whatsapp_message_templates (event_type, title, message_template, description, category, is_active)
VALUES 
('av_raw_added_editor', '🎥 Vídeos Brutos Disponíveis (Editor)', '🎬 *Nova Edição Disponível*\n\nO material bruto do cliente *{client_name}* já está disponível para edição.\n\n🔗 Link dos brutos: {video_link}\n🚀 Prazo sugerido: {deadline}', 'Enviada ao editor quando o link dos vídeos brutos é adicionado.', 'audiovisual', true),

('av_raw_added_leader', '🎥 Vídeos Brutos Disponíveis (Líder)', '🔔 *Aviso de Captação Concluída*\n\nOs vídeos brutos do cliente *{client_name}* foram adicionados.\n\nEditor responsável: {editor_name}\n🔗 Link: {video_link}', 'Enviada ao líder quando o material bruto é disponibilizado.', 'audiovisual', true),

('av_edition_started_client', '🎬 Edição Iniciada (Cliente)', '✨ *Olá {client_name}!* \n\nPassando para avisar que já recebemos o material bruto e a edição dos seus vídeos começou agora! \n\nSe quiser dar uma espiada no material bruto, ele já está aqui: {video_link}\n\nEm breve te aviso quando os vídeos editados estiverem prontos! 🚀', 'Enviada ao cliente informando que a edição começou.', 'audiovisual', true),

('av_edition_ready_client', '✅ Vídeos Editados Prontos (Cliente)', '🎉 *Boas notícias, {client_name}!*\n\nSeus vídeos editados acabaram de ficar prontos e já estão disponíveis no seu portal.\n\n🔗 Acesse aqui: {portal_link}\n\nEspero que goste! Qualquer ajuste, é só solicitar por lá. 😉', 'Enviada ao cliente quando os vídeos são finalizados.', 'audiovisual', true),

('av_edition_ready_staff', '✅ Edição Finalizada (Equipe)', '🎬 *Edição Concluída*\n\nOs vídeos do cliente *{client_name}* foram finalizados pelo editor *{editor_name}*.\n\n🔗 Link final: {video_link_final}\n📱 Social Media: {social_media_name}', 'Enviada ao líder, social media e videomaker quando a edição termina.', 'audiovisual', true),

('av_photos_ready_sm', '📸 Fotos Disponíveis (Social Media)', '📸 *Fotos Prontas*\n\nAs fotos do cliente *{client_name}* já estão disponíveis para uso.\n\n🔗 Link das fotos: {photos_link}', 'Enviada ao social media quando o link das fotos é adicionado.', 'audiovisual', true)
ON CONFLICT (event_type) DO UPDATE 
SET title = EXCLUDED.title, 
    message_template = EXCLUDED.message_template, 
    description = EXCLUDED.description, 
    category = EXCLUDED.category;
