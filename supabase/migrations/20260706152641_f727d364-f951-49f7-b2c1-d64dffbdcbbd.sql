
CREATE POLICY "Authenticated read weekly-plan-media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'weekly-plan-media');

CREATE POLICY "Authenticated insert weekly-plan-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'weekly-plan-media');

CREATE POLICY "Authenticated update weekly-plan-media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'weekly-plan-media');

CREATE POLICY "Authenticated delete weekly-plan-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'weekly-plan-media');
