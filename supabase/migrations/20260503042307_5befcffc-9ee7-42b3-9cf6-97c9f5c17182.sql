-- Create storage bucket for staff proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('staff-proofs', 'staff-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for staff-proofs
CREATE POLICY "Public Read Staff Proofs" ON storage.objects FOR SELECT USING (bucket_id = 'staff-proofs');
CREATE POLICY "Authenticated Upload Staff Proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'staff-proofs');
