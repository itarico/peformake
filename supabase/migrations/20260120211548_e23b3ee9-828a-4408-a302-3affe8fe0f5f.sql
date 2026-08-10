-- 1. Inserir Phelipe na tabela staff_members (se não existir)
INSERT INTO public.staff_members (full_name, email, phone, role, cost_per_art, is_active)
SELECT 'Phelipe', 'iphilippesilva@gmail.com', '81 8589-0254', 'designer', 25, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_members WHERE full_name = 'Phelipe'
);

-- 2. Atualizar designer Phelipe para vincular ao staff_member
UPDATE public.designers 
SET staff_member_id = (
  SELECT id FROM public.staff_members WHERE full_name = 'Phelipe' LIMIT 1
)
WHERE name = 'Phelipe' AND staff_member_id IS NULL;

-- 3. Atualizar função para só gerar work_months e artes se has_design_service = true
CREATE OR REPLACE FUNCTION public.generate_client_work_months()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_date_val DATE := CURRENT_DATE;
  start_year INTEGER := EXTRACT(YEAR FROM current_date_val);
  start_month INTEGER := EXTRACT(MONTH FROM current_date_val);
  i INTEGER;
  calc_year INTEGER;
  calc_month INTEGER;
  new_work_month_id UUID;
  j INTEGER;
BEGIN
  -- Só gerar work_months e artes se o serviço de design estiver ativo
  IF NEW.has_design_service = true THEN
    FOR i IN 0..(NEW.contract_months - 1) LOOP
      calc_month := start_month + i;
      calc_year := start_year;
      
      WHILE calc_month > 12 LOOP
        calc_month := calc_month - 12;
        calc_year := calc_year + 1;
      END LOOP;
      
      -- Inserir mês de trabalho
      INSERT INTO public.work_months (client_id, year, month)
      VALUES (NEW.id, calc_year, calc_month)
      RETURNING id INTO new_work_month_id;
      
      -- Gerar artes vazias para o mês
      FOR j IN 1..NEW.arts_per_month LOOP
        INSERT INTO public.arts (work_month_id, art_number)
        VALUES (new_work_month_id, j);
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;