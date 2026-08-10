-- Add commission columns to staff_members table
ALTER TABLE public.staff_members 
ADD COLUMN IF NOT EXISTS indication_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS double_goal_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS early_delivery_commission NUMERIC DEFAULT 0;

-- Update RLS if needed (usually staff_members is already managed)
COMMENT ON COLUMN public.staff_members.indication_commission IS 'Comissão por indicação (porcentagem)';
COMMENT ON COLUMN public.staff_members.double_goal_commission IS 'Comissão por meta dobrada (porcentagem)';
COMMENT ON COLUMN public.staff_members.early_delivery_commission IS 'Comissão por entrega antes do prazo (porcentagem)';
