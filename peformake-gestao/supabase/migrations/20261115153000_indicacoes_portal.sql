-- Indicações pelo portal + fim da conversa de perguntas (Italo, 12/11/2026).
-- 1) Conversa: no máximo 4 perguntas por conversa.
-- 2) No fim da conversa, quem deu nota 9 ou 10 vai para o portal dele, direto em "Indicações".
-- 3) Cada indicação vira um pedido no funil comercial (mesmo caminho do formulário do site: site_leads),
--    marcada como "Indicação de <cliente>", e avisa o comercial com o link que abre o pedido.
-- Só create or replace e if not exists (nada é apagado).

-- Pedidos do site ganham a origem (site ou indicação), quem indicou e a marca (Peformake ou Ellcazo).
alter table public.site_leads add column if not exists source text not null default 'site';
alter table public.site_leads add column if not exists referred_by uuid references public.clients(id) on delete set null;
alter table public.site_leads add column if not exists unit text not null default 'peformake';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'site_leads_source_check') then
    alter table public.site_leads add constraint site_leads_source_check check (source in ('site', 'indicacao', 'orcamento'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_leads_unit_check') then
    alter table public.site_leads add constraint site_leads_unit_check check (unit in ('peformake', 'ellcazo'));
  end if;
end $$;
create index if not exists site_leads_referred_idx on public.site_leads (referred_by, created_at desc) where referred_by is not null;
-- Orçamentos da Ellcazo que já tinham virado pedido.
update public.site_leads set source = 'orcamento', unit = 'ellcazo' where source = 'site' and interest like 'Orçamento Ellcazo:%';

-- Link do portal criado pela conversa: um por conversa. Usa user_id = id da conversa para não trocar
-- (nem ser trocado pelo) link que a equipe gera em Clientes → Portal. "Tirar acesso" e cliente perdido revogam todos.
alter table public.client_portal_links add column if not exists origin text not null default 'equipe';
alter table public.client_chat_sessions add column if not exists portal_token text;

-- Marca de quem atende o cliente: Ellcazo só quando ele é cliente só do audiovisual.
create or replace function public.client_brand(_client uuid)
returns text language sql stable security definer set search_path to '' as $$
  select case when public.is_ellcazo_client(_client) and not exists (
      select 1 from public.client_services cs join public.services s on s.id = cs.service_id
       where cs.client_id = _client and cs.is_active and s.area <> 'audiovisual')
    then 'ellcazo' else 'peformake' end
$$;
revoke all on function public.client_brand(uuid) from public, anon;
grant execute on function public.client_brand(uuid) to authenticated, service_role;

-- Enviar perguntas: até 4 por conversa. Se a conversa aberta já tem respostas e passaria de 4, ela é concluída
-- (as respostas ficam salvas) e nasce outra, só com as marcadas agora.
create or replace function public.client_chat_open(_client uuid, _ids uuid[])
returns text language plpgsql security definer set search_path to '' as $function$
declare _token text; _old uuid[]; _ids_ok uuid[]; _answered int;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select coalesce(array_agg(q.id order by q.created_at), '{}') into _ids_ok
    from public.client_questions q where q.client_id = _client and q.id = any(_ids) and q.status in ('pendente', 'enviada');
  if cardinality(_ids_ok) = 0 then raise exception 'Escolha ao menos uma pergunta' using errcode = 'PF006'; end if;
  if cardinality(_ids_ok) > 4 then raise exception 'Escolha no máximo 4 perguntas por conversa' using errcode = 'PF006'; end if;
  select s.token, s.question_ids into _token, _old from public.client_chat_sessions s
   where s.client_id = _client and s.status = 'aberta' and s.expires_at > now() order by s.created_at desc limit 1;
  if _token is not null then
    select count(*) into _answered from public.client_questions q where q.id = any(_old) and q.status = 'respondida' and not q.id = any(_ids_ok);
    update public.client_questions set status = 'pendente', updated_at = now()
     where id = any(_old) and not id = any(_ids_ok) and status = 'enviada' and answer is null;
    if _answered + cardinality(_ids_ok) > 4 then
      update public.client_chat_sessions set status = 'concluida', stage = 'fim', current_question = null, finished_at = coalesce(finished_at, now())
       where token = _token;
      _token := null;
    else
      update public.client_chat_sessions s set
        question_ids = array(select x from unnest(s.question_ids) x where exists (select 1 from public.client_questions q where q.id = x and q.status = 'respondida'))
          || array(select x from unnest(_ids_ok) x where not exists (select 1 from public.client_questions q where q.id = x and q.status = 'respondida')),
        stage = 'perguntas',
        expires_at = greatest(s.expires_at, now() + interval '21 days')
       where s.token = _token;
    end if;
  end if;
  if _token is null then
    _token := encode(extensions.gen_random_bytes(24), 'hex');
    insert into public.client_chat_sessions (client_id, token, question_ids, created_by) values (_client, _token, _ids_ok, auth.uid());
  end if;
  update public.client_questions set status = 'enviada', sent_to_portal_at = coalesce(sent_to_portal_at, now()), updated_at = now()
   where id = any(_ids_ok);
  return _token;
end $function$;
revoke all on function public.client_chat_open(uuid, uuid[]) from public, anon;
grant execute on function public.client_chat_open(uuid, uuid[]) to authenticated;

-- Fim da conversa: marca e, só para quem deu 9 ou 10, o código do portal do próprio cliente (cria uma vez, depois reaproveita).
-- Só a função client-chat chama (chave de serviço).
create or replace function public.client_chat_closing(_session uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _s public.client_chat_sessions; _token text; _ok boolean;
begin
  select * into _s from public.client_chat_sessions where id = _session;
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  if _s.status <> 'concluida' or coalesce(_s.nps_score, -1) < 9
     or not exists (select 1 from public.clients c where c.id = _s.client_id and c.is_active and not c.is_lost) then
    return jsonb_build_object('brand', public.client_brand(_s.client_id), 'portal', null);
  end if;
  _token := _s.portal_token;
  _ok := _token is not null and exists (select 1 from public.client_portal_links l
    where l.token_hash = extensions.digest(_token, 'sha256') and l.revoked_at is null and l.client_id = _s.client_id);
  if not _ok then
    update public.client_portal_links set revoked_at = now() where user_id = _session and revoked_at is null;
    _token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
    insert into public.client_portal_links (client_id, token_hash, created_by, user_id, origin)
      values (_s.client_id, extensions.digest(_token, 'sha256'), _s.created_by, _session, 'conversa');
    update public.client_chat_sessions set portal_token = _token where id = _session;
  end if;
  return jsonb_build_object('brand', public.client_brand(_s.client_id), 'portal', _token);
end $$;
revoke all on function public.client_chat_closing(uuid) from public, anon, authenticated;
grant execute on function public.client_chat_closing(uuid) to service_role;

-- Situação da indicação em palavras simples (o cliente vê).
create or replace function public.referral_status_label(_status text)
returns text language sql immutable set search_path to '' as $$
  select case _status when 'novo' then 'Recebida' when 'contatado' then 'Já falamos com a pessoa'
    when 'virou_lead' then 'Em conversa com a equipe' when 'descartado' then 'Não seguiu desta vez' else 'Recebida' end
$$;

-- Portal: as indicações deste cliente (só as dele) e a marca.
create or replace function public.portal_referrals(_token text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _client uuid := public.portal_resolve(_token);
begin
  return jsonb_build_object(
    'brand', public.client_brand(_client),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'name', l.name, 'company', l.company, 'status', l.status,
        'status_label', public.referral_status_label(l.status), 'created_at', l.created_at) order by l.created_at desc)
      from (select * from public.site_leads where referred_by = _client and source = 'indicacao' order by created_at desc limit 50) l), '[]'::jsonb));
