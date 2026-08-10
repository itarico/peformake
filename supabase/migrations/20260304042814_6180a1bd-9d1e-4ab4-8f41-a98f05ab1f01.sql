
-- Fix: Replace trigger functions to use hardcoded URL instead of current_setting which returns NULL
CREATE OR REPLACE FUNCTION public.notify_art_whatsapp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text := 'https://zhnpkvsbsyghxuxpakdh.supabase.co/functions/v1/whatsapp-art-events';
  v_key text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get service role key from vault or use anon key
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
    
    IF v_key IS NULL THEN
      RETURN NEW;
    END IF;

    -- Log the attempt
    INSERT INTO public.whatsapp_notification_log (event_type, art_id, status, edge_function, message_preview)
    VALUES ('art_status_change', NEW.id, 'triggered', 'whatsapp-art-events', OLD.status || ' -> ' || NEW.status);

    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
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
  -- Log the error
  INSERT INTO public.whatsapp_notification_log (event_type, art_id, status, error_message, edge_function)
  VALUES ('art_status_change', NEW.id, 'error', SQLERRM, 'whatsapp-art-events');
  RETURN NEW;
END;
$function$;

-- Fix notify_planning_whatsapp too
CREATE OR REPLACE FUNCTION public.notify_planning_whatsapp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client record;
  v_url text := 'https://zhnpkvsbsyghxuxpakdh.supabase.co/functions/v1/send-whatsapp-notification';
  v_key text;
BEGIN
  IF OLD.is_planning_complete = false AND NEW.is_planning_complete = true THEN
    SELECT c.phone, c.name, c.portal_token INTO v_client
    FROM clients c WHERE c.id = NEW.client_id;

    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

    IF v_client.phone IS NOT NULL AND v_key IS NOT NULL THEN
      INSERT INTO public.whatsapp_notification_log (event_type, client_id, recipient_phone, recipient_type, status, edge_function, message_preview)
      VALUES ('planning_ready', NEW.client_id, v_client.phone, 'client', 'triggered', 'send-whatsapp-notification', 'Planejamento pronto para ' || v_client.name);

      PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
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

-- Also fix the email notification trigger
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name text;
  v_payload jsonb;
  v_url text := 'https://zhnpkvsbsyghxuxpakdh.supabase.co/functions/v1/send-notification-email';
  v_key text;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  END IF;

  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  IF v_key IS NULL THEN RETURN NEW; END IF;

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
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := v_payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;
