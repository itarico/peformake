-- Adiciona suporte a vinculação de clientes e lógica de produtividade nos squads
ALTER TABLE public.staff_squads 
ADD COLUMN IF NOT EXISTS client_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_logic JSONB DEFAULT '{"type": "task_completion", "weight": {"deadline": 0.4, "quality": 0.6}}'::jsonb;

-- Comentário para documentação
COMMENT ON COLUMN public.staff_squads.client_ids IS 'Lista de IDs de clientes atendidos por este squad';
COMMENT ON COLUMN public.staff_squads.source_logic IS 'Configuração da fonte de dados e pesos para o cálculo de produtividade';
