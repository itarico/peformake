-- Make client_id nullable for agency-level quotes
ALTER TABLE public.crm_quotes ALTER COLUMN client_id DROP NOT NULL;