-- 07/11 (aplicado pelo MCP): estado dos itens do "Hoje" da Bete por pessoa (feito / adiado até), vale em todos os aparelhos.
create table if not exists public.bete_item_state (
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  item_id text not null check (length(item_id) between 3 and 200),
  state text not null check (state in ('done', 'snoozed')),
  until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);
alter table public.bete_item_state enable row level security;
create policy bete_item_state_own on public.bete_item_state for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
grant select, insert, update, delete on public.bete_item_state to authenticated;
