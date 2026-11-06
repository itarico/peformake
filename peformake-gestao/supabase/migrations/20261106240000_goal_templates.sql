-- Padrões de meta por função (HubSpot-like). Aplicado no Supabase em 06/11/2026.
-- Funções no banco: goal_template_save, role_goals_build (monta o mês: padrão primeiro, automático sem padrão),
-- goals_board e role_goals_reset passaram a usar role_goals_build.
create table if not exists public.goal_templates (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('gestao', 'comercial', 'relacionamento', 'trafego', 'conteudo', 'audiovisual', 'financeiro')),
  key text not null,
  mode text not null default 'auto' check (mode in ('auto', 'fixo', 'crescimento')),
  value numeric,
  active boolean not null default true,
  position int not null default 1,
  updated_at timestamptz not null default now(),
  unique (role, key)
);
alter table public.goal_templates enable row level security;
create policy goal_templates_read on public.goal_templates for select to authenticated using (true);
