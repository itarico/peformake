-- 1. Add new columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS main_competitors TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS value_proposition TEXT;

-- 2. Get 3A3R framework ID and add new guided questions
INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 7, 'Quais canais você pretende usar para gerar visibilidade e consciência de marca?', 'textarea', 'Ex: Instagram, Google Ads, SEO, TikTok, parcerias...', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 8, 'Qual sua estratégia de SEO e conteúdo orgânico para atrair público?', 'textarea', 'Descreva palavras-chave, temas de blog, frequência de publicação...', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 9, 'Qual o orçamento mensal para tráfego pago e como será distribuído?', 'textarea', 'Ex: R$ 2.000/mês - 60% Meta Ads, 40% Google Ads', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 10, 'Qual a oferta principal para capturar leads? (Aquisição)', 'textarea', 'Ex: E-book gratuito, desconto primeira compra, consultoria grátis...', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 11, 'Como é estruturado seu funil de conversão? (Landing pages, formulários)', 'textarea', 'Descreva as etapas do visitante até virar lead/cliente', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 12, 'Quais gatilhos mentais e provas sociais você utiliza?', 'textarea', 'Ex: Escassez, urgência, depoimentos, números de clientes...', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 13, 'Como você entrega valor rapidamente ao novo cliente? (Ativação)', 'textarea', 'Ex: Entrega imediata, primeiro resultado em 24h, bônus de boas-vindas...', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 14, 'Qual o processo de onboarding do cliente?', 'textarea', 'Descreva as etapas desde a compra até o cliente estar "ativado"', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 15, 'Como você personaliza a experiência inicial de cada cliente?', 'textarea', 'Ex: Segmentação, questionário inicial, atendimento dedicado...', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 16, 'Qual sua estratégia de e-mail marketing para retenção?', 'textarea', 'Descreva sequências, frequência, tipos de conteúdo enviados', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 17, 'Você possui programa de fidelidade ou benefícios para clientes recorrentes?', 'textarea', 'Descreva como recompensa clientes fiéis', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 18, 'Quais estratégias de upsell e cross-sell você utiliza?', 'textarea', 'Ex: Versão premium, produtos complementares, combos...', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 19, 'Como você trabalha para aumentar o ticket médio?', 'textarea', 'Descreva táticas para clientes comprarem mais ou versões superiores', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 20, 'Você possui programa de indicação? Como funciona?', 'textarea', 'Ex: Indique e ganhe, desconto para quem indica e quem é indicado...', true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 21, 'Como você coleta e utiliza depoimentos e avaliações?', 'textarea', 'Descreva o processo de coleta e onde são exibidos', true
FROM frameworks f WHERE f.slug = '3a3r';

-- 3. Create Social Media Planning framework
INSERT INTO frameworks (slug, name, objective, when_to_use, display_order, is_active)
VALUES (
  'social-media-planning',
  'Planejamento de Social Media',
  'Criar um plano estratégico de presença nas redes sociais com definição de pilares, formatos, frequência e ideias de conteúdo prontas para produção.',
  'No início de cada mês ou quando precisar reestruturar a estratégia de redes sociais do cliente.',
  9,
  true
);

-- Social Media Planning questions
INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 1, 'Quais redes sociais serão trabalhadas neste mês?', 'textarea', 'Ex: Instagram, TikTok, LinkedIn, Facebook, YouTube...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 2, 'Qual o objetivo principal nas redes este mês?', 'textarea', 'Ex: Aumentar seguidores, gerar engajamento, converter vendas, fortalecer branding...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 3, 'Qual a frequência de postagem por rede?', 'textarea', 'Ex: Instagram 5x/semana, TikTok 3x/semana, LinkedIn 2x/semana...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 4, 'Quais são os pilares de conteúdo definidos?', 'textarea', 'Ex: Educativo (40%), Entretenimento (25%), Vendas (20%), Bastidores (15%)', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 5, 'Quais formatos de conteúdo serão priorizados?', 'textarea', 'Ex: Reels, Carrosséis, Stories, Posts estáticos, Lives...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 6, 'Qual o tom de voz da marca nas redes?', 'textarea', 'Ex: Informal e descontraído, profissional mas acessível, técnico e especializado...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 7, 'Quais hashtags estratégicas serão utilizadas?', 'textarea', 'Liste as principais hashtags por categoria (marca, nicho, alcance)', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 8, 'Quais os melhores horários de postagem para o público?', 'textarea', 'Ex: Segunda a Sexta 12h e 19h, Sábado 10h...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 9, 'Qual a estratégia de Stories para o mês?', 'textarea', 'Descreva frequência, tipos de conteúdo, uso de enquetes, caixas de perguntas...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 10, 'Qual a estratégia de Reels/Vídeos curtos?', 'textarea', 'Descreva temas, trends a aproveitar, frequência, estilo de edição...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 11, 'Qual a estratégia de engajamento com a comunidade?', 'textarea', 'Ex: Responder comentários em X horas, interagir com perfis similares, lives semanais...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 12, 'Ideias de posts para o pilar EDUCATIVO', 'textarea', 'Liste 5-10 ideias de posts educativos com títulos e descrições breves', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 13, 'Ideias de posts para o pilar ENTRETENIMENTO', 'textarea', 'Liste 5-10 ideias de posts de entretenimento, memes, trends...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 14, 'Ideias de posts para o pilar VENDAS/CONVERSÃO', 'textarea', 'Liste 5-10 ideias de posts focados em venda, promoções, CTA...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 15, 'Ideias de posts para o pilar BASTIDORES/HUMANIZAÇÃO', 'textarea', 'Liste 5-10 ideias mostrando equipe, processos, dia a dia, valores...', true
FROM frameworks f WHERE f.slug = 'social-media-planning';

