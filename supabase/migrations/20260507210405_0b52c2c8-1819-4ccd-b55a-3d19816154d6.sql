-- Limpar táticas antigas para evitar duplicidade na migração do playbook
DELETE FROM public.sdr_stage_tactics;

-- Inserir Táticas e Checklists por Etapa (Playbook Alpha)
INSERT INTO public.sdr_stage_tactics (stage_key, title, description, checklist, display_order) VALUES
('form_preenchido', 'Abordagem Ultra-Rápida', 'O SDR deve ser o primeiro ponto de contato em até 10 minutos.', ARRAY['Responder em até 10 minutos', 'Mensagem leve e direta no WhatsApp', 'Identificar se é o proprietário do negócio', 'Solicitar o @ do Instagram/Site']::text[], 1),
('qualificacao', 'Diagnóstico Consultivo', 'Coletar informações para o Closer personalizar a consultoria.', ARRAY['Analisar Redes Sociais (@)', 'Validar se já investe em marketing', 'Identificar maior dor do negócio', 'Verificar faturamento mensal (Meta: >50k)']::text[], 2),
('lead_quente', 'Pitch e Agendamento Alpha', 'Apresentar a Alpha como especialista no setor alimentício.', ARRAY['Apresentar case de +500 clientes no ramo', 'Validar disposição para investimento (>3.5k/mês)', 'Confirmar presença de sócios na call', 'Preencher briefing completo para o Closer']::text[], 3),
('lead_frio', 'Régua de Follow-up Alpha', 'Recuperar leads que não avançaram ou não compareceram.', ARRAY['Vídeo bolinha personalizado no WhatsApp', 'Mensagem de reengajamento após 24h', 'Compartilhar prova social relevante', 'Tentar ligação em horários alternativos']::text[], 4);

-- Atualizar Scripts de SDR com o novo Playbook Alpha
INSERT INTO public.sdr_scripts (title, category, channel, content, variables, target_profile, is_active) VALUES
('Abordagem Inicial (Proprietário)', 'abertura', 'whatsapp', 'Bom dia, tudo bem? Me chamo {meu_nome}, sou do comercial da Assessoria Alpha. Somos especialistas em marketing e inteligência comercial para restaurantes, e já contamos com mais de 500 clientes no ramo alimentício. Qual é o @ das redes sociais ou site do seu negócio?', ARRAY['meu_nome']::text[], 'inbound', true),
('Diagnóstico - Pitch Alpha', 'qualificacao', 'ligacao', 'Somos especialistas em gerar demanda para restaurantes com tráfego pago. Oferecemos serviço completo: criação de cardápios, captação/edição de vídeos, gestão de redes sociais e assessoria de atendimento. Nosso foco é claro: aumentar faturamento e maximizar resultados no setor alimentício. Esse é o tipo de trabalho que você busca hoje?', ARRAY[]::text[], 'quente', true),
('Objeção: "Não tenho tempo"', 'objecao', 'whatsapp', 'Entendo perfeitamente. Por isso nossa consultoria é direta, em 30 minutos já mostramos pontos de melhoria reais no seu negócio. Qual desses horários fica melhor para você?', ARRAY[]::text[], 'all', true),
('Objeção: "Já tenho marketing"', 'objecao', 'whatsapp', 'Excelente, isso mostra que você já entende a importância. O que fazemos é elevar os resultados, especialmente no setor alimentício. Vamos marcar uma conversa rápida para eu te mostrar como estamos superando as metas de quem já faz marketing?', ARRAY[]::text[], 'all', true),
('Lembrete Anti-No Show (2h antes)', 'confirmacao', 'whatsapp', 'Boa tarde, {nome}! Passando para confirmar nossa consultoria às {horario}. O especialista vai te mostrar como aumentar o faturamento do seu restaurante com estratégias de marketing já aplicadas em mais de 500 negócios.', ARRAY['nome', 'horario']::text[], 'quente', true);

-- Configurar KPIs e Metas (Configurações da Assessoria Alpha)
DELETE FROM public.sdr_kpi_configs;

INSERT INTO public.sdr_kpi_configs (metric_name, stage_name, target_value, is_active) VALUES
('Tempo Médio de Resposta', 'Ação Imediata', 10, true),
('Taxa de Contato', 'Engajamento Inicial', 80, true),
('Taxa de Qualificação', 'Diagnóstico', 40, true),
('Taxa de No Show', 'Comparecimento', 20, true),
('Taxa de Vendas', 'Conversão Final', 15, true);
