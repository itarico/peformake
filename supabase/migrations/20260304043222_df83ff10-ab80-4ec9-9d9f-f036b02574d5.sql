
-- Use a settings table approach instead of vault
-- Create a helper function to get the service role key
CREATE OR REPLACE FUNCTION public.get_edge_function_url(func_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 'https://zhnpkvsbsyghxuxpakdh.supabase.co/functions/v1/' || func_name
$$;

-- Recreate trigger functions using the anon key (edge functions have verify_jwt = false)
CREATE OR REPLACE FUNCTION public.notify_art_whatsapp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Log the attempt
    INSERT INTO public.whatsapp_notification_log (event_type, art_id, status, edge_function, message_preview)
    VALUES ('art_status_change', NEW.id, 'triggered', 'whatsapp-art-events', OLD.status || ' -> ' || NEW.status);

    PERFORM net.http_post(
      url := 'https://zhnpkvsbsyghxuxpakdh.supabase.co/functions/v1/whatsapp-art-events',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobnBrdnNic3lnaHh1eHBha2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NzQ5ODEsImV4cCI6MjA4NDA1MDk4MX0.3B1ATUYHa04JVjU8ILLy41Iv62Lo9HDrY8N2H7AQDQg"}'::jsonb,
      body := jsonb_build_object(
        'art_id', NEW.id,
        'old_status', OLD.status::text,
        'new_status', NEW.status::text,
        'work_month_id', NEW.work_month_id
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.whatsapp_notification_log (event_type, art_id, status, error_message, edge_function)
  VALUES ('art_status_change', NEW.id, 'error', SQLERRM, 'whatsapp-art-events');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_planning_whatsapp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client record;
BEGIN
  IF OLD.is_planning_complete = false AND NEW.is_planning_complete = true THEN
    SELECT c.phone, c.name, c.portal_token INTO v_client
    FROM clients c WHERE c.id = NEW.client_id;

    IF v_client.phone IS NOT NULL THEN
      INSERT INTO public.whatsapp_notification_log (event_type, client_id, recipient_phone, recipient_type, status, edge_function, message_preview)
      VALUES ('planning_ready', NEW.client_id, v_client.phone, 'client', 'triggered', 'send-whatsapp-notification', 'Planejamento pronto para ' || v_client.name);

      PERFORM net.http_post(
        url := 'https://zhnpkvsbsyghxuxpakdh.supabase.co/functions/v1/send-whatsapp-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobnBrdnNic3lnaHh1eHBha2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NzQ5ODEsImV4cCI6MjA4NDA1MDk4MX0.3B1ATUYHa04JVjU8ILLy41Iv62Lo9HDrY8N2H7AQDQg"}'::jsonb,
        body := jsonb_build_object(
          'type', 'planning_ready',
          'title', 'Planejamento Disponível',
          'message', '📅 O planejamento do mês está pronto! Acesse: https://peformake.lovable.app/portal/' || v_client.portal_token::text,
          'client_phone', v_client.phone,
          'target', 'client'
        )
      );
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.whatsapp_notification_log (event_type, client_id, status, error_message, edge_function)
  VALUES ('planning_ready', NEW.client_id, 'error', SQLERRM, 'send-whatsapp-notification');
  RETURN NEW;
END;
$function$;

-- Fix email trigger too
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name text;
  v_payload jsonb;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  END IF;

  v_payload := jsonb_build_object(
    'notification_id', NEW.id,
    'title',           NEW.title,
    'message',         NEW.message,
    'type',            NEW.type,
    'link',            NEW.link,
    'client_id',       NEW.client_id,
    'user_id',         NEW.user_id,
    'client_name',     v_client_name
  );

  PERFORM net.http_post(
    url     := 'https://zhnpkvsbsyghxuxpakdh.supabase.co/functions/v1/send-notification-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobnBrdnNic3lnaHh1eHBha2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NzQ5ODEsImV4cCI6MjA4NDA1MDk4MX0.3B1ATUYHa04JVjU8ILLy41Iv62Lo9HDrY8N2H7AQDQg"}'::jsonb,
    body    := v_payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;
