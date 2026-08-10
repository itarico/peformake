-- Add productivity tracking to audiovisual_projects
ALTER TABLE public.audiovisual_projects
ADD COLUMN IF NOT EXISTS raw_video_added_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_delivery_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revisions INTEGER DEFAULT 0;

-- Add goals to staff_members
ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS av_monthly_video_goal INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS av_monthly_capture_goal INTEGER DEFAULT 0;

-- Function to handle automated tracking
CREATE OR REPLACE FUNCTION public.handle_audiovisual_productivity_tracking()
RETURNS TRIGGER AS $$
BEGIN
    -- Track when raw video link is first added
    IF (NEW.raw_video_url IS NOT NULL AND (OLD.raw_video_url IS NULL OR OLD.raw_video_url = '')) THEN
        NEW.raw_video_added_at = now();
    END IF;

    -- Track first delivery (when status moves to awaiting_approval for the first time)
    IF (NEW.status = 'awaiting_approval' AND (OLD.status IS NULL OR OLD.status != 'awaiting_approval') AND NEW.first_delivery_at IS NULL) THEN
        NEW.first_delivery_at = now();
    END IF;

    -- Track completion
    IF (NEW.status IN ('approved', 'published') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'published'))) THEN
        NEW.completed_at = now();
    END IF;

    -- Track revisions (increment when status moves from revision_requested to in_production or back to awaiting_approval)
    IF (OLD.status = 'revision_requested' AND NEW.status != 'revision_requested') THEN
        NEW.revisions = COALESCE(OLD.revisions, 0) + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for productivity tracking
DROP TRIGGER IF EXISTS tr_audiovisual_productivity_tracking ON public.audiovisual_projects;
CREATE TRIGGER tr_audiovisual_productivity_tracking
BEFORE UPDATE ON public.audiovisual_projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_audiovisual_productivity_tracking();
