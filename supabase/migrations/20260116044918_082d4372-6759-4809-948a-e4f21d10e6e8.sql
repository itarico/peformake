
-- Perguntas do Assistente IA para 3A3R e SOSTAC

-- =============================================
-- 3A3R - Atenção, Autoridade, Ação, Retenção, Relacionamento, Receita
-- =============================================

-- Pergunta 1: Atenção - como chamar atenção do público?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '30b01404-00ec-4d70-99c3-6c6c40e3308f', 1, 'Onde o público-alvo passa mais tempo?', 'multiple_choice',
'["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook", "WhatsApp", "Google/Buscas", "Eventos presenciais"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '30b01404-00ec-4d70-99c3-6c6c40e3308f', 2, 'Que tipo de conteúdo mais atrai esse público?', 'multiple_choice',
'["Vídeos curtos (Reels/TikTok)", "Vídeos longos (YouTube)", "Posts com imagens", "Carrosséis educativos", "Stories", "Textos/Artigos", "Podcasts", "Lives"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '30b01404-00ec-4d70-99c3-6c6c40e3308f', 3, 'Qual emoção quer despertar primeiro?', 'single_choice',
'["Curiosidade", "Urgência", "Identificação", "Aspiração", "Medo de perder", "Alívio de dor", "Entretenimento"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '30b01404-00ec-4d70-99c3-6c6c40e3308f', 4, 'Qual a principal dor/problema do público?', 'single_choice',
'["Falta de tempo", "Falta de dinheiro", "Falta de conhecimento", "Medo/Insegurança", "Desorganização", "Baixa autoestima", "Problemas de saúde", "Relacionamentos"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '30b01404-00ec-4d70-99c3-6c6c40e3308f', 5, 'Qual gancho funciona melhor com esse público?', 'single_choice',
'["Polêmica/Controvérsia", "Promessa de resultado", "Antes e depois", "Bastidores/Autenticidade", "Dados/Estatísticas", "Humor", "Tendências/Novidades"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '30b01404-00ec-4d70-99c3-6c6c40e3308f', 6, 'Qual investimento em atenção?', 'single_choice',
'["Só orgânico", "Tráfego pago básico", "Tráfego pago + orgânico", "Influenciadores", "Mídia offline", "Parcerias estratégicas"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

-- Pergunta 2: Autoridade - como provar credibilidade?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'b2439774-a35f-4b5c-81d5-1a8117e06ad6', 1, 'Quais provas sociais tem disponíveis?', 'multiple_choice',
'["Depoimentos de clientes", "Cases de sucesso", "Número de clientes atendidos", "Anos de experiência", "Prêmios/Certificações", "Parcerias conhecidas", "Aparição na mídia", "Poucos ainda"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'b2439774-a35f-4b5c-81d5-1a8117e06ad6', 2, 'Qual sua principal credencial?', 'single_choice',
'["Formação acadêmica", "Experiência prática", "Resultados comprovados", "Método próprio", "Especialização no nicho", "Reconhecimento do mercado", "Nenhuma ainda"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'b2439774-a35f-4b5c-81d5-1a8117e06ad6', 3, 'Que conteúdo demonstra conhecimento?', 'multiple_choice',
'["Tutoriais/How-to", "Análises de mercado", "Opiniões sobre tendências", "Dicas práticas", "Estudos de caso", "Entrevistas com especialistas", "Bastidores do trabalho"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'b2439774-a35f-4b5c-81d5-1a8117e06ad6', 4, 'Quem pode validar sua autoridade?', 'multiple_choice',
'["Clientes satisfeitos", "Parceiros de negócio", "Influenciadores do nicho", "Mídia/Imprensa", "Associações profissionais", "Celebridades/Famosos", "Ninguém ainda"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'b2439774-a35f-4b5c-81d5-1a8117e06ad6', 5, 'Qual posicionamento de mercado?', 'single_choice',
'["Premium/Alto padrão", "Custo-benefício", "Especialista único", "Mais acessível", "Inovador/Diferente", "Tradicional/Confiável"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

