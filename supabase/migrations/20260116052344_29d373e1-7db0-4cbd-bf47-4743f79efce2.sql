-- =====================================================
-- 1. Criar tabela answer_templates para reutilizar respostas
-- =====================================================
CREATE TABLE public.answer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para answer_templates
ALTER TABLE public.answer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage answer templates"
  ON public.answer_templates FOR ALL
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can view all answer templates"
  ON public.answer_templates FOR SELECT
  USING (is_staff(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_answer_templates_updated_at
  BEFORE UPDATE ON public.answer_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. Novo Framework: Pesquisa de Nicho com IA
-- =====================================================
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order, is_active)
VALUES (
  'niche-research',
  'Pesquisa de Nicho com IA',
  'Varredura inteligente em sites do nicho do cliente usando Firecrawl + IA para extrair tendências, conteúdos populares, formatos mais usados e ideias de posts relevantes.',
  'Antes de iniciar o planejamento de conteúdo para trazer referências atualizadas do mercado e dos concorrentes.',
  11,
  true
);

-- Perguntas guiadas do Pesquisa de Nicho
INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, q.question_order, q.question_text, q.field_type, q.placeholder, q.is_required
FROM public.frameworks f
CROSS JOIN (VALUES
  (1, 'Quais sites/blogs do nicho você quer pesquisar?', 'textarea', 'Ex: blog1.com.br, site-concorrente.com.br, portal-do-setor.com.br', true),
  (2, 'Quais são os principais concorrentes a analisar?', 'textarea', 'Liste os nomes ou URLs das empresas concorrentes diretas', true),
  (3, 'Quais palavras-chave/temas buscar?', 'textarea', 'Ex: marketing digital, vendas online, atendimento ao cliente', true),
  (4, 'Que tipo de conteúdo priorizar na pesquisa?', 'textarea', 'Ex: Posts de blog, vídeos, infográficos, cases de sucesso', false),
  (5, '🔍 RESULTADOS - Tendências Identificadas no Nicho', 'textarea', 'Preenchido automaticamente pela IA após a pesquisa', false),
  (6, '🔍 RESULTADOS - Formatos de Conteúdo Mais Populares', 'textarea', 'Preenchido automaticamente pela IA após a pesquisa', false),
  (7, '🔍 RESULTADOS - Ideias de Conteúdo Geradas', 'textarea', 'Preenchido automaticamente pela IA após a pesquisa', false),
  (8, '🔍 RESULTADOS - Temas Sazonais Detectados', 'textarea', 'Preenchido automaticamente pela IA após a pesquisa', false),
  (9, '🔍 RESULTADOS - Hashtags e Palavras-chave Recomendadas', 'textarea', 'Preenchido automaticamente pela IA após a pesquisa', false),
  (10, '🔍 RESULTADOS - Resumo Estratégico', 'textarea', 'Preenchido automaticamente pela IA após a pesquisa', false)
) AS q(question_order, question_text, field_type, placeholder, is_required)
WHERE f.slug = 'niche-research';

-- =====================================================
-- 3. Novo Framework: Análise de Sazonalidade do Mês
-- =====================================================
INSERT INTO public.frameworks (slug, name, objective, when_to_use, display_order, is_active)
VALUES (
  'seasonality-analysis',
  'Análise de Sazonalidade do Mês',
  'Identificar datas comemorativas, comportamentos de compra, tendências sazonais e movimentos do mercado específicos para o nicho e público do cliente usando pesquisa web + IA.',
  'No início de cada mês para planejar conteúdo sazonal e campanhas alinhadas ao momento do mercado.',
  12,
  true
);

-- Perguntas guiadas da Análise de Sazonalidade
INSERT INTO public.framework_questions (framework_id, question_order, question_text, field_type, placeholder, is_required)
SELECT f.id, q.question_order, q.question_text, q.field_type, q.placeholder, q.is_required
FROM public.frameworks f
CROSS JOIN (VALUES
  (1, 'Qual o mês/período a analisar?', 'text', 'Ex: Janeiro 2025, Fevereiro 2025', true),
  (2, 'Qual o segmento/nicho específico do cliente?', 'textarea', 'Preenchido automaticamente do contexto do cliente', true),
  (3, 'Qual a localização/região do público-alvo?', 'text', 'Ex: Brasil, São Paulo, Região Sul', false),
  (4, '📅 RESULTADOS - Datas Comemorativas do Mês', 'textarea', 'Preenchido automaticamente pela pesquisa + IA', false),
  (5, '🛒 RESULTADOS - Comportamento de Compra Esperado', 'textarea', 'Preenchido automaticamente pela pesquisa + IA', false),
  (6, '📈 RESULTADOS - Tendências Sazonais do Nicho', 'textarea', 'Preenchido automaticamente pela pesquisa + IA', false),
  (7, '💡 RESULTADOS - Oportunidades de Conteúdo Sazonal', 'textarea', 'Preenchido automaticamente pela pesquisa + IA', false),
  (8, '🎯 RESULTADOS - Eventos e Movimentos do Mercado', 'textarea', 'Preenchido automaticamente pela pesquisa + IA', false),
  (9, '🚀 RESULTADOS - Recomendações de Campanhas', 'textarea', 'Preenchido automaticamente pela pesquisa + IA', false),
  (10, '🔑 RESULTADOS - Palavras-chave Sazonais', 'textarea', 'Preenchido automaticamente pela pesquisa + IA', false),
  (11, '📋 RESULTADOS - Resumo Executivo da Sazonalidade', 'textarea', 'Preenchido automaticamente pela pesquisa + IA', false)
) AS q(question_order, question_text, field_type, placeholder, is_required)
WHERE f.slug = 'seasonality-analysis';

-- =====================================================
-- 4. Perguntas do Assistente IA para Social Media Planning
-- =====================================================
INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT 
  f.id as framework_id,
  fq.id as target_question_id,
  aq.question_order,
  aq.question_text,
  aq.question_type,
  aq.options::jsonb,
  aq.allow_other
FROM public.frameworks f
JOIN public.framework_questions fq ON fq.framework_id = f.id
CROSS JOIN (VALUES
  -- Pergunta 1: Quais redes sociais serão trabalhadas?
  (1, 1, 'Qual o tamanho atual da audiência nas redes?', 'single_choice', '["Iniciante (0-1k)", "Pequena (1k-10k)", "Média (10k-50k)", "Grande (50k+)"]', true),
  (1, 2, 'Qual recurso disponível para produção?', 'single_choice', '["Só celular", "Equipamento básico", "Estúdio completo", "Agência externa"]', true),
  (1, 3, 'Quantas horas por semana para redes sociais?', 'single_choice', '["1-5 horas", "5-10 horas", "10-20 horas", "20+ horas"]', true),
  (1, 4, 'Já tem presença em quais redes?', 'multiple_choice', '["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook", "Twitter/X", "Pinterest"]', true),
  
  -- Pergunta 2: Qual o objetivo principal nas redes?
  (2, 1, 'Qual a prioridade de negócio atual?', 'single_choice', '["Aumentar vendas", "Gerar leads", "Fortalecer marca", "Fidelizar clientes"]', true),
  (2, 2, 'Qual métrica mais importante?', 'single_choice', '["Seguidores", "Engajamento", "Alcance", "Conversões", "Tráfego site"]', true),
  (2, 3, 'Tem meta numérica definida?', 'single_choice', '["Sim, específica", "Sim, geral", "Não definida", "Em construção"]', true),
  
  -- Pergunta 3: Frequência de postagem
  (3, 1, 'Qual a capacidade atual de produção?', 'single_choice', '["1-2 posts/semana", "3-5 posts/semana", "1 post/dia", "Múltiplos por dia"]', true),
  (3, 2, 'Prefere qualidade ou quantidade?', 'single_choice', '["Poucos e excelentes", "Equilibrado", "Alto volume"]', true),
  (3, 3, 'Consegue manter Stories diários?', 'single_choice', '["Sim, facilmente", "Sim, com esforço", "Às vezes", "Não"]', true),
  
  -- Pergunta 4: Pilares de conteúdo
  (4, 1, 'O que o público mais espera ver?', 'multiple_choice', '["Dicas práticas", "Entretenimento", "Bastidores", "Promoções", "Depoimentos"]', true),
  (4, 2, 'Qual conteúdo gera mais engajamento hoje?', 'single_choice', '["Educativo", "Humor", "Inspiracional", "Vendas", "Não sabe"]', true),
  (4, 3, 'Tem produtos/serviços para destacar?', 'single_choice', '["Sim, vários", "Sim, poucos", "Serviço principal", "Não aplicável"]', true),
  
  -- Pergunta 5: Formatos de conteúdo
  (5, 1, 'Quem produz o conteúdo visual?', 'single_choice', '["Eu mesmo", "Equipe interna", "Designer freelancer", "Agência"]', true),
  (5, 2, 'Tem facilidade com vídeos?', 'single_choice', '["Sim, adoro", "Estou aprendendo", "Prefiro imagens", "Não faço"]', true),
  (5, 3, 'Prefere conteúdo estático ou dinâmico?', 'single_choice', '["Estático (fotos)", "Dinâmico (vídeos)", "Mix equilibrado"]', true),
  
  -- Pergunta 6: Tom de voz
  (6, 1, 'Como a marca se posiciona?', 'single_choice', '["Profissional e séria", "Descontraída e amigável", "Luxuosa e exclusiva", "Jovem e ousada"]', true),
  (6, 2, 'Usa emojis nas comunicações?', 'single_choice', '["Muito", "Moderadamente", "Pouco", "Nunca"]', true),
  (6, 3, 'Trata o público de que forma?', 'single_choice', '["Você", "Tu", "Vocês", "Formal"]', true),
  
  -- Pergunta 7: Hashtags
  (7, 1, 'Já usa hashtags consistentes?', 'single_choice', '["Sim, lista definida", "Algumas recorrentes", "Aleatórias", "Não uso"]', true),
  (7, 2, 'Hashtag própria da marca?', 'single_choice', '["Sim, divulgada", "Sim, pouco usada", "Não tenho", "Quero criar"]', true),
  
  -- Pergunta 8: Horários
  (8, 1, 'Quando seu público está mais ativo?', 'single_choice', '["Manhã", "Almoço", "Tarde", "Noite", "Não sabe"]', true),
  (8, 2, 'Dias com melhor performance?', 'multiple_choice', '["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]', true),
  
  -- Pergunta 9: Estratégia de Stories
  (9, 1, 'O que funciona nos seus Stories?', 'multiple_choice', '["Enquetes", "Bastidores", "Ofertas", "Educativo", "Dia a dia"]', true),
  (9, 2, 'Faz Stories de vendas?', 'single_choice', '["Sempre", "Às vezes", "Raramente", "Nunca"]', true),
  (9, 3, 'Usa destaques organizados?', 'single_choice', '["Sim, todos atualizados", "Alguns", "Desatualizados", "Não uso"]', true),
  
  -- Pergunta 10: Estratégia de Reels
  (10, 1, 'Que tipo de Reels faz mais sucesso?', 'multiple_choice', '["Trends/danças", "Tutoriais", "Humor", "Bastidores", "Antes/depois"]', true),
  (10, 2, 'Frequência ideal de Reels?', 'single_choice', '["Diário", "3-4/semana", "1-2/semana", "Ocasional"]', true),
  (10, 3, 'Aparece no vídeo ou só produto?', 'single_choice', '["Sempre apareço", "Às vezes", "Só produto", "Mix de ambos"]', true),
  
  -- Pergunta 11: Engajamento
  (11, 1, 'Responde comentários em quanto tempo?', 'single_choice', '["Imediatamente", "Algumas horas", "No dia", "Quando lembro"]', true),
  (11, 2, 'Faz lives?', 'single_choice', '["Regularmente", "Às vezes", "Raramente", "Nunca"]', true),
  (11, 3, 'Interage com seguidores nos DMs?', 'single_choice', '["Sempre", "Quando possível", "Só vendas", "Não"]', true),
  
  -- Pergunta 12: Pilar EDUCATIVO
  (12, 1, 'Que dúvidas seus clientes mais têm?', 'textarea', null, true),
  (12, 2, 'Que conhecimento você pode ensinar?', 'multiple_choice', '["Como usar produto", "Dicas do setor", "Tutoriais", "Curiosidades"]', true),
  (12, 3, 'Formato preferido para educar?', 'single_choice', '["Carrossel", "Reels", "Stories", "Lives"]', true),
  
  -- Pergunta 13: Pilar ENTRETENIMENTO
  (13, 1, 'Que humor combina com a marca?', 'single_choice', '["Memes", "Situações do dia a dia", "Trends", "Não usa humor"]', true),
  (13, 2, 'Participa de trends virais?', 'single_choice', '["Sempre que faz sentido", "Às vezes", "Raramente", "Nunca"]', true),
  
  -- Pergunta 14: Pilar VENDAS
  (14, 1, 'Como apresenta seus produtos?', 'multiple_choice', '["Fotos profissionais", "Vídeos de uso", "Antes/depois", "Depoimentos"]', true),
  (14, 2, 'Frequência de posts de venda?', 'single_choice', '["Todo post", "50% do conteúdo", "20-30%", "Ocasional"]', true),
  (14, 3, 'Usa CTA claro nos posts?', 'single_choice', '["Sempre", "Às vezes", "Raramente"]', true),
  
  -- Pergunta 15: Pilar BASTIDORES
  (15, 1, 'O que mostrar dos bastidores?', 'multiple_choice', '["Equipe", "Processo de trabalho", "Dia a dia", "Eventos", "Erros e acertos"]', true),
  (15, 2, 'Confortável mostrando rotina?', 'single_choice', '["Muito", "Razoável", "Pouco", "Não gosta"]', true)
) AS aq(target_order, question_order, question_text, question_type, options, allow_other)
WHERE f.slug = 'social-media-planning' AND fq.question_order = aq.target_order;

-- =====================================================
-- 5. Perguntas do Assistente IA para Content Planning
-- =====================================================
INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT 
  f.id as framework_id,
  fq.id as target_question_id,
  aq.question_order,
  aq.question_text,
  aq.question_type,
  aq.options::jsonb,
  aq.allow_other
FROM public.frameworks f
JOIN public.framework_questions fq ON fq.framework_id = f.id
CROSS JOIN (VALUES
  -- Pergunta 1: Canais de conteúdo
  (1, 1, 'Onde seu público consome conteúdo?', 'multiple_choice', '["Blog", "Instagram", "YouTube", "TikTok", "Podcast", "Newsletter", "LinkedIn"]', true),
  (1, 2, 'Qual canal tem melhor performance?', 'single_choice', '["Redes sociais", "Blog/Site", "E-mail", "Vídeo", "Não sabe"]', true),
  (1, 3, 'Tem equipe dedicada para conteúdo?', 'single_choice', '["Sim, completa", "Parcialmente", "Só eu", "Terceirizado"]', true),
  
  -- Pergunta 2: Personas de conteúdo
  (2, 1, 'Quantas personas diferentes?', 'single_choice', '["Uma principal", "2-3 personas", "4+ personas", "Não definidas"]', true),
  (2, 2, 'Persona principal é?', 'single_choice', '["B2C - Consumidor final", "B2B - Empresas", "Misto", "Profissionais liberais"]', true),
  (2, 3, 'Faixa etária predominante?', 'single_choice', '["18-24", "25-34", "35-44", "45-54", "55+", "Variada"]', true),
  
  -- Pergunta 3: Dores do público
  (3, 1, 'Qual a maior frustração do seu cliente?', 'textarea', null, true),
  (3, 2, 'Que problema seu produto/serviço resolve?', 'single_choice', '["Economiza tempo", "Economiza dinheiro", "Reduz estresse", "Melhora resultados", "Outro"]', true),
  (3, 3, 'O público sabe que tem esse problema?', 'single_choice', '["Sim, busca solução", "Sim, mas ignora", "Não percebe", "Varia"]', true),
  
  -- Pergunta 4: Dúvidas do público
  (4, 1, 'Que perguntas recebe com frequência?', 'textarea', null, true),
  (4, 2, 'Usa FAQ ou banco de perguntas?', 'single_choice', '["Sim, completo", "Parcialmente", "Não tenho", "Em construção"]', true),
  
  -- Pergunta 5: Palavras-chave SEO
  (5, 1, 'Já fez pesquisa de palavras-chave?', 'single_choice', '["Sim, profissional", "Sim, básica", "Não fiz", "Não sei fazer"]', true),
  (5, 2, 'Foca em palavras de cauda longa?', 'single_choice', '["Sim", "Não sei o que é", "Estou aprendendo", "Não"]', true),
  (5, 3, 'Monitora posição nos buscadores?', 'single_choice', '["Sim, regularmente", "Às vezes", "Não", "Não sei como"]', true),
  
  -- Pergunta 6: Jornada de conteúdo
  (6, 1, 'Tem conteúdo para todas as fases?', 'single_choice', '["Sim, mapeado", "Parcialmente", "Só topo", "Não organizado"]', true),
  (6, 2, 'Qual fase precisa de mais conteúdo?', 'single_choice', '["Topo (atração)", "Meio (consideração)", "Fundo (decisão)", "Todas"]', true),
  
  -- Pergunta 7: Formatos de conteúdo
  (7, 1, 'Que formato gera mais resultado?', 'single_choice', '["Texto/blog", "Vídeo", "Áudio/podcast", "Imagens", "Não sabe"]', true),
  (7, 2, 'Consegue produzir vídeos?', 'single_choice', '["Sim, profissionais", "Sim, amadores", "Com dificuldade", "Não"]', true),
  (7, 3, 'Tem templates prontos?', 'single_choice', '["Sim, completos", "Alguns", "Poucos", "Não"]', true),
  
  -- Pergunta 8: Cadência de publicação
  (8, 1, 'Qual a capacidade real de produção?', 'single_choice', '["1 conteúdo/semana", "2-3/semana", "Diário", "Irregular"]', true),
  (8, 2, 'Consegue manter consistência?', 'single_choice', '["Sim, sempre", "Na maioria", "Com dificuldade", "Não"]', true),
  
  -- Perguntas 9-12: Calendário editorial (semanas)
  (9, 1, 'Tema principal da semana 1?', 'single_choice', '["Educativo", "Promocional", "Engajamento", "Institucional"]', true),
  (10, 1, 'Tema principal da semana 2?', 'single_choice', '["Educativo", "Promocional", "Engajamento", "Institucional"]', true),
  (11, 1, 'Tema principal da semana 3?', 'single_choice', '["Educativo", "Promocional", "Engajamento", "Institucional"]', true),
  (12, 1, 'Tema principal da semana 4?', 'single_choice', '["Educativo", "Promocional", "Engajamento", "Institucional"]', true),
  
  -- Pergunta 13: Materiais ricos
  (13, 1, 'Já produziu material rico?', 'multiple_choice', '["E-book", "Webinar", "Planilha", "Checklist", "Nenhum"]', true),
  (13, 2, 'Usa para captura de leads?', 'single_choice', '["Sim, com automação", "Sim, básico", "Não", "Quero começar"]', true),
  (13, 3, 'Que material faz sentido produzir?', 'multiple_choice', '["E-book guia", "Webinar ao vivo", "Curso gratuito", "Templates", "Calculadora"]', true),
  
  -- Pergunta 14: E-mail marketing
  (14, 1, 'Tem lista de e-mails?', 'single_choice', '["Sim, segmentada", "Sim, geral", "Pequena", "Não tenho"]', true),
  (14, 2, 'Frequência de envio?', 'single_choice', '["Diário", "Semanal", "Quinzenal", "Mensal", "Irregular"]', true),
  (14, 3, 'Tipo de e-mail que envia?', 'multiple_choice', '["Newsletter", "Promocional", "Educativo", "Transacional"]', true),
  
  -- Pergunta 15: Reaproveitamento
  (15, 1, 'Reaproveita conteúdo entre canais?', 'single_choice', '["Sim, sistemático", "Às vezes", "Raramente", "Não"]', true),
  (15, 2, 'Atualiza conteúdos antigos?', 'single_choice', '["Sim, regularmente", "Às vezes", "Raramente", "Nunca"]', true),
  
  -- Pergunta 16: Métricas
  (16, 1, 'Quais métricas acompanha?', 'multiple_choice', '["Visitas", "Tempo na página", "Taxa conversão", "Engajamento", "Nenhuma"]', true),
  (16, 2, 'Usa ferramenta de analytics?', 'single_choice', '["GA4", "Outras", "Só redes sociais", "Não uso"]', true),
  
  -- Pergunta 17: Conteúdo topo de funil
  (17, 1, 'Que problema quer resolver no topo?', 'single_choice', '["Atrair desconhecidos", "Aumentar alcance", "Gerar awareness", "Educar mercado"]', true),
  (17, 2, 'Formato ideal para atração?', 'single_choice', '["Blog posts", "Vídeos curtos", "Infográficos", "Podcasts"]', true),
  
  -- Pergunta 18: Conteúdo meio/fundo
  (18, 1, 'O que convence seu cliente a comprar?', 'multiple_choice', '["Cases de sucesso", "Comparativos", "Demonstrações", "Depoimentos", "Garantias"]', true),
  (18, 2, 'Usa prova social?', 'single_choice', '["Muito", "Às vezes", "Pouco", "Não"]', true)
) AS aq(target_order, question_order, question_text, question_type, options, allow_other)
WHERE f.slug = 'content-planning' AND fq.question_order = aq.target_order;