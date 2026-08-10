-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Delete notifications older than 30 days
    DELETE FROM public.notifications
    WHERE created_at < NOW() - INTERVAL '30 days';

    -- Mark notifications older than 7 days as read
    UPDATE public.notifications
    SET is_read = true
    WHERE is_read = false
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to service_role and authenticated users (though it should ideally run as a cron)
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO service_role;
