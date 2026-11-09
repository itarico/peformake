-- Financeiro · Fase 0, item 4: multa e juros ligáveis, e link de pagamento que pede CPF/CNPJ quando falta.
-- Antes: o Asaas não recebia multa nem juros, e cliente sem CPF/CNPJ ficava sem link (erro na fatura).
-- Agora: cada fatura tem um link nosso (/pagar/<token>). Se o cliente não tem documento, a página pede,
-- confere os dígitos, salva no cadastro e só então gera a cobrança no Asaas.

alter table public.billing_settings
  add column if not exists fine_enabled boolean not null default false,
  add column if not exists fine_pct numeric(4,2) not null default 2 check (fine_pct between 0 and 2),
  add column if not exists interest_pct numeric(4,2) not null default 1 check (interest_pct between 0 and 1);

alter table public.invoices add column if not exists pay_token uuid not null default gen_random_uuid();
create unique index if not exists invoices_pay_token on public.invoices(pay_token);

-- CPF (11) ou CNPJ (14) com dígitos verificadores válidos.
create or replace function public.cpf_cnpj_valid(_doc text)
returns boolean language plpgsql immutable set search_path to '' as $$
declare d text := regexp_replace(coalesce(_doc, ''), '\D', '', 'g'); s int; r int; i int; w int[];
begin
  if length(d) = 11 then
    if d ~ '^(\d)\1{10}$' then return false; end if;
    s := 0; for i in 1..9 loop s := s + substr(d, i, 1)::int * (11 - i); end loop;
    r := (s * 10) % 11; if r = 10 then r := 0; end if;
    if r <> substr(d, 10, 1)::int then return false; end if;
    s := 0; for i in 1..10 loop s := s + substr(d, i, 1)::int * (12 - i); end loop;
    r := (s * 10) % 11; if r = 10 then r := 0; end if;
    return r = substr(d, 11, 1)::int;
  elsif length(d) = 14 then
    if d ~ '^(\d)\1{13}$' then return false; end if;
    w := array[5,4,3,2,9,8,7,6,5,4,3,2];
    s := 0; for i in 1..12 loop s := s + substr(d, i, 1)::int * w[i]; end loop;
    r := s % 11; r := case when r < 2 then 0 else 11 - r end;
    if r <> substr(d, 13, 1)::int then return false; end if;
    w := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
    s := 0; for i in 1..13 loop s := s + substr(d, i, 1)::int * w[i]; end loop;
    r := s % 11; r := case when r < 2 then 0 else 11 - r end;
    return r = substr(d, 14, 1)::int;
  end if;
  return false;
end $$;

-- Link público da fatura (quem tem o token vê só o necessário para pagar).
create or replace function public.pay_url(_token uuid)
returns text language sql immutable set search_path to '' as $$
  select 'https://peformake-gestao.vercel.app/pagar/' || _token
$$;

