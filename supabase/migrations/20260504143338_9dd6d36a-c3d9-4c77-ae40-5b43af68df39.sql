-- Tabela para histórico de status das artes
CREATE TABLE public.art_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    art_id UUID NOT NULL REFERENCES public.arts(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    staff_member_id UUID REFERENCES public.staff_members(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.art_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Histórico de status visível para todos os membros da equipe" 
ON public.art_status_history FOR SELECT USING (true);

CREATE POLICY "Membros da equipe podem inserir histórico" 
ON public.art_status_history FOR INSERT WITH CHECK (true);

-- Tabela para sessões de atividade
CREATE TABLE public.staff_activity_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.staff_activity_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Sessões visíveis para todos os membros da equipe" 
ON public.staff_activity_sessions FOR SELECT USING (true);

CREATE POLICY "Membros da equipe podem gerenciar suas próprias sessões" 
ON public.staff_activity_sessions FOR ALL USING (true);

-- Função para registrar mudança de status
CREATE OR REPLACE FUNCTION public.log_art_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.art_status_history (art_id, status)
        VALUES (NEW.id, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho para a tabela arts
CREATE TRIGGER trigger_log_art_status_change
AFTER INSERT OR UPDATE ON public.arts
FOR EACH ROW
EXECUTE FUNCTION public.log_art_status_change();
