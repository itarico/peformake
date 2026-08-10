-- =====================================================
-- CONSULTING SERVICE - COMPLETE MIGRATION
-- =====================================================

-- 1. FRAMEWORKS CATALOG
CREATE TABLE public.frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  when_to_use TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. FRAMEWORK QUESTIONS
CREATE TABLE public.framework_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID REFERENCES public.frameworks(id) ON DELETE CASCADE NOT NULL,
  question_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'textarea',
  placeholder TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CONSULTING MONTHS
CREATE TABLE public.consulting_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  is_complete BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, year, month)
);

-- 4. FRAMEWORK INSTANCES
CREATE TABLE public.framework_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulting_month_id UUID REFERENCES public.consulting_months(id) ON DELETE CASCADE NOT NULL,
  framework_id UUID REFERENCES public.frameworks(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. FRAMEWORK ANSWERS
CREATE TABLE public.framework_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.framework_instances(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.framework_questions(id) NOT NULL,
  answer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (instance_id, question_id)
);

-- 6. AI ANALYSES
CREATE TABLE public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.framework_instances(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL,
  analysis_scope TEXT NOT NULL DEFAULT 'framework',
  content TEXT NOT NULL,
  prompt_version TEXT DEFAULT '1.0',
  model_used TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. CLIENT STRATEGIC DATA
CREATE TABLE public.client_strategic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  data_key TEXT NOT NULL,
  data_value TEXT NOT NULL,
  source_framework TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, data_key)
);

-- 8. ALTER CLIENTS TABLE
ALTER TABLE public.clients 
ADD COLUMN has_consulting_service BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN has_design_service BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN consulting_months_contracted INTEGER DEFAULT 0,
ADD COLUMN consulting_price_per_month NUMERIC(10,2) DEFAULT 0;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_framework_questions_framework ON public.framework_questions(framework_id);
CREATE INDEX idx_consulting_months_client ON public.consulting_months(client_id);
CREATE INDEX idx_consulting_months_period ON public.consulting_months(year, month);
CREATE INDEX idx_framework_instances_month ON public.framework_instances(consulting_month_id);
CREATE INDEX idx_framework_instances_framework ON public.framework_instances(framework_id);
CREATE INDEX idx_framework_answers_instance ON public.framework_answers(instance_id);
CREATE INDEX idx_ai_analyses_instance ON public.ai_analyses(instance_id);
CREATE INDEX idx_client_strategic_data_client ON public.client_strategic_data(client_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE TRIGGER update_consulting_months_updated_at
  BEFORE UPDATE ON public.consulting_months
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_framework_instances_updated_at
  BEFORE UPDATE ON public.framework_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_framework_answers_updated_at
  BEFORE UPDATE ON public.framework_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_strategic_data_updated_at
  BEFORE UPDATE ON public.client_strategic_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TRIGGER: GENERATE CONSULTING MONTHS ON CLIENT UPDATE
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_client_consulting_months()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_date_val DATE := CURRENT_DATE;
  start_year INTEGER := EXTRACT(YEAR FROM current_date_val);
  start_month INTEGER := EXTRACT(MONTH FROM current_date_val);
  i INTEGER;
  calc_year INTEGER;
  calc_month INTEGER;
BEGIN
  -- Only generate if consulting service is being enabled
  IF NEW.has_consulting_service = true AND 
     (OLD.has_consulting_service = false OR OLD.has_consulting_service IS NULL) AND
     NEW.consulting_months_contracted > 0 THEN
    
    FOR i IN 0..(NEW.consulting_months_contracted - 1) LOOP
      calc_month := start_month + i;
      calc_year := start_year;
      
      WHILE calc_month > 12 LOOP
        calc_month := calc_month - 12;
        calc_year := calc_year + 1;
      END LOOP;
      
      INSERT INTO public.consulting_months (client_id, year, month)
      VALUES (NEW.id, calc_year, calc_month)
      ON CONFLICT (client_id, year, month) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_consulting_months_on_client_update
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_consulting_months();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- FRAMEWORKS (read-only for authenticated)
ALTER TABLE public.frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view frameworks"
  ON public.frameworks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage frameworks"
  ON public.frameworks FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- FRAMEWORK QUESTIONS (read-only for authenticated)
ALTER TABLE public.framework_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view framework questions"
  ON public.framework_questions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage framework questions"
  ON public.framework_questions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- CONSULTING MONTHS
ALTER TABLE public.consulting_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all consulting months"
  ON public.consulting_months FOR SELECT
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can manage consulting months"
  ON public.consulting_months FOR ALL
  USING (is_staff(auth.uid()));

CREATE POLICY "Designer can view assigned client consulting months"
  ON public.consulting_months FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = consulting_months.client_id
    AND c.designer_id = get_designer_id(auth.uid())
  ));

