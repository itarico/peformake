
-- Add same-day delivery bonus field to staff_members
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS same_day_bonus numeric DEFAULT 0;

-- Update the art status notification trigger to include in_production
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
  v_month_name text;
  v_month_names text[] := ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT wm.*, c.id as cid, c.name as cname, c.portal_token
  INTO v_work_month
  FROM work_months wm
  JOIN clients c ON c.id = wm.client_id
  WHERE wm.id = NEW.work_month_id;

  v_client_id := v_work_month.cid;
  v_client_name := v_work_month.cname;
  v_art_title := COALESCE(NEW.title, 'Arte #' || NEW.art_number);
  v_month_name := v_month_names[v_work_month.month];

  -- Art sent to production
  IF NEW.status = 'in_production' AND OLD.status = 'ready_for_production' THEN
    FOR v_admin_users IN 
      SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'social_media')
    LOOP
      INSERT INTO notifications (user_id, client_id, title, message, type, link)
      VALUES (
        v_admin_users.user_id,
        v_client_id,
        '🚀 Arte em Produção',
        '"' || v_art_title || '" de ' || v_client_name || ' entrou em produção',
        'production',
        '/planning/' || NEW.work_month_id
      );
    END LOOP;
  END IF;

  IF NEW.status = 'approved' AND OLD.status = 'awaiting_approval' THEN
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
