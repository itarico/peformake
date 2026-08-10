-- Meta Templates (Goals)
CREATE TABLE public.staff_goal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    role_type TEXT, -- e.g., 'social_media', 'designer', 'admin'
    tracking_method TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'automatic_arts', 'automatic_stories', 'automatic_revenue'
    target_value NUMERIC NOT NULL,
    measurement_unit TEXT, -- 'units', 'percentage', 'currency'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Commission Templates
CREATE TABLE public.staff_commission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    commission_type TEXT NOT NULL, -- 'percentage_revenue', 'fixed_amount', 'referral'
    value NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Assigned goals to staff
CREATE TABLE public.staff_assigned_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.staff_goal_templates(id),
    custom_target_value NUMERIC,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    current_value NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'achieved', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff KPIs
CREATE TABLE public.staff_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
    kpi_name TEXT NOT NULL,
    kpi_value NUMERIC NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update staff_activity_proofs to allow multiple files and link to goals
ALTER TABLE public.staff_activity_proofs 
ADD COLUMN goal_id UUID REFERENCES public.staff_assigned_goals(id),
ADD COLUMN files TEXT[]; -- Array of URLs for multiple uploads

-- Enable RLS
ALTER TABLE public.staff_goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_commission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assigned_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_kpis ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public Read Goal Templates" ON public.staff_goal_templates FOR SELECT USING (true);
CREATE POLICY "Public Read Commission Templates" ON public.staff_commission_templates FOR SELECT USING (true);
CREATE POLICY "Public Read Assigned Goals" ON public.staff_assigned_goals FOR SELECT USING (true);
CREATE POLICY "Public Read Staff KPIs" ON public.staff_kpis FOR SELECT USING (true);

-- Insert some initial templates
INSERT INTO public.staff_goal_templates (name, description, role_type, tracking_method, target_value, measurement_unit) VALUES
('Stories por Mês', 'Quantidade mínima de stories postados para todos os clientes.', 'social_media', 'manual', 150, 'units'),
('Entrega em 24h', 'Percentual de artes entregues no prazo de 24h.', 'designer', 'automatic_arts', 100, 'percentage'),
('Retenção de Clientes', 'Percentual de clientes mantidos no mês.', 'all', 'automatic_revenue', 95, 'percentage'),
('Reuniões Fechadas', 'Quantidade de reuniões de prospecção fechadas.', 'admin', 'manual', 5, 'units');

INSERT INTO public.staff_commission_templates (name, description, commission_type, value) VALUES
('Indicação de Cliente', 'Bônus por indicação de novo cliente que fechou contrato.', 'fixed_amount', 500),
('Bônus de Performance', 'Bônus por bater 110% da meta de entrega.', 'percentage_revenue', 5),
('Meta Excedente', 'Valor fixo por item entregue além do pacote.', 'fixed_amount', 20);
