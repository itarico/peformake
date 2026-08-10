-- Insert the calling strategy into sdr_strategy_guides
INSERT INTO public.sdr_strategy_guides (title, category, content, display_order, is_active)
VALUES (
  'Estratégia de Ligação (Cold Calling)',
  'metodologia',
  '## Estrutura da Ligação de Alta Conversão

### 1. Abertura (0-15 segundos)
**Objetivo:** Não ser desligado e ganhar permissão.
- **Script:** "Olá {nome}, aqui é o {meu_nome} da Peformake. Tudo bem? [Pausa] {nome}, eu sei que não estava esperando minha ligação, você tem 1 minuto para eu te contar por que estou te ligando e você decide se continuamos ou não?"
- **Técnica:** O pedido de permissão quebra a guarda do prospect.

### 2. Gancho de Atenção (Pesquisa)
**Objetivo:** Mostrar que você fez o dever de casa.
- **Script:** "Eu estava analisando o [Site/Instagram] da {empresa} e vi que vocês estão [detalhe específico, ex: expandindo para tal região]. É exatamente com empresas nesse momento que estamos trabalhando para [benefício principal]."

### 3. Qualificação e Descoberta (Sondagem)
**Objetivo:** Identificar se é um Lead A, B ou C.
- **Momento:** Logo após o gancho.
- **Perguntas Chave:**
  - "Hoje, qual o seu maior desafio para bater a meta de faturamento de {faixa_x}?"
  - "Como vocês estão lidando com [problema comum do nicho]?"
  - "Quem mais além de você participa da decisão sobre novas parcerias estratégicas?"

### 4. Venda do Próximo Passo (O Fechamento)
**Objetivo:** Agendar a reunião, não vender o serviço completo.
- **Script:** "Pelo que você me disse, faz todo sentido darmos um passo adiante. Tenho um horário na [Terça às 10h] ou [Quarta às 14h] para te mostrar como resolvemos isso para outras empresas. Qual fica melhor?"

## Melhores Técnicas
- **Tonalidade:** Use uma voz calma, mas confiante. Evite o "tom de vendedor de telemarketing".
- **Lidando com o "Não tenho tempo":** "Entendo perfeitamente, por isso mesmo estou ligando agora para agendarmos um momento em que você REALMENTE tenha tempo. Qual o melhor dia da próxima semana?"
- **Escuta Ativa:** Repita as últimas 3 palavras do que o prospect disse para mostrar que está ouvindo.',
  5,
  true
);

-- Note: We are not changing table names, only UI presentation as requested.
