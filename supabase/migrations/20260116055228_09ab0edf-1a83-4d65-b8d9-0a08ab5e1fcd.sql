-- 1. Adicionar perguntas assistente para Niche Research (~30 perguntas)
DO $$
DECLARE
  niche_framework_id UUID;
  q1_id UUID;
  q2_id UUID;
  q3_id UUID;
  q4_id UUID;
  q5_id UUID;
  q6_id UUID;
BEGIN
  SELECT id INTO niche_framework_id FROM public.frameworks WHERE slug = 'niche-research';
  
  IF niche_framework_id IS NOT NULL THEN
    -- Obter IDs das perguntas
    SELECT id INTO q1_id FROM public.framework_questions WHERE framework_id = niche_framework_id AND question_order = 1;
    SELECT id INTO q2_id FROM public.framework_questions WHERE framework_id = niche_framework_id AND question_order = 2;
    SELECT id INTO q3_id FROM public.framework_questions WHERE framework_id = niche_framework_id AND question_order = 3;
    SELECT id INTO q4_id FROM public.framework_questions WHERE framework_id = niche_framework_id AND question_order = 4;
    SELECT id INTO q5_id FROM public.framework_questions WHERE framework_id = niche_framework_id AND question_order = 5;
    SELECT id INTO q6_id FROM public.framework_questions WHERE framework_id = niche_framework_id AND question_order = 6;

    -- Q1: Sites/Blogs para analisar
    IF q1_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (niche_framework_id, q1_id, 1, 'Que tipo de site você quer analisar?', 'single_choice', '["Blogs do nicho", "Portais de notícias", "Sites de influenciadores", "E-commerces concorrentes", "Fóruns e comunidades"]'),
        (niche_framework_id, q1_id, 2, 'Qual o foco da análise?', 'single_choice', '["Conteúdo mais popular", "Estratégia de SEO", "Design e UX", "Produtos/serviços oferecidos", "Posicionamento de marca"]'),
        (niche_framework_id, q1_id, 3, 'Região geográfica de interesse?', 'single_choice', '["Brasil todo", "Minha região/estado", "Internacional", "Específico de uma cidade"]'),
        (niche_framework_id, q1_id, 4, 'Idioma dos sites?', 'single_choice', '["Português", "Inglês", "Espanhol", "Múltiplos idiomas"]'),
        (niche_framework_id, q1_id, 5, 'Porte dos sites?', 'multiple_choice', '["Grandes players", "Médio porte", "Pequenos/iniciantes", "Todos os portes"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q2: Concorrentes
    IF q2_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (niche_framework_id, q2_id, 1, 'Tipo de concorrência?', 'single_choice', '["Concorrentes diretos", "Concorrentes indiretos", "Substitutos", "Todos os tipos"]'),
        (niche_framework_id, q2_id, 2, 'Onde atuam?', 'single_choice', '["Local/regional", "Nacional", "Internacional", "Online apenas"]'),
        (niche_framework_id, q2_id, 3, 'O que analisar neles?', 'multiple_choice', '["Preços", "Comunicação", "Produtos/serviços", "Presença digital", "Atendimento"]'),
        (niche_framework_id, q2_id, 4, 'Porte dos concorrentes?', 'single_choice', '["Maiores que eu", "Do meu tamanho", "Menores", "Todos os portes"]'),
        (niche_framework_id, q2_id, 5, 'Quantos concorrentes mapear?', 'single_choice', '["Top 3 principais", "Top 5", "Top 10", "O máximo possível"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q3: Palavras-chave e temas
    IF q3_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (niche_framework_id, q3_id, 1, 'Objetivo das palavras-chave?', 'single_choice', '["Vender mais", "Gerar leads", "Educar o público", "Construir autoridade", "Tráfego orgânico"]'),
        (niche_framework_id, q3_id, 2, 'Tipo de palavra-chave?', 'multiple_choice', '["Head tail (genéricas)", "Long tail (específicas)", "Perguntas", "Comparativos", "Locais"]'),
        (niche_framework_id, q3_id, 3, 'Intenção de busca?', 'multiple_choice', '["Informacional", "Navegacional", "Transacional", "Comercial"]'),
        (niche_framework_id, q3_id, 4, 'Etapa do funil?', 'single_choice', '["Topo (descoberta)", "Meio (consideração)", "Fundo (decisão)", "Todas as etapas"]'),
        (niche_framework_id, q3_id, 5, 'Volume de busca desejado?', 'single_choice', '["Alto volume", "Médio volume", "Baixo volume (nichado)", "Qualquer volume"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q4: Tipos de conteúdo
    IF q4_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (niche_framework_id, q4_id, 1, 'Formato preferido?', 'multiple_choice', '["Vídeos curtos", "Vídeos longos", "Imagens/carrosséis", "Textos/blogs", "Podcasts", "Lives"]'),
        (niche_framework_id, q4_id, 2, 'Onde publicar?', 'multiple_choice', '["Instagram", "TikTok", "YouTube", "LinkedIn", "Blog próprio", "E-mail marketing"]'),
        (niche_framework_id, q4_id, 3, 'Frequência de publicação?', 'single_choice', '["Diária", "3-4x por semana", "Semanal", "Quinzenal"]'),
        (niche_framework_id, q4_id, 4, 'Tom de comunicação?', 'single_choice', '["Profissional", "Descontraído", "Educativo", "Inspiracional", "Humorístico"]'),
        (niche_framework_id, q4_id, 5, 'Nível de produção?', 'single_choice', '["Básico/caseiro", "Intermediário", "Profissional/alto padrão"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q5: Tendências
    IF q5_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (niche_framework_id, q5_id, 1, 'Tipo de tendência?', 'multiple_choice', '["Formatos de conteúdo", "Tecnologias", "Comportamento do consumidor", "Produtos/serviços", "Marketing e comunicação"]'),
        (niche_framework_id, q5_id, 2, 'Horizonte temporal?', 'single_choice', '["Próximos 3 meses", "Próximo ano", "Próximos 2-3 anos", "Longo prazo"]'),
        (niche_framework_id, q5_id, 3, 'Fonte de tendências?', 'multiple_choice', '["Redes sociais", "Google Trends", "Relatórios de mercado", "Influenciadores", "Eventos/feiras"]'),
        (niche_framework_id, q5_id, 4, 'Aplicação das tendências?', 'single_choice', '["Inovar produtos", "Melhorar comunicação", "Novos canais", "Otimizar processos"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q6: Referências visuais
    IF q6_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (niche_framework_id, q6_id, 1, 'Estilo visual desejado?', 'multiple_choice', '["Minimalista", "Vibrante/colorido", "Elegante/sofisticado", "Divertido", "Corporativo"]'),
        (niche_framework_id, q6_id, 2, 'Onde buscar referências?', 'multiple_choice', '["Pinterest", "Instagram", "Behance/Dribbble", "Concorrentes", "Fora do nicho"]'),
        (niche_framework_id, q6_id, 3, 'Elementos a analisar?', 'multiple_choice', '["Paleta de cores", "Tipografia", "Layout", "Fotografia", "Ilustrações"]'),
        (niche_framework_id, q6_id, 4, 'Para qual aplicação?', 'multiple_choice', '["Feed de redes sociais", "Site/landing page", "Material impresso", "Apresentações", "Embalagens"]')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- 2. Adicionar perguntas assistente para Seasonality Analysis (~35 perguntas)
DO $$
DECLARE
  season_framework_id UUID;
  q1_id UUID;
  q2_id UUID;
  q3_id UUID;
  q4_id UUID;
  q5_id UUID;
  q6_id UUID;
  q7_id UUID;
BEGIN
  SELECT id INTO season_framework_id FROM public.frameworks WHERE slug = 'seasonality-analysis';
  
  IF season_framework_id IS NOT NULL THEN
    -- Obter IDs das perguntas
    SELECT id INTO q1_id FROM public.framework_questions WHERE framework_id = season_framework_id AND question_order = 1;
    SELECT id INTO q2_id FROM public.framework_questions WHERE framework_id = season_framework_id AND question_order = 2;
    SELECT id INTO q3_id FROM public.framework_questions WHERE framework_id = season_framework_id AND question_order = 3;
    SELECT id INTO q4_id FROM public.framework_questions WHERE framework_id = season_framework_id AND question_order = 4;
    SELECT id INTO q5_id FROM public.framework_questions WHERE framework_id = season_framework_id AND question_order = 5;
    SELECT id INTO q6_id FROM public.framework_questions WHERE framework_id = season_framework_id AND question_order = 6;
    SELECT id INTO q7_id FROM public.framework_questions WHERE framework_id = season_framework_id AND question_order = 7;

    -- Q1: Mês/Período
    IF q1_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (season_framework_id, q1_id, 1, 'Qual período analisar?', 'single_choice', '["Mês específico", "Trimestre", "Semestre", "Ano todo"]'),
        (season_framework_id, q1_id, 2, 'Há eventos importantes nesse período?', 'multiple_choice', '["Feriados nacionais", "Datas comerciais", "Eventos do setor", "Férias escolares", "Nenhum específico"]'),
        (season_framework_id, q1_id, 3, 'Período de planejamento?', 'single_choice', '["Próximo mês", "Próximo trimestre", "Próximo semestre", "Próximo ano"]'),
        (season_framework_id, q1_id, 4, 'Antecedência necessária?', 'single_choice', '["1-2 semanas", "1 mês", "2-3 meses", "Mais de 3 meses"]'),
        (season_framework_id, q1_id, 5, 'Flexibilidade do período?', 'single_choice', '["Fixo/imutável", "Pode ajustar datas", "Totalmente flexível"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q2: Segmento/Nicho
    IF q2_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (season_framework_id, q2_id, 1, 'Seu nicho tem sazonalidade forte?', 'single_choice', '["Sim, muito forte", "Moderada", "Leve", "Não tem sazonalidade"]'),
        (season_framework_id, q2_id, 2, 'Quais épocas são melhores?', 'multiple_choice', '["Início do ano", "Férias escolares", "Black Friday/Natal", "Verão", "Inverno", "Datas comemorativas"]'),
        (season_framework_id, q2_id, 3, 'E as piores épocas?', 'multiple_choice', '["Janeiro/Fevereiro", "Meio do ano", "Não há época ruim", "Depende de eventos externos"]'),
        (season_framework_id, q2_id, 4, 'Comportamento do cliente na época?', 'single_choice', '["Compra por impulso", "Pesquisa muito", "Aguarda promoções", "Compra por necessidade"]'),
        (season_framework_id, q2_id, 5, 'Concorrência na época?', 'single_choice', '["Muito acirrada", "Moderada", "Baixa", "Depende do nicho"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q3: Datas comerciais
    IF q3_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (season_framework_id, q3_id, 1, 'Quais datas são relevantes?', 'multiple_choice', '["Dia das Mães", "Dia dos Pais", "Dia dos Namorados", "Black Friday", "Natal", "Carnaval", "Dia do Cliente"]'),
        (season_framework_id, q3_id, 2, 'Como explorar essas datas?', 'multiple_choice', '["Promoções", "Conteúdo temático", "Lançamentos", "Campanhas especiais", "Parcerias"]'),
        (season_framework_id, q3_id, 3, 'Investimento planejado?', 'single_choice', '["Alto (campanha robusta)", "Médio", "Baixo (orgânico)", "Ainda não definido"]'),
        (season_framework_id, q3_id, 4, 'Objetivo principal?', 'single_choice', '["Vendas diretas", "Captação de leads", "Branding", "Engajamento", "Fidelização"]'),
        (season_framework_id, q3_id, 5, 'Canal principal?', 'multiple_choice', '["Instagram", "Google Ads", "E-mail marketing", "WhatsApp", "Loja física", "Site"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q4: Eventos do setor
    IF q4_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (season_framework_id, q4_id, 1, 'Tipo de eventos?', 'multiple_choice', '["Feiras e congressos", "Webinars", "Lançamentos de mercado", "Premiações", "Workshops"]'),
        (season_framework_id, q4_id, 2, 'Participação planejada?', 'single_choice', '["Como expositor", "Como visitante", "Como palestrante", "Apenas cobertura online", "Não participar"]'),
        (season_framework_id, q4_id, 3, 'Como aproveitar?', 'multiple_choice', '["Networking", "Conteúdo ao vivo", "Lançar produto", "Captar leads", "Fechar parcerias"]'),
        (season_framework_id, q4_id, 4, 'Conteúdo relacionado?', 'multiple_choice', '["Antes (teaser)", "Durante (cobertura)", "Depois (resumo)", "Nenhum"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q5: Clima e estação
    IF q5_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (season_framework_id, q5_id, 1, 'Seu negócio é afetado pelo clima?', 'single_choice', '["Muito afetado", "Moderadamente", "Pouco", "Não é afetado"]'),
        (season_framework_id, q5_id, 2, 'Qual estação favorece mais?', 'single_choice', '["Verão", "Outono", "Inverno", "Primavera", "Não há diferença"]'),
        (season_framework_id, q5_id, 3, 'Adaptações necessárias?', 'multiple_choice', '["Produtos sazonais", "Comunicação diferente", "Promoções específicas", "Horário de funcionamento", "Nenhuma"]'),
        (season_framework_id, q5_id, 4, 'Como comunicar?', 'single_choice', '["Destacar benefícios da estação", "Criar urgência", "Oferecer soluções", "Manter comunicação padrão"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q6: Comportamento do consumidor
    IF q6_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (season_framework_id, q6_id, 1, 'Como o cliente muda no período?', 'multiple_choice', '["Mais disposto a gastar", "Mais cauteloso", "Busca novidades", "Foca em economia", "Sem mudança"]'),
        (season_framework_id, q6_id, 2, 'Jornada de compra?', 'single_choice', '["Mais curta/impulsiva", "Mais longa/pesquisada", "Normal", "Depende do produto"]'),
        (season_framework_id, q6_id, 3, 'Gatilhos mais efetivos?', 'multiple_choice', '["Escassez", "Prova social", "Urgência", "Desconto", "Exclusividade", "Autoridade"]'),
        (season_framework_id, q6_id, 4, 'Objeções comuns no período?', 'multiple_choice', '["Preço", "Timing", "Necessidade", "Confiança", "Concorrência"]')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Q7: Oportunidades identificadas
    IF q7_id IS NOT NULL THEN
      INSERT INTO public.framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options)
      VALUES
        (season_framework_id, q7_id, 1, 'Tipo de oportunidade?', 'multiple_choice', '["Lançamento de produto", "Campanha promocional", "Parceria", "Conteúdo viral", "Evento próprio"]'),
        (season_framework_id, q7_id, 2, 'Recursos disponíveis?', 'single_choice', '["Alto investimento", "Investimento moderado", "Baixo investimento", "Apenas orgânico"]'),
        (season_framework_id, q7_id, 3, 'Risco envolvido?', 'single_choice', '["Alto risco/alta recompensa", "Risco moderado", "Baixo risco", "Sem risco"]'),
        (season_framework_id, q7_id, 4, 'Prazo de execução?', 'single_choice', '["Imediato", "1-2 semanas", "1 mês", "Mais de 1 mês"]'),
        (season_framework_id, q7_id, 5, 'Métrica de sucesso?', 'multiple_choice', '["Vendas", "Leads gerados", "Engajamento", "Alcance", "ROI", "Brand awareness"]')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;