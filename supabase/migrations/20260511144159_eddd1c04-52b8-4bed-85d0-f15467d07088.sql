-- Add billing_day to clients
ALTER TABLE public.clients ADD COLUMN billing_day INTEGER DEFAULT 1 CHECK (billing_day >= 1 AND billing_day <= 31);

-- Function to clear financial data
CREATE OR REPLACE FUNCTION public.reset_financial_data(include_services BOOLEAN DEFAULT FALSE)
RETURNS void AS $$
BEGIN
    -- Delete other revenues and expenses
    DELETE FROM public.other_revenues;
    DELETE FROM public.agency_expenses;
    DELETE FROM public.client_expenses;
    
    -- Optionally delete client services (contracts)
    IF include_services THEN
        DELETE FROM public.client_services;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
