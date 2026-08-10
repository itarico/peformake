-- Fix the template in the database
UPDATE public.whatsapp_message_templates 
SET message_template = '🎨 *{client_name}*\n\nA arte "{art_title}" está pronta para sua aprovação!\n📋 Aprove no portal: {portal_link}'
WHERE event_type = 'art_awaiting_approval_client';

-- Ensure other templates don't have double newlines if not needed
UPDATE public.whatsapp_message_templates
SET message_template = '🔄 *Alteração solicitada*\n{client_name} - "{art_title}"\n{revision_comment}'
WHERE event_type = 'revision_requested_designer';

UPDATE public.whatsapp_message_templates
SET message_template = '🔄 *Cliente solicitou alteração*\n{client_name} - "{art_title}"\n{revision_comment}'
WHERE event_type = 'revision_requested_team';
