
-- Perguntas do Assistente IA para Gap Analysis e 5W2H

-- =============================================
-- GAP ANALYSIS - "Onde Está → Para Onde Quer Ir"
-- =============================================

-- Pergunta 1: Onde o negócio está hoje (resultados reais)?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'faedc277-6c5c-4dbb-a795-eeae7385555c', 1, 'Qual o faturamento atual mensal?', 'single_choice',
'["Até R$ 5.000", "R$ 5.000 - R$ 15.000", "R$ 15.000 - R$ 50.000", "R$ 50.000 - R$ 100.000", "Acima de R$ 100.000"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'faedc277-6c5c-4dbb-a795-eeae7385555c', 2, 'Quantos clientes ativos tem atualmente?', 'single_choice',
'["Menos de 10", "10 a 30", "30 a 50", "50 a 100", "Mais de 100"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'faedc277-6c5c-4dbb-a795-eeae7385555c', 3, 'Como está a presença digital atual?', 'multiple_choice',
'["Site profissional", "Redes sociais ativas", "Google Meu Negócio", "WhatsApp Business", "E-commerce", "Sem presença digital significativa"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'faedc277-6c5c-4dbb-a795-eeae7385555c', 4, 'Qual a principal fonte de novos clientes hoje?', 'single_choice',
'["Indicação boca a boca", "Redes sociais orgânico", "Tráfego pago", "Google/SEO", "Parcerias", "Ponto físico/Localização"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'faedc277-6c5c-4dbb-a795-eeae7385555c', 5, 'Como avalia a satisfação dos clientes atuais?', 'single_choice',
'["Excelente - sempre indicam", "Boa - maioria retorna", "Regular - reclamações frequentes", "Ruim - alta rotatividade", "Não acompanho isso"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'faedc277-6c5c-4dbb-a795-eeae7385555c', 6, 'Qual o ticket médio atual?', 'single_choice',
'["Até R$ 100", "R$ 100 - R$ 300", "R$ 300 - R$ 500", "R$ 500 - R$ 1.000", "Acima de R$ 1.000"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

-- Pergunta 2: Principais dificuldades atuais
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ddbb816e-f199-47ff-8e5f-b0c4e89bb05b', 1, 'Qual a maior dificuldade para atrair novos clientes?', 'single_choice',
'["Falta de visibilidade/alcance", "Concorrência muito forte", "Público não conhece o produto", "Preço acima do mercado", "Localização ruim", "Falta investimento em marketing"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ddbb816e-f199-47ff-8e5f-b0c4e89bb05b', 2, 'Quais problemas operacionais enfrenta?', 'multiple_choice',
'["Falta de equipe", "Equipe desmotivada", "Processos desorganizados", "Falta de tempo", "Problemas com fornecedores", "Gestão financeira", "Nenhum problema significativo"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ddbb816e-f199-47ff-8e5f-b0c4e89bb05b', 3, 'Como está o fluxo de caixa?', 'single_choice',
'["Saudável e previsível", "Apertado mas controlado", "Irregular/Imprevisível", "Negativo frequentemente", "Muito endividado"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ddbb816e-f199-47ff-8e5f-b0c4e89bb05b', 4, 'Qual limitação mais te trava?', 'single_choice',
'["Capital/Dinheiro", "Tempo disponível", "Conhecimento técnico", "Equipe qualificada", "Estrutura física", "Tecnologia/Ferramentas"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'ddbb816e-f199-47ff-8e5f-b0c4e89bb05b', 5, 'O que já tentou para resolver esses problemas?', 'multiple_choice',
'["Investiu em marketing digital", "Contratou mais pessoas", "Fez cursos/capacitação", "Buscou consultoria", "Reduziu custos", "Ainda não tomou ação", "Diversificou produtos/serviços"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

