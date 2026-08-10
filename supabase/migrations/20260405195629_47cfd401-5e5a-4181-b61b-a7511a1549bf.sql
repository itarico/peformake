
CREATE OR REPLACE FUNCTION public.auto_create_staff_payment_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_client_payments (staff_member_id, client_id, payment_value)
  VALUES (NEW.staff_member_id, NEW.client_id, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_staff_payment
AFTER INSERT ON public.client_team_assignments
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_staff_payment_on_assignment();

-- Also add unique constraint to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_client_payments_staff_client_unique'
  ) THEN
    ALTER TABLE public.staff_client_payments
    ADD CONSTRAINT staff_client_payments_staff_client_unique UNIQUE (staff_member_id, client_id);
  END IF;
END $$;
