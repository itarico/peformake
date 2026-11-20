-- Antes de liberar a equipe (20/11): funções internas (SECURITY DEFINER) podiam ser chamadas por quem NEM entrou no
-- sistema (papel anon). Ex.: goal_mrr_now() devolvia o faturamento recorrente; contract_reminders_run() e
-- rank_snapshot_run() podiam ser disparadas por qualquer um.
-- Regra: visitante (anon) só chama o que as páginas públicas usam: funções com parâmetro _token (portal, pagamento,
-- orçamento, galeria, captação, apresentações), as do site (site_*), app_base_url e as checagens de permissão
-- (has_*, is_*, can_*), que já devolvem "não" para quem não entrou. Quem entrou (authenticated) continua igual.
-- Função nova que precisa ser pública: tem que receber _token; senão, revogue de anon e public ao criar.
do $$
declare f record; n int := 0;
begin
  for f in
    select p.oid::regprocedure sig from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.prosecdef and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('anon', p.oid, 'execute')
      and not (coalesce(p.proargnames, '{}') && array['_token'])
      and p.proname not in ('site_showcase', 'site_niche', 'site_lead_create', 'app_base_url')
      and p.proname !~ '^(has_|is_|can_)'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
    n := n + 1;
  end loop;
  raise notice 'fechadas para visitante: %', n;
end $$;
