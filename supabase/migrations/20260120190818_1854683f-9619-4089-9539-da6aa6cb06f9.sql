-- Create client_products table for 4P framework
CREATE TABLE public.client_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  cost NUMERIC(10,2),
  category TEXT,
  features TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Staff can manage client products"
ON public.client_products
FOR ALL
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can view all client products"
ON public.client_products
FOR SELECT
USING (is_staff(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_client_products_updated_at
BEFORE UPDATE ON public.client_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 4P Framework
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order, is_active)
VALUES (
  '4p-marketing',
  '4Ps do Marketing (Mix de Marketing)',
  'Estruturar a estratégia de marketing baseada em Produto, Preço, Praça e Promoção para otimizar o posicionamento de mercado.',
  'Quando precisar definir ou revisar a estratégia comercial completa do negócio, incluindo catálogo de produtos e precificação.',
  3,
  true
);

-- Insert 4P Framework Questions
INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  id,
  1,
  'Quais são os principais produtos/serviços oferecidos? (Use o catálogo abaixo para detalhar)',
  'textarea',
  'Liste os produtos/serviços principais, diferenciais e benefícios...',
  true
FROM frameworks WHERE slug = '4p-marketing';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  id,
  2,
  'Qual a estratégia de precificação? (Premium, competitivo, penetração, skimming)',
  'textarea',
  'Descreva como os preços são definidos e posicionados em relação à concorrência...',
  true
FROM frameworks WHERE slug = '4p-marketing';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  id,
  3,
  'Quais os canais de distribuição e venda? (Praça)',
  'textarea',
  'Loja física, e-commerce, marketplace, distribuidores, representantes...',
  true
FROM frameworks WHERE slug = '4p-marketing';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  id,
  4,
  'Quais estratégias de promoção e comunicação são utilizadas?',
  'textarea',
  'Publicidade, marketing digital, eventos, parcerias, indicações...',
  true
FROM frameworks WHERE slug = '4p-marketing';

-- Insert Foco do Mês Framework
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order, is_active)
VALUES (
  'monthly-focus',
  'Foco do Mês',
  'Definir as prioridades e temas que o cliente deseja abordar no período para alinhar todo o planejamento estratégico.',
  'No início de cada mês de consultoria para direcionar todas as ações e conteúdos.',
  1,
  true
);

-- Insert Foco do Mês Questions
INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  id,
  1,
  'Qual o principal objetivo/meta deste mês?',
  'textarea',
  'Ex: Aumentar vendas do produto X, lançar nova campanha, fortalecer presença digital...',
  true
FROM frameworks WHERE slug = 'monthly-focus';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  id,
  2,
  'Quais temas ou assuntos você quer abordar nos conteúdos?',
  'textarea',
  'Ex: Novidades do setor, datas comemorativas, lançamentos, dores do cliente...',
  true
FROM frameworks WHERE slug = 'monthly-focus';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  id,
  3,
  'Existe algum evento, promoção ou data especial neste mês?',
  'textarea',
  'Ex: Black Friday, aniversário da empresa, feira do setor, lançamento de produto...',
  false
FROM frameworks WHERE slug = 'monthly-focus';

-- Optimize 3A3R Framework - delete redundant questions and keep 6 essential ones
DELETE FROM public.framework_answers 
WHERE question_id IN (
  SELECT id FROM public.framework_questions 
  WHERE framework_id = (SELECT id FROM frameworks WHERE slug = '3a3r')
  AND question_order > 6
);

DELETE FROM public.framework_questions 
WHERE framework_id = (SELECT id FROM frameworks WHERE slug = '3a3r')
AND question_order > 6;

-- Merge Persona into STP - add key persona fields to STP
INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  id,
  4,
  'Quais as principais dores e objeções do público-alvo?',
  'textarea',
  'Medos, frustrações, barreiras de compra, objeções comuns...',
  false
FROM frameworks WHERE slug = 'stp';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  id,
  5,
  'Onde o público-alvo consome conteúdo e toma decisões de compra?',
  'textarea',
  'Redes sociais preferidas, sites, influenciadores, comunidades...',
  false
FROM frameworks WHERE slug = 'stp';

-- Update FRAMEWORK_ICONS in constants by adding new icons
-- Add diy_trends column to client_strategic_data if not already captured
-- We'll use data_key = 'diy_trends' for this

-- Add monthly_focus column to consulting_months for easier access
ALTER TABLE public.consulting_months 
ADD COLUMN IF NOT EXISTS monthly_focus TEXT;