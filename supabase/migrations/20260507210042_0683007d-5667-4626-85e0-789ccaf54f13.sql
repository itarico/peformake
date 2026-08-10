-- Insert scripts for Landing Page Leads (Qualified)
INSERT INTO public.sdr_scripts (title, category, channel, content, variables, target_profile, strategy_step_key)
VALUES 
('Abordagem Inicial - Landing Page (Alpha)', 'abertura', 'ligacao', 
'Fala, {nome}! Tudo certo?
Me chamo {meu_nome}, sou um dos consultores aqui da Assessoria Alpha.
Vi que você acabou de preencher o formulário em nosso site.
Hoje você é o proprietário da(o) {negocio}, correto?', 
ARRAY['nome', 'meu_nome', 'negocio'], 'inbound', 'form_preenchido'),

('Quebra-Gelo & Conexão (Alpha)', 'abertura', 'ligacao', 
'Show de bola, {nome}!
Só por curiosidade: há quanto tempo você conhece a Alpha?', 
ARRAY['nome'], 'inbound', 'qualificacao'),

('Diagnóstico Inicial (Alpha)', 'abertura', 'ligacao', 
'Legal! Hoje, qual é a maior dificuldade que você enfrenta no seu negócio?
Vi aqui que você comentou que investe {valor_investimento}, certo?
Esse investimento você realiza por conta própria ou já tem alguma agência que te auxilia?', 
ARRAY['valor_investimento'], 'inbound', 'qualificacao'),

('Apresentação Alpha - Foco Resultado', 'proposta', 'ligacao', 
'Excelente, entendi!
Hoje nós atendemos mais de 500 restaurantes em todo o Brasil, ajudando cada um deles a faturar mais e vender todos os dias.
E uma coisa que eu já quero deixar bem clara: nós somos 100% focados em RESULTADO.
Diferente de muitas agências, aqui na Alpha te ajudamos em TODO o processo de vendas – não apenas gerando demanda, mas acompanhando conversão, estratégia, retenção e tudo o que impacta diretamente no seu caixa.
É isso que você está procurando hoje para o seu restaurante?', 
ARRAY['restaurante'], 'inbound', 'lead_quente'),

('Agendamento Estratégico (Alpha)', 'agendamento', 'ligacao', 
'Maravilha! Hoje você tem algum sócio na sua operação?
Vou agendar uma chamada com o nosso melhor consultor. Ele vai entender a fundo o que você precisa, te mostrar cases reais e te apresentar como conseguimos te ajudar de forma estratégica. 
{se_tiver_socio: É importante que você entre junto com o seu sócio.}
Se fizer sentido pra você, a gente já pode até mesmo iniciar uma parceria.
Tenho horário disponível às {horario1} ou às {horario2}. Qual desses fica melhor pra você?', 
ARRAY['horario1', 'horario2'], 'inbound', 'lead_quente'),

('Finalização e Confirmação (Alpha)', 'agendamento', 'whatsapp', 
'Fechado então!
Apenas confirmando, esse é o seu email? {email}
Vou te chamar no WhatsApp para te enviar o link da chamada. Qualquer dúvida até lá, estou à disposição!
Grande abraço, meu (minha) amigo(a)', 
ARRAY['email'], 'inbound', 'lead_quente'),

('Desqualificação (Faturamento < 50k)', 'objecao', 'ligacao', 
'{nome}, hoje você investiria R$3.500,00 mensalmente em marketing dentro da sua operação? 
[Se houver objeção, tratar como possível barreira de entrada ou oferecer solução alternativa de entrada]', 
ARRAY['nome'], 'inbound', 'qualificacao');

-- Update or Add Strategy Guides with Alpha specifics
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order)
VALUES 
('Metodologia Comercial Alpha - Script Landing Page', 'form_preenchido', 
'## Fluxo de Atendimento Landing Page
O objetivo aqui é a velocidade. Liga-Liga-Mensagem (Double Call).

## Estrutura do Script
1. **Abertura:** Conexão direta e validação do proprietário.
2. **Conexão:** Quebra-gelo sobre o tempo de casa.
3. **Diagnóstico:** Entender a dor e o investimento atual.
4. **Poder Alpha:** Falar sobre os 500+ restaurantes e foco em RESULTADO (não só lead).
5. **Fechamento:** Agendamento firme com consultor sênior.

## Regra de Ouro
Qualidade gera conversão. Se o faturamento for abaixo de 50k, usar o script de validação de investimento (3.5k) antes de agendar.', 1);

-- Add tactics for the new Alpha process
INSERT INTO public.sdr_stage_tactics (title, description, stage_key, checklist, display_order)
VALUES 
('Validação de Sócio', 'Sempre perguntar sobre sócios para garantir presença de todos os decisores na reunião.', 'lead_quente', ARRAY['Perguntar se tem sócio', 'Reforçar a importância da presença dele', 'Confirmar se o sócio está livre no horário'], 5),
('Triagem de Faturamento', 'Filtro para leads que não atendem ao perfil mínimo da Assessoria Alpha.', 'qualificacao', ARRAY['Validar faturamento atual', 'Testar disposição para investimento de 3.5k/mês', 'Verificar auxílio de agência atual'], 6);
