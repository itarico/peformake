-- Insert new individual frameworks: Audiovisual and Design Gráfico
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order, is_active)
VALUES 
  (
    'audiovisual-planning',
    'Planejamento Audiovisual',
    'Criar roteiros, cronograma de vídeos e estratégia de conteúdo em vídeo para todas as plataformas.',
    'Quando precisar planejar Reels, TikToks, Shorts, Lives, vídeos longos ou qualquer conteúdo em vídeo.',
    13,
    true
  ),
  (
    'design-planning',
    'Planejamento de Design Gráfico',
    'Desenvolver a estrutura visual, identidade e planejamento de artes para redes sociais e materiais.',
    'Quando precisar criar carrosséis, posts estáticos, stories, banners, infográficos ou qualquer arte visual.',
    14,
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- Add questions for Audiovisual Planning
INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  f.id,
  q.question_order,
  q.question_text,
  q.field_type,
  q.placeholder,
  q.is_required
FROM frameworks f
CROSS JOIN (
  VALUES
    (1, 'Quais plataformas de vídeo são prioridade?', 'textarea', 'Ex: Instagram Reels, TikTok, YouTube Shorts, YouTube, Lives...', true),
    (2, 'Qual a frequência de postagem de vídeos desejada?', 'textarea', 'Ex: 3 Reels/semana, 1 Live/mês, 2 TikToks/semana...', true),
    (3, 'Quais tipos de vídeo funcionam melhor para o negócio?', 'textarea', 'Ex: Tutorial, bastidores, depoimentos, trends, educativo...', true),
    (4, 'Quais equipamentos/recursos estão disponíveis?', 'textarea', 'Ex: Celular, ring light, microfone lapela, editor de vídeo...', false),
    (5, 'Quem será o apresentador/protagonista dos vídeos?', 'textarea', 'Ex: O dono, funcionário, mascote, sem protagonista...', false),
    (6, '[RESULTADOS] Roteiros de Vídeo', 'textarea', 'Roteiros completos gerados pela pesquisa', false),
    (7, '[RESULTADOS] Calendário de Vídeos', 'textarea', 'Cronograma de publicação dos vídeos', false),
    (8, '[RESULTADOS] Tendências de Vídeo', 'textarea', 'Tendências e formatos populares identificados', false),
    (9, '[RESULTADOS] Ideias de Conteúdo', 'textarea', 'Ideias específicas para o nicho', false),
    (10, '[RESULTADOS] Resumo Estratégico', 'textarea', 'Resumo executivo da estratégia de vídeo', false)
) AS q(question_order, question_text, field_type, placeholder, is_required)
WHERE f.slug = 'audiovisual-planning'
AND NOT EXISTS (
  SELECT 1 FROM framework_questions fq 
  WHERE fq.framework_id = f.id AND fq.question_order = q.question_order
);

-- Add questions for Design Planning
INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT 
  f.id,
  q.question_order,
  q.question_text,
  q.field_type,
  q.placeholder,
  q.is_required
FROM frameworks f
CROSS JOIN (
  VALUES
    (1, 'Quais formatos de arte são prioridade?', 'textarea', 'Ex: Carrossel, post único, stories, banners, infográficos...', true),
    (2, 'Qual a frequência de postagem de artes?', 'textarea', 'Ex: 4 posts/semana, 10 stories/semana...', true),
    (3, 'Já existe uma identidade visual definida?', 'textarea', 'Descreva cores, fontes, estilo visual ou diga se precisa criar', true),
    (4, 'Quais elementos visuais devem estar presentes?', 'textarea', 'Ex: Logo sempre visível, paleta de cores específica, fotos do produto...', false),
    (5, 'Qual o tom visual desejado?', 'textarea', 'Ex: Minimalista, vibrante, elegante, divertido, profissional...', true),
    (6, '[RESULTADOS] Estrutura de Artes', 'textarea', 'Estrutura completa para criação das artes', false),
    (7, '[RESULTADOS] Identidade Visual', 'textarea', 'Diretrizes de identidade visual', false),
    (8, '[RESULTADOS] Calendário de Artes', 'textarea', 'Cronograma de publicação das artes', false),
    (9, '[RESULTADOS] Templates Sugeridos', 'textarea', 'Templates recorrentes recomendados', false),
    (10, '[RESULTADOS] Resumo Estratégico', 'textarea', 'Resumo executivo da estratégia visual', false)
) AS q(question_order, question_text, field_type, placeholder, is_required)
WHERE f.slug = 'design-planning'
AND NOT EXISTS (
  SELECT 1 FROM framework_questions fq 
  WHERE fq.framework_id = f.id AND fq.question_order = q.question_order
);