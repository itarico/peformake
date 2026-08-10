DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload avatars'
  ) THEN
    CREATE POLICY "Admins can upload avatars"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update avatars'
  ) THEN
    CREATE POLICY "Admins can update avatars"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND has_role(auth.uid(), 'admin'::public.app_role)
    )
    WITH CHECK (
      bucket_id = 'avatars'
      AND has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete avatars'
  ) THEN
    CREATE POLICY "Admins can delete avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;