-- "Entregas do mês" (Início, Operação, barra do cliente) dava erro 400: client_service_status tem a coluna de saída
-- client_id e as subconsultas usam client_id sem tabela (42702 ambiguous). Resolve dizendo ao PL/pgSQL para preferir a coluna.
do $do$
declare def text := pg_get_functiondef('public.client_service_status(date,uuid)'::regprocedure);
begin
  if position('#variable_conflict' in def) = 0 then
    def := regexp_replace(def, 'AS \$function\$\s*', E'AS $function$\n#variable_conflict use_column\n');
    execute def;
  end if;
end $do$;