-- Pergunta 3: Ação - qual ação queremos gerar?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'dc42cd34-7568-4e8c-b248-25a30fe93838', 1, 'Qual a ação principal desejada?', 'single_choice',
'["Comprar produto", "Contratar serviço", "Agendar conversa", "Baixar material", "Seguir nas redes", "Entrar em lista de espera", "Visitar loja física"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'dc42cd34-7568-4e8c-b248-25a30fe93838', 2, 'Qual o nível de compromisso da ação?', 'single_choice',
'["Gratuito/Sem compromisso", "Compromisso pequeno (e-mail)", "Compromisso médio (cadastro)", "Compromisso alto (pagamento)", "Compromisso máximo (contrato)"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'dc42cd34-7568-4e8c-b248-25a30fe93838', 3, 'Qual barreira impede a ação?', 'multiple_choice',
'["Preço alto", "Falta de confiança", "Não conhece o produto", "Processo complicado", "Timing errado", "Concorrência", "Preguiça/Inércia"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'dc42cd34-7568-4e8c-b248-25a30fe93838', 4, 'Qual incentivo pode acelerar?', 'multiple_choice',
'["Desconto/Promoção", "Bônus exclusivo", "Garantia estendida", "Urgência/Escassez", "Prova social", "Facilidade de pagamento", "Teste grátis"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'dc42cd34-7568-4e8c-b248-25a30fe93838', 5, 'Por qual canal a ação acontece?', 'single_choice',
'["WhatsApp", "Site/E-commerce", "Telefone", "Loja física", "DM Instagram", "Formulário", "E-mail"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'dc42cd34-7568-4e8c-b248-25a30fe93838', 6, 'Quantas etapas até a conversão?', 'single_choice',
'["Uma etapa direta", "2-3 etapas simples", "Funil com várias etapas", "Venda consultiva longa", "Depende do produto"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

-- Pergunta 4: Retenção - como manter o público?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c658aea2-9bf8-40a4-a1cb-85e1d5adca25', 1, 'Qual frequência de contato pós-venda?', 'single_choice',
'["Diária", "Semanal", "Quinzenal", "Mensal", "Apenas quando necessário", "Não tenho contato pós-venda"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c658aea2-9bf8-40a4-a1cb-85e1d5adca25', 2, 'Por qual canal mantém contato?', 'multiple_choice',
'["WhatsApp", "E-mail", "Instagram", "Telegram/Grupo", "Área de membros", "Telefone", "Presencial"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c658aea2-9bf8-40a4-a1cb-85e1d5adca25', 3, 'Que valor entrega após a compra?', 'multiple_choice',
'["Conteúdo exclusivo", "Suporte dedicado", "Comunidade/Grupo", "Atualizações do produto", "Bônus surpresa", "Programa de fidelidade", "Nada específico"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c658aea2-9bf8-40a4-a1cb-85e1d5adca25', 4, 'Qual principal motivo de abandono?', 'single_choice',
'["Resultado não veio", "Concorrência", "Esqueceu da marca", "Preço/Custo", "Mau atendimento", "Produto ultrapassado", "Não sei"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c658aea2-9bf8-40a4-a1cb-85e1d5adca25', 5, 'Como mede a satisfação?', 'single_choice',
'["NPS formal", "Pesquisa de satisfação", "Feedback informal", "Avaliações online", "Taxa de recompra", "Não meço ainda"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

