
-- Fix storage policies for crm-media bucket (allow authenticated users to upload)
-- Remove any existing conflicting policies first
DROP POLICY IF EXISTS "Allow authenticated upload to crm-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read crm-media" ON storage.objects;
DROP POLICY IF EXISTS "crm-media insert" ON storage.objects;
DROP POLICY IF EXISTS "crm-media select" ON storage.objects;

-- Allow any authenticated user to upload to crm-media
CREATE POLICY "crm-media authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crm-media');

-- Allow anonymous upload too (needed for service role via webhook)
CREATE POLICY "crm-media anon upload"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'crm-media');

-- Allow public SELECT (already public bucket, but explicit policy helps)
CREATE POLICY "crm-media public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'crm-media');
