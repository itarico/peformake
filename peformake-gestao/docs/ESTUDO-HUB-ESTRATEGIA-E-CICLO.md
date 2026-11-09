# Estudo: hub de estratégia e ciclo do cliente (10/11/2026)

Pedido do Italo: centralizar tudo que é estratégia num lugar só, evitar automações duplicadas, definir os documentos
que o sistema gera e criar um processo guiado (o que fazer em cada dia, do primeiro contato até a renovação).
Nada foi construído ainda: é estudo para decidir.

## 1. Como está hoje (espalhado)

| Onde | O que tem |
|---|---|
| Menu Estratégia | Frameworks do cliente (47 modelos), Social media do mês, Nichos e soluções, Rotina de retenção, Estudo trimestral |
| Tráfego → Estratégia | Direcionamento até dia 14 → agente gera no dia 15 → revisão → envio (só tráfego) |
| Tráfego → Relatórios | Relatório semanal (segunda) e mensal (dias 28 a 31) |
| Rotinas da IA | Estrategista semanal (segunda 06:20), Estrategista do mês (dia 15), Relatório semanal e mensal, Análise diária, Radar de Design |
| Cron | Estudo de nicho (trimestral, sem IA), lembretes, fechamento do mês (dia 26) |
| Ficha do cliente | Entregas do mês com "reunião do mês" e "estratégia do mês" com dia limite (Configurações → Inteligência) |

**Sobreposições achadas:**
1. Estrategista semanal e Relatório semanal: os dois rodam toda segunda, por cliente, olhando a mesma semana de tráfego.
2. Relatório semanal tem dois disparos (06:00 IA e 07:15 PDF) em ordem invertida (auditoria de 07/11).
3. Estudo de nicho (cron trimestral), aba "Estudo trimestral" e o framework "Pesquisa de nicho" fazem a mesma coisa.
4. Análise diária, Alertas de gasto e Tarefas automáticas leem os mesmos números do tráfego em horários diferentes.
5. A estratégia só existe para tráfego; social, design, audiovisual e vendas não têm estratégia ligada ao mesmo plano.
6. Reunião do mês e estratégia do mês têm prazo na ficha, mas não aparecem como um roteiro do dia.

## 2. Proposta: Estratégia vira o hub do cliente

Tudo que é estratégia sai de Tráfego e vai para o menu **Estratégia**, com 3 abas:

1. **Hoje**: o que fazer hoje em todos os clientes, na ordem do ciclo (gerar, revisar, enviar, reunião). Um toque abre o passo.
2. **Clientes**: uma página por cliente com a linha do tempo do ciclo e os documentos dele (o que já saiu, o que vem).
3. **Mercado e modelos**: nichos, estudo trimestral, concorrentes e a biblioteca de frameworks (que vira peça interna dos documentos, não uma aba para preencher).

`/trafego/estrategia` passa a abrir a página do cliente no hub (endereço antigo continua funcionando).

## 3. Documentos: de ~10 para 5

| Documento | Quando | O que tem |
|---|---|---|
| **Diagnóstico** | Entrada do cliente (e sob demanda) | Negócio, mercado, concorrentes, maturidade digital, pacote sugerido |
| **Plano trimestral** | A cada 3 meses | A estratégia completa, com uma seção por área: tráfego, social e design (linha editorial e copy), audiovisual (pautas e roteiros), vendas, o que o mercado está fazendo |
| **Plano do mês** | Dia 15 (para o mês seguinte) | Sai do plano trimestral + resultado do mês: campanhas, peças do mês, roteiros da Ellcazo, ações de venda |
| **Relatório semanal** | Toda segunda | Números da semana + o que vamos fazer esta semana (junta estrategista semanal e relatório) + pedido de nota ao cliente |
| **Relatório do mês e reunião** | Fim do mês | Resultado, entregas × contratado, nota do cliente, próximo mês; pauta da reunião |

**Tudo de uma vez ou separado?** Recomendação: **um pedido só que gera um documento com seções por área**.
O agente roda uma vez (contexto único, mais coerente e mais barato), e cada seção:
- pode ser revisada e gerada de novo sozinha ("refazer só a parte de audiovisual");
- aparece para a equipe da área dela (o designer vê a seção de design);
- pode ser enviada ao cliente inteira ou só a parte que interessa.

## 4. O ciclo do cliente (processo guiado)

1. **Lead** → proposta → fechou (Comercial).
2. **Entrada** (semana 1): contrato, dados, acessos (passos guiados do novo cliente) → Diagnóstico → reunião de início.
3. **Plano trimestral** (semana 2) → aprovado com o cliente.
4. **Todo mês:** até dia 14 direcionamento do cliente → dia 15 Plano do mês gerado → até 18 revisão → execução → dia 25 entregas → dia 26 fechamento → reunião do mês.
5. **Toda segunda:** relatório gerado sozinho → revisar → enviar (com a nota de 1 toque).
6. **Mensal:** NPS; cliente com nota alta recebe o pedido de indicação (envio confirmado por uma pessoa).
7. **A cada 3 meses:** revisão + novo plano trimestral.
8. **12 meses:** renovação e reajuste sugerido (IPCA).

O que já existe e entra no ciclo: Bete "Hoje", entregas do mês, fechamento do dia 26, relatórios, avaliações no portal.

## 5. Automações: o que muda

- Juntar Estrategista semanal + Relatório semanal numa rotina só (segunda).
- Um disparo só do relatório semanal (IA escreve → PDF), na ordem certa.
- Estudo de nicho: uma rotina só (trimestral), alimentando o Plano trimestral.
- Tráfego: uma leitura → uma análise que gera alertas e tarefas juntos.
- Plano do mês (dia 15) passa a gerar as seções de todas as áreas, não só tráfego.

## 6. Ordem sugerida

1. Hub: aba Clientes com a linha do tempo e os documentos que já existem; Tráfego → Estratégia vai para lá.
2. Aba Hoje: o calendário do ciclo vira a lista do dia (Início e Bete apontam para cá).
3. Plano do mês com seções por área (uma rodada).
4. Relatório semanal único + nota de 1 toque + indicação mensal.
5. Diagnóstico e Plano trimestral.
6. Limpeza das automações duplicadas.

## 7. Decisões do Italo

1. Um documento com seções por área (recomendado) ou documentos separados?
2. Datas do ciclo: relatório na segunda, Plano do mês no dia 15 com revisão até 18, reunião do mês até o dia 5 do mês seguinte?
3. Nota do cliente: toda semana junto com o relatório (1 toque) e NPS uma vez por mês?
4. Quem revisa antes de ir ao cliente: o responsável da área ou sempre o admin?
