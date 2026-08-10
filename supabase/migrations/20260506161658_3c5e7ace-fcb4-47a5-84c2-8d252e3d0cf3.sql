-- Add notified_at to track when a stale alert was sent
ALTER TABLE public.notification_pendencies 
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP WITH TIME ZONE;

-- Function to check for stale pendencies and trigger system notifications
CREATE OR REPLACE FUNCTION public.check_stale_pendencies()
RETURNS void AS $$
DECLARE
    pendency_record RECORD;
    staff_id UUID;
BEGIN
    FOR pendency_record IN 
        SELECT np.*, c.name as client_name, c.social_media_staff_id, c.admin_staff_id
        FROM public.notification_pendencies np
        JOIN public.clients c ON np.client_id = c.id
        WHERE np.status IN ('pending', 'failed')
        AND np.created_at < now() - interval '24 hours'
        AND (np.notified_at IS NULL OR np.notified_at < now() - interval '24 hours')
    LOOP
        -- Determine who to notify (prefer Social Media or Admin assigned to client)
        staff_id := COALESCE(pendency_record.social_media_staff_id, pendency_record.admin_staff_id);
        
        IF staff_id IS NOT NULL THEN
            -- Insert into system notifications table
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                link,
                is_read
            ) VALUES (
                staff_id,
                '⚠️ Pendência Crítica: ' || pendency_record.client_name,
                'Uma notificação (' || pendency_record.event_type || ') está pendente há mais de 24h. Por favor, resolva manualmente.',
                'overdue_alert',
                '/audiovisual',
                false
            );
            
            -- Update the pendency record to avoid duplicate alerts in short intervals
            UPDATE public.notification_pendencies 
            SET notified_at = now()
            WHERE id = pendency_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Set up cron if available (using net extension or similar if needed, or just expose for edge function)
-- For this project, we'll trigger it via a new Edge Function 'av-stale-check'
