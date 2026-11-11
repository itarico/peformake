-- Dados das empresas (Peformake e Ellcazo), contrato por blocos no formato do contrato de referência
-- e contrato do membro da equipe com assinatura pela Assinafy.
-- Nada aqui envia coisa alguma: só monta textos e guarda dados. O envio é sempre um clique do administrador.

-- 1) Dados das empresas: documentos (bucket privado) e cidade de assinatura.
alter table public.company_profiles
  add column if not exists cnpj_card_path text,
  add column if not exists social_contract_path text,
  add column if not exists sign_city text not null default 'Recife/PE';

-- 2) Dados do membro para o contrato.
alter table public.staff_members
  add column if not exists document text,
  add column if not exists address text;

-- 3) Buckets privados (só administrador lê e grava).
insert into storage.buckets (id, name, public) values ('company-docs', 'company-docs', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('staff-docs', 'staff-docs', false) on conflict (id) do nothing;

create policy company_docs_admin_select on storage.objects for select to authenticated
  using (bucket_id in ('company-docs', 'staff-docs') and public.has_role('admin'));
create policy company_docs_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('company-docs', 'staff-docs') and public.has_role('admin'));

-- 4) Salvar dados da empresa: só mexe no que veio (antes apagava o que não era enviado).
create or replace function public.company_profile_save(_unit text, _data jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare
  _doc text := regexp_replace(coalesce(_data ->> 'document', ''), '[^0-9]', '', 'g');
  _rep text := regexp_replace(coalesce(_data ->> 'representative_document', ''), '[^0-9]', '', 'g');
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _unit not in ('peformake', 'ellcazo') then raise exception 'Empresa invalida' using errcode = 'PF006'; end if;
  if _data ? 'document' and _doc <> '' and _doc !~ '^[0-9]{14}$' then raise exception 'CNPJ invalido' using errcode = 'PF006'; end if;
  if _data ? 'representative_document' and _rep <> '' and _rep !~ '^[0-9]{11}$' then raise exception 'CPF do representante invalido' using errcode = 'PF006'; end if;
  if _data ? 'email' and coalesce(_data ->> 'email', '') <> '' and (_data ->> 'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail invalido' using errcode = 'PF006'; end if;
  insert into public.company_profiles (unit) values (_unit) on conflict (unit) do nothing;
  update public.company_profiles set
    legal_name = case when _data ? 'legal_name' then nullif(trim(_data ->> 'legal_name'), '') else legal_name end,
    trade_name = case when _data ? 'trade_name' then nullif(trim(_data ->> 'trade_name'), '') else trade_name end,
    document = case when _data ? 'document' then nullif(_doc, '') else document end,
    address = case when _data ? 'address' then nullif(trim(_data ->> 'address'), '') else address end,
    representative_name = case when _data ? 'representative_name' then nullif(trim(_data ->> 'representative_name'), '') else representative_name end,
    representative_document = case when _data ? 'representative_document' then nullif(_rep, '') else representative_document end,
    email = case when _data ? 'email' then nullif(lower(trim(_data ->> 'email')), '') else email end,
    phone = case when _data ? 'phone' then nullif(regexp_replace(coalesce(_data ->> 'phone', ''), '[^0-9]', '', 'g'), '') else phone end,
    cnpj_card_path = case when _data ? 'cnpj_card_path' then nullif(_data ->> 'cnpj_card_path', '') else cnpj_card_path end,
    social_contract_path = case when _data ? 'social_contract_path' then nullif(_data ->> 'social_contract_path', '') else social_contract_path end,
    sign_city = case when _data ? 'sign_city' then coalesce(nullif(trim(_data ->> 'sign_city'), ''), 'Recife/PE') else sign_city end,
    updated_at = now(), updated_by = (select auth.uid())
  where unit = _unit;
end $$;

-- O que falta para a empresa entrar num contrato (vazio = completo).
create or replace function public.company_profile_missing(_unit text)
returns text[] language sql stable security definer set search_path to '' as $$
  select coalesce(array_remove(array[
    case when p.legal_name is null then 'razão social' end,
    case when p.document is null then 'CNPJ' end,
    case when p.address is null then 'endereço' end,
    case when p.representative_name is null then 'representante' end,
    case when p.representative_document is null then 'CPF do representante' end
  ], null), array['razão social', 'CNPJ', 'endereço', 'representante', 'CPF do representante'])
  from (select 1) x left join public.company_profiles p on p.unit = _unit;
$$;

-- 5) Ajudantes de texto.
create or replace function public.doc_fmt(_d text)
returns text language sql immutable set search_path to '' as $$
  select case
    when regexp_replace(coalesce(_d, ''), '\D', '', 'g') ~ '^[0-9]{14}$' then regexp_replace(regexp_replace(_d, '\D', '', 'g'), '^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$', '\1.\2.\3/\4-\5')
    when regexp_replace(coalesce(_d, ''), '\D', '', 'g') ~ '^[0-9]{11}$' then regexp_replace(regexp_replace(_d, '\D', '', 'g'), '^(\d{3})(\d{3})(\d{3})(\d{2})$', '\1.\2.\3-\4')
    else coalesce(_d, '') end;
$$;

create or replace function public.num_extenso(_n int)
returns text language sql immutable set search_path to '' as $$
  select case
    when _n is null then ''
    when _n between 0 and 19 then (array['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'])[_n + 1]
    when _n between 20 and 99 then (array['vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'])[_n / 10 - 1]
      || case when _n % 10 > 0 then ' e ' || (array['um','dois','três','quatro','cinco','seis','sete','oito','nove'])[_n % 10] else '' end
    else _n::text end;
$$;

create or replace function public.date_extenso(_d date)
returns text language sql immutable set search_path to '' as $$
  select extract(day from _d)::int || ' de ' || (array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'])[extract(month from _d)::int]
    || ' de ' || extract(year from _d)::int;
$$;

-- Troca "CLÁUSULA #" por 1ª, 2ª... e "#." pelo número da cláusula atual.
create or replace function public.contract_number(_body text)
returns text language plpgsql immutable set search_path to '' as $$
declare _n int := 0; _line text; _out text[] := '{}';
begin
  foreach _line in array string_to_array(_body, E'\n') loop
    if _line ~ '^CLÁUSULA #' then _n := _n + 1; _line := regexp_replace(_line, '^CLÁUSULA #', 'CLÁUSULA ' || _n || 'ª'); end if;
    if _line ~ '^#\.' then _line := regexp_replace(_line, '^#\.', _n || '.'); end if;
    _out := _out || _line;
  end loop;
  return regexp_replace(array_to_string(_out, E'\n'), E'\n{3,}', E'\n\n', 'g');
end $$;

-- 6) Textos padrão por serviço (editáveis). Chave: 'area:<grupo>', 'bloco:<nome>' ou o id do serviço (texto próprio).
create table if not exists public.contract_service_texts (
  key text primary key,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.contract_service_texts enable row level security;
create policy contract_service_texts_read on public.contract_service_texts for select to authenticated using (public.has_role('admin'));

insert into public.contract_service_texts (key, title, body) values
('area:trafego', 'DA GESTÃO DE TRÁFEGO PAGO',
'#.1. A CONTRATADA será responsável pela criação, configuração, acompanhamento e otimização das campanhas de anúncios pagos da CONTRATANTE nas plataformas combinadas entre as partes (como Meta: Instagram e Facebook), utilizando prioritariamente os materiais produzidos neste contrato.

#.2. O valor investido em anúncios (verba de mídia) não está incluído no valor deste contrato e será pago pela CONTRATANTE diretamente às plataformas, por meio de sua própria forma de pagamento. O valor da verba será definido pela CONTRATANTE, com orientação da CONTRATADA.

#.3. A CONTRATADA apresentará à CONTRATANTE relatórios com os principais resultados das campanhas ({{entregas}}).

#.4. A CONTRATANTE deverá fornecer os acessos necessários às contas de anúncios e às páginas da empresa. A CONTRATADA não garante número mínimo de vendas ou de contatos, por se tratar de obrigação de meio, e não de resultado.'),
('area:social', 'DA GESTÃO DE REDES SOCIAIS',
'#.1. A CONTRATADA fará a gestão das redes sociais da CONTRATANTE, com planejamento mensal de conteúdo, criação e acompanhamento das publicações ({{entregas}}).

#.2. O planejamento do mês será enviado para aprovação da CONTRATANTE, que terá até 2 (dois) dias úteis para aprovar ou pedir ajustes. Sem resposta nesse prazo, o planejamento será considerado aprovado.

#.3. Cada publicação terá direito a 1 (uma) rodada de ajustes. Pedidos fora do planejamento aprovado serão tratados como serviços avulsos.

#.4. A CONTRATANTE fornecerá as informações, imagens e acessos necessários. Seguidores, alcance e engajamento dependem das plataformas e do público, por se tratar de obrigação de meio, e não de resultado.'),
('area:design', 'DA CRIAÇÃO DE PEÇAS GRÁFICAS',
'#.1. A CONTRATADA criará as peças gráficas da CONTRATANTE ({{entregas}}), entregues em formato digital, prontas para uso.

#.2. As peças serão entregues em até 3 (três) dias úteis após a aprovação do pedido (briefing), com direito a até 2 (duas) rodadas de ajustes por peça, solicitadas em até 3 (três) dias úteis após a entrega.

#.3. Peças não pedidas no mês não se acumulam para os meses seguintes.'),
('area:captacao', 'DA CAPTAÇÃO AUDIOVISUAL ({{servico}})',
'#.1. A CONTRATADA realizará as captações nas instalações da CONTRATANTE ou em local combinado entre as partes ({{entregas}}).

#.2. Os vídeos serão entregues editados e prontos para publicação, em formato para redes sociais, em até 3 (três) dias úteis após cada captação, por meio digital, com direito a 1 (uma) rodada de ajustes por vídeo, solicitada em até 3 (três) dias úteis após a entrega.

#.3. Os dias e horários das captações serão definidos em comum acordo entre as partes. O cancelamento pela CONTRATANTE com menos de 24 (vinte e quatro) horas de antecedência, ou a indisponibilidade no horário agendado, implicará o consumo da captação.

#.4. As captações não utilizadas no período não se acumulam para os períodos seguintes. Captações canceladas pela CONTRATADA serão repostas em data a combinar.

#.5. A CONTRATADA fornecerá os equipamentos necessários à captação e a direção de conteúdo das gravações.'),
('area:audiovisual', 'DA PRODUÇÃO AUDIOVISUAL ({{servico}})',
'#.1. A CONTRATADA fará a produção e a edição dos vídeos contratados ({{entregas}}), entregues prontos para uso, por meio digital.

#.2. Cada vídeo terá direito a 1 (uma) rodada de ajustes, solicitada em até 3 (três) dias úteis após a entrega.

#.3. Quando o material for enviado pela CONTRATANTE, o prazo de entrega conta a partir do recebimento completo dos arquivos.'),
('area:consultoria', 'DA CONSULTORIA ({{servico}})',
'#.1. A CONTRATADA prestará consultoria de marketing à CONTRATANTE ({{entregas}}), com análise, orientação e plano de ação.

#.2. A execução das ações recomendadas cabe à CONTRATANTE, salvo quando contratada à parte. Por se tratar de obrigação de meio, a CONTRATADA não garante resultado específico.'),
('area:sistemas', 'DO DESENVOLVIMENTO E DA MANUTENÇÃO ({{servico}})',
'#.1. A CONTRATADA prestará o serviço de {{servico}} ({{entregas}}), conforme o escopo combinado entre as partes.

#.2. Domínios, hospedagens, licenças e ferramentas de terceiros são pagos pela CONTRATANTE, salvo acordo por escrito.

#.3. Mudanças fora do escopo combinado serão orçadas e cobradas como serviços avulsos.'),
('area:comercial', 'DO CRM E DO APOIO COMERCIAL ({{servico}})',
'#.1. A CONTRATADA fará a configuração e o acompanhamento do CRM da CONTRATANTE ({{entregas}}).

#.2. Licenças e ferramentas de terceiros são pagas pela CONTRATANTE, salvo acordo por escrito. O atendimento e o fechamento das vendas cabem à CONTRATANTE.'),
('area:outro', 'DO SERVIÇO DE {{servico}}',
'#.1. A CONTRATADA prestará o serviço de {{servico}} ({{entregas}}), conforme combinado entre as partes.'),
('bloco:avulsos', 'DOS SERVIÇOS AVULSOS',
'#.1. Serviços pedidos pela CONTRATANTE fora do que está previsto neste contrato (como a edição de vídeos gravados pela própria CONTRATANTE) serão cobrados à parte, pelo valor unitário combinado antes da execução.

#.2. Os serviços avulsos realizados em cada mês serão somados e cobrados junto com a mensalidade seguinte.')
on conflict (key) do nothing;

create or replace function public.contract_service_text_save(_key text, _title text, _body text, _active boolean)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if _key !~ '^(area|bloco):[a-z]+$' and _key !~ '^[0-9a-f-]{36}$' then raise exception 'Chave invalida' using errcode = 'PF006'; end if;
  if _active and (length(trim(coalesce(_title, ''))) < 3 or length(trim(coalesce(_body, ''))) < 20) then raise exception 'Escreva o título e o texto' using errcode = 'PF006'; end if;
  insert into public.contract_service_texts (key, title, body, is_active, updated_by)
  values (_key, coalesce(nullif(trim(_title), ''), '-'), coalesce(nullif(trim(_body), ''), '-'), _active, (select auth.uid()))
  on conflict (key) do update set title = case when _active then excluded.title else contract_service_texts.title end,
    body = case when _active then excluded.body else contract_service_texts.body end,
    is_active = _active, updated_at = now(), updated_by = excluded.updated_by;
end $$;

-- Grupo do texto padrão de um serviço.
create or replace function public.contract_service_group(_area text, _delivery_unit text)
returns text language sql immutable set search_path to '' as $$
  select case
    when _area = 'audiovisual' and coalesce(_delivery_unit, '') ~* '(capta|diária|visita|evento|gravação|transmiss)' then 'captacao'
    when _area in ('trafego', 'social', 'design', 'audiovisual', 'consultoria', 'sistemas', 'comercial') then _area
    else 'outro' end;
$$;

-- 7) Montagem do contrato do cliente por blocos (partes, objeto, uma cláusula por serviço, valor, prazo...).
create or replace function public.contract_compose(_template uuid, _client uuid, _signer_name text, _document text, _address text)
returns text language plpgsql stable security definer set search_path to '' as $$
declare
  _t public.contract_templates; _c public.clients; _ct public.client_contracts; _p public.company_profiles;
  _unit text; _kind text; _body text; _doc text; _name text; _addr text; _email text; _rep text;
  _items text := ''; _clauses text := ''; _subs text[] := '{}'; _n int := 1; _letter int := 0; _total numeric := 0;
  r record; _txt public.contract_service_texts; _ent text; _cl text; _ttl text;
begin
  select * into _t from public.contract_templates where id = _template;
  select * into _c from public.clients where id = _client;
  select * into _ct from public.client_contracts where client_id = _client;
  if _t.id is null or _c.id is null then return null; end if;
  _unit := case when _t.area = 'audiovisual' then 'ellcazo' else 'peformake' end;
  select * into _p from public.company_profiles where unit = _unit;
  _kind := case when _c.client_type = 'one-off' or _ct.contract_model = 'One-off' then 'avulso' when _ct.contract_model = 'TCV' then 'tcv' else 'fixo' end;
  _body := _t.body;
  -- Modelo antigo (sem blocos): segue como era.
  if position('{{clausulas_servicos}}' in _body) = 0 then
    _body := public.contract_render(_body, _client, _signer_name, _document, _address);
    _body := replace(_body, '{{contratada_nome}}', coalesce(_p.legal_name, ''));
    _body := replace(_body, '{{contratada_documento}}', public.doc_fmt(_p.document));
    _body := replace(_body, '{{contratada_endereco}}', coalesce(_p.address, ''));
    _body := replace(_body, '{{contratada_representante}}', coalesce(_p.representative_name, ''));
    return _body;
  end if;

  _doc := regexp_replace(coalesce(nullif(_document, ''), _c.document, ''), '\D', '', 'g');
  _name := coalesce(nullif(trim(_signer_name), ''), nullif(trim(_c.legal_name), ''), _c.name);
  _addr := coalesce(nullif(trim(_address), ''), nullif(trim(_c.address), ''), '(endereço a preencher)');
  _email := coalesce((select x.email from public.client_contacts x where x.client_id = _client and x.gets_contract and x.email is not null order by x.created_at limit 1), _c.billing_email, _c.email);
  _rep := (select x.name from public.client_contacts x where x.client_id = _client and x.gets_contract and length(trim(coalesce(x.name, ''))) > 2 order by x.created_at limit 1);

  -- Serviços desta empresa: uma cláusula cada.
  for r in
    select s.id, s.name, s.area, s.delivery_unit, coalesce(cs.deliver_qty, s.delivery_qty) as qty, coalesce(cs.deliver_format, s.delivery_format) as fmt, s.unit as sunit,
      greatest(0, coalesce(p.price, 0) * coalesce(cs.quantity, 1) - case when p.discount_type in ('percent', 'percentage') then coalesce(p.price, 0) * coalesce(cs.quantity, 1) * coalesce(p.discount_value, 0) / 100 else coalesce(p.discount_value, 0) end) as net
    from public.client_services cs
    join public.services s on s.id = cs.service_id
    left join public.client_service_prices p on p.client_service_id = cs.id
    where cs.client_id = _client and cs.is_active and (case when s.area = 'audiovisual' then 'ellcazo' else 'peformake' end) = _unit
    order by case s.area when 'audiovisual' then 1 when 'trafego' then 2 when 'social' then 3 when 'design' then 4 else 5 end, s.name
  loop
    _n := _n + 1; _total := _total + r.net;
    select * into _txt from public.contract_service_texts where key = r.id::text and is_active;
    if _txt.key is null then select * into _txt from public.contract_service_texts where key = 'area:' || public.contract_service_group(r.area, r.delivery_unit); end if;
    if _txt.key is null then select * into _txt from public.contract_service_texts where key = 'area:outro'; end if;
    _ent := case when r.qty is not null and r.qty > 0 then 'até ' || trim(to_char(r.qty, 'FM999990')) || ' ' || coalesce(nullif(r.delivery_unit, ''), 'entrega') || ' por ' || case when r.sunit in ('unidade', 'projeto', 'diária', 'hora') then 'pedido' else 'mês' end
                 || coalesce(', ' || nullif(r.fmt, ''), '')
               else coalesce(nullif(r.fmt, ''), 'conforme o combinado entre as partes') end;
    _ttl := replace(_txt.title, '{{servico}}', upper(r.name));
    _cl := replace(replace(_txt.body, '{{servico}}', r.name), '{{entregas}}', _ent);
    _letter := _letter + 1;
    _items := _items || E'\n' || chr(96 + least(_letter, 26)) || ') ' || r.name || ', conforme Cláusula ' || _n || 'ª;';
    _clauses := _clauses || 'CLÁUSULA # — ' || _ttl || E'\n' || _cl || E'\n\n';
    if r.area = 'audiovisual' then _subs := _subs || 'produção audiovisual'; elsif r.area = 'trafego' then _subs := _subs || 'gestão de tráfego pago';
    elsif r.area = 'social' then _subs := _subs || 'gestão de redes sociais'; elsif r.area = 'design' then _subs := _subs || 'design'; else _subs := _subs || lower(r.name); end if;
  end loop;
  if _n = 1 then _items := E'\n' || 'a) os serviços combinados entre as partes.'; end if;
  if _kind <> 'avulso' then
    select * into _txt from public.contract_service_texts where key = 'bloco:avulsos' and is_active;
    if _txt.key is not null then
      _n := _n + 1; _letter := _letter + 1;
      _items := _items || E'\n' || chr(96 + least(_letter, 26)) || ') serviços avulsos pedidos pela CONTRATANTE, conforme Cláusula ' || _n || 'ª.';
      _clauses := _clauses || 'CLÁUSULA # — ' || _txt.title || E'\n' || _txt.body || E'\n\n';
    end if;
  end if;

  _body := replace(_body, '{{subtitulo}}', coalesce((select upper(left(z, 1)) || substr(z, 2) from (select string_agg(x, ' e ') z from (select distinct x from unnest(_subs) x) y) w), ''));
  _body := replace(_body, '{{contratada_qualificacao}}',
    coalesce(_p.legal_name, '(razão social da contratada)')
    || case when _p.trade_name is not null and lower(_p.trade_name) <> lower(coalesce(_p.legal_name, '')) then ', nome fantasia ' || _p.trade_name else '' end
    || ', inscrita no CNPJ sob o nº ' || coalesce(public.doc_fmt(_p.document), '(a preencher)')
    || ', com sede em ' || coalesce(_p.address, '(a preencher)')
    || ', neste ato representada por ' || coalesce(_p.representative_name, '(a preencher)')
    || coalesce(', inscrito(a) no CPF sob o nº ' || public.doc_fmt(_p.representative_document), ''));
  _body := replace(_body, '{{contratante_qualificacao}}',
    _name || case when length(_doc) = 14 then ', pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ' || public.doc_fmt(_doc) || ', com sede em ' || _addr
                  when length(_doc) = 11 then ', pessoa física, inscrita no CPF sob o nº ' || public.doc_fmt(_doc) || ', residente em ' || _addr
                  else ', CPF/CNPJ (a preencher), com endereço em ' || _addr end
    || coalesce(', e-mail ' || _email, '')
    || case when length(_doc) = 14 and _rep is not null then ', neste ato representada por ' || _rep else '' end);
  _body := replace(_body, '{{objeto_itens}}', ltrim(_items, E'\n'));
  _body := replace(_body, '{{clausulas_servicos}}', rtrim(_clauses, E'\n'));
  _body := replace(_body, '{{valor_texto}}', case
    when _kind = 'fixo' then 'Pelos serviços previstos neste contrato, a CONTRATANTE pagará à CONTRATADA o valor mensal de ' || public.brl(_total)
      || ', com vencimento todo dia ' || lpad(coalesce(_ct.billing_day, 10)::text, 2, '0') || ' (' || public.num_extenso(coalesce(_ct.billing_day, 10)) || '), por PIX ou boleto.'
    else 'Pelos serviços previstos neste contrato, a CONTRATANTE pagará à CONTRATADA o valor total de ' || public.brl(_total)
      || coalesce(', com vencimento no dia ' || lpad(_ct.billing_day::text, 2, '0') || ' (' || public.num_extenso(_ct.billing_day) || ')', ', na data combinada entre as partes') || ', por PIX ou boleto.' end);
  _body := replace(_body, '{{prazo_texto}}', case
    when _kind = 'avulso' then 'Este contrato vale até a entrega dos serviços contratados, a contar da data de sua assinatura.'
    else 'Este contrato terá duração de ' || coalesce(_ct.months, 12) || ' (' || public.num_extenso(coalesce(_ct.months, 12)) || ') meses, a contar de '
      || to_char(coalesce(_ct.start_date, current_date), 'DD/MM/YYYY') || ', podendo ser renovado por acordo entre as partes.' end);
  _body := replace(_body, '{{local_data}}', coalesce(_p.sign_city, 'Recife/PE') || ', ' || public.date_extenso(current_date) || '.');
  _body := replace(_body, '{{contratada_razao}}', coalesce(_p.legal_name, ''));
  _body := replace(_body, '{{contratada_documento}}', 'CNPJ ' || public.doc_fmt(_p.document));
  _body := replace(_body, '{{contratante_nome}}', _name);
  _body := replace(_body, '{{contratante_documento}}', case when length(_doc) = 14 then 'CNPJ ' when length(_doc) = 11 then 'CPF ' else 'CPF/CNPJ ' end || coalesce(nullif(public.doc_fmt(_doc), ''), '(a preencher)'));
  return public.contract_number(_body);
end $$;

-- contract_create e portal_contract_data passam a usar a montagem por blocos.
create or replace function public.contract_create(_client uuid, _template uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _t public.contract_templates; _c public.clients; _id uuid; _unit text; _email text; _body text; _miss text[];
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _t from public.contract_templates where id = _template and is_active;
  select * into _c from public.clients where id = _client;
  if _t.id is null or _c.id is null or coalesce(_t.area, '') like 'membro%' then raise exception 'Nao encontrado' using errcode = 'PF004'; end if;
  _unit := case when _t.area = 'audiovisual' then 'ellcazo' else 'peformake' end;
  _email := coalesce((select x.email from public.client_contacts x where x.client_id = _client and x.gets_contract and x.email is not null order by x.created_at limit 1), _c.billing_email, _c.email);
  if _c.document is null or _c.legal_name is null or _c.address is null or _email is null then
    raise exception 'Faltam dados do contratante (CPF/CNPJ, razão social, endereço e e-mail)' using errcode = 'PF010';
  end if;
  _miss := public.company_profile_missing(_unit);
  if cardinality(_miss) > 0 then
    raise exception 'Faltam dados da contratada: complete os dados da % (%)', case when _unit = 'ellcazo' then 'Ellcazo' else 'Peformake' end, array_to_string(_miss, ', ') using errcode = 'PF011';
  end if;
  update public.client_contract_docs set status = 'cancelado', updated_at = now()
    where client_id = _client and status in ('rascunho', 'aguardando_dados', 'aguardando_aceite', 'erro');
  _body := public.contract_compose(_t.id, _client, null, null, null);
  insert into public.client_contract_docs (client_id, template_id, title, body, status, signer_name, signer_email, signer_document, signer_address, sign_method, created_by)
  values (_client, _t.id, left(_t.name || ' · ' || _c.name, 160), _body, 'rascunho',
    _c.legal_name, _email, _c.document, _c.address,
    case when _c.client_type = 'one-off' then 'aceite' else 'assinafy' end, (select auth.uid()))
  returning id into _id;
  return _id;
end $$;

create or replace function public.portal_contract_data(_token text, _name text, _document text, _email text, _address text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  _client uuid := public.portal_resolve(_token);
  _doc text := regexp_replace(coalesce(_document, ''), '[^0-9]', '', 'g');
  _d public.client_contract_docs;
begin
  if _doc !~ '^[0-9]{11}([0-9]{3})?$' then raise exception 'CPF ou CNPJ invalido' using errcode = '22023'; end if;
  if coalesce(_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail invalido' using errcode = '22023'; end if;
  if length(trim(coalesce(_name, ''))) < 3 or length(trim(coalesce(_address, ''))) < 8 then raise exception 'Preencha nome e endereco' using errcode = '22023'; end if;
  select * into _d from public.client_contract_docs where client_id = _client and status in ('rascunho', 'aguardando_dados') order by created_at desc limit 1 for update;
  if _d.id is null then raise exception 'Nenhum contrato esperando dados' using errcode = 'PF004'; end if;
  update public.clients set document = _doc, billing_email = lower(trim(_email)) where id = _client;
  update public.client_contract_docs set signer_name = left(trim(_name), 120), signer_email = lower(trim(_email)), signer_document = _doc,
    signer_address = left(trim(_address), 300), status = 'rascunho',
    body = coalesce(public.contract_compose(_d.template_id, _client, _name, _doc, _address), body), updated_at = now()
  where id = _d.id;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'contract_data',
    'Cliente preencheu os dados do contrato', (select name from public.clients where id = _client) || ': pronto para enviar para assinatura.', '/clientes/' || _client, _client);
end $$;

-- 8) Modelos novos no formato do contrato de referência.
do $$
declare
  _common text := E'Pelo presente instrumento particular, as partes abaixo qualificadas:\n\nCONTRATADA: {{contratada_qualificacao}};\n\nCONTRATANTE: {{contratante_qualificacao}};\n\ntêm entre si justo e acordado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições seguintes:\n\n'
    || E'CLÁUSULA # — DO OBJETO\n#.1. O presente contrato tem por objeto a prestação, pela CONTRATADA à CONTRATANTE, dos seguintes serviços:\n{{objeto_itens}}\n\n'
    || E'{{clausulas_servicos}}\n\n'
    || E'CLÁUSULA # — DO VALOR E DA FORMA DE PAGAMENTO\n#.1. {{valor_texto}}\n\n#.2. O atraso no pagamento implicará multa de 2% (dois por cento) sobre o valor devido, juros de 1% (um por cento) ao mês e, após 10 (dez) dias de atraso, a suspensão dos serviços até a regularização.\n\n'
    || E'CLÁUSULA # — DO PRAZO E DA RESCISÃO\n#.1. {{prazo_texto}}\n\n#.2. Qualquer das partes poderá rescindir este contrato mediante aviso prévio por escrito de 30 (trinta) dias, sendo devidos os valores dos serviços prestados até a data da rescisão.\n\n#.3. O descumprimento de qualquer cláusula permite à parte prejudicada rescindir o contrato de imediato, sem prejuízo das perdas e danos cabíveis.\n\n'
    || E'CLÁUSULA # — DOS DIREITOS DE USO E DE IMAGEM\n#.1. Os materiais entregues poderão ser utilizados livremente pela CONTRATANTE em seus canais digitais, anúncios e materiais institucionais, por prazo indeterminado.\n\n#.2. A CONTRATANTE autoriza a CONTRATADA a utilizar os materiais e os bastidores das produções em seu portfólio e em suas redes sociais, para fins de divulgação do próprio trabalho.\n\n#.3. A CONTRATANTE declara que obterá, de seus sócios, colaboradores e demais pessoas que aparecerem nos materiais, a autorização para uso de imagem e voz necessária aos fins deste contrato.\n\n#.4. Os arquivos brutos (material não editado) permanecem sob a guarda da CONTRATADA, que não é obrigada a entregá-los, salvo acordo à parte.\n\n'
    || E'CLÁUSULA # — DAS DISPOSIÇÕES GERAIS\n#.1. Este contrato não cria vínculo empregatício, societário ou de representação entre as partes, cada uma respondendo por seus próprios encargos trabalhistas, fiscais e previdenciários.\n\n#.2. Qualquer alteração deste contrato somente terá validade se feita por escrito e assinada por ambas as partes.\n\n#.3. As partes tratarão os dados pessoais recebidos apenas para cumprir este contrato, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).\n\n'
    || E'CLÁUSULA # — DO FORO\n#.1. Fica eleito o foro da Comarca de Recife/PE para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.\n\n'
    || E'E, por estarem assim justas e contratadas, as partes assinam o presente instrumento eletronicamente, em igual teor e forma.\n\n{{local_data}}\n\n\n_____________________________________________\nCONTRATADA\n{{contratada_razao}}\n{{contratada_documento}}\n\n\n_____________________________________________\nCONTRATANTE\n{{contratante_nome}}\n{{contratante_documento}}';
begin
  update public.contract_templates set body = E'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING\n{{subtitulo}}\n\n' || _common, updated_at = now()
    where id = '43b4cd42-323a-4b46-bea0-3391a83cfe4f' and position('{{clausulas_servicos}}' in body) = 0;
  update public.contract_templates set body = E'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PRODUÇÃO AUDIOVISUAL\n{{subtitulo}}\n\n' || _common, updated_at = now()
    where id = '4d3e6d1a-25f7-4a0d-9fbd-8777f9c9a446' and position('{{clausulas_servicos}}' in body) = 0;
end $$;

-- 9) Contrato do membro da equipe: um modelo por tipo de contrato (editável em Integrações → Contratos).
create table if not exists public.staff_contract_templates (
  contract text primary key check (contract in ('clt', 'pj', 'freela', 'socio')),
  name text not null,
  body text not null check (length(body) between 50 and 60000),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.staff_contract_templates enable row level security;
create policy staff_contract_templates_read on public.staff_contract_templates for select to authenticated using (public.has_role('admin'));

do $$
declare
  _parts text := E'Pelo presente instrumento particular, as partes abaixo qualificadas:\n\nCONTRATANTE: {{empresa_qualificacao}};\n\nCONTRATADO(A): {{membro_qualificacao}};\n\ntêm entre si justo e acordado o presente contrato, que se regerá pelas cláusulas e condições seguintes:\n\n';
  _end text := E'CLÁUSULA # — DO FORO\n#.1. Fica eleito o foro da Comarca de Recife/PE para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.\n\nE, por estarem assim justas e contratadas, as partes assinam o presente instrumento eletronicamente, em igual teor e forma.\n\n{{local_data}}\n\n\n_____________________________________________\nCONTRATANTE\n{{empresa_razao}}\n{{empresa_documento}}\n\n\n_____________________________________________\nCONTRATADO(A)\n{{membro_nome}}\n{{membro_documento}}';
  _rules text := E'CLÁUSULA # — DA CONFIDENCIALIDADE E DOS DADOS\n#.1. O(A) CONTRATADO(A) manterá em sigilo as informações da CONTRATANTE e de seus clientes a que tiver acesso, durante e após este contrato, e tratará dados pessoais apenas para executar os serviços, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).\n\n'
    || E'CLÁUSULA # — DOS DIREITOS SOBRE O MATERIAL\n#.1. Os materiais produzidos para a CONTRATANTE e seus clientes (vídeos, fotos, artes, textos e arquivos brutos) pertencem à CONTRATANTE, que poderá usá-los livremente. O(A) CONTRATADO(A) poderá mostrá-los em seu portfólio pessoal, salvo pedido contrário da CONTRATANTE.\n\n';
begin
  if not exists (select 1 from public.staff_contract_templates where contract = 'pj') then
    insert into public.staff_contract_templates (name, contract, body) values ('Membro PJ (prestação de serviços)', 'pj',
      E'CONTRATO DE PRESTAÇÃO DE SERVIÇOS (PESSOA JURÍDICA)\n{{funcao}}\n\n' || _parts
      || E'CLÁUSULA # — DO OBJETO\n#.1. O presente contrato tem por objeto a prestação de serviços de {{funcao}} pelo(a) CONTRATADO(A) à CONTRATANTE, com autonomia e sem exclusividade, nos projetos e clientes da CONTRATANTE.\n\n#.2. As entregas, prazos e prioridades serão combinados pelo sistema de gestão da CONTRATANTE.\n\n'
      || E'CLÁUSULA # — DA REMUNERAÇÃO\n#.1. {{remuneracao}}\n\n#.2. Serviços avulsos combinados à parte serão somados e pagos no próximo dia de pagamento.\n\n#.3. {{nota_fiscal}}\n\n'
      || E'CLÁUSULA # — DO PRAZO E DA RESCISÃO\n#.1. Este contrato vale por prazo indeterminado, a contar da data de sua assinatura.\n\n#.2. Qualquer das partes poderá rescindir este contrato mediante aviso prévio por escrito de 30 (trinta) dias, sendo devidos os valores dos serviços prestados até a data da rescisão.\n\n'
      || _rules
      || E'CLÁUSULA # — DAS DISPOSIÇÕES GERAIS\n#.1. Este contrato não cria vínculo empregatício, societário ou de representação entre as partes, cada uma respondendo por seus próprios encargos trabalhistas, fiscais e previdenciários.\n\n#.2. Qualquer alteração deste contrato somente terá validade se feita por escrito e assinada por ambas as partes.\n\n'
      || _end);
  end if;
  if not exists (select 1 from public.staff_contract_templates where contract = 'freela') then
    insert into public.staff_contract_templates (name, contract, body) values ('Membro Freela (por produção)', 'freela',
      E'CONTRATO DE PRESTAÇÃO DE SERVIÇOS POR PRODUÇÃO (FREELA)\n{{funcao}}\n\n' || _parts
      || E'CLÁUSULA # — DO OBJETO\n#.1. O presente contrato tem por objeto a prestação de serviços de {{funcao}} pelo(a) CONTRATADO(A) à CONTRATANTE, por produção, sempre que combinado, com autonomia e sem exclusividade.\n\n#.2. Cada produção será combinada antes, com data, local e entrega registrados no sistema de gestão da CONTRATANTE. O cancelamento pelo(a) CONTRATADO(A) com menos de 24 (vinte e quatro) horas de antecedência deve ser avisado e justificado.\n\n'
      || E'CLÁUSULA # — DA REMUNERAÇÃO\n#.1. {{remuneracao}}\n\n#.2. O valor de cada produção será pago depois que o cliente da CONTRATANTE pagar pelo serviço, no próximo dia de pagamento.\n\n'
      || E'CLÁUSULA # — DO PRAZO E DA RESCISÃO\n#.1. Este contrato vale por prazo indeterminado, a contar da data de sua assinatura.\n\n#.2. Qualquer das partes poderá encerrar este contrato mediante aviso por escrito, sendo devidos os valores das produções já entregues.\n\n'
      || _rules
      || E'CLÁUSULA # — DAS DISPOSIÇÕES GERAIS\n#.1. Este contrato não cria vínculo empregatício, societário ou de representação entre as partes, cada uma respondendo por seus próprios encargos trabalhistas, fiscais e previdenciários.\n\n#.2. Qualquer alteração deste contrato somente terá validade se feita por escrito e assinada por ambas as partes.\n\n'
      || _end);
  end if;
  if not exists (select 1 from public.staff_contract_templates where contract = 'clt') then
    insert into public.staff_contract_templates (name, contract, body) values ('Membro CLT (modelo simples)', 'clt',
      E'CONTRATO INDIVIDUAL DE TRABALHO\n{{funcao}}\n\nPelo presente instrumento particular, as partes abaixo qualificadas:\n\nEMPREGADORA: {{empresa_qualificacao}};\n\nEMPREGADO(A): {{membro_qualificacao}};\n\ntêm entre si justo e acordado o presente contrato de trabalho, regido pela Consolidação das Leis do Trabalho (CLT) e pelas cláusulas seguintes:\n\n'
      || E'CLÁUSULA # — DA FUNÇÃO\n#.1. O(A) EMPREGADO(A) exercerá a função de {{funcao}}, além de outras atividades compatíveis com sua condição pessoal.\n\n'
      || E'CLÁUSULA # — DO SALÁRIO\n#.1. {{remuneracao}}\n\n'
      || E'CLÁUSULA # — DA JORNADA E DO PRAZO\n#.1. A jornada, o período de experiência e os demais direitos seguem a CLT e o que constar na carteira de trabalho.\n\n'
      || _rules || _end);
  end if;
  if not exists (select 1 from public.staff_contract_templates where contract = 'socio') then
    insert into public.staff_contract_templates (name, contract, body) values ('Membro Sócio (modelo simples)', 'socio',
      E'TERMO DE PARTICIPAÇÃO E REMUNERAÇÃO DE SÓCIO\n{{funcao}}\n\nPelo presente instrumento particular, as partes abaixo qualificadas:\n\nEMPRESA: {{empresa_qualificacao}};\n\nSÓCIO(A): {{membro_qualificacao}};\n\nregistram as condições de atuação e remuneração do(a) SÓCIO(A), conforme as cláusulas seguintes:\n\n'
      || E'CLÁUSULA # — DA ATUAÇÃO\n#.1. O(A) SÓCIO(A) atuará na área de {{funcao}}.\n\n'
      || E'CLÁUSULA # — DA REMUNERAÇÃO\n#.1. {{remuneracao}}\n\n#.2. A participação no lucro só é paga depois de apurada e aprovada pela administração da EMPRESA.\n\n'
      || E'CLÁUSULA # — DISPOSIÇÕES GERAIS\n#.1. Este termo não altera o contrato social, que prevalece em caso de conflito. Qualquer alteração somente terá validade se feita por escrito e assinada pelas partes.\n\n'
      || _rules || _end);
  end if;
end $$;

create table if not exists public.staff_contract_docs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_members(id),
  unit text not null default 'peformake',
  mode text not null default 'modelo' check (mode in ('modelo', 'pdf')),
  template_contract text,
  title text not null,
  body text,
  file_path text,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'assinado_parcial', 'assinado', 'recusado', 'erro', 'cancelado')),
  signer_name text, signer_email text, signer_document text,
  provider_document_id text, provider_error text,
  sent_at timestamptz, signed_at timestamptz, refused_at timestamptz, signed_path text,
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists staff_contract_docs_staff on public.staff_contract_docs (staff_id, created_at desc);
create index if not exists staff_contract_docs_provider on public.staff_contract_docs (provider_document_id);
alter table public.staff_contract_docs enable row level security;
create policy staff_contract_docs_admin_read on public.staff_contract_docs for select to authenticated using (public.has_role('admin'));

-- Texto do contrato do membro a partir do modelo do tipo de contrato dele.
create or replace function public.staff_contract_compose(_staff uuid, _body text)
returns text language plpgsql stable security definer set search_path to '' as $$
declare _s public.staff_members; _m public.member_pay; _p public.company_profiles; _doc text; _out text := _body; _rem text; _rates text; _fn text;
begin
  select * into _s from public.staff_members where id = _staff;
  select * into _m from public.member_pay where staff_id = _staff;
  select * into _p from public.company_profiles where unit = coalesce(_m.unit, 'peformake');
  _doc := regexp_replace(coalesce(_s.document, ''), '\D', '', 'g');
  _fn := coalesce(nullif(trim(_s.job_title), ''), 'serviços de marketing e produção');
  select string_agg(initcap(case k when 'videomaker' then 'captação' when 'editor' then 'edição' when 'fotografo' then 'fotografia' when 'apresentadora' then 'apresentação' else k end) || ': ' || public.brl(v::numeric), '; ')
    into _rates from jsonb_each_text(coalesce(_m.job_rates, '{}'::jsonb)) as j(k, v) where (case when v ~ '^[0-9]+(\.[0-9]+)?$' then v::numeric else 0 end) > 0;
  _rem := case _m.contract
    when 'freela' then 'O(A) CONTRATADO(A) não tem valor fixo: recebe por produção entregue' || coalesce(', conforme a tabela: ' || _rates, ', pelo valor combinado antes de cada produção') || '. Os pagamentos são feitos nos dias ' || case when _m.pay_schedule = 'quinzenal' then '15 e 30' else '30' end || ' de cada mês, por PIX.'
    when 'socio' then case when coalesce(_m.base_salary, 0) > 0 then 'Pró-labore mensal de ' || public.brl(_m.base_salary) || ', pago no dia 30, ' else 'Sem pró-labore fixo, ' end
      || 'mais ' || coalesce(trim(to_char(_m.profit_share_pct, 'FM990D##')), '0') || '% do lucro ' || case when _m.profit_period = 'trimestral' then 'de cada trimestre' else 'de cada mês' end || ' (entradas pagas menos saídas pagas da EMPRESA).'
    else (case when _m.contract = 'clt' then 'Salário mensal de ' else 'Valor fixo mensal de ' end) || public.brl(coalesce(_m.base_salary, 0))
      || case when _m.pay_schedule = 'quinzenal' then ', pago em duas partes: ' || coalesce(_m.advance_pct, 50)::int || '% no dia 15 e o restante no dia 30' else ', pago no dia 30' end
      || case when (_m.contract = 'pj' or _m.variable_enabled) and coalesce(_m.variable_target, 0) > 0 then ', mais variável de até ' || public.brl(_m.variable_target) || ' por mês, conforme as metas combinadas no sistema, paga no dia 30 do mês seguinte' else '' end
      || ', por PIX.' end;
  _out := replace(_out, '{{empresa_qualificacao}}',
    coalesce(_p.legal_name, '(razão social)') || case when _p.trade_name is not null and lower(_p.trade_name) <> lower(coalesce(_p.legal_name, '')) then ', nome fantasia ' || _p.trade_name else '' end
    || ', inscrita no CNPJ sob o nº ' || coalesce(public.doc_fmt(_p.document), '(a preencher)') || ', com sede em ' || coalesce(_p.address, '(a preencher)')
    || ', neste ato representada por ' || coalesce(_p.representative_name, '(a preencher)') || coalesce(', inscrito(a) no CPF sob o nº ' || public.doc_fmt(_p.representative_document), ''));
  _out := replace(_out, '{{membro_qualificacao}}', _s.full_name
    || case when length(_doc) = 14 then ', inscrita no CNPJ sob o nº ' || public.doc_fmt(_doc) || coalesce(', com sede em ' || nullif(trim(_s.address), ''), '')
            when length(_doc) = 11 then ', inscrito(a) no CPF sob o nº ' || public.doc_fmt(_doc) || coalesce(', residente em ' || nullif(trim(_s.address), ''), '')
            else ', CPF (a preencher)' end
    || coalesce(', e-mail ' || _s.email, ''));
  _out := replace(_out, '{{funcao}}', _fn);
  _out := replace(_out, '{{remuneracao}}', _rem);
  _out := replace(_out, '{{nota_fiscal}}', case when _m.require_invoice then 'O pagamento depende da emissão da nota fiscal pelo(a) CONTRATADO(A), enviada antes do dia de pagamento.' else 'O(A) CONTRATADO(A) emitirá nota fiscal dos serviços quando a CONTRATANTE pedir.' end);
  _out := replace(_out, '{{local_data}}', coalesce(_p.sign_city, 'Recife/PE') || ', ' || public.date_extenso(current_date) || '.');
  _out := replace(_out, '{{empresa_razao}}', coalesce(_p.legal_name, ''));
  _out := replace(_out, '{{empresa_documento}}', 'CNPJ ' || public.doc_fmt(_p.document));
  _out := replace(_out, '{{membro_nome}}', _s.full_name);
  _out := replace(_out, '{{membro_documento}}', case when length(_doc) = 14 then 'CNPJ ' else 'CPF ' end || coalesce(nullif(public.doc_fmt(_doc), ''), '(a preencher)'));
  return public.contract_number(_out);
end $$;

-- Prepara o contrato do membro (rascunho). Não envia nada.
-- _data: { mode: 'modelo'|'pdf', file_path, email, document, address }
create or replace function public.staff_contract_create(_staff uuid, _data jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _s public.staff_members; _m public.member_pay; _t public.staff_contract_templates; _id uuid; _unit text; _miss text[];
  _mode text := coalesce(_data ->> 'mode', 'modelo');
  _email text := lower(trim(coalesce(_data ->> 'email', '')));
  _doc text := regexp_replace(coalesce(_data ->> 'document', ''), '\D', '', 'g');
  _addr text := nullif(trim(coalesce(_data ->> 'address', '')), '');
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  select * into _s from public.staff_members where id = _staff;
  if _s.id is null then raise exception 'Membro não encontrado' using errcode = 'PF004'; end if;
  select * into _m from public.member_pay where staff_id = _staff;
  _email := coalesce(nullif(_email, ''), _s.email, '');
  _doc := coalesce(nullif(_doc, ''), regexp_replace(coalesce(_s.document, ''), '\D', '', 'g'));
  if _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Informe o e-mail de quem assina' using errcode = 'PF006'; end if;
  if _doc !~ '^[0-9]{11}([0-9]{3})?$' then raise exception 'Informe o CPF (ou CNPJ) de quem assina' using errcode = 'PF006'; end if;
  update public.staff_members set email = coalesce(email, _email), document = _doc, address = coalesce(_addr, address) where id = _staff;
  _unit := coalesce(_m.unit, 'peformake');
  if _mode = 'modelo' then
    if _m.contract is null then raise exception 'Defina o tipo de contrato em Pagamento' using errcode = 'PF006'; end if;
    _miss := public.company_profile_missing(_unit);
    if cardinality(_miss) > 0 then
      raise exception 'Complete os dados da % (%)', case when _unit = 'ellcazo' then 'Ellcazo' else 'Peformake' end, array_to_string(_miss, ', ') using errcode = 'PF011';
    end if;
    select * into _t from public.staff_contract_templates where contract = _m.contract;
    if _t.contract is null then raise exception 'Sem modelo para este tipo de contrato' using errcode = 'PF004'; end if;
  elsif _mode = 'pdf' then
    if coalesce(_data ->> 'file_path', '') !~ ('^envios/' || _staff || '/') then raise exception 'Envie o PDF' using errcode = 'PF006'; end if;
  else raise exception 'Modo invalido' using errcode = 'PF006'; end if;
  update public.staff_contract_docs set status = 'cancelado', updated_at = now() where staff_id = _staff and status in ('rascunho', 'erro');
  insert into public.staff_contract_docs (staff_id, unit, mode, template_contract, title, body, file_path, signer_name, signer_email, signer_document, created_by)
  values (_staff, _unit, _mode, _t.contract,
    left(case when _mode = 'pdf' then 'Contrato' else _t.name end || ' · ' || _s.full_name, 160),
    case when _mode = 'modelo' then public.staff_contract_compose(_staff, _t.body) end,
    case when _mode = 'pdf' then _data ->> 'file_path' end,
    _s.full_name, _email, _doc, (select auth.uid()))
  returning id into _id;
  return _id;
end $$;

create or replace function public.staff_contract_template_save(_contract text, _name text, _body text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  update public.staff_contract_templates set name = left(trim(_name), 120), body = _body, updated_at = now(), updated_by = (select auth.uid()) where contract = _contract;
  if not found then raise exception 'Modelo nao encontrado' using errcode = 'PF004'; end if;
end $$;

-- Ajuste do texto antes de enviar (só rascunho).
create or replace function public.staff_contract_update_body(_id uuid, _body text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.has_role('admin') then raise exception 'Sem permissao' using errcode = '42501'; end if;
  if length(coalesce(_body, '')) < 50 then raise exception 'Texto curto demais' using errcode = 'PF006'; end if;
  update public.staff_contract_docs set body = _body, updated_at = now() where id = _id and mode = 'modelo' and status in ('rascunho', 'erro');
  if not found then raise exception 'Contrato já enviado: não dá para editar' using errcode = 'PF003'; end if;
end $$;

-- Só o servidor (funções contract-sign e contract-webhook) muda o andamento.
create or replace function public.staff_contract_provider_set(_id uuid, _provider_id text, _status text, _error text, _signed_path text)
returns void language plpgsql security definer set search_path to '' as $$
declare _d public.staff_contract_docs;
begin
  update public.staff_contract_docs set provider_document_id = coalesce(_provider_id, provider_document_id),
    status = coalesce(_status, status), provider_error = _error, signed_path = coalesce(_signed_path, signed_path),
    sent_at = case when _status = 'enviado' then now() else sent_at end,
    signed_at = case when _status = 'assinado' then coalesce(signed_at, now()) else signed_at end,
    refused_at = case when _status = 'recusado' then coalesce(refused_at, now()) else refused_at end,
    updated_at = now()
  where id = _id and (status not in ('assinado', 'cancelado') or _signed_path is not null)
  returning * into _d;
  if _d.id is null or coalesce(_status, '') not in ('assinado', 'recusado') then return; end if;
  perform public.notify(array(select r.user_id from public.user_roles r where r.role = 'admin'), 'contract_signed',
    case when _status = 'assinado' then 'Contrato do membro assinado' else 'Contrato do membro recusado' end,
    (select full_name from public.staff_members where id = _d.staff_id) || case when _status = 'assinado' then ' assinou o contrato. O PDF assinado está na ficha.' else ' recusou o contrato. Veja o motivo com a pessoa.' end,
    '/equipe/membros?membro=' || _d.staff_id || '&aba=contrato', null);
end $$;

-- Documentos da Assinafy usados no mês (contados pelo sistema): plano grátis tem 10.
create or replace function public.assinafy_month_usage()
returns int language sql stable security definer set search_path to '' as $$
  select case when public.has_role('admin') then
    (select count(*) from public.client_contract_docs where sign_method = 'assinafy' and provider_document_id is not null and sent_at >= date_trunc('month', now()))::int
    + (select count(*) from public.staff_contract_docs where provider_document_id is not null and sent_at >= date_trunc('month', now()))::int
  else 0 end;
$$;

revoke all on function public.staff_contract_provider_set(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.contract_compose(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.staff_contract_compose(uuid, text) from public, anon, authenticated;
grant execute on function public.staff_contract_provider_set(uuid, text, text, text, text) to service_role;
