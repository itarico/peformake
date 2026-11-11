-- Plural simples das entregas ("até 6 captações por mês").
create or replace function public.plural_pt(_w text)
returns text language sql immutable set search_path to '' as $$
  select case
    when _w is null or _w = '' then _w
    when split_part(_w, ' ', 1) ~ 'ão$' then regexp_replace(split_part(_w, ' ', 1), 'ão$', 'ões') || substr(_w, length(split_part(_w, ' ', 1)) + 1)
    when split_part(_w, ' ', 1) ~ '[aeiouáéíóú]$' then split_part(_w, ' ', 1) || 's' || substr(_w, length(split_part(_w, ' ', 1)) + 1)
    when split_part(_w, ' ', 1) ~ '[rz]$' then split_part(_w, ' ', 1) || 'es' || substr(_w, length(split_part(_w, ' ', 1)) + 1)
    when split_part(_w, ' ', 1) ~ 'l$' then regexp_replace(split_part(_w, ' ', 1), 'l$', 'is') || substr(_w, length(split_part(_w, ' ', 1)) + 1)
    else _w end;
$$;

do $do$
declare d text;
begin
  d := pg_get_functiondef('public.contract_compose(uuid,uuid,text,text,text)'::regprocedure);
  d := replace(d, $x$|| ' ' || coalesce(nullif(r.delivery_unit, ''), 'entrega') || ' por '$x$,
                  $x$|| ' ' || case when r.qty > 1 then public.plural_pt(coalesce(nullif(r.delivery_unit, ''), 'entrega')) else coalesce(nullif(r.delivery_unit, ''), 'entrega') end || ' por '$x$);
  execute d;
end $do$;
