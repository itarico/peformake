
-- Função para disparar e-mail após inserção de notificação
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_name text;
  v_payload jsonb;
BEGIN
  -- Buscar nome do cliente se houver client_id
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

  -- Chamar edge function assíncrona via pg_net (sem bloquear a transação)
  PERFORM net.http_post(
    url     := current_setting('app.supabase_url', true) || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := v_payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Não falhar a transação principal se o e-mail falhar
  RETURN NEW;
END;
$$;

-- Trigger após inserção de notificação
DROP TRIGGER IF EXISTS on_notification_created_send_email ON public.notifications;
CREATE TRIGGER on_notification_created_send_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_email();
