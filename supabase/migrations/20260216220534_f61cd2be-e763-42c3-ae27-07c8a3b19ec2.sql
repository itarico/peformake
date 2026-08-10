
-- Storage bucket for ad creatives
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-creatives', 'ad-creatives', true);

-- Anyone can view ad creatives
CREATE POLICY "Public can view ad creatives"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-creatives');

-- Staff can upload ad creatives
CREATE POLICY "Staff can upload ad creatives"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ad-creatives' AND is_staff(auth.uid()));

-- Staff can update ad creatives
CREATE POLICY "Staff can update ad creatives"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ad-creatives' AND is_staff(auth.uid()));

-- Staff can delete ad creatives
CREATE POLICY "Staff can delete ad creatives"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ad-creatives' AND is_staff(auth.uid()));
