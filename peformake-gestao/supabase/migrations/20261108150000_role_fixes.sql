-- Correções da revisão de permissões por função (08/11).

-- 1) "Admin Ellcazo": já é administradora do financeiro da Ellcazo e entra no Audiovisual.
create or replace function public.can_finance(_unit text)
returns boolean language sql stable security definer set search_path to '' as $$
  select _unit in ('peformake', 'ellcazo')
    and (public.is_area_admin('financeiro_' || _unit) or (_unit = 'ellcazo' and public.has_role('ellcazo')));
$$;
create or replace function public.can_access_av()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.has_role('admin') or public.has_role('head_marketing') or public.has_role('social_media')
    or public.has_role('videomaker') or public.has_role('editor') or public.has_role('ellcazo');
$$;
create or replace function public.can_manage_av()
returns boolean language sql stable security definer set search_path to '' as $$
  select public.has_role('admin') or public.has_role('head_marketing') or public.has_role('social_media') or public.has_role('ellcazo');
$$;

-- 2) Nomes dos serviços para toda a equipe (o Funil de quem não é do comercial vinha sem a lista).
drop policy if exists services_select_all on public.services;
create policy services_select_all on public.services for select to authenticated using (true);

-- 3) "Meu dia": leads que a pessoa trouxe vêm do Funil do Comercial (abertos, do mais recente).
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.my_day'::regproc);
  d := replace(d, 'jsonb_build_object(''id'', l.id, ''name'', coalesce(l.company, l.name), ''stage'', l.stage) order by l.created_at desc',
                  'jsonb_build_object(''id'', l.id, ''name'', coalesce(l.lead_company, l.lead_name, l.title), ''stage'', l.stage) order by l.updated_at desc');
  d := replace(d, 'select * from public.member_leads x where x.profile_id = _s.profile_id order by x.created_at desc limit 8',
                  'select * from public.crm_deals x where x.owner_id = _s.id and x.stage not in (''ganho'', ''perdido'') order by x.updated_at desc limit 8');
  if position('crm_deals' in d) = 0 then raise exception 'my_day não foi atualizada'; end if;
  execute d;
end $do$;

-- 4) Link antigo gravado no aviso de pedido para as redes.
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.social_from_request'::regproc);
  d := replace(d, '''/social/quadro''', '''/conteudo/redes''');
  execute d;
end $do$;
update public.notifications set link = '/conteudo/redes' where link = '/social/quadro';

-- 5) Avisos que eram enviados mas não apareciam em Configurações → Notificações.
insert into public.notification_rules (kind, category, name, description, audience, in_app, whatsapp_client, email, position) values
  ('catalogo_anuncios', 'trafego', 'Catálogo de anúncios', 'Problema ou novidade no catálogo de produtos ligado aos anúncios.', 'equipe', true, false, false, 310),
  ('contract_ending', 'clientes', 'Contrato terminando', 'O contrato de um cliente está perto do fim.', 'equipe', true, false, false, 311),
  ('gallery_paid', 'audiovisual', 'Fotos pagas', 'O cliente pagou as fotos extras e elas foram liberadas.', 'equipe', true, false, false, 312),
  ('gallery_selected', 'audiovisual', 'Fotos escolhidas', 'O cliente escolheu as fotos na galeria.', 'equipe', true, false, false, 313),
  ('content_ready', 'conteudo', 'Peça pronta', 'Uma peça ficou pronta para revisão.', 'equipe', true, false, false, 314),
  ('av_captured', 'audiovisual', 'Gravação feita', 'O material da gravação foi enviado.', 'equipe', true, false, false, 315)
on conflict (kind) do nothing;