-- Pergunta 3: Onde o cliente quer chegar em 3 meses?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6e4bac61-b07d-4fe1-b284-ee3009226a68', 1, 'Qual a meta de faturamento em 3 meses?', 'single_choice',
'["Manter atual estável", "Crescer 10-20%", "Crescer 20-50%", "Dobrar faturamento", "Não tenho meta clara"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6e4bac61-b07d-4fe1-b284-ee3009226a68', 2, 'Quantos clientes novos deseja conquistar?', 'single_choice',
'["5 a 10 novos", "10 a 20 novos", "20 a 50 novos", "Mais de 50 novos", "Foco em reter os atuais"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6e4bac61-b07d-4fe1-b284-ee3009226a68', 3, 'Qual área mais precisa melhorar nesses 3 meses?', 'single_choice',
'["Vendas/Comercial", "Marketing/Visibilidade", "Operações/Processos", "Finanças/Controle", "Produto/Serviço", "Atendimento ao cliente"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6e4bac61-b07d-4fe1-b284-ee3009226a68', 4, 'O que considera sucesso daqui 3 meses?', 'multiple_choice',
'["Faturamento maior", "Mais clientes ativos", "Menos estresse/trabalho", "Equipe estruturada", "Processos organizados", "Marca mais conhecida", "Mais tempo livre"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6e4bac61-b07d-4fe1-b284-ee3009226a68', 5, 'Qual investimento pode fazer nos próximos 3 meses?', 'single_choice',
'["Até R$ 1.000/mês", "R$ 1.000 - R$ 3.000/mês", "R$ 3.000 - R$ 5.000/mês", "R$ 5.000 - R$ 10.000/mês", "Acima de R$ 10.000/mês", "Sem verba para investir"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

-- Pergunta 4: Onde quer chegar neste mês?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'fbbb1fa0-94da-41f7-8eb6-922a9577bf57', 1, 'Qual o foco principal este mês?', 'single_choice',
'["Aumentar vendas imediatas", "Gerar mais leads", "Melhorar atendimento", "Organizar processos", "Criar conteúdo", "Lançar produto/serviço", "Reduzir custos"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'fbbb1fa0-94da-41f7-8eb6-922a9577bf57', 2, 'Quantas horas por semana pode dedicar às melhorias?', 'single_choice',
'["Menos de 5 horas", "5 a 10 horas", "10 a 20 horas", "Mais de 20 horas", "Tempo integral"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'fbbb1fa0-94da-41f7-8eb6-922a9577bf57', 3, 'Tem algum evento ou data importante este mês?', 'multiple_choice',
'["Data comemorativa relevante", "Lançamento programado", "Período de alta demanda", "Período de baixa demanda", "Renovação de contrato/parceria", "Nenhum evento específico"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'fbbb1fa0-94da-41f7-8eb6-922a9577bf57', 4, 'Qual resultado mensurável espera ao final do mês?', 'single_choice',
'["X vendas novas", "X leads gerados", "X% aumento de engajamento", "X novos seguidores", "Processo X implementado", "Reduzir X% de custos"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'fbbb1fa0-94da-41f7-8eb6-922a9577bf57', 5, 'Qual recurso está disponível para ação imediata?', 'multiple_choice',
'["Verba para tráfego pago", "Tempo do proprietário", "Equipe interna", "Parceiros/Fornecedores", "Material/Estoque", "Nenhum recurso extra"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

-- Pergunta 5: O que impede esse avanço hoje?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '21ab123f-1bdc-4bf8-8c67-c4681fde8cb9', 1, 'Qual o principal bloqueio mental/emocional?', 'single_choice',
'["Medo de investir e perder", "Insegurança sobre decisões", "Perfeccionismo excessivo", "Procrastinação/Inércia", "Não acredita que vai funcionar", "Nenhum - estou motivado"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '21ab123f-1bdc-4bf8-8c67-c4681fde8cb9', 2, 'Qual barreira externa mais impacta?', 'single_choice',
'["Falta de capital", "Concorrência agressiva", "Economia/Mercado ruim", "Falta de demanda", "Regulamentação/Burocracia", "Fornecedores/Parcerias"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '21ab123f-1bdc-4bf8-8c67-c4681fde8cb9', 3, 'O que falta para dar o próximo passo?', 'multiple_choice',
'["Conhecimento/Capacitação", "Ferramenta/Tecnologia", "Pessoa/Especialista", "Dinheiro/Investimento", "Tempo/Disponibilidade", "Coragem/Decisão", "Clareza do que fazer"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '21ab123f-1bdc-4bf8-8c67-c4681fde8cb9', 4, 'O que já não funciona mais e precisa mudar?', 'multiple_choice',
'["Estratégia de vendas atual", "Canais de divulgação", "Precificação", "Público-alvo escolhido", "Produtos/Serviços oferecidos", "Modelo de negócio", "Nada - tudo funciona bem"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '21ab123f-1bdc-4bf8-8c67-c4681fde8cb9', 5, 'Se pudesse resolver apenas 1 coisa, qual seria?', 'single_choice',
'["Ter mais clientes", "Ter mais dinheiro", "Ter mais tempo", "Ter melhor equipe", "Ter mais conhecimento", "Ter mais visibilidade"]'::jsonb, true
FROM frameworks f WHERE f.slug = 'gap-analysis';

