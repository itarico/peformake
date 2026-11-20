-- Preço médio por serviço (service_yield): só administrador. Antes o Head também via (Italo, 20/11: "acho que não").
create or replace function public.service_yield() returns table(service text, avg_price numeric, clients bigint) language sql stable security definer set search_path to '' as $$
  select s.name, round(avg(p.price), 2), count(distinct cs.client_id) from public.client_services cs join public.services s on s.id = cs.service_id join public.client_service_prices p on p.client_service_id = cs.id join public.clients c on c.id = cs.client_id and c.is_active and not c.is_lost where cs.is_active and p.price > 0 and public.has_role('admin') group by s.name order by 2 desc limit 5;
$$;
revoke execute on function public.service_yield() from public, anon;
grant execute on function public.service_yield() to authenticated, service_role;
