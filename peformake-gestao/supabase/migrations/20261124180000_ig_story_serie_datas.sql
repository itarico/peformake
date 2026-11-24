-- Story que repete com regra completa (pedido do Italo, 24/11/2026): a tela calcula as datas (dias da semana, horários,
-- período) e o banco grava uma publicação por data, todas na mesma série. Mesmas checagens do ig_post_create.
create or replace function public.ig_post_create_series(_account uuid, _kind text, _media jsonb, _caption text, _ats timestamptz[])
returns integer language plpgsql security definer set search_path to '' as $$
declare _series uuid := gen_random_uuid(); _at timestamptz; _n int := 0;
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if coalesce(cardinality(_ats), 0) < 1 then raise exception 'Escolha pelo menos uma data' using errcode = 'PF022'; end if;
  if cardinality(_ats) > 60 then raise exception 'No máximo 60 repetições' using errcode = 'PF022'; end if;
  for _at in select distinct x from unnest(_ats) x order by x loop
    perform public.ig_post_create(_account, _kind, _media, _caption, _at, null, 1);
    _n := _n + 1;
  end loop;
  -- Tudo o que esta chamada criou tem o mesmo created_at (mesma transação): liga na série.
  if _n > 1 then
    update public.ig_posts set series_id = _series
     where account_id = _account and created_by = auth.uid() and created_at = now() and series_id is null;
  end if;
  return _n;
end $$;
revoke execute on function public.ig_post_create_series(uuid, text, jsonb, text, timestamptz[]) from public, anon;
grant execute on function public.ig_post_create_series(uuid, text, jsonb, text, timestamptz[]) to authenticated;
