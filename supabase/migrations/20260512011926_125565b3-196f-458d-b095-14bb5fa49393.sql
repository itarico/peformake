-- Add columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS contract_model TEXT DEFAULT 'MRR',
ADD COLUMN IF NOT EXISTS setup_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_file_url TEXT;

-- Create storage bucket for contracts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-contracts', 'client-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-contracts (Simplified to check authenticated users)
CREATE POLICY "Authenticated users can view contracts" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'client-contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload contracts" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'client-contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update contracts" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'client-contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete contracts" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'client-contracts' AND auth.role() = 'authenticated');