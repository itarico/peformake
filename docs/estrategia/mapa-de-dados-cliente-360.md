# Mapa de dados — Cliente 360° e carteira (05/11/2026)

Pergunta do Italo: cruzar **esforço da equipe × entregas × tráfego × WhatsApp ×
vendas × reuniões × SWOT × Instagram × NPS × tempo de casa × mercado do setor**,
por cliente e na carteira inteira, para decidir com dado.

Fonte verificada: banco do sistema novo (`peformake-app`), somente leitura.

## 1. Inventário: cada pergunta → onde está o dado

| Pergunta | Tabela / fonte | Situação |
|---|---|---|
| Quanto a equipe trabalhou no cliente (horas) | — | ❌ **não existe registro de tempo**. Hoje só dá para medir **volume** de entregas, não horas |
| Quem atende cada cliente | `client_team` (175 vínculos) | ✅ |
| Quantas artes fizemos / alterações | `content_items` (`kind`, `status`, `revision_count`, `approved_at`), `content_events` (histórico de status) | ✅ dados de jan–nov/2026 · ⚠️ `revision_count` = 0 em tudo (o campo não está sendo usado — alterações não aparecem) |
| Quantos vídeos fizemos | `av_projects` (`video_count`, `revision_count`, `delivered_at`) | ⚠️ só a partir de nov/2026 (migração) |
| Criativos subidos / alterações no tráfego | `traffic_entities` (anúncios), `traffic_tasks` (`category`, `completed_at`, `effect`) | ⚠️ tarefas só de nov/2026; anúncios sincronizados parcialmente |
| Quanto o cliente investiu em anúncio | `traffic_daily_metrics` + `ad_accounts.client_id` | ✅ desde 01/10/2026 (12 clientes) |
| Resultado do tráfego | `traffic_daily_metrics` (`clicks`, `results`, `leads`), `traffic_reports` | ✅ cliques · ⚠️ resultado/conversão quase vazio |
| Quanto o cliente recebeu no WhatsApp | `wa_contacts`, `whatsapp_messages` por `whatsapp_accounts.client_id` | ❌ nenhum WhatsApp de cliente conectado |
| Vendas do cliente | `crm_sales` | ❌ 0 registros |
| Fizemos a reunião? | `client_monthly_plans.meeting_date`, `client_events` | ⚠️ só 2 planos mensais registrados — reunião não está sendo lançada |
| SWOT / diagnóstico do cliente | Drive (`crm-clientes-agencia`), `traffic_strategies.research` | ⚠️ fora do banco (Drive) — não cruzável automaticamente |
| Instagram do cliente (métricas) | — no banco novo | ❌ falta (Windsor.ai `instagram`) |
| NPS / satisfação | `clients.nps` (1 preenchido), `client_assessments` (75 avaliações internas) | ⚠️ NPS do cliente quase vazio; avaliação interna existe |
| Tempo de casa / desde quando | `client_contracts.start_date`, `clients.lost_at` | ✅ (confirmar datas pós-migração) |
| Mês de queda de resultado / sazonalidade da carteira | precisa ≥ 12 meses de série | ❌ série curta no banco novo — o histórico está no **banco antigo** (Lovable) |
| Mercado do setor do cliente | pesquisa externa (skill `ceo-mercado-setorial`) | 🆕 |
| Oferta: produtos e preços do cliente | — no banco novo (existia `client_products` no antigo) | ❌ falta |

## 2. Primeiros cruzamentos reais (outubro/2026)

