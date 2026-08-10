
-- Add audiovisual service flag and team-assignment helper
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS has_audiovisual_service boolean NOT NULL DEFAULT false;

-- Backfill from existing client_services where slug is producao_audiovisual / captacao / edicao
UPDATE public.clients c
SET has_audiovisual_service = true
WHERE EXISTS (
  SELECT 1 FROM public.client_services cs
  JOIN public.services s ON s.id = cs.service_id
  WHERE cs.client_id = c.id
    AND cs.is_active = true
    AND s.slug IN ('producao_audiovisual','captacao','edicao')
);

-- Backfill from clients that already have audiovisual_projects
UPDATE public.clients c
SET has_audiovisual_service = true
WHERE EXISTS (SELECT 1 FROM public.audiovisual_projects ap WHERE ap.client_id = c.id);

-- Function to auto-create monthly capture project for AV clients
CREATE OR REPLACE FUNCTION public.ensure_monthly_audiovisual_projects()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month int := EXTRACT(MONTH FROM CURRENT_DATE);
  v_created int := 0;
BEGIN
  FOR v_client IN 
    SELECT id, name FROM public.clients 
    WHERE is_active = true AND has_audiovisual_service = true
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.audiovisual_projects
      WHERE client_id = v_client.id
        AND year = v_year AND month = v_month
        AND kind = 'monthly'
    ) THEN
      INSERT INTO public.audiovisual_projects (
        client_id, kind, title, year, month, status
      ) VALUES (
        v_client.id, 'monthly',
        'Captação Mensal - ' || v_month || '/' || v_year,
        v_year, v_month, 'awaiting_capture'
      );
      v_created := v_created + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('created', v_created, 'year', v_year, 'month', v_month);
END;
$$;

-- Trigger: when a client gains has_audiovisual_service, create the current month's project
CREATE OR REPLACE FUNCTION public.create_av_project_on_service_enable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month int := EXTRACT(MONTH FROM CURRENT_DATE);
BEGIN
  IF NEW.has_audiovisual_service = true 
     AND (TG_OP = 'INSERT' OR OLD.has_audiovisual_service IS DISTINCT FROM NEW.has_audiovisual_service) THEN
    INSERT INTO public.audiovisual_projects (
      client_id, kind, title, year, month, status
    )
    SELECT NEW.id, 'monthly',
      'Captação Mensal - ' || v_month || '/' || v_year,
      v_year, v_month, 'awaiting_capture'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.audiovisual_projects
      WHERE client_id = NEW.id AND year = v_year AND month = v_month AND kind = 'monthly'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_av_project_on_service_enable ON public.clients;
CREATE TRIGGER trg_create_av_project_on_service_enable
AFTER INSERT OR UPDATE OF has_audiovisual_service ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.create_av_project_on_service_enable();

-- Run once now to ensure current month projects exist for already-flagged clients
SELECT public.ensure_monthly_audiovisual_projects();
