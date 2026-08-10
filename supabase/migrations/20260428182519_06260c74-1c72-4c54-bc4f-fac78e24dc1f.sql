CREATE TABLE public.satisfaction_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  service TEXT NOT NULL DEFAULT 'geral',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.satisfaction_question_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.client_satisfaction_surveys(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.satisfaction_questions(id) ON DELETE CASCADE,
  rating TEXT CHECK (rating IN ('ok','improve')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(survey_id, question_id)
);

CREATE INDEX idx_sqa_survey ON public.satisfaction_question_answers(survey_id);

ALTER TABLE public.satisfaction_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active questions"
ON public.satisfaction_questions FOR SELECT USING (true);

CREATE POLICY "Admins manage questions"
ON public.satisfaction_questions FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view answers"
ON public.satisfaction_question_answers FOR SELECT USING (true);

CREATE POLICY "Anyone can submit answers via public survey"
ON public.satisfaction_question_answers FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.client_satisfaction_surveys s WHERE s.id = survey_id)
);

CREATE POLICY "Admins delete answers"
ON public.satisfaction_question_answers FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sq_updated_at
BEFORE UPDATE ON public.satisfaction_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.satisfaction_questions (question, service, display_order) VALUES
('A qualidade visual das artes está atendendo suas expectativas?', 'design', 1),
('Os prazos de entrega das artes estão sendo cumpridos?', 'design', 2),
('A comunicação durante o processo criativo está clara?', 'design', 3),
('Os resultados das campanhas de tráfego estão satisfatórios?', 'traffic', 1),
('Os relatórios de tráfego pago estão claros e úteis?', 'traffic', 2),
('A estratégia de anúncios está alinhada com seus objetivos?', 'traffic', 3),
('O planejamento de conteúdo do mês atende sua estratégia?', 'social_media', 1),
('A frequência de postagens está adequada?', 'social_media', 2),
('A linha editorial reflete o posicionamento da sua marca?', 'social_media', 3),
('As reuniões e diagnósticos da consultoria estão agregando valor?', 'consulting', 1),
('Os frameworks aplicados estão sendo úteis para seu negócio?', 'consulting', 2),
('A consultoria está te ajudando a tomar melhores decisões?', 'consulting', 3),
('A qualidade dos vídeos/conteúdo audiovisual está adequada?', 'audiovisual', 1),
('Os roteiros e ideias estão alinhados com sua marca?', 'audiovisual', 2),
('O atendimento geral da equipe está satisfatório?', 'geral', 1),
('A agilidade nas respostas atende sua necessidade?', 'geral', 2),
('Você sente que recebe valor proporcional ao investimento?', 'geral', 3),
('Você recomendaria nossos serviços a outras empresas?', 'geral', 4);