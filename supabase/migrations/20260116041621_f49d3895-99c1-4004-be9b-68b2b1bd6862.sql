-- Create table for assistant questions (simplified questions for AI assistant)
CREATE TABLE public.framework_assistant_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID REFERENCES public.frameworks(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single_choice',
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.framework_assistant_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - staff can read
CREATE POLICY "Staff can view assistant questions"
ON public.framework_assistant_questions
FOR SELECT
USING (public.is_staff(auth.uid()));

-- Create storage bucket for consulting files
INSERT INTO storage.buckets (id, name, public)
VALUES ('consulting-files', 'consulting-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Staff can upload consulting files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'consulting-files' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can view consulting files"
ON storage.objects FOR SELECT
USING (bucket_id = 'consulting-files' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete consulting files"
ON storage.objects FOR DELETE
USING (bucket_id = 'consulting-files' AND public.is_staff(auth.uid()));

-- Seed assistant questions for SWOT
INSERT INTO public.framework_assistant_questions (framework_id, question_order, question_text, question_type, options) VALUES
((SELECT id FROM public.frameworks WHERE slug = 'swot'), 1, 
 'Qual o porte da empresa?', 'single_choice', 
 '["MEI/Autônomo", "Pequena (até 20 funcionários)", "Média (20-100)", "Grande (100+)"]'),

((SELECT id FROM public.frameworks WHERE slug = 'swot'), 2, 
 'Principal canal de vendas?', 'single_choice', 
 '["Loja física", "E-commerce próprio", "Marketplace", "WhatsApp/Redes sociais", "Vendas B2B diretas"]'),

((SELECT id FROM public.frameworks WHERE slug = 'swot'), 3, 
 'Quais diferenciais a empresa possui?', 'multiple_choice', 
 '["Preço competitivo", "Qualidade superior", "Atendimento personalizado", "Marca reconhecida", "Localização privilegiada", "Tecnologia/Inovação", "Portfólio exclusivo", "Pós-venda"]'),

((SELECT id FROM public.frameworks WHERE slug = 'swot'), 4, 
 'Principais dificuldades atuais?', 'multiple_choice', 
 '["Captação de novos clientes", "Retenção de clientes", "Gestão de equipe", "Processos internos", "Fluxo de caixa", "Marketing/Divulgação", "Concorrência", "Sazonalidade"]'),

((SELECT id FROM public.frameworks WHERE slug = 'swot'), 5, 
 'O mercado está em qual momento?', 'single_choice', 
 '["Crescimento acelerado", "Crescimento moderado", "Estável", "Retração", "Muita incerteza"]'),

((SELECT id FROM public.frameworks WHERE slug = 'swot'), 6, 
 'Qual a maior ameaça externa?', 'single_choice', 
 '["Novos concorrentes", "Mudança de comportamento do consumidor", "Crise econômica", "Regulamentação", "Tecnologia disruptiva"]');

-- Seed assistant questions for STP
INSERT INTO public.framework_assistant_questions (framework_id, question_order, question_text, question_type, options) VALUES
((SELECT id FROM public.frameworks WHERE slug = 'stp'), 1, 
 'Qual o público principal?', 'single_choice', 
 '["Jovens (18-25)", "Adultos (26-40)", "Maduros (41-55)", "Seniores (55+)", "Empresas (B2B)"]'),

((SELECT id FROM public.frameworks WHERE slug = 'stp'), 2, 
 'Qual a faixa de renda do público?', 'single_choice', 
 '["Classes A/B (alta)", "Classe C (média)", "Classes D/E (baixa)", "Variado"]'),

((SELECT id FROM public.frameworks WHERE slug = 'stp'), 3, 
 'Onde o público está concentrado?', 'single_choice', 
 '["Região metropolitana", "Interior", "Nacional", "Internacional", "Online (sem localização específica)"]'),

((SELECT id FROM public.frameworks WHERE slug = 'stp'), 4, 
 'Qual o posicionamento desejado?', 'single_choice', 
 '["Premium/Luxo", "Custo-benefício", "Econômico", "Especialista/Nicho", "Inovador/Disruptivo"]');

-- Seed assistant questions for Persona
INSERT INTO public.framework_assistant_questions (framework_id, question_order, question_text, question_type, options) VALUES
((SELECT id FROM public.frameworks WHERE slug = 'persona'), 1, 
 'Gênero predominante do cliente ideal?', 'single_choice', 
 '["Masculino", "Feminino", "Equilibrado", "Não relevante"]'),

((SELECT id FROM public.frameworks WHERE slug = 'persona'), 2, 
 'Qual a ocupação típica?', 'single_choice', 
 '["Empresário/Empreendedor", "Profissional liberal", "CLT/Funcionário", "Autônomo", "Estudante", "Aposentado"]'),

((SELECT id FROM public.frameworks WHERE slug = 'persona'), 3, 
 'Quais são os principais objetivos do cliente?', 'multiple_choice', 
 '["Economizar dinheiro", "Economizar tempo", "Melhorar qualidade de vida", "Status/Reconhecimento", "Praticidade", "Segurança", "Inovação"]'),

((SELECT id FROM public.frameworks WHERE slug = 'persona'), 4, 
 'Quais as maiores objeções de compra?', 'multiple_choice', 
 '["Preço alto", "Desconfiança", "Falta de informação", "Já tem alternativa", "Não vê necessidade", "Timing errado"]'),

((SELECT id FROM public.frameworks WHERE slug = 'persona'), 5, 
 'Como o cliente prefere ser atendido?', 'single_choice', 
 '["WhatsApp", "Telefone", "E-mail", "Presencial", "Self-service (site/app)"]');