-- Insert new framework: Campanha de Marketing
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order, is_active)
VALUES (
  'campaign-strategy',
  'Estratégia de Campanha',
  'Criar estratégias de campanhas de marketing com segmentação, direcionamento e plano de anúncios detalhado.',
  'Quando precisar planejar campanhas de marketing, anúncios pagos, lançamentos ou promoções específicas.',
  12,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Add questions for the campaign strategy framework
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
    (1, 'Qual é o objetivo principal da campanha?', 'textarea', 'Ex: Aumentar vendas, gerar leads, lançar produto, aumentar reconhecimento de marca...', true),
    (2, 'Qual é o produto/serviço foco da campanha?', 'textarea', 'Descreva o produto ou serviço que será promovido', true),
    (3, 'Qual é o orçamento disponível para a campanha?', 'textarea', 'Ex: R$ 1.000, R$ 5.000, R$ 10.000+...', true),
    (4, 'Qual é a duração prevista da campanha?', 'textarea', 'Ex: 7 dias, 15 dias, 30 dias, contínua...', true),
    (5, 'Quais plataformas de anúncios serão utilizadas?', 'textarea', 'Ex: Meta Ads (Instagram/Facebook), Google Ads, TikTok Ads, LinkedIn Ads...', true),
    (6, 'Qual é o público-alvo específico desta campanha?', 'textarea', 'Descreva idade, interesses, comportamentos, localização...', true),
    (7, 'Existe alguma promoção ou oferta especial?', 'textarea', 'Descreva descontos, bônus, condições especiais...', false),
    (8, 'Quais são os KPIs de sucesso esperados?', 'textarea', 'Ex: CPA de R$ 50, ROAS de 3x, 100 leads, 500 vendas...', true)
) AS q(question_order, question_text, field_type, placeholder, is_required)
WHERE f.slug = 'campaign-strategy'
AND NOT EXISTS (
  SELECT 1 FROM framework_questions fq 
  WHERE fq.framework_id = f.id AND fq.question_order = q.question_order
);