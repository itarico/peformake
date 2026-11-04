# Diagnóstico de CEO — Peformake / Ellcazo — 04/11/2026

Fonte dos números: banco Supabase `peformake-app` (consulta somente leitura em
04/11/2026) + código deste repositório. Tudo marcado CONFIRMADO vem do banco;
HIPÓTESE precisa de validação. Custos de folha e sócios **não estão no banco** →
margem real ainda não calculável.

> ⚠️ Os dados vêm de um projeto Supabase criado em 02/11/2026 (provável migração).
> Datas de início de contrato podem ter sido importadas. Confirme as que parecerem
> estranhas antes de decisões grandes.

---

## 1. Resumo em 5 linhas

1. **O produto é bom, mas o balde está furado.** Churn de ~10% ao mês em ago–set
   e permanência média de **2,4 meses** nos clientes perdidos. A North Star
   ("renovar após 6 meses") ainda não foi atingida por nenhum cliente perdido.
2. **22% do MRR está em risco agora** (6 clientes avaliados como ruim/muito ruim).
3. **A empresa cobra pouco.** Ticket mediano de **R$ 850**; pacotes de 5 serviços
   saem por R$ 630–1.650, quando a própria tabela soma ~R$ 2.500+.
4. **A receita é da Ellcazo:** audiovisual = **67% do MRR**. A Peformake (tráfego,
   social, design, consultoria) responde por ~1/3.
5. **Aquisição sem medição:** 73% dos clientes sem canal registrado; dos que têm,
   77% vieram por indicação.

**Gargalo nº 1: RETENÇÃO. Gargalo nº 2: PREÇO. Gargalo nº 3: aquisição medida.**
Isto atualiza a leitura do SOSTAC do 3º tri (o gargalo seria só visibilidade):
crescer a aquisição sem fechar o churn só acelera a perda de CAC.

---

## 2. Painel do CEO (CONFIRMADO, 04/11/2026)

| Indicador | Valor | Referência | Status |
|---|---|---|---|
| Clientes cadastrados / ativos / perdidos | 48 / 35 / 11 | — | — |
| MRR ativo (serviços ativos de clientes ativos) | **R$ 36.232** | — | — |
| Clientes pagantes recorrentes | 31 | — | — |
| Ticket médio / **mediano** | R$ 1.169 / **R$ 850** | ICP pede ≥ R$ 2.500 | 🔴 |
| Maior cliente (Natalia de Menudo) | R$ 7.442 = **20,5%** do MRR | < 15% | 🟡 |
| Top 5 clientes | 41,6% do MRR | < 35% | 🟡 |
| MRR por área | AV R$ 24.372 (67%) · Tráfego R$ 5.650 (16%) · Social R$ 2.650 (7%) · Design R$ 2.500 (7%) · Consultoria R$ 960 (3%) | — | — |
| Clientes **só audiovisual** | 13 de 31 | — | oportunidade |
| Perdidos ago / set / out | 4 / 5 / 1 | churn ≤ 5% | 🔴 (~10%/mês ago–set) |
| Permanência média dos perdidos | 2,4 meses | ≥ 6 (North Star) | 🔴 |
| Motivos de perda | Fim de contrato 4 · Insatisfação com resultado 3 · Preço 2 · Mudou de agência 1 · Outro 1 | — | — |
| Cobertura de avaliação dos clientes | 16 de 35 (46%) | 100% semanal | 🔴 |
| Avaliados ruim/muito ruim | 6 de 16 → **R$ 8.040 MRR em risco (22%)** | < 10% | 🔴 |
| NPS preenchido | 1 cliente | — | 🔴 sem dado |
| Canal de aquisição vazio | 35 de 48 | 0 | 🔴 |
| Equipe ativa no banco | 10 (3 social, 2 design, 2 videomaker, 2 editor, 1 SDR) | — | — |
| MRR por pessoa da equipe | **~R$ 3,6 mil** | R$ 8–10 mil | 🔴 |
| Taxa de setup cobrada (total) | R$ 2.000 | — | baixa |

