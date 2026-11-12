-- Audiovisual (decisão do Italo, 12/11/2026): o vídeo entregue pela edição vai DIRETO para o cliente aprovar
-- (sem revisão interna). Na entrega:
--   * o cliente recebe o WhatsApp automático com o link do portal para aprovar (exceção aprovada; desligável em
--     Configurações → Automações, chave av_settings.auto_client_whatsapp);
--   * o videomaker e o responsável do projeto (ou, sem responsável, quem gere o audiovisual) são avisados no sistema.
-- Aviso único por projeto + rodada de ajuste (revision_count). Pedido de ajuste do cliente volta para a edição
-- (portal_av_decide já avisa o editor) e a próxima entrega repete o fluxo.
-- Só create or replace / if not exists.

alter table public.av_settings add column if not exists auto_client_whatsapp boolean not null default true;

-- Link do portal guardado para os avisos automáticos (o portal guarda só o hash do link; aqui fica o texto para
-- poder mandar no WhatsApp). Só funções do banco leem esta tabela.
create table if not exists public.client_portal_auto (
  client_id uuid primary key references public.clients(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now()
);
alter table public.client_portal_auto enable row level security;
revoke all on public.client_portal_auto from anon, authenticated;

-- Endereço do portal do cliente para mandar no aviso. Reaproveita o link guardado enquanto estiver ativo;
-- se a equipe trocou o link (o antigo foi desligado), cria um novo.
create or replace function public.client_portal_auto_url(_client uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare _token text; _site text;
begin
  if not exists (select 1 from public.clients where id = _client and is_active and not is_lost) then return null; end if;
  select coalesce(site_url, 'https://peformake-gestao.vercel.app') into _site from public.av_settings where id;
  select a.token into _token from public.client_portal_auto a
    where a.client_id = _client
      and exists (select 1 from public.client_portal_links l where l.client_id = _client and l.revoked_at is null
                  and l.token_hash = extensions.digest(a.token, 'sha256'));
  if _token is null then
    _token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
    insert into public.client_portal_links (client_id, token_hash, created_by) values (_client, extensions.digest(_token, 'sha256'), null);
    insert into public.client_portal_auto (client_id, token) values (_client, _token)
      on conflict (client_id) do update set token = excluded.token, created_at = now();
  end if;
  return coalesce(_site, 'https://peformake-gestao.vercel.app') || '/portal#' || _token;
end;
$$;
revoke all on function public.client_portal_auto_url(uuid) from public, anon, authenticated;

-- Avisos da entrega ao cliente: WhatsApp do cliente (contatos que aprovam) + videomaker e responsável no sistema.
create or replace function public.av_client_review_notify(_project_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  _p public.av_projects;
  _client text;
  _url text;
  _key text;
  _sent boolean := false;
  _who uuid[];
  _vm uuid;
  _auto boolean;
begin
  select * into _p from public.av_projects where id = _project_id;
  if _p.id is null then return; end if;
  select name into _client from public.clients where id = _p.client_id;
  _key := 'av_client_review:' || _p.id || ':' || _p.revision_count;
  _auto := coalesce((select auto_client_whatsapp from public.av_settings where id), true);

  if _auto and public.av_once('cli:' || _key) then
    _url := public.client_portal_auto_url(_p.client_id);
    _sent := public.notify_client_private(_p.client_id, 'av_client_review',
      'Olá, ' || coalesce(_client, '') || '! O vídeo "' || _p.title || '" ficou pronto'
        || case when _p.revision_count > 0 then ' com o ajuste que você pediu' else '' end
        || '. Veja e aprove (ou peça ajuste) aqui: ' || coalesce(_url, 'no portal da Peformake'),
      _key);
  end if;

  select profile_id into _vm from public.staff_members where id = _p.videomaker_id;
  _who := case when _p.owner_id is not null then array[_p.owner_id]
    else array(select distinct r.user_id from public.user_roles r join public.profiles pr on pr.id = r.user_id and pr.is_active
               where r.role in ('ellcazo', 'head_marketing')) end;
  if public.av_once('team:' || _key) then
    perform public.notify(array_remove(array[_vm], null), 'av_client_review', 'Vídeo com o cliente: ' || coalesce(_client, ''),
      _p.title || ' foi entregue pela edição e está com o cliente para aprovar.', '/audiovisual/projeto/' || _p.id, _p.client_id);
    perform public.notify(array(select x from unnest(_who) x where x is distinct from _vm), 'av_client_review', 'Vídeo com o cliente: ' || coalesce(_client, ''),
      _p.title || case when not _auto then '. O aviso automático está desligado: avise o cliente.'
                       when _sent then '. O cliente já foi avisado no WhatsApp.'
                       else '. Cliente sem WhatsApp de aprovação no cadastro: avise por outro meio.' end,
      '/audiovisual/projeto/' || _p.id, _p.client_id);
  end if;
end;
$$;
revoke all on function public.av_client_review_notify(uuid) from public, anon, authenticated;

create or replace function public.av_status_label(_status text)
 returns text
 language sql
 immutable
 set search_path to ''
as $$
  select case _status when 'script' then 'Roteiro' when 'scheduled' then 'Captação marcada' when 'captured' then 'Captado'
    when 'editing' then 'Em edição' when 'review' then 'Pronto para o cliente' when 'client_review' then 'Com o cliente'
    when 'changes_requested' then 'Ajuste pedido' when 'approved' then 'Aprovado' when 'delivered' then 'Entregue'
    when 'cancelled' then 'Cancelado' else _status end;
$$;

create or replace function public.av_set_status(_project_id uuid, _status text, _note text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _p public.av_projects;
  _manager boolean := public.can_manage_av();
  _me uuid := public.my_staff_id();
  _client text;
  _link text;
begin
  perform public.av_require_access();
  select * into _p from public.av_projects where id = _project_id for update;
  if not found then
    raise exception 'Nao encontrado' using errcode = 'PF004';
  end if;
  if _status = _p.status then
    return;
  end if;
  if _status not in ('script', 'scheduled', 'captured', 'editing', 'review', 'client_review', 'changes_requested', 'approved', 'delivered', 'cancelled') then
    raise exception 'Formato invalido' using errcode = 'PF006';
  end if;
  -- Editor: começa a edição e entrega direto ao cliente (12/11/2026: sem revisão interna).
  if not _manager and not (
      (public.has_role('videomaker') and _p.videomaker_id = _me and _p.status = 'scheduled' and _status = 'captured')
      or (public.has_role('editor') and _p.editor_id = _me
          and ((_p.status in ('captured', 'changes_requested') and _status = 'editing')
               or (_p.status in ('editing', 'changes_requested') and _status = 'client_review')))) then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;
  if _status = 'scheduled' and _p.shoot_at is null then
    raise exception 'Marque a data da captacao' using errcode = 'PF006';
  end if;
  if _status = 'captured' and _p.raw_link is null then
    raise exception 'Coloque o link do material bruto' using errcode = 'PF006';
  end if;
  if _status in ('review', 'client_review', 'approved', 'delivered') and _p.final_link is null then
    raise exception 'Coloque o link do video final' using errcode = 'PF006';
  end if;
  if _status = 'client_review' and coalesce(_p.video_count, 0) < 1 then
    raise exception 'Informe os videos entregues nesta visita' using errcode = 'PF006';
  end if;
  if _status = 'changes_requested' and length(trim(coalesce(_note, ''))) < 3 then
    raise exception 'Diga o que ajustar' using errcode = 'PF006';
  end if;
  update public.av_projects set status = _status,
    revision_note = case when _status = 'changes_requested' then trim(_note) when _status = 'approved' then null else revision_note end,
    revision_count = revision_count + case when _status = 'changes_requested' then 1 else 0 end,
    due_date = case when _status = 'captured' and due_date is null then ((now() at time zone 'America/Sao_Paulo')::date + 2) else due_date end,
    delivered_at = case when _status = 'delivered' then now() else delivered_at end,
    updated_at = now(), updated_by = (select auth.uid())
  where id = _p.id;
  insert into public.av_events (project_id, actor_id, actor_kind, from_status, to_status, message)
  values (_p.id, (select auth.uid()), 'staff', _p.status, _status, nullif(trim(coalesce(_note, '')), ''));

  select name into _client from public.clients where id = _p.client_id;
  _link := '/audiovisual/projeto/' || _p.id;
  if _status = 'scheduled' then
    perform public.notify(array[(select profile_id from public.staff_members where id = _p.videomaker_id),
      (select profile_id from public.staff_members where id = _p.editor_id)],
      'av_scheduled', 'Captação marcada: ' || _client,
      to_char(_p.shoot_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') || coalesce(' em ' || _p.location, ''), _link, _p.client_id);
  elsif _status in ('captured', 'changes_requested') then
    perform public.notify(coalesce(array[(select profile_id from public.staff_members where id = _p.editor_id)], '{}')
      || public.client_staff_profiles(_p.client_id, array['editor']),
      'av_' || _status, case when _status = 'captured' then 'Material para editar: ' else 'Ajuste no vídeo: ' end || _client,
      coalesce(nullif(trim(coalesce(_note, '')), ''), _p.title), _link, _p.client_id);
  elsif _status = 'client_review' then
    perform public.av_client_review_notify(_p.id);
  elsif _status in ('approved', 'delivered') then
    perform public.notify(array[(select profile_id from public.staff_members where id = _p.editor_id),
      (select profile_id from public.staff_members where id = _p.videomaker_id)] || public.client_staff_profiles(_p.client_id, array['social_media']),
      'av_' || _status, 'Vídeo ' || case when _status = 'approved' then 'aprovado' else 'entregue' end || ': ' || _client, _p.title, _link, _p.client_id);
  end if;
end;
$function$;

create or replace function public.av_settings_save(_data jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not public.can_manage_av() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.av_settings set
    edit_hours = coalesce((_data->>'edit_hours')::int, edit_hours),
    raw_until_hour = coalesce((_data->>'raw_until_hour')::int, raw_until_hour),
    default_duration_min = coalesce((_data->>'default_duration_min')::int, default_duration_min),
    checkin_radius_m = coalesce((_data->>'checkin_radius_m')::int, checkin_radius_m),
    calendar_account_ids = case when _data ? 'calendar_account_ids'
      then coalesce((select array_agg(v::uuid) from jsonb_array_elements_text(_data->'calendar_account_ids') v), '{}') else calendar_account_ids end,
    notify_client = coalesce((_data->>'notify_client')::boolean, notify_client),
    notify_team = coalesce((_data->>'notify_team')::boolean, notify_team),
    auto_client_whatsapp = coalesce((_data->>'auto_client_whatsapp')::boolean, auto_client_whatsapp),
    updated_at = now()
  where id;
end;
$function$;

-- Regra do aviso (nome e texto para Configurações → Avisos).
update public.notification_rules set name = 'Vídeo entregue ao cliente',
  description = 'O editor entrega e o vídeo vai direto ao cliente: WhatsApp automático com o link do portal; videomaker e responsável são avisados no sistema.'
where kind = 'av_client_review';
update public.notification_rules set description = 'Vídeos antigos que ficaram prontos antes de 12/11 (hoje o vídeo vai direto ao cliente).'
where kind = 'av_review';
update public.notification_rules set description = 'Check-in, checkout, bruto e prazo de edição.' where kind = 'av_team';

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, cron_job, flag_table, flag_column)
values ('av_entrega_cliente', 'audiovisual', 2, 'Vídeo entregue avisa o cliente no WhatsApp',
  'Quando a edição entrega o vídeo, ele vai direto para o cliente aprovar no portal e o cliente recebe no WhatsApp o link para aprovar. O videomaker e o responsável são avisados no sistema.',
  'Exceção aprovada pelo Italo em 12/11/2026. Vai para os contatos do cliente marcados para aprovar (ou o telefone do cadastro), respeitando o horário de silêncio. Uma vez por entrega; depois de um ajuste, avisa de novo. Desligado: o vídeo vai para o cliente, mas a equipe avisa.',
  'Na entrega do vídeo', false, 'medio', null, 'av_settings', 'auto_client_whatsapp')
on conflict (key) do update set module = excluded.module, position = excluded.position, title = excluded.title, what = excluded.what,
  how = excluded.how, schedule = excluded.schedule, uses_ai = excluded.uses_ai, risk = excluded.risk, cron_job = excluded.cron_job,
  flag_table = excluded.flag_table, flag_column = excluded.flag_column;

-- Texto do aviso antigo (status 'review' só existe em vídeos de antes de 12/11).
create or replace function public.av_stage_after()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare _client_name text;
begin
  if new.status = old.status then return null; end if;
  select name into _client_name from public.clients where id = new.client_id;
  if new.status = 'review' and new.owner_id is not null then
    perform public.notify(array[new.owner_id], 'av_team', 'Vídeo pronto: mande ao cliente', _client_name || ' · ' || new.title, '/audiovisual/projeto/' || new.id, new.client_id);
  end if;
  if new.status = 'delivered' and new.final_link is not null then
    insert into public.client_links (client_id, name, url, created_by)
    select new.client_id, left('Vídeo: ' || new.title, 120), new.final_link, new.owner_id
    where not exists (select 1 from public.client_links l where l.client_id = new.client_id and l.url = new.final_link);
    if 'social' = any (public.client_areas(new.client_id)) then
      insert into public.social_tasks (client_id, title, description, source, network, ref_table, ref_id)
      values (new.client_id, left('Publicar vídeo aprovado: ' || new.title, 200), 'Vídeo aprovado pelo cliente: ' || new.final_link, 'manual', 'instagram', 'av_projects', new.id)
      on conflict do nothing;
    end if;
  end if;
  return null;
end;
$function$;
