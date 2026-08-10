-- Add target_question_id and allow_other columns to framework_assistant_questions
ALTER TABLE framework_assistant_questions 
ADD COLUMN IF NOT EXISTS target_question_id UUID REFERENCES framework_questions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS allow_other BOOLEAN DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assistant_questions_target ON framework_assistant_questions(target_question_id);

-- Clear existing assistant questions to re-seed with detailed ones linked to specific guided questions
DELETE FROM framework_assistant_questions;

-- ==========================================
-- SWOT FRAMEWORK - DETAILED ASSISTANT QUESTIONS
-- ==========================================

-- Get SWOT framework ID and question IDs
DO $$
DECLARE
  v_swot_framework_id UUID;
  v_swot_q1_id UUID; -- Forças
  v_swot_q2_id UUID; -- Fraquezas
  v_swot_q3_id UUID; -- Oportunidades
  v_swot_q4_id UUID; -- Ameaças
  
  v_persona_framework_id UUID;
  v_persona_q1_id UUID; -- Dados demográficos
  v_persona_q2_id UUID; -- Cargo/profissão
  v_persona_q3_id UUID; -- Dores
  v_persona_q4_id UUID; -- Objetivos
  v_persona_q5_id UUID; -- Medos/objeções
  v_persona_q6_id UUID; -- Influência na compra
  v_persona_q7_id UUID; -- Conteúdo
  
  v_stp_framework_id UUID;
  v_stp_q1_id UUID; -- Segmentos existentes
  v_stp_q2_id UUID; -- Segmento prioritário
  v_stp_q3_id UUID; -- Posicionamento
