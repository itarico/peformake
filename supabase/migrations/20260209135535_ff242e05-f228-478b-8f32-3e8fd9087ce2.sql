
-- Create a trigger function to auto-notify on art status changes
CREATE OR REPLACE FUNCTION public.notify_art_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_client_name text;
  v_art_title text;
  v_work_month record;
  v_admin_users record;
  v_staff_user_id uuid;
  v_month_name text;
  v_month_names text[] := ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get work month and client info
  SELECT wm.*, c.id as cid, c.name as cname, c.portal_token
  INTO v_work_month
  FROM work_months wm
  JOIN clients c ON c.id = wm.client_id
  WHERE wm.id = NEW.work_month_id;

  v_client_id := v_work_month.cid;
  v_client_name := v_work_month.cname;
  v_art_title := COALESCE(NEW.title, 'Arte #' || NEW.art_number);
  v_month_name := v_month_names[v_work_month.month];

  -- NOTIFY STAFF (admins and social_media) about client portal actions
  IF NEW.status = 'approved' AND OLD.status = 'awaiting_approval' THEN
    -- Client approved art -> notify all admin/social_media users
    FOR v_admin_users IN 
      SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'social_media')
    LOOP
      INSERT INTO notifications (user_id, client_id, title, message, type, link)
      VALUES (
        v_admin_users.user_id,
        v_client_id,
        '✅ Arte Aprovada',
        v_client_name || ' aprovou "' || v_art_title || '" (' || v_month_name || ')',
        'approval',
        '/planning/' || NEW.work_month_id
      );
    END LOOP;

  ELSIF NEW.status = 'revision_requested' THEN
    -- Client requested revision -> notify staff
    FOR v_admin_users IN 
      SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'social_media')
    LOOP
      INSERT INTO notifications (user_id, client_id, title, message, type, link)
      VALUES (
        v_admin_users.user_id,
        v_client_id,
        '🔄 Alteração Solicitada',
        v_client_name || ' pediu alteração em "' || v_art_title || '": ' || COALESCE(NEW.revision_comment, ''),
        'revision',
        '/planning/' || NEW.work_month_id
      );
    END LOOP;

  ELSIF NEW.status = 'awaiting_approval' AND OLD.status IN ('in_production', 'revision_requested') THEN
    -- Design completed / revision done -> notify staff + create client-visible notification
    FOR v_admin_users IN 
      SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'social_media')
    LOOP
      INSERT INTO notifications (user_id, client_id, title, message, type, link)
      VALUES (
        v_admin_users.user_id,
        v_client_id,
        '🎨 Nova Arte Pronta',
        '"' || v_art_title || '" de ' || v_client_name || ' está aguardando aprovação',
        'new_art',
        '/planning/' || NEW.work_month_id
      );
    END LOOP;

  ELSIF NEW.status = 'ready_for_production' AND OLD.status = 'pending_briefing' THEN
    -- Briefing completed -> notify staff
    FOR v_admin_users IN 
      SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'social_media')
    LOOP
      INSERT INTO notifications (user_id, client_id, title, message, type, link)
      VALUES (
        v_admin_users.user_id,
        v_client_id,
        '📋 Briefing Preenchido',
        'Briefing de "' || v_art_title || '" para ' || v_client_name || ' está pronto para produção',
        'briefing',
        '/planning/' || NEW.work_month_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger on arts table
DROP TRIGGER IF EXISTS trigger_art_status_notification ON public.arts;
CREATE TRIGGER trigger_art_status_notification
  AFTER UPDATE ON public.arts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_art_status_change();

-- Allow staff to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Allow viewing notifications by client_id (for portal)  
CREATE POLICY "Portal can view client notifications"
  ON public.notifications
  FOR SELECT
  USING (client_id IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
