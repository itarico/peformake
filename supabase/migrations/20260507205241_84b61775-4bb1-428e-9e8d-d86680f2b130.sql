-- Limpar guias antigos ou desativar para substituir
UPDATE public.sdr_strategy_guides SET is_active = false;

-- Etapa 1: Atendimento Inbound (Form/WhatsApp)
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order) VALUES
('Estratégia: Lead de Formulário (Hot Lead)', 'contato_inicial', '## O que fazer quando o lead preenche o form?

O objetivo aqui é velocidade. O lead está com a dor "fresca" na cabeça.

**Processo:**
1. **Até 5 min:** Enviar WhatsApp personalizado.
2. **Até 15 min:** Tentar a primeira ligação se não responder o Whats.
3. **Persistência:** 3 tentativas de contato no primeiro dia.

**Tática de Abordagem:**
"Olá {{nome}}, vi que você acabou de solicitar um diagnóstico de marketing aqui na Peformake. Como sua empresa está escalando hoje?"

**Script sugerido:**
- "Oi {{nome}}, tudo bem? Aqui é o [Seu Nome] da Peformake. Notei seu interesse no nosso [Serviço/Produto]. Você prefere falar por aqui ou podemos fazer uma call rápida de 2 min?"', 1),

('Estratégia: Primeiro Contato via WhatsApp', 'contato_inicial', '## Abordagem de Alta Conversão no Whats

Nunca envie um "testão". Use a técnica da pergunta aberta.

**Processo:**
- **Início:** Saudação + Referência ao Form.
- **Meio:** Proposta de valor rápida (ex: "ajudamos empresas como a sua a [Resultado]").
- **Fim:** Pergunta curta para gerar resposta.

**Script:**
"Oi {{nome}}, vi seu interesse! Só para eu te mandar o material correto: hoje você já investe em anúncios ou está começando do zero?"', 2);

-- Etapa 2: Prospecção Ativa (Lead Frio)
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order) VALUES
('Ligação Direta (Cold Call) + Script', 'prospeccao_ativa', '## Estrutura da Ligação Fria

**Metodologia: O Gancho dos 15 segundos.**

1. **Abertura:** "Olá {{nome}}, aqui é o [Seu Nome] da Peformake. Eu sei que te peguei de surpresa, você tem 1 min para eu te contar por que estou ligando?"
2. **O Porquê:** "Vi que sua empresa [Referência de pesquisa] e ajudamos empresas do seu setor a [Resultado X]."
3. **O Fechamento:** "Faz sentido conversarmos sobre como aplicar isso aí também?"

**Tática:** Se o lead disser "estou ocupado", tente agendar: "Entendo perfeitamente. Qual o melhor horário amanhã: 10h ou 14h?"', 3);

-- Etapa 3: Qualificação e Metodologia
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order) VALUES
('Qualificação SPIN Selling', 'qualificacao', '## Metodologia SPIN na Prática

Use esta ordem para diagnosticar o lead:

**S - Situação:** "Como vocês atraem clientes hoje?"
**P - Problema:** "O que te impede de bater a meta hoje?"
**I - Implicação:** "Se você não resolver isso, quanto vai custar para a empresa em 6 meses?"
**N - Necessidade:** "Se tivéssemos uma máquina de leads rodando, como seria seu dia a dia?"', 4),

('Critérios BANT', 'qualificacao', '## Filtro BANT (Para decidir se vira Reunião)

**B - Budget:** Tem verba? (Mínimo R$ X.XXX)
**A - Autoridade:** Quem decide? Se não for ele, peça para trazer o sócio.
**N - Necessidade:** A dor dele nós resolvemos com excelência?
**T - Timing:** Ele quer começar agora ou só daqui a 1 ano?', 5);

-- Etapa 4: Conversão e Agendamento
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order) VALUES
('Agendamento de Reunião (Closing)', 'fechamento', '## O Momento do "Sim"

**Tática: Alternativa Dupla.**
Nunca pergunte "quando você pode?". Pergunte: "Fica melhor para você Terça às 14h ou Quarta às 10h?"

**Processo de Confirmação:**
1. Enviar convite no Google Calendar NA HORA.
2. Pedir para ele aceitar enquanto você está na linha.
3. Enviar lembrete 1h antes da reunião no dia seguinte.', 6);