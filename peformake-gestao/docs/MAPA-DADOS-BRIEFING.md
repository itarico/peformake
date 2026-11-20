# Mapa de dados: de onde vem cada informação que o sistema usa

Atualizado em 20/11/2026. Para cada entrega, cada informação de que ela precisa e de onde vem.
Fontes: **Fixo** (briefing fixo, cartão e pergunta do guia), **Mês** (perguntas do mês ou briefing do mês),
**Cadastro**, **Receita** (cartão CNPJ), **Docs** (pasta Briefing), **Diag** (diagnóstico), **Meta Ads**, **Instagram**, **Agente** (pesquisa).
O agente lê tudo por `strategy_brief_context(cliente, mês)`; o guia de leitura está no campo `como_ler_o_briefing`.

Valores em dinheiro (verba_anuncio, ticket_medio, faturamento_mes, gasto_ano_cliente, margem_principal) só aparecem para
administrador na tela; o agente lê tudo.

## Estratégia do mês (`agent_instructions('estrategia-interativa')`)

| Informação | De onde vem |
|---|---|
| Tese do mês | Fixo: Momento e futuro, Posicionamento; Mês: "Se só pudesse ter um resultado", "O que mais te preocupa" |
| Objetivos (número) | Mês: Meta do mês (guia), "Bateram a meta do mês passado?" |
| Ofertas | Mês: Ofertas (guia); Fixo: Produtos (preço real), margem_principal |
| Datas | Mês: "Quais datas de {mês} de {ano} você quer aproveitar?" + "Para {data}, o que vocês vão fazer?"; Fixo: Sazonalidade (meses_fortes, meses_fracos) |
| Ações com opções (influenciador, parceria, evento) | Fixo: Marketing até hoje (parceiros, fã famoso, comunidade); Mês: eventos da região; Agente: pesquisa |
| Decisões e o que não repetir | Fixo: Marketing até hoje (o que não funcionou); estratégias anteriores; respostas de meses anteriores |
| Jeito de falar | Fixo: Jeito da marca (arquétipo, voz, proibidos, o que nunca faria) |
| Tipo de negócio | Fixo: Tipo; Receita: CNAE e natureza |

## Plano de vendas (card atendimento/plano)

| Informação | De onde vem |
|---|---|
| Meta | Mês: Meta do mês |
| Ticket | Fixo: ticket_medio (Momento e futuro, só admin) |
| Quem vende | Fixo: Como o cliente compra ("Quem responde o WhatsApp e em quanto tempo") |
| Canais | Fixo: Como o cliente compra (canais, quanto vem de cada, qual traz o melhor cliente) |
| Etapas | Fixo: Como o cliente compra (antes de comprar, tempo até fechar, frase que fecha, CRM, pós-venda) |
| Capacidade | Fixo: Momento e futuro (quanto atende, gargalo) |
| Semanas | Mês: datas marcadas e ofertas |

## Tráfego (card trafego/campanha)

| Informação | De onde vem |
|---|---|
| Objetivo | Mês: prioridade e meta |
| Público | Fixo: Público (idade, renda, onde mora, raio de atendimento, melhor e pior cliente) |
| Para onde o anúncio leva | Fixo: Marca e acessos ("Para onde o anúncio deve levar o cliente?") **(lacuna fechada 20/11)** |
| Rastreamento | Fixo: Marca e acessos ("O site tem pixel da Meta ou tag do Google?") **(lacuna fechada)** |
| Criativo | Fixo: Histórias e assuntos, Docs (fotos, vídeos); Mês: ideias do cliente |
| Verba | Fixo: verba_anuncio (Marketing até hoje, só admin) |
| Histórico de anúncios | Fixo: Marketing até hoje; Docs: relatórios e campanhas antigas; Meta Ads |
| Teste A/B | Agente (a partir do criativo e da oferta) |

## Vídeos e fotos (`agent_instructions('roteiro-master')`)

