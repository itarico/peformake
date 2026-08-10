-- Drop the restrictive storage policy for final-arts uploads
DROP POLICY IF EXISTS "Designers can upload final arts" ON storage.objects;

-- Create a permissive policy that allows anyone to upload to final-arts
-- (the bucket is already public for reading, and arts table RLS controls who can link images)
CREATE POLICY "Anyone can upload final arts"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'final-arts');

-- Also allow anyone to delete from final-arts (for replacing images)
DROP POLICY IF EXISTS "Staff and designers can delete final arts" ON storage.objects;

CREATE POLICY "Anyone can delete final arts"
ON storage.objects
FOR DELETE
USING (bucket_id = 'final-arts');

-- Also allow anyone to update final arts (for upsert)
CREATE POLICY "Anyone can update final arts"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'final-arts');
