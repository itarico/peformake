ALTER TABLE public.sdr_leads 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS selected_services JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS contract_duration INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS company_revenue_bracket TEXT,
ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'MRR';

-- Update existing data if needed (optional)
UPDATE public.sdr_leads 
SET company_revenue_bracket = CASE 
    WHEN estimated_value <= 15000 THEN 'Abaixo de R$ 20k'
    WHEN estimated_value <= 35000 THEN 'R$ 20k - R$ 50k'
    WHEN estimated_value <= 75000 THEN 'R$ 50k - R$ 100k'
    ELSE 'Acima de R$ 100k'
END
WHERE estimated_value > 0 AND company_revenue_bracket IS NULL;