-- =============================================
-- 5W2H - Plano de Ação
-- =============================================

-- Pergunta 1: O que precisa ser feito?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'e1bd7256-a57b-4ae5-a6c5-cc6b25ccc851', 1, 'Em qual área principal está a ação?', 'single_choice',
'["Marketing/Comunicação", "Vendas/Comercial", "Operações/Processos", "Finanças/Gestão", "Produto/Serviço", "Equipe/RH", "Tecnologia/Sistemas"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'e1bd7256-a57b-4ae5-a6c5-cc6b25ccc851', 2, 'Qual tipo de ação é?', 'single_choice',
'["Criar algo novo", "Melhorar algo existente", "Corrigir um problema", "Automatizar processo", "Eliminar desperdício", "Expandir/Escalar", "Testar/Experimentar"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'e1bd7256-a57b-4ae5-a6c5-cc6b25ccc851', 3, 'Qual o resultado esperado?', 'single_choice',
'["Aumentar faturamento", "Reduzir custos", "Economizar tempo", "Melhorar qualidade", "Aumentar satisfação cliente", "Aumentar visibilidade", "Organizar processos"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'e1bd7256-a57b-4ae5-a6c5-cc6b25ccc851', 4, 'Qual a complexidade da ação?', 'single_choice',
'["Simples - faço sozinho em horas", "Média - preciso de alguns dias", "Alta - preciso de semanas", "Muito alta - projeto de meses", "Não sei avaliar ainda"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'e1bd7256-a57b-4ae5-a6c5-cc6b25ccc851', 5, 'Quais entregas/milestones compõem essa ação?', 'multiple_choice',
'["Pesquisa/Análise", "Planejamento detalhado", "Criação de material", "Implementação técnica", "Teste/Validação", "Lançamento", "Monitoramento/Ajustes"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

-- Pergunta 2: Por que isso é importante agora?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'de091c17-de5c-4a33-bf50-109c5a72b205', 1, 'O que acontece se NÃO fizer isso?', 'single_choice',
'["Perda de clientes", "Perda de dinheiro", "Perda de oportunidade", "Atraso nos objetivos", "Problema vai piorar", "Nada grave - é melhoria"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'de091c17-de5c-4a33-bf50-109c5a72b205', 2, 'Por que agora e não antes?', 'single_choice',
'["Não tinha recursos", "Não era prioridade", "Não sabia como fazer", "Não tinha percebido o problema", "Mercado/Contexto mudou", "Agora tenho suporte/ajuda"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'de091c17-de5c-4a33-bf50-109c5a72b205', 3, 'Qual problema isso resolve?', 'multiple_choice',
'["Baixo faturamento", "Poucos clientes", "Baixa visibilidade", "Desorganização", "Custos altos", "Qualidade ruim", "Equipe desmotivada", "Cliente insatisfeito"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'de091c17-de5c-4a33-bf50-109c5a72b205', 4, 'Tem janela de oportunidade?', 'single_choice',
'["Sim - data específica se aproximando", "Sim - sazonalidade favorável", "Sim - concorrente fraco agora", "Não - posso fazer quando quiser", "Sim - tenho recurso disponível agora"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, 'de091c17-de5c-4a33-bf50-109c5a72b205', 5, 'Qual o impacto esperado no negócio?', 'single_choice',
'["Transformador - muda tudo", "Alto - impacto significativo", "Médio - melhoria importante", "Baixo - ajuste fino", "Preventivo - evita problemas futuros"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

