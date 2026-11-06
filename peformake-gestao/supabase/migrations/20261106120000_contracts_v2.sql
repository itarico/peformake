-- Contratos v2: dados da empresa do cliente, aceite eletrônico no portal, PDF salvo e visão geral no Financeiro.

alter table public.clients
  add column if not exists legal_name text,
  add column if not exists address text;

alter table public.client_contract_docs
  add column if not exists sign_method text not null default 'assinafy',
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_name text,
  add column if not exists accepted_document text,
  add column if not exists accepted_ip text,
  add column if not exists accepted_user_agent text,
  add column if not exists body_hash text,
  add column if not exists pdf_path text;

alter table public.client_contract_docs drop constraint if exists client_contract_docs_sign_method_check;
alter table public.client_contract_docs add constraint client_contract_docs_sign_method_check check (sign_method in ('assinafy', 'aceite'));
alter table public.client_contract_docs drop constraint if exists client_contract_docs_status_check;
alter table public.client_contract_docs add constraint client_contract_docs_status_check
  check (status in ('rascunho', 'aguardando_dados', 'aguardando_aceite', 'enviado', 'assinado_cliente', 'assinado', 'cancelado', 'erro'));

-- Cadastro do cliente: aceita CPF/CNPJ, razão social, endereço e e-mail de cobrança (só quando enviados).
create or replace function public.client_save_legal(_client_id uuid, _data jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare _doc text := regexp_replace(coalesce(_data ->> 'document', ''), '[^0-9]', '', 'g');
        _billing text := nullif(lower(trim(coalesce(_data ->> 'billing_email', ''))), '');
begin
  perform public.clients_require_manager();
  if _doc <> '' and _doc !~ '^[0-9]{11}([0-9]{3})?$' then raise exception 'CPF ou CNPJ invalido' using errcode = 'PF006'; end if;
  if _billing is not null and _billing !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail invalido' using errcode = 'PF006'; end if;
  update public.clients set
    document = nullif(_doc, ''),
    legal_name = nullif(left(trim(coalesce(_data ->> 'legal_name', '')), 160), ''),
    address = nullif(left(trim(coalesce(_data ->> 'address', '')), 300), ''),
    billing_email = _billing
  where id = _client_id;
end $$;
grant execute on function public.client_save_legal(uuid, jsonb) to authenticated;

-- Texto do contrato usa a razão social e o endereço do cadastro quando não vierem de fora.
create or replace function public.contract_render(_body text, _client uuid, _signer_name text, _document text, _address text)
returns text language plpgsql stable security definer set search_path to '' as $$
declare
  _c record; _ct record; _s public.contract_settings; _total numeric; _items text; _out text := _body;
begin
  select * into _c from public.clients where id = _client;
  select * into _ct from public.client_contracts where client_id = _client;
  select * into _s from public.contract_settings where id;
  select sum(amount), string_agg(items, '; ') into _total, _items from public.client_monthly_amounts(_client);
  _out := replace(_out, '{{cliente_nome}}', coalesce(nullif(trim(_signer_name), ''), nullif(trim(_c.legal_name), ''), _c.name));
  _out := replace(_out, '{{cliente_documento}}', coalesce(nullif(_document, ''), _c.document, '(a preencher)'));
  _out := replace(_out, '{{cliente_endereco}}', coalesce(nullif(trim(_address), ''), nullif(trim(_c.address), ''), '(a preencher)'));
  _out := replace(_out, '{{empresa_responsavel}}', coalesce(_s.company_signer_name, 'seu representante legal'));
  _out := replace(_out, '{{servicos}}', coalesce(_items, '(serviços a definir)'));
  _out := replace(_out, '{{valor_mensal}}', public.brl(_total));
  _out := replace(_out, '{{dia_vencimento}}', coalesce(_ct.billing_day::text, '10'));
  _out := replace(_out, '{{meses}}', coalesce(_ct.months::text, '12'));
  _out := replace(_out, '{{inicio}}', to_char(coalesce(_ct.start_date, current_date), 'DD/MM/YYYY'));
  _out := replace(_out, '{{data}}', to_char(current_date, 'DD/MM/YYYY'));
  return _out;
end $$;

-- Novo contrato já usa os dados do cadastro (razão social, endereço) e o método escolhido.
create or replace function public.contract_create(_client uuid, _template uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _t public.contract_templates; _c public.clients; _id uuid;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _t from public.contract_templates where id = _template and is_active;
  select * into _c from public.clients where id = _client;
  if _t.id is null or _c.id is null then raise exception 'Nao encontrado' using errcode = 'PF004'; end if;
  update public.client_contract_docs set status = 'cancelado', updated_at = now()
    where client_id = _client and status in ('rascunho', 'aguardando_dados', 'aguardando_aceite', 'erro');
  insert into public.client_contract_docs (client_id, template_id, title, body, status, signer_name, signer_email, signer_document, signer_address, sign_method, created_by)
  values (_client, _t.id, left(_t.name || ' · ' || _c.name, 160), public.contract_render(_t.body, _client, null, null, null),
    case when _c.document is null then 'aguardando_dados' else 'rascunho' end,
    coalesce(nullif(trim(_c.legal_name), ''), _c.name), coalesce(_c.billing_email, _c.email), _c.document, _c.address,
    case when _c.client_type = 'one-off' then 'aceite' else 'assinafy' end, (select auth.uid()))
  returning id into _id;
  return _id;
end $$;

-- Editar o texto dentro do sistema, antes de enviar.
create or replace function public.contract_update_body(_id uuid, _body text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if length(coalesce(_body, '')) < 50 then raise exception 'Texto curto demais' using errcode = 'PF006'; end if;
  update public.client_contract_docs set body = _body, updated_at = now()
    where id = _id and status in ('rascunho', 'aguardando_dados', 'aguardando_aceite', 'erro');
  if not found then raise exception 'Contrato já enviado ou assinado: não dá para editar' using errcode = 'PF003'; end if;
end $$;

-- Escolher como o cliente assina: Assinafy ou aceite no portal.
create or replace function public.contract_set_method(_id uuid, _method text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _method not in ('assinafy', 'aceite') then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  update public.client_contract_docs set sign_method = _method,
    status = case when status = 'aguardando_aceite' and _method = 'assinafy' then 'rascunho' else status end, updated_at = now()
    where id = _id and status in ('rascunho', 'aguardando_dados', 'aguardando_aceite', 'erro');
  if not found then raise exception 'Contrato já enviado ou assinado' using errcode = 'PF003'; end if;
end $$;

-- Liberar para o cliente aceitar no portal.
create or replace function public.contract_release(_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.client_contract_docs set status = 'aguardando_aceite', sent_at = now(), updated_at = now()
    where id = _id and sign_method = 'aceite' and status in ('rascunho', 'erro') and signer_document is not null;
  if not found then raise exception 'Falta CPF/CNPJ ou o contrato não está pronto' using errcode = 'PF003'; end if;
end $$;

-- Aceite eletrônico no portal: confere o CPF/CNPJ, guarda nome, IP, navegador e o resumo (hash) do texto aceito.
create or replace function public.portal_contract_accept(_token text, _name text, _document text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  _client uuid := public.portal_resolve(_token);
  _doc text := regexp_replace(coalesce(_document, ''), '[^0-9]', '', 'g');
  _d public.client_contract_docs;
  _headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
begin
  if length(trim(coalesce(_name, ''))) < 3 then raise exception 'Escreva seu nome completo' using errcode = '22023'; end if;
  select * into _d from public.client_contract_docs where client_id = _client and status = 'aguardando_aceite' order by created_at desc limit 1 for update;
  if _d.id is null then raise exception 'Nenhum contrato esperando aceite' using errcode = 'PF004'; end if;
  if _doc <> coalesce(_d.signer_document, '') then raise exception 'CPF ou CNPJ não confere com o do contrato' using errcode = '22023'; end if;
  update public.client_contract_docs set status = 'assinado', signed_at = now(), accepted_at = now(),
    accepted_name = left(trim(_name), 160), accepted_document = _doc,
    accepted_ip = left(split_part(coalesce(_headers ->> 'x-forwarded-for', _headers ->> 'x-real-ip', ''), ',', 1), 64),
    accepted_user_agent = left(coalesce(_headers ->> 'user-agent', ''), 300),
    body_hash = encode(extensions.digest(_d.body, 'sha256'), 'hex'), updated_at = now()
  where id = _d.id;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role in ('admin', 'head_marketing')), 'contract_signed',
    'Contrato aceito: pode começar', (select name from public.clients where id = _client) || ' aceitou o contrato pelo portal.', '/clientes/' || _client, _client);
end $$;
grant execute on function public.portal_contract_accept(text, text, text) to anon, authenticated;

create or replace function public.portal_contract(_token text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare _client uuid := public.portal_resolve(_token); _d public.client_contract_docs;
begin
  select * into _d from public.client_contract_docs where client_id = _client and status <> 'cancelado' order by created_at desc limit 1;
  if _d.id is null then return null; end if;
  return jsonb_build_object('id', _d.id, 'title', _d.title, 'status', _d.status, 'body', _d.body, 'signer_name', _d.signer_name,
    'signer_email', _d.signer_email, 'has_document', _d.signer_document is not null, 'signed_at', _d.signed_at,
    'sign_method', _d.sign_method, 'accepted_at', _d.accepted_at, 'has_pdf', _d.pdf_path is not null);
end $$;

-- Visão geral para o Financeiro: um registro por cliente ativo.
create or replace function public.contracts_overview()
returns table (client_id uuid, client_name text, logo_path text, client_type text, contract_model text, start_date date, end_date date,
  months integer, billing_day integer, monthly numeric, has_document boolean, doc_id uuid, doc_status text, sign_method text,
  sent_at timestamptz, signed_at timestamptz, has_pdf boolean)
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  return query
  select c.id, trim(c.name), c.logo_path, c.client_type, ct.contract_model, ct.start_date, ct.end_date, ct.months, ct.billing_day,
    (select sum(m.amount) from public.client_monthly_amounts(c.id) m), c.document is not null,
    d.id, d.status, d.sign_method, d.sent_at, d.signed_at, d.pdf_path is not null
  from public.clients c
  left join public.client_contracts ct on ct.client_id = c.id
  left join lateral (select * from public.client_contract_docs x where x.client_id = c.id and x.status <> 'cancelado' order by x.created_at desc limit 1) d on true
  where c.is_active and not c.is_lost
  order by trim(c.name);
end $$;
grant execute on function public.contracts_overview() to authenticated;
grant execute on function public.contract_update_body(uuid, text) to authenticated;
grant execute on function public.contract_set_method(uuid, text) to authenticated;
grant execute on function public.contract_release(uuid) to authenticated;
