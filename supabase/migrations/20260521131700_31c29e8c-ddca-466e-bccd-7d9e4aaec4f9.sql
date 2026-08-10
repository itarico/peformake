-- Create 'documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public access (anyone can see the images)
CREATE POLICY "Public Access for Documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Policies for authenticated users to upload/manage
CREATE POLICY "Authenticated Users can upload to Documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users can update Documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users can delete Documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');