---
name: ceo-mercado-setorial
description: >-
  Estuda o mercado e o setor de cada cliente (gastronomia, ótica, clínica,
  estética, automotivo, construção, distribuidora, indústria, educação, moda…)
  em Recife/PE e no Brasil: demanda, sazonalidade, preços, concorrência,
  comportamento do consumidor, notícias e indicadores econômicos — e cruza com
  os dados do cliente para separar "problema do cliente" de "movimento do
  mercado". Use quando disser "estuda o mercado do cliente", "como está o
  setor", "o mercado caiu ou foi a gente?", "cenário do setor", "concorrência
  do cliente", "sazonalidade do nicho", "o que está acontecendo no setor",
  e AUTOMATICAMENTE junto com `estrategia-360-agencia`, `ceo-de-clientes` e
  `ceo-inteligencia-dados` ao montar plano ou analisar queda de resultado.
---

# CEO MERCADO SETORIAL

Pergunta central: **o resultado do cliente mudou por causa dele, da gente ou do
mercado?** Sem esta camada, toda queda vira culpa da agência (ou vira desculpa).

## 1. Ficha do setor (montar uma vez, atualizar todo mês)

Guardar na pasta do setor/cliente (Drive) com data e fonte de cada item:
- **Tamanho e tendência** do setor no Brasil e no Nordeste/PE.
- **Sazonalidade**: meses fortes e fracos, datas comemorativas, efeito de férias,
  13º, Carnaval, São João (forte em PE), chuvas, volta às aulas.
- **Comportamento do consumidor**: como pesquisa, onde compra, ticket típico,
  canal (iFood, loja, WhatsApp, Instagram, Google).
- **Preços de referência** e concorrentes locais (top 5 por região do cliente).
- **Regulação e restrições** de publicidade do setor (ver `ceo-conhecimento`).
- **Indicadores que antecipam demanda** (renda, juros, confiança do consumidor,
  vendas do varejo, preço de insumo).

## 2. Fontes (prefira primária; sempre com data)

| Tipo | Onde |
|---|---|
| Estatística oficial | IBGE (Sidra: PMC varejo, PMS serviços, PNAD), Banco Central (juros, crédito), Caged (emprego) |
| Entidades do setor | Abrasel (bares e restaurantes), CNC/FecomércioPE, Abióptica (óticas), Sebrae (pesquisas por segmento), associações locais |
| Demanda de busca | Google Trends (Pernambuco/Recife, últimos 12 e 60 meses) |
| Concorrência | Google Maps/Meu Negócio (nota, nº de avaliações, fotos), Instagram, Meta Ad Library (anúncio ativo há 30+ dias = provavelmente lucrativo), iFood (cardápio/preço) |
| Reputação | Reclame Aqui, avaliações do Google (reclamação recorrente = oportunidade) |
| Notícias | portais locais (JC, Diario de Pernambuco) e do setor, últimos 30 dias |

Ferramentas: busca web (Firecrawl), `deep-research` para estudo grande, plugin
`market-researcher` e `Monitly` (estatística oficial) se instalados.
Etiquete: CONFIRMADO (fonte primária com data) · CONSENSO · HIPÓTESE.

## 3. Cruzamento com o cliente (com `ceo-inteligencia-dados`)

| Cliente | Mercado | Leitura |
|---|---|---|
| caiu | caiu | movimento de mercado — ajustar meta e mensagem, defender participação |
| caiu | estável/subiu | problema do cliente ou da execução — investigar oferta, atendimento, entrega |
| subiu | caiu | ganho real de participação — virar case |
| subiu | subiu | onda do mercado — acelerar e não confundir com mérito só nosso |

Use a tendência de busca do setor (Google Trends) e a série do cliente no mesmo
período como primeira aproximação; diga quando é só indício.

## 4. Saída

```
🌎 MERCADO — [setor] — [mês/ano] — região [Recife/PE]
Cenário em 5 linhas (com fonte e data)
Sazonalidade: próximos 90 dias → [meses/datas e efeito esperado]
Concorrência: [3–5 nomes reais com o que estão fazendo]
Oportunidades: … · Ameaças: …
Cruzamento com [cliente]: [quadrante da tabela acima] → decisão
Atualiza SWOT do cliente: O… / A…
```

Alimenta: SWOT (`frameworks-marketing-agencia`), plano do mês
(`estrategia-360-agencia`), Cliente 360° (`ceo-inteligencia-dados`) e calendário
de conteúdo (`mdd`).

## 5. Ritmo

- Mensal por setor (não por cliente): um estudo de gastronomia serve a todos os
  restaurantes, com o cruzamento individual por cliente.
- Imediato quando um cliente cair dois meses seguidos.
- Carteira: ranking de setores por crescimento e por resultado → orienta onde a
  Peformake prospecta.
