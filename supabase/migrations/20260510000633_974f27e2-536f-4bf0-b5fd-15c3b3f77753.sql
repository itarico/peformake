ALTER TABLE public.clients 
ADD COLUMN client_type TEXT DEFAULT 'recurring' CHECK (client_type IN ('recurring', 'one-off'));

COMMENT ON COLUMN public.clients.client_type IS 'Tipo do cliente: recurring (fixo/mensal) ou one-off (avulso).';