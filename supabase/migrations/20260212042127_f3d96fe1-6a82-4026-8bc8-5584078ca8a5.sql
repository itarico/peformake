
ALTER TABLE public.client_team_assignments 
ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.client_team_assignments.commission_percent IS 'Porcentagem de comissão do membro sobre o valor do serviço atribuído ao cliente';
