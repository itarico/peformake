-- Function to handle audiovisual notifications
CREATE OR REPLACE FUNCTION public.handle_audiovisual_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_client record;
  v_staff record;
  v_leader record;
  v_social_media record;
  v_editor record;
  v_videographer record;
  v_message text;
  v_target_phone text;
BEGIN
  -- Load client data
  SELECT * INTO v_client FROM clients WHERE id = NEW.client_id;
  
  -- Load staff names/data if needed
  IF NEW.editor_id IS NOT NULL THEN
    SELECT * INTO v_editor FROM staff_members WHERE id = NEW.editor_id;
  END IF;
  IF NEW.videographer_id IS NOT NULL THEN
    SELECT * INTO v_videographer FROM staff_members WHERE id = NEW.videographer_id;
  END IF;
  
  -- Load leader (squad leader or client leader)
  IF v_client.squad_id IS NOT NULL THEN
    SELECT sm.* INTO v_leader 
    FROM squads s 
    JOIN staff_members sm ON s.leader_id = sm.id 
    WHERE s.id = v_client.squad_id;
  END IF;

  -- Load social media responsible
  IF v_client.social_media_staff_id IS NOT NULL THEN
    SELECT * INTO v_social_media FROM staff_members WHERE id = v_client.social_media_staff_id;
  END IF;

  -- EVENT 1: Raw videos added (Videomaker -> Editor, Client, Leader)
  IF (OLD.raw_video_url IS NULL OR OLD.raw_video_url = '') AND (NEW.raw_video_url IS NOT NULL AND NEW.raw_video_url != '') THEN
    -- Notify Client via WhatsApp
    IF v_client.phone IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://zhnpkvsbsyghxuxpakdh.supabase.co/functions/v1/send-whatsapp-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobnBrdnNic3lnaHh1eHBha2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NzQ5ODEsImV4cCI6MjA4NDA1MDk4MX0.3B1ATUYHa04JVjU8ILLy41Iv62Lo9HDrY8N2H7AQDQg"}'::jsonb,
        body := jsonb_build_object(
          'type', 'audiovisual_raw_ready',
          'client_phone', v_client.phone,
          'message', '🎥 Olá ' || v_client.name || '! Os vídeos brutos da sua captação já estão disponíveis para visualização: ' || NEW.raw_video_url || '. Já estamos iniciando a edição!',
          'target', 'client'
        )
      );
    END IF;

    -- Internal Notification for Editor
    IF NEW.editor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.editor_id, 'Novos vídeos brutos: ' || v_client.name, 'O link dos vídeos brutos foi adicionado. Você já pode iniciar a edição.', 'info', '/audiovisual');
    END IF;
    
    -- Notification for Leader and Social Media
    IF v_leader.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_leader.id, 'Brutos adicionados: ' || v_client.name, 'Videomaker adicionou o link dos vídeos brutos.', 'info');
    END IF;
    IF v_social_media.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_social_media.id, 'Brutos disponíveis: ' || v_client.name, 'Os vídeos brutos já estão no sistema.', 'info');
    END IF;
  END IF;

  -- EVENT 2: Photos added
  IF (OLD.photos_url IS NULL OR OLD.photos_url = '') AND (NEW.photos_url IS NOT NULL AND NEW.photos_url != '') THEN
    IF v_social_media.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_social_media.id, 'Fotos disponíveis: ' || v_client.name, 'As fotos da captação foram adicionadas.', 'info');
    END IF;
  END IF;

  -- EVENT 3: Finished Assets Ready (Editor -> Client, Leader, Social Media, Videomaker)
  IF (OLD.finished_assets_url IS NULL OR OLD.finished_assets_url = '') AND (NEW.finished_assets_url IS NOT NULL AND NEW.finished_assets_url != '') THEN
    -- Notify Client via WhatsApp
    IF v_client.phone IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://zhnpkvsbsyghxuxpakdh.supabase.co/functions/v1/send-whatsapp-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobnBrdnNic3lnaHh1eHBha2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NzQ5ODEsImV4cCI6MjA4NDA1MDk4MX0.3B1ATUYHa04JVjU8ILLy41Iv62Lo9HDrY8N2H7AQDQg"}'::jsonb,
        body := jsonb_build_object(
          'type', 'audiovisual_finished_ready',
          'client_phone', v_client.phone,
          'message', '🎬 Notícia boa, ' || v_client.name || '! Seus vídeos editados estão prontos! Acesse aqui: ' || NEW.finished_assets_url,
          'target', 'client'
        )
      );
    END IF;

    -- Internal Notifications
    IF v_leader.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (v_leader.id, 'Edição concluída: ' || v_client.name, 'O editor finalizou os vídeos. Verifique para aprovação.', 'success', '/audiovisual');
    END IF;
    IF v_social_media.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (v_social_media.id, 'Vídeos prontos para postar: ' || v_client.name, 'A edição audiovisual foi finalizada.', 'success', '/audiovisual');
    END IF;
    IF NEW.videographer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.videographer_id, 'Edição finalizada: ' || v_client.name, 'A edição dos vídeos que você captou foi concluída.', 'info');
    END IF;
  END IF;

  -- EVENT 4: Editing Started
  IF OLD.status != 'in_editing' AND NEW.status = 'in_editing' THEN
    -- Notify Leader
    IF v_leader.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_leader.id, 'Edição iniciada: ' || v_client.name, 'O editor começou a trabalhar nos vídeos.', 'info');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notifications
DROP TRIGGER IF EXISTS tr_audiovisual_notifications ON public.audiovisual_projects;
CREATE TRIGGER tr_audiovisual_notifications
AFTER UPDATE ON public.audiovisual_projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_audiovisual_notifications();