create or replace function public.invoice_pay_info(_token uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _i public.invoices; _c public.clients; _amount numeric; _desc text;
begin
  select * into _i from public.invoices where pay_token = _token;
  if _i.id is null then return null; end if;
  select * into _c from public.clients where id = _i.client_id;
  _amount := _i.amount; _desc := _i.description;
  if _i.group_id is not null then
    select g.description, (select sum(x.amount) from public.invoices x where x.group_id = g.id and x.status <> 'cancelado')
      into _desc, _amount from public.invoice_groups g where g.id = _i.group_id;
  end if;
  return jsonb_build_object(
    'client', trim(_c.name), 'description', _desc, 'amount', _amount, 'due_date', _i.due_date,
    'status', _i.status, 'paid_at', _i.paid_at,
    'needs_document', not public.cpf_cnpj_valid(_c.document),
    'payment_url', (select max(x.payment_url) from public.invoices x where x.id = _i.id or (_i.group_id is not null and x.group_id = _i.group_id)));
end $$;

create or replace function public.invoice_pay_set_document(_token uuid, _doc text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare _client uuid; _d text := regexp_replace(coalesce(_doc, ''), '\D', '', 'g');
begin
  select client_id into _client from public.invoices where pay_token = _token and status in ('pendente', 'vencido');
  if _client is null then raise exception 'Fatura nao encontrada' using errcode = 'PF004'; end if;
  if not public.cpf_cnpj_valid(_d) then raise exception 'CPF ou CNPJ invalido' using errcode = 'PF006'; end if;
  -- Só preenche quando o cadastro não tem documento válido (nunca troca um documento que já está certo).
  update public.clients set document = _d, updated_at = now() where id = _client and not public.cpf_cnpj_valid(document);
  return true;
end $$;

revoke execute on function public.invoice_pay_info(uuid), public.invoice_pay_set_document(uuid, text) from public;
grant execute on function public.invoice_pay_info(uuid), public.invoice_pay_set_document(uuid, text) to anon, authenticated;
grant execute on function public.cpf_cnpj_valid(text), public.pay_url(uuid) to authenticated;

-- Lembretes: sem link do Asaas, manda o nosso link (que pede o CPF/CNPJ e gera a cobrança).
create or replace function public.billing_reminders_run()
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  _i record;
  _d int;
  _msg text;
  _sent int := 0;
  _alerts int := 0;
  _stops int := 0;
begin
  for _i in
    select (array_agg(i.id order by i.id))[1] as id, array_agg(i.id) as ids, (array_agg(i.client_id))[1] as client_id, max(c.name) as client_name,
      coalesce(max(g.description), max(i.description)) as description, sum(i.amount) as amount, max(i.due_date) as due_date,
      coalesce(max(i.payment_url), public.pay_url((array_agg(i.pay_token order by i.id))[1])) as payment_url, bool_and(i.status = 'pendente') as all_pending
    from public.invoices i join public.clients c on c.id = i.client_id left join public.invoice_groups g on g.id = i.group_id
    where i.status in ('pendente', 'vencido') and i.due_date between (now() at time zone 'America/Sao_Paulo')::date - 7 and (now() at time zone 'America/Sao_Paulo')::date + 1
    group by coalesce(i.group_id, i.id)
  loop
    _d := (now() at time zone 'America/Sao_Paulo')::date - _i.due_date;
    if _d in (-1, 0, 1) then
      _msg := case _d
        when -1 then 'Oi, ' || _i.client_name || '! Passando para lembrar que amanhã vence ' || _i.description || ' (' || public.brl(_i.amount) || ').'
        when 0 then 'Oi, ' || _i.client_name || '! Hoje vence ' || _i.description || ' (' || public.brl(_i.amount) || ').'
        else 'Oi, ' || _i.client_name || '! Não identificamos o pagamento de ' || _i.description || ', que venceu ontem. Se já pagou, pode ignorar esta mensagem.'
      end || coalesce(E'\n\nPara pagar: ' || _i.payment_url, '');
      if public.notify_client_private(_i.client_id, 'billing_reminder', _msg, 'inv:' || _i.id || ':' || _d) then
        _sent := _sent + 1;
        insert into public.billing_events (invoice_id, kind, detail) values (_i.id, 'lembrete', 'D' || case when _d >= 0 then '+' else '' end || _d);
      end if;
    elsif _d = 3 and not exists (select 1 from public.billing_events e where e.invoice_id = _i.id and e.kind = 'alerta_gestor') then
      perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_late',
        'Cobrança atrasada há 3 dias', _i.client_name || ': ' || _i.description, '/financeiro/cobranca', _i.client_id);
      insert into public.billing_events (invoice_id, kind) values (_i.id, 'alerta_gestor');
      _alerts := _alerts + 1;
    elsif _d >= 7 and _i.all_pending then
      update public.invoices set status = 'vencido', updated_at = now() where id = any(_i.ids);
      perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'billing_stop',
        'Cobrança parou: falar com o cliente', _i.client_name || ' está com ' || _i.description || ' atrasado há 7 dias. A régua parou e agora é conversa humana.', '/financeiro/cobranca', _i.client_id);
      insert into public.billing_events (invoice_id, kind) values (_i.id, 'parou_d7');
      _stops := _stops + 1;
    end if;
  end loop;
  return jsonb_build_object('lembretes', _sent, 'alertas', _alerts, 'paradas', _stops);
end $function$;

-- CPF/CNPJ informado pelo link: limpa o erro "sem CPF" para a cobrança sair na hora.
create or replace function public.invoice_pay_set_document(_token uuid, _doc text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare _inv public.invoices; _d text := regexp_replace(coalesce(_doc, ''), '\D', '', 'g');
begin
  select * into _inv from public.invoices where pay_token = _token and status in ('pendente', 'vencido');
  if _inv.id is null then raise exception 'Fatura nao encontrada' using errcode = 'PF004'; end if;
  if not public.cpf_cnpj_valid(_d) then raise exception 'CPF ou CNPJ invalido' using errcode = 'PF006'; end if;
  update public.clients set document = _d, updated_at = now() where id = _inv.client_id and not public.cpf_cnpj_valid(document);
  update public.invoices set gateway_error = null, status = case when status = 'vencido' and group_id is null then 'pendente' else status end
  where (id = _inv.id or (_inv.group_id is not null and group_id = _inv.group_id)) and gateway_id is null;
  return true;
end $$;

-- Configurar cobrança salva multa e juros (limites: multa 2%, juros 1% ao mês).
create or replace function public.billing_settings_save(_data jsonb)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.billing_settings set
    gateway = coalesce(_data->>'gateway', gateway), gateway_env = coalesce(_data->>'gateway_env', gateway_env),
    auto_charge = coalesce((_data->>'auto_charge')::boolean, auto_charge),
    reminders_enabled = coalesce((_data->>'reminders_enabled')::boolean, reminders_enabled),
    monthly_generate = coalesce((_data->>'monthly_generate')::boolean, monthly_generate),
    merge_monthly = coalesce((_data->>'merge_monthly')::boolean, merge_monthly),
    sweep_enabled = coalesce((_data->>'sweep_enabled')::boolean, sweep_enabled),
    sweep_pix_key = case when _data ? 'sweep_pix_key' then nullif(trim(_data->>'sweep_pix_key'), '') else sweep_pix_key end,
    sweep_pix_key_type = case when _data ? 'sweep_pix_key_type' then nullif(_data->>'sweep_pix_key_type', '') else sweep_pix_key_type end,
    sweep_share_pct = coalesce((_data->>'sweep_share_pct')::numeric, sweep_share_pct),
    fine_enabled = coalesce((_data->>'fine_enabled')::boolean, fine_enabled),
    fine_pct = least(2, greatest(0, coalesce((_data->>'fine_pct')::numeric, fine_pct))),
    interest_pct = least(1, greatest(0, coalesce((_data->>'interest_pct')::numeric, interest_pct))),
    updated_at = now(), updated_by = (select auth.uid())
  where id;
  if coalesce((_data->>'merge_monthly')::boolean, false) then perform public.invoice_group_auto(); end if;
end;
$function$;
