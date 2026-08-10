-- Add Closer Scripts
INSERT INTO sdr_scripts (title, category, channel, content, variables, target_profile, is_active)
VALUES 
('Conexão Inicial (Closer)', 'abertura', 'Call', 'Fala, {nome}! Tudo certo? Me chamo {consultor}, sou um dos especialistas aqui da Assessoria Alpha. Vi que você já conversou com o {sdr_nome} e estou empolgado para entender como podemos escalar o faturamento da {empresa}. Para começar, me conta um pouco: o que mais te chamou atenção na Alpha?', ARRAY['nome', 'consultor', 'sdr_nome', 'empresa'], 'all', true),

('Explicação do Tripé de Resultados', 'proposta', 'Call', 'Hoje trabalhamos no que chamamos de Tripé da Geração de Resultados: 1. Criativo (que é o que para o dedo do cliente no Instagram), 2. Tráfego (quem vai ver esse anúncio) e 3. Meio de Conversão (onde ele compra). Não adianta ter tráfego se o seu meio de conversão não está pronto. Nós cuidamos dos três para você.', ARRAY['empresa'], 'all', true),

('Fechamento com Urgência (Desconto na Call)', 'proposta', 'Call', 'Olha, {nome}, como você está aqui agora e demonstrou total aderência ao nosso perfil, eu consigo te liberar uma condição especial exclusiva para fecharmos agora: de R$ {valor_cheio} por R$ {valor_desconto} mensais. Isso é para a gente já iniciar a implementação amanhã mesmo.', ARRAY['nome', 'valor_cheio', 'valor_desconto'], 'quente', true),

('Pergunta Final de Parceria', 'agendamento', 'Call', 'Diante de tudo o que conversamos, {nome}, o que eu posso fazer por você hoje para que a gente já inicie essa parceria agora mesmo?', ARRAY['nome'], 'all', true);