-- FRAMEWORK INSTANCES
ALTER TABLE public.framework_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all framework instances"
  ON public.framework_instances FOR SELECT
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can manage framework instances"
  ON public.framework_instances FOR ALL
  USING (is_staff(auth.uid()));

CREATE POLICY "Designer can view assigned framework instances"
  ON public.framework_instances FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM consulting_months cm
    JOIN clients c ON c.id = cm.client_id
    WHERE cm.id = framework_instances.consulting_month_id
    AND c.designer_id = get_designer_id(auth.uid())
  ));

-- FRAMEWORK ANSWERS
ALTER TABLE public.framework_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all framework answers"
  ON public.framework_answers FOR SELECT
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can manage framework answers"
  ON public.framework_answers FOR ALL
  USING (is_staff(auth.uid()));

CREATE POLICY "Designer can view assigned framework answers"
  ON public.framework_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM framework_instances fi
    JOIN consulting_months cm ON cm.id = fi.consulting_month_id
    JOIN clients c ON c.id = cm.client_id
    WHERE fi.id = framework_answers.instance_id
    AND c.designer_id = get_designer_id(auth.uid())
  ));

-- AI ANALYSES
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all ai analyses"
  ON public.ai_analyses FOR SELECT
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can manage ai analyses"
  ON public.ai_analyses FOR ALL
  USING (is_staff(auth.uid()));

CREATE POLICY "Designer can view assigned ai analyses"
  ON public.ai_analyses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM framework_instances fi
    JOIN consulting_months cm ON cm.id = fi.consulting_month_id
    JOIN clients c ON c.id = cm.client_id
    WHERE fi.id = ai_analyses.instance_id
    AND c.designer_id = get_designer_id(auth.uid())
  ));

-- CLIENT STRATEGIC DATA
ALTER TABLE public.client_strategic_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all client strategic data"
  ON public.client_strategic_data FOR SELECT
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can manage client strategic data"
  ON public.client_strategic_data FOR ALL
  USING (is_staff(auth.uid()));

CREATE POLICY "Designer can view assigned client strategic data"
  ON public.client_strategic_data FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_strategic_data.client_id
    AND c.designer_id = get_designer_id(auth.uid())
  ));

-- =====================================================
-- SEED: FRAMEWORKS AND QUESTIONS
-- =====================================================

-- 1. SWOT
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order)
VALUES (
  'swot',
  'SWOT',
  'Diagnosticar forças, fraquezas, oportunidades e ameaças do negócio para embasar decisões estratégicas.',
  'No início do planejamento mensal ou quando há mudanças significativas no mercado ou no negócio.',
  1
);

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 1, 'Quais são as principais forças da empresa hoje?', 'Ex: Equipe qualificada, produto diferenciado, base de clientes fiel...'
FROM public.frameworks WHERE slug = 'swot';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 2, 'Quais fraquezas internas atrapalham o crescimento?', 'Ex: Falta de processos, equipe reduzida, baixa presença digital...'
FROM public.frameworks WHERE slug = 'swot';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 3, 'Quais oportunidades externas existem agora?', 'Ex: Tendências de mercado, sazonalidade favorável, novos canais...'
FROM public.frameworks WHERE slug = 'swot';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 4, 'Quais ameaças podem impactar o negócio?', 'Ex: Concorrência crescente, mudanças regulatórias, crise econômica...'
FROM public.frameworks WHERE slug = 'swot';

