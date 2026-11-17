-- Diagnóstico PADRONIZADO (Italo, 17/11): qualquer cliente ativo (qualquer serviço), feito pelo AGENTE do Claude
-- (não pela API paga), no mesmo formato/apresentação de hoje, 1 a cada 3 meses. Quem já tem: mantém e libera
-- 3 meses depois do último. A geração pela API (cron consult-diagnosis) fica desligada.

alter table public.consult_docs drop constraint if exists consult_docs_stage_check;
alter table public.consult_docs add constraint consult_docs_stage_check check (stage = any (array['research','diagnostico','comunicacao','plano','resumo','redo','done','agente']));

-- 1) Pedir: entra na fila do agente (stage 'agente'). Trava de 3 meses a partir do último pronto/aprovado/enviado.
create or replace function public.diag_next_at(_client uuid)
returns timestamptz language sql stable security definer set search_path to '' as $$
  select (finished_at + interval '3 months') from public.consult_docs
   where client_id = _client and status in ('pronto', 'aprovado', 'enviado') and finished_at is not null
$$;

create or replace function public.diag_request(_client uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare _next timestamptz; _missing text[];
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if not public.client_chat_alive(_client) then raise exception 'Cliente sem serviço ativo' using errcode = 'PF014'; end if;
  _next := public.diag_next_at(_client);
  if _next is not null and _next > now() then
    raise exception 'Próximo diagnóstico liberado em %', to_char(_next at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') using errcode = 'PF013';
  end if;
  _missing := coalesce(public.consult_missing(_client), '{}');
  insert into public.consult_docs (client_id, status, stage, missing, queued_at, error, attempts, busy_until)
  values (_client, 'na_fila', 'agente', _missing, now(), null, 0, null)
  on conflict (client_id) do update set status = 'na_fila', stage = 'agente', redo_section = null, missing = excluded.missing,
    queued_at = now(), error = null, attempts = 0, busy_until = null, started_at = null
  where public.consult_docs.status not in ('gerando');
  return 'na_fila';
end $$;
revoke execute on function public.diag_request(uuid) from public, anon;
grant execute on function public.diag_request(uuid) to authenticated;
revoke execute on function public.diag_next_at(uuid) from public, anon;
grant execute on function public.diag_next_at(uuid) to authenticated;

-- 2) Fila do agente (MCP/chat sem login, ou admin).
create or replace function public.diag_agent_queue()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.strategy_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('client_id', d.client_id, 'name', c.name, 'status', d.status, 'queued_at', d.queued_at) order by d.queued_at)
    from public.consult_docs d join public.clients c on c.id = d.client_id
   where d.stage = 'agente' and d.status in ('na_fila', 'gerando')), '[]'::jsonb);
end $$;

-- 3) Começar: marca "gerando" e devolve tudo o que o agente precisa, inclusive um diagnóstico aprovado como MODELO do formato.
create or replace function public.diag_agent_start(_client uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _out jsonb;
begin
  if not public.strategy_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.consult_docs set status = 'gerando', started_at = now(), updated_at = now() where client_id = _client and stage = 'agente' and status in ('na_fila', 'gerando');
  if not found then raise exception 'Este cliente não está na fila do diagnóstico' using errcode = 'PF004'; end if;
  select jsonb_build_object(
    'cliente', (select to_jsonb(c) - 'notes' from public.clients c where c.id = _client),
    'servicos', (select jsonb_agg(s.name) from public.client_services cs join public.services s on s.id = cs.service_id where cs.client_id = _client and cs.is_active),
    'briefing', (select data from public.client_briefs where client_id = _client),
    'links', (select jsonb_agg(jsonb_build_object('nome', name, 'url', url)) from public.client_links where client_id = _client),
    'respostas', (select jsonb_agg(jsonb_build_object('pergunta', question, 'resposta', answer, 'quando', answered_at) order by answered_at desc)
                   from public.client_questions where client_id = _client and status = 'respondida'),
    'faltam', (select missing from public.consult_docs where client_id = _client),
    'diagnostico_anterior', (select doc from public.consult_docs where client_id = _client and doc ? 'resumo'),
    'modelo_do_formato', (select doc from public.consult_docs where client_id <> _client and status in ('aprovado', 'enviado') and doc ? 'resumo' order by approved_at desc nulls last limit 1)
  ) into _out;
  return _out;
end $$;

-- 4) Entregar: grava o documento (mesmo formato do modelo), fica "pronto" para a equipe revisar e avisa.
create or replace function public.diag_agent_submit(_client uuid, _doc jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare _name text;
begin
  if not public.strategy_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if jsonb_typeof(_doc) <> 'object' or not (_doc ? 'resumo') or not (_doc ? 'diagnostico') then
    raise exception 'O documento precisa ter pelo menos resumo e diagnostico, no formato do modelo' using errcode = 'PF006';
  end if;
  update public.consult_docs set doc = _doc, status = 'pronto', stage = 'agente', finished_at = now(), error = null, busy_until = null,
    approved_at = null, approved_by = null, sent_at = null, sent_by = null, human_edits = default, updated_at = now()
   where client_id = _client and stage = 'agente' and status in ('na_fila', 'gerando');
  if not found then raise exception 'Este cliente não está na fila do diagnóstico' using errcode = 'PF004'; end if;
  select name into _name from public.clients where id = _client;
  perform public.notify(
    (select array_agg(distinct r.user_id) from public.user_roles r join public.profiles p on p.id = r.user_id where p.is_active and r.role in ('admin', 'head_marketing')),
    'diagnostico', format('Diagnóstico de %s pronto para revisar', trim(_name)), 'O agente terminou. Revise antes de enviar.',
    '/estrategia/consultoria?cliente=' || _client::text, _client);
end $$;

revoke execute on function public.diag_agent_queue() from public, anon;
revoke execute on function public.diag_agent_start(uuid) from public, anon;
revoke execute on function public.diag_agent_submit(uuid, jsonb) from public, anon;

-- 5) A geração pela API (cron consult-diagnosis) sai de cena: o agente é o motor.
select cron.alter_job((select jobid from cron.job where jobname = 'consult-diagnosis'), active := false);
