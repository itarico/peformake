# Metas: estudo, regras e padrões

Estudo de 06/11/2026, refeito depois da crítica: "MRR de 23 mil e o sistema pôs meta de 6 mil". O erro era medir **MRR novo** como se fosse o total. Agora a meta olha o negócio inteiro e cada função recebe só o que ela move.

## Dados da base (novembro/2026)
| Indicador | Valor |
|---|---|
| MRR recorrente (clientes ativos) | R$ 24.400 |
| Clientes recorrentes ativos | 24 |
| Ticket médio · mediana · 75% | R$ 1.017 · R$ 970 · R$ 1.500 |
| Clientes avulsos ativos | 6 |
| Novos recorrentes | 8 em agosto, 5 em setembro (importados) |
| Saídas recorrentes em novembro | 2 |

## Princípios
1. **3 metas por função**, nunca mais: foco.
2. **Alcançável e com sentido**: parte do real (média e base atual) + o crescimento de Inteligência (padrão 5%).
3. **Meta fixa no mês**: definida no dia 1 e não muda sozinha no meio do mês; o realizado é sempre em tempo real.
4. **Ritmo pelo calendário**: o sistema sabe que hoje é dia X de N e mostra se está à frente ou atrás, quanto falta e quanto por dia.
5. **Toda meta vem com ações** concretas para alcançar.
6. **Algo novo todo mês**: cada função tem um catálogo de metas; o sistema escolhe as 3 mais urgentes pelos dados e alterna entre as de mesma prioridade a cada mês.
7. **Um insight por dia**: tirado dos dados do dia (quem comprar, quem cobrar, o que está atrasado).

## Catálogo por função
| Função | Meta | Como calcula a meta | Realizado |
|---|---|---|---|
| Gestão | MRR total | MRR do início do mês × (1 + crescimento) | MRR de hoje |
| Gestão | Recebido no mês | Faturas do mês | Faturas pagas no mês |
| Gestão | Zero saídas | 0 | Recorrentes perdidos no mês |
| Comercial | Fechar recorrente de ticket alto | 1 (2 se houve saída) com ticket ≥ 75% da base (≈ R$ 1.500) | Contratos novos no mês acima do corte |
| Comercial | Novos recorrentes | Média de 3 meses + crescimento, repondo quem saiu | Contratos iniciados no mês |
| Comercial | Upsell na base | 25% dos clientes aptos (tempo de casa mínimo), de 1 a 3 | Serviços novos em clientes antigos |
| Comercial | Avulsos para a base avulsa | Metade dos avulsos ativos, de 2 a 5 | Serviços avulsos lançados no mês |
| Relacionamento | Zero saídas | 0 | Perdidos no mês |
| Relacionamento | Reunião com todos | Nº de recorrentes | Reuniões feitas no mês |
| Relacionamento | Ninguém devendo | 0 | Clientes com fatura vencida |
| Tráfego | Estratégia até o dia 15 | Clientes de tráfego/social | Estratégias enviadas |
| Tráfego | Relatório toda segunda | Clientes de tráfego × segundas do mês | Relatórios enviados |
| Conteúdo | Artes do mês aprovadas | Peças com prazo no mês | Peças aprovadas |
| Conteúdo | Zero aprovação parada | 0 | Peças paradas com o cliente além do limite |
| Audiovisual | Vídeos entregues | Projetos com prazo no mês | Entregues |
| Audiovisual | Fotos extras vendidas | R$ 300 (sobe com o uso) | Faturas de fotos pagas |
| Financeiro | Recebido no mês | Faturas do mês | Pagas |
| Financeiro | Inadimplência zero | 0 | Faturas vencidas em aberto |

Escolha das 3: cada meta tem uma **prioridade pelos dados** (ex.: se há gente devendo, "Ninguém devendo" sobe; se houve saída, "Zero saídas" e "Ticket alto" sobem). Empate é desfeito pelo mês, para variar.

## Ritmo
- Esperado hoje = meta × dia / dias do mês (para "no máximo", o limite vale o mês todo).
- À frente, no ritmo (até 10% abaixo) ou atrás.
- Falta = meta − realizado; por dia = falta / dias restantes.

## Tela
- **Cartão diário** (estilo bloco de notas): "Dia 6 de 30". Aparece aberto na primeira visita do dia e depois fica recolhido, com "Ver metas".
- Uma aba por função; quem não é admin vê só a sua.
- Cada meta: barra com o marcador do esperado, falta e por dia, e 2 ou 3 ações.
- No fim do cartão, o **insight do dia**, em balão de conversa.
- Configurações → Metas: ver as metas do mês por função e ajustar o valor à mão (ou voltar ao automático).
