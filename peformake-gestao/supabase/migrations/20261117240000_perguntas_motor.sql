-- Motor das perguntas do mês SEM IA (questionEngine.ts, na tela): nicho + o que falta no briefing + datas do mês + diagnóstico,
-- sem repetir o que já foi perguntado em outros meses. Esta função só grava: pacote do mês ainda intocado troca as pendentes
-- (as antigas ficam 'descartada'); com resposta ou envio, não mexe. Italo, 17/11.
create or replace function public.brief_questions_put(_client uuid, _month date, _qs jsonb)
returns integer language plpgsql security definer set search_path to '' as $$
declare m text := to_char(_month, 'YYYY-MM'); n integer := 0; r record; untouched boolean;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if jsonb_typeof(_qs) <> 'array' or jsonb_array_length(_qs) = 0 then return 0; end if;
  select not exists (select 1 from public.client_questions where client_id = _client and pack = 'briefing_mes' and focus = m and (status <> 'pendente' or answer is not null))
    into untouched;
  if not untouched then return 0; end if;
  update public.client_questions set status = 'descartada'
   where client_id = _client and pack = 'briefing_mes' and focus = m and status = 'pendente'
     and lower(question) not in (select lower(e->>'question') from jsonb_array_elements(_qs) e);
  for r in select e->>'area' area, e->>'question' question, e->>'why' why, coalesce(e->'options', '[]'::jsonb) options, ord
             from jsonb_array_elements(_qs) with ordinality t(e, ord)
            where coalesce(e->>'question', '') <> '' and e->>'area' in ('consultoria', 'vendas', 'social', 'audiovisual', 'trafego') loop
    insert into public.client_questions (client_id, area, pack, focus, question, why, required, status, source, options)
    values (_client, r.area, 'briefing_mes', m, left(r.question, 300), left(r.why, 300), r.ord <= 2, 'pendente', 'briefing', r.options)
    on conflict (client_id, area, lower(question)) do update set status = 'pendente', pack = 'briefing_mes', focus = m, why = excluded.why, options = excluded.options
      where (public.client_questions.status = 'descartada')
         or (public.client_questions.status = 'pendente' and public.client_questions.answer is null and (public.client_questions.pack is null or public.client_questions.focus = m));
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;
revoke execute on function public.brief_questions_put(uuid, date, jsonb) from public, anon;
grant execute on function public.brief_questions_put(uuid, date, jsonb) to authenticated;