**Clientes em risco agora (última avaliação):**
muito ruim — CIA COFFE (R$ 1.650), Disalp (R$ 1.900), Cajá Limão (R$ 1.040);
ruim — Will Motos (R$ 1.900, "cobrou mais atenção"), SN Distribuidora (R$ 700,
"sem conseguir gravar no começo do mês"), 3LM (R$ 850).

---

## 3. Diagnósticos estratégicos

### D1 — Retenção é o gargalo real (macro)
Quem sai, sai cedo (0,8–4,4 meses). "Insatisfação com resultado" + "preço" = 5 de
11 perdas — os dois são o mesmo problema: **valor não visível**. O cliente mede a
agência pelo que vê (posts, vídeos), não por resultado em R$. O sistema já tem a
jornada certa (Growth Class, feedback D+21, reunião mensal e trimestral) — o furo
é **execução e medição**, não desenho.

### D2 — Preço abaixo do custo de entrega (micro → macro)
- Design a R$ 60/arte e consultoria a R$ 200/mês ensinam o cliente a comparar item.
- Pacotes completos (5 serviços) vendidos a 25–65% da tabela (Brio Burguer R$ 630,
  MF Máquinas R$ 1.150, Cia Coffee R$ 1.650).
- MRR por pessoa de R$ 3,6 mil com 10 pessoas = a conta só fecha com sócios
  trabalhando de graça ou margem negativa (HIPÓTESE até cruzar com a folha).
- Consultoria — o diferencial estratégico — gera R$ 960 de 10 clientes: está sendo dada.

### D3 — Duas empresas, uma conta
67% do MRR é audiovisual (Ellcazo). A Peformake, sozinha, tem MRR de ~R$ 12 mil.
Sem preço de transferência e DRE separada, uma frente pode estar bancando a outra.
Decidir: a Peformake é a "camada de estratégia + performance" que vende o
audiovisual da Ellcazo? Então o pacote precisa ser vendido como sistema, com preço
de sistema.

### D4 — ICP declarado ≠ base real
ICP escrito: clínicas e escritórios R$ 30–150 mil/mês. Base real: gastronomia (6
ativos, pacotes completos) + 13 clientes só de audiovisual com ticket R$ 350–600
(incluindo as clínicas, que compram só vídeo). Ou se assume **gastronomia** como
nicho (casa com o Gastromake e com a landing `/gastronomia` já pronta) ou a
prospecção muda de verdade para o ICP escrito. Recomendação: **gastronomia como
nicho-âncora** por 2 trimestres — já tem cases, oferta, landing e produto SaaS
sinérgico.

### D5 — Aquisição sem painel
Indicação é o canal que funciona, mas sem programa. 4 tabelas de lead diferentes,
CTA de WhatsApp do site apontando para número placeholder, canal de aquisição
vazio em 73% dos clientes. Não dá para saber CAC nem qual canal escalar.

### D6 — O sistema é um ativo, mas tem risco de segurança
(Detalhe técnico na skill `ceo-tecnologia-produto`.) Funções edge abertas sem
autenticação (custo de IA/WhatsApp abusável), senhas em texto puro, RLS aberta em
comissões, leads e preços de clientes. Há painéis prontos e escondidos (Retenção,
Cohort, Executive Dashboard, OKR) que resolvem parte de D1 e D5 sem construir nada.
Não há cobrança automática nem contas a receber.

### D7 — Dono no operacional
Com 6 frentes e o Italo dentro da entrega, a empresa anda no ritmo da energia
dele. Rituais e um responsável de operação/CS são o que protege a empresa dos
dias ruins.

---

## 4. Plano de 90 dias (04/11/2026 → 04/02/2027)

🎯 **OBJETIVO:** MRR de R$ 36,2 mil → **R$ 50 mil**, churn mensal ≤ 4%, MRR em
risco < 10%, 100% dos clientes avaliados toda semana.

