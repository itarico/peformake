CREATE TABLE public.quiz_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  score integer DEFAULT 0,
  level text DEFAULT 'desorganizado',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public quiz submission" ON public.quiz_leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can read quiz leads" ON public.quiz_leads
  FOR SELECT TO authenticated USING (true);