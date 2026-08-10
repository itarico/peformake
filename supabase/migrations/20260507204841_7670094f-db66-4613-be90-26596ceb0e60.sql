-- Update sdr_strategy_guides with more detailed stage-based content
-- First, ensure the table exists (it should, based on the code view)

-- 1. Cold Outreach Strategy (Lead Frio)
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order, is_active)
VALUES (
'Prospecção Ativa (Lead Frio)', 
'metodologia', 
'## Metodologia: Predictable Revenue & Outbound Playbook
Focado em gerar interesse onde ainda não existe consciência de necessidade imediata.

## Tática: Abertura Direta com Valor
- **Técnica do Gancho:** Mencione algo específico do setor ou empresa.
- **Micro-compromisso:** O objetivo não é vender, é conseguir 15 minutos.

## Processo: Cadência 7x10
1. Dia 1: Ligação + E-mail
2. Dia 3: E-mail de Valor
3. Dia 5: Ligação (Período da tarde)
4. Dia 7: LinkedIn Interaction
5. Dia 10: E-mail de "Break-up"

## Scripts de Ligação (Frio)
**Abertura:**
"Olá [Nome], aqui é o [Seu Nome] da [Empresa]. Estou ligando porque vi que vocês estão expandindo [setor] e imaginei que [dor comum] fosse um desafio hoje. Teria 30 segundos para eu te contar como resolvemos isso para outras empresas como a [Referência]?"

**Lidando com "Não tenho tempo":**
"Entendo perfeitamente, [Nome]. Justamente por isso minha proposta é apenas agendar 10 minutos para a próxima terça às 14h, onde te mostro como economizar [X] horas do seu time. Faz sentido?"', 
10, 
true
);

-- 2. Inbound Conversion Strategy (Preencheu Form - Lead Quente)
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order, is_active)
VALUES (
'Conversão Inbound (Preencheu Form)', 
'metodologia', 
'## Metodologia: Speed-to-Lead
Leads que preenchem formulários têm uma "vida útil" de interesse baixíssima. A meta é contato em menos de 5 minutos.

## Tática: Lead Quente (SRD)
- **Contextualização:** "Vi que você acabou de baixar nosso material..."
- **Qualificação Rápida:** Use o framework BANT (Budget, Authority, Need, Timing) de forma fluida.

## Processo de Reação Rápida
1. Alerta no CRM/Slack instantâneo.
2. Primeira tentativa de ligação IMEDIATA.
3. Se não atender: WhatsApp imediato informando que tentou ligar.
4. Segunda tentativa em 1 hora.

## Scripts de Ligação (Quente)
**Abertura:**
"Oi [Nome], vi que você acabou de solicitar [material/contato] no nosso site. Para eu te direcionar para a pessoa certa, me conta: o que mais te chamou atenção na nossa solução?"

**Aprofundamento:**
"Perfeito. Geralmente quem busca isso está enfrentando [Problema A] ou [Problema B]. Qual desses mais te incomoda hoje?"', 
20, 
true
);

-- Delete old scripts if they are redundant or keep them but update the UI to show they are now in strategy
-- For now, let's just make sure the strategy guides are updated.
