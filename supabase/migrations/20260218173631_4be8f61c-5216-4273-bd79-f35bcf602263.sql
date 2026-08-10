-- Ensure crm-media bucket has public INSERT policy for anonymous uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-media', 'crm-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop any conflicting INSERT policies
DROP POLICY IF EXISTS "Public can upload crm media" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon insert crm-media" ON storage.objects;

-- Allow anyone to upload to crm-media bucket
CREATE POLICY "Allow anon insert crm-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'crm-media');

-- Allow public read
DROP POLICY IF EXISTS "Allow public read crm-media" ON storage.objects;
CREATE POLICY "Allow public read crm-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'crm-media');
