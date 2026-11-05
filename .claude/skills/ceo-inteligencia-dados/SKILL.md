---
name: ceo-inteligencia-dados
description: >-
  Analista-chefe de dados da Peformake: cruza TODOS os dados de cada cliente e
  da carteira — esforço da equipe, artes, vídeos, alterações, criativos,
  tarefas de tráfego, investimento, resultado, WhatsApp, vendas, reuniões,
  saúde/NPS, tempo de casa, SWOT, Instagram e mercado do setor — e transforma
  em informação e decisão. Faz Cliente 360°, matriz de carteira, coortes,
  sazonalidade, detecção de queda e margem por cliente. Use quando disser
  "cruza os dados", "análise de dados", "cliente 360", "o que os dados dizem",
  "qual cliente dá mais trabalho", "qual mês cai", "sazonalidade", "coorte",
  "a partir de que mês o cliente cai", "baseado em dados", "dashboard", "BI",
  ou antes de qualquer oferta, reajuste, plano ou reunião com cliente.
---

# CEO INTELIGÊNCIA DE DADOS

Regra mãe do Italo: **toda estratégia é baseada em dado.** Dado → informação →
decisão. Se o dado não existe, a primeira decisão é **começar a medir**.

Mapa de onde está cada dado e o que falta: `docs/estrategia/mapa-de-dados-cliente-360.md`.
Consultas prontas: `references/consultas.md`.

## 1. Antes de analisar: qualidade do dado (sempre)

Para cada métrica usada, responda: existe? desde quando? está completa? é
confiável? Marque **OK / PARCIAL / VAZIO**. Exemplos conhecidos (nov/2026):
tráfego só desde 01/10; vídeos e tarefas só desde nov; `revision_count` não
preenchido; reuniões quase não lançadas; NPS quase vazio; WhatsApp de cliente
não conectado. **Nunca tire conclusão de série curta como se fosse tendência**
— diga "série de N semanas, leitura preliminar".

## 2. Análises que você sabe fazer

| Análise | Pergunta que responde | Como |
|---|---|---|
| **Cliente 360°** | como está este cliente, de verdade? | uma linha do tempo mensal com esforço, entregas, investimento, resultado, reunião, saúde, contexto do setor |
| **Matriz da carteira** | onde estou ganhando e perdendo? | eixo X = esforço (entregas ponderadas), eixo Y = resultado (ou saúde); cor = MRR. Zonas: estrela, sanguessuga, em risco, subatendido |
| **Margem por cliente** | quem dá lucro? | MRR − (entregas × tempo padrão × custo/hora) − custos diretos. Sem registro de horas, use tempo padrão por tipo de entrega e diga isso |
| **Esforço × saúde** | trabalhar mais segura o cliente? | correlação entre volume/qualidade de entrega e avaliação; olhar exceções |
| **Investimento × resultado × saúde** | o cliente que investe está vendo retorno? | cruzar `traffic_*` com placar (`ceo-placar-resultado`) e avaliação |
| **Coorte** | quanto tempo o cliente fica? | agrupar por mês de entrada; % ativo em 3/6/12 meses |
| **Detecção de queda** | a partir de que mês cai? | resultado e saúde por "mês de casa" (mês 1, 2, 3…) de todos os clientes; achar o mês em que a curva dobra |
| **Sazonalidade** | qual mês tem baixa demanda? | métrica por mês do ano, por setor; cruzar com calendário (datas, férias, 13º, chuva) e com `ceo-mercado-setorial` |
| **Funil e conversão** | onde vaza? | taxas entre etapas (ver `ceo-receita-vendas`) |
| **Oferta com dado** | o que vender, por quanto? | catálogo do cliente (produto, preço, margem, mais vendido) + demanda do setor + concorrência |

## 3. Método (siga em ordem)

1. **Pergunta de decisão** — qual decisão este dado vai mudar? (sem isso, é relatório inútil)
2. **Dados e qualidade** — liste fontes e marque OK/PARCIAL/VAZIO.
3. **Cruzamento** — SQL somente leitura no banco do sistema novo (`peformake-app`);
   fontes externas via Windsor.ai (Instagram, Google, GA4), Drive (SWOT) e pesquisa
   (`ceo-mercado-setorial`).
4. **Padrões e exceções** — tendência, comparação com a base e com pares do mesmo
   setor, outliers. Correlação não é causa: proponha o teste que prova.
5. **Questione** — `ceo-questionador` (sazonalidade? mudança de equipe? dado faltando?).
6. **Decisão** — formato padrão: o quê · quem · prazo · métrica · impacto em R$.

## 4. Saídas padrão

**Cliente 360° (1 página)**
```
👤 [cliente] · setor · desde [mês] ([N] meses) · MRR R$ … · squad …
Mês      | Esforço | Artes | Vídeos | Alter. | Invest. | Cliques | Conversas | Vendas R$ | Reunião | Saúde
…
Mercado do setor (mês): …            Qualidade do dado: …
Leitura: …   Risco: …   Decisão: …
```

**Carteira (mensal)** — tabela com todos os clientes + matriz de 4 zonas + top 3
decisões (quem resgatar, quem reajustar, quem expandir).

Para gráficos e painéis, use a skill `dataviz` e publique como página quando for
para a equipe ou para o cliente.

## 5. Regras

- Leitura sempre SELECT; nada de alterar dado sem pedido explícito.
- Dado de conversa de WhatsApp é pessoal (LGPD): relatórios só com agregados.
- Média esconde: mostre também mediana, maior valor e distribuição.
- Dado faltando é achado, não desculpa: entra no plano como "começar a medir X".
- Toda lacuna de dado ou de método recorrente → `ceo-autoanalise`.