Ponte do número (HIPÓTESE): segurar churn (+R$ 3,5 mil/mês preservados) + upsell
AV→tráfego (+R$ 2,3 mil) + reajuste na renovação (+R$ 3 mil) + 5 clientes novos a
R$ 1,8 mil (+R$ 9 mil) ≈ R$ 50–54 mil.

### Aposta 1 — Operação Resgate (semanas 1–2) · dono: Italo + líderes de squad
- Ligação do Italo para os 6 clientes em risco em até 48h; plano de 14 dias com
  1 entrega extra visível por cliente (não desconto).
- Avaliar os 19 clientes sem avaliação até sexta.
- Métrica: MRR em risco R$ 8.040 → < R$ 3.000 até 18/11.

### Aposta 2 — Valor visível (semanas 2–6) · dono: head de marketing
- Toda conta recorrente com **1 métrica de resultado do cliente** combinada.
- Relatório mensal de 1 página + reunião mensal de 30 min para 100% dos recorrentes.
- Ritual de avaliação semanal (sexta) — 100% de cobertura.
- Reativar no sistema a aba Cohort & Retenção.
- Métrica: churn ≤ 4% em dez e jan.

### Aposta 3 — Nova arquitetura de preço (semanas 2–8) · dono: Italo
- 3 pacotes (Essencial / Crescimento / Escala) com piso de **R$ 1.500** para novos
  contratos; consultoria e design deixam de ser vendidos avulsos baratos.
- Reajuste na renovação da coorte de maio (19 contratos) com entrega a mais.
- Upsell para os 13 clientes só de audiovisual: "o vídeo vira anúncio" (tráfego
  R$ 600). Meta: 4 conversões.
- Métrica: ticket mediano R$ 850 → R$ 1.200.

### Aposta 4 — Aquisição medida no nicho gastronomia (semanas 3–12) · dono: SDR + Italo
- Corrigir o WhatsApp do site; canal de aquisição obrigatório; leads de todos os
  formulários no pipeline do SDR.
- Programa de indicação (pedido ativo no D+21 e no mês 3, recompensa clara).
- Outbound: 100 restaurantes do Recife, cadência de 8 toques em 14 dias.
- Conteúdo do Italo (MDD) com cases de gastronomia.
- Métrica: 15 leads/semana, 5 reuniões/semana, 5 contratos novos no trimestre.

### Aposta transversal — Sprint de segurança do sistema (semanas 1–3) · dono: dev
Autenticação nas funções edge, hash de senhas, revisão de RLS, crons em migration.

### 🛑 Parar de fazer
- Vender pacote de 4–5 serviços abaixo de R$ 1.500.
- Construir feature nova que não ataque retenção, preço ou funil.
- Abrir frente nova; Gastromake só com entrevistas na base de restaurantes
  (ver `ceo-portfolio-frentes`).

### 📅 Ritmo
- Segunda: scorecard de 10 números (`.claude/skills/ceo-estrategista/references/scorecard.md`).
- Sexta: avaliação de 100% dos clientes.
- Dia 1: fechamento (MRR novo, perdido, churn, ticket, risco) — atualizar este arquivo.
- 04/02/2027: revisão do trimestre + ciclo 2 da autoanálise.

### ⚠️ Riscos e gatilhos
- Perder o maior cliente (20,5% do MRR) → plano de conta dedicado e contrato longo.
- Reajuste gerar saídas → reajustar primeiro clientes verdes, com entrega a mais.
- Equipe sobrecarregada com o resgate → congelar novos fechamentos por 2 semanas
  se uso de capacidade passar de 90%.

---

## 5. Dados que faltam (para o próximo ciclo)

1. Custo da folha, sócios e ferramentas por entidade (Peformake × Ellcazo) → margem real.
2. Números de funil (leads, reuniões, propostas) — tabelas de SDR não estão no
   projeto conectado.
3. Receita, margem e horas por semana das outras frentes (Gastromake, Shopee).
4. Caixa atual em meses de custo fixo.
