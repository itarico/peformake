-- Squad management tables
CREATE TABLE public.staff_squads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_squad_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    squad_id UUID NOT NULL REFERENCES public.staff_squads(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    role TEXT, -- Optional override role in this squad
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(squad_id, staff_id)
);

CREATE TABLE public.client_squad_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    squad_id UUID NOT NULL REFERENCES public.staff_squads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(client_id, squad_id)
);

-- Enhance goal templates with target roles
ALTER TABLE public.staff_goal_templates ADD COLUMN target_role TEXT;

-- Enable RLS for new tables
ALTER TABLE public.staff_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_squad_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.staff_squads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.staff_squad_members FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.client_squad_assignments FOR ALL USING (auth.role() = 'authenticated');

-- Insert Predefined Goal Templates
INSERT INTO public.staff_goal_templates (name, description, target_value, measurement_unit, tracking_method, target_role) VALUES
('Postagem Mensal (Stories)', 'Publicação de stories diários para o cliente', 150, 'stories', 'manual', 'social_media'),
('Prazo de Entrega Design', 'Entrega de artes em até 24h após briefing', 100, '%', 'manual', 'designer'),
('SDR - Reuniões Agendadas', 'Agendamento de reuniões qualificadas', 20, 'reuniões', 'manual', 'sdr'),
('Líder - Retenção de Clientes', 'Taxa de retenção da equipe sob gestão', 95, '%', 'manual', 'admin'),
('Gestor - ROI em Tráfego', 'Retorno sobre investimento em anúncios', 3, 'x', 'manual', 'traffic_manager'),
('Gestor - Custo por Lead', 'Meta de custo por lead qualificado', 5, 'R$', 'manual', 'traffic_manager');

-- Add trigger for updated_at
CREATE TRIGGER update_staff_squads_updated_at BEFORE UPDATE ON public.staff_squads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
