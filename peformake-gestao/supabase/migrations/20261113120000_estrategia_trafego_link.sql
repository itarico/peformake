-- Estratégia de tráfego mudou de /trafego/estrategia para /estrategia/trafego.
-- Reescreve (create or replace) as funções de entregas do mês que gravam o link da ação.
do $$
declare r record;
begin
  for r in select pg_get_functiondef(p.oid) d from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname in ('client_deliveries', 'client_deliveries_all')
      and p.prosrc ilike '%/trafego/estrategia%'
  loop
    execute replace(r.d, '/trafego/estrategia', '/estrategia/trafego');
  end loop;
end $$;