-- Pergunta 5: Relacionamento - como aprofundar vínculo?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c411bd7e-46d7-4339-9a5d-c5234b80d836', 1, 'Qual nível de proximidade com clientes?', 'single_choice',
'["Muito próximo/Pessoal", "Profissional e cordial", "Distante/Transacional", "Varia por cliente", "Automatizado/Impessoal"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c411bd7e-46d7-4339-9a5d-c5234b80d836', 2, 'Como personaliza a experiência?', 'multiple_choice',
'["Mensagens personalizadas", "Ofertas segmentadas", "Atendimento VIP", "Programa de pontos", "Conteúdo exclusivo", "Não personalizo", "Eventos exclusivos"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c411bd7e-46d7-4339-9a5d-c5234b80d836', 3, 'Qual estratégia de comunidade?', 'single_choice',
'["Grupo no WhatsApp", "Grupo no Telegram", "Grupo no Facebook", "Discord/Slack", "Área de membros própria", "Eventos presenciais", "Não tenho comunidade"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c411bd7e-46d7-4339-9a5d-c5234b80d836', 4, 'Como coleta feedback?', 'multiple_choice',
'["Pesquisas formais", "Conversas diretas", "Análise de comportamento", "Caixa de sugestões", "Redes sociais", "Não coleto feedback"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'c411bd7e-46d7-4339-9a5d-c5234b80d836', 5, 'Como recompensa clientes fiéis?', 'multiple_choice',
'["Descontos especiais", "Acesso antecipado", "Brindes/Presentes", "Reconhecimento público", "Upgrade de serviço", "Indicação premiada", "Não tenho programa"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

-- Pergunta 6: Receita - como monetizar?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '543b4c1d-267b-47d2-b48b-ab975c925565', 1, 'Qual o modelo de receita principal?', 'single_choice',
'["Venda única", "Assinatura/Recorrência", "Serviço por hora", "Projeto fechado", "Comissão", "Licenciamento", "Misto"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '543b4c1d-267b-47d2-b48b-ab975c925565', 2, 'Qual a faixa de ticket médio?', 'single_choice',
'["Até R$ 100", "R$ 100-500", "R$ 500-1.000", "R$ 1.000-5.000", "R$ 5.000-10.000", "Acima de R$ 10.000"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '543b4c1d-267b-47d2-b48b-ab975c925565', 3, 'Quais produtos/serviços complementares?', 'multiple_choice',
'["Upsell (versão premium)", "Cross-sell (produto relacionado)", "Downsell (versão básica)", "Manutenção/Suporte", "Consultoria adicional", "Treinamento", "Não tenho ainda"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '543b4c1d-267b-47d2-b48b-ab975c925565', 4, 'Qual % dos clientes recompra?', 'single_choice',
'["Menos de 10%", "10-25%", "25-50%", "50-75%", "Mais de 75%", "Não sei"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '543b4c1d-267b-47d2-b48b-ab975c925565', 5, 'Qual a meta de faturamento mensal?', 'single_choice',
'["Até R$ 10.000", "R$ 10.000-30.000", "R$ 30.000-50.000", "R$ 50.000-100.000", "Acima de R$ 100.000", "Não tenho meta clara"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '543b4c1d-267b-47d2-b48b-ab975c925565', 6, 'Qual estratégia de precificação?', 'single_choice',
'["Baseado em custos", "Baseado em valor percebido", "Baseado na concorrência", "Preço dinâmico", "Tabela fixa", "Negociação caso a caso"]'::jsonb, true
FROM frameworks f WHERE f.slug = '3a3r';

-- =============================================
-- SOSTAC - Situation, Objectives, Strategy, Tactics, Actions, Control
-- =============================================

-- Pergunta 1: Situação atual do negócio?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'd7b14087-68c5-40e1-b782-4a6152020130', 1, 'Como está o faturamento atual?', 'single_choice',
'["Crescendo", "Estável", "Caindo", "Muito variável", "Começando agora"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'd7b14087-68c5-40e1-b782-4a6152020130', 2, 'Qual a posição frente à concorrência?', 'single_choice',
'["Líder de mercado", "Entre os principais", "Competidor médio", "Entrante/Pequeno", "Nicho específico", "Não sei avaliar"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'd7b14087-68c5-40e1-b782-4a6152020130', 3, 'Como está a presença digital?', 'multiple_choice',
'["Site otimizado", "Redes sociais ativas", "E-commerce funcionando", "Google bem posicionado", "Base de e-mail", "Nenhuma relevante"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'd7b14087-68c5-40e1-b782-4a6152020130', 4, 'Qual o principal diferencial hoje?', 'single_choice',
'["Preço competitivo", "Qualidade superior", "Atendimento excelente", "Marca forte", "Localização", "Especialização", "Não tenho claro"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'd7b14087-68c5-40e1-b782-4a6152020130', 5, 'Quais recursos disponíveis?', 'multiple_choice',
'["Equipe de marketing", "Verba para investir", "Ferramentas/Softwares", "Parceiros estratégicos", "Conteúdo produzido", "Poucos recursos"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'd7b14087-68c5-40e1-b782-4a6152020130', 6, 'Qual maior desafio atual?', 'single_choice',
'["Gerar vendas", "Atrair leads", "Criar conteúdo", "Reter clientes", "Gerenciar operação", "Definir estratégia"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

