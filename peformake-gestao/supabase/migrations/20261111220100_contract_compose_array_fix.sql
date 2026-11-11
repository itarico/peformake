-- Correção: acrescentar item ao subtítulo com array_append (o || com texto solto quebrava).
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.contract_compose(uuid,uuid,text,text,text)'::regprocedure);
  d := regexp_replace(d, '_subs := _subs \|\| (''[^'']*'');', '_subs := array_append(_subs, \1::text);', 'g');
  d := replace(d, '_subs := _subs || lower(r.name);', '_subs := array_append(_subs, lower(r.name));');
  execute d;
end $do$;
