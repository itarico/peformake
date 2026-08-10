ALTER TABLE public.sdr_kpi_configs ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 0;

-- Update existing records with some default counts based on standard Peformake targets
UPDATE public.sdr_kpi_configs SET target_count = 100 WHERE metric_name = 'Leads Totais' OR metric_name ILIKE '%Leads%';
UPDATE public.sdr_kpi_configs SET target_count = 40 WHERE metric_name = 'Calls Marcadas' OR metric_name ILIKE '%Agendamento%';
UPDATE public.sdr_kpi_configs SET target_count = 15 WHERE metric_name = 'Vendas' OR metric_name ILIKE '%Vendas%';
