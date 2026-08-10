-- 1. Insert/Update No Show Reduction Tactics
INSERT INTO public.sdr_stage_tactics (stage_key, title, description, checklist, display_order)
VALUES 
('lead_quente', 'Redução de No Show Alpha', 'Garantir que o lead apareça na reunião marcada com o closer.', 
 ARRAY['Qualificar bem antes de agendar (dor real)', 'Validar compromisso de forma firme (duas vezes)', 'Enviar resumo com benefícios da call na hora', 'Confirmação na noite anterior', 'Lembrete 2h antes e Link 1h antes', 'Lembrete final 30 min com tom de contagem regressiva'], 1);

-- 2. Insert Alpha Follow-up Methodology into guides
-- This ensures the UI has the content provided by the user
INSERT INTO public.sdr_strategy_guides (category, title, content, display_order, is_active)
VALUES 
('lead_frio', 'Documento de Processo Follow-Up Alpha', 
'## Objetivo
Manter o relacionamento com leads que demonstraram interesse, mas ainda não avançaram. Criar vínculo e manter o lead engajado.

## Regras de Ouro
- Mantenha o lead engajado no seu fluxo.
- Se o lead não responde, não desista no primeiro "silêncio".
- Alterne entre mensagens de valor e lembretes diretos.

## Próximos Passos
- Se o lead reagir positivamente, agendar call imediatamente.
- Se pedir mais tempo, agendar retorno no CRM para 3-5 dias.', 2, true),

('lead_quente', 'Guia de Redução de No Show Alpha', 
'## Por que isso é importante?
Marcar a reunião é só metade do trabalho. A outra metade é garantir presença. Taxa ideal: 20% ou menos.

## Como Reduzir o No Show
1. **Tudo começa na qualificação**: Não encha a agenda com qualquer lead. Só marque com quem tem perfil e dor real.
2. **Valide o compromisso**: "Você consegue estar disponível mesmo, sem interrupções? O especialista separa esse horário exclusivo."
3. **Venda o valor da reunião**: "Mesmo que não feche, você já sai com ideias práticas. É uma consultoria personalizada."', 3, true);

-- 3. Add Alpha Scripts to the database
INSERT INTO public.sdr_scripts (title, category, channel, content, target_profile, variables, is_active)
VALUES 
('Follow-up 1: Engajamento Alpha', 'followup', 'WhatsApp', 
'Opa {nome}, tudo bem? Estou passando para ver se você conseguiu dar uma olhada no material que te enviei. Alguma dúvida sobre como podemos ajudar a {empresa}?', 
'frio', ARRAY['nome', 'empresa'], true),

('Follow-up 2: Gerando Curiosidade', 'followup', 'WhatsApp', 
'Oi {nome}, acabei de ver um resultado aqui de um cliente do mesmo nicho que o seu e lembrei da nossa conversa. Teria 2 minutos para um áudio rápido?', 
'frio', ARRAY['nome'], true),

('Objeção: "Vou falar com meu sócio"', 'objecao', 'WhatsApp', 
'Perfeito {nome}, inclusive recomendo que ele participe da nossa call, pois assim já tiramos as dúvidas de ambos e ganhamos tempo. O que acha de amanhã às 14h?', 
'quente', ARRAY['nome'], true),

('Objeção: "Em quanto tempo tenho resultado?"', 'objecao', 'WhatsApp', 
'Trabalhamos com projetos de início, meio e fim. Uma média boa para sentir o trabalho e ter noção real de resultados é de 3 meses. Faz sentido pra você?', 
'quente', ARRAY['nome'], true),

('Lembrete 1h antes (Anti No-Show)', 'agendamento', 'WhatsApp', 
'Oi {nome}, tudo certo para nossa conversa em 1h? O link da sala é este: {link}. Separei aqui a análise do seu Instagram para te mostrar.', 
'quente', ARRAY['nome', 'link'], true);
