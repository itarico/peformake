-- Caixa e Cobrança reorganizados (12/11).
-- 1) Anexo (comprovante/nota) no lançamento do Caixa: bucket privado fin-docs, pasta = empresa.
-- 2) Chave Pix de cada empresa (Dados das empresas), usada na mensagem de cobrança quando não há link.
-- 3) "Cobrança enviada/copiada em DD/MM" na fatura, para não cobrar duas vezes sem saber.
-- 4) Enviar a cobrança pelo sistema (fila do WhatsApp) só com confirmação humana e só se a fila estiver ligada.

alter table public.fin_entries add column if not exists attachment_path text;
alter table public.company_profiles add column if not exists pix_key text;
alter table public.company_profiles add column if not exists pix_key_type text;
alter table public.invoices add column if not exists charge_sent_at timestamptz;
alter table public.invoices add column if not exists charge_sent_how text;
alter table public.invoices add column if not exists charge_sent_by uuid;

insert into storage.buckets (id, name, public) values ('fin-docs', 'fin-docs', false) on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policy where polname = 'fin_docs_select' and polrelid = 'storage.objects'::regclass) then
    create policy fin_docs_select on storage.objects for select to authenticated
      using (bucket_id = 'fin-docs' and public.can_finance((storage.foldername(name))[1]));
  end if;
  if not exists (select 1 from pg_policy where polname = 'fin_docs_insert' and polrelid = 'storage.objects'::regclass) then
    create policy fin_docs_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'fin-docs' and public.can_finance((storage.foldername(name))[1]));
  end if;
  if not exists (select 1 from pg_policy where polname = 'fin_docs_update' and polrelid = 'storage.objects'::regclass) then
    create policy fin_docs_update on storage.objects for update to authenticated
      using (bucket_id = 'fin-docs' and public.can_finance((storage.foldername(name))[1]));
  end if;
end $$;

-- Liga (ou troca) o anexo do lançamento.
create or replace function public.fin_entry_attach(_id uuid, _path text)
returns void language plpgsql security definer set search_path to '' as $$
declare _unit text;
begin
  select unit into _unit from public.fin_entries where id = _id;
  if _unit is null or not public.can_finance(_unit) then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _path is not null and split_part(_path, '/', 1) <> _unit then raise exception 'Arquivo fora da pasta da empresa' using errcode = 'PF006'; end if;
  update public.fin_entries set attachment_path = nullif(_path, ''), updated_at = now() where id = _id;
end $$;

-- Chave Pix da empresa (só admin). Vazio apaga.
create or replace function public.company_pix_save(_unit text, _key text, _type text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _unit not in ('peformake', 'ellcazo') then raise exception 'Empresa invalida' using errcode = 'PF006'; end if;
  insert into public.company_profiles (unit) values (_unit) on conflict (unit) do nothing;
  update public.company_profiles set pix_key = nullif(trim(coalesce(_key, '')), ''), pix_key_type = nullif(trim(coalesce(_type, '')), ''),
    updated_at = now(), updated_by = (select auth.uid())
  where unit = _unit;
end $$;

-- A fila do WhatsApp consegue enviar? (ligada nas notificações e sem aviso de "falta a chave" nas últimas 6 h). Nunca lê segredo.
create or replace function public.charge_system_ready()
returns boolean language plpgsql stable security definer set search_path to '' as $$
declare _on boolean; _last text;
begin
  select whatsapp_enabled into _on from public.notification_settings where id;
  if not coalesce(_on, false) then return false; end if;
  begin
    select r.content into _last from net._http_response r
    where r.created > now() - interval '6 hours' and (r.content like '{"skipped":"Falta a chave do WhatsApp%' or r.content like '{"sent":%')
    order by r.created desc limit 1;
  exception when others then _last := null;
  end;
  return not coalesce(_last like '{"skipped"%', false);
end $$;

-- Tudo que o pop-up de cobrança precisa: contato de cobrança do cliente, Pix das empresas e se o envio pelo sistema existe.
create or replace function public.invoice_charge_info(_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare _c public.clients; _ct public.client_contacts;
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _c from public.clients where id = _client;
  select * into _ct from public.client_contacts where client_id = _client and phone is not null and phone <> ''
    order by gets_billing desc, created_at limit 1;
  return jsonb_build_object(
    'client', trim(_c.name),
    'contact', coalesce(nullif(trim(_ct.name), ''), trim(_c.name)),
    'phone', coalesce(nullif(regexp_replace(coalesce(_ct.phone, ''), '[^0-9]', '', 'g'), ''), nullif(regexp_replace(coalesce(_c.phone, ''), '[^0-9]', '', 'g'), '')),
    'pix', coalesce((select jsonb_object_agg(p.unit, jsonb_build_object('key', p.pix_key, 'type', p.pix_key_type,
        'name', coalesce(p.trade_name, p.legal_name))) from public.company_profiles p where p.pix_key is not null), '{}'::jsonb),
    'system', public.charge_system_ready());
end $$;

-- Marca nas faturas que a cobrança foi enviada (whatsapp = abriu o WhatsApp, copiado, sistema).
create or replace function public.invoice_charge_mark(_ids uuid[], _how text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _how not in ('whatsapp', 'copiado', 'sistema') then raise exception 'Forma invalida' using errcode = 'PF006'; end if;
  update public.invoices set charge_sent_at = now(), charge_sent_how = _how, charge_sent_by = (select auth.uid())
  where id = any(_ids);
end $$;

-- Envio pelo sistema: a pessoa já confirmou "Enviar para Fulano?" na tela. Vai para a fila normal (horário de silêncio e limite diário valem).
create or replace function public.invoice_charge_send(_ids uuid[], _phone text, _message text)
returns void language plpgsql security definer set search_path to '' as $$
declare _client uuid; _to text := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if not public.charge_system_ready() then raise exception 'O envio pelo sistema esta desligado' using errcode = 'PF006'; end if;
  if length(_to) < 10 then raise exception 'Numero de WhatsApp invalido' using errcode = 'PF006'; end if;
  if length(trim(coalesce(_message, ''))) < 10 then raise exception 'Mensagem vazia' using errcode = 'PF006'; end if;
  select distinct client_id into _client from public.invoices where id = any(_ids) limit 1;
  if _client is null then raise exception 'Fatura nao encontrada' using errcode = 'PF004'; end if;
  if length(_to) <= 11 then _to := '55' || _to; end if;
  insert into public.notification_outbox (kind, client_id, to_phone, message, dedupe_key)
  values ('cobranca_manual', _client, _to, left(_message, 2000),
    'cobranca:' || md5(array_to_string(_ids, ',') || _message) || ':' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'))
  on conflict (dedupe_key) do nothing;
  perform public.invoice_charge_mark(_ids, 'sistema');
end $$;

revoke all on function public.fin_entry_attach(uuid, text) from public, anon;
revoke all on function public.company_pix_save(text, text, text) from public, anon;
revoke all on function public.charge_system_ready() from public, anon;
revoke all on function public.invoice_charge_info(uuid) from public, anon;
revoke all on function public.invoice_charge_mark(uuid[], text) from public, anon;
revoke all on function public.invoice_charge_send(uuid[], text, text) from public, anon;
grant execute on function public.fin_entry_attach(uuid, text) to authenticated;
grant execute on function public.company_pix_save(text, text, text) to authenticated;
grant execute on function public.charge_system_ready() to authenticated;
grant execute on function public.invoice_charge_info(uuid) to authenticated;
grant execute on function public.invoice_charge_mark(uuid[], text) to authenticated;
grant execute on function public.invoice_charge_send(uuid[], text, text) to authenticated;