-- 4. Create Content Planning framework
INSERT INTO frameworks (slug, name, objective, when_to_use, display_order, is_active)
VALUES (
  'content-planning',
  'Planejamento de Conteúdo Completo',
  'Desenvolver uma estratégia de conteúdo 360° incluindo blog, redes sociais, e-mail marketing e materiais ricos, com calendário editorial e ideias prontas.',
  'Trimestralmente ou quando precisar estruturar toda a produção de conteúdo do cliente.',
  10,
  true
);

-- Content Planning questions
INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 1, 'Quais canais de conteúdo serão utilizados?', 'textarea', 'Ex: Blog, Instagram, YouTube, Newsletter, Podcast, LinkedIn...', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 2, 'Quais são as personas de conteúdo?', 'textarea', 'Descreva 1-3 personas com características, dores e objetivos', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 3, 'Quais são as principais dores do público que o conteúdo deve resolver?', 'textarea', 'Liste as 5-10 principais dores e problemas do público-alvo', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 4, 'Quais as principais dúvidas/perguntas frequentes do público?', 'textarea', 'Liste as perguntas mais comuns que o conteúdo deve responder', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 5, 'Quais palavras-chave são prioridade para SEO?', 'textarea', 'Liste as principais keywords com volume de busca estimado', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 6, 'Como o conteúdo será distribuído na jornada? (Topo, Meio, Fundo)', 'textarea', 'Ex: 50% Topo (atração), 30% Meio (consideração), 20% Fundo (decisão)', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 7, 'Quais formatos de conteúdo serão produzidos?', 'textarea', 'Ex: Artigos blog, vídeos, infográficos, podcasts, e-books...', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 8, 'Qual a cadência de publicação por canal?', 'textarea', 'Ex: Blog 2x/semana, YouTube 1x/semana, Newsletter quinzenal...', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 9, 'Calendário Editorial - Temas da Semana 1', 'textarea', 'Liste os temas e formatos planejados para a primeira semana', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 10, 'Calendário Editorial - Temas da Semana 2', 'textarea', 'Liste os temas e formatos planejados para a segunda semana', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 11, 'Calendário Editorial - Temas da Semana 3', 'textarea', 'Liste os temas e formatos planejados para a terceira semana', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 12, 'Calendário Editorial - Temas da Semana 4', 'textarea', 'Liste os temas e formatos planejados para a quarta semana', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 13, 'Quais materiais ricos serão produzidos? (E-books, Webinars, Templates)', 'textarea', 'Liste os materiais ricos planejados com temas e objetivos', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 14, 'Qual a estratégia de e-mail marketing/newsletter?', 'textarea', 'Descreva frequência, temas, automações planejadas', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 15, 'Como o conteúdo será reaproveitado entre canais?', 'textarea', 'Ex: Blog vira carrossel, vídeo vira Reels + podcast...', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 16, 'Quais métricas de conteúdo serão acompanhadas?', 'textarea', 'Ex: Pageviews, tempo na página, taxa de conversão, engajamento...', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 17, 'Ideias de conteúdo para TOPO de funil (atração)', 'textarea', 'Liste 10-15 ideias de conteúdo para atrair novos visitantes', true
FROM frameworks f WHERE f.slug = 'content-planning';

INSERT INTO framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, 18, 'Ideias de conteúdo para MEIO/FUNDO de funil (conversão)', 'textarea', 'Liste 10-15 ideias de conteúdo para nutrir e converter leads', true
FROM frameworks f WHERE f.slug = 'content-planning';