| Informação | De onde vem |
|---|---|
| Quem aparece, quem grava, aparelho, quando | Fixo: Gravação (só cliente com vídeo) |
| Onde gravar (luz, barulho, espaço) | Fixo: Gravação ("Onde dá para gravar?") **(lacuna fechada)** |
| Histórias, bastidores, o que ensinar | Fixo: Histórias e assuntos (6 conversas); Mês: história do mês em rodízio |
| Objetivo de cada vídeo | Estratégia do mês (tese, oferta) |
| Prova | Docs: depoimentos, avaliações, cases, prêmios; Fixo: Posicionamento (prova) |
| Proibidos e regras da profissão | Fixo: Jeito da marca |

## Social media (post e carrossel)

| Informação | De onde vem |
|---|---|
| Ideia | Fixo: Histórias e assuntos; Mês: "Tem ideia de post ou vídeo?", "O que os clientes mais perguntaram?" |
| Foto real | Docs: fotos dos produtos, do espaço e da equipe |
| Voz e legenda | Fixo: Jeito da marca, Como quer ser vista |
| Identidade visual | Fixo: Marca e acessos (logo, cores, fontes); Docs: logo e manual |
| O que já deu certo | Fixo: Marketing até hoje ("Qual post ou vídeo mais deu resultado?"); Docs: prints do Instagram; Instagram |

## Atendimento no WhatsApp (card atendimento/roteiro)

| Informação | De onde vem |
|---|---|
| Roteiro | Fixo: Como o cliente compra (frase que fecha, tempo até fechar); Docs: mensagens do WhatsApp |
| Objeções e respostas | Fixo: Como o cliente compra (o que pergunta, o que fala quando não fecha, resposta ao "tá caro", medo) |
| Follow-up | Fixo: Como o cliente compra (pós-venda, indicação) |
| Formas de pagamento | Fixo: Como o cliente compra ("Quais formas de pagamento aceitam?") **(lacuna fechada)** |
| Horário de atendimento | Fixo: Como o cliente compra ("Qual o horário de funcionamento?") **(lacuna fechada)** |
| Garantia, troca, devolução | Fixo: Como o cliente compra ("Tem garantia, troca ou devolução?") **(lacuna fechada)** |
| Condições por produto | Fixo: Produtos (condições); Docs: tabela de preços e condições |

## Diagnóstico (`agent_instructions('diagnostico')`, `diag_agent_start`)

| Informação | De onde vem |
|---|---|
| Negócio, público, proposta de valor | Fixo: todos os cartões (o briefing vai inteiro) |
| Mercado e concorrentes | Fixo: Concorrentes, Posicionamento (concorrência a fundo); Agente: pesquisa |
| Presença digital | Fixo: Links, Marketing até hoje (nota no Google); Instagram; Agente |
| SWOT | Fixo: Momento e futuro |
| Empresa | Receita (cartão CNPJ); Docs: apresentação comercial, contrato social |

## Relatórios (metas e comparativo)

| Informação | De onde vem |
|---|---|
| Meta do mês | Mês: Meta do mês |
| O que conta como resultado | Mês: guia Meta ("O que conta como resultado") |
| Comparativo | Meta Ads, Instagram; Mês: "Bateram a meta do mês passado?", "O que mais vendeu e o que encalhou?" |
| Sazonalidade (comparar com o mês certo) | Fixo: Sazonalidade; Docs: planilha de vendas por mês |

## Lacunas fechadas em 20/11

1. Para onde o anúncio leva o cliente (Marca e acessos).
2. Pixel da Meta ou tag do Google no site (Marca e acessos).
3. Onde gravar, luz e barulho (Gravação).
4. Formas de pagamento (Como o cliente compra).
5. Horário de funcionamento e de atendimento (Como o cliente compra).
6. Garantia, troca ou devolução (Como o cliente compra).

Também passaram a chegar ao agente (`strategy_brief_context`): tipo de negócio e cartão CNPJ explícitos, documentos da
pasta Briefing, resumo do diagnóstico, respostas de meses anteriores e o guia de leitura dos cartões juntos.

## Ainda sem fonte própria (não muda o trabalho de hoje)

- Números reais de vendas por mês: só se o cliente anexar a planilha de vendas (pedido de arquivo); o resto vem da Meta Ads.
- Resultado de cada post: vem do Instagram quando a conta estiver conectada.
