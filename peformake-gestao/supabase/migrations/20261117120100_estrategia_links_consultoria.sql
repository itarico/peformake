-- Tráfego e Social media saíram das abas da Estratégia e foram para dentro do cliente, em Consultoria.
-- Os links gravados pelas funções passam a abrir o cliente na Consultoria, rolando até o cartão da área (?foco=).
-- (As rotas antigas também redirecionam, para os avisos já gravados.)
do $$
declare r record; d text;
begin
  for r in select p.proname, pg_get_functiondef(p.oid) d from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname in ('client_deliveries', 'client_deliveries_all', 'monthly_notify_ready')
      and (p.prosrc ilike '%/estrategia/trafego%' or p.prosrc ilike '%/estrategia/social%')
  loop
    d := r.d;
    d := replace(d, '''/estrategia/trafego?cliente=''', '''/estrategia/consultoria?foco=trafego&cliente=''');
    d := replace(d, '''/estrategia/social?cliente=''', '''/estrategia/consultoria?foco=social&cliente=''');
    if r.proname = 'monthly_notify_ready' then
      d := replace(d, '''/estrategia/trafego''', '''/estrategia/consultoria?foco=trafego''');
      d := replace(d, '''/estrategia/social''', '''/estrategia/consultoria?foco=social''');
      d := replace(d, '_r.path || ''?cliente=''', '_r.path || case when _r.path like ''%?%'' then ''&'' else ''?'' end || ''cliente=''');
    else
      d := replace(d, '''/estrategia/trafego''', '''/estrategia/consultoria''');
    end if;
    execute d;
  end loop;
end $$;

-- Avisos já gravados com o caminho antigo.
update public.notifications set link = replace(replace(link, '/estrategia/trafego?', '/estrategia/consultoria?foco=trafego&'), '/estrategia/social?', '/estrategia/consultoria?foco=social&')
where link like '/estrategia/trafego?%' or link like '/estrategia/social?%';
