ALTER TABLE public.arts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Comment for clarity
COMMENT ON COLUMN public.arts.deleted_at IS 'Timestamp for soft deletion';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_arts_deleted_at ON public.arts (deleted_at) WHERE deleted_at IS NULL;
