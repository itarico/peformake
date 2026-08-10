-- Add column for multiple final art URLs (array)
ALTER TABLE public.arts ADD COLUMN final_art_urls TEXT[] DEFAULT '{}';

-- Migrate existing single URL to array
UPDATE public.arts 
SET final_art_urls = ARRAY[final_art_url]
WHERE final_art_url IS NOT NULL AND final_art_url != '';

-- Keep the old column for backwards compatibility, but mark it as deprecated
COMMENT ON COLUMN public.arts.final_art_url IS 'DEPRECATED: Use final_art_urls array instead';