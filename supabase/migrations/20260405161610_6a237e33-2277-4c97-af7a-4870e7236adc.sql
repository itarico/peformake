
-- Create client_files table for directory/storage feature
CREATE TABLE public.client_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'outros',
  is_external_link BOOLEAN NOT NULL DEFAULT false,
  uploaded_by_staff_id UUID REFERENCES public.staff_members(id),
  file_size BIGINT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read files
CREATE POLICY "Staff can view client files"
  ON public.client_files FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert files
CREATE POLICY "Staff can insert client files"
  ON public.client_files FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to delete files
CREATE POLICY "Staff can delete client files"
  ON public.client_files FOR DELETE
  TO authenticated
  USING (true);

-- Allow authenticated users to update files
CREATE POLICY "Staff can update client files"
  ON public.client_files FOR UPDATE
  TO authenticated
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_client_files_updated_at
  BEFORE UPDATE ON public.client_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add column to staff_members for visibility config
ALTER TABLE public.staff_members 
  ADD COLUMN IF NOT EXISTS show_financial BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_commission BOOLEAN DEFAULT true;
