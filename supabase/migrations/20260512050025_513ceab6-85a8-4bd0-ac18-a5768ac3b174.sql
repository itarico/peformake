-- Clear old specific guides to avoid mixing old/new if they aren't manually managed
DELETE FROM public.sdr_strategy_guides WHERE is_active = true;

-- Insert Playbook SDR Content
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order, is_active)
VALUES 
('Metodologia de Vendas Peformake', 'form_preenchido', '## O Mindset do SDR Peformake
O SDR não é um agendador de reuniões, ele é um **Consultor de Negócios**. Seu papel é entender se a Peformake pode gerar valor real para o cliente.

## Passo 1: O Atendimento Imediato (Regra de Ouro)
- **Tempo de Resposta:** Menos de 5 minutos.
- **Canal:** WhatsApp seguido de ligação se não houver resposta em 15 min.
- **Objetivo:** Capturar a atenção enquanto a dor está latente.

## Passo 2: O Gancho de Abertura
"Olá [Nome], aqui é o [Seu Nome] da Peformake. Vi que você acabou de solicitar um diagnóstico para sua empresa. Estou te ligando para entender um pouco mais do seu cenário antes de te passar para o nosso especialista. Tem 2 minutinhos?"', 1, true),

('Qualificação Profunda (SPIN Selling)', 'qualificacao', '## Metodologia SPIN
Use estas perguntas para descobrir a dor real:

**S - Situação:**
- Como você faz hoje seu marketing?
- Qual seu faturamento médio atual?

**P - Problema:**
- Quais são os principais gargalos hoje?
- Você sente que seu time de vendas está ocioso?

**I - Implicação:**
- Quanto você deixa de ganhar por não ter esses processos?
- Como isso afeta o crescimento da empresa em 6 meses?

**N - Necessidade de Solução:**
- Se resolvermos esse problema agora, o que muda na sua empresa?
- Como seria ter um time de especialistas cuidando disso para você?', 2, true),

('Quebra de Objeções (Biblioteca)', 'lead_quente', '## Como lidar com "Está Caro"
**Resposta:** "Entendo perfeitamente, [Nome]. Deixa eu te perguntar: você está comparando com o valor que vai investir ou com o retorno que espera ter? Na Peformake, não focamos em custo, mas em lucro sobre investimento."

## Objeção: "Vou falar com meu sócio"
**Resposta:** "Faz total sentido. Geralmente, quando os sócios conversam sem o especialista, surgem dúvidas técnicas que você talvez não queira ter que explicar sozinho. Por que não trazemos ele para a reunião com nosso Closer amanhã?"

## Objeção: "Me manda por e-mail"
**Resposta:** "Eu posso mandar, mas nosso trabalho é personalizado. Sem entender seu cenário na reunião, o PDF será apenas um monte de números sem contexto para sua empresa."', 3, true),

('Controle de No-Show (Anti No-Show)', 'lead_quente', '## A Arte da Confirmação
Não pergunte "Você vai na reunião?". Diga:
"Olá [Nome], passando para confirmar nossa reunião de amanhã às 14h. O [Nome do Closer] já preparou um diagnóstico preliminar do seu nicho e está ansioso para te mostrar. Nos vemos lá?"

**Dica:** Peça um "Ok" ou uma confirmação por áudio. Isso gera compromisso moral.', 4, true),

('Régua de Follow-up (Leads Frios)', 'lead_frio', '## Estratégia de Reengajamento
Se o lead sumiu:
- **Dia 1:** Mensagem de valor (Ex: Um vídeo curto da Peformake sobre o nicho dele).
- **Dia 3:** Check-in rápido. "Ainda faz sentido resolver [Problema]?"
- **Dia 7:** Mensagem de "Despedida". "Oi [Nome], imagino que suas prioridades mudaram. Vou encerrar seu processo por aqui para não ocupar seu tempo. Se precisar no futuro, estarei aqui."', 5, true);

-- Insert Strategy "Course" Content (Category mapping to a new logical group handled by the UI)
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order, is_active)
VALUES 
('Psicologia de Vendas e Gatilhos Mentais', 'estrategias', '## Gatilhos Fundamentais
1. **Autoridade:** Use cases da Peformake.
2. **Escassez:** "Só temos 2 vagas de onboarding para este mês".
3. **Prova Social:** "Trabalhamos com o cliente X do seu mesmo nicho".
4. **Reciprocidade:** Entregue um insight gratuito antes de pedir a reunião.', 10, true),

('Máquina de Vendas: A Lógica do CRM', 'estrategias', '## Funil de Vendas
- **Inbound:** Lead vem até você. Foco em velocidade.
- **Outbound:** Você vai até o lead. Foco em relevância e dor.
- **SQL (Sales Qualified Lead):** O lead que você, SDR, aprovou para o Closer.', 11, true),

('O Diferencial Peformake', 'estrategias', '## O que vendemos?
Nós não vendemos "Gestão de Tráfego". Nós vendemos **Previsibilidade de Faturamento**.
- Metodologia Própria.
- Squad de Especialistas Dedicado.
- Foco em ROAS e ROI, não apenas em cliques.', 12, true);
