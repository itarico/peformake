-- Table for agent training files (PDF, XLS, DOC uploads)
CREATE TABLE public.crm_agent_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  parsed_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_agent_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage agent files"
  ON public.crm_agent_files FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can view agent files"
  ON public.crm_agent_files FOR SELECT
  USING (true);