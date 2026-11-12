-- Enviar perguntas: a conversa leva SÓ as perguntas marcadas (bug: o link reaproveitado mantinha as antigas). Italo, 12/11/2026.
-- Ao reabrir o link: fica o que o cliente já respondeu + as marcadas agora; as que estavam no link sem resposta e não foram marcadas voltam para "pendente".
create or replace function public.client_chat_open(_client uuid, _ids uuid[])
returns text language plpgsql security definer set search_path to '' as $function$
declare _token text; _ids_ok uuid[]; _old uuid[];
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select coalesce(array_agg(q.id order by q.created_at), '{}') into _ids_ok
    from public.client_questions q where q.client_id = _client and q.id = any(_ids) and q.status in ('pendente', 'enviada');
  if cardinality(_ids_ok) = 0 then raise exception 'Escolha ao menos uma pergunta' using errcode = 'PF006'; end if;
  select s.token, s.question_ids into _token, _old from public.client_chat_sessions s
   where s.client_id = _client and s.status = 'aberta' and s.expires_at > now() order by s.created_at desc limit 1;
  if _token is not null then
    update public.client_questions set status = 'pendente', updated_at = now()
     where id = any(_old) and not id = any(_ids_ok) and status = 'enviada' and answer is null;
    update public.client_chat_sessions s set
      question_ids = array(select x from unnest(s.question_ids) x where exists (select 1 from public.client_questions q where q.id = x and q.status = 'respondida'))
        || array(select x from unnest(_ids_ok) x where not exists (select 1 from public.client_questions q where q.id = x and q.status = 'respondida')),
      stage = 'perguntas',
      expires_at = greatest(s.expires_at, now() + interval '21 days')
     where s.token = _token;
  else
    _token := encode(extensions.gen_random_bytes(24), 'hex');
    insert into public.client_chat_sessions (client_id, token, question_ids, created_by) values (_client, _token, _ids_ok, auth.uid());
  end if;
  update public.client_questions set status = 'enviada', sent_to_portal_at = coalesce(sent_to_portal_at, now()), updated_at = now()
   where id = any(_ids_ok);
  return _token;
end $function$;
