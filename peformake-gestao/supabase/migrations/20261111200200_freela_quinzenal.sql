-- Freela também escolhe Mensal ou Quinzenal (os avulsos caem no próximo dia 15 ou 30). Só o sócio fica mensal.
create or replace function public.member_pay_config_save(_staff uuid, _data jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare
  _c text := nullif(_data->>'contract', '');
  _sched text := coalesce(nullif(_data->>'pay_schedule', ''), 'mensal');
  _adv numeric := nullif(_data->>'advance_pct', '')::numeric;
  _var boolean := coalesce((_data->>'variable_enabled')::boolean, false);
  _d jsonb := _data;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _c is null or _c not in ('clt', 'pj', 'freela', 'socio') then raise exception 'Escolha o tipo de contrato' using errcode = '22023'; end if;
  if _sched not in ('mensal', 'quinzenal') then raise exception 'Escolha Mensal ou Quinzenal' using errcode = '22023'; end if;
  if _adv is not null and (_adv <= 0 or _adv >= 100) then raise exception 'O adiantamento é um percentual entre 1 e 99' using errcode = '22023'; end if;
  if _c = 'socio' then _sched := 'mensal'; end if;
  if _c = 'freela' then _d := _d || jsonb_build_object('base_salary', 0); end if;
  if not (_c = 'pj' or (_c = 'clt' and _var)) then _d := _d || jsonb_build_object('variable_target', 0, 'goals', '[]'::jsonb); end if;
  perform public.member_pay_save(_staff, _d || jsonb_build_object('pay_day', ''));
  update public.member_pay set
    pay_schedule = _sched,
    advance_pct = case when _sched = 'quinzenal' then coalesce(_adv, case when _c = 'clt' then 40 else 50 end) else null end,
    variable_enabled = (_c = 'clt' and _var),
    require_invoice = (_c = 'pj' and coalesce((_data->>'require_invoice')::boolean, false)),
    profit_share_pct = case when _c = 'socio' then nullif(_data->>'profit_share_pct', '')::numeric end,
    profit_period = case when _c = 'socio' and _data->>'profit_period' = 'trimestral' then 'trimestral' else 'mensal' end,
    job_rates = case when _c = 'freela' then coalesce((select jsonb_object_agg(k, v::numeric) from jsonb_each_text(coalesce(_data->'job_rates', '{}'::jsonb)) e(k, v)
                 where v ~ '^[0-9]+(\.[0-9]+)?$' and v::numeric > 0), '{}'::jsonb) else '{}'::jsonb end
  where staff_id = _staff;
end $$;
