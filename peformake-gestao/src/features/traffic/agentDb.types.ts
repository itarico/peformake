// Tipos das tabelas e funções do agente na nuvem (migração 20261103940000).

type ReadOnly<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] }

export type AgentTables = {
  agent_fire_log: ReadOnly<{
    id: string
    routine: string
    requested_by: string | null
    requested_at: string
    status: string
    detail: string | null
    note: string | null
  }>
  agent_runs: ReadOnly<{
    id: string
    routine: string
    started_at: string
    finished_at: string | null
    ok: boolean | null
    summary: string | null
  }>
  traffic_recommendations: ReadOnly<{
    id: string
    day: string
    client_id: string | null
    kind: string
    priority: string
    title: string
    body: string
    task_id: string | null
    status: string
    decided_by: string | null
    decided_at: string | null
    created_at: string
  }>
  traffic_strategies: ReadOnly<{
    id: string
    client_id: string
    kind: string
    period_start: string
    period_end: string
    summary: string
    created_at: string
    updated_at: string
    month: string | null
    status: string
    research: unknown
    pdf_path: string | null
    pdf_at: string | null
    reviewed_at: string | null
    sent_at: string | null
    send_error: string | null
  }>
  traffic_strategy_items: ReadOnly<{
    id: string
    strategy_id: string
    module: string
    title: string
    body: string
    position: number
    status: string
    task_id: string | null
    decided_by: string | null
    decided_at: string | null
    destination: string
    format: string | null
    routed_table: string | null
    routed_id: string | null
  }>
  strategy_requests: ReadOnly<{
    id: string
    client_id: string
    month: string
    reason: string
    requested_by: string | null
    requested_at: string
    status: string
    finished_at: string | null
  }>
}

export type AgentFunctions = {
  report_request_agent: { Args: { _kind: string; _client_id: string | null }; Returns: string }
  report_board: { Args: { _kind: string; _offset: number }; Returns: unknown }
  report_set_whatsapp: { Args: { _client_id: string; _enabled: boolean }; Returns: undefined }
  report_render: { Args: { _report_id: string; _send: boolean }; Returns: undefined }
  agent_request_run: { Args: { _routine: string }; Returns: string | null }
  traffic_chat_post: { Args: { _content: string }; Returns: string }
  recommendation_decide: { Args: { _id: string; _status: string }; Returns: undefined }
  recommendation_to_task: { Args: { _id: string }; Returns: string }
  strategy_request: { Args: { _client_id: string; _month: string }; Returns: string }
  strategy_pdf: { Args: { _strategy_id: string }; Returns: undefined }
  strategy_publish: { Args: { _strategy_id: string; _send: boolean }; Returns: undefined }
  plan_save_direction: { Args: { _client_id: string; _month: string; _data: Record<string, string> }; Returns: string }
  strategy_item_decide: { Args: { _id: string; _approve: boolean }; Returns: string | null }
}
