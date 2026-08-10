-- Create bucket for client logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true);

-- Create bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Policies for client-logos bucket
CREATE POLICY "Admins can upload client logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update client logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete client logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can view client logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- Policies for avatars bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');