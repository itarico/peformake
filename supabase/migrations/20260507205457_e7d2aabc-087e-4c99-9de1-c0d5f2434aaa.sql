-- Create KPI configuration table
CREATE TABLE IF NOT EXISTS public.sdr_kpi_configs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    stage_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    target_value NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for KPI configs
ALTER TABLE public.sdr_kpi_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view active KPI configs" ON public.sdr_kpi_configs FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage KPI configs" ON public.sdr_kpi_configs FOR ALL USING (true);

-- Create tactics and processes table
CREATE TABLE IF NOT EXISTS public.sdr_stage_tactics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    stage_key TEXT NOT NULL, -- e.g., 'contato_inicial', 'qualificacao'
    title TEXT NOT NULL,
    description TEXT,
    checklist TEXT[], -- Array of strings for checklist items
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for tactics
ALTER TABLE public.sdr_stage_tactics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view tactics" ON public.sdr_stage_tactics FOR SELECT USING (true);

-- Create strategy steps (tree/tree-like structure)
CREATE TABLE IF NOT EXISTS public.sdr_strategy_steps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    step_key TEXT NOT NULL UNIQUE, -- 'form_preenchido', 'qualificacao', 'lead_quente', 'lead_frio'
    label TEXT NOT NULL,
    description TEXT,
    next_steps_instructions TEXT,
    methodology_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for strategy steps
ALTER TABLE public.sdr_strategy_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view strategy steps" ON public.sdr_strategy_steps FOR SELECT USING (true);

-- Update sdr_scripts to support profiling and stages
ALTER TABLE public.sdr_scripts 
ADD COLUMN IF NOT EXISTS target_profile TEXT DEFAULT 'all', -- 'quente', 'frio', 'inbound', 'all'
ADD COLUMN IF NOT EXISTS strategy_step_key TEXT; -- Links to sdr_strategy_steps.step_key

-- Insert default KPI configurations
INSERT INTO public.sdr_kpi_configs (stage_name, metric_name, target_value)
VALUES 
('WhatsApp/Form', 'Taxa de Contato', 80),
('Qualificação', 'Taxa de Resposta', 40),
('Agendamento', 'Taxa de Agendamento', 25);

-- Insert initial strategy steps
INSERT INTO public.sdr_strategy_steps (step_key, label, description, next_steps_instructions, methodology_info)
VALUES 
('form_preenchido', 'Formulário Preenchido', 'Lead acabou de converter no site.', 'Fazer contato em menos de 5 minutos via WhatsApp.', 'Velocidade é o KPI principal aqui.'),
('qualificacao', 'Em Qualificação', 'Diálogo iniciado para entender perfil.', 'Aplicar SPIN Selling para descobrir dor e urgência.', 'Framework: SPIN (Situação, Problema, Implicação, Necessidade).'),
('lead_quente', 'Lead Quente (Hot)', 'Perfil ideal com dor latente.', 'Acelerar para call de fechamento/agendamento.', 'Prioridade total na agenda.'),
('lead_frio', 'Lead Frio (Cold)', 'Lead prospectado ou desengajado.', 'Nutrição e cold call estruturada.', 'Framework: Rapport rápido e quebra de padrão.');
