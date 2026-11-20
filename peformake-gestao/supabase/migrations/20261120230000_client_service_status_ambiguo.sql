-- "Entregas do mês" (Início) e Operação falhavam: client_service_status devolve uma coluna
-- client_id (RETURNS TABLE) e o union de estratégias usa client_id sem prefixo -> 42702 ambíguo.
-- Conserto: a função passa a preferir a coluna da tabela (#variable_conflict use_column).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.client_service_status(date,uuid)'::regprocedure);
  if position('#variable_conflict' in d) = 0 then
    d := replace(d, E'AS $function$\ndeclare', E'AS $function$\n#variable_conflict use_column\ndeclare');
    execute d;
  end if;
end $$;