BEGIN
  -- Get SWOT IDs
  SELECT id INTO v_swot_framework_id FROM frameworks WHERE slug = 'swot';
  SELECT id INTO v_swot_q1_id FROM framework_questions WHERE framework_id = v_swot_framework_id AND question_order = 1;
  SELECT id INTO v_swot_q2_id FROM framework_questions WHERE framework_id = v_swot_framework_id AND question_order = 2;
  SELECT id INTO v_swot_q3_id FROM framework_questions WHERE framework_id = v_swot_framework_id AND question_order = 3;
  SELECT id INTO v_swot_q4_id FROM framework_questions WHERE framework_id = v_swot_framework_id AND question_order = 4;

  -- Get Persona IDs
  SELECT id INTO v_persona_framework_id FROM frameworks WHERE slug = 'persona';
  SELECT id INTO v_persona_q1_id FROM framework_questions WHERE framework_id = v_persona_framework_id AND question_order = 1;
  SELECT id INTO v_persona_q2_id FROM framework_questions WHERE framework_id = v_persona_framework_id AND question_order = 2;
  SELECT id INTO v_persona_q3_id FROM framework_questions WHERE framework_id = v_persona_framework_id AND question_order = 3;
  SELECT id INTO v_persona_q4_id FROM framework_questions WHERE framework_id = v_persona_framework_id AND question_order = 4;
  SELECT id INTO v_persona_q5_id FROM framework_questions WHERE framework_id = v_persona_framework_id AND question_order = 5;
  SELECT id INTO v_persona_q6_id FROM framework_questions WHERE framework_id = v_persona_framework_id AND question_order = 6;
  SELECT id INTO v_persona_q7_id FROM framework_questions WHERE framework_id = v_persona_framework_id AND question_order = 7;

  -- Get STP IDs
  SELECT id INTO v_stp_framework_id FROM frameworks WHERE slug = 'stp';
  SELECT id INTO v_stp_q1_id FROM framework_questions WHERE framework_id = v_stp_framework_id AND question_order = 1;
  SELECT id INTO v_stp_q2_id FROM framework_questions WHERE framework_id = v_stp_framework_id AND question_order = 2;
  SELECT id INTO v_stp_q3_id FROM framework_questions WHERE framework_id = v_stp_framework_id AND question_order = 3;

  -- ==========================================
  -- SWOT - FORÇAS (6 perguntas detalhadas)
  -- ==========================================
  IF v_swot_q1_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_swot_framework_id, v_swot_q1_id, 1, 'Qual o porte da empresa?', 'single_choice', '["MEI/Autônomo", "Pequena (até 20 funcionários)", "Média (20-100 funcionários)", "Grande (mais de 100)"]', true),
    (v_swot_framework_id, v_swot_q1_id, 2, 'Há quanto tempo a empresa está no mercado?', 'single_choice', '["Menos de 1 ano", "1-3 anos", "3-5 anos", "5-10 anos", "Mais de 10 anos"]', true),
    (v_swot_framework_id, v_swot_q1_id, 3, 'Quais certificações ou selos a empresa possui?', 'multiple_choice', '["ISO 9001", "Selo de qualidade", "Premiações do setor", "Certificação profissional", "Registro em conselhos", "Nenhuma certificação"]', true),
    (v_swot_framework_id, v_swot_q1_id, 4, 'A equipe é especializada?', 'single_choice', '["Treinamentos constantes", "Formação técnica específica", "Experiência prática de mercado", "Equipe generalista", "Misto de especialistas e generalistas"]', true),
    (v_swot_framework_id, v_swot_q1_id, 5, 'A marca está registrada?', 'single_choice', '["Sim, totalmente registrada", "Em processo de registro", "Não, ainda não registrada", "Uso de nome fantasia apenas"]', true),
    (v_swot_framework_id, v_swot_q1_id, 6, 'Quais diferenciais competitivos a empresa possui?', 'multiple_choice', '["Preço competitivo", "Qualidade superior", "Atendimento personalizado", "Localização estratégica", "Tecnologia avançada", "Portfólio exclusivo", "Velocidade de entrega", "Tradição e confiança"]', true);
  END IF;

  -- ==========================================
  -- SWOT - FRAQUEZAS (6 perguntas detalhadas)
  -- ==========================================
  IF v_swot_q2_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_swot_framework_id, v_swot_q2_id, 1, 'A empresa tem presença digital profissional?', 'single_choice', '["Site moderno e atualizado", "Site desatualizado", "Apenas redes sociais", "Não tem presença digital"]', true),
    (v_swot_framework_id, v_swot_q2_id, 2, 'Utiliza sistema de gestão?', 'single_choice', '["ERP completo integrado", "Sistema básico/simples", "Apenas planilhas", "Não usa nenhum sistema"]', true),
    (v_swot_framework_id, v_swot_q2_id, 3, 'Os processos estão documentados?', 'single_choice', '["Todos documentados", "Parcialmente documentados", "Poucos documentados", "Nenhum documentado"]', true),
    (v_swot_framework_id, v_swot_q2_id, 4, 'Como está a equipe atualmente?', 'single_choice', '["Sobrecarregada", "Adequada para demanda", "Subutilizada", "Precisa de capacitação"]', true),
    (v_swot_framework_id, v_swot_q2_id, 5, 'Qual o principal gargalo operacional?', 'multiple_choice', '["Produção/Execução", "Entrega/Logística", "Atendimento ao cliente", "Área administrativa", "Financeiro", "Comercial/Vendas"]', true),
    (v_swot_framework_id, v_swot_q2_id, 6, 'Qual o maior problema financeiro atual?', 'single_choice', '["Fluxo de caixa instável", "Margens muito baixas", "Alta inadimplência", "Falta de investimento", "Custos operacionais altos", "Nenhum problema significativo"]', true);
  END IF;

  -- ==========================================
  -- SWOT - OPORTUNIDADES (5 perguntas detalhadas)
  -- ==========================================
  IF v_swot_q3_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_swot_framework_id, v_swot_q3_id, 1, 'Como está o mercado do segmento atualmente?', 'single_choice', '["Em forte crescimento", "Crescimento moderado", "Estável", "Em retração", "Muito competitivo"]', true),
    (v_swot_framework_id, v_swot_q3_id, 2, 'Quais tendências você observa no setor?', 'multiple_choice', '["Digitalização", "Sustentabilidade", "Personalização", "Automação", "Economia compartilhada", "Consumo consciente", "Experiências premium"]', true),
    (v_swot_framework_id, v_swot_q3_id, 3, 'Novos canais de vendas que podem ser explorados?', 'multiple_choice', '["E-commerce próprio", "Marketplaces", "WhatsApp Business", "Social commerce (Instagram/TikTok)", "Vendas B2B", "Franquias/Licenciamento"]', true),
    (v_swot_framework_id, v_swot_q3_id, 4, 'Há potencial para parcerias estratégicas?', 'multiple_choice', '["Fornecedores", "Empresas complementares", "Influenciadores", "Associações do setor", "Programas governamentais", "Não vejo oportunidades"]', true),
    (v_swot_framework_id, v_swot_q3_id, 5, 'Novos públicos que podem ser alcançados?', 'multiple_choice', '["Faixa etária diferente", "Outra região geográfica", "Segmento B2B", "Segmento B2C", "Nicho específico", "Mercado internacional"]', true);
  END IF;

  -- ==========================================
  -- SWOT - AMEAÇAS (5 perguntas detalhadas)
  -- ==========================================
  IF v_swot_q4_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_swot_framework_id, v_swot_q4_id, 1, 'Qual a maior ameaça externa atualmente?', 'single_choice', '["Concorrentes diretos", "Novos entrantes", "Produtos substitutos", "Mudanças no comportamento do consumidor", "Instabilidade econômica", "Mudanças regulatórias"]', true),
    (v_swot_framework_id, v_swot_q4_id, 2, 'Há dependência de fornecedor único?', 'single_choice', '["Sim, total dependência", "Parcialmente dependente", "Não, tenho alternativas", "Sou próprio fornecedor"]', true),
    (v_swot_framework_id, v_swot_q4_id, 3, 'Como a concorrência se posiciona?', 'multiple_choice', '["Preço mais baixo", "Mais investimento em marketing", "Maior variedade", "Melhor tecnologia", "Presença nacional/internacional", "Mais tradição"]', true),
    (v_swot_framework_id, v_swot_q4_id, 4, 'Regulamentações afetam o negócio?', 'single_choice', '["Sim, muito impactantes", "Moderadamente", "Pouco impacto", "Não afetam", "Pode haver mudanças em breve"]', true),
    (v_swot_framework_id, v_swot_q4_id, 5, 'Fatores econômicos que preocupam?', 'multiple_choice', '["Inflação", "Aumento de custos", "Dólar", "Juros altos", "Desemprego", "Retração do consumo", "Nenhum em especial"]', true);
  END IF;

  -- ==========================================
  -- PERSONA - DADOS DEMOGRÁFICOS (6 perguntas)
  -- ==========================================
  IF v_persona_q1_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_persona_framework_id, v_persona_q1_id, 1, 'Qual o gênero predominante do seu cliente ideal?', 'single_choice', '["Majoritariamente masculino", "Majoritariamente feminino", "Equilibrado entre gêneros", "Não é relevante para o negócio"]', true),
    (v_persona_framework_id, v_persona_q1_id, 2, 'Qual a faixa etária principal?', 'single_choice', '["18-25 anos (Geração Z)", "26-35 anos (Millennials jovens)", "36-45 anos (Millennials maduros)", "46-55 anos (Geração X)", "56+ anos (Baby Boomers)"]', true),
    (v_persona_framework_id, v_persona_q1_id, 3, 'Qual a faixa de renda mensal estimada?', 'single_choice', '["Até R$ 3.000", "R$ 3.000 a R$ 6.000", "R$ 6.000 a R$ 12.000", "R$ 12.000 a R$ 25.000", "Acima de R$ 25.000", "Variada/Não definida"]', true),
    (v_persona_framework_id, v_persona_q1_id, 4, 'Qual o nível de escolaridade?', 'single_choice', '["Ensino fundamental", "Ensino médio completo", "Superior incompleto", "Superior completo", "Pós-graduação/MBA", "Variado"]', true),
    (v_persona_framework_id, v_persona_q1_id, 5, 'Qual o estado civil predominante?', 'single_choice', '["Solteiro(a)", "Casado(a)/União estável", "Divorciado(a)/Separado(a)", "Variado/Não relevante"]', true),
    (v_persona_framework_id, v_persona_q1_id, 6, 'Onde estão localizados geograficamente?', 'single_choice', '["Capitais e grandes cidades", "Interior e cidades médias", "Todo o estado/região", "Todo o Brasil", "Internacional"]', true);
  END IF;

  -- ==========================================
  -- PERSONA - CARGO/PROFISSÃO (5 perguntas)
  -- ==========================================
  IF v_persona_q2_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_persona_framework_id, v_persona_q2_id, 1, 'Qual a ocupação principal do seu cliente?', 'multiple_choice', '["Funcionário CLT", "Autônomo/Freelancer", "Empresário/Empreendedor", "Profissional liberal", "Estudante", "Aposentado", "Desempregado/Em transição"]', true),
    (v_persona_framework_id, v_persona_q2_id, 2, 'Qual o nível hierárquico (se empregado)?', 'single_choice', '["Operacional/Assistente", "Analista/Especialista", "Coordenador/Supervisor", "Gerente/Gestor", "Diretor/C-Level", "Dono/Sócio", "Não aplicável"]', true),
    (v_persona_framework_id, v_persona_q2_id, 3, 'Em qual setor de atuação trabalha?', 'multiple_choice', '["Comércio/Varejo", "Serviços", "Indústria", "Tecnologia/TI", "Saúde", "Educação", "Financeiro", "Construção civil", "Agronegócio"]', true),
    (v_persona_framework_id, v_persona_q2_id, 4, 'Trabalha remotamente?', 'single_choice', '["100% presencial", "Híbrido", "100% remoto/Home office", "Trabalho de campo/Externo", "Variável"]', true),
    (v_persona_framework_id, v_persona_q2_id, 5, 'Qual a rotina de trabalho?', 'single_choice', '["Horário comercial fixo", "Escalas/Plantões", "Flexível", "Por demanda/Projetos", "Empreendedor (trabalha muito)"]', true);
  END IF;

  -- ==========================================
  -- PERSONA - PRINCIPAIS DORES (5 perguntas)
  -- ==========================================
  IF v_persona_q3_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_persona_framework_id, v_persona_q3_id, 1, 'Quais problemas do dia a dia mais afetam seu cliente?', 'multiple_choice', '["Falta de tempo", "Estresse/Pressão", "Falta de dinheiro", "Problemas de saúde", "Dificuldade de organização", "Falta de conhecimento técnico", "Burocracia excessiva"]', true),
    (v_persona_framework_id, v_persona_q3_id, 2, 'O que frustra seu cliente no mercado atual?', 'multiple_choice', '["Preços altos", "Má qualidade de atendimento", "Falta de opções", "Demora na entrega", "Produtos/Serviços ruins", "Falta de confiança", "Processos complicados"]', true),
    (v_persona_framework_id, v_persona_q3_id, 3, 'Quais soluções seu cliente já tentou?', 'multiple_choice', '["Concorrentes diretos", "Soluções caseiras/DIY", "Tutoriais online", "Consultorias/Especialistas", "Ignorou o problema", "Soluções parciais/Gambiarras"]', true),
    (v_persona_framework_id, v_persona_q3_id, 4, 'Qual a urgência em resolver o problema?', 'single_choice', '["Urgente (precisa agora)", "Importante (próximos meses)", "Desejável (quando possível)", "Baixa prioridade"]', true),
    (v_persona_framework_id, v_persona_q3_id, 5, 'Qual o nível de consciência do problema?', 'single_choice', '["Sabe exatamente o que precisa", "Sabe que tem problema, mas não a solução", "Nem sabe que tem o problema", "Pesquisando ativamente soluções"]', true);
  END IF;

  -- ==========================================
  -- PERSONA - PRINCIPAIS OBJETIVOS (5 perguntas)
  -- ==========================================
  IF v_persona_q4_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_persona_framework_id, v_persona_q4_id, 1, 'Quais são as principais motivações de compra?', 'multiple_choice', '["Resolver um problema urgente", "Economizar tempo", "Economizar dinheiro", "Ganhar status/Reconhecimento", "Melhorar qualidade de vida", "Crescer profissionalmente", "Segurança/Proteção"]', true),
    (v_persona_framework_id, v_persona_q4_id, 2, 'Quais metas pessoais seu cliente possui?', 'multiple_choice', '["Ter mais tempo livre", "Ganhar mais dinheiro", "Melhorar a saúde", "Viajar mais", "Comprar bens/Casa", "Empreender", "Se aposentar cedo"]', true),
    (v_persona_framework_id, v_persona_q4_id, 3, 'Quais metas profissionais seu cliente possui?', 'multiple_choice', '["Ser promovido", "Aumentar vendas/Clientes", "Aprender novas habilidades", "Ter negócio próprio", "Mudar de carreira", "Trabalhar menos", "Reconhecimento no mercado"]', true),
    (v_persona_framework_id, v_persona_q4_id, 4, 'O que o sucesso significa para seu cliente?', 'single_choice', '["Liberdade financeira", "Reconhecimento profissional", "Família feliz/Qualidade de vida", "Impacto social", "Realização pessoal", "Estabilidade e segurança"]', true),
    (v_persona_framework_id, v_persona_q4_id, 5, 'Qual o estilo de vida almejado?', 'single_choice', '["Luxuoso/Premium", "Confortável/Equilibrado", "Minimalista/Simples", "Aventureiro/Experiências", "Familiar/Tradicional", "Conectado/Tecnológico"]', true);
  END IF;

  -- ==========================================
  -- PERSONA - MEDOS E OBJEÇÕES (5 perguntas)
  -- ==========================================
  IF v_persona_q5_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_persona_framework_id, v_persona_q5_id, 1, 'Quais são as principais objeções de compra?', 'multiple_choice', '["Preço alto/Caro demais", "Não é o momento certo", "Preciso pensar mais", "Preciso consultar alguém", "Não confio na empresa/marca", "Já tentei e não funcionou", "Não entendi o produto/serviço"]', true),
    (v_persona_framework_id, v_persona_q5_id, 2, 'Quais são os principais medos do seu cliente?', 'multiple_choice', '["Perder dinheiro", "Ser enganado", "Não ter resultados", "Arrependimento", "Julgamento dos outros", "Mudança/Desconhecido", "Perder tempo"]', true),
    (v_persona_framework_id, v_persona_q5_id, 3, 'O que gera desconfiança no seu cliente?', 'multiple_choice', '["Promessas exageradas", "Falta de provas sociais", "Empresa desconhecida", "Sem garantia", "Letras pequenas/Condições ocultas", "Vendedor agressivo", "Site/Presença amadora"]', true),
    (v_persona_framework_id, v_persona_q5_id, 4, 'Quais barreiras impedem a compra?', 'multiple_choice', '["Falta de dinheiro", "Falta de tempo", "Medo de errar", "Não conhece a marca", "Complexidade do processo", "Distância/Logística", "Falta de suporte/Atendimento"]', true),
    (v_persona_framework_id, v_persona_q5_id, 5, 'O que ajudaria a superar as objeções?', 'multiple_choice', '["Garantia de satisfação", "Depoimentos/Cases de sucesso", "Período de teste grátis", "Parcelamento/Condições de pagamento", "Demonstração/Amostra", "Suporte dedicado", "Certificações/Credenciais"]', true);
  END IF;

  -- ==========================================
  -- PERSONA - COMPORTAMENTO DE COMPRA (6 perguntas)
  -- ==========================================
  IF v_persona_q6_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_persona_framework_id, v_persona_q6_id, 1, 'O que mais pesa na decisão de compra?', 'single_choice', '["Preço/Custo-benefício", "Qualidade do produto/serviço", "Conveniência/Facilidade", "Reputação da marca", "Recomendação de conhecidos", "Atendimento/Experiência"]', true),
    (v_persona_framework_id, v_persona_q6_id, 2, 'Seu cliente pesquisa antes de comprar?', 'single_choice', '["Pesquisa muito (comparadores, reviews, etc)", "Pesquisa um pouco", "Compra por impulso", "Depende do valor/Importância", "Segue recomendações"]', true),
    (v_persona_framework_id, v_persona_q6_id, 3, 'Quem influencia a decisão de compra?', 'multiple_choice', '["Cônjuge/Parceiro(a)", "Família", "Amigos próximos", "Influenciadores digitais", "Especialistas/Profissionais", "Colegas de trabalho", "Decide sozinho(a)"]', true),
    (v_persona_framework_id, v_persona_q6_id, 4, 'Quanto tempo demora para decidir?', 'single_choice', '["Imediato (minutos/horas)", "Rápido (1-2 dias)", "Médio (1-2 semanas)", "Longo (meses)", "Depende do valor"]', true),
    (v_persona_framework_id, v_persona_q6_id, 5, 'Onde prefere comprar?', 'multiple_choice', '["Loja física", "E-commerce/Site", "WhatsApp/Chat", "Marketplace (Mercado Livre, Amazon)", "Redes sociais", "Telefone", "Representante comercial"]', true),
    (v_persona_framework_id, v_persona_q6_id, 6, 'Formas de pagamento preferidas?', 'multiple_choice', '["PIX (desconto)", "Cartão de crédito à vista", "Cartão parcelado", "Boleto", "Débito", "Dinheiro", "Financiamento"]', true);
  END IF;

  -- ==========================================
  -- PERSONA - CANAIS DE CONTEÚDO (6 perguntas)
  -- ==========================================
  IF v_persona_q7_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_persona_framework_id, v_persona_q7_id, 1, 'Quais redes sociais seu cliente mais usa?', 'multiple_choice', '["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook", "Twitter/X", "Pinterest", "Threads", "Nenhuma"]', true),
    (v_persona_framework_id, v_persona_q7_id, 2, 'Qual tipo de conteúdo prefere consumir?', 'multiple_choice', '["Vídeos curtos (Reels, TikTok)", "Vídeos longos (YouTube)", "Textos/Artigos", "Podcasts/Áudio", "Imagens/Carrosséis", "Stories/Conteúdo efêmero", "Lives/Ao vivo"]', true),
    (v_persona_framework_id, v_persona_q7_id, 3, 'Em quais horários consome mais conteúdo?', 'multiple_choice', '["Manhã (6h-12h)", "Hora do almoço (12h-14h)", "Tarde (14h-18h)", "Noite (18h-22h)", "Madrugada (22h-6h)", "Durante o trabalho"]', true),
    (v_persona_framework_id, v_persona_q7_id, 4, 'Segue influenciadores digitais?', 'single_choice', '["Sim, muitos", "Alguns específicos do nicho", "Poucos, só famosos", "Não segue nenhum", "Prefere especialistas/técnicos"]', true),
    (v_persona_framework_id, v_persona_q7_id, 5, 'Abre e-mails de marketing/newsletters?', 'single_choice', '["Frequentemente", "Às vezes, se interessante", "Raramente", "Nunca abre", "Não recebe"]', true),
    (v_persona_framework_id, v_persona_q7_id, 6, 'Usa apps de desconto ou cashback?', 'single_choice', '["Sim, usa muito (Méliuz, Picpay, etc)", "Usa às vezes", "Conhece mas não usa", "Não usa nenhum"]', true);
  END IF;

  -- ==========================================
  -- STP - SEGMENTOS EXISTENTES (5 perguntas)
  -- ==========================================
  IF v_stp_q1_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_stp_framework_id, v_stp_q1_id, 1, 'Quantos perfis diferentes de clientes a empresa atende?', 'single_choice', '["1 único perfil bem definido", "2-3 perfis distintos", "4-5 perfis", "Mais de 5 perfis", "Não está claro"]', true),
    (v_stp_framework_id, v_stp_q1_id, 2, 'Como varia o ticket médio entre clientes?', 'single_choice', '["Todos com valores similares", "Alguns clientes com ticket maior", "Grande variação de valores", "Não sei informar"]', true),
    (v_stp_framework_id, v_stp_q1_id, 3, 'A empresa atende B2B, B2C ou ambos?', 'single_choice', '["Apenas B2C (consumidor final)", "Apenas B2B (empresas)", "Ambos, com foco em B2C", "Ambos, com foco em B2B", "Ambos equilibradamente"]', true),
    (v_stp_framework_id, v_stp_q1_id, 4, 'Qual a frequência de compra dos clientes?', 'single_choice', '["Compra única (não volta)", "Recorrente mensal", "Sazonal (épocas do ano)", "Por projeto/Demanda", "Misto de comportamentos"]', true),
    (v_stp_framework_id, v_stp_q1_id, 5, 'De onde vem a maioria dos clientes?', 'multiple_choice', '["Indicação/Boca a boca", "Redes sociais orgânico", "Tráfego pago (Ads)", "Google/Busca", "Parcerias", "Eventos/Networking", "Ponto físico"]', true);
  END IF;

  -- ==========================================
  -- STP - SEGMENTO PRIORITÁRIO (5 perguntas)
  -- ==========================================
  IF v_stp_q2_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_stp_framework_id, v_stp_q2_id, 1, 'Qual segmento de cliente gera mais lucro?', 'single_choice', '["Os de maior ticket", "Os recorrentes", "Os indicados", "Os de menor custo de aquisição", "Não tenho certeza"]', true),
    (v_stp_framework_id, v_stp_q2_id, 2, 'Qual segmento é mais fácil de atender?', 'single_choice', '["Clientes pequenos/Iniciantes", "Clientes médios", "Grandes clientes/Empresas", "Todos têm complexidade similar", "Depende do projeto"]', true),
    (v_stp_framework_id, v_stp_q2_id, 3, 'Qual segmento tem mais potencial de crescimento?', 'single_choice', '["Mercado atual, mais participação", "Novo segmento, menos explorado", "Segmento premium", "Segmento popular/Volume", "Expansão geográfica"]', true),
    (v_stp_framework_id, v_stp_q2_id, 4, 'Qual segmento você mais gosta de atender?', 'single_choice', '["O mais lucrativo", "O mais fácil", "O que valoriza o trabalho", "O mais desafiador", "Todos igualmente"]', true),
    (v_stp_framework_id, v_stp_q2_id, 5, 'Qual segmento tem menor concorrência?', 'single_choice', '["Nicho específico", "Mercado local/Regional", "Segmento premium", "Novo mercado emergente", "A concorrência é igual em todos"]', true);
  END IF;

  -- ==========================================
  -- STP - POSICIONAMENTO DESEJADO (6 perguntas)
  -- ==========================================
  IF v_stp_q3_id IS NOT NULL THEN
    INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other) VALUES
    (v_stp_framework_id, v_stp_q3_id, 1, 'Qual o posicionamento atual da empresa?', 'single_choice', '["Mais barato do mercado", "Custo-benefício (preço justo)", "Premium/Alto padrão", "Especialista em nicho", "Não está claro"]', true),
    (v_stp_framework_id, v_stp_q3_id, 2, 'Qual posicionamento deseja alcançar?', 'single_choice', '["Manter o atual", "Migrar para premium", "Ser o especialista/Referência", "Ampliar para mercado de massa", "Inovar/Disruptivo"]', true),
    (v_stp_framework_id, v_stp_q3_id, 3, 'Qual o tom de comunicação ideal?', 'single_choice', '["Sério e corporativo", "Amigável e próximo", "Divertido e descontraído", "Técnico e especializado", "Inspirador e motivacional", "Ousado e irreverente"]', true),
    (v_stp_framework_id, v_stp_q3_id, 4, 'Quais valores a marca deve transmitir?', 'multiple_choice', '["Inovação", "Tradição", "Sustentabilidade", "Qualidade", "Preço justo", "Exclusividade", "Transparência", "Agilidade"]', true),
    (v_stp_framework_id, v_stp_q3_id, 5, 'Qual o principal diferencial a comunicar?', 'single_choice', '["Melhor preço", "Melhor qualidade", "Melhor atendimento", "Mais rápido/Ágil", "Mais inovador", "Mais experiente", "Mais próximo do cliente"]', true),
    (v_stp_framework_id, v_stp_q3_id, 6, 'Como quer ser lembrado pelos clientes?', 'single_choice', '["O melhor do segmento", "O mais barato", "O mais inovador", "O mais confiável", "O mais humano/Próximo", "O especialista absoluto"]', true);
  END IF;

END $$;