-- Pergunta 2: Objetivos principais?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '03730dcd-8d43-4b12-8738-338eddc12833', 1, 'Qual o objetivo principal de marketing?', 'single_choice',
'["Aumentar vendas", "Gerar mais leads", "Aumentar brand awareness", "Lançar produto novo", "Fidelizar clientes", "Reposicionar marca"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '03730dcd-8d43-4b12-8738-338eddc12833', 2, 'Qual meta de crescimento?', 'single_choice',
'["10-20%", "20-50%", "50-100%", "Dobrar ou mais", "Manter estável", "Sem meta definida"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '03730dcd-8d43-4b12-8738-338eddc12833', 3, 'Em quanto tempo quer atingir?', 'single_choice',
'["1 mês", "3 meses", "6 meses", "1 ano", "Contínuo/Sem prazo"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '03730dcd-8d43-4b12-8738-338eddc12833', 4, 'Qual KPI principal vai acompanhar?', 'single_choice',
'["Faturamento", "Número de vendas", "Número de leads", "Taxa de conversão", "Engajamento", "CAC/ROI"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '03730dcd-8d43-4b12-8738-338eddc12833', 5, 'Objetivo é realista com recursos atuais?', 'single_choice',
'["Sim, totalmente", "Precisa de ajustes", "Desafiador mas possível", "Muito ambicioso", "Não sei avaliar"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

-- Pergunta 3: Estratégia adotada?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '0688ac8b-0ad9-4e57-a71d-aa230482c9eb', 1, 'Qual a estratégia de posicionamento?', 'single_choice',
'["Líder em preço", "Líder em qualidade", "Especialista de nicho", "Inovador/Disruptivo", "Melhor custo-benefício", "Tradicional/Confiável"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '0688ac8b-0ad9-4e57-a71d-aa230482c9eb', 2, 'Qual foco de aquisição de clientes?', 'single_choice',
'["Tráfego pago", "Marketing de conteúdo", "SEO/Orgânico", "Indicações", "Parcerias", "Outbound/Prospecção ativa", "Mix equilibrado"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '0688ac8b-0ad9-4e57-a71d-aa230482c9eb', 3, 'Qual a proposta de valor central?', 'single_choice',
'["Economia de tempo", "Economia de dinheiro", "Melhores resultados", "Exclusividade", "Conveniência", "Segurança/Confiança"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '0688ac8b-0ad9-4e57-a71d-aa230482c9eb', 4, 'Como se diferencia da concorrência?', 'multiple_choice',
'["Preço", "Qualidade", "Atendimento", "Especialização", "Tecnologia", "Experiência", "Garantia", "Não tenho diferencial claro"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '0688ac8b-0ad9-4e57-a71d-aa230482c9eb', 5, 'Qual segmento prioritário?', 'single_choice',
'["Clientes premium", "Clientes de entrada", "Empresas (B2B)", "Consumidor final (B2C)", "Nicho específico", "Mercado amplo"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

