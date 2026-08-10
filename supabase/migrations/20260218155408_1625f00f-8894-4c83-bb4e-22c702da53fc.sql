-- Create crm-media storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-media',
  'crm-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/*', 'audio/*', 'video/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Public read policy
CREATE POLICY "crm_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'crm-media');

-- Anyone can upload (portal is unauthenticated)
CREATE POLICY "crm_media_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'crm-media');

-- Allow updates
CREATE POLICY "crm_media_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'crm-media');

-- Enable pg_cron and pg_net extensions for scheduled AI analysis
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;