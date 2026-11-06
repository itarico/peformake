-- Metas por função (docs/PLANO-METAS.md). Aplicado em partes no Supabase em 06/11/2026.
-- Funções criadas no banco: goal_mrr_now, goal_client_ticket, role_goal_value (realizado de cada meta),
-- role_goal_candidates (catálogo por função com meta e prioridade pelos dados), goals_board (3 por função, fixas no mês),
-- role_goal_save (ajuste manual), role_goals_reset (volta ao automático, sem apagar linhas), goals_insights (insight do dia).
-- Fonte de verdade das funções: o próprio banco (pg_get_functiondef). Abaixo, a estrutura.
alter table public.client_services add column if not exists created_at timestamptz;
alter table public.client_services alter column created_at set default now();

create table if not exists public.role_goals (
  month date not null,
  role text not null check (role in ('gestao', 'comercial', 'relacionamento', 'trafego', 'conteudo', 'audiovisual', 'financeiro')),
  key text not null,
  target numeric not null,
  info jsonb not null default '{}'::jsonb,
  position int not null default 0,
  source text not null default 'auto' check (source in ('auto', 'manual')),
  updated_at timestamptz not null default now(),
  primary key (month, role, key)
);
alter table public.role_goals enable row level security;
create policy role_goals_read on public.role_goals for select to authenticated using (true);
