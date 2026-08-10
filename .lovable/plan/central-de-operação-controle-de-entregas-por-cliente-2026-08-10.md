# Central de Operação — Controle de Entregas por Cliente

Transformar a aba "Progresso Operacional" em um centro de comando: para cada cliente ativo, o sistema lista somente os serviços contratados, calcula o progresso real de cada entrega do mês, cobra os prazos (dia 15 do mês anterior e dia 1 para relatório de tráfego) e leva com um clique para a tela onde a entrega é feita.

## 1. Regras de prazo (SLA) por serviço

| Serviço | Entregável | Prazo | Concluído quando |
|---|---|---|---|
| Design / Social Media | Artes do mês | Dia 15 do mês anterior (briefing) | Todas as artes do mês aprovadas |
| Tráfego | Planejamento da campanha | Dia 15 do mês anterior | Link/arquivo do planejamento enviado |
| Tráfego | Relatório do mês | Dia 1 (referente ao mês anterior) | Link/arquivo do relatório enviado |
| Audiovisual | Roteiro | Dia 15 do mês anterior | Roteiro preenchido |
| Audiovisual | Agendamento da captação | Dia 15 do mês anterior | Data marcada na agenda (Google Calendar Ellcazo) |
| Audiovisual | Entrega dos vídeos | Após a data da captação | Link do material final enviado |

Estados visuais: cinza (ainda não aberto), azul (aberto/em andamento), amarelo (faltam ≤5 dias), vermelho (atrasado), verde (concluído).

## 2. Aba Progresso Operacional (nova versão)

- Uma linha por cliente; colunas apenas dos serviços atribuídos (via serviços do cliente).
- Cada célula é um cartão clicável mostrando: nome do entregável, contador (ex.: `8/12 artes`), barra de progresso e badge do prazo.
- Clique redireciona direto para a área de execução:
  - Design → planejamento/briefing do cliente no mês
  - Tráfego → nova aba "Entregas" em Tráfego, já no cliente/mês corretos
  - Audiovisual → nova aba de projetos/calendário em Audiovisual, no cliente/mês
- Coluna final: progresso geral do cliente (média ponderada de todos os entregáveis do mês).
- Cabeçalho com totalizadores: entregas pendentes, atrasadas e concluídas no mês, com filtro rápido (Todos / Atrasados / Pendentes).

## 3. Módulo Audiovisual (construir de fato)

Aba Audiovisual passa a ter 3 sub-abas:

1. **Projetos** — um projeto por cliente/mês por padrão; se o serviço do cliente estiver com quantidade maior que 1, o sistema cria/permite N projetos no mês. Cada projeto tem mini-progresso em 3 etapas: **Roteiro → Captação → Entrega**. Só fica concluído com as três.
   - Roteiro: formulário (objetivo, locação, pauta/roteiro, referências, participantes, duração).
   - Captação: data/hora + endereço + confirmação com o cliente (checkbox "confirmado com o cliente" com registro de quem e quando).
   - Entrega: link do material bruto e link do material final.
2. **Calendário** — visão mensal de captações, criar/editar/arrastar data. Sincroniza com o Google Calendar da Ellcazo.
3. **Workspace** — telas atuais de captação e edição para videomaker/editor.

## 4. Tráfego — entregas do mês

Nova aba "Entregas" dentro de Tráfego: por cliente e mês, dois campos simples de link/arquivo — *Planejamento da campanha* e *Relatório do mês* — com data de envio, quem enviou e histórico. O envio marca o entregável como concluído no painel de Operação.

## 5. Cobrança automática

- **Painel**: alertas visuais e contadores (item 2).
- **Sino de notificações**: ao abrir um prazo (dia 15 / dia 1), a 5 dias do vencimento e no atraso, notifica o responsável do serviço naquele cliente e os admins/líderes.
- **WhatsApp**: usa o disparador já existente, com os mesmos gatilhos, respeitando as configurações atuais de notificação.
- Uma rotina diária varre os entregáveis do mês, cria/atualiza o registro de cada um e dispara as cobranças (sem duplicar avisos).

## 6. Google Calendar (Peformake e Ellcazo)

Conectar as duas contas Google como conexões do app (uma por agenda). Captações usam a agenda **Ellcazo**; a agenda Peformake fica disponível para os demais compromissos. Marcar/alterar a captação no app cria ou atualiza o evento no Google, e o app lê os eventos para exibir no calendário.

---

## Detalhes técnicos

- **Nova tabela `operation_deliverables`**: `client_id`, `year`, `month`, `service_type` (design | traffic_plan | traffic_report | av_script | av_shoot | av_delivery), `project_id` opcional (audiovisual), `status`, `due_date`, `opens_at`, `completed_at`, `completed_by`, `asset_url`, `notes`, `notified_at`. RLS: staff autenticado lê e atualiza; service_role total. Índice único por (client_id, year, month, service_type, project_id).
- **Nova tabela `traffic_deliverables`** não é necessária — o link vai em `operation_deliverables.asset_url`.
- **Audiovisual** reutiliza `audiovisual_projects` (já tem `script`, `shoot_date`, `shoot_time`, `location_address`, `raw_video_url`, `finished_assets_url`, `video_count`). Acrescentar `client_confirmed_at`, `google_event_id` e o vínculo `deliverable` das 3 etapas.
- **Edge function `operation-deliverables-cron`** (diária, via pg_cron): gera os entregáveis do mês seguinte no dia 15, os de relatório no dia 1, marca atrasos, cria notificações e chama o envio de WhatsApp existente.
- **Edge function `google-calendar-sync`**: cria/atualiza/remove eventos de captação via gateway do conector Google Calendar; nunca chamada do browser.
- **Frontend**: `OperationPanel.tsx` (aba progresso reescrita com hook `useOperationDeliverables`), `src/pages/Audiovisual.tsx` (sub-abas + `AudiovisualProjects`, `AudiovisualCalendar`), nova aba de entregas em `TrafficAdmin.tsx`.
- Redirecionamentos por query params: `/planning?client=...&month=...`, `/traffic?tab=entregas&client=...`, `/audiovisual?tab=projetos&client=...`.

## Ordem de execução

1. Migração das tabelas/colunas + geração inicial dos entregáveis do mês.
2. Aba Progresso Operacional nova com cálculo real e redirecionamentos.
3. Módulo Audiovisual (projetos + etapas + entregas).
4. Aba Entregas em Tráfego.
5. Conexão do Google Calendar + calendário de captações.
6. Rotina diária de cobrança (sino + WhatsApp).