| Achado | Dado | Leitura (HIPÓTESE até validar) |
|---|---|---|
| **Will Motos é o cliente que mais investiu em anúncio** (R$ 2.315, 6.517 cliques) **e está avaliado como "ruim"** ("cobrou mais atenção") | `traffic_daily_metrics` × `client_assessments` | Investe e não enxerga retorno — sem WhatsApp conectado não há como provar venda. Primeiro candidato ao Placar de Resultado |
| **CIA COFFE e Cajá Limão: saúde 0 (muito ruim) e nenhuma entrega ou investimento registrado em outubro** | `content_items`, `av_projects`, `traffic_*` × `client_assessments` | Ou a entrega não foi feita, ou foi feita fora do sistema. Nos dois casos o cliente não vê nada — risco de saída alto |
| **Disalp: saúde 0 com só 3 artes no mês** | `content_items` × `client_assessments` | Volume baixo para um cliente de R$ 1.900/mês |
| Saúde média da carteira: 47 (set) → 58 (out) | `client_assessments` | Melhora leve, mas ainda amarela |
| Perdas: 4 (ago), 5 (set), 1 (out) | `clients.lost_at` | Outubro melhorou; novembro é o teste |
| R$ 6.799 de mídia gerida em outubro (12 clientes) | `traffic_daily_metrics` | Base para cobrar gestão de mídia proporcional ao investimento |

### "A partir de que mês o cliente cai?" — primeira resposta (05/11/2026)

Saúde média (avaliação interna) por mês de casa, todos os clientes:

| Mês de casa | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Saúde média | 79 | 57 | 48 | 100 (n=1) | 36 | 15 |
| Avaliações | 11 | 11 | 4 | 1 | 44 | 4 |

**Leitura (preliminar, série curta):** a satisfação começa a cair **já no 2º
mês** e chega a zona vermelha no 5º–6º — exatamente antes da renovação de 6
meses (a North Star). O mês 5 pesa muito porque concentra a coorte de maio.
Decisão sugerida: reforço de valor no **mês 2** (primeiro resultado visível +
ligação de feedback) e plano de renovação no **mês 4**.

Coortes: entrada em mai/2026 → 68% ativos hoje (19 → 13); set/2026 → 64% (11 → 7)
em apenas 2 meses — a coorte de setembro está perdendo cliente mais rápido.

## 3. O que falta registrar (para o cruzamento ficar completo)

Prioridade pela decisão que destrava:

1. **Importar o histórico do banco antigo** (artes, satisfação, financeiro,
   clientes desde o início) → libera sazonalidade, coortes e "a partir de que mês
   cai o resultado".
2. **Conectar o WhatsApp dos clientes** + registro de vendas → libera resultado em R$.
3. **Registro de esforço**: mínimo viável = cada tarefa/arte/vídeo com
   responsável e tempo estimado padrão por tipo (ex.: arte simples 1h, carrossel
   2h, vídeo editado 4h, diária de captação 8h) → libera **custo e margem por
   cliente** sem cronômetro. Depois, se quiser, apontamento real.
4. **Usar os campos que já existem**: `revision_count` nas artes,
   `meeting_date` no plano mensal, NPS do cliente a cada trimestre.
5. **Instagram e Google Meu Negócio dos clientes** via Windsor.ai.
6. **Catálogo do cliente** (produtos, preço, margem, mais vendidos) → libera
   decisão de oferta com dado.
7. **SWOT e diagnóstico estruturados** no banco (resumo + data), não só no Drive.

## 4. Visões que o sistema deve gerar

- **Cliente 360° (mensal):** esforço · entregas · investimento · resultado
  (cliques → conversas → vendas → R$) · reunião feita · saúde/NPS · tempo de casa
  · contexto do setor · recomendação.
- **Carteira (mensal):** saúde × esforço × resultado de todos os clientes num
  quadro de 4 zonas — *estrela* (resultado alto, esforço ok), *sanguessuga*
  (esforço alto, resultado/preço baixo), *em risco* (saúde baixa), *subatendido*
  (paga bem, esforço baixo).
- **Coortes:** clientes por mês de entrada → % que continua em 3, 6 e 12 meses.
- **Sazonalidade:** demanda e resultado por mês do ano, por setor.
- **Alertas:** queda de resultado 2 meses seguidos, entrega zero no mês, reunião
  não realizada, saúde ≤ 30.
