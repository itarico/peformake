-- Add reference_link and carousel_slides to arts table
ALTER TABLE public.arts 
ADD COLUMN IF NOT EXISTS reference_link TEXT,
ADD COLUMN IF NOT EXISTS carousel_slides JSONB DEFAULT '[]'::jsonb;

-- Update art_type enum if needed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'art_type' AND e.enumlabel = 'anuncio') THEN
        ALTER TYPE public.art_type ADD VALUE 'anuncio';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'art_type' AND e.enumlabel = 'feed') THEN
        ALTER TYPE public.art_type ADD VALUE 'feed';
    END IF;
END $$;
