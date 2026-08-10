-- Create storage bucket for reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('reference-images', 'reference-images', true);

-- Create storage bucket for final arts
INSERT INTO storage.buckets (id, name, public)
VALUES ('final-arts', 'final-arts', true);

-- RLS policies for reference-images bucket
CREATE POLICY "Staff can upload reference images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reference-images' 
  AND public.is_staff(auth.uid())
);

CREATE POLICY "Anyone can view reference images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reference-images');

CREATE POLICY "Staff can delete reference images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reference-images' 
  AND public.is_staff(auth.uid())
);

-- RLS policies for final-arts bucket
CREATE POLICY "Designers can upload final arts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'final-arts' 
  AND (public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'designer'))
);

CREATE POLICY "Anyone can view final arts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'final-arts');

CREATE POLICY "Staff and designers can delete final arts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'final-arts' 
  AND (public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'designer'))
);