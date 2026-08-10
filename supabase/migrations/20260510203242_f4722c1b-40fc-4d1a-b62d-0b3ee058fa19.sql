-- Função para preencher o designer_id na tabela arts automaticamente
CREATE OR REPLACE FUNCTION public.sync_art_designer_id()
RETURNS TRIGGER AS $$
DECLARE
    v_staff_id UUID;
BEGIN
    -- Busca o staff_member_id vinculado ao designer do cliente
    SELECT d.staff_member_id INTO v_staff_id
    FROM public.work_months wm
    JOIN public.clients c ON wm.client_id = c.id
    JOIN public.designers d ON c.designer_id = d.id
    WHERE wm.id = NEW.work_month_id;

    IF v_staff_id IS NOT NULL THEN
        NEW.designer_id := v_staff_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novas artes ou mudanças de work_month
DROP TRIGGER IF EXISTS tr_sync_art_designer_id ON public.arts;
CREATE TRIGGER tr_sync_art_designer_id
BEFORE INSERT OR UPDATE OF work_month_id ON public.arts
FOR EACH ROW EXECUTE FUNCTION public.sync_art_designer_id();

-- Função para registrar a conclusão do briefing (SLA)
CREATE OR REPLACE FUNCTION public.log_briefing_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudar de 'pending_briefing' para algo que indique produção iniciada
    IF (OLD.status = 'pending_briefing' OR OLD.status IS NULL) AND 
       (NEW.status IN ('ready_for_production', 'in_production', 'awaiting_approval')) THEN
        NEW.briefing_completed_at := now();
    END IF;

    -- Se a arte for aprovada, garantir que completed_at está setado
    IF (NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved')) THEN
        NEW.completed_at := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para conclusão de briefing e aprovação
DROP TRIGGER IF EXISTS tr_log_briefing_completion ON public.arts;
CREATE TRIGGER tr_log_briefing_completion
BEFORE INSERT OR UPDATE OF status ON public.arts
FOR EACH ROW EXECUTE FUNCTION public.log_briefing_completion();

-- Atualização retroativa das artes
-- 1. Preencher designer_id baseado no cliente
UPDATE public.arts a
SET designer_id = d.staff_member_id
FROM public.work_months wm
JOIN public.clients c ON wm.client_id = c.id
JOIN public.designers d ON c.designer_id = d.id
WHERE a.work_month_id = wm.id
  AND a.designer_id IS NULL;

-- 2. Preencher briefing_completed_at para artes que já passaram do estágio inicial
UPDATE public.arts
SET briefing_completed_at = created_at
WHERE briefing_completed_at IS NULL 
  AND status NOT IN ('pending_briefing');

-- 3. Garantir completed_at para artes aprovadas
UPDATE public.arts
SET completed_at = updated_at
WHERE completed_at IS NULL 
  AND status = 'approved';
