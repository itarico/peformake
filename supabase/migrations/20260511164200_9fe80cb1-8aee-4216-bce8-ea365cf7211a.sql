CREATE OR REPLACE FUNCTION public.reset_financial_data(include_services boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Delete other revenues and expenses
    DELETE FROM public.other_revenues;
    DELETE FROM public.agency_expenses;
    DELETE FROM public.client_expenses;
    DELETE FROM public.financial_goals;
    
    -- Optionally delete client services (contracts)
    IF include_services THEN
        DELETE FROM public.client_services;
    END IF;
END;
$function$;