-- Desempenho do Instagram dentro do cliente (pedido do Italo, 24/11/2026). A função ig-insights busca na Meta os números
-- da conta (30 dias e os 30 anteriores, para comparar) e dos posts recentes, e guarda aqui. A tela lê daqui; se a cópia
-- tem mais de 1 hora, pede de novo. O token nunca sai para o navegador.
create table if not exists public.ig_insights (
  account_id uuid primary key references public.ig_accounts(id) on delete cascade,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.ig_insights enable row level security;
create policy ig_insights_select on public.ig_insights for select to authenticated using ((select public.can_plan_content()));

-- Só a função ig-insights (service_role): conta e token do cliente.
create or replace function public.ig_insights_account(_client uuid)
returns table (account_id uuid, ig_id text, username text, token text)
language sql security definer set search_path to '' as $$
  select a.id, a.ig_id, a.username, s.decrypted_secret
  from public.ig_accounts a join vault.decrypted_secrets s on s.id = a.token_secret_id
  where a.client_id = _client and a.status = 'conectado'
  order by a.connected_at desc limit 1
$$;
revoke execute on function public.ig_insights_account(uuid) from public, anon, authenticated;
grant execute on function public.ig_insights_account(uuid) to service_role;

create or replace function public.ig_insights_save(_account uuid, _data jsonb)
returns void language sql security definer set search_path to '' as $$
  insert into public.ig_insights (account_id, data, fetched_at) values (_account, _data, now())
  on conflict (account_id) do update set data = excluded.data, fetched_at = now()
$$;
revoke execute on function public.ig_insights_save(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ig_insights_save(uuid, jsonb) to service_role;
