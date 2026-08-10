-- Garantir que a coluna metadata exista
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sdr_stage_tactics' AND column_name = 'metadata') THEN
        ALTER TABLE public.sdr_stage_tactics ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 1. Árvore de Etapas da Estratégia (usando colunas existentes)
INSERT INTO public.sdr_strategy_steps (label, description, next_steps_instructions, step_key)
VALUES 
    ('Formulário Preenchido', 'O lead acabou de demonstrar interesse direto. Velocidade é tudo.', 'Ligar em até 5 min ou enviar WhatsApp imediato.', 'form_preenchido'),
    ('Qualificação', 'Entender se o lead tem perfil (Fit) e dor latente.', 'Aplicar SPIN Selling para elevar nível de consciência.', 'qualificacao'),
    ('Lead Quente', 'Lead qualificado com alto interesse e urgência.', 'Agendar reunião com especialista e enviar material de apoio.', 'lead_quente'),
    ('Lead Frio / Follow-up', 'Lead que esfriou ou não atende aos critérios imediatos.', 'Aplicar régua de follow-up 2x por semana via WhatsApp.', 'lead_frio')
ON CONFLICT (step_key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    next_steps_instructions = EXCLUDED.next_steps_instructions;

-- 2. Táticas e Processos de Follow-Up (Assessoria Alpha)
INSERT INTO public.sdr_stage_tactics (title, stage_key, description, checklist, display_order, metadata)
VALUES 
    (
        'Processo de Follow-Up WhatsApp', 
        'fechamento', 
        'Estratégia Alpha: Criar vínculo e manter o lead aquecido sem parecer insistente.', 
        ARRAY[
            'Etiquetar no WhatsApp (Follow 1, 2, 3 ou Reengajamento)',
            'Frequência: 2x por semana (Terça e Quinta)',
            'Variar formato: Texto, Áudio ou Vídeo',
            'Personalizar: Nome, Cidade, Tipo de Negócio',
            'Sempre terminar com uma pergunta de engajamento'
        ], 
        1,
        '{"tool": "WhatsApp Labels", "frequency": "2x/week"}'::jsonb
    ),
    (
        'Abordagem de Valor (Follow)', 
        'fechamento', 
        'Táticas para reengajar leads que pararam de responder.', 
        ARRAY[
            'Gatilho de Valor: "Vi um conteúdo que me lembrou do seu negócio"',
            'Prova Social: "Atendemos um cliente similar e tivemos X resultado"',
            'Oferta Útil: Enviar material gratuito (Ebook/Planilha)',
            'Novidade: Lançamento de nova condição ou vaga na agenda'
        ], 
        2,
        '{"approach": "Empathetic Value"}'::jsonb
    )
ON CONFLICT DO NOTHING;

-- 3. Scripts de Objeções e Follow-up (com cast explícito para ARRAY[]::text[])
INSERT INTO public.sdr_scripts (title, category, channel, content, variables, target_profile, use_count)
VALUES 
    (
        'Objeção: Desqualificado (Faturamento)', 
        'objecao', 
        'WhatsApp', 
        '{nome}, entendi perfeitamente seu momento atual. Para sermos assertivos na escala, hoje você investiria R$3.500,00 mensalmente em marketing dentro da sua operação?', 
        ARRAY['nome']::text[], 
        'frio', 
        0
    ),
    (
        'Objeção: Tem Garantia?', 
        'objecao', 
        'WhatsApp/Call', 
        'Esse valor é um INVESTIMENTO, e como qualquer investimento, ele precisa ser bem analisado. O que eu consigo te prometer é que você vai ter uma equipe de 80+ especialistas e 500+ parceiros cuidando de você. Vamos tirar essa dúvida em call?', 
        ARRAY[]::text[], 
        'quente', 
        0
    ),
    (
        'Objeção: Tempo de Resultado', 
        'objecao', 
        'WhatsApp', 
        'Trabalhamos com projetos de início, meio e fim. Uma média boa para sentir o trabalho e ter noção real de resultados é de 3 meses. Faz sentido para o seu planejamento atual?', 
        ARRAY[]::text[], 
        'quente', 
        0
    ),
    (
        'Follow-up: Gatilho de Valor', 
        'followup', 
        'WhatsApp', 
        'Oi {nome}! Ontem tivemos uma reunião com um restaurante bem parecido com o seu. Conseguimos alavancar as vendas com ajustes no atendimento. Lembrei muito de você! Como estão as coisas por aí?', 
        ARRAY['nome']::text[], 
        'all', 
        0
    )
ON CONFLICT DO NOTHING;