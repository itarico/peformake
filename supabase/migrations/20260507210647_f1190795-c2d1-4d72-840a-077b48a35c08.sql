-- Add Closer Stage to Strategy Steps
INSERT INTO sdr_strategy_steps (label, description, step_key, next_steps_instructions, methodology_info)
VALUES 
('Fechamento (Closer Call)', 'Reunião de consultoria focada em diagnosticar e fechar a parceria na hora.', 'closer_call', 'Se fechado: Briefing e Contrato. Se não: Follow-up programado.', 'Foco em geração de valor e fechamento na call.')
ON CONFLICT DO NOTHING;

-- Add Closer Guides
INSERT INTO sdr_strategy_guides (title, category, content, display_order, is_active)
VALUES 
('Estrutura da Reunião de Vendas', 'closer', '## 1. Quebra de Gelo / Apresentação
- Conversa leve e rápida, **GERAR CONEXÃO COM O LEAD**.
- Alinhar expectativas e explicar como a chamada vai acontecer.
- Deixar o cliente falar sobre o negócio detalhadamente.

## 2. Exploração de Dor e Desejo
- Qual o maior desafio do restaurante ou do dono?
- Já tentou resolver isso antes? Como?
- Já investiu em anúncios? Já teve agências?

## 3. Apresentação da Solução
- Explicação clara: estratégias, canais, diferenciais Alpha.
- Mostrar **cases semelhantes** (restaurantes).
- O Tripé: Criativo, Tráfego e Meio de conversão.

## 4. Fechamento na Call
- Planos simples (foco no benefício).
- Gatilhos: **Urgência (Desconto na call)**, Escassez, Segurança.
- Lidar com objeções com empatia.
- Pergunta chave: *"O que eu posso fazer por você para já iniciarmos a nossa parceria?"*', 1, true),

('Tratamento de Objeções (Closer)', 'closer', '## Objeção: "Está caro"
- Foque no ROI (Retorno sobre Investimento).
- Divida o valor em etapas ou mostre o custo de *não* fazer nada.

## Objeção: "Preciso falar com meu sócio"
- Tente trazer o sócio para a mesa ou agende uma rápida com ele.
- Pergunte: "Fora o sócio, existe algum outro impedimento?"

## Objeção: "Vou pensar"
- Use o gatilho de urgência: "Este desconto é válido apenas para o fechamento agora durante a consultoria."', 2, true);

-- Add Closer Tactics/Checklists
INSERT INTO sdr_stage_tactics (stage_key, title, description, checklist, display_order)
VALUES 
('closer_call', 'Checklist Pré-Reunião', 'Preparação fundamental antes de entrar na sala.', ARRAY['Analisar o Briefing feito pelo SDR no Google Agenda', 'Verificar o site/Instagram do restaurante do lead', 'Ser pontual (5 minutos antes)'], 1),
('closer_call', 'Tripé de Resultados Alpha', 'Conceito central a ser vendido na apresentação.', ARRAY['Criativo (O que chama atenção)', 'Tráfego (Quem vê o anúncio)', 'Meio de Conversão (Onde o cliente compra)'], 2),
('closer_call', 'Pós-Fechamento Imediato', 'Passos após o "Sim" do cliente.', ARRAY['Solicitar informações para o contrato', 'Colher assinaturas via plataforma', 'Iniciar Briefing de Onboarding'], 3);
