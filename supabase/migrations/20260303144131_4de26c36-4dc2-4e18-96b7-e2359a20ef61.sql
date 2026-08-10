
-- Trigger: WhatsApp notification on art status change
CREATE OR REPLACE FUNCTION public.notify_art_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/whatsapp-art-events',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_art_status_whatsapp
  AFTER UPDATE ON public.arts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_art_whatsapp();

-- Trigger: WhatsApp notification when planning is ready
CREATE OR REPLACE FUNCTION public.notify_planning_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client record;
BEGIN
  IF OLD.is_planning_complete = false AND NEW.is_planning_complete = true THEN
    SELECT c.phone, c.name, c.portal_token INTO v_client
    FROM clients c WHERE c.id = NEW.client_id;

    IF v_client.phone IS NOT NULL THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/send-whatsapp-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_planning_complete_whatsapp
  AFTER UPDATE ON public.work_months
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_planning_whatsapp();
