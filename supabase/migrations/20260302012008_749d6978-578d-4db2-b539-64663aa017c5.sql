
-- Commission checklists: tracks criteria completion per staff/client/month
CREATE TABLE public.commission_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  staff_member_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  criteria_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  declared_at timestamp with time zone,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_reason text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(year, month, client_id, staff_member_id, criteria_key)
);

ALTER TABLE public.commission_checklists ENABLE ROW LEVEL SECURITY;

-- Staff can view their own checklists
CREATE POLICY "Staff can view own checklists"
  ON public.commission_checklists FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- Staff can declare (insert/update) their own checklists
CREATE POLICY "Staff can declare own checklists"
  ON public.commission_checklists FOR INSERT
  TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update own checklists"
  ON public.commission_checklists FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()));

-- Admin can manage all checklists
CREATE POLICY "Admin can manage all checklists"
  ON public.commission_checklists FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add commission_percent column to staff if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'staff_members' AND column_name = 'commission_percent'
  ) THEN
    ALTER TABLE public.staff_members ADD COLUMN commission_percent numeric NOT NULL DEFAULT 0;
  END IF;
END $$;