-- 2. STP
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order)
VALUES (
  'stp',
  'STP (Segmentação, Targeting, Posicionamento)',
  'Definir claramente o público-alvo e como a marca deve ser percebida por ele.',
  'Quando há necessidade de reposicionar a marca ou focar em um segmento específico.',
  2
);

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 1, 'Quais segmentos de público existem hoje?', 'Ex: Jovens profissionais, mães empreendedoras, empresas B2B...'
FROM public.frameworks WHERE slug = 'stp';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 2, 'Qual segmento é prioritário neste momento?', 'Descreva o segmento que deve receber foco nas ações deste mês...'
FROM public.frameworks WHERE slug = 'stp';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 3, 'Como a marca quer ser percebida por esse público?', 'Ex: Acessível e próxima, premium e exclusiva, inovadora e tecnológica...'
FROM public.frameworks WHERE slug = 'stp';

-- 3. PERSONA
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order)
VALUES (
  'persona',
  'Persona',
  'Criar um perfil detalhado do cliente ideal para direcionar comunicação e conteúdo.',
  'Para alinhar tom de voz, abordagem e canais de comunicação.',
  3
);

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 1, 'Dados demográficos principais', 'Idade, gênero, localização, faixa de renda...'
FROM public.frameworks WHERE slug = 'persona';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 2, 'Cargo / profissão', 'Qual a ocupação principal dessa persona?'
FROM public.frameworks WHERE slug = 'persona';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 3, 'Principais dores', 'Quais problemas essa pessoa enfrenta no dia a dia?'
FROM public.frameworks WHERE slug = 'persona';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 4, 'Principais objetivos', 'O que essa pessoa quer alcançar?'
FROM public.frameworks WHERE slug = 'persona';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 5, 'Medos e objeções', 'O que impede essa pessoa de comprar ou agir?'
FROM public.frameworks WHERE slug = 'persona';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 6, 'O que influencia decisões de compra?', 'Recomendações, reviews, preço, qualidade, marca...'
FROM public.frameworks WHERE slug = 'persona';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 7, 'Onde consome conteúdo?', 'Instagram, YouTube, podcasts, blogs, LinkedIn...'
FROM public.frameworks WHERE slug = 'persona';

-- 4. ONDE ESTÁ x PARA ONDE QUER IR
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order)
VALUES (
  'gap-analysis',
  'Onde Está → Para Onde Quer Ir',
  'Identificar o gap entre situação atual e objetivo desejado para definir prioridades.',
  'No início de cada mês para alinhar expectativas e definir metas realistas.',
  4
);

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 1, 'Onde o negócio está hoje (resultados reais)?', 'Faturamento, leads, seguidores, vendas, ticket médio...'
FROM public.frameworks WHERE slug = 'gap-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 2, 'Principais dificuldades atuais', 'O que está travando o crescimento agora?'
FROM public.frameworks WHERE slug = 'gap-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 3, 'Onde o cliente quer chegar em 3 meses?', 'Metas de médio prazo...'
FROM public.frameworks WHERE slug = 'gap-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 4, 'Onde quer chegar neste mês?', 'Meta específica para este mês...'
FROM public.frameworks WHERE slug = 'gap-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 5, 'O que impede esse avanço hoje?', 'Barreiras, gargalos, limitações...'
FROM public.frameworks WHERE slug = 'gap-analysis';

-- 5. 5W2H
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order)
VALUES (
  '5w2h',
  '5W2H',
  'Transformar estratégia em plano de ação estruturado e executável.',
  'Após definir prioridades, para criar um plano de ação claro.',
  5
);

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 1, 'O que precisa ser feito?', 'Descreva a ação ou projeto principal...'
FROM public.frameworks WHERE slug = '5w2h';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 2, 'Por que isso é importante agora?', 'Qual o impacto esperado dessa ação?'
FROM public.frameworks WHERE slug = '5w2h';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 3, 'Quem é responsável?', 'Quem vai executar e quem vai acompanhar?'
FROM public.frameworks WHERE slug = '5w2h';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 4, 'Quando será feito?', 'Prazo de início e conclusão...'
FROM public.frameworks WHERE slug = '5w2h';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 5, 'Onde será aplicado?', 'Canais, plataformas, locais...'
FROM public.frameworks WHERE slug = '5w2h';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 6, 'Como será executado?', 'Etapas, metodologia, ferramentas...'
FROM public.frameworks WHERE slug = '5w2h';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 7, 'Quanto vai custar?', 'Investimento necessário (tempo, dinheiro, recursos)...'
FROM public.frameworks WHERE slug = '5w2h';

