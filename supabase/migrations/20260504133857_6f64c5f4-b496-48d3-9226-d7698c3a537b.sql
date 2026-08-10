-- Update existing notification message templates that might contain the lovable domain
UPDATE public.daily_briefing_configs
SET message_template = REPLACE(message_template, 'peformake.lovable.app', 'peformake.com'),
    monday_message_template = REPLACE(monday_message_template, 'peformake.lovable.app', 'peformake.com')
WHERE message_template LIKE '%peformake.lovable.app%'
   OR monday_message_template LIKE '%peformake.lovable.app%';

UPDATE public.whatsapp_message_templates
SET message_template = REPLACE(message_template, 'peformake.lovable.app', 'peformake.com')
WHERE message_template LIKE '%peformake.lovable.app%';
