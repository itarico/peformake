-- Add foreign key to other_revenues if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'other_revenues_client_id_fkey') THEN
        ALTER TABLE public.other_revenues 
        ADD CONSTRAINT other_revenues_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key to agency_expenses if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'agency_expenses_client_id_fkey') THEN
        ALTER TABLE public.agency_expenses 
        ADD CONSTRAINT agency_expenses_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;
