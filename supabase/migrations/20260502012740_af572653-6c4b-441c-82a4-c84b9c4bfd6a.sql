-- Add entity column to agency_expenses
ALTER TABLE public.agency_expenses 
ADD COLUMN IF NOT EXISTS entity TEXT DEFAULT 'peformake' CHECK (entity IN ('peformake', 'ellcazo')),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending')),
ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT CURRENT_DATE;

-- Add entity column to staff_members
ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS entity TEXT DEFAULT 'peformake' CHECK (entity IN ('peformake', 'ellcazo'));

-- Create other_revenues table for one-off services
CREATE TABLE IF NOT EXISTS public.other_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  entity TEXT NOT NULL DEFAULT 'peformake' CHECK (entity IN ('peformake', 'ellcazo')),
  category TEXT,
  client_id UUID REFERENCES public.clients(id),
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.other_revenues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable all for authenticated users" ON public.other_revenues
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_other_revenues_updated_at
BEFORE UPDATE ON public.other_revenues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