-- Pergunta 4: Táticas necessárias?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '53412a3a-6f37-4c3b-a42b-6aec9c78aad0', 1, 'Quais canais de marketing vai usar?', 'multiple_choice',
'["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Google Ads", "E-mail marketing", "WhatsApp", "Blog/SEO"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '53412a3a-6f37-4c3b-a42b-6aec9c78aad0', 2, 'Que tipo de conteúdo vai produzir?', 'multiple_choice',
'["Posts para redes sociais", "Vídeos curtos", "Vídeos longos", "Artigos/Blog", "E-mails", "Materiais ricos (e-book)", "Podcasts", "Lives"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '53412a3a-6f37-4c3b-a42b-6aec9c78aad0', 3, 'Qual frequência de publicação?', 'single_choice',
'["Diária", "3-5x por semana", "1-2x por semana", "Quinzenal", "Mensal", "Sem frequência definida"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '53412a3a-6f37-4c3b-a42b-6aec9c78aad0', 4, 'Vai investir em tráfego pago?', 'single_choice',
'["Não por enquanto", "Até R$ 500/mês", "R$ 500-2.000/mês", "R$ 2.000-5.000/mês", "Acima de R$ 5.000/mês"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '53412a3a-6f37-4c3b-a42b-6aec9c78aad0', 5, 'Quais automações vai implementar?', 'multiple_choice',
'["E-mail automático", "Chatbot WhatsApp", "Remarketing", "CRM automatizado", "Agendamento de posts", "Nenhuma por enquanto"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

-- Pergunta 5: Ações práticas?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'a425b526-32b4-4524-ad49-f423674e0d0a', 1, 'Quem vai executar as ações?', 'single_choice',
'["Eu mesmo", "Equipe interna", "Freelancer", "Agência", "Misto (interno + externo)"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'a425b526-32b4-4524-ad49-f423674e0d0a', 2, 'Qual ação é prioridade imediata?', 'single_choice',
'["Criar/Melhorar site", "Ativar redes sociais", "Configurar tráfego pago", "Criar conteúdo", "Estruturar CRM", "Otimizar atendimento"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'a425b526-32b4-4524-ad49-f423674e0d0a', 3, 'Quais ferramentas vai usar?', 'multiple_choice',
'["Canva", "Meta Business", "Google Analytics", "RD Station/Hubspot", "Planilhas", "Ferramenta de agendamento", "WhatsApp Business"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'a425b526-32b4-4524-ad49-f423674e0d0a', 4, 'Qual calendário de execução?', 'single_choice',
'["Já começa esta semana", "Próxima semana", "Início do mês", "Prazo flexível", "Depende de recursos"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'a425b526-32b4-4524-ad49-f423674e0d0a', 5, 'Qual investimento mensal total?', 'single_choice',
'["Até R$ 1.000", "R$ 1.000-3.000", "R$ 3.000-5.000", "R$ 5.000-10.000", "Acima de R$ 10.000"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

-- Pergunta 6: Como será medido?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ab5ca752-a270-4b7f-8da3-6f353f342936', 1, 'Quais métricas vai acompanhar?', 'multiple_choice',
'["Faturamento", "Número de leads", "Taxa de conversão", "CAC (custo por aquisição)", "ROI/ROAS", "Engajamento", "Alcance/Impressões", "NPS/Satisfação"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ab5ca752-a270-4b7f-8da3-6f353f342936', 2, 'Com qual frequência vai analisar?', 'single_choice',
'["Diariamente", "Semanalmente", "Quinzenalmente", "Mensalmente", "Quando lembrar"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ab5ca752-a270-4b7f-8da3-6f353f342936', 3, 'Onde vai registrar os dados?', 'single_choice',
'["Planilha própria", "Dashboard de ferramenta", "Software de BI", "Relatórios manuais", "Ainda não definido"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ab5ca752-a270-4b7f-8da3-6f353f342936', 4, 'Como vai ajustar o que não funcionar?', 'single_choice',
'["Teste A/B constante", "Revisão mensal", "Reuniões de alinhamento", "Ajusto conforme vejo", "Ainda não pensei nisso"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ab5ca752-a270-4b7f-8da3-6f353f342936', 5, 'Quem será responsável pelo acompanhamento?', 'single_choice',
'["Eu mesmo", "Gestor/Gerente", "Analista dedicado", "Agência/Consultor", "Não definido ainda"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'sostac';
