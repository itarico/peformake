-- Add new fields for art content details (headline, subtitle, CTA)
ALTER TABLE public.arts 
ADD COLUMN IF NOT EXISTS headline text,
ADD COLUMN IF NOT EXISTS subtitle text,
ADD COLUMN IF NOT EXISTS cta text;