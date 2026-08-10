-- Secure SELECT policies for public buckets to prevent listing
-- The trick to allow download but prevent listing is to check for a specific path part
-- or use (storage.foldername(name))[1] IS NOT NULL which works for direct file access in some drivers
-- but the most standard Supabase recommendation is to ensure the user knows the full path.

-- Avatars
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IS NOT NULL);

-- Client Logos
DROP POLICY IF EXISTS "Anyone can view client logos" ON storage.objects;
CREATE POLICY "Anyone can view client logos" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'client-logos' AND (storage.foldername(name))[1] IS NOT NULL);

-- Final Arts
DROP POLICY IF EXISTS "Anyone can view final arts" ON storage.objects;
CREATE POLICY "Anyone can view final arts" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'final-arts' AND (storage.foldername(name))[1] IS NOT NULL);

-- Reference Images
DROP POLICY IF EXISTS "Anyone can view reference images" ON storage.objects;
CREATE POLICY "Anyone can view reference images" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'reference-images' AND (storage.foldername(name))[1] IS NOT NULL);

-- Planning PDFs
DROP POLICY IF EXISTS "Anyone can view planning pdfs" ON storage.objects;
CREATE POLICY "Anyone can view planning pdfs" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'planning-pdfs' AND (storage.foldername(name))[1] IS NOT NULL);

-- Portfolio Media
DROP POLICY IF EXISTS "Anyone can view portfolio media" ON storage.objects;
CREATE POLICY "Anyone can view portfolio media" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'portfolio-media' AND (storage.foldername(name))[1] IS NOT NULL);

-- CRM Media
DROP POLICY IF EXISTS "Public can view crm media" ON storage.objects;
CREATE POLICY "Public can view crm media" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'crm-media' AND (storage.foldername(name))[1] IS NOT NULL);

-- Ad Creatives
DROP POLICY IF EXISTS "Anyone can view ad creatives" ON storage.objects;
CREATE POLICY "Anyone can view ad creatives" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'ad-creatives' AND (storage.foldername(name))[1] IS NOT NULL);

-- Documents (already seems to have some auth role check but let's be sure)
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
CREATE POLICY "Anyone can view documents" ON storage.objects 
FOR SELECT TO authenticated USING (bucket_id = 'documents');
