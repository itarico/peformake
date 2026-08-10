
-- Add wasender_id column for perfect deduplication (if not exists)
ALTER TABLE public.crm_messages 
ADD COLUMN IF NOT EXISTS frontend_message_id text;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_crm_messages_wasender_id ON public.crm_messages(wasender_message_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_frontend_id ON public.crm_messages(frontend_message_id);

-- Add public INSERT policy to storage.objects for crm-media bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can upload crm media'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can upload crm media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''crm-media'')';
  END IF;
END $$;