-- Pergunta 3: Quem é responsável?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '9a2399bd-e2c3-410a-9965-193a02bc454b', 1, 'Quem vai executar principalmente?', 'single_choice',
'["Eu mesmo(a)", "Funcionário interno", "Freelancer/Terceiro", "Agência parceira", "Sócio/Parceiro", "Equipe em conjunto"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '9a2399bd-e2c3-410a-9965-193a02bc454b', 2, 'Essa pessoa já tem experiência nisso?', 'single_choice',
'["Sim - muito experiente", "Sim - experiência básica", "Parcial - vai precisar aprender", "Não - primeira vez", "Não sei avaliar"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '9a2399bd-e2c3-410a-9965-193a02bc454b', 3, 'Quem vai supervisionar/aprovar?', 'single_choice',
'["Eu mesmo(a)", "Gerente/Líder", "Sócio", "Cliente final", "Ninguém - autonomia total"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '9a2399bd-e2c3-410a-9965-193a02bc454b', 4, 'Precisa de apoio de outras pessoas?', 'multiple_choice',
'["Designer/Criativo", "Programador/TI", "Vendedor/Comercial", "Administrativo/Financeiro", "Jurídico/Contábil", "Fornecedor externo", "Não precisa de apoio"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '9a2399bd-e2c3-410a-9965-193a02bc454b', 5, 'Como será a comunicação sobre o andamento?', 'single_choice',
'["Relatório semanal", "Reunião periódica", "Mensagens informais", "Dashboard/Sistema", "Só no final", "Acompanhamento diário"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

-- Pergunta 4: Quando será feito?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '3896acb5-9cfc-460b-92f8-6014a7843886', 1, 'Qual o prazo total para conclusão?', 'single_choice',
'["Esta semana", "Próximas 2 semanas", "Este mês", "Próximo mês", "Próximo trimestre", "Sem prazo definido"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '3896acb5-9cfc-460b-92f8-6014a7843886', 2, 'Quando começa?', 'single_choice',
'["Já começou", "Esta semana", "Próxima semana", "Início do mês", "Depende de outro fator", "Ainda não definido"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '3896acb5-9cfc-460b-92f8-6014a7843886', 3, 'Tem data limite rígida?', 'single_choice',
'["Sim - data de evento", "Sim - compromisso com cliente", "Sim - sazonalidade", "Não - flexível", "Sim - limite de orçamento"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '3896acb5-9cfc-460b-92f8-6014a7843886', 4, 'Qual a frequência de trabalho nisso?', 'single_choice',
'["Todos os dias", "Alguns dias por semana", "Semanalmente", "Pontual/Único", "Conforme disponibilidade"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '3896acb5-9cfc-460b-92f8-6014a7843886', 5, 'Quais marcos intermediários?', 'multiple_choice',
'["Fase de planejamento", "Fase de criação", "Fase de revisão", "Fase de teste", "Fase de lançamento", "Fase de ajustes", "Sem fases definidas"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

-- Pergunta 5: Onde será aplicado?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '15af87b7-b703-4573-8b41-5c178643e9e7', 1, 'Qual o escopo geográfico?', 'single_choice',
'["Local/Bairro", "Municipal/Cidade", "Regional/Estado", "Nacional", "Internacional"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '15af87b7-b703-4573-8b41-5c178643e9e7', 2, 'Onde será implementado primeiro?', 'single_choice',
'["Loja física", "E-commerce/Site", "Redes sociais", "WhatsApp", "Interno da empresa", "Com parceiros", "Todos ao mesmo tempo"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '15af87b7-b703-4573-8b41-5c178643e9e7', 3, 'Quais canais serão impactados?', 'multiple_choice',
'["Instagram", "Facebook", "WhatsApp", "Site/Blog", "E-mail", "Loja física", "Telefone", "YouTube/TikTok", "LinkedIn"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '15af87b7-b703-4573-8b41-5c178643e9e7', 4, 'Qual departamento/área mais afetado?', 'single_choice',
'["Marketing", "Vendas", "Operações", "Financeiro", "Atendimento", "Produção", "Todos igualmente"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '15af87b7-b703-4573-8b41-5c178643e9e7', 5, 'Precisa de alguma infraestrutura?', 'multiple_choice',
'["Espaço físico", "Equipamentos", "Software/Sistema", "Materiais/Insumos", "Nada especial", "Conexão internet", "Veículo"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