end $$;
revoke all on function public.portal_referrals(text) from public;
grant execute on function public.portal_referrals(text) to anon, authenticated;

-- Portal: indicar alguém. Vira pedido no funil (site_leads) e avisa o comercial com o link do pedido.
create or replace function public.portal_referral_create(_token text, _data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _client uuid := public.portal_resolve(_token); _phone text := regexp_replace(coalesce(_data->>'phone', ''), '[^0-9]', '', 'g');
  _name text := left(trim(coalesce(_data->>'name', '')), 120); _company text := nullif(left(trim(coalesce(_data->>'company', '')), 120), '');
  _note text := nullif(left(trim(coalesce(_data->>'note', '')), 600), ''); _who text; _unit text; _id uuid;
begin
  if length(_phone) between 10 and 11 then _phone := '55' || _phone; end if;
  if length(_name) < 2 then raise exception 'Escreva o nome de quem você indica' using errcode = 'PF006'; end if;
  if _phone !~ '^[0-9]{12,13}$' then raise exception 'Confira o WhatsApp (com DDD)' using errcode = 'PF006'; end if;
  select l.id into _id from public.site_leads l where l.referred_by = _client and l.phone = _phone limit 1;
  if _id is not null then raise exception 'Você já indicou esta pessoa. Obrigado!' using errcode = 'PF006'; end if;
  if (select count(*) from public.site_leads where referred_by = _client and created_at > now() - interval '1 day') >= 15 then
    raise exception 'Muitas indicações hoje. Tente amanhã.' using errcode = 'PF006';
  end if;
  select trim(name) into _who from public.clients where id = _client;
  _unit := public.client_brand(_client);
  insert into public.site_leads (name, phone, company, segment, interest, message, source, referred_by, unit, utm)
  values (_name, _phone, _company, nullif(left(trim(coalesce(_data->>'segment', '')), 80), ''),
    left('Indicação de ' || _who, 120), _note, 'indicacao', _client, _unit, jsonb_build_object('origem', 'portal'))
  returning id into _id;
  perform public.notify(public.commercial_team_profiles(), 'client_referral',
    left('Indicação de ' || _who || ': ' || _name, 200),
    concat_ws(' · ', _company, case when _unit = 'ellcazo' then 'Ellcazo' end, _note),
    '/comercial/prospeccao?lead=' || _id::text, _client);
  return _id;
end $$;
revoke all on function public.portal_referral_create(text, jsonb) from public;
grant execute on function public.portal_referral_create(text, jsonb) to anon, authenticated;

-- "Foi para Meus leads": a nota diz de onde veio (site, indicação de quem, orçamento).
create or replace function public.site_lead_update(_id uuid, _status text)
returns void language plpgsql security definer set search_path to '' as $function$
declare _l public.site_leads;
begin
  if not public.can_prospect() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.site_leads set status = _status where id = _id returning * into _l;
  if _status = 'virou_lead' and _l.id is not null then
    insert into public.member_leads (profile_id, name, company, phone, interest, notes, stage)
    values ((select auth.uid()), _l.name, _l.company, _l.phone, _l.interest,
      left(concat_ws(E'\n',
        case _l.source when 'indicacao' then 'Indicação de ' || coalesce((select trim(c.name) from public.clients c where c.id = _l.referred_by), 'cliente') || '.'
          when 'orcamento' then 'Veio de um orçamento da Ellcazo.' else 'Veio pelo site.' end,
        'Segmento: ' || _l.segment, 'Faturamento: ' || _l.revenue, _l.message), 2000), 'contato');
  end if;
end;
$function$;

-- Aviso novo: "Indicação de cliente" (comercial).
insert into public.notification_rules (kind, category, name, description, audience, in_app, whatsapp_client, position, email)
values ('client_referral', 'comercial', 'Indicação de cliente', 'Um cliente indicou alguém pelo portal. Vira pedido em Comercial → Prospecção.', 'equipe', true, false, 231, false)
on conflict (kind) do update set name = excluded.name, description = excluded.description, category = excluded.category;

-- Texto da automação da conversa: fim com a nota e o convite para indicar.
update public.automation_catalog set
  what = 'Quando o cliente abre o link, uma IA barata conduz a conversa: até 4 perguntas curtas, uma por vez, com botões, texto, áudio, foto ou documento. No fim pede a nota (NPS) e uma avaliação curta; quem dá 9 ou 10 é levado ao portal dele, direto em Indicações.',
  how = 'Só responde dentro do link que a equipe enviou. Cada resposta é salva na hora e avisa a equipe. A IA só vê os dados daquele cliente. Indicação vira pedido em Comercial → Prospecção e avisa o comercial; ninguém recebe mensagem automática.'
where key = 'est_conversa';

-- Pedido que nasce de um orçamento da Ellcazo (av_quote_save) já entra marcado.
create or replace function public.site_leads_mark_origin()
returns trigger language plpgsql set search_path to '' as $$
begin
  if new.source = 'site' and coalesce(new.interest, '') like 'Orçamento Ellcazo:%' then
    new.source := 'orcamento'; new.unit := 'ellcazo';
  end if;
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'site_leads_mark_origin' and tgrelid = 'public.site_leads'::regclass) then
    create trigger site_leads_mark_origin before insert on public.site_leads for each row execute function public.site_leads_mark_origin();
  end if;
end $$;
