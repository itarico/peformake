-- Add social_media_staff_id column to clients table for social media assignment
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS social_media_staff_id UUID REFERENCES public.staff_members(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_social_media_staff_id ON public.clients(social_media_staff_id);