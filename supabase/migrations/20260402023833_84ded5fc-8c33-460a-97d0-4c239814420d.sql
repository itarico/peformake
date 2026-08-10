
ALTER TABLE public.crm_sales 
  ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT NULL;

-- Allow public to update crm_sales (for confirm/reject from portal)
CREATE POLICY "Public can update crm sales"
ON public.crm_sales
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
