-- Add art_id to notification_pendencies if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_pendencies' AND column_name = 'art_id') THEN
        ALTER TABLE public.notification_pendencies ADD COLUMN art_id UUID REFERENCES public.arts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Function to handle art status changes and sync pendencies
CREATE OR REPLACE FUNCTION public.sync_art_notification_pendencies()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changes to 'approved', resolve any linked pendencies
    IF NEW.status::text = 'approved' AND (OLD.status IS NULL OR OLD.status::text != 'approved') THEN
        UPDATE public.notification_pendencies
        SET status = 'resolved',
            resolved_at = now(),
            updated_at = now()
        WHERE art_id = NEW.id AND status = 'pending';
    END IF;

    -- If status changes to 'pending_approval', create a pendency if one doesn't exist
    IF NEW.status::text = 'pending_approval' AND (OLD.status IS NULL OR OLD.status::text != 'pending_approval') THEN
        -- Only create if not exists or previous was resolved
        IF NOT EXISTS (SELECT 1 FROM public.notification_pendencies WHERE art_id = NEW.id AND status = 'pending') THEN
            INSERT INTO public.notification_pendencies (
                client_id,
                art_id,
                event_type,
                status,
                metadata
            ) 
            SELECT 
                wm.client_id,
                NEW.id,
                'art_approval_pending',
                'pending',
                jsonb_build_object(
                    'art_title', NEW.title,
                    'art_number', NEW.art_number,
                    'sync_type', 'auto_approval_flow'
                )
            FROM public.work_months wm
            WHERE wm.id = NEW.work_month_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on arts table
DROP TRIGGER IF EXISTS tr_sync_art_pendencies ON public.arts;
CREATE TRIGGER tr_sync_art_pendencies
AFTER UPDATE ON public.arts
FOR EACH ROW
EXECUTE FUNCTION public.sync_art_notification_pendencies();
