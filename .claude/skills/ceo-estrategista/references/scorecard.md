# Scorecard semanal do CEO — Peformake/Ellcazo

Dez números. Toda segunda. Verde/amarelo/vermelho. Se um número fica vermelho
2 semanas seguidas, ele vira a pauta da reunião (e o resto espera).

| # | Número | Fonte (tabela) | Verde | Amarelo | Vermelho |
|---|---|---|---|---|---|
| 1 | MRR ativo (R$) | client_services × client_service_prices | ≥ meta do mês | -5% | -10% |
| 2 | MRR novo na semana | client_contracts.start_date | ≥ R$ 2.000 | R$ 1–2k | < R$ 1k |
| 3 | MRR perdido na semana | clients.lost_at | 0 | ≤ R$ 600 | > R$ 600 |
| 4 | Leads novos | sdr_leads / service_requests / wa_contacts | ≥ 15 | 8–14 | < 8 |
| 5 | Reuniões realizadas | sdr_meetings | ≥ 5 | 3–4 | < 3 |
| 6 | Clientes em risco (avaliação ruim/muito ruim) | client_assessments (última) | ≤ 10% | 10–20% | > 20% |
| 7 | Entregas atrasadas | operation_deliverables / content_items | 0 | 1–3 | > 3 |
| 8 | Maior cliente / MRR | cálculo | < 15% | 15–25% | > 25% |
| 9 | Caixa em meses de custo fixo | financeiro | ≥ 3 | 1–3 | < 1 |
| 10 | Avaliação registrada esta semana (% clientes) | client_assessments | 100% | 70–99% | < 70% |

Formato da saída: tabela + "1 decisão da semana" + "1 coisa que paramos de fazer".
