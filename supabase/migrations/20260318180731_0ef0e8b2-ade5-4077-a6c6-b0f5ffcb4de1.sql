
-- Drop restrictive policies on reference-images
DROP POLICY IF EXISTS "Staff can upload reference images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete reference images" ON storage.objects;

-- Allow anyone to upload reference images (staff use non-auth sessions)
CREATE POLICY "Anyone can upload reference images"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'reference-images');

-- Allow anyone to delete reference images
CREATE POLICY "Anyone can delete reference images"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'reference-images');

-- Allow anyone to update reference images
CREATE POLICY "Anyone can update reference images"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'reference-images');