-- 6. SOSTAC
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order)
VALUES (
  'sostac',
  'SOSTAC',
  'Criar um planejamento estratégico completo do mês com visão de execução e métricas.',
  'Para estruturar o planejamento mensal de forma completa e organizada.',
  6
);

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 1, 'Situação atual do negócio?', 'Como está o negócio hoje em termos de marketing e vendas?'
FROM public.frameworks WHERE slug = 'sostac';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 2, 'Objetivos principais?', 'O que queremos alcançar neste período?'
FROM public.frameworks WHERE slug = 'sostac';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 3, 'Estratégia adotada?', 'Qual abordagem geral vamos usar?'
FROM public.frameworks WHERE slug = 'sostac';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 4, 'Táticas necessárias?', 'Quais ações específicas serão executadas?'
FROM public.frameworks WHERE slug = 'sostac';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 5, 'Ações práticas?', 'Detalhamento das ações com responsáveis e prazos...'
FROM public.frameworks WHERE slug = 'sostac';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 6, 'Como será medido?', 'KPIs e métricas de acompanhamento...'
FROM public.frameworks WHERE slug = 'sostac';

-- 7. 3A3R
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order)
VALUES (
  '3a3r',
  '3A3R',
  'Estruturar estratégia de funil completo: da atenção à receita.',
  'Para planejar conteúdo e ações que cubram todo o funil de vendas.',
  7
);

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 1, 'Atenção: como chamar atenção do público?', 'Ganchos, headlines, formatos de conteúdo...'
FROM public.frameworks WHERE slug = '3a3r';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 2, 'Autoridade: como provar credibilidade?', 'Cases, depoimentos, números, certificações...'
FROM public.frameworks WHERE slug = '3a3r';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 3, 'Ação: qual ação queremos gerar?', 'CTA principal, próximo passo esperado...'
FROM public.frameworks WHERE slug = '3a3r';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 4, 'Retenção: como manter o público?', 'Conteúdo de valor, comunidade, newsletter...'
FROM public.frameworks WHERE slug = '3a3r';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 5, 'Relacionamento: como aprofundar vínculo?', 'Interação, suporte, personalização...'
FROM public.frameworks WHERE slug = '3a3r';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, placeholder)
SELECT id, 6, 'Receita: como monetizar?', 'Ofertas, upsell, modelo de conversão...'
FROM public.frameworks WHERE slug = '3a3r';

-- 8. ANÁLISE DE MÉTRICAS
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order)
VALUES (
  'metrics-analysis',
  'Análise de Métricas (Instagram + Meta Ads)',
  'Diagnosticar performance digital para identificar gargalos e otimizar investimento.',
  'Mensalmente para avaliar resultados e ajustar estratégia.',
  8
);

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder)
SELECT id, 1, 'Alcance Instagram', 'number', 'Número total de contas alcançadas...'
FROM public.frameworks WHERE slug = 'metrics-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder)
SELECT id, 2, 'Engajamento Instagram', 'number', 'Total de interações (curtidas, comentários, salvos, compartilhamentos)...'
FROM public.frameworks WHERE slug = 'metrics-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder)
SELECT id, 3, 'Crescimento de seguidores', 'number', 'Novos seguidores no período...'
FROM public.frameworks WHERE slug = 'metrics-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder)
SELECT id, 4, 'Cliques no link', 'number', 'Cliques no link da bio ou stories...'
FROM public.frameworks WHERE slug = 'metrics-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder)
SELECT id, 5, 'Investimento Meta Ads (R$)', 'number', 'Valor total investido em anúncios...'
FROM public.frameworks WHERE slug = 'metrics-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder)
SELECT id, 6, 'CPC médio (R$)', 'number', 'Custo por clique médio...'
FROM public.frameworks WHERE slug = 'metrics-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder)
SELECT id, 7, 'CPA médio (R$)', 'number', 'Custo por aquisição/conversão...'
FROM public.frameworks WHERE slug = 'metrics-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder)
SELECT id, 8, 'Leads gerados', 'number', 'Total de leads captados...'
FROM public.frameworks WHERE slug = 'metrics-analysis';

INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder)
SELECT id, 9, 'Conversões', 'number', 'Total de vendas ou ações concluídas...'
FROM public.frameworks WHERE slug = 'metrics-analysis';