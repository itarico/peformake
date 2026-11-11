-- Sem trava de 1 geração por dia (pedido do Italo). Continuam: teto de gasto do mês (ai_settings.monthly_cap_usd) e o registro de cada geração.
create or replace function public.ai_generation_allowed(_client uuid, _area text) returns boolean language sql stable security definer set search_path to '' as $$ select true $$;