-- Pergunta 6: Como será executado?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '7c5b3571-15d7-4ed6-a641-f84f145f1f1a', 1, 'Qual a metodologia principal?', 'single_choice',
'["Passo a passo definido", "Ágil/Iterativo", "Tentativa e erro", "Seguir modelo/template", "Contratar especialista", "Aprender fazendo"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '7c5b3571-15d7-4ed6-a641-f84f145f1f1a', 2, 'Quais ferramentas vai usar?', 'multiple_choice',
'["Planilhas/Google Sheets", "Canva/Design", "Redes sociais nativas", "Ferramenta de automação", "CRM/Gestão", "WhatsApp Business", "E-mail marketing", "Ads/Tráfego pago"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '7c5b3571-15d7-4ed6-a641-f84f145f1f1a', 3, 'Como vai medir o progresso?', 'single_choice',
'["Checklist de tarefas", "Métricas definidas", "Reuniões de acompanhamento", "Feedback do cliente", "Resultado final", "Ainda não sei"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '7c5b3571-15d7-4ed6-a641-f84f145f1f1a', 4, 'Qual o primeiro passo concreto?', 'single_choice',
'["Pesquisar/Estudar", "Planejar detalhes", "Criar material", "Conversar com pessoas", "Comprar/Contratar algo", "Começar a fazer"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '7c5b3571-15d7-4ed6-a641-f84f145f1f1a', 5, 'Precisa de treinamento/capacitação?', 'single_choice',
'["Não - já sei fazer", "Sim - curso online", "Sim - consultoria", "Sim - tutorial/vídeo", "Parcial - só alguns pontos", "Vou aprender fazendo"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '7c5b3571-15d7-4ed6-a641-f84f145f1f1a', 6, 'Qual o plano B se não funcionar?', 'single_choice',
'["Ajustar e tentar de novo", "Mudar abordagem completamente", "Contratar alguém", "Pausar e repensar", "Não tenho plano B", "Voltar ao que era antes"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

-- Pergunta 7: Quanto vai custar?
INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6a0d1155-b44c-41b1-b1b3-cd4172317787', 1, 'Qual o orçamento disponível?', 'single_choice',
'["Sem custo - recursos próprios", "Até R$ 500", "R$ 500 - R$ 1.000", "R$ 1.000 - R$ 3.000", "R$ 3.000 - R$ 5.000", "Acima de R$ 5.000"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6a0d1155-b44c-41b1-b1b3-cd4172317787', 2, 'Quais os principais custos envolvidos?', 'multiple_choice',
'["Mão de obra/Serviços", "Ferramentas/Software", "Materiais/Insumos", "Mídia/Publicidade", "Equipamentos", "Treinamento", "Deslocamento", "Sem custos previstos"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6a0d1155-b44c-41b1-b1b3-cd4172317787', 3, 'Investimento é único ou recorrente?', 'single_choice',
'["Único - só uma vez", "Recorrente mensal", "Recorrente anual", "Misto - parte única, parte recorrente"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6a0d1155-b44c-41b1-b1b3-cd4172317787', 4, 'Qual o retorno esperado?', 'single_choice',
'["ROI direto - mais vendas", "Economia de custos", "Economia de tempo", "Difícil mensurar - qualitativo", "Longo prazo - investimento", "Não sei calcular"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6a0d1155-b44c-41b1-b1b3-cd4172317787', 5, 'Em quanto tempo espera retorno?', 'single_choice',
'["Imediato - este mês", "Curto prazo - 1-3 meses", "Médio prazo - 3-6 meses", "Longo prazo - 6+ meses", "Não espero retorno financeiro direto"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';

INSERT INTO framework_assistant_questions (framework_id, target_question_id, question_order, question_text, question_type, options, allow_other)
SELECT f.id, '6a0d1155-b44c-41b1-b1b3-cd4172317787', 6, 'Como vai financiar?', 'single_choice',
'["Capital próprio disponível", "Reinvestimento de lucros", "Empréstimo/Financiamento", "Parcelamento", "Troca/Permuta", "Não precisa de investimento"]'::jsonb, true
FROM frameworks f WHERE f.slug = '5w2h